#!/usr/bin/env bash
# email-gate-lean.sh - Lean Email Validator (No Python Dependencies)
# Exit codes: 0=PASS, 1=BLOCKER, 2=WARNING, 3=DEPS_MISSING
# Usage:
#   ./email-gate-lean.sh --file email.eml [--json] [--min-score 85]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source robust exit codes
if [ -f "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh" ]; then
    source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh"
else
    EX_USAGE=10
    EX_NOINPUT=12
    EX_DEPS_MISSING=14
    EX_VALIDATION_FAILED=150
    EX_VALIDATION_WARNING=160
fi
# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Defaults
FILE=""
JSON_OUTPUT=false
MIN_SCORE=85
BLOCKERS=0
WARNINGS=0
SCORE=100

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        --file|-f) FILE="$2"; shift 2 ;;
        --json|-j) JSON_OUTPUT=true; shift ;;
        --min-score) MIN_SCORE="$2"; shift 2 ;;
        --help|-h)
            echo "Usage: $0 --file <email.eml> [--json] [--min-score 85]"
            echo ""
            echo "Email validation with Exit 0 (PASS), Exit 1 (BLOCKER), Exit 2 (WARNING)"
            exit 0
            ;;
        *) echo "Unknown option: $1" >&2; exit $EX_USAGE ;;
    esac
done

# Validate inputs
if [[ -z "$FILE" ]]; then
    echo "ERROR: --file required" >&2
    exit $EX_USAGE
fi

if [[ ! -f "$FILE" ]]; then
    echo "ERROR: File not found: $FILE" >&2
    exit $EX_NOINPUT
fi

# Track results for JSON output
declare -A RESULTS

# CSQBM Governance Constraint: Fast-pass payload validation boundary
AGENTDB_PATH="$(cd "$PROJECT_ROOT/../.." 2>/dev/null && pwd)/agentdb.db"
if [[ -f "$AGENTDB_PATH" ]]; then
    if [[ -n "$(find "$AGENTDB_PATH" -mmin +5760 2>/dev/null)" ]]; then
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${RED}❌ FAIL (CSQBM Governance Halt)${NC} agentdb.db staleness >96h. Task blocked via OpenWorm Physical Bounds (ADR-005)."
        exit ${EX_VALIDATION_FAILED:-150}
    fi
fi

if [ -f "$PROJECT_ROOT/scripts/validators/project/check-csqbm.sh" ]; then
    if ! bash "$PROJECT_ROOT/scripts/validators/project/check-csqbm.sh" --deep-why > /dev/null 2>&1; then
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${RED}❌ FAIL (CSQBM Governance Halt)${NC} CSQBM Deep-Why Violation. Task blocked via TurboQuant-DGM Physical Bounds (ADR-005)."
        exit ${EX_VALIDATION_FAILED:-150}
    fi
fi

# =============================================================================
# CHECK 0: DDD Connectome Bounds Check (BLOCKER)
# =============================================================================
check_ddd_connectome_bounds() {
    local file_size_bytes
    file_size_bytes=$(wc -c < "$FILE" | tr -d ' ')

    # ADR-005 / CSQBM TurboQuant-DGM Mapping
    local max_bytes=32000 # 8000 Tokens * 4 Bytes natively bounded
    local domain_name="General"

    if [[ "$FILE" == *"BHOPTI-LEGAL"* ]] || [[ "$FILE" == *"COURT-FILINGS"* ]]; then
        max_bytes=64000 # Doubled for maximum orchestration
        domain_name="Legal"
    elif [[ "$FILE" == *"utilities"* ]] || [[ "$FILE" == *"movers"* ]]; then
        max_bytes=16000
        domain_name="Utilities"
    elif [[ "$FILE" == *"income"* ]] || [[ "$FILE" == *"job"* ]]; then
        max_bytes=24000
        domain_name="Income"
    fi

    if [[ "$file_size_bytes" -gt "$max_bytes" ]]; then
        RESULTS[bounds]="FAIL|$domain_name Domain bounds exceeded ($file_size_bytes > $max_bytes bytes)"
        ((BLOCKERS++))
        SCORE=$((SCORE - 40))
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${RED}✗ BLOCKER: $domain_name Domain payload too large (${file_size_bytes}B > ${max_bytes}B)${NC}"
        [[ "$JSON_OUTPUT" == false ]] && echo -e "   ${YELLOW}Constraint (ADR-005): Payloads must fit within the 8000 DBOS Pydantic token ceiling (~$max_bytes bytes). Shrink unstructured sprawl prior to processing.${NC}"
        return 1
    else
        RESULTS[bounds]="PASS|$domain_name Domain bounds respected ($file_size_bytes bytes)"
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${GREEN}✓ $domain_name Domain boundaries passed${NC}"
        return 0
    fi
}

# CHECK 1: Placeholder Detection (BLOCKER)
check_placeholders() {
    local patterns=(
        '@example\.com'
        '\[YOUR_EMAIL\]'
        '\[YOUR_PHONE\]'
        '\[AMANDA_EMAIL\]'
        '\[AMANDA_PHONE\]'
        'shahrooz@example\.com'
        'gary@example\.com'
    )

    local found=false
    local details=""

    for pattern in "${patterns[@]}"; do
        if grep -qE "$pattern" "$FILE" 2>/dev/null; then
            found=true
            details+="$pattern "
        fi
    done

    if [[ "$found" == "true" ]]; then
        RESULTS[placeholder]="FAIL|Placeholders found: $details"
        ((BLOCKERS++))
        SCORE=$((SCORE - 30))
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${RED}✗ BLOCKER: Placeholders found${NC}"
        return 1
    else
        RESULTS[placeholder]="PASS|No placeholders"
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${GREEN}✓ Placeholder check passed${NC}"
        return 0
    fi
}

# CHECK 2: Contact Info (BLOCKER for legal emails)
check_contact_info() {
    local is_legal=false

    # Legal email if case number present
    if grep -qE '26CV[0-9]{6}' "$FILE" 2>/dev/null; then
        is_legal=true
    fi

    # Accept multiple formats:
    # - Phone: (*************, ************, 412-CLOUD-90
    # - Redacted: ************ (10+ asterisks)
    # - Email: s@rooz.live, shahrooz@bhopti.com
    if grep -qE '\([0-9]{3}\) [0-9]{3}-[0-9]{4}|[0-9]{3}-[0-9]{3}-[0-9]{4}|[0-9]{3}-[A-Z]{5}-[0-9]{2}|\*{10,}|s@rooz\.live|shahrooz@bhopti\.com' "$FILE" 2>/dev/null; then
        RESULTS[contact]="PASS|Contact info present"
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${GREEN}✓ Contact info present${NC}"
        return 0
    else
        if [[ "$is_legal" == true ]]; then
            RESULTS[contact]="FAIL|Legal email missing contact info"
            ((BLOCKERS++))
            SCORE=$((SCORE - 30))
            [[ "$JSON_OUTPUT" == false ]] && echo -e "${RED}✗ BLOCKER: Legal email missing contact info${NC}"
            return 1
        else
            RESULTS[contact]="WARN|Contact info not detected (non-legal)"
            ((WARNINGS++))
            SCORE=$((SCORE - 10))
            [[ "$JSON_OUTPUT" == false ]] && echo -e "${YELLOW}⚠ WARNING: Contact info not detected${NC}"
            return 2
        fi
    fi
}

# CHECK 3: Pro Se Signature (BLOCKER for legal emails)
check_pro_se() {
    local is_legal=false

    # Legal email if case number present
    if grep -qE '26CV[0-9]{6}' "$FILE" 2>/dev/null; then
        is_legal=true
    else
        RESULTS[pro_se]="SKIP|Not a legal filing (no case number)"
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${CYAN}→ Pro Se check skipped (non-legal)${NC}"
        return 0
    fi

    if ! grep -qi "pro se" "$FILE" 2>/dev/null; then
        RESULTS[pro_se]="FAIL|Legal email missing 'Pro Se' signature"
        ((BLOCKERS++))
        SCORE=$((SCORE - 30))
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${RED}✗ BLOCKER: Missing 'Pro Se' signature${NC}"
        return 1
    else
        RESULTS[pro_se]="PASS|Pro Se signature present"
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${GREEN}✓ Pro Se signature present${NC}"
        return 0
    fi
}

# CHECK 4: Legal Citations (WARNING)
check_legal_citations() {
    # Improper format: "NC G.S." instead of "N.C.G.S."
    if grep -qE 'NC G\.S\.' "$FILE" 2>/dev/null; then
        RESULTS[legal]="FAIL|Improper 'NC G.S.' citation format"
        ((WARNINGS++))
        SCORE=$((SCORE - 10))
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${YELLOW}⚠ WARNING: Improper citation format${NC}"
        return 2
    fi

    local ncgs_count
    ncgs_count=$(grep -oE 'N\.C\.G\.S\. §' "$FILE" 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$ncgs_count" -gt 0 ]]; then
        RESULTS[legal]="PASS|Found $ncgs_count N.C.G.S. citations"
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${GREEN}✓ Legal citations: $ncgs_count${NC}"
        return 0
    else
        RESULTS[legal]="PASS|No legal citations (non-legal doc)"
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${GREEN}✓ No legal citations (non-legal doc)${NC}"
        return 0
    fi
}

# CHECK 5: Attachment References (WARNING)
check_attachments() {
    local count
    count=$(grep -iE '(attachment|attached|see attached)' "$FILE" 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$count" -gt 0 ]]; then
        RESULTS[attachment]="WARN|Found $count attachment reference(s), manual check required"
        ((WARNINGS++))
        SCORE=$((SCORE - 5))
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${YELLOW}⚠ WARNING: Attachment references detected ($count)${NC}"
        return 2
    else
        RESULTS[attachment]="PASS|No attachment references"
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${GREEN}✓ No attachment references${NC}"
        return 0
    fi
}

# CHECK 6: Email Headers (BLOCKER)
check_headers() {
    local missing=""

    if ! grep -q "^From: " "$FILE" 2>/dev/null && ! grep -q "^FROM: " "$FILE" 2>/dev/null; then
        missing+="From: "
    fi

    if ! grep -q "^To: " "$FILE" 2>/dev/null && ! grep -q "^TO: " "$FILE" 2>/dev/null; then
        missing+="To: "
    fi

    if ! grep -q "^Subject: " "$FILE" 2>/dev/null && ! grep -q "^SUBJECT: " "$FILE" 2>/dev/null; then
        missing+="Subject: "
    fi

    if [[ -n "$missing" ]]; then
        RESULTS[headers]="FAIL|Missing headers: $missing"
        ((BLOCKERS++))
        SCORE=$((SCORE - 30))
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${RED}✗ BLOCKER: Missing headers: $missing${NC}"
        return 1
    else
        RESULTS[headers]="PASS|All required headers present"
        [[ "$JSON_OUTPUT" == false ]] && echo -e "${GREEN}✓ All required headers present${NC}"
        return 0
    fi
}

# RUN ALL CHECKS
[[ "$JSON_OUTPUT" == false ]] && echo -e "${BOLD}${BLUE}Email Validation Gate${NC}"
[[ "$JSON_OUTPUT" == false ]] && echo -e "${DIM}File: $(basename "$FILE")${NC}"
[[ "$JSON_OUTPUT" == false ]] && echo ""

check_ddd_connectome_bounds || true
check_placeholders || true
check_contact_info || true
check_pro_se || true
check_legal_citations || true
check_attachments || true
check_headers || true

# Calculate final score (capped at 0-100)
[[ $SCORE -lt 0 ]] && SCORE=0
[[ $SCORE -gt 100 ]] && SCORE=100

# OUTPUT RESULTS
if [[ "$JSON_OUTPUT" == true ]]; then
    # JSON output
    echo -n '{'
    echo -n '"file":"'"$(basename "$FILE")"'",'
    echo -n '"score":'"$SCORE"','
    echo -n '"min_score":'"$MIN_SCORE"','
    echo -n '"blockers":'"$BLOCKERS"','
    echo -n '"warnings":'"$WARNINGS"','
    echo -n '"checks":{'

    first=true
    for check_name in "${!RESULTS[@]}"; do
        [[ "$first" == false ]] && echo -n ','
        first=false

        IFS='|' read -r status message <<< "${RESULTS[$check_name]}"
        echo -n '"'"$check_name"'":{"status":"'"$status"'","message":"'"$message"'"}'
    done

    echo -n '},'
    echo -n '"verdict":"'
    if [[ $BLOCKERS -gt 0 ]]; then
        echo -n 'BLOCKER'
    elif [[ $SCORE -lt $MIN_SCORE ]]; then
        echo -n 'BELOW_THRESHOLD'
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -n 'WARNING'
    else
        echo -n 'PASS'
    fi
    echo '"}'
else
    # Human-readable output
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════${NC}"
    echo -e "${BOLD}SUMMARY:${NC}"
    echo -e "  🚫 Blockers: $BLOCKERS"
    echo -e "  ⚠️  Warnings: $WARNINGS"
    echo -e "  📊 Score: $SCORE% (min: $MIN_SCORE%)"
    echo -e "${BOLD}═══════════════════════════════════════${NC}"

    if [[ $BLOCKERS -gt 0 ]]; then
        echo -e "${RED}${BOLD}❌ VALIDATION FAILED (BLOCKER)${NC}"
    elif [[ $SCORE -lt $MIN_SCORE ]]; then
        echo -e "${RED}${BOLD}❌ VALIDATION FAILED (Score < $MIN_SCORE%)${NC}"
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}${BOLD}⚠️  PASSED WITH WARNINGS${NC}"
    else
        echo -e "${GREEN}${BOLD}✅ ALL CHECKS PASSED${NC}"
    fi
    echo ""
fi

# EXIT CODE
if [[ $BLOCKERS -gt 0 ]]; then
    exit $EX_VALIDATION_FAILED  # BLOCKER
elif [[ $SCORE -lt $MIN_SCORE ]]; then
    exit $EX_VALIDATION_FAILED  # BELOW THRESHOLD
elif [[ $WARNINGS -gt 0 ]]; then
    exit $EX_VALIDATION_WARNING  # WARNING
else
    exit 0  # PASS
fi
