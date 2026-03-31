/**
 * Process Governor Enhanced - Dynamic Threshold Integration
 * ============================================================
 * Extends processGovernor.ts with new MPP threshold detection methods:
 * - Degradation Detection (95% CI)
 * - Cascade Failure Detection (velocity-based 3σ)
 * - Divergence Rate Monitoring (Sharpe-adjusted)
 * - Adaptive Check Frequency
 * - Quantile-Based Thresholds
 */
import { getThresholdManager } from './dynamicThresholdManager';
// Configuration
const DEGRADATION_CHECK_INTERVAL = parseInt(process.env.AF_DEGRADATION_CHECK_INTERVAL || '10', 10); // Every N episodes
const CASCADE_WINDOW_MS = parseInt(process.env.AF_CASCADE_WINDOW_MS || '300000', 10); // 5 minutes
const PERFORMANCE_HISTORY_SIZE = parseInt(process.env.AF_PERFORMANCE_HISTORY_SIZE || '100', 10);
const THRESHOLD_UPDATE_INTERVAL_MS = parseInt(process.env.AF_THRESHOLD_UPDATE_INTERVAL_MS || '300000', 10); // 5 minutes
// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC THRESHOLD REFRESH
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Update dynamic thresholds from threshold manager
 * Should be called periodically or on-demand
 */
export async function refreshDynamicThresholds(state, circle = 'orchestrator', ceremony = 'standup', forceRefresh = false) {
    const now = Date.now();
    // Check if refresh needed
    if (!forceRefresh && state.dynamicThresholds && (now - state.lastThresholdUpdate < THRESHOLD_UPDATE_INTERVAL_MS)) {
        return state.dynamicThresholds;
    }
    try {
        const thresholdManager = getThresholdManager(circle, ceremony);
        const thresholds = await thresholdManager.getThresholds(forceRefresh);
        state.dynamicThresholds = thresholds;
        state.lastThresholdUpdate = now;
        console.log(`[ProcessGovernor] Updated dynamic thresholds - Confidence: ${thresholds.confidence}`);
        return thresholds;
    }
    catch (error) {
        console.warn('[ProcessGovernor] Failed to refresh dynamic thresholds:', error);
        // Return existing or defaults
        return state.dynamicThresholds || getDefaultThresholds();
    }
}
function getDefaultThresholds() {
    return {
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
}
/**
 * Check for performance degradation using 95% CI method
 * Compares recent performance against dynamic threshold
 */
export function checkDegradation(state, recentEpisodeCount = 10) {
    if (!state.dynamicThresholds) {
        return {
            degraded: false,
            currentMean: 0,
            threshold: 0.85,
            degradationScore: 0,
            method: 'NO_THRESHOLDS',
            confidence: 'NO_DATA'
        };
    }
    const threshold = state.dynamicThresholds.degradation.threshold;
    const recentPerf = state.recentPerformance.slice(-recentEpisodeCount);
    if (recentPerf.length < 3) {
        return {
            degraded: false,
            currentMean: 0,
            threshold,
            degradationScore: 0,
            method: 'INSUFFICIENT_DATA',
            confidence: 'NO_DATA'
        };
    }
    // Calculate recent mean reward
    const successfulEpisodes = recentPerf.filter((p) => p.success);
    if (successfulEpisodes.length === 0) {
        return {
            degraded: true,
            currentMean: 0,
            threshold,
            degradationScore: 1.0, // 100% degradation (all failures)
            method: state.dynamicThresholds.degradation.method,
            confidence: state.dynamicThresholds.degradation.confidence
        };
    }
    const currentMean = successfulEpisodes.reduce((sum, p) => sum + p.reward, 0) / successfulEpisodes.length;
    // Calculate degradation score
    const degradationScore = Math.max(0, Math.min(1, (threshold - currentMean) / threshold));
    const degraded = currentMean < threshold;
    return {
        degraded,
        currentMean,
        threshold,
        degradationScore,
        method: state.dynamicThresholds.degradation.method,
        confidence: state.dynamicThresholds.degradation.confidence
    };
}
/**
 * Record episode performance for degradation tracking
 */
export function recordEpisodePerformance(state, reward, success) {
    state.recentPerformance.push({
        timestamp: Date.now(),
        reward,
        success
    });
    // Keep only recent history
    if (state.recentPerformance.length > PERFORMANCE_HISTORY_SIZE) {
        state.recentPerformance.shift();
    }
    // Update degradation metric
    state.metrics.degradation_score = checkDegradation(state).degradationScore;
}
/**
 * Check for cascade failures using velocity-based detection
 */
export function checkCascadeFailure(state, taskId) {
    if (!state.dynamicThresholds) {
        return {
            cascading: false,
            failureCount: 0,
            threshold: 5,
            windowMinutes: 5,
            failureVelocity: 0,
            method: 'NO_THRESHOLDS'
        };
    }
    const threshold = state.dynamicThresholds.cascadeFailure.threshold;
    const windowMinutes = state.dynamicThresholds.cascadeFailure.windowMinutes;
    const windowMs = windowMinutes * 60 * 1000;
    const now = Date.now();
    // Clean up old failures outside the window
    state.cascadeFailureWindow = state.cascadeFailureWindow.filter((f) => (now - f.timestamp) <= windowMs);
    // Count failures in window
    const failureCount = state.cascadeFailureWindow.length;
    const failureVelocity = failureCount / windowMinutes;
    const cascading = failureCount >= threshold;
    return {
        cascading,
        failureCount,
        threshold,
        windowMinutes,
        failureVelocity,
        method: state.dynamicThresholds.cascadeFailure.method
    };
}
/**
 * Record a failure for cascade detection
 */
export function recordFailureForCascade(state, taskId) {
    state.cascadeFailureWindow.push({
        timestamp: Date.now(),
        taskId
    });
    // Update cascade metric
    const cascadeResult = checkCascadeFailure(state);
    state.metrics.cascade_failure_count = cascadeResult.failureCount;
    if (cascadeResult.cascading) {
        logCascadeFailureIncident(state, cascadeResult);
    }
}
function logCascadeFailureIncident(state, result) {
    const incident = {
        timestamp: new Date().toISOString(),
        type: 'CASCADE_FAILURE',
        details: {
            failureCount: result.failureCount,
            threshold: result.threshold,
            windowMinutes: result.windowMinutes,
            failureVelocity: result.failureVelocity,
            method: result.method
        }
    };
    state.incidentBuffer.push(incident);
    state.incidents.push(incident);
    console.warn('[ProcessGovernor] CASCADE FAILURE DETECTED:', result);
}
/**
 * Get divergence rate recommendation based on recent performance
 */
export function getDivergenceRateStatus(state, recentEpisodeCount = 20) {
    if (!state.dynamicThresholds) {
        return {
            currentRate: 0.05,
            recommendedRate: 0.05,
            sharpeRatio: 0,
            successRate: 0,
            shouldIncreaseDivergence: false,
            shouldDecreaseDivergence: false,
            method: 'NO_THRESHOLDS',
            confidence: 'NO_DATA'
        };
    }
    const recommendedRate = state.dynamicThresholds.divergenceRate.rate;
    const sharpeRatio = state.dynamicThresholds.divergenceRate.sharpeRatio;
    const method = state.dynamicThresholds.divergenceRate.method;
    const confidence = state.dynamicThresholds.divergenceRate.confidence;
    // Calculate recent success rate
    const recentPerf = state.recentPerformance.slice(-recentEpisodeCount);
    const successRate = recentPerf.length > 0
        ? recentPerf.filter((p) => p.success).length / recentPerf.length
        : 0;
    const currentRate = state.metrics.divergence_rate_current || 0.05;
    // Determine if divergence should be adjusted
    const shouldIncreaseDivergence = recommendedRate > currentRate * 1.2; // 20% difference
    const shouldDecreaseDivergence = recommendedRate < currentRate * 0.8; // 20% difference
    return {
        currentRate,
        recommendedRate,
        sharpeRatio,
        successRate,
        shouldIncreaseDivergence,
        shouldDecreaseDivergence,
        method,
        confidence
    };
}
/**
 * Update divergence rate based on dynamic threshold recommendation
 */
export function applyDivergenceRate(state) {
    const status = getDivergenceRateStatus(state);
    if (status.confidence !== 'NO_DATA' && status.confidence !== 'LOW_CONFIDENCE') {
        // Gradually adjust toward recommended rate
        const adjustment = (status.recommendedRate - status.currentRate) * 0.3; // 30% step
        state.metrics.divergence_rate_current = Math.max(0.03, Math.min(0.30, status.currentRate + adjustment));
        if (Math.abs(adjustment) > 0.05) {
            logDivergenceIncident(state, status);
        }
    }
    return state.metrics.divergence_rate_current;
}
function logDivergenceIncident(state, status) {
    const incident = {
        timestamp: new Date().toISOString(),
        type: 'DIVERGENCE_HIGH',
        details: {
            currentRate: status.currentRate,
            recommendedRate: status.recommendedRate,
            sharpeRatio: status.sharpeRatio,
            successRate: status.successRate,
            method: status.method,
            confidence: status.confidence
        }
    };
    state.incidentBuffer.push(incident);
    state.incidents.push(incident);
    console.log('[ProcessGovernor] Divergence rate adjusted:', status);
}
// ═══════════════════════════════════════════════════════════════════════════
// ADAPTIVE CHECK FREQUENCY
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Get adaptive check frequency based on dynamic thresholds
 */
export function getAdaptiveCheckFrequency(state) {
    if (!state.dynamicThresholds) {
        return DEGRADATION_CHECK_INTERVAL;
    }
    return state.dynamicThresholds.checkFrequency.checkEveryNEpisodes;
}
/**
 * Determine if a check should be performed based on adaptive frequency
 */
export function shouldPerformCheck(state, episodeCount) {
    const frequency = getAdaptiveCheckFrequency(state);
    return episodeCount % frequency === 0;
}
// ═══════════════════════════════════════════════════════════════════════════
// QUANTILE-BASED THRESHOLD (Fat-Tail Aware)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Get quantile-based threshold for fat-tail aware detection
 */
export function getQuantileThreshold(state) {
    if (!state.dynamicThresholds) {
        return 0.75;
    }
    return state.dynamicThresholds.quantileBased.threshold;
}
/**
 * Check if current performance is below quantile threshold (outlier detection)
 */
export function isPerformanceOutlier(state, reward) {
    const threshold = getQuantileThreshold(state);
    return reward < threshold;
}
/**
 * Comprehensive health check using all dynamic thresholds
 */
export async function performHealthCheck(state, circle = 'orchestrator', ceremony = 'standup') {
    // Refresh thresholds if needed
    await refreshDynamicThresholds(state, circle, ceremony);
    const issues = [];
    const recommendations = [];
    // Check degradation
    const degradation = checkDegradation(state);
    if (degradation.degraded) {
        issues.push(`Performance degradation detected: ${(degradation.degradationScore * 100).toFixed(1)}%`);
        recommendations.push(`Current mean reward (${degradation.currentMean.toFixed(3)}) below threshold (${degradation.threshold.toFixed(3)})`);
    }
    // Check cascade failures
    const cascadeFailure = checkCascadeFailure(state);
    if (cascadeFailure.cascading) {
        issues.push(`Cascade failure detected: ${cascadeFailure.failureCount} failures in ${cascadeFailure.windowMinutes} minutes`);
        recommendations.push(`Failure velocity (${cascadeFailure.failureVelocity.toFixed(2)}/min) exceeds threshold`);
    }
    // Check divergence rate
    const divergenceRate = getDivergenceRateStatus(state);
    if (divergenceRate.shouldIncreaseDivergence) {
        recommendations.push(`Consider increasing divergence rate from ${(divergenceRate.currentRate * 100).toFixed(1)}% to ${(divergenceRate.recommendedRate * 100).toFixed(1)}%`);
    }
    else if (divergenceRate.shouldDecreaseDivergence) {
        recommendations.push(`Consider decreasing divergence rate from ${(divergenceRate.currentRate * 100).toFixed(1)}% to ${(divergenceRate.recommendedRate * 100).toFixed(1)}%`);
    }
    // Check thresholds confidence
    const confidence = state.dynamicThresholds?.confidence || 'NO_DATA';
    if (confidence === 'NO_DATA' || confidence === 'LOW_CONFIDENCE') {
        issues.push(`Threshold confidence is ${confidence} - need more episode data`);
        recommendations.push('Accumulate more episodes to improve threshold calculations');
    }
    const healthy = issues.length === 0;
    return {
        healthy,
        issues,
        degradation,
        cascadeFailure,
        divergenceRate,
        thresholdsConfidence: confidence,
        recommendations
    };
}
// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
export const DynamicThresholdIntegration = {
    refreshDynamicThresholds,
    checkDegradation,
    recordEpisodePerformance,
    checkCascadeFailure,
    recordFailureForCascade,
    getDivergenceRateStatus,
    applyDivergenceRate,
    getAdaptiveCheckFrequency,
    shouldPerformCheck,
    getQuantileThreshold,
    isPerformanceOutlier,
    performHealthCheck
};
//# sourceMappingURL=processGovernor%20Enhanced.js.map