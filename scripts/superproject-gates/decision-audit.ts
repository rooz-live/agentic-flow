/**
 * DecisionAudit Logging System
 *
 * Implements P0-TIME: Complete decision audit trail for governance decisions
 * All governance decisions are logged with full context for auditability
 *
 * Philosophical Foundations:
 * - Manthra: Directed thought-power ensuring complete decision capture
 * - Yasna: Disciplined alignment through consistent audit structure
 * - Mithra: Binding force preventing drift through persistent audit records
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - relative to project root
const DB_PATH = path.join(__dirname, '../../agentdb.db');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Circle role types for governance decisions
 */
export type CircleRole = 'analyst' | 'assessor' | 'innovator' | 'intuitive' | 'orchestrator' | 'seeker';

/**
 * Decision type categories
 */
export type DecisionType = 'governance' | 'risk' | 'recommendation' | 'escalation';

/**
 * Decision outcome values
 */
export type DecisionOutcome = 'GO' | 'NO_GO' | 'CONTINUE' | 'ESCALATED' | 'BLOCKED';

/**
 * Evidence chain item
 */
export interface EvidenceChainItem {
  source: string;
  weight: number;
}

/**
 * Preservation metadata for audit record
 */
export interface PreservationMetadata {
  stored: boolean;
  location: string;
  retrieval_key: string;
}

/**
 * DecisionAuditEntry interface for governance decision logging
 * Captures all governance decisions with complete audit trail
 */
export interface DecisionAuditEntry {
  id: string; // UUID
  timestamp: string; // ISO 8601
  decision_id: string;
  circle_role: CircleRole;
  decision_type: DecisionType;
  context: Record<string, any>; // input parameters, state
  outcome: DecisionOutcome;
  rationale: string; // why this decision was made
  alternatives_considered: Array<string>;
  evidence_chain: Array<EvidenceChainItem>;
  preservation: PreservationMetadata;
}

/**
 * Audit statistics
 */
export interface AuditStats {
  total: number;
  byType: Record<string, number>;
  byRole: Record<string, number>;
}

// ============================================================================
// DECISION AUDIT LOGGER
// ============================================================================

export class DecisionAuditLogger {
  private db: Database.Database | null = null;
  private insertStmt: Database.Statement | null = null;
  private selectByIdStmt: Database.Statement | null = null;
  private selectAllStmt: Database.Statement | null = null;
  private selectByDecisionIdStmt: Database.Statement | null = null;
  private selectStatsStmt: Database.Statement | null = null;

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Get or create database connection
   */
  private getDB(): Database.Database {
    if (!this.db) {
      this.db = new Database(DB_PATH, {
        readonly: false,
        fileMustExist: false
      });
      this.db.pragma('foreign_keys = OFF');
      this.db.pragma('synchronous = FULL');
    }
    return this.db;
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    const db = this.getDB();

    // Create decision_audit table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS decision_audit (
        id TEXT PRIMARY KEY NOT NULL,
        timestamp TEXT NOT NULL,
        decision_id TEXT NOT NULL,
        circle_role TEXT NOT NULL,
        decision_type TEXT NOT NULL,
        context_json TEXT NOT NULL,
        outcome TEXT NOT NULL,
        rationale TEXT NOT NULL,
        alternatives_json TEXT NOT NULL,
        evidence_chain_json TEXT NOT NULL,
        preservation_stored INTEGER NOT NULL,
        preservation_location TEXT NOT NULL,
        preservation_key TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for efficient querying
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_decision_audit_decision_id ON decision_audit(decision_id);
      CREATE INDEX IF NOT EXISTS idx_decision_audit_timestamp ON decision_audit(timestamp);
      CREATE INDEX IF NOT EXISTS idx_decision_audit_circle_role ON decision_audit(circle_role);
      CREATE INDEX IF NOT EXISTS idx_decision_audit_decision_type ON decision_audit(decision_type);
      CREATE INDEX IF NOT EXISTS idx_decision_audit_outcome ON decision_audit(outcome);
    `;

    db.exec(createTableSQL);
    db.exec(createIndexSQL);

    // Prepare statements for better performance
    this.prepareStatements();

    console.log('[DECISION-AUDIT] Database initialized');
  }

  /**
   * Prepare SQL statements for repeated use
   */
  private prepareStatements(): void {
    const db = this.getDB();

    this.insertStmt = db.prepare(`
      INSERT OR REPLACE INTO decision_audit (
        id, timestamp, decision_id, circle_role, decision_type,
        context_json, outcome, rationale, alternatives_json,
        evidence_chain_json, preservation_stored, preservation_location, preservation_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.selectByIdStmt = db.prepare(`
      SELECT * FROM decision_audit WHERE id = ?
    `);

    this.selectAllStmt = db.prepare(`
      SELECT * FROM decision_audit ORDER BY timestamp DESC LIMIT ?
    `);

    this.selectByDecisionIdStmt = db.prepare(`
      SELECT * FROM decision_audit WHERE decision_id = ? ORDER BY timestamp DESC LIMIT ?
    `);

    this.selectStatsStmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        decision_type,
        COUNT(*) as count
      FROM decision_audit
      GROUP BY decision_type
    `);
  }

  /**
   * Generate UUID for decision entry
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Log a governance decision to the audit trail
   * @param entry The decision audit entry to log
   */
  async logDecision(entry: DecisionAuditEntry): Promise<void> {
    try {
      const db = this.getDB();

      // Generate UUID if not provided
      const id = entry.id || this.generateUUID();

      const params = [
        id,
        entry.timestamp,
        entry.decision_id,
        entry.circle_role,
        entry.decision_type,
        JSON.stringify(entry.context),
        entry.outcome,
        entry.rationale,
        JSON.stringify(entry.alternatives_considered),
        JSON.stringify(entry.evidence_chain),
        entry.preservation.stored ? 1 : 0,
        entry.preservation.location,
        entry.preservation.retrieval_key
      ];

      this.insertStmt!.run(...params);

      // Force WAL checkpoint for persistence
      db.pragma('wal_checkpoint(RESTART)');

      console.log(`[DECISION-AUDIT] Logged decision: ${entry.decision_id} (${entry.outcome})`);
    } catch (error) {
      console.error('[DECISION-AUDIT] Failed to log decision:', error);
      throw error;
    }
  }

  /**
   * Get decision history from audit trail
   * @param decisionId Optional decision ID to filter by
   * @param limit Optional limit on number of entries to return
   * @returns Array of decision audit entries
   */
  async getDecisionHistory(
    decisionId?: string,
    limit: number = 100
  ): Promise<DecisionAuditEntry[]> {
    try {
      const db = this.getDB();

      let rows: any[];
      if (decisionId) {
        rows = this.selectByDecisionIdStmt!.all(decisionId, limit);
      } else {
        rows = this.selectAllStmt!.all(limit);
      }

      return rows.map(row => this.mapRowToEntry(row));
    } catch (error) {
      console.error('[DECISION-AUDIT] Failed to get decision history:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   * @returns Audit statistics including totals and breakdowns
   */
  async getAuditStats(): Promise<AuditStats> {
    try {
      const db = this.getDB();

      // Get total count
      const totalResult = db.prepare('SELECT COUNT(*) as count FROM decision_audit').get() as { count: number };
      const total = totalResult?.count || 0;

      // Get breakdown by type
      const byTypeResult = db.prepare(`
        SELECT decision_type, COUNT(*) as count 
        FROM decision_audit 
        GROUP BY decision_type
      `).all() as Array<{ decision_type: string; count: number }>;
      const byType: Record<string, number> = {};
      for (const row of byTypeResult) {
        byType[row.decision_type] = row.count;
      }

      // Get breakdown by role
      const byRoleResult = db.prepare(`
        SELECT circle_role, COUNT(*) as count 
        FROM decision_audit 
        GROUP BY circle_role
      `).all() as Array<{ circle_role: string; count: number }>;
      const byRole: Record<string, number> = {};
      for (const row of byRoleResult) {
        byRole[row.circle_role] = row.count;
      }

      return {
        total,
        byType,
        byRole
      };
    } catch (error) {
      console.error('[DECISION-AUDIT] Failed to get audit stats:', error);
      return { total: 0, byType: {}, byRole: {} };
    }
  }

  /**
   * Map database row to DecisionAuditEntry
   */
  private mapRowToEntry(row: any): DecisionAuditEntry {
    return {
      id: row.id,
      timestamp: row.timestamp,
      decision_id: row.decision_id,
      circle_role: row.circle_role as CircleRole,
      decision_type: row.decision_type as DecisionType,
      context: JSON.parse(row.context_json || '{}'),
      outcome: row.outcome as DecisionOutcome,
      rationale: row.rationale,
      alternatives_considered: JSON.parse(row.alternatives_json || '[]'),
      evidence_chain: JSON.parse(row.evidence_chain_json || '[]'),
      preservation: {
        stored: row.preservation_stored === 1,
        location: row.preservation_location,
        retrieval_key: row.preservation_key
      }
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.insertStmt = null;
      this.selectByIdStmt = null;
      this.selectAllStmt = null;
      this.selectByDecisionIdStmt = null;
      this.selectStatsStmt = null;
      this.db.close();
      this.db = null;
      console.log('[DECISION-AUDIT] Database connection closed');
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a decision audit entry with default values
 */
export function createDecisionAuditEntry(params: {
  decision_id: string;
  circle_role: CircleRole;
  decision_type: DecisionType;
  context?: Record<string, any>;
  outcome: DecisionOutcome;
  rationale: string;
  alternatives_considered?: Array<string>;
  evidence_chain?: Array<EvidenceChainItem>;
  preservation?: Partial<PreservationMetadata>;
}): DecisionAuditEntry {
  return {
    id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
    timestamp: new Date().toISOString(),
    decision_id: params.decision_id,
    circle_role: params.circle_role,
    decision_type: params.decision_type,
    context: params.context || {},
    outcome: params.outcome,
    rationale: params.rationale,
    alternatives_considered: params.alternatives_considered || [],
    evidence_chain: params.evidence_chain || [],
    preservation: {
      stored: params.preservation?.stored ?? true,
      location: params.preservation?.location || DB_PATH,
      retrieval_key: params.preservation?.retrieval_key || params.decision_id
    }
  };
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let loggerInstance: DecisionAuditLogger | null = null;

/**
 * Get the singleton DecisionAuditLogger instance
 */
export function getDecisionAuditLogger(): DecisionAuditLogger {
  if (!loggerInstance) {
    loggerInstance = new DecisionAuditLogger();
  }
  return loggerInstance;
}
