/**
 * Redundancy Manager Module
 *
 * Manages redundant copies of critical health metrics
 * and coordinates error correction across them
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import {
  RedundancyConfig,
  RedundantMetricCopy,
  ErrorRateStats,
  ErrorCorrectionEvent
} from './types';

/**
 * Redundancy Manager
 * Manages redundant metric copies and coordinates error correction
 */
export class RedundancyManager extends EventEmitter {
  private configs: Map<string, RedundancyConfig> = new Map();
  private copies: Map<string, RedundantMetricCopy[]> = new Map();
  private errorStats: Map<string, ErrorRateStats[]> = new Map();
  private eventHistory: ErrorCorrectionEvent[] = [];

  /**
   * Configure redundancy for a metric
   */
  public configureRedundancy(config: RedundancyConfig): void {
    this.configs.set(config.metricId, config);
    
    // Initialize copies array
    if (!this.copies.has(config.metricId)) {
      this.copies.set(config.metricId, []);
    }

    this.emit('redundancyConfigured', {
      metricId: config.metricId,
      config,
      timestamp: new Date()
    });
  }

  /**
   * Get redundancy configuration for a metric
   */
  public getRedundancyConfig(metricId: string): RedundancyConfig | undefined {
    return this.configs.get(metricId);
  }

  /**
   * Add a redundant copy of a metric
   */
  public addCopy(copy: RedundantMetricCopy): void {
    const metricId = copy.metricId;
    
    if (!this.copies.has(metricId)) {
      this.copies.set(metricId, []);
    }

    const copies = this.copies.get(metricId)!;
    
    // Calculate hash for integrity verification
    if (!copy.hash) {
      copy.hash = this.calculateHash(copy.value);
    }

    copies.push(copy);

    // Maintain redundancy level
    const config = this.configs.get(metricId);
    if (config && copies.length > config.redundancyLevel) {
      // Remove oldest copy
      copies.shift();
    }

    this.emit('copyAdded', {
      metricId,
      copy,
      timestamp: new Date()
    });
  }

  /**
   * Get all copies for a metric
   */
  public getCopies(metricId: string): RedundantMetricCopy[] {
    return this.copies.get(metricId) || [];
  }

  /**
   * Get valid copies for a metric
   */
  public getValidCopies(metricId: string): RedundantMetricCopy[] {
    return this.getCopies(metricId).filter(c => c.valid);
  }

  /**
   * Invalidate a copy
   */
  public invalidateCopy(metricId: string, copyId: string): void {
    const copies = this.copies.get(metricId);
    if (!copies) {
      return;
    }

    const copy = copies.find(c => c.copyId === copyId);
    if (copy) {
      copy.valid = false;
      this.emit('copyInvalidated', {
        metricId,
        copyId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Verify integrity of a copy using hash
   */
  public verifyCopy(copy: RedundantMetricCopy): boolean {
    if (!copy.hash) {
      return true;
    }

    const expectedHash = this.calculateHash(copy.value);
    return expectedHash === copy.hash;
  }

  /**
   * Calculate hash of a value
   */
  private calculateHash(value: any): string {
    const str = JSON.stringify(value);
    return createHash('sha256').update(str).digest('hex');
  }

  /**
   * Record error statistics
   */
  public recordErrorStats(stats: ErrorRateStats): void {
    const metricId = stats.metricId;
    
    if (!this.errorStats.has(metricId)) {
      this.errorStats.set(metricId, []);
    }

    const history = this.errorStats.get(metricId)!;
    history.push(stats);

    // Keep only last 100 stats
    if (history.length > 100) {
      history.shift();
    }

    this.emit('errorStatsRecorded', {
      metricId,
      stats,
      timestamp: new Date()
    });
  }

  /**
   * Get error statistics for a metric
   */
  public getErrorStats(metricId: string): ErrorRateStats | undefined {
    const history = this.errorStats.get(metricId);
    if (!history || history.length === 0) {
      return undefined;
    }

    return history[history.length - 1];
  }

  /**
   * Get error rate for a metric
   */
  public getErrorRate(metricId: string): number {
    const stats = this.getErrorStats(metricId);
    return stats ? stats.errorRate : 0;
  }

  /**
   * Get correction rate for a metric
   */
  public getCorrectionRate(metricId: string): number {
    const stats = this.getErrorStats(metricId);
    return stats ? stats.correctionRate : 0;
  }

  /**
   * Calculate error statistics from history
   */
  public calculateErrorStats(
    metricId: string,
    windowStart: Date,
    windowEnd: Date
  ): ErrorRateStats {
    const copies = this.getCopies(metricId);
    const validCopies = copies.filter(c => c.valid);
    
    // In a real implementation, you'd track actual errors
    // For now, we'll calculate based on invalid copies
    const totalChecks = copies.length;
    const errorsDetected = copies.filter(c => !c.valid).length;
    const errorsCorrected = Math.floor(errorsDetected * 0.8); // Assume 80% correctable
    const errorsUncorrectable = errorsDetected - errorsCorrected;

    const errorRate = totalChecks > 0 ? errorsDetected / totalChecks : 0;
    const correctionRate = errorsDetected > 0 ? errorsCorrected / errorsDetected : 1;
    const averageConfidence = 0.85; // Placeholder

    const stats: ErrorRateStats = {
      metricId,
      totalChecks,
      errorsDetected,
      errorsCorrected,
      errorsUncorrectable,
      errorRate,
      correctionRate,
      averageConfidence,
      windowStart,
      windowEnd
    };

    this.recordErrorStats(stats);
    return stats;
  }

  /**
   * Log error correction event
   */
  public logEvent(event: ErrorCorrectionEvent): void {
    this.eventHistory.push(event);

    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory.shift();
    }

    this.emit('eventLogged', {
      event,
      timestamp: new Date()
    });
  }

  /**
   * Get event history
   */
  public getEventHistory(metricId?: string): ErrorCorrectionEvent[] {
    if (metricId) {
      return this.eventHistory.filter(e => e.metricId === metricId);
    }
    return [...this.eventHistory];
  }

  /**
   * Get events by type
   */
  public getEventsByType(eventType: ErrorCorrectionEvent['eventType']): ErrorCorrectionEvent[] {
    return this.eventHistory.filter(e => e.eventType === eventType);
  }

  /**
   * Get events by severity
   */
  public getEventsBySeverity(severity: ErrorCorrectionEvent['severity']): ErrorCorrectionEvent[] {
    return this.eventHistory.filter(e => e.severity === severity);
  }

  /**
   * Clear event history
   */
  public clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get all configured metrics
   */
  public getConfiguredMetrics(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Get critical metrics
   */
  public getCriticalMetrics(): string[] {
    return Array.from(this.configs.entries())
      .filter(([_, config]) => config.critical)
      .map(([metricId, _]) => metricId);
  }

  /**
   * Remove redundancy configuration for a metric
   */
  public removeRedundancy(metricId: string): void {
    this.configs.delete(metricId);
    this.copies.delete(metricId);
    this.errorStats.delete(metricId);

    this.emit('redundancyRemoved', {
      metricId,
      timestamp: new Date()
    });
  }

  /**
   * Get redundancy summary
   */
  public getSummary(): {
    totalMetrics: number;
    totalCopies: number;
    criticalMetrics: number;
    averageRedundancy: number;
    totalEvents: number;
  } {
    const totalMetrics = this.configs.size;
    const totalCopies = Array.from(this.copies.values())
      .reduce((sum, copies) => sum + copies.length, 0);
    const criticalMetrics = this.getCriticalMetrics().length;
    const averageRedundancy = totalMetrics > 0 
      ? totalCopies / totalMetrics 
      : 0;
    const totalEvents = this.eventHistory.length;

    return {
      totalMetrics,
      totalCopies,
      criticalMetrics,
      averageRedundancy,
      totalEvents
    };
  }
}
