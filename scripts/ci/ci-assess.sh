#!/usr/bin/env bash
# ci-assess.sh — CI Assessor Circle.
# Refactored from scripts/cicd/ci_assessor.sh.
#
# Key fix: TLD soft-skip artifact now carries "tld_status":"skip" so
# gate-one-pass verify-contract can distinguish skip from a genuine pass.
# This closes the SPOF where a permanent outage made CI permanently green.
#
# DoR: auto-dor.sh passes; ROAM files fresh.
# DoD: .goalie/evidence/ci_assess_{run_id}.json with tld_status: pass|skip.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/.goalie/evidence"
RUN_ID=$(date +%s)
HASH=$(git rev-parse HEAD 2>/dev/null || echo "no-git")

red()    { printf "\033[31m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

echo "====================================================================="
echo "🔬 CI ASSESSOR CIRCLE"
echo "====================================================================="

EXIT_CODE=0
TLD_STATUS_LABEL="skip"

# ── DoR: Definition of Ready ──────────────────────────────────────────────────
echo "--> Verifying Definition of Ready (DoR)..."
bash "$ROOT_DIR/scripts/utils/auto-dor.sh" || EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 ]]; then
    red "❌ DoR check failed — aborting CI assess."
    exit $EXIT_CODE
fi

# ── DoR: ROAM staleness ───────────────────────────────────────────────────────
echo "--> Verifying ROAM Staleness Constraints..."
bash "$ROOT_DIR/scripts/utils/roam-staleness-check.sh" || EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 ]]; then
    red "❌ ROAM staleness check failed — aborting CI assess."
    exit $EXIT_CODE
fi

# ── TLD Health-Check + E2E ────────────────────────────────────────────────────
CONTRACT_URL="${CONTRACT_BASE_URL:-https://analytics.interface.tag.ooo}"
echo "--> TLD Health-Check: $CONTRACT_URL/api/health..."
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 15 \
    "$CONTRACT_URL/api/health" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 400 ]]; then
    green "  TLD reachable (HTTP $HTTP_CODE). Running E2E contract tests..."
    TLD_STATUS_LABEL="pass"

    npm ci
    npx playwright install --with-deps
    PLAYWRIGHT_TLD_ONLY=1 npx playwright test --project=analytics-tld-contract || EXIT_CODE=$?

    if [[ $EXIT_CODE -ne 0 ]]; then
        red "❌ E2E contract tests failed (exit $EXIT_CODE)."
        TLD_STATUS_LABEL="e2e_fail"
    fi
else
    # SPOF FIX: Explicit skip label — not a silent pass
    TLD_STATUS_LABEL="skip"
    yellow "⚠️  TLD unreachable (HTTP $HTTP_CODE). Skipping Playwright E2E."
    yellow "   This is a SKIP not a PASS. Permanent outage will not silently green CI."
    yellow "   ROAM: Tag this as Owned/Mitigated risk if intentional."
fi

# ── DoD artifact ──────────────────────────────────────────────────────────────
mkdir -p "$ARTIFACT_DIR"
ARTIFACT_PATH="$ARTIFACT_DIR/ci_assess_${RUN_ID}.json"

cat > "$ARTIFACT_PATH" <<EOF
{
  "gate": "ci-assess",
  "run_id": "$RUN_ID",
  "hash": "$HASH",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "tld_http_code": "$HTTP_CODE",
  "tld_status": "$TLD_STATUS_LABEL",
  "exit_code": $EXIT_CODE
}
EOF

# Distinct symlinks for pass vs skip — prevents verify-contract from treating skip as pass
if [[ "$TLD_STATUS_LABEL" == "pass" ]]; then
    ln -sf "$(basename "$ARTIFACT_PATH")" "$ARTIFACT_DIR/last_ci_assess_pass.json"
else
    ln -sf "$(basename "$ARTIFACT_PATH")" "$ARTIFACT_DIR/last_ci_assess_tld_skip.json"
    # Do NOT update last_ci_assess_pass.json on a skip run
fi

green "  DoD artifact: $ARTIFACT_PATH (tld_status: $TLD_STATUS_LABEL)"

if [[ $EXIT_CODE -eq 0 ]]; then
    green "====================================================================="
    green "✅ CI ASSESSOR CIRCLE PASSED"
    green "====================================================================="
else
    red "====================================================================="
    red "❌ CI ASSESSOR CIRCLE FAILED (exit $EXIT_CODE)"
    red "====================================================================="
fi

exit $EXIT_CODE
