/**
 * Unified Evidence Event Schema for Agentic Flow CLI
 *
 * This schema standardizes evidence emission across all CLI commands
 * including prod-cycle, prod-swarm, pattern-coverage, and goalie-gaps.
 */
export interface EvidenceEvent {
    timestamp: string;
    emitter: EvidenceEmitter;
    run_id?: string;
    correlation_id?: string;
    circle?: string;
    depth?: number;
    mode?: 'advisory' | 'mutate';
    fields: EvidenceFields;
    variant?: VariantInfo;
    tags?: string[];
}
export type EvidenceEmitter = 'revenue-safe' | 'tier-depth' | 'gaps' | 'intent-coverage' | 'winner-grade' | 'economic' | 'phase-progression' | 'security-audit' | 'decision-lens' | 'contention-analysis' | 'variant-analysis';
export interface EvidenceFields {
    economic_compounding?: {
        wsjf_per_h: number;
        energy_cost_usd: number;
        value_per_hour: number;
        profit_dividend_usd?: number;
        revenue_per_hour?: number;
    };
    maturity_coverage?: {
        tier_backlog_cov_pct: number;
        tier_telemetry_cov_pct: number;
        tier_depth_cov_pct: number;
        circle_coverage_pct?: number;
        depth_score?: number;
    };
    observability_gaps?: {
        gaps: Array<{
            pattern: string;
            deficit: number;
            severity: 'low' | 'medium' | 'high' | 'critical';
        }>;
        gap_count: number;
        not_applicable: string[];
    };
    pattern_hit_pct?: {
        hit_pct: number;
        patterns_hit: number;
        patterns_total: number;
        required_patterns: string[];
        pattern_hits: Record<string, number>;
    };
    prod_cycle_qualification?: {
        grade: 'bronze' | 'silver' | 'gold' | 'platinum';
        ok_rate: number;
        rev_per_h: number;
        duration_ok_pct: number;
        abort_count: number;
        contention_mult: number;
        checks_passed: number;
        checks_total: number;
    };
    economic_metrics?: {
        infrastructure_utilization: number;
        capex_opex_ratio: number;
        cost_of_delay: number;
        time_criticality: number;
        risk_reduction: number;
        job_duration: number;
        user_business_value: number;
    };
    phase_progression?: {
        current_phase: string;
        phases_completed: string[];
        progression_pct: number;
        phase_duration_ms: number;
    };
    security_audit_gaps?: {
        sec_audit_issues: Array<{
            id: string;
            description: string;
            severity: 'low' | 'medium' | 'high' | 'critical';
        }>;
        cve_count: number;
        cve_list: Array<{
            id: string;
            severity: string;
        }>;
    };
    decision_lens_telemetry?: {
        backlog_coverage_pct: number;
        telemetry_coverage_pct: number;
        circle_perspectives: Array<{
            circle: string;
            backlog: boolean;
            events: number;
            depth_pct: number;
            target: number;
            lens: string;
        }>;
    };
    contention_analysis?: {
        duration_multiplier: number;
        efficiency_multiplier: number;
        max_concurrency: number;
        recommended_concurrency: number;
        contention_score: number;
    };
    variant_analysis?: {
        variant_label: string;
        iterations: number;
        reps: number;
        statistical_significance: boolean;
        confidence_interval: [number, number];
        effect_size: number;
    };
}
export interface VariantInfo {
    label: string;
    iters: number;
    reps: number;
    baseline?: boolean;
}
export interface EvidenceConfig {
    default_emitters: EvidenceEmitter[];
    emitter_configs: Record<EvidenceEmitter, {
        enabled: boolean;
        sampling_rate?: number;
        thresholds?: Record<string, number>;
        output_format?: 'json' | 'tsv' | 'yaml';
    }>;
    graduation: {
        green_streak_required: number;
        shadow_cycles_before_recommend: number;
        retro_approval_required: boolean;
        max_sys_state_err: number;
        max_abort: number;
        max_autofix_adv_per_cycle: number;
        min_stability_score: number;
        min_ok_rate: number;
    };
}
export interface EvidenceSummary {
    run_id: string;
    timestamp: string;
    total_events: number;
    emitters_used: EvidenceEmitter[];
    overall_grade?: 'bronze' | 'silver' | 'gold' | 'platinum';
    readiness_score: number;
    recommendations: Array<{
        priority: 'critical' | 'high' | 'medium' | 'low';
        category: string;
        action: string;
        impact: string;
        auto_fixable: boolean;
    }>;
}
//# sourceMappingURL=types.d.ts.map