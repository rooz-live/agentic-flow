#!/usr/bin/env bash
#
# pi-prep-bootstrap.sh — PI Prep → trust-path with exclusive flock (idempotent serial entry).
#
# Order: remind session contract → optional velocity delta → validate-foundation --trust-path
#
# Usage (from repo root):
#   TRUST_GIT=/usr/bin/git bash scripts/pi-prep-bootstrap.sh
#   SKIP_VELOCITY_DELTA=1 bash scripts/pi-prep-bootstrap.sh
#
# Lock: .goalie/locks/pi_prep_bootstrap.lock.d/ (mkdir atomic; concurrent runs serialize; portable macOS/Linux)
#
# @business-context WSJF-INFRA: Serializes PI Prep so trust-path + git do not race
# @constraint DDD-VALIDATION: Validation / bootstrap bounded context only

set -euo pipefail

_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$_PROJECT_ROOT" || exit 11

LOCK_DIR="${_PROJECT_ROOT}/.goalie/locks"
LOCK_DIR_EXCLUSIVE="${LOCK_DIR}/pi_prep_bootstrap.lock.d"
mkdir -p "$LOCK_DIR"

_acquire_mkdir_lock() {
    local waited=0
    local max_wait="${PI_PREP_LOCK_TIMEOUT_SEC:-600}"
    while ! mkdir "$LOCK_DIR_EXCLUSIVE" 2>/dev/null; do
        sleep 1
        waited=$((waited + 1))
        if (( waited >= max_wait )); then
            echo "[pi-prep-bootstrap] timeout waiting for lock (${LOCK_DIR_EXCLUSIVE})" >&2
            exit 60
        fi
    done
}

_release_mkdir_lock() {
    rmdir "$LOCK_DIR_EXCLUSIVE" 2>/dev/null || true
}

_acquire_mkdir_lock
trap '_release_mkdir_lock' EXIT INT TERM HUP

echo ""
echo "PI Prep bootstrap (lock: ${LOCK_DIR_EXCLUSIVE})"
echo "======================================="

# 1) Session contract surface (human + agent reminder)
SP="${_PROJECT_ROOT}/.agentic/system_prompt.md"
if [[ -f "$SP" ]]; then
    _lines=$(wc -l <"$SP" | tr -d ' ')
    echo "[pi-prep-bootstrap] Session contract: .agentic/system_prompt.md (${_lines} lines) — load before deep work."
else
    echo "[pi-prep-bootstrap] WARN: missing .agentic/system_prompt.md"
fi

# 2) Historic / velocity delta (optional)
if [[ "${SKIP_VELOCITY_DELTA:-0}" != "1" ]]; then
    _delta="${_PROJECT_ROOT}/_SYSTEM/_AUTOMATION/extract-historic-delta.py"
    if [[ -f "$_delta" ]] && command -v python3 >/dev/null 2>&1; then
        echo "[pi-prep-bootstrap] Running extract-historic-delta.py ..."
        python3 "$_delta" || echo "[pi-prep-bootstrap] WARN: extract-historic-delta.py exited non-zero (continuing to trust-path)"
    fi
else
    echo "[pi-prep-bootstrap] SKIP_VELOCITY_DELTA=1 — skipping extract-historic-delta.py"
fi

# 3) Trust path (delegates TRUST_GIT resolution to validate-foundation.sh)
if [[ "$(uname -s 2>/dev/null)" == Darwin ]] && [[ -z "${TRUST_GIT:-}" ]] && [[ -x /usr/bin/git ]]; then
    export TRUST_GIT=/usr/bin/git
fi

echo "[pi-prep-bootstrap] Running scripts/validate-foundation.sh --trust-path ..."
bash "${_PROJECT_ROOT}/scripts/validate-foundation.sh" --trust-path
