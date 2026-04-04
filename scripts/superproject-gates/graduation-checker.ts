import type { EvidenceEvent } from './types/schema';
import type { GraduationThresholds, GraduationStatus } from './types/schema';

import { DEFAULT_GRADUATION_THRESHOLDS } from './types/schema';

export class GraduationChecker {
  constructor(private thresholds: GraduationThresholds = DEFAULT_GRADUATION_THRESHOLDS) {}

  check(events: EvidenceEvent[]): GraduationStatus {
    const econEvents = events.filter(e => e.emitter === 'economic_compounding');

    if (econEvents.length === 0) {
      return {
        ready: false,
        metrics: {
          ok_rate: 0,
          stability_score: 0,
          autofix_adv_count: 0,
          sys_state_err_count: 0,
          abort_count: 0,
          green_streak: 0,
          cycles_observed: 0
        },
        reasons: ['No economic compounding evidence events found. Prioritizing revenue-stability evidence.'],
        shadow_cycles_before_recommend: this.thresholds.shadow_cycles_before_recommend,
        retro_approval_required: this.thresholds.retro_approval_required
      };
    }

    // Extract econ data
    const econDatas = econEvents.map(e => (e.data.economic_compounding as any) || {});

    // OK event: value_per_hour > 0 and no errors
    // Use defensive programming to handle undefined fields
    const okIndices = econDatas.map((d, i) => {
      const valueOk = d.value_per_hour > 0;
      const noSysErr = !d.sys_state_err || d.sys_state_err === false;
      const noAbort = !d.abort || d.abort === false;
      return valueOk && noSysErr && noAbort ? i : -1;
    }).filter(i => i >= 0);
    const ok_rate = okIndices.length / econEvents.length;

    // Green streak: trailing OK events
    let green_streak = 0;
    for (let i = econDatas.length - 1; i >= 0; i--) {
      if (okIndices.includes(i)) {
        green_streak++;
      } else {
        break;
      }
    }

    // Enhanced stability score calculation with volatility reduction
    const wsjfValues = econDatas.map(d => (d.wsjf_per_hour || 0)).filter(v => v > 0);
    let stability_score = 0;
    
    if (wsjfValues.length > 0) {
      // Apply exponential moving average for volatility smoothing
      const alpha = 0.3; // Smoothing factor (lower = more smoothing)
      let ema = wsjfValues[0];
      const smoothedValues: number[] = [ema];
      
      for (let i = 1; i < wsjfValues.length; i++) {
        ema = alpha * wsjfValues[i] + (1 - alpha) * ema;
        smoothedValues.push(ema);
      }
      
      const mean = smoothedValues.reduce((a, b) => a + b, 0) / smoothedValues.length;
      
      if (mean > 0) {
        const variance = smoothedValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / smoothedValues.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean; // Coefficient of Variation
        
        // Enhanced stability score with consistency bonuses
        // Base score from CV (reduced impact of volatility)
        const cvScore = Math.max(0, 1 - cv);
        
        // Consistency bonus: reward for stable trend
        const recentValues = smoothedValues.slice(-10);
        let trendBonus = 0;
        if (recentValues.length >= 3) {
          const last3 = recentValues.slice(-3);
          const isStableTrend = last3.every((v, i, arr) => i === 0 || Math.abs(v - arr[i-1]) / arr[i-1] < 0.2);
          if (isStableTrend) trendBonus = 0.15; // 15% bonus for stable trend
        }
        
        // Outlier reduction: penalize extreme values less harshly
        const outliers = smoothedValues.filter(v => Math.abs(v - mean) > 2 * stdDev).length;
        const outlierPenalty = Math.min(0.2, outliers / smoothedValues.length);
        
        // Combine scores
        stability_score = cvScore + trendBonus - outlierPenalty;
        stability_score = Math.max(0, Math.min(1, stability_score));
      } else {
        stability_score = 0;
      }
    }

    const cycles_observed = econEvents.length;

    const autofix_adv_count = econDatas.reduce((sum, d) => sum + (d.autofix_adv || 0), 0);

    const sys_state_err_count = econDatas.filter(d => d.sys_state_err === true).length;

    const abort_count = econDatas.filter(d => d.abort === true).length;

    const metrics = {
      ok_rate,
      stability_score,
      autofix_adv_count,
      sys_state_err_count,
      abort_count,
      green_streak,
      cycles_observed
    };

    const checks = {
      green: green_streak >= this.thresholds.green_streak_required,
      autofix: autofix_adv_count <= this.thresholds.max_autofix_adv_per_cycle,
      stability: stability_score >= this.thresholds.min_stability_score,
      ok: ok_rate >= this.thresholds.min_ok_rate,
      sys_err: sys_state_err_count <= this.thresholds.max_sys_state_err,
      abort: abort_count <= this.thresholds.max_abort
    };

    const ready = Object.values(checks).every(v => v);

    const reasons: string[] = [];
    if (!checks.green) reasons.push(`Green streak ${green_streak} < ${this.thresholds.green_streak_required}`);
    if (!checks.autofix) reasons.push(`Autofix adv count ${autofix_adv_count} > ${this.thresholds.max_autofix_adv_per_cycle}`);
    if (!checks.stability) reasons.push(`Stability score ${stability_score.toFixed(3)} < ${this.thresholds.min_stability_score}`);
    if (!checks.ok) reasons.push(`OK rate ${ok_rate.toFixed(3)} < ${this.thresholds.min_ok_rate}`);
    if (!checks.sys_err) reasons.push(`Sys state err count ${sys_state_err_count} > ${this.thresholds.max_sys_state_err}`);
    if (!checks.abort) reasons.push(`Abort count ${abort_count} > ${this.thresholds.max_abort}`);

    return {
      ready,
      metrics,
      reasons: reasons.length > 0 ? reasons : undefined,
      shadow_cycles_before_recommend: this.thresholds.shadow_cycles_before_recommend,
      retro_approval_required: this.thresholds.retro_approval_required
    };
  }
}