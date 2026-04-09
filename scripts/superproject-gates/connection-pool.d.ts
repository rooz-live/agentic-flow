/**
 * ONNX LLM Proxy Connection Pool Manager
 *
 * Manages connection pooling, health checks, and load balancing
 * for ONNX inference endpoints.
 */
import { EventEmitter } from 'events';
import { AxiosInstance } from 'axios';
import type { ConnectionPoolConfig, InferenceEndpointConfig, ConnectionPoolStatus, EndpointHealthStatus } from './types.js';
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
 * Connection Pool Manager for ONNX LLM Proxy
 */
export declare class ConnectionPoolManager extends EventEmitter {
    private config;
    private connections;
    private circuitBreakers;
    private endpointHealth;
    private pendingRequests;
    private healthCheckInterval?;
    private validationInterval?;
    private metricsInterval?;
    constructor(config: ConnectionPoolConfig);
    /**
     * Initialize connection pool for an endpoint
     */
    initializeEndpoint(endpoint: InferenceEndpointConfig): Promise<void>;
    /**
     * Create a new pooled connection
     */
    private createConnection;
    /**
     * Acquire a connection from the pool
     */
    acquireConnection(endpointId: string, timeoutMs?: number): Promise<PooledConnection>;
    /**
     * Release a connection back to the pool
     */
    releaseConnection(connection: PooledConnection, hadError?: boolean): void;
    /**
     * Destroy a connection and remove from pool
     */
    private destroyConnection;
    /**
     * Record circuit breaker failure
     */
    private recordCircuitBreakerFailure;
    /**
     * Record circuit breaker success
     */
    private recordCircuitBreakerSuccess;
    /**
     * Check endpoint health
     */
    checkEndpointHealth(endpoint: InferenceEndpointConfig): Promise<EndpointHealthStatus>;
    /**
     * Get endpoint config (mock implementation - should be injected)
     */
    private getEndpointConfig;
    /**
     * Get connection pool status
     */
    getPoolStatus(endpointId: string): ConnectionPoolStatus;
    /**
     * Get all endpoint health statuses
     */
    getAllEndpointHealth(): EndpointHealthStatus[];
    /**
     * Start periodic health checks
     */
    startHealthChecks(endpoints: InferenceEndpointConfig[], intervalMs?: number): void;
    /**
     * Start connection validation
     */
    startConnectionValidation(intervalMs?: number): void;
    /**
     * Validate and clean up connections
     */
    private validateConnections;
    /**
     * Shutdown the connection pool
     */
    shutdown(): Promise<void>;
}
export declare function getConnectionPool(config?: ConnectionPoolConfig): ConnectionPoolManager;
export declare function resetConnectionPool(): void;
export {};
//# sourceMappingURL=connection-pool.d.ts.map