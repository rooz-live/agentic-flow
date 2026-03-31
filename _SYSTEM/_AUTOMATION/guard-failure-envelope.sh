#!/bin/bash
# _SYSTEM/_AUTOMATION/guard-failure-envelope.sh
# Shared AISP guard-failure envelope emission for ay, advocate, cascade-tunnel.
# @business-context WSJF: Unified guard contract behavior across orchestrators
# @adr: Single source of truth for guard-failure AISP envelope schema

# Emit guard-failure AISP envelope to status_file.
# Usage: emit_guard_failure_status <status_file> <lane> <exit_code> <reason> [source_script]
emit_guard_failure_status() {
    local status_file="${1:?}"
    local lane="${2:?}"
    local exit_code="${3:-10}"
    local reason="${4:-AISP guard failure}"
    local source_script="${5:-scripts/unknown.sh}"

    # Load and increment rolling failure counters (self-contained)
    local ROLLING_FAIL_10=0 ROLLING_FAIL_12=0 ROLLING_FAIL_21=0 ROLLING_FAIL_160=0
    local ROLLING_FAIL_TOTAL=0 ROLLING_RUNS=0
    if [[ -f "$status_file" ]]; then
        local content header_json counter_json
        content=$(<"$status_file")
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
        _extract_int() { python3 -c "import json,sys;v=json.loads(sys.argv[1]).get(sys.argv[2],0);print(int(float(v)) if v is not None and v!='' else 0)" "$1" "$2" 2>/dev/null || echo 0; }
        ROLLING_FAIL_10=$(_extract_int "$counter_json" "10")
        ROLLING_FAIL_12=$(_extract_int "$counter_json" "12")
        ROLLING_FAIL_21=$(_extract_int "$counter_json" "21")
        ROLLING_FAIL_160=$(_extract_int "$counter_json" "160")
        ROLLING_FAIL_TOTAL=$(_extract_int "$header_json" "rolling_failure_total")
        ROLLING_RUNS=$(_extract_int "$header_json" "rolling_runs")
    fi
    ((ROLLING_RUNS++)) || true
    case "$exit_code" in
        10) ((ROLLING_FAIL_10++)); ((ROLLING_FAIL_TOTAL++)) ;;
        12) ((ROLLING_FAIL_12++)); ((ROLLING_FAIL_TOTAL++)) ;;
        21) ((ROLLING_FAIL_21++)); ((ROLLING_FAIL_TOTAL++)) ;;
        160) ((ROLLING_FAIL_160++)); ((ROLLING_FAIL_TOTAL++)) ;;
    esac

    local rolling_rate_pct="0.00"
    local failures_per_run="0.00"
    if [[ ${ROLLING_RUNS:-0} -gt 0 ]]; then
        rolling_rate_pct=$(awk "BEGIN { printf \"%.2f\", (${ROLLING_FAIL_TOTAL:-0} * 100) / ${ROLLING_RUNS:-1} }")
        failures_per_run=$(awk "BEGIN { printf \"%.2f\", ${ROLLING_FAIL_TOTAL:-0} / ${ROLLING_RUNS:-1} }")
    fi

    local ceremony_json
    ceremony_json=$(python3 - "${CEREMONY_METRICS_FILE:-}" "${ROAM_TRACKER_FILE:-}" 0 "${AISP_CHECKS_TOTAL:-5}" 0 0 "$exit_code" <<'PY'
import json
import pathlib
import re
import sys

metrics_path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1] else None
roam_path = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else None
checks_passed = float(sys.argv[3] or 0)
checks_total = float(sys.argv[4] or 0)
pass_velocity = float(sys.argv[5] or 0)
resolved_velocity = float(sys.argv[6] or 0)
exit_code = int(float(sys.argv[7] or 0))

ceremony_names = ["review", "retro", "replenish", "refine", "standup", "pi_sync"]
counts = {name: 0 for name in ceremony_names}

if metrics_path and metrics_path.exists() and metrics_path.is_file():
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

roam_total = roam_open = roam_owned = 0
if roam_path and roam_path.exists() and roam_path.is_file():
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
)

    local exit_zone="success"
    if [[ $exit_code -ge 200 ]]; then
        exit_zone="infra"
    elif [[ $exit_code -ge 150 ]]; then
        exit_zone="business"
    elif [[ $exit_code -ge 100 ]]; then
        exit_zone="validation"
    elif [[ $exit_code -ge 10 ]]; then
        exit_zone="client"
    fi

    mkdir -p "$(dirname "$status_file")"
    cat > "$status_file" <<AISP_EOF
{
  "aisp_header": {
    "version": "1.0",
    "timestamp_utc": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "t_stage": "${AISP_T_STAGE:-T0}",
    "domain": ["$(echo "${AISP_DOMAINS:-legal}" | sed 's/,/","/g')"],
    "case_ids": ["$(echo "${LEGAL_CASE_IDS:-}" | sed 's/,/","/g')"],
    "lane": "${lane}",
    "mode": "${AISP_MODE_DEFAULT:-SA}",
    "env": "${AISP_ENV:-dev}",
    "%/#": { "config_checks_passed": ${AISP_CHECKS_PASSED:-0}, "config_checks_total": ${AISP_CHECKS_TOTAL:-5} },
    "env_%/#": { "config_checks_passed": ${AISP_CHECKS_PASSED:-0}, "config_checks_total": ${AISP_CHECKS_TOTAL:-5} },
    "%.#": { "checks_passed_per_min": 0.00, "actions_resolved_per_min": 0.00 },
    "exit_code": ${exit_code},
    "exit_zone": "${exit_zone}",
    "rolling_failure_counter": { "10": ${ROLLING_FAIL_10:-0}, "12": ${ROLLING_FAIL_12:-0}, "21": ${ROLLING_FAIL_21:-0}, "160": ${ROLLING_FAIL_160:-0} },
    "rolling_failure_total": ${ROLLING_FAIL_TOTAL:-0},
    "rolling_runs": ${ROLLING_RUNS:-0},
    "trend_velocity": { "rolling_failure_rate_pct": ${rolling_rate_pct}, "failures_per_run": ${failures_per_run} }
  },
  "intro": {
    "build": "AISP guard failed before governance cycle",
    "measure": "${AISP_CHECKS_PASSED:-0}/${AISP_CHECKS_TOTAL:-5} config checks passed",
    "learn": "${reason}"
  },
  "body": {
    "circles": [
      {
        "name": "${lane}",
        "role": "AISPConfigGuard",
        "status": "blocked",
        "blockers": [
          { "id": "B-GUARD-001", "desc": "${reason}", "exit_code": ${exit_code} }
        ],
        "dependencies": [
          { "on": "AISP_WORKSPACE_ROOT,LEGAL_ROOT,LEGAL_CASE_IDS", "status": "required" }
        ]
      }
    ],
    "ceremonies": ${ceremony_json}
  },
  "menu": [
    {
      "id": "run_ay_check",
      "label": "Run ay --check",
      "mode": "SA",
      "api": { "cli": "./scripts/ay.sh --check" },
      "guards": { "required_exit_codes": [0] }
    }
  ],
  "manifest": {
    "id": "AISP-GUARD-$(date -u +"%Y-%m-%dT%H-%M-%SZ")",
    "workspace": "agentic-flow",
    "source_script": "${source_script}",
    "report_file": null
  }
}
AISP_EOF

    local trend_log="${HOME}/Library/Logs/ay-validation-trend.log"
    mkdir -p "$(dirname "$trend_log")" 2>/dev/null || true
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") exit=${exit_code} zone=${exit_zone} lane=${lane} reason=\"${reason}\" rolling10=${ROLLING_FAIL_10:-0} rolling12=${ROLLING_FAIL_12:-0} rolling21=${ROLLING_FAIL_21:-0} rolling160=${ROLLING_FAIL_160:-0} total=${ROLLING_FAIL_TOTAL:-0} runs=${ROLLING_RUNS:-0}" >> "$trend_log" 2>/dev/null || true

    local metrics_jsonl
    metrics_jsonl="$(dirname "$status_file")/ceremony-metrics.jsonl"
    echo "{\"ts\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"lane\":\"${lane}\",\"exit_code\":${exit_code},\"exit_zone\":\"${exit_zone}\",\"reason\":\"$(printf '%s' "$reason" | sed 's/"/\\"/g')\",\"exit_10\":${ROLLING_FAIL_10:-0},\"exit_12\":${ROLLING_FAIL_12:-0},\"exit_21\":${ROLLING_FAIL_21:-0},\"exit_160\":${ROLLING_FAIL_160:-0},\"rolling_failure_total\":${ROLLING_FAIL_TOTAL:-0},\"rolling_runs\":${ROLLING_RUNS:-0}}" >> "$metrics_jsonl" 2>/dev/null || true
}
