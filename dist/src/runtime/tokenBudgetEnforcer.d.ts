/**
 * Token Budget Enforcer - REP-009: 4-Tier Environment Budget Enforcement
 * ========================================================================
 * Implements environment-specific token budget limits with circuit breaker:
 * - local: 50K tokens
 * - development: 100K tokens
 * - staging: 150K tokens
 * - production: 200K tokens
 *
 * Circuit breaker triggers at 90% budget consumption with graceful degradation.
 */
export declare enum EnvironmentTier {
    LOCAL = "local",
    DEVELOPMENT = "development",
    STAGING = "staging",
    PRODUCTION = "production"
}
export interface TokenBudgetConfig {
    tier: EnvironmentTier;
    budgetLimit: number;
    circuitBreakerThreshold: number;
    warningThreshold: number;
    graceDegradationEnabled: boolean;
}
export declare const TOKEN_BUDGET_CONFIGS: Record<EnvironmentTier, TokenBudgetConfig>;
export declare function detectEnvironmentTier(): EnvironmentTier;
export declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
export interface TokenBudgetState {
    sessionId: string;
    tier: EnvironmentTier;
    budgetLimit: number;
    tokensUsed: number;
    circuitState: CircuitState;
    lastUpdate: string;
    warnings: string[];
    degradationActive: boolean;
}
export interface BudgetCheckResult {
    allowed: boolean;
    tokensRemaining: number;
    utilizationPercent: number;
    circuitState: CircuitState;
    degradationActive: boolean;
    message: string;
}
/**
 * Token Budget Enforcer - Singleton for session-based budget tracking
 */
export declare class TokenBudgetEnforcer {
    private state;
    private config;
    private logPath;
    constructor(sessionId?: string);
    /**
     * Get current budget configuration for the detected environment
     */
    getConfig(): TokenBudgetConfig;
    /**
     * Get current state
     */
    getState(): TokenBudgetState;
    /**
     * Check if token consumption is allowed and track usage
     * Returns budget check result with circuit breaker status
     */
    checkAndConsume(tokensRequested: number): BudgetCheckResult;
    /**
     * Get remaining tokens
     */
    getTokensRemaining(): number;
    /**
     * Reset budget (typically called at start of new session/cycle)
     */
    resetBudget(newSessionId?: string): void;
    /**
     * Generate graceful degradation summary
     */
    getGracefulDegradationMessage(): string;
    private createResult;
    private logEvent;
}
export declare function getTokenBudgetEnforcer(sessionId?: string): TokenBudgetEnforcer;
export declare function resetTokenBudgetEnforcer(): void;
export declare function checkTokenBudget(tokensRequested: number): BudgetCheckResult;
export declare function getEnvironmentBudget(): {
    tier: EnvironmentTier;
    limit: number;
};
//# sourceMappingURL=tokenBudgetEnforcer.d.ts.map