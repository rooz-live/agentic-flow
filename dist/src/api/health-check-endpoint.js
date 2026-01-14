/**
 * Health Check API Endpoint - Dynamic Threshold Monitoring
 * ==========================================================
 * Provides REST endpoints for monitoring all 6 MPP threshold patterns
 *
 * Endpoints:
 *   GET /api/health - Comprehensive health check
 *   GET /api/health/thresholds - Current dynamic thresholds
 *   GET /api/health/degradation - Degradation status
 *   GET /api/health/cascade - Cascade failure status
 *   GET /api/health/divergence - Divergence rate status
 */
import { Router } from 'express';
import { performHealthCheck, refreshDynamicThresholds, checkDegradation, checkCascadeFailure, getDivergenceRateStatus, getAdaptiveCheckFrequency, getQuantileThreshold } from '../runtime/processGovernorEnhanced';
import { getCircuitBreakerState } from '../runtime/processGovernor';
const router = Router();
// In-memory state (in production, this would be shared with process governor)
let governorState = null;
/**
 * Calculate adaptive check frequency based on system stress and anomalies
 */
function calculateAdaptiveCheckFrequency(state) {
    const baseFrequency = 5; // Check every 5 episodes by default
    const minFrequency = 1; // Check every episode under extreme stress
    const maxFrequency = 20; // Check every 20 episodes when stable
    // Calculate stress factors
    const degradationScore = state.metrics.degradation_score || 0;
    const cascadeCount = state.metrics.cascade_failure_count || 0;
    const failureRate = state.failedWork / Math.max(1, state.completedWork + state.failedWork);
    // Calculate anomaly rate (0-1, where 1 = highly anomalous)
    const anomalyRate = Math.min(1, degradationScore * 0.4 +
        (cascadeCount > 0 ? 0.3 : 0) +
        failureRate * 0.3);
    // Stress-responsive frequency: higher anomaly rate = more frequent checks
    const stressMultiplier = 1 - anomalyRate; // 0 (high stress) to 1 (low stress)
    const adaptiveFrequency = Math.round(minFrequency + (maxFrequency - minFrequency) * stressMultiplier);
    return Math.max(minFrequency, Math.min(maxFrequency, adaptiveFrequency));
}
/**
 * Initialize governor state if not exists
 */
function ensureState() {
    if (!governorState) {
        governorState = {
            activeWork: 0,
            queuedWork: 0,
            completedWork: 0,
            failedWork: 0,
            circuitBreaker: {
                state: 'CLOSED',
                failures: 0,
                successes: 0,
                lastFailureTime: 0,
                lastStateChange: Date.now(),
                halfOpenRequests: 0,
                windowStart: Date.now()
            },
            dynamicThresholds: null,
            lastThresholdUpdate: 0,
            recentPerformance: [],
            cascadeFailureWindow: [],
            metrics: {
                degradation_score: 0,
                cascade_failure_count: 0,
                divergence_rate_current: 0.05
            },
            lastHealthCheck: 0,
            episodeCount: 0,
            healthCheckHistory: []
        };
    }
    return governorState;
}
/**
 * GET /api/health
 * Comprehensive health check across all threshold patterns
 */
router.get('/health', async (req, res) => {
    try {
        const state = ensureState();
        const circle = req.query.circle || 'orchestrator';
        const ceremony = req.query.ceremony || 'standup';
        // Calculate adaptive frequency
        const adaptiveFrequency = calculateAdaptiveCheckFrequency(state);
        state.lastHealthCheck = Date.now();
        state.episodeCount++;
        const health = await performHealthCheck(state, circle, ceremony);
        // Store health check history
        state.healthCheckHistory.push({
            timestamp: Date.now(),
            healthy: health.healthy,
            issueCount: health.issues.length,
            adaptiveFrequency
        });
        if (state.healthCheckHistory.length > 100) {
            state.healthCheckHistory = state.healthCheckHistory.slice(-100);
        }
        res.json({
            status: health.healthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            circle,
            ceremony,
            healthy: health.healthy,
            issues: health.issues,
            recommendations: health.recommendations,
            thresholdsConfidence: health.thresholdsConfidence,
            adaptive: {
                checkFrequency: adaptiveFrequency,
                episodeCount: state.episodeCount,
                anomalyRate: 1 - (adaptiveFrequency - 1) / 19, // Reverse calculate for display
                stressLevel: adaptiveFrequency <= 3 ? 'high' : adaptiveFrequency <= 7 ? 'medium' : 'low'
            },
            checks: {
                circuitBreaker: {
                    state: getCircuitBreakerState().state,
                    failures: getCircuitBreakerState().failures
                },
                degradation: {
                    degraded: health.degradation.degraded,
                    score: health.degradation.degradationScore,
                    currentMean: health.degradation.currentMean,
                    threshold: health.degradation.threshold,
                    method: health.degradation.method
                },
                cascadeFailure: {
                    cascading: health.cascadeFailure.cascading,
                    failureCount: health.cascadeFailure.failureCount,
                    threshold: health.cascadeFailure.threshold,
                    velocity: health.cascadeFailure.failureVelocity,
                    windowMinutes: health.cascadeFailure.windowMinutes
                },
                divergenceRate: {
                    currentRate: health.divergenceRate.currentRate,
                    recommendedRate: health.divergenceRate.recommendedRate,
                    sharpeRatio: health.divergenceRate.sharpeRatio,
                    successRate: health.divergenceRate.successRate,
                    shouldAdjust: health.divergenceRate.shouldIncreaseDivergence || health.divergenceRate.shouldDecreaseDivergence
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/health/thresholds
 * Get current dynamic thresholds configuration
 */
router.get('/health/thresholds', async (req, res) => {
    try {
        const state = ensureState();
        const circle = req.query.circle || 'orchestrator';
        const ceremony = req.query.ceremony || 'standup';
        const forceRefresh = req.query.refresh === 'true';
        const thresholds = await refreshDynamicThresholds(state, circle, ceremony, forceRefresh);
        res.json({
            timestamp: new Date().toISOString(),
            confidence: thresholds.confidence,
            lastUpdate: new Date(thresholds.lastUpdate).toISOString(),
            thresholds: {
                circuitBreaker: {
                    threshold: thresholds.circuitBreaker.threshold,
                    method: thresholds.circuitBreaker.method,
                    confidence: thresholds.circuitBreaker.confidence,
                    sampleSize: thresholds.circuitBreaker.sampleSize
                },
                degradation: {
                    threshold: thresholds.degradation.threshold,
                    variationCoefficient: thresholds.degradation.variationCoefficient,
                    method: thresholds.degradation.method,
                    confidence: thresholds.degradation.confidence,
                    sampleSize: thresholds.degradation.sampleSize
                },
                cascadeFailure: {
                    threshold: thresholds.cascadeFailure.threshold,
                    windowMinutes: thresholds.cascadeFailure.windowMinutes,
                    method: thresholds.cascadeFailure.method
                },
                divergenceRate: {
                    rate: thresholds.divergenceRate.rate,
                    sharpeRatio: thresholds.divergenceRate.sharpeRatio,
                    method: thresholds.divergenceRate.method,
                    confidence: thresholds.divergenceRate.confidence
                },
                checkFrequency: {
                    checkEveryNEpisodes: thresholds.checkFrequency.checkEveryNEpisodes,
                    method: thresholds.checkFrequency.method
                },
                quantileBased: {
                    threshold: thresholds.quantileBased.threshold,
                    quantile: thresholds.quantileBased.quantile,
                    method: thresholds.quantileBased.method
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/health/degradation
 * Check degradation status
 */
router.get('/health/degradation', (req, res) => {
    try {
        const state = ensureState();
        const windowSize = parseInt(req.query.window || '10', 10);
        const result = checkDegradation(state, windowSize);
        res.json({
            timestamp: new Date().toISOString(),
            degraded: result.degraded,
            degradationScore: result.degradationScore,
            currentMean: result.currentMean,
            threshold: result.threshold,
            method: result.method,
            confidence: result.confidence,
            recentEpisodesCount: state.recentPerformance.length
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/health/cascade
 * Check cascade failure status
 */
router.get('/health/cascade', (req, res) => {
    try {
        const state = ensureState();
        const result = checkCascadeFailure(state);
        res.json({
            timestamp: new Date().toISOString(),
            cascading: result.cascading,
            failureCount: result.failureCount,
            threshold: result.threshold,
            windowMinutes: result.windowMinutes,
            failureVelocity: result.failureVelocity,
            method: result.method,
            recentFailures: state.cascadeFailureWindow.length
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/health/divergence
 * Check divergence rate status and recommendations
 */
router.get('/health/divergence', (req, res) => {
    try {
        const state = ensureState();
        const windowSize = parseInt(req.query.window || '20', 10);
        const result = getDivergenceRateStatus(state, windowSize);
        res.json({
            timestamp: new Date().toISOString(),
            currentRate: result.currentRate,
            recommendedRate: result.recommendedRate,
            sharpeRatio: result.sharpeRatio,
            successRate: result.successRate,
            shouldIncreaseDivergence: result.shouldIncreaseDivergence,
            shouldDecreaseDivergence: result.shouldDecreaseDivergence,
            method: result.method,
            confidence: result.confidence
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/health/metrics
 * Get current metrics snapshot
 */
router.get('/health/metrics', (req, res) => {
    try {
        const state = ensureState();
        res.json({
            timestamp: new Date().toISOString(),
            metrics: {
                degradationScore: state.metrics.degradation_score,
                cascadeFailureCount: state.metrics.cascade_failure_count,
                divergenceRate: state.metrics.divergence_rate_current,
                adaptiveCheckFrequency: getAdaptiveCheckFrequency(state),
                quantileThreshold: getQuantileThreshold(state)
            },
            work: {
                active: state.activeWork,
                queued: state.queuedWork,
                completed: state.completedWork,
                failed: state.failedWork
            },
            circuitBreaker: getCircuitBreakerState(),
            recentPerformanceCount: state.recentPerformance.length,
            cascadeWindowCount: state.cascadeFailureWindow.length
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/health/adaptive
 * Get adaptive check frequency status
 */
router.get('/health/adaptive', (req, res) => {
    try {
        const state = ensureState();
        const adaptiveFrequency = calculateAdaptiveCheckFrequency(state);
        const degradationScore = state.metrics.degradation_score || 0;
        const cascadeCount = state.metrics.cascade_failure_count || 0;
        const failureRate = state.failedWork / Math.max(1, state.completedWork + state.failedWork);
        const anomalyRate = Math.min(1, degradationScore * 0.4 +
            (cascadeCount > 0 ? 0.3 : 0) +
            failureRate * 0.3);
        res.json({
            timestamp: new Date().toISOString(),
            adaptive: {
                checkFrequency: adaptiveFrequency,
                episodeCount: state.episodeCount,
                lastHealthCheck: state.lastHealthCheck,
                anomalyRate: Math.round(anomalyRate * 100) / 100,
                stressLevel: adaptiveFrequency <= 3 ? 'high' : adaptiveFrequency <= 7 ? 'medium' : 'low',
                factors: {
                    degradationScore: Math.round(degradationScore * 100) / 100,
                    cascadeCount,
                    failureRate: Math.round(failureRate * 100) / 100
                },
                ranges: {
                    minFrequency: 1,
                    maxFrequency: 20,
                    currentFrequency: adaptiveFrequency
                }
            },
            healthCheckHistory: state.healthCheckHistory.slice(-10),
            recommendation: anomalyRate > 0.6
                ? 'System under high stress. Performing frequent health checks.'
                : anomalyRate > 0.3
                    ? 'System experiencing moderate stress. Increased monitoring.'
                    : 'System stable. Normal check frequency.'
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * POST /api/health/episode
 * Record episode performance (for testing/integration)
 */
router.post('/health/episode', (req, res) => {
    try {
        const state = ensureState();
        const { reward, success, taskId } = req.body;
        if (reward === undefined || success === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: reward, success'
            });
        }
        // Record performance (imported from processGovernorEnhanced)
        const { recordEpisodePerformance, recordFailureForCascade } = require('../runtime/processGovernorEnhanced');
        recordEpisodePerformance(state, reward, success);
        if (!success && taskId) {
            recordFailureForCascade(state, taskId);
        }
        res.json({
            status: 'success',
            message: 'Episode recorded',
            timestamp: new Date().toISOString(),
            metrics: {
                degradationScore: state.metrics.degradation_score,
                cascadeFailureCount: state.metrics.cascade_failure_count
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
export default router;
export { ensureState, governorState };
//# sourceMappingURL=health-check-endpoint.js.map