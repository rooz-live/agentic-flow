-- Migration: 002_seed_sample_data
-- Description: Seed affiliate system with sample data for testing
-- Created: 2025-12-01

-- Sample affiliate states
INSERT OR IGNORE INTO affiliate_states (affiliate_id, name, status, tier, metadata) VALUES
    ('AFF-001', 'Alpha Partners', 'active', 'enterprise', '{"region": "NA", "vertical": "fintech", "onboarding_score": 0.95}'),
    ('AFF-002', 'Beta Marketing Co', 'active', 'premium', '{"region": "EU", "vertical": "saas", "onboarding_score": 0.88}'),
    ('AFF-003', 'Gamma Digital', 'active', 'standard', '{"region": "APAC", "vertical": "ecommerce", "onboarding_score": 0.75}'),
    ('AFF-004', 'Delta Referrals', 'pending', 'standard', '{"region": "NA", "vertical": "media", "onboarding_score": 0.60}'),
    ('AFF-005', 'Epsilon Networks', 'suspended', 'premium', '{"region": "EU", "vertical": "fintech", "suspension_reason": "compliance_review"}'),
    ('AFF-006', 'Zeta Solutions', 'archived', 'standard', '{"region": "LATAM", "vertical": "retail", "archive_reason": "inactivity"}');

-- Sample activities
INSERT INTO affiliate_activities (affiliate_id, activity_type, source, payload) VALUES
    ('AFF-001', 'login', 'api', '{"ip": "10.0.1.100", "device": "web"}'),
    ('AFF-001', 'transaction', 'system', '{"amount": 1500.00, "currency": "USD", "product_id": "PRD-001"}'),
    ('AFF-001', 'commission', 'system', '{"amount": 150.00, "rate": 0.10, "transaction_id": "TXN-001"}'),
    ('AFF-002', 'login', 'api', '{"ip": "10.0.2.50", "device": "mobile"}'),
    ('AFF-002', 'referral', 'midstreamer', '{"referred_id": "AFF-004", "channel": "email"}'),
    ('AFF-002', 'transaction', 'system', '{"amount": 2500.00, "currency": "EUR", "product_id": "PRD-002"}'),
    ('AFF-003', 'login', 'api', '{"ip": "10.0.3.25", "device": "web"}'),
    ('AFF-003', 'tier_change', 'system', '{"from": "basic", "to": "standard", "reason": "performance"}'),
    ('AFF-005', 'suspension', 'system', '{"reason": "compliance_review", "initiated_by": "compliance_team"}'),
    ('AFF-005', 'custom', 'system', '{"event": "audit_triggered", "auditor": "SEC-001"}');

-- Sample risks
INSERT INTO affiliate_risks (affiliate_id, risk_type, severity, roam_status, description, mitigation_plan, owner) VALUES
    ('AFF-005', 'compliance', 'high', 'owned', 'Pending KYC documentation verification', 'Request updated documents, escalate to compliance team', 'assessor_circle'),
    ('AFF-003', 'performance', 'medium', 'mitigated', 'Conversion rate below threshold (2.1% vs 3.0% target)', 'Implemented optimization recommendations, monitoring improvement', 'innovator_circle'),
    ('AFF-002', 'chargeback', 'low', 'accepted', 'Single chargeback incident within acceptable limits', 'Continue monitoring, no action required', 'orchestrator_circle'),
    ('AFF-001', 'quality', 'medium', 'resolved', 'Traffic quality concerns from Q3 audit', 'Implemented traffic filtering, resolved after 30-day review', 'seeker_circle');

-- Sample affinities
INSERT INTO affiliate_affinities (affiliate_id_1, affiliate_id_2, affinity_score, confidence, relationship_type, interaction_count, metadata) VALUES
    ('AFF-001', 'AFF-002', 0.85, 0.92, 'collaborator', 45, '{"shared_campaigns": 3, "co_referrals": 12}'),
    ('AFF-002', 'AFF-004', 0.95, 0.88, 'referrer', 1, '{"referral_date": "2025-11-15", "channel": "email"}'),
    ('AFF-001', 'AFF-003', 0.45, 0.75, 'peer', 8, '{"industry_overlap": 0.3}'),
    ('AFF-002', 'AFF-003', 0.65, 0.80, 'peer', 15, '{"geographic_overlap": 0.1}'),
    ('AFF-001', 'AFF-005', -0.25, 0.60, 'competitor', 3, '{"market_competition": "moderate"}');

