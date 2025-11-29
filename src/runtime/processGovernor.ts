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
  incidents: Array<{
    timestamp: string;
    type: 'WIP_VIOLATION' | 'CPU_OVERLOAD' | 'BACKOFF' | 'BATCH_COMPLETE' | 'RATE_LIMITED';
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

async function waitForCapacity(): Promise<void> {
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
      
      state.failedWork++;
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
    return result;
  } catch (err) {
    state.failedWork++;
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
};
