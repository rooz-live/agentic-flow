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
import { EventEmitter } from 'events';
import { AffiliateState, AffiliateActivity, AffiliateRisk, AffiliateAffinity, CreateAffiliateInput, UpdateAffiliateInput, CreateActivityInput, CreateRiskInput, CreateAffinityInput, AffiliateStatus, AffiliateEvent, AffiliateEventHandler } from './types';
export interface AffiliateStateTrackerConfig {
    dbPath?: string;
    agentDbPath?: string;
    enableLearning?: boolean;
    maxRetries?: number;
    retryDelayMs?: number;
}
export declare class AffiliateStateTracker extends EventEmitter {
    private db;
    private agentDb;
    private config;
    private eventHandlers;
    constructor(config?: AffiliateStateTrackerConfig);
    private initializeSchema;
    createAffiliate(input: CreateAffiliateInput): AffiliateState;
    getAffiliateById(affiliateId: string): AffiliateState | null;
    getAffiliatesByStatus(status: AffiliateStatus): AffiliateState[];
    getAllAffiliates(): AffiliateState[];
    getAffiliatesByTier(tier: string): AffiliateState[];
    transitionStatus(affiliateId: string, newStatus: AffiliateStatus): {
        success: boolean;
        newStatus?: AffiliateStatus;
        error?: string;
    };
    updateAffiliate(affiliateId: string, input: UpdateAffiliateInput): AffiliateState | null;
    deleteAffiliate(affiliateId: string): boolean;
    private mapRowToAffiliateState;
    logActivity(input: CreateActivityInput): AffiliateActivity;
    getActivityById(id: number): AffiliateActivity | null;
    getActivitiesByAffiliateId(affiliateId: string, limit?: number): AffiliateActivity[];
    private mapRowToActivity;
    createRisk(input: CreateRiskInput): AffiliateRisk;
    getRiskById(id: number): AffiliateRisk | null;
    getRisksByAffiliateId(affiliateId: string): AffiliateRisk[];
    getRisksByRoamStatus(roamStatus: string): AffiliateRisk[];
    private mapRowToRisk;
    createAffinity(input: CreateAffinityInput): AffiliateAffinity;
    getAffinityById(id: number): AffiliateAffinity | null;
    getAffinitiesForAffiliate(affiliateId: string): AffiliateAffinity[];
    updateAffinityScore(affiliateId1: string, affiliateId2: string, score: number, confidence?: number): boolean;
    private mapRowToAffinity;
    validateStatusTransition(from: AffiliateStatus, to: AffiliateStatus): void;
    canTransition(from: AffiliateStatus, to: AffiliateStatus): boolean;
    getValidTransitions(currentStatus: AffiliateStatus): AffiliateStatus[];
    private emitEvent;
    onEvent(type: AffiliateEvent['type'] | '*', handler: AffiliateEventHandler): void;
    private logLearningEvent;
    getStatistics(): Record<string, unknown>;
    close(): void;
}
//# sourceMappingURL=AffiliateStateTracker.d.ts.map