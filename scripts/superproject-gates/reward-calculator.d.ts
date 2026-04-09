/**
 * @fileoverview Comprehensive Reward Calculator
 * Implements dynamic scoring with MCP/MPP protocol integration
 *
 * Factors:
 * - Thresholds: Dynamic percentile-based boundaries
 * - Penalties: Time, quality, error, resource usage
 * - Scoring: Multi-dimensional performance metrics
 * - Multipliers: Difficulty, complexity, risk-adjusted
 * - MCP: Model Context Protocol integration patterns
 * - MPP: Multi-Provider Protocol coordination
 */
export interface RewardFactors {
    success: boolean;
    duration_ms: number;
    expected_duration_ms: number;
    quality_score?: number;
    test_coverage?: number;
    lint_warnings?: number;
    error_count?: number;
    difficulty?: number;
    complexity_score?: number;
    lines_changed?: number;
    memory_usage_mb?: number;
    cpu_usage_percent?: number;
    api_calls_count?: number;
    mcp_context_usage?: MCPContextUsage;
    mpp_provider_performance?: MPPProviderMetrics;
    pattern_match_confidence?: number;
    method_efficiency?: number;
    protocol_compliance?: number;
}
export interface MCPContextUsage {
    tools_used: number;
    resources_accessed: number;
    context_switches: number;
    cache_hit_rate: number;
    protocol_version: string;
}
export interface MPPProviderMetrics {
    provider_count: number;
    primary_provider_latency_ms: number;
    fallback_triggered: boolean;
    load_balance_efficiency: number;
    provider_agreement_score: number;
}
export interface RewardBreakdown {
    base_reward: number;
    time_factor: number;
    quality_factor: number;
    complexity_factor: number;
    resource_factor: number;
    mcp_factor: number;
    mpp_factor: number;
    pattern_factor: number;
    final_reward: number;
    penalties: PenaltyBreakdown;
    bonuses: BonusBreakdown;
}
export interface PenaltyBreakdown {
    time_penalty: number;
    quality_penalty: number;
    error_penalty: number;
    resource_penalty: number;
    protocol_penalty: number;
}
export interface BonusBreakdown {
    speed_bonus: number;
    quality_bonus: number;
    efficiency_bonus: number;
    protocol_bonus: number;
}
export declare const REWARD_THRESHOLDS: {
    readonly EXCEPTIONAL_SPEED: 0.5;
    readonly GOOD_SPEED: 0.8;
    readonly ACCEPTABLE_SPEED: 1.2;
    readonly SLOW: 2;
    readonly EXCELLENT_QUALITY: 0.95;
    readonly GOOD_QUALITY: 0.85;
    readonly ACCEPTABLE_QUALITY: 0.7;
    readonly POOR_QUALITY: 0.5;
    readonly LOW_RESOURCE: 0.5;
    readonly NORMAL_RESOURCE: 1;
    readonly HIGH_RESOURCE: 2;
    readonly HIGH_CACHE_HIT: 0.8;
    readonly GOOD_CACHE_HIT: 0.6;
    readonly LOW_CACHE_HIT: 0.3;
    readonly EXCELLENT_PROVIDER_AGREEMENT: 0.95;
    readonly GOOD_PROVIDER_AGREEMENT: 0.8;
    readonly POOR_PROVIDER_AGREEMENT: 0.6;
};
export declare const PENALTIES: {
    readonly TIME_DECAY_RATE: 0.3;
    readonly MAX_TIME_PENALTY: 0.5;
    readonly LINT_WARNING_PENALTY: 0.01;
    readonly MAX_LINT_PENALTY: 0.1;
    readonly TEST_COVERAGE_WEIGHT: 0.15;
    readonly ERROR_DECAY_RATE: 0.15;
    readonly MAX_ERROR_PENALTY: 0.4;
    readonly MEMORY_PENALTY_RATE: 0.05;
    readonly CPU_PENALTY_RATE: 0.03;
    readonly API_CALL_PENALTY: 0.001;
    readonly CONTEXT_SWITCH_PENALTY: 0.02;
    readonly LOW_CACHE_PENALTY: 0.1;
    readonly PROVIDER_DISAGREEMENT_PENALTY: 0.15;
};
export declare const BONUSES: {
    readonly EXCEPTIONAL_SPEED_BONUS: 0.15;
    readonly GOOD_SPEED_BONUS: 0.08;
    readonly PERFECT_QUALITY_BONUS: 0.1;
    readonly HIGH_TEST_COVERAGE_BONUS: 0.05;
    readonly HIGH_CACHE_HIT_BONUS: 0.08;
    readonly LOW_RESOURCE_BONUS: 0.05;
    readonly HIGH_PROVIDER_AGREEMENT_BONUS: 0.1;
    readonly EFFICIENT_MCP_USAGE_BONUS: 0.07;
};
export declare const MULTIPLIERS: {
    readonly EASY: 0.8;
    readonly NORMAL: 1;
    readonly HARD: 1.2;
    readonly EXPERT: 1.4;
    readonly LOW_COMPLEXITY: 0.9;
    readonly MEDIUM_COMPLEXITY: 1;
    readonly HIGH_COMPLEXITY: 1.15;
    readonly VERY_HIGH_COMPLEXITY: 1.3;
    readonly LOW_RISK: 0.95;
    readonly MEDIUM_RISK: 1;
    readonly HIGH_RISK: 1.1;
    readonly CRITICAL_RISK: 1.25;
};
export declare function calculateReward(factors: RewardFactors): Promise<number>;
export declare function calculateRewardBreakdown(factors: RewardFactors): Promise<RewardBreakdown>;
export declare function calculateQualityScore(result: {
    lint_warnings?: number;
    test_coverage?: number;
    retry_count?: number;
    type_errors?: number;
}): number;
declare const _default: {
    calculateReward: typeof calculateReward;
    calculateRewardBreakdown: typeof calculateRewardBreakdown;
    calculateQualityScore: typeof calculateQualityScore;
    REWARD_THRESHOLDS: {
        readonly EXCEPTIONAL_SPEED: 0.5;
        readonly GOOD_SPEED: 0.8;
        readonly ACCEPTABLE_SPEED: 1.2;
        readonly SLOW: 2;
        readonly EXCELLENT_QUALITY: 0.95;
        readonly GOOD_QUALITY: 0.85;
        readonly ACCEPTABLE_QUALITY: 0.7;
        readonly POOR_QUALITY: 0.5;
        readonly LOW_RESOURCE: 0.5;
        readonly NORMAL_RESOURCE: 1;
        readonly HIGH_RESOURCE: 2;
        readonly HIGH_CACHE_HIT: 0.8;
        readonly GOOD_CACHE_HIT: 0.6;
        readonly LOW_CACHE_HIT: 0.3;
        readonly EXCELLENT_PROVIDER_AGREEMENT: 0.95;
        readonly GOOD_PROVIDER_AGREEMENT: 0.8;
        readonly POOR_PROVIDER_AGREEMENT: 0.6;
    };
    PENALTIES: {
        readonly TIME_DECAY_RATE: 0.3;
        readonly MAX_TIME_PENALTY: 0.5;
        readonly LINT_WARNING_PENALTY: 0.01;
        readonly MAX_LINT_PENALTY: 0.1;
        readonly TEST_COVERAGE_WEIGHT: 0.15;
        readonly ERROR_DECAY_RATE: 0.15;
        readonly MAX_ERROR_PENALTY: 0.4;
        readonly MEMORY_PENALTY_RATE: 0.05;
        readonly CPU_PENALTY_RATE: 0.03;
        readonly API_CALL_PENALTY: 0.001;
        readonly CONTEXT_SWITCH_PENALTY: 0.02;
        readonly LOW_CACHE_PENALTY: 0.1;
        readonly PROVIDER_DISAGREEMENT_PENALTY: 0.15;
    };
    BONUSES: {
        readonly EXCEPTIONAL_SPEED_BONUS: 0.15;
        readonly GOOD_SPEED_BONUS: 0.08;
        readonly PERFECT_QUALITY_BONUS: 0.1;
        readonly HIGH_TEST_COVERAGE_BONUS: 0.05;
        readonly HIGH_CACHE_HIT_BONUS: 0.08;
        readonly LOW_RESOURCE_BONUS: 0.05;
        readonly HIGH_PROVIDER_AGREEMENT_BONUS: 0.1;
        readonly EFFICIENT_MCP_USAGE_BONUS: 0.07;
    };
    MULTIPLIERS: {
        readonly EASY: 0.8;
        readonly NORMAL: 1;
        readonly HARD: 1.2;
        readonly EXPERT: 1.4;
        readonly LOW_COMPLEXITY: 0.9;
        readonly MEDIUM_COMPLEXITY: 1;
        readonly HIGH_COMPLEXITY: 1.15;
        readonly VERY_HIGH_COMPLEXITY: 1.3;
        readonly LOW_RISK: 0.95;
        readonly MEDIUM_RISK: 1;
        readonly HIGH_RISK: 1.1;
        readonly CRITICAL_RISK: 1.25;
    };
};
export default _default;
//# sourceMappingURL=reward-calculator.d.ts.map