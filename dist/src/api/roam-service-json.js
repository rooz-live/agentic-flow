/**
 * ROAM Service - JSON File Storage Implementation
 *
 * Drop-in replacement for roam-service.ts using JSON files instead of SQLite.
 * Provides same API but stores data in .roam directory as JSON files.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROAM_DIR = path.resolve(__dirname, '../../.roam');
const ENTITIES_FILE = path.join(ROAM_DIR, 'entities.json');
const TRACES_FILE = path.join(ROAM_DIR, 'traces.json');
const MITIGATIONS_FILE = path.join(ROAM_DIR, 'mitigations.json');
const OBSTACLES_FILE = path.join(ROAM_DIR, 'obstacles.json');
const ASSUMPTIONS_FILE = path.join(ROAM_DIR, 'assumptions.json');
// Internal storage
let entities = [];
let traces = [];
let mitigations = [];
let obstacles = [];
let assumptions = [];
let nextId = 1;
/**
 * Initialize storage directory and load data
 */
export function initializeDatabase(_schemaPath) {
    // Create directory if it doesn't exist
    if (!fs.existsSync(ROAM_DIR)) {
        fs.mkdirSync(ROAM_DIR, { recursive: true });
    }
    // Load existing data
    loadData();
    console.log('✅ ROAM JSON storage initialized');
    return null; // No DB handle needed for JSON
}
/**
 * Load data from JSON files
 */
function loadData() {
    try {
        if (fs.existsSync(ENTITIES_FILE)) {
            const data = JSON.parse(fs.readFileSync(ENTITIES_FILE, 'utf-8'));
            entities = data.entities || [];
            nextId = data.nextId || 1;
        }
        if (fs.existsSync(TRACES_FILE)) {
            traces = JSON.parse(fs.readFileSync(TRACES_FILE, 'utf-8'));
        }
        if (fs.existsSync(MITIGATIONS_FILE)) {
            mitigations = JSON.parse(fs.readFileSync(MITIGATIONS_FILE, 'utf-8'));
        }
        if (fs.existsSync(OBSTACLES_FILE)) {
            obstacles = JSON.parse(fs.readFileSync(OBSTACLES_FILE, 'utf-8'));
        }
        if (fs.existsSync(ASSUMPTIONS_FILE)) {
            assumptions = JSON.parse(fs.readFileSync(ASSUMPTIONS_FILE, 'utf-8'));
        }
    }
    catch (error) {
        console.error('Error loading ROAM data:', error);
    }
}
/**
 * Save entities to file
 */
function saveEntities() {
    fs.writeFileSync(ENTITIES_FILE, JSON.stringify({ entities, nextId }, null, 2));
}
function saveTraces() {
    fs.writeFileSync(TRACES_FILE, JSON.stringify(traces, null, 2));
}
function saveMitigations() {
    fs.writeFileSync(MITIGATIONS_FILE, JSON.stringify(mitigations, null, 2));
}
function saveObstacles() {
    fs.writeFileSync(OBSTACLES_FILE, JSON.stringify(obstacles, null, 2));
}
function saveAssumptions() {
    fs.writeFileSync(ASSUMPTIONS_FILE, JSON.stringify(assumptions, null, 2));
}
/**
 * Create a new ROAM entity
 */
export function createROAM(entity) {
    const id = nextId++;
    const newEntity = {
        id,
        type: entity.type,
        title: entity.title,
        details: entity.details || '',
        owner_circle: entity.owner_circle,
        status: entity.status || 'pending',
        priority: entity.priority || 'medium',
        created_at: Math.floor(Date.now() / 1000),
        resolved_at: undefined,
        metadata: entity.metadata || null,
    };
    entities.push(newEntity);
    saveEntities();
    return id;
}
/**
 * Update ROAM entity status
 */
export function updateROAMStatus(id, status, resolution) {
    const entity = entities.find(e => e.id === id);
    if (!entity)
        return false;
    entity.status = status;
    if (status === 'resolved' || status === 'accepted') {
        entity.resolved_at = Math.floor(Date.now() / 1000);
    }
    if (resolution && entity.details) {
        entity.details += '\n\nResolution: ' + resolution;
    }
    saveEntities();
    return true;
}
/**
 * Get ROAM entities by circle
 */
export function getROAMByCircle(circle, type, status) {
    return entities.filter(e => {
        if (e.owner_circle !== circle)
            return false;
        if (type && e.type !== type)
            return false;
        if (status && e.status !== status)
            return false;
        return true;
    }).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}
/**
 * Get all ROAM entities (optionally filtered)
 */
export function getAllROAM(filters) {
    if (!filters)
        return [...entities].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    return entities.filter(e => {
        if (filters.type && e.type !== filters.type)
            return false;
        if (filters.status && e.status !== filters.status)
            return false;
        if (filters.priority && e.priority !== filters.priority)
            return false;
        return true;
    }).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}
/**
 * Get ROAM entity by ID
 */
export function getROAMById(id) {
    return entities.find(e => e.id === id) || null;
}
/**
 * Link ROAM entity to episode
 */
export function linkROAMToEpisode(roam_id, episode_id, impact) {
    const trace = {
        id: traces.length + 1,
        roam_id,
        episode_id,
        impact: impact || '',
        timestamp: Math.floor(Date.now() / 1000),
    };
    traces.push(trace);
    saveTraces();
    return trace.id;
}
/**
 * Get full traceability for a ROAM entity
 */
export function getROAMTraceability(roam_id) {
    const entity = getROAMById(roam_id);
    if (!entity) {
        throw new Error(`ROAM entity ${roam_id} not found`);
    }
    const entityTraces = traces.filter(t => t.roam_id === roam_id);
    let mitigation;
    if (entity.type === 'mitigation') {
        mitigation = mitigations.find(m => m.mitigation_id === roam_id);
    }
    let target_of_mitigations;
    if (entity.type === 'risk' || entity.type === 'obstacle') {
        target_of_mitigations = mitigations.filter(m => m.target_roam_id === roam_id);
    }
    return {
        entity,
        traces: entityTraces,
        mitigation,
        target_of_mitigations,
    };
}
/**
 * Get ROAM metrics summary
 */
export function getROAMSummary() {
    const risk = entities.filter(e => e.type === 'risk' && e.status !== 'resolved').length;
    const obstacle = entities.filter(e => e.type === 'obstacle' && e.status !== 'resolved').length;
    const assumption = entities.filter(e => e.type === 'assumption' && e.status !== 'accepted').length;
    const mitigation = entities.filter(e => e.type === 'mitigation').length;
    const exposureScore = Math.min((risk * 2.0 + obstacle * 1.5 + assumption * 1.0) / 10.0, 10);
    return {
        risk,
        obstacle,
        assumption,
        mitigation,
        total: entities.length,
        exposureScore,
    };
}
/**
 * Create obstacle ownership record
 */
export function setObstacleOwnership(ownership) {
    const existing = obstacles.findIndex(o => o.obstacle_id === ownership.obstacle_id);
    if (existing >= 0) {
        obstacles[existing] = {
            ...ownership,
            id: obstacles[existing].id,
            last_updated: Math.floor(Date.now() / 1000),
        };
    }
    else {
        const newOwnership = {
            ...ownership,
            id: obstacles.length + 1,
            last_updated: Math.floor(Date.now() / 1000),
        };
        obstacles.push(newOwnership);
    }
    saveObstacles();
    return ownership.obstacle_id;
}
/**
 * Get obstacle ownership
 */
export function getObstacleOwnership(obstacle_id) {
    if (obstacle_id !== undefined) {
        const ownership = obstacles.find(o => o.obstacle_id === obstacle_id);
        return ownership ? [ownership] : [];
    }
    return [...obstacles];
}
/**
 * Create/update assumption validation
 */
export function setAssumptionValidation(validation) {
    const existing = assumptions.findIndex(a => a.assumption_id === validation.assumption_id);
    if (existing >= 0) {
        assumptions[existing] = {
            ...validation,
            id: assumptions[existing].id,
            validated_at: validation.validation_status === 'dod_met' ? Math.floor(Date.now() / 1000) : undefined,
        };
    }
    else {
        const newValidation = {
            ...validation,
            id: assumptions.length + 1,
        };
        assumptions.push(newValidation);
    }
    saveAssumptions();
    return validation.assumption_id;
}
/**
 * Get assumption validation
 */
export function getAssumptionValidation(assumption_id) {
    return assumptions.find(a => a.assumption_id === assumption_id) || null;
}
/**
 * Create mitigation plan
 */
export function createMitigationPlan(plan) {
    const newPlan = {
        ...plan,
        id: mitigations.length + 1,
        effectiveness_score: plan.effectiveness_score || 0.0,
        implementation_status: plan.implementation_status || 'planned',
    };
    mitigations.push(newPlan);
    saveMitigations();
    return newPlan.id;
}
/**
 * Update mitigation effectiveness
 */
export function updateMitigationEffectiveness(mitigation_id, score) {
    const mitigation = mitigations.find(m => m.mitigation_id === mitigation_id);
    if (!mitigation)
        return false;
    mitigation.effectiveness_score = score;
    mitigation.last_validated = Math.floor(Date.now() / 1000);
    saveMitigations();
    return true;
}
/**
 * Get mitigation effectiveness view
 */
export function getMitigationEffectiveness() {
    return mitigations.map(m => {
        const mitigationEntity = getROAMById(m.mitigation_id);
        const targetEntity = getROAMById(m.target_roam_id);
        const traceCount = traces.filter(t => t.roam_id === m.mitigation_id).length;
        return {
            mitigation_id: m.mitigation_id,
            target_roam_id: m.target_roam_id,
            mitigation_title: mitigationEntity?.title || 'Unknown',
            target_title: targetEntity?.title || 'Unknown',
            target_type: targetEntity?.type || 'unknown',
            effectiveness_score: m.effectiveness_score,
            implementation_status: m.implementation_status,
            trace_count: traceCount,
        };
    });
}
/**
 * Delete ROAM entity
 */
export function deleteROAM(id) {
    const index = entities.findIndex(e => e.id === id);
    if (index === -1)
        return false;
    entities.splice(index, 1);
    // Clean up related data
    traces = traces.filter(t => t.roam_id !== id);
    mitigations = mitigations.filter(m => m.mitigation_id !== id && m.target_roam_id !== id);
    obstacles = obstacles.filter(o => o.obstacle_id !== id);
    assumptions = assumptions.filter(a => a.assumption_id !== id);
    saveEntities();
    saveTraces();
    saveMitigations();
    saveObstacles();
    saveAssumptions();
    return true;
}
/**
 * Close database connection (no-op for JSON)
 */
export function closeDatabase() {
    // No-op for JSON storage
}
//# sourceMappingURL=roam-service-json.js.map