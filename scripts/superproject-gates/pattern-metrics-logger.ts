import fs from 'fs';
import path from 'path';
import type { PatternMetric, AlignmentScore } from './types';

const WORKSPACE_ROOT = path.resolve(process.cwd(), '../../../..');
const GOALIE_DIR = path.join(WORKSPACE_ROOT, '.goalie');
const METRICS_FILE = path.join(GOALIE_DIR, 'pattern_metrics.jsonl');

// P1-TIME: Auto-rationale generation for pattern events
const PATTERN_RATIONALES: Record<string, string> = {
  'safe_degrade': 'Graceful degradation triggered to maintain service stability under load',
  'circle_risk_focus': 'Risk-based resource allocation per ROAM framework prioritization',
  'autocommit_shadow': 'Autonomous commit validation to ensure code quality gates',
  'guardrail_lock': 'Enforcement boundary activated to prevent policy violation',
  'iteration_budget': 'Resource allocation adjusted based on iteration capacity',
  'observability_first': 'Metrics-driven execution for visibility and traceability',
  'health_check': 'System health monitoring for proactive issue detection',
  'governance_decision': 'Governance policy applied per Truth/Time/Live framework',
  'roam_update': 'ROAM board updated with current risk/opportunity status',
  'circuit_breaker': 'Circuit breaker activated to prevent cascade failures'
};

// Default alignment scores for different pattern types
const DEFAULT_ALIGNMENT: AlignmentScore = {
  manthra_score: 0.85,
  yasna_score: 0.95,
  mithra_score: 0.90,
  overall_drift: 0.05,
  consequence_tracked: true
};

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate auto-rationale based on pattern type
 * P1-TIME: Semantic context for audit trail
 */
function generateRationale(pattern: string, description?: string): string {
  if (description && description.length > 20) {
    return description;  // Use provided description if substantial
  }

  // Look up pattern-specific rationale
  const baseRationale = PATTERN_RATIONALES[pattern];
  if (baseRationale) {
    return description ? `${baseRationale}: ${description}` : baseRationale;
  }

  // Generate from pattern name
  const formatted = pattern.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
  return `Pattern '${formatted}' triggered${description ? `: ${description}` : ''}`;
}

/**
 * Log a pattern event with full semantic context
 * P1-TIME: Complete audit trail with rationale and alignment
 */
export function logPattern(metric: Omit<PatternMetric, 'timestamp'>): void {
  ensureDir(GOALIE_DIR);

  // Auto-generate rationale if not provided
  const rationale = metric.rationale || generateRationale(metric.pattern, metric.description);

  // Use provided alignment scores or defaults
  const alignment_score = metric.alignment_score || DEFAULT_ALIGNMENT;

  const fullMetric: PatternMetric = {
    ...metric,
    timestamp: new Date().toISOString(),
    rationale,
    alignment_score,
    run_id: metric.run_id || process.env.AF_RUN_ID || `run-${Date.now()}`
  };

  const line = JSON.stringify(fullMetric) + '\n';
  fs.appendFileSync(METRICS_FILE, line, 'utf8');
  console.log(`Logged pattern: ${metric.pattern}, triggers: ${metric.triggers ?? 0}, circle: ${metric.circle ?? 'unknown'}, rationale: ${rationale.slice(0, 50)}...`);
}

/**
 * Log pattern with explicit alignment scores
 * For governance-critical patterns requiring MYM tracking
 */
export function logAlignedPattern(
  pattern: string,
  alignment: AlignmentScore,
  options: Partial<Omit<PatternMetric, 'timestamp' | 'pattern' | 'alignment_score'>> = {}
): void {
  logPattern({
    pattern,
    alignment_score: alignment,
    ...options
  });
}

// CLI usage
if (require.main === module) {
  if (process.argv.length > 2) {
    const pattern = process.argv[2];
    const triggers = parseInt(process.argv[3] || '1');
    const circle = process.argv[4];
    const description = process.argv.slice(5).join(' ') || undefined;
    logPattern({ pattern, triggers, circle, description });
  } else {
    // Example with full alignment tracking
    logPattern({
      pattern: 'safe_degrade',
      triggers: 1,
      circle: 'orchestrator',
      description: 'Regression threshold exceeded, rollback triggered per architect plan',
      alignment_score: {
        manthra_score: 0.88,
        yasna_score: 1.0,
        mithra_score: 0.95,
        overall_drift: 0.02,
        consequence_tracked: true
      },
      roam_reference: 'RISK-001'
    });
  }
}