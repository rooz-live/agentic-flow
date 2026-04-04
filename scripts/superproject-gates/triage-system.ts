/**
 * Goalie Triage System
 *
 * Evidence-first triage for MCP federation and system health
 * Implements observability_first pattern with safe_degrade integration
 *
 * Phase 2: Goalie Triage Enhancements
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

import {
  TriageConfig,
  TriageSession,
  TriageIssue,
  TriageEvidence,
  TriageRemediation,
  TriageSummary,
  TriageSeverity,
  TriageCategory,
  TriagePatternEvent,
  SafeDegradeTrigger,
  DEFAULT_TRIAGE_CONFIG
} from './triage-types.js';

import {
  MCPFederationHealthCheck,
  MCPProviderHealthResult,
  MCPFederationHealth,
  MCPSafeDegradeEvent,
  MCPErrorType,
  MCPErrorClassification
} from '../../mcp/federation/index.js';

/**
 * Goalie Triage System
 *
 * Provides evidence-first diagnostics and remediation for:
 * - MCP provider health issues
 * - Infrastructure problems
 * - Governance violations
 * - Performance degradation
 */
export class GoalieTriageSystem extends EventEmitter {
  private config: TriageConfig;
  private mcpHealthCheck: MCPFederationHealthCheck;
  private currentSession: TriageSession | null = null;
  private issueHistory: Map<string, TriageIssue> = new Map();
  private triggerCooldowns: Map<string, Date> = new Map();
  private triageInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private metricsFilePath: string;

  constructor(
    config: Partial<TriageConfig> = {},
    mcpHealthCheck?: MCPFederationHealthCheck
  ) {
    super();
    this.config = { ...DEFAULT_TRIAGE_CONFIG, ...config };
    this.mcpHealthCheck = mcpHealthCheck || new MCPFederationHealthCheck(
      this.config.checkIntervalMs,
      this.config.goalieDir
    );
    this.metricsFilePath = path.join(this.config.goalieDir, this.config.metricsFile);
    this.ensureGoalieDir();
    this.setupMCPHealthListeners();
  }

  private ensureGoalieDir(): void {
    if (!fs.existsSync(this.config.goalieDir)) {
      fs.mkdirSync(this.config.goalieDir, { recursive: true });
    }
  }

  private setupMCPHealthListeners(): void {
    this.mcpHealthCheck.on('safeDegradeEvent', (event: MCPSafeDegradeEvent) => {
      this.handleMCPSafeDegrade(event);
    });

    this.mcpHealthCheck.on('healthUpdate', (health: MCPFederationHealth) => {
      this.processHealthUpdate(health);
    });

    this.mcpHealthCheck.on('providerRecovery', (event) => {
      this.handleProviderRecovery(event);
    });
  }

  /**
   * Start the triage system
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[GOALIE-TRIAGE] Starting triage system');

    // Start MCP health monitoring
    await this.mcpHealthCheck.start();

    // Start periodic triage
    this.triageInterval = setInterval(
      () => this.runTriageSession('scheduled'),
      this.config.checkIntervalMs
    );

    // Run initial triage
    await this.runTriageSession('manual');
  }

  /**
   * Stop the triage system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.triageInterval) {
      clearInterval(this.triageInterval);
      this.triageInterval = null;
    }

    await this.mcpHealthCheck.stop();
    console.log('[GOALIE-TRIAGE] Stopped triage system');
  }

  /**
   * Run a triage session
   */
  async runTriageSession(
    triggeredBy: 'scheduled' | 'manual' | 'alert' | 'safe_degrade'
  ): Promise<TriageSession> {
    const sessionId = randomUUID();
    const startTime = new Date();

    this.currentSession = {
      id: sessionId,
      startTime,
      status: 'running',
      issues: [],
      summary: this.createEmptySummary(),
      triggeredBy,
      depth: parseInt(process.env.AF_DEPTH_LEVEL || '0', 10),
      circle: process.env.AF_CIRCLE || 'triage'
    };

    console.log(`[GOALIE-TRIAGE] Starting session ${sessionId} (${triggeredBy})`);

    try {
      // Collect evidence from MCP health
      const mcpHealth = this.mcpHealthCheck.getFederationHealth();
      await this.triageMCPHealth(mcpHealth);

      // Finalize session
      this.currentSession.endTime = new Date();
      this.currentSession.status = 'completed';
      this.currentSession.summary = this.computeSummary(this.currentSession.issues);

      // Log session to metrics
      this.logTriageSession(this.currentSession);

      this.emit('sessionComplete', this.currentSession);
      return this.currentSession;

    } catch (error) {
      this.currentSession.status = 'failed';
      this.currentSession.endTime = new Date();
      console.error('[GOALIE-TRIAGE] Session failed:', error);
      throw error;
    }
  }



  /**
   * Triage MCP federation health
   */
  private async triageMCPHealth(health: MCPFederationHealth): Promise<void> {
    for (const provider of health.providers) {
      if (provider.status === 'unhealthy' || provider.status === 'degraded') {
        const issue = this.createMCPIssue(provider);
        this.addIssue(issue);
      }
    }
  }

  /**
   * Create an issue from MCP provider health result
   */
  private createMCPIssue(provider: MCPProviderHealthResult): TriageIssue {
    const severity: TriageSeverity = provider.status === 'unhealthy' ? 'critical' : 'warning';
    const errorType = provider.error?.type || 'provider_unreachable';
    const classification = MCPErrorClassification[errorType];

    const evidence: TriageEvidence = {
      source: 'mcp_health_check',
      timestamp: provider.lastChecked,
      type: 'health_check',
      data: {
        providerId: provider.providerId,
        status: provider.status,
        consecutiveFailures: provider.consecutiveFailures,
        circuitBreakerState: provider.circuitBreakerState,
        latencyMs: provider.latencyMs,
        error: provider.error,
        metrics: provider.metrics
      },
      confidence: 0.95
    };

    const remediations: TriageRemediation[] = classification.remediation.map((action, idx) => ({
      id: randomUUID(),
      action,
      automated: idx === 0 && classification.retryable,
      priority: idx + 1,
      estimatedTimeMs: classification.defaultTimeoutMs,
      prerequisites: [],
      status: 'pending' as const
    }));

    return {
      id: randomUUID(),
      category: 'mcp_provider',
      severity,
      title: `MCP Provider ${provider.providerName} is ${provider.status}`,
      description: provider.error?.message || `Provider ${provider.providerId} health check failed`,
      evidence: [evidence],
      firstSeen: provider.lastChecked,
      lastSeen: provider.lastChecked,
      occurrences: provider.consecutiveFailures,
      status: 'open',
      assignedCircle: 'orchestrator',
      mcpErrorType: errorType,
      mcpProviderStatus: provider.status,
      remediation: remediations,
      relatedIssues: [],
      tags: ['mcp', 'provider', provider.providerId, errorType]
    };
  }

  /**
   * Add issue to current session
   */
  private addIssue(issue: TriageIssue): void {
    if (!this.currentSession) return;

    // Check for existing issue
    const existingKey = `${issue.category}:${issue.mcpErrorType || issue.title}`;
    const existing = this.issueHistory.get(existingKey);

    if (existing) {
      existing.lastSeen = issue.lastSeen;
      existing.occurrences++;
      existing.evidence.push(...issue.evidence);
      this.currentSession.issues.push(existing);
    } else {
      this.issueHistory.set(existingKey, issue);
      this.currentSession.issues.push(issue);
    }

    // Check safe degrade triggers
    this.checkSafeDegradeTriggers(issue);

    // Log issue
    this.logTriageIssue(issue);
  }

  /**
   * Check if issue triggers safe degrade
   */
  private checkSafeDegradeTriggers(issue: TriageIssue): void {
    for (const trigger of this.config.safeDegradeTriggers) {
      if (issue.category !== trigger.category) continue;
      if (this.severityToNumber(issue.severity) < this.severityToNumber(trigger.severity)) continue;

      const cooldownKey = `${trigger.category}:${trigger.severity}:${trigger.action}`;
      const lastTriggered = this.triggerCooldowns.get(cooldownKey);

      if (lastTriggered && Date.now() - lastTriggered.getTime() < trigger.cooldownMs) {
        continue; // Still in cooldown
      }

      // Count recent issues matching this trigger
      const recentCount = this.countRecentIssues(trigger.category, trigger.severity, trigger.windowMs);

      if (recentCount >= trigger.threshold) {
        this.executeSafeDegradeAction(trigger, issue);
        this.triggerCooldowns.set(cooldownKey, new Date());
      }
    }
  }

  private severityToNumber(severity: TriageSeverity): number {
    const map: Record<TriageSeverity, number> = { info: 0, warning: 1, error: 2, critical: 3 };
    return map[severity];
  }

  private countRecentIssues(category: TriageCategory, minSeverity: TriageSeverity, windowMs: number): number {
    const cutoff = Date.now() - windowMs;
    let count = 0;
    for (const issue of this.issueHistory.values()) {
      if (issue.category === category &&
          this.severityToNumber(issue.severity) >= this.severityToNumber(minSeverity) &&
          issue.lastSeen.getTime() >= cutoff) {
        count++;
      }
    }
    return count;
  }

  /**
   * Execute safe degrade action
   */
  private executeSafeDegradeAction(trigger: SafeDegradeTrigger, issue: TriageIssue): void {
    console.log(`[GOALIE-TRIAGE] Safe degrade triggered: ${trigger.action} for ${issue.category}`);

    switch (trigger.action) {
      case 'circuit_break':
        if (issue.mcpErrorType) {
          const providerId = issue.tags.find(t => !['mcp', 'provider', issue.mcpErrorType].includes(t));
          if (providerId) {
            this.mcpHealthCheck.resetCircuitBreaker(providerId);
          }
        }
        break;
      case 'degrade':
        this.emit('safeDegradeTriggered', { trigger, issue });
        break;
      case 'escalate':
        this.emit('escalationRequired', { trigger, issue });
        break;
      case 'alert':
        this.emit('alertTriggered', { trigger, issue });
        break;
    }

    // Log safe degrade event
    this.logSafeDegradeEvent(trigger, issue);
  }

  /**
   * Handle MCP safe degrade event from health check
   */
  private handleMCPSafeDegrade(event: MCPSafeDegradeEvent): void {
    console.log(`[GOALIE-TRIAGE] MCP safe degrade: ${event.providerId} -> ${event.newStatus}`);
    this.runTriageSession('safe_degrade').catch(console.error);
  }

  /**
   * Process health update from MCP
   */
  private processHealthUpdate(health: MCPFederationHealth): void {
    if (health.degradationLevel !== 'none') {
      this.emit('federationDegraded', health);
    }
  }

  /**
   * Handle provider recovery
   */
  private handleProviderRecovery(event: { providerId: string }): void {
    // Mark related issues as resolved
    for (const issue of this.issueHistory.values()) {
      if (issue.category === 'mcp_provider' && issue.tags.includes(event.providerId)) {
        issue.status = 'resolved';
      }
    }
  }

  /**
   * Create empty summary
   */
  private createEmptySummary(): TriageSummary {
    return {
      totalIssues: 0,
      bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
      byCategory: { mcp_provider: 0, infrastructure: 0, governance: 0, performance: 0, security: 0, configuration: 0, resource: 0, network: 0 },
      byStatus: {},
      averageConfidence: 0,
      remediationsAttempted: 0,
      remediationsSuccessful: 0,
      timeToTriageMs: 0
    };
  }

  /**
   * Compute summary from issues
   */
  private computeSummary(issues: TriageIssue[]): TriageSummary {
    const summary = this.createEmptySummary();
    summary.totalIssues = issues.length;

    let totalConfidence = 0;
    for (const issue of issues) {
      summary.bySeverity[issue.severity]++;
      summary.byCategory[issue.category]++;
      summary.byStatus[issue.status] = (summary.byStatus[issue.status] || 0) + 1;

      const avgConfidence = issue.evidence.reduce((sum, e) => sum + e.confidence, 0) / (issue.evidence.length || 1);
      totalConfidence += avgConfidence;

      for (const rem of issue.remediation) {
        if (rem.status !== 'pending') summary.remediationsAttempted++;
        if (rem.status === 'completed' && rem.result?.success) summary.remediationsSuccessful++;
      }
    }

    summary.averageConfidence = issues.length > 0 ? totalConfidence / issues.length : 0;
    summary.timeToTriageMs = this.currentSession
      ? (this.currentSession.endTime?.getTime() || Date.now()) - this.currentSession.startTime.getTime()
      : 0;

    return summary;
  }

  /**
   * Log triage session to pattern_metrics.jsonl
   */
  private logTriageSession(session: TriageSession): void {
    const event: TriagePatternEvent = {
      timestamp: new Date().toISOString(),
      pattern: 'triage_session',
      depth: session.depth,
      run: process.env.AF_RUN || 'goalie-triage',
      circle: session.circle,
      triggers: session.issues.length,
      severity: session.summary.bySeverity.critical > 0 ? 'critical' :
                session.summary.bySeverity.error > 0 ? 'error' :
                session.summary.bySeverity.warning > 0 ? 'warning' : 'info',
      category: 'mcp_provider',
      session_id: session.id,
      status: session.status,
      evidence_count: session.issues.reduce((sum, i) => sum + i.evidence.length, 0),
      confidence: session.summary.averageConfidence,
      actions: [`triage_${session.triggeredBy}`, `issues_${session.summary.totalIssues}`]
    };

    fs.appendFileSync(this.metricsFilePath, JSON.stringify(event) + '\n', 'utf8');
  }

  /**
   * Log triage issue to pattern_metrics.jsonl
   */
  private logTriageIssue(issue: TriageIssue): void {
    const event: TriagePatternEvent = {
      timestamp: new Date().toISOString(),
      pattern: 'triage_issue',
      depth: parseInt(process.env.AF_DEPTH_LEVEL || '0', 10),
      run: process.env.AF_RUN || 'goalie-triage',
      circle: issue.assignedCircle || 'triage',
      triggers: issue.occurrences,
      severity: issue.severity,
      category: issue.category,
      issue_id: issue.id,
      status: issue.status,
      evidence_count: issue.evidence.length,
      confidence: issue.evidence.reduce((sum, e) => sum + e.confidence, 0) / (issue.evidence.length || 1),
      mcp_provider: issue.tags.find(t => !['mcp', 'provider', issue.mcpErrorType].includes(t)),
      mcp_error_type: issue.mcpErrorType,
      actions: issue.remediation.map(r => r.action)
    };

    fs.appendFileSync(this.metricsFilePath, JSON.stringify(event) + '\n', 'utf8');
  }

  /**
   * Log safe degrade event
   */
  private logSafeDegradeEvent(trigger: SafeDegradeTrigger, issue: TriageIssue): void {
    const event: TriagePatternEvent = {
      timestamp: new Date().toISOString(),
      pattern: 'safe_degrade',
      depth: parseInt(process.env.AF_DEPTH_LEVEL || '0', 10),
      run: process.env.AF_RUN || 'goalie-triage',
      circle: issue.assignedCircle || 'triage',
      triggers: 1,
      severity: trigger.severity,
      category: trigger.category,
      issue_id: issue.id,
      status: trigger.action,
      evidence_count: issue.evidence.length,
      confidence: 1.0,
      mcp_provider: issue.tags.find(t => !['mcp', 'provider', issue.mcpErrorType].includes(t)),
      mcp_error_type: issue.mcpErrorType,
      actions: [trigger.action, `threshold_${trigger.threshold}`, `window_${trigger.windowMs}ms`]
    };

    fs.appendFileSync(this.metricsFilePath, JSON.stringify(event) + '\n', 'utf8');
  }

  /**
   * Get current session
   */
  getCurrentSession(): TriageSession | null {
    return this.currentSession;
  }

  /**
   * Get issue history
   */
  getIssueHistory(): TriageIssue[] {
    return Array.from(this.issueHistory.values());
  }

  /**
   * Get MCP health check instance
   */
  getMCPHealthCheck(): MCPFederationHealthCheck {
    return this.mcpHealthCheck;
  }
}