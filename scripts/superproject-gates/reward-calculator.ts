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

import { getDistributionStats } from './dynamic-thresholds';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RewardFactors {
  // Core metrics
  success: boolean;
  duration_ms: number;
  expected_duration_ms: number;
  
  // Quality metrics
  quality_score?: number;
  test_coverage?: number;
  lint_warnings?: number;
  error_count?: number;
  
  // Complexity metrics
  difficulty?: number;
  complexity_score?: number;
  lines_changed?: number;
  
  // Resource metrics
  memory_usage_mb?: number;
  cpu_usage_percent?: number;
  api_calls_count?: number;
  
  // MCP/MPP Protocol metrics
  mcp_context_usage?: MCPContextUsage;
  mpp_provider_performance?: MPPProviderMetrics;
  
  // Pattern matching
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

// ============================================================================
// Threshold Constants (Dynamic Percentile-Based)
// ============================================================================

export const REWARD_THRESHOLDS = {
  // Time thresholds
  EXCEPTIONAL_SPEED: 0.5,  // <50% of expected time
  GOOD_SPEED: 0.8,         // <80% of expected time
  ACCEPTABLE_SPEED: 1.2,   // <120% of expected time
  SLOW: 2.0,               // >200% of expected time
  
  // Quality thresholds
  EXCELLENT_QUALITY: 0.95,
  GOOD_QUALITY: 0.85,
  ACCEPTABLE_QUALITY: 0.70,
  POOR_QUALITY: 0.50,
  
  // Resource thresholds
  LOW_RESOURCE: 0.5,
  NORMAL_RESOURCE: 1.0,
  HIGH_RESOURCE: 2.0,
  
  // MCP/MPP thresholds
  HIGH_CACHE_HIT: 0.8,
  GOOD_CACHE_HIT: 0.6,
  LOW_CACHE_HIT: 0.3,
  
  EXCELLENT_PROVIDER_AGREEMENT: 0.95,
  GOOD_PROVIDER_AGREEMENT: 0.80,
  POOR_PROVIDER_AGREEMENT: 0.60,
} as const;

// ============================================================================
// Penalty Configurations
// ============================================================================

export const PENALTIES = {
  // Time penalties (exponential decay)
  TIME_DECAY_RATE: 0.3,
  MAX_TIME_PENALTY: 0.5,
  
  // Quality penalties (linear)
  LINT_WARNING_PENALTY: 0.01,
  MAX_LINT_PENALTY: 0.10,
  TEST_COVERAGE_WEIGHT: 0.15,
  
  // Error penalties (exponential)
  ERROR_DECAY_RATE: 0.15,
  MAX_ERROR_PENALTY: 0.40,
  
  // Resource penalties
  MEMORY_PENALTY_RATE: 0.05,
  CPU_PENALTY_RATE: 0.03,
  API_CALL_PENALTY: 0.001,
  
  // Protocol penalties
  CONTEXT_SWITCH_PENALTY: 0.02,
  LOW_CACHE_PENALTY: 0.10,
  PROVIDER_DISAGREEMENT_PENALTY: 0.15,
} as const;

// ============================================================================
// Bonus Configurations
// ============================================================================

export const BONUSES = {
  // Speed bonuses
  EXCEPTIONAL_SPEED_BONUS: 0.15,
  GOOD_SPEED_BONUS: 0.08,
  
  // Quality bonuses
  PERFECT_QUALITY_BONUS: 0.10,
  HIGH_TEST_COVERAGE_BONUS: 0.05,
  
  // Efficiency bonuses
  HIGH_CACHE_HIT_BONUS: 0.08,
  LOW_RESOURCE_BONUS: 0.05,
  
  // Protocol bonuses
  HIGH_PROVIDER_AGREEMENT_BONUS: 0.10,
  EFFICIENT_MCP_USAGE_BONUS: 0.07,
} as const;

// ============================================================================
// Multiplier Configurations
// ============================================================================

export const MULTIPLIERS = {
  // Difficulty multipliers
  EASY: 0.80,
  NORMAL: 1.00,
  HARD: 1.20,
  EXPERT: 1.40,
  
  // Complexity multipliers
  LOW_COMPLEXITY: 0.90,
  MEDIUM_COMPLEXITY: 1.00,
  HIGH_COMPLEXITY: 1.15,
  VERY_HIGH_COMPLEXITY: 1.30,
  
  // Risk multipliers
  LOW_RISK: 0.95,
  MEDIUM_RISK: 1.00,
  HIGH_RISK: 1.10,
  CRITICAL_RISK: 1.25,
} as const;

// ============================================================================
// Core Reward Calculator
// ============================================================================

export async function calculateReward(factors: RewardFactors): Promise<number> {
  const breakdown = await calculateRewardBreakdown(factors);
  return breakdown.final_reward;
}

export async function calculateRewardBreakdown(
  factors: RewardFactors
): Promise<RewardBreakdown> {
  const {
    success,
    duration_ms,
    expected_duration_ms,
    quality_score = 1.0,
    difficulty = 1.0,
    complexity_score = 1.0,
  } = factors;
  
  // Base reward
  let base_reward = success ? 1.0 : 0.3;
  
  // Calculate individual factors
  const time_factor = calculateTimeFactor(duration_ms, expected_duration_ms);
  const quality_factor = calculateQualityFactor(factors);
  const complexity_factor = calculateComplexityFactor(factors);
  const resource_factor = calculateResourceFactor(factors);
  const mcp_factor = calculateMCPFactor(factors);
  const mpp_factor = calculateMPPFactor(factors);
  const pattern_factor = calculatePatternFactor(factors);
  
  // Calculate penalties and bonuses
  const penalties = calculatePenalties(factors, time_factor, quality_factor);
  const bonuses = calculateBonuses(factors, time_factor, quality_factor);
  
  // Apply all factors
  let reward = base_reward;
  reward *= time_factor;
  reward *= quality_factor;
  reward *= complexity_factor;
  reward *= resource_factor;
  reward *= mcp_factor;
  reward *= mpp_factor;
  reward *= pattern_factor;
  
  // Apply difficulty multiplier
  const difficulty_multiplier = getDifficultyMultiplier(difficulty);
  reward *= difficulty_multiplier;
  
  // Apply complexity multiplier
  const complexity_multiplier = getComplexityMultiplier(complexity_score);
  reward *= complexity_multiplier;
  
  // Clamp to valid range [0, 1]
  const final_reward = Math.max(0.0, Math.min(1.0, reward));
  
  return {
    base_reward,
    time_factor,
    quality_factor,
    complexity_factor,
    resource_factor,
    mcp_factor,
    mpp_factor,
    pattern_factor,
    final_reward,
    penalties,
    bonuses,
  };
}

// ============================================================================
// Time Factor Calculation
// ============================================================================

function calculateTimeFactor(
  duration_ms: number,
  expected_duration_ms: number
): number {
  const time_ratio = duration_ms / expected_duration_ms;
  
  // Exceptional speed bonus
  if (time_ratio < REWARD_THRESHOLDS.EXCEPTIONAL_SPEED) {
    return 1.0 + BONUSES.EXCEPTIONAL_SPEED_BONUS;
  }
  
  // Good speed bonus
  if (time_ratio < REWARD_THRESHOLDS.GOOD_SPEED) {
    return 1.0 + BONUSES.GOOD_SPEED_BONUS;
  }
  
  // Acceptable speed (no penalty/bonus)
  if (time_ratio <= REWARD_THRESHOLDS.ACCEPTABLE_SPEED) {
    return 1.0;
  }
  
  // Time penalty (exponential decay)
  const excess_ratio = time_ratio - REWARD_THRESHOLDS.ACCEPTABLE_SPEED;
  const penalty = Math.min(
    PENALTIES.MAX_TIME_PENALTY,
    1.0 - Math.exp(-PENALTIES.TIME_DECAY_RATE * excess_ratio)
  );
  
  return Math.max(0.5, 1.0 - penalty);
}

// ============================================================================
// Quality Factor Calculation
// ============================================================================

function calculateQualityFactor(factors: RewardFactors): number {
  const {
    quality_score = 1.0,
    test_coverage = 1.0,
    lint_warnings = 0,
    error_count = 0,
  } = factors;
  
  let factor = quality_score;
  
  // Test coverage impact
  factor *= (0.85 + 0.15 * test_coverage);
  
  // Lint warnings penalty
  if (lint_warnings > 0) {
    const lint_penalty = Math.min(
      PENALTIES.MAX_LINT_PENALTY,
      lint_warnings * PENALTIES.LINT_WARNING_PENALTY
    );
    factor *= (1.0 - lint_penalty);
  }
  
  // Error count penalty (exponential)
  if (error_count > 0) {
    const error_penalty = Math.min(
      PENALTIES.MAX_ERROR_PENALTY,
      1.0 - Math.exp(-PENALTIES.ERROR_DECAY_RATE * error_count)
    );
    factor *= (1.0 - error_penalty);
  }
  
  // Perfect quality bonus
  if (quality_score >= 0.99 && test_coverage >= 0.95 && lint_warnings === 0) {
    factor *= (1.0 + BONUSES.PERFECT_QUALITY_BONUS);
  }
  
  return Math.max(0.3, Math.min(1.2, factor));
}

// ============================================================================
// Complexity Factor Calculation
// ============================================================================

function calculateComplexityFactor(factors: RewardFactors): number {
  const { complexity_score = 1.0, lines_changed = 0 } = factors;
  
  let factor = 1.0;
  
  // Complexity adjustment (higher complexity = slightly harder)
  if (complexity_score > 2.0) {
    factor *= 1.05; // Bonus for handling high complexity
  } else if (complexity_score < 0.5) {
    factor *= 0.95; // Small penalty for trivial tasks
  }
  
  // Lines changed efficiency
  if (lines_changed > 0) {
    // Reward concise solutions
    if (lines_changed < 50) {
      factor *= 1.02;
    } else if (lines_changed > 500) {
      factor *= 0.98; // Slight penalty for large changes
    }
  }
  
  return Math.max(0.9, Math.min(1.1, factor));
}

// ============================================================================
// Resource Factor Calculation
// ============================================================================

function calculateResourceFactor(factors: RewardFactors): number {
  const {
    memory_usage_mb = 0,
    cpu_usage_percent = 0,
    api_calls_count = 0,
  } = factors;
  
  let factor = 1.0;
  
  // Memory usage penalty (if excessive)
  if (memory_usage_mb > 500) {
    const memory_penalty = (memory_usage_mb - 500) * PENALTIES.MEMORY_PENALTY_RATE / 1000;
    factor *= (1.0 - Math.min(0.15, memory_penalty));
  } else if (memory_usage_mb < 100) {
    // Bonus for low memory usage
    factor *= (1.0 + BONUSES.LOW_RESOURCE_BONUS);
  }
  
  // CPU usage penalty
  if (cpu_usage_percent > 80) {
    const cpu_penalty = (cpu_usage_percent - 80) * PENALTIES.CPU_PENALTY_RATE / 100;
    factor *= (1.0 - Math.min(0.10, cpu_penalty));
  }
  
  // API calls penalty (excessive calls)
  if (api_calls_count > 100) {
    const api_penalty = (api_calls_count - 100) * PENALTIES.API_CALL_PENALTY;
    factor *= (1.0 - Math.min(0.20, api_penalty));
  }
  
  return Math.max(0.8, Math.min(1.1, factor));
}

// ============================================================================
// MCP (Model Context Protocol) Factor Calculation
// ============================================================================

function calculateMCPFactor(factors: RewardFactors): number {
  const { mcp_context_usage } = factors;
  
  if (!mcp_context_usage) {
    return 1.0; // Neutral if not using MCP
  }
  
  const {
    tools_used,
    resources_accessed,
    context_switches,
    cache_hit_rate,
  } = mcp_context_usage;
  
  let factor = 1.0;
  
  // Cache hit rate bonus/penalty
  if (cache_hit_rate >= REWARD_THRESHOLDS.HIGH_CACHE_HIT) {
    factor *= (1.0 + BONUSES.HIGH_CACHE_HIT_BONUS);
  } else if (cache_hit_rate < REWARD_THRESHOLDS.LOW_CACHE_HIT) {
    factor *= (1.0 - PENALTIES.LOW_CACHE_PENALTY);
  }
  
  // Context switches penalty (excessive switching is inefficient)
  if (context_switches > 10) {
    const switch_penalty = (context_switches - 10) * PENALTIES.CONTEXT_SWITCH_PENALTY;
    factor *= (1.0 - Math.min(0.15, switch_penalty));
  }
  
  // Efficient tool usage bonus
  const tool_efficiency = resources_accessed / Math.max(1, tools_used);
  if (tool_efficiency > 2.0 && tools_used > 0) {
    factor *= (1.0 + BONUSES.EFFICIENT_MCP_USAGE_BONUS);
  }
  
  return Math.max(0.85, Math.min(1.15, factor));
}

// ============================================================================
// MPP (Multi-Provider Protocol) Factor Calculation
// ============================================================================

function calculateMPPFactor(factors: RewardFactors): number {
  const { mpp_provider_performance } = factors;
  
  if (!mpp_provider_performance) {
    return 1.0; // Neutral if not using MPP
  }
  
  const {
    provider_count,
    primary_provider_latency_ms,
    fallback_triggered,
    load_balance_efficiency,
    provider_agreement_score,
  } = mpp_provider_performance;
  
  let factor = 1.0;
  
  // Provider agreement bonus/penalty
  if (provider_agreement_score >= REWARD_THRESHOLDS.EXCELLENT_PROVIDER_AGREEMENT) {
    factor *= (1.0 + BONUSES.HIGH_PROVIDER_AGREEMENT_BONUS);
  } else if (provider_agreement_score < REWARD_THRESHOLDS.POOR_PROVIDER_AGREEMENT) {
    factor *= (1.0 - PENALTIES.PROVIDER_DISAGREEMENT_PENALTY);
  }
  
  // Fallback penalty (indicates primary provider issues)
  if (fallback_triggered) {
    factor *= 0.95;
  }
  
  // Load balancing efficiency bonus
  if (load_balance_efficiency > 0.85 && provider_count > 1) {
    factor *= 1.05;
  }
  
  // Latency penalty (slow primary provider)
  if (primary_provider_latency_ms > 5000) {
    const latency_penalty = (primary_provider_latency_ms - 5000) / 10000;
    factor *= (1.0 - Math.min(0.10, latency_penalty));
  }
  
  return Math.max(0.85, Math.min(1.15, factor));
}

// ============================================================================
// Pattern Factor Calculation
// ============================================================================

function calculatePatternFactor(factors: RewardFactors): number {
  const {
    pattern_match_confidence = 1.0,
    method_efficiency = 1.0,
    protocol_compliance = 1.0,
  } = factors;
  
  let factor = 1.0;
  
  // Pattern match confidence
  factor *= (0.9 + 0.1 * pattern_match_confidence);
  
  // Method efficiency
  factor *= (0.95 + 0.05 * method_efficiency);
  
  // Protocol compliance
  factor *= protocol_compliance;
  
  return Math.max(0.85, Math.min(1.1, factor));
}

// ============================================================================
// Penalty Calculation
// ============================================================================

function calculatePenalties(
  factors: RewardFactors,
  time_factor: number,
  quality_factor: number
): PenaltyBreakdown {
  return {
    time_penalty: Math.max(0, 1.0 - time_factor),
    quality_penalty: Math.max(0, 1.0 - quality_factor),
    error_penalty: (factors.error_count || 0) > 0 ? 
      Math.min(PENALTIES.MAX_ERROR_PENALTY, (factors.error_count || 0) * PENALTIES.ERROR_DECAY_RATE) : 0,
    resource_penalty: calculateResourcePenalty(factors),
    protocol_penalty: calculateProtocolPenalty(factors),
  };
}

function calculateResourcePenalty(factors: RewardFactors): number {
  const { memory_usage_mb = 0, cpu_usage_percent = 0 } = factors;
  
  let penalty = 0;
  
  if (memory_usage_mb > 500) {
    penalty += (memory_usage_mb - 500) * PENALTIES.MEMORY_PENALTY_RATE / 1000;
  }
  
  if (cpu_usage_percent > 80) {
    penalty += (cpu_usage_percent - 80) * PENALTIES.CPU_PENALTY_RATE / 100;
  }
  
  return Math.min(0.25, penalty);
}

function calculateProtocolPenalty(factors: RewardFactors): number {
  let penalty = 0;
  
  if (factors.mcp_context_usage) {
    const { cache_hit_rate, context_switches } = factors.mcp_context_usage;
    
    if (cache_hit_rate < REWARD_THRESHOLDS.LOW_CACHE_HIT) {
      penalty += PENALTIES.LOW_CACHE_PENALTY;
    }
    
    if (context_switches > 10) {
      penalty += (context_switches - 10) * PENALTIES.CONTEXT_SWITCH_PENALTY;
    }
  }
  
  if (factors.mpp_provider_performance) {
    const { provider_agreement_score } = factors.mpp_provider_performance;
    
    if (provider_agreement_score < REWARD_THRESHOLDS.POOR_PROVIDER_AGREEMENT) {
      penalty += PENALTIES.PROVIDER_DISAGREEMENT_PENALTY;
    }
  }
  
  return Math.min(0.30, penalty);
}

// ============================================================================
// Bonus Calculation
// ============================================================================

function calculateBonuses(
  factors: RewardFactors,
  time_factor: number,
  quality_factor: number
): BonusBreakdown {
  return {
    speed_bonus: time_factor > 1.0 ? time_factor - 1.0 : 0,
    quality_bonus: quality_factor > 1.0 ? quality_factor - 1.0 : 0,
    efficiency_bonus: calculateEfficiencyBonus(factors),
    protocol_bonus: calculateProtocolBonus(factors),
  };
}

function calculateEfficiencyBonus(factors: RewardFactors): number {
  const { memory_usage_mb = 0, api_calls_count = 0 } = factors;
  
  let bonus = 0;
  
  if (memory_usage_mb > 0 && memory_usage_mb < 100) {
    bonus += BONUSES.LOW_RESOURCE_BONUS;
  }
  
  if (api_calls_count < 20 && api_calls_count > 0) {
    bonus += 0.03; // Efficient API usage
  }
  
  return Math.min(0.10, bonus);
}

function calculateProtocolBonus(factors: RewardFactors): number {
  let bonus = 0;
  
  if (factors.mcp_context_usage) {
    const { cache_hit_rate } = factors.mcp_context_usage;
    
    if (cache_hit_rate >= REWARD_THRESHOLDS.HIGH_CACHE_HIT) {
      bonus += BONUSES.HIGH_CACHE_HIT_BONUS;
    }
  }
  
  if (factors.mpp_provider_performance) {
    const { provider_agreement_score } = factors.mpp_provider_performance;
    
    if (provider_agreement_score >= REWARD_THRESHOLDS.EXCELLENT_PROVIDER_AGREEMENT) {
      bonus += BONUSES.HIGH_PROVIDER_AGREEMENT_BONUS;
    }
  }
  
  return Math.min(0.15, bonus);
}

// ============================================================================
// Multiplier Helpers
// ============================================================================

function getDifficultyMultiplier(difficulty: number): number {
  if (difficulty < 0.5) return MULTIPLIERS.EASY;
  if (difficulty < 1.0) return MULTIPLIERS.NORMAL;
  if (difficulty < 1.5) return MULTIPLIERS.HARD;
  return MULTIPLIERS.EXPERT;
}

function getComplexityMultiplier(complexity: number): number {
  if (complexity < 0.7) return MULTIPLIERS.LOW_COMPLEXITY;
  if (complexity < 1.3) return MULTIPLIERS.MEDIUM_COMPLEXITY;
  if (complexity < 2.0) return MULTIPLIERS.HIGH_COMPLEXITY;
  return MULTIPLIERS.VERY_HIGH_COMPLEXITY;
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function calculateQualityScore(result: {
  lint_warnings?: number;
  test_coverage?: number;
  retry_count?: number;
  type_errors?: number;
}): number {
  let score = 1.0;
  
  // Lint warnings
  if (result.lint_warnings && result.lint_warnings > 0) {
    score -= 0.05 * Math.min(result.lint_warnings, 10) / 10;
  }
  
  // Test coverage
  if (result.test_coverage !== undefined) {
    score *= (0.7 + 0.3 * result.test_coverage);
  }
  
  // Retry count
  if (result.retry_count && result.retry_count > 0) {
    score *= Math.exp(-0.1 * result.retry_count);
  }
  
  // Type errors
  if (result.type_errors && result.type_errors > 0) {
    score -= 0.08 * Math.min(result.type_errors, 5) / 5;
  }
  
  return Math.max(0.3, Math.min(1.0, score));
}

export default {
  calculateReward,
  calculateRewardBreakdown,
  calculateQualityScore,
  REWARD_THRESHOLDS,
  PENALTIES,
  BONUSES,
  MULTIPLIERS,
};
