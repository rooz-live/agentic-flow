CREATE TABLE IF NOT EXISTS lao_learning_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dimension TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value REAL,
  trend_direction TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS execution_contexts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command TEXT,
  success BOOLEAN,
  duration_ms INTEGER,
  error_message TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beam_dimensions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  who_dimension TEXT,
  what_dimension TEXT,
  when_dimension TEXT,
  where_dimension TEXT,
  why_dimension TEXT,
  how_dimension TEXT,
  event_id INTEGER,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lao_dimension ON lao_learning_progress(dimension);
CREATE INDEX IF NOT EXISTS idx_beam_event ON beam_dimensions(event_id);
