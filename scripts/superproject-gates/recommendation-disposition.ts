/**
 * Recommendation Disposition Tracking System
 *
 * Implements complete disposition tracking from generation through
 * disposition with reason logging, timeline tracking, analytics,
 * and audit trail.
 *
 * Applies Manthra: Directed thought-power for logical disposition flow
 * Applies Yasna: Disciplined alignment through consistent tracking
 * Applies Mithra: Binding force preventing drift through centralized tracking
 */

import {
  Recommendation,
  RecommendationDisposition,
  DispositionTracker,
  DispositionAnalytics,
  RecommendationSystemError,
  RecommendationEvent,
  RecommendationEventType
} from './recommendation-types';

export class RecommendationDispositionTracker {
  private tracker: DispositionTracker;
  private eventLog: RecommendationEvent[] = [];
  private persistenceKey = 'recommendation-disposition';
  private analyticsEnabled: boolean = true;
  private retentionPeriod: number = 7776000000; // 90 days

  constructor(config?: {
    analyticsEnabled?: boolean;
    retentionPeriod?: number;
  }) {
    this.analyticsEnabled = config?.analyticsEnabled ?? true;
    this.retentionPeriod = config?.retentionPeriod ?? this.retentionPeriod;

    this.tracker = this.createTracker();
    this.initialize();
  }

  /**
   * Create disposition tracker
   */
  private createTracker(): DispositionTracker {
    return {
      id: 'default-disposition-tracker',
      recommendations: new Map(),
      analytics: this.createInitialAnalytics(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create initial analytics
   */
  private createInitialAnalytics(): DispositionAnalytics {
    return {
      totalRecommendations: 0,
      byDisposition: {
        accepted: 0,
        rejected: 0,
        deferred: 0,
        modified: 0,
        escalated: 0
      },
      byPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      byType: {
        optimization: 0,
        security: 0,
        performance: 0,
        governance: 0,
        operational: 0,
        technical_debt: 0
      },
      bySource: {},
      averageDispositionTime: 0,
      dispositionRate: 0,
      acceptanceRate: 0,
      rejectionRate: 0,
      deferralRate: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Initialize disposition tracker
   */
  private async initialize(): Promise<void> {
    console.log('[DISPOSITION-TRACKER] Initializing disposition tracker');

    try {
      // Load persisted state
      await this.loadPersistedState();

      console.log('[DISPOSITION-TRACKER] Disposition tracker initialized');
    } catch (error) {
      console.error('[DISPOSITION-TRACKER] Initialization failed:', error);
      throw this.createError('INITIALIZATION_FAILED', `Disposition tracker initialization failed: ${error.message}`);
    }
  }

  /**
   * Track a recommendation
   */
  public async trackRecommendation(recommendation: Recommendation): Promise<void> {
    try {
      // Add to tracker
      this.tracker.recommendations.set(recommendation.id, {
        id: this.generateId('disposition'),
        recommendationId: recommendation.id,
        disposition: 'accepted', // Default disposition
        reason: 'Pending disposition',
        dispositionedBy: 'system',
        dispositionedAt: new Date()
      });

      // Update analytics
      this.updateAnalytics(recommendation, 'accepted');

      // Update tracker metadata
      this.tracker.updatedAt = new Date();

      // Log event
      this.logEvent('recommendation_disposed', {
        recommendationId: recommendation.id,
        disposition: 'accepted',
        reason: 'Pending disposition'
      });

      // Persist state
      await this.persistState();

      console.log(`[DISPOSITION-TRACKER] Tracked recommendation ${recommendation.id}`);
    } catch (error) {
      console.error('[DISPOSITION-TRACKER] Failed to track recommendation:', error);
      throw error;
    }
  }

  /**
   * Update recommendation disposition
   */
  public async updateDisposition(
    recommendationId: string,
    disposition: RecommendationDisposition['disposition'],
    reason: string,
    dispositionedBy: string,
    options?: {
      newPriority?: Recommendation['priority'];
      rescheduledFor?: Date;
      modifiedActions?: string[];
      notes?: string;
    }
  ): Promise<void> {
    try {
      const existingDisposition = this.tracker.recommendations.get(recommendationId);
      if (!existingDisposition) {
        throw this.createError('DISPOSITION_NOT_FOUND', `Disposition for recommendation ${recommendationId} not found`);
      }

      // Create new disposition record
      const newDisposition: RecommendationDisposition = {
        id: this.generateId('disposition'),
        recommendationId,
        disposition,
        reason,
        dispositionedBy,
        dispositionedAt: new Date(),
        notes: options?.notes,
        newPriority: options?.newPriority,
        rescheduledFor: options?.rescheduledFor,
        modifiedActions: options?.modifiedActions
      };

      // Update tracker
      this.tracker.recommendations.set(recommendationId, newDisposition);

      // Update analytics
      const recommendation = await this.getRecommendationById(recommendationId);
      if (recommendation) {
        this.updateAnalytics(recommendation, disposition);
      }

      // Update tracker metadata
      this.tracker.updatedAt = new Date();

      // Log event
      this.logEvent('recommendation_disposed', {
        recommendationId,
        disposition,
        reason,
        dispositionedBy,
        options
      });

      // Persist state
      await this.persistState();

      console.log(`[DISPOSITION-TRACKER] Updated disposition for recommendation ${recommendationId} to ${disposition}`);
    } catch (error) {
      console.error('[DISPOSITION-TRACKER] Failed to update disposition:', error);
      throw error;
    }
  }

  /**
   * Get recommendation disposition
   */
  public getDisposition(recommendationId: string): RecommendationDisposition | null {
    return this.tracker.recommendations.get(recommendationId) || null;
  }

  /**
   * Get all dispositions
   */
  public getAllDispositions(): RecommendationDisposition[] {
    return Array.from(this.tracker.recommendations.values());
  }

  /**
   * Get dispositions by type
   */
  public getDispositionsByType(
    dispositionType: RecommendationDisposition['disposition']
  ): RecommendationDisposition[] {
    return this.getAllDispositions().filter(d => d.disposition === dispositionType);
  }

  /**
   * Get disposition analytics
   */
  public getAnalytics(): DispositionAnalytics {
    return { ...this.tracker.analytics };
  }

  /**
   * Get disposition timeline for a recommendation
   */
  public getDispositionTimeline(
    recommendationId: string
  ): Array<{
    status: string;
    timestamp: Date;
    description: string;
  }> {
    const timeline: Array<{
      status: string;
      timestamp: Date;
      description: string;
    }> = [];

    const disposition = this.tracker.recommendations.get(recommendationId);
    if (disposition) {
      timeline.push({
        status: disposition.disposition,
        timestamp: disposition.dispositionedAt,
        description: `Dispositioned as ${disposition.disposition}: ${disposition.reason}`
      });
    }

    // Add related events from event log
    const relatedEvents = this.eventLog.filter(
      e => e.recommendationId === recommendationId
    );

    relatedEvents.forEach(event => {
      timeline.push({
        status: event.type,
        timestamp: event.timestamp,
        description: event.data.description || JSON.stringify(event.data)
      });
    });

    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return timeline;
  }

  /**
   * Get disposition history audit trail
   */
  public getAuditTrail(recommendationId?: string): Array<{
    timestamp: Date;
    action: string;
    userId: string;
    details: Record<string, any>;
  }> {
    const auditTrail: Array<{
      timestamp: Date;
      action: string;
      userId: string;
      details: Record<string, any>;
    }> = [];

    // Get dispositions
    const dispositions = recommendationId
      ? [this.tracker.recommendations.get(recommendationId)].filter(Boolean) as RecommendationDisposition[]
      : this.getAllDispositions();

    // Add dispositions to audit trail
    dispositions.forEach(disposition => {
      auditTrail.push({
        timestamp: disposition.dispositionedAt,
        action: `disposition_${disposition.disposition}`,
        userId: disposition.dispositionedBy,
        details: {
          recommendationId: disposition.recommendationId,
          reason: disposition.reason,
          notes: disposition.notes,
          newPriority: disposition.newPriority,
          rescheduledFor: disposition.rescheduledFor,
          modifiedActions: disposition.modifiedActions
        }
      });
    });

    // Add events to audit trail
    const events = recommendationId
      ? this.eventLog.filter(e => e.recommendationId === recommendationId)
      : this.eventLog;

    events.forEach(event => {
      auditTrail.push({
        timestamp: event.timestamp,
        action: event.type,
        userId: event.userId || 'system',
        details: event.data
      });
    });

    // Sort by timestamp
    auditTrail.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return auditTrail;
  }

  /**
   * Update analytics based on disposition
   */
  private updateAnalytics(
    recommendation: Recommendation,
    disposition: RecommendationDisposition['disposition']
  ): void {
    const analytics = this.tracker.analytics;

    // Update total count
    analytics.totalRecommendations++;

    // Update by disposition
    analytics.byDisposition[disposition]++;

    // Update by priority
    analytics.byPriority[recommendation.priority]++;

    // Update by type
    analytics.byType[recommendation.type]++;

    // Update by source
    if (!analytics.bySource[recommendation.source]) {
      analytics.bySource[recommendation.source] = 0;
    }
    analytics.bySource[recommendation.source]++;

    // Calculate disposition rate
    const totalDispositions = Object.values(analytics.byDisposition).reduce((sum, count) => sum + count, 0);
    analytics.dispositionRate = totalDispositions / analytics.totalRecommendations;

    // Calculate acceptance rate
    analytics.acceptanceRate = analytics.byDisposition.accepted / totalDispositions;

    // Calculate rejection rate
    analytics.rejectionRate = analytics.byDisposition.rejected / totalDispositions;

    // Calculate deferral rate
    analytics.deferralRate = analytics.byDisposition.deferred / totalDispositions;

    // Update last updated
    analytics.lastUpdated = new Date();
  }

  /**
   * Get recommendation by ID (stub implementation)
   */
  private async getRecommendationById(recommendationId: string): Promise<Recommendation | null> {
    // In production, this would fetch from the recommendation store
    return null;
  }

  /**
   * Generate disposition report
   */
  public generateReport(options?: {
    startDate?: Date;
    endDate?: Date;
    byType?: Recommendation['type'];
    byPriority?: Recommendation['priority'];
    byDisposition?: RecommendationDisposition['disposition'];
  }): {
    summary: DispositionAnalytics;
    dispositions: RecommendationDisposition[];
    timeline: Array<{
      timestamp: Date;
      count: number;
      byDisposition: Record<RecommendationDisposition['disposition'], number>;
    }>;
    insights: string[];
  } {
    let dispositions = this.getAllDispositions();

    // Apply filters
    if (options?.startDate) {
      dispositions = dispositions.filter(d => d.dispositionedAt >= options.startDate!);
    }

    if (options?.endDate) {
      dispositions = dispositions.filter(d => d.dispositionedAt <= options.endDate!);
    }

    if (options?.byType) {
      // Would need to fetch recommendations to filter by type
    }

    if (options?.byPriority) {
      // Would need to fetch recommendations to filter by priority
    }

    if (options?.byDisposition) {
      dispositions = dispositions.filter(d => d.disposition === options.byDisposition);
    }

    // Generate timeline
    const timelineMap = new Map<string, {
      timestamp: Date;
      count: number;
      byDisposition: Record<RecommendationDisposition['disposition'], number>;
    }>();

    dispositions.forEach(disposition => {
      const dateKey = disposition.dispositionedAt.toISOString().split('T')[0];
      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, {
          timestamp: disposition.dispositionedAt,
          count: 0,
          byDisposition: {
            accepted: 0,
            rejected: 0,
            deferred: 0,
            modified: 0,
            escalated: 0
          }
        });
      }

      const entry = timelineMap.get(dateKey)!;
      entry.count++;
      entry.byDisposition[disposition.disposition]++;
    });

    const timeline = Array.from(timelineMap.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Generate insights
    const insights = this.generateInsights(dispositions);

    return {
      summary: this.getAnalytics(),
      dispositions,
      timeline,
      insights
    };
  }

  /**
   * Generate insights from dispositions
   */
  private generateInsights(dispositions: RecommendationDisposition[]): string[] {
    const insights: string[] = [];
    const analytics = this.tracker.analytics;

    // Acceptance rate insight
    if (analytics.acceptanceRate > 0.7) {
      insights.push(`High acceptance rate (${(analytics.acceptanceRate * 100).toFixed(1)}%) indicates good recommendation quality`);
    } else if (analytics.acceptanceRate < 0.3) {
      insights.push(`Low acceptance rate (${(analytics.acceptanceRate * 100).toFixed(1)}%) indicates recommendation quality issues`);
    }

    // Rejection rate insight
    if (analytics.rejectionRate > 0.5) {
      insights.push(`High rejection rate (${(analytics.rejectionRate * 100).toFixed(1)}%) indicates recommendations may need refinement`);
    }

    // Deferral rate insight
    if (analytics.deferralRate > 0.4) {
      insights.push(`High deferral rate (${(analytics.deferralRate * 100).toFixed(1)}%) indicates timing or prioritization issues`);
    }

    // Priority distribution insight
    const priorityDistribution = Object.entries(analytics.byPriority).sort((a, b) => b[1] - a[1]);
    const topPriority = priorityDistribution[0];
    if (topPriority) {
      insights.push(`Most common priority: ${topPriority[0]} (${topPriority[1]} recommendations)`);
    }

    // Type distribution insight
    const typeDistribution = Object.entries(analytics.byType).sort((a, b) => b[1] - a[1]);
    const topType = typeDistribution[0];
    if (topType) {
      insights.push(`Most common type: ${topType[0]} (${topType[1]} recommendations)`);
    }

    return insights;
  }

  /**
   * Persist tracker state
   */
  private async persistState(): Promise<void> {
    try {
      const state = {
        tracker: {
          ...this.tracker,
          recommendations: Array.from(this.tracker.recommendations.entries())
        },
        eventLog: this.eventLog.slice(-100) // Keep last 100 events
      };

      // In production, this would persist to a database
      // For now, we'll use localStorage if available
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.persistenceKey, JSON.stringify(state));
      }

      console.log('[DISPOSITION-TRACKER] State persisted');
    } catch (error) {
      console.error('[DISPOSITION-TRACKER] Failed to persist state:', error);
    }
  }

  /**
   * Load persisted state
   */
  private async loadPersistedState(): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }

      const stateJson = localStorage.getItem(this.persistenceKey);
      if (!stateJson) {
        return;
      }

      const state = JSON.parse(stateJson);

      // Restore tracker
      this.tracker = {
        ...state.tracker,
        recommendations: new Map(state.tracker.recommendations)
      };

      // Restore event log
      this.eventLog = state.eventLog || [];

      console.log('[DISPOSITION-TRACKER] Persisted state loaded');
    } catch (error) {
      console.error('[DISPOSITION-TRACKER] Failed to load persisted state:', error);
    }
  }

  /**
   * Clean up old dispositions based on retention period
   */
  public async cleanupOldDispositions(): Promise<number> {
    const cutoffDate = new Date(Date.now() - this.retentionPeriod);
    let cleanedCount = 0;

    for (const [recommendationId, disposition] of this.tracker.recommendations.entries()) {
      if (disposition.dispositionedAt < cutoffDate) {
        this.tracker.recommendations.delete(recommendationId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.tracker.updatedAt = new Date();
      await this.persistState();
      console.log(`[DISPOSITION-TRACKER] Cleaned up ${cleanedCount} old dispositions`);
    }

    return cleanedCount;
  }

  /**
   * Log an event
   */
  private logEvent(type: RecommendationEventType, data: Record<string, any>): void {
    const event: RecommendationEvent = {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      data
    };

    this.eventLog.push(event);
  }

  /**
   * Create error object
   */
  private createError(code: string, message: string): RecommendationSystemError {
    return {
      code,
      message,
      timestamp: new Date(),
      recoverable: false
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Get event log
   */
  public getEventLog(): RecommendationEvent[] {
    return [...this.eventLog];
  }

  /**
   * Shutdown disposition tracker
   */
  public async shutdown(): Promise<void> {
    console.log('[DISPOSITION-TRACKER] Shutting down disposition tracker');

    // Persist final state
    await this.persistState();

    console.log('[DISPOSITION-TRACKER] Disposition tracker shutdown complete');
  }
}
