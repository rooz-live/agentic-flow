/**
 * ProcessGovernor Bridge - Pattern Metrics Integration
 * 
 * Maps ProcessGovernor events to standardized pattern metrics for value stream delivery:
 * - CPU_OVERLOAD → safe-degrade pattern
 * - RATE_LIMITED → iteration-budget pattern
 * - BACKOFF → failure-strategy pattern
 * - CIRCUIT_OPEN → fault-tolerance pattern
 * 
 * Design:
 * - <2s overhead via buffered JSONL writes
 * - Advisory by default (AF_PROD_CYCLE_MODE=advisory)
 * - Graceful degradation on missing sinks
 * - Zero dependencies beyond Node stdlib
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

// Configuration
const PATTERN_METRICS_PATH = process.env.AF_PATTERN_METRICS_PATH 
  || path.join(process.cwd(), '.goalie', 'pattern_metrics.jsonl');

const CYCLE_LOG_PATH = process.env.AF_CYCLE_LOG_PATH
  || path.join(process.cwd(), '.goalie', 'cycle_log.jsonl');

const LEARNING_EVENTS_PATH = process.env.AF_LEARNING_EVENTS_PATH
  || path.join(process.cwd(), '.agentdb', 'learning', 'events.jsonl');

const BUFFER_FLUSH_INTERVAL_MS = parseInt(process.env.AF_BRIDGE_FLUSH_MS || '250', 10);
const BUFFER_MAX_SIZE = parseInt(process.env.AF_BRIDGE_BUFFER_SIZE || '1000', 10);
const ENABLED = process.env.AF_GOVERNOR_BRIDGE_ENABLED !== 'false';
const RUN_ID = process.env.AF_RUN_ID || `run-${Date.now()}`;

interface Economic {
  cod: number;
  wsjf_score: number;
  risk_score: number;
}

interface PatternMetric {
  ts: string;
  runId: string;
  pattern: 'safe-degrade' | 'iteration-budget' | 'failure-strategy' | 'fault-tolerance' | 'adaptive-throttling';
  behavior: 'advisory' | 'mutation' | 'observability';
  circle: string;
  gate: string;
  details: Record<string, unknown>;
  success: boolean;
  durationMs: number;
  degraded?: boolean;
  economic?: Economic;
  mode?: string;
  depth?: number;
}

interface GovernorEvent {
  timestamp: string;
  type: 'CPU_OVERLOAD' | 'RATE_LIMITED' | 'BACKOFF' | 'CIRCUIT_OPEN' | 'CIRCUIT_HALF_OPEN' | 
        'CIRCUIT_CLOSED' | 'WIP_VIOLATION' | 'ADAPTIVE_THROTTLING' | 'BATCH_COMPLETE' | 
        'PREDICTIVE_THROTTLING' | 'DEPENDENCY_ANALYSIS';
  details: Record<string, unknown>;
}

// Buffered writes for <2s overhead
const metricsBuffer: PatternMetric[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let isShuttingDown = false;

/**
 * Build pattern_state JSON from PatternMetric details
 */
function buildPatternState(metric: PatternMetric): Record<string, any> {
  const state: Record<string, any> = {};
  
  switch (metric.pattern) {
    case 'safe-degrade':
      state.safe_degrade = {
        triggers: metric.degraded ? 1 : 0,
        actions: metric.degraded ? ['throttled'] : [],
      };
      break;
    
    case 'iteration-budget':
      state.iteration_budget = {
        requested: metric.details.requestedTokens || 0,
        enforced: metric.details.availableTokens || 0,
      };
      break;
    
    case 'failure-strategy':
      state.failure_strategy = {
        degrade_reason: metric.details.reason || '',
        attempt: metric.details.attempt || 0,
      };
      break;
    
    case 'adaptive-throttling':
      state.adaptive_throttling = {
        throttling_level: metric.details.throttlingLevel || 0,
        predictive_score: metric.details.predictiveScore || 0,
      };
      break;
    
    case 'fault-tolerance':
      state.fault_tolerance = {
        state: metric.details.state || 'unknown',
        failures: metric.details.failures || 0,
      };
      break;
  }
  
  return state;
}

/**
 * TypeScript fallback for economic calculation
 */
function calculateEconomicsFallback(metric: PatternMetric): Economic {
  // Base economics by pattern type
  const baseEconomics: Record<string, {cod: number, wsjf: number, risk: number}> = {
    'safe-degrade': {cod: 5000, wsjf: 5000, risk: 9},
    'guardrail-lock': {cod: 5000, wsjf: 5000, risk: 9},
    'failure-strategy': {cod: 2500, wsjf: 3000, risk: 8},
    'iteration-budget': {cod: 100, wsjf: 50, risk: 5},
    'adaptive-throttling': {cod: 150, wsjf: 100, risk: 5},
    'fault-tolerance': {cod: 3000, wsjf: 2500, risk: 8},
  };
  
  const base = baseEconomics[metric.pattern] || {cod: 100, wsjf: 50, risk: 5};
  let cod = 0;
  let wsjf_score = 0;
  
  // Pattern-specific logic
  if (metric.pattern === 'safe-degrade' && metric.degraded) {
    cod = base.cod;
    wsjf_score = base.wsjf;
  } else if (metric.pattern === 'iteration-budget') {
    const requested = (metric.details.requestedTokens as number) || 0;
    const available = (metric.details.availableTokens as number) || 0;
    if (requested > available) {
      cod = base.cod * (requested - available);
      wsjf_score = base.wsjf * (requested - available);
    }
  } else if (metric.pattern === 'failure-strategy') {
    if (metric.details.reason) {
      cod = base.cod;
      wsjf_score = base.wsjf;
    }
  } else if (metric.pattern === 'adaptive-throttling') {
    const level = (metric.details.throttlingLevel as number) || 0;
    cod = base.cod * level;
    wsjf_score = base.wsjf * level;
  } else if (metric.pattern === 'fault-tolerance' && metric.details.state === 'open') {
    cod = base.cod;
    wsjf_score = base.wsjf;
  }
  
  // Mode multiplier
  const modeFactor = metric.behavior === 'mutation' ? 1.5 : 
                     metric.behavior === 'advisory' ? 0.5 : 1.0;
  
  return {
    cod: Math.round(cod * modeFactor * 100) / 100,
    wsjf_score: Math.round(wsjf_score * modeFactor * 100) / 100,
    risk_score: base.risk,
  };
}

/**
 * Enrich metric with economic context via Python helper (with fallback)
 */
function enrichWithEconomics(metric: PatternMetric): PatternMetric {
  // Try Python helper first
  try {
    const patternState = JSON.stringify(buildPatternState(metric));
    const depth = metric.depth || 3;
    const mode = metric.behavior;
    
    const result = spawnSync('python3', [
      path.join(process.cwd(), 'scripts/agentic/pattern_logging_helper.py'),
      '--pattern', metric.pattern,
      '--circle', metric.circle,
      '--depth', depth.toString(),
      '--mode', mode,
      '--pattern-state', patternState,
      '--economic-only'
    ], {
      timeout: 100, // 100ms timeout
      encoding: 'utf8'
    });
    
    if (result.status === 0 && result.stdout) {
      const economic = JSON.parse(result.stdout.trim());
      return { ...metric, economic, mode, depth };
    }
  } catch (error) {
    // Fallback to TypeScript calculator
  }
  
  // TypeScript fallback
  return { 
    ...metric, 
    economic: calculateEconomicsFallback(metric),
    mode: metric.behavior,
    depth: metric.depth || 3
  };
}

/**
 * Map ProcessGovernor incident types to pattern metrics
 */
function mapEventToPattern(event: GovernorEvent): PatternMetric | null {
  const baseMetric = {
    ts: event.timestamp,
    runId: RUN_ID,
    success: true,
    durationMs: 0,
    circle: 'orchestrator', // Governor is orchestrator-level concern
    gate: 'health',
  };

  switch (event.type) {
    case 'CPU_OVERLOAD':
      return {
        ...baseMetric,
        pattern: 'safe-degrade',
        behavior: 'mutation',
        details: {
          cpuLoad: event.details.cpuLoad,
          threshold: event.details.threshold,
          action: 'throttled',
          source: 'processGovernor',
        },
        success: false, // Indicates degraded state
        degraded: true,
      };

    case 'RATE_LIMITED':
      return {
        ...baseMetric,
        pattern: 'iteration-budget',
        behavior: 'advisory',
        details: {
          availableTokens: event.details.availableTokens,
          requestedTokens: event.details.requestedTokens,
          rateLimitOpsPerSec: event.details.rateLimitOpsPerSec,
          source: 'processGovernor',
        },
      };

    case 'BACKOFF':
      return {
        ...baseMetric,
        pattern: 'failure-strategy',
        behavior: 'observability',
        details: {
          backoffMs: event.details.backoffMs,
          attempt: event.details.attempt,
          reason: event.details.reason,
          source: 'processGovernor',
        },
      };

    case 'CIRCUIT_OPEN':
      return {
        ...baseMetric,
        pattern: 'fault-tolerance',
        behavior: 'mutation',
        gate: 'deploy',
        details: {
          failures: event.details.failures,
          threshold: event.details.threshold,
          state: 'open',
          source: 'processGovernor',
        },
        success: false,
        degraded: true,
      };

    case 'CIRCUIT_CLOSED':
      return {
        ...baseMetric,
        pattern: 'fault-tolerance',
        behavior: 'observability',
        gate: 'deploy',
        details: {
          message: event.details.message,
          state: 'closed',
          source: 'processGovernor',
        },
      };

    case 'ADAPTIVE_THROTTLING':
      return {
        ...baseMetric,
        pattern: 'adaptive-throttling',
        behavior: 'advisory',
        details: {
          throttlingLevel: event.details.throttlingLevel,
          predictiveScore: event.details.predictiveScore,
          loadHistory: event.details.loadHistory,
          source: 'processGovernor',
        },
      };

    case 'WIP_VIOLATION':
      return {
        ...baseMetric,
        pattern: 'iteration-budget',
        behavior: 'advisory',
        details: {
          activeWork: event.details.activeWork,
          maxWip: event.details.maxWip,
          queuedWork: event.details.queuedWork,
          source: 'processGovernor',
        },
        success: false,
      };

    case 'BATCH_COMPLETE':
      // Observability only - don't clutter metrics with every batch completion
      return null;

    default:
      return null;
  }
}

/**
 * Write buffered metrics to all sinks
 */
async function flushBuffer(): Promise<void> {
  if (metricsBuffer.length === 0 || isShuttingDown) {
    return;
  }

  // Enrich with economic context before flushing
  const enriched = toFlush.map(enrichWithEconomics);
  metricsBuffer.length = 0; // Clear buffer

  const flushStart = Date.now();

  try {
    // Sink 1: Pattern metrics (primary)
    await appendToSink(PATTERN_METRICS_PATH, enriched);

    // Sink 2: Cycle log (for full-cycle analysis)
    await appendToSink(CYCLE_LOG_PATH, toFlush.map(m => ({
      ...m,
      source: 'processGovernor',
      sinkType: 'cycle',
    })));

    // Sink 3: Learning events (for ML/agent training)
    await appendToSink(LEARNING_EVENTS_PATH, toFlush.map(m => ({
      eventType: 'pattern_observed',
      pattern: m.pattern,
      context: m.details,
      timestamp: m.ts,
      runId: m.runId,
      success: m.success,
      degraded: m.degraded || false,
    })));

    const flushDuration = Date.now() - flushStart;
    if (flushDuration > 100) {
      console.warn(`[ProcessGovernorBridge] Slow flush: ${flushDuration}ms`);
    }
  } catch (err) {
    console.warn('[ProcessGovernorBridge] Flush failed:', err);
    // Graceful degradation: log to stderr as fallback
    process.stderr.write(JSON.stringify({
      error: 'bridge_flush_failed',
      metricsLost: toFlush.length,
      reason: String(err),
    }) + '\n');
  }
}

/**
 * Append metrics to a JSONL sink with graceful degradation
 */
async function appendToSink(sinkPath: string, records: unknown[]): Promise<void> {
  if (!ENABLED) return;

  try {
    const dir = path.dirname(sinkPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = records.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.appendFileSync(sinkPath, content);
  } catch (err) {
    // Graceful degradation: don't crash, just warn
    console.warn(`[ProcessGovernorBridge] Failed to write to ${sinkPath}:`, err);
  }
}

/**
 * Schedule periodic buffer flush
 */
function scheduleFlush(): void {
  if (!flushTimer && ENABLED) {
    flushTimer = setInterval(() => {
      flushBuffer().catch(err => 
        console.warn('[ProcessGovernorBridge] Flush error:', err)
      );
    }, BUFFER_FLUSH_INTERVAL_MS);
  }
}

/**
 * Public API: Ingest a ProcessGovernor event
 */
export function ingestGovernorEvent(event: GovernorEvent): void {
  if (!ENABLED) return;

  const metric = mapEventToPattern(event);
  if (!metric) return;

  metricsBuffer.push(metric);

  // Drop oldest if buffer overflows (graceful degradation)
  if (metricsBuffer.length > BUFFER_MAX_SIZE) {
    const dropped = metricsBuffer.shift();
    console.warn('[ProcessGovernorBridge] Buffer overflow, dropped:', dropped?.pattern);
  }

  scheduleFlush();

  // Immediate flush for critical events
  if (event.type === 'CPU_OVERLOAD' || event.type === 'CIRCUIT_OPEN') {
    flushBuffer().catch(err => 
      console.warn('[ProcessGovernorBridge] Immediate flush failed:', err)
    );
  }
}

/**
 * Graceful shutdown - flush all pending metrics
 */
export async function shutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  await flushBuffer();
}

/**
 * Get bridge statistics
 */
export function getStats(): {
  enabled: boolean;
  buffered: number;
  runId: string;
  sinks: string[];
} {
  return {
    enabled: ENABLED,
    buffered: metricsBuffer.length,
    runId: RUN_ID,
    sinks: [
      PATTERN_METRICS_PATH,
      CYCLE_LOG_PATH,
      LEARNING_EVENTS_PATH,
    ],
  };
}

// Register shutdown handlers
if (ENABLED) {
  process.on('beforeExit', () => shutdown());
  process.on('SIGINT', () => shutdown().then(() => process.exit(0)));
  process.on('SIGTERM', () => shutdown().then(() => process.exit(0)));
}
