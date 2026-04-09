/**
 * Recommendation Queue Management System
 *
 * Implements priority-based queue management with state management,
 * persistence, recovery, and health monitoring for automated
 * recommendation execution.
 *
 * Applies Manthra: Directed thought-power for logical separation
 * Applies Yasna: Disciplined alignment through consistent interfaces
 * Applies Mithra: Binding force preventing code drift through centralized state
 */

import {
  Recommendation,
  RecommendationQueue,
  QueuedRecommendation,
  QueueStatus,
  PriorityStrategy,
  QueueHealthStatus,
  QueueHealthIssue,
  RecommendationSystemError,
  RecommendationEvent,
  RecommendationEventType,
  RecommendationSystemConfig
} from './recommendation-types';
import { WSJFCalculator } from '../wsjf/calculator';
import { WSJFResult, WSJFCalculationParams, WSJFWeightingFactors } from '../wsjf/types';

export class RecommendationQueueManager {
  private queue: RecommendationQueue;
  private wsjfCalculator: WSJFCalculator;
  private eventLog: RecommendationEvent[] = [];
  private persistenceKey = 'recommendation-queue';
  private healthCheckInterval?: NodeJS.Timeout;
  private processingInterval?: NodeJS.Timeout;
  private isProcessing = false;
  private config: RecommendationSystemConfig['queue'];

  constructor(
    wsjfCalculator: WSJFCalculator,
    config?: Partial<RecommendationSystemConfig['queue']>
  ) {
    this.wsjfCalculator = wsjfCalculator;
    this.config = {
      maxCapacity: config?.maxCapacity ?? 1000,
      processingInterval: config?.processingInterval ?? 60000, // 1 minute
      priorityStrategy: config?.priorityStrategy ?? 'wsjf',
      healthCheckInterval: config?.healthCheckInterval ?? 300000 // 5 minutes
    };

    this.queue = this.createQueue();
    this.initialize();
  }

  /**
   * Create a new recommendation queue
   */
  private createQueue(): RecommendationQueue {
    return {
      id: 'default-recommendation-queue',
      name: 'Default Recommendation Queue',
      description: 'Priority-based queue for automated recommendation execution',
      recommendations: new Map(),
      maxCapacity: this.config.maxCapacity,
      currentCapacity: 0,
      status: 'active',
      priorityStrategy: this.config.priorityStrategy,
      createdAt: new Date(),
      updatedAt: new Date(),
      processingInterval: this.config.processingInterval,
      healthStatus: {
        status: 'healthy',
        throughput: 0,
        averageWaitTime: 0,
        failureRate: 0,
        blockedCount: 0,
        lastHealthCheck: new Date(),
        issues: []
      }
    };
  }

  /**
   * Initialize the queue manager
   */
  private async initialize(): Promise<void> {
    console.log('[RECOMMENDATION-QUEUE] Initializing queue manager');

    try {
      // Load persisted state
      await this.loadPersistedState();

      // Start health checks
      this.startHealthChecks();

      // Start processing
      this.startProcessing();

      console.log('[RECOMMENDATION-QUEUE] Queue manager initialized successfully');
    } catch (error) {
      console.error('[RECOMMENDATION-QUEUE] Initialization failed:', error);
      throw this.createError('INITIALIZATION_FAILED', `Queue manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Add a recommendation to the queue
   */
  public async enqueue(recommendation: Recommendation): Promise<void> {
    try {
      // Validate recommendation
      this.validateRecommendation(recommendation);

      // Check queue capacity
      if (this.queue.currentCapacity >= this.queue.maxCapacity) {
        throw this.createError('QUEUE_FULL', 'Queue is at maximum capacity');
      }

      // Calculate WSJF score if not already calculated
      if (!recommendation.wsjfScore && this.queue.priorityStrategy === 'wsjf') {
        recommendation.wsjfResult = await this.calculateWSJF(recommendation);
        recommendation.wsjfScore = recommendation.wsjfResult.wsjfScore;
      }

      // Create queued recommendation
      const queuedRec: QueuedRecommendation = {
        recommendation,
        queuePosition: this.queue.recommendations.size + 1,
        queuedAt: new Date(),
        retryCount: 0
      };

      // Add to queue
      this.queue.recommendations.set(recommendation.id, queuedRec);
      this.queue.currentCapacity++;

      // Update recommendation status
      recommendation.status = 'queued';
      recommendation.queueStatus = 'pending';
      recommendation.updatedAt = new Date();

      // Reorder queue based on priority strategy
      this.reorderQueue();

      // Update queue metadata
      this.queue.updatedAt = new Date();

      // Log event
      this.logEvent('recommendation_queued', {
        recommendationId: recommendation.id,
        queuePosition: queuedRec.queuePosition,
        wsjfScore: recommendation.wsjfScore
      });

      // Persist state
      await this.persistState();

      console.log(`[RECOMMENDATION-QUEUE] Enqueued recommendation ${recommendation.id} at position ${queuedRec.queuePosition}`);
    } catch (error) {
      console.error('[RECOMMENDATION-QUEUE] Failed to enqueue recommendation:', error);
      throw error;
    }
  }

  /**
   * Remove a recommendation from the queue
   */
  public async dequeue(recommendationId: string): Promise<Recommendation | null> {
    try {
      const queuedRec = this.queue.recommendations.get(recommendationId);
      if (!queuedRec) {
        return null;
      }

      // Remove from queue
      this.queue.recommendations.delete(recommendationId);
      this.queue.currentCapacity--;

      // Reorder remaining recommendations
      this.reorderQueue();

      // Update queue metadata
      this.queue.updatedAt = new Date();

      // Log event
      this.logEvent('recommendation_dequeued', {
        recommendationId,
        waitTime: Date.now() - queuedRec.queuedAt.getTime()
      });

      // Persist state
      await this.persistState();

      console.log(`[RECOMMENDATION-QUEUE] Dequeued recommendation ${recommendationId}`);
      return queuedRec.recommendation;
    } catch (error) {
      console.error('[RECOMMENDATION-QUEUE] Failed to dequeue recommendation:', error);
      throw error;
    }
  }

  /**
   * Get the next recommendation to process
   */
  public async getNextRecommendation(): Promise<Recommendation | null> {
    try {
      if (this.queue.recommendations.size === 0) {
        return null;
      }

      // Get first recommendation in queue
      const [recommendationId, queuedRec] = Array.from(this.queue.recommendations.entries())[0];

      // Update recommendation status
      queuedRec.recommendation.status = 'in_progress';
      queuedRec.recommendation.queueStatus = 'in_progress';
      queuedRec.recommendation.startedAt = new Date();
      queuedRec.recommendation.updatedAt = new Date();

      // Update queue metadata
      this.queue.lastProcessedAt = new Date();
      this.queue.updatedAt = new Date();

      // Log event
      this.logEvent('recommendation_started', {
        recommendationId,
        waitTime: Date.now() - queuedRec.queuedAt.getTime()
      });

      // Persist state
      await this.persistState();

      console.log(`[RECOMMENDATION-QUEUE] Processing recommendation ${recommendationId}`);
      return queuedRec.recommendation;
    } catch (error) {
      console.error('[RECOMMENDATION-QUEUE] Failed to get next recommendation:', error);
      throw error;
    }
  }

  /**
   * Update recommendation status in queue
   */
  public async updateRecommendationStatus(
    recommendationId: string,
    status: QueueStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const queuedRec = this.queue.recommendations.get(recommendationId);
      if (!queuedRec) {
        throw this.createError('RECOMMENDATION_NOT_FOUND', `Recommendation ${recommendationId} not found in queue`);
      }

      // Update status
      queuedRec.recommendation.queueStatus = status;
      queuedRec.recommendation.updatedAt = new Date();

      // Handle status-specific logic
      if (status === 'completed') {
        queuedRec.recommendation.status = 'completed';
        queuedRec.recommendation.completedAt = new Date();
        await this.dequeue(recommendationId);
      } else if (status === 'failed') {
        queuedRec.recommendation.status = 'failed';
        queuedRec.lastAttempt = new Date();
        queuedRec.retryCount++;
        this.queue.healthStatus.failureRate = this.calculateFailureRate();
      } else if (status === 'blocked') {
        queuedRec.recommendation.status = 'blocked';
        queuedRec.recommendation.blockedAt = new Date();
        this.queue.healthStatus.blockedCount++;
      }

      // Apply metadata if provided
      if (metadata) {
        queuedRec.recommendation.metadata = { ...queuedRec.recommendation.metadata, ...metadata };
      }

      // Update queue metadata
      this.queue.updatedAt = new Date();

      // Log event
      this.logEvent('recommendation_updated', {
        recommendationId,
        status,
        metadata
      });

      // Persist state
      await this.persistState();
    } catch (error) {
      console.error('[RECOMMENDATION-QUEUE] Failed to update recommendation status:', error);
      throw error;
    }
  }

  /**
   * Reorder queue based on priority strategy
   */
  private reorderQueue(): void {
    const recommendations = Array.from(this.queue.recommendations.values());

    switch (this.queue.priorityStrategy) {
      case 'wsjf':
        // Sort by WSJF score (highest first)
        recommendations.sort((a, b) => {
          const scoreA = a.recommendation.wsjfScore ?? 0;
          const scoreB = b.recommendation.wsjfScore ?? 0;
          return scoreB - scoreA;
        });
        break;

      case 'priority_based':
        // Sort by priority level
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        recommendations.sort((a, b) => {
          const priorityA = priorityOrder[a.recommendation.priority] ?? 4;
          const priorityB = priorityOrder[b.recommendation.priority] ?? 4;
          return priorityA - priorityB;
        });
        break;

      case 'risk_aware':
        // Sort by risk level (highest risk first)
        const riskOrder = { high: 0, medium: 1, low: 2 };
        recommendations.sort((a, b) => {
          const riskA = riskOrder[a.recommendation.riskLevel] ?? 3;
          const riskB = riskOrder[b.recommendation.riskLevel] ?? 3;
          return riskA - riskB;
        });
        break;

      case 'fifo':
      default:
        // Sort by queue time (first in, first out)
        recommendations.sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime());
        break;
    }

    // Rebuild map with new positions
    this.queue.recommendations.clear();
    recommendations.forEach((queuedRec, index) => {
      queuedRec.queuePosition = index + 1;
      this.queue.recommendations.set(queuedRec.recommendation.id, queuedRec);
    });
  }

  /**
   * Calculate WSJF score for a recommendation
   */
  private async calculateWSJF(recommendation: Recommendation): Promise<WSJFResult> {
    const params: WSJFCalculationParams = {
      userBusinessValue: recommendation.expectedImpact * 100,
      timeCriticality: this.getTimeCriticality(recommendation),
      customerValue: recommendation.confidence * 100,
      jobSize: recommendation.estimatedEffort,
      riskReduction: this.getRiskReduction(recommendation),
      opportunityEnablement: this.getOpportunityEnablement(recommendation)
    };

    return this.wsjfCalculator.calculateWSJF(recommendation.id, params);
  }

  /**
   * Get time criticality based on priority
   */
  private getTimeCriticality(recommendation: Recommendation): number {
    const criticalityMap = { critical: 100, high: 75, medium: 50, low: 25 };
    return criticalityMap[recommendation.priority] ?? 50;
  }

  /**
   * Get risk reduction based on risk level
   */
  private getRiskReduction(recommendation: Recommendation): number {
    const riskMap = { high: 100, medium: 50, low: 25 };
    return riskMap[recommendation.riskLevel] ?? 50;
  }

  /**
   * Get opportunity enablement based on recommendation type
   */
  private getOpportunityEnablement(recommendation: Recommendation): number {
    const opportunityMap = {
      optimization: 75,
      security: 100,
      performance: 75,
      governance: 50,
      operational: 50,
      technical_debt: 60
    };
    return opportunityMap[recommendation.type] ?? 50;
  }

  /**
   * Validate recommendation before enqueuing
   */
  private validateRecommendation(recommendation: Recommendation): void {
    if (!recommendation.id) {
      throw this.createError('INVALID_RECOMMENDATION', 'Recommendation must have an ID');
    }

    if (!recommendation.title || !recommendation.description) {
      throw this.createError('INVALID_RECOMMENDATION', 'Recommendation must have title and description');
    }

    if (recommendation.confidence < 0 || recommendation.confidence > 1) {
      throw this.createError('INVALID_RECOMMENDATION', 'Confidence must be between 0 and 1');
    }

    if (recommendation.estimatedEffort <= 0) {
      throw this.createError('INVALID_RECOMMENDATION', 'Estimated effort must be greater than 0');
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on queue
   */
  private performHealthCheck(): void {
    console.log('[RECOMMENDATION-QUEUE] Performing health check');

    const healthStatus = this.queue.healthStatus;
    const issues: QueueHealthIssue[] = [];

    // Check failure rate
    if (healthStatus.failureRate > 0.2) {
      issues.push({
        id: this.generateId('health-issue'),
        severity: healthStatus.failureRate > 0.5 ? 'critical' : 'medium',
        type: 'high_failure_rate',
        message: `Failure rate is ${(healthStatus.failureRate * 100).toFixed(1)}%`,
        detectedAt: new Date()
      });
    }

    // Check blocked recommendations
    if (healthStatus.blockedCount > 10) {
      issues.push({
        id: this.generateId('health-issue'),
        severity: healthStatus.blockedCount > 50 ? 'critical' : 'medium',
        type: 'high_blocked_count',
        message: `${healthStatus.blockedCount} recommendations are blocked`,
        detectedAt: new Date()
      });
    }

    // Check queue capacity
    const capacityUtilization = this.queue.currentCapacity / this.queue.maxCapacity;
    if (capacityUtilization > 0.9) {
      issues.push({
        id: this.generateId('health-issue'),
        severity: 'high',
        type: 'high_capacity_utilization',
        message: `Queue is ${(capacityUtilization * 100).toFixed(1)}% full`,
        detectedAt: new Date()
      });
    }

    // Calculate throughput
    const throughput = this.calculateThroughput();
    healthStatus.throughput = throughput;

    // Calculate average wait time
    const averageWaitTime = this.calculateAverageWaitTime();
    healthStatus.averageWaitTime = averageWaitTime;

    // Update health status
    healthStatus.issues = issues;
    healthStatus.lastHealthCheck = new Date();

    // Determine overall health
    if (issues.some(i => i.severity === 'critical')) {
      healthStatus.status = 'critical';
    } else if (issues.some(i => i.severity === 'high') || issues.length > 3) {
      healthStatus.status = 'degraded';
    } else {
      healthStatus.status = 'healthy';
    }

    // Log event
    this.logEvent('queue_health_check', {
      status: healthStatus.status,
      throughput,
      averageWaitTime,
      failureRate: healthStatus.failureRate,
      blockedCount: healthStatus.blockedCount,
      issuesCount: issues.length
    });

    console.log(`[RECOMMENDATION-QUEUE] Health check complete: ${healthStatus.status}`);
  }

  /**
   * Calculate throughput (recommendations processed per hour)
   */
  private calculateThroughput(): number {
    const oneHourAgo = Date.now() - 3600000;
    const recentEvents = this.eventLog.filter(
      e => e.type === 'recommendation_completed' && e.timestamp.getTime() > oneHourAgo
    );
    return recentEvents.length;
  }

  /**
   * Calculate failure rate
   */
  private calculateFailureRate(): number {
    const totalExecutions = this.eventLog.filter(
      e => e.type === 'recommendation_completed' || e.type === 'recommendation_failed'
    ).length;

    const failures = this.eventLog.filter(
      e => e.type === 'recommendation_failed'
    ).length;

    return totalExecutions > 0 ? failures / totalExecutions : 0;
  }

  /**
   * Calculate average wait time
   */
  private calculateAverageWaitTime(): number {
    if (this.queue.recommendations.size === 0) {
      return 0;
    }

    const waitTimes = Array.from(this.queue.recommendations.values()).map(
      rec => Date.now() - rec.queuedAt.getTime()
    );

    return waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;
  }

  /**
   * Start processing queue
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.config.processingInterval);
  }

  /**
   * Process queue (to be called by execution engine)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.status !== 'active') {
      return;
    }

    this.isProcessing = true;

    try {
      const nextRec = await this.getNextRecommendation();
      if (nextRec) {
        // Execution will be handled by execution engine
        console.log(`[RECOMMENDATION-QUEUE] Ready to process recommendation ${nextRec.id}`);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Persist queue state
   */
  private async persistState(): Promise<void> {
    try {
      const state = {
        queue: {
          ...this.queue,
          recommendations: Array.from(this.queue.recommendations.entries())
        },
        eventLog: this.eventLog.slice(-100) // Keep last 100 events
      };

      // In production, this would persist to a database
      // For now, we'll use localStorage if available
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.persistenceKey, JSON.stringify(state));
      }

      console.log('[RECOMMENDATION-QUEUE] State persisted');
    } catch (error) {
      console.error('[RECOMMENDATION-QUEUE] Failed to persist state:', error);
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

      // Restore queue
      this.queue = {
        ...state.queue,
        recommendations: new Map(state.queue.recommendations)
      };

      // Restore event log
      this.eventLog = state.eventLog || [];

      console.log('[RECOMMENDATION-QUEUE] Persisted state loaded');
    } catch (error) {
      console.error('[RECOMMENDATION-QUEUE] Failed to load persisted state:', error);
    }
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
   * Get queue status
   */
  public getQueueStatus(): RecommendationQueue {
    return {
      ...this.queue,
      recommendations: new Map(this.queue.recommendations)
    };
  }

  /**
   * Get health status
   */
  public getHealthStatus(): QueueHealthStatus {
    return { ...this.queue.healthStatus };
  }

  /**
   * Get queued recommendations
   */
  public getQueuedRecommendations(): QueuedRecommendation[] {
    return Array.from(this.queue.recommendations.values());
  }

  /**
   * Get recommendation by ID
   */
  public getRecommendation(recommendationId: string): Recommendation | null {
    const queuedRec = this.queue.recommendations.get(recommendationId);
    return queuedRec?.recommendation ?? null;
  }

  /**
   * Pause queue processing
   */
  public pause(): void {
    this.queue.status = 'paused';
    this.queue.updatedAt = new Date();
    console.log('[RECOMMENDATION-QUEUE] Queue paused');
  }

  /**
   * Resume queue processing
   */
  public resume(): void {
    this.queue.status = 'active';
    this.queue.updatedAt = new Date();
    console.log('[RECOMMENDATION-QUEUE] Queue resumed');
  }

  /**
   * Clear queue
   */
  public async clear(): Promise<void> {
    this.queue.recommendations.clear();
    this.queue.currentCapacity = 0;
    this.queue.updatedAt = new Date();
    await this.persistState();
    console.log('[RECOMMENDATION-QUEUE] Queue cleared');
  }

  /**
   * Shutdown queue manager
   */
  public async shutdown(): Promise<void> {
    console.log('[RECOMMENDATION-QUEUE] Shutting down queue manager');

    // Stop intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Persist final state
    await this.persistState();

    console.log('[RECOMMENDATION-QUEUE] Queue manager shutdown complete');
  }

  /**
   * Get event log
   */
  public getEventLog(): RecommendationEvent[] {
    return [...this.eventLog];
  }

  /**
   * Get queue metrics
   */
  public getMetrics(): {
    totalRecommendations: number;
    byStatus: Record<QueueStatus, number>;
    byPriority: Record<Recommendation['priority'], number>;
    averageWSJFScore: number;
    healthStatus: QueueHealthStatus;
  } {
    const recommendations = Array.from(this.queue.recommendations.values());
    const byStatus: Record<QueueStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      blocked: 0
    };

    const byPriority: Record<Recommendation['priority'], number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    let totalWSJFScore = 0;
    let wsjfCount = 0;

    recommendations.forEach(queuedRec => {
      const rec = queuedRec.recommendation;
      if (rec.queueStatus) {
        byStatus[rec.queueStatus]++;
      }
      byPriority[rec.priority]++;
      if (rec.wsjfScore !== undefined) {
        totalWSJFScore += rec.wsjfScore;
        wsjfCount++;
      }
    });

    return {
      totalRecommendations: recommendations.length,
      byStatus,
      byPriority,
      averageWSJFScore: wsjfCount > 0 ? totalWSJFScore / wsjfCount : 0,
      healthStatus: this.getHealthStatus()
    };
  }
}
