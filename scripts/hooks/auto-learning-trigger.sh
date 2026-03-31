#!/usr/bin/env bash
# auto-learning-trigger.sh - Auto-trigger learning and circulation every N episodes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENTDB="$ROOT_DIR/agentdb.db"
TRIGGER_FILE="$ROOT_DIR/.cache/learning-trigger-count"

mkdir -p "$ROOT_DIR/.cache"

# Initialize counter if doesn't exist
if [[ ! -f "$TRIGGER_FILE" ]]; then
  echo "0" > "$TRIGGER_FILE"
fi

# Increment counter
current_count=$(cat "$TRIGGER_FILE")
((current_count++))
echo "$current_count" > "$TRIGGER_FILE"

# Trigger every 10 episodes
trigger_interval=10

if (( current_count % trigger_interval == 0 )); then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 AUTO-LEARNING TRIGGER (Episode $current_count)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 1. Extract and store skills
  echo "📦 Extracting skills from recent episodes..."
  latest_episodes=$(ls -t /tmp/episode_*.json 2>/dev/null | head -$trigger_interval)
  skills_stored=0
  
  while IFS= read -r episode; do
    circle=$(jq -r '.circle // "unknown"' "$episode" 2>/dev/null)
    ceremony=$(jq -r '.ceremony // "unknown"' "$episode" 2>/dev/null)
    timestamp=$(jq -r '.episode.timestamp | fromdate' "$episode" 2>/dev/null || date +%s)
    
    for skill in $(jq -r '.skills[]?' "$episode" 2>/dev/null); do
      sqlite3 "$AGENTDB" "INSERT OR IGNORE INTO skills (skill_name, circle, ceremony, learned_at, last_used) VALUES ('$skill', '$circle', '$ceremony', $timestamp, $timestamp);" 2>/dev/null || true
      sqlite3 "$AGENTDB" "UPDATE skills SET usage_count = usage_count + 1, last_used = $timestamp WHERE skill_name = '$skill' AND circle = '$circle';" 2>/dev/null || true
      ((skills_stored++))
    done
  done <<< "$latest_episodes"
  
  echo "✓ Stored $skills_stored skill instances"
  
  # 2. Update learning trajectories
  echo "📈 Updating learning trajectories..."
  "$SCRIPT_DIR/../track-learning-trajectory.sh" process $trigger_interval 2>/dev/null || true
  
  # 3. Create learning retro
  echo "🔄 Creating learning retro..."
  "$SCRIPT_DIR/post-episode-learning-enhanced.sh" 2>/dev/null || true
  
  # 4. Calculate circulation metrics
  echo "💰 Calculating circulation metrics..."
  
  # Skill circulation rate
  total_skills_db=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM skills;" 2>/dev/null || echo "0")
  total_episodes=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
  
  if [[ $total_episodes -gt 0 ]] && [[ $total_skills_db -gt 0 ]]; then
    circulation_rate=$(echo "scale=2; ($total_skills_db * 100) / ($total_episodes * 3)" | bc -l 2>/dev/null || echo "0")
    echo "  Skills in DB: $total_skills_db"
    echo "  Total Episodes: $total_episodes"
    echo "  Circulation Rate: ${circulation_rate}%"
    
    # Store circulation metric
    echo "$timestamp,$circulation_rate,$total_skills_db,$total_episodes" >> "$ROOT_DIR/.cache/circulation-metrics.csv"
  fi
  
  # 5. Skill utilization (how many unique skills vs total usages)
  total_usages=$(sqlite3 "$AGENTDB" "SELECT SUM(usage_count) FROM skills;" 2>/dev/null || echo "0")
  if [[ $total_skills_db -gt 0 ]]; then
    avg_utilization=$(echo "scale=2; $total_usages / $total_skills_db" | bc -l 2>/dev/null || echo "0")
    echo "  Total Usages: $total_usages"
    echo "  Avg Utilization: ${avg_utilization}x per skill"
  fi
  
  # 6. Learning convergence check
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    if "$SCRIPT_DIR/../track-learning-trajectory.sh" check "$circle" 2>/dev/null; then
      echo "  ✓ $circle: Converging"
    fi
  done
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
fi
