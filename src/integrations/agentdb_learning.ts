/**
 * AgentDB Learning Integration
 * @module integrations/agentdb_learning
 *
 * Provides ReflexionMemory and CausalRecall capabilities for affiliate behavior patterns.
 * Integrates with AgentDB for persistent learning across sessions.
 */

import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import path from 'path';

// =============================================================================
// Configuration
// =============================================================================

export interface LearningConfig {
  dbPath?: string;
  retentionDays?: number;
  patternThreshold?: number;
  maxPatterns?: number;
  enableAutoLearn?: boolean;
}

const DEFAULT_CONFIG: Required<LearningConfig> = {
  dbPath: path.join(process.cwd(), 'logs', 'agentdb_learning.db'),
  retentionDays: 90,
  patternThreshold: 0.7,
  maxPatterns: 1000,
  enableAutoLearn: true,
};

// =============================================================================
// Types
// =============================================================================

export interface ReflexionPattern {
  id: string;
  patternType: 'affinity' | 'tier_upgrade' | 'risk' | 'behavior';
  affiliateId: string;
  inputFeatures: Record<string, unknown>;
  prediction: Record<string, unknown>;
  actualOutcome?: Record<string, unknown>;
  confidence: number;
  success: boolean;
  createdAt: Date;
  evaluatedAt?: Date;
}

export interface CausalRelation {
  id: string;
  causeEvent: string;
  effectEvent: string;
  affiliateId?: string;
  strength: number;
  occurrences: number;
  avgTimeDeltaMs: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface LearningMetrics {
  totalPatterns: number;
  successfulPredictions: number;
  failedPredictions: number;
  predictionAccuracy: number;
  causalRelations: number;
  lastLearningEvent: Date | null;
}

// =============================================================================
// ReflexionMemory Class
// =============================================================================

export class ReflexionMemory extends EventEmitter {
  private db: Database.Database;
  private config: Required<LearningConfig>;
  private patterns: Map<string, ReflexionPattern> = new Map();

  constructor(config: LearningConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = new Database(this.config.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeSchema();
    this.loadPatterns();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reflexion_patterns (
        id TEXT PRIMARY KEY,
        pattern_type TEXT NOT NULL,
        affiliate_id TEXT,
        input_features TEXT NOT NULL,
        prediction TEXT NOT NULL,
        actual_outcome TEXT,
        confidence REAL DEFAULT 0.5,
        success INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        evaluated_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_patterns_affiliate ON reflexion_patterns(affiliate_id);
      CREATE INDEX IF NOT EXISTS idx_patterns_type ON reflexion_patterns(pattern_type);
      CREATE INDEX IF NOT EXISTS idx_patterns_success ON reflexion_patterns(success);
    `);
  }

  private loadPatterns(): void {
    const rows = this.db.prepare(`
      SELECT * FROM reflexion_patterns
      ORDER BY created_at DESC
      LIMIT ?
    `).all(this.config.maxPatterns) as any[];

    for (const row of rows) {
      const pattern: ReflexionPattern = {
        id: row.id,
        patternType: row.pattern_type,
        affiliateId: row.affiliate_id,
        inputFeatures: JSON.parse(row.input_features),
        prediction: JSON.parse(row.prediction),
        actualOutcome: row.actual_outcome ? JSON.parse(row.actual_outcome) : undefined,
        confidence: row.confidence,
        success: Boolean(row.success),
        createdAt: new Date(row.created_at),
        evaluatedAt: row.evaluated_at ? new Date(row.evaluated_at) : undefined,
      };
      this.patterns.set(pattern.id, pattern);
    }
  }

  storePrediction(
    patternType: ReflexionPattern['patternType'],
    affiliateId: string,
    inputFeatures: Record<string, unknown>,
    prediction: Record<string, unknown>,
    confidence: number
  ): ReflexionPattern {
    const pattern: ReflexionPattern = {
      id: `pat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patternType,
      affiliateId,
      inputFeatures,
      prediction,
      confidence,
      success: false,
      createdAt: new Date(),
    };

    this.db.prepare(`
      INSERT INTO reflexion_patterns (id, pattern_type, affiliate_id, input_features, prediction, confidence)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(pattern.id, patternType, affiliateId, JSON.stringify(inputFeatures),
           JSON.stringify(prediction), confidence);

    this.patterns.set(pattern.id, pattern);
    this.emit('pattern:stored', pattern);
    return pattern;
  }

  evaluatePrediction(patternId: string, actualOutcome: Record<string, unknown>, success: boolean): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    pattern.actualOutcome = actualOutcome;
    pattern.success = success;
    pattern.evaluatedAt = new Date();

    this.db.prepare(`
      UPDATE reflexion_patterns
      SET actual_outcome = ?, success = ?, evaluated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(actualOutcome), success ? 1 : 0, pattern.evaluatedAt.toISOString(), patternId);

    this.emit('pattern:evaluated', pattern);
  }

  getSimilarPatterns(affiliateId: string, patternType: string, limit = 10): ReflexionPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.affiliateId === affiliateId && p.patternType === patternType)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getSuccessfulPatterns(patternType: string, minConfidence = 0.7): ReflexionPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.patternType === patternType && p.success && p.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  getMetrics(): { total: number; successful: number; accuracy: number } {
    const evaluated = Array.from(this.patterns.values()).filter(p => p.evaluatedAt);
    const successful = evaluated.filter(p => p.success);
    return {
      total: this.patterns.size,
      successful: successful.length,
      accuracy: evaluated.length > 0 ? successful.length / evaluated.length : 0,
    };
  }

  close(): void {
    this.db.close();
  }
}

// =============================================================================
// CausalRecall Class
// =============================================================================

export class CausalRecall extends EventEmitter {
  private db: Database.Database;
  private config: Required<LearningConfig>;
  private relations: Map<string, CausalRelation> = new Map();

  constructor(config: LearningConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = new Database(this.config.dbPath);
    this.initializeSchema();
    this.loadRelations();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS causal_relations (
        id TEXT PRIMARY KEY,
        cause_event TEXT NOT NULL,
        effect_event TEXT NOT NULL,
        affiliate_id TEXT,
        strength REAL DEFAULT 0.5,
        occurrences INTEGER DEFAULT 1,
        avg_time_delta_ms REAL DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_causal_cause ON causal_relations(cause_event);
      CREATE INDEX IF NOT EXISTS idx_causal_effect ON causal_relations(effect_event);
      CREATE INDEX IF NOT EXISTS idx_causal_affiliate ON causal_relations(affiliate_id);
    `);
  }

  private loadRelations(): void {
    const rows = this.db.prepare('SELECT * FROM causal_relations').all() as any[];
    for (const row of rows) {
      const relation: CausalRelation = {
        id: row.id,
        causeEvent: row.cause_event,
        effectEvent: row.effect_event,
        affiliateId: row.affiliate_id,
        strength: row.strength,
        occurrences: row.occurrences,
        avgTimeDeltaMs: row.avg_time_delta_ms,
        metadata: JSON.parse(row.metadata || '{}'),
        createdAt: new Date(row.created_at),
        lastSeenAt: new Date(row.last_seen_at),
      };
      this.relations.set(relation.id, relation);
    }
  }

  recordCausalLink(
    causeEvent: string,
    effectEvent: string,
    timeDeltaMs: number,
    affiliateId?: string,
    metadata: Record<string, unknown> = {}
  ): CausalRelation {
    const key = `${causeEvent}:${effectEvent}:${affiliateId || 'global'}`;
    const existing = Array.from(this.relations.values()).find(
      r => r.causeEvent === causeEvent && r.effectEvent === effectEvent && r.affiliateId === affiliateId
    );

    if (existing) {
      existing.occurrences++;
      existing.avgTimeDeltaMs = (existing.avgTimeDeltaMs * (existing.occurrences - 1) + timeDeltaMs) / existing.occurrences;
      existing.strength = Math.min(1, existing.strength + 0.05);
      existing.lastSeenAt = new Date();
      existing.metadata = { ...existing.metadata, ...metadata };

      this.db.prepare(`
        UPDATE causal_relations
        SET occurrences = ?, avg_time_delta_ms = ?, strength = ?, last_seen_at = ?, metadata = ?
        WHERE id = ?
      `).run(existing.occurrences, existing.avgTimeDeltaMs, existing.strength,
             existing.lastSeenAt.toISOString(), JSON.stringify(existing.metadata), existing.id);

      this.emit('relation:updated', existing);
      return existing;
    }

    const relation: CausalRelation = {
      id: `caus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      causeEvent,
      effectEvent,
      affiliateId,
      strength: 0.5,
      occurrences: 1,
      avgTimeDeltaMs: timeDeltaMs,
      metadata,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    };

    this.db.prepare(`
      INSERT INTO causal_relations (id, cause_event, effect_event, affiliate_id, strength, occurrences, avg_time_delta_ms, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(relation.id, causeEvent, effectEvent, affiliateId || null, relation.strength,
           relation.occurrences, relation.avgTimeDeltaMs, JSON.stringify(metadata));

    this.relations.set(relation.id, relation);
    this.emit('relation:created', relation);
    return relation;
  }

  getCauses(effectEvent: string, affiliateId?: string): CausalRelation[] {
    return Array.from(this.relations.values())
      .filter(r => r.effectEvent === effectEvent && (!affiliateId || r.affiliateId === affiliateId))
      .sort((a, b) => b.strength - a.strength);
  }

  getEffects(causeEvent: string, affiliateId?: string): CausalRelation[] {
    return Array.from(this.relations.values())
      .filter(r => r.causeEvent === causeEvent && (!affiliateId || r.affiliateId === affiliateId))
      .sort((a, b) => b.strength - a.strength);
  }

  getTierUpgradeTriggers(minStrength = 0.6): CausalRelation[] {
    return Array.from(this.relations.values())
      .filter(r => r.effectEvent === 'tier_upgrade' && r.strength >= minStrength)
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  getSuspensionPrecursors(minStrength = 0.6): CausalRelation[] {
    return Array.from(this.relations.values())
      .filter(r => r.effectEvent === 'suspension' && r.strength >= minStrength)
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  getCausalChain(startEvent: string, maxDepth = 3): CausalRelation[][] {
    const chains: CausalRelation[][] = [];
    const visited = new Set<string>();

    const explore = (event: string, chain: CausalRelation[], depth: number) => {
      if (depth >= maxDepth) {
        if (chain.length > 0) chains.push([...chain]);
        return;
      }

      const effects = this.getEffects(event).filter(r => !visited.has(r.effectEvent));
      for (const relation of effects) {
        visited.add(relation.effectEvent);
        chain.push(relation);
        explore(relation.effectEvent, chain, depth + 1);
        chain.pop();
        visited.delete(relation.effectEvent);
      }

      if (effects.length === 0 && chain.length > 0) {
        chains.push([...chain]);
      }
    };

    explore(startEvent, [], 0);
    return chains;
  }

  close(): void {
    this.db.close();
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createReflexionMemory(config?: LearningConfig): ReflexionMemory {
  return new ReflexionMemory(config);
}

export function createCausalRecall(config?: LearningConfig): CausalRecall {
  return new CausalRecall(config);
}
