/**
 * Affiliate Affinity System - Type Definitions
 * @module affiliate/types
 */
export type AffiliateStatus = 'pending' | 'active' | 'suspended' | 'archived';
export type AffiliateTier = 'standard' | 'premium' | 'enterprise';
export interface AffiliateState {
    id: number;
    affiliateId: string;
    name: string;
    status: AffiliateStatus;
    tier: AffiliateTier;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateAffiliateInput {
    affiliateId: string;
    name: string;
    status?: AffiliateStatus;
    tier?: AffiliateTier;
    metadata?: Record<string, unknown>;
}
export interface UpdateAffiliateInput {
    name?: string;
    status?: AffiliateStatus;
    tier?: AffiliateTier;
    metadata?: Record<string, unknown>;
}
export type ActivityType = 'login' | 'logout' | 'transaction' | 'referral' | 'commission' | 'payout' | 'tier_change' | 'suspension' | 'reactivation' | 'custom';
export type ActivitySource = 'system' | 'api' | 'user' | 'midstreamer' | 'stripe';
export interface AffiliateActivity {
    id: number;
    affiliateId: string;
    activityType: ActivityType;
    source: ActivitySource;
    payload: Record<string, unknown> | null;
    timestamp: Date;
    createdAt: Date;
}
export interface CreateActivityInput {
    affiliateId: string;
    activityType: ActivityType;
    source?: ActivitySource;
    payload?: Record<string, unknown>;
}
export type RiskType = 'fraud' | 'compliance' | 'chargeback' | 'quality' | 'performance' | 'reputational' | 'financial' | 'technical' | 'operational' | 'security' | 'custom';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RoamStatus = 'resolved' | 'owned' | 'accepted' | 'mitigated';
export interface AffiliateRisk {
    id: number;
    affiliateId: string;
    riskType: RiskType;
    severity: RiskSeverity;
    roamStatus: RoamStatus;
    description: string | null;
    mitigationPlan: string | null;
    evidence: Record<string, unknown> | null;
    owner: string | null;
    resolutionDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateRiskInput {
    affiliateId: string;
    riskType: RiskType;
    severity?: RiskSeverity;
    roamStatus?: RoamStatus;
    description?: string;
    mitigationPlan?: string;
    evidence?: Record<string, unknown>;
    owner?: string;
}
export type RelationshipType = 'peer' | 'referrer' | 'referral' | 'competitor' | 'collaborator';
export interface AffiliateAffinity {
    id: number;
    affiliateId1: string;
    affiliateId2: string;
    affinityScore: number;
    confidence: number;
    relationshipType: RelationshipType;
    interactionCount: number;
    metadata: Record<string, unknown> | null;
    lastUpdated: Date;
    createdAt: Date;
}
export interface CreateAffinityInput {
    affiliateId1: string;
    affiliateId2: string;
    affinityScore?: number;
    confidence?: number;
    relationshipType?: RelationshipType;
    metadata?: Record<string, unknown>;
}
export type AffiliateEventType = 'state_created' | 'state_updated' | 'state_deleted' | 'activity_logged' | 'risk_created' | 'risk_updated' | 'affinity_created' | 'affinity_updated' | 'status_transition';
export interface AffiliateEvent {
    type: AffiliateEventType;
    affiliateId: string;
    timestamp: Date;
    data: Record<string, unknown>;
    source: string;
}
export type AffiliateEventHandler = (event: AffiliateEvent) => void | Promise<void>;
export interface StateTransition {
    from: AffiliateStatus;
    to: AffiliateStatus;
    allowed: boolean;
    requiresApproval: boolean;
    reason?: string;
}
export declare const STATE_TRANSITIONS: StateTransition[];
//# sourceMappingURL=types.d.ts.map