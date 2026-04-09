/**
 * MCP Federation Health Check Types
 * 
 * Typed error classification for MCP provider health monitoring
 * Integrates with pattern_logger for safe_degrade event emission
 * 
 * Phase 1: MCP Federation Health Check Implementation
 */

/**
 * MCP Provider Error Types - Typed Error Classification
 * These errors map to specific remediation strategies
 */
export type MCPErrorType =
  | 'provider_unreachable'     // Network connectivity failure
  | 'provider_timeout'          // Request timeout exceeded
  | 'provider_tls_error'        // TLS/SSL handshake or certificate error
  | 'provider_misconfigured'    // Invalid configuration or missing required fields
  | 'provider_rate_limited'     // Rate limit exceeded
  | 'provider_auth_failed'      // Authentication/authorization failure
  | 'provider_internal_error'   // Provider-side 5xx error
  | 'provider_protocol_error';  // MCP protocol violation

/**
 * MCP Provider Health Status
 */
export type MCPProviderStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Circuit Breaker States for provider failover
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

/**
 * MCP Provider Configuration
 */
export interface MCPProviderConfig {
  id: string;
  name: string;
  type: 'stdio' | 'http' | 'websocket' | 'sse';
  command?: string;
  args?: string[];
  endpoint?: string;
  port?: number;
  timeout: number;
  maxRetries: number;
  healthCheckInterval: number;
  enabled: boolean;
  env?: Record<string, string>;
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
    halfOpenRequests: number;
  };
}

/**
 * MCP Provider Health Check Result
 */
export interface MCPProviderHealthResult {
  providerId: string;
  providerName: string;
  status: MCPProviderStatus;
  lastChecked: Date;
  lastSuccessful?: Date;
  consecutiveFailures: number;
  circuitBreakerState: CircuitBreakerState;
  latencyMs?: number;
  error?: {
    type: MCPErrorType;
    message: string;
    code?: string;
    retryable: boolean;
    timestamp: Date;
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatencyMs: number;
    p95LatencyMs: number;
    uptime: number; // percentage
  };
}

/**
 * MCP Federation Health Summary
 */
export interface MCPFederationHealth {
  timestamp: Date;
  overall: MCPProviderStatus;
  providers: MCPProviderHealthResult[];
  degradationLevel: 'none' | 'partial' | 'full';
  activeCircuitBreakers: number;
  summary: {
    totalProviders: number;
    healthyProviders: number;
    degradedProviders: number;
    unhealthyProviders: number;
    averageLatencyMs: number;
  };
}

/**
 * Safe Degrade Event for MCP Provider
 * Emitted when provider enters degraded mode
 */
export interface MCPSafeDegradeEvent {
  providerId: string;
  triggerReason: MCPErrorType;
  previousStatus: MCPProviderStatus;
  newStatus: MCPProviderStatus;
  timestamp: Date;
  actions: string[];
  recoveryEstimate?: number; // seconds
}

/**
 * MCP Provider Recovery Event
 */
export interface MCPProviderRecoveryEvent {
  providerId: string;
  previousStatus: MCPProviderStatus;
  newStatus: MCPProviderStatus;
  timestamp: Date;
  recoveryTimeMs: number;
  circuitBreakerResets: number;
}

/**
 * Error classification mapping with remediation hints
 */
export const MCPErrorClassification: Record<MCPErrorType, {
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  defaultTimeoutMs: number;
  maxRetries: number;
  remediation: string[];
}> = {
  provider_unreachable: {
    severity: 'high',
    retryable: true,
    defaultTimeoutMs: 5000,
    maxRetries: 3,
    remediation: [
      'Check network connectivity',
      'Verify provider endpoint/command',
      'Check firewall rules',
      'Verify DNS resolution'
    ]
  },
  provider_timeout: {
    severity: 'medium',
    retryable: true,
    defaultTimeoutMs: 10000,
    maxRetries: 2,
    remediation: [
      'Increase timeout threshold',
      'Check provider load',
      'Verify network latency',
      'Consider circuit breaker'
    ]
  },
  provider_tls_error: {
    severity: 'high',
    retryable: false,
    defaultTimeoutMs: 5000,
    maxRetries: 0,
    remediation: [
      'Verify TLS certificates',
      'Check certificate expiration',
      'Validate certificate chain',
      'Update CA bundle'
    ]
  },
  provider_misconfigured: {
    severity: 'critical',
    retryable: false,
    defaultTimeoutMs: 0,
    maxRetries: 0,
    remediation: [
      'Validate mcp.json configuration',
      'Check required environment variables',
      'Verify command/args syntax',
      'Review provider documentation'
    ]
  },
  provider_rate_limited: {
    severity: 'low',
    retryable: true,
    defaultTimeoutMs: 60000,
    maxRetries: 1,
    remediation: [
      'Implement request throttling',
      'Check rate limit headers',
      'Consider request batching',
      'Wait for rate limit reset'
    ]
  },
  provider_auth_failed: {
    severity: 'critical',
    retryable: false,
    defaultTimeoutMs: 0,
    maxRetries: 0,
    remediation: [
      'Verify API credentials',
      'Check token expiration',
      'Rotate authentication keys',
      'Review access permissions'
    ]
  },
  provider_internal_error: {
    severity: 'high',
    retryable: true,
    defaultTimeoutMs: 5000,
    maxRetries: 2,
    remediation: [
      'Check provider status page',
      'Review provider logs',
      'Contact provider support',
      'Implement fallback provider'
    ]
  },
  provider_protocol_error: {
    severity: 'critical',
    retryable: false,
    defaultTimeoutMs: 0,
    maxRetries: 0,
    remediation: [
      'Verify MCP protocol version',
      'Check message format',
      'Update MCP client library',
      'Review protocol documentation'
    ]
  }
};

