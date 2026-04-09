#!/bin/bash
# Compute Circle Equity from Learning Loop Baselines
# Usage: ./scripts/compute-circle-equity.sh

set -e

EQUITY_DB="${EQUITY_DB:-.db/circle_equity.db}"
BASELINE_DIR="${BASELINE_DIR:-/tmp}"

echo "🔍 Computing Circle Equity Baselines..."
echo "   Database: $EQUITY_DB"
echo "   Baseline logs: $BASELINE_DIR/*_baseline.log"
echo ""

# Create equity database if it doesn't exist
mkdir -p "$(dirname "$EQUITY_DB")"

sqlite3 "$EQUITY_DB" <<EOF
CREATE TABLE IF NOT EXISTS circle_equity (
  circle TEXT PRIMARY KEY,
  total_skills INTEGER DEFAULT 0,
  total_uses INTEGER DEFAULT 0,
  avg_success_rate REAL DEFAULT 0.0,
  avg_reward REAL DEFAULT 0.0,
  episodes_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equity_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  skills_delta INTEGER DEFAULT 0,
  uses_delta INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0.0,
  reward REAL DEFAULT 0.0,
  episodes_delta INTEGER DEFAULT 0
);
EOF

echo "✅ Database schema initialized"
echo ""

# Function to parse baseline log and extract metrics
parse_baseline() {
  local circle="$1"
  local logfile="$BASELINE_DIR/${circle}_baseline.log"
  
  if [ ! -f "$logfile" ]; then
    echo "⚠️  No baseline log found for $circle: $logfile"
    return
  fi
  
  echo "📊 Parsing $circle baseline..."
  
  # Extract episode count (extract only digits)
  local episodes_count=$(grep "episodes:" "$logfile" | head -1 | awk '{print $2}' | grep -oE '[0-9]+' | head -1)
  episodes_count=${episodes_count:-0}
  
  # Extract skills count
  local skills_count=$(grep "✅ Found" "$logfile" | tail -1 | awk '{print $3}')
  
  # Calculate total uses and average success rate
  local total_uses=0
  local total_success=0
  local skill_count=0
  
  while IFS= read -r line; do
    if [[ "$line" =~ "Uses: "([0-9]+) ]]; then
      uses="${BASH_REMATCH[1]}"
      total_uses=$((total_uses + uses))
      skill_count=$((skill_count + 1))
    fi
    if [[ "$line" =~ "Success Rate: "([0-9.]+)"%" ]]; then
      success_rate="${BASH_REMATCH[1]}"
      total_success=$(echo "$total_success + $success_rate" | bc -l)
    fi
  done < "$logfile"
  
  local avg_success_rate=0
  if [ "$skill_count" -gt 0 ]; then
    avg_success_rate=$(echo "scale=2; $total_success / $skill_count" | bc -l)
  fi
  
  # Default reward is 1.0 for 100% success rate
  local avg_reward=$(echo "scale=2; $avg_success_rate / 100" | bc -l)
  
  echo "   Skills: $skills_count"
  echo "   Total Uses: $total_uses"
  echo "   Avg Success Rate: ${avg_success_rate}%"
  echo "   Avg Reward: $avg_reward"
  echo "   Episodes: $episodes_count"
  
  # Get previous values for delta calculation
  local prev_data=$(sqlite3 "$EQUITY_DB" "SELECT total_skills, total_uses, episodes_count FROM circle_equity WHERE circle='$circle';" 2>/dev/null || echo "0|0|0")
  IFS='|' read -r prev_skills prev_uses prev_episodes <<< "$prev_data"
  
  local skills_delta=$((${skills_count:-0} - ${prev_skills:-0}))
  local uses_delta=$((${total_uses:-0} - ${prev_uses:-0}))
  local episodes_delta=$((${episodes_count:-0} - ${prev_episodes:-0}))
  
  # Update equity table
  sqlite3 "$EQUITY_DB" <<SQL
INSERT OR REPLACE INTO circle_equity (circle, total_skills, total_uses, avg_success_rate, avg_reward, episodes_count, last_updated)
VALUES ('$circle', $skills_count, $total_uses, $avg_success_rate, $avg_reward, $episodes_count, datetime('now'));

INSERT INTO equity_history (circle, skills_delta, uses_delta, success_rate, reward, episodes_delta)
VALUES ('$circle', $skills_delta, $uses_delta, $avg_success_rate, $avg_reward, $episodes_delta);
SQL
  
  echo "   ✅ Equity updated (Δ skills: +$skills_delta, Δ uses: +$uses_delta, Δ episodes: +$episodes_delta)"
  echo ""
}

# Parse all circle baselines
for circle in orchestrator analyst innovator assessor seeker intuitive; do
  if [ -f "$BASELINE_DIR/${circle}_baseline.log" ]; then
    parse_baseline "$circle"
  fi
done

# Display equity summary
echo "════════════════════════════════════════════════════════════════════════════════"
echo "📊 Circle Equity Summary"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

sqlite3 -header -column "$EQUITY_DB" <<EOF
SELECT 
  circle AS Circle,
  total_skills AS Skills,
  total_uses AS Uses,
  ROUND(avg_success_rate, 1) || '%' AS "Success Rate",
  ROUND(avg_reward, 2) AS Reward,
  episodes_count AS Episodes,
  datetime(last_updated, 'localtime') AS "Last Updated"
FROM circle_equity
ORDER BY total_uses DESC;
EOF

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "📈 Recent Equity Deltas (Last 5 Updates)"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

sqlite3 -header -column "$EQUITY_DB" <<EOF
SELECT 
  circle AS Circle,
  datetime(timestamp, 'localtime') AS Time,
  skills_delta AS "ΔSkills",
  uses_delta AS "ΔUses",
  episodes_delta AS "ΔEpisodes",
  ROUND(success_rate, 1) || '%' AS "Success Rate"
FROM equity_history
ORDER BY timestamp DESC
LIMIT 5;
EOF

echo ""
echo "✅ Circle equity computation complete"
echo "   Database: $EQUITY_DB"
echo ""
echo "Query equity: sqlite3 $EQUITY_DB 'SELECT * FROM circle_equity;'"
echo "View history: sqlite3 $EQUITY_DB 'SELECT * FROM equity_history ORDER BY timestamp DESC LIMIT 10;'"
