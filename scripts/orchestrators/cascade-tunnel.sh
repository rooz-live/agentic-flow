#!/usr/bin/env bash
# =============================================================================
# Cascade Hybrid Tunnel Orchestrator (Phase 4 Discovery Logic)
#
# Purpose: Cascades through multiple tunnel providers (tailscale → ngrok →
#          cloudflare → localtunnel) to ensure dashboard is always accessible
#          via public URL. No file:// or localhost dependencies.
#
# Usage: ./cascade-tunnel.sh [port]
# =============================================================================
# Source exit codes and debug helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"
export BRF_REPORTS_DIR="${PROJECT_ROOT}/reports"

safe_source_optional() {
    local file_path="$1"
    local had_nounset=0
    [[ "$-" == *u* ]] && had_nounset=1
    set +u
    # shellcheck disable=SC1090
    source "$file_path" 2>/dev/null || true
    [[ "$had_nounset" -eq 1 ]] && set -u
}

safe_source_optional "$PROJECT_ROOT/scripts/validation-core.sh"
safe_source_optional "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh"
safe_source_optional "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/debug-exit-codes.sh"
safe_source_optional "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/bounded-reasoning-framework.sh"
safe_source_optional "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/eta-live-stream.sh"
safe_source_optional "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/run-bounded-eta.sh"

# ===========================================================================
# AISP Configuration: Source env, then guard (tunnels lane)
# ===========================================================================
source "$PROJECT_ROOT/scripts/cpanel-env-setup.sh" 2>/dev/null || true
EXIT_CODES_REGISTRY="${EXIT_CODES_REGISTRY:-$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh}"
# shellcheck disable=SC1090
source "$EXIT_CODES_REGISTRY" 2>/dev/null || true
# Backward-compatible fallbacks if robust registry cannot be sourced
: "${EXIT_INVALID_ARGS:=10}"
: "${EXIT_INVALID_FORMAT:=12}"
: "${EXIT_MISSING_REQUIRED_FIELD:=21}"
: "${EXIT_WSJF_SCORE_LOW:=160}"

export AISP_LANE="tunnels"
CEREMONY_METRICS_FILE="$PROJECT_ROOT/.goalie/ceremony_metrics.jsonl"
ROAM_TRACKER_FILE="${ROAM_TRACKER_PATH:-$PROJECT_ROOT/ROAM_TRACKER.yaml}"

# Source shared guard-failure envelope (unified behavior across ay, advocate, cascade-tunnel)
# shellcheck source=guard-failure-envelope.sh
source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/guard-failure-envelope.sh" 2>/dev/null || true

# --- AISP Config Guard Block ---
AISP_CHECKS_PASSED=0
AISP_CHECKS_TOTAL=5

# 1) Required roots
if [[ -z "${AISP_WORKSPACE_ROOT:-}" || -z "${LEGAL_ROOT:-}" ]]; then
    echo "❌ [cascade-tunnel] AISP config missing ROOTS"
    TUNNEL_STATUS="${AISP_STATUS_PATH:-$PROJECT_ROOT/reports/aisp-status.json}"
    TUNNEL_STATUS="${TUNNEL_STATUS%aisp-status.json}aisp-tunnel-status.json"
    emit_guard_failure_status "$TUNNEL_STATUS" "tunnels" "${EXIT_INVALID_ARGS}" "Missing required roots (AISP_WORKSPACE_ROOT / LEGAL_ROOT)" "scripts/orchestrators/cascade-tunnel.sh"
    exit "${EXIT_INVALID_ARGS}"
fi
((AISP_CHECKS_PASSED++)) || true

# 2) Multi-root sanity — LEGAL_ROOT must exist (serves dashboards)
if [[ ! -d "${LEGAL_ROOT}" ]]; then
    echo "❌ [cascade-tunnel] LEGAL_ROOT does not exist: ${LEGAL_ROOT}"
    TUNNEL_STATUS="${AISP_STATUS_PATH:-$PROJECT_ROOT/reports/aisp-status.json}"
    TUNNEL_STATUS="${TUNNEL_STATUS%aisp-status.json}aisp-tunnel-status.json"
    emit_guard_failure_status "$TUNNEL_STATUS" "tunnels" "${EXIT_INVALID_ARGS}" "Configured LEGAL_ROOT does not exist" "scripts/orchestrators/cascade-tunnel.sh"
    exit "${EXIT_INVALID_ARGS}"
fi
((AISP_CHECKS_PASSED++)) || true

# 2b) PWD under roots — error or auto-cd once with loud message (no silent run)
case "$PWD" in
    "$AISP_WORKSPACE_ROOT"/*|"$AISP_WORKSPACE_ROOT"|"$LEGAL_ROOT"/*|"$LEGAL_ROOT") ;;
    *)
        echo "⚠️  [cascade-tunnel] PWD ($PWD) not under AISP_WORKSPACE_ROOT or LEGAL_ROOT — cd'ing to AISP_WORKSPACE_ROOT once"
        if ! cd "$AISP_WORKSPACE_ROOT"; then
            TUNNEL_STATUS="${AISP_STATUS_PATH:-$PROJECT_ROOT/reports/aisp-status.json}"
            TUNNEL_STATUS="${TUNNEL_STATUS%aisp-status.json}aisp-tunnel-status.json"
            emit_guard_failure_status "$TUNNEL_STATUS" "tunnels" "${EXIT_INVALID_FORMAT}" "Invalid root / cd failure while enforcing workspace root" "scripts/orchestrators/cascade-tunnel.sh"
            exit "${EXIT_INVALID_FORMAT}"
        fi
        ;;
esac
((AISP_CHECKS_PASSED++)) || true

# 3) Cases present
if [[ -z "${LEGAL_CASE_IDS:-}" ]]; then
    echo "❌ [cascade-tunnel] LEGAL_CASE_IDS missing"
    TUNNEL_STATUS="${AISP_STATUS_PATH:-$PROJECT_ROOT/reports/aisp-status.json}"
    TUNNEL_STATUS="${TUNNEL_STATUS%aisp-status.json}aisp-tunnel-status.json"
    emit_guard_failure_status "$TUNNEL_STATUS" "tunnels" "${EXIT_MISSING_REQUIRED_FIELD}" "Missing required LEGAL_CASE_IDS" "scripts/orchestrators/cascade-tunnel.sh"
    exit "${EXIT_MISSING_REQUIRED_FIELD}"
fi
((AISP_CHECKS_PASSED++)) || true

# Robust default-branch detection that works when origin/HEAD is unavailable.
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

# 4) Prod branch gate
if [[ "${AISP_ENV:-dev}" == "prod" ]]; then
    DEFAULT_BRANCH=$(resolve_default_branch "$AISP_WORKSPACE_ROOT")
    CUR_BRANCH=$(git -C "$AISP_WORKSPACE_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "UNKNOWN")
    if [[ "$CUR_BRANCH" != "$DEFAULT_BRANCH" ]]; then
        echo "❌ [cascade-tunnel] Not on default branch ($CUR_BRANCH != $DEFAULT_BRANCH) — AISP_ENV=prod requires it"
        TUNNEL_STATUS="${AISP_STATUS_PATH:-$PROJECT_ROOT/reports/aisp-status.json}"
        TUNNEL_STATUS="${TUNNEL_STATUS%aisp-status.json}aisp-tunnel-status.json"
        emit_guard_failure_status "$TUNNEL_STATUS" "tunnels" "${EXIT_WSJF_SCORE_LOW}" "Prod branch gate failed ($CUR_BRANCH != $DEFAULT_BRANCH)" "scripts/orchestrators/cascade-tunnel.sh"
        exit "${EXIT_WSJF_SCORE_LOW}"
    fi
fi
((AISP_CHECKS_PASSED++)) || true

# FA T0 gate
if [[ "${AISP_MODE_DEFAULT:-SA}" == "FA" && "${AISP_T_STAGE:-T0}" == "T0" ]]; then
    echo "⚠️  [cascade-tunnel] Full-Auto requested but T0 — downgrading to SA"
    export AISP_MODE_DEFAULT="SA"
fi

echo "✅ [cascade-tunnel] AISP config: ${AISP_CHECKS_PASSED}/${AISP_CHECKS_TOTAL} checks | env=${AISP_ENV:-dev} stage=${AISP_T_STAGE:-T0} lane=${AISP_LANE} mode=${AISP_MODE_DEFAULT:-SA}"

# --- AISP JSON Envelope (written on exit) ---
TUNNEL_PROVIDER="none"
TUNNEL_URL=""
TUNNEL_EXIT_CODE=0

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

write_aisp_envelope() {
    TUNNEL_EXIT_CODE=${1:-$?}
    local rolling_10=0 rolling_12=0 rolling_21=0 rolling_160=0
    local rolling_total=0 rolling_runs=0
    local rolling_rate_pct="0.00" failures_per_run="0.00"
    local exit_zone="success"
    if [[ $TUNNEL_EXIT_CODE -ge 200 ]]; then exit_zone="infra"
    elif [[ $TUNNEL_EXIT_CODE -ge 150 ]]; then exit_zone="business"
    elif [[ $TUNNEL_EXIT_CODE -ge 100 ]]; then exit_zone="validation"
    elif [[ $TUNNEL_EXIT_CODE -ge 10 ]]; then exit_zone="client"
    fi

    local status_file="${AISP_STATUS_PATH:-reports/aisp-status.json}"
    local gov_status="${AISP_STATUS_PATH:-reports/aisp-status.json}"
    status_file="${status_file%aisp-status.json}aisp-tunnel-status.json"
    mkdir -p "$(dirname "$status_file")"
    if [[ -f "$gov_status" ]]; then
        local rolling_csv
        rolling_csv=$(python3 - "$gov_status" <<'PY'
import json, sys
p = sys.argv[1]
try:
    obj = json.load(open(p, "r", encoding="utf-8"))
except Exception:
    obj = {}
h = obj.get("aisp_header", {}) if isinstance(obj, dict) else {}
c = h.get("rolling_failure_counter", {}) if isinstance(h, dict) else {}
def i(v):
    try:
        return int(v)
    except Exception:
        return 0
r10 = i(c.get("10", 0)); r12 = i(c.get("12", 0)); r21 = i(c.get("21", 0)); r160 = i(c.get("160", 0))
total = i(h.get("rolling_failure_total", r10 + r12 + r21 + r160))
runs = i(h.get("rolling_runs", 0))
print(f"{r10},{r12},{r21},{r160},{total},{runs}")
PY
)
        if [[ -n "$rolling_csv" ]]; then
            IFS=',' read -r rolling_10 rolling_12 rolling_21 rolling_160 rolling_total rolling_runs <<< "$rolling_csv"
        fi
    fi
    if [[ "${rolling_runs:-0}" -gt 0 ]]; then
        rolling_rate_pct=$(awk "BEGIN { printf \"%.2f\", (${rolling_total} * 100) / ${rolling_runs} }")
        failures_per_run=$(awk "BEGIN { printf \"%.2f\", ${rolling_total} / ${rolling_runs} }")
    fi
    local checks_passed=0
    [[ ${TUNNEL_EXIT_CODE} -eq 0 ]] && checks_passed=1
    local ceremonies_json
    ceremonies_json=$(build_ceremony_contract_json "$checks_passed" 1 0 0 "${TUNNEL_EXIT_CODE}")

    cat > "$status_file" <<AISP_EOF
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
    "%/#": { "checks_passed": ${checks_passed}, "checks_total": 1 },
    "env_%/#": { "config_checks_passed": ${AISP_CHECKS_PASSED}, "config_checks_total": ${AISP_CHECKS_TOTAL} },
    "%.#": { "checks_passed_per_min": 0.00, "actions_resolved_per_min": 0.00 },
    "exit_code": ${TUNNEL_EXIT_CODE},
    "exit_zone": "${exit_zone}",
    "rolling_failure_counter": { "10": ${rolling_10}, "12": ${rolling_12}, "21": ${rolling_21}, "160": ${rolling_160} },
    "rolling_failure_total": ${rolling_total},
    "rolling_runs": ${rolling_runs},
    "trend_velocity": { "rolling_failure_rate_pct": ${rolling_rate_pct}, "failures_per_run": ${failures_per_run} }
  },
  "intro": {
    "build": "Cascade tunnel orchestrator: provider=${TUNNEL_PROVIDER}",
    "measure": "exit_code=${TUNNEL_EXIT_CODE} url=${TUNNEL_URL:-none}",
    "learn": "$([ $TUNNEL_EXIT_CODE -eq 0 ] && echo 'Tunnel healthy' || echo 'Tunnel degraded — check provider cascade')"
  },
  "body": {
    "circles": [
      {
        "name": "tunnels",
        "role": "CascadeTunnelOrchestrator",
        "status": "$([ $TUNNEL_EXIT_CODE -eq 0 ] && echo "ready" || echo "blocked")",
        "%/#": { "checks_passed": ${checks_passed}, "checks_total": 1 },
        "blockers": [
          $([ $TUNNEL_EXIT_CODE -ne 0 ] && printf '{ "id": "B-TUNNEL-EXIT", "desc": "Tunnel lane exit code %s", "exit_code": %s }' "$TUNNEL_EXIT_CODE" "$TUNNEL_EXIT_CODE" || echo "")
        ],
        "dependencies": [
          { "on": "tailscale|ngrok|cloudflare|localtunnel", "status": "$([ $TUNNEL_EXIT_CODE -eq 0 ] && echo "healthy" || echo "degraded")" }
        ]
      }
    ],
    "ceremonies": ${ceremonies_json}
  },
  "menu": [
    {
      "id": "start_tunnel",
      "label": "Start tunnel cascade",
      "mode": "${AISP_MODE_DEFAULT:-SA}",
      "api": { "cli": "./scripts/orchestrators/cascade-tunnel.sh start" },
      "guards": { "required_exit_codes": [0] }
    }
  ],
  "manifest": {
    "id": "AISP-TUNNEL-$(date -u +"%Y-%m-%dT%H-%M-%SZ")",
    "workspace": "agentic-flow",
    "source_script": "scripts/orchestrators/cascade-tunnel.sh",
    "tunnel_provider": "${TUNNEL_PROVIDER}",
    "tunnel_url": "${TUNNEL_URL:-}",
    "principles": ["Discover/Consolidate THEN extend", "Semi-Auto before Full-Auto in T0/T1"],
    "exit_code_domain_mapping": {
      "110": {"domain": "law", "ledger": "ROOT", "code": 150},
      "111": {"domain": "pur", "ledger": "GATEWAY", "code": 151},
      "112": {"domain": "hab", "ledger": "EVIDENCE", "code": 152},
      "116": {"domain": "file", "ledger": "PROCESS", "code": 153}
    }
  }
}
AISP_EOF
    echo "📋 [cascade-tunnel] AISP envelope → $status_file" >&2
}
# (trap registered in cleanup() below — see line ~235)

# Pre-flight checks with ROBUST error handling
check_prerequisites() {
    local errors=0

    # Check required commands
    local required=("jq" "python3" "curl" "lsof")
    for cmd in "${required[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            error "❌ Missing dependency: $cmd"
            errors=$((errors + 1))
        fi
    done

    if [[ $errors -gt 0 ]]; then
        error "Install missing dependencies and retry"
        exit ${EX_TOOL_MISSING:-60}
    fi

    # Check port availability
    if lsof -ti:"$PORT" >/dev/null 2>&1; then
        warn "⚠️ Port $PORT is in use, attempting cleanup..."
        lsof -ti:"$PORT" | xargs kill -TERM 2>/dev/null || true
        sleep 2

        if lsof -ti:"$PORT" >/dev/null 2>&1; then
            error "❌ Port $PORT still in use after cleanup"
            exit ${EX_TUNNEL_PORT_IN_USE:-110}
        fi
    fi

    # Check directories
    if [[ ! -d "$DASHBOARD_DIR" ]]; then
        error "❌ Dashboard directory not found: $DASHBOARD_DIR"
        exit ${EX_NOFILE:-11}
    fi

    success "✅ Prerequisites check passed"
    return 0
}
log_tdd() {
    local type="$1"
    local message="$2"
    local exit_code="${3:-}"

    local entry="{
        \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
        \"type\": \"$type\",
        \"message\": \"$message\",
        \"details\": {\"script\": \"cascade-tunnel.sh\""

    if [[ -n "$exit_code" ]]; then
        entry+=", \"exitCode\": $exit_code"
    fi

    entry+="}}"

    echo "$entry" >> /tmp/tdd-history.jsonl
}

PORT="${1:-8080}"
DASHBOARD_DIR="$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
SCRIPT_NAME="$(basename "$0")"
PID_FILE="/tmp/cascade-tunnel.pid"
LOG_FILE="/tmp/cascade-tunnel.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"
}

# Cleanup function
cleanup() {
    log "🛑 Shutting down cascade tunnel..."

    # Kill HTTP server
    if [[ -n "${HTTP_PID:-}" ]]; then
        kill "$HTTP_PID" 2>/dev/null || true
        log "   HTTP server (PID: $HTTP_PID) stopped"
    fi

    # Kill active tunnel
    if [[ -n "${ACTIVE_TUNNEL_PID:-}" ]]; then
        kill "$ACTIVE_TUNNEL_PID" 2>/dev/null || true
        log "   Tunnel (PID: $ACTIVE_TUNNEL_PID) stopped"
    fi

    # Remove PID file
    rm -f "$PID_FILE"

    write_aisp_envelope "${1:-$?}"
    log "✅ Cleanup complete"
}

trap 'cleanup $?' EXIT INT TERM

# Check if already running
if [[ -f "$PID_FILE" ]]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || echo "")
    if [[ -n "$OLD_PID" ]] && ps -p "$OLD_PID" > /dev/null 2>&1; then
        error "Cascade tunnel already running (PID: $OLD_PID)"
        error "Run: kill $OLD_PID && rm $PID_FILE"
        exit ${EX_TUNNEL_PORT_IN_USE:-110}
    fi
fi

# Write PID file
echo $$ > "$PID_FILE"

# =============================================================================
# Simple restart function
restart_tunnel() {
    # Kill current tunnel
    if [[ -n "$ACTIVE_TUNNEL_PID" ]]; then
        kill -TERM $ACTIVE_TUNNEL_PID 2>/dev/null || true
        wait $ACTIVE_TUNNEL_PID 2>/dev/null || true
        sleep 2
    fi

    # Try to restart same provider
    case "$ACTIVE_PROVIDER" in
        tailscale)
            log_tdd "refactor" "Restarting Tailscale tunnel"
            try_tailscale
            ;;
        ngrok)
            log_tdd "refactor" "Restarting ngrok tunnel"
            try_ngrok
            ;;
        cloudflare)
            log_tdd "refactor" "Restarting Cloudflare tunnel"
            try_cloudflare
            ;;
        localtunnel)
            log_tdd "refactor" "Restarting localtunnel"
            try_localtunnel
            ;;
        *)
            error "Unknown provider: $ACTIVE_PROVIDER"
            return 1
            ;;
    esac

    # Update URL if successful
    if [[ $? -eq 0 ]]; then
        ACTIVE_URL=$(cat /tmp/active-tunnel-url.txt 2>/dev/null || echo "unknown")
        success "✅ Tunnel restarted: $ACTIVE_URL"
        log_tdd "green" "Tunnel restart successful: $ACTIVE_URL"
    else
        error "❌ Tunnel restart failed"
        log_tdd "red" "Tunnel restart failed" 1
    fi
}
# =============================================================================
cascade_to_next_provider() {
    local current_provider="$1"

    case "$current_provider" in
        tailscale)
            log "Cascading from Tailscale → ngrok"
            try_ngrok || try_cloudflare || try_localtunnel
            ;;
        ngrok)
            log "Cascading from ngrok → Cloudflare"
            try_cloudflare || try_localtunnel
            ;;
        cloudflare)
            log "Cascading from Cloudflare → localtunnel"
            try_localtunnel
            ;;
        localtunnel)
            error "All providers failed"
            return 1
            ;;
        *)
            error "Unknown provider: $current_provider"
            return 1
            ;;
    esac

    return $?
}
# =============================================================================
start_http_server() {
    log "Starting HTTP server on port $PORT..."

    # Clean up any existing processes on port
    if lsof -ti:$PORT >/dev/null 2>&1; then
        warn "Port $PORT is in use, cleaning up..."
        lsof -ti:$PORT | xargs kill -TERM 2>/dev/null || true
        sleep 2

        # Force kill if still running
        if lsof -ti:$PORT >/dev/null 2>&1; then
            warn "Force killing processes on port $PORT..."
            lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    fi

    # Verify port is free
    if lsof -ti:$PORT >/dev/null 2>&1; then
        error "❌ Port $PORT still bound after cleanup"
        return ${EX_TUNNEL_PORT_IN_USE:-110}
    fi

    # CSQBM Governance Constraint: ADR-005 payload bounds for the served dashboard
    local index_file="$DASHBOARD_DIR/00-DASHBOARD/WSJF-LIVE-V5-MODULAR.html"
    if [[ -f "$index_file" ]]; then
        local file_size_bytes=$(wc -c < "$index_file" | tr -d ' ')
        if [[ "$file_size_bytes" -gt 16000 ]]; then
            error "❌ 🚫 BLOCKER: Dashboard DOM footprint ($file_size_bytes bytes) exceeds GUI ceiling."
            error "   Constraint (ADR-005): Payloads must fit within the 4000 DBOS Pydantic token ceiling."
            return ${EX_VALIDATION_FAILED:-150}
        fi
    fi

    # Start HTTP server with proper options
    cd "$DASHBOARD_DIR"
    python3 -m http.server $PORT --bind 127.0.0.1 > /tmp/http-server.log 2>&1 &
    HTTP_PID=$!

    # Save PID for cleanup
    echo $HTTP_PID > /tmp/http-server.pid

    # Wait for server to start
    sleep 2

    # Verify server is running
    if ! kill -0 $HTTP_PID 2>/dev/null; then
        error "❌ HTTP server failed to start"
        cat /tmp/http-server.log 2>/dev/null || true
        return ${EX_TUNNEL_HTTP_FAILED:-111}
    fi

    # Health check with retry and exponential backoff (python3 http.server may need extra startup time)
    local retries=5
    local backoff=1
    for i in $(seq 1 $retries); do
        if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/ | grep -q "200"; then
            success "✅ HTTP server running (PID: $HTTP_PID)"
            return 0
        fi
        [[ $i -lt $retries ]] && sleep $backoff
        backoff=$((backoff * 2))
        [[ $backoff -gt 8 ]] && backoff=8
    done

    error "❌ HTTP server not responding after $retries retries"
    cat /tmp/http-server.log 2>/dev/null || true
    return ${EX_TUNNEL_HTTP_FAILED:-111}
}

# =============================================================================
# STEP 2: Health Check
# =============================================================================
health_check() {
    local url="$1"
    local timeout="${2:-5}"

    curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null | grep -q "200"
}

# Returns HTTP status code (for 1033 / origin unreachable detection)
health_check_status() {
    local url="$1"
    local timeout="${2:-5}"
    curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000"
}

# Detect 1033 (origin unreachable) from cloudflared logs
detect_1033_from_logs() {
    [[ "$ACTIVE_PROVIDER" != "cloudflare" ]] && return 1
    [[ -f /tmp/cloudflare-tunnel.log ]] || return 1
    grep -qE "1033|origin unreachable|connection refused" /tmp/cloudflare-tunnel.log 2>/dev/null
}

# =============================================================================
# STEP 3: Try Tailscale (Tier 1 - Best)
# =============================================================================
# Save tunnel state to persistent JSON (T3: state registry visibility)
# Writes to /tmp and PROJECT_ROOT/reports for orchestrator visibility
save_tunnel_state() {
    local provider=$(cat /tmp/active-tunnel-provider.txt 2>/dev/null || echo "unknown")
    local url=$(cat /tmp/active-tunnel-url.txt 2>/dev/null || echo "unknown")
    local pid=${ACTIVE_TUNNEL_PID:-0}
    local ts
    ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u +%s)
    local state_json="{\"provider\": \"$provider\", \"url\": \"$url\", \"pid\": $pid, \"timestamp\": \"$ts\", \"health\": \"unknown\"}"
    echo "$state_json" > /tmp/tunnel-state.json
    # State registry visibility for orchestrators/dashboards
    local registry="${TUNNEL_STATE_REGISTRY:-$PROJECT_ROOT/reports/tunnel-state-registry.json}"
    if [[ -n "$PROJECT_ROOT" && -d "$(dirname "$registry")" ]]; then
        mkdir -p "$(dirname "$registry")"
        echo "$state_json" > "$registry"
    fi

    # CSQBM Governance Constraint: Local state access
}

try_tailscale() {
    log "🔗 Attempting Tailscale funnel..."

    if ! command -v tailscale &> /dev/null; then
        warn "Tailscale not installed"
        return 1
    fi

    if ! tailscale status &> /dev/null; then
        warn "Tailscale not logged in"
        return 1
    fi

    # Start tailscale funnel in background
    tailscale funnel $PORT > /tmp/tailscale-tunnel.log 2>&1 &
    TUNNEL_PID=$!
    ACTIVE_TUNNEL_PID=$TUNNEL_PID

    # Extract URL from logs
    sleep 3
    TAILSCALE_URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com|https://[a-zA-Z0-9.-]+\.ts\.net' /tmp/tailscale-tunnel.log 2>/dev/null | head -1 || echo "")

    # Try standard tailscale URL pattern
    if [[ -z "$TAILSCALE_URL" ]]; then
        TAILSCALE_URL="https://$(tailscale status --json 2>/dev/null | grep -oE '"DNSName":"[^"]+"' | head -1 | cut -d'"' -f4 | sed 's/\.$//')"
    fi

    if [[ -n "$TAILSCALE_URL" ]]; then
        DASHBOARD_URL="${TAILSCALE_URL}/00-DASHBOARD/WSJF-LIVE-V5-MODULAR.html"

        if health_check "$DASHBOARD_URL" 10; then
            success "✅ Tailscale active: $DASHBOARD_URL"
            echo "$DASHBOARD_URL" > /tmp/active-tunnel-url.txt
            echo "tailscale" > /tmp/active-tunnel-provider.txt
            save_tunnel_state

            # Log to tracker
            ~/Documents/code/investing/agentic-flow/scripts/tunnel-url-tracker.sh log "tailscale" "$DASHBOARD_URL" "cascade-primary" true 2>/dev/null || true

            return 0
        fi
    fi

    kill $TUNNEL_PID 2>/dev/null || true
    warn "Tailscale tunnel failed"
    debug_log "Tailscale failure - check: tailscale status"
    return 1
}

# =============================================================================
# STEP 4: Try ngrok (Tier 2 - Good) with v3 Config & Multi-Ledger Support
# =============================================================================
try_ngrok() {
    log "🔗 Attempting ngrok tunnel (v3 config)..."

    if ! command -v ngrok &> /dev/null; then
        warn "ngrok not installed (brew install ngrok/ngrok/ngrok)"
        return 1
    fi

    # Check if v3 config exists with api_key
    if [[ -f "$HOME/.config/ngrok/ngrok.yml" ]]; then
        NGROK_CONFIG="$HOME/.config/ngrok/ngrok.yml"
    else
        NGROK_CONFIG="$HOME/.ngrok2/ngrok.yml"
    fi

    if [[ ! -f "$NGROK_CONFIG" ]]; then
        warn "ngrok config not found at ~/.config/ngrok/ngrok.yml or ~/.ngrok2/ngrok.yml"
        warn "Run: ngrok config add-authtoken <token>"
        return ${EX_TUNNEL_NGROK_FAILED:-113}
    fi

    # Verify api_key is configured
    if ! grep -q "api_key\|authtoken" "$NGROK_CONFIG" 2>/dev/null; then
        warn "ngrok api_key not configured"
        return ${EX_TUNNEL_NGROK_FAILED:-113}
    fi

    # Default to dashboard tunnel for compatibility
    TUNNEL_NAME="dashboard"

    # Check for multi-ledger domain configuration
    if grep -q "domain:" "$NGROK_CONFIG" 2>/dev/null; then
        # Use named tunnel from config with reserved domain
        log "  📋 Using multi-ledger tunnel configuration"
        ngrok start $TUNNEL_NAME --config="$NGROK_CONFIG" > /tmp/ngrok-tunnel.log 2>&1 &
    else
        # Fallback to simple HTTP tunnel
        ngrok http $PORT --config="$NGROK_CONFIG" > /tmp/ngrok-tunnel.log 2>&1 &
    fi

    TUNNEL_PID=$!
    ACTIVE_TUNNEL_PID=$TUNNEL_PID

    # Wait for ngrok to establish tunnel
    sleep 4

    # Extract public URL (handles both free and reserved domains)
    NGROK_URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.ngrok\.io|https://[a-zA-Z0-9.-]+\.ngrok-free\.app|https://[a-zA-Z0-9.-]+\.ngrok\.app' /tmp/ngrok-tunnel.log 2>/dev/null | head -1 || echo "")

    # Try to get URL from ngrok API if log parsing failed
    if [[ -z "$NGROK_URL" ]]; then
        sleep 2
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -oE '"public_url":"https://[^"]+"' | head -1 | cut -d'"' -f4 || echo "")
    fi

    if [[ -n "$NGROK_URL" ]]; then
        DASHBOARD_URL="${NGROK_URL}/00-DASHBOARD/WSJF-LIVE-V5-MODULAR.html"

        if health_check "$DASHBOARD_URL" 10; then
            success "✅ ngrok active: $DASHBOARD_URL"
            echo "$DASHBOARD_URL" > /tmp/active-tunnel-url.txt
            echo "ngrok" > /tmp/active-tunnel-provider.txt
            save_tunnel_state

            # Log to tracker
            ~/Documents/code/investing/agentic-flow/scripts/tunnel-url-tracker.sh log "ngrok" "$DASHBOARD_URL" "cascade-secondary" false 2>/dev/null || true

            return 0
        fi
    fi

    kill $TUNNEL_PID 2>/dev/null || true
    warn "ngrok tunnel failed"
    return 1
}

# =============================================================================
# STEP 5: Try Cloudflare (Tier 3 - Okay, but URL changes)
# =============================================================================
try_cloudflare() {
    log "🔗 Attempting Cloudflare Quick Tunnel..."

    if ! command -v cloudflared &> /dev/null; then
        warn "cloudflared not installed (brew install cloudflared)"
        return 1
    fi

    # Start cloudflared
    cloudflared tunnel --url "http://127.0.0.1:$PORT" > /tmp/cloudflare-tunnel.log 2>&1 &
    TUNNEL_PID=$!
    ACTIVE_TUNNEL_PID=$TUNNEL_PID

    # Wait for tunnel to establish
    sleep 5

    # Extract public URL
    CF_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' /tmp/cloudflare-tunnel.log 2>/dev/null | head -1 || echo "")

    if [[ -n "$CF_URL" ]]; then
        DASHBOARD_URL="${CF_URL}/00-DASHBOARD/WSJF-LIVE-V5-MODULAR.html"

        if health_check "$DASHBOARD_URL" 10; then
            success "✅ Cloudflare active: $DASHBOARD_URL"
            warn "   ⚠️ URL changes on restart!"
            echo "$DASHBOARD_URL" > /tmp/active-tunnel-url.txt
            echo "cloudflare" > /tmp/active-tunnel-provider.txt
            save_tunnel_state

            # Log to tracker
            ~/Documents/code/investing/agentic-flow/scripts/tunnel-url-tracker.sh log "cloudflare" "$DASHBOARD_URL" "cascade-tertiary" false 2>/dev/null || true

            return 0
        fi
    fi

    kill $TUNNEL_PID 2>/dev/null || true
    warn "Cloudflare tunnel failed"
    return 1
}

# =============================================================================
# STEP 6: Try localtunnel (Tier 4 - Last resort)
# =============================================================================
try_localtunnel() {
    log "🔗 Attempting localtunnel (npx)..."

    if ! command -v npx &> /dev/null; then
        warn "npx not available (npm not installed)"
        return 1
    fi

    # Start localtunnel
    npx localtunnel --port $PORT > /tmp/localtunnel.log 2>&1 &
    TUNNEL_PID=$!
    ACTIVE_TUNNEL_PID=$TUNNEL_PID

    # Wait for tunnel
    sleep 5

    # Extract URL
    LT_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.loca\.lt' /tmp/localtunnel.log 2>/dev/null | head -1 || echo "")

    if [[ -n "$LT_URL" ]]; then
        DASHBOARD_URL="${LT_URL}/00-DASHBOARD/WSJF-LIVE-V5-MODULAR.html"

        if health_check "$DASHBOARD_URL" 15; then
            success "✅ localtunnel active: $DASHBOARD_URL"
            warn "   ⚠️ URL changes on restart!"
            echo "$DASHBOARD_URL" > /tmp/active-tunnel-url.txt
            echo "localtunnel" > /tmp/active-tunnel-provider.txt
            save_tunnel_state

            return 0
        fi
    fi

    kill $TUNNEL_PID 2>/dev/null || true
    warn "localtunnel failed"
    return 1
}

# =============================================================================
# Main Cascade Logic with Bounded Reasoning
# =============================================================================
main() {
    echo ""
    log "═══════════════════════════════════════════════════════════════"
    log "  CASCADE HYBRID TUNNEL ORCHESTRATOR (BOUNDED REASONING)"
    log "  Cascade: tailscale → ngrok → cloudflare → localtunnel"
    log "═══════════════════════════════════════════════════════════════"
    echo ""

    # Pre-flight checks
    check_prerequisites

    # Create bounded contract
    local process_id="cascade-tunnel-$(date +%s)"
    create_contract "$process_id" "Cascade Tunnel Orchestration" 20 120 "tailscale,ngrok,cloudflared,npx"
    start_process "$process_id"

    # Step 1: Start HTTP server with bounded ETA
    log_tdd "red" "Starting HTTP server on port $PORT"
    if ! run_bounded_eta "http_server" start_http_server "$PORT"; then
        error "Failed to start HTTP server. Exiting."
        log_tdd "red" "HTTP server startup failed" ${EX_TUNNEL_HTTP_FAILED:-111}
        exit ${EX_TUNNEL_HTTP_FAILED:-111}
    fi
    log_tdd "green" "HTTP server started successfully"

    echo ""
    log "🔄 Starting cascade tunnel attempts..."
    echo ""

    # PERSISTENT_TUNNEL_PROVIDER: when set, prefer ngrok|tailscale and skip ephemeral providers
    local persistent="${PERSISTENT_TUNNEL_PROVIDER:-}"
    local try_tailscale_first=true try_ngrok_second=true try_cloudflare=true try_localtunnel=true
    if [[ -n "$persistent" ]]; then
        case "$persistent" in
            ngrok)  try_tailscale_first=false; try_cloudflare=false; try_localtunnel=false ;;
            tailscale) try_ngrok_second=false; try_cloudflare=false; try_localtunnel=false ;;
            *) warn "PERSISTENT_TUNNEL_PROVIDER=$persistent unknown, using full cascade" ;;
        esac
        log "📌 Persistent tunnel mode: $persistent"
    fi

    # Cascade through providers with bounded ETA
    log_tdd "red" "Attempting Tailscale tunnel (Tier 1)"
    if [[ "$try_tailscale_first" == true ]] && run_bounded_eta "tailscale_tunnel" try_tailscale; then
        ACTIVE_PROVIDER="tailscale"
        ACTIVE_URL=$(cat /tmp/active-tunnel-url.txt 2>/dev/null || echo "unknown")
        success "🎯 Cascade stopped at Tier 1 (Tailscale)"
        log_tdd "green" "Tailscale tunnel established: $ACTIVE_URL"
    elif [[ "$try_ngrok_second" == true ]] && run_bounded_eta "ngrok_tunnel" try_ngrok; then
        ACTIVE_PROVIDER="ngrok"
        ACTIVE_URL=$(cat /tmp/active-tunnel-url.txt 2>/dev/null || echo "unknown")
        success "🎯 Cascade stopped at Tier 2 (ngrok)"
        log_tdd "green" "ngrok tunnel established: $ACTIVE_URL"
    elif [[ "$try_cloudflare" == true ]] && run_bounded_eta "cloudflare_tunnel" try_cloudflare; then
        ACTIVE_PROVIDER="cloudflare"
        ACTIVE_URL=$(cat /tmp/active-tunnel-url.txt 2>/dev/null || echo "unknown")
        success "🎯 Cascade stopped at Tier 3 (Cloudflare)"
        log_tdd "green" "Cloudflare tunnel established: $ACTIVE_URL"
    elif [[ "$try_localtunnel" == true ]] && run_bounded_eta "localtunnel_tunnel" try_localtunnel; then
        ACTIVE_PROVIDER="localtunnel"
        ACTIVE_URL=$(cat /tmp/active-tunnel-url.txt 2>/dev/null || echo "unknown")
        success "🎯 Cascade stopped at Tier 4 (localtunnel)"
        log_tdd "green" "localtunnel established: $ACTIVE_URL"
    else
        error "❌ All tunnel providers failed!"
        error "Dashboard available only at: http://127.0.0.1:$PORT"
        error "Exit code: ${EX_TUNNEL_ALL_PROVIDERS_FAILED:-116}"

        log_tdd "red" "All tunnel providers failed" ${EX_TUNNEL_ALL_PROVIDERS_FAILED:-116}

        # Collect metrics even on failure
        local quality=$("$PROJECT_ROOT/_SYSTEM/_AUTOMATION/metrics-collector.sh" collect "cascade-tunnel" ${EX_TUNNEL_ALL_PROVIDERS_FAILED:-116})
        error "📊 Build Quality: ${quality}% (failure tracked for improvement)"

        # Debug analysis
        analyze_exit_code ${EX_TUNNEL_ALL_PROVIDERS_FAILED:-116} "cascade-failure"
        quick_diag

        exit ${EX_TUNNEL_ALL_PROVIDERS_FAILED:-116}
    fi

    # Print final status
    echo ""
    log "═══════════════════════════════════════════════════════════════"
    ACTIVE_URL=$(cat /tmp/active-tunnel-url.txt 2>/dev/null || echo "unknown")
    ACTIVE_PROVIDER=$(cat /tmp/active-tunnel-provider.txt 2>/dev/null || echo "unknown")
    success "ACTIVE TUNNEL: $ACTIVE_PROVIDER"
    success "PUBLIC URL: $ACTIVE_URL"
    log "═══════════════════════════════════════════════════════════════"
    TUNNEL_PROVIDER="${ACTIVE_PROVIDER}"
    TUNNEL_URL="${ACTIVE_URL}"
    echo ""

    # Collect metrics for continuous improvement
    local quality=$("$PROJECT_ROOT/_SYSTEM/_AUTOMATION/metrics-collector.sh" collect "cascade-tunnel" 0)
    log "📊 Build Quality: ${quality}% (tracked for CI/CD improvement)"

    log "📊 Health monitoring: Ctrl+C to stop"
    echo ""

    # Initialize health monitoring variables (T3: bounded restart policy)
    HEALTH_CHECK_COUNT=0
    FAILURE_COUNT=0
    RESTART_ATTEMPTS=0
    MAX_RESTART_ATTEMPTS="${MAX_RESTART_ATTEMPTS:-3}"
    declare -A PROVIDER_FAILURES

    # Health monitoring with DYNAMIC configuration
    update_progress "$process_id" "Starting health monitoring" 19 "RUNNING"

    # Load dynamic health configuration
    source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/dynamic-health-config.sh" 2>/dev/null || true
    eval $(get_dynamic_health_config "$ACTIVE_PROVIDER" 2>/dev/null) || {
        MAX_HEALTH_CHECKS="${MAX_HEALTH_CHECKS:-20}"
        HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-30}"
        MAX_FAILURES="${MAX_FAILURES:-3}"
    }

    echo "🔧 Health Monitoring Config:"
    echo "   Max checks: $MAX_HEALTH_CHECKS"
    echo "   Check interval: ${HEALTH_CHECK_INTERVAL}s"
    echo "   Max failures: $MAX_FAILURES"
    echo "   Max restart attempts (bounded): $MAX_RESTART_ATTEMPTS"
    echo ""

    while [[ $HEALTH_CHECK_COUNT -lt $MAX_HEALTH_CHECKS ]]; do
        HEALTH_CHECK_COUNT=$((HEALTH_CHECK_COUNT + 1))

        # Show ETA BEFORE each check
        local contract_file="/tmp/brf-contracts/${process_id}.json"
        if [[ -f "$contract_file" ]]; then
            local eta=$(jq -r '.eta_seconds' "$contract_file" 2>/dev/null || echo "unknown")
            local progress=$(jq -r '.progress_pct' "$contract_file" 2>/dev/null || echo "unknown")
            echo -e "\n📊 ETA: ${progress}% complete, ${eta}s remaining"
            echo "═══════════════════════════════════════════════════════════════"
        fi

        echo "[HEALTH CHECK $HEALTH_CHECK_COUNT/$MAX_HEALTH_CHECKS]"

        if health_check "$ACTIVE_URL" 5; then
            success "✅ Health check passed for $ACTIVE_PROVIDER"
            FAILURE_COUNT=0
            PROVIDER_FAILURES[$ACTIVE_PROVIDER]=0

            # Update progress on success
            update_progress "$process_id" "Health check $HEALTH_CHECK_COUNT passed" 1 "RUNNING"
        else
            warn "⚠️ Health check failed for $ACTIVE_PROVIDER"
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
            PROVIDER_FAILURES[$ACTIVE_PROVIDER]=$((${PROVIDER_FAILURES[$ACTIVE_PROVIDER]:-0} + 1))

            # 218/219: URL expired or origin unreachable — cascade immediately (restart won't help)
            local status
            status=$(health_check_status "$ACTIVE_URL" 5)
            local is_218=false is_219=false
            [[ "$status" == "1033" || "$status" == "502" || "$status" == "503" ]] && is_219=true
            [[ "$status" == "404" || "$status" == "403" || "$status" == "000" ]] && [[ "$ACTIVE_PROVIDER" == "cloudflare" || "$ACTIVE_PROVIDER" == "localtunnel" ]] && is_218=true
            detect_1033_from_logs && is_219=true
            if [[ "$is_219" == true || "$is_218" == true ]]; then
                error "🔴 Tunnel error ${is_219:+1033/origin unreachable}${is_218:+URL expired} — cascading to next provider"
                log_tdd "red" "218/219 detected, cascading" $([[ "$is_219" == true ]] && echo ${EX_TUNNEL_ERROR_1033:-219} || echo ${EX_TUNNEL_URL_EXPIRED:-218})
                cascade_to_next_provider "$ACTIVE_PROVIDER"
                if [[ $? -ne 0 ]]; then
                    error "❌ All providers exhausted"
                    complete_process "$process_id" false
                    break
                fi
                ACTIVE_PROVIDER=$(cat /tmp/active-tunnel-provider.txt 2>/dev/null || echo "unknown")
                ACTIVE_URL=$(cat /tmp/active-tunnel-url.txt 2>/dev/null || echo "unknown")
                RESTART_ATTEMPTS=0
                continue
            fi

            # Update progress on failure
            update_progress "$process_id" "Health check $HEALTH_CHECK_COUNT failed" 1 "FAILED"

            # Circuit breaker: cascade to next provider when max failures reached
            if [[ ${PROVIDER_FAILURES[$ACTIVE_PROVIDER]:-0} -ge $MAX_FAILURES ]]; then
                error "🔌 Circuit breaker: $ACTIVE_PROVIDER failed $MAX_FAILURES times"
                cascade_to_next_provider "$ACTIVE_PROVIDER"
                if [[ $? -ne 0 ]]; then
                    error "❌ All providers exhausted"
                    complete_process "$process_id" false
                    break
                fi
                RESTART_ATTEMPTS=0
                continue
            fi

            # Bounded restart policy: limit restarts before cascading
            if [[ $RESTART_ATTEMPTS -ge $MAX_RESTART_ATTEMPTS ]]; then
                warn "Bounded restart limit ($MAX_RESTART_ATTEMPTS) reached — cascading to next provider"
                cascade_to_next_provider "$ACTIVE_PROVIDER"
                if [[ $? -ne 0 ]]; then
                    error "❌ All providers exhausted"
                    complete_process "$process_id" false
                    break
                fi
                RESTART_ATTEMPTS=0
                continue
            fi

            # Bounded wait with countdown (fixed echo -r)
            echo "Restart in 30 seconds (or press Enter)..."
            for i in {30..1}; do
                printf "\rRestarting in %2d seconds... " $i
                if read -t 1; then
                    printf "\nRestarting now...\n"
                    break
                fi
            done

            RESTART_ATTEMPTS=$((RESTART_ATTEMPTS + 1))
            warn "Restarting tunnel process (attempt $RESTART_ATTEMPTS/$MAX_RESTART_ATTEMPTS)..."
            restart_tunnel
        fi

        # Check if we should continue
        if [[ $HEALTH_CHECK_COUNT -ge $MAX_HEALTH_CHECKS ]]; then
            warn "⏰ Health monitoring complete ($MAX_HEALTH_CHECKS checks)"
            complete_process "$process_id" true
            break
        fi

        # Bounded backoff with DYNAMIC calculation
        BACKOFF_TIME=$(calculate_backoff_strategy "$ACTIVE_PROVIDER" $FAILURE_COUNT)

        echo "Next check in ${BACKOFF_TIME}s..."
        for i in $(seq 1 $BACKOFF_TIME); do
            sleep 1
            if [[ $((i % 10)) -eq 0 ]]; then
                printf "\r%3d/%3ds elapsed..." $i $BACKOFF_TIME
            fi
        done
        printf "\n"
    done
}

# Handle command line arguments
# Usage: $0 {start|stop|status|url} [port]
COMMAND="${1:-start}"
PORT="${2:-8080}"

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
case "$COMMAND" in
    start)
        main
        ;;
    multi-ledger)
        # Start all four ledger tunnels
        log "🚀 Starting Multi-Ledger Tunnel System"
        log "  ROOT: law.rooz.live (Legal aggregate root)"
        log "  GATEWAY: pur.tag.vote (WSJF validation gate)"
        log "  EVIDENCE: hab.yo.life (Habitability evidence)"
        log "  PROCESS: file.rooz.live (Filing/execution)"
        echo ""

        # Use eta-live-stream for coordinated start
        run_multi_ledger_tunnel "$PORT"
        ;;
    stop)
        log "🛑 Shutting down cascade tunnel..."
        if [[ -f "$PID_FILE" ]]; then
            kill $(cat "$PID_FILE") 2>/dev/null || true
            rm -f "$PID_FILE"
        fi

        # Clean up tunnel processes
        pkill -f "tailscale funnel" 2>/dev/null || true
        pkill -f "ngrok" 2>/dev/null || true
        pkill -f "cloudflared tunnel" 2>/dev/null || true
        pkill -f "localtunnel" 2>/dev/null || true

        # Clean up HTTP server
        if [[ -f "/tmp/http-server.pid" ]]; then
            kill $(cat "/tmp/http-server.pid") 2>/dev/null || true
            rm -f "/tmp/http-server.pid"
        fi

        success "✅ Cleanup complete"
        ;;
    status)
        # Show bounded reasoning status
        if declare -F get_all_status >/dev/null 2>&1; then
            get_all_status
        fi

        echo ""
        echo "═══════════════════════════════════════════════════════════════"
        log "  TUNNEL STATUS"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""

        if [[ -f "/tmp/active-tunnel-url.txt" ]]; then
            ACTIVE_URL=$(cat /tmp/active-tunnel-url.txt 2>/dev/null || echo "unknown")
            ACTIVE_PROVIDER=$(cat /tmp/active-tunnel-provider.txt 2>/dev/null || echo "unknown")
            TUNNEL_PROVIDER="${ACTIVE_PROVIDER}"
            TUNNEL_URL="${ACTIVE_URL}"
            success "ACTIVE TUNNEL: $ACTIVE_PROVIDER"
            success "PUBLIC URL: $ACTIVE_URL"

            # Health check
            if health_check "$ACTIVE_URL" 5; then
                success "STATUS: Healthy"
            else
                error "STATUS: Unhealthy"
            fi
        else
            warn "No active tunnel found"
        fi

        echo ""
        ;;
    url)
        if [[ -f "/tmp/active-tunnel-url.txt" ]]; then
            cat /tmp/active-tunnel-url.txt
        else
            error "No active tunnel"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|status|url|multi-ledger} [port]"
        echo ""
        echo "Commands:"
        echo "  start         - Start cascade tunnel (single dashboard)"
        echo "  multi-ledger  - Start all 4 ledger tunnels with bounded ETA"
        echo "  stop          - Stop all tunnels"
        echo "  status        - Show tunnel status with bounded metrics"
        echo "  url           - Get current tunnel URL"
        echo ""
        echo "Multi-Ledger Domains:"
        echo "  law.rooz.live    - ROOT (Legal aggregate root)"
        echo "  pur.tag.vote    - GATEWAY (WSJF validation)"
        echo "  hab.yo.life     - EVIDENCE (Habitability)"
        echo "  file.720.chat   - PROCESS (Filing/execution)"
        exit ${EXIT_INVALID_ARGS}
        ;;
esac
fi
