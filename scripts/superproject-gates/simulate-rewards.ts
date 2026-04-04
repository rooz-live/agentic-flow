#!/usr/bin/env tsx
/**
 * @fileoverview Simulate reward distribution with variance
 * Demonstrates how the reward calculator creates diverse rewards
 */

import { calculateReward, calculateRewardBreakdown, type RewardFactors } from '../src/core/reward-calculator';

interface SimulationStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  stddev: number;
  cv: number;
  unique_values: number;
  distribution: Map<string, number>;
}

// Generate realistic scenario variations
function generateScenario(index: number): RewardFactors {
  // Base variations
  const speedVariation = 0.5 + Math.random() * 2.0; // 0.5x to 2.5x expected time
  const qualityVariation = 0.7 + Math.random() * 0.3; // 70% to 100% quality
  const successRate = Math.random() > 0.05; // 95% success rate
  
  // Difficulty variations
  const difficulties = [0.5, 0.8, 1.0, 1.2, 1.5];
  const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
  
  // Complexity variations
  const complexities = [0.7, 1.0, 1.3, 1.8, 2.5];
  const complexity_score = complexities[Math.floor(Math.random() * complexities.length)];
  
  return {
    success: successRate,
    duration_ms: Math.floor(10000 * speedVariation),
    expected_duration_ms: 10000,
    quality_score: qualityVariation,
    test_coverage: 0.6 + Math.random() * 0.4, // 60% to 100%
    lint_warnings: Math.floor(Math.random() * 8), // 0 to 7 warnings
    error_count: successRate ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 10),
    difficulty,
    complexity_score,
    lines_changed: Math.floor(20 + Math.random() * 300), // 20 to 320 lines
    memory_usage_mb: Math.floor(50 + Math.random() * 600), // 50 to 650 MB
    cpu_usage_percent: Math.floor(20 + Math.random() * 80), // 20% to 100%
    api_calls_count: Math.floor(Math.random() * 150), // 0 to 150 calls
    
    // MCP metrics (30% of scenarios)
    mcp_context_usage: Math.random() > 0.7 ? {
      tools_used: Math.floor(1 + Math.random() * 8),
      resources_accessed: Math.floor(5 + Math.random() * 20),
      context_switches: Math.floor(Math.random() * 15),
      cache_hit_rate: 0.3 + Math.random() * 0.7, // 30% to 100%
      protocol_version: "2024-11",
    } : undefined,
    
    // MPP metrics (20% of scenarios)
    mpp_provider_performance: Math.random() > 0.8 ? {
      provider_count: Math.floor(1 + Math.random() * 3),
      primary_provider_latency_ms: Math.floor(500 + Math.random() * 5000),
      fallback_triggered: Math.random() > 0.85,
      load_balance_efficiency: 0.7 + Math.random() * 0.3,
      provider_agreement_score: 0.6 + Math.random() * 0.4,
    } : undefined,
    
    // Pattern metrics
    pattern_match_confidence: 0.8 + Math.random() * 0.2,
    method_efficiency: 0.7 + Math.random() * 0.3,
    protocol_compliance: 0.85 + Math.random() * 0.15,
  };
}

function calculateStats(rewards: number[]): SimulationStats {
  const count = rewards.length;
  const min = Math.min(...rewards);
  const max = Math.max(...rewards);
  const mean = rewards.reduce((a, b) => a + b, 0) / count;
  
  const variance = rewards.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / count;
  const stddev = Math.sqrt(variance);
  const cv = stddev / mean;
  
  // Count unique values (rounded to 2 decimals)
  const uniqueSet = new Set(rewards.map(r => r.toFixed(2)));
  const unique_values = uniqueSet.size;
  
  // Build distribution
  const distribution = new Map<string, number>();
  rewards.forEach(r => {
    const bucket = r.toFixed(2);
    distribution.set(bucket, (distribution.get(bucket) || 0) + 1);
  });
  
  return {
    count,
    min,
    max,
    mean,
    stddev,
    cv,
    unique_values,
    distribution,
  };
}

function printDistribution(stats: SimulationStats) {
  // Get top 10 most common rewards
  const sorted = Array.from(stats.distribution.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log('\n📊 Reward Value Frequency (Top 10):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  sorted.forEach(([reward, count]) => {
    const percentage = ((count / stats.count) * 100).toFixed(1);
    const bar = '█'.repeat(Math.min(50, Math.floor(count / stats.count * 50)));
    console.log(`${reward}: ${count.toString().padStart(4)} (${percentage.padStart(5)}%) ${bar}`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const episodeCount = parseInt(args[0] || '100', 10);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎲 Reward Distribution Simulation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\nSimulating ${episodeCount} episodes...\n`);
  
  const rewards: number[] = [];
  const breakdowns: any[] = [];
  
  // Progress indicator
  const progressInterval = Math.max(1, Math.floor(episodeCount / 20));
  
  for (let i = 0; i < episodeCount; i++) {
    if (i % progressInterval === 0) {
      process.stdout.write(`\rProgress: ${Math.floor((i / episodeCount) * 100)}%`);
    }
    
    const scenario = generateScenario(i);
    const reward = await calculateReward(scenario);
    rewards.push(reward);
    
    // Sample detailed breakdowns (first 5)
    if (i < 5) {
      const breakdown = await calculateRewardBreakdown(scenario);
      breakdowns.push({ scenario, breakdown });
    }
  }
  
  process.stdout.write(`\rProgress: 100%\n\n`);
  
  // Calculate statistics
  const stats = calculateStats(rewards);
  
  // Print results
  console.log('📈 Distribution Statistics:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Episodes:    ${stats.count}`);
  console.log(`Range:             [${stats.min.toFixed(3)} - ${stats.max.toFixed(3)}]`);
  console.log(`Mean:              ${stats.mean.toFixed(4)}`);
  console.log(`Std Deviation:     ${stats.stddev.toFixed(4)}`);
  console.log(`Coeff. Variation:  ${stats.cv.toFixed(4)} ${stats.cv >= 0.05 && stats.cv <= 0.15 ? '✅' : '⚠️'}`);
  console.log(`Unique Values:     ${stats.unique_values} (${((stats.unique_values / stats.count) * 100).toFixed(1)}%)`);
  
  // Percentiles
  const sorted = [...rewards].sort((a, b) => a - b);
  const p05 = sorted[Math.floor(stats.count * 0.05)];
  const p25 = sorted[Math.floor(stats.count * 0.25)];
  const p50 = sorted[Math.floor(stats.count * 0.50)];
  const p75 = sorted[Math.floor(stats.count * 0.75)];
  const p95 = sorted[Math.floor(stats.count * 0.95)];
  
  console.log('\n📐 Percentiles:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`P05:  ${p05.toFixed(3)}  ← Slowest/lowest quality`);
  console.log(`P25:  ${p25.toFixed(3)}  ← Below average`);
  console.log(`P50:  ${p50.toFixed(3)}  ← Median`);
  console.log(`P75:  ${p75.toFixed(3)}  ← Above average`);
  console.log(`P95:  ${p95.toFixed(3)}  ← Exceptional`);
  
  // Distribution
  printDistribution(stats);
  
  // Validation
  console.log('\n✅ Validation:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const cvOk = stats.cv >= 0.05 && stats.cv <= 0.15;
  const diversityOk = stats.unique_values >= episodeCount * 0.05;
  const rangeOk = (stats.max - stats.min) > 0.1;
  
  console.log(`${cvOk ? '✅' : '❌'} Coefficient of Variation (0.05-0.15): ${stats.cv.toFixed(4)}`);
  console.log(`${diversityOk ? '✅' : '❌'} Unique values (>5%): ${stats.unique_values}/${stats.count}`);
  console.log(`${rangeOk ? '✅' : '❌'} Reward range (>0.1): ${(stats.max - stats.min).toFixed(3)}`);
  
  if (cvOk && diversityOk && rangeOk) {
    console.log('\n🎉 HEALTHY DISTRIBUTION - Reward system working as expected!');
  } else {
    console.log('\n⚠️  REVIEW NEEDED - Consider tuning thresholds/penalties');
  }
  
  // Sample breakdowns
  console.log('\n📋 Sample Reward Breakdowns (First 3):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  breakdowns.slice(0, 3).forEach((item, idx) => {
    const { breakdown, scenario } = item;
    console.log(`\n#${idx + 1}: Final Reward = ${breakdown.final_reward.toFixed(4)}`);
    console.log(`  Success: ${scenario.success}, Duration: ${scenario.duration_ms}ms (expected: ${scenario.expected_duration_ms}ms)`);
    console.log(`  Quality: ${scenario.quality_score?.toFixed(2)}, Difficulty: ${scenario.difficulty?.toFixed(1)}`);
    console.log(`  Time Factor:       ${breakdown.time_factor.toFixed(3)}`);
    console.log(`  Quality Factor:    ${breakdown.quality_factor.toFixed(3)}`);
    console.log(`  Complexity Factor: ${breakdown.complexity_factor.toFixed(3)}`);
    console.log(`  Resource Factor:   ${breakdown.resource_factor.toFixed(3)}`);
    if (scenario.mcp_context_usage) {
      console.log(`  MCP Factor:        ${breakdown.mcp_factor.toFixed(3)} (cache: ${(scenario.mcp_context_usage.cache_hit_rate * 100).toFixed(0)}%)`);
    }
    if (scenario.mpp_provider_performance) {
      console.log(`  MPP Factor:        ${breakdown.mpp_factor.toFixed(3)} (agreement: ${(scenario.mpp_provider_performance.provider_agreement_score * 100).toFixed(0)}%)`);
    }
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
