-- Migration: 001_create_affiliate_tables
-- Description: Create affiliate system database schema
-- Created: 2025-12-01
-- Author: Affiliate Affinity System Implementation

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Table: affiliate_states
-- Description: Tracks affiliate lifecycle states (pending → active → suspended → archived)
-- =============================================================================
CREATE TABLE IF NOT EXISTS affiliate_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliate_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'archived')),
    tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'premium', 'enterprise')),
    metadata TEXT, -- JSON blob for extensible attributes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for affiliate_states
CREATE INDEX IF NOT EXISTS idx_affiliate_states_affiliate_id ON affiliate_states(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_states_status ON affiliate_states(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_states_tier ON affiliate_states(tier);
CREATE INDEX IF NOT EXISTS idx_affiliate_states_created_at ON affiliate_states(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_states_updated_at ON affiliate_states(updated_at);

-- =============================================================================
-- Table: affiliate_activities
-- Description: Tracks affiliate activity events (login, transaction, referral, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS affiliate_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliate_id TEXT NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'transaction', 'referral', 'commission', 
        'payout', 'tier_change', 'suspension', 'reactivation', 'custom'
    )),
    source TEXT DEFAULT 'system', -- origin of activity (system, api, user, midstreamer)
    payload TEXT, -- JSON blob for activity-specific data
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (affiliate_id) REFERENCES affiliate_states(affiliate_id) ON DELETE CASCADE
);

-- Indexes for affiliate_activities
CREATE INDEX IF NOT EXISTS idx_affiliate_activities_affiliate_id ON affiliate_activities(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_activities_activity_type ON affiliate_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_activities_source ON affiliate_activities(source);
CREATE INDEX IF NOT EXISTS idx_affiliate_activities_timestamp ON affiliate_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_affiliate_activities_created_at ON affiliate_activities(created_at);

-- =============================================================================
-- Table: affiliate_risks
-- Description: ROAM-aligned risk tracking for affiliates
-- =============================================================================
CREATE TABLE IF NOT EXISTS affiliate_risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliate_id TEXT NOT NULL,
    risk_type TEXT NOT NULL CHECK (risk_type IN (
        'fraud', 'compliance', 'chargeback', 'quality', 'performance', 
        'reputational', 'financial', 'technical', 'operational', 'custom'
    )),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    roam_status TEXT NOT NULL DEFAULT 'owned' CHECK (roam_status IN ('resolved', 'owned', 'accepted', 'mitigated')),
    description TEXT,
    mitigation_plan TEXT,
    evidence TEXT, -- JSON blob for supporting evidence
    owner TEXT, -- Circle or individual responsible
    resolution_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (affiliate_id) REFERENCES affiliate_states(affiliate_id) ON DELETE CASCADE
);

-- Indexes for affiliate_risks
CREATE INDEX IF NOT EXISTS idx_affiliate_risks_affiliate_id ON affiliate_risks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_risks_risk_type ON affiliate_risks(risk_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_risks_severity ON affiliate_risks(severity);
CREATE INDEX IF NOT EXISTS idx_affiliate_risks_roam_status ON affiliate_risks(roam_status);
CREATE INDEX IF NOT EXISTS idx_affiliate_risks_created_at ON affiliate_risks(created_at);

-- =============================================================================
-- Table: affiliate_affinities
-- Description: Affinity scores between affiliate pairs (bidirectional relationships)
-- =============================================================================
CREATE TABLE IF NOT EXISTS affiliate_affinities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliate_id_1 TEXT NOT NULL,
    affiliate_id_2 TEXT NOT NULL,
    affinity_score REAL NOT NULL DEFAULT 0.0 CHECK (affinity_score >= -1.0 AND affinity_score <= 1.0),
    confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    relationship_type TEXT DEFAULT 'peer' CHECK (relationship_type IN ('peer', 'referrer', 'referral', 'competitor', 'collaborator')),
    interaction_count INTEGER DEFAULT 0,
    metadata TEXT, -- JSON blob for additional affinity attributes
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(affiliate_id_1, affiliate_id_2),
    FOREIGN KEY (affiliate_id_1) REFERENCES affiliate_states(affiliate_id) ON DELETE CASCADE,
    FOREIGN KEY (affiliate_id_2) REFERENCES affiliate_states(affiliate_id) ON DELETE CASCADE
);

-- Indexes for affiliate_affinities
CREATE INDEX IF NOT EXISTS idx_affiliate_affinities_affiliate_id_1 ON affiliate_affinities(affiliate_id_1);
CREATE INDEX IF NOT EXISTS idx_affiliate_affinities_affiliate_id_2 ON affiliate_affinities(affiliate_id_2);
CREATE INDEX IF NOT EXISTS idx_affiliate_affinities_score ON affiliate_affinities(affinity_score);
CREATE INDEX IF NOT EXISTS idx_affiliate_affinities_confidence ON affiliate_affinities(confidence);
CREATE INDEX IF NOT EXISTS idx_affiliate_affinities_relationship_type ON affiliate_affinities(relationship_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_affinities_last_updated ON affiliate_affinities(last_updated);

-- =============================================================================
-- Trigger: Update updated_at on affiliate_states modification
-- =============================================================================
CREATE TRIGGER IF NOT EXISTS update_affiliate_states_timestamp
AFTER UPDATE ON affiliate_states
FOR EACH ROW
BEGIN
    UPDATE affiliate_states SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- =============================================================================
-- Trigger: Update updated_at on affiliate_risks modification
-- =============================================================================
CREATE TRIGGER IF NOT EXISTS update_affiliate_risks_timestamp
AFTER UPDATE ON affiliate_risks
FOR EACH ROW
BEGIN
    UPDATE affiliate_risks SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- =============================================================================
-- Trigger: Update last_updated on affiliate_affinities modification
-- =============================================================================
CREATE TRIGGER IF NOT EXISTS update_affiliate_affinities_timestamp
AFTER UPDATE ON affiliate_affinities
FOR EACH ROW
BEGIN
    UPDATE affiliate_affinities SET last_updated = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

