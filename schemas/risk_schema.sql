-- Risk Database Schema for WSJF-Driven Orchestration
-- ROAM: Resolved, Owned, Accepted, Mitigated

-- Core risk tracking table
CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK(category IN ('resolved', 'owned', 'accepted', 'mitigated')),
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  detection_method TEXT NOT NULL,
  first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolution_status TEXT,
  business_impact_score INTEGER,
  mitigation_actions TEXT,
  
  -- WSJF Components
  business_value INTEGER DEFAULT 0 CHECK(business_value BETWEEN 0 AND 10),
  time_criticality INTEGER DEFAULT 0 CHECK(time_criticality BETWEEN 0 AND 10),
  risk_reduction INTEGER DEFAULT 0 CHECK(risk_reduction BETWEEN 0 AND 10),
  job_size INTEGER DEFAULT 1 CHECK(job_size > 0),
  wsjf_score REAL GENERATED ALWAYS AS (
    CAST(business_value + time_criticality + risk_reduction AS REAL) / job_size
  ) STORED,
  
  -- Metadata
  source_component TEXT,
  owner TEXT,
  metadata TEXT -- JSON string
);

-- Drift event tracking (semantic, behavioral, temporal)
CREATE TABLE IF NOT EXISTS drift_events (
  id TEXT PRIMARY KEY,
  risk_id TEXT REFERENCES risks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK(event_type IN (
    'semantic', 'behavioral', 'temporal', 'cognitive', 'performance'
  )),
  drift_magnitude REAL NOT NULL CHECK(drift_magnitude >= 0 AND drift_magnitude <= 1),
  confidence_score REAL NOT NULL CHECK(confidence_score >= 0 AND confidence_score <= 1),
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source_component TEXT NOT NULL,
  metadata TEXT, -- JSON string
  
  -- ConceptNet integration fields
  semantic_distance REAL,
  conceptnet_relations TEXT, -- JSON array of relations
  
  -- Response tracking
  response_action TEXT,
  response_timestamp TIMESTAMP,
  response_success BOOLEAN
);

-- ProcessGovernor incidents ingestion
CREATE TABLE IF NOT EXISTS governor_incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP NOT NULL,
  incident_type TEXT NOT NULL CHECK(incident_type IN (
    'WIP_VIOLATION', 'CPU_OVERLOAD', 'BACKOFF', 'BATCH_COMPLETE', 
    'RATE_LIMITED', 'CIRCUIT_OPEN', 'CIRCUIT_HALF_OPEN', 'CIRCUIT_CLOSED'
  )),
  
  -- State snapshot from processGovernor
  active_work INTEGER,
  queued_work INTEGER,
  completed_work INTEGER,
  failed_work INTEGER,
  circuit_breaker_state TEXT,
  available_tokens REAL,
  
  -- Details
  details TEXT, -- JSON string
  
  -- Link to risk if this incident triggered a risk
  risk_id TEXT REFERENCES risks(id)
);

-- Swarm orchestration tracking
CREATE TABLE IF NOT EXISTS swarm_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL CHECK(event_type IN (
    'AGENT_SPAWNED', 'AGENT_TERMINATED', 'TOPOLOGY_CHANGE', 'SCALE_UP', 'SCALE_DOWN'
  )),
  agent_count INTEGER NOT NULL,
  target_agent_count INTEGER,
  risk_score REAL,
  topology TEXT, -- hierarchical, mesh, ring
  metadata TEXT -- JSON string
);

-- Baseline measurements for benchmarking
CREATE TABLE IF NOT EXISTS baselines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  unit TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  context TEXT, -- JSON string with environment details
  
  UNIQUE(metric_name, timestamp)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_risks_wsjf ON risks(wsjf_score DESC);
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity);
CREATE INDEX IF NOT EXISTS idx_drift_events_timestamp ON drift_events(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_drift_events_type ON drift_events(event_type);
CREATE INDEX IF NOT EXISTS idx_governor_incidents_timestamp ON governor_incidents(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_swarm_events_timestamp ON swarm_events(timestamp DESC);

-- Trigger to update last_updated on risks
CREATE TRIGGER IF NOT EXISTS update_risks_timestamp
AFTER UPDATE ON risks
FOR EACH ROW
BEGIN
  UPDATE risks SET last_updated = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- View for high-priority risks (WSJF > 5)
CREATE VIEW IF NOT EXISTS high_priority_risks AS
SELECT 
  id,
  category,
  severity,
  business_value,
  time_criticality,
  risk_reduction,
  job_size,
  wsjf_score,
  source_component,
  owner,
  first_detected,
  last_updated
FROM risks
WHERE wsjf_score > 5.0
ORDER BY wsjf_score DESC;

-- View for recent drift events (last 24 hours)
CREATE VIEW IF NOT EXISTS recent_drift AS
SELECT 
  de.id,
  de.event_type,
  de.drift_magnitude,
  de.confidence_score,
  de.detected_at,
  de.source_component,
  r.severity AS risk_severity,
  r.wsjf_score
FROM drift_events de
LEFT JOIN risks r ON de.risk_id = r.id
WHERE de.detected_at >= datetime('now', '-24 hours')
ORDER BY de.detected_at DESC;

-- View for ProcessGovernor health
CREATE VIEW IF NOT EXISTS governor_health AS
SELECT 
  incident_type,
  COUNT(*) as incident_count,
  AVG(CAST(failed_work AS REAL) / NULLIF(completed_work + failed_work, 0)) as failure_rate,
  MAX(timestamp) as last_incident
FROM governor_incidents
WHERE timestamp >= datetime('now', '-1 hour')
GROUP BY incident_type
ORDER BY incident_count DESC;
