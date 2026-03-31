/**
 * Dynamic Threshold Manager - MPP Method Pattern Protocol Integration
 * =====================================================================
 * Integrates statistical threshold calculations from ay-dynamic-thresholds.sh
 * with TypeScript runtime monitoring and control.
 *
 * Implements 6 dynamic threshold patterns:
 * 1. Circuit Breaker (2.5σ method) ✅ INTEGRATED
 * 2. Degradation Detection (95% CI) ⚠️ NEW
 * 3. Cascade Failure (velocity-based 3σ) ⚠️ NEW
 * 4. Divergence Rate (Sharpe-adjusted) ❌ NEW
 * 5. Check Frequency (adaptive volatility) ⚠️ NEW
 * 6. Quantile-Based Thresholds (fat-tail aware) ❌ NEW
 */
import { spawn } from 'child_process';
import path from 'path';
import { queryOne } from '../db/connection';
// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
const THRESHOLD_SCRIPT_PATH = process.env.AF_THRESHOLD_SCRIPT_PATH
    || path.join(process.cwd(), 'scripts', 'ay-dynamic-thresholds.sh');
const AGENTDB_PATH = process.env.AGENTDB_PATH
    || path.join(process.cwd(), 'agentdb.db');
// ═══════════════════════════════════════════════════════════════════════════
// THRESHOLD CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class DynamicThresholdManager {
    cachedThresholds = null;
    lastFetch = 0;
    fetchInterval = 300000; // 5 minutes default
    circle;
    ceremony;
    constructor(circle = 'orchestrator', ceremony = 'standup') {
        this.circle = circle;
        this.ceremony = ceremony;
    }
    /**
     * Get all dynamic thresholds (cached with TTL)
     */
    async getThresholds(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.cachedThresholds && (now - this.lastFetch < this.fetchInterval)) {
            return this.cachedThresholds;
        }
        // Fetch fresh thresholds from bash script
        const thresholds = await this.fetchAllThresholds();
        this.cachedThresholds = thresholds;
        this.lastFetch = now;
        // Adjust fetch interval based on data confidence
        this.adjustFetchInterval(thresholds.confidence);
        return thresholds;
    }
    /**
     * Fetch all thresholds by executing bash script
     */
    async fetchAllThresholds() {
        return new Promise((resolve, reject) => {
            const child = spawn('bash', [
                THRESHOLD_SCRIPT_PATH,
                'all',
                this.circle,
                this.ceremony
            ], {
                env: { ...process.env, AGENTDB_PATH }
            });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            child.on('close', (code) => {
                if (code !== 0) {
                    return reject(new Error(`Threshold script failed: ${stderr}`));
                }
                try {
                    const parsed = this.parseScriptOutput(stdout);
                    resolve(parsed);
                }
                catch (err) {
                    reject(err);
                }
            });
            child.on('error', (err) => {
                reject(new Error(`Failed to execute threshold script: ${err.message}`));
            });
        });
    }
    /**
     * Parse bash script output into structured thresholds
     */
    parseScriptOutput(output) {
        const lines = output.split('\n');
        const thresholds = {
            circuitBreaker: {
                threshold: 0.7,
                confidence: 'NO_DATA',
                sampleSize: 0,
                meanReward: 0,
                stdDevReward: 0,
                method: 'DEFAULT'
            },
            degradation: {
                threshold: 0.85,
                variationCoefficient: 0,
                confidence: 'NO_DATA',
                sampleSize: 0,
                method: 'FALLBACK'
            },
            cascadeFailure: {
                threshold: 5,
                windowMinutes: 5,
                method: 'FALLBACK'
            },
            divergenceRate: {
                rate: 0.05,
                sharpeRatio: 0,
                confidence: 'NO_DATA',
                successRate: 0,
                method: 'FALLBACK'
            },
            checkFrequency: {
                checkEveryNEpisodes: 20,
                method: 'FALLBACK'
            },
            quantileBased: {
                threshold: 0.75,
                method: 'FALLBACK',
                quantile: 0.05
            },
            lastUpdate: Date.now(),
            confidence: 'NO_DATA'
        };
        // Parse each section
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Circuit Breaker
            if (line.includes('Circuit Breaker Threshold')) {
                thresholds.circuitBreaker = this.parseCircuitBreaker(lines, i);
            }
            // Degradation
            else if (line.includes('Degradation Threshold')) {
                thresholds.degradation = this.parseDegradation(lines, i);
            }
            // Cascade Failure
            else if (line.includes('Cascade Failure')) {
                thresholds.cascadeFailure = this.parseCascadeFailure(lines, i);
            }
            // Divergence Rate
            else if (line.includes('Divergence Rate')) {
                thresholds.divergenceRate = this.parseDivergenceRate(lines, i);
            }
            // Check Frequency
            else if (line.includes('Check Frequency')) {
                thresholds.checkFrequency = this.parseCheckFrequency(lines, i);
            }
            // Quantile-Based
            else if (line.includes('Quantile-Based')) {
                thresholds.quantileBased = this.parseQuantileBased(lines, i);
            }
        }
        // Determine overall confidence
        thresholds.confidence = this.determineOverallConfidence(thresholds);
        return thresholds;
    }
    parseCircuitBreaker(lines, startIdx) {
        const result = {
            threshold: 0.7,
            confidence: 'NO_DATA',
            sampleSize: 0,
            meanReward: 0,
            stdDevReward: 0,
            method: 'DEFAULT'
        };
        for (let i = startIdx + 1; i < Math.min(startIdx + 5, lines.length); i++) {
            const line = lines[i].trim();
            if (line.includes('Threshold:')) {
                result.threshold = parseFloat(line.split(':')[1]?.trim() || '0.7');
            }
            if (line.includes('Confidence:')) {
                result.confidence = line.split(':')[1]?.trim() || 'NO_DATA';
            }
            if (line.includes('Sample:')) {
                result.sampleSize = parseInt(line.split(':')[1]?.split('episodes')[0]?.trim() || '0');
            }
        }
        return result;
    }
    parseDegradation(lines, startIdx) {
        const result = {
            threshold: 0.85,
            variationCoefficient: 0,
            confidence: 'NO_DATA',
            sampleSize: 0,
            method: 'FALLBACK'
        };
        for (let i = startIdx + 1; i < Math.min(startIdx + 5, lines.length); i++) {
            const line = lines[i].trim();
            if (line.includes('Threshold:')) {
                result.threshold = parseFloat(line.split(':')[1]?.trim() || '0.85');
            }
            if (line.includes('Variation Coef:')) {
                result.variationCoefficient = parseFloat(line.split(':')[1]?.trim() || '0');
            }
            if (line.includes('Confidence:')) {
                result.confidence = line.split(':')[1]?.trim() || 'NO_DATA';
            }
        }
        return result;
    }
    parseCascadeFailure(lines, startIdx) {
        const result = {
            threshold: 5,
            windowMinutes: 5,
            method: 'FALLBACK'
        };
        for (let i = startIdx + 1; i < Math.min(startIdx + 5, lines.length); i++) {
            const line = lines[i].trim();
            if (line.includes('Threshold:')) {
                result.threshold = parseInt(line.split(':')[1]?.split('failures')[0]?.trim() || '5');
            }
            if (line.includes('Window:')) {
                result.windowMinutes = parseInt(line.split(':')[1]?.split('minutes')[0]?.trim() || '5');
            }
            if (line.includes('Method:')) {
                const method = line.split(':')[1]?.trim() || 'FALLBACK';
                result.method = method;
            }
        }
        return result;
    }
    parseDivergenceRate(lines, startIdx) {
        const result = {
            rate: 0.05,
            sharpeRatio: 0,
            confidence: 'NO_DATA',
            successRate: 0,
            method: 'FALLBACK'
        };
        for (let i = startIdx + 1; i < Math.min(startIdx + 5, lines.length); i++) {
            const line = lines[i].trim();
            if (line.includes('Rate:')) {
                result.rate = parseFloat(line.split(':')[1]?.trim() || '0.05');
            }
            if (line.includes('Sharpe:')) {
                result.sharpeRatio = parseFloat(line.split(':')[1]?.trim() || '0');
            }
            if (line.includes('Confidence:')) {
                result.confidence = line.split(':')[1]?.trim() || 'NO_DATA';
            }
        }
        return result;
    }
    parseCheckFrequency(lines, startIdx) {
        const result = {
            checkEveryNEpisodes: 20,
            method: 'FALLBACK'
        };
        for (let i = startIdx + 1; i < Math.min(startIdx + 4, lines.length); i++) {
            const line = lines[i].trim();
            if (line.includes('Check every:')) {
                result.checkEveryNEpisodes = parseInt(line.split(':')[1]?.split('episodes')[0]?.trim() || '20');
            }
            if (line.includes('Method:')) {
                const method = line.split(':')[1]?.trim() || 'FALLBACK';
                result.method = method;
            }
        }
        return result;
    }
    parseQuantileBased(lines, startIdx) {
        const result = {
            threshold: 0.75,
            method: 'FALLBACK',
            quantile: 0.05
        };
        for (let i = startIdx + 1; i < Math.min(startIdx + 4, lines.length); i++) {
            const line = lines[i].trim();
            if (line.includes('5th Percentile:') || line.includes('Percentile:')) {
                result.threshold = parseFloat(line.split(':')[1]?.trim() || '0.75');
            }
            if (line.includes('Method:')) {
                const method = line.split(':')[1]?.trim() || 'FALLBACK';
                result.method = method;
            }
        }
        return result;
    }
    determineOverallConfidence(thresholds) {
        const confidenceLevels = [
            thresholds.circuitBreaker.confidence,
            thresholds.degradation.confidence,
            thresholds.divergenceRate.confidence
        ];
        if (confidenceLevels.some(c => c === 'HIGH_CONFIDENCE'))
            return 'HIGH_CONFIDENCE';
        if (confidenceLevels.some(c => c === 'MEDIUM_CONFIDENCE'))
            return 'MEDIUM_CONFIDENCE';
        if (confidenceLevels.some(c => c === 'LOW_CONFIDENCE'))
            return 'LOW_CONFIDENCE';
        return 'NO_DATA';
    }
    adjustFetchInterval(confidence) {
        switch (confidence) {
            case 'HIGH_CONFIDENCE':
                this.fetchInterval = 600000; // 10 minutes
                break;
            case 'MEDIUM_CONFIDENCE':
                this.fetchInterval = 300000; // 5 minutes
                break;
            case 'LOW_CONFIDENCE':
                this.fetchInterval = 120000; // 2 minutes
                break;
            case 'NO_DATA':
                this.fetchInterval = 60000; // 1 minute (check frequently for new data)
                break;
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT DATABASE QUERIES (Fallback when script unavailable)
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Calculate circuit breaker threshold directly from database
     */
    async calculateCircuitBreakerDirect(lookbackDays = 30) {
        try {
            const result = await queryOne(`
        WITH recent_stats AS (
          SELECT 
            AVG(reward) as mean_reward,
            AVG(reward * reward) - (AVG(reward) * AVG(reward)) as variance,
            COUNT(*) as sample_size,
            MIN(reward) as min_reward
          FROM episodes 
          WHERE task LIKE '%${this.circle}%'
            AND success = 1
            AND created_at > strftime('%s', 'now', '-${lookbackDays} days')
        ),
        computed AS (
          SELECT 
            mean_reward,
            SQRT(variance) as stddev_reward,
            sample_size,
            min_reward,
            CASE 
              WHEN sample_size >= 30 THEN mean_reward - (2.5 * SQRT(variance))
              WHEN sample_size >= 10 THEN mean_reward - (3.0 * SQRT(variance))
              WHEN sample_size >= 5 THEN mean_reward * 0.85
              ELSE 0.5
            END as threshold
          FROM recent_stats
        )
        SELECT 
          MAX(0.3, MIN(threshold, min_reward * 0.95)) as threshold,
          sample_size,
          mean_reward,
          stddev_reward,
          CASE
            WHEN sample_size >= 30 THEN 'HIGH_CONFIDENCE'
            WHEN sample_size >= 10 THEN 'MEDIUM_CONFIDENCE'
            WHEN sample_size >= 5 THEN 'LOW_CONFIDENCE'
            ELSE 'NO_DATA'
          END as confidence
        FROM computed
      `);
            return {
                threshold: result?.threshold || 0.7,
                confidence: result?.confidence || 'NO_DATA',
                sampleSize: result?.sample_size || 0,
                meanReward: result?.mean_reward || 0,
                stdDevReward: result?.stddev_reward || 0,
                method: result?.sample_size >= 30 ? '2.5σ' :
                    result?.sample_size >= 10 ? '3.0σ' :
                        result?.sample_size >= 5 ? '85%_FALLBACK' : 'DEFAULT'
            };
        }
        catch (error) {
            console.warn('[DynamicThresholds] Circuit breaker calculation failed:', error);
            return {
                threshold: 0.7,
                confidence: 'NO_DATA',
                sampleSize: 0,
                meanReward: 0,
                stdDevReward: 0,
                method: 'DEFAULT'
            };
        }
    }
    /**
     * Calculate degradation threshold directly from database
     */
    async calculateDegradationDirect() {
        try {
            const result = await queryOne(`
        WITH baseline_stats AS (
          SELECT 
            AVG(reward) as mean_reward,
            AVG(reward * reward) - (AVG(reward) * AVG(reward)) as variance,
            COUNT(*) as n,
            SQRT(AVG(reward * reward) - (AVG(reward) * AVG(reward))) / 
              NULLIF(AVG(reward), 0) as coeff_variation
          FROM episodes 
          WHERE task LIKE '%${this.circle}%' AND task LIKE '%${this.ceremony}%'
            AND success = 1
            AND created_at > strftime('%s', 'now', '-30 days')
        ),
        threshold_calc AS (
          SELECT 
            mean_reward,
            SQRT(variance) as stddev_reward,
            n,
            coeff_variation,
            CASE
              WHEN n >= 30 THEN mean_reward - (1.96 * SQRT(variance) / SQRT(n))
              WHEN n >= 10 THEN mean_reward - (2.576 * SQRT(variance) / SQRT(n))
              WHEN n >= 5 THEN mean_reward * 0.85
              ELSE 0.70
            END as threshold,
            CASE
              WHEN n >= 30 THEN 'HIGH_CONFIDENCE'
              WHEN n >= 10 THEN 'MEDIUM_CONFIDENCE'
              WHEN n >= 5 THEN 'LOW_CONFIDENCE'
              ELSE 'NO_DATA'
            END as confidence
          FROM baseline_stats
        )
        SELECT 
          MAX(0.5, threshold) as threshold,
          ROUND(coeff_variation, 3) as variation_coefficient,
          confidence,
          n as sample_size,
          mean_reward as baseline_reward
        FROM threshold_calc
      `);
            return {
                threshold: result?.threshold || 0.85,
                variationCoefficient: result?.variation_coefficient || 0,
                confidence: result?.confidence || 'NO_DATA',
                sampleSize: result?.sample_size || 0,
                method: result?.sample_size >= 30 ? '95%_CI' :
                    result?.sample_size >= 10 ? '99%_CI' :
                        result?.sample_size >= 5 ? '15%_DROP' : 'FALLBACK',
                baselineReward: result?.baseline_reward
            };
        }
        catch (error) {
            console.warn('[DynamicThresholds] Degradation calculation failed:', error);
            return {
                threshold: 0.85,
                variationCoefficient: 0,
                confidence: 'NO_DATA',
                sampleSize: 0,
                method: 'FALLBACK'
            };
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════
let globalThresholdManager = null;
export function getThresholdManager(circle = 'orchestrator', ceremony = 'standup') {
    if (!globalThresholdManager) {
        globalThresholdManager = new DynamicThresholdManager(circle, ceremony);
    }
    return globalThresholdManager;
}
export function resetThresholdManager() {
    globalThresholdManager = null;
}
//# sourceMappingURL=dynamicThresholdManager.js.map