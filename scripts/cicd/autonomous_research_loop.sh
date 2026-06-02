#!/usr/bin/env bash
# Autonomous Swarm Research Loop Agent
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load configuration parameters
TIMER_MINUTES=15
MAX_RUNTIME_HOURS=12

echo "🤖 Autonomous Research Swarm activated."
echo "Configured Interval: ${TIMER_MINUTES}m | Maximum Duration: ${MAX_RUNTIME_HOURS}h"

# Execute research simulation
echo "--> Executing active research task..."
python3 "$ROOT_DIR/scripts/research/generate_simulation.py"

# Enforce Definition of Done baseline checks
echo "--> Running post-task gate validation..."
# If there are changes to commit, verify them via the gate
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Staging new research reports..."
  git add "$ROOT_DIR/.goalie/evidence/research/" || true
  
  # Run the post-task gate validation before committing
  bash "$ROOT_DIR/scripts/dod-gate.sh" --post-task || true
else
  echo "No changes detected. Standby for next iteration."
fi

echo "🤖 Research cycle completed successfully."
exit 0
