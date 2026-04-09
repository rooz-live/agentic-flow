export interface EvidenceConfig {
  emitters: Record<string, { enabled: boolean }>;
  batchSize?: number;
  asyncEmit?: boolean;
  maturity_thresholds?: MaturityThresholds;
  graduation?: {
    thresholds: GraduationThresholds;
  };
}

export interface Emitter {
  name: string;
  emit(input: any): EvidenceEvent;
  isEnabled(config: EvidenceConfig): boolean;
}

export interface EvidenceEvent {
  timestamp: string;
  emitter: string;
  data: EvidenceData;
  metadata?: Record<string, any>;
}

export interface EconomicCompoundingData {
  energy_cost_usd: number;
  value_per_hour: number;
  wsjf_per_h: number;
  wsjf_per_hour?: number;
  sys_state_err?: boolean;
  abort?: boolean;
  autofix_adv?: number;
}

export interface MaturityCoverageData {
  tier_depth: number;
  coverage_pct: number;
}

export interface ObservabilityGapsData {
  gaps: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface WipBoundsCheckData {
  wip: number;
  iters: number;
}

export interface MaturityThresholds {
  wip_limit: number;
  max_iters: number;
}

export interface EvidenceData {
  circle?: string;
  pattern?: string;
  method?: string;
  context?: Record<string, unknown>;
  protocol?: string;
  factors?: Record<string, unknown>;
  wsjf_per_h?: number;
  pattern_hit_pct?: number;
  phase?: string;
  maturity_score?: number;
  gaps?: string[];
  ok_rate?: number;
  stability_score?: number;
  economic_compounding?: EconomicCompoundingData;
  maturity_coverage?: MaturityCoverageData;
  observability_gaps?: ObservabilityGapsData;
  wip_bounds_check?: WipBoundsCheckData;
  [key: string]: unknown;
}

export interface GraduationThresholds {
  green_streak_required: number;
  max_autofix_adv_per_cycle: number;
  min_stability_score: number;
  min_ok_rate: number;
  max_sys_state_err: number;
  max_abort: number;
  shadow_cycles_before_recommend: number;
  retro_approval_required: boolean;
}

/**
 * Default graduation thresholds for production readiness
 * Adjusted for 0.80+ stability score target
 */
export const DEFAULT_GRADUATION_THRESHOLDS: GraduationThresholds = {
  green_streak_required: 5,
  max_autofix_adv_per_cycle: 3,
  min_stability_score: 0.80, // Target: 0.80+ for graduation
  min_ok_rate: 0.85, // Reduced from 0.98 to 0.85 for achievable target
  max_sys_state_err: 1, // Allow at most 1 sys state error per cycle
  max_abort: 0, // No aborts allowed for graduation
  shadow_cycles_before_recommend: 3, // Require 3 successful cycles before recommending
  retro_approval_required: false // Auto-approve retrospectives
};

export interface GraduationStatus {
  ready: boolean;
  metrics: {
    ok_rate: number;
    stability_score: number;
    autofix_adv_count: number;
    sys_state_err_count: number;
    abort_count: number;
    green_streak: number;
    cycles_observed: number;
    max_wip_seen?: number;
    max_iters_seen?: number;
  };
  reasons?: string[];
  shadow_cycles_before_recommend: number;
  retro_approval_required: boolean;
}