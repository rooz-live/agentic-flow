#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 1) Optional governance check placeholder (replace with real when available)
echo "[weekly] governance check — placeholder"

# 2) Run Smart Cycle with a short cap
AY_MAX_ITERATIONS=${AY_MAX_ITERATIONS:-3} bash scripts/ay-wrapper.sh smart || true

# 3) Generate report
bash scripts/ay-continuous-improve.sh report || true

# Cron example (run weekly at 02:00 on Monday):
# 0 2 * * 1 /bin/bash -lc 'cd "$PROJECT_ROOT" && bash scripts/weekly-governance-smart.sh >> logs/weekly.log 2>&1'