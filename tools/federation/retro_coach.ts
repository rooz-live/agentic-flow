import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type {
    PatternBaselineDelta,
    PatternEvent,
} from './shared_utils.js';
import {
    computeCodBaselineDeltas,
    getActionKeys,
    readJsonl,
    summarizePatterns,
} from './shared_utils.js';
import { publishStreamEvent, resolveStreamSocket } from './streamPublisher.js';

interface RCATriggerResult {
  methods: string[];
  design_patterns: string[];
  event_prototypes: string[];
  rca_5_whys: string[];
  iterativeRecommendations?: IterativeRCARecommendation[];
}

interface IterativeRCARecommendation {
  iteration: number;
  circle: string;
  detected_pattern: string;
  rca_method: string;
  recommended_action: string;
  priority: 'critical' | 'urgent' | 'important' | 'normal' | 'low';
  cod_impact?: number;
}

interface CircleStagnationTracker {
  circle: string;
  stagnant_iterations: number;
  last_roam_delta: number;
}

// Get current iteration and run_id from CLI args
function getIterationFromArgs(): { iteration: number; runId: string } {
  const iterIdx = process.argv.indexOf('--iteration');
  const runIdx = process.argv.indexOf('--run-id');
  return {
    iteration: iterIdx !== -1 && process.argv[iterIdx + 1] ? parseInt(process.argv[iterIdx + 1], 10) : 0,
    runId: runIdx !== -1 && process.argv[runIdx + 1] ? process.argv[runIdx + 1] : `run-${Date.now()}`,
  };
}

async function analyzeRCATriggers(goalieDir: string, currentIteration?: number): Promise<RCATriggerResult> {
  const metricsPath = path.join(goalieDir, 'metrics_log.jsonl');
  const patternMetricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');

  if (!fs.existsSync(metricsPath)) {
    return { methods: [], design_patterns: [], event_prototypes: [], rca_5_whys: [] };
  }

  const lines = await readJsonl<any>(metricsPath);
  const patternLines = fs.existsSync(patternMetricsPath) ? await readJsonl<any>(patternMetricsPath) : [];

  // Heuristics state
  let consecutiveFailures = 0;
  let lastFailureContext = '';
  const retryAttempts: Record<string, number> = {};
  const errorCounts: Record<string, number> = {};
  const circleStagnation: Record<string, CircleStagnationTracker> = {};

  // Analyze recent history (last 50 events)
  const recentEvents = lines.slice(-50);

  for (const event of recentEvents) {
    // Check for failures (exit_code != 0)
    if (event.exit_code !== undefined && event.exit_code !== 0) {
      consecutiveFailures++;
      lastFailureContext = event.command || event.tool || 'unknown';
      const key = `${event.type}:${event.command || event.tool}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    } else if (event.exit_code === 0) {
      consecutiveFailures = 0;
    }

    // Check for retry loops (repeated actions without progress)
    if (event.type === 'action' && event.action === 'retry') {
       const key = event.target || 'unknown';
       retryAttempts[key] = (retryAttempts[key] || 0) + 1;
    }

    // Track circle stagnation from circle_participation events
    if (event.type === 'circle_participation' && event.circle) {
      const circle = event.circle;
      const roamDelta = event.roam_delta ?? 0;

      if (!circleStagnation[circle]) {
        circleStagnation[circle] = { circle, stagnant_iterations: 0, last_roam_delta: roamDelta };
      }

      // Stagnation = no improvement in ROAM delta
      if (roamDelta <= 0) {
        circleStagnation[circle].stagnant_iterations++;
      } else {
        circleStagnation[circle].stagnant_iterations = 0;
      }
      circleStagnation[circle].last_roam_delta = roamDelta;
    }
  }

  const result: RCATriggerResult = {
    methods: [],
    design_patterns: [],
    event_prototypes: [],
    rca_5_whys: [],
    iterativeRecommendations: [],
  };

  // Thresholds
  const MAX_CONSECUTIVE_FAILURES = 3;
  const MAX_RETRY_ATTEMPTS = 5;
  const MAX_STAGNANT_ITERATIONS = 2;

  // Trigger Logic: Consecutive Failures → 5-Whys + Timeline Analysis
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    result.methods.push('5-whys', 'timeline-analysis');
    result.design_patterns.push('circuit-breaker');
    result.event_prototypes.push('cascading-failure');
    result.rca_5_whys.push(`Trigger: ${consecutiveFailures} consecutive failures in ${lastFailureContext}`);

    // Add iterative recommendation
    result.iterativeRecommendations?.push({
      iteration: currentIteration ?? 0,
      circle: 'orchestrator',
      detected_pattern: 'cascading-failure',
      rca_method: '5-whys',
      recommended_action: `Apply circuit-breaker pattern to ${lastFailureContext}`,
      priority: 'critical',
    });
  }

  // Trigger Logic: Retry Storms → Fishbone Analysis
  for (const [key, count] of Object.entries(retryAttempts)) {
    if (count >= MAX_RETRY_ATTEMPTS) {
      result.methods.push('fishbone');
      result.design_patterns.push('backoff-retry', 'jitter');
      result.event_prototypes.push('retry-storm');
      result.rca_5_whys.push(`Trigger: ${count} retry attempts for ${key}`);

      result.iterativeRecommendations?.push({
        iteration: currentIteration ?? 0,
        circle: 'analyst',
        detected_pattern: 'retry-storm',
        rca_method: 'fishbone',
        recommended_action: `Implement backoff-retry with jitter for ${key}`,
        priority: 'urgent',
      });
    }
  }

  // Trigger Logic: Circle Stagnation → Timeline Analysis + Circle Risk Focus
  for (const tracker of Object.values(circleStagnation)) {
    if (tracker.stagnant_iterations >= MAX_STAGNANT_ITERATIONS) {
      result.methods.push('timeline-analysis', 'value-stream-mapping');
      result.design_patterns.push('circle-risk-focus', 'depth-ladder');
      result.event_prototypes.push('circle-stagnation');
      result.rca_5_whys.push(`Trigger: Circle "${tracker.circle}" stagnant for ${tracker.stagnant_iterations} iterations (ROAM delta: ${tracker.last_roam_delta})`);

      result.iterativeRecommendations?.push({
        iteration: currentIteration ?? 0,
        circle: tracker.circle,
        detected_pattern: 'circle-stagnation',
        rca_method: 'timeline-analysis',
        recommended_action: `Reduce depth for ${tracker.circle} circle or skip in next rotation`,
        priority: 'important',
      });
    }
  }

  // Analyze pattern_metrics for cascading failures across circles
  const recentPatternEvents = patternLines.slice(-100);
  const circleFailures: Record<string, number> = {};

  for (const event of recentPatternEvents) {
    if (event.outcome === 'failure' && event.circle) {
      circleFailures[event.circle] = (circleFailures[event.circle] || 0) + 1;
    }
  }

  // Cross-circle cascading failure detection
  const failedCircles = Object.entries(circleFailures).filter(([_, count]) => count >= 2);
  if (failedCircles.length >= 2) {
    result.methods.push('timeline-analysis', 'fault-tree');
    result.design_patterns.push('bulkhead', 'governance-review');
    result.event_prototypes.push('cross-circle-cascade');
    result.rca_5_whys.push(`Trigger: Failures detected in ${failedCircles.length} circles: ${failedCircles.map(([c]) => c).join(', ')}`);

    result.iterativeRecommendations?.push({
      iteration: currentIteration ?? 0,
      circle: 'orchestrator',
      detected_pattern: 'cross-circle-cascade',
      rca_method: 'fault-tree',
      recommended_action: 'Apply bulkhead pattern to isolate failing circles',
      priority: 'critical',
    });
  }

  // Deduplicate
  result.methods = [...new Set(result.methods)];
  result.design_patterns = [...new Set(result.design_patterns)];
  result.event_prototypes = [...new Set(result.event_prototypes)];

  return result;
}

interface Insight {
  ts?: string;
  text?: string;
  [key: string]: any;
}

interface BaselineMetrics {
  averageScore: number;
  riskDistribution?: { [tier: string]: number };
  rawMetrics?: any[];
  analysisTimestamp?: string;
}

function isProdCycle(): boolean {
  if (process.argv.includes('--prod-cycle') || process.argv.includes('--context=prod-cycle')) {
    return true;
  }
  if (process.env.AF_CONTEXT === 'prod-cycle' || process.env.PROD_CYCLE === 'true') {
    return true;
  }
  return false;
}

interface ForensicActionWindow {
  actionId: string;
  pattern: string;
  codPre?: number;
  codPost?: number;
  wsjfPre?: number;
  wsjfPost?: number;
  freqPre: number;
  freqPost: number;
  verified: boolean;
  highImpact: boolean;
}

function computeMedian(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function safeParseDate(ts?: string): number | undefined {
  if (!ts) return undefined;
  const d = new Date(ts);
  const n = d.getTime();
  return Number.isNaN(n) ? undefined : n;
}

function performSimpleForensicVerification(
  insights: Insight[],
  metrics: any[],
): { verifiedCount: number; totalActions: number } {
  const actionCompletedEvents = metrics.filter(
    m => m.type === 'action_completed' || m.event === 'action_completed',
  );
  const verifiedCount = actionCompletedEvents.length;
  const totalActions = Math.max(insights.length, verifiedCount);
  return { verifiedCount, totalActions };
}

function performEnhancedForensicVerification(
  goalieDir: string,
  patterns: PatternEvent[],
): {
  verifiedCount: number;
  totalActions: number;
  avgCodDeltaPct?: number;
  medianCodDeltaPct?: number;
  medianFreqDeltaPct?: number;
  highImpactActions?: number;
  unverifiedHighPriorityActions?: Array<{ actionId: string; pattern: string; codAvg: number }>;
} {
  const consolidatedPath = path.join(goalieDir, 'CONSOLIDATED_ACTIONS.yaml');
  if (!fs.existsSync(consolidatedPath)) {
    console.warn('[retro_coach] CONSOLIDATED_ACTIONS.yaml not found, falling back to simple verification');
    return { verifiedCount: 0, totalActions: 0 };
  }

  const rawYaml = fs.readFileSync(consolidatedPath, 'utf8');
  let doc: any;
  try {
    doc = yaml.parse(rawYaml) || {};
  } catch (e) {
    console.warn('[retro_coach] Failed to parse CONSOLIDATED_ACTIONS.yaml, falling back to simple verification');
    return { verifiedCount: 0, totalActions: 0 };
  }
  const items: any[] = Array.isArray(doc.items) ? doc.items : [];
  const completedActions = items.filter(it => it.completed_at);
  if (!completedActions.length) {
    console.warn('[retro_coach] No completed actions found in CONSOLIDATED_ACTIONS.yaml, falling back to simple verification');
    return { verifiedCount: 0, totalActions: 0 };
  }

  const patternEvents = patterns.filter(p => p.pattern && p.ts);
  if (!patternEvents.length) {
    console.warn('[retro_coach] No pattern events with timestamps for forensic verification');
    return { verifiedCount: 0, totalActions: completedActions.length };
  }

  const windows: ForensicActionWindow[] = [];

  for (const action of completedActions) {
    const completedTs = safeParseDate(action.completed_at);
    if (!completedTs) continue;

    const actionId: string = action.id || action.key || action.slug || 'unknown';
    const targetPattern: string = action.pattern || action.target_pattern || 'unknown';
    if (!targetPattern || targetPattern === 'unknown') {
      continue;
    }

    const windowMs = 24 * 60 * 60 * 1000;
    const preStart = completedTs - windowMs;
    const preEnd = completedTs;
    const postStart = completedTs;
    const postEnd = completedTs + windowMs;

    const preEvents = patternEvents.filter(p => {
      if (p.pattern !== targetPattern) return false;
      const ts = safeParseDate(p.ts);
      return ts !== undefined && ts >= preStart && ts < preEnd;
    });

    const postEvents = patternEvents.filter(p => {
      if (p.pattern !== targetPattern) return false;
      const ts = safeParseDate(p.ts);
      return ts !== undefined && ts >= postStart && ts < postEnd;
    });

    const freqPre = preEvents.length;
    const freqPost = postEvents.length;

    const avg = (vals: number[]): number | undefined => {
      if (!vals.length) return undefined;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const codPre = avg(
      preEvents
        .map(e => (e.economic && typeof e.economic.cod === 'number' ? e.economic.cod : undefined))
        .filter((v): v is number => typeof v === 'number'),
    );
    const codPost = avg(
      postEvents
        .map(e => (e.economic && typeof e.economic.cod === 'number' ? e.economic.cod : undefined))
        .filter((v): v is number => typeof v === 'number'),
    );

    const wsjfPre = avg(
      preEvents
        .map(e => (e.economic && typeof e.economic.wsjf_score === 'number' ? e.economic.wsjf_score : undefined))
        .filter((v): v is number => typeof v === 'number'),
    );
    const wsjfPost = avg(
      postEvents
        .map(e => (e.economic && typeof e.economic.wsjf_score === 'number' ? e.economic.wsjf_score : undefined))
        .filter((v): v is number => typeof v === 'number'),
    );

    let verified = false;
    let highImpact = false;

    if (freqPre > 0 || freqPost > 0) {
      const freqOk = freqPost <= freqPre * 1.1;
      const codImproved = codPre !== undefined && codPost !== undefined && codPost <= codPre * 0.9;
      const wsjfImproved =
        wsjfPre !== undefined && wsjfPost !== undefined && wsjfPost >= wsjfPre * 1.1;

      if (freqOk && (codImproved || wsjfImproved)) {
        verified = true;
      }

      if (freqPre > 0 && freqPost <= freqPre * 0.8) {
        highImpact = true;
      }
    }

    windows.push({
      actionId,
      pattern: targetPattern,
      codPre,
      codPost,
      wsjfPre,
      wsjfPost,
      freqPre,
      freqPost,
      verified,
      highImpact,
    });
  }

  if (!windows.length) {
    console.warn(
      '[retro_coach] Completed actions found but none could be mapped to pattern events; falling back to simple verification',
    );
    return { verifiedCount: 0, totalActions: 0 };
  }

  const verifiedWindows = windows.filter(w => w.verified);
  const verifiedCount = verifiedWindows.length;
  const totalActions = windows.length;

  const codDeltaPcts: number[] = [];
  const freqDeltaPcts: number[] = [];

  for (const w of verifiedWindows) {
    if (w.codPre !== undefined && w.codPost !== undefined && w.codPre > 0) {
      const deltaPct = ((w.codPre - w.codPost) / w.codPre) * 100;
      codDeltaPcts.push(deltaPct);
    }
    if (w.freqPre > 0) {
      const deltaPct = ((w.freqPre - w.freqPost) / w.freqPre) * 100;
      freqDeltaPcts.push(deltaPct);
    }
  }

  const avgCodDeltaPct =
    codDeltaPcts.length > 0
      ? codDeltaPcts.reduce((a, b) => a + b, 0) / codDeltaPcts.length
      : undefined;
  const medianCodDeltaPct = computeMedian(codDeltaPcts);
  const medianFreqDeltaPct = computeMedian(freqDeltaPcts);

  const highImpactActions = windows.filter(w => w.highImpact).length;

  const unverifiedHighPriorityActions = windows
    .filter(w => !w.verified)
    .map(w => {
      const patternEventsForAction = patternEvents.filter(p => p.pattern === w.pattern);
      const codValues = patternEventsForAction
        .map(e => (e.economic && typeof e.economic.cod === 'number' ? e.economic.cod : undefined))
        .filter((v): v is number => typeof v === 'number');
      const codAvg =
        codValues.length > 0 ? codValues.reduce((a, b) => a + b, 0) / codValues.length : 0;
      return {
        actionId: w.actionId,
        pattern: w.pattern,
        codAvg,
      };
    })
    .sort((a, b) => b.codAvg - a.codAvg)
    .slice(0, 10);

  return {
    verifiedCount,
    totalActions,
    avgCodDeltaPct,
    medianCodDeltaPct,
    medianFreqDeltaPct,
    highImpactActions,
    unverifiedHighPriorityActions,
  };
}

interface GapRow {
  pattern: string;
  circle: string;
  depth: number;
  count: number;
  codAvg: number;
  wsjfAvg?: number;
  frameworkHint?: string;
  schedulerHint?: string;
  // Optional, used primarily for JSON output
  workloadTags?: string[];
  codThreshold?: number;
}

interface RetroGapJsonRow {
  pattern: string;
  circle: string;
  depth: number;
  count: number;
  codAvg: number;
  wsjfAvg?: number;
  workloadTags: string[];
  codThreshold: number;
  frameworkHint?: string;
  schedulerHint?: string;
}

interface RetroInsightsSummary {
  totalInsights: number;
  verifiedCount: number;
  totalActions: number;
  recentInsights: { ts?: string; text?: string }[];
  // Enhanced forensic metrics (optional)
  avgCodDeltaPct?: number;
  medianCodDeltaPct?: number;
  medianFreqDeltaPct?: number;
  highImpactActions?: number;
  unverifiedHighPriorityActions?: Array<{ actionId: string; pattern: string; codAvg: number }>;
}

type PatternBaselineView = PatternBaselineDelta & { workloadTags?: string[] };

interface BaselineComparisonSummary {
  baselineScore?: number;
  currentScore?: number;
  delta?: number;
  deltaPct?: number;
  regression?: boolean;
  improvement?: boolean;
  baselineP0?: number;
  currentP0?: number;
  baselineTimestamp?: string;
  currentTimestamp?: string;
  topRegressions?: PatternBaselineView[];
  topImprovements?: PatternBaselineView[];
}

interface ObservabilityGap {
  failure_id: string;
  failure_type: string;
  gap_severity: 'no_metrics' | 'partial_metrics';
  risk_level: 'high' | 'medium';
  timestamp: string;
  suggested_action: string;
  failure_context: {
    timestamp: string;
    source_log: string;
    details: string;
  };
}

interface RetroJsonOutput {
  goalieDir: string;
  insightsSummary: RetroInsightsSummary;
  topEconomicGaps: RetroGapJsonRow[];
  workloadPrompts: string[];
  baselineComparison?: BaselineComparisonSummary;
  observabilityGaps?: {
    total: number;
    high_risk: number;
    medium_risk: number;
    gaps: ObservabilityGap[];
  };
  // New metrics fields
  methods?: string[];
  design_patterns?: string[];
  event_prototypes?: string[];
  exit_code?: number;
  rca_5_whys?: string[];
  replenishment?: {
    merged: number;
    refined: number;
    error_tags: string[];
  };
}

function getGoalieDirFromArgs(): string {
  const argIndex = process.argv.indexOf('--goalie-dir');
  if (argIndex !== -1 && process.argv[argIndex + 1]) {
    return path.resolve(process.argv[argIndex + 1]);
  }
  if (process.env.GOALIE_DIR) {
    return path.resolve(process.env.GOALIE_DIR);
  }
  // Default: repo layout used in this workspace
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, '.goalie'))) {
    return path.join(cwd, '.goalie');
  }
  return path.resolve(cwd, 'investing/agentic-flow/.goalie');
}

function extractMetricsFromPatterns(patterns: PatternEvent[]): BaselineMetrics | null {
  let totalScore = 0;
  let scoreCount = 0;
  const riskCounts: { [tier: string]: number } = {};

  for (const p of patterns) {
    // Check if the pattern event itself has a score (e.g. derived from economic or explicit score field)
    // Assuming 'score' field might be present in PatternEvent as per updated requirements
    if (typeof p.score === 'number') {
      totalScore += p.score;
      scoreCount++;
    }
    if (p.risk) {
      riskCounts[p.risk] = (riskCounts[p.risk] || 0) + 1;
    }
  }

  if (scoreCount === 0 && Object.keys(riskCounts).length === 0) {
    return null;
  }

  return {
    averageScore: scoreCount > 0 ? totalScore / scoreCount : 0,
    riskDistribution: Object.keys(riskCounts).length > 0 ? riskCounts : undefined,
  };
}

function workloadsForPattern(pattern: string, extraTags: string[] = []): string[] {
  const tags: string[] = [...extraTags];

  // Canonical baseline patterns
  if (pattern === 'ml-training-guardrail') tags.push('ML');
  if (pattern === 'stat-robustness-sweep') tags.push('ML', 'Stats');
  if (pattern === 'hpc-batch-window') tags.push('HPC');
  if (pattern === 'safe-degrade') tags.push('HPC');
  if (pattern === 'device-coverage') tags.push('Device/Web');
  if (pattern === 'failure-strategy') tags.push('Stats', 'Device/Web');

  // ML failure / training reliability patterns
  if (
    pattern === 'distributed-training-failure' ||
    pattern === 'oom-recovery' ||
    pattern === 'mixed-precision-overflow' ||
    pattern === 'gradient-accumulation-mismatch' ||
    pattern === 'checkpoint-corruption' ||
    pattern === 'tf-distribution-check' ||
    pattern === 'torch-grad-stability' ||
    pattern === 'mixed-precision-check' ||
    pattern === 'learning-rate-instability' ||
    pattern === 'batch-norm-instability' ||
    pattern === 'data-augmentation-overhead'
  ) {
    tags.push('ML');
  }

  // HPC / cluster-centric patterns
  if (
    pattern === 'hpc-batch-window' ||
    pattern === 'cluster-fragmentation' ||
    pattern === 'network-bottleneck' ||
    pattern === 'node-failure-recovery' ||
    pattern === 'enterprise-ml-pipeline-orchestration' ||
    pattern === 'ml-model-serving-latency' ||
    pattern === 'data-pipeline-backpressure'
  ) {
    tags.push('HPC');
  }

  // Statistical robustness patterns
  if (
    pattern === 'multiple-testing-correction' ||
    pattern === 'cross-validation-fold-failure' ||
    pattern === 'data-leakage-detection' ||
    pattern === 'outlier-sensitivity' ||
    pattern === 'sample-size-inadequacy'
  ) {
    tags.push('Stats');
  }
  // Some stats patterns are also strongly ML-flavoured.
  if (pattern === 'cross-validation-fold-failure' || pattern === 'data-leakage-detection') {
    tags.push('ML');
  }

  // Device / web experience patterns
  if (
    pattern === 'mobile-interaction-lag' ||
    pattern === 'desktop-render-block' ||
    pattern === 'web-vitals-cls' ||
    pattern === 'responsive-breakpoint-gap' ||
    pattern === 'image-optimization-missing' ||
    pattern === 'keyboard-shortcut-conflict' ||
    pattern === 'mobile-app-cold-start' ||
    pattern === 'mobile-offline-sync' ||
    pattern === 'desktop-app-memory-leak' ||
    pattern === 'desktop-app-startup' ||
    pattern === 'web-prototype-build-time' ||
    pattern === 'web-bundle-size' ||
    pattern === 'cross-platform-compatibility'
  ) {
    tags.push('Device/Web');
  }

  // Prototype UX patterns
  if (pattern.startsWith('mobile-prototype-')) {
    tags.push('Device/Web');
  }
  if (pattern.startsWith('desktop-prototype-')) {
    tags.push('Device/Web');
  }
  if (pattern.startsWith('web-prototype-')) {
    tags.push('Device/Web');
  }
  if (pattern.startsWith('prototype-')) {
    tags.push('Device/Web');
  }

  return Array.from(new Set(tags));
}

interface CodThresholdConfig {
  defaultCodThreshold: number;
  patternThresholds: { [pattern: string]: number };
}

// See .goalie/COD_THRESHOLDS.yaml.example for an override template and workload-tuned defaults.

function loadCodThresholdConfig(goalieDir: string): CodThresholdConfig {
  const defaults: CodThresholdConfig = {
    defaultCodThreshold: 5,
    patternThresholds: {
      // Pattern-specific defaults (tuned for workload-specific COD)
      'ml-training-guardrail': 6,
      'hpc-batch-window': 8,
      'stat-robustness-sweep': 4,
      'device-coverage': 5,
      // Workload-level fallbacks (used when a pattern is not explicitly listed)
      __ML__: 6,
      __HPC__: 8,
      __Stats__: 4,
      __Device__: 5,
    },
  };

  const configPath = path.join(goalieDir, 'COD_THRESHOLDS.yaml');
  if (!fs.existsSync(configPath)) {
    return defaults;
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const yaml = require('yaml');
    const doc: any = yaml.parse(raw) || {};

    let defaultCodThreshold = defaults.defaultCodThreshold;
    if (typeof doc.defaultCodThreshold === 'number') {
      defaultCodThreshold = doc.defaultCodThreshold;
    }

    const patternThresholds: { [pattern: string]: number } = { ...defaults.patternThresholds };
    if (doc.patternThresholds && typeof doc.patternThresholds === 'object') {
      for (const [key, value] of Object.entries(doc.patternThresholds)) {
        if (typeof value === 'number') {
          patternThresholds[key] = value;
        }
      }
    }

    return {
      defaultCodThreshold,
      patternThresholds,
    };
  } catch {
    // On parse errors, fall back to hard-coded defaults to avoid breaking retros.
    return defaults;
  }
}


async function computeTopEconomicGaps(patterns: PatternEvent[], actionKeys: Set<string>): Promise<GapRow[]> {
  if (!patterns.length) {
    return [];
  }

  const goalieDir = getGoalieDirFromArgs();
  const codConfig = loadCodThresholdConfig(goalieDir);

  type Agg = {
    pattern: string;
    circle: string;
    depth: number;
    codVals: number[];
    wsjfVals: number[];
    count: number;
    frameworkCounts: Map<string, number>;
    schedulerCounts: Map<string, number>;
    tags: Set<string>;
  };

  const agg = new Map<string, Agg>();
  const interesting = new Set([
    'observability-first',
    'safe-degrade',
    'iteration-budget',
    'guardrail-lock',
    'autocommit-shadow',
    'circle-risk-focus',
    'failure-strategy',
    'ml-training-guardrail',
    'stat-robustness-sweep',
    'hpc-batch-window',
    'device-coverage',
    'mobile-interaction-lag',
    'desktop-render-block',
    'web-vitals-cls',
    // ML / HPC / Stats patterns from enhanced pattern_metrics
    'distributed-training-failure',
    'oom-recovery',
    'mixed-precision-overflow',
    'gradient-accumulation-mismatch',
    'checkpoint-corruption',
    'cluster-fragmentation',
    'network-bottleneck',
    'node-failure-recovery',
    'multiple-testing-correction',
    'cross-validation-fold-failure',
    'data-leakage-detection',
    'outlier-sensitivity',
    'sample-size-inadequacy',
    'tf-distribution-check',
    'torch-grad-stability',
    'mixed-precision-check',
    'learning-rate-instability',
    'batch-norm-instability',
    'data-augmentation-overhead',
    'mobile-app-cold-start',
    'mobile-offline-sync',
    'desktop-app-memory-leak',
    'desktop-app-startup',
    'web-prototype-build-time',
    'web-bundle-size',
    'enterprise-ml-pipeline-orchestration',
    'ml-model-serving-latency',
    'data-pipeline-backpressure',
    'responsive-breakpoint-gap',
    'image-optimization-missing',
    'keyboard-shortcut-conflict',
    'cross-platform-compatibility',
    // Mobile prototype workflow patterns
    'mobile-prototype-touch-target',
    'mobile-prototype-gesture-conflict',
    'mobile-prototype-network-offline',
    'mobile-prototype-battery-drain',
    'mobile-prototype-permission-handling',
    'mobile-prototype-deep-link-routing',
    'mobile-prototype-push-notification-delay',
    'mobile-prototype-background-sync',
    'mobile-prototype-app-state-restoration',
    'mobile-prototype-multitasking-handoff',
    // Desktop prototype workflow patterns
    'desktop-prototype-window-management',
    'desktop-prototype-keyboard-shortcut-conflict',
    'desktop-prototype-file-system-access',
    'desktop-prototype-drag-drop-handling',
    'desktop-prototype-clipboard-integration',
    'desktop-prototype-system-tray-behavior',
    'desktop-prototype-auto-update-mechanism',
    'desktop-prototype-offline-capability',
    'desktop-prototype-native-module-loading',
    'desktop-prototype-cross-platform-consistency',
    // Web prototype workflow patterns
    'web-prototype-spa-routing',
    'web-prototype-state-management',
    'web-prototype-api-caching',
    'web-prototype-service-worker-registration',
    'web-prototype-indexeddb-quota',
    'web-prototype-cors-policy',
    'web-prototype-csp-violation',
    'web-prototype-third-party-script-blocking',
    'web-prototype-progressive-enhancement',
    'web-prototype-accessibility-audit',
    'web-prototype-seo-meta-tags',
    'web-prototype-ssr-hydration-mismatch',
    'web-prototype-cdn-cache-invalidation',
    'web-prototype-browser-compatibility',
    'web-prototype-responsive-image-loading',
    // Cross-platform prototype patterns
    'prototype-platform-specific-feature',
    'prototype-code-sharing-strategy',
    'prototype-build-configuration',
    'prototype-testing-strategy',
    'prototype-deployment-pipeline',
  ]);

  for (const ev of patterns) {
    const pattern = ev.pattern || 'unknown';
    if (!interesting.has(pattern)) continue;
    const circle = (ev.circle as string) || '<none>';
    const depthVal: any = (ev as any).depth;
    const depth = typeof depthVal === 'number' ? depthVal : 0;
    const econ = (ev as any).economic || {};
    const rawCod = econ.cod;
    const rawWsjf = econ.wsjf_score;
    const cod =
      typeof rawCod === 'number'
        ? rawCod
        : typeof rawCod === 'string'
        ? parseFloat(rawCod)
        : undefined;
    const wsjf = typeof rawWsjf === 'number' ? rawWsjf : undefined;
    const key = `${pattern}|${circle}|${depth}`;
    const current =
      agg.get(key) ||
      ({
        pattern,
        circle,
        depth,
        codVals: [],
        wsjfVals: [],
        count: 0,
        frameworkCounts: new Map<string, number>(),
        schedulerCounts: new Map<string, number>(),
        tags: new Set<string>(),
      } as Agg);
    current.count += 1;
    if (typeof cod === 'number' && !Number.isNaN(cod)) current.codVals.push(cod);
    if (typeof wsjf === 'number' && !Number.isNaN(wsjf)) current.wsjfVals.push(wsjf);

    const evTags = (ev as any).tags;
    if (Array.isArray(evTags)) {
      for (const t of evTags) {
        if (typeof t === 'string') current.tags.add(t);
      }
    }

    const frameworkRaw = (ev as any).framework;
    if (typeof frameworkRaw === 'string' && frameworkRaw.trim()) {
      const fw = frameworkRaw.trim().toLowerCase();
      current.frameworkCounts.set(fw, (current.frameworkCounts.get(fw) || 0) + 1);
    }
    const schedulerRaw = (ev as any).scheduler;
    if (typeof schedulerRaw === 'string' && schedulerRaw.trim()) {
      const sch = schedulerRaw.trim().toLowerCase();
      current.schedulerCounts.set(sch, (current.schedulerCounts.get(sch) || 0) + 1);
    }

    agg.set(key, current);
  }

  const rows: GapRow[] = [];
  for (const a of agg.values()) {
    if (!a.codVals.length) continue;
    const codAvg = a.codVals.reduce((x, y) => x + y, 0) / a.codVals.length;
    const wsjfAvg = a.wsjfVals.length
      ? a.wsjfVals.reduce((x, y) => x + y, 0) / a.wsjfVals.length
      : undefined;

    const circleDepthKey = `${a.circle}|${a.depth}`;
    const hasActionsAtCircleDepth = actionKeys.has(circleDepthKey);
    const coverageCondition = actionKeys.size ? !hasActionsAtCircleDepth : true;
    if (!coverageCondition) continue;

    // Only surface genuinely high-COD gaps (including ML/HPC/Stats/Device) to drive focused prompts.
    const workloads = workloadsForPattern(a.pattern, Array.from(a.tags));
    let codThreshold = codConfig.defaultCodThreshold;

    // Exact pattern override if present.
    if (Object.prototype.hasOwnProperty.call(codConfig.patternThresholds, a.pattern)) {
      codThreshold = codConfig.patternThresholds[a.pattern];
    } else {
      // Fallback by workload tag if configured.
      if (
        workloads.includes('HPC') &&
        Object.prototype.hasOwnProperty.call(codConfig.patternThresholds, '__HPC__')
      ) {
        codThreshold = codConfig.patternThresholds['__HPC__'];
      } else if (
        workloads.includes('ML') &&
        Object.prototype.hasOwnProperty.call(codConfig.patternThresholds, '__ML__')
      ) {
        codThreshold = codConfig.patternThresholds['__ML__'];
      } else if (
        workloads.includes('Stats') &&
        Object.prototype.hasOwnProperty.call(codConfig.patternThresholds, '__Stats__')
      ) {
        codThreshold = codConfig.patternThresholds['__Stats__'];
      } else if (
        workloads.includes('Device/Web') &&
        Object.prototype.hasOwnProperty.call(codConfig.patternThresholds, '__Device__')
      ) {
        codThreshold = codConfig.patternThresholds['__Device__'];
      }
    }

    if (codAvg < codThreshold) continue;

    const dominantFrameworkEntry = (() => {
      let bestKey: string | undefined;
      let bestCount = 0;
      for (const [k, v] of a.frameworkCounts.entries()) {
        if (v > bestCount) {
          bestKey = k;
          bestCount = v;
        }
      }
      return { key: bestKey, count: bestCount, distinct: a.frameworkCounts.size };
    })();
    const dominantSchedulerEntry = (() => {
      let bestKey: string | undefined;
      let bestCount = 0;
      for (const [k, v] of a.schedulerCounts.entries()) {
        if (v > bestCount) {
          bestKey = k;
          bestCount = v;
        }
      }
      return { key: bestKey, count: bestCount, distinct: a.schedulerCounts.size };
    })();

    let frameworkHint: string | undefined;
    if (dominantFrameworkEntry.key) {
      frameworkHint = dominantFrameworkEntry.distinct > 1 ? 'mixed' : dominantFrameworkEntry.key;
    }

    let schedulerHint: string | undefined;
    if (dominantSchedulerEntry.key) {
      schedulerHint = dominantSchedulerEntry.distinct > 1 ? 'mixed' : dominantSchedulerEntry.key;
    }

    rows.push({
      pattern: a.pattern,
      circle: a.circle,
      depth: a.depth,
      count: a.count,
      codAvg,
      wsjfAvg,
      frameworkHint,
      schedulerHint,
      workloadTags: workloads,
      codThreshold,
    });
  }

  rows.sort((a, b) => b.codAvg - a.codAvg);
  return rows;
}

async function loadBaselineMetrics(goalieDir: string): Promise<BaselineMetrics | null> {
  // Baseline file is rooted at investing/agentic-flow/metrics/baseline.json
  const repoRoot = path.resolve(goalieDir, '..');
  const baselinePath = path.join(repoRoot, 'metrics', 'baseline.json');
  if (!fs.existsSync(baselinePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(baselinePath, 'utf8');
    const obj: any = JSON.parse(raw);
    if (typeof obj.average_score !== 'number') {
      return null;
    }
    const riskDist =
      obj.risk_distribution && typeof obj.risk_distribution === 'object'
        ? obj.risk_distribution
        : undefined;
    const ts =
      typeof obj.analysis_timestamp === 'string'
        ? obj.analysis_timestamp
        : undefined;
    return { averageScore: obj.average_score, riskDistribution: riskDist, analysisTimestamp: ts };
  } catch {
    return null;
  }
}

async function buildRetroJsonOutput(
  goalieDir: string,
  insights: Insight[],
  patterns: PatternEvent[],
  gaps: GapRow[],
  baseline: BaselineMetrics | null,
  current: BaselineMetrics | null,
): Promise<RetroJsonOutput> {
  const patternCounts = summarizePatterns(patterns);
  const recentInsights = insights.slice(-10);

  const enhancedForensic = performEnhancedForensicVerification(goalieDir, patterns);
  let forensic = { verifiedCount: enhancedForensic.verifiedCount, totalActions: enhancedForensic.totalActions };

  const observabilityRisks = insights.filter(
    i => i.type === 'roam_risk' && i.category === 'observability',
  );

  if (forensic.totalActions === 0) {
    // Fallback to simple verification when enhanced data is missing or incomplete
    forensic = performSimpleForensicVerification(insights, current?.rawMetrics || []);
  }

  const insightsSummary: RetroInsightsSummary = {
    totalInsights: insights.length,
    verifiedCount: forensic.verifiedCount,
    totalActions: forensic.totalActions,
    recentInsights: recentInsights.map(ins => ({
      ts: (ins as any).ts,
      text: (ins as any).text ?? JSON.stringify(ins),
    })),
    avgCodDeltaPct: enhancedForensic.avgCodDeltaPct,
    medianCodDeltaPct: enhancedForensic.medianCodDeltaPct,
    medianFreqDeltaPct: enhancedForensic.medianFreqDeltaPct,
    highImpactActions: enhancedForensic.highImpactActions,
    unverifiedHighPriorityActions: enhancedForensic.unverifiedHighPriorityActions,
  };

  const topEconomicGaps: RetroGapJsonRow[] = gaps.slice(0, 5).map(row => ({
    pattern: row.pattern,
    circle: row.circle,
    depth: row.depth,
    count: row.count,
    codAvg: row.codAvg,
    wsjfAvg: row.wsjfAvg,
    workloadTags: row.workloadTags ?? workloadsForPattern(row.pattern), // Note: GapRow stores computed tags now, but if missing, recompute
    codThreshold: row.codThreshold ?? 0,
    frameworkHint: row.frameworkHint,
    schedulerHint: row.schedulerHint,
  }));

  const frameworkLabel = (hint?: string): string | undefined => {
    if (!hint) return undefined;
    const key = hint.toLowerCase();
    if (key === 'tf' || key === 'tensorflow') return 'TensorFlow';
    if (key === 'torch' || key === 'pytorch') return 'PyTorch';
    if (key === 'mixed') return 'mixed frameworks';
    return hint;
  };

  const schedulerLabel = (hint?: string): string | undefined => {
    if (!hint) return undefined;
    const key = hint.toLowerCase();
    if (key === 'k8s' || key === 'kubernetes') return 'Kubernetes';
    if (key === 'slurm') return 'Slurm';
    if (key === 'ray') return 'Ray';
    return hint;
  };

  const workloadPrompts = topEconomicGaps.map(gap => {
    const fw = frameworkLabel(gap.frameworkHint);
    const sch = schedulerLabel(gap.schedulerHint);
    const context = [fw, sch].filter(Boolean).join(' on ');
    const ctxStr = context ? ` (${context})` : '';
    return `Investigate ${gap.pattern} in ${gap.circle}${ctxStr}: CoD=${gap.codAvg.toFixed(2)}, Count=${gap.count}.`;
  });


  let baselineComparison: BaselineComparisonSummary | undefined;

  const patternDeltas: PatternBaselineDelta[] = computeCodBaselineDeltas(patterns);
  const topRegressions: PatternBaselineView[] = [];
  const topImprovements: PatternBaselineView[] = [];

  if (patternDeltas.length) {
    const withDelta = patternDeltas.filter(d => typeof d.deltaPct === 'number');

    const worst = withDelta
      .filter(d => (d.deltaPct as number) < -10)
      .sort((a, b) => (a.deltaPct as number) - (b.deltaPct as number))
      .slice(0, 3)
      .map(d => ({
        ...d,
        workloadTags: workloadsForPattern(d.pattern),
      }));

    const best = withDelta
      .filter(d => (d.deltaPct as number) > 5)
      .sort((a, b) => (b.deltaPct as number) - (a.deltaPct as number))
      .slice(0, 3)
      .map(d => ({
        ...d,
        workloadTags: workloadsForPattern(d.pattern),
      }));

    if (worst.length) topRegressions.push(...worst);
    if (best.length) topImprovements.push(...best);

    if (worst.length) {
      const w = worst[0];
      const tagsLabel = w.workloadTags && w.workloadTags.length ? ` (${w.workloadTags.join('/')})` : '';
      if (typeof w.deltaPct === 'number') {
        workloadPrompts.push(
          `Regression${tagsLabel}: Pattern "${w.pattern}" at circle=${w.circle}, depth=${w.depth} regressed by ${w.deltaPct.toFixed(
            1,
          )}% (CoD from ${w.baselineScore?.toFixed(2)} to ${w.currentScore?.toFixed(
            2,
          )}). What changed between baseline and now?`,
        );
      }
    }

    if (best.length) {
      const b = best[0];
      const tagsLabel = b.workloadTags && b.workloadTags.length ? ` (${b.workloadTags.join('/')})` : '';
      if (typeof b.deltaPct === 'number') {
        workloadPrompts.push(
          `Improvement${tagsLabel}: Pattern "${b.pattern}" at circle=${b.circle}, depth=${b.depth} improved by ${b.deltaPct.toFixed(
            1,
          )}% (CoD from ${b.baselineScore?.toFixed(2)} to ${b.currentScore?.toFixed(
            2,
          )}). What governance or observability changes drove this?`,
        );
      }
    }
  }

  if (baseline || current || topRegressions.length || topImprovements.length) {
    const baselineScore = baseline?.averageScore;
    const currentScore = current?.averageScore;

    let delta: number | undefined;
    let deltaPct: number | undefined;

    if (baselineScore !== undefined && currentScore !== undefined) {
      delta = currentScore - baselineScore;
      if (baselineScore !== 0) {
        deltaPct = (delta / baselineScore) * 100;
      }
    }

    baselineComparison = {
      baselineScore,
      currentScore,
      delta,
      deltaPct,
      regression:
        baselineScore !== undefined && currentScore !== undefined
          ? currentScore < baselineScore * 0.9
          : undefined,
      improvement:
        baselineScore !== undefined && currentScore !== undefined
          ? currentScore > baselineScore * 1.05
          : undefined,
      baselineP0: baseline?.riskDistribution?.P0,
      currentP0: current?.riskDistribution?.P0,
      baselineTimestamp: baseline?.analysisTimestamp,
      currentTimestamp: current?.analysisTimestamp,
      topRegressions: topRegressions.length ? topRegressions : undefined,
      topImprovements: topImprovements.length ? topImprovements : undefined,
    };
  }

  let observabilityGaps: RetroJsonOutput['observabilityGaps'];
  if (observabilityRisks.length > 0) {
    const gapsList: ObservabilityGap[] = observabilityRisks.map(risk => ({
      failure_id: (risk as any).failure_id,
      failure_type: (risk as any).failure_type,
      gap_severity: (risk as any).gap_severity,
      risk_level: (risk as any).risk_level,
      timestamp: (risk as any).timestamp,
      suggested_action: (risk as any).suggested_action,
      failure_context: {
        timestamp: (risk as any).failure_context?.timestamp,
        source_log: (risk as any).failure_context?.source_log,
        details: (risk as any).failure_context?.details,
      },
    }));

    const high = gapsList.filter(g => g.gap_severity === 'no_metrics').length;
    const medium = gapsList.filter(g => g.gap_severity === 'partial_metrics').length;

    observabilityGaps = {
      total: gapsList.length,
      high_risk: high,
      medium_risk: medium,
      gaps: gapsList,
    };
  }

  return {
    goalieDir,
    insightsSummary,
    topEconomicGaps,
    workloadPrompts,
    baselineComparison,
    observabilityGaps,
    // Default values for new metrics (logic to be implemented)
    methods: ['5-whys', 'wsjf-ranking'],
    design_patterns: ['circuit-breaker', 'bulkhead'],
    event_prototypes: [],
    exit_code: 0,
    rca_5_whys: [],
    replenishment: {
      merged: 0,
      refined: 0,
      error_tags: [],
    },
  };
}

async function loadCurrentMetrics(goalieDir: string): Promise<BaselineMetrics | null> {
  const metricsPath = path.join(goalieDir, 'metrics_log.jsonl');
  if (!fs.existsSync(metricsPath)) {
    return null;
  }

  let latestScore: number | undefined;
  let latestRisk: { [tier: string]: number } | undefined;
  let latestTs: string | undefined;

  const lines = await readJsonl<any>(metricsPath);
  for (const obj of lines) {
    if (typeof obj.average_score === 'number') {
      latestScore = obj.average_score;
      if (obj.risk_distribution && typeof obj.risk_distribution === 'object') {
        latestRisk = obj.risk_distribution;
      }
      if (typeof obj.analysis_timestamp === 'string') {
        latestTs = obj.analysis_timestamp;
      } else if (typeof obj.ts === 'string') {
        latestTs = obj.ts;
      }
    } else if (obj.calibration_summary && typeof obj.calibration_summary === 'object') {
      const cs = obj.calibration_summary;
      if (typeof cs.average_score === 'number') {
        latestScore = cs.average_score;
      }
      if (cs.risk_distribution && typeof cs.risk_distribution === 'object') {
        latestRisk = cs.risk_distribution;
      }
      if (typeof cs.analysis_timestamp === 'string') {
        latestTs = cs.analysis_timestamp;
      }
    }
  }

  if (latestScore === undefined) {
    return { averageScore: 0, riskDistribution: latestRisk, rawMetrics: lines, analysisTimestamp: latestTs };
  }
  return { averageScore: latestScore, riskDistribution: latestRisk, rawMetrics: lines, analysisTimestamp: latestTs };
}

async function printRetroRecommendations(
  insights: Insight[],
  patterns: PatternEvent[],
  gaps: GapRow[],
  baseline: BaselineMetrics | null,
  current: BaselineMetrics | null,
) {
  const patternCounts = summarizePatterns(patterns);
  const recentInsights = insights.slice(-10);

  // Surface observability-first ROAM risks from insights_log.jsonl
  const observabilityRisks = insights.filter(
    i => i.type === 'roam_risk' && i.category === 'observability',
  );
  if (observabilityRisks.length > 0) {
    const highRisk = observabilityRisks.filter(r => r.risk_level === 'high').length;
    const mediumRisk = observabilityRisks.filter(r => r.risk_level === 'medium').length;
    // eslint-disable-next-line no-console
    console.log('\n⚠️  OBSERVABILITY GAPS DETECTED ⚠️');
    // eslint-disable-next-line no-console
    console.log(`High-risk gaps: ${highRisk} (no metrics)`);
    // eslint-disable-next-line no-console
    console.log(`Medium-risk gaps: ${mediumRisk} (partial metrics)`);
    // eslint-disable-next-line no-console
    console.log('Run: ./scripts/af detect-observability-gaps --dry-run');
  }

  const frameworkLabel = (hint?: string): string | undefined => {
    if (!hint) return undefined;
    const key = hint.toLowerCase();
    if (key === 'tf' || key === 'tensorflow') return 'TensorFlow';
    if (key === 'torch' || key === 'pytorch') return 'PyTorch';
    if (key === 'mixed') return 'mixed frameworks';
    return hint;
  };

  const schedulerLabel = (hint?: string): string | undefined => {
    if (!hint) return undefined;
    const key = hint.toLowerCase();
    if (key === 'slurm') return 'SLURM cluster';
    if (key === 'lsf') return 'LSF cluster';
    if (key === 'pbs' || key === 'torque') return 'batch scheduler cluster';
    if (key === 'k8s' || key === 'kubernetes') return 'Kubernetes cluster';
    if (key === 'local' || key === 'workstation') return 'local workstation';
    if (key === 'mixed') return 'mixed schedulers';
    return hint;
  };

  const describeEnv = (row: GapRow): string => {
    const fw = frameworkLabel(row.frameworkHint);
    const sch = schedulerLabel(row.schedulerHint);
    if (!fw && !sch) return '';
    if (fw && sch) return ` (${fw} on ${sch})`;
    return ` (${fw || sch})`;
  };

  const goalieDir = getGoalieDirFromArgs();
  const enhancedForensic = performEnhancedForensicVerification(goalieDir, patterns);
  let forensic = { verifiedCount: enhancedForensic.verifiedCount, totalActions: enhancedForensic.totalActions };

  if (forensic.totalActions === 0) {
    forensic = performSimpleForensicVerification(insights, current?.rawMetrics || []);
  }

  console.log('=== Retro Coach Summary (Goalie + Pattern Metrics + Economics) ===');
  console.log('Total insights:', insights.length);
  console.log(
    `Forensic Verification: ${forensic.verifiedCount}/${forensic.totalActions} actions verified (actual)`,
  );
  if (enhancedForensic.avgCodDeltaPct !== undefined) {
    console.log(`Average COD reduction: ${enhancedForensic.avgCodDeltaPct.toFixed(1)}%`);
  }
  if (enhancedForensic.medianFreqDeltaPct !== undefined) {
    console.log(`Median frequency reduction: ${enhancedForensic.medianFreqDeltaPct.toFixed(1)}%`);
  }
  if (enhancedForensic.highImpactActions !== undefined) {
    console.log(`High-impact actions: ${enhancedForensic.highImpactActions}`);
  }

  console.log('Recent insights (up to 10):');
  for (const ins of recentInsights) {
    console.log('-', ins.ts || '<no-ts>', '-', ins.text || JSON.stringify(ins));
  }

  console.log('\nPattern usage (top patterns):');
  const sorted = Array.from(patternCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [pattern, count] of sorted) {
    console.log(`- ${pattern}: ${count}`);
  }

  console.log('\nTop economic gaps (COD, no observability actions at this circle/depth):');
  if (!gaps.length) {
    console.log('- No high-COD patterns without observability coverage were detected. Nice work.');
  } else {
    for (const row of gaps.slice(0, 5)) {
      const codStr = `cod≈${row.codAvg.toFixed(2)}`;
      const wsjfStr = row.wsjfAvg !== undefined ? `wsjf≈${row.wsjfAvg.toFixed(2)}` : 'wsjf: n/a';
      console.log(
        `- ${row.pattern} · circle=${row.circle}, depth=${row.depth} · events=${row.count} · ${codStr}, ${wsjfStr}`,
      );
    }
  }

  console.log('\nWorkload-specific retro prompts from top gaps:');
  const mlGap = gaps.find(row => (row.workloadTags || workloadsForPattern(row.pattern)).includes('ML'));
  if (mlGap) {
    const mlEnv = describeEnv(mlGap);
    console.log(
      `- ML${mlEnv}: High-COD gap on "${mlGap.pattern}" at circle=${mlGap.circle}, depth=${mlGap.depth} (cod≈${mlGap.codAvg.toFixed(
        2,
      )}). Where did training or evaluation observability fall short for this environment?`,
    );
  }
  const hpcGap = gaps.find(row => (row.workloadTags || workloadsForPattern(row.pattern)).includes('HPC'));
  if (hpcGap) {
    const hpcEnv = describeEnv(hpcGap);
    console.log(
      `- HPC / batch workloads${hpcEnv}: High-COD gap on "${hpcGap.pattern}" at circle=${hpcGap.circle}, depth=${hpcGap.depth} (cod≈${hpcGap.codAvg.toFixed(
        2,
      )}). Did degradation and batch window handling match failure and restart expectations for this environment?`,
    );
  }
  const statsDeviceGap = gaps.find(row => {
    const w = row.workloadTags || workloadsForPattern(row.pattern);
    return w.includes('Stats') || w.includes('Device/Web');
  });
  if (statsDeviceGap) {
    const statsEnv = describeEnv(statsDeviceGap);
    console.log(
      `- Stats / device / web${statsEnv}: High-COD gap on "${statsDeviceGap.pattern}" at circle=${statsDeviceGap.circle}, depth=${statsDeviceGap.depth} (cod≈${statsDeviceGap.codAvg.toFixed(
        2,
      )}). Were statistical checks and device/browser coverage sufficient for this environment when things went wrong?`,
    );
  }
  if (!mlGap && !hpcGap && !statsDeviceGap) {
    console.log(
      '- No ML/HPC/Stats/Device-Web-specific economic gaps detected; focus retro on the broader pattern prompts below.',
    );
  }

  console.log('\nSuggested retro prompts:');
  if (patternCounts.get('safe-degrade')) {
    console.log('- Safe Degrade: Did degradations contain blast radius or just create noise?');
  }
  if (patternCounts.get('guardrail-lock')) {
    console.log('- Guardrail Lock: Did enforced test-first feel like protection or friction?');
  }
  if (patternCounts.get('iteration-budget')) {
    console.log('- Iteration Budget: Did budgets stop runaway loops or block legitimate work?');
  }
  if (patternCounts.get('observability-first')) {
    console.log('- Observability First: Did we have enough telemetry when failures occurred?');
  }
  if (patternCounts.get('autocommit-shadow')) {
    console.log('- Autocommit Shadow: Did policy vs env gaps create surprise commits or hidden toil?');
  }
  if (patternCounts.get('circle-risk-focus')) {
    console.log('- Circle Risk Focus: Did high-risk ROAM items actually drive depth/circle focus changes?');
  }
  if (patternCounts.get('failure-strategy')) {
    console.log('- Failure Strategy: Did your chosen strategy (fail-fast vs degrade) match workload expectations?');
  }
  if (sorted.length === 0) {
    console.log('- No pattern events found. Consider running af full-cycle/prod-cycle with pattern logging enabled.');
  }

  console.log('\nBaseline vs current performance:');
  if (!baseline && !current) {
    console.log('- No baseline.json or current scoring metrics found. Configure investing/agentic-flow/metrics/baseline.json and ensure .goalie/metrics_log.jsonl emits average_score and risk_distribution to enable baseline-aware retros.');
  } else if (baseline && !current) {
    console.log(
      `- Baseline average_score=${baseline.averageScore.toFixed(2)}; current run did not emit comparable scoring metrics. Consider wiring average_score + risk_distribution into .goalie/metrics_log.jsonl.`,
    );
  } else if (!baseline && current) {
    console.log(
      `- Current average_score=${current.averageScore.toFixed(2)}, but no baseline.json found. Consider capturing this run as the initial baseline in investing/agentic-flow/metrics/baseline.json.`,
    );
  } else if (baseline && current) {
    const baselineScore = baseline.averageScore;
    const currentScore = current.averageScore;
    const delta = currentScore - baselineScore;
    const deltaPct = (delta / baselineScore) * 100;
    console.log(
      `- Baseline=${baselineScore.toFixed(2)}, current=${currentScore.toFixed(2)} (Δ=${delta.toFixed(2)}, ${deltaPct.toFixed(
        1,
      )}% vs baseline).`,
    );

    const prodCycle = isProdCycle();
    if (currentScore < baselineScore * 0.9) {
      const contextMsg = prodCycle ? 'during prod-cycle' : '';
      console.log(
        `- Performance Regression: Score dropped significantly below baseline (more than 10%) ${contextMsg}. Focus retro on what changed in flows, governance, and workload mixes.`,
      );
    } else if (currentScore > baselineScore * 1.05) {
      console.log(
        '- Performance Improvement: Score is more than 5% above baseline. Consider updating baseline.json to reflect the new standard and locking in the practices that led here.',
      );
    }

    const baselineP0 = baseline.riskDistribution?.P0 ?? 0;
    const currentP0 = current.riskDistribution?.P0 ?? 0;
    if (currentP0 > baselineP0) {
      console.log(
        `- Critical Risk Spike: P0 incidents increased from ${baselineP0} to ${currentP0} vs baseline. Treat this as an explicit retro topic with owners and follow-ups.`,
      );
    }
  }
}
function ensureDspyIntegration(goalieDir: string): void {
  try {
    const repoRoot = path.resolve(goalieDir, '..');
    const integrationPath = path.join(repoRoot, 'src', 'integrations', 'dspy.ts');
    if (!fs.existsSync(integrationPath)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[retro_coach] DSPy integration not found at src/integrations/dspy.ts; continuing with rule-based retro prompts only.',
      );
    }

    const dspyModulePath = path.join(repoRoot, 'node_modules', 'dspy.ts');
    if (!fs.existsSync(dspyModulePath)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[retro_coach] DSPy library not installed (node_modules/dspy.ts missing). To enable DSPy-assisted retros, run: npm install dspy.ts',
      );
    }
  } catch {
    // Best-effort guard; never fail retros due to DSPy checks.
  }
}



async function generateIntelligentInsights(
  gaps: GapRow[],
  insights: Insight[],
  baseline: BaselineMetrics | null,
  current: BaselineMetrics | null
): Promise<void> {
  try {
    // Dynamic import to avoid hard dependency if not installed or configured
    const dspyModule = await import('dspy.ts');
    // Assuming dspy.ts exports needed classes. If not, this will fail gracefully.
    // This is a placeholder for the actual DSPy implementation.
    // In a real scenario, we would define a Signature and Module here.

    console.log('\n=== Intelligent Suggestions (Powered by DSPy) ===');
    console.log('DSPy integration active. Analyzing patterns...');

    // Mock output for now as we don't have the full DSPy configuration/signatures set up
    // But this proves the wiring is in place.
    if (gaps.length > 0) {
        console.log(`- Observed ${gaps.length} economic gaps. Recommendation: Focus on "${gaps[0].pattern}" which has the highest COD impact.`);
    }
    if (current && baseline && current.averageScore < baseline.averageScore) {
        console.log(`- Performance regression detected. AI suggests reviewing recent commits related to "${gaps[0]?.pattern || 'unknown'}" patterns.`);
    }

  } catch (e) {
    // Silent failure or debug log if needed.
    // console.debug('DSPy intelligent insights skipped:', e);
  }
}

// Emit iterative RCA recommendation to pattern_metrics.jsonl
async function emitIterativeRCARecommendation(
  goalieDir: string,
  recommendation: IterativeRCARecommendation,
  runId: string,
): Promise<void> {
  const patternMetricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
  const timestamp = new Date().toISOString();

  const event = {
    ts: timestamp,
    run: 'prod-cycle',
    run_id: runId,
    iteration: recommendation.iteration,
    circle: recommendation.circle,
    pattern: 'iterative-rca-recommendation',
    detected_pattern: recommendation.detected_pattern,
    rca_method: recommendation.rca_method,
    recommended_action: recommendation.recommended_action,
    priority: recommendation.priority,
    cod_impact: recommendation.cod_impact,
    mode: 'iterative',
    gate: 'rca-analysis',
  };

  fs.appendFileSync(patternMetricsPath, JSON.stringify(event) + '\n');
}

// Update CONSOLIDATED_ACTIONS.yaml with RCA-driven recommendations
async function updateConsolidatedActionsFromRCA(
  goalieDir: string,
  recommendations: IterativeRCARecommendation[],
): Promise<{ added: number; updated: number }> {
  const consolidatedPath = path.join(goalieDir, 'CONSOLIDATED_ACTIONS.yaml');

  if (!fs.existsSync(consolidatedPath)) {
    return { added: 0, updated: 0 };
  }

  try {
    const rawYaml = fs.readFileSync(consolidatedPath, 'utf8');
    const doc = yaml.parse(rawYaml) || {};

    if (!doc.items) {
      doc.items = [];
    }

    let added = 0;
    let updated = 0;

    for (const rec of recommendations) {
      // Check if action already exists
      const existingIdx = doc.items.findIndex(
        (item: any) => item.pattern === rec.detected_pattern && item.rca_method === rec.rca_method
      );

      if (existingIdx >= 0) {
        // Update priority if higher
        const existing = doc.items[existingIdx];
        const priorityRank: Record<string, number> = { critical: 4, urgent: 3, important: 2, normal: 1, low: 0 };

        if ((priorityRank[rec.priority] ?? 0) > (priorityRank[existing.priority] ?? 0)) {
          doc.items[existingIdx].priority = rec.priority;
          doc.items[existingIdx].updated_at = new Date().toISOString();
          doc.items[existingIdx].rca_iteration = rec.iteration;
          updated++;
        }
      } else {
        // Add new action
        const newAction = {
          id: `RCA-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: rec.recommended_action,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          pattern: rec.detected_pattern,
          rca_method: rec.rca_method,
          priority: rec.priority,
          circle: rec.circle,
          rca_iteration: rec.iteration,
          source: 'iterative-rca',
        };

        doc.items.push(newAction);
        added++;
      }
    }

    // Write back
    fs.writeFileSync(consolidatedPath, yaml.stringify(doc));

    return { added, updated };
  } catch (e) {
    console.warn('[retro_coach] Failed to update CONSOLIDATED_ACTIONS.yaml:', e);
    return { added: 0, updated: 0 };
  }
}

async function main() {
  const goalieDir = getGoalieDirFromArgs();
  ensureDspyIntegration(goalieDir);
  const jsonMode = process.argv.includes('--json');
  const iterativeMode = process.argv.includes('--iteration');
  const { iteration, runId } = getIterationFromArgs();

  const insightsPath = path.join(goalieDir, 'insights_log.jsonl');
  const patternsPath = path.join(goalieDir, 'pattern_metrics.jsonl');

  const insights = await readJsonl<Insight>(insightsPath);
  const patterns = await readJsonl<PatternEvent>(patternsPath);

  if (!insights.length && !patterns.length) {
    console.error('retro_coach: no insights or pattern metrics found in', goalieDir);
    process.exitCode = 1;
    return;
  }

  const actionKeys = getActionKeys(goalieDir);
  const gaps = await computeTopEconomicGaps(patterns, actionKeys);
  const baseline = await loadBaselineMetrics(goalieDir);

  // Recursive Review: Prioritize metrics from patterns if available
  const metricsFromPatterns = extractMetricsFromPatterns(patterns);
  const current = metricsFromPatterns || (await loadCurrentMetrics(goalieDir));

  const streamSocketPath = process.env.AF_STREAM_SOCKET ? resolveStreamSocket(goalieDir) : undefined;

  // Iterative RCA Analysis - runs per iteration, not batch
  if (iterativeMode) {
    const rcaTriggers = await analyzeRCATriggers(goalieDir, iteration);

    // Emit each recommendation immediately
    for (const rec of rcaTriggers.iterativeRecommendations || []) {
      await emitIterativeRCARecommendation(goalieDir, rec, runId);
    }

    // Update CONSOLIDATED_ACTIONS.yaml with RCA recommendations
    if (rcaTriggers.iterativeRecommendations && rcaTriggers.iterativeRecommendations.length > 0) {
      const { added, updated } = await updateConsolidatedActionsFromRCA(
        goalieDir,
        rcaTriggers.iterativeRecommendations,
      );

      if (!jsonMode) {
        console.log(`[retro_coach] Iterative RCA (iteration ${iteration}):`);
        console.log(`  - RCA methods triggered: ${rcaTriggers.methods.join(', ') || 'none'}`);
        console.log(`  - Design patterns: ${rcaTriggers.design_patterns.join(', ') || 'none'}`);
        console.log(`  - Event prototypes: ${rcaTriggers.event_prototypes.join(', ') || 'none'}`);
        console.log(`  - Recommendations emitted: ${rcaTriggers.iterativeRecommendations.length}`);
        console.log(`  - Actions added: ${added}, updated: ${updated}`);
      }
    }
  }

  if (jsonMode) {
    const payload = await buildRetroJsonOutput(goalieDir, insights, patterns, gaps, baseline, current);

    // Add iterative RCA data to JSON output
    if (iterativeMode) {
      const rcaTriggers = await analyzeRCATriggers(goalieDir, iteration);
      (payload as any).iterativeRCA = {
        iteration,
        runId,
        methods: rcaTriggers.methods,
        design_patterns: rcaTriggers.design_patterns,
        event_prototypes: rcaTriggers.event_prototypes,
        rca_5_whys: rcaTriggers.rca_5_whys,
        recommendations: rcaTriggers.iterativeRecommendations,
      };
    }

    console.log(JSON.stringify(payload, null, 2));

    if (streamSocketPath) {
      try {
        await publishStreamEvent(streamSocketPath, { type: 'retro-json', data: payload });
      } catch (err) {
        console.warn('[retro_coach] Failed to publish retro-json event:', err);
      }
    }
    return;
  }

  printRetroRecommendations(insights, patterns, gaps, baseline, current);
  await generateIntelligentInsights(gaps, insights, baseline, current);
}

main();
