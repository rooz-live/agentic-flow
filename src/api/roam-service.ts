/**
 * ROAM Service - Risk, Obstacle, Assumption, Mitigation Management
 * 
 * Provides CRUD operations and traceability queries for ROAM entities.
 * Integrates with SQLite database for persistence and tracking.
 */

import Database from 'better-sqlite3';
import * as path from 'path';

const DB_PATH = path.resolve(__dirname, '../../.db/roam.db');
let db: Database.Database | null = null;

/**
 * Initialize database connection and run schema
 */
export function initializeDatabase(schemaPath?: string): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema if provided
  if (schemaPath) {
    const fs = require('fs');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  }

  return db;
}

/**
 * Get database instance (lazy init)
 */
function getDB(): Database.Database {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}

// Type definitions
export type ROAMType = 'risk' | 'obstacle' | 'assumption' | 'mitigation';
export type ROAMStatus = 'pending' | 'in_progress' | 'resolved' | 'blocked' | 'accepted';
export type ROAMPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ROAMEntity {
  id?: number;
  type: ROAMType;
  title: string;
  details?: string;
  owner_circle: string;
  status?: ROAMStatus;
  priority?: ROAMPriority;
  created_at?: number;
  resolved_at?: number;
  metadata?: any;
}

export interface ROAMTrace {
  id?: number;
  roam_id: number;
  episode_id?: string;
  ceremony_id?: number;
  impact?: string;
  timestamp?: number;
}

export interface MitigationPlan {
  id?: number;
  mitigation_id: number;
  target_roam_id: number;
  stack_trace?: string;
  effectiveness_score?: number;
  implementation_status?: 'planned' | 'in_progress' | 'deployed' | 'validated';
  deployed_at?: number;
  last_validated?: number;
}

export interface ObstacleOwnership {
  id?: number;
  obstacle_id: number;
  owner_circle: string;
  bml_metrics?: {
    build?: any;
    measure?: any;
    learn?: any;
  };
  last_updated?: number;
}

export interface AssumptionValidation {
  id?: number;
  assumption_id: number;
  dor_criteria?: Array<{criterion: string; required: boolean; validated: boolean; validated_at?: number}>;
  dod_criteria?: Array<{criterion: string; required: boolean; validated: boolean; validated_at?: number}>;
  validation_status?: 'pending' | 'dor_met' | 'dod_met' | 'failed';
  validated_at?: number;
  failure_reason?: string;
  lesson_learned?: string;
}

/**
 * Create a new ROAM entity
 */
export function createROAM(entity: ROAMEntity): number {
  const db = getDB();
  
  const stmt = db.prepare(`
    INSERT INTO roam_entities (type, title, details, owner_circle, status, priority, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    entity.type,
    entity.title,
    entity.details || null,
    entity.owner_circle,
    entity.status || 'pending',
    entity.priority || 'medium',
    entity.metadata ? JSON.stringify(entity.metadata) : null
  );

  return result.lastInsertRowid as number;
}

/**
 * Update ROAM entity status
 */
export function updateROAMStatus(id: number, status: ROAMStatus, resolution?: string): boolean {
  const db = getDB();
  
  const stmt = db.prepare(`
    UPDATE roam_entities 
    SET status = ?, resolved_at = ?, details = COALESCE(?, details)
    WHERE id = ?
  `);

  const resolved_at = (status === 'resolved' || status === 'accepted') ? Math.floor(Date.now() / 1000) : null;
  const result = stmt.run(status, resolved_at, resolution, id);

  return result.changes > 0;
}

/**
 * Get ROAM entities by circle
 */
export function getROAMByCircle(circle: string, type?: ROAMType, status?: ROAMStatus): ROAMEntity[] {
  const db = getDB();
  
  let query = 'SELECT * FROM roam_entities WHERE owner_circle = ?';
  const params: any[] = [circle];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  }));
}

/**
 * Get all ROAM entities (optionally filtered)
 */
export function getAllROAM(filters?: {type?: ROAMType; status?: ROAMStatus; priority?: ROAMPriority}): ROAMEntity[] {
  const db = getDB();
  
  let query = 'SELECT * FROM roam_entities WHERE 1=1';
  const params: any[] = [];

  if (filters?.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters?.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  }));
}

/**
 * Get ROAM entity by ID
 */
export function getROAMById(id: number): ROAMEntity | null {
  const db = getDB();
  
  const stmt = db.prepare('SELECT * FROM roam_entities WHERE id = ?');
  const row = stmt.get(id) as any;

  if (!row) return null;

  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  };
}

/**
 * Link ROAM entity to episode
 */
export function linkROAMToEpisode(roam_id: number, episode_id: string, impact?: string): number {
  const db = getDB();
  
  const stmt = db.prepare(`
    INSERT INTO roam_traces (roam_id, episode_id, impact)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(roam_id, episode_id, impact || null);
  return result.lastInsertRowid as number;
}

/**
 * Get full traceability for a ROAM entity
 */
export function getROAMTraceability(roam_id: number): {
  entity: ROAMEntity;
  traces: any[];
  mitigation?: MitigationPlan;
  target_of_mitigations?: MitigationPlan[];
} {
  const db = getDB();
  
  // Get the entity
  const entity = getROAMById(roam_id);
  if (!entity) {
    throw new Error(`ROAM entity ${roam_id} not found`);
  }

  // Get traces
  const tracesStmt = db.prepare(`
    SELECT rt.*, e.circle, e.ceremony, e.reward 
    FROM roam_traces rt
    LEFT JOIN episodes e ON rt.episode_id = e.episode_id
    WHERE rt.roam_id = ?
    ORDER BY rt.timestamp DESC
  `);
  const traces = tracesStmt.all(roam_id);

  // Get mitigation plan if this is a mitigation
  let mitigation: MitigationPlan | undefined;
  if (entity.type === 'mitigation') {
    const mitigationStmt = db.prepare('SELECT * FROM mitigation_plans WHERE mitigation_id = ?');
    mitigation = mitigationStmt.get(roam_id) as MitigationPlan;
  }

  // Get mitigations targeting this entity (if it's a risk/obstacle)
  let target_of_mitigations: MitigationPlan[] | undefined;
  if (entity.type === 'risk' || entity.type === 'obstacle') {
    const targetStmt = db.prepare(`
      SELECT mp.*, re.title as mitigation_title
      FROM mitigation_plans mp
      JOIN roam_entities re ON mp.mitigation_id = re.id
      WHERE mp.target_roam_id = ?
    `);
    target_of_mitigations = targetStmt.all(roam_id) as MitigationPlan[];
  }

  return {
    entity,
    traces,
    mitigation,
    target_of_mitigations
  };
}

/**
 * Get ROAM metrics summary
 */
export function getROAMSummary(): {
  risk: number;
  obstacle: number;
  assumption: number;
  mitigation: number;
  total: number;
  exposureScore: number;
} {
  const db = getDB();
  
  const stmt = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'risk' AND status != 'resolved' THEN 1 ELSE 0 END) as risk,
      SUM(CASE WHEN type = 'obstacle' AND status != 'resolved' THEN 1 ELSE 0 END) as obstacle,
      SUM(CASE WHEN type = 'assumption' AND status != 'accepted' THEN 1 ELSE 0 END) as assumption,
      SUM(CASE WHEN type = 'mitigation' THEN 1 ELSE 0 END) as mitigation,
      COUNT(*) as total
    FROM roam_entities
  `);

  const result = stmt.get() as any;
  
  // Calculate exposure score (weighted sum)
  const exposureScore = (
    (result.risk * 2.0) + 
    (result.obstacle * 1.5) + 
    (result.assumption * 1.0)
  ) / 10.0;

  return {
    risk: result.risk || 0,
    obstacle: result.obstacle || 0,
    assumption: result.assumption || 0,
    mitigation: result.mitigation || 0,
    total: result.total || 0,
    exposureScore: Math.min(exposureScore, 10)
  };
}

/**
 * Create obstacle ownership record
 */
export function setObstacleOwnership(ownership: ObstacleOwnership): number {
  const db = getDB();
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO obstacle_ownership (obstacle_id, owner_circle, bml_metrics)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(
    ownership.obstacle_id,
    ownership.owner_circle,
    ownership.bml_metrics ? JSON.stringify(ownership.bml_metrics) : null
  );

  return result.lastInsertRowid as number;
}

/**
 * Get obstacle ownership
 */
export function getObstacleOwnership(obstacle_id?: number): ObstacleOwnership[] {
  const db = getDB();
  
  const query = obstacle_id 
    ? 'SELECT * FROM obstacle_ownership WHERE obstacle_id = ?'
    : 'SELECT * FROM obstacle_ownership';

  const stmt = db.prepare(query);
  const rows = obstacle_id ? stmt.all(obstacle_id) : stmt.all();

  return (rows as any[]).map(row => ({
    ...row,
    bml_metrics: row.bml_metrics ? JSON.parse(row.bml_metrics) : null
  }));
}

/**
 * Create/update assumption validation
 */
export function setAssumptionValidation(validation: AssumptionValidation): number {
  const db = getDB();
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO assumption_validation 
    (assumption_id, dor_criteria, dod_criteria, validation_status, failure_reason, lesson_learned)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    validation.assumption_id,
    validation.dor_criteria ? JSON.stringify(validation.dor_criteria) : null,
    validation.dod_criteria ? JSON.stringify(validation.dod_criteria) : null,
    validation.validation_status || 'pending',
    validation.failure_reason || null,
    validation.lesson_learned || null
  );

  return result.lastInsertRowid as number;
}

/**
 * Get assumption validation
 */
export function getAssumptionValidation(assumption_id: number): AssumptionValidation | null {
  const db = getDB();
  
  const stmt = db.prepare('SELECT * FROM assumption_validation WHERE assumption_id = ?');
  const row = stmt.get(assumption_id) as any;

  if (!row) return null;

  return {
    ...row,
    dor_criteria: row.dor_criteria ? JSON.parse(row.dor_criteria) : null,
    dod_criteria: row.dod_criteria ? JSON.parse(row.dod_criteria) : null
  };
}

/**
 * Create mitigation plan
 */
export function createMitigationPlan(plan: MitigationPlan): number {
  const db = getDB();
  
  const stmt = db.prepare(`
    INSERT INTO mitigation_plans 
    (mitigation_id, target_roam_id, stack_trace, effectiveness_score, implementation_status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    plan.mitigation_id,
    plan.target_roam_id,
    plan.stack_trace || null,
    plan.effectiveness_score || 0.0,
    plan.implementation_status || 'planned'
  );

  return result.lastInsertRowid as number;
}

/**
 * Update mitigation effectiveness
 */
export function updateMitigationEffectiveness(mitigation_id: number, score: number): boolean {
  const db = getDB();
  
  const stmt = db.prepare(`
    UPDATE mitigation_plans 
    SET effectiveness_score = ?, last_validated = ?
    WHERE mitigation_id = ?
  `);

  const result = stmt.run(score, Math.floor(Date.now() / 1000), mitigation_id);
  return result.changes > 0;
}

/**
 * Get mitigation effectiveness view
 */
export function getMitigationEffectiveness(): any[] {
  const db = getDB();
  
  const stmt = db.prepare('SELECT * FROM mitigation_effectiveness');
  return stmt.all();
}

/**
 * Delete ROAM entity
 */
export function deleteROAM(id: number): boolean {
  const db = getDB();
  
  const stmt = db.prepare('DELETE FROM roam_entities WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
