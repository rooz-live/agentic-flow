#!/usr/bin/env bash
# ay-prod-store-episode-enhanced.sh - Enhanced episode storage with circle_equity updates
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${ROOT_DIR}/.db/roam.db"
EPISODE_DIR="${ROOT_DIR}/.episodes"

# Ensure directories exist
mkdir -p "$(dirname "$DB_PATH")"
mkdir -p "$EPISODE_DIR"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
  echo -e "${CYAN}[INFO]${NC} $*" >&2
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $*" >&2
}

log_error() {
  echo -e "${RED}[✗]${NC} $*" >&2
}

# Main
main() {
  if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <circle> <ceremony> < episode.json" >&2
    exit 1
  fi
  
  local circle="$1"
  local ceremony="$2"
  
  # Read episode JSON from stdin
  local episode_json=$(cat)
  
  if [[ -z "$episode_json" ]]; then
    log_error "No episode data provided on stdin"
    exit 1
  fi
  
  # Validate JSON
  if ! echo "$episode_json" | jq . >/dev/null 2>&1; then
    log_error "Invalid JSON provided"
    exit 1
  fi
  
  # Extract fields
  local status=$(echo "$episode_json" | jq -r '.episode.status // .status // "unknown"')
  local reward=$(echo "$episode_json" | jq -r '.episode.reward // .reward // 0')
  local duration=$(echo "$episode_json" | jq -r '.duration // 0')
  local timestamp=$(echo "$episode_json" | jq -r '.episode.timestamp // .timestamp // ""')
  local skills=$(echo "$episode_json" | jq -r '.skills // [] | join(" ")')
  
  if [[ -z "$timestamp" ]]; then
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  fi
  
  # Save episode as JSON file
  local episode_filename="${EPISODE_DIR}/${circle}_${ceremony}_$(date +%s).json"
  echo "$episode_json" > "$episode_filename"
  log_success "Episode file created: $episode_filename"
  
  # Store episode to database
  if command -v sqlite3 >/dev/null 2>&1; then
    # Create episodes table if not exists
    sqlite3 "$DB_PATH" <<EOF
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle TEXT NOT NULL,
  ceremony TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  status TEXT,
  reward REAL,
  duration INTEGER,
  skills TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO episodes (
  circle,
  ceremony,
  timestamp,
  status,
  reward,
  duration,
  skills
) VALUES (
  '$circle',
  '$ceremony',
  '$timestamp',
  '$status',
  $reward,
  $duration,
  '$skills'
);
EOF
    
    log_success "Episode stored to database"
    
    # Update circle_equity table
    sqlite3 "$DB_PATH" <<EOF
-- Recalculate circle equity from episodes
UPDATE circle_equity
SET 
  episode_count = (
    SELECT COUNT(*) 
    FROM episodes 
    WHERE episodes.circle = circle_equity.circle_name
  ),
  equity_percentage = (
    SELECT CAST(COUNT(*) AS REAL) * 100.0 / NULLIF((SELECT COUNT(*) FROM episodes), 0)
    FROM episodes
    WHERE episodes.circle = circle_equity.circle_name
  ),
  last_updated = datetime('now')
WHERE circle_name = '$circle';
EOF
    
    log_success "Circle equity updated for $circle"
  else
    log_error "sqlite3 not available, skipping database storage"
    exit 1
  fi
}

main "$@"
