#!/usr/bin/env bash
# Swarm Circle tasks for CI
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "--> Swarm Circle: Spawning Headless Analyst to consume WSJF Queue..."
bash "$ROOT_DIR/scripts/spawn_headless_agents.sh" --role "Analyst" --goal "Consume CAPABILITY_BACKLOG.md and flag blockers" --loop 1
