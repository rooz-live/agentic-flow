#!/usr/bin/env bash
# ay - Agentic Yield: Iterative mode cycling with progress UI
# Resolves primary recommended actions with minimal cycles
# AISP lane: governance | Mode: SA/FA/M

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AISP_STATUS_FILE="${AISP_STATUS_PATH:-$PROJECT_ROOT/reports/aisp-status.json}"

# ===========================================================================
# AISP Configuration: Source env + exit codes, then guard
# ===========================================================================

# Source AISP env loader (sets AISP_ENV, AISP_T_STAGE, roots, domains, etc.)
# shellcheck source=cpanel-env-setup.sh
source "$SCRIPT_DIR/cpanel-env-setup.sh" 2>/dev/null || true

# Source exit codes for robust exit handling (canonical registry from cpanel)
# shellcheck source=validation-core.sh
source "${EXIT_CODES_REGISTRY:-$PROJECT_ROOT/scripts/validation-core.sh}" 2>/dev/null || {
    EX_CONFIG=78
    EX_USAGE=64
}

# Semantic fallbacks for robust guard exits.
: "${EXIT_INVALID_ARGS:=10}"
: "${EXIT_INVALID_FORMAT:=12}"
: "${EXIT_MISSING_REQUIRED_FIELD:=21}"
: "${EXIT_WSJF_SCORE_LOW:=160}"

# --- Wave 42: Dynamic Context Trimming & Token Optimization ---
# Principle: Interiority's Externalities - Reject static memory sprawl.
export AF_DYNAMIC_CONTEXT_MODE=1
export OPENROUTER_TOKEN_LIMIT=4000
export ANTHROPIC_MAX_TOKENS=4000
export AF_MAX_TOKENS_PER_AGENT=4000
# Restrict legacy payloads strictly to active parameters:
: "${AF_ACTIVE_CONTEXT_LANE:=$AISP_LANE}"

trim_context_for_tokens() {
    local active_lane="${1:-$AISP_LANE}"
    if [[ "$AF_DYNAMIC_CONTEXT_MODE" == "1" ]]; then
        export AY_MAX_ROAM_LINES=20
        export AY_MAX_METRICS_LINES=50
        export AY_SKIP_LEGACY_LOGS=1
        
        if [[ "$active_lane" == "governance" ]]; then
             export AF_ACTIVE_CONTEXT_FILES="$PROJECT_ROOT/.goalie/metrics_log.jsonl $PROJECT_ROOT/ROAM_TRACKER.yaml"
        else
             export AF_ACTIVE_CONTEXT_FILES="$PROJECT_ROOT/ROAM_TRACKER.yaml"
        fi
        echo "✅ Dynamic Context Trimming Active: Lane=$active_lane, Target Tokens=$OPENROUTER_TOKEN_LIMIT"
    fi
}
trim_context_for_tokens "$AISP_LANE"

# Override lane for this script
export AISP_LANE="governance"

# Source shared guard-failure envelope (unified behavior across ay, advocate, cascade-tunnel)
# shellcheck source=guard-failure-envelope.sh
source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/guard-failure-envelope.sh" 2>/dev/null || true

# --- Rolling failure trend counters (10/12/21/160) ---
ROLLING_FAIL_10=0
ROLLING_FAIL_12=0
ROLLING_FAIL_21=0
ROLLING_FAIL_160=0
ROLLING_FAIL_TOTAL=0
ROLLING_RUNS=0
CEREMONY_METRICS_FILE="$PROJECT_ROOT/.goalie/ceremony_metrics.jsonl"
ROAM_TRACKER_FILE="${ROAM_TRACKER_PATH:-$PROJECT_ROOT/ROAM_TRACKER.yaml}"

# Debug session logging (runtime evidence)
DEBUG_LOG_PATH="/Users/shahroozbhopti/Documents/code/.cursor/debug-4628f2.log"
debug_log() {
    local hypothesis_id="${1:-H0}"
    local location="${2:-scripts/ay.sh}"
    local message="${3:-debug}"
    local data_json="${4:-{}}"
    local run_id="${5:-pre-fix}"
    local payload
    local ts_ms
    ts_ms=$(python3 - <<'PY' 2>/dev/null
import time
print(int(time.time() * 1000))
PY
)
    : "${ts_ms:=0}"
    payload=$(printf '{"sessionId":"4628f2","runId":"%s","hypothesisId":"%s","location":"%s","message":"%s","data":%s,"timestamp":%s}' \
      "$run_id" "$hypothesis_id" "$location" "$message" "$data_json" "$ts_ms")
    { printf '%s\n' "$payload" >> "$DEBUG_LOG_PATH"; } 2>/dev/null || true
    curl -sS -X POST "http://127.0.0.1:7242/ingest/03f77a0f-fe44-4a18-9e9e-6edf550b3879" \
      -H 'Content-Type: application/json' \
      -H 'X-Debug-Session-Id: 4628f2' \
      -d "$payload" >/dev/null 2>&1 || true
}

extract_json_int() {
    local json_payload="${1:-}"
    local key="${2:-}"
    python3 - "$json_payload" "$key" <<'PY' 2>/dev/null
import json, sys
payload = sys.argv[1] if len(sys.argv) > 1 else "{}"
key = sys.argv[2] if len(sys.argv) > 2 else ""
try:
    obj = json.loads(payload or "{}")
except Exception:
    obj = {}
val = obj.get(key, 0)
if isinstance(val, bool):
    print(1 if val else 0)
elif isinstance(val, (int, float)):
    print(int(val))
else:
    try:
        print(int(str(val)))
    except Exception:
        print(0)
PY
}

load_rolling_failure_counters() {
    local status_file="${1:-$AISP_STATUS_FILE}"
    ROLLING_FAIL_10=0 ROLLING_FAIL_12=0 ROLLING_FAIL_21=0 ROLLING_FAIL_160=0
    ROLLING_FAIL_TOTAL=0 ROLLING_RUNS=0
    if [[ -f "$status_file" ]]; then
        local content
        content=$(<"$status_file")
        local header_json counter_json
        header_json=$(python3 - "$content" <<'PY' 2>/dev/null
import json, sys
payload = sys.argv[1] if len(sys.argv) > 1 else "{}"
try:
    obj = json.loads(payload or "{}")
except Exception:
    obj = {}
header = obj.get("aisp_header", {}) if isinstance(obj, dict) else {}
print(json.dumps(header))
PY
)
        counter_json=$(python3 - "$header_json" <<'PY' 2>/dev/null
import json, sys
payload = sys.argv[1] if len(sys.argv) > 1 else "{}"
try:
    obj = json.loads(payload or "{}")
except Exception:
    obj = {}
counter = obj.get("rolling_failure_counter", {}) if isinstance(obj, dict) else {}
print(json.dumps(counter))
PY
)
        ROLLING_FAIL_10=$(extract_json_int "$counter_json" "10")
        ROLLING_FAIL_12=$(extract_json_int "$counter_json" "12")
        ROLLING_FAIL_21=$(extract_json_int "$counter_json" "21")
        ROLLING_FAIL_160=$(extract_json_int "$counter_json" "160")
        ROLLING_FAIL_TOTAL=$(extract_json_int "$header_json" "rolling_failure_total")
        ROLLING_RUNS=$(extract_json_int "$header_json" "rolling_runs")
    fi
    debug_log "H1" "scripts/ay.sh:load_rolling_failure_counters" "loaded rolling counters" "{\"status_file\":\"$status_file\",\"fail10\":$ROLLING_FAIL_10,\"fail12\":$ROLLING_FAIL_12,\"fail21\":$ROLLING_FAIL_21,\"fail160\":$ROLLING_FAIL_160,\"total\":$ROLLING_FAIL_TOTAL,\"runs\":$ROLLING_RUNS}"
}

increment_rolling_failure_counter() {
    local exit_code="${1:-0}"
    load_rolling_failure_counters "$AISP_STATUS_FILE"
    ((++ROLLING_RUNS)) || true
    case "$exit_code" in
        10) ((++ROLLING_FAIL_10)); ((++ROLLING_FAIL_TOTAL)) ;;
        12) ((++ROLLING_FAIL_12)); ((++ROLLING_FAIL_TOTAL)) ;;
        21) ((++ROLLING_FAIL_21)); ((++ROLLING_FAIL_TOTAL)) ;;
        160) ((++ROLLING_FAIL_160)); ((++ROLLING_FAIL_TOTAL)) ;;
    esac
    debug_log "H2" "scripts/ay.sh:increment_rolling_failure_counter" "incremented rolling counters" "{\"exit_code\":$exit_code,\"fail10\":$ROLLING_FAIL_10,\"fail12\":$ROLLING_FAIL_12,\"fail21\":$ROLLING_FAIL_21,\"fail160\":$ROLLING_FAIL_160,\"total\":$ROLLING_FAIL_TOTAL,\"runs\":$ROLLING_RUNS}"
}

build_ceremony_contract_json() {
    local checks_passed="${1:-0}"
    local checks_total="${2:-0}"
    local pass_velocity="${3:-0}"
    local resolved_velocity="${4:-0}"
    local exit_code="${5:-0}"

    python3 - "$CEREMONY_METRICS_FILE" "$ROAM_TRACKER_FILE" "$checks_passed" "$checks_total" "$pass_velocity" "$resolved_velocity" "$exit_code" <<'PY'
import json
import pathlib
import re
import sys

metrics_path = pathlib.Path(sys.argv[1])
roam_path = pathlib.Path(sys.argv[2])
checks_passed = float(sys.argv[3] or 0)
checks_total = float(sys.argv[4] or 0)
pass_velocity = float(sys.argv[5] or 0)
resolved_velocity = float(sys.argv[6] or 0)
exit_code = int(float(sys.argv[7] or 0))

ceremony_names = ["review", "retro", "replenish", "refine", "standup", "pi_sync"]
counts = {name: 0 for name in ceremony_names}

if metrics_path.exists():
    for raw in metrics_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        raw = raw.strip()
        if not raw:
            continue
        try:
            evt = json.loads(raw)
        except Exception:
            continue
        name = str(evt.get("ceremony", "")).strip().lower().replace("-", "_")
        if name in counts and evt.get("type", "ceremony_completion") == "ceremony_completion":
            counts[name] += 1

roam_total = 0
roam_open = 0
roam_owned = 0
if roam_path.exists():
    for line in roam_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        match = re.match(r"\s*status:\s*([A-Za-z_]+)", line)
        if not match:
            continue
        roam_total += 1
        status = match.group(1).strip().lower()
        if status not in {"resolved", "mitigated", "closed"}:
            roam_open += 1
        if status == "owned":
            roam_owned += 1

ratio = checks_passed / checks_total if checks_total > 0 else 0.0
total_events = sum(counts.values())
status = "ready"
if exit_code >= 100 or ratio < 0.5:
    status = "blocked"
elif ratio < 0.8:
    status = "degraded"

summary_score = max(0.0, min(100.0, (ratio * 100.0) - min(roam_open, 20)))
ceremonies = {}
for name in ceremony_names:
    observed = counts[name]
    checks_total_local = observed if observed > 0 else 1
    checks_passed_local = int(round(checks_total_local * ratio)) if observed > 0 else 0
    checks_passed_local = max(0, min(checks_total_local, checks_passed_local))
    weight = (observed / total_events) if total_events > 0 else 0.0
    local_status = status if observed > 0 else ("pending" if exit_code < 100 else "blocked")
    blockers = []
    if local_status == "blocked":
        blockers.append({
            "id": f"B-{name.upper()}-EXIT",
            "desc": f"{name} blocked by lane exit {exit_code}",
            "exit_code": exit_code
        })
    ceremonies[name] = {
        "status": local_status,
        "%/#": {"checks_passed": checks_passed_local, "checks_total": checks_total_local},
        "%.#": {
            "checks_passed_per_min": round(pass_velocity * weight, 2),
            "actions_resolved_per_min": round(resolved_velocity * weight, 2)
        },
        "wsjf": {
            "score": round(summary_score, 2),
            "band": "high" if summary_score >= 70 else ("medium" if summary_score >= 40 else "low")
        },
        "roam": {"risk_total": roam_total, "risk_open": roam_open, "risk_owned": roam_owned},
        "blockers": blockers,
        "dependencies": [{"on": "wsjf+roam+guard", "status": "healthy" if local_status == "ready" else "degraded"}]
    }

result = {
    "contract_version": "1.0",
    "summary": {
        "%/#": {"checks_passed": int(checks_passed), "checks_total": int(checks_total) if checks_total > 0 else 0},
        "%.#": {
            "checks_passed_per_min": round(pass_velocity, 2),
            "actions_resolved_per_min": round(resolved_velocity, 2)
        },
        "wsjf": {"score": round(summary_score, 2)},
        "roam": {"risk_total": roam_total, "risk_open": roam_open, "risk_owned": roam_owned},
        "telemetry_events": total_events
    },
    "review": ceremonies["review"],
    "retro": ceremonies["retro"],
    "replenish": ceremonies["replenish"],
    "refine": ceremonies["refine"],
    "standup": ceremonies["standup"],
    "pi_sync": ceremonies["pi_sync"]
}
print(json.dumps(result, separators=(",", ":")))
PY
}

# --- AISP Config Guard Block (%/# robustness) ---
AISP_CHECKS_PASSED=0
AISP_CHECKS_TOTAL=5

# 1) Required roots
if [[ -z "${AISP_WORKSPACE_ROOT:-}" || -z "${LEGAL_ROOT:-}" ]]; then
    echo "❌ AISP config missing ROOTS (AISP_WORKSPACE_ROOT / LEGAL_ROOT)"
    emit_guard_failure_status "$AISP_STATUS_FILE" "governance" "${EXIT_INVALID_ARGS}" "Missing required roots (AISP_WORKSPACE_ROOT / LEGAL_ROOT)" "scripts/ay.sh"
    exit "${EXIT_INVALID_ARGS}"
fi
((AISP_CHECKS_PASSED++)) || true

# 2) LEGAL_ROOT must exist
if [[ ! -d "${LEGAL_ROOT}" ]]; then
    echo "❌ LEGAL_ROOT does not exist: ${LEGAL_ROOT}"
    emit_guard_failure_status "$AISP_STATUS_FILE" "governance" "${EXIT_INVALID_ARGS}" "Configured LEGAL_ROOT does not exist" "scripts/ay.sh"
    exit "${EXIT_INVALID_ARGS}"
fi
((AISP_CHECKS_PASSED++)) || true

# 3) Multi-root sanity — PWD must be under a known root
case "$PWD" in
    "$AISP_WORKSPACE_ROOT"/*|"$AISP_WORKSPACE_ROOT"|"$LEGAL_ROOT"/*|"$LEGAL_ROOT") ;;
    *)
        echo "⚠️  ay.sh: PWD ($PWD) not under AISP_WORKSPACE_ROOT or LEGAL_ROOT — cd'ing to AISP_WORKSPACE_ROOT"
        cd "$AISP_WORKSPACE_ROOT" || {
            emit_guard_failure_status "$AISP_STATUS_FILE" "governance" "${EXIT_INVALID_FORMAT}" "Invalid root / cd failure while enforcing workspace root" "scripts/ay.sh"
            exit "${EXIT_INVALID_FORMAT}"
        }
        ;;
esac
((AISP_CHECKS_PASSED++)) || true

# 4) Cases present
if [[ -z "${LEGAL_CASE_IDS:-}" ]]; then
    echo "❌ LEGAL_CASE_IDS missing"
    emit_guard_failure_status "$AISP_STATUS_FILE" "governance" "${EXIT_MISSING_REQUIRED_FIELD}" "Missing required LEGAL_CASE_IDS" "scripts/ay.sh"
    exit "${EXIT_MISSING_REQUIRED_FIELD}"
fi
((AISP_CHECKS_PASSED++)) || true

# Robust default-branch detection that works even when origin/HEAD is unset.
resolve_default_branch() {
    local root="$1"
    local detected=""
    detected=$(git -C "$root" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@') || true
    if [[ -z "$detected" ]]; then
        detected=$(git -C "$root" config --get init.defaultBranch 2>/dev/null || true)
    fi
    if [[ -z "$detected" ]]; then
        if git -C "$root" show-ref --verify --quiet refs/heads/main; then
            detected="main"
        elif git -C "$root" show-ref --verify --quiet refs/heads/master; then
            detected="master"
        else
            detected=$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
        fi
    fi
    : "${detected:=main}"
    printf '%s' "$detected"
}

# 5) Prod branch gate
if [[ "${AISP_ENV:-dev}" == "prod" ]]; then
    DEFAULT_BRANCH=$(resolve_default_branch "$AISP_WORKSPACE_ROOT")
    CUR_BRANCH=$(git -C "$AISP_WORKSPACE_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "UNKNOWN")
    if [[ "$CUR_BRANCH" != "$DEFAULT_BRANCH" ]]; then
        echo "❌ Not on default branch ($CUR_BRANCH != $DEFAULT_BRANCH) — AISP_ENV=prod requires it"
        emit_guard_failure_status "$AISP_STATUS_FILE" "governance" "${EXIT_WSJF_SCORE_LOW}" "Prod branch gate failed ($CUR_BRANCH != $DEFAULT_BRANCH)" "scripts/ay.sh"
        exit "${EXIT_WSJF_SCORE_LOW}"
    fi
fi
((AISP_CHECKS_PASSED++)) || true

# 5) Full-Auto gate: refuse FA when T0
if [[ "${AISP_MODE_DEFAULT:-SA}" == "FA" && "${AISP_T_STAGE:-T0}" == "T0" ]]; then
    echo "⚠️  Full-Auto requested but AISP_T_STAGE=T0 — downgrading to Semi-Auto"
    export AISP_MODE_DEFAULT="SA"
fi

echo "✅ AISP config: ${AISP_CHECKS_PASSED}/${AISP_CHECKS_TOTAL} checks passed | env=${AISP_ENV:-dev} stage=${AISP_T_STAGE:-T0} lane=${AISP_LANE} mode=${AISP_MODE_DEFAULT:-SA}"

# CSQBM Governance Constraint: Trace TUI wrapper execution

# --iterative mode: skip ceremony health/prod checks to focus on mode cycling
AY_ITERATIVE_MODE=0
[[ "${1:-}" == "--iterative" ]] && AY_ITERATIVE_MODE=1

# --check mode: emit AISP envelope and exit (no TUI)
if [[ "${1:-}" == "--check" || "${1:-}" == "--status" ]]; then
    load_rolling_failure_counters "$AISP_STATUS_FILE"
    rolling_rate_pct="0.00"
    failures_per_run="0.00"
    if [[ $ROLLING_RUNS -gt 0 ]]; then
        rolling_rate_pct=$(awk "BEGIN { printf \"%.2f\", ($ROLLING_FAIL_TOTAL * 100) / $ROLLING_RUNS }")
        failures_per_run=$(awk "BEGIN { printf \"%.2f\", $ROLLING_FAIL_TOTAL / $ROLLING_RUNS }")
    fi
    ceremonies_json=""
    ceremonies_json=$(build_ceremony_contract_json "${AISP_CHECKS_PASSED}" "${AISP_CHECKS_TOTAL}" 0 0 0)

    mkdir -p "$(dirname "$AISP_STATUS_FILE")"
    cat > "$AISP_STATUS_FILE" <<AISP_EOF
{
  "aisp_header": {
    "version": "1.0",
    "timestamp_utc": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "t_stage": "${AISP_T_STAGE:-T0}",
    "domain": ["$(echo "${AISP_DOMAINS:-legal}" | sed 's/,/","/g')"],
    "case_ids": ["$(echo "${LEGAL_CASE_IDS:-}" | sed 's/,/","/g')"],
    "lane": "${AISP_LANE}",
    "mode": "${AISP_MODE_DEFAULT:-SA}",
    "env": "${AISP_ENV:-dev}",
    "%/#": { "config_checks_passed": ${AISP_CHECKS_PASSED}, "config_checks_total": ${AISP_CHECKS_TOTAL} },
    "env_%/#": { "config_checks_passed": ${AISP_CHECKS_PASSED}, "config_checks_total": ${AISP_CHECKS_TOTAL} },
    "%.#": { "checks_passed_per_min": 0.00, "actions_resolved_per_min": 0.00 },
    "rolling_failure_counter": { "10": ${ROLLING_FAIL_10}, "12": ${ROLLING_FAIL_12}, "21": ${ROLLING_FAIL_21}, "160": ${ROLLING_FAIL_160} },
    "rolling_failure_total": ${ROLLING_FAIL_TOTAL},
    "rolling_runs": ${ROLLING_RUNS},
    "trend_velocity": { "rolling_failure_rate_pct": ${rolling_rate_pct}, "failures_per_run": ${failures_per_run} },
    "exit_code": 0,
    "exit_zone": "success"
  },
  "intro": {
    "build": "AISP config check only (--check mode)",
    "measure": "${AISP_CHECKS_PASSED}/${AISP_CHECKS_TOTAL} env config checks passed",
    "learn": "Config is valid — safe to run Build-Measure-Learn cycles"
  },
  "body": {
    "circles": [
      {
        "name": "governance",
        "role": "AISPConfigGuard",
        "status": "ready",
        "%/#": { "checks_passed": ${AISP_CHECKS_PASSED}, "checks_total": ${AISP_CHECKS_TOTAL} },
        "blockers": [],
        "dependencies": [
          { "on": "AISP env contract", "status": "healthy" }
        ]
      }
    ],
    "ceremonies": ${ceremonies_json}
  },
  "menu": [
    {
      "id": "run_ay",
      "label": "Run governance cycle",
      "mode": "${AISP_MODE_DEFAULT:-SA}",
      "api": { "cli": "./scripts/ay.sh" },
      "guards": { "required_exit_codes": [0,1] }
    }
  ],
  "manifest": {
    "id": "AISP-CHECK-$(date -u +"%Y-%m-%dT%H-%M-%SZ")",
    "workspace": "agentic-flow",
    "source_script": "scripts/ay.sh --check",
    "roots": { "workspace": "${AISP_WORKSPACE_ROOT}", "legal": "${LEGAL_ROOT}" },
    "principles": ["Discover/Consolidate THEN extend", "Semi-Auto before Full-Auto in T0/T1"]
  }
}
AISP_EOF
    debug_log "H4" "scripts/ay.sh:check_mode" "check mode envelope written" "{\"status_file\":\"$AISP_STATUS_FILE\",\"rolling_total\":$ROLLING_FAIL_TOTAL,\"rolling_runs\":$ROLLING_RUNS,\"checks_passed\":${AISP_CHECKS_PASSED},\"checks_total\":${AISP_CHECKS_TOTAL}}"
    echo "📋 AISP envelope written to $AISP_STATUS_FILE"
    cat "$AISP_STATUS_FILE"
    exit 0
fi

# Colors & UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Progress tracking
TOTAL_ACTIONS=0
COMPLETED_ACTIONS=0
CYCLE_COUNT=0
START_TIME=$(date +%s)

# UI Components
clear_screen() {
    if command -v tput &>/dev/null; then
        tput clear 2>/dev/null || clear || printf "\033[2J\033[H"
    else
        clear 2>/dev/null || printf "\033[2J\033[H"
    fi
}

draw_progress_bar() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))

    printf "${CYAN}["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "]${NC} ${BOLD}%3d%%${NC}\n" "$percentage"
}

draw_header() {
    local mode=$1
    local cycle=$2

    echo -e "${BOLD}${MAGENTA}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${MAGENTA}║${NC}  ${CYAN}🚀 AGENTIC YIELD (ay)${NC} - Iterative Mode Cycling        ${BOLD}${MAGENTA}║${NC}"
    echo -e "${BOLD}${MAGENTA}╠════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}${MAGENTA}║${NC}  Current Mode: ${YELLOW}${mode}${NC}                                   ${BOLD}${MAGENTA}║${NC}"
    echo -e "${BOLD}${MAGENTA}║${NC}  Cycle: ${GREEN}${cycle}${NC}                                              ${BOLD}${MAGENTA}║${NC}"
    echo -e "${BOLD}${MAGENTA}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

draw_action_list() {
    local -n actions=$1
    local -n statuses=$2
    local i

    echo -e "${BOLD}Actions:${NC}"
    for i in "${!actions[@]}"; do
        local status="${statuses[$i]}"
        local icon="⏳"
        local color="${YELLOW}"

        case "$status" in
            "done")
                icon="✅"
                color="${GREEN}"
                ((COMPLETED_ACTIONS++)) || true
                ;;
            "running")
                icon="🔄"
                color="${CYAN}"
                ;;
            "failed")
                icon="❌"
                color="${RED}"
                ;;
            "skip")
                icon="⏭️"
                color="${BLUE}"
                ;;
        esac

        echo -e "  ${color}${icon} ${actions[$i]}${NC}"
    done
    echo ""
}

show_elapsed_time() {
    local elapsed=$(($(date +%s) - START_TIME))
    local mins=$((elapsed / 60))
    local secs=$((elapsed % 60))
    echo -e "${BLUE}⏱️  Elapsed: ${mins}m ${secs}s${NC}"
}

# After each outer cycle: show free space on the volume backing $HOME (ROAM / capacity observability).
show_disk_snapshot_after_cycle() {
    local cycle_n="${1:-?}"
    local df_line
    df_line=$(df -h "${HOME:-.}" 2>/dev/null | awk 'NR==2 {gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0); print}')
    if [[ -z "$df_line" ]]; then
        df_line=$(df -h / 2>/dev/null | awk 'NR==2 {gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0); print}')
    fi
    echo -e "${CYAN}💾 Disk after cycle ${cycle_n}:${NC} ${df_line}"
    debug_log "H10" "scripts/ay.sh:show_disk_snapshot_after_cycle" "disk after cycle" \
        "{\"cycle\":${cycle_n},\"df\":\"$(printf '%s' "$df_line" | sed 's/"/\\"/g')\"}"
}

# Rolling failure counter for validator suites
show_rolling_failure_counter() {
    load_rolling_failure_counters "$AISP_STATUS_FILE"
    local rolling_rate_pct="0.00"
    if [[ $ROLLING_RUNS -gt 0 ]]; then
        rolling_rate_pct=$(awk "BEGIN { printf \"%.2f\", ($ROLLING_FAIL_TOTAL * 100) / $ROLLING_RUNS }")
    fi
    echo -e "${YELLOW}📊 Rolling Failure Counter (status-file backed):${NC}"
    echo -e "  10:${ROLLING_FAIL_10} | 12:${ROLLING_FAIL_12} | 21:${ROLLING_FAIL_21} | 160:${ROLLING_FAIL_160} | total:${ROLLING_FAIL_TOTAL} | runs:${ROLLING_RUNS} | velocity:${rolling_rate_pct}%/run"
    echo ""
    debug_log "H9" "scripts/ay.sh:show_rolling_failure_counter" "displayed status-backed rolling counters" "{\"fail10\":$ROLLING_FAIL_10,\"fail12\":$ROLLING_FAIL_12,\"fail21\":$ROLLING_FAIL_21,\"fail160\":$ROLLING_FAIL_160,\"total\":$ROLLING_FAIL_TOTAL,\"runs\":$ROLLING_RUNS,\"rate_pct\":$rolling_rate_pct}"
}

# Primary recommended actions from current system state
declare -a PRIMARY_ACTIONS=(
    "Check ceremony execution health"
    "Clean temporary episode files"
    "Trigger skill learning"
    "Validate episode data quality"
    "Run production ceremony test"
    "Verify dynamic thresholds"
)

declare -a ACTION_STATUS=()
for _ in "${PRIMARY_ACTIONS[@]}"; do
    ACTION_STATUS+=("pending")
done

TOTAL_ACTIONS=${#PRIMARY_ACTIONS[@]}

# Agent modes for cycling
declare -a AGENT_MODES=(
    "validator"
    "tester"
    "monitor"
    "reviewer"
)

# Mode implementations
mode_validator() {
    local action=$1

    case "$action" in
        "Check ceremony execution health")
            [[ "${AY_ITERATIVE_MODE:-0}" -eq 1 ]] && return 3  # Skip permanently in iterative mode
            echo "Testing ceremony execution..."
            cd "$PROJECT_ROOT"
            if timeout 30 ./scripts/ay-yo.sh test &>/tmp/ay-ceremony-test.log; then
                return 0
            fi
            return 1
            ;;
        "Validate episode data quality")
            echo "Checking episode JSON structure..."
            cd "$PROJECT_ROOT"
            local latest=$(ls -t /tmp/episode_orchestrator_*.json 2>/dev/null | head -1)
            if [[ -n "$latest" ]] && jq -e '.skills | length > 0' "$latest" &>/dev/null; then
                return 0
            fi
            return 1
            ;;
        *)
            return 2  # Skip
            ;;
    esac
}

mode_tester() {
    local action=$1

    case "$action" in
        "Trigger skill learning")
            echo "Running learning cycles..."
            cd "$PROJECT_ROOT"
            # Run 3 learning cycles (120s timeout: ~3 ceremonies/cycle × 3 cycles × ~15s each)
            if timeout 120 ./scripts/ay-yo.sh learn 3 &>/tmp/ay-learn.log; then
                return 0
            fi
            return 1
            ;;
        "Run production ceremony test")
            [[ "${AY_ITERATIVE_MODE:-0}" -eq 1 ]] && return 3  # Skip permanently in iterative mode
            echo "Testing production ceremony..."
            cd "$PROJECT_ROOT"
            if timeout 30 ./scripts/ay-prod.sh --check orchestrator standup &>/tmp/ay-prod-check.log; then
                return 0
            fi
            return 1
            ;;
        *)
            return 2  # Skip
            ;;
    esac
}

mode_monitor() {
    local action=$1

    case "$action" in
        "Clean temporary episode files")
            echo "Cleaning up /tmp/episode_run_*.json and episode_unknown.json..."
            cd "$PROJECT_ROOT"
            local before_run=$(ls -1 /tmp/episode_run_*.json 2>/dev/null | wc -l | tr -d ' ')
            local before_unknown=0
            [[ -f /tmp/episode_unknown.json ]] && before_unknown=1
            local before=$((before_run + before_unknown))
            rm -f /tmp/episode_run_*.json /tmp/episode_unknown.json 2>/dev/null || true
            if (( before > 0 )); then
                echo "Cleaned $before transient file(s)"
            else
                echo "Nothing to clean (no episode_run_* or episode_unknown)"
            fi
            return 0  # Success: removed files, or none existed (nothing to clean)
            ;;
        "Verify dynamic thresholds")
            echo "Checking dynamic threshold script..."
            cd "$PROJECT_ROOT"
            if [[ -x scripts/ay-dynamic-thresholds.sh ]]; then
                return 0
            fi
            return 1
            ;;
        *)
            return 2  # Skip
            ;;
    esac
}

mode_reviewer() {
    local action=$1

    case "$action" in
        "Validate ROAM score reduction")
            echo "Calculating ROAM improvement..."
            # Check if documentation exists with score data
            if grep -q "8.5/10 → 2.5/10" docs/WSJF-MIGRATION-COMPLETE.md 2>/dev/null; then
                return 0
            fi
            return 1
            ;;
        *)
            return 2  # Skip
            ;;
    esac
}

# Execute action with current mode
execute_action() {
    local mode=$1
    local action_idx=$2
    local action="${PRIMARY_ACTIONS[$action_idx]}"

    local result=2  # Default: skip

    case "$mode" in
        "validator")
            mode_validator "$action"
            result=$?
            ;;
        "tester")
            mode_tester "$action"
            result=$?
            ;;
        "monitor")
            mode_monitor "$action"
            result=$?
            ;;
        "reviewer")
            mode_reviewer "$action"
            result=$?
            ;;
    esac

    return $result
}

# Main UI loop
run_cycle() {
    local mode_idx=0
    local all_done=false

    while [[ "$all_done" == "false" ]]; do
        ((++CYCLE_COUNT))
        local current_mode="${AGENT_MODES[$mode_idx]}"

        clear_screen
        draw_header "$current_mode" "$CYCLE_COUNT"

        # Reset completion counter for UI
        COMPLETED_ACTIONS=0
        for status in "${ACTION_STATUS[@]}"; do
            [[ "$status" == "done" ]] && ((COMPLETED_ACTIONS++)) || true
        done

        draw_progress_bar "$COMPLETED_ACTIONS" "$TOTAL_ACTIONS"
        echo ""
        draw_action_list PRIMARY_ACTIONS ACTION_STATUS
        show_elapsed_time
        echo ""

        # Execute actions for current mode
        local actions_processed=0
        for i in "${!PRIMARY_ACTIONS[@]}"; do
            if [[ "${ACTION_STATUS[$i]}" == "pending" ]]; then
                ACTION_STATUS[$i]="running"

                # Update UI
                clear_screen
                draw_header "$current_mode" "$CYCLE_COUNT"
                COMPLETED_ACTIONS=0
                for status in "${ACTION_STATUS[@]}"; do
                    [[ "$status" == "done" ]] && ((COMPLETED_ACTIONS++)) || true
                done
                draw_progress_bar "$COMPLETED_ACTIONS" "$TOTAL_ACTIONS"
                echo ""
                draw_action_list PRIMARY_ACTIONS ACTION_STATUS
                show_elapsed_time
                echo ""
                echo -e "${CYAN}▶ Processing: ${PRIMARY_ACTIONS[$i]}${NC}"

                # Execute (0=done, 2=skip this mode retry, 3=skip permanently e.g. iterative)
                set +e
                execute_action "$current_mode" "$i"
                local ret=$?
                set -e
                if [[ $ret -eq 0 ]]; then
                    ACTION_STATUS[$i]="done"
                    echo -e "${GREEN}✅ Success${NC}"
                    ((++actions_processed))
                    sleep 0.5
                elif [[ $ret -eq 2 ]]; then
                    ACTION_STATUS[$i]="pending"  # Skip, try again next mode
                    echo -e "${BLUE}⏭️  Skipped (not for this mode)${NC}"
                    sleep 0.3
                elif [[ $ret -eq 3 ]]; then
                    ACTION_STATUS[$i]="skip"  # Skip permanently (iterative mode)
                    echo -e "${BLUE}⏭️  Skipped (iterative)${NC}"
                    sleep 0.2
                else
                    ACTION_STATUS[$i]="failed"
                    echo -e "${RED}❌ Failed${NC}"
                    sleep 0.5
                fi
            fi
        done

        # Check if all done
        local pending_count=0
        for status in "${ACTION_STATUS[@]}"; do
            [[ "$status" == "pending" ]] && ((pending_count++)) || true
        done

        if [[ $pending_count -eq 0 ]]; then
            all_done=true
        else
            # Cycle to next mode
            mode_idx=$(( (mode_idx + 1) % ${#AGENT_MODES[@]} ))
            sleep 1
        fi

        show_disk_snapshot_after_cycle "$CYCLE_COUNT"

        # Safety: max 20 cycles
        if [[ $CYCLE_COUNT -ge 20 ]]; then
            echo -e "${YELLOW}⚠️  Max cycles reached (20)${NC}"
            # Normalize unresolved statuses so report output is truthful.
            for i in "${!ACTION_STATUS[@]}"; do
                if [[ "${ACTION_STATUS[$i]}" == "pending" || "${ACTION_STATUS[$i]}" == "running" ]]; then
                    ACTION_STATUS[$i]="skip"
                fi
            done
            all_done=true
        fi
    done
}

# Convert unresolved runtime states to report-safe status buckets.
normalize_action_statuses() {
    for i in "${!ACTION_STATUS[@]}"; do
        if [[ "${ACTION_STATUS[$i]}" == "pending" || "${ACTION_STATUS[$i]}" == "running" ]]; then
            ACTION_STATUS[$i]="skip"
        fi
    done
}

# Generate final report
generate_report() {
    clear_screen
    normalize_action_statuses

    echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║${NC}              ${BOLD}AGENTIC YIELD - FINAL REPORT${NC}                  ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Calculate stats
    local done_count=0
    local failed_count=0
    local skipped_count=0

    for status in "${ACTION_STATUS[@]}"; do
        case "$status" in
            "done") ((++done_count)) ;;
            "failed") ((++failed_count)) ;;
            "pending"|"skip") ((++skipped_count)) ;;
        esac
    done

    local success_rate=$((done_count * 100 / TOTAL_ACTIONS))

    echo -e "${BOLD}Summary:${NC}"
    echo -e "  Total Actions:    ${TOTAL_ACTIONS}"
    echo -e "  ${GREEN}✅ Completed:      ${done_count}${NC}"
    echo -e "  ${RED}❌ Failed:         ${failed_count}${NC}"
    echo -e "  ${YELLOW}⏭️  Skipped:        ${skipped_count}${NC}"
    echo -e "  ${BLUE}🔄 Total Cycles:   ${CYCLE_COUNT}${NC}"
    echo ""

    # Progress bar
    echo -e "${BOLD}Success Rate:${NC}"
    draw_progress_bar "$done_count" "$TOTAL_ACTIONS"
    echo ""

    # Time stats
    local elapsed=$(($(date +%s) - START_TIME))
    local mins=$((elapsed / 60))
    local secs=$((elapsed % 60))
    echo -e "${BOLD}Performance:${NC}"
    echo -e "  Total Time:       ${mins}m ${secs}s"
    echo -e "  Avg per Action:   $((elapsed / TOTAL_ACTIONS))s"
    echo ""

    # Go/No-Go decision
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    if [[ $success_rate -ge 80 ]]; then
        echo -e "${BOLD}${GREEN}✅ GO: Ready for production deployment${NC}"
        echo -e "${GREEN}   Success rate: ${success_rate}% (target: ≥80%)${NC}"
        echo ""
        echo -e "${BOLD}Next Steps:${NC}"
        echo -e "  1. Review migration patches: backups/*/migration.patch"
        echo -e "  2. Deploy to staging (10% traffic)"
        echo -e "  3. Monitor: ./scripts/monitor-threshold-performance.sh"
        echo -e "  4. Gradual rollout: 10% → 50% → 100%"
    elif [[ $success_rate -ge 50 ]]; then
        echo -e "${BOLD}${YELLOW}⚠️  CONDITIONAL GO: Proceed with caution${NC}"
        echo -e "${YELLOW}   Success rate: ${success_rate}% (target: ≥80%)${NC}"
        echo ""
        echo -e "${BOLD}Action Required:${NC}"
        echo -e "  1. Review failed actions above"
        echo -e "  2. Fix issues and re-run: ./scripts/ay.sh"
        echo -e "  3. Deploy only after reaching 80%+ success"
    else
        echo -e "${BOLD}${RED}❌ NO-GO: Critical issues found${NC}"
        echo -e "${RED}   Success rate: ${success_rate}% (target: ≥80%)${NC}"
        echo ""
        echo -e "${BOLD}Action Required:${NC}"
        echo -e "  1. Review logs: /tmp/ay-*.log"
        echo -e "  2. Fix failed actions"
        echo -e "  3. Re-run: ./scripts/ay.sh"
        echo -e "  4. Do NOT deploy until issues resolved"
    fi
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    # Detailed action status
    echo -e "${BOLD}Detailed Results:${NC}"
    for i in "${!PRIMARY_ACTIONS[@]}"; do
        local status="${ACTION_STATUS[$i]}"
        local icon="⏳"
        local color="${YELLOW}"

        case "$status" in
            "done")
                icon="✅"
                color="${GREEN}"
                ;;
            "running")
                icon="🔄"
                color="${CYAN}"
                ;;
            "failed")
                icon="❌"
                color="${RED}"
                ;;
            *)
                icon="⏭️"
                color="${BLUE}"
                ;;
        esac

        echo -e "  ${color}${icon} ${PRIMARY_ACTIONS[$i]}${NC}"
    done
    echo ""

    # Save report
    local report_file="reports/ay-report-$(date +%Y%m%d-%H%M%S).txt"
    mkdir -p reports
    {
        echo "AGENTIC YIELD (ay) - Report"
        echo "Generated: $(date)"
        echo ""
        echo "Total Actions: $TOTAL_ACTIONS"
        echo "Completed: $done_count"
        echo "Failed: $failed_count"
        echo "Skipped: $skipped_count"
        echo "Cycles: $CYCLE_COUNT"
        echo "Success Rate: ${success_rate}%"
        echo "Elapsed Time: ${mins}m ${secs}s"
        echo ""
        echo "Go/No-Go: $([ $success_rate -ge 80 ] && echo 'GO' || echo 'NO-GO')"
    } > "$report_file"

    # --- AISP JSON Envelope Output ---
    local go_decision="NO-GO"
    local exit_zone="client"
    if [[ $success_rate -ge 80 ]]; then
        go_decision="GO"
        exit_zone="success"
    elif [[ $success_rate -ge 50 ]]; then
        go_decision="CONDITIONAL-GO"
        exit_zone="success"
    fi

    local elapsed_safe=$elapsed
    [[ $elapsed_safe -lt 1 ]] && elapsed_safe=1
    local pass_velocity
    pass_velocity=$(awk "BEGIN { printf \"%.2f\", ($done_count * 60) / $elapsed_safe }")
    local resolved_count=$((done_count + failed_count + skipped_count))
    local resolved_velocity
    resolved_velocity=$(awk "BEGIN { printf \"%.2f\", ($resolved_count * 60) / $elapsed_safe }")

    local run_exit_code
    run_exit_code=$([ $success_rate -ge 80 ] && echo 0 || ([ $success_rate -ge 50 ] && echo 1 || echo 2))
    increment_rolling_failure_counter "$run_exit_code"
    local rolling_rate_pct="0.00"
    local failures_per_run="0.00"
    if [[ $ROLLING_RUNS -gt 0 ]]; then
        rolling_rate_pct=$(awk "BEGIN { printf \"%.2f\", ($ROLLING_FAIL_TOTAL * 100) / $ROLLING_RUNS }")
        failures_per_run=$(awk "BEGIN { printf \"%.2f\", $ROLLING_FAIL_TOTAL / $ROLLING_RUNS }")
    fi

    local ceremonies_json
    ceremonies_json=$(build_ceremony_contract_json "$done_count" "$TOTAL_ACTIONS" "$pass_velocity" "$resolved_velocity" "$run_exit_code")

    local aisp_json
    aisp_json=$(cat <<AISP_EOF
{
  "aisp_header": {
    "version": "1.0",
    "timestamp_utc": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "t_stage": "${AISP_T_STAGE:-T0}",
    "domain": ["$(echo "${AISP_DOMAINS:-legal}" | sed 's/,/","/g')"],
    "case_ids": ["$(echo "${LEGAL_CASE_IDS:-}" | sed 's/,/","/g')"],
    "lane": "${AISP_LANE:-governance}",
    "mode": "${AISP_MODE_DEFAULT:-SA}",
    "env": "${AISP_ENV:-dev}",
    "%/#": { "checks_passed": $done_count, "checks_total": $TOTAL_ACTIONS },
    "%.#": { "checks_passed_per_min": $pass_velocity, "actions_resolved_per_min": $resolved_velocity },
    "env_%/#": { "config_checks_passed": ${AISP_CHECKS_PASSED:-0}, "config_checks_total": ${AISP_CHECKS_TOTAL:-5} },
    "rolling_failure_counter": { "10": ${ROLLING_FAIL_10}, "12": ${ROLLING_FAIL_12}, "21": ${ROLLING_FAIL_21}, "160": ${ROLLING_FAIL_160} },
    "rolling_failure_total": ${ROLLING_FAIL_TOTAL},
    "rolling_runs": ${ROLLING_RUNS},
    "trend_velocity": { "rolling_failure_rate_pct": ${rolling_rate_pct}, "failures_per_run": ${failures_per_run} },
    "exit_code": ${run_exit_code},
    "exit_zone": "$exit_zone"
  },
  "intro": {
    "build": "Agentic Yield health check: $CYCLE_COUNT cycles across ${#AGENT_MODES[@]} modes",
    "measure": "$done_count/$TOTAL_ACTIONS actions passed (${success_rate}%), ${failed_count} failed, ${skipped_count} skipped",
    "learn": "$go_decision — $([ $success_rate -ge 80 ] && echo 'system healthy, ready for Build-Measure-Learn' || echo 'fix failures before heavy BML runs')"
  },
  "body": {
    "circles": [
      {
        "name": "governance",
        "role": "AgenticYield",
        "status": "$([ $success_rate -ge 80 ] && echo "ready" || ([ $success_rate -ge 50 ] && echo "degraded" || echo "blocked"))",
        "%/#": { "checks_passed": $done_count, "checks_total": $TOTAL_ACTIONS },
        "blockers": [
          $([ $failed_count -gt 0 ] && printf '{ "id": "B-AY-FAILURES", "desc": "%s failed actions", "exit_code": %s }' "$failed_count" "$run_exit_code" || echo "")
        ],
        "dependencies": [
          { "on": "validation + monitor + tester modes", "status": "$([ $success_rate -ge 80 ] && echo "healthy" || echo "degraded")" }
        ]
      }
    ],
    "ceremonies": ${ceremonies_json}
  },
  "menu": [
    {
      "id": "run_ay_check",
      "label": "Run ay check",
      "mode": "SA",
      "api": { "cli": "./scripts/ay.sh --check" },
      "guards": { "required_exit_codes": [0] }
    },
    {
      "id": "run_ay_cycle",
      "label": "Run ay cycle",
      "mode": "${AISP_MODE_DEFAULT:-SA}",
      "api": { "cli": "./scripts/ay.sh" },
      "guards": { "required_exit_codes": [0,1] }
    }
  ],
  "manifest": {
    "id": "AISP-AY-$(date -u +"%Y-%m-%dT%H-%M-%SZ")",
    "workspace": "agentic-flow",
    "source_script": "scripts/ay.sh",
    "report_file": "$report_file",
    "elapsed_seconds": $elapsed,
    "principles": [
      "Discover/Consolidate THEN extend",
      "Zero placeholders in legal artifacts",
      "Robust exit codes > binary success",
      "Semi-Auto before Full-Auto in T0/T1"
    ]
  }
}
AISP_EOF
)

    # Write AISP status JSON
    mkdir -p "$(dirname "$AISP_STATUS_FILE")"
    echo "$aisp_json" > "$AISP_STATUS_FILE"

    # Rolling failure counter: append exit codes to trend log for %.# velocity tracking
    local _trend_log="${HOME}/Library/Logs/ay-validation-trend.log"
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") exit=${run_exit_code} zone=${exit_zone} pass=${done_count}/${TOTAL_ACTIONS} rate=${success_rate}% lane=${AISP_LANE:-governance} mode=${AISP_MODE_DEFAULT:-SA}" >> "$_trend_log" 2>/dev/null

    # Ceremony metrics: write aggregated %/#, %.#, exit_code, ROAM for pi-sync aggregation
    mkdir -p "$PROJECT_ROOT/reports"
    if command -v jq &>/dev/null; then
      echo "$ceremonies_json" | jq --argjson r10 "$ROLLING_FAIL_10" --argjson r12 "$ROLLING_FAIL_12" --argjson r21 "$ROLLING_FAIL_21" --argjson r160 "$ROLLING_FAIL_160" --argjson ex "$run_exit_code" '. + {"rolling_failure_counter": {"10": $r10, "12": $r12, "21": $r21, "160": $r160}, "exit_code": $ex}' > "$PROJECT_ROOT/reports/ceremony-metrics.json" 2>/dev/null || echo "$ceremonies_json" > "$PROJECT_ROOT/reports/ceremony-metrics.json"
    else
      echo "$ceremonies_json" > "$PROJECT_ROOT/reports/ceremony-metrics.json"
    fi
    # Append trend sample for %.# velocity (exit 10/12/21/160 counts)
    echo "{\"ts\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"exit_code\":$run_exit_code,\"exit_10\":$ROLLING_FAIL_10,\"exit_12\":$ROLLING_FAIL_12,\"exit_21\":$ROLLING_FAIL_21,\"exit_160\":$ROLLING_FAIL_160,\"pass\":$done_count,\"total\":$TOTAL_ACTIONS}" >> "$PROJECT_ROOT/reports/ceremony-metrics.jsonl" 2>/dev/null || true

    echo -e "${BLUE}📄 Report saved: $report_file${NC}"
    echo -e "${BLUE}📊 AISP status: $AISP_STATUS_FILE${NC}"
    echo ""
}

# Main entry point
main() {
    cd "$PROJECT_ROOT"

    echo -e "${CYAN}Initializing Agentic Yield...${NC}"
    [[ "${AY_ITERATIVE_MODE:-0}" -eq 1 ]] && echo -e "${YELLOW}🔄 Iterative mode: skipping ceremony health/prod checks${NC}"
    sleep 1

    # Show rolling failure counter before main cycle
    show_rolling_failure_counter

    run_cycle
    generate_report

    # Exit code based on success rate
    normalize_action_statuses
    local done_count=0
    for status in "${ACTION_STATUS[@]}"; do
        [[ "$status" == "done" ]] && ((done_count++)) || true
    done

    local success_rate=$((done_count * 100 / TOTAL_ACTIONS))

    if [[ $success_rate -ge 80 ]]; then
        exit 0  # GO
    elif [[ $success_rate -ge 50 ]]; then
        exit 1  # CONDITIONAL GO
    else
        exit 2  # NO-GO
    fi
}

main "$@"
