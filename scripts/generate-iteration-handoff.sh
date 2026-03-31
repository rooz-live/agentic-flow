#!/usr/bin/env bash
# generate-iteration-handoff.sh - Generate handoff report for next iteration
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
HANDOFF_FILE="$ROOT_DIR/reports/iteration-handoff-$TIMESTAMP.json"

# Gather context from multiple sources
SKILLS=$(cat "$ROOT_DIR/reports/skills-store.json" 2>/dev/null || echo '{"skills":[]}')
TRAJECTORY=$(cat "$ROOT_DIR/reports/trajectory-trends.json" 2>/dev/null || echo '{"trends":{}}')
ROAM=$(cat "$ROOT_DIR/.goalie/ROAM_TRACKER.yaml" 2>/dev/null | head -10 || echo "")

# Generate handoff report
cat > "$HANDOFF_FILE" <<HANDOFF
{
  "handoff_timestamp": "$TIMESTAMP",
  "iteration_context": {
    "skills_available": $(echo "$SKILLS" | jq '.skills | length'),
    "trajectory_status": $(echo "$TRAJECTORY" | jq -r '.trajectory_status // "UNKNOWN"'),
    "roam_score": $(echo "$ROAM" | grep -E "roam_score:" | awk '{print $2}' || echo "0")
  },
  "recommendations": {
    "next_mode": "fire",
    "focus_areas": ["learning_consumption", "skill_validation", "trajectory_monitoring"],
    "priority_skills": $(echo "$SKILLS" | jq '[.skills[] | select(.success_rate < 0.8) | .name]')
  },
  "metrics_summary": {
    "skills": $(echo "$SKILLS" | jq '.'),
    "trajectory": $(echo "$TRAJECTORY" | jq '.')
  }
}
HANDOFF

echo "Iteration handoff report: $HANDOFF_FILE"
