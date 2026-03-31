/**
 * aidefence Affiliate Security Integration
 * @module integrations/aidefence/affiliate_security
 *
 * Provides security monitoring and anomaly detection for affiliate activities.
 * Integrates with ROAM tracker for automated risk flagging.
 */

import { EventEmitter } from 'events';
import { AffiliateStateTracker } from '../../affiliate/AffiliateStateTracker';
import { RoamStatus } from '../../affiliate/types';

// =============================================================================
// Configuration
// =============================================================================

export interface SecurityConfig {
  rapidStatusChangeThreshold: number;  // Max status changes in window
  rapidStatusChangeWindowMs: number;   // Time window for status changes
  unusualAffinityThreshold: number;    // Affinity score spike threshold
  bulkOperationThreshold: number;      // Max bulk operations per minute
  alertCooldownMs: number;             // Cooldown between duplicate alerts
  enableAutoRiskCreation: boolean;     // Auto-create ROAM risks
}

const DEFAULT_CONFIG: SecurityConfig = {
  rapidStatusChangeThreshold: 5,
  rapidStatusChangeWindowMs: 300000,  // 5 minutes
  unusualAffinityThreshold: 0.5,      // 50% score change
  bulkOperationThreshold: 100,
  alertCooldownMs: 60000,             // 1 minute
  enableAutoRiskCreation: true,
};

// =============================================================================
// Security Alert Types
// =============================================================================

export type SecurityAlertType =
  | 'rapid_status_change'
  | 'unusual_affinity_spike'
  | 'bulk_operation_detected'
  | 'suspicious_pattern'
  | 'unauthorized_access_attempt';

export interface SecurityAlert {
  alertId: string;
  alertType: SecurityAlertType;
  affiliateId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, unknown>;
  timestamp: Date;
  roamRiskId?: string;
}

// =============================================================================
// Affiliate Security Monitor
// =============================================================================

export class AffiliateSecurityMonitor extends EventEmitter {
  private config: SecurityConfig;
  private tracker: AffiliateStateTracker;
  private statusChangeHistory: Map<string, Date[]> = new Map();
  private affinityHistory: Map<string, number[]> = new Map();
  private operationCounts: Map<string, { count: number; windowStart: Date }> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private alerts: SecurityAlert[] = [];

  constructor(tracker: AffiliateStateTracker, config: Partial<SecurityConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tracker = tracker;
    this.setupEventListeners();
  }

  // ===========================================================================
  // Event Listeners
  // ===========================================================================

  private setupEventListeners(): void {
    // Listen for status transitions - bind this context
    this.tracker.onEvent('status_transition', (event) => {
      this.checkRapidStatusChange(event.affiliateId, event.data.to as string);
    });

    // Listen for affinity updates - bind this context
    this.tracker.onEvent('affinity_updated', (event) => {
      const data = event.data as { affiliateId2: string; score: number };
      this.checkUnusualAffinitySpike(event.affiliateId, data.affiliateId2, data.score);
    });

    // Listen for affiliate creation (bulk operation detection) - bind this context
    this.tracker.onEvent('state_created', (event) => {
      this.handleBulkOperation(event.affiliateId, 'create');
    });
  }

  private handleBulkOperation(affiliateId: string, operationType: string): void {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60000); // 1 minute window

    const current = this.operationCounts.get(operationType) || { count: 0, windowStart: now };

    if (current.windowStart < windowStart) {
      // Reset window
      this.operationCounts.set(operationType, { count: 1, windowStart: now });
    } else {
      current.count++;
      this.operationCounts.set(operationType, current);

      if (current.count >= this.config.bulkOperationThreshold) {
        this.createAlert({
          alertType: 'bulk_operation_detected',
          affiliateId,
          severity: 'medium',
          description: `Bulk ${operationType} detected: ${current.count} operations in 1 minute`,
          evidence: { operationType, count: current.count },
        });
      }
    }
  }

  // ===========================================================================
  // Security Checks
  // ===========================================================================

  private checkRapidStatusChange(affiliateId: string, _newStatus: string): void {
    const now = new Date();
    const history = this.statusChangeHistory.get(affiliateId) || [];

    // Add current change
    history.push(now);

    // Filter to window
    const windowStart = new Date(now.getTime() - this.config.rapidStatusChangeWindowMs);
    const recentChanges = history.filter(d => d >= windowStart);
    this.statusChangeHistory.set(affiliateId, recentChanges);

    if (recentChanges.length >= this.config.rapidStatusChangeThreshold) {
      this.createAlert({
        alertType: 'rapid_status_change',
        affiliateId,
        severity: 'high',
        description: `Affiliate ${affiliateId} had ${recentChanges.length} status changes in ${this.config.rapidStatusChangeWindowMs / 1000}s`,
        evidence: { changeCount: recentChanges.length, windowMs: this.config.rapidStatusChangeWindowMs },
      });
    }
  }

  private checkUnusualAffinitySpike(
    affiliateId1: string,
    affiliateId2: string,
    newScore: number
  ): void {
    const key = `${affiliateId1}:${affiliateId2}`;
    const history = this.affinityHistory.get(key) || [];

    if (history.length > 0) {
      const lastScore = history[history.length - 1];
      const change = Math.abs(newScore - lastScore);

      if (change >= this.config.unusualAffinityThreshold) {
        this.createAlert({
          alertType: 'unusual_affinity_spike',
          affiliateId: affiliateId1,
          severity: 'medium',
          description: `Affinity score between ${affiliateId1} and ${affiliateId2} changed by ${(change * 100).toFixed(1)}%`,
          evidence: { previousScore: lastScore, newScore, change, relatedAffiliate: affiliateId2 },
        });
      }
    }

    history.push(newScore);
    if (history.length > 10) history.shift();
    this.affinityHistory.set(key, history);
  }


  // ===========================================================================
  // Alert Management
  // ===========================================================================

  private createAlert(params: Omit<SecurityAlert, 'alertId' | 'timestamp' | 'roamRiskId'>): void {
    const cooldownKey = `${params.alertType}:${params.affiliateId}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey);
    const now = new Date();

    if (lastAlert && now.getTime() - lastAlert.getTime() < this.config.alertCooldownMs) {
      return; // Still in cooldown
    }

    const alert: SecurityAlert = {
      ...params,
      alertId: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      timestamp: now,
    };

    // Auto-create ROAM risk if enabled
    if (this.config.enableAutoRiskCreation) {
      const riskId = this.createRoamRisk(alert);
      alert.roamRiskId = riskId;
    }

    this.alerts.push(alert);
    this.alertCooldowns.set(cooldownKey, now);
    this.emit('security:alert', alert);
  }

  private createRoamRisk(alert: SecurityAlert): string {
    const risk = this.tracker.createRisk({
      affiliateId: alert.affiliateId,
      riskType: 'security',
      severity: alert.severity,
      roamStatus: 'owned' as RoamStatus,
      description: alert.description,
      mitigationPlan: this.getMitigationPlan(alert.alertType),
      owner: 'security_monitor',
      evidence: { alertId: alert.alertId, ...alert.evidence },
    });

    const riskId = `risk_${risk.id}`;
    this.emit('roam:risk_created', { riskId, alert });
    return riskId;
  }

  private getMitigationPlan(alertType: SecurityAlertType): string {
    const plans: Record<SecurityAlertType, string> = {
      rapid_status_change: 'Review affiliate activity logs. Verify legitimate use case or suspend pending investigation.',
      unusual_affinity_spike: 'Audit affinity relationship. Check for manipulation or data quality issues.',
      bulk_operation_detected: 'Review operation source. Verify automation is authorized. Rate limit if necessary.',
      suspicious_pattern: 'Conduct full security audit. Review access logs and activity patterns.',
      unauthorized_access_attempt: 'Immediately suspend access. Investigate source. Report to security team.',
    };
    return plans[alertType];
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  getAlerts(since?: Date): SecurityAlert[] {
    if (since) {
      return this.alerts.filter(a => a.timestamp >= since);
    }
    return [...this.alerts];
  }

  getAlertsByAffiliate(affiliateId: string): SecurityAlert[] {
    return this.alerts.filter(a => a.affiliateId === affiliateId);
  }

  getAlertsBySeverity(severity: SecurityAlert['severity']): SecurityAlert[] {
    return this.alerts.filter(a => a.severity === severity);
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  getSecurityMetrics(): {
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
    affiliatesWithAlerts: number;
  } {
    const alertsBySeverity: Record<string, number> = {};
    const alertsByType: Record<string, number> = {};
    const affiliatesWithAlerts = new Set<string>();

    for (const alert of this.alerts) {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      alertsByType[alert.alertType] = (alertsByType[alert.alertType] || 0) + 1;
      affiliatesWithAlerts.add(alert.affiliateId);
    }

    return {
      totalAlerts: this.alerts.length,
      alertsBySeverity,
      alertsByType,
      affiliatesWithAlerts: affiliatesWithAlerts.size,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createSecurityMonitor(
  tracker: AffiliateStateTracker,
  config?: Partial<SecurityConfig>
): AffiliateSecurityMonitor {
  return new AffiliateSecurityMonitor(tracker, config);
}
