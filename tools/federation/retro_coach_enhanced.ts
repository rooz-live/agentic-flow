/**
 * Retro Coach Enhanced - Proxy Gaming Detection
 * ============================================
 * Implements truth-alignment by detecting "proxy gaming" - where agents
 * optimize for easy sub-metrics while failing global WSJF objectives.
 */

import { PatternLogger } from './pattern_logger';

export interface GamingSignal {
  type: 'PROXY_GAMING' | 'LOCAL_MAXIMA' | 'VALUE_DILUTION';
  severity: 'low' | 'medium' | 'high';
  rationale: string;
  evidence: string[];
}

export class ProxyGamingDetector {
  private logger: PatternLogger;

  constructor() {
    this.logger = new PatternLogger();
  }

  /**
   * Analyze recent patterns for proxy gaming signals
   */
  public async detectGaming(): Promise<GamingSignal[]> {
    const metrics = await this.logger.queryPatterns();
    const signals: GamingSignal[] = [];

    // 1. Detect "Busy Work" (High action count, stagnant WSJF)
    const recentMetrics = metrics.slice(-50);
    const avgWsjf = recentMetrics.reduce((sum, m) => sum + (m.economic?.wsjf_score || 0), 0) / recentMetrics.length;
    const actionCount = recentMetrics.filter(m => m.action_completed).length;

    if (actionCount > 40 && avgWsjf < 10) {
      signals.push({
        type: 'VALUE_DILUTION',
        severity: 'medium',
        rationale: 'High operational activity (40+ actions) yielding low average WSJF value (<10)',
        evidence: [`Actions: ${actionCount}`, `Avg WSJF: ${avgWsjf.toFixed(2)}`]
      });
    }

    // 2. Detect "Metric Local Maxima" (High sub-metric, negative global impact)
    const iterationBudgets = recentMetrics.filter(m => m.pattern === 'iteration_budget');
    const highBudgetRuns = iterationBudgets.filter((m: any) => m.enforced > 50);

    if (highBudgetRuns.length > 5 && avgWsjf < 5) {
      signals.push({
        type: 'LOCAL_MAXIMA',
        severity: 'high',
        rationale: 'High resource consumption (50+ iterations) consistently producing minimal value',
        evidence: [`High-budget runs: ${highBudgetRuns.length}`, `Current Avg WSJF: ${avgWsjf.toFixed(2)}`]
      });
    }

    // 3. Detect "Compliance Gaming" (100% compliance, but system state is degraded)
    const guardrailLocks = recentMetrics.filter(m => m.pattern === 'guardrail_lock');
    const enforcedLocks = guardrailLocks.filter((m: any) => m.enforced).length;

    if (enforcedLocks > 10 && avgWsjf < 1) {
      signals.push({
        type: 'PROXY_GAMING',
        severity: 'high',
        rationale: 'Perfect safety compliance (locks enforced) coinciding with complete value stall',
        evidence: [`Enforced locks: ${enforcedLocks}`, `Value: ${avgWsjf.toFixed(2)}`]
      });
    }

    return signals;
  }
}

export default ProxyGamingDetector;
