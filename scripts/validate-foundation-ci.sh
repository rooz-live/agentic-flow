#!/usr/bin/env bash
#
# validate-foundation-ci.sh — Merge-trust gate for CI (evidence-backed, deterministic)
#
# @business-context WSJF-Thread1: AgentDB + schema integrity must pass before merge; local-only
#   validate-foundation.sh depends on gitignored sqlite + .goalie artifacts unavailable on runners.
#
# Rollback / reversibility:
#   - Remove the "Foundation trust gate" job from .github/workflows/foundation-trust-gate.yml, or
#   - Set env SKIP_AGENTDB_FRESHNESS=1 and AGENTDB_TRUST_STRICT=0 on the workflow job.
#   - Revert the single commit that added this script + workflow (no data deletion required).
#
# Usage: ./scripts/validate-foundation-ci.sh [--strict]
# Env:
#   SKIP_AGENTDB_FRESHNESS=1  — skip max-age check on .agentdb/agentdb.sqlite mtime
#   AGENTDB_MAX_AGE_HOURS=96  — fail if DB file older than this many hours (default 96)
#   AGENTDB_TRUST_STRICT=1    — exit non-zero on any failed check (default when --strict)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${0}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

STRICT=false
[[ "${1:-}" == "--strict" ]] && STRICT=true
AGENTDB_PATH=".agentdb/agentdb.sqlite"
SCHEMA_FILE=".agentdb/init_schema.sql"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

die_check() {
  local name="$1" cmd="$2"
  if eval "${cmd}"; then
    echo -e "${GREEN}✓${NC} ${name}"
  else
    echo -e "${RED}✗${NC} ${name}"
    FAILED=$((FAILED + 1))
    if [[ "${STRICT}" == true ]]; then
      echo -e "${RED}STRICT: stopping${NC}"
      exit 1
    fi
  fi
}

echo "🔍 Foundation CI trust gate (AgentDB)"
echo "======================================"

if [[ ! -f "${SCHEMA_FILE}" ]]; then
  echo -e "${RED}✗${NC} Missing ${SCHEMA_FILE}"
  exit 1
fi

mkdir -p .agentdb

if [[ ! -f "${AGENTDB_PATH}" ]]; then
  echo "Bootstrapping ${AGENTDB_PATH} from ${SCHEMA_FILE}"
  sqlite3 "${AGENTDB_PATH}" < "${SCHEMA_FILE}"
fi

die_check "AgentDB file exists" "test -f ${AGENTDB_PATH}"

EC=$(sqlite3 "${AGENTDB_PATH}" "SELECT COUNT(*) FROM execution_contexts" 2>/dev/null || echo 0)
BD=$(sqlite3 "${AGENTDB_PATH}" "SELECT COUNT(*) FROM beam_dimensions" 2>/dev/null || echo 0)

if [[ "${EC}" -eq 0 ]]; then
  sqlite3 "${AGENTDB_PATH}" "INSERT INTO execution_contexts (command, success, duration_ms) VALUES ('ci-trust-bootstrap', 1, 0);"
  echo "Seeded execution_contexts (was empty)"
fi
if [[ "${BD}" -eq 0 ]]; then
  sqlite3 "${AGENTDB_PATH}" "INSERT INTO beam_dimensions (who_dimension, what_dimension, when_dimension, where_dimension, why_dimension, how_dimension) VALUES ('ci','trust-bootstrap','now','runner','merge-gate','verify');"
  echo "Seeded beam_dimensions (was empty)"
fi

die_check "execution_contexts non-empty" "test \"\$(sqlite3 ${AGENTDB_PATH} 'SELECT COUNT(*) FROM execution_contexts')\" -gt 0"
die_check "beam_dimensions non-empty" "test \"\$(sqlite3 ${AGENTDB_PATH} 'SELECT COUNT(*) FROM beam_dimensions')\" -gt 0"

if [[ "${SKIP_AGENTDB_FRESHNESS:-}" != "1" ]]; then
  MAX_HOURS="${AGENTDB_MAX_AGE_HOURS:-96}"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    MT=$(stat -f %m "${AGENTDB_PATH}" 2>/dev/null || echo 0)
  else
    MT=$(stat -c %Y "${AGENTDB_PATH}" 2>/dev/null || echo 0)
  fi
  NOW=$(date +%s)
  AGE_HOURS=$(( (NOW - MT) / 3600 ))
  if [[ "${AGE_HOURS}" -gt "${MAX_HOURS}" ]]; then
    echo -e "${RED}✗${NC} agentdb.sqlite older than ${MAX_HOURS}h (age=${AGE_HOURS}h) — refresh or re-bootstrap"
    FAILED=$((FAILED + 1))
    [[ "${STRICT}" == true ]] && exit 1
  else
    echo -e "${GREEN}✓${NC} AgentDB freshness (age ${AGE_HOURS}h ≤ ${MAX_HOURS}h)"
  fi
else
  echo -e "${YELLOW}⚠${NC} SKIP_AGENTDB_FRESHNESS=1 — max-age check skipped"
fi

echo "======================================"
if [[ "${FAILED}" -eq 0 ]]; then
  echo -e "${GREEN}✅ Foundation CI trust gate passed${NC}"
  exit 0
fi
echo -e "${YELLOW}⚠${NC} Foundation CI trust gate: ${FAILED} check(s) failed"
exit "${FAILED}"
