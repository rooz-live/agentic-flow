-- yo.life Episode Storage Database Schema
-- SQLite schema for circle episodes, equity tracking, and ROAM metrics

-- Episodes table: stores all circle ceremony episodes
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id TEXT UNIQUE NOT NULL,  -- Format: {circle}_{ceremony}_{timestamp}
  circle TEXT NOT NULL,              -- orchestrator, assessor, innovator, analyst, seeker, intuitive
  ceremony TEXT NOT NULL,            -- standup, wsjf, review, retro, refine, replenish, synthesis
  timestamp INTEGER NOT NULL,        -- Unix timestamp
  state TEXT,                        -- JSON serialized state
  action TEXT,                       -- Action taken
  reward REAL,                       -- Reward score (0.0 - 1.0)
  next_state TEXT,                   -- JSON serialized next state
  done INTEGER DEFAULT 0,            -- Boolean: episode completed
  metadata TEXT,                     -- JSON serialized metadata
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(circle, ceremony, timestamp)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_episodes_circle ON episodes(circle);
CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_circle_timestamp ON episodes(circle, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_ceremony ON episodes(ceremony);

-- Circle equity summary table (materialized view)
CREATE TABLE IF NOT EXISTS circle_equity (
  circle TEXT PRIMARY KEY,
  episode_count INTEGER NOT NULL DEFAULT 0,
  percentage REAL NOT NULL DEFAULT 0.0,
  last_activity INTEGER,              -- Unix timestamp of last episode
  last_ceremony TEXT,
  color TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Initialize circle equity with default values
INSERT OR IGNORE INTO circle_equity (circle, episode_count, percentage, color) VALUES
  ('orchestrator', 0, 0.0, '#3b82f6'),
  ('assessor', 0, 0.0, '#22c55e'),
  ('innovator', 0, 0.0, '#ec4899'),
  ('analyst', 0, 0.0, '#06b6d4'),
  ('seeker', 0, 0.0, '#eab308'),
  ('intuitive', 0, 0.0, '#ef4444');

-- ROAM metrics table
CREATE TABLE IF NOT EXISTS roam_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  risk INTEGER NOT NULL,
  obstacle INTEGER NOT NULL,
  assumption INTEGER NOT NULL,
  mitigation INTEGER NOT NULL,
  exposure_score REAL NOT NULL,
  entities INTEGER DEFAULT 0,
  relationships INTEGER DEFAULT 0,
  metadata TEXT,                      -- JSON serialized additional data
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_roam_timestamp ON roam_metrics(timestamp DESC);

-- Circle skills table
CREATE TABLE IF NOT EXISTS circle_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle TEXT NOT NULL,
  skill TEXT NOT NULL,
  proficiency REAL DEFAULT 0.5,      -- 0.0 - 1.0
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_used INTEGER,                 -- Unix timestamp
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(circle, skill)
);

CREATE INDEX IF NOT EXISTS idx_circle_skills_circle ON circle_skills(circle);
CREATE INDEX IF NOT EXISTS idx_circle_skills_proficiency ON circle_skills(proficiency DESC);

-- Circle ceremonies table
CREATE TABLE IF NOT EXISTS circle_ceremonies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle TEXT NOT NULL,
  ceremony TEXT NOT NULL,
  scheduled_at INTEGER,              -- Unix timestamp
  completed_at INTEGER,
  status TEXT DEFAULT 'pending',     -- pending, in_progress, completed, blocked
  outcome TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(circle, ceremony, scheduled_at)
);

CREATE INDEX IF NOT EXISTS idx_ceremonies_status ON circle_ceremonies(status);
CREATE INDEX IF NOT EXISTS idx_ceremonies_scheduled ON circle_ceremonies(scheduled_at);

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,       -- bcrypt hash
  role TEXT NOT NULL DEFAULT 'user', -- admin, circle_lead, user, service
  circles TEXT,                      -- JSON array of accessible circles
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  last_login INTEGER
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT UNIQUE NOT NULL,     -- SHA256 hash of API key
  name TEXT NOT NULL,
  user_id TEXT,
  permissions TEXT,                  -- JSON array of permissions
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  last_used INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Trigger to update circle equity on episode insert
CREATE TRIGGER IF NOT EXISTS update_equity_on_insert
AFTER INSERT ON episodes
BEGIN
  UPDATE circle_equity
  SET 
    episode_count = episode_count + 1,
    last_activity = NEW.timestamp,
    last_ceremony = NEW.ceremony,
    updated_at = strftime('%s', 'now')
  WHERE circle = NEW.circle;
  
  -- Recalculate percentages
  UPDATE circle_equity
  SET percentage = CAST(episode_count AS REAL) / (SELECT SUM(episode_count) FROM circle_equity) * 100.0
  WHERE (SELECT SUM(episode_count) FROM circle_equity) > 0;
END;

-- Trigger to update circle equity on episode delete
CREATE TRIGGER IF NOT EXISTS update_equity_on_delete
AFTER DELETE ON episodes
BEGIN
  UPDATE circle_equity
  SET 
    episode_count = episode_count - 1,
    updated_at = strftime('%s', 'now')
  WHERE circle = OLD.circle;
  
  -- Recalculate percentages
  UPDATE circle_equity
  SET percentage = CAST(episode_count AS REAL) / (SELECT SUM(episode_count) FROM circle_equity) * 100.0
  WHERE (SELECT SUM(episode_count) FROM circle_equity) > 0;
  
  -- Update last_activity to most recent episode
  UPDATE circle_equity
  SET last_activity = (
    SELECT MAX(timestamp) FROM episodes WHERE circle = OLD.circle
  )
  WHERE circle = OLD.circle;
END;

-- ROAM entities table: risks, obstacles, assumptions, mitigations
CREATE TABLE IF NOT EXISTS roam_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('risk', 'obstacle', 'assumption', 'mitigation')),
  title TEXT NOT NULL,
  details TEXT,
  owner_circle TEXT NOT NULL,          -- Circle responsible for managing this entity
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'resolved', 'blocked', 'accepted')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  resolved_at INTEGER,
  metadata TEXT                         -- JSON: BML metrics, acceptance criteria, etc.
);

CREATE INDEX IF NOT EXISTS idx_roam_type ON roam_entities(type);
CREATE INDEX IF NOT EXISTS idx_roam_status ON roam_entities(status);
CREATE INDEX IF NOT EXISTS idx_roam_owner ON roam_entities(owner_circle);
CREATE INDEX IF NOT EXISTS idx_roam_created ON roam_entities(created_at DESC);

-- ROAM traces: links ROAM entities to episodes/ceremonies
CREATE TABLE IF NOT EXISTS roam_traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roam_id INTEGER NOT NULL,
  episode_id TEXT,                      -- Links to episodes.episode_id
  ceremony_id INTEGER,                  -- Links to circle_ceremonies.id
  impact TEXT,                          -- Description of how this entity impacted the episode
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (roam_id) REFERENCES roam_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_roam_traces_roam ON roam_traces(roam_id);
CREATE INDEX IF NOT EXISTS idx_roam_traces_episode ON roam_traces(episode_id);
CREATE INDEX IF NOT EXISTS idx_roam_traces_ceremony ON roam_traces(ceremony_id);

-- Obstacle ownership: tracks BML metrics for obstacles
CREATE TABLE IF NOT EXISTS obstacle_ownership (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  obstacle_id INTEGER NOT NULL UNIQUE,
  owner_circle TEXT NOT NULL,
  bml_metrics TEXT,                     -- JSON: {build: {...}, measure: {...}, learn: {...}}
  last_updated INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (obstacle_id) REFERENCES roam_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_obstacle_owner ON obstacle_ownership(owner_circle);

-- Assumption validation: DoR/DoD criteria tracking
CREATE TABLE IF NOT EXISTS assumption_validation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assumption_id INTEGER NOT NULL UNIQUE,
  dor_criteria TEXT,                    -- JSON: [{criterion, required, validated, validated_at}]
  dod_criteria TEXT,                    -- JSON: [{criterion, required, validated, validated_at}]
  validation_status TEXT DEFAULT 'pending' CHECK(validation_status IN ('pending', 'dor_met', 'dod_met', 'failed')),
  validated_at INTEGER,
  failure_reason TEXT,                  -- If validation failed, why?
  lesson_learned TEXT,                  -- Captured learning from failed assumptions
  FOREIGN KEY (assumption_id) REFERENCES roam_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assumption_status ON assumption_validation(validation_status);

-- Mitigation plans: traceability and effectiveness tracking
CREATE TABLE IF NOT EXISTS mitigation_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mitigation_id INTEGER NOT NULL UNIQUE,
  target_roam_id INTEGER NOT NULL,      -- Which risk/obstacle this mitigates
  stack_trace TEXT,                     -- Technical traceability across stack
  effectiveness_score REAL DEFAULT 0.0, -- 0.0-1.0, calculated from episode outcomes
  implementation_status TEXT DEFAULT 'planned' CHECK(implementation_status IN ('planned', 'in_progress', 'deployed', 'validated')),
  deployed_at INTEGER,
  last_validated INTEGER,
  FOREIGN KEY (mitigation_id) REFERENCES roam_entities(id) ON DELETE CASCADE,
  FOREIGN KEY (target_roam_id) REFERENCES roam_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mitigation_target ON mitigation_plans(target_roam_id);
CREATE INDEX IF NOT EXISTS idx_mitigation_effectiveness ON mitigation_plans(effectiveness_score DESC);

-- Trigger to auto-calculate ROAM counts in roam_metrics
CREATE TRIGGER IF NOT EXISTS update_roam_metrics_on_insert
AFTER INSERT ON roam_entities
BEGIN
  INSERT INTO roam_metrics (timestamp, risk, obstacle, assumption, mitigation, exposure_score, entities)
  SELECT 
    strftime('%s', 'now'),
    SUM(CASE WHEN type = 'risk' AND status != 'resolved' THEN 1 ELSE 0 END),
    SUM(CASE WHEN type = 'obstacle' AND status != 'resolved' THEN 1 ELSE 0 END),
    SUM(CASE WHEN type = 'assumption' AND status != 'accepted' THEN 1 ELSE 0 END),
    SUM(CASE WHEN type = 'mitigation' THEN 1 ELSE 0 END),
    -- Exposure score: weighted sum of unresolved items
    (SUM(CASE WHEN type = 'risk' AND status != 'resolved' THEN 2 ELSE 0 END) +
     SUM(CASE WHEN type = 'obstacle' AND status != 'resolved' THEN 1.5 ELSE 0 END) +
     SUM(CASE WHEN type = 'assumption' AND status != 'accepted' THEN 1 ELSE 0 END)) / 10.0,
    COUNT(*)
  FROM roam_entities;
END;

CREATE TRIGGER IF NOT EXISTS update_roam_metrics_on_update
AFTER UPDATE ON roam_entities
BEGIN
  INSERT INTO roam_metrics (timestamp, risk, obstacle, assumption, mitigation, exposure_score, entities)
  SELECT 
    strftime('%s', 'now'),
    SUM(CASE WHEN type = 'risk' AND status != 'resolved' THEN 1 ELSE 0 END),
    SUM(CASE WHEN type = 'obstacle' AND status != 'resolved' THEN 1 ELSE 0 END),
    SUM(CASE WHEN type = 'assumption' AND status != 'accepted' THEN 1 ELSE 0 END),
    SUM(CASE WHEN type = 'mitigation' THEN 1 ELSE 0 END),
    (SUM(CASE WHEN type = 'risk' AND status != 'resolved' THEN 2 ELSE 0 END) +
     SUM(CASE WHEN type = 'obstacle' AND status != 'resolved' THEN 1.5 ELSE 0 END) +
     SUM(CASE WHEN type = 'assumption' AND status != 'accepted' THEN 1 ELSE 0 END)) / 10.0,
    COUNT(*)
  FROM roam_entities;
END;

-- Governance decisions audit table
CREATE TABLE IF NOT EXISTS governance_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_id TEXT UNIQUE NOT NULL,       -- UUID for decision
  timestamp INTEGER NOT NULL,              -- Unix timestamp
  decision_type TEXT NOT NULL,             -- 'policy_check', 'action_validation', 'compliance_check'
  policy_id TEXT,                          -- Which policy was invoked
  action TEXT,                             -- Action being evaluated
  context TEXT,                            -- JSON: full decision context
  result TEXT NOT NULL,                    -- 'approved', 'denied', 'warning'
  rationale TEXT,                          -- Why was this decision made
  violations TEXT,                         -- JSON: list of violations if any
  compliance_score REAL,                   -- 0-100 score
  user_id TEXT,                            -- Who triggered this decision
  circle TEXT,                             -- Which circle
  ceremony TEXT,                           -- Which ceremony
  metadata TEXT,                           -- JSON: additional data
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_governance_timestamp ON governance_decisions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_governance_policy ON governance_decisions(policy_id);
CREATE INDEX IF NOT EXISTS idx_governance_result ON governance_decisions(result);
CREATE INDEX IF NOT EXISTS idx_governance_user ON governance_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_governance_circle ON governance_decisions(circle);

-- Views for common queries
CREATE VIEW IF NOT EXISTS recent_episodes AS
SELECT 
  e.*,
  ce.color
FROM episodes e
JOIN circle_equity ce ON e.circle = ce.circle
ORDER BY e.timestamp DESC
LIMIT 100;

CREATE VIEW IF NOT EXISTS circle_activity_summary AS
SELECT 
  ce.circle,
  ce.color,
  ce.episode_count,
  ce.percentage,
  ce.last_activity,
  ce.last_ceremony,
  datetime(ce.last_activity, 'unixepoch') as last_activity_formatted,
  COUNT(DISTINCT e.ceremony) as unique_ceremonies,
  AVG(e.reward) as avg_reward
FROM circle_equity ce
LEFT JOIN episodes e ON ce.circle = e.circle
GROUP BY ce.circle;

-- View for ROAM summary by circle
CREATE VIEW IF NOT EXISTS roam_by_circle AS
SELECT 
  owner_circle,
  type,
  status,
  COUNT(*) as count
FROM roam_entities
GROUP BY owner_circle, type, status;

-- View for mitigation effectiveness
CREATE VIEW IF NOT EXISTS mitigation_effectiveness AS
SELECT 
  mp.mitigation_id,
  mp.target_roam_id,
  re_mitigation.title as mitigation_title,
  re_target.title as target_title,
  re_target.type as target_type,
  mp.effectiveness_score,
  mp.implementation_status,
  COUNT(rt.id) as trace_count
FROM mitigation_plans mp
JOIN roam_entities re_mitigation ON mp.mitigation_id = re_mitigation.id
JOIN roam_entities re_target ON mp.target_roam_id = re_target.id
LEFT JOIN roam_traces rt ON mp.mitigation_id = rt.roam_id
GROUP BY mp.mitigation_id;
