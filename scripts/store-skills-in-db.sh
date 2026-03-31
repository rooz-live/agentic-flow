#!/usr/bin/env bash
# store-skills-in-db.sh - Wire skills from episodes into AgentDB
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB="$ROOT_DIR/agentdb.db"

# Create skills table if not exists
create_skills_schema() {
  sqlite3 "$AGENTDB" <<EOF
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL,
  circle TEXT NOT NULL,
  ceremony TEXT,
  proficiency REAL DEFAULT 0.0,
  learned_at INTEGER NOT NULL,
  last_used INTEGER,
  usage_count INTEGER DEFAULT 1,
  UNIQUE(skill_name, circle)
);

CREATE INDEX IF NOT EXISTS idx_skills_circle ON skills(circle);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(skill_name);
EOF
  
  echo "✓ Skills schema created/verified"
}

# Store skills from episode
store_skills() {
  local episode_file="$1"
  
  if [[ ! -f "$episode_file" ]]; then
    echo "✗ Episode file not found: $episode_file"
    return 1
  fi
  
  # Extract metadata
  local circle=$(jq -r '.circle // "unknown"' "$episode_file")
  local ceremony=$(jq -r '.ceremony // "unknown"' "$episode_file")
  local timestamp=$(jq -r '.timestamp // now' "$episode_file")
  
  # Extract skills array
  local skills=$(jq -r '.skills[]?' "$episode_file" 2>/dev/null)
  
  if [[ -z "$skills" ]]; then
    echo "⚠ No skills found in episode"
    return 0
  fi
  
  local stored_count=0
  
  while IFS= read -r skill; do
    # Skip empty lines
    [[ -z "$skill" ]] && continue
    
    # Insert or update skill
    sqlite3 "$AGENTDB" <<EOF
INSERT INTO skills (skill_name, circle, ceremony, learned_at, last_used, usage_count)
VALUES ('$skill', '$circle', '$ceremony', $timestamp, $timestamp, 1)
ON CONFLICT(skill_name, circle) DO UPDATE SET
  last_used = $timestamp,
  usage_count = usage_count + 1,
  ceremony = CASE WHEN ceremony IS NULL THEN '$ceremony' ELSE ceremony END;
EOF
    
    ((stored_count++))
  done <<< "$skills"
  
  echo "✓ Stored $stored_count skills from $circle::$ceremony"
  return 0
}

# List skills from database
list_skills() {
  local circle="${1:-}"
  
  if [[ -n "$circle" ]]; then
    sqlite3 "$AGENTDB" <<EOF
.mode column
.headers on
SELECT 
  skill_name,
  circle,
  ceremony,
  proficiency,
  usage_count,
  datetime(learned_at, 'unixepoch') as learned,
  datetime(last_used, 'unixepoch') as last_used
FROM skills
WHERE circle = '$circle'
ORDER BY usage_count DESC, last_used DESC;
EOF
  else
    sqlite3 "$AGENTDB" <<EOF
.mode column
.headers on
SELECT 
  skill_name,
  circle,
  ceremony,
  proficiency,
  usage_count,
  datetime(learned_at, 'unixepoch') as learned,
  datetime(last_used, 'unixepoch') as last_used
FROM skills
ORDER BY circle, usage_count DESC
LIMIT 50;
EOF
  fi
}

# Process latest episodes
process_recent_episodes() {
  local count="${1:-10}"
  
  echo "Processing last $count episodes..."
  local episodes=$(ls -t /tmp/episode_*.json 2>/dev/null | head -"$count")
  
  local processed=0
  local failed=0
  
  while IFS= read -r episode; do
    if store_skills "$episode"; then
      ((processed++))
    else
      ((failed++))
    fi
  done <<< "$episodes"
  
  echo ""
  echo "Processed: $processed episodes"
  echo "Failed: $failed episodes"
  echo ""
  
  # Show summary
  local total_skills=$(sqlite3 "$AGENTDB" "SELECT COUNT(DISTINCT skill_name) FROM skills;")
  local total_circles=$(sqlite3 "$AGENTDB" "SELECT COUNT(DISTINCT circle) FROM skills;")
  
  echo "Total unique skills: $total_skills"
  echo "Circles with skills: $total_circles"
}

# Main entry point
main() {
  local command="${1:-process}"
  shift || true
  
  case "$command" in
    init)
      create_skills_schema
      ;;
    store)
      local episode_file="$1"
      create_skills_schema
      store_skills "$episode_file"
      ;;
    list)
      local circle="${1:-}"
      list_skills "$circle"
      ;;
    process)
      local count="${1:-10}"
      create_skills_schema
      process_recent_episodes "$count"
      ;;
    *)
      echo "Usage: $0 {init|store|list|process} [args]"
      echo ""
      echo "Commands:"
      echo "  init                    Create skills schema"
      echo "  store <episode_file>    Store skills from episode"
      echo "  list [circle]           List skills (optional: filter by circle)"
      echo "  process [count]         Process last N episodes (default: 10)"
      exit 1
      ;;
  esac
}

main "$@"
