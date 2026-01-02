-- Risk Tracking Database Schema
-- Created: 2024-12-31

CREATE TABLE IF NOT EXISTS risks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK(category IN ('resolved', 'owned', 'accepted', 'mitigated')),
    severity INTEGER CHECK(severity BETWEEN 1 AND 10),
    probability REAL CHECK(probability BETWEEN 0 AND 1),
    impact TEXT,
    owner TEXT,
    circle TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    resolution_notes TEXT
);

CREATE TABLE IF NOT EXISTS risk_mitigations (
    id TEXT PRIMARY KEY,
    risk_id TEXT NOT NULL REFERENCES risks(id),
    action TEXT NOT NULL,
    status TEXT CHECK(status IN ('planned', 'in_progress', 'completed', 'failed')),
    assigned_to TEXT,
    due_date TEXT,
    completed_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS risk_events (
    id TEXT PRIMARY KEY,
    risk_id TEXT NOT NULL REFERENCES risks(id),
    event_type TEXT NOT NULL,
    event_data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_circle ON risks(circle);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity);
CREATE INDEX IF NOT EXISTS idx_mitigations_risk_id ON risk_mitigations(risk_id);
CREATE INDEX IF NOT EXISTS idx_events_risk_id ON risk_events(risk_id);

-- Seed initial risk data from ROAM
INSERT INTO risks (id, title, description, category, severity, probability, impact, owner, circle) VALUES
('risk-starlingx-k8s', 'StarlingX K8s Cluster Integration', 'Integration of StarlingX K8s cluster with agentic-flow', 'resolved', 3, 0.1, 'High - critical infrastructure', 'Platform Team', 'infrastructure');

INSERT INTO risks (id, title, description, category, severity, probability, impact, owner, circle) VALUES
('risk-hostbill-api', 'HostBill API Connectivity', 'HostBill API returning 301/403 responses', 'owned', 5, 0.4, 'Medium - affiliate platform impact', 'Integration Team', 'affiliate');

INSERT INTO risks (id, title, description, category, severity, probability, impact, owner, circle) VALUES
('risk-decision-transformer', 'Decision Transformer Dashboard', 'Dashboard health check issues', 'resolved', 4, 0.2, 'Medium - observability impact', 'ML Team', 'ml');

INSERT INTO risks (id, title, description, category, severity, probability, impact, owner, circle) VALUES
('risk-payment-security', 'Payment Security Audit', 'PCI compliance validation needed', 'mitigated', 7, 0.3, 'High - compliance requirement', 'Security Team', 'security');

INSERT INTO risks (id, title, description, category, severity, probability, impact, owner, circle) VALUES
('risk-telemetry-psutil', 'Telemetry Collection Missing psutil', 'psutil dependency not installed', 'accepted', 3, 0.5, 'Low - partial metrics only', 'DevOps Team', 'observability');

