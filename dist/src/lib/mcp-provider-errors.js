/**
 * MCP Provider Error Classification System
 * NOW Tier: Evidence-first triage for unreachable providers
 */
export var ProviderErrorType;
(function (ProviderErrorType) {
    ProviderErrorType["PROVIDER_UNREACHABLE"] = "provider_unreachable";
    ProviderErrorType["PROVIDER_TIMEOUT"] = "provider_timeout";
    ProviderErrorType["PROVIDER_TLS_ERROR"] = "provider_tls_error";
    ProviderErrorType["PROVIDER_MISCONFIGURED"] = "provider_misconfigured";
    ProviderErrorType["PROVIDER_AUTH_FAILURE"] = "provider_auth_failure";
    ProviderErrorType["PROVIDER_RATE_LIMITED"] = "provider_rate_limited";
    ProviderErrorType["NETWORK_ERROR"] = "network_error";
    ProviderErrorType["INTERNAL_ERROR"] = "internal_error";
    ProviderErrorType["UNKNOWN"] = "unknown";
})(ProviderErrorType || (ProviderErrorType = {}));
/**
 * Classify provider error from command output and context
 */
export function classifyProviderError(provider, command, exitCode, stderr, stdout, retryCount) {
    const timestamp = new Date().toISOString();
    const baseEvidence = {
        provider_name: provider,
        command,
        exit_code: exitCode,
        stderr,
        stdout,
        retry_count: retryCount,
        timestamp,
        network_reachable: true, // Will be updated by network check
    };
    // Classify based on exit code and error messages
    let errorType = ProviderErrorType.UNKNOWN;
    if (exitCode === 124 || stderr.includes('timeout') || stderr.includes('timed out')) {
        errorType = ProviderErrorType.PROVIDER_TIMEOUT;
    }
    else if (stderr.includes('ECONNREFUSED') ||
        stderr.includes('connection refused') ||
        stderr.includes('unreachable') ||
        exitCode === 111) {
        errorType = ProviderErrorType.PROVIDER_UNREACHABLE;
    }
    else if (stderr.includes('TLS') ||
        stderr.includes('SSL') ||
        stderr.includes('certificate') ||
        stderr.includes('CERT_')) {
        errorType = ProviderErrorType.PROVIDER_TLS_ERROR;
    }
    else if (stderr.includes('authentication failed') ||
        stderr.includes('unauthorized') ||
        stderr.includes('invalid token') ||
        exitCode === 401) {
        errorType = ProviderErrorType.PROVIDER_AUTH_FAILURE;
    }
    else if (stderr.includes('rate limit') || stderr.includes('too many requests') || exitCode === 429) {
        errorType = ProviderErrorType.PROVIDER_RATE_LIMITED;
    }
    else if (stderr.includes('command not found') ||
        stderr.includes('No such file') ||
        stderr.includes('config') ||
        stderr.includes('ENOENT')) {
        errorType = ProviderErrorType.PROVIDER_MISCONFIGURED;
    }
    else if (stderr.includes('ENETUNREACH') ||
        stderr.includes('EHOSTUNREACH') ||
        stderr.includes('network')) {
        errorType = ProviderErrorType.NETWORK_ERROR;
    }
    else if (exitCode !== 0) {
        errorType = ProviderErrorType.INTERNAL_ERROR;
    }
    return {
        ...baseEvidence,
        error_type: errorType,
    };
}
export function getDegradationStrategy(errorType) {
    switch (errorType) {
        case ProviderErrorType.PROVIDER_UNREACHABLE:
            return {
                use_cache: true,
                use_offline_mode: true,
                circuit_breaker_minutes: 5,
                log_severity: 'error',
            };
        case ProviderErrorType.PROVIDER_TIMEOUT:
            return {
                use_cache: true,
                use_offline_mode: false,
                retry_after_ms: 30000, // 30s
                circuit_breaker_minutes: 3,
                log_severity: 'warn',
            };
        case ProviderErrorType.PROVIDER_TLS_ERROR:
            return {
                use_cache: true,
                use_offline_mode: true,
                circuit_breaker_minutes: 10,
                log_severity: 'error',
            };
        case ProviderErrorType.PROVIDER_MISCONFIGURED:
            return {
                use_cache: true,
                use_offline_mode: true,
                circuit_breaker_minutes: 0, // Don't retry without intervention
                log_severity: 'error',
            };
        case ProviderErrorType.PROVIDER_AUTH_FAILURE:
            return {
                use_cache: true,
                use_offline_mode: true,
                circuit_breaker_minutes: 0, // Requires credential fix
                log_severity: 'error',
            };
        case ProviderErrorType.PROVIDER_RATE_LIMITED:
            return {
                use_cache: true,
                use_offline_mode: false,
                retry_after_ms: 60000, // 60s
                circuit_breaker_minutes: 1,
                log_severity: 'warn',
            };
        case ProviderErrorType.NETWORK_ERROR:
            return {
                use_cache: true,
                use_offline_mode: true,
                circuit_breaker_minutes: 2,
                log_severity: 'warn',
            };
        default:
            return {
                use_cache: true,
                use_offline_mode: false,
                retry_after_ms: 10000,
                circuit_breaker_minutes: 5,
                log_severity: 'warn',
            };
    }
}
/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
    states = new Map();
    failureThreshold = 3;
    halfOpenSuccessThreshold = 2;
    getState(provider) {
        return (this.states.get(provider) || {
            provider_name: provider,
            state: 'CLOSED',
            failure_count: 0,
        });
    }
    recordFailure(provider, errorType) {
        const state = this.getState(provider);
        const strategy = getDegradationStrategy(errorType);
        if (state.state === 'OPEN') {
            // Already open, check if we can transition to HALF_OPEN
            if (state.open_until && new Date() > new Date(state.open_until)) {
                state.state = 'HALF_OPEN';
                state.success_count_in_half_open = 0;
            }
            this.states.set(provider, state);
            return state;
        }
        if (state.state === 'HALF_OPEN') {
            // Failed in half-open, reopen circuit
            state.state = 'OPEN';
            state.failure_count++;
            state.last_failure_time = new Date().toISOString();
            state.open_until = new Date(Date.now() + strategy.circuit_breaker_minutes * 60 * 1000).toISOString();
            this.states.set(provider, state);
            return state;
        }
        // CLOSED state
        state.failure_count++;
        state.last_failure_time = new Date().toISOString();
        if (state.failure_count >= this.failureThreshold) {
            state.state = 'OPEN';
            state.open_until = new Date(Date.now() + strategy.circuit_breaker_minutes * 60 * 1000).toISOString();
        }
        this.states.set(provider, state);
        return state;
    }
    recordSuccess(provider) {
        const state = this.getState(provider);
        if (state.state === 'HALF_OPEN') {
            state.success_count_in_half_open = (state.success_count_in_half_open || 0) + 1;
            if (state.success_count_in_half_open >= this.halfOpenSuccessThreshold) {
                // Transition back to CLOSED
                state.state = 'CLOSED';
                state.failure_count = 0;
                delete state.last_failure_time;
                delete state.open_until;
                delete state.success_count_in_half_open;
            }
        }
        else if (state.state === 'CLOSED') {
            // Reset failure count on success
            state.failure_count = Math.max(0, state.failure_count - 1);
        }
        this.states.set(provider, state);
        return state;
    }
    shouldAllowRequest(provider) {
        const state = this.getState(provider);
        if (state.state === 'CLOSED' || state.state === 'HALF_OPEN') {
            return true;
        }
        // Check if circuit should transition to HALF_OPEN
        if (state.open_until && new Date() > new Date(state.open_until)) {
            state.state = 'HALF_OPEN';
            state.success_count_in_half_open = 0;
            this.states.set(provider, state);
            return true;
        }
        return false;
    }
    reset(provider) {
        this.states.delete(provider);
    }
    getAllStates() {
        return Array.from(this.states.values());
    }
}
// Singleton instance
export const globalCircuitBreaker = new CircuitBreaker();
//# sourceMappingURL=mcp-provider-errors.js.map