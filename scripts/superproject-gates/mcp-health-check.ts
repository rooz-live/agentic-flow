/**
 * MCP Federation Health Check System
 * 
 * Implements:
 * - Evidence-first triage for MCP providers
 * - Typed error classification
 * - Circuit breaker pattern with observability_first
 * - Safe_degrade event emission to pattern_metrics.jsonl
 * 
 * Phase 1: MCP Federation Health Check Implementation
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

import {
  MCPErrorType,
  MCPProviderStatus,
  MCPProviderConfig,
  MCPProviderHealthResult,
  MCPFederationHealth,
  MCPSafeDegradeEvent,
  MCPProviderRecoveryEvent,
  CircuitBreakerState,
  MCPErrorClassification
} from './mcp-health-types.js';

/**
 * Circuit Breaker State Machine for MCP Providers
 */
interface CircuitBreakerInstance {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  halfOpenAttempts: number;
  config: {
    failureThreshold: number;
    resetTimeout: number;
    halfOpenRequests: number;
  };
}

/**
 * MCP Federation Health Check System
 */
export class MCPFederationHealthCheck extends EventEmitter {
  private providers: Map<string, MCPProviderConfig> = new Map();
  private healthResults: Map<string, MCPProviderHealthResult> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerInstance> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private goalieDir: string;
  private metricsFile: string;

  constructor(
    private checkIntervalMs: number = 30000,
    goalieDir?: string
  ) {
    super();
    this.goalieDir = goalieDir || process.env.GOALIE_DIR || '.goalie';
    this.metricsFile = path.join(this.goalieDir, 'pattern_metrics.jsonl');
    this.ensureGoalieDir();
  }

  private ensureGoalieDir(): void {
    if (!fs.existsSync(this.goalieDir)) {
      fs.mkdirSync(this.goalieDir, { recursive: true });
    }
  }

  /**
   * Load MCP providers from configuration file
   */
  async loadProvidersFromConfig(configPath: string = '.claude/mcp.json'): Promise<void> {
    try {
      const fullPath = path.resolve(process.cwd(), configPath);
      if (!fs.existsSync(fullPath)) {
        console.log(`[MCP-HEALTH] Config file not found: ${fullPath}`);
        return;
      }

      const configContent = fs.readFileSync(fullPath, 'utf8');
      const config = JSON.parse(configContent);

      if (config.mcpServers) {
        for (const [serverId, serverConfig] of Object.entries(config.mcpServers)) {
          const typedConfig = serverConfig as any;
          const providerConfig: MCPProviderConfig = {
            id: serverId,
            name: typedConfig.name || serverId,
            type: typedConfig.command ? 'stdio' : 'http',
            command: typedConfig.command,
            args: typedConfig.args || [],
            endpoint: typedConfig.endpoint,
            port: typedConfig.port,
            timeout: typedConfig.timeout || 30000,
            maxRetries: typedConfig.maxRetries || 3,
            healthCheckInterval: typedConfig.healthCheckInterval || this.checkIntervalMs,
            enabled: typedConfig.enabled !== false,
            env: typedConfig.env || {},
            circuitBreaker: {
              failureThreshold: typedConfig.circuitBreaker?.failureThreshold || 5,
              resetTimeout: typedConfig.circuitBreaker?.resetTimeout || 60000,
              halfOpenRequests: typedConfig.circuitBreaker?.halfOpenRequests || 1
            }
          };

          this.registerProvider(providerConfig);
        }
      }

      console.log(`[MCP-HEALTH] Loaded ${this.providers.size} providers from config`);
    } catch (error) {
      console.error('[MCP-HEALTH] Failed to load config:', error);
    }
  }

  /**
   * Register an MCP provider for health monitoring
   */
  registerProvider(config: MCPProviderConfig): void {
    this.providers.set(config.id, config);
    
    // Initialize circuit breaker
    this.circuitBreakers.set(config.id, {
      state: 'closed',
      failureCount: 0,
      halfOpenAttempts: 0,
      config: config.circuitBreaker || {
        failureThreshold: 5,
        resetTimeout: 60000,
        halfOpenRequests: 1
      }
    });

    // Initialize health result
    this.healthResults.set(config.id, {
      providerId: config.id,
      providerName: config.name,
      status: 'unknown',
      lastChecked: new Date(),
      consecutiveFailures: 0,
      circuitBreakerState: 'closed',
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatencyMs: 0,
        p95LatencyMs: 0,
        uptime: 100
      }
    });

    console.log(`[MCP-HEALTH] Registered provider: ${config.id}`);
  }

  /**
   * Start health check monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('[MCP-HEALTH] Starting MCP federation health monitoring');

    // Perform initial check
    await this.performHealthChecks();

    // Start periodic checks
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.checkIntervalMs
    );
  }

  /**
   * Stop health check monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('[MCP-HEALTH] Stopped MCP federation health monitoring');
  }

  /**
   * Perform health checks on all registered providers
   */
  async performHealthChecks(): Promise<MCPFederationHealth> {
    const timestamp = new Date();
    const results: MCPProviderHealthResult[] = [];

    for (const [providerId, config] of this.providers) {
      if (!config.enabled) continue;
      const result = await this.checkProvider(config);
      results.push(result);
      this.healthResults.set(providerId, result);
    }

    const health = this.computeFederationHealth(timestamp, results);
    this.emit('healthUpdate', health);
    return health;
  }

  /**
   * Check individual provider health
   */
  private async checkProvider(config: MCPProviderConfig): Promise<MCPProviderHealthResult> {
    const circuitBreaker = this.circuitBreakers.get(config.id)!;
    const existingResult = this.healthResults.get(config.id)!;
    const startTime = Date.now();

    // Check circuit breaker state
    if (circuitBreaker.state === 'open') {
      const timeSinceFailure = Date.now() - (circuitBreaker.lastFailureTime?.getTime() || 0);
      if (timeSinceFailure >= circuitBreaker.config.resetTimeout) {
        circuitBreaker.state = 'half_open';
        circuitBreaker.halfOpenAttempts = 0;
        console.log(`[MCP-HEALTH] Circuit breaker half-open for: ${config.id}`);
      } else {
        return { ...existingResult, circuitBreakerState: 'open', lastChecked: new Date() };
      }
    }

    try {
      const healthy = await this.probeProvider(config);
      const latencyMs = Date.now() - startTime;

      if (healthy) {
        return this.handleProviderSuccess(config, circuitBreaker, existingResult, latencyMs);
      } else {
        return this.handleProviderFailure(
          config, circuitBreaker, existingResult,
          'provider_unreachable', 'Provider probe failed', latencyMs
        );
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorType = this.classifyError(error);
      const message = error instanceof Error ? error.message : String(error);
      return this.handleProviderFailure(config, circuitBreaker, existingResult, errorType, message, latencyMs);
    }
  }

  /**
   * Probe provider based on type
   */
  private async probeProvider(config: MCPProviderConfig): Promise<boolean> {
    if (config.type === 'stdio' && config.command) {
      return this.probeStdioProvider(config);
    } else if (config.type === 'http' && config.endpoint) {
      return this.probeHttpProvider(config);
    }
    return false;
  }

  /**
   * Probe stdio-based MCP provider
   */
  private probeStdioProvider(config: MCPProviderConfig): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        child.kill();
        resolve(false);
      }, config.timeout);

      const child: ChildProcess = spawn(config.command!, ['--version'], {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      child.on('error', () => { clearTimeout(timeout); resolve(false); });
      child.on('close', (code) => { clearTimeout(timeout); resolve(code === 0); });
    });
  }

  /**
   * Probe HTTP-based MCP provider
   */
  private async probeHttpProvider(config: MCPProviderConfig): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      const response = await fetch(`${config.endpoint}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch { return false; }
  }

  /**
   * Handle successful provider check
   */
  private handleProviderSuccess(
    config: MCPProviderConfig,
    cb: CircuitBreakerInstance,
    existing: MCPProviderHealthResult,
    latencyMs: number
  ): MCPProviderHealthResult {
    const wasUnhealthy = existing.status === 'unhealthy' || existing.status === 'degraded';

    // Reset circuit breaker
    cb.state = 'closed';
    cb.failureCount = 0;
    cb.lastSuccessTime = new Date();

    const newMetrics = {
      ...existing.metrics,
      totalRequests: existing.metrics.totalRequests + 1,
      successfulRequests: existing.metrics.successfulRequests + 1,
      averageLatencyMs: (existing.metrics.averageLatencyMs * existing.metrics.totalRequests + latencyMs) /
                        (existing.metrics.totalRequests + 1)
    };

    if (wasUnhealthy) {
      this.emitRecoveryEvent(config.id, existing.status, 'healthy', latencyMs);
    }

    return {
      ...existing,
      status: 'healthy',
      lastChecked: new Date(),
      lastSuccessful: new Date(),
      consecutiveFailures: 0,
      circuitBreakerState: 'closed',
      latencyMs,
      error: undefined,
      metrics: newMetrics
    };
  }

  /**
   * Handle provider failure
   */
  private handleProviderFailure(
    config: MCPProviderConfig,
    cb: CircuitBreakerInstance,
    existing: MCPProviderHealthResult,
    errorType: MCPErrorType,
    message: string,
    latencyMs: number
  ): MCPProviderHealthResult {
    cb.failureCount++;
    cb.lastFailureTime = new Date();

    const newStatus: MCPProviderStatus = cb.failureCount >= cb.config.failureThreshold ? 'unhealthy' : 'degraded';
    if (cb.failureCount >= cb.config.failureThreshold) {
      cb.state = 'open';
      console.log(`[MCP-HEALTH] Circuit breaker OPEN for: ${config.id}`);
    }

    // Emit safe_degrade event
    this.emitSafeDegradeEvent(config.id, errorType, existing.status, newStatus);

    return {
      ...existing,
      status: newStatus,
      lastChecked: new Date(),
      consecutiveFailures: existing.consecutiveFailures + 1,
      circuitBreakerState: cb.state,
      latencyMs,
      error: {
        type: errorType,
        message,
        retryable: MCPErrorClassification[errorType].retryable,
        timestamp: new Date()
      },
      metrics: {
        ...existing.metrics,
        totalRequests: existing.metrics.totalRequests + 1,
        failedRequests: existing.metrics.failedRequests + 1
      }
    };
  }

  /**
   * Classify error into MCPErrorType
   */
  private classifyError(error: unknown): MCPErrorType {
    const msg = error instanceof Error ? error.message.toLowerCase() : '';
    if (msg.includes('timeout') || msg.includes('timed out')) return 'provider_timeout';
    if (msg.includes('econnrefused') || msg.includes('enotfound')) return 'provider_unreachable';
    if (msg.includes('certificate') || msg.includes('ssl') || msg.includes('tls')) return 'provider_tls_error';
    if (msg.includes('401') || msg.includes('403') || msg.includes('auth')) return 'provider_auth_failed';
    if (msg.includes('rate') || msg.includes('429')) return 'provider_rate_limited';
    if (msg.includes('500') || msg.includes('502') || msg.includes('503')) return 'provider_internal_error';
    return 'provider_unreachable';
  }

  /**
   * Emit safe_degrade event to pattern_metrics.jsonl
   */
  private emitSafeDegradeEvent(
    providerId: string,
    triggerReason: MCPErrorType,
    previousStatus: MCPProviderStatus,
    newStatus: MCPProviderStatus
  ): void {
    const classification = MCPErrorClassification[triggerReason];
    const event: MCPSafeDegradeEvent = {
      providerId,
      triggerReason,
      previousStatus,
      newStatus,
      timestamp: new Date(),
      actions: classification.remediation,
      recoveryEstimate: classification.defaultTimeoutMs / 1000
    };

    const metric = {
      timestamp: new Date().toISOString(),
      pattern: 'safe_degrade',
      depth: parseInt(process.env.AF_DEPTH_LEVEL || '0', 10),
      run: process.env.AF_RUN || 'mcp-federation',
      triggers: 1,
      actions: event.actions,
      recovery_cycles: 0,
      degradation_level: newStatus === 'unhealthy' ? 'full' : 'partial',
      mcp_provider: providerId,
      mcp_error_type: triggerReason,
      severity: classification.severity
    };

    fs.appendFileSync(this.metricsFile, JSON.stringify(metric) + '\n', 'utf8');
    this.emit('safeDegradeEvent', event);
    console.log(`[MCP-HEALTH] Safe degrade: ${providerId} -> ${newStatus} (${triggerReason})`);
  }

  /**
   * Emit recovery event
   */
  private emitRecoveryEvent(
    providerId: string,
    previousStatus: MCPProviderStatus,
    newStatus: MCPProviderStatus,
    recoveryTimeMs: number
  ): void {
    const event: MCPProviderRecoveryEvent = {
      providerId,
      previousStatus,
      newStatus,
      timestamp: new Date(),
      recoveryTimeMs,
      circuitBreakerResets: 1
    };
    this.emit('providerRecovery', event);
    console.log(`[MCP-HEALTH] Provider recovered: ${providerId}`);
  }

  /**
   * Compute federation-level health from provider results
   */
  private computeFederationHealth(timestamp: Date, results: MCPProviderHealthResult[]): MCPFederationHealth {
    const healthy = results.filter(r => r.status === 'healthy').length;
    const degraded = results.filter(r => r.status === 'degraded').length;
    const unhealthy = results.filter(r => r.status === 'unhealthy').length;
    const activeCircuitBreakers = results.filter(r => r.circuitBreakerState === 'open').length;

    let overall: MCPProviderStatus = 'healthy';
    let degradationLevel: 'none' | 'partial' | 'full' = 'none';

    if (unhealthy === results.length) {
      overall = 'unhealthy';
      degradationLevel = 'full';
    } else if (unhealthy > 0 || degraded > 0) {
      overall = 'degraded';
      degradationLevel = 'partial';
    }

    const avgLatency = results.length > 0
      ? results.reduce((sum, r) => sum + (r.latencyMs || 0), 0) / results.length
      : 0;

    return {
      timestamp,
      overall,
      providers: results,
      degradationLevel,
      activeCircuitBreakers,
      summary: {
        totalProviders: results.length,
        healthyProviders: healthy,
        degradedProviders: degraded,
        unhealthyProviders: unhealthy,
        averageLatencyMs: avgLatency
      }
    };
  }

  /**
   * Get current federation health
   */
  getFederationHealth(): MCPFederationHealth {
    const results = Array.from(this.healthResults.values());
    return this.computeFederationHealth(new Date(), results);
  }

  /**
   * Get provider health by ID
   */
  getProviderHealth(providerId: string): MCPProviderHealthResult | undefined {
    return this.healthResults.get(providerId);
  }

  /**
   * Force circuit breaker reset for provider
   */
  resetCircuitBreaker(providerId: string): void {
    const cb = this.circuitBreakers.get(providerId);
    if (cb) {
      cb.state = 'closed';
      cb.failureCount = 0;
      cb.halfOpenAttempts = 0;
      console.log(`[MCP-HEALTH] Circuit breaker reset for: ${providerId}`);
    }
  }

  /**
   * Get error classification and remediation for error type
   */
  getErrorRemediation(errorType: MCPErrorType): typeof MCPErrorClassification[MCPErrorType] {
    return MCPErrorClassification[errorType];
  }
}

