/**
 * Decision Audit Logger
 * Logs all governance decisions for compliance and audit trail
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

export interface DecisionAuditEntry {
  decisionId: string;
  timestamp: number;
  decisionType: 'policy_check' | 'action_validation' | 'compliance_check';
  policyId?: string;
  action?: string;
  context: Record<string, any>;
  result: 'approved' | 'denied' | 'warning';
  rationale: string;
  violations?: any[];
  complianceScore?: number;
  userId?: string;
  circle?: string;
  ceremony?: string;
  evidenceChain?: string[];
  alternatives?: string[];
  metadata?: Record<string, any>;
}

export class DecisionAuditLogger {
  private goalieDir: string;
  private db: Database.Database | null = null;
  private useFallback: boolean = false;

  constructor(goalieDir: string = '.goalie') {
    this.goalieDir = goalieDir;

    if (!existsSync(this.goalieDir)) {
      mkdirSync(this.goalieDir, { recursive: true });
    }

    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    try {
      const dbPath = join(this.goalieDir, 'governance.db');
      this.db = new Database(dbPath);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS decision_audit (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          decision_id TEXT UNIQUE NOT NULL,
          timestamp INTEGER NOT NULL,
          decision_type TEXT NOT NULL,
          policy_id TEXT,
          action TEXT,
          context TEXT,
          result TEXT NOT NULL,
          rationale TEXT,
          violations TEXT,
          compliance_score REAL,
          user_id TEXT,
          circle TEXT,
          ceremony TEXT,
          evidence_chain TEXT,
          alternatives TEXT,
          metadata TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_governance_timestamp ON decision_audit(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_governance_policy ON decision_audit(policy_id);
        CREATE INDEX IF NOT EXISTS idx_governance_result ON decision_audit(result);
      `);
    } catch (error) {
      console.warn('SQLite database not available, falling back to JSONL:', error);
      this.useFallback = true;
      this.db = null;
    }
  }

  /**
   * Log a governance decision
   */
  logDecision(entry: Omit<DecisionAuditEntry, 'decisionId' | 'timestamp'>): string {
    const decisionId = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    const fullEntry: DecisionAuditEntry = {
      decisionId,
      timestamp,
      ...entry
    };

    if (this.db && !this.useFallback) {
      this.logToDatabase(fullEntry);
    } else {
      this.logToJsonl(fullEntry);
    }

    return decisionId;
  }

  private logToDatabase(entry: DecisionAuditEntry): void {
    try {
      const stmt = this.db!.prepare(`
        INSERT INTO decision_audit (
          decision_id, timestamp, decision_type, policy_id, action,
          context, result, rationale, violations, compliance_score,
          user_id, circle, ceremony, evidence_chain, alternatives, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        entry.decisionId,
        entry.timestamp,
        entry.decisionType,
        entry.policyId || null,
        entry.action || null,
        JSON.stringify(entry.context),
        entry.result,
        entry.rationale,
        entry.violations ? JSON.stringify(entry.violations) : null,
        entry.complianceScore || null,
        entry.userId || null,
        entry.circle || null,
        entry.ceremony || null,
        entry.evidenceChain ? JSON.stringify(entry.evidenceChain) : null,
        entry.alternatives ? JSON.stringify(entry.alternatives) : null,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      );
    } catch (error) {
      console.error('Failed to log to database, falling back to JSONL:', error);
      this.logToJsonl(entry);
    }
  }

  private logToJsonl(entry: DecisionAuditEntry): void {
    const logPath = join(this.goalieDir, 'governance_decisions.jsonl');
    appendFileSync(logPath, JSON.stringify(entry) + '\n');
  }

  /**
   * Get recent decisions
   */
  getRecentDecisions(limit: number = 100): DecisionAuditEntry[] {
    if (this.db && !this.useFallback) {
      return this.getFromDatabase(limit);
    } else {
      return this.getFromJsonl(limit);
    }
  }

  private getFromDatabase(limit: number): DecisionAuditEntry[] {
    try {
      const stmt = this.db!.prepare(`
        SELECT * FROM decision_audit
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const rows = stmt.all(limit) as any[];
      return rows.map(row => ({
        decisionId: row.decision_id,
        timestamp: row.timestamp,
        decisionType: row.decision_type,
        policyId: row.policy_id,
        action: row.action,
        context: JSON.parse(row.context),
        result: row.result,
        rationale: row.rationale,
        violations: row.violations ? JSON.parse(row.violations) : undefined,
        complianceScore: row.compliance_score,
        userId: row.user_id,
        circle: row.circle,
        ceremony: row.ceremony,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      console.error('Failed to query database:', error);
      return [];
    }
  }

  private getFromJsonl(limit: number): DecisionAuditEntry[] {
    const logPath = join(this.goalieDir, 'governance_decisions.jsonl');
    if (!existsSync(logPath)) {
      return [];
    }

    try {
      const content = readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      const entries = lines.map(line => JSON.parse(line) as DecisionAuditEntry);
      return entries.slice(-limit).reverse();
    } catch (error) {
      console.error('Failed to read JSONL log:', error);
      return [];
    }
  }

  /**
   * Get decisions by result (approved/denied/warning)
   */
  getDecisionsByResult(result: DecisionAuditEntry['result'], limit: number = 100): DecisionAuditEntry[] {
    const decisions = this.getRecentDecisions(limit * 2);
    return decisions.filter(d => d.result === result).slice(0, limit);
  }

  /**
   * Get decisions by policy
   */
  getDecisionsByPolicy(policyId: string, limit: number = 100): DecisionAuditEntry[] {
    const decisions = this.getRecentDecisions(limit * 2);
    return decisions.filter(d => d.policyId === policyId).slice(0, limit);
  }

  /**
   * Get audit coverage metric (% of active policies audited in last N hours)
   */
  getCoverageMetric(hours: number = 168): number {
    try {
      const cutoffTime = Math.floor(Date.now() / 1000) - (hours * 3600);
      const recentDecisions = this.getRecentDecisions(2000)
        .filter(d => d.timestamp > cutoffTime);

      // Get unique policies that have been audited
      const auditedPolicies = new Set(
        recentDecisions
          .map(d => d.policyId)
          .filter((id): id is string => id !== undefined && id !== null)
      );

      // Note: This assumes active policies are tracked elsewhere
      // For now, return the count of unique policies audited
      // In production, compare against total active policies from governance system
      return auditedPolicies.size;
    } catch (error) {
      console.error('Failed to calculate coverage metric:', error);
      return 0;
    }
  }

  /**
   * Get audit coverage percentage (requires policy count)
   */
  getCoveragePercentage(totalActivePolicies: number, hours: number = 168): number {
    const auditedCount = this.getCoverageMetric(hours);
    return totalActivePolicies > 0 ? auditedCount / totalActivePolicies : 0;
  }

  /**
   * Get decision statistics
   */
  getStatistics(hours: number = 24): {
    total: number;
    approved: number;
    denied: number;
    warnings: number;
    avgComplianceScore: number;
  } {
    const cutoffTime = Math.floor(Date.now() / 1000) - (hours * 3600);
    const decisions = this.getRecentDecisions(1000).filter(d => d.timestamp > cutoffTime);

    const approved = decisions.filter(d => d.result === 'approved').length;
    const denied = decisions.filter(d => d.result === 'denied').length;
    const warnings = decisions.filter(d => d.result === 'warning').length;

    const scores = decisions
      .map(d => d.complianceScore)
      .filter((s): s is number => s !== undefined);

    const avgComplianceScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;

    return {
      total: decisions.length,
      approved,
      denied,
      warnings,
      avgComplianceScore
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

export default DecisionAuditLogger;
