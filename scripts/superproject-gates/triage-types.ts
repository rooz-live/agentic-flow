/**
 * Goalie Triage Types
 * 
 * Evidence-first triage system for MCP federation and system health
 * Integrates with pattern_metrics.jsonl for safe_degrade events
 * 
 * Phase 2: Goalie Triage Enhancements
 */

import type { MCPErrorType, MCPProviderStatus } from '../../mcp/federation/mcp-health-types.js';

/**
 * Triage Severity Levels
 */
export type TriageSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Triage Category for classification
 */
export type TriageCategory =
  | 'mcp_provider'        // MCP provider issues
  | 'infrastructure'      // Infrastructure (StarlingX, AWS, etc.)
  | 'governance'          // Governance policy violations
  | 'performance'         // Performance degradation
  | 'security'            // Security-related issues
  | 'configuration'       // Configuration errors
  | 'resource'            // Resource exhaustion
  | 'network';            // Network connectivity

/**
 * Evidence Source for triage decisions
 */
export interface TriageEvidence {
  source: string;
  timestamp: Date;
  type: 'metric' | 'log' | 'health_check' | 'user_report' | 'automated';
  data: Record<string, unknown>;
  confidence: number; // 0-1
}

/**
 * Triage Issue - A single identified issue
 */
export interface TriageIssue {
  id: string;
  category: TriageCategory;
  severity: TriageSeverity;
  title: string;
  description: string;
  evidence: TriageEvidence[];
  firstSeen: Date;
  lastSeen: Date;
  occurrences: number;
  status: 'open' | 'investigating' | 'mitigated' | 'resolved';
  assignedCircle?: string;
  mcpErrorType?: MCPErrorType;
  mcpProviderStatus?: MCPProviderStatus;
  remediation: TriageRemediation[];
  relatedIssues: string[];
  tags: string[];
}

/**
 * Remediation Action
 */
export interface TriageRemediation {
  id: string;
  action: string;
  automated: boolean;
  priority: number;
  estimatedTimeMs: number;
  prerequisites: string[];
  rollbackProcedure?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: {
    success: boolean;
    message: string;
    timestamp: Date;
  };
}

/**
 * Triage Session - A collection of issues from a triage run
 */
export interface TriageSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  issues: TriageIssue[];
  summary: TriageSummary;
  triggeredBy: 'scheduled' | 'manual' | 'alert' | 'safe_degrade';
  depth: number;
  circle: string;
}

/**
 * Triage Summary Statistics
 */
export interface TriageSummary {
  totalIssues: number;
  bySeverity: Record<TriageSeverity, number>;
  byCategory: Record<TriageCategory, number>;
  byStatus: Record<string, number>;
  averageConfidence: number;
  remediationsAttempted: number;
  remediationsSuccessful: number;
  timeToTriageMs: number;
}

/**
 * Safe Degrade Trigger Configuration
 */
export interface SafeDegradeTrigger {
  category: TriageCategory;
  severity: TriageSeverity;
  threshold: number;
  windowMs: number;
  action: 'alert' | 'degrade' | 'circuit_break' | 'escalate';
  cooldownMs: number;
}

/**
 * Triage Configuration
 */
export interface TriageConfig {
  enabled: boolean;
  checkIntervalMs: number;
  maxIssuesPerSession: number;
  autoRemediateEnabled: boolean;
  autoRemediateMaxSeverity: TriageSeverity;
  safeDegradeTriggers: SafeDegradeTrigger[];
  evidenceRetentionDays: number;
  goalieDir: string;
  metricsFile: string;
}

/**
 * Default triage configuration
 */
export const DEFAULT_TRIAGE_CONFIG: TriageConfig = {
  enabled: true,
  checkIntervalMs: 60000,
  maxIssuesPerSession: 100,
  autoRemediateEnabled: true,
  autoRemediateMaxSeverity: 'warning',
  safeDegradeTriggers: [
    { category: 'mcp_provider', severity: 'critical', threshold: 1, windowMs: 60000, action: 'circuit_break', cooldownMs: 300000 },
    { category: 'mcp_provider', severity: 'error', threshold: 3, windowMs: 300000, action: 'degrade', cooldownMs: 120000 },
    { category: 'infrastructure', severity: 'critical', threshold: 1, windowMs: 60000, action: 'escalate', cooldownMs: 600000 },
    { category: 'performance', severity: 'error', threshold: 5, windowMs: 600000, action: 'alert', cooldownMs: 60000 },
    { category: 'security', severity: 'warning', threshold: 1, windowMs: 0, action: 'escalate', cooldownMs: 0 },
  ],
  evidenceRetentionDays: 30,
  goalieDir: process.env.GOALIE_DIR || '.goalie',
  metricsFile: 'pattern_metrics.jsonl'
};

/**
 * Triage Event for pattern_metrics.jsonl
 */
export interface TriagePatternEvent {
  timestamp: string;
  pattern: 'triage_session' | 'triage_issue' | 'triage_remediation' | 'safe_degrade';
  depth: number;
  run: string;
  circle: string;
  triggers: number;
  severity: TriageSeverity;
  category: TriageCategory;
  issue_id?: string;
  session_id?: string;
  remediation_id?: string;
  status: string;
  evidence_count: number;
  confidence: number;
  mcp_provider?: string;
  mcp_error_type?: MCPErrorType;
  actions: string[];
}

