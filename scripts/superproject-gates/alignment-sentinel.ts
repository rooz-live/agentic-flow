/**
 * Alignment Sentinel System
 *
 * Independently validates the health of the monitoring stack
 * Automatically escalates when critical drift or alignment degradation is detected
 *
 * @module monitoring/alignment-sentinel
 */

import { AlertRouter, Alert, AlertSeverity } from './alert-router';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Configuration
// ============================================================================

export interface AlignmentSentinelConfig {
  /** Health check interval in seconds */
  healthCheckInterval: number;
  /** Drift detection threshold (0-1) */
  driftDetectionThreshold: number;
  /** Escalation thresholds */
  escalationThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  /** Enable automatic escalation */
  autoEscalationEnabled: boolean;
  /** Monitoring components to track */
  monitoredComponents: string[];
}

export interface AlignmentScore {
  /** Overall alignment score (0-1) */
  overall: number;
  /** Component-specific scores */
  components: {
    [componentName: string]: number;
  };
  /** Timestamp */
  timestamp: Date;
}

export interface DriftDetection {
  /** Component name */
  component: string;
  /** Current score */
  currentScore: number;
  /** Baseline score */
  baselineScore: number;
  /** Drift amount */
  drift: number;
  /** Detected timestamp */
  timestamp: Date;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SentinelHealthStatus {
  /** Sentinel status */
  status: 'healthy' | 'degraded' | 'critical';
  /** Current alignment score */
  alignmentScore: AlignmentScore;
  /** Detected drifts */
  drifts: DriftDetection[];
  /** Last health check timestamp */
  lastHealthCheck: Date;
  /** Escalation level */
  escalationLevel: 'none' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// Alignment Sentinel Class
// ============================================================================

export class AlignmentSentinel {
  private config: AlignmentSentinelConfig;
  private alertRouter: AlertRouter | null = null;
  private baselineScores: Map<string, number> = new Map();
  private currentScores: Map<string, number> = new Map();
  private driftHistory: DriftDetection[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: Date | null = null;
  private escalationLevel: 'none' | 'medium' | 'high' | 'critical' = 'none';

  constructor(config: AlignmentSentinelConfig) {
    this.config = config;
    this.initializeBaselineScores();
  }

  /**
   * Initialize baseline scores for monitored components
   */
  private initializeBaselineScores(): void {
    for (const component of this.config.monitoredComponents) {
      this.baselineScores.set(component, 1.0); // Assume perfect baseline initially
      this.currentScores.set(component, 1.0);
    }
  }

  /**
   * Set AlertRouter for escalation notifications
   */
  setAlertRouter(router: AlertRouter): void {
    this.alertRouter = router;
  }

  /**
   * Update baseline score for a component
   */
  updateBaselineScore(component: string, score: number): void {
    if (this.config.monitoredComponents.includes(component)) {
      this.baselineScores.set(component, Math.max(0, Math.min(1, score)));
    }
  }

  /**
   * Update current score for a component
   */
  updateCurrentScore(component: string, score: number): void {
    if (this.config.monitoredComponents.includes(component)) {
      this.currentScores.set(component, Math.max(0, Math.min(1, score)));
    }
  }

  /**
   * Calculate overall alignment score
   */
  calculateAlignmentScore(): AlignmentScore {
    const componentScores: { [key: string]: number } = {};
    let totalScore = 0;
    let componentCount = 0;

    for (const component of this.config.monitoredComponents) {
      const score = this.currentScores.get(component) || 0;
      componentScores[component] = score;
      totalScore += score;
      componentCount++;
    }

    const overall = componentCount > 0 ? totalScore / componentCount : 0;

    return {
      overall,
      components: componentScores,
      timestamp: new Date(),
    };
  }

  /**
   * Detect drift in component scores
   */
  detectDrift(): DriftDetection[] {
    const drifts: DriftDetection[] = [];

    for (const component of this.config.monitoredComponents) {
      const currentScore = this.currentScores.get(component) || 0;
      const baselineScore = this.baselineScores.get(component) || 1.0;
      const drift = baselineScore - currentScore;

      if (drift > this.config.driftDetectionThreshold) {
        let severity: 'low' | 'medium' | 'high' | 'critical';

        if (drift >= 0.3) {
          severity = 'critical';
        } else if (drift >= 0.2) {
          severity = 'high';
        } else if (drift >= 0.1) {
          severity = 'medium';
        } else {
          severity = 'low';
        }

        drifts.push({
          component,
          currentScore,
          baselineScore,
          drift,
          timestamp: new Date(),
          severity,
        });
      }
    }

    this.driftHistory = drifts;
    return drifts;
  }

  /**
   * Determine escalation level based on alignment score
   */
  private determineEscalationLevel(alignmentScore: number): 'none' | 'medium' | 'high' | 'critical' {
    if (alignmentScore >= this.config.escalationThresholds.medium) {
      return 'none';
    } else if (alignmentScore >= this.config.escalationThresholds.high) {
      return 'medium';
    } else if (alignmentScore >= this.config.escalationThresholds.critical) {
      return 'high';
    } else {
      return 'critical';
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<SentinelHealthStatus> {
    this.lastHealthCheck = new Date();

    const alignmentScore = this.calculateAlignmentScore();
    const drifts = this.detectDrift();
    this.escalationLevel = this.determineEscalationLevel(alignmentScore.overall);

    let status: 'healthy' | 'degraded' | 'critical';
    if (this.escalationLevel === 'none') {
      status = 'healthy';
    } else if (this.escalationLevel === 'medium' || this.escalationLevel === 'high') {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    // Auto-escalate if enabled
    if (this.config.autoEscalationEnabled && this.escalationLevel !== 'none') {
      await this.escalate(status, alignmentScore, drifts);
    }

    return {
      status,
      alignmentScore,
      drifts,
      lastHealthCheck: this.lastHealthCheck,
      escalationLevel: this.escalationLevel,
    };
  }

  /**
   * Escalate alert based on severity
   */
  private async escalate(
    status: 'healthy' | 'degraded' | 'critical',
    alignmentScore: AlignmentScore,
    drifts: DriftDetection[]
  ): Promise<void> {
    if (!this.alertRouter) {
      console.warn('[AlignmentSentinel] No AlertRouter configured, skipping escalation');
      return;
    }

    const severity: AlertSeverity = status === 'critical' ? 'critical' : 'warning';

    const driftDescriptions = drifts
      .map(
        (d) =>
          `${d.component}: ${d.drift.toFixed(3)} drift (${d.severity} severity)`
      )
      .join(', ');

    const alert: Alert = {
      id: `alignment-sentinel-${Date.now()}`,
      severity,
      source: 'alignment-sentinel',
      status: 'open',
      title: `Alignment Sentinel: ${status.toUpperCase()}`,
      message: `Overall alignment score: ${alignmentScore.overall.toFixed(3)}. Drifts detected: ${driftDescriptions}`,
      details: {
        alignmentScore,
        drifts,
        escalationLevel: this.escalationLevel,
      },
      timestamp: new Date(),
    };

    try {
      await this.alertRouter.sendAlert(alert);
      console.log(`[AlignmentSentinel] Escalated alert: ${alert.title}`);
    } catch (error) {
      console.error('[AlignmentSentinel] Failed to escalate alert:', error);
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      console.warn('[AlignmentSentinel] Health checks already running');
      return;
    }

    console.log(`[AlignmentSentinel] Starting health checks (interval: ${this.config.healthCheckInterval}s)`);

    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthStatus = await this.performHealthCheck();
        console.log(
          `[AlignmentSentinel] Health check: ${healthStatus.status}, score: ${healthStatus.alignmentScore.overall.toFixed(3)}`
        );
      } catch (error) {
        console.error('[AlignmentSentinel] Health check failed:', error);
      }
    }, this.config.healthCheckInterval * 1000);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('[AlignmentSentinel] Health checks stopped');
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(): SentinelHealthStatus {
    const alignmentScore = this.calculateAlignmentScore();
    const drifts = this.detectDrift();

    let status: 'healthy' | 'degraded' | 'critical';
    if (this.escalationLevel === 'none') {
      status = 'healthy';
    } else if (this.escalationLevel === 'medium' || this.escalationLevel === 'high') {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    return {
      status,
      alignmentScore,
      drifts,
      lastHealthCheck: this.lastHealthCheck || new Date(),
      escalationLevel: this.escalationLevel,
    };
  }

  /**
   * Get drift history
   */
  getDriftHistory(): DriftDetection[] {
    return this.driftHistory;
  }

  /**
   * Reset sentinel state
   */
  reset(): void {
    this.currentScores.clear();
    this.driftHistory = [];
    this.escalationLevel = 'none';
    this.lastHealthCheck = null;
    this.initializeBaselineScores();
    console.log('[AlignmentSentinel] Reset complete');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Load configuration from JSON file
 */
export function loadAlignmentSentinelConfig(configPath: string): AlignmentSentinelConfig {
  const configContent = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configContent);
  return config as AlignmentSentinelConfig;
}

/**
 * Create Alignment Sentinel from configuration file
 */
export function createAlignmentSentinelFromConfig(
  configPath: string
): AlignmentSentinel {
  const config = loadAlignmentSentinelConfig(configPath);
  return new AlignmentSentinel(config);
}

/**
 * Create default Alignment Sentinel
 */
export function createDefaultAlignmentSentinel(): AlignmentSentinel {
  const config: AlignmentSentinelConfig = {
    healthCheckInterval: 300,
    driftDetectionThreshold: 0.15,
    escalationThresholds: {
      critical: 0.70,
      high: 0.80,
      medium: 0.90,
    },
    autoEscalationEnabled: true,
    monitoredComponents: [
      'provider-health-monitor',
      'alert-router',
      'syslog-health-monitor',
      'monitoring-dashboard',
    ],
  };

  return new AlignmentSentinel(config);
}
