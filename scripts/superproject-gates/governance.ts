/**
 * Governance Agent - Decision Audit Logging System
 *
 * P0-TIME: Complete decision audit trail for governance decisions
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
 * Decision outcome values for governance decisions
 */
export type DecisionOutcome = 'APPROVED' | 'REJECTED' | 'DEFERRED' | 'ESCALATED';

/**
 * Evidence chain item supporting a decision
 */
export interface EvidenceChainItem {
  source: string;
  weight: number;
  timestamp?: string;
  description?: string;
}

/**
 * Preservation metadata for audit record knowledge preservation
 */
export interface PreservationMetadata {
  stored: boolean;
  location: string;
  retrieval_key: string;
  retention_period?: string;
  archived?: boolean;
}

/**
 * Decision context including circle, purpose, and domain
 */
export interface DecisionContext {
  circle?: string;
  purpose?: string;
  domain?: string;
  [key: string]: any;
}

/**
 * DecisionAuditEntry interface for governance decision logging
 * Captures all governance decisions with complete audit trail
 */
export interface DecisionAuditEntry {
  id: string; // UUID
  timestamp: string; // ISO 8601 date string
  decision_id: string; // references the governance decision
  context: DecisionContext; // decision context including circle, purpose, domain
  outcome: DecisionOutcome; // APPROVED, REJECTED, DEFERRED, ESCALATED
  rationale: string; // human-readable explanation
  alternatives_considered: string[]; // list of alternatives considered
  evidence_chain: EvidenceChainItem[]; // supporting evidence
  preservation: PreservationMetadata; // metadata for knowledge preservation
}

/**
 * Audit coverage statistics
 */
export interface AuditCoverage {
  total: number;
  withAudit: number;
  percentage: number;
}

// ============================================================================
// DECISION AUDIT LOGGER
// ============================================================================

/**
 * DecisionAuditLogger - Manages governance decision audit trail
 * 
 * Provides complete audit logging for all governance decisions with:
 * - Full context capture (circle, purpose, domain)
 * - Evidence chain tracking
 * - Knowledge preservation metadata
 * - Query capabilities for audit trails
 */
export class DecisionAuditLogger {
  private db: Database.Database | null = null;
  private insertStmt: Database.Statement | null = null;
  private selectByIdStmt: Database.Statement | null = null;
  private selectByCircleIdStmt: Database.Statement | null = null;
  private selectAllStmt: Database.Statement | null = null;
  private countTotalStmt: Database.Statement | null = null;
  private countWithAuditStmt: Database.Statement | null = null;

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
   * Initialize database schema for decision audit
   */
  private initializeDatabase(): void {
    const db = this.getDB();

    // Create decision_audit table with specified schema
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS decision_audit (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        decision_id TEXT NOT NULL,
        context TEXT NOT NULL,
        outcome TEXT NOT NULL,
        rationale TEXT,
        alternatives_considered TEXT,
        evidence_chain TEXT,
        preservation TEXT,
        circle_id TEXT,
        INDEX idx_decision_id (decision_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_circle_id (circle_id)
      )
    `;

    db.exec(createTableSQL);

    // Prepare statements for better performance
    this.prepareStatements();

    console.log('[GOVERNANCE-AGENT] Decision audit database initialized');
  }

  /**
   * Prepare SQL statements for repeated use
   */
  private prepareStatements(): void {
    const db = this.getDB();

    this.insertStmt = db.prepare(`
      INSERT OR REPLACE INTO decision_audit (
        id, timestamp, decision_id, context, outcome,
        rationale, alternatives_considered, evidence_chain,
        preservation, circle_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.selectByIdStmt = db.prepare(`
      SELECT * FROM decision_audit WHERE decision_id = ?
    `);

    this.selectByCircleIdStmt = db.prepare(`
      SELECT * FROM decision_audit 
      WHERE circle_id = ? 
      AND timestamp >= ? 
      ORDER BY timestamp DESC
    `);

    this.selectAllStmt = db.prepare(`
      SELECT * FROM decision_audit ORDER BY timestamp DESC
    `);

    this.countTotalStmt = db.prepare(`
      SELECT COUNT(*) as count FROM decision_audit
    `);

    this.countWithAuditStmt = db.prepare(`
      SELECT COUNT(*) as count FROM decision_audit 
      WHERE rationale IS NOT NULL AND rationale != ''
    `);
  }

  /**
   * Generate UUID for decision entry
   */
  private generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Log a governance decision to audit trail
   * 
   * @param entry The decision audit entry to log
   * @throws Error if database operation fails
   */
  async logDecision(entry: DecisionAuditEntry): Promise<void> {
    try {
      const db = this.getDB();

      // Generate UUID if not provided
      const id = entry.id || this.generateUUID();

      // Extract circle_id from context for indexing
      const circleId = entry.context?.circle || null;

      const params = [
        id,
        entry.timestamp,
        entry.decision_id,
        JSON.stringify(entry.context),
        entry.outcome,
        entry.rationale,
        JSON.stringify(entry.alternatives_considered),
        JSON.stringify(entry.evidence_chain),
        JSON.stringify(entry.preservation),
        circleId
      ];

      this.insertStmt!.run(...params);

      // Force WAL checkpoint for persistence
      db.pragma('wal_checkpoint(RESTART)');

      console.log(`[GOVERNANCE-AGENT] Logged decision: ${entry.decision_id} (${entry.outcome})`);
    } catch (error) {
      console.error('[GOVERNANCE-AGENT] Failed to log decision:', error);
      throw error;
    }
  }

  /**
   * Get a specific decision audit entry by decision ID
   * 
   * @param decisionId The decision ID to retrieve
   * @returns DecisionAuditEntry or null if not found
   */
  async getDecisionAudit(decisionId: string): Promise<DecisionAuditEntry | null> {
    try {
      const row = this.selectByIdStmt!.get(decisionId) as any;
      
      if (!row) {
        return null;
      }

      return this.mapRowToEntry(row);
    } catch (error) {
      console.error('[GOVERNANCE-AGENT] Failed to get decision audit:', error);
      return null;
    }
  }

  /**
   * Get decision audit history for a circle with optional time window
   * 
   * @param circleId The circle ID to filter by
   * @param timeWindow Optional ISO 8601 timestamp for time window start
   * @returns Array of decision audit entries
   */
  async getDecisionAuditHistory(
    circleId: string, 
    timeWindow?: string
  ): Promise<DecisionAuditEntry[]> {
    try {
      const db = this.getDB();
      
      // If no time window specified, use epoch start
      const startTime = timeWindow || '1970-01-01T00:00:00.000Z';
      
      const rows = db.prepare(`
        SELECT * FROM decision_audit 
        WHERE circle_id = ? AND timestamp >= ? 
        ORDER BY timestamp DESC
      `).all(circleId, startTime) as any[];

      return rows.map(row => this.mapRowToEntry(row));
    } catch (error) {
      console.error('[GOVERNANCE-AGENT] Failed to get decision audit history:', error);
      return [];
    }
  }

  /**
   * Get audit coverage statistics
   * 
   * @returns Coverage statistics including total, withAudit count, and percentage
   */
  async getAuditCoverage(): Promise<AuditCoverage> {
    try {
      const db = this.getDB();

      const totalResult = this.countTotalStmt!.get() as { count: number };
      const total = totalResult?.count || 0;

      const withAuditResult = this.countWithAuditStmt!.get() as { count: number };
      const withAudit = withAuditResult?.count || 0;

      const percentage = total > 0 ? Math.round((withAudit / total) * 100) : 0;

      return {
        total,
        withAudit,
        percentage
      };
    } catch (error) {
      console.error('[GOVERNANCE-AGENT] Failed to get audit coverage:', error);
      return { total: 0, withAudit: 0, percentage: 0 };
    }
  }

  /**
   * Get all decision audit entries
   * 
   * @param limit Optional limit on number of entries to return
   * @returns Array of decision audit entries
   */
  async getAllDecisions(limit: number = 100): Promise<DecisionAuditEntry[]> {
    try {
      const rows = this.selectAllStmt!.all(limit) as any[];
      return rows.map(row => this.mapRowToEntry(row));
    } catch (error) {
      console.error('[GOVERNANCE-AGENT] Failed to get all decisions:', error);
      return [];
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
      context: JSON.parse(row.context || '{}'),
      outcome: row.outcome as DecisionOutcome,
      rationale: row.rationale || '',
      alternatives_considered: JSON.parse(row.alternatives_considered || '[]'),
      evidence_chain: JSON.parse(row.evidence_chain || '[]'),
      preservation: JSON.parse(row.preservation || '{}'),
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.insertStmt = null;
      this.selectByIdStmt = null;
      this.selectByCircleIdStmt = null;
      this.selectAllStmt = null;
      this.countTotalStmt = null;
      this.countWithAuditStmt = null;
      this.db.close();
      this.db = null;
      console.log('[GOVERNANCE-AGENT] Database connection closed');
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
  context: DecisionContext;
  outcome: DecisionOutcome;
  rationale: string;
  alternatives_considered?: string[];
  evidence_chain?: EvidenceChainItem[];
  preservation?: Partial<PreservationMetadata>;
}): DecisionAuditEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    decision_id: params.decision_id,
    context: params.context,
    outcome: params.outcome,
    rationale: params.rationale,
    alternatives_considered: params.alternatives_considered || [],
    evidence_chain: params.evidence_chain || [],
    preservation: {
      stored: params.preservation?.stored ?? true,
      location: params.preservation?.location || DB_PATH,
      retrieval_key: params.preservation?.retrieval_key || params.decision_id,
      retention_period: params.preservation?.retention_period,
      archived: params.preservation?.archived ?? false
    }
  };
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let loggerInstance: DecisionAuditLogger | null = null;

/**
 * Get singleton DecisionAuditLogger instance
 */
export function getDecisionAuditLogger(): DecisionAuditLogger {
  if (!loggerInstance) {
    loggerInstance = new DecisionAuditLogger();
  }
  return loggerInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

