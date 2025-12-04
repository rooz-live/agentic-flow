/**
 * Neo4j Affiliate Integration
 * @module integrations/neo4j_affiliate
 *
 * Provides Neo4j graph database integration for affiliate affinity modeling.
 * Uses the neo4j-driver package for connection management and query execution.
 */
import { Result } from 'neo4j-driver';
import { AffiliateState, AffiliateActivity, AffiliateRisk, AffiliateAffinity } from '../affiliate/types';
export interface Neo4jConfig {
    uri: string;
    username: string;
    password: string;
    database?: string;
    maxConnectionPoolSize?: number;
    connectionTimeout?: number;
}
export declare class Neo4jAffiliateClient {
    private driver;
    private config;
    constructor(config: Neo4jConfig);
    connect(): Promise<void>;
    close(): Promise<void>;
    private getSession;
    createAffiliate(affiliate: AffiliateState): Promise<void>;
    updateAffiliateStatus(affiliateId: string, status: string): Promise<void>;
    getAffiliate(affiliateId: string): Promise<Record<string, unknown> | null>;
    logActivity(affiliateId: string, activity: AffiliateActivity): Promise<void>;
    createRisk(affiliateId: string, risk: AffiliateRisk): Promise<void>;
    updateRiskStatus(riskId: string, roamStatus: string): Promise<void>;
    getRisksByAffiliate(affiliateId: string): Promise<Record<string, unknown>[]>;
    createAffinity(affinity: AffiliateAffinity): Promise<void>;
    updateAffinityScore(affiliateId1: string, affiliateId2: string, score: number, confidence?: number): Promise<void>;
    getAffinities(affiliateId: string): Promise<Record<string, unknown>[]>;
    getHighAffinityPairs(minScore?: number): Promise<Record<string, unknown>[]>;
    getCollaborationNetwork(affiliateId: string, depth?: number): Promise<Record<string, unknown>[]>;
    getAffiliateRiskSummary(affiliateId: string): Promise<Record<string, unknown>>;
    getNetworkStatistics(): Promise<Record<string, unknown>>;
    private toNumber;
    runQuery(cypher: string, params?: Record<string, unknown>): Promise<Result>;
}
export declare function createNeo4jClient(config: Neo4jConfig): Neo4jAffiliateClient;
export declare function getConfigFromEnv(): Neo4jConfig;
//# sourceMappingURL=neo4j_affiliate.d.ts.map