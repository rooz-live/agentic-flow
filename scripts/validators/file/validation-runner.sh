#!/usr/bin/env bash
# validation-runner.sh - Orchestration layer for email validation
# Sources validation-core.sh and runs all checks with DPC metrics
# @business-context WSJF: Send-readiness JSON for dashboard / MCP bridge
# @adr ADR-019: SKIP_SEMANTIC_VALIDATION=true only for CI (dual-track contract)
# @business-context WSJF: Unified send-readiness JSON for mover-ops + validate-full API
# @adr ADR-019: send_ready = config_ok AND validation_ok AND RUNNER_EXIT in {0,1} (see send-readiness-contract.json)
# @constraint DDD-VALIDATION: Semantic gate optional via SKIP_SEMANTIC_VALIDATION for CI/fixtures

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# validation-runner.sh is at scripts/validators/file/ — go up 2 levels to find validation-core.sh
# shellcheck source=../../validation-core.sh
source "$SCRIPT_DIR/../../validation-core.sh"

PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
if [ -f "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh" ]; then
    # shellcheck source=../../../_SYSTEM/_AUTOMATION/exit-codes-robust.sh
    source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh"
fi
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Parse arguments
    email_file=""
    JSON_OUTPUT=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --file|-f)
                email_file="$2"
                shift 2
                ;;
            --json|-j)
                JSON_OUTPUT=true
                shift
                ;;
            *)
                email_file="$1"
                shift
                ;;
        esac
    done

    # Strip any embedded quotes from path (orchestrator may add them)
    email_file="${email_file//\"/}"

    if [[ -z "$email_file" || ! -f "$email_file" ]]; then
        if [[ "$JSON_OUTPUT" == "true" ]]; then
            echo "{\"error\": \"File not found\", \"exit_code\": ${EXIT_FILE_NOT_FOUND:?}"
        else
            echo "Error: File not found: $email_file" >&2
        fi
        exit "${EXIT_FILE_NOT_FOUND:?}"
    fi

    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo "Running Validation Runner on $(basename "$email_file")"
    fi
fi

PASS_COUNT=0
FAIL_COUNT=0

WARN_COUNT=0
FIX_HINTS=()

process_result() {
    local name="$1"
    local result_code="$2"
    local output="$3"

    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo "--- $name ---"
        while IFS= read -r line; do
            if [[ -z "$line" ]]; then continue; fi
            local type="${line%%|*}"
            local msg="${line#*|}"
            case "$type" in
                PASS)    echo "[PASS] $msg" ;;
                FAIL)    echo "[FAIL] $msg" ;;
                WARN)    echo "[WARN] $msg" ;;
                SKIPPED) echo "[SKIP] $msg" ;;
                *)       echo "$line" ;;
            esac
        done <<< "$output"
    fi

    while IFS= read -r line; do
        if [[ -z "$line" ]]; then continue; fi
        local type="${line%%|*}"
        local msg="${line#*|}"
        case "$type" in
            FAIL|WARN)
                FIX_HINTS+=("$name: $msg")
                ;;
        esac
    done <<< "$output"

    if [[ "$result_code" -eq 0 ]]; then
        PASS_COUNT=$((PASS_COUNT + 1))
    elif [[ "$result_code" -eq 2 ]]; then
        # Exit 2 = WARN (pass with warnings, needs manual review but not blocking)
        PASS_COUNT=$((PASS_COUNT + 1))
        WARN_COUNT=$((WARN_COUNT + 1))
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    res_placeholders=0
    out_placeholders=$(core_check_placeholders "$email_file" "${SKIP_PLACEHOLDER_CHECK:-false}") || res_placeholders=$?
    process_result "Placeholder Check" "$res_placeholders" "$out_placeholders"

res_legal=0
out_legal=$(core_check_legal_citations "$email_file" "${SKIP_LEGAL_VALIDATION:-false}") || res_legal=$?
process_result "Legal Citations Check" "$res_legal" "$out_legal"

res_prose=0
out_prose=$(core_check_pro_se_signature "$email_file") || res_prose=$?
process_result "Pro Se Signature Check" "$res_prose" "$out_prose"

res_attach=0
out_attach=$(core_check_attachments "$email_file") || res_attach=$?
process_result "Attachment Check" "$res_attach" "$out_attach"

res_date=0
out_date=$(core_check_date_consistency "$email_file" "${SKIP_DATE_CHECK:-false}") || res_date=$?
process_result "Date Consistency Check" "$res_date" "$out_date"

res_semantic=0
if [[ "${SKIP_SEMANTIC_VALIDATION:-false}" == "true" ]]; then
    out_semantic="SKIPPED|Semantic validation skipped (SKIP_SEMANTIC_VALIDATION)"
    res_semantic=0
else
    if ! out_semantic=$("$SCRIPT_DIR/semantic-validation-gate.sh" --file "$email_file" 2>&1); then
        res_semantic=$?
    fi
fi
process_result "Semantic Validation (Facts)" "$res_semantic" "$out_semantic"

if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo "-------------------"
    echo "TOTAL PASS: $PASS_COUNT"
    echo "TOTAL FAIL: $FAIL_COUNT"
fi

VERDICT="PASS"
EXIT_CODE=$EXIT_SUCCESS

if [[ "$res_placeholders" -ne 0 ]]; then
    VERDICT="BLOCKED"
    EXIT_CODE=$EXIT_PLACEHOLDER_DETECTED
elif [[ "${res_date:-0}" -eq 1 ]]; then
    VERDICT="FAIL"
    EXIT_CODE=${EXIT_DATE_IN_PAST:-110}
elif [[ "$FAIL_COUNT" -gt 0 ]]; then
    VERDICT="FAIL"
    EXIT_CODE=$EXIT_SCHEMA_VALIDATION_FAILED
fi

if [[ "$JSON_OUTPUT" == "true" ]]; then
    # DPC_R(t) time-weighted metric calculation
    TOTAL_CHECKS=$((PASS_COUNT + FAIL_COUNT))
    if [[ "$TOTAL_CHECKS" -gt 0 ]]; then
        COVERAGE=$(echo "scale=2; ($PASS_COUNT * 100) / $TOTAL_CHECKS" | bc)
    else
        COVERAGE="0.00"
    fi
    ROBUSTNESS="0.90"  # 90% — reflects 0 stubs but 3 validators still failing
    TOTAL_TIME_HOURS=120  # 5-day sprint window
    TRIAL_DATE="2026-03-03"
    CURRENT_EPOCH=$(date +%s)
    if date -j >/dev/null 2>&1; then
        TRIAL_EPOCH=$(date -j -f "%Y-%m-%d" "$TRIAL_DATE" +%s 2>/dev/null || echo "$CURRENT_EPOCH")
    else
        TRIAL_EPOCH=$(date -d "$TRIAL_DATE" +%s 2>/dev/null || echo "$CURRENT_EPOCH")
    fi
    HOURS_REMAINING=$(echo "scale=2; ($TRIAL_EPOCH - $CURRENT_EPOCH) / 3600" | bc 2>/dev/null || echo "0")
    if (( $(echo "$HOURS_REMAINING < 0" | bc -l 2>/dev/null || echo 0) )); then
        HOURS_REMAINING="0"
    fi
    URGENCY_FACTOR=$(echo "scale=4; $HOURS_REMAINING / $TOTAL_TIME_HOURS" | bc 2>/dev/null || echo "0")
    DPC_SCORE=$(echo "scale=2; ($COVERAGE / 100) * $ROBUSTNESS * 100" | bc 2>/dev/null || echo "0")
    DPC_ENHANCED=$(echo "scale=4; ($COVERAGE / 100) * $URGENCY_FACTOR * $ROBUSTNESS" | bc 2>/dev/null || echo "0")

    # Unified send-readiness (see _SYSTEM/_AUTOMATION/send-readiness-contract.json):
    # send_ready = config_ok AND validation_ok AND RUNNER_EXIT in {0,1} AND NOT failures_100_plus
    CONFIG_OK_JSON="true"
    if [[ "${SEND_GATE_CONFIG_OK:-true}" != "true" ]]; then
        CONFIG_OK_JSON="false"
    fi
    VALIDATION_OK_JSON="false"
    if [[ "$FAIL_COUNT" -eq 0 && "$VERDICT" != "BLOCKED" ]]; then
        VALIDATION_OK_JSON="true"
    fi
    FAILURES_100_PLUS=0
    if [[ "$EXIT_CODE" -ge 100 ]]; then
        FAILURES_100_PLUS=1
    fi
    RUNNER_OK_ZONE="false"
    if [[ "$EXIT_CODE" -eq 0 || "$EXIT_CODE" -eq 1 ]]; then
        RUNNER_OK_ZONE="true"
    fi
    SEND_READY_JSON="false"
    if [[ "$CONFIG_OK_JSON" == "true" && "$VALIDATION_OK_JSON" == "true" && "$RUNNER_OK_ZONE" == "true" && "$FAILURES_100_PLUS" -eq 0 ]]; then
        SEND_READY_JSON="true"
    fi
    # %/# = checks_passed/checks_total (state); %.# = velocity placeholder (iteration from env or 1)
    CHECKS_TOTAL=$((PASS_COUNT + FAIL_COUNT))
    CHECKS_PASSED=$PASS_COUNT
    ITERATION="${VALIDATION_ITERATION:-1}"
    PASS_RATE_PCT="$COVERAGE"
    # shellcheck disable=SC2016 # stdin must be pipe to python -c (not heredoc; avoids SC2259)
    HINTS_JSON=$(printf '%s\n' "${FIX_HINTS[@]}" | python3 -c '
import json, sys
lines = [ln.strip() for ln in sys.stdin.read().splitlines() if ln.strip()]
print(json.dumps(lines))
')
    TOP_REASON=$(python3 -c 'import json,sys; a=json.loads(sys.argv[1]); print(a[0] if a else "")' "$HINTS_JSON")
    NEXT_ACTION="Re-run validation after applying fix_hints."
    ROAM_TAG="M: Mitigated - validation fix path available"
    WSJF_HINT="WSJF: Fix validation failures in order of fix_hints."
    TRACE_LEVEL="blocker"
    if [[ "$EXIT_CODE" -lt 10 ]]; then
        NEXT_ACTION="Proceed with HITL send review."
        ROAM_TAG="R: Resolved - gate passes"
        WSJF_HINT="Gate passes. Proceed with HITL send."
        TRACE_LEVEL="resolved"
    elif [[ "$EXIT_CODE" -eq 111 || "$VERDICT" == "BLOCKED" ]]; then
        WSJF_HINT="WSJF: Fix placeholders first (highest BV blocker)."
    elif [[ "$EXIT_CODE" -lt 100 ]]; then
        NEXT_ACTION="Fix client/dependency issues and re-run validation."
        ROAM_TAG="O: Owned - config/input remediation needed"
        WSJF_HINT="WSJF: Fix config/input contract (client zone)."
    fi

    cat <<EOF
{
  "file": "$(basename "$email_file")",
  "total_pass": $PASS_COUNT,
  "total_fail": $FAIL_COUNT,
  "fail_count": $FAIL_COUNT,
  "config_ok": $CONFIG_OK_JSON,
  "validation_ok": $VALIDATION_OK_JSON,
  "verdict": "$VERDICT",
  "exit_code": $EXIT_CODE,
  "RUNNER_EXIT": $EXIT_CODE,
  "runner_exit": $EXIT_CODE,
  "good_enough_to_send": $SEND_READY_JSON,
  "send_ready": $SEND_READY_JSON,
  "failures_100_plus": $FAILURES_100_PLUS,
  "fix_hints": $HINTS_JSON,
  "summary": { "passed": $CHECKS_PASSED, "total": $CHECKS_TOTAL, "score": $COVERAGE },
  "checks_passed": $CHECKS_PASSED,
  "checks_total": $CHECKS_TOTAL,
  "iteration": $ITERATION,
  "%/#": { "checks_passed": $CHECKS_PASSED, "checks_total": $CHECKS_TOTAL },
  "%.#": { "iteration": $ITERATION, "pass_rate_pct": $PASS_RATE_PCT, "checks_failed": $FAIL_COUNT },
  "rca_trace": {
    "raw_exit": $EXIT_CODE,
    "top_reason": "$(printf '%s' "$TOP_REASON" | sed 's/"/\\"/g')",
    "next_action": "$NEXT_ACTION",
    "roam_tag": "$ROAM_TAG",
    "wsjf_hint": "$(printf '%s' "$WSJF_HINT" | sed 's/"/\\"/g')",
    "trace_level": "$TRACE_LEVEL",
    "wsjf_priority": "$( [[ "$EXIT_CODE" -le 1 ]] && echo "DONE" || echo "NOW" )"
  },
  "metrics": {
    "coverage": $COVERAGE,
    "robustness": $ROBUSTNESS,
    "time_remaining_hours": $HOURS_REMAINING,
    "urgency_factor": $URGENCY_FACTOR,
    "dpc_score": $DPC_SCORE,
    "dpc_enhanced": $DPC_ENHANCED
  }
}
EOF
    else
        if [[ "$VERDICT" == "BLOCKED" ]]; then
            echo "VERDICT: BLOCKED (Placeholders found)"
        else
            echo "VERDICT: $VERDICT"
        fi
    fi

    exit "${EXIT_CODE:?}"
fi
