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

// Configuration with safe defaults (optimized for high CPU load scenarios)
export const AF_CPU_HEADROOM_TARGET = parseFloat(process.env.AF_CPU_HEADROOM_TARGET || '0.40'); // 40% idle target (increased from 35%)
export const AF_BATCH_SIZE = parseInt(process.env.AF_BATCH_SIZE || '3', 10); // Reduced from 5 to 3
export const AF_MAX_WIP = parseInt(process.env.AF_MAX_WIP || '6', 10); // Reduced from 10 to 6
export const AF_BACKOFF_MIN_MS = parseInt(process.env.AF_BACKOFF_MIN_MS || '200', 10); // Increased from 100 to 200
export const AF_BACKOFF_MAX_MS = parseInt(process.env.AF_BACKOFF_MAX_MS || '30000', 10);
export const AF_BACKOFF_MULTIPLIER = parseFloat(process.env.AF_BACKOFF_MULTIPLIER || '2.0');

// Token bucket rate limiting (new)
export const AF_RATE_LIMIT_ENABLED = process.env.AF_RATE_LIMIT_ENABLED !== 'false'; // Enabled by default
export const AF_TOKENS_PER_SECOND = parseInt(process.env.AF_TOKENS_PER_SECOND || '10', 10);
export const AF_MAX_BURST = parseInt(process.env.AF_MAX_BURST || '20', 10);

// Circuit breaker configuration (RCA-1764385633682-ilghhf / DEEP-DIVE-3 Phase 1)
export const AF_CIRCUIT_BREAKER_ENABLED = process.env.AF_CIRCUIT_BREAKER_ENABLED !== 'false';
export const AF_CIRCUIT_BREAKER_THRESHOLD = parseInt(process.env.AF_CIRCUIT_BREAKER_THRESHOLD || '5', 10); // Failures to trip
export const AF_CIRCUIT_BREAKER_WINDOW_MS = parseInt(process.env.AF_CIRCUIT_BREAKER_WINDOW_MS || '10000', 10); // 10 seconds
export const AF_CIRCUIT_BREAKER_COOLDOWN_MS = parseInt(process.env.AF_CIRCUIT_BREAKER_COOLDOWN_MS || '30000', 10); // 30 seconds
export const AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS = parseInt(process.env.AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS || '3', 10);

// Circuit breaker states
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation, requests flow through
  OPEN = 'OPEN',         // Circuit tripped, requests rejected
  HALF_OPEN = 'HALF_OPEN' // Testing if circuit can be closed
}

// Circuit breaker state tracking
interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastStateChange: number;
  halfOpenRequests: number;
  windowStart: number;
}

// Governor state
interface GovernorState {
  activeWork: number;
  queuedWork: number;
  completedWork: number;
  failedWork: number;
  currentBackoff: number;
  lastLoadCheck: number;
  // Token bucket state
  availableTokens: number;
  lastTokenRefill: number;
  // Circuit breaker state
  circuitBreaker: CircuitBreakerStats;
  incidents: Array<{
    timestamp: string;
    type: 'WIP_VIOLATION' | 'CPU_OVERLOAD' | 'BACKOFF' | 'BATCH_COMPLETE' | 'RATE_LIMITED' | 'CIRCUIT_OPEN' | 'CIRCUIT_HALF_OPEN' | 'CIRCUIT_CLOSED';
    details: Record<string, unknown>;
  }>;
}

const state: GovernorState = {
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

// Incident logging
const INCIDENT_LOG_PATH = process.env.AF_INCIDENT_LOG || 'logs/governor_incidents.jsonl';

function logIncident(
  type: GovernorState['incidents'][0]['type'],
  details: Record<string, unknown>
): void {
  const incident = {
    timestamp: new Date().toISOString(),
    type,
    details,
  };
  
  state.incidents.push(incident);
  
  // Write to file (non-blocking, best effort)
  try {
    const dir = path.dirname(INCIDENT_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(INCIDENT_LOG_PATH, JSON.stringify(incident) + '\n');
  } catch (err) {
    console.warn('Failed to log governor incident:', err);
  }
}

// System load monitoring
function getCpuLoad(): number {
  const cpus = os.cpus();
  const numCpus = cpus.length;
  
  // Calculate 1-minute load average as percentage
  const loadAvg = os.loadavg()[0]; // 1-minute average
  return (loadAvg / numCpus) * 100;
}

function getIdlePercentage(): number {
  return 100 - getCpuLoad();
}

// Token bucket rate limiting
function refillTokens(): void {
  if (!AF_RATE_LIMIT_ENABLED) {
    state.availableTokens = AF_MAX_BURST; // Always full when disabled
    return;
  }
  
  const now = Date.now();
  const elapsedMs = now - state.lastTokenRefill;
  const elapsedSeconds = elapsedMs / 1000;
  
  const tokensToAdd = elapsedSeconds * AF_TOKENS_PER_SECOND;
  state.availableTokens = Math.min(
    state.availableTokens + tokensToAdd,
    AF_MAX_BURST
  );
  state.lastTokenRefill = now;
}

function consumeToken(): boolean {
  refillTokens();

  if (state.availableTokens >= 1) {
    state.availableTokens -= 1;
    return true;
  }

  return false;
}

// ============================================================================
// Circuit Breaker Implementation (RCA-1764385633682-ilghhf / DEEP-DIVE-3)
// States: CLOSED → OPEN → HALF_OPEN → CLOSED
// ============================================================================

/**
 * Check if circuit breaker allows requests to pass through
 * @returns true if request is allowed, false if circuit is open
 */
export function isCircuitClosed(): boolean {
  if (!AF_CIRCUIT_BREAKER_ENABLED) {
    return true; // Always allow if disabled
  }

  const cb = state.circuitBreaker;
  const now = Date.now();

  // Reset window if expired
  if (now - cb.windowStart > AF_CIRCUIT_BREAKER_WINDOW_MS) {
    cb.failures = 0;
    cb.windowStart = now;
  }

  switch (cb.state) {
    case CircuitBreakerState.CLOSED:
      return true;

    case CircuitBreakerState.OPEN:
      // Check if cooldown has expired
      if (now - cb.lastStateChange >= AF_CIRCUIT_BREAKER_COOLDOWN_MS) {
        // Transition to HALF_OPEN
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
      // Allow limited requests in half-open state
      if (cb.halfOpenRequests < AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS) {
        cb.halfOpenRequests++;
        return true;
      }
      return false;

    default:
      return true;
  }
}

/**
 * Record a successful operation for circuit breaker
 */
export function recordSuccess(): void {
  if (!AF_CIRCUIT_BREAKER_ENABLED) return;

  const cb = state.circuitBreaker;
  cb.successes++;

  if (cb.state === CircuitBreakerState.HALF_OPEN) {
    // If all half-open requests succeeded, close the circuit
    if (cb.successes >= AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS) {
      cb.state = CircuitBreakerState.CLOSED;
      cb.failures = 0;
      cb.successes = 0;
      cb.lastStateChange = Date.now();
      cb.windowStart = Date.now();
      logIncident('CIRCUIT_CLOSED', {
        halfOpenSuccesses: AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS,
        message: 'Circuit recovered after successful half-open requests',
      });
    }
  }
}

/**
 * Record a failed operation for circuit breaker
 */
export function recordFailure(): void {
  if (!AF_CIRCUIT_BREAKER_ENABLED) return;

  const cb = state.circuitBreaker;
  const now = Date.now();

  cb.failures++;
  cb.lastFailureTime = now;

  // Reset successes counter on failure
  cb.successes = 0;

  if (cb.state === CircuitBreakerState.HALF_OPEN) {
    // Any failure in half-open state trips the circuit again
    cb.state = CircuitBreakerState.OPEN;
    cb.lastStateChange = now;
    logIncident('CIRCUIT_OPEN', {
      trigger: 'half-open-failure',
      failures: cb.failures,
    });
  } else if (cb.state === CircuitBreakerState.CLOSED) {
    // Check if we've exceeded the failure threshold
    if (cb.failures >= AF_CIRCUIT_BREAKER_THRESHOLD) {
      cb.state = CircuitBreakerState.OPEN;
      cb.lastStateChange = now;
      logIncident('CIRCUIT_OPEN', {
        trigger: 'threshold-exceeded',
        failures: cb.failures,
        threshold: AF_CIRCUIT_BREAKER_THRESHOLD,
        windowMs: AF_CIRCUIT_BREAKER_WINDOW_MS,
      });
    }
  }
}

/**
 * Get current circuit breaker state
 */
export function getCircuitBreakerState(): CircuitBreakerStats {
  return { ...state.circuitBreaker };
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message = 'Circuit breaker is open - request rejected') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

async function waitForCapacity(): Promise<void> {
  // Check circuit breaker first
  if (!isCircuitClosed()) {
    logIncident('CIRCUIT_OPEN', {
      state: state.circuitBreaker.state,
      failures: state.circuitBreaker.failures,
      cooldownRemaining: AF_CIRCUIT_BREAKER_COOLDOWN_MS - (Date.now() - state.circuitBreaker.lastStateChange),
    });
    throw new CircuitBreakerOpenError();
  }
  // Token bucket rate limiting
  while (!consumeToken()) {
    logIncident('RATE_LIMITED', {
      availableTokens: state.availableTokens,
      tokensPerSecond: AF_TOKENS_PER_SECOND,
      activeWork: state.activeWork,
    });
    await sleep(100); // Wait for token refill
  }
  
  // WIP limit
  while (state.activeWork >= AF_MAX_WIP) {
    await sleep(50);
  }
  
  // Check CPU load
  const now = Date.now();
  if (now - state.lastLoadCheck > 1000) {
    state.lastLoadCheck = now;
    const idlePercent = getIdlePercentage();
    const targetIdlePercent = AF_CPU_HEADROOM_TARGET * 100;
    
    if (idlePercent < targetIdlePercent) {
      logIncident('CPU_OVERLOAD', {
        idlePercent,
        targetIdlePercent,
        activeWork: state.activeWork,
        backoff: state.currentBackoff,
      });
      
      await sleep(state.currentBackoff);
      
      // Exponential backoff
      state.currentBackoff = Math.min(
        state.currentBackoff * AF_BACKOFF_MULTIPLIER,
        AF_BACKOFF_MAX_MS
      );
    } else {
      // Reset backoff when load is acceptable
      state.currentBackoff = AF_BACKOFF_MIN_MS;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a batch of tasks with concurrency control
 * 
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param options - Optional configuration overrides
 * @returns Array of results
 */
export async function runBatched<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options?: {
    batchSize?: number;
    maxRetries?: number;
  }
): Promise<R[]> {
  const batchSize = options?.batchSize || AF_BATCH_SIZE;
  const maxRetries = options?.maxRetries || 3;
  const results: R[] = [];
  
  state.queuedWork += items.length;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    await waitForCapacity();
    
    state.activeWork += batch.length;
    state.queuedWork -= batch.length;
    
    if (state.activeWork > AF_MAX_WIP) {
      logIncident('WIP_VIOLATION', {
        activeWork: state.activeWork,
        maxWip: AF_MAX_WIP,
        batchSize: batch.length,
      });
    }
    
    const batchPromises = batch.map(async (item, batchIndex) => {
      const itemIndex = i + batchIndex;
      let lastError: Error | undefined;

      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          const result = await processor(item, itemIndex);
          state.completedWork++;
          recordSuccess(); // Circuit breaker success tracking
          return result;
        } catch (err) {
          lastError = err as Error;
          if (retry < maxRetries) {
            const retryBackoff = AF_BACKOFF_MIN_MS * Math.pow(2, retry);
            logIncident('BACKOFF', {
              retry: retry + 1,
              maxRetries,
              backoff: retryBackoff,
              error: lastError.message,
            });
            await sleep(retryBackoff);
          }
        }
      }

      // Only record failure after all retries exhausted
      state.failedWork++;
      recordFailure(); // Circuit breaker failure tracking
      throw lastError;
    });
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      logIncident('BATCH_COMPLETE', {
        batchIndex: Math.floor(i / batchSize),
        batchSize: batch.length,
        completed: state.completedWork,
        failed: state.failedWork,
      });
    } finally {
      state.activeWork -= batch.length;
    }
  }
  
  return results;
}

/**
 * Guard a single async operation with WIP limits
 * 
 * @param operation - Async function to execute
 * @returns Result of the operation
 */
export async function guarded<R>(operation: () => Promise<R>): Promise<R> {
  await waitForCapacity();

  state.activeWork++;
  state.queuedWork--;

  try {
    const result = await operation();
    state.completedWork++;
    recordSuccess(); // Circuit breaker success tracking
    return result;
  } catch (err) {
    state.failedWork++;
    recordFailure(); // Circuit breaker failure tracking
    throw err;
  } finally {
    state.activeWork--;
  }
}

/**
 * Wait for all active work to complete
 */
export async function drain(): Promise<void> {
  while (state.activeWork > 0 || state.queuedWork > 0) {
    await sleep(100);
  }
}

/**
 * Get current governor statistics
 */
export function getStats(): Readonly<GovernorState> {
  return {
    ...state,
    incidents: [...state.incidents],
  };
}

/**
 * Reset governor state (for testing)
 */
export function reset(): void {
  state.activeWork = 0;
  state.queuedWork = 0;
  state.completedWork = 0;
  state.failedWork = 0;
  state.currentBackoff = AF_BACKOFF_MIN_MS;
  state.lastLoadCheck = Date.now();
  state.availableTokens = AF_MAX_BURST;
  state.lastTokenRefill = Date.now();
  // Reset circuit breaker
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

/**
 * Export configuration for visibility
 */
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
  // Circuit breaker configuration
  AF_CIRCUIT_BREAKER_ENABLED,
  AF_CIRCUIT_BREAKER_THRESHOLD,
  AF_CIRCUIT_BREAKER_WINDOW_MS,
  AF_CIRCUIT_BREAKER_COOLDOWN_MS,
  AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS,
};
