/**
 * Load-Safety Controls
 *
 * Implements token-bucket rate limiting, adaptive backoff,
 * and observability growth guardrails.
 *
 * Addresses: "endurance-optimized systems functionally succeed by
 * preserving minimum individual load-bearing capacity"
 */
const DEFAULT_TOKEN_BUCKET = {
    tokensPerMinute: 60,
    burstCapacity: 30,
    costBase: 1,
    costDepthMultiplier: 2,
};
const DEFAULT_BACKOFF = {
    enabled: true,
    failWindow: 20,
    failThreshold: 2,
    sleepSeconds: 5,
    maxSleepSeconds: 60,
};
const DEFAULT_OBS_GUARDRAIL = {
    maxBytesPerMinute: 750000,
    currentSampleRate: 10,
    maxSampleRate: 200,
};
export class LoadSafetyController {
    state;
    tokenConfig;
    backoffConfig;
    obsGuardrail;
    constructor(tokenConfig, backoffConfig, obsGuardrail) {
        this.tokenConfig = { ...DEFAULT_TOKEN_BUCKET, ...tokenConfig };
        this.backoffConfig = { ...DEFAULT_BACKOFF, ...backoffConfig };
        this.obsGuardrail = { ...DEFAULT_OBS_GUARDRAIL, ...obsGuardrail };
        this.state = {
            tokens: this.tokenConfig.burstCapacity,
            lastRefill: Date.now(),
            consecutiveFailures: 0,
            failureTimestamps: [],
            bytesThisMinute: 0,
            minuteStart: Date.now(),
        };
    }
    /**
     * Request tokens for an operation. Returns wait time in ms if throttled.
     */
    requestTokens(depth = 1) {
        this.refillTokens();
        const cost = this.tokenConfig.costBase + depth * this.tokenConfig.costDepthMultiplier;
        if (this.state.tokens >= cost) {
            this.state.tokens -= cost;
            return { allowed: true, waitMs: 0 };
        }
        // Calculate wait time
        const tokensNeeded = cost - this.state.tokens;
        const refillRateMs = 60000 / this.tokenConfig.tokensPerMinute;
        const waitMs = tokensNeeded * refillRateMs;
        return { allowed: false, waitMs };
    }
    refillTokens() {
        const now = Date.now();
        const elapsed = now - this.state.lastRefill;
        const tokensToAdd = (elapsed / 60000) * this.tokenConfig.tokensPerMinute;
        this.state.tokens = Math.min(this.tokenConfig.burstCapacity, this.state.tokens + tokensToAdd);
        this.state.lastRefill = now;
    }
    /**
     * Record a failure and check if backoff is needed.
     */
    recordFailure() {
        if (!this.backoffConfig.enabled) {
            return { shouldBackoff: false, sleepMs: 0 };
        }
        const now = Date.now();
        this.state.failureTimestamps.push(now);
        this.state.consecutiveFailures++;
        // Clean old failures outside window
        const windowMs = this.backoffConfig.failWindow * 1000;
        this.state.failureTimestamps = this.state.failureTimestamps
            .filter(ts => now - ts < windowMs);
        if (this.state.failureTimestamps.length >= this.backoffConfig.failThreshold) {
            // Exponential backoff
            const backoffMultiplier = Math.pow(2, this.state.consecutiveFailures - 1);
            const sleepMs = Math.min(this.backoffConfig.sleepSeconds * 1000 * backoffMultiplier, this.backoffConfig.maxSleepSeconds * 1000);
            return { shouldBackoff: true, sleepMs };
        }
        return { shouldBackoff: false, sleepMs: 0 };
    }
    /**
     * Record success to reset failure counters.
     */
    recordSuccess() {
        this.state.consecutiveFailures = 0;
    }
    /**
     * Check observability growth and adjust sampling if needed.
     */
    checkObservabilityGrowth(bytesWritten) {
        const now = Date.now();
        // Reset minute counter if minute has passed
        if (now - this.state.minuteStart >= 60000) {
            this.state.bytesThisMinute = 0;
            this.state.minuteStart = now;
        }
        this.state.bytesThisMinute += bytesWritten;
        if (this.state.bytesThisMinute > this.obsGuardrail.maxBytesPerMinute) {
            // Increase sampling rate (sample less frequently)
            const newRate = Math.min(this.obsGuardrail.currentSampleRate * 2, this.obsGuardrail.maxSampleRate);
            if (newRate !== this.obsGuardrail.currentSampleRate) {
                this.obsGuardrail.currentSampleRate = newRate;
                return { shouldIncreaseSampling: true, newSampleRate: newRate };
            }
        }
        return { shouldIncreaseSampling: false, newSampleRate: this.obsGuardrail.currentSampleRate };
    }
    /**
     * Get current state for monitoring.
     */
    getState() {
        return {
            tokensAvailable: Math.floor(this.state.tokens),
            consecutiveFailures: this.state.consecutiveFailures,
            sampleRate: this.obsGuardrail.currentSampleRate,
            bytesThisMinute: this.state.bytesThisMinute,
        };
    }
    /**
     * Create from environment variables.
     */
    static fromEnv() {
        return new LoadSafetyController({
            tokensPerMinute: parseInt(process.env.AF_LONGRUN_TOKENS_PER_MIN || '60'),
            burstCapacity: parseInt(process.env.AF_LONGRUN_BURST || '30'),
            costDepthMultiplier: parseInt(process.env.AF_LONGRUN_COST_DEPTH_MULT || '2'),
            costBase: parseInt(process.env.AF_LONGRUN_COST_BASE || '1'),
        }, {
            enabled: process.env.AF_LONGRUN_BACKOFF === '1',
            failWindow: parseInt(process.env.AF_LONGRUN_FAIL_WINDOW || '20'),
            failThreshold: parseInt(process.env.AF_LONGRUN_FAIL_THRESHOLD || '2'),
            sleepSeconds: parseInt(process.env.AF_LONGRUN_BACKOFF_SLEEP_S || '5'),
        }, {
            maxBytesPerMinute: parseInt(process.env.AF_LONGRUN_MAX_BYTES_PER_MIN || '750000'),
            currentSampleRate: parseInt(process.env.AF_LONGRUN_SAMPLE_RATE || '10'),
            maxSampleRate: parseInt(process.env.AF_LONGRUN_SAMPLE_RATE_MAX || '200'),
        });
    }
}
export const loadSafety = LoadSafetyController.fromEnv();
//# sourceMappingURL=load_safety.js.map