/**
 * Revenue Attribution Engine
 *
 * Phase 2 Implementation - Multi-Touch Revenue Attribution
 *
 * Provides comprehensive revenue attribution including:
 * - Multi-touch attribution models (first, last, linear, time decay, position based)
 * - Touchpoint tracking and management
 * - Affiliate credit distribution
 * - Integration with ruvector-sona for fraud detection
 * - Attribution reporting and analytics
 */
import { EventEmitter } from 'events';
import { AttributionModel, TouchPoint, AttributionResult } from './types.js';
import { SonaAnomalyDetector } from '../ruvector/sona-anomaly-detector.js';
/**
 * Affiliate credit allocation
 */
interface AffiliateCredit {
    affiliateId: string;
    creditValue: number;
    creditPercentage: number;
}
/**
 * Attribution report data
 */
interface AttributionReport {
    startDate: Date;
    endDate: Date;
    model: AttributionModel['type'];
    totalConversions: number;
    totalRevenue: number;
    data: Array<{
        groupKey: string;
        conversions: number;
        revenue: number;
        avgTouchpoints: number;
        topChannels: string[];
    }>;
}
/**
 * Fraud detection result
 */
interface FraudDetectionResult {
    valid: TouchPoint[];
    suspicious: TouchPoint[];
    anomalyScores: Map<string, number>;
}
/**
 * Revenue Attribution Engine
 *
 * Implements comprehensive revenue attribution including:
 * - Multiple attribution models
 * - Touchpoint lifecycle management
 * - Affiliate credit distribution
 * - Fraud detection via ruvector-sona integration
 */
export declare class RevenueAttributionEngine extends EventEmitter {
    private touchpoints;
    private userTouchpoints;
    private attributionResults;
    private defaultModel;
    private touchpointTTL;
    private cleanupInterval;
    constructor(defaultModel?: AttributionModel);
    /**
     * Record a new touchpoint
     */
    recordTouchpoint(touchpoint: Omit<TouchPoint, 'id'>): string;
    /**
     * Get touchpoints for a session
     */
    getTouchpoints(sessionId: string): TouchPoint[];
    /**
     * Get touchpoints for a user across all sessions
     */
    getTouchpointsByUser(userId: string): TouchPoint[];
    /**
     * Get touchpoints by affiliate
     */
    getTouchpointsByAffiliate(affiliateId: string): TouchPoint[];
    /**
     * Calculate attribution for a conversion
     */
    calculateAttribution(conversionId: string, conversionValue: number, touchpoints: TouchPoint[], model?: AttributionModel): AttributionResult;
    /**
     * First touch attribution - all credit to first touchpoint
     */
    private firstTouchAttribution;
    /**
     * Last touch attribution - all credit to last touchpoint
     */
    private lastTouchAttribution;
    /**
     * Linear attribution - equal credit to all touchpoints
     */
    private linearAttribution;
    /**
     * Time decay attribution - more credit to recent touchpoints
     */
    private timeDecayAttribution;
    /**
     * Position-based attribution - custom weights for first, last, and middle touchpoints
     */
    private positionBasedAttribution;
    /**
     * Distribute affiliate credits based on attribution result
     */
    distributeAffiliateCredits(result: AttributionResult): AffiliateCredit[];
    /**
     * Detect fraudulent touchpoints using ruvector-sona anomaly detection
     *
     * Integration with Phase 1 ruvector-sona for fraud pattern detection
     */
    detectFraudulentTouchpoints(touchpoints: TouchPoint[], anomalyDetector: SonaAnomalyDetector): Promise<FraudDetectionResult>;
    /**
     * Detect common fraud patterns in touchpoints
     */
    private detectFraudPatterns;
    /**
     * Convert a TouchPoint to MetricDataPoint for anomaly detection
     * Maps touchpoint characteristics to the metric format expected by SonaAnomalyDetector
     */
    private touchpointToMetricDataPoint;
    /**
     * Generate attribution report
     */
    getAttributionReport(params: {
        startDate: Date;
        endDate: Date;
        model?: AttributionModel['type'];
        groupBy?: 'affiliate' | 'channel' | 'campaign';
    }): AttributionReport;
    /**
     * Get attribution result by conversion ID
     */
    getAttributionResult(conversionId: string): AttributionResult | null;
    /**
     * Get attribution summary for a time period
     */
    getAttributionSummary(startDate: Date, endDate: Date): {
        totalConversions: number;
        totalRevenue: number;
        avgTouchpointsPerConversion: number;
        modelBreakdown: Record<string, number>;
        topAffiliates: Array<{
            affiliateId: string;
            revenue: number;
        }>;
        topChannels: Array<{
            channel: string;
            revenue: number;
        }>;
    };
    /**
     * Set default attribution model
     */
    setDefaultModel(model: AttributionModel): void;
    /**
     * Get current default model
     */
    getDefaultModel(): AttributionModel;
    /**
     * Set touchpoint TTL
     */
    setTouchpointTTL(ttlMs: number): void;
    /**
     * Start cleanup interval
     */
    private startCleanup;
    /**
     * Clean up expired touchpoints
     */
    private cleanupExpiredTouchpoints;
    /**
     * Get statistics
     */
    getStats(): {
        totalTouchpoints: number;
        totalSessions: number;
        totalUsers: number;
        totalConversions: number;
        modelUsage: Record<string, number>;
    };
    /**
     * Clear all data
     */
    clearAll(): void;
    /**
     * Destroy and cleanup
     */
    destroy(): void;
}
/**
 * Factory function to create revenue attribution engine
 */
export declare function createRevenueAttributionEngine(defaultModel?: AttributionModel): RevenueAttributionEngine;
export {};
//# sourceMappingURL=revenue-attribution.d.ts.map