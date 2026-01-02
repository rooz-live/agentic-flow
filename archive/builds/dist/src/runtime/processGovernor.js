/**
 * Process Governor - Dynamic Concurrency Control
 *
 * Prevents runaway process spawning through:
 * - Work-in-progress (WIP) limits
 * - Dynamic rate limiting based on system load
 * - Exponential backoff on failures
 * - Batch processing with configurable sizes
 *
 * Usage:
 *   import { runBatched, drain } from './runtime/processGovernor';
 *   await runBatched(tasks, async (task) => processTask(task));
 *   await drain(); // Wait for all work to complete
 */
import os from 'os';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
// Configuration with safe defaults (optimized for high CPU load scenarios)
export const AF_CPU_HEADROOM_TARGET = parseFloat(process.env.AF_CPU_HEADROOM_TARGET || '0.40');
export const AF_BATCH_SIZE = parseInt(process.env.AF_BATCH_SIZE || '3', 10);
export const AF_MAX_WIP = parseInt(process.env.AF_MAX_WIP || '6', 10);
export const AF_BACKOFF_MIN_MS = parseInt(process.env.AF_BACKOFF_MIN_MS || '200', 10);
export const AF_BACKOFF_MAX_MS = parseInt(process.env.AF_BACKOFF_MAX_MS || '30000', 10);
export const AF_BACKOFF_MULTIPLIER = parseFloat(process.env.AF_BACKOFF_MULTIPLIER || '2.0');
// Token bucket rate limiting (new)
export const AF_RATE_LIMIT_ENABLED = process.env.AF_RATE_LIMIT_ENABLED !== 'false';
export const AF_TOKENS_PER_SECOND = parseInt(process.env.AF_TOKENS_PER_SECOND || '10', 10);
export const AF_MAX_BURST = parseInt(process.env.AF_MAX_BURST || '20', 10);
// Circuit breaker configuration
export const AF_CIRCUIT_BREAKER_ENABLED = process.env.AF_CIRCUIT_BREAKER_ENABLED !== 'false';
export const AF_CIRCUIT_BREAKER_THRESHOLD = parseInt(process.env.AF_CIRCUIT_BREAKER_THRESHOLD || '5', 10);
export const AF_CIRCUIT_BREAKER_WINDOW_MS = parseInt(process.env.AF_CIRCUIT_BREAKER_WINDOW_MS || '10000', 10);
export const AF_CIRCUIT_BREAKER_COOLDOWN_MS = parseInt(process.env.AF_CIRCUIT_BREAKER_COOLDOWN_MS || '30000', 10);
export const AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS = parseInt(process.env.AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS || '3', 10);
export var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "CLOSED";
    CircuitBreakerState["OPEN"] = "OPEN";
    CircuitBreakerState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitBreakerState || (CircuitBreakerState = {}));
const state = {
    activeWork: 0,
    queuedWork: 0,
    completedWork: 0,
    failedWork: 0,
    currentBackoff: AF_BACKOFF_MIN_MS,
    lastLoadCheck: Date.now(),
    availableTokens: AF_MAX_BURST,
    lastTokenRefill: Date.now(),
    circuitBreaker: {
        state: CircuitBreakerState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        lastStateChange: Date.now(),
        halfOpenRequests: 0,
        windowStart: Date.now(),
    },
    incidents: [],
};
const INCIDENT_LOG_PATH = process.env.AF_INCIDENT_LOG || 'logs/governor_incidents.jsonl';
const LEARNING_BRIDGE_ENABLED = process.env.AF_LEARNING_BRIDGE_ENABLED !== 'false';
const LEARNING_BRIDGE_PATH = process.env.AF_LEARNING_BRIDGE_PATH
    || path.join(process.cwd(), 'scripts', 'agentdb', 'process_governor_ingest.js');
function forwardIncidentToLearningBridge(incident) {
    if (!LEARNING_BRIDGE_ENABLED) {
        return;
    }
    if (!fs.existsSync(LEARNING_BRIDGE_PATH)) {
        return;
    }
    const payload = {
        ...incident,
        stateSnapshot: {
            activeWork: state.activeWork,
            queuedWork: state.queuedWork,
            completedWork: state.completedWork,
            failedWork: state.failedWork,
            circuitBreaker: state.circuitBreaker.state,
            availableTokens: state.availableTokens,
            queuedIncidents: state.incidents.length,
        },
    };
    try {
        const child = spawn(process.execPath, [LEARNING_BRIDGE_PATH], {
            stdio: ['pipe', 'ignore', 'ignore'],
            env: { ...process.env, AF_LEARNING_SOURCE: 'processGovernor' },
        });
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
    }
    catch (error) {
        console.warn('[LearningBridge] Failed to forward incident:', error);
    }
}
function logIncident(type, details) {
    const incident = {
        timestamp: new Date().toISOString(),
        type,
        details,
    };
    state.incidents.push(incident);
    try {
        const dir = path.dirname(INCIDENT_LOG_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.appendFileSync(INCIDENT_LOG_PATH, JSON.stringify(incident) + '\n');
    }
    catch (err) {
        console.warn('Failed to log governor incident:', err);
    }
    forwardIncidentToLearningBridge(incident);
}
function getCpuLoad() {
    const cpus = os.cpus();
    const numCpus = cpus.length;
    const loadAvg = os.loadavg()[0] ?? 0;
    return ((loadAvg || 0) / Math.max(numCpus, 1)) * 100;
}
function getIdlePercentage() {
    return 100 - getCpuLoad();
}
function refillTokens() {
    if (!AF_RATE_LIMIT_ENABLED) {
        state.availableTokens = AF_MAX_BURST;
        return;
    }
    const now = Date.now();
    const elapsedMs = now - state.lastTokenRefill;
    const elapsedSeconds = elapsedMs / 1000;
    const tokensToAdd = elapsedSeconds * AF_TOKENS_PER_SECOND;
    state.availableTokens = Math.min(state.availableTokens + tokensToAdd, AF_MAX_BURST);
    state.lastTokenRefill = now;
}
function consumeToken() {
    refillTokens();
    if (state.availableTokens >= 1) {
        state.availableTokens -= 1;
        return true;
    }
    return false;
}
export function isCircuitClosed() {
    if (!AF_CIRCUIT_BREAKER_ENABLED)
        return true;
    const cb = state.circuitBreaker;
    const now = Date.now();
    if (now - cb.windowStart > AF_CIRCUIT_BREAKER_WINDOW_MS) {
        cb.failures = 0;
        cb.windowStart = now;
    }
    switch (cb.state) {
        case CircuitBreakerState.CLOSED:
            return true;
        case CircuitBreakerState.OPEN:
            if (now - cb.lastStateChange >= AF_CIRCUIT_BREAKER_COOLDOWN_MS) {
                cb.state = CircuitBreakerState.HALF_OPEN;
                cb.halfOpenRequests = 0;
                cb.lastStateChange = now;
                logIncident('CIRCUIT_HALF_OPEN', {
                    cooldownMs: AF_CIRCUIT_BREAKER_COOLDOWN_MS,
                    previousFailures: cb.failures,
                });
                return true;
            }
            return false;
        case CircuitBreakerState.HALF_OPEN:
            if (cb.halfOpenRequests < AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS) {
                cb.halfOpenRequests++;
                return true;
            }
            return false;
        default:
            return true;
    }
}
export function recordSuccess() {
    if (!AF_CIRCUIT_BREAKER_ENABLED)
        return;
    const cb = state.circuitBreaker;
    cb.successes++;
    if (cb.state === CircuitBreakerState.HALF_OPEN) {
        if (cb.successes >= AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS) {
            cb.state = CircuitBreakerState.CLOSED;
            cb.failures = 0;
            cb.successes = 0;
            cb.lastStateChange = Date.now();
            cb.windowStart = Date.now();
            logIncident('CIRCUIT_CLOSED', { message: 'Circuit recovered' });
        }
    }
}
export function recordFailure() {
    if (!AF_CIRCUIT_BREAKER_ENABLED)
        return;
    const cb = state.circuitBreaker;
    const now = Date.now();
    cb.failures++;
    cb.lastFailureTime = now;
    cb.successes = 0;
    if (cb.state === CircuitBreakerState.HALF_OPEN) {
        cb.state = CircuitBreakerState.OPEN;
        cb.lastStateChange = now;
        logIncident('CIRCUIT_OPEN', { trigger: 'half-open-failure', failures: cb.failures });
    }
    else if (cb.state === CircuitBreakerState.CLOSED) {
        if (cb.failures >= AF_CIRCUIT_BREAKER_THRESHOLD) {
            cb.state = CircuitBreakerState.OPEN;
            cb.lastStateChange = now;
            logIncident('CIRCUIT_OPEN', { trigger: 'threshold-exceeded', failures: cb.failures });
        }
    }
}
export function getCircuitBreakerState() {
    return { ...state.circuitBreaker };
}
export class CircuitBreakerOpenError extends Error {
    constructor(message = 'Circuit breaker is open - request rejected') {
        super(message);
        this.name = 'CircuitBreakerOpenError';
    }
}
/**
 * Wait for capacity and reserve slots atomically.
 * @param count - Number of slots to reserve
 */
async function waitForCapacity(count = 1) {
    while (true) {
        // 1. Circuit Breaker
        if (!isCircuitClosed()) {
            logIncident('CIRCUIT_OPEN', { state: state.circuitBreaker.state });
            throw new CircuitBreakerOpenError();
        }
        // 2. Token Bucket (Rate Limit)
        // For batch > 1, we might consume multiple tokens? 
        // Standard implementation consumes 1 token per request/batch call usually, 
        // but here let's stick to 1 token per function call to runBatched/guarded
        if (!consumeToken()) {
            logIncident('RATE_LIMITED', { activeWork: state.activeWork });
            await sleep(100);
            continue;
        }
        // 3. WIP Limit
        if (state.activeWork + count > AF_MAX_WIP) {
            // Just wait, don't log violation yet
            await sleep(50);
            continue;
        }
        // 4. CPU Load
        const now = Date.now();
        if (now - state.lastLoadCheck > 1000) {
            state.lastLoadCheck = now;
            const idlePercent = getIdlePercentage();
            const targetIdlePercent = AF_CPU_HEADROOM_TARGET * 100;
            if (idlePercent < targetIdlePercent) {
                logIncident('CPU_OVERLOAD', { idlePercent, targetIdlePercent, activeWork: state.activeWork });
                await sleep(state.currentBackoff);
                state.currentBackoff = Math.min(state.currentBackoff * AF_BACKOFF_MULTIPLIER, AF_BACKOFF_MAX_MS);
                continue;
            }
            else {
                state.currentBackoff = AF_BACKOFF_MIN_MS;
            }
        }
        // If we got here, all checks passed. Reserve slot(s).
        state.activeWork += count;
        // Log if we somehow exceeded max (race edge case, or if allowed to burst)
        if (state.activeWork > AF_MAX_WIP) {
            logIncident('WIP_VIOLATION', { activeWork: state.activeWork, maxWip: AF_MAX_WIP });
        }
        return;
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function runBatched(items, processor, options) {
    const batchSize = options?.batchSize || AF_BATCH_SIZE;
    const maxRetries = options?.maxRetries || 3;
    const results = [];
    state.queuedWork += items.length;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        // Atomically wait and reserve slots
        await waitForCapacity(batch.length);
        state.queuedWork -= batch.length;
        const batchPromises = batch.map(async (item, batchIndex) => {
            const itemIndex = i + batchIndex;
            let lastError;
            for (let retry = 0; retry <= maxRetries; retry++) {
                try {
                    const result = await processor(item, itemIndex);
                    state.completedWork++;
                    recordSuccess();
                    return result;
                }
                catch (err) {
                    lastError = err;
                    if (retry < maxRetries) {
                        const retryBackoff = AF_BACKOFF_MIN_MS * Math.pow(2, retry);
                        logIncident('BACKOFF', { retry: retry + 1, error: lastError.message });
                        await sleep(retryBackoff);
                    }
                }
            }
            state.failedWork++;
            recordFailure();
            throw lastError;
        });
        try {
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            logIncident('BATCH_COMPLETE', { batchSize: batch.length });
        }
        finally {
            state.activeWork -= batch.length; // Release slots
        }
    }
    return results;
}
export async function guarded(operation) {
    await waitForCapacity(1);
    state.queuedWork--;
    try {
        const result = await operation();
        state.completedWork++;
        recordSuccess();
        return result;
    }
    catch (err) {
        state.failedWork++;
        recordFailure();
        throw err;
    }
    finally {
        state.activeWork--; // Release slot
    }
}
export async function drain() {
    while (state.activeWork > 0 || state.queuedWork > 0) {
        await sleep(100);
    }
}
export function getStats() {
    return { ...state, incidents: [...state.incidents] };
}
export function reset() {
    state.activeWork = 0;
    state.queuedWork = 0;
    state.completedWork = 0;
    state.failedWork = 0;
    state.currentBackoff = AF_BACKOFF_MIN_MS;
    state.lastLoadCheck = Date.now();
    state.availableTokens = AF_MAX_BURST;
    state.lastTokenRefill = Date.now();
    state.circuitBreaker = {
        state: CircuitBreakerState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        lastStateChange: Date.now(),
        halfOpenRequests: 0,
        windowStart: Date.now(),
    };
    state.incidents = [];
}
export const config = {
    AF_CPU_HEADROOM_TARGET,
    AF_BATCH_SIZE,
    AF_MAX_WIP,
    AF_BACKOFF_MIN_MS,
    AF_BACKOFF_MAX_MS,
    AF_BACKOFF_MULTIPLIER,
    AF_RATE_LIMIT_ENABLED,
    AF_TOKENS_PER_SECOND,
    AF_MAX_BURST,
    AF_CIRCUIT_BREAKER_ENABLED,
    AF_CIRCUIT_BREAKER_THRESHOLD,
    AF_CIRCUIT_BREAKER_WINDOW_MS,
    AF_CIRCUIT_BREAKER_COOLDOWN_MS,
    AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS,
};
//# sourceMappingURL=processGovernor.js.map