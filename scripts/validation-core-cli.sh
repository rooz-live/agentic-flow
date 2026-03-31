#!/usr/bin/env bash
# CLI wrapper for validation-core.sh with JSON output support
set -euo pipefail

# Source the core library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/validation-core.sh"

# CLI argument parsing
MODE=""
FILE=""
CHECK="all"
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        email) MODE="email"; shift ;;
        --file) FILE="$2"; shift 2 ;;
        --check) CHECK="$2"; shift 2 ;;
        --json) JSON_OUTPUT=true; shift ;;
        --help|-h)
            echo "Usage: $0 email --file <path> [--check <type>] [--json]"
            echo ""
            echo "Options:"
            echo "  email              Validate email file"
            echo "  --file <path>      Email file to validate"
            echo "  --check <type>     Check type: placeholder|legal|prose|attachment|all (default: all)"
            echo "  --json             Output in JSON format"
            exit 0
            ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

# Validate inputs
if [[ -z "$MODE" ]] || [[ -z "$FILE" ]]; then
    echo "ERROR: Missing required arguments" >&2
    echo "Usage: $0 email --file <path> [--check <type>] [--json]" >&2
    exit 1
fi

if [[ ! -f "$FILE" ]]; then
    if [[ "$JSON_OUTPUT" == true ]]; then
        echo '{"error":"File not found","file":"'"$FILE"'"}'
    else
        echo "ERROR: File not found: $FILE" >&2
    fi
    exit 1
fi

# Initialize colors (only if not JSON output)
[[ "$JSON_OUTPUT" == false ]] && init_colors

# Run validation checks and store results
declare -A results
exit_code=0

# Execute requested checks
if [[ "$CHECK" == "placeholder" ]] || [[ "$CHECK" == "all" ]]; then
    output=$(core_check_placeholders "$FILE")
    status=$?
    results["placeholder"]="$output|$status"
    [[ $status -eq 1 ]] && exit_code=1
    [[ $status -eq 2 ]] && [[ $exit_code -eq 0 ]] && exit_code=2
fi

if [[ "$CHECK" == "legal" ]] || [[ "$CHECK" == "all" ]]; then
    output=$(core_check_legal_citations "$FILE")
    status=$?
    results["legal"]="$output|$status"
    [[ $status -eq 1 ]] && exit_code=1
    [[ $status -eq 2 ]] && [[ $exit_code -eq 0 ]] && exit_code=2
fi

if [[ "$CHECK" == "prose" ]] || [[ "$CHECK" == "all" ]]; then
    output=$(core_check_pro_se_signature "$FILE")
    status=$?
    results["pro_se"]="$output|$status"
    [[ $status -eq 1 ]] && exit_code=1
    [[ $status -eq 2 ]] && [[ $exit_code -eq 0 ]] && exit_code=2
fi

if [[ "$CHECK" == "attachment" ]] || [[ "$CHECK" == "all" ]]; then
    output=$(core_check_attachments "$FILE")
    status=$?
    results["attachment"]="$output|$status"
    [[ $status -eq 1 ]] && exit_code=1
    [[ $status -eq 2 ]] && [[ $exit_code -eq 0 ]] && exit_code=2
fi

# Output results
if [[ "$JSON_OUTPUT" == true ]]; then
    # JSON output
    echo -n '{"file":"'"$FILE"'","checks":{'

    first=true
    for check_name in "${!results[@]}"; do
        IFS='|' read -r message status <<< "${results[$check_name]}"

        [[ "$first" == false ]] && echo -n ','
        first=false

        # Escape quotes in message
        message_escaped=$(echo "$message" | sed 's/"/\\"/g')

        echo -n '"'"$check_name"'":{"message":"'"$message_escaped"'","status":"'
        case "$status" in
            0) echo -n 'pass' ;;
            1) echo -n 'fail' ;;
            2) echo -n 'warning' ;;
            *) echo -n 'unknown' ;;
        esac
        echo -n '"}'
    done

    echo -n '},"exit_code":'"$exit_code"'}'
    echo ""
else
    # Human-readable output
    echo ""
    echo "=== Validation Results ==="
    for check_name in "${!results[@]}"; do
        IFS='|' read -r message status <<< "${results[$check_name]}"
        case "$status" in
            0) echo -e "${GREEN}✓${NC} $check_name: $message" ;;
            1) echo -e "${RED}✗${NC} $check_name: $message" ;;
            2) echo -e "${YELLOW}⚠${NC} $check_name: $message" ;;
            *) echo -e "${DIM}?${NC} $check_name: $message" ;;
        esac
    done
    echo ""
fi

exit $exit_code
