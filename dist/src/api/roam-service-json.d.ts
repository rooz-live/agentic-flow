/**
 * ROAM Service - JSON File Storage Implementation
 *
 * Drop-in replacement for roam-service.ts using JSON files instead of SQLite.
 * Provides same API but stores data in .roam directory as JSON files.
 */
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
    dor_criteria?: Array<{
        criterion: string;
        required: boolean;
        validated: boolean;
        validated_at?: number;
    }>;
    dod_criteria?: Array<{
        criterion: string;
        required: boolean;
        validated: boolean;
        validated_at?: number;
    }>;
    validation_status?: 'pending' | 'dor_met' | 'dod_met' | 'failed';
    validated_at?: number;
    failure_reason?: string;
    lesson_learned?: string;
}
/**
 * Initialize storage directory and load data
 */
export declare function initializeDatabase(_schemaPath?: string): any;
/**
 * Create a new ROAM entity
 */
export declare function createROAM(entity: ROAMEntity): number;
/**
 * Update ROAM entity status
 */
export declare function updateROAMStatus(id: number, status: ROAMStatus, resolution?: string): boolean;
/**
 * Get ROAM entities by circle
 */
export declare function getROAMByCircle(circle: string, type?: ROAMType, status?: ROAMStatus): ROAMEntity[];
/**
 * Get all ROAM entities (optionally filtered)
 */
export declare function getAllROAM(filters?: {
    type?: ROAMType;
    status?: ROAMStatus;
    priority?: ROAMPriority;
}): ROAMEntity[];
/**
 * Get ROAM entity by ID
 */
export declare function getROAMById(id: number): ROAMEntity | null;
/**
 * Link ROAM entity to episode
 */
export declare function linkROAMToEpisode(roam_id: number, episode_id: string, impact?: string): number;
/**
 * Get full traceability for a ROAM entity
 */
export declare function getROAMTraceability(roam_id: number): {
    entity: ROAMEntity;
    traces: any[];
    mitigation?: MitigationPlan;
    target_of_mitigations?: MitigationPlan[];
};
/**
 * Get ROAM metrics summary
 */
export declare function getROAMSummary(): {
    risk: number;
    obstacle: number;
    assumption: number;
    mitigation: number;
    total: number;
    exposureScore: number;
};
/**
 * Create obstacle ownership record
 */
export declare function setObstacleOwnership(ownership: ObstacleOwnership): number;
/**
 * Get obstacle ownership
 */
export declare function getObstacleOwnership(obstacle_id?: number): ObstacleOwnership[];
/**
 * Create/update assumption validation
 */
export declare function setAssumptionValidation(validation: AssumptionValidation): number;
/**
 * Get assumption validation
 */
export declare function getAssumptionValidation(assumption_id: number): AssumptionValidation | null;
/**
 * Create mitigation plan
 */
export declare function createMitigationPlan(plan: MitigationPlan): number;
/**
 * Update mitigation effectiveness
 */
export declare function updateMitigationEffectiveness(mitigation_id: number, score: number): boolean;
/**
 * Get mitigation effectiveness view
 */
export declare function getMitigationEffectiveness(): any[];
/**
 * Delete ROAM entity
 */
export declare function deleteROAM(id: number): boolean;
/**
 * Close database connection (no-op for JSON)
 */
export declare function closeDatabase(): void;
//# sourceMappingURL=roam-service-json.d.ts.map