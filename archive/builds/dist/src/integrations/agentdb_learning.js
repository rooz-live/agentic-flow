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
const DEFAULT_CONFIG = {
    dbPath: path.join(process.cwd(), 'logs', 'agentdb_learning.db'),
    retentionDays: 90,
    patternThreshold: 0.7,
    maxPatterns: 1000,
    enableAutoLearn: true,
};
// =============================================================================
// ReflexionMemory Class
// =============================================================================
export class ReflexionMemory extends EventEmitter {
    db;
    config;
    patterns = new Map();
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.db = new Database(this.config.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initializeSchema();
        this.loadPatterns();
    }
    initializeSchema() {
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
    loadPatterns() {
        const rows = this.db.prepare(`
      SELECT * FROM reflexion_patterns
      ORDER BY created_at DESC
      LIMIT ?
    `).all(this.config.maxPatterns);
        for (const row of rows) {
            const pattern = {
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
    storePrediction(patternType, affiliateId, inputFeatures, prediction, confidence) {
        const pattern = {
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
    `).run(pattern.id, patternType, affiliateId, JSON.stringify(inputFeatures), JSON.stringify(prediction), confidence);
        this.patterns.set(pattern.id, pattern);
        this.emit('pattern:stored', pattern);
        return pattern;
    }
    evaluatePrediction(patternId, actualOutcome, success) {
        const pattern = this.patterns.get(patternId);
        if (!pattern)
            return;
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
    getSimilarPatterns(affiliateId, patternType, limit = 10) {
        return Array.from(this.patterns.values())
            .filter(p => p.affiliateId === affiliateId && p.patternType === patternType)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
    getSuccessfulPatterns(patternType, minConfidence = 0.7) {
        return Array.from(this.patterns.values())
            .filter(p => p.patternType === patternType && p.success && p.confidence >= minConfidence)
            .sort((a, b) => b.confidence - a.confidence);
    }
    getMetrics() {
        const evaluated = Array.from(this.patterns.values()).filter(p => p.evaluatedAt);
        const successful = evaluated.filter(p => p.success);
        return {
            total: this.patterns.size,
            successful: successful.length,
            accuracy: evaluated.length > 0 ? successful.length / evaluated.length : 0,
        };
    }
    close() {
        this.db.close();
    }
}
// =============================================================================
// CausalRecall Class
// =============================================================================
export class CausalRecall extends EventEmitter {
    db;
    config;
    relations = new Map();
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.db = new Database(this.config.dbPath);
        this.initializeSchema();
        this.loadRelations();
    }
    initializeSchema() {
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
    loadRelations() {
        const rows = this.db.prepare('SELECT * FROM causal_relations').all();
        for (const row of rows) {
            const relation = {
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
    recordCausalLink(causeEvent, effectEvent, timeDeltaMs, affiliateId, metadata = {}) {
        const key = `${causeEvent}:${effectEvent}:${affiliateId || 'global'}`;
        const existing = Array.from(this.relations.values()).find(r => r.causeEvent === causeEvent && r.effectEvent === effectEvent && r.affiliateId === affiliateId);
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
      `).run(existing.occurrences, existing.avgTimeDeltaMs, existing.strength, existing.lastSeenAt.toISOString(), JSON.stringify(existing.metadata), existing.id);
            this.emit('relation:updated', existing);
            return existing;
        }
        const relation = {
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
    `).run(relation.id, causeEvent, effectEvent, affiliateId || null, relation.strength, relation.occurrences, relation.avgTimeDeltaMs, JSON.stringify(metadata));
        this.relations.set(relation.id, relation);
        this.emit('relation:created', relation);
        return relation;
    }
    getCauses(effectEvent, affiliateId) {
        return Array.from(this.relations.values())
            .filter(r => r.effectEvent === effectEvent && (!affiliateId || r.affiliateId === affiliateId))
            .sort((a, b) => b.strength - a.strength);
    }
    getEffects(causeEvent, affiliateId) {
        return Array.from(this.relations.values())
            .filter(r => r.causeEvent === causeEvent && (!affiliateId || r.affiliateId === affiliateId))
            .sort((a, b) => b.strength - a.strength);
    }
    getTierUpgradeTriggers(minStrength = 0.6) {
        return Array.from(this.relations.values())
            .filter(r => r.effectEvent === 'tier_upgrade' && r.strength >= minStrength)
            .sort((a, b) => b.occurrences - a.occurrences);
    }
    getSuspensionPrecursors(minStrength = 0.6) {
        return Array.from(this.relations.values())
            .filter(r => r.effectEvent === 'suspension' && r.strength >= minStrength)
            .sort((a, b) => b.occurrences - a.occurrences);
    }
    getCausalChain(startEvent, maxDepth = 3) {
        const chains = [];
        const visited = new Set();
        const explore = (event, chain, depth) => {
            if (depth >= maxDepth) {
                if (chain.length > 0)
                    chains.push([...chain]);
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
    close() {
        this.db.close();
    }
}
// =============================================================================
// Factory Functions
// =============================================================================
export function createReflexionMemory(config) {
    return new ReflexionMemory(config);
}
export function createCausalRecall(config) {
    return new CausalRecall(config);
}
//# sourceMappingURL=agentdb_learning.js.map