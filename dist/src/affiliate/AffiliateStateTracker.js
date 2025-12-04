/**
 * AffiliateStateTracker - Core affiliate state management class
 * @module affiliate/AffiliateStateTracker
 *
 * Provides:
 * - CRUD operations for all 4 affiliate tables
 * - State machine for affiliate lifecycle (pending → active → suspended → archived)
 * - Event emission for state changes
 * - Integration with AgentDB for learning events
 * - Error handling and retry logic
 */
import Database from 'better-sqlite3';
import path from 'path';
import { EventEmitter } from 'events';
import { STATE_TRANSITIONS, } from './types';
const DEFAULT_CONFIG = {
    dbPath: path.join(process.cwd(), 'logs', 'device_state_tracking.db'),
    agentDbPath: path.join(process.cwd(), '.agentdb', 'agentdb.sqlite'),
    enableLearning: true,
    maxRetries: 3,
    retryDelayMs: 100,
};
// =============================================================================
// AffiliateStateTracker Class
// =============================================================================
export class AffiliateStateTracker extends EventEmitter {
    db;
    agentDb = null;
    config;
    eventHandlers = new Map();
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.db = new Database(this.config.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        // Initialize schema for in-memory databases or new databases
        this.initializeSchema();
        if (this.config.enableLearning) {
            try {
                this.agentDb = new Database(this.config.agentDbPath);
                this.agentDb.pragma('journal_mode = WAL');
            }
            catch (error) {
                console.warn('AgentDB not available, learning disabled:', error);
                this.agentDb = null;
            }
        }
    }
    initializeSchema() {
        // Create tables if they don't exist
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS affiliate_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        affiliate_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'suspended', 'archived')),
        tier TEXT DEFAULT 'standard' CHECK(tier IN ('standard', 'premium', 'enterprise')),
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS affiliate_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        affiliate_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        source TEXT DEFAULT 'system',
        payload TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (affiliate_id) REFERENCES affiliate_states(affiliate_id)
      );

      CREATE TABLE IF NOT EXISTS affiliate_risks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        affiliate_id TEXT NOT NULL,
        risk_type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
        roam_status TEXT DEFAULT 'owned' CHECK(roam_status IN ('resolved', 'owned', 'accepted', 'mitigated')),
        description TEXT,
        mitigation_plan TEXT,
        evidence TEXT,
        owner TEXT,
        resolution_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (affiliate_id) REFERENCES affiliate_states(affiliate_id)
      );

      CREATE TABLE IF NOT EXISTS affiliate_affinities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        affiliate_id_1 TEXT NOT NULL,
        affiliate_id_2 TEXT NOT NULL,
        affinity_score REAL DEFAULT 0.0,
        confidence REAL DEFAULT 0.5,
        relationship_type TEXT DEFAULT 'peer',
        interaction_count INTEGER DEFAULT 0,
        metadata TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (affiliate_id_1) REFERENCES affiliate_states(affiliate_id),
        FOREIGN KEY (affiliate_id_2) REFERENCES affiliate_states(affiliate_id),
        UNIQUE(affiliate_id_1, affiliate_id_2)
      );

      CREATE INDEX IF NOT EXISTS idx_affiliate_states_status ON affiliate_states(status);
      CREATE INDEX IF NOT EXISTS idx_affiliate_states_tier ON affiliate_states(tier);
      CREATE INDEX IF NOT EXISTS idx_affiliate_activities_affiliate_id ON affiliate_activities(affiliate_id);
      CREATE INDEX IF NOT EXISTS idx_affiliate_risks_affiliate_id ON affiliate_risks(affiliate_id);
      CREATE INDEX IF NOT EXISTS idx_affiliate_risks_roam_status ON affiliate_risks(roam_status);
      CREATE INDEX IF NOT EXISTS idx_affiliate_affinities_affiliate_id_1 ON affiliate_affinities(affiliate_id_1);
      CREATE INDEX IF NOT EXISTS idx_affiliate_affinities_affiliate_id_2 ON affiliate_affinities(affiliate_id_2);
    `);
    }
    // ===========================================================================
    // Affiliate State CRUD
    // ===========================================================================
    createAffiliate(input) {
        const stmt = this.db.prepare(`
      INSERT INTO affiliate_states (affiliate_id, name, status, tier, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
        const result = stmt.run(input.affiliateId, input.name, input.status || 'pending', input.tier || 'standard', input.metadata ? JSON.stringify(input.metadata) : null);
        const affiliate = this.getAffiliateById(input.affiliateId);
        this.emitEvent('state_created', input.affiliateId, { affiliate });
        this.logLearningEvent('affiliate_created', input.affiliateId, { tier: input.tier || 'standard' });
        return affiliate;
    }
    getAffiliateById(affiliateId) {
        const row = this.db.prepare(`
      SELECT id, affiliate_id, name, status, tier, metadata, created_at, updated_at
      FROM affiliate_states WHERE affiliate_id = ?
    `).get(affiliateId);
        return row ? this.mapRowToAffiliateState(row) : null;
    }
    getAffiliatesByStatus(status) {
        const rows = this.db.prepare(`
      SELECT id, affiliate_id, name, status, tier, metadata, created_at, updated_at
      FROM affiliate_states WHERE status = ?
    `).all(status);
        return rows.map(row => this.mapRowToAffiliateState(row));
    }
    getAllAffiliates() {
        const rows = this.db.prepare(`
      SELECT id, affiliate_id, name, status, tier, metadata, created_at, updated_at
      FROM affiliate_states ORDER BY created_at DESC
    `).all();
        return rows.map(row => this.mapRowToAffiliateState(row));
    }
    getAffiliatesByTier(tier) {
        const rows = this.db.prepare(`
      SELECT id, affiliate_id, name, status, tier, metadata, created_at, updated_at
      FROM affiliate_states WHERE tier = ? ORDER BY created_at DESC
    `).all(tier);
        return rows.map(row => this.mapRowToAffiliateState(row));
    }
    transitionStatus(affiliateId, newStatus) {
        const affiliate = this.getAffiliateById(affiliateId);
        if (!affiliate) {
            return { success: false, error: 'Affiliate not found' };
        }
        try {
            this.validateStatusTransition(affiliate.status, newStatus);
            this.updateAffiliate(affiliateId, { status: newStatus });
            return { success: true, newStatus };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    updateAffiliate(affiliateId, input) {
        const current = this.getAffiliateById(affiliateId);
        if (!current)
            return null;
        // Handle status transition validation
        if (input.status && input.status !== current.status) {
            this.validateStatusTransition(current.status, input.status);
        }
        const updates = [];
        const values = [];
        if (input.name !== undefined) {
            updates.push('name = ?');
            values.push(input.name);
        }
        if (input.status !== undefined) {
            updates.push('status = ?');
            values.push(input.status);
        }
        if (input.tier !== undefined) {
            updates.push('tier = ?');
            values.push(input.tier);
        }
        if (input.metadata !== undefined) {
            updates.push('metadata = ?');
            values.push(JSON.stringify(input.metadata));
        }
        if (updates.length === 0)
            return current;
        values.push(affiliateId);
        this.db.prepare(`UPDATE affiliate_states SET ${updates.join(', ')} WHERE affiliate_id = ?`).run(...values);
        const updated = this.getAffiliateById(affiliateId);
        if (input.status && input.status !== current.status) {
            this.emitEvent('status_transition', affiliateId, { from: current.status, to: input.status });
            this.logActivity({ affiliateId, activityType: 'custom', source: 'system',
                payload: { event: 'status_transition', from: current.status, to: input.status } });
        }
        this.emitEvent('state_updated', affiliateId, { before: current, after: updated });
        return updated;
    }
    deleteAffiliate(affiliateId) {
        const result = this.db.prepare('DELETE FROM affiliate_states WHERE affiliate_id = ?').run(affiliateId);
        if (result.changes > 0) {
            this.emitEvent('state_deleted', affiliateId, {});
            return true;
        }
        return false;
    }
    mapRowToAffiliateState(row) {
        return {
            id: row.id,
            affiliateId: row.affiliate_id,
            name: row.name,
            status: row.status,
            tier: row.tier,
            metadata: row.metadata ? JSON.parse(row.metadata) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
    // ===========================================================================
    // Activity CRUD
    // ===========================================================================
    logActivity(input) {
        const stmt = this.db.prepare(`
      INSERT INTO affiliate_activities (affiliate_id, activity_type, source, payload)
      VALUES (?, ?, ?, ?)
    `);
        const result = stmt.run(input.affiliateId, input.activityType, input.source || 'system', input.payload ? JSON.stringify(input.payload) : null);
        const activity = this.getActivityById(result.lastInsertRowid);
        this.emitEvent('activity_logged', input.affiliateId, { activity });
        this.logLearningEvent('activity_logged', input.affiliateId, {
            activityType: input.activityType,
            source: input.source
        });
        return activity;
    }
    getActivityById(id) {
        const row = this.db.prepare(`
      SELECT id, affiliate_id, activity_type, source, payload, timestamp, created_at
      FROM affiliate_activities WHERE id = ?
    `).get(id);
        return row ? this.mapRowToActivity(row) : null;
    }
    getActivitiesByAffiliateId(affiliateId, limit = 100) {
        const rows = this.db.prepare(`
      SELECT id, affiliate_id, activity_type, source, payload, timestamp, created_at
      FROM affiliate_activities WHERE affiliate_id = ? 
      ORDER BY timestamp DESC LIMIT ?
    `).all(affiliateId, limit);
        return rows.map(row => this.mapRowToActivity(row));
    }
    mapRowToActivity(row) {
        return {
            id: row.id,
            affiliateId: row.affiliate_id,
            activityType: row.activity_type,
            source: row.source,
            payload: row.payload ? JSON.parse(row.payload) : null,
            timestamp: new Date(row.timestamp),
            createdAt: new Date(row.created_at),
        };
    }
    // ===========================================================================
    // Risk CRUD
    // ===========================================================================
    createRisk(input) {
        const stmt = this.db.prepare(`
      INSERT INTO affiliate_risks 
        (affiliate_id, risk_type, severity, roam_status, description, mitigation_plan, evidence, owner)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(input.affiliateId, input.riskType, input.severity || 'medium', input.roamStatus || 'owned', input.description || null, input.mitigationPlan || null, input.evidence ? JSON.stringify(input.evidence) : null, input.owner || null);
        const risk = this.getRiskById(result.lastInsertRowid);
        this.emitEvent('risk_created', input.affiliateId, { risk });
        this.logLearningEvent('risk_created', input.affiliateId, {
            riskType: input.riskType,
            severity: input.severity || 'medium',
            roamStatus: input.roamStatus || 'owned'
        });
        return risk;
    }
    getRiskById(id) {
        const row = this.db.prepare(`
      SELECT id, affiliate_id, risk_type, severity, roam_status, description, 
             mitigation_plan, evidence, owner, resolution_date, created_at, updated_at
      FROM affiliate_risks WHERE id = ?
    `).get(id);
        return row ? this.mapRowToRisk(row) : null;
    }
    getRisksByAffiliateId(affiliateId) {
        const rows = this.db.prepare(`
      SELECT id, affiliate_id, risk_type, severity, roam_status, description, 
             mitigation_plan, evidence, owner, resolution_date, created_at, updated_at
      FROM affiliate_risks WHERE affiliate_id = ? ORDER BY created_at DESC
    `).all(affiliateId);
        return rows.map(row => this.mapRowToRisk(row));
    }
    getRisksByRoamStatus(roamStatus) {
        const rows = this.db.prepare(`
      SELECT id, affiliate_id, risk_type, severity, roam_status, description, 
             mitigation_plan, evidence, owner, resolution_date, created_at, updated_at
      FROM affiliate_risks WHERE roam_status = ? ORDER BY severity DESC, created_at DESC
    `).all(roamStatus);
        return rows.map(row => this.mapRowToRisk(row));
    }
    mapRowToRisk(row) {
        return {
            id: row.id,
            affiliateId: row.affiliate_id,
            riskType: row.risk_type,
            severity: row.severity,
            roamStatus: row.roam_status,
            description: row.description,
            mitigationPlan: row.mitigation_plan,
            evidence: row.evidence ? JSON.parse(row.evidence) : null,
            owner: row.owner,
            resolutionDate: row.resolution_date ? new Date(row.resolution_date) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
    // ===========================================================================
    // Affinity CRUD
    // ===========================================================================
    createAffinity(input) {
        const stmt = this.db.prepare(`
      INSERT INTO affiliate_affinities 
        (affiliate_id_1, affiliate_id_2, affinity_score, confidence, relationship_type, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(input.affiliateId1, input.affiliateId2, input.affinityScore ?? 0.0, input.confidence ?? 0.5, input.relationshipType || 'peer', input.metadata ? JSON.stringify(input.metadata) : null);
        const affinity = this.getAffinityById(result.lastInsertRowid);
        this.emitEvent('affinity_created', input.affiliateId1, { affinity });
        this.logLearningEvent('affinity_created', input.affiliateId1, {
            affiliateId2: input.affiliateId2,
            score: input.affinityScore ?? 0.0,
            relationshipType: input.relationshipType || 'peer'
        });
        return affinity;
    }
    getAffinityById(id) {
        const row = this.db.prepare(`
      SELECT id, affiliate_id_1, affiliate_id_2, affinity_score, confidence, 
             relationship_type, interaction_count, metadata, last_updated, created_at
      FROM affiliate_affinities WHERE id = ?
    `).get(id);
        return row ? this.mapRowToAffinity(row) : null;
    }
    getAffinitiesForAffiliate(affiliateId) {
        const rows = this.db.prepare(`
      SELECT id, affiliate_id_1, affiliate_id_2, affinity_score, confidence, 
             relationship_type, interaction_count, metadata, last_updated, created_at
      FROM affiliate_affinities 
      WHERE affiliate_id_1 = ? OR affiliate_id_2 = ?
      ORDER BY affinity_score DESC
    `).all(affiliateId, affiliateId);
        return rows.map(row => this.mapRowToAffinity(row));
    }
    updateAffinityScore(affiliateId1, affiliateId2, score, confidence) {
        const updates = ['affinity_score = ?', 'interaction_count = interaction_count + 1'];
        const values = [score];
        if (confidence !== undefined) {
            updates.push('confidence = ?');
            values.push(confidence);
        }
        values.push(affiliateId1, affiliateId2, affiliateId2, affiliateId1);
        const result = this.db.prepare(`
      UPDATE affiliate_affinities SET ${updates.join(', ')}
      WHERE (affiliate_id_1 = ? AND affiliate_id_2 = ?) OR (affiliate_id_1 = ? AND affiliate_id_2 = ?)
    `).run(...values);
        if (result.changes > 0) {
            this.emitEvent('affinity_updated', affiliateId1, { affiliateId2, score, confidence });
            return true;
        }
        return false;
    }
    mapRowToAffinity(row) {
        return {
            id: row.id,
            affiliateId1: row.affiliate_id_1,
            affiliateId2: row.affiliate_id_2,
            affinityScore: row.affinity_score,
            confidence: row.confidence,
            relationshipType: row.relationship_type,
            interactionCount: row.interaction_count,
            metadata: row.metadata ? JSON.parse(row.metadata) : null,
            lastUpdated: new Date(row.last_updated),
            createdAt: new Date(row.created_at),
        };
    }
    // ===========================================================================
    // State Machine
    // ===========================================================================
    validateStatusTransition(from, to) {
        const transition = STATE_TRANSITIONS.find(t => t.from === from && t.to === to);
        if (!transition) {
            throw new Error(`Invalid status transition: ${from} → ${to}`);
        }
        if (!transition.allowed) {
            throw new Error(`Status transition not allowed: ${from} → ${to}. Reason: ${transition.reason || 'policy'}`);
        }
    }
    canTransition(from, to) {
        const transition = STATE_TRANSITIONS.find(t => t.from === from && t.to === to);
        return transition?.allowed ?? false;
    }
    getValidTransitions(currentStatus) {
        return STATE_TRANSITIONS
            .filter(t => t.from === currentStatus && t.allowed)
            .map(t => t.to);
    }
    // ===========================================================================
    // Event Emission
    // ===========================================================================
    emitEvent(type, affiliateId, data) {
        const event = {
            type,
            affiliateId,
            timestamp: new Date(),
            data,
            source: 'AffiliateStateTracker',
        };
        this.emit(type, event);
        this.emit('*', event); // Wildcard for all events
        // Call registered handlers
        const handlers = this.eventHandlers.get(type) || [];
        handlers.forEach(handler => {
            try {
                handler(event);
            }
            catch (error) {
                console.error(`Event handler error for ${type}:`, error);
            }
        });
    }
    onEvent(type, handler) {
        const handlers = this.eventHandlers.get(type) || [];
        handlers.push(handler);
        this.eventHandlers.set(type, handlers);
    }
    // ===========================================================================
    // AgentDB Learning Integration
    // ===========================================================================
    logLearningEvent(eventType, affiliateId, context) {
        if (!this.agentDb || !this.config.enableLearning)
            return;
        try {
            const stmt = this.agentDb.prepare(`
        INSERT INTO learning_events (agent_id, event_type, context, verdict, confidence, beam_tags)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
            stmt.run('affiliate_tracker', eventType, JSON.stringify({ affiliateId, ...context }), 'pending', 0.5, JSON.stringify(['affiliate', 'state_tracking']));
        }
        catch (error) {
            // Non-critical, just log warning
            console.warn('Failed to log learning event:', error);
        }
    }
    // ===========================================================================
    // Statistics & Health
    // ===========================================================================
    getStatistics() {
        const stateCounts = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM affiliate_states GROUP BY status
    `).all();
        const riskCounts = this.db.prepare(`
      SELECT roam_status, COUNT(*) as count FROM affiliate_risks GROUP BY roam_status
    `).all();
        const affinityStats = this.db.prepare(`
      SELECT 
        AVG(affinity_score) as avg_score,
        MIN(affinity_score) as min_score,
        MAX(affinity_score) as max_score,
        AVG(confidence) as avg_confidence,
        COUNT(*) as total_relationships
      FROM affiliate_affinities
    `).get();
        const recentActivities = this.db.prepare(`
      SELECT COUNT(*) as count FROM affiliate_activities 
      WHERE timestamp > datetime('now', '-24 hours')
    `).get();
        return {
            affiliates: {
                byStatus: Object.fromEntries(stateCounts.map(r => [r.status, r.count])),
                total: stateCounts.reduce((sum, r) => sum + r.count, 0),
            },
            risks: {
                byRoamStatus: Object.fromEntries(riskCounts.map(r => [r.roam_status, r.count])),
                total: riskCounts.reduce((sum, r) => sum + r.count, 0),
            },
            affinities: {
                avgScore: affinityStats?.avg_score ?? 0,
                minScore: affinityStats?.min_score ?? 0,
                maxScore: affinityStats?.max_score ?? 0,
                avgConfidence: affinityStats?.avg_confidence ?? 0,
                totalRelationships: affinityStats?.total_relationships ?? 0,
            },
            activities: {
                last24Hours: recentActivities?.count ?? 0,
            },
            timestamp: new Date().toISOString(),
        };
    }
    // ===========================================================================
    // Cleanup
    // ===========================================================================
    close() {
        this.db.close();
        if (this.agentDb) {
            this.agentDb.close();
        }
    }
}
//# sourceMappingURL=AffiliateStateTracker.js.map