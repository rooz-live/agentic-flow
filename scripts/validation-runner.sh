#!/usr/bin/env bash
# validation-runner.sh - Orchestration layer for email validation
# Sources validation-core.sh and runs all checks with DPC metrics

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/validation-core.sh"

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

if [[ -z "$email_file" || ! -f "$email_file" ]]; then
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        echo '{"error": "File not found", "exit_code": 3}'
    else
        echo "Error: File not found: $email_file" >&2
    fi
    exit 3
fi

if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo "Running Validation Runner on $(basename "$email_file")"
fi

PASS_COUNT=0
FAIL_COUNT=0

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

    if [[ "$result_code" -eq 0 ]]; then
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

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

if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo "-------------------"
    echo "TOTAL PASS: $PASS_COUNT"
    echo "TOTAL FAIL: $FAIL_COUNT"
fi

VERDICT="PASS"
EXIT_CODE=0

if [[ "$res_placeholders" -ne 0 ]]; then
    VERDICT="BLOCKED"
    EXIT_CODE=2
elif [[ "$FAIL_COUNT" -gt 0 ]]; then
    VERDICT="FAIL"
    EXIT_CODE=1
fi

# DPC_R(t) metric: coverage × robustness
TOTAL_CHECKS=$((PASS_COUNT + FAIL_COUNT))
DECLARED_CHECKS=4  # placeholders, legal, prose, attachments
if [[ "$TOTAL_CHECKS" -gt 0 ]]; then
    # Use awk for floating point
    COVERAGE=$(awk "BEGIN {printf \"%.2f\", $PASS_COUNT / $TOTAL_CHECKS}")
    ROBUSTNESS=$(awk "BEGIN {printf \"%.2f\", $TOTAL_CHECKS / $DECLARED_CHECKS}")
    DPC_R=$(awk "BEGIN {printf \"%.2f\", ($PASS_COUNT / $TOTAL_CHECKS) * ($TOTAL_CHECKS / $DECLARED_CHECKS)}")
else
    COVERAGE="0.00"
    ROBUSTNESS="0.00"
    DPC_R="0.00"
fi

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat <<EOF
{
  "file": "$(basename "$email_file")",
  "total_pass": $PASS_COUNT,
  "total_fail": $FAIL_COUNT,
  "verdict": "$VERDICT",
  "dpc": {
    "coverage": $COVERAGE,
    "robustness": $ROBUSTNESS,
    "dpc_r": $DPC_R,
    "declared_checks": $DECLARED_CHECKS,
    "executed_checks": $TOTAL_CHECKS
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

exit $EXIT_CODE
