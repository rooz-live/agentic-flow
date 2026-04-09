/**
 * @fileoverview Dynamic threshold calculation based on actual data distributions
 * Replaces hardcoded thresholds with statistically-derived values
 */

import { execSync } from 'child_process';
import * as path from 'path';

export interface ThresholdConfig {
  dbPath?: string;
  lookbackDays?: number;
  percentile?: number;
}

export interface DistributionStats {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  count: number;
  p05: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  coefficientOfVariation: number;
  isDegenerate: boolean;
}

/**
 * Calculate percentile from reward distribution
 * Uses SQLite ORDER BY + LIMIT approach since SQLite lacks PERCENTILE_CONT
 */
export async function calculatePercentile(
  percentile: number,
  config: ThresholdConfig = {}
): Promise<number> {
  const { dbPath = './agentdb.db', lookbackDays = 30 } = config;
  const scriptPath = path.join(__dirname, '../../scripts/calculate-thresholds.sh');
  
  try {
    // Call bash script for percentile calculation
    const result = execSync(
      `"${scriptPath}" circuit-breaker "${dbPath}"`,
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    
    const threshold = parseFloat(result);
    
    // Validation
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      console.warn(`Invalid threshold calculated: ${threshold}, using fallback`);
      return 0.85; // Conservative fallback
    }
    
    return threshold;
  } catch (error) {
    console.error('Failed to calculate dynamic threshold:', error);
    return 0.85; // Conservative fallback
  }
}

/**
 * Get full distribution statistics
 */
export async function getDistributionStats(
  config: ThresholdConfig = {}
): Promise<DistributionStats> {
  const { dbPath = './agentdb.db', lookbackDays = 30 } = config;
  
  try {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    
    // Calculate stats manually (SQLite lacks STDEV function)
    const stats = db.prepare(`
      WITH data AS (
        SELECT 
          reward,
          COUNT(*) OVER () as n,
          AVG(reward) OVER () as mean
        FROM episodes
        WHERE success = 1
          AND created_at > (unixepoch('now') - (? * 86400))
      ),
      variance_calc AS (
        SELECT 
          mean,
          SQRT(AVG((reward - mean) * (reward - mean))) as stddev,
          MIN(reward) as min_r,
          MAX(reward) as max_r,
          n
        FROM data
      )
      SELECT * FROM variance_calc LIMIT 1;
    `).get(lookbackDays) as any;
    
    // Calculate percentiles
    const percentiles = db.prepare(`
      WITH ordered AS (
        SELECT 
          reward,
          ROW_NUMBER() OVER (ORDER BY reward) as rn,
          COUNT(*) OVER () as total
        FROM episodes
        WHERE success = 1
          AND created_at > (unixepoch('now') - (? * 86400))
      )
      SELECT 
        MAX(CASE WHEN rn <= total * 0.05 THEN reward END) as p05,
        MAX(CASE WHEN rn <= total * 0.25 THEN reward END) as p25,
        MAX(CASE WHEN rn <= total * 0.50 THEN reward END) as p50,
        MAX(CASE WHEN rn <= total * 0.75 THEN reward END) as p75,
        MAX(CASE WHEN rn <= total * 0.95 THEN reward END) as p95
      FROM ordered;
    `).get(lookbackDays) as any;
    
    db.close();
    
    const cv = stats.stddev / stats.mean;
    const isDegenerate = cv < 0.05; // Less than 5% variation = degenerate
    
    return {
      mean: stats.mean,
      stddev: stats.stddev,
      min: stats.min_r,
      max: stats.max_r,
      count: stats.n,
      p05: percentiles.p05,
      p25: percentiles.p25,
      p50: percentiles.p50,
      p75: percentiles.p75,
      p95: percentiles.p95,
      coefficientOfVariation: cv,
      isDegenerate
    };
  } catch (error) {
    console.error('Failed to get distribution stats:', error);
    
    // Return safe defaults
    return {
      mean: 0.9,
      stddev: 0.1,
      min: 0.8,
      max: 1.0,
      count: 0,
      p05: 0.85,
      p25: 0.9,
      p50: 0.95,
      p75: 0.98,
      p95: 1.0,
      coefficientOfVariation: 0.11,
      isDegenerate: false
    };
  }
}

/**
 * Calculate adaptive success threshold based on distribution
 * 
 * Strategy:
 * - For degenerate distributions (CV < 0.05): Use 5th percentile
 * - For normal distributions: Use mean - 2.5*sigma
 * - Always ensure threshold doesn't block majority of data
 * 
 * ⚠️ WARNING: If distribution is degenerate (rewards always ~1.0),
 * this indicates a system issue where rewards aren't varying!
 */
export async function calculateSuccessThreshold(
  circle?: string,
  config: ThresholdConfig = {}
): Promise<number> {
  const stats = await getDistributionStats(config);
  
  console.log(`[DynamicThreshold] Distribution analysis${circle ? ` for ${circle}` : ''}:`, {
    mean: stats.mean.toFixed(4),
    stddev: stats.stddev.toFixed(4),
    cv: stats.coefficientOfVariation.toFixed(4),
    isDegenerate: stats.isDegenerate,
    p05: stats.p05.toFixed(4),
    count: stats.count
  });
  
  if (stats.isDegenerate) {
    // For nearly-constant distributions, use 5th percentile
    console.warn(`[DynamicThreshold] ⚠️ DEGENERATE distribution detected! CV=${stats.coefficientOfVariation.toFixed(4)}`);
    console.warn(`[DynamicThreshold] This suggests rewards are not varying properly. Check reward calculation!`);
    console.log(`[DynamicThreshold] Using P05: ${stats.p05}`);
    return stats.p05;
  }
  
  // For normal-ish distributions, use statistical approach
  const sigmaThreshold = stats.count >= 30 ? 2.5 : 3.0;
  const statisticalThreshold = stats.mean - (sigmaThreshold * stats.stddev);
  
  // Ensure threshold doesn't go below P05 (too aggressive)
  const threshold = Math.max(statisticalThreshold, stats.p05);
  
  console.log(`[DynamicThreshold] Calculated threshold: ${threshold.toFixed(4)} (${sigmaThreshold}σ below mean)`);
  
  return threshold;
}

/**
 * Calculate minimum episodes needed for reliable learning
 * Adapts based on distribution variance
 */
export async function calculateMinEpisodes(
  config: ThresholdConfig = {}
): Promise<number> {
  const stats = await getDistributionStats(config);
  
  // Higher variance = need more episodes for statistical significance
  if (stats.coefficientOfVariation > 0.3) {
    return 10; // High variance
  } else if (stats.coefficientOfVariation > 0.15) {
    return 7;  // Medium variance
  } else {
    return 5;  // Low variance (current default)
  }
}

export default {
  calculatePercentile,
  getDistributionStats,
  calculateSuccessThreshold,
  calculateMinEpisodes
};
