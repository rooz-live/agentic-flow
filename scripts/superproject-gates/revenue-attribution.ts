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
import * as crypto from 'crypto';

import {
  AttributionModel,
  TouchPoint,
  AttributionResult,
  DEFAULT_ATTRIBUTION_MODEL
} from './types.js';
import { SonaAnomalyDetector } from '../ruvector/sona-anomaly-detector.js';
import { MetricDataPoint, AnomalyResult } from '../ruvector/types.js';

/**
 * Touchpoint with attribution weight
 */
interface WeightedTouchpoint extends TouchPoint {
  attributedValue: number;
  weight: number;
}

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
export class RevenueAttributionEngine extends EventEmitter {
  private touchpoints: Map<string, TouchPoint[]>; // sessionId -> touchpoints
  private userTouchpoints: Map<string, string[]>; // userId -> sessionIds
  private attributionResults: Map<string, AttributionResult>; // conversionId -> result
  private defaultModel: AttributionModel;

  // Configuration
  private touchpointTTL: number = 30 * 24 * 60 * 60 * 1000; // 30 days
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(defaultModel?: AttributionModel) {
    super();
    this.touchpoints = new Map();
    this.userTouchpoints = new Map();
    this.attributionResults = new Map();
    this.defaultModel = defaultModel || DEFAULT_ATTRIBUTION_MODEL;

    // Start cleanup interval
    this.startCleanup();
  }

  // ==================== Touchpoint Tracking ====================

  /**
   * Record a new touchpoint
   */
  recordTouchpoint(touchpoint: Omit<TouchPoint, 'id'>): string {
    const id = crypto.randomUUID();
    const fullTouchpoint: TouchPoint = {
      ...touchpoint,
      id,
      timestamp: touchpoint.timestamp || new Date()
    };

    // Store by session
    const sessionTouchpoints = this.touchpoints.get(touchpoint.sessionId) || [];
    sessionTouchpoints.push(fullTouchpoint);
    this.touchpoints.set(touchpoint.sessionId, sessionTouchpoints);

    // Index by user if available
    if (touchpoint.userId) {
      const userSessions = this.userTouchpoints.get(touchpoint.userId) || [];
      if (!userSessions.includes(touchpoint.sessionId)) {
        userSessions.push(touchpoint.sessionId);
        this.userTouchpoints.set(touchpoint.userId, userSessions);
      }
    }

    this.emit('touchpointRecorded', {
      id,
      sessionId: touchpoint.sessionId,
      channel: touchpoint.channel,
      eventType: touchpoint.eventType
    });

    return id;
  }

  /**
   * Get touchpoints for a session
   */
  getTouchpoints(sessionId: string): TouchPoint[] {
    return this.touchpoints.get(sessionId) || [];
  }

  /**
   * Get touchpoints for a user across all sessions
   */
  getTouchpointsByUser(userId: string): TouchPoint[] {
    const sessionIds = this.userTouchpoints.get(userId) || [];
    const allTouchpoints: TouchPoint[] = [];

    for (const sessionId of sessionIds) {
      const sessionTouchpoints = this.touchpoints.get(sessionId) || [];
      allTouchpoints.push(...sessionTouchpoints);
    }

    // Sort by timestamp
    return allTouchpoints.sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  /**
   * Get touchpoints by affiliate
   */
  getTouchpointsByAffiliate(affiliateId: string): TouchPoint[] {
    const allTouchpoints: TouchPoint[] = [];

    this.touchpoints.forEach(sessionTouchpoints => {
      const affiliateTouchpoints = sessionTouchpoints.filter(
        tp => tp.affiliateId === affiliateId
      );
      allTouchpoints.push(...affiliateTouchpoints);
    });

    return allTouchpoints.sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  // ==================== Attribution Calculation ====================

  /**
   * Calculate attribution for a conversion
   */
  calculateAttribution(
    conversionId: string,
    conversionValue: number,
    touchpoints: TouchPoint[],
    model?: AttributionModel
  ): AttributionResult {
    const attributionModel = model || this.defaultModel;

    // Filter touchpoints within lookback window
    const cutoffDate = new Date(
      Date.now() - attributionModel.lookbackWindowDays * 24 * 60 * 60 * 1000
    );
    const validTouchpoints = touchpoints.filter(
      tp => tp.timestamp >= cutoffDate
    );

    if (validTouchpoints.length === 0) {
      const result: AttributionResult = {
        conversionId,
        conversionValue,
        model: attributionModel.type,
        touchpoints: [],
        affiliateCredits: [],
        calculatedAt: new Date()
      };
      this.attributionResults.set(conversionId, result);
      return result;
    }

    // Apply attribution model
    let weightedTouchpoints: WeightedTouchpoint[];

    switch (attributionModel.type) {
      case 'first_touch':
        weightedTouchpoints = this.firstTouchAttribution(validTouchpoints, conversionValue);
        break;
      case 'last_touch':
        weightedTouchpoints = this.lastTouchAttribution(validTouchpoints, conversionValue);
        break;
      case 'linear':
        weightedTouchpoints = this.linearAttribution(validTouchpoints, conversionValue);
        break;
      case 'time_decay':
        weightedTouchpoints = this.timeDecayAttribution(
          validTouchpoints,
          conversionValue,
          attributionModel.lookbackWindowDays / 2 // Half-life
        );
        break;
      case 'position_based':
        weightedTouchpoints = this.positionBasedAttribution(
          validTouchpoints,
          conversionValue,
          attributionModel.touchpointWeights || { first: 0.4, last: 0.4, middle: 0.2 }
        );
        break;
      default:
        weightedTouchpoints = this.lastTouchAttribution(validTouchpoints, conversionValue);
    }

    // Calculate affiliate credits
    const affiliateCredits = this.distributeAffiliateCredits({
      conversionId,
      conversionValue,
      model: attributionModel.type,
      touchpoints: weightedTouchpoints,
      affiliateCredits: [],
      calculatedAt: new Date()
    });

    const result: AttributionResult = {
      conversionId,
      conversionValue,
      model: attributionModel.type,
      touchpoints: weightedTouchpoints,
      affiliateCredits,
      calculatedAt: new Date()
    };

    // Store result
    this.attributionResults.set(conversionId, result);

    this.emit('attributionCalculated', {
      conversionId,
      model: attributionModel.type,
      touchpointCount: weightedTouchpoints.length,
      affiliateCount: affiliateCredits.length
    });

    return result;
  }

  /**
   * First touch attribution - all credit to first touchpoint
   */
  private firstTouchAttribution(
    touchpoints: TouchPoint[],
    value: number
  ): WeightedTouchpoint[] {
    const sorted = [...touchpoints].sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    return sorted.map((tp, index) => ({
      ...tp,
      weight: index === 0 ? 1 : 0,
      attributedValue: index === 0 ? value : 0
    }));
  }

  /**
   * Last touch attribution - all credit to last touchpoint
   */
  private lastTouchAttribution(
    touchpoints: TouchPoint[],
    value: number
  ): WeightedTouchpoint[] {
    const sorted = [...touchpoints].sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    return sorted.map((tp, index) => ({
      ...tp,
      weight: index === sorted.length - 1 ? 1 : 0,
      attributedValue: index === sorted.length - 1 ? value : 0
    }));
  }

  /**
   * Linear attribution - equal credit to all touchpoints
   */
  private linearAttribution(
    touchpoints: TouchPoint[],
    value: number
  ): WeightedTouchpoint[] {
    const weight = 1 / touchpoints.length;
    const attributedValue = value / touchpoints.length;

    return touchpoints.map(tp => ({
      ...tp,
      weight,
      attributedValue
    }));
  }

  /**
   * Time decay attribution - more credit to recent touchpoints
   */
  private timeDecayAttribution(
    touchpoints: TouchPoint[],
    value: number,
    halfLifeDays: number
  ): WeightedTouchpoint[] {
    const now = Date.now();
    const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;

    // Calculate raw weights based on time decay
    const rawWeights = touchpoints.map(tp => {
      const ageMs = now - tp.timestamp.getTime();
      return Math.pow(2, -ageMs / halfLifeMs);
    });

    // Normalize weights to sum to 1
    const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = rawWeights.map(w => w / totalWeight);

    return touchpoints.map((tp, index) => ({
      ...tp,
      weight: normalizedWeights[index],
      attributedValue: value * normalizedWeights[index]
    }));
  }

  /**
   * Position-based attribution - custom weights for first, last, and middle touchpoints
   */
  private positionBasedAttribution(
    touchpoints: TouchPoint[],
    value: number,
    weights: Record<string, number>
  ): WeightedTouchpoint[] {
    const sorted = [...touchpoints].sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    const firstWeight = weights['first'] || 0.4;
    const lastWeight = weights['last'] || 0.4;
    const middleWeight = weights['middle'] || 0.2;

    if (sorted.length === 1) {
      return [{ ...sorted[0], weight: 1, attributedValue: value }];
    }

    if (sorted.length === 2) {
      const splitWeight = (firstWeight + lastWeight) / 2;
      return sorted.map((tp, index) => ({
        ...tp,
        weight: splitWeight,
        attributedValue: value * splitWeight
      }));
    }

    // Distribute middle weight evenly among middle touchpoints
    const middleCount = sorted.length - 2;
    const middleWeightEach = middleWeight / middleCount;

    return sorted.map((tp, index) => {
      let weight: number;
      if (index === 0) {
        weight = firstWeight;
      } else if (index === sorted.length - 1) {
        weight = lastWeight;
      } else {
        weight = middleWeightEach;
      }

      return {
        ...tp,
        weight,
        attributedValue: value * weight
      };
    });
  }

  // ==================== Affiliate Credit Distribution ====================

  /**
   * Distribute affiliate credits based on attribution result
   */
  distributeAffiliateCredits(result: AttributionResult): AffiliateCredit[] {
    const affiliateCredits = new Map<string, number>();

    // Aggregate credits by affiliate
    for (const tp of result.touchpoints) {
      if (tp.affiliateId && tp.attributedValue > 0) {
        const current = affiliateCredits.get(tp.affiliateId) || 0;
        affiliateCredits.set(tp.affiliateId, current + tp.attributedValue);
      }
    }

    // Convert to array with percentages
    const totalAttributed = Array.from(affiliateCredits.values())
      .reduce((sum, val) => sum + val, 0);

    const credits: AffiliateCredit[] = [];
    affiliateCredits.forEach((creditValue, affiliateId) => {
      credits.push({
        affiliateId,
        creditValue,
        creditPercentage: totalAttributed > 0 
          ? (creditValue / totalAttributed) * 100 
          : 0
      });
    });

    // Sort by credit value descending
    return credits.sort((a, b) => b.creditValue - a.creditValue);
  }

  // ==================== Fraud Detection (Ruvector-Sona Integration) ====================

  /**
   * Detect fraudulent touchpoints using ruvector-sona anomaly detection
   * 
   * Integration with Phase 1 ruvector-sona for fraud pattern detection
   */
  async detectFraudulentTouchpoints(
    touchpoints: TouchPoint[],
    anomalyDetector: SonaAnomalyDetector
  ): Promise<FraudDetectionResult> {
    const valid: TouchPoint[] = [];
    const suspicious: TouchPoint[] = [];
    const anomalyScores = new Map<string, number>();

    // Group touchpoints by session for analysis
    const sessionGroups = new Map<string, TouchPoint[]>();
    for (const tp of touchpoints) {
      const group = sessionGroups.get(tp.sessionId) || [];
      group.push(tp);
      sessionGroups.set(tp.sessionId, group);
    }

    // Analyze each touchpoint
    for (const tp of touchpoints) {
      // Convert touchpoint to metric data point for anomaly detection
      // MetricDataPoint uses system metrics format, so we map touchpoint characteristics to it
      const metricPoint: MetricDataPoint = this.touchpointToMetricDataPoint(tp, sessionGroups);

      // Check for anomalies
      const anomalyResult: AnomalyResult = anomalyDetector.detectAnomaly(metricPoint);
      anomalyScores.set(tp.id, anomalyResult.score);

      if (anomalyResult.isAnomaly) {
        suspicious.push(tp);
      } else {
        valid.push(tp);
      }
    }

    // Additional fraud patterns check
    const additionalSuspicious = this.detectFraudPatterns(touchpoints, sessionGroups);
    for (const tp of additionalSuspicious) {
      if (!suspicious.find(s => s.id === tp.id)) {
        suspicious.push(tp);
        const validIndex = valid.findIndex(v => v.id === tp.id);
        if (validIndex >= 0) {
          valid.splice(validIndex, 1);
        }
      }
    }

    this.emit('fraudDetectionCompleted', {
      total: touchpoints.length,
      valid: valid.length,
      suspicious: suspicious.length
    });

    return { valid, suspicious, anomalyScores };
  }

  /**
   * Detect common fraud patterns in touchpoints
   */
  private detectFraudPatterns(
    touchpoints: TouchPoint[],
    sessionGroups: Map<string, TouchPoint[]>
  ): TouchPoint[] {
    const suspicious: TouchPoint[] = [];

    // Pattern 1: Rapid-fire clicks (more than 10 in 1 minute)
    sessionGroups.forEach(sessionTps => {
      const sorted = sessionTps.sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      for (let i = 0; i < sorted.length; i++) {
        const windowStart = sorted[i].timestamp.getTime();
        const windowEnd = windowStart + 60000; // 1 minute
        const clicksInWindow = sorted.filter(tp =>
          tp.timestamp.getTime() >= windowStart &&
          tp.timestamp.getTime() <= windowEnd
        );

        if (clicksInWindow.length > 10) {
          suspicious.push(...clicksInWindow);
        }
      }
    });

    // Pattern 2: Same affiliate with different sessions in short timeframe
    const affiliateSessionTimes = new Map<string, Array<{ sessionId: string; time: Date }>>();
    for (const tp of touchpoints) {
      if (tp.affiliateId) {
        const times = affiliateSessionTimes.get(tp.affiliateId) || [];
        times.push({ sessionId: tp.sessionId, time: tp.timestamp });
        affiliateSessionTimes.set(tp.affiliateId, times);
      }
    }

    affiliateSessionTimes.forEach((times, affiliateId) => {
      const uniqueSessions = new Set(times.map(t => t.sessionId));
      if (uniqueSessions.size > 5) {
        // Check if all within 5 minutes
        const sorted = times.sort((a, b) => a.time.getTime() - b.time.getTime());
        if (sorted.length >= 2) {
          const timeSpan = sorted[sorted.length - 1].time.getTime() - sorted[0].time.getTime();
          if (timeSpan < 5 * 60 * 1000) { // 5 minutes
            // Mark all touchpoints from this affiliate as suspicious
            for (const tp of touchpoints) {
              if (tp.affiliateId === affiliateId) {
                suspicious.push(tp);
              }
            }
          }
        }
      }
    });

    // Pattern 3: Suspicious referrer patterns
    const suspiciousReferrers = ['localhost', '127.0.0.1', 'test.com'];
    for (const tp of touchpoints) {
      if (tp.referrerUrl) {
        const isSuspicious = suspiciousReferrers.some(ref => 
          tp.referrerUrl?.toLowerCase().includes(ref)
        );
        if (isSuspicious) {
          suspicious.push(tp);
        }
      }
    }

    return suspicious;
  }

  /**
   * Convert a TouchPoint to MetricDataPoint for anomaly detection
   * Maps touchpoint characteristics to the metric format expected by SonaAnomalyDetector
   */
  private touchpointToMetricDataPoint(
    tp: TouchPoint,
    sessionGroups: Map<string, TouchPoint[]>
  ): MetricDataPoint {
    // Calculate session-based metrics for anomaly detection
    const sessionTouchpoints = sessionGroups.get(tp.sessionId) || [];
    const sessionEventCount = sessionTouchpoints.length;
    
    // Calculate time-based metrics
    const sessionTimes = sessionTouchpoints.map(t => t.timestamp.getTime()).sort((a, b) => a - b);
    const avgTimeBetweenEvents = sessionTimes.length > 1
      ? (sessionTimes[sessionTimes.length - 1] - sessionTimes[0]) / (sessionTimes.length - 1)
      : 60000; // Default 1 minute
    
    // Normalize metrics to 0-100 scale for anomaly detection
    // cpu: normalized event rate (higher = more suspicious)
    const eventRateNormalized = Math.min(100, (sessionEventCount / 10) * 100);
    
    // memory: normalized value (higher values might be suspicious)
    const valueNormalized = tp.eventValue ? Math.min(100, (tp.eventValue / 1000) * 100) : 50;
    
    // hitRate: normalized time consistency (lower avg time = more suspicious)
    const timeConsistencyNormalized = Math.min(100, (60000 / Math.max(avgTimeBetweenEvents, 100)) * 100);
    
    // latency: represents the position in session (later = higher)
    const positionInSession = sessionTimes.indexOf(tp.timestamp.getTime());
    const positionNormalized = sessionTimes.length > 1
      ? (positionInSession / (sessionTimes.length - 1)) * 100
      : 50;

    return {
      timestamp: tp.timestamp.getTime(),
      cpu: eventRateNormalized,
      memory: valueNormalized,
      hitRate: 100 - timeConsistencyNormalized, // Invert: higher hit rate = more normal
      latency: positionNormalized,
      custom: {
        eventValue: tp.eventValue || 0,
        sessionEvents: sessionEventCount,
        hasAffiliate: tp.affiliateId ? 1 : 0
      }
    };
  }

  // ==================== Reporting ====================

  /**
   * Generate attribution report
   */
  getAttributionReport(params: {
    startDate: Date;
    endDate: Date;
    model?: AttributionModel['type'];
    groupBy?: 'affiliate' | 'channel' | 'campaign';
  }): AttributionReport {
    const { startDate, endDate, groupBy = 'affiliate' } = params;
    const modelType = params.model || this.defaultModel.type;

    // Filter results by date range
    const filteredResults = Array.from(this.attributionResults.values())
      .filter(result => 
        result.calculatedAt >= startDate && 
        result.calculatedAt <= endDate &&
        result.model === modelType
      );

    // Group data
    const groupedData = new Map<string, {
      conversions: number;
      revenue: number;
      touchpoints: number;
      channels: string[];
    }>();

    for (const result of filteredResults) {
      for (const tp of result.touchpoints) {
        if (tp.attributedValue <= 0) continue;

        let groupKey: string;
        switch (groupBy) {
          case 'affiliate':
            groupKey = tp.affiliateId || 'direct';
            break;
          case 'channel':
            groupKey = tp.channel;
            break;
          case 'campaign':
            groupKey = tp.campaign || 'none';
            break;
          default:
            groupKey = 'unknown';
        }

        const existing = groupedData.get(groupKey) || {
          conversions: 0,
          revenue: 0,
          touchpoints: 0,
          channels: []
        };

        existing.conversions += tp.weight; // Fractional conversion
        existing.revenue += tp.attributedValue;
        existing.touchpoints += 1;
        if (!existing.channels.includes(tp.channel)) {
          existing.channels.push(tp.channel);
        }

        groupedData.set(groupKey, existing);
      }
    }

    // Format report data
    const data = Array.from(groupedData.entries()).map(([groupKey, stats]) => ({
      groupKey,
      conversions: Math.round(stats.conversions * 100) / 100,
      revenue: Math.round(stats.revenue * 100) / 100,
      avgTouchpoints: stats.conversions > 0 
        ? Math.round((stats.touchpoints / stats.conversions) * 10) / 10 
        : 0,
      topChannels: stats.channels.slice(0, 3)
    }));

    // Sort by revenue descending
    data.sort((a, b) => b.revenue - a.revenue);

    return {
      startDate,
      endDate,
      model: modelType,
      totalConversions: filteredResults.length,
      totalRevenue: filteredResults.reduce((sum, r) => sum + r.conversionValue, 0),
      data
    };
  }

  /**
   * Get attribution result by conversion ID
   */
  getAttributionResult(conversionId: string): AttributionResult | null {
    return this.attributionResults.get(conversionId) || null;
  }

  /**
   * Get attribution summary for a time period
   */
  getAttributionSummary(startDate: Date, endDate: Date): {
    totalConversions: number;
    totalRevenue: number;
    avgTouchpointsPerConversion: number;
    modelBreakdown: Record<string, number>;
    topAffiliates: Array<{ affiliateId: string; revenue: number }>;
    topChannels: Array<{ channel: string; revenue: number }>;
  } {
    const results = Array.from(this.attributionResults.values())
      .filter(r => r.calculatedAt >= startDate && r.calculatedAt <= endDate);

    const modelBreakdown: Record<string, number> = {};
    const affiliateRevenue = new Map<string, number>();
    const channelRevenue = new Map<string, number>();
    let totalTouchpoints = 0;

    for (const result of results) {
      modelBreakdown[result.model] = (modelBreakdown[result.model] || 0) + 1;
      totalTouchpoints += result.touchpoints.length;

      for (const credit of result.affiliateCredits) {
        const current = affiliateRevenue.get(credit.affiliateId) || 0;
        affiliateRevenue.set(credit.affiliateId, current + credit.creditValue);
      }

      for (const tp of result.touchpoints) {
        if (tp.attributedValue > 0) {
          const current = channelRevenue.get(tp.channel) || 0;
          channelRevenue.set(tp.channel, current + tp.attributedValue);
        }
      }
    }

    const topAffiliates = Array.from(affiliateRevenue.entries())
      .map(([affiliateId, revenue]) => ({ affiliateId, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topChannels = Array.from(channelRevenue.entries())
      .map(([channel, revenue]) => ({ channel, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalConversions: results.length,
      totalRevenue: results.reduce((sum, r) => sum + r.conversionValue, 0),
      avgTouchpointsPerConversion: results.length > 0 
        ? totalTouchpoints / results.length 
        : 0,
      modelBreakdown,
      topAffiliates,
      topChannels
    };
  }

  // ==================== Configuration & Utilities ====================

  /**
   * Set default attribution model
   */
  setDefaultModel(model: AttributionModel): void {
    this.defaultModel = model;
    this.emit('defaultModelChanged', { model: model.type });
  }

  /**
   * Get current default model
   */
  getDefaultModel(): AttributionModel {
    return { ...this.defaultModel };
  }

  /**
   * Set touchpoint TTL
   */
  setTouchpointTTL(ttlMs: number): void {
    this.touchpointTTL = ttlMs;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTouchpoints();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Clean up expired touchpoints
   */
  private cleanupExpiredTouchpoints(): void {
    const cutoff = new Date(Date.now() - this.touchpointTTL);
    let cleaned = 0;

    this.touchpoints.forEach((tps, sessionId) => {
      const validTps = tps.filter(tp => tp.timestamp > cutoff);
      if (validTps.length !== tps.length) {
        cleaned += tps.length - validTps.length;
        if (validTps.length === 0) {
          this.touchpoints.delete(sessionId);
        } else {
          this.touchpoints.set(sessionId, validTps);
        }
      }
    });

    if (cleaned > 0) {
      this.emit('touchpointsCleanedUp', { count: cleaned });
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalTouchpoints: number;
    totalSessions: number;
    totalUsers: number;
    totalConversions: number;
    modelUsage: Record<string, number>;
  } {
    let totalTouchpoints = 0;
    this.touchpoints.forEach(tps => {
      totalTouchpoints += tps.length;
    });

    const modelUsage: Record<string, number> = {};
    this.attributionResults.forEach(result => {
      modelUsage[result.model] = (modelUsage[result.model] || 0) + 1;
    });

    return {
      totalTouchpoints,
      totalSessions: this.touchpoints.size,
      totalUsers: this.userTouchpoints.size,
      totalConversions: this.attributionResults.size,
      modelUsage
    };
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.touchpoints.clear();
    this.userTouchpoints.clear();
    this.attributionResults.clear();
    this.emit('allDataCleared');
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clearAll();
    this.emit('destroyed');
  }
}

/**
 * Factory function to create revenue attribution engine
 */
export function createRevenueAttributionEngine(
  defaultModel?: AttributionModel
): RevenueAttributionEngine {
  return new RevenueAttributionEngine(defaultModel);
}
