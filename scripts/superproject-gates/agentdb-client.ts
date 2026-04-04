/**
 * ════════════════════════════════════════════════════════════════════════════
 * AgentDB Client - Wrapper for database queries
 * Provides async interface to AgentDB for web server and API routes
 * ════════════════════════════════════════════════════════════════════════════
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - relative to project root
const DB_PATH = path.join(__dirname, '../../agentdb.db');

/**
 * P0-TIME: DecisionAuditEntry interface for governance decision logging
 * Captures all governance decisions with full context for audit trail
 */
export interface DecisionAuditEntry {
  id?: number;
  decision_id: string;
  decision_type: 'governance' | 'strategy' | 'mitigation' | 'escalation' | 'threshold' | 'circuit_breaker';
  timestamp: string;
  actor: string;  // Agent or system component making the decision
  context: {
    plan_id?: string;
    do_id?: string;
    act_id?: string;
    circle?: string;
    roam_reference?: string;
  };
  input_data: Record<string, any>;
  decision_outcome: string;
  rationale: string;
  confidence: number;
  alternatives_considered?: Array<{
    option: string;
    score: number;
    reason_rejected?: string;
  }>;
  impact_assessment?: {
    affected_components: string[];
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    reversible: boolean;
  };
  metadata?: Record<string, any>;
}

export class AgentDB {
  private db: Database.Database | null = null;
  
  /**
   * Get or create database connection
   */
  private getDB(): Database.Database {
    if (!this.db) {
      this.db = new Database(DB_PATH, { 
        readonly: false,
        fileMustExist: false
      });
      // Disable foreign keys for flexibility
      this.db.pragma('foreign_keys = OFF');
      // Keep existing journal mode (don't force WAL)
      this.db.pragma('synchronous = FULL');
    }
    return this.db;
  }
  
  /**
   * Execute a SQL query against AgentDB
   * @param sql SQL query string
   * @param params Query parameters
   * @returns Query results as array of objects
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const db = this.getDB();
      
      // SELECT queries
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = db.prepare(sql);
        const results = stmt.all(...params);
        return results as any[];
      }
      
      // INSERT/UPDATE/DELETE queries
      if (sql.trim().toUpperCase().match(/^(INSERT|UPDATE|DELETE|REPLACE)/)) {
        const stmt = db.prepare(sql);
        const info = stmt.run(...params);
        
        // Force immediate WAL checkpoint to ensure persistence across processes
        db.pragma('wal_checkpoint(RESTART)');
        
        return [{ changes: info.changes, lastInsertRowid: info.lastInsertRowid }];
      }
      
      // DDL statements (CREATE, ALTER, DROP)
      if (sql.trim().toUpperCase().match(/^(CREATE|ALTER|DROP)/)) {
        db.exec(sql);
        // Force checkpoint to ensure DDL persists
        db.pragma('wal_checkpoint(RESTART)');
        return [];
      }
      
      // Fallback: execute and return empty
      db.exec(sql);
      return [];
    } catch (error) {
      console.error('AgentDB query error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;  // DON'T SWALLOW ERRORS!
    }
  }
  
  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ==================== P0-TIME: Decision Audit Logging ====================

  /**
   * Initialize the decision_audit table if it doesn't exist
   */
  async initDecisionAuditTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS decision_audit_core (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        decision_id TEXT UNIQUE NOT NULL,
        decision_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        context_json TEXT,
        input_data_json TEXT,
        decision_outcome TEXT NOT NULL,
        rationale TEXT NOT NULL,
        confidence REAL NOT NULL,
        alternatives_json TEXT,
        impact_json TEXT,
        metadata_json TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_decision_audit_core_type ON decision_audit_core(decision_type);
      CREATE INDEX IF NOT EXISTS idx_decision_audit_core_timestamp ON decision_audit_core(timestamp);
      CREATE INDEX IF NOT EXISTS idx_decision_audit_core_actor ON decision_audit_core(actor);
    `;

    await this.query(createTableSQL);
    // Execute index creation separately
    const db = this.getDB();
    db.exec(createIndexSQL);
  }

  /**
   * Log a governance decision to the decision_audit table
   * @param entry The decision audit entry to log
   * @returns The inserted row ID
   */
  async logDecision(entry: DecisionAuditEntry): Promise<number> {
    // Ensure table exists
    await this.initDecisionAuditTable();

    const sql = `
      INSERT OR REPLACE INTO decision_audit_core (
        decision_id, decision_type, timestamp, actor,
        context_json, input_data_json, decision_outcome,
        rationale, confidence, alternatives_json,
        impact_json, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      entry.decision_id,
      entry.decision_type,
      entry.timestamp,
      entry.actor,
      JSON.stringify(entry.context || {}),
      JSON.stringify(entry.input_data || {}),
      entry.decision_outcome,
      entry.rationale,
      entry.confidence,
      JSON.stringify(entry.alternatives_considered || []),
      JSON.stringify(entry.impact_assessment || {}),
      JSON.stringify(entry.metadata || {})
    ];

    const result = await this.query(sql, params);
    console.log(`[AGENTDB] Logged decision audit: ${entry.decision_id} (${entry.decision_type})`);
    return result[0]?.lastInsertRowid || 0;
  }

  /**
   * Query decision audit entries with filters
   * @param filters Optional filters for querying
   * @returns Array of decision audit entries
   */
  async queryDecisions(filters?: {
    decision_type?: string;
    actor?: string;
    since?: string;
    limit?: number;
  }): Promise<DecisionAuditEntry[]> {
    let sql = 'SELECT * FROM decision_audit_core WHERE 1=1';
    const params: any[] = [];

    if (filters?.decision_type) {
      sql += ' AND decision_type = ?';
      params.push(filters.decision_type);
    }

    if (filters?.actor) {
      sql += ' AND actor = ?';
      params.push(filters.actor);
    }

    if (filters?.since) {
      sql += ' AND timestamp >= ?';
      params.push(filters.since);
    }

    sql += ' ORDER BY timestamp DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    try {
      const rows = await this.query(sql, params);
      return rows.map(row => ({
        id: row.id,
        decision_id: row.decision_id,
        decision_type: row.decision_type,
        timestamp: row.timestamp,
        actor: row.actor,
        context: JSON.parse(row.context_json || '{}'),
        input_data: JSON.parse(row.input_data_json || '{}'),
        decision_outcome: row.decision_outcome,
        rationale: row.rationale,
        confidence: row.confidence,
        alternatives_considered: JSON.parse(row.alternatives_json || '[]'),
        impact_assessment: JSON.parse(row.impact_json || '{}'),
        metadata: JSON.parse(row.metadata_json || '{}')
      }));
    } catch (error) {
      // Table may not exist yet
      console.warn('[AGENTDB] Decision audit table not found, returning empty');
      return [];
    }
  }

  /**
   * Get decision audit coverage statistics
   * @returns Coverage percentage and statistics
   */
  async getDecisionAuditStats(): Promise<{
    total: number;
    withRationale: number;
    coveragePercent: number;
    byType: Record<string, number>;
  }> {
    try {
      const totalResult = await this.query('SELECT COUNT(*) as count FROM decision_audit_core');
      const total = totalResult[0]?.count || 0;

      const withRationaleResult = await this.query(
        "SELECT COUNT(*) as count FROM decision_audit_core WHERE rationale IS NOT NULL AND rationale != ''"
      );
      const withRationale = withRationaleResult[0]?.count || 0;

      const byTypeResult = await this.query(
        'SELECT decision_type, COUNT(*) as count FROM decision_audit_core GROUP BY decision_type'
      );
      const byType: Record<string, number> = {};
      for (const row of byTypeResult) {
        byType[row.decision_type] = row.count;
      }

      return {
        total,
        withRationale,
        coveragePercent: total > 0 ? Math.round((withRationale / total) * 100) : 0,
        byType
      };
    } catch (error) {
      return { total: 0, withRationale: 0, coveragePercent: 0, byType: {} };
    }
  }
}
