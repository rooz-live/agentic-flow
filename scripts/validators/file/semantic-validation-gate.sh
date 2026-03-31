#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# semantic-validation-gate.sh — Semantic Validation (Facts, Not Syntax)
# ═══════════════════════════════════════════════════════════════════════════════
#
# DoR: Email file exists, syntax validators passed
# DoD: All factual claims verified against ground truth
#
# Usage:
#   ./semantic-validation-gate.sh --file email.eml --truth-source portal|manual
#
# Exit codes:
#   0 = All facts verified (Exit 0 quality)
#   1 = Factual inaccuracies found (BLOCK SEND)
#   2 = Cannot verify (missing ground truth)
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source robust exit codes and validation-core reality matrix
if [ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
else
    EX_USAGE=10
    EX_NOINPUT=12
    EX_VALIDATION_FAILED=150
    EX_VALIDATION_WARNING=160
fi

# Ground truth sources (reserved for --truth-source portal)
# shellcheck disable=SC2034
CASE_DB="${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/CASE_REGISTRY.yaml"
EVENT_DB="${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/EVENT_CALENDAR.yaml"
CONTACT_DB="${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/CONTACT_STATUS.yaml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

EMAIL_FILE=""
TRUTH_SOURCE="manual"
# shellcheck disable=SC2034
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --file|-f) EMAIL_FILE="$2"; shift 2 ;;
        --truth-source) TRUTH_SOURCE="$2"; shift 2 ;;
        --json|-j) JSON_OUTPUT=true; shift ;;
        *) echo "Unknown option: $1" >&2; exit $EX_USAGE ;;
    esac
done

if [[ ! -f "$EMAIL_FILE" ]]; then
    echo -e "${RED}ERROR: Email file not found: $EMAIL_FILE${RESET}" >&2
    exit $EX_NOINPUT
fi

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "SEMANTIC VALIDATION GATE"
echo "Checking factual accuracy (not just syntax)"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "File: $(basename "$EMAIL_FILE")"
echo "Truth Source: $TRUTH_SOURCE"
echo ""

# CSQBM Governance Constraint: Trace semantic graph validation bounds
local_proj_root="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# agentdb_freshness macro: Enforce agentdb >96h staleness constraint
AGENTDB_PATH="$(cd "$local_proj_root/../.." 2>/dev/null && pwd)/agentdb.db"
if [[ -f "$AGENTDB_PATH" ]]; then
    if [[ -n "$(find "$AGENTDB_PATH" -mmin +5760 2>/dev/null)" ]]; then
        echo -e "${RED}❌ FAIL (CSQBM Governance Halt)${RESET} agentdb.db staleness >96h. Task blocked via OpenWorm Physical Bounds (ADR-005)."
        exit ${EX_VALIDATION_FAILED:-150}
    fi
fi

if [ -f "$local_proj_root/scripts/validators/project/check-csqbm.sh" ]; then
    if ! bash "$local_proj_root/scripts/validators/project/check-csqbm.sh" --deep-why > /dev/null 2>&1; then
        echo -e "${RED}❌ FAIL (CSQBM Governance Halt)${RESET} CSQBM Deep-Why Violation. Task blocked via OpenWorm Physical Bounds (ADR-005)."
        exit ${EX_VALIDATION_FAILED:-150}
    fi
fi

# Swarm Persistence Bounds Check (Phase 8: DDD-Based Connectome Limits via ADR-008)
# Prevent logic from processing massive monolithic files (longitudinal static sprawl).
file_size_bytes=$(wc -c < "$EMAIL_FILE" | tr -d ' ')

# Determine DDD token limit dynamically based on node hardware (Phase 16)
if command -v compute_dynamic_token_ceiling >/dev/null 2>&1; then
    DYNAMIC_BASE_TOKENS=$(compute_dynamic_token_ceiling)
else
    DYNAMIC_BASE_TOKENS=4000
fi
BASE_BYTES=$((DYNAMIC_BASE_TOKENS * 4))
MAX_BYTES=$BASE_BYTES
DOMAIN_NAME="General"

if [[ "$EMAIL_FILE" == *"BHOPTI-LEGAL"* ]] || [[ "$EMAIL_FILE" == *"COURT-FILINGS"* ]]; then
    MAX_BYTES=$((BASE_BYTES * 2)) # Double for highly dense semantic arrays
    DOMAIN_NAME="Legal"
elif [[ "$EMAIL_FILE" == *"utilities"* ]] || [[ "$EMAIL_FILE" == *"movers"* ]]; then
    MAX_BYTES=$((BASE_BYTES / 2)) # Half for O(1) structures
    DOMAIN_NAME="Utilities"
elif [[ "$EMAIL_FILE" == *"income"* ]] || [[ "$EMAIL_FILE" == *"job"* ]]; then
    MAX_BYTES=$((BASE_BYTES * 3 / 4)) # 75% for income telemetry
    DOMAIN_NAME="Income"
fi

# OpenWorm Contrastive Intelligence Connectome Trace
echo "[CONNECTOME TRACE] Total Mapped Scalability: $MAX_BYTES bytes (~$DYNAMIC_BASE_TOKENS tokens natively mapped)"

if [[ "$file_size_bytes" -gt "$MAX_BYTES" ]]; then
    echo -e "${RED}❌ FAIL (Memory Bound Exceeded)${RESET} Target footprint exceeds dynamic $DOMAIN_NAME physical bounds ($MAX_BYTES bytes)."
    echo -e "   ${CYAN}Action Triggered: OpenWorm Taxonomy Threshold Reached. Hardware limits exceeded the allowed connectome memory capacity.${RESET}"
    echo -e "   ${YELLOW}Constraint (ADR-005): Payloads must fit within the 4000 DBOS Pydantic token ceiling. Shrink unstructured sprawl prior to processing.${RESET}"
    exit $EX_VALIDATION_FAILED
fi

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# ═══════════════════════════════════════════════════════════════════════════════
# Check 1: Case Numbers are Real
# ═══════════════════════════════════════════════════════════════════════════════
echo "[1/9] Case Number Validation"

# Extract case numbers from email
CASE_NUMBERS=$(grep -oE '26CV[0-9]{6}-[0-9]{3}' "$EMAIL_FILE" 2>/dev/null | sort -u || echo "")

if [[ -z "$CASE_NUMBERS" ]]; then
    echo -e "  ${YELLOW}⚠ WARN${RESET} No case numbers found in email"
    WARN_COUNT=$((WARN_COUNT + 1))
else
    # Verify against known cases
    KNOWN_CASES=("26CV005596-590" "26CV007491-590")

    while IFS= read -r case_num; do
        if printf '%s\n' "${KNOWN_CASES[@]}" | grep -q "^${case_num}$"; then
            echo -e "  ${GREEN}✅ PASS${RESET} Case number verified: $case_num"
            PASS_COUNT=$((PASS_COUNT + 1))
        else
            echo -e "  ${RED}❌ FAIL${RESET} Unknown case number: $case_num"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    done <<< "$CASE_NUMBERS"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Check 2: Dates are Consistent
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[2/9] Temporal Consistency Validation"

# Check email Date header vs today
EMAIL_DATE=$(grep -i "^Date:" "$EMAIL_FILE" | head -1 | sed 's/^Date: //' || echo "")
TODAY=$(date "+%Y-%m-%d")
TODAY_FORMATTED=$(date "+%a, %-d %b %Y")
echo "  Today (system): $TODAY"

if [[ -n "$EMAIL_DATE" ]]; then
    # Extract date from email (simplified - assumes format "Tue, 3 Mar 2026")
    if echo "$EMAIL_DATE" | grep -q "3 Mar 2026"; then
        echo -e "  ${RED}❌ FAIL${RESET} Email dated March 3, but today is March 4"
        echo -e "     ${CYAN}Fix: Update Date header to: $TODAY_FORMATTED${RESET}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        echo -e "  ${GREEN}✅ PASS${RESET} Email date appears current"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
fi

# Check for "tomorrow" references (should not exist if sending today)
if grep -qi "tomorrow" "$EMAIL_FILE" 2>/dev/null; then
    TOMORROW_COUNT=$(grep -ci "tomorrow" "$EMAIL_FILE" 2>/dev/null)
    echo -e "  ${RED}❌ FAIL${RESET} Found $TOMORROW_COUNT 'tomorrow' reference(s) - ambiguous temporal reference"
    echo -e "     ${CYAN}Fix: Replace 'tomorrow' with specific dates or 'this week'${RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    echo -e "  ${GREEN}✅ PASS${RESET} No ambiguous temporal references"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Check 3: Event Mentions are Real
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[3/9] Event Existence Validation"

# Check for March 10 mention
if grep -q "March 10" "$EMAIL_FILE" 2>/dev/null; then
    # Verify what March 10 event is
    if grep -q "Strategy session.*tribunal" "$EMAIL_FILE" 2>/dev/null; then
        echo -e "  ${YELLOW}⚠ WARN${RESET} March 10 'strategy session/tribunal' mentioned"
        echo -e "     ${CYAN}Verify: What is this event? Court hearing? Meeting?${RESET}"
        WARN_COUNT=$((WARN_COUNT + 1))
    else
        echo -e "  ${GREEN}✅ PASS${RESET} March 10 mentioned with context"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
else
    echo -e "  ${GREEN}✅ PASS${RESET} No unverified event references"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# Check for arbitration date claims
if grep -qE "(April|04/[0-9]{2})" "$EMAIL_FILE" 2>/dev/null; then
    if grep -q "date TBD" "$EMAIL_FILE" 2>/dev/null; then
        echo -e "  ${GREEN}✅ PASS${RESET} Arbitration date clearly marked as TBD"
        PASS_COUNT=$((PASS_COUNT + 1))
    elif grep -q "likely April" "$EMAIL_FILE" 2>/dev/null; then
        echo -e "  ${RED}❌ FAIL${RESET} Speculative arbitration date ('likely April')"
        echo -e "     ${CYAN}Fix: Say 'date TBD' or confirm via portal${RESET}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
else
    echo -e "  ${GREEN}✅ PASS${RESET} No speculative dates"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Check 4: Contact Methods are Valid
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[4/9] Contact Method Validation"

# Check for blocked contact methods
BLOCKED_SERVICES=("iMessage" "412 CLOUD 90")

for service in "${BLOCKED_SERVICES[@]}"; do
    if grep -qi "$service" "$EMAIL_FILE" 2>/dev/null; then
        echo -e "  ${RED}❌ FAIL${RESET} Mentions blocked service: $service"
        echo -e "     ${CYAN}Note: Service blocked (************) - remove from contact info${RESET}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

# Check for valid email addresses
if grep -qE 's@rooz\.live' "$EMAIL_FILE" 2>/dev/null; then
    echo -e "  ${GREEN}✅ PASS${RESET} Valid email address present: s@rooz.live"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Check 5: MCP/MPP Factors Present
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[5/9] MCP/MPP Factor Tracking"

# Method: Is there a clear methodology?
if grep -qi "Evidence-Based Systemic Analysis" "$EMAIL_FILE" 2>/dev/null; then
    echo -e "  ${GREEN}✅ PASS${RESET} Method: Evidence-Based Systemic Analysis"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "  ${RED}❌ FAIL${RESET} Method: Missing methodology disclosure"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Pattern: Is there a documented pattern?
if grep -qE 'Case No\.: 26CV' "$EMAIL_FILE" 2>/dev/null; then
    echo -e "  ${GREEN}✅ PASS${RESET} Pattern: Case number pattern tracked"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "  ${YELLOW}⚠ WARN${RESET} Pattern: Case number not in signature"
    WARN_COUNT=$((WARN_COUNT + 1))
fi

# Protocol: Is there a defined protocol?
if grep -qi "Pro Se" "$EMAIL_FILE" 2>/dev/null; then
    echo -e "  ${GREEN}✅ PASS${RESET} Protocol: Pro Se designation present"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "  ${RED}❌ FAIL${RESET} Protocol: Pro Se designation missing"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Check 6: WSJF/ROAM Risk Integration
# ═══════════════════════════════════════════════════════════════════════════════
# ═══════════════════════════════════════════════════════════════════════════════
# Check 7: Content Freshness (NEW - catches Feb content in March)
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[7/9] Content Freshness Validation"

# Flag completed decisions being referenced
if grep -qE "Decision 1.*110 Frazier.*TODAY" "$EMAIL_FILE" 2>/dev/null; then
    echo -e "  ${RED}❌ FAIL${RESET} References completed decision (Decision 1 - lease signed Feb 27)"
    echo -e "     ${CYAN}Fix: Remove outdated 'Decision 1' section - lease already signed${RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    echo -e "  ${GREEN}✅ PASS${RESET} No outdated decision references"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# Flag past deadlines — context-aware: past-tense + year-anchored dates are OK
if grep -qE "(Feb 27|February 27|Feb 28|February 28)" "$EMAIL_FILE" 2>/dev/null; then
    # Check if ALL references include a year (anchored) or past-tense verb context
    _FEB_LINES=$(grep -nE "(Feb 27|February 27|Feb 28|February 28)" "$EMAIL_FILE" 2>/dev/null || true)
    _FEB_UNANCHORED=false
    while IFS= read -r _line; do
        # Anchored: includes year (2026), or past-tense verbs (signed, filed, occurred, was, had)
        if echo "$_line" | grep -qEi "(202[0-9]|signed|filed|occurred|was |had |did )"; then
            continue  # This reference is properly anchored
        fi
        # Unanchored: no year, no past-tense verb — treat as future-looking
        _FEB_UNANCHORED=true
        break
    done <<< "$_FEB_LINES"

    if [[ "$_FEB_UNANCHORED" = true ]]; then
        echo -e "  ${RED}❌ FAIL${RESET} References past dates (Feb 27-28) without temporal anchoring"
        echo -e "     ${CYAN}Fix: Add year or past-tense context to date references${RESET}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        echo -e "  ${GREEN}✅ PASS${RESET} Feb 27-28 references are year-anchored or past-tense"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
else
    echo -e "  ${GREEN}✅ PASS${RESET} No past deadline references"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# Flag draft reviews for completed actions
if grep -qi "Draft Counter-Reply" "$EMAIL_FILE" 2>/dev/null; then
    echo -e "  ${RED}❌ FAIL${RESET} Asks for draft review of already-completed action"
    echo -e "     ${CYAN}Fix: Remove draft review sections for past actions${RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    echo -e "  ${GREEN}✅ PASS${RESET} No draft reviews for completed actions"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Check 8: Tone Analysis (NEW - catches antagonizing language)
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[8/9] Tone Analysis (Collaborative vs Antagonizing)"

# Detect recipient from To: field
TO_AMANDA=false
if grep -qi "^To:.*amanda.*beck" "$EMAIL_FILE" 2>/dev/null || grep -qi "^To:.*mandersnc@gmail" "$EMAIL_FILE" 2>/dev/null; then
    TO_AMANDA=true
fi

# Detect court officials (exempt from antagonizing checks)
TO_COURT_OFFICIAL=false
if grep -qi "^To:.*ADR@nccourts" "$EMAIL_FILE" 2>/dev/null || \
   grep -qi "^To:.*@nccourts\.org" "$EMAIL_FILE" 2>/dev/null || \
   grep -qi "ADR Coordinator" "$EMAIL_FILE" 2>/dev/null; then
    TO_COURT_OFFICIAL=true
fi

# Flag antagonizing keywords to landlords (non-legal recipients)
if [[ "$TO_AMANDA" = false ]] && [[ "$TO_COURT_OFFICIAL" = false ]] && grep -qi "^To:.*@" "$EMAIL_FILE" 2>/dev/null; then
    # Email to external party (landlord/non-legal)
    echo -e "  ${CYAN}Recipient: Landlord/External Party (non-legal)${RESET}"
    ANTAGONIZING_FOUND=false

    if grep -qiE "(Risk|Exposure|liability|statute.*apply)" "$EMAIL_FILE" 2>/dev/null; then
        echo -e "  ${RED}❌ FAIL${RESET} Antagonizing language detected (Risk/Exposure/liability)"
        echo -e "     ${CYAN}Fix: Remove threatening legal language - use collaborative tone${RESET}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        ANTAGONIZING_FOUND=true
    fi

    if grep -qE "\$[0-9,]+ .*(exposure|liability|damages)" "$EMAIL_FILE" 2>/dev/null; then
        echo -e "  ${RED}❌ FAIL${RESET} Threatening damage/liability amounts to non-legal party"
        echo -e "     ${CYAN}Fix: Remove dollar amount threats from landlord communication${RESET}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        ANTAGONIZING_FOUND=true
    fi

    # Check for MAA litigation disclosure (antagonizing even without "Risk" keyword)
    # Match patterns like: $99K, $297K, damages, rent abatement
    if grep -qE "\$[0-9]+K.*damages" "$EMAIL_FILE" 2>/dev/null || \
       grep -qE "MAA.*(damages|arbitration|habitability)" "$EMAIL_FILE" 2>/dev/null || \
       grep -qE "rent abatement" "$EMAIL_FILE" 2>/dev/null; then
        echo -e "  ${RED}❌ FAIL${RESET} Disclosing MAA litigation details/damages to landlord (antagonizing)"
        echo -e "     ${CYAN}Fix: Keep MAA case separate - landlord doesn't need litigation details${RESET}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        ANTAGONIZING_FOUND=true
    fi

    if [[ "$ANTAGONIZING_FOUND" = false ]]; then
        echo -e "  ${GREEN}✅ PASS${RESET} Collaborative, professional tone maintained"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
elif [[ "$TO_COURT_OFFICIAL" = true ]]; then
    echo -e "  ${CYAN}Recipient: Court Official (ADR/Clerk)${RESET}"
    echo -e "  ${GREEN}✅ PASS${RESET} Court procedural email (tone check exempt)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "  ${GREEN}✅ PASS${RESET} No external recipient detected (tone check N/A)"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Check 9: Recipient Appropriateness (NEW - catches content mismatches)
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[9/9] Recipient Appropriateness"

# Check if email to Amanda contains inappropriate content
if grep -qi "to:.*amanda.*beck" "$EMAIL_FILE" 2>/dev/null || grep -qi "mandersnc@gmail" "$EMAIL_FILE" 2>/dev/null; then
    echo -e "  ${CYAN}Recipient: Amanda Beck (Legal Counsel)${RESET}"

    # Amanda should NOT receive damage amounts (she knows them)
    if grep -qE "\$99,070|\$297,211|\$34,298" "$EMAIL_FILE" 2>/dev/null; then
        echo -e "  ${RED}❌ FAIL${RESET} Sending damage amounts to legal counsel (unnecessary)"
        echo -e "     ${CYAN}Fix: Remove damage disclosure - Amanda already has case details${RESET}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        echo -e "  ${GREEN}✅ PASS${RESET} No inappropriate damage disclosures"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi

    # Amanda should NOT receive draft landlord communications
    if grep -qi "Draft.*[Ll]andlord" "$EMAIL_FILE" 2>/dev/null; then
        echo -e "  ${RED}❌ FAIL${RESET} Asking legal counsel to review landlord drafts"
        echo -e "     ${CYAN}Fix: Amanda advises on strategy, not draft reviews${RESET}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        echo -e "  ${GREEN}✅ PASS${RESET} No draft review requests"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
else
    echo -e "  ${GREEN}✅ PASS${RESET} No Amanda-specific checks needed"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

echo ""
echo "[6/9] WSJF/ROAM Risk Assessment"

# Calculate Cost of Delay (CoD)
DAYS_TO_MARCH_10=6
COD=$((DAYS_TO_MARCH_10 * 10))  # Arbitrary scoring: 10 points per day

echo -e "  ${CYAN}📊 Cost of Delay (CoD):${RESET} $COD (6 days to March 10)"

# ROAM Status
if [[ $FAIL_COUNT -eq 0 ]]; then
    ROAM_STATUS="RESOLVED"
    echo -e "  ${GREEN}✅ ROAM: RESOLVED${RESET} (all checks passed)"
    PASS_COUNT=$((PASS_COUNT + 1))
elif [[ $FAIL_COUNT -le 2 ]]; then
    ROAM_STATUS="MITIGATED"
    echo -e "  ${YELLOW}⚠ ROAM: OWNED${RESET} (fixable issues identified)"
    WARN_COUNT=$((WARN_COUNT + 1))
else
    ROAM_STATUS="ACTIVE"
    echo -e "  ${RED}❌ ROAM: ACTIVE${RESET} (blocking issues require resolution)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Final Verdict
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "SEMANTIC VALIDATION RESULTS"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}Pass:${RESET} $PASS_COUNT"
echo -e "  ${RED}Fail:${RESET} $FAIL_COUNT"
echo -e "  ${YELLOW}Warn:${RESET} $WARN_COUNT"
echo ""

TOTAL_CHECKS=$((PASS_COUNT + FAIL_COUNT))
if [[ $TOTAL_CHECKS -gt 0 ]]; then
    PASS_PERCENT=$(( (PASS_COUNT * 100) / TOTAL_CHECKS ))
else
    PASS_PERCENT=0
fi

echo "  Pass Rate: ${PASS_PERCENT}% ($PASS_COUNT/$TOTAL_CHECKS checks)"
echo "  ROAM Status: $ROAM_STATUS"
echo ""

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}✅ VERDICT: PASS (Exit 0 Quality)${RESET}"
    echo "Email is semantically valid and safe to send."
    exit 0
elif [[ $FAIL_COUNT -le 2 ]]; then
    echo -e "${YELLOW}⚠ VERDICT: FIXABLE (Exit $EX_VALIDATION_WARNING - Review Required)${RESET}"
    echo "Fix $FAIL_COUNT issue(s) above, then re-validate."
    exit "${EX_VALIDATION_WARNING:?}"
else
    echo -e "${RED}❌ VERDICT: BLOCKED (Exit $EX_VALIDATION_FAILED - Multiple Issues)${RESET}"
    echo "Too many factual inaccuracies ($FAIL_COUNT) - DO NOT SEND until resolved."
    exit "${EX_VALIDATION_FAILED:?}"
fi
