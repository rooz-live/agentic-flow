#!/usr/bin/env bash
#
# Batch Wholeness Validation for Legal Case Files
# Validates all correspondence from Gary folder before he left the case
#
# Usage: ./validate_legal_case_batch.sh

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEGAL_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590"
OUTBOUND_DIR="${LEGAL_DIR}/CORRESPONDENCE/OUTBOUND"
REPORTS_DIR="${LEGAL_DIR}/VALIDATION-REPORTS"
VALIDATOR="${SCRIPT_DIR}/wholeness_validator_extended.py"

# Create reports directory
mkdir -p "${REPORTS_DIR}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}      Wholeness Validation: Legal Case Files Batch${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Validate base framework exists
if [[ ! -f "${SCRIPT_DIR}/wholeness_validation_framework.py" ]]; then
    echo -e "${RED}Error: Base framework not found${NC}"
    echo "Please ensure wholeness_validation_framework.py is in: ${SCRIPT_DIR}"
    exit 1
fi

# Make validator executable
chmod +x "${VALIDATOR}"

# Counter
total=0
passed=0
needs_revision=0
rejected=0

# Function to validate a single file
validate_file() {
    local file="$1"
    local filename="$(basename "$file")"
    local report_path="${REPORTS_DIR}/${filename%.eml}-report.json"
    
    echo -e "${BLUE}Validating:${NC} $filename"
    
    # Determine validation profile based on filename
    local circles="all"
    local roles="all"
    local counsels="all"
    local patterns=""
    local blockers=""
    
    # Customize based on document type
    if [[ "$filename" == *"LEASE-DISCOVERY"* ]]; then
        blockers="lease verification"
        patterns="adr,prd"
    elif [[ "$filename" == *"SETTLEMENT"* ]]; then
        roles="judge,prosecutor,defense,mediator,jury"
        patterns="prd"
    elif [[ "$filename" == *"GARY"* ]] || [[ "$filename" == *"ATTORNEY"* ]]; then
        counsels="county_attorney,legal_aid"
        roles="judge,expert_witness"
    fi
    
    # Run validation
    if python3 "${VALIDATOR}" \
        --file "$file" \
        --circles "$circles" \
        --roles "$roles" \
        --counsels "$counsels" \
        --patterns "$patterns" \
        --blockers "$blockers" \
        --output "$report_path" 2>/dev/null; then
        
        # Parse recommendation from JSON
        local recommendation=$(jq -r '.overall.recommendation' "$report_path")
        local wholeness_score=$(jq -r '.overall.wholeness_score' "$report_path")
        local consensus_rating=$(jq -r '.overall.consensus_rating' "$report_path")
        
        if [[ "$recommendation" == *"APPROVE"* ]]; then
            echo -e "  ${GREEN}✅ APPROVED${NC} - Wholeness: ${wholeness_score}% | Consensus: ${consensus_rating}/5.0"
            ((passed++))
        elif [[ "$recommendation" == *"REVISION"* ]]; then
            echo -e "  ${YELLOW}⚠️  NEEDS REVISION${NC} - Wholeness: ${wholeness_score}% | Consensus: ${consensus_rating}/5.0"
            ((needs_revision++))
        else
            echo -e "  ${RED}❌ REJECTED${NC} - Wholeness: ${wholeness_score}% | Consensus: ${consensus_rating}/5.0"
            ((rejected++))
        fi
        
        echo -e "  ${BLUE}Report:${NC} $report_path"
        
    else
        echo -e "  ${RED}❌ VALIDATION FAILED${NC}"
        ((rejected++))
    fi
    
    ((total++))
    echo ""
}

# Validate specific legal case files
echo -e "${YELLOW}1. Gary Correspondence (Before Departure)${NC}"
echo "-----------------------------------------------------------"

if [[ -f "${OUTBOUND_DIR}/Gary/ATTORNEY-GARY-FOCUSED-EMAIL.eml" ]]; then
    validate_file "${OUTBOUND_DIR}/Gary/ATTORNEY-GARY-FOCUSED-EMAIL.eml"
fi

echo -e "${YELLOW}2. Discovery Requests${NC}"
echo "-----------------------------------------------------------"

if [[ -f "${OUTBOUND_DIR}/LEASE-DISCOVERY-REQUEST.eml" ]]; then
    validate_file "${OUTBOUND_DIR}/LEASE-DISCOVERY-REQUEST.eml"
fi

echo -e "${YELLOW}3. Settlement Proposals${NC}"
echo "-----------------------------------------------------------"

# Find all settlement-related emails
find "${OUTBOUND_DIR}" -type f -name "*SETTLEMENT*.eml" -o -name "*settlement*.eml" | while read -r file; do
    validate_file "$file"
done

echo -e "${YELLOW}4. Follow-up Communications${NC}"
echo "-----------------------------------------------------------"

if [[ -f "${OUTBOUND_DIR}/FOLLOW-UP-530PM-FEB11.eml" ]]; then
    validate_file "${OUTBOUND_DIR}/FOLLOW-UP-530PM-FEB11.eml"
fi

if [[ -f "${OUTBOUND_DIR}/SETTLEMENT-PROPOSAL-SCENARIO-C.eml" ]]; then
    validate_file "${OUTBOUND_DIR}/SETTLEMENT-PROPOSAL-SCENARIO-C.eml"
fi

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    Validation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Total files validated:       ${BLUE}${total}${NC}"
echo -e "  ${GREEN}✅ Approved:${NC}             $passed"
echo -e "  ${YELLOW}⚠️  Needs Revision:${NC}      $needs_revision"
echo -e "  ${RED}❌ Rejected:${NC}             $rejected"
echo ""
echo -e "Overall Pass Rate:           ${BLUE}$(( (passed * 100) / total ))%${NC}"
echo ""
echo -e "Reports saved to: ${REPORTS_DIR}"
echo ""

# Generate consolidated report
CONSOLIDATED_REPORT="${REPORTS_DIR}/CONSOLIDATED-REPORT.md"

cat > "$CONSOLIDATED_REPORT" <<EOF
# Wholeness Validation - Consolidated Report
**Generated:** $(date)
**Case:** 26CV005596-590 (Bhopti v. MAA)

## Summary
- **Total Files:** $total
- **Approved:** $passed
- **Needs Revision:** $needs_revision
- **Rejected:** $rejected
- **Pass Rate:** $(( (passed * 100) / total ))%

## Individual Reports

EOF

# Append links to individual reports
find "${REPORTS_DIR}" -name "*-report.json" -type f | sort | while read -r report; do
    filename="$(basename "$report" | sed 's/-report\.json$//')"
    recommendation=$(jq -r '.overall.recommendation' "$report")
    wholeness=$(jq -r '.overall.wholeness_score' "$report")
    
    echo "### $filename" >> "$CONSOLIDATED_REPORT"
    echo "- **Recommendation:** $recommendation" >> "$CONSOLIDATED_REPORT"
    echo "- **Wholeness Score:** ${wholeness}%" >> "$CONSOLIDATED_REPORT"
    echo "- **Report:** \`$(basename "$report")\`" >> "$CONSOLIDATED_REPORT"
    echo "" >> "$CONSOLIDATED_REPORT"
done

echo -e "${GREEN}Consolidated report:${NC} $CONSOLIDATED_REPORT"
echo ""

# Exit code based on overall results
if [[ $rejected -gt 0 ]]; then
    echo -e "${RED}⚠️  Some files were REJECTED. Review reports for details.${NC}"
    exit 2
elif [[ $needs_revision -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Some files NEED REVISION. Review reports for warnings.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All files APPROVED!${NC}"
    exit 0
fi
