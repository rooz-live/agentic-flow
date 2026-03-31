/**
 * ConceptNet Integration for Affiliate Affinity Scoring
 *
 * Provides semantic relationship queries for affiliate behavior pattern analysis.
 * Uses ConceptNet 5 REST API: https://conceptnet.io/
 *
 * Features:
 * - Semantic relationship queries between concepts
 * - Edge/relation analysis for affiliate relationships
 * - Multi-language support for international affiliates
 * - Fallback to cached relationships when API unavailable
 *
 * @module conceptnet_integration
 */
import { EventEmitter } from 'events';
export type ConceptNetRelation = 'RelatedTo' | 'FormOf' | 'IsA' | 'PartOf' | 'HasA' | 'UsedFor' | 'CapableOf' | 'AtLocation' | 'Causes' | 'HasSubevent' | 'HasFirstSubevent' | 'HasLastSubevent' | 'HasPrerequisite' | 'HasProperty' | 'MotivatedByGoal' | 'ObstructedBy' | 'Desires' | 'CreatedBy' | 'Synonym' | 'Antonym' | 'DistinctFrom' | 'DerivedFrom' | 'SymbolOf' | 'DefinedAs' | 'MannerOf' | 'LocatedNear' | 'HasContext' | 'SimilarTo' | 'EtymologicallyRelatedTo' | 'EtymologicallyDerivedFrom' | 'CausesDesire' | 'MadeOf' | 'ReceivesAction' | 'ExternalURL';
export interface ConceptNetEdge {
    start: {
        '@id': string;
        label: string;
        language: string;
    };
    end: {
        '@id': string;
        label: string;
        language: string;
    };
    rel: {
        '@id': string;
        label: ConceptNetRelation;
    };
    weight: number;
    surfaceText: string | null;
    sources: Array<{
        '@id': string;
    }>;
}
export interface ConceptNetResponse {
    '@id': string;
    edges: ConceptNetEdge[];
    view?: {
        '@id': string;
        firstPage: string;
        nextPage?: string;
        previousPage?: string;
    };
}
export interface AffiliateSemanticScore {
    affiliateId: string;
    concept: string;
    relatedConcepts: Array<{
        concept: string;
        relation: ConceptNetRelation;
        weight: number;
    }>;
    semanticScore: number;
    confidence: number;
    timestamp: Date;
}
export interface ConceptNetConfig {
    apiBase?: string;
    timeout?: number;
    language?: string;
    maxEdges?: number;
    enableCache?: boolean;
    cacheTTLMs?: number;
}
/**
 * ConceptNet client for affiliate semantic analysis
 */
export declare class ConceptNetClient extends EventEmitter {
    private config;
    private cache;
    private isAvailable;
    private lastHealthCheck;
    constructor(config?: ConceptNetConfig);
    /**
     * Query ConceptNet for a concept
     */
    queryConcept(concept: string, limit?: number): Promise<ConceptNetResponse | null>;
    /**
     * Get semantic relationships between two concepts
     */
    getRelationship(concept1: string, concept2: string): Promise<ConceptNetEdge[]>;
    /**
     * Calculate semantic affinity score for an affiliate based on their activity concepts
     */
    calculateAffiliateSemanticScore(affiliateId: string, activityConcepts: string[]): Promise<AffiliateSemanticScore[]>;
    /** Health check for API availability */
    healthCheck(): Promise<boolean>;
    /** Get API availability status */
    getStatus(): {
        available: boolean;
        lastCheck: Date;
        cacheSize: number;
    };
    /** Clear cache */
    clearCache(): void;
}
/** Factory function */
export declare function createConceptNetClient(config?: ConceptNetConfig): ConceptNetClient;
//# sourceMappingURL=conceptnet_integration.d.ts.map