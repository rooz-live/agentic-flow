/**
 * MCP Provider Error Classification System
 * NOW Tier: Evidence-first triage for unreachable providers
 */
export declare enum ProviderErrorType {
    PROVIDER_UNREACHABLE = "provider_unreachable",
    PROVIDER_TIMEOUT = "provider_timeout",
    PROVIDER_TLS_ERROR = "provider_tls_error",
    PROVIDER_MISCONFIGURED = "provider_misconfigured",
    PROVIDER_AUTH_FAILURE = "provider_auth_failure",
    PROVIDER_RATE_LIMITED = "provider_rate_limited",
    NETWORK_ERROR = "network_error",
    INTERNAL_ERROR = "internal_error",
    UNKNOWN = "unknown"
}
export interface ProviderErrorEvidence {
    provider_name: string;
    error_type: ProviderErrorType;
    command: string;
    exit_code?: number;
    stderr?: string;
    stdout?: string;
    retry_count: number;
    timestamp: string;
    duration_ms?: number;
    network_reachable: boolean;
    config_path?: string;
    tls_details?: {
        protocol?: string;
        cipher?: string;
        cert_valid?: boolean;
    };
}
export interface CircuitBreakerState {
    provider_name: string;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failure_count: number;
    last_failure_time?: string;
    open_until?: string;
    success_count_in_half_open?: number;
}
/**
 * Classify provider error from command output and context
 */
export declare function classifyProviderError(provider: string, command: string, exitCode: number, stderr: string, stdout: string, retryCount: number): ProviderErrorEvidence;
/**
 * Safe degradation strategy based on error type
 */
export interface DegradationStrategy {
    use_cache: boolean;
    use_offline_mode: boolean;
    retry_after_ms?: number;
    fallback_provider?: string;
    circuit_breaker_minutes: number;
    log_severity: 'error' | 'warn' | 'info';
}
export declare function getDegradationStrategy(errorType: ProviderErrorType): DegradationStrategy;
/**
 * Circuit breaker implementation
 */
export declare class CircuitBreaker {
    private states;
    private readonly failureThreshold;
    private readonly halfOpenSuccessThreshold;
    getState(provider: string): CircuitBreakerState;
    recordFailure(provider: string, errorType: ProviderErrorType): CircuitBreakerState;
    recordSuccess(provider: string): CircuitBreakerState;
    shouldAllowRequest(provider: string): boolean;
    reset(provider: string): void;
    getAllStates(): CircuitBreakerState[];
}
export declare const globalCircuitBreaker: CircuitBreaker;
//# sourceMappingURL=mcp-provider-errors.d.ts.map