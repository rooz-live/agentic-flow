#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# mail-capture-validate.sh — Mail.app ↔ Advocacy Pipeline Integration
# ═══════════════════════════════════════════════════════════════════════════════
#
# DoR: macOS with Mail.app, Python 3.10+, vibesthinker package installed
# DoD: Pre-send validation gate — emails pass 33-role council before sending
#
# Usage:
#   ./scripts/mail-capture-validate.sh                       # Interactive: pick from Mail.app drafts
#   ./scripts/mail-capture-validate.sh --auto                # Watch ~/Desktop/outbound-*.eml
#   ./scripts/mail-capture-validate.sh --file path/to.eml    # Validate a specific .eml file
#   ./scripts/mail-capture-validate.sh --drafts              # List Mail.app drafts
#   ./scripts/mail-capture-validate.sh --save-research       # Save selected emails to RESEARCH/
#   ./scripts/mail-capture-validate.sh --type court          # Override doc type (settlement|court|discovery)
#   ./scripts/mail-capture-validate.sh --strategic           # Run all 33 roles (not just 21)
#   ./scripts/mail-capture-validate.sh --notify              # Send Telegram notification on result
#   ./scripts/mail-capture-validate.sh --json                # Output JSON report
#
# Exit codes:
#   0 = Validation PASSED (safe to send)
#   1 = Validation FAILED (review required)
#   2 = Configuration error
#   3 = Mail.app not available
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# mail-capture-validate.sh lives at scripts/validators/file/ — 3 levels below project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CAPTURE_DIR="${PROJECT_ROOT}/tmp/mail-capture"
REPORT_DIR="${PROJECT_ROOT}/reports/mail-validation"
LEGAL_BASE="${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
RESEARCH_DIR="${LEGAL_BASE}/01-ACTIVE-CRITICAL/MAA-26CV005596-590/RESEARCH"
OUTBOUND_DIR="${LEGAL_BASE}/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND"
VENV="${PROJECT_ROOT}/.venv"
POLL_INTERVAL=3  # seconds for --auto mode

# ─── Defaults ─────────────────────────────────────────────────────────────────

MODE="interactive"
DOC_TYPE="settlement"
STRATEGIC=false
NOTIFY=false
JSON_OUTPUT=false
TARGET_FILE=""
MIN_CONSENSUS=85  # percentage threshold to pass

# ─── Colours ──────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ─── Parse args ───────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case "$1" in
        --auto)         MODE="auto";       shift ;;
        --drafts)       MODE="drafts";     shift ;;
        --save-research) MODE="research";  shift ;;
        --file|-f)      MODE="file"; TARGET_FILE="$2"; shift 2 ;;
        --type|-t)      DOC_TYPE="$2";     shift 2 ;;
        --strategic|-s) STRATEGIC=true;    shift ;;
        --notify|-n)    NOTIFY=true;       shift ;;
        --json|-j)      JSON_OUTPUT=true;  shift ;;
        --min-consensus) MIN_CONSENSUS="$2"; shift 2 ;;
        --help|-h)
            head -28 "$0" | tail -20
            exit 0
            ;;
        *)
            # Allow bare positional arg as file path (normalize with validation-runner.sh)
            if [[ -f "$1" ]]; then
                MODE="file"
                TARGET_FILE="$1"
                shift
            else
                echo -e "${RED}Unknown option: $1${RESET}" >&2
                exit 2
            fi
            ;;
    esac
done

# ─── Preflight checks ────────────────────────────────────────────────────────

check_dependencies() {
    local missing=()

    if [[ "$(uname)" != "Darwin" ]]; then
        echo -e "${YELLOW}⚠ Not macOS — Mail.app integration disabled; --file mode only${RESET}"
        if [[ "$MODE" != "file" && "$MODE" != "auto" ]]; then
            MODE="file"
        fi
    fi

    command -v python3 >/dev/null 2>&1 || missing+=("python3")
    command -v osascript >/dev/null 2>&1 || true  # only on macOS

    if [[ -d "$VENV" ]]; then
        # shellcheck disable=SC1091
        source "${VENV}/bin/activate" 2>/dev/null || true
    elif [[ -d "${PROJECT_ROOT}/venv" ]]; then
        source "${PROJECT_ROOT}/venv/bin/activate" 2>/dev/null || true
    fi

    python3 -c "import click" 2>/dev/null || missing+=("click (pip install click)")
    python3 -c "import textual" 2>/dev/null || missing+=("textual (pip install textual)")

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo -e "${RED}Missing dependencies: ${missing[*]}${RESET}"
        echo "Run: pip install click textual python-dotenv"
        exit 2
    fi

    mkdir -p "$CAPTURE_DIR" "$REPORT_DIR"
}

# ─── AppleScript: list Mail.app drafts ────────────────────────────────────────

list_drafts() {
    osascript <<'APPLESCRIPT' 2>/dev/null || echo "[]"
tell application "Mail"
    set draftList to ""
    set draftMessages to messages of drafts mailbox
    repeat with i from 1 to count of draftMessages
        set msg to item i of draftMessages
        set subj to subject of msg
        set recip to ""
        try
            set recip to address of first to recipient of msg
        end try
        set draftList to draftList & i & "│" & subj & "│" & recip & linefeed
    end repeat
    return draftList
end tell
APPLESCRIPT
}

# ─── AppleScript: extract draft content by index ─────────────────────────────

extract_draft() {
    local idx="$1"
    local outpath="$2"
    osascript -e "
tell application \"Mail\"
    set msg to item ${idx} of (messages of drafts mailbox)
    set subj to subject of msg
    set body to content of msg
    set sender to \"\"
    try
        set sender to sender of msg
    end try
    set recip to \"\"
    try
        set recip to address of first to recipient of msg
    end try
    set dateStr to date sent of msg as string

    set output to \"Subject: \" & subj & return
    set output to output & \"From: \" & sender & return
    set output to output & \"To: \" & recip & return
    set output to output & \"Date: \" & dateStr & return
    set output to output & return & body

    return output
end tell
" > "$outpath" 2>/dev/null
}

# ─── AppleScript: extract selected messages (for research saving) ─────────────

extract_selected_messages() {
    local dest_dir="$1"
    osascript -e "
tell application \"Mail\"
    set selectedMsgs to selection
    set savedCount to 0
    repeat with msg in selectedMsgs
        set subj to subject of msg
        set body to content of msg

        -- Sanitise subject for filename
        set cleanSubj to do shell script \"echo \" & quoted form of subj & \" | tr '/:\\\\\\\\' '-' | head -c 80\"

        -- Categorise
        set targetFolder to \"MISC/\"
        if subj contains \"Scholar\" or subj contains \"case\" or subj contains \"citation\" then
            set targetFolder to \"CASE-LAW/\"
        else if subj contains \"statute\" or subj contains \"N.C.G.S\" or subj contains \"§\" then
            set targetFolder to \"STATUTES/\"
        else if subj contains \"settlement\" or subj contains \"offer\" then
            set targetFolder to \"ANALYSIS/\"
        end if

        set outPath to \"${dest_dir}/\" & targetFolder & cleanSubj & \".eml\"
        do shell script \"mkdir -p '${dest_dir}'/\" & targetFolder
        do shell script \"echo \" & quoted form of body & \" > \" & quoted form of outPath

        set savedCount to savedCount + 1
    end repeat
    return (savedCount as string) & \" messages saved\"
end tell
" 2>/dev/null
}

# ─── Detect doc type from content ─────────────────────────────────────────────

detect_doc_type() {
    local file="$1"
    local content
    content=$(cat "$file" 2>/dev/null || echo "")
    local lower
    lower=$(echo "$content" | tr '[:upper:]' '[:lower:]')

    if echo "$lower" | grep -q "settlement deadline\|settlement offer\|settlement proposal"; then
        echo "settlement"
    elif echo "$lower" | grep -q "respectfully submitted\|motion to\|court filing"; then
        echo "court"
    elif echo "$lower" | grep -q "request for production\|interrogator\|discovery"; then
        echo "discovery"
    else
        echo "settlement"  # default
    fi
}

# ─── Run validation pipeline ─────────────────────────────────────────────────

run_validation() {
    local eml_file="$1"
    local doc_type="$2"
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    local report_file="${REPORT_DIR}/validation-${timestamp}.json"
    local exit_code=0

    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
    echo -e "${BOLD}  ADVOCACY PIPELINE — PRE-SEND VALIDATION                     ${RESET}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
    echo -e "${DIM}  File: $(basename "$eml_file")${RESET}"
    echo -e "${DIM}  Type: ${doc_type}${RESET}"
    echo -e "${DIM}  Mode: $([ "$STRATEGIC" = true ] && echo '33-role strategic' || echo '21-role standard')${RESET}"
    echo -e "${DIM}  Time: $(date '+%Y-%m-%d %H:%M:%S')${RESET}"
    echo -e "${BOLD}───────────────────────────────────────────────────────────────${RESET}"

    # ── Step 1: Signature Block Validation ──
    echo -e "\n${CYAN}[1/4] Signature Block Validation${RESET}"
    local sig_result=0
    if [[ -f "${PROJECT_ROOT}/signature_block_validator.py" ]]; then
        python3 "${PROJECT_ROOT}/signature_block_validator.py" \
            --file "$eml_file" \
            --type "$doc_type" \
            --json > "${CAPTURE_DIR}/sig-result.json" 2>/dev/null || sig_result=$?

        if [[ $sig_result -eq 0 ]]; then
            echo -e "  ${GREEN}✅ Signature block VALID${RESET}"
        else
            echo -e "  ${RED}❌ Signature block INVALID${RESET}"
            if [[ -f "${CAPTURE_DIR}/sig-result.json" ]]; then
                python3 -c "
import json, sys
try:
    data = json.load(open('${CAPTURE_DIR}/sig-result.json'))
    for field in data.get('signature', {}).get('missing_fields', []):
        print(f'     ⚠ Missing: {field}')
    for sug in data.get('signature', {}).get('suggestions', []):
        print(f'     💡 {sug}')
except: pass
" 2>/dev/null
            fi
            exit_code=1
        fi
    else
        echo -e "  ${YELLOW}⚠ signature_block_validator.py not found — skipping${RESET}"
    fi

    # ── Step 2: Governance Council Validation ──
    echo -e "\n${CYAN}[2/4] Governance Council Validation${RESET}"

    local council_script
    if [[ "$STRATEGIC" = true ]]; then
        council_script="
import json, sys
sys.path.insert(0, '${PROJECT_ROOT}')
sys.path.insert(0, '${PROJECT_ROOT}/vibesthinker')
try:
    from vibesthinker.governance_council_33_roles import GovernanceCouncil33
    council = GovernanceCouncil33()
    content = open('${eml_file}', 'r').read()
    report = council.validate_document(content, doc_type='${doc_type}')
    # Print summary
    pct = report.get('consensus_percentage', 0)
    verdict = report.get('overall_verdict', 'UNKNOWN')
    passed = report.get('checks_passed', 0)
    total = report.get('checks_total', 0)
    print(json.dumps({
        'consensus_percentage': pct,
        'overall_verdict': verdict,
        'checks_passed': passed,
        'checks_total': total,
        'strategic_roles': {k: {'verdict': v.get('verdict'), 'confidence': v.get('confidence')}
                           for k, v in report.get('strategic_roles', {}).items()},
        'temporal': report.get('temporal', {}),
        'systemic': report.get('systemic', {}),
        'recommendations': report.get('recommendations', []),
    }, indent=2))
except Exception as e:
    print(json.dumps({'error': str(e), 'consensus_percentage': 0, 'overall_verdict': 'ERROR'}))
"
    else
        council_script="
import json, sys
sys.path.insert(0, '${PROJECT_ROOT}')
sys.path.insert(0, '${PROJECT_ROOT}/vibesthinker')
try:
    from vibesthinker.governance_council import GovernanceCouncil
    council = GovernanceCouncil()
    content = open('${eml_file}', 'r').read()
    report = council.run_full_validation(content, doc_type='${doc_type}')
    pct = report.get('consensus_percentage', 0)
    verdict = report.get('overall_verdict', 'UNKNOWN')
    passed = report.get('checks_passed', 0)
    total = report.get('checks_total', 0)
    print(json.dumps({
        'consensus_percentage': pct,
        'overall_verdict': verdict,
        'checks_passed': passed,
        'checks_total': total,
    }, indent=2))
except Exception as e:
    print(json.dumps({'error': str(e), 'consensus_percentage': 0, 'overall_verdict': 'ERROR'}))
"
    fi

    local council_json
    council_json=$(python3 -c "$council_script" 2>/dev/null || echo '{"consensus_percentage":0,"overall_verdict":"ERROR","error":"Python execution failed"}')

    local consensus
    consensus=$(echo "$council_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('consensus_percentage',0))" 2>/dev/null || echo "0")
    local council_verdict
    council_verdict=$(echo "$council_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('overall_verdict','ERROR'))" 2>/dev/null || echo "ERROR")
    local checks_passed
    checks_passed=$(echo "$council_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('checks_passed',0))" 2>/dev/null || echo "0")
    local checks_total
    checks_total=$(echo "$council_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('checks_total',0))" 2>/dev/null || echo "0")

    # Display consensus bar
    local bar_width=40
    local filled
    filled=$(python3 -c "print(int(${consensus} / 100 * ${bar_width}))" 2>/dev/null || echo "0")
    local empty=$((bar_width - filled))
    local bar=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++)); do bar+="░"; done

    local colour="$RED"
    if (( $(echo "$consensus >= 90" | bc -l 2>/dev/null || echo 0) )); then
        colour="$GREEN"
    elif (( $(echo "$consensus >= 75" | bc -l 2>/dev/null || echo 0) )); then
        colour="$YELLOW"
    fi

    echo -e "  ${colour}${bar} ${consensus}%${RESET}  (${checks_passed}/${checks_total} checks)"
    echo -e "  Verdict: ${colour}${council_verdict}${RESET}"

    if (( $(echo "$consensus < $MIN_CONSENSUS" | bc -l 2>/dev/null || echo 1) )); then
        exit_code=1
    fi

    # Display recommendations if available
    local recs
    recs=$(echo "$council_json" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for rec in data.get('recommendations', [])[:5]:
        print(f'  {rec}')
except: pass
" 2>/dev/null || true)
    if [[ -n "$recs" ]]; then
        echo -e "\n${CYAN}  Recommendations:${RESET}"
        echo "$recs"
    fi

    # ── Step 3: Temporal Validation (strategic mode only) ──
    echo -e "\n${CYAN}[3/4] Temporal Validation${RESET}"
    if [[ "$STRATEGIC" = true ]]; then
        local temporal_info
        temporal_info=$(echo "$council_json" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    t = data.get('temporal', {})
    errors = t.get('date_arithmetic_errors', [])
    mismatches = t.get('calendar_mismatches', [])
    deadlines = t.get('deadline_calculations', {})
    bdays = t.get('business_days', 0)
    valid = t.get('is_valid', True)
    if not valid:
        print('  ❌ TEMPORAL ISSUES FOUND:')
        for e in errors[:3]:
            print(f'     ⚠ {e}')
        for m in mismatches[:3]:
            print(f'     📅 {m}')
    else:
        print('  ✅ All dates and deadlines verified')
    for name, info in deadlines.items():
        days = info.get('days_remaining', '?')
        bd = info.get('business_days', '?')
        past = info.get('is_past', False)
        icon = '🔴' if past else '🟢'
        print(f'     {icon} {name}: {info.get(\"date\",\"?\")} ({days}d / {bd} business days){\" ← PAST\" if past else \"\"}')
except Exception as e:
    print(f'  ⚠ Temporal data unavailable: {e}')
" 2>/dev/null || echo "  ⚠ Temporal analysis not available")
        echo "$temporal_info"
    else
        echo -e "  ${DIM}(run with --strategic for temporal validation)${RESET}"
    fi

    # ── Step 4: ROAM Risk Classification ──
    echo -e "\n${CYAN}[4/4] ROAM Risk Classification${RESET}"
    local content_lower
    content_lower=$(tr '[:upper:]' '[:lower:]' < "$eml_file" 2>/dev/null || echo "")

    local roam_class="ACCEPTED"
    local roam_icon="🟡"

    if echo "$content_lower" | grep -qE "no response|ignor|delay|cancel|fail"; then
        roam_class="MITIGATED"
        roam_icon="🟠"
    fi
    if echo "$content_lower" | grep -qE "systemic|pattern|deliberate|policy|organizational"; then
        roam_class="OWNED"
        roam_icon="🔴"
    fi
    if echo "$content_lower" | grep -qE "resolved|complete|agreed|settled"; then
        roam_class="RESOLVED"
        roam_icon="🟢"
    fi

    # Detect risk type
    local risk_type="SITUATIONAL"
    if echo "$content_lower" | grep -qE "pattern|systemic|organizational|policy|culture|institutional"; then
        risk_type="SYSTEMIC"
    elif echo "$content_lower" | grep -qE "deliberate|strategic|calculated|intentional"; then
        risk_type="STRATEGIC"
    fi

    echo -e "  ${roam_icon} ROAM: ${roam_class}"
    echo -e "  Risk Type: ${risk_type} (Situational → Strategic → Systemic)"

    # ── Final Verdict ──
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
    if [[ $exit_code -eq 0 ]]; then
        echo -e "  ${GREEN}${BOLD}✅ PRE-SEND VALIDATION: PASSED${RESET}"
        echo -e "  ${GREEN}Email is safe to send.${RESET}"
    else
        echo -e "  ${RED}${BOLD}❌ PRE-SEND VALIDATION: FAILED${RESET}"
        echo -e "  ${RED}Review issues above before sending.${RESET}"
    fi
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
    echo ""

    # ── Save report ──
    echo "$council_json" > "$report_file"
    echo -e "${DIM}Report saved: ${report_file}${RESET}"

    # ── JSON output ──
    if [[ "$JSON_OUTPUT" = true ]]; then
        echo "$council_json"
    fi

    # ── Telegram notification ──
    if [[ "$NOTIFY" = true ]]; then
        local event="validation_passed"
        if [[ $exit_code -ne 0 ]]; then
            event="validation_failed"
        fi
        if [[ -f "${PROJECT_ROOT}/telegram_notifier.py" ]]; then
            python3 "${PROJECT_ROOT}/telegram_notifier.py" \
                --event "$event" \
                --details "Consensus: ${consensus}% | Verdict: ${council_verdict} | File: $(basename "$eml_file")" \
                2>/dev/null || echo -e "${YELLOW}⚠ Telegram notification failed (check .env)${RESET}"
        fi
    fi

    return $exit_code
}

# ─── Mode: Interactive (pick from Mail.app drafts) ────────────────────────────

mode_interactive() {
    echo -e "${BOLD}📧 Mail.app Draft Picker${RESET}"
    echo -e "${DIM}Fetching drafts from Mail.app...${RESET}"

    local drafts_raw
    drafts_raw=$(list_drafts)

    if [[ -z "$drafts_raw" || "$drafts_raw" == "[]" ]]; then
        echo -e "${YELLOW}No drafts found in Mail.app.${RESET}"
        echo "Options:"
        echo "  1. Save an .eml to ${CAPTURE_DIR}/ and use --auto"
        echo "  2. Use --file /path/to/email.eml"
        exit 2
    fi

    echo ""
    echo -e "${BOLD}  #  │ Subject                                      │ Recipient${RESET}"
    echo -e "  ───┼──────────────────────────────────────────────┼──────────────────────"

    local idx=0
    while IFS='│' read -r num subject recipient; do
        [[ -z "$num" ]] && continue
        idx=$((idx + 1))
        printf "  %-3s│ %-48s│ %s\n" "$num" "${subject:0:48}" "${recipient:0:30}"
    done <<< "$drafts_raw"

    echo ""
    read -r -p "Select draft number (or 'q' to quit): " choice

    if [[ "$choice" == "q" || -z "$choice" ]]; then
        echo "Cancelled."
        exit 0
    fi

    local eml_file="${CAPTURE_DIR}/draft-${choice}-$(date +%Y%m%d-%H%M%S).eml"
    echo -e "${DIM}Extracting draft #${choice}...${RESET}"
    extract_draft "$choice" "$eml_file"

    if [[ ! -s "$eml_file" ]]; then
        echo -e "${RED}Failed to extract draft.${RESET}"
        exit 3
    fi

    local detected_type
    detected_type=$(detect_doc_type "$eml_file")
    echo -e "${DIM}Detected type: ${detected_type}${RESET}"

    run_validation "$eml_file" "${DOC_TYPE:-$detected_type}"
}

# ─── Mode: File (validate a specific .eml) ────────────────────────────────────

mode_file() {
    if [[ ! -f "$TARGET_FILE" ]]; then
        echo -e "${RED}File not found: ${TARGET_FILE}${RESET}"
        exit 2
    fi

    local detected_type
    detected_type=$(detect_doc_type "$TARGET_FILE")

    run_validation "$TARGET_FILE" "${DOC_TYPE:-$detected_type}"
}

# ─── Mode: Auto (watch directory for new .eml files) ──────────────────────────

mode_auto() {
    local watch_dirs=(
        "$CAPTURE_DIR"
        "${HOME}/Desktop"
        "${OUTBOUND_DIR}/01-OPPOSING-COUNSEL"
        "${OUTBOUND_DIR}/04-SETTLEMENT-OFFERS"
    )

    echo -e "${BOLD}👁 Auto-watch mode${RESET}"
    echo -e "${DIM}Watching for new .eml files (Ctrl+C to stop)${RESET}"
    echo ""
    for dir in "${watch_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            echo -e "  📁 ${dir}"
        fi
    done
    echo ""

    # Track processed files
    declare -A processed

    while true; do
        for dir in "${watch_dirs[@]}"; do
            [[ -d "$dir" ]] || continue
            while IFS= read -r -d '' eml_file; do
                local file_key
                file_key=$(stat -f "%m" "$eml_file" 2>/dev/null || stat -c "%Y" "$eml_file" 2>/dev/null || echo "0")
                file_key="${eml_file}:${file_key}"

                if [[ -z "${processed[$file_key]+_}" ]]; then
                    processed[$file_key]=1
                    echo -e "${CYAN}📨 New file detected: $(basename "$eml_file")${RESET}"

                    local detected_type
                    detected_type=$(detect_doc_type "$eml_file")

                    run_validation "$eml_file" "${DOC_TYPE:-$detected_type}" || true
                    echo ""
                fi
            done < <(find "$dir" -maxdepth 1 -name "*.eml" -newer "$CAPTURE_DIR/.last-scan" -print0 2>/dev/null || find "$dir" -maxdepth 1 -name "*.eml" -print0 2>/dev/null)
        done

        touch "$CAPTURE_DIR/.last-scan"
        sleep "$POLL_INTERVAL"
    done
}

# ─── Mode: List drafts ───────────────────────────────────────────────────────

mode_drafts() {
    echo -e "${BOLD}📋 Mail.app Drafts${RESET}"
    echo ""

    local drafts_raw
    drafts_raw=$(list_drafts)

    if [[ -z "$drafts_raw" || "$drafts_raw" == "[]" ]]; then
        echo -e "${YELLOW}No drafts in Mail.app.${RESET}"
        exit 0
    fi

    echo -e "${BOLD}  #  │ Subject                                      │ Recipient${RESET}"
    echo -e "  ───┼──────────────────────────────────────────────┼──────────────────────"
    while IFS='│' read -r num subject recipient; do
        [[ -z "$num" ]] && continue
        printf "  %-3s│ %-48s│ %s\n" "$num" "${subject:0:48}" "${recipient:0:30}"
    done <<< "$drafts_raw"

    echo ""
    echo -e "${DIM}Use: ./scripts/mail-capture-validate.sh  (interactive mode to pick one)${RESET}"
}

# ─── Mode: Save research emails ──────────────────────────────────────────────

mode_research() {
    echo -e "${BOLD}📚 Save Selected Emails to Research Directory${RESET}"
    echo -e "${DIM}Select emails in Mail.app first, then press Enter.${RESET}"
    echo ""

    if [[ ! -d "$RESEARCH_DIR" ]]; then
        echo -e "${YELLOW}Creating research directory: ${RESEARCH_DIR}${RESET}"
        mkdir -p "${RESEARCH_DIR}/CASE-LAW" "${RESEARCH_DIR}/STATUTES" "${RESEARCH_DIR}/ANALYSIS" "${RESEARCH_DIR}/MISC"
    fi

    read -r -p "Press Enter when emails are selected in Mail.app... "

    local result
    result=$(extract_selected_messages "$RESEARCH_DIR")
    echo -e "${GREEN}✅ ${result}${RESET}"
    echo -e "${DIM}Files in: ${RESEARCH_DIR}/${RESET}"

    # List what was saved
    echo ""
    find "$RESEARCH_DIR" -name "*.eml" -newer "$CAPTURE_DIR/.last-research" -type f 2>/dev/null | while read -r f; do
        echo -e "  📄 $(basename "$f")"
    done
    touch "$CAPTURE_DIR/.last-research"
}

# ─── Main ─────────────────────────────────────────────────────────────────────

main() {
    check_dependencies

    case "$MODE" in
        interactive) mode_interactive ;;
        file)        mode_file ;;
        auto)        mode_auto ;;
        drafts)      mode_drafts ;;
        research)    mode_research ;;
        *)
            echo -e "${RED}Unknown mode: ${MODE}${RESET}"
            exit 2
            ;;
    esac
}

main "$@"
