-- skill_validations table: Track skill performance and confidence
CREATE TABLE IF NOT EXISTS skill_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL,
  validation_timestamp TEXT NOT NULL,
  episode_id TEXT,
  outcome TEXT CHECK(outcome IN ('success', 'failed', 'partial')),
  confidence_before REAL,
  confidence_after REAL,
  performance_score REAL,
  context TEXT,  -- JSON context
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_skill_validations_skill 
  ON skill_validations(skill_name);
CREATE INDEX IF NOT EXISTS idx_skill_validations_timestamp 
  ON skill_validations(validation_timestamp);
CREATE INDEX IF NOT EXISTS idx_skill_validations_outcome 
  ON skill_validations(outcome);

-- View: Latest validation per skill
CREATE VIEW IF NOT EXISTS skill_validation_summary AS
SELECT 
  skill_name,
  COUNT(*) as total_validations,
  SUM(CASE WHEN outcome='success' THEN 1 ELSE 0 END) as successes,
  CAST(SUM(CASE WHEN outcome='success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as success_rate,
  AVG(performance_score) as avg_performance,
  AVG(confidence_after) as avg_confidence,
  MAX(validation_timestamp) as last_validation
FROM skill_validations
GROUP BY skill_name;
