// =============================================================================
// Affiliate Affinity Ontology - Neo4j Cypher Schema
// =============================================================================
// Defines the knowledge graph structure for affiliate relationship modeling
// Nodes: Affiliate, Activity, Risk, AffinityScore
// Relationships: HAS_ACTIVITY, HAS_RISK, AFFILIATED_WITH
// Created: 2025-12-01
// =============================================================================

// -----------------------------------------------------------------------------
// Node Labels and Properties
// -----------------------------------------------------------------------------

// Affiliate Node - Core entity representing an affiliate partner
// CREATE CONSTRAINT affiliate_id_unique IF NOT EXISTS FOR (a:Affiliate) REQUIRE a.affiliateId IS UNIQUE;

CREATE (a:Affiliate {
  affiliateId: $affiliateId,
  name: $name,
  status: $status,       // pending, active, suspended, archived
  tier: $tier,           // standard, premium, enterprise
  region: $region,       // NA, EU, APAC, LATAM
  vertical: $vertical,   // fintech, saas, ecommerce, media, retail
  createdAt: datetime(),
  updatedAt: datetime()
});

// Activity Node - Events and actions taken by affiliates
CREATE (act:Activity {
  activityId: $activityId,
  activityType: $activityType, // login, transaction, referral, commission, etc.
  source: $source,             // system, api, user, midstreamer
  timestamp: datetime($timestamp),
  payload: $payload            // JSON string of activity data
});

// Risk Node - ROAM-aligned risk tracking
CREATE (r:Risk {
  riskId: $riskId,
  riskType: $riskType,     // fraud, compliance, chargeback, quality, etc.
  severity: $severity,     // low, medium, high, critical
  roamStatus: $roamStatus, // resolved, owned, accepted, mitigated
  description: $description,
  mitigationPlan: $mitigationPlan,
  owner: $owner,
  createdAt: datetime(),
  resolvedAt: $resolvedAt
});

// AffinityScore Node - Computed affinity metrics between affiliates
CREATE (af:AffinityScore {
  scoreId: $scoreId,
  affinityScore: $affinityScore,   // -1.0 to 1.0
  confidence: $confidence,          // 0.0 to 1.0
  relationshipType: $relationshipType, // peer, referrer, referral, competitor, collaborator
  interactionCount: $interactionCount,
  lastUpdated: datetime()
});

// -----------------------------------------------------------------------------
// Relationships
// -----------------------------------------------------------------------------

// HAS_ACTIVITY - Links affiliate to their activities
// (Affiliate)-[:HAS_ACTIVITY {source: 'api', priority: 1}]->(Activity)
MATCH (a:Affiliate {affiliateId: $affiliateId})
MATCH (act:Activity {activityId: $activityId})
CREATE (a)-[:HAS_ACTIVITY {
  recordedAt: datetime(),
  source: $source,
  priority: $priority
}]->(act);

// HAS_RISK - Links affiliate to their risks
// (Affiliate)-[:HAS_RISK {severity: 'high', acknowledged: true}]->(Risk)
MATCH (a:Affiliate {affiliateId: $affiliateId})
MATCH (r:Risk {riskId: $riskId})
CREATE (a)-[:HAS_RISK {
  detectedAt: datetime(),
  acknowledged: $acknowledged,
  reviewedBy: $reviewedBy
}]->(r);

// AFFILIATED_WITH - Bidirectional relationship between affiliates
// (Affiliate)-[:AFFILIATED_WITH {score: 0.85, type: 'collaborator'}]->(Affiliate)
MATCH (a1:Affiliate {affiliateId: $affiliateId1})
MATCH (a2:Affiliate {affiliateId: $affiliateId2})
CREATE (a1)-[:AFFILIATED_WITH {
  affinityScore: $affinityScore,
  confidence: $confidence,
  relationshipType: $relationshipType,
  interactionCount: $interactionCount,
  establishedAt: datetime(),
  lastInteraction: datetime()
}]->(a2);

// HAS_SCORE - Links affiliates to computed affinity scores
// (Affiliate)-[:HAS_SCORE]->(AffinityScore)<-[:HAS_SCORE]-(Affiliate)
MATCH (a1:Affiliate {affiliateId: $affiliateId1})
MATCH (a2:Affiliate {affiliateId: $affiliateId2})
MATCH (af:AffinityScore {scoreId: $scoreId})
CREATE (a1)-[:HAS_SCORE]->(af)<-[:HAS_SCORE]-(a2);

// -----------------------------------------------------------------------------
// Indexes for Performance
// -----------------------------------------------------------------------------

// Core lookup indexes
CREATE INDEX affiliate_id_idx IF NOT EXISTS FOR (a:Affiliate) ON (a.affiliateId);
CREATE INDEX affiliate_status_idx IF NOT EXISTS FOR (a:Affiliate) ON (a.status);
CREATE INDEX affiliate_tier_idx IF NOT EXISTS FOR (a:Affiliate) ON (a.tier);
CREATE INDEX affiliate_region_idx IF NOT EXISTS FOR (a:Affiliate) ON (a.region);

// Activity indexes
CREATE INDEX activity_type_idx IF NOT EXISTS FOR (act:Activity) ON (act.activityType);
CREATE INDEX activity_timestamp_idx IF NOT EXISTS FOR (act:Activity) ON (act.timestamp);

// Risk indexes
CREATE INDEX risk_type_idx IF NOT EXISTS FOR (r:Risk) ON (r.riskType);
CREATE INDEX risk_severity_idx IF NOT EXISTS FOR (r:Risk) ON (r.severity);
CREATE INDEX risk_roam_idx IF NOT EXISTS FOR (r:Risk) ON (r.roamStatus);

// Affinity indexes
CREATE INDEX affinity_score_idx IF NOT EXISTS FOR (af:AffinityScore) ON (af.affinityScore);
CREATE INDEX affinity_type_idx IF NOT EXISTS FOR (af:AffinityScore) ON (af.relationshipType);

// -----------------------------------------------------------------------------
// Common Query Patterns
// -----------------------------------------------------------------------------

// Get all affiliates with high affinity (> 0.7)
// MATCH (a1:Affiliate)-[r:AFFILIATED_WITH]->(a2:Affiliate)
// WHERE r.affinityScore > 0.7
// RETURN a1.name, a2.name, r.affinityScore, r.relationshipType
// ORDER BY r.affinityScore DESC;

// Get risk summary for an affiliate
// MATCH (a:Affiliate {affiliateId: $affiliateId})-[:HAS_RISK]->(r:Risk)
// RETURN r.riskType, r.severity, r.roamStatus, r.description
// ORDER BY r.severity DESC;

// Find collaboration network (2 degrees)
// MATCH path = (a:Affiliate {affiliateId: $affiliateId})-[:AFFILIATED_WITH*1..2]-(related:Affiliate)
// WHERE a <> related
// RETURN DISTINCT related.name, related.affiliateId, length(path) as degree;

// Get recent high-value activities
// MATCH (a:Affiliate)-[:HAS_ACTIVITY]->(act:Activity)
// WHERE act.activityType = 'transaction' AND act.timestamp > datetime() - duration('P7D')
// RETURN a.name, act.payload, act.timestamp
// ORDER BY act.timestamp DESC LIMIT 50;

