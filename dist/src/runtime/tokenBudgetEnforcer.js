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
import * as fs from 'fs';
import * as path from 'path';
// Environment tier definitions with token budgets
export var EnvironmentTier;
(function (EnvironmentTier) {
    EnvironmentTier["LOCAL"] = "local";
    EnvironmentTier["DEVELOPMENT"] = "development";
    EnvironmentTier["STAGING"] = "staging";
    EnvironmentTier["PRODUCTION"] = "production";
})(EnvironmentTier || (EnvironmentTier = {}));
// 4-Tier Token Budget Configuration (REP-009)
export const TOKEN_BUDGET_CONFIGS = {
    [EnvironmentTier.LOCAL]: {
        tier: EnvironmentTier.LOCAL,
        budgetLimit: 50000,
        circuitBreakerThreshold: 0.90,
        warningThreshold: 0.75,
        graceDegradationEnabled: true
    },
    [EnvironmentTier.DEVELOPMENT]: {
        tier: EnvironmentTier.DEVELOPMENT,
        budgetLimit: 100000,
        circuitBreakerThreshold: 0.90,
        warningThreshold: 0.75,
        graceDegradationEnabled: true
    },
    [EnvironmentTier.STAGING]: {
        tier: EnvironmentTier.STAGING,
        budgetLimit: 150000,
        circuitBreakerThreshold: 0.90,
        warningThreshold: 0.80,
        graceDegradationEnabled: true
    },
    [EnvironmentTier.PRODUCTION]: {
        tier: EnvironmentTier.PRODUCTION,
        budgetLimit: 200000,
        circuitBreakerThreshold: 0.90,
        warningThreshold: 0.85,
        graceDegradationEnabled: true
    }
};
// Environment detection priority order
export function detectEnvironmentTier() {
    // Priority 1: Explicit AF_ENVIRONMENT
    const afEnv = process.env.AF_ENVIRONMENT?.toLowerCase();
    if (afEnv) {
        if (afEnv === 'prod' || afEnv === 'production')
            return EnvironmentTier.PRODUCTION;
        if (afEnv === 'stg' || afEnv === 'staging')
            return EnvironmentTier.STAGING;
        if (afEnv === 'dev' || afEnv === 'development')
            return EnvironmentTier.DEVELOPMENT;
        if (afEnv === 'local')
            return EnvironmentTier.LOCAL;
    }
    // Priority 2: NODE_ENV
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    if (nodeEnv === 'production')
        return EnvironmentTier.PRODUCTION;
    if (nodeEnv === 'staging')
        return EnvironmentTier.STAGING;
    if (nodeEnv === 'development')
        return EnvironmentTier.DEVELOPMENT;
    // Priority 3: CI/CD indicators
    if (process.env.CI || process.env.GITHUB_ACTIONS)
        return EnvironmentTier.DEVELOPMENT;
    // Default: LOCAL
    return EnvironmentTier.LOCAL;
}
export var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (CircuitState = {}));
const GOALIE_DIR = process.env.AF_GOALIE_DIR || '.goalie';
const BUDGET_LOG_FILE = 'token_budget_log.jsonl';
/**
 * Token Budget Enforcer - Singleton for session-based budget tracking
 */
export class TokenBudgetEnforcer {
    state;
    config;
    logPath;
    constructor(sessionId) {
        const tier = detectEnvironmentTier();
        this.config = TOKEN_BUDGET_CONFIGS[tier];
        this.logPath = path.join(process.cwd(), GOALIE_DIR, BUDGET_LOG_FILE);
        this.state = {
            sessionId: sessionId || `session_${Date.now()}`,
            tier: tier,
            budgetLimit: this.config.budgetLimit,
            tokensUsed: 0,
            circuitState: CircuitState.CLOSED,
            lastUpdate: new Date().toISOString(),
            warnings: [],
            degradationActive: false
        };
    }
    /**
     * Get current budget configuration for the detected environment
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Check if token consumption is allowed and track usage
     * Returns budget check result with circuit breaker status
     */
    checkAndConsume(tokensRequested) {
        const newTotal = this.state.tokensUsed + tokensRequested;
        const utilizationPercent = newTotal / this.config.budgetLimit;
        const currentUtilization = this.state.tokensUsed / this.config.budgetLimit;
        // Circuit breaker logic - block ALL requests when OPEN
        if (this.state.circuitState === CircuitState.OPEN) {
            // Only allow recovery via explicit resetBudget() call
            return this.createResult(false, 'Circuit breaker OPEN - budget exceeded. Call resetBudget() to recover.');
        }
        // Check if we're approaching or exceeding threshold
        if (utilizationPercent >= this.config.circuitBreakerThreshold) {
            // Record tokens used up to threshold before tripping
            this.state.tokensUsed = newTotal;
            this.state.circuitState = CircuitState.OPEN;
            this.state.degradationActive = true;
            this.logEvent('circuit_open', {
                tokensUsed: this.state.tokensUsed,
                budgetLimit: this.config.budgetLimit,
                utilizationPercent
            });
            return this.createResult(false, this.getGracefulDegradationMessage());
        }
        // Warning threshold check
        if (utilizationPercent >= this.config.warningThreshold) {
            const warning = `Token budget warning: ${(utilizationPercent * 100).toFixed(1)}% used`;
            if (!this.state.warnings.includes(warning)) {
                this.state.warnings.push(warning);
                this.logEvent('budget_warning', { utilizationPercent });
            }
        }
        // Consume tokens
        this.state.tokensUsed = newTotal;
        this.state.lastUpdate = new Date().toISOString();
        return this.createResult(true, 'Token budget OK');
    }
    /**
     * Get remaining tokens
     */
    getTokensRemaining() {
        return Math.max(0, this.config.budgetLimit - this.state.tokensUsed);
    }
    /**
     * Reset budget (typically called at start of new session/cycle)
     */
    resetBudget(newSessionId) {
        this.state.tokensUsed = 0;
        this.state.circuitState = CircuitState.CLOSED;
        this.state.degradationActive = false;
        this.state.warnings = [];
        this.state.lastUpdate = new Date().toISOString();
        if (newSessionId) {
            this.state.sessionId = newSessionId;
        }
        this.logEvent('budget_reset', { newSessionId: this.state.sessionId });
    }
    /**
     * Generate graceful degradation summary
     */
    getGracefulDegradationMessage() {
        const remaining = this.getTokensRemaining();
        const used = this.state.tokensUsed;
        const limit = this.config.budgetLimit;
        return [
            `⚠️ TOKEN BUDGET CIRCUIT BREAKER ACTIVATED`,
            `Environment: ${this.state.tier.toUpperCase()}`,
            `Budget: ${used.toLocaleString()} / ${limit.toLocaleString()} tokens (${((used / limit) * 100).toFixed(1)}%)`,
            `Remaining: ${remaining.toLocaleString()} tokens`,
            ``,
            `GRACEFUL DEGRADATION ACTIVE:`,
            `• New requests are blocked until budget resets`,
            `• Current context will be summarized`,
            `• Non-critical operations are skipped`,
            `• Manual override: AF_BUDGET_OVERRIDE=1`
        ].join('\n');
    }
    createResult(allowed, message) {
        return {
            allowed,
            tokensRemaining: this.getTokensRemaining(),
            utilizationPercent: this.state.tokensUsed / this.config.budgetLimit,
            circuitState: this.state.circuitState,
            degradationActive: this.state.degradationActive,
            message
        };
    }
    logEvent(event, data) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                sessionId: this.state.sessionId,
                tier: this.state.tier,
                event,
                data,
                state: {
                    tokensUsed: this.state.tokensUsed,
                    budgetLimit: this.config.budgetLimit,
                    circuitState: this.state.circuitState
                }
            };
            const dir = path.dirname(this.logPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');
        }
        catch (error) {
            // Silent fail for logging - don't break main flow
            console.error('[TokenBudgetEnforcer] Log error:', error);
        }
    }
}
// Singleton instance for current session
let _instance = null;
export function getTokenBudgetEnforcer(sessionId) {
    if (!_instance) {
        _instance = new TokenBudgetEnforcer(sessionId);
    }
    return _instance;
}
export function resetTokenBudgetEnforcer() {
    _instance = null;
}
// Export convenience functions
export function checkTokenBudget(tokensRequested) {
    return getTokenBudgetEnforcer().checkAndConsume(tokensRequested);
}
export function getEnvironmentBudget() {
    const tier = detectEnvironmentTier();
    return { tier, limit: TOKEN_BUDGET_CONFIGS[tier].budgetLimit };
}
//# sourceMappingURL=tokenBudgetEnforcer.js.map