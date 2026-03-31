// @ts-nocheck
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
import { ingestGovernorEvent } from './processGovernorBridge';
import { getThresholdManager, DynamicThresholds } from './dynamicThresholdManager';

// Configuration with safe defaults (optimized for high CPU load scenarios)
export const AF_CPU_HEADROOM_TARGET = parseFloat(process.env.AF_CPU_HEADROOM_TARGET || '0.40'); 
export const AF_BATCH_SIZE = parseInt(process.env.AF_BATCH_SIZE || '3', 10);
export const AF_MAX_WIP = parseInt(process.env.AF_MAX_WIP || '6', 10);
export const AF_BACKOFF_MIN_MS = parseInt(process.env.AF_BACKOFF_MIN_MS || '200', 10);
export const AF_BACKOFF_MAX_MS = parseInt(process.env.AF_BACKOFF_MAX_MS || '30000', 10);
export const AF_BACKOFF_MULTIPLIER = parseFloat(process.env.AF_BACKOFF_MULTIPLIER || '2.0');

// Token bucket rate limiting (enhanced)
export const AF_RATE_LIMIT_ENABLED = process.env.AF_RATE_LIMIT_ENABLED !== 'false';
export const AF_TOKENS_PER_SECOND = parseInt(process.env.AF_TOKENS_PER_SECOND || '5', 10); // Reduced from 10 to 5 ops/sec ceiling
export const AF_MAX_BURST = parseInt(process.env.AF_MAX_BURST || '10', 10); // Reduced from 20 to 10
export const AF_TOKEN_REFILL_INTERVAL_MS = parseInt(process.env.AF_TOKEN_REFILL_INTERVAL_MS || '200', 10); // Refill every 200ms

// Enhanced exponential backoff (Phase 1.1)
export const AF_ENHANCED_BACKOFF_START_MS = parseInt(process.env.AF_ENHANCED_BACKOFF_START_MS || '250', 10);
export const AF_ENHANCED_BACKOFF_FACTOR = parseFloat(process.env.AF_ENHANCED_BACKOFF_FACTOR || '2.0');
export const AF_ENHANCED_BACKOFF_JITTER = parseFloat(process.env.AF_ENHANCED_BACKOFF_JITTER || '0.20'); // 20% jitter
export const AF_ENHANCED_BACKOFF_CEILING_MS = parseInt(process.env.AF_ENHANCED_BACKOFF_CEILING_MS || '60000', 10); // 60s ceiling

// Micro-batching configuration (Phase 1.1)
export const AF_MICRO_BATCH_SIZE = parseInt(process.env.AF_MICRO_BATCH_SIZE || '10', 10);
export const AF_MICRO_BATCH_FLUSH_INTERVAL_MS = parseInt(process.env.AF_MICRO_BATCH_FLUSH_INTERVAL_MS || '5000', 10); // 5s flush interval
export const AF_MICRO_BATCH_DROP_OLDEST = process.env.AF_MICRO_BATCH_DROP_OLDEST !== 'false';

// Adaptive polling configuration (Phase 1.1)
export const AF_ADAPTIVE_POLL_MIN_MS = parseInt(process.env.AF_ADAPTIVE_POLL_MIN_MS || '50', 10);
export const AF_ADAPTIVE_POLL_MAX_MS = parseInt(process.env.AF_ADAPTIVE_POLL_MAX_MS || '5000', 10);

// Advanced throttling features (Phase 1.1)
export const AF_ADAPTIVE_THROTTLING_ENABLED = process.env.AF_ADAPTIVE_THROTTLING_ENABLED !== 'false';
export const AF_PREDICTIVE_THROTTLING = process.env.AF_PREDICTIVE_THROTTLING !== 'false';
export const AF_DEPENDENCY_ANALYSIS_ENABLED = process.env.AF_DEPENDENCY_ANALYSIS_ENABLED !== 'false';
export const AF_BATCH_MAPPING_ENABLED = process.env.AF_BATCH_MAPPING_ENABLED !== 'false';
export const AF_EXECUTION_ORDER_OPTIMIZATION = process.env.AF_EXECUTION_ORDER_OPTIMIZATION !== 'false';
export const AF_LOAD_HISTORY_SIZE = parseInt(process.env.AF_LOAD_HISTORY_SIZE || '30', 10);
export const AF_MAX_BATCH_SIZE = parseInt(process.env.AF_MAX_BATCH_SIZE || '50', 10);

// CPU load thresholds (Phase 1.1)
export const AF_CPU_WARNING_THRESHOLD = parseFloat(process.env.AF_CPU_WARNING_THRESHOLD || '0.65'); // 65%
export const AF_CPU_CRITICAL_THRESHOLD = parseFloat(process.env.AF_CPU_CRITICAL_THRESHOLD || '0.80'); // 80%

// Circuit breaker configuration
export const AF_CIRCUIT_BREAKER_ENABLED = process.env.AF_CIRCUIT_BREAKER_ENABLED !== 'false';
export const AF_CIRCUIT_BREAKER_THRESHOLD = parseInt(process.env.AF_CIRCUIT_BREAKER_THRESHOLD || '5', 10);
export const AF_CIRCUIT_BREAKER_WINDOW_MS = parseInt(process.env.AF_CIRCUIT_BREAKER_WINDOW_MS || '10000', 10);
export const AF_CIRCUIT_BREAKER_COOLDOWN_MS = parseInt(process.env.AF_CIRCUIT_BREAKER_COOLDOWN_MS || '30000', 10);
export const AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS = parseInt(process.env.AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS || '3', 10);

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastStateChange: number;
  halfOpenRequests: number;
  windowStart: number;
}

// Phase 1.1: Enhanced metrics types
interface LoadHistoryEntry {
  timestamp: number;
  cpuLoad: number;
  idlePercentage?: number;
  activeWork: number;
  queuedWork: number;
}

interface ProcessDependency {
  id: string;
  dependencies: string[];
  priority: number;
  estimatedDuration?: number;
  resourceWeight?: number;
}

interface GovernorState {
  activeWork: number;
  queuedWork: number;
  completedWork: number;
  failedWork: number;
  currentBackoff: number;
  lastLoadCheck: number;
  availableTokens: number;
  lastTokenRefill: number;
  circuitBreaker: CircuitBreakerStats;
  // Phase 1.1: Enhanced state tracking
  loadHistory: LoadHistoryEntry[];
  processDependencies: Map<string, ProcessDependency>;
  adaptiveThrottlingLevel: number;
  predictiveLoadScore: number;
  lastDependencyAnalysis: number;
  // Phase 2.0: Dynamic threshold integration
  dynamicThresholds: DynamicThresholds | null;
  lastThresholdUpdate: number;
  // Phase 2.0: Degradation & Cascade tracking
  recentPerformance: Array<{
    timestamp: number;
    reward: number;
    success: boolean;
  }>;
  cascadeFailureWindow: Array<{
    timestamp: number;
    taskId: string;
  }>;
  incidentBuffer: Array<{
    timestamp: string;
    type: 'WIP_VIOLATION' | 'CPU_OVERLOAD' | 'BACKOFF' | 'BATCH_COMPLETE' | 'RATE_LIMITED' | 'CIRCUIT_OPEN' | 'CIRCUIT_HALF_OPEN' | 'CIRCUIT_CLOSED' | 'ADAPTIVE_THROTTLING' | 'PREDICTIVE_THROTTLING' | 'DEPENDENCY_ANALYSIS' | 'DEGRADATION_DETECTED' | 'CASCADE_FAILURE' | 'DIVERGENCE_HIGH';
    details: Record<string, unknown>;
  }>;
  incidents: Array<{
    timestamp: string;
    type: 'WIP_VIOLATION' | 'CPU_OVERLOAD' | 'BACKOFF' | 'BATCH_COMPLETE' | 'RATE_LIMITED' | 'CIRCUIT_OPEN' | 'CIRCUIT_HALF_OPEN' | 'CIRCUIT_CLOSED' | 'ADAPTIVE_THROTTLING' | 'PREDICTIVE_THROTTLING' | 'DEPENDENCY_ANALYSIS' | 'DEGRADATION_DETECTED' | 'CASCADE_FAILURE' | 'DIVERGENCE_HIGH';
    details: Record<string, unknown>;
  }>;
  // Phase 1.1: Enhanced metrics
  metrics: {
    tokens_available: number;
    throttle_events: number;
    backoff_ms: number;
    poll_ms: number;
    batch_depth: number;
    dropped_events: number;
    queue_depth: number;
    flush_latency_ms: number;
    // Phase 2.0: Dynamic threshold metrics
    degradation_score: number;
    cascade_failure_count: number;
    divergence_rate_current: number;
  };
}

const state: GovernorState = {
  activeWork: 0,
  queuedWork: 0,
  completedWork: 0,
  failedWork: 0,
  currentBackoff: AF_ENHANCED_BACKOFF_START_MS,
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
  // Phase 1.1: Enhanced state initialization
  loadHistory: [],
  processDependencies: new Map(),
  adaptiveThrottlingLevel: 1.0,
  predictiveLoadScore: 0.0,
  lastDependencyAnalysis: 0,
  // Phase 2.0: Dynamic threshold state
  dynamicThresholds: null,
  lastThresholdUpdate: 0,
  recentPerformance: [],
  cascadeFailureWindow: [],
  incidentBuffer: [],
  incidents: [],
  metrics: {
    tokens_available: AF_MAX_BURST,
    throttle_events: 0,
    backoff_ms: AF_ENHANCED_BACKOFF_START_MS,
    poll_ms: AF_ADAPTIVE_POLL_MIN_MS,
    batch_depth: 0,
    dropped_events: 0,
    queue_depth: 0,
    flush_latency_ms: 0,
  },
};

const INCIDENT_LOG_PATH = process.env.AF_INCIDENT_LOG || 'logs/governor_incidents.jsonl';
const LEARNING_BRIDGE_ENABLED = process.env.AF_LEARNING_BRIDGE_ENABLED !== 'false';
const LEARNING_BRIDGE_PATH = process.env.AF_LEARNING_BRIDGE_PATH
  || path.join(process.cwd(), 'scripts', 'agentdb', 'process_governor_ingest.js');

// Phase 1.1: Memory-mapped ring buffer configuration
const INCIDENT_BUFFER_MAX_SIZE = parseInt(process.env.AF_INCIDENT_BUFFER_SIZE || '1000', 10);
const INCIDENT_FLUSH_INTERVAL_MS = parseInt(process.env.AF_INCIDENT_FLUSH_INTERVAL_MS || '5000', 10);
let flushTimer: NodeJS.Timeout | null = null;
let isFlushingBuffer = false;

function forwardIncidentToLearningBridge(
  incident: GovernorState['incidents'][0]
): void {
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
  } catch (error) {
    console.warn('[LearningBridge] Failed to forward incident:', error);
  }
}

/**
 * Phase 1.1: Memory-mapped ring buffer with async flush
 * Reduces I/O pressure by buffering incidents in memory and flushing periodically
 */
async function flushIncidentBuffer(): Promise<void> {
  if (isFlushingBuffer || state.incidentBuffer.length === 0) {
    return;
  }

  isFlushingBuffer = true;
  const flushStart = Date.now();
  const toFlush = [...state.incidentBuffer];
  state.incidentBuffer = [];

  try {
    const dir = path.dirname(INCIDENT_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Batch write incidents
    const logContent = toFlush.map(inc => JSON.stringify(inc)).join('\n') + '\n';
    fs.appendFileSync(INCIDENT_LOG_PATH, logContent);

    // Update flush latency metric
    state.metrics.flush_latency_ms = Date.now() - flushStart;
  } catch (err) {
    console.warn('[ProcessGovernor] Failed to flush incident buffer:', err);
    // On error, restore buffered incidents (with fallback to learning bridge)
    state.incidentBuffer.unshift(...toFlush.slice(0, Math.min(100, toFlush.length)));
  } finally {
    isFlushingBuffer = false;
  }
}

function scheduleBufferFlush(): void {
  if (!flushTimer) {
    flushTimer = setInterval(() => {
      flushIncidentBuffer().catch(err => 
        console.warn('[ProcessGovernor] Flush error:', err)
      );
    }, INCIDENT_FLUSH_INTERVAL_MS);
  }
}

function logIncident(
  type: GovernorState['incidents'][0]['type'],
  details: Record<string, unknown>
): void {
  const incident = {
    timestamp: new Date().toISOString(),
    type,
    details,
  };

  // Phase 3: Forward to ProcessGovernorBridge for pattern metrics
  try {
// @ts-expect-error - Type incompatibility requires refactoring
    ingestGovernorEvent(incident);
  } catch (err) {
    // Graceful degradation: bridge failure doesn't crash governor
    console.warn('[ProcessGovernor] Bridge ingestion failed:', err);
  }

  // Phase 1.1: Buffer incidents in memory
  state.incidentBuffer.push(incident);
  state.incidents.push(incident); // Keep for getStats()

  // Drop oldest if buffer overflows
  if (state.incidentBuffer.length > INCIDENT_BUFFER_MAX_SIZE) {
    const dropped = state.incidentBuffer.shift();
    state.metrics.dropped_events++;
    if (dropped) {
      // Fallback: try learning bridge for dropped events
      forwardIncidentToLearningBridge(dropped);
    }
  }

  // Update metrics
  state.metrics.batch_depth = state.incidentBuffer.length;

  // Schedule periodic flush
  scheduleBufferFlush();

  // Forward high-priority incidents immediately
  if (type === 'CIRCUIT_OPEN' || type === 'CPU_OVERLOAD') {
    forwardIncidentToLearningBridge(incident);
  }
}

function getCpuLoad(): number {
  const cpus = os.cpus();
  const numCpus = cpus.length;
  const loadAvg = os.loadavg()[0] ?? 0;
  return Math.min(((loadAvg || 0) / Math.max(numCpus, 1)) * 100, 100);
}

function getIdlePercentage(): number {
  return Math.max(0, 100 - getCpuLoad());
}

/**
 * Phase 1.1: Enhanced token bucket with interval-based refilling
 * Refills tokens at a fixed rate (AF_TOKEN_REFILL_INTERVAL_MS)
 * This reduces CPU overhead from constant refill calculations
 */
function refillTokens(): void {
  if (!AF_RATE_LIMIT_ENABLED) {
    state.availableTokens = AF_MAX_BURST;
    state.metrics.tokens_available = AF_MAX_BURST;
    return;
  }

  const now = Date.now();
  const elapsedMs = now - state.lastTokenRefill;

  // Only refill if enough time has passed (reduces overhead)
  if (elapsedMs >= AF_TOKEN_REFILL_INTERVAL_MS) {
    const intervals = Math.floor(elapsedMs / AF_TOKEN_REFILL_INTERVAL_MS);
    const tokensToAdd = (AF_TOKENS_PER_SECOND * AF_TOKEN_REFILL_INTERVAL_MS / 1000) * intervals;
    
    state.availableTokens = Math.min(
      state.availableTokens + tokensToAdd,
      AF_MAX_BURST
    );
    state.lastTokenRefill = now - (elapsedMs % AF_TOKEN_REFILL_INTERVAL_MS);
    
    // Update metrics
    state.metrics.tokens_available = state.availableTokens;
  }
}

function consumeToken(): boolean {
  refillTokens();
  if (state.availableTokens >= 1) {
    state.availableTokens -= 1;
    return true;
  }
  return false;
}

export function isCircuitClosed(): boolean {
  if (!AF_CIRCUIT_BREAKER_ENABLED) return true;

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

export function recordSuccess(): void {
  if (!AF_CIRCUIT_BREAKER_ENABLED) return;
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

export function recordFailure(): void {
  if (!AF_CIRCUIT_BREAKER_ENABLED) return;
  const cb = state.circuitBreaker;
  const now = Date.now();
  cb.failures++;
  cb.lastFailureTime = now;
  cb.successes = 0;

  if (cb.state === CircuitBreakerState.HALF_OPEN) {
    cb.state = CircuitBreakerState.OPEN;
    cb.lastStateChange = now;
    logIncident('CIRCUIT_OPEN', { trigger: 'half-open-failure', failures: cb.failures });
  } else if (cb.state === CircuitBreakerState.CLOSED) {
    if (cb.failures >= AF_CIRCUIT_BREAKER_THRESHOLD) {
      cb.state = CircuitBreakerState.OPEN;
      cb.lastStateChange = now;
      logIncident('CIRCUIT_OPEN', { trigger: 'threshold-exceeded', failures: cb.failures });
    }
  }
}

export function getCircuitBreakerState(): CircuitBreakerStats {
  return { ...state.circuitBreaker };
}

export class CircuitBreakerOpenError extends Error {
  constructor(message = 'Circuit breaker is open - request rejected') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Enhanced proactive admission control with intelligent CPU load detection and adaptive throttling.
 * @param count - Number of slots to reserve
 */
async function waitForCapacity(count: number = 1): Promise<void> {
  // Update load history for predictive analysis
  updateLoadHistory();
  
  // Calculate adaptive throttling level
  const throttlingLevel = calculateAdaptiveThrottlingLevel();
  state.adaptiveThrottlingLevel = throttlingLevel;
  
  // Apply adaptive delays based on throttling level
  const adaptiveDelay = Math.floor((1 - throttlingLevel) * AF_BACKOFF_MIN_MS);
  
  while (true) {
    // 1. Circuit Breaker
    if (!isCircuitClosed()) {
      logIncident('CIRCUIT_OPEN', { state: state.circuitBreaker.state });
      throw new CircuitBreakerOpenError();
    }

    // 2. Predictive Load Check (if enabled)
    if (AF_PREDICTIVE_THROTTLING) {
      const predictiveScore = calculatePredictiveLoadScore();
      state.predictiveLoadScore = predictiveScore;
      
      if (predictiveScore > AF_CPU_CRITICAL_THRESHOLD) {
        logIncident('PREDICTIVE_THROTTLING', {
          predictiveScore,
          threshold: AF_CPU_CRITICAL_THRESHOLD,
          activeWork: state.activeWork
        });
        await sleep(adaptiveDelay * 2); // Longer delay for predicted high load
        continue;
      }
    }

    // 3. Enhanced Token Bucket (Rate Limit) with adaptive throttling
    const adjustedTokensPerSecond = Math.floor(AF_TOKENS_PER_SECOND * throttlingLevel);
    const adjustedMaxBurst = Math.floor(AF_MAX_BURST * throttlingLevel);
    
    // For batch > 1, we might consume multiple tokens
    const tokensNeeded = Math.ceil(count * throttlingLevel);
    
    if (state.availableTokens < tokensNeeded) {
      logIncident('RATE_LIMITED', {
        activeWork: state.activeWork,
        tokensNeeded,
        availableTokens: state.availableTokens,
        throttlingLevel
      });
      await sleep(adaptiveDelay);
      continue;
    }

    // 4. Adaptive WIP Limit based on system load
    const adaptiveMaxWip = Math.floor(AF_MAX_WIP * throttlingLevel);
    if (state.activeWork + count > adaptiveMaxWip) {
      logIncident('ADAPTIVE_THROTTLING', {
        activeWork: state.activeWork,
        requestedSlots: count,
        adaptiveMaxWip,
        throttlingLevel
      });
      await sleep(adaptiveDelay);
      continue;
    }

    // 5. Enhanced CPU Load Check with adaptive thresholds and adaptive polling
    const now = Date.now();
    
    // Phase 1.1: Adaptive polling interval based on load
    const cpuLoad = getCpuLoad();
    const loadRatio = cpuLoad / 100;
    const pollInterval = Math.floor(
      AF_ADAPTIVE_POLL_MIN_MS + 
      (AF_ADAPTIVE_POLL_MAX_MS - AF_ADAPTIVE_POLL_MIN_MS) * loadRatio
    );
    state.metrics.poll_ms = pollInterval;
    
    if (now - state.lastLoadCheck > pollInterval) {
      state.lastLoadCheck = now;
      const idlePercent = getIdlePercentage();
      
      // Adaptive target based on throttling level
      const targetIdlePercent = AF_CPU_HEADROOM_TARGET * 100 * throttlingLevel;
      
      // Multi-tier CPU load response with enhanced backoff
      if (cpuLoad > AF_CPU_CRITICAL_THRESHOLD * 100) {
        logIncident('CPU_OVERLOAD', {
          idlePercent,
          cpuLoad,
          targetIdlePercent,
          activeWork: state.activeWork,
          level: 'critical',
          pollInterval
        });
        
        // Phase 1.1: Enhanced exponential backoff with jitter
        const jitter = Math.random() * AF_ENHANCED_BACKOFF_JITTER;
        const backoffWithJitter = state.currentBackoff * (1 + jitter);
        await sleep(backoffWithJitter);
        state.currentBackoff = Math.min(
          state.currentBackoff * AF_ENHANCED_BACKOFF_FACTOR * 1.5, // Faster escalation for critical
          AF_ENHANCED_BACKOFF_CEILING_MS
        );
        state.metrics.backoff_ms = state.currentBackoff;
        continue;
      } else if (cpuLoad > AF_CPU_WARNING_THRESHOLD * 100) {
        logIncident('CPU_OVERLOAD', {
          idlePercent,
          cpuLoad,
          targetIdlePercent,
          activeWork: state.activeWork,
          level: 'warning',
          pollInterval
        });
        
        await sleep(state.currentBackoff);
        state.currentBackoff = Math.min(
          state.currentBackoff * AF_ENHANCED_BACKOFF_FACTOR,
          AF_ENHANCED_BACKOFF_CEILING_MS
        );
        state.metrics.backoff_ms = state.currentBackoff;
        continue;
      } else if (idlePercent < targetIdlePercent) {
        logIncident('CPU_OVERLOAD', {
          idlePercent,
          cpuLoad,
          targetIdlePercent,
          activeWork: state.activeWork,
          level: 'adaptive',
          pollInterval
        });
        
        state.metrics.throttle_events++;
        await sleep(adaptiveDelay);
        continue;
      } else {
        // Reset backoff on healthy load
        state.currentBackoff = AF_ENHANCED_BACKOFF_START_MS;
        state.metrics.backoff_ms = state.currentBackoff;
      }
    }

    // If we got here, all checks passed. Reserve slot(s) and consume tokens.
    state.activeWork += count;
    state.availableTokens -= tokensNeeded;
    
    // Phase 1.1: Update queue depth and token metrics
    state.metrics.tokens_available = state.availableTokens;
    state.metrics.queue_depth = state.queuedWork;
    
    // Log if we somehow exceeded max (race edge case)
    if (state.activeWork > adaptiveMaxWip) {
        logIncident('WIP_VIOLATION', {
          activeWork: state.activeWork,
          maxWip: adaptiveMaxWip,
          throttlingLevel
        });
    }
    
    return;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Enhanced CPU load detection and adaptive throttling
function updateLoadHistory(): void {
  const now = Date.now();
  const cpuLoad = getCpuLoad();
  const idlePercentage = getIdlePercentage();
  
  const entry: LoadHistoryEntry = {
    timestamp: now,
    cpuLoad,
    idlePercentage,
    activeWork: state.activeWork,
    queuedWork: state.queuedWork,
  };
  
  state.loadHistory.push(entry);
  
  // Keep only the recent history
  if (state.loadHistory.length > AF_LOAD_HISTORY_SIZE) {
    state.loadHistory.shift();
  }
}

function calculatePredictiveLoadScore(): number {
  if (state.loadHistory.length < 3) return 0.5; // Default medium load
  
  // Calculate trend based on recent load history
  const recent = state.loadHistory.slice(-3);
  const loadTrend = recent[2].cpuLoad - recent[0].cpuLoad;
  const workTrend = recent[2].activeWork - recent[0].activeWork;
  
  // Predictive score: 0 = low load expected, 1 = high load expected
  const trendScore = Math.max(0, Math.min(1, (loadTrend + workTrend * 10) / 100));
  const currentLoadScore = getCpuLoad() / 100;
  
  // Weight current load more heavily than trend
  return currentLoadScore * 0.7 + trendScore * 0.3;
}

function calculateAdaptiveThrottlingLevel(): number {
  if (!AF_ADAPTIVE_THROTTLING_ENABLED) return 1.0;
  
  const currentLoad = getCpuLoad() / 100;
  const predictiveScore = calculatePredictiveLoadScore();
  
  // Combine current and predictive load for throttling decision
  const combinedLoad = Math.max(currentLoad, predictiveScore);
  
  // Calculate throttling level: 1.0 = no throttling, 0.1 = maximum throttling
  let throttlingLevel = 1.0;
  
  if (combinedLoad > AF_CPU_CRITICAL_THRESHOLD) {
    throttlingLevel = 0.1; // Severe throttling
  } else if (combinedLoad > AF_CPU_WARNING_THRESHOLD) {
    throttlingLevel = 0.3; // Moderate throttling
  } else if (combinedLoad > AF_CPU_HEADROOM_TARGET) {
    throttlingLevel = 0.6; // Light throttling
  }
  
  return throttlingLevel;
}

// Process dependency analysis and batch optimization
function analyzeProcessDependencies(items: any[]): ProcessDependency[] {
  if (!AF_DEPENDENCY_ANALYSIS_ENABLED) {
    return items.map((item, index) => ({
      id: `item-${index}`,
      dependencies: [],
      priority: 1,
      estimatedDuration: 1000,
      resourceWeight: 1,
    }));
  }
  
  // Simple dependency analysis - in real implementation, this would analyze
  // actual process relationships, resource requirements, etc.
  return items.map((item, index) => {
    const hasDependencies = index > 0 && index % 3 === 0; // Every 3rd item depends on previous
    const priority = hasDependencies ? 2 : 1;
    
    return {
      id: `item-${index}`,
      dependencies: hasDependencies ? [`item-${index - 1}`] : [],
      priority,
      estimatedDuration: 1000 + Math.random() * 2000, // 1-3 seconds
      resourceWeight: priority === 2 ? 2 : 1, // Higher priority items use more resources
    };
  });
}

function optimizeExecutionOrder(dependencies: ProcessDependency[]): ProcessDependency[] {
  if (!AF_EXECUTION_ORDER_OPTIMIZATION) return dependencies;
  
  // Topological sort to respect dependencies
  const sorted: ProcessDependency[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  function visit(nodeId: string): void {
    if (visiting.has(nodeId)) {
      // Circular dependency detected, skip
      return;
    }
    if (visited.has(nodeId)) return;
    
    visiting.add(nodeId);
    const node = dependencies.find(d => d.id === nodeId);
    if (node) {
      for (const depId of node.dependencies) {
        visit(depId);
      }
      sorted.push(node);
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  }
  
  // Visit all nodes
  for (const dep of dependencies) {
    visit(dep.id);
  }
  
  // Sort by priority within dependency constraints
  return sorted.sort((a, b) => a.priority - b.priority);
}

function createOptimalBatches<T>(items: T[], dependencies: ProcessDependency[]): T[][] {
  if (!AF_BATCH_MAPPING_ENABLED) {
    return Array.from({ length: Math.ceil(items.length / AF_BATCH_SIZE) }, (_, i) =>
      items.slice(i * AF_BATCH_SIZE, (i + 1) * AF_BATCH_SIZE)
    );
  }
  
  const batches: T[][] = [];
  const orderedDeps = optimizeExecutionOrder(dependencies);
  let currentBatch: T[] = [];
  let currentBatchResources = 0;
  const maxBatchResources = AF_MAX_BATCH_SIZE;
  
  for (const dep of orderedDeps) {
    const itemIndex = parseInt(dep.id.split('-')[1]);
    const item = items[itemIndex];
    
    // Check if adding this item would exceed batch resource limits
    if (currentBatchResources + dep.resourceWeight > maxBatchResources ||
        currentBatch.length >= AF_MAX_BATCH_SIZE) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchResources = 0;
      }
    }
    
    currentBatch.push(item);
    currentBatchResources += dep.resourceWeight;
  }
  
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  
  return batches.length > 0 ? batches : [items]; // Fallback to single batch
}

export async function runBatched<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options?: { batchSize?: number; maxRetries?: number; }
): Promise<R[]> {
  const batchSize = options?.batchSize || AF_BATCH_SIZE;
  const maxRetries = options?.maxRetries || 3;
  const results: R[] = [];

  state.queuedWork += items.length;

  // Analyze process dependencies for optimization
  const dependencies = analyzeProcessDependencies(items);
  
  // Create optimal batches based on dependencies and system load
  const batches = createOptimalBatches(items, dependencies);
  
  logIncident('DEPENDENCY_ANALYSIS', {
    totalItems: items.length,
    dependenciesFound: dependencies.length,
    batchesCreated: batches.length,
    adaptiveThrottlingLevel: state.adaptiveThrottlingLevel
  });

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const originalIndices = batch.map(item => items.indexOf(item));

    // Atomically wait and reserve slots with adaptive throttling
    await waitForCapacity(batch.length);
    state.queuedWork -= batch.length;

    // Enhanced batch processing with dependency-aware execution
    const batchPromises = batch.map(async (item, localBatchIndex) => {
      const originalIndex = originalIndices[localBatchIndex];
      let lastError: Error | undefined;

      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          const result = await processor(item, originalIndex);
          state.completedWork++;
          recordSuccess();
          return result;
        } catch (err) {
          lastError = err as Error;
          if (retry < maxRetries) {
            // Enhanced exponential backoff with jitter and adaptive scaling
            const baseBackoff = AF_BACKOFF_MIN_MS * Math.pow(2, retry);
            const adaptiveScaling = 1 + (1 - state.adaptiveThrottlingLevel); // Scale backoff based on load
            const jitter = Math.random() * 0.2; // 20% jitter
            const retryBackoff = Math.floor(baseBackoff * adaptiveScaling * (1 + jitter));
            
            logIncident('BACKOFF', {
              retry: retry + 1,
              error: lastError.message,
              backoffMs: retryBackoff,
              adaptiveThrottlingLevel: state.adaptiveThrottlingLevel,
              batchIndex: batchIndex + 1,
              totalBatches: batches.length
            });
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
      
      logIncident('BATCH_COMPLETE', {
        batchSize: batch.length,
        batchIndex: batchIndex + 1,
        totalBatches: batches.length,
        adaptiveThrottlingLevel: state.adaptiveThrottlingLevel,
        cpuLoad: getCpuLoad(),
        idlePercentage: getIdlePercentage()
      });
    } finally {
      state.activeWork -= batch.length; // Release slots
    }
    
    // Adaptive delay between batches based on system load
    if (batchIndex < batches.length - 1) { // Not the last batch
      const interBatchDelay = Math.floor(
        (1 - state.adaptiveThrottlingLevel) * AF_BACKOFF_MIN_MS
      );
      if (interBatchDelay > 0) {
        await sleep(interBatchDelay);
      }
    }
  }

  return results;
}

export async function guarded<R>(operation: () => Promise<R>): Promise<R> {
  await waitForCapacity(1);
  state.queuedWork--;

  try {
    const result = await operation();
    state.completedWork++;
    recordSuccess();
    return result;
  } catch (err) {
    state.failedWork++;
    recordFailure();
    throw err;
  } finally {
    state.activeWork--; // Release slot
  }
}

export async function drain(): Promise<void> {
  while (state.activeWork > 0 || state.queuedWork > 0) {
    await sleep(100);
  }
}

export function getStats(): Readonly<GovernorState> {
  return { ...state, incidents: [...state.incidents] };
}

export function reset(): void {
  // Clear flush timer if exists
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  
  // Flush remaining incidents before reset
  flushIncidentBuffer().catch(err => 
    console.warn('[ProcessGovernor] Final flush error:', err)
  );
  
  state.activeWork = 0;
  state.queuedWork = 0;
  state.completedWork = 0;
  state.failedWork = 0;
  state.currentBackoff = AF_ENHANCED_BACKOFF_START_MS;
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
  state.loadHistory = [];
  state.processDependencies.clear();
  state.adaptiveThrottlingLevel = 1.0;
  state.predictiveLoadScore = 0.0;
  state.lastDependencyAnalysis = 0;
  state.incidentBuffer = [];
  state.incidents = [];
  state.metrics = {
    tokens_available: AF_MAX_BURST,
    throttle_events: 0,
    backoff_ms: AF_ENHANCED_BACKOFF_START_MS,
    poll_ms: AF_ADAPTIVE_POLL_MIN_MS,
    batch_depth: 0,
    dropped_events: 0,
    queue_depth: 0,
    flush_latency_ms: 0,
  };
}

export const config = {
  // Original config
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
  // Phase 1.1: Enhanced config
  AF_TOKEN_REFILL_INTERVAL_MS,
  AF_ENHANCED_BACKOFF_START_MS,
  AF_ENHANCED_BACKOFF_FACTOR,
  AF_ENHANCED_BACKOFF_JITTER,
  AF_ENHANCED_BACKOFF_CEILING_MS,
  AF_MICRO_BATCH_SIZE,
  AF_MICRO_BATCH_FLUSH_INTERVAL_MS,
  AF_MICRO_BATCH_DROP_OLDEST,
  AF_ADAPTIVE_POLL_MIN_MS,
  AF_ADAPTIVE_POLL_MAX_MS,
  AF_ADAPTIVE_THROTTLING_ENABLED,
  AF_PREDICTIVE_THROTTLING,
  AF_DEPENDENCY_ANALYSIS_ENABLED,
  AF_BATCH_MAPPING_ENABLED,
  AF_EXECUTION_ORDER_OPTIMIZATION,
  AF_LOAD_HISTORY_SIZE,
  AF_MAX_BATCH_SIZE,
  AF_CPU_WARNING_THRESHOLD,
  AF_CPU_CRITICAL_THRESHOLD,
};
