/**
 * Neo4j Affiliate Integration
 * @module integrations/neo4j_affiliate
 *
 * Provides Neo4j graph database integration for affiliate affinity modeling.
 * Uses the neo4j-driver package for connection management and query execution.
 */
import neo4j from 'neo4j-driver';
const DEFAULT_CONFIG = {
    database: 'neo4j',
    maxConnectionPoolSize: 50,
    connectionTimeout: 30000,
};
// =============================================================================
// Neo4j Affiliate Client
// =============================================================================
export class Neo4jAffiliateClient {
    driver = null;
    config;
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    // ===========================================================================
    // Connection Management
    // ===========================================================================
    async connect() {
        this.driver = neo4j.driver(this.config.uri, neo4j.auth.basic(this.config.username, this.config.password), {
            maxConnectionPoolSize: this.config.maxConnectionPoolSize,
            connectionTimeout: this.config.connectionTimeout,
        });
        // Verify connectivity
        await this.driver.verifyConnectivity();
    }
    async close() {
        if (this.driver) {
            await this.driver.close();
            this.driver = null;
        }
    }
    getSession() {
        if (!this.driver) {
            throw new Error('Neo4j driver not connected. Call connect() first.');
        }
        return this.driver.session({ database: this.config.database });
    }
    // ===========================================================================
    // Affiliate Node Operations
    // ===========================================================================
    async createAffiliate(affiliate) {
        const session = this.getSession();
        try {
            await session.run(`CREATE (a:Affiliate {
          affiliateId: $affiliateId,
          name: $name,
          status: $status,
          tier: $tier,
          createdAt: datetime(),
          updatedAt: datetime()
        })`, {
                affiliateId: affiliate.affiliateId,
                name: affiliate.name,
                status: affiliate.status,
                tier: affiliate.tier,
            });
        }
        finally {
            await session.close();
        }
    }
    async updateAffiliateStatus(affiliateId, status) {
        const session = this.getSession();
        try {
            await session.run(`MATCH (a:Affiliate {affiliateId: $affiliateId})
         SET a.status = $status, a.updatedAt = datetime()`, { affiliateId, status });
        }
        finally {
            await session.close();
        }
    }
    async getAffiliate(affiliateId) {
        const session = this.getSession();
        try {
            const result = await session.run(`MATCH (a:Affiliate {affiliateId: $affiliateId})
         RETURN a`, { affiliateId });
            return result.records.length > 0 ? result.records[0].get('a').properties : null;
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // Activity Operations
    // ===========================================================================
    async logActivity(affiliateId, activity) {
        const session = this.getSession();
        try {
            await session.run(`MATCH (a:Affiliate {affiliateId: $affiliateId})
         CREATE (act:Activity {
           activityId: $activityId,
           activityType: $activityType,
           source: $source,
           timestamp: datetime($timestamp),
           payload: $payload
         })
         CREATE (a)-[:HAS_ACTIVITY {recordedAt: datetime()}]->(act)`, {
                affiliateId,
                activityId: `act_${Date.now()}`,
                activityType: activity.activityType,
                source: activity.source,
                timestamp: activity.timestamp.toISOString(),
                payload: JSON.stringify(activity.payload),
            });
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // Risk Operations
    // ===========================================================================
    async createRisk(affiliateId, risk) {
        const session = this.getSession();
        try {
            await session.run(`MATCH (a:Affiliate {affiliateId: $affiliateId})
         CREATE (r:Risk {
           riskId: $riskId,
           riskType: $riskType,
           severity: $severity,
           roamStatus: $roamStatus,
           description: $description,
           mitigationPlan: $mitigationPlan,
           owner: $owner,
           createdAt: datetime()
         })
         CREATE (a)-[:HAS_RISK {detectedAt: datetime()}]->(r)`, {
                affiliateId,
                riskId: `risk_${Date.now()}`,
                riskType: risk.riskType,
                severity: risk.severity,
                roamStatus: risk.roamStatus,
                description: risk.description || '',
                mitigationPlan: risk.mitigationPlan || '',
                owner: risk.owner || '',
            });
        }
        finally {
            await session.close();
        }
    }
    async updateRiskStatus(riskId, roamStatus) {
        const session = this.getSession();
        try {
            await session.run(`MATCH (r:Risk {riskId: $riskId})
         SET r.roamStatus = $roamStatus, r.resolvedAt = CASE WHEN $roamStatus = 'resolved' THEN datetime() ELSE r.resolvedAt END`, { riskId, roamStatus });
        }
        finally {
            await session.close();
        }
    }
    async getRisksByAffiliate(affiliateId) {
        const session = this.getSession();
        try {
            const result = await session.run(`MATCH (a:Affiliate {affiliateId: $affiliateId})-[:HAS_RISK]->(r:Risk)
         RETURN r ORDER BY r.severity DESC`, { affiliateId });
            return result.records.map(record => record.get('r').properties);
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // Affinity Operations
    // ===========================================================================
    async createAffinity(affinity) {
        const session = this.getSession();
        try {
            await session.run(`MATCH (a1:Affiliate {affiliateId: $affiliateId1})
         MATCH (a2:Affiliate {affiliateId: $affiliateId2})
         CREATE (a1)-[:AFFILIATED_WITH {
           affinityScore: $affinityScore,
           confidence: $confidence,
           relationshipType: $relationshipType,
           interactionCount: $interactionCount,
           establishedAt: datetime(),
           lastInteraction: datetime()
         }]->(a2)`, {
                affiliateId1: affinity.affiliateId1,
                affiliateId2: affinity.affiliateId2,
                affinityScore: affinity.affinityScore,
                confidence: affinity.confidence,
                relationshipType: affinity.relationshipType,
                interactionCount: affinity.interactionCount,
            });
        }
        finally {
            await session.close();
        }
    }
    async updateAffinityScore(affiliateId1, affiliateId2, score, confidence) {
        const session = this.getSession();
        try {
            const params = {
                affiliateId1,
                affiliateId2,
                affinityScore: score,
            };
            let setClause = 'r.affinityScore = $affinityScore, r.interactionCount = r.interactionCount + 1, r.lastInteraction = datetime()';
            if (confidence !== undefined) {
                params.confidence = confidence;
                setClause += ', r.confidence = $confidence';
            }
            await session.run(`MATCH (a1:Affiliate {affiliateId: $affiliateId1})-[r:AFFILIATED_WITH]-(a2:Affiliate {affiliateId: $affiliateId2})
         SET ${setClause}`, params);
        }
        finally {
            await session.close();
        }
    }
    async getAffinities(affiliateId) {
        const session = this.getSession();
        try {
            const result = await session.run(`MATCH (a:Affiliate {affiliateId: $affiliateId})-[r:AFFILIATED_WITH]-(related:Affiliate)
         RETURN related.affiliateId as relatedId, related.name as relatedName, 
                r.affinityScore as score, r.confidence as confidence, 
                r.relationshipType as type, r.interactionCount as interactions
         ORDER BY r.affinityScore DESC`, { affiliateId });
            return result.records.map(record => ({
                relatedId: record.get('relatedId'),
                relatedName: record.get('relatedName'),
                score: record.get('score'),
                confidence: record.get('confidence'),
                type: record.get('type'),
                interactions: this.toNumber(record.get('interactions')),
            }));
        }
        finally {
            await session.close();
        }
    }
    async getHighAffinityPairs(minScore = 0.7) {
        const session = this.getSession();
        try {
            const result = await session.run(`MATCH (a1:Affiliate)-[r:AFFILIATED_WITH]->(a2:Affiliate)
         WHERE r.affinityScore >= $minScore
         RETURN a1.affiliateId as affiliate1, a1.name as name1,
                a2.affiliateId as affiliate2, a2.name as name2,
                r.affinityScore as score, r.relationshipType as type
         ORDER BY r.affinityScore DESC`, { minScore });
            return result.records.map(record => ({
                affiliate1: record.get('affiliate1'),
                name1: record.get('name1'),
                affiliate2: record.get('affiliate2'),
                name2: record.get('name2'),
                score: record.get('score'),
                type: record.get('type'),
            }));
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // Graph Analytics
    // ===========================================================================
    async getCollaborationNetwork(affiliateId, depth = 2) {
        const session = this.getSession();
        try {
            const result = await session.run(`MATCH path = (a:Affiliate {affiliateId: $affiliateId})-[:AFFILIATED_WITH*1..${depth}]-(related:Affiliate)
         WHERE a <> related
         RETURN DISTINCT related.affiliateId as affiliateId, related.name as name, 
                related.status as status, length(path) as degree
         ORDER BY degree, related.name`, { affiliateId });
            return result.records.map(record => ({
                affiliateId: record.get('affiliateId'),
                name: record.get('name'),
                status: record.get('status'),
                degree: this.toNumber(record.get('degree')),
            }));
        }
        finally {
            await session.close();
        }
    }
    async getAffiliateRiskSummary(affiliateId) {
        const session = this.getSession();
        try {
            const result = await session.run(`MATCH (a:Affiliate {affiliateId: $affiliateId})-[:HAS_RISK]->(r:Risk)
         RETURN r.severity as severity, r.roamStatus as roamStatus, count(*) as count
         ORDER BY r.severity`, { affiliateId });
            const summary = {
                bySeverity: {},
                byRoamStatus: {},
            };
            result.records.forEach(record => {
                const severity = record.get('severity');
                const roamStatus = record.get('roamStatus');
                const count = this.toNumber(record.get('count'));
                summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + count;
                summary.byRoamStatus[roamStatus] = (summary.byRoamStatus[roamStatus] || 0) + count;
            });
            return summary;
        }
        finally {
            await session.close();
        }
    }
    async getNetworkStatistics() {
        const session = this.getSession();
        try {
            const affiliateCount = await session.run('MATCH (a:Affiliate) RETURN count(a) as count');
            const relationshipCount = await session.run('MATCH ()-[r:AFFILIATED_WITH]->() RETURN count(r) as count');
            const avgScore = await session.run('MATCH ()-[r:AFFILIATED_WITH]->() RETURN avg(r.affinityScore) as avg, min(r.affinityScore) as min, max(r.affinityScore) as max');
            const riskCount = await session.run('MATCH (r:Risk) RETURN count(r) as count');
            return {
                affiliates: this.toNumber(affiliateCount.records[0]?.get('count')),
                relationships: this.toNumber(relationshipCount.records[0]?.get('count')),
                avgAffinityScore: avgScore.records[0]?.get('avg') ?? 0,
                minAffinityScore: avgScore.records[0]?.get('min') ?? 0,
                maxAffinityScore: avgScore.records[0]?.get('max') ?? 0,
                totalRisks: this.toNumber(riskCount.records[0]?.get('count')),
            };
        }
        finally {
            await session.close();
        }
    }
    // ===========================================================================
    // Utility Methods
    // ===========================================================================
    toNumber(value) {
        if (value === null || value === undefined)
            return 0;
        if (typeof value === 'number')
            return value;
        if (neo4j.isInt(value))
            return value.toNumber();
        return Number(value) || 0;
    }
    async runQuery(cypher, params = {}) {
        const session = this.getSession();
        try {
            return await session.run(cypher, params);
        }
        finally {
            await session.close();
        }
    }
}
// =============================================================================
// Factory Function
// =============================================================================
export function createNeo4jClient(config) {
    return new Neo4jAffiliateClient(config);
}
// =============================================================================
// Environment-based Configuration
// =============================================================================
export function getConfigFromEnv() {
    return {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password',
        database: process.env.NEO4J_DATABASE || 'neo4j',
    };
}
//# sourceMappingURL=neo4j_affiliate.js.map