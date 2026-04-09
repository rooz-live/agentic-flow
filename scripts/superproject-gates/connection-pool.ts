/**
 * ONNX LLM Proxy Connection Pool Manager
 * 
 * Manages connection pooling, health checks, and load balancing
 * for ONNX inference endpoints.
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import type {
  ConnectionPoolConfig,
  InferenceEndpointConfig,
  ConnectionPoolStatus,
  EndpointHealthStatus
} from './types.js';

/**
 * Connection wrapper with metadata
 */
interface PooledConnection {
  id: string;
  endpointId: string;
  client: AxiosInstance;
  createdAt: Date;
  lastUsedAt: Date;
  requestCount: number;
  errorCount: number;
  isHealthy: boolean;
  inUse: boolean;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastStateChange: Date;
}

/**
 * Connection Pool Manager for ONNX LLM Proxy
 */
export class ConnectionPoolManager extends EventEmitter {
  private config: ConnectionPoolConfig;
  private connections: Map<string, PooledConnection[]> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private endpointHealth: Map<string, EndpointHealthStatus> = new Map();
  private pendingRequests: Map<string, Array<(conn: PooledConnection) => void>> = new Map();
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private validationInterval?: ReturnType<typeof setInterval>;
  private metricsInterval?: ReturnType<typeof setInterval>;

  constructor(config: ConnectionPoolConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize connection pool for an endpoint
   */
  public async initializeEndpoint(endpoint: InferenceEndpointConfig): Promise<void> {
    console.log(`[CONN-POOL] Initializing pool for endpoint: ${endpoint.endpointId}`);

    // Initialize circuit breaker
    this.circuitBreakers.set(endpoint.endpointId, {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastStateChange: new Date()
    });

    // Initialize health status
    this.endpointHealth.set(endpoint.endpointId, {
      endpointId: endpoint.endpointId,
      status: 'unknown',
      lastCheckTimestamp: new Date(),
      responseTimeMs: 0,
      successRatePercent: 100,
      currentLoad: 0,
      circuitBreakerState: 'closed'
    });

    // Initialize pending requests queue
    this.pendingRequests.set(endpoint.endpointId, []);

    // Create initial connections
    const connections: PooledConnection[] = [];
    for (let i = 0; i < this.config.minConnections; i++) {
      try {
        const conn = await this.createConnection(endpoint);
        connections.push(conn);
      } catch (error) {
        console.error(`[CONN-POOL] Failed to create initial connection ${i + 1} for ${endpoint.endpointId}:`, error);
      }
    }

    this.connections.set(endpoint.endpointId, connections);

    // Perform initial health check
    await this.checkEndpointHealth(endpoint);

    console.log(`[CONN-POOL] Initialized ${connections.length} connections for ${endpoint.endpointId}`);
    this.emit('endpointInitialized', { endpointId: endpoint.endpointId, connectionCount: connections.length });
  }

  /**
   * Create a new pooled connection
   */
  private async createConnection(endpoint: InferenceEndpointConfig): Promise<PooledConnection> {
    const connectionId = `${endpoint.endpointId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const axiosConfig: AxiosRequestConfig = {
      baseURL: `${endpoint.protocol}://${new URL(endpoint.url).hostname}:${endpoint.port}`,
      timeout: this.config.acquireTimeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'X-Connection-Id': connectionId
      }
    };

    // Configure keepalive
    if (this.config.enableKeepalive) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        'Connection': 'keep-alive'
      };
    }

    const client = axios.create(axiosConfig);

    // Add request interceptor for metrics
    client.interceptors.request.use(
      (config) => {
        (config as any).metadata = { startTime: Date.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for metrics
    client.interceptors.response.use(
      (response) => {
        const metadata = (response.config as any).metadata;
        if (metadata) {
          const latency = Date.now() - metadata.startTime;
          this.emit('requestCompleted', {
            connectionId,
            endpointId: endpoint.endpointId,
            latencyMs: latency,
            status: response.status
          });
        }
        return response;
      },
      (error) => {
        const metadata = (error.config as any)?.metadata;
        if (metadata) {
          const latency = Date.now() - metadata.startTime;
          this.emit('requestFailed', {
            connectionId,
            endpointId: endpoint.endpointId,
            latencyMs: latency,
            error: error.message
          });
        }
        return Promise.reject(error);
      }
    );

    const connection: PooledConnection = {
      id: connectionId,
      endpointId: endpoint.endpointId,
      client,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      requestCount: 0,
      errorCount: 0,
      isHealthy: true,
      inUse: false
    };

    return connection;
  }

  /**
   * Acquire a connection from the pool
   */
  public async acquireConnection(
    endpointId: string,
    timeoutMs?: number
  ): Promise<PooledConnection> {
    const timeout = timeoutMs ?? this.config.acquireTimeoutMs;
    const startTime = Date.now();

    // Check circuit breaker
    const breaker = this.circuitBreakers.get(endpointId);
    if (breaker?.state === 'open') {
      // Check if we should transition to half-open
      const resetTimeout = 30000; // 30 seconds
      if (breaker.lastFailureTime && 
          Date.now() - breaker.lastFailureTime.getTime() > resetTimeout) {
        breaker.state = 'half-open';
        breaker.lastStateChange = new Date();
        this.emit('circuitBreakerHalfOpen', { endpointId });
      } else {
        throw new Error(`Circuit breaker is open for endpoint ${endpointId}`);
      }
    }

    const connections = this.connections.get(endpointId);
    if (!connections) {
      throw new Error(`No connection pool found for endpoint ${endpointId}`);
    }

    // Try to find an available connection
    while (Date.now() - startTime < timeout) {
      // Find an idle, healthy connection
      const availableConn = connections.find(c => !c.inUse && c.isHealthy);
      
      if (availableConn) {
        availableConn.inUse = true;
        availableConn.lastUsedAt = new Date();
        availableConn.requestCount++;
        return availableConn;
      }

      // Check if we can create a new connection
      if (connections.length < this.config.maxConnections) {
        const endpoint = this.getEndpointConfig(endpointId);
        if (endpoint) {
          try {
            const newConn = await this.createConnection(endpoint);
            newConn.inUse = true;
            newConn.lastUsedAt = new Date();
            newConn.requestCount++;
            connections.push(newConn);
            return newConn;
          } catch (error) {
            console.error(`[CONN-POOL] Failed to create new connection for ${endpointId}:`, error);
          }
        }
      }

      // Wait for a connection to become available
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    throw new Error(`Timeout waiting for connection from pool ${endpointId}`);
  }

  /**
   * Release a connection back to the pool
   */
  public releaseConnection(connection: PooledConnection, hadError: boolean = false): void {
    connection.inUse = false;
    connection.lastUsedAt = new Date();

    if (hadError) {
      connection.errorCount++;
      this.recordCircuitBreakerFailure(connection.endpointId);

      // Mark connection as unhealthy if too many errors
      if (connection.errorCount >= 5) {
        connection.isHealthy = false;
        this.emit('connectionUnhealthy', { connectionId: connection.id, endpointId: connection.endpointId });
      }
    } else {
      this.recordCircuitBreakerSuccess(connection.endpointId);
    }

    // Check if connection has exceeded max lifetime
    const lifetime = Date.now() - connection.createdAt.getTime();
    if (lifetime > this.config.maxLifetimeMs) {
      this.destroyConnection(connection);
    }

    // Process pending requests
    const pending = this.pendingRequests.get(connection.endpointId);
    if (pending && pending.length > 0 && connection.isHealthy) {
      const resolve = pending.shift();
      if (resolve) {
        connection.inUse = true;
        connection.lastUsedAt = new Date();
        connection.requestCount++;
        resolve(connection);
      }
    }
  }

  /**
   * Destroy a connection and remove from pool
   */
  private destroyConnection(connection: PooledConnection): void {
    const connections = this.connections.get(connection.endpointId);
    if (connections) {
      const index = connections.indexOf(connection);
      if (index >= 0) {
        connections.splice(index, 1);
        this.emit('connectionDestroyed', { connectionId: connection.id, endpointId: connection.endpointId });
      }
    }
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(endpointId: string): void {
    const breaker = this.circuitBreakers.get(endpointId);
    if (!breaker) return;

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    // Check if we should open the circuit
    const threshold = 5; // Configurable threshold
    if (breaker.failureCount >= threshold && breaker.state === 'closed') {
      breaker.state = 'open';
      breaker.lastStateChange = new Date();
      this.emit('circuitBreakerOpen', { endpointId, failureCount: breaker.failureCount });

      // Update health status
      const health = this.endpointHealth.get(endpointId);
      if (health) {
        health.circuitBreakerState = 'open';
        health.status = 'unhealthy';
      }
    }

    // If half-open, go back to open
    if (breaker.state === 'half-open') {
      breaker.state = 'open';
      breaker.lastStateChange = new Date();
      this.emit('circuitBreakerOpen', { endpointId, failureCount: breaker.failureCount });
    }
  }

  /**
   * Record circuit breaker success
   */
  private recordCircuitBreakerSuccess(endpointId: string): void {
    const breaker = this.circuitBreakers.get(endpointId);
    if (!breaker) return;

    breaker.successCount++;

    // If half-open, check if we should close
    if (breaker.state === 'half-open') {
      const successThreshold = 3;
      if (breaker.successCount >= successThreshold) {
        breaker.state = 'closed';
        breaker.failureCount = 0;
        breaker.successCount = 0;
        breaker.lastStateChange = new Date();
        this.emit('circuitBreakerClosed', { endpointId });

        // Update health status
        const health = this.endpointHealth.get(endpointId);
        if (health) {
          health.circuitBreakerState = 'closed';
          health.status = 'healthy';
        }
      }
    }
  }

  /**
   * Check endpoint health
   */
  public async checkEndpointHealth(endpoint: InferenceEndpointConfig): Promise<EndpointHealthStatus> {
    const startTime = Date.now();
    let health = this.endpointHealth.get(endpoint.endpointId);

    if (!health) {
      health = {
        endpointId: endpoint.endpointId,
        status: 'unknown',
        lastCheckTimestamp: new Date(),
        responseTimeMs: 0,
        successRatePercent: 100,
        currentLoad: 0,
        circuitBreakerState: 'closed'
      };
      this.endpointHealth.set(endpoint.endpointId, health);
    }

    try {
      const healthUrl = `${endpoint.protocol}://${new URL(endpoint.url).hostname}:${endpoint.port}${endpoint.healthCheckPath}`;
      
      const response = await axios.get(healthUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      const responseTime = Date.now() - startTime;

      health.status = response.status === 200 ? 'healthy' : 'degraded';
      health.responseTimeMs = responseTime;
      health.lastCheckTimestamp = new Date();

      // Calculate success rate from connection stats
      const connections = this.connections.get(endpoint.endpointId) ?? [];
      const totalRequests = connections.reduce((sum, c) => sum + c.requestCount, 0);
      const totalErrors = connections.reduce((sum, c) => sum + c.errorCount, 0);
      health.successRatePercent = totalRequests > 0 
        ? ((totalRequests - totalErrors) / totalRequests) * 100 
        : 100;

      // Calculate current load
      const activeConnections = connections.filter(c => c.inUse).length;
      health.currentLoad = connections.length > 0 
        ? (activeConnections / connections.length) * 100 
        : 0;

      this.emit('healthCheckCompleted', health);

    } catch (error) {
      health.status = 'unhealthy';
      health.responseTimeMs = Date.now() - startTime;
      health.lastCheckTimestamp = new Date();
      
      this.emit('healthCheckFailed', { endpointId: endpoint.endpointId, error });
    }

    return health;
  }

  /**
   * Get endpoint config (mock implementation - should be injected)
   */
  private getEndpointConfig(endpointId: string): InferenceEndpointConfig | undefined {
    // This would typically be retrieved from the config loader
    // For now, emit an event to request the config
    this.emit('endpointConfigRequired', { endpointId });
    return undefined;
  }

  /**
   * Get connection pool status
   */
  public getPoolStatus(endpointId: string): ConnectionPoolStatus {
    const connections = this.connections.get(endpointId) ?? [];
    const activeConnections = connections.filter(c => c.inUse).length;
    const healthyConnections = connections.filter(c => c.isHealthy).length;
    const pending = this.pendingRequests.get(endpointId)?.length ?? 0;

    const totalAge = connections.reduce(
      (sum, c) => sum + (Date.now() - c.createdAt.getTime()),
      0
    );

    const recentErrors = connections.reduce(
      (sum, c) => sum + (c.errorCount > 0 ? 1 : 0),
      0
    );

    return {
      totalConnections: connections.length,
      activeConnections,
      idleConnections: healthyConnections - activeConnections,
      pendingRequests: pending,
      utilizationPercent: connections.length > 0 
        ? (activeConnections / connections.length) * 100 
        : 0,
      recentErrors,
      averageConnectionAgeMs: connections.length > 0 
        ? totalAge / connections.length 
        : 0
    };
  }

  /**
   * Get all endpoint health statuses
   */
  public getAllEndpointHealth(): EndpointHealthStatus[] {
    return Array.from(this.endpointHealth.values());
  }

  /**
   * Start periodic health checks
   */
  public startHealthChecks(
    endpoints: InferenceEndpointConfig[],
    intervalMs: number = 30000
  ): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      for (const endpoint of endpoints) {
        await this.checkEndpointHealth(endpoint);
      }
    }, intervalMs);

    console.log(`[CONN-POOL] Started health checks with ${intervalMs}ms interval`);
  }

  /**
   * Start connection validation
   */
  public startConnectionValidation(intervalMs?: number): void {
    const interval = intervalMs ?? this.config.validationIntervalMs;

    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }

    this.validationInterval = setInterval(() => {
      this.validateConnections();
    }, interval);

    console.log(`[CONN-POOL] Started connection validation with ${interval}ms interval`);
  }

  /**
   * Validate and clean up connections
   */
  private validateConnections(): void {
    for (const [endpointId, connections] of this.connections.entries()) {
      // Remove unhealthy or expired connections
      const validConnections = connections.filter(conn => {
        const lifetime = Date.now() - conn.createdAt.getTime();
        const idleTime = Date.now() - conn.lastUsedAt.getTime();

        // Remove if exceeded max lifetime
        if (lifetime > this.config.maxLifetimeMs) {
          this.emit('connectionExpired', { connectionId: conn.id, reason: 'max_lifetime' });
          return false;
        }

        // Remove if idle too long (but keep minimum connections)
        if (!conn.inUse && 
            idleTime > this.config.idleTimeoutMs && 
            connections.filter(c => c.isHealthy).length > this.config.minConnections) {
          this.emit('connectionExpired', { connectionId: conn.id, reason: 'idle_timeout' });
          return false;
        }

        return true;
      });

      this.connections.set(endpointId, validConnections);

      // Log validation results
      if (validConnections.length !== connections.length) {
        console.log(`[CONN-POOL] Validated ${endpointId}: ${validConnections.length}/${connections.length} connections retained`);
      }
    }
  }

  /**
   * Shutdown the connection pool
   */
  public async shutdown(): Promise<void> {
    console.log('[CONN-POOL] Shutting down connection pool');

    // Stop intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all connections
    for (const [endpointId, connections] of this.connections.entries()) {
      console.log(`[CONN-POOL] Closing ${connections.length} connections for ${endpointId}`);
      connections.length = 0;
    }

    this.connections.clear();
    this.circuitBreakers.clear();
    this.endpointHealth.clear();
    this.pendingRequests.clear();

    this.emit('shutdown');
    console.log('[CONN-POOL] Connection pool shutdown complete');
  }
}

/**
 * Create a singleton connection pool instance
 */
let connectionPoolInstance: ConnectionPoolManager | null = null;

export function getConnectionPool(config?: ConnectionPoolConfig): ConnectionPoolManager {
  if (!connectionPoolInstance && config) {
    connectionPoolInstance = new ConnectionPoolManager(config);
  }
  if (!connectionPoolInstance) {
    throw new Error('Connection pool not initialized. Provide config on first call.');
  }
  return connectionPoolInstance;
}

export function resetConnectionPool(): void {
  if (connectionPoolInstance) {
    connectionPoolInstance.shutdown();
    connectionPoolInstance = null;
  }
}
