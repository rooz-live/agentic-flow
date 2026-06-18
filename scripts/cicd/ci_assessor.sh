#!/usr/bin/env bash
# Assessor Circle tasks for CI
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "--> Assessor Circle: Verifying Definition of Ready (DoR)..."
bash "$ROOT_DIR/scripts/utils/auto-dor.sh"

echo "--> Assessor Circle: Verifying ROAM Staleness Constraints..."
bash "$ROOT_DIR/scripts/utils/roam-staleness-check.sh"

echo "--> Assessor Circle: TLD Health-Check Preflight..."
CONTRACT_URL="${CONTRACT_BASE_URL:-https://analytics.interface.tag.ooo}"
TLD_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 15 "$CONTRACT_URL/api/health" 2>/dev/null || echo "000")

if [ "$TLD_STATUS" -ge 200 ] && [ "$TLD_STATUS" -lt 400 ]; then
    echo "✅ TLD reachable (HTTP $TLD_STATUS). Running E2E contract tests."
    npm ci
    npx playwright install --with-deps
    PLAYWRIGHT_TLD_ONLY=1 npx playwright test --project=analytics-tld-contract
else
    echo "⚠️  TLD unreachable (HTTP $TLD_STATUS). Skipping Playwright E2E — backend outage is not a code defect."
    run_id=$(date +%s)
    artifact_dir="${ROOT_DIR}/.goalie/evidence"
    mkdir -p "$artifact_dir"
    artifact_path="$artifact_dir/tld_health_skip_${run_id}.json"
    cat <<EOF > "$artifact_path"
{
  "gate": "tld_health_skip",
  "run_id": "$run_id",
  "hash": "$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo "no-git")",
  "exit_code": 0,
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
    ln -sf "$(basename "$artifact_path")" "$artifact_dir/last_tld_health_skip.json"
    echo "✅ Skip artifact generated: $artifact_path"
fi
