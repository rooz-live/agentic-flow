#!/usr/bin/env bash
# validation-gate-v2.sh - Enhanced validation with MCP/MPP/WSJF/ROAM
# Exit codes: 0=PASS, 1=BLOCKER, 2=WARNING, 3=DEPS_MISSING

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Metrics
BLOCKERS=0
WARNINGS=0
DEPS_MISSING=0

# MCP/MPP Tracking
declare -A MCP_SCORES  # Method scores
declare -A MPP_SCORES  # Pattern scores
declare -A PROTOCOL_SCORES
declare -A METRICS_SCORES

# WSJF Tracking
declare -A WSJF_TASKS

# ROAM Tracking
declare -A ROAM_RISKS

echo -e "${BLUE}🚀 Enhanced Validation Gate v2.0${NC}"
echo -e "${BLUE}   MCP/MPP + WSJF + ROAM Integration${NC}"
echo ""

# Gate 1: DDD Domain Model (MCP: Method)
echo "=== GATE 1: DDD Domain Model (MCP: Method) ==="
AGGREGATE_COUNT=$(find rust/core/src -name "*.rs" -type f -exec grep -o "impl.*AggregateRoot" {} \; 2>/dev/null | wc -l | tr -d ' ')

if [[ $AGGREGATE_COUNT -ge 3 ]]; then
    echo -e "${GREEN}✅ PASS: Found $AGGREGATE_COUNT aggregate root(s)${NC}"
    MCP_SCORES[method]=100
else
    echo -e "${YELLOW}⚠️  WARN: Found $AGGREGATE_COUNT aggregate(s), expected 3+${NC}"
    ((WARNINGS++))
    MCP_SCORES[method]=60
    WSJF_TASKS["ddd-aggregates"]="BV=8 TC=6 RR=8 JS=3 = 7.33"
fi

# Gate 2: ADR Governance (MPP: Pattern)
echo ""
echo "=== GATE 2: ADR Governance (MPP: Pattern) ==="

# Check ADR template has date field
if grep -q "Date:" docs/adr/000-TEMPLATE.md 2>/dev/null; then
    echo -e "${GREEN}✅ PASS: ADR template has date field${NC}"
    MPP_SCORES[pattern]=100
else
    echo -e "${YELLOW}⚠️  WARN: ADR template missing date field${NC}"
    ((WARNINGS++))
    MPP_SCORES[pattern]=75
    WSJF_TASKS["adr-date-field"]="BV=5 TC=3 RR=5 JS=1 = 13.0"
fi

# Check ADR count
ADR_COUNT=$(find docs/adr -name "ADR-*.md" 2>/dev/null | wc -l | tr -d ' ')
if [[ $ADR_COUNT -ge 5 ]]; then
    echo -e "${GREEN}✅ PASS: Found $ADR_COUNT ADR(s)${NC}"
    ((MPP_SCORES[pattern]+=100))
    MPP_SCORES[pattern]=$((${MPP_SCORES[pattern]} / 2))  # Average
else
    echo -e "${YELLOW}⚠️  WARN: Found $ADR_COUNT ADR(s), expected 5+${NC}"
    ((WARNINGS++))
fi

# Gate 3: TDD Test Coverage (MCP: Metrics)
echo ""
echo "=== GATE 3: TDD Test Coverage (MCP: Metrics) ==="
INTEGRATION_TEST_COUNT=$(find tests -name "*integration*" -o -name "*e2e*" 2>/dev/null | wc -l | tr -d ' ')

if [[ $INTEGRATION_TEST_COUNT -ge 2 ]]; then
    echo -e "${GREEN}✅ PASS: Found $INTEGRATION_TEST_COUNT integration test(s)${NC}"
    METRICS_SCORES[coverage]=100
else
    echo -e "${YELLOW}⚠️  WARN: Found $INTEGRATION_TEST_COUNT integration test(s), expected 2+${NC}"
    ((WARNINGS++))
    METRICS_SCORES[coverage]=50
    WSJF_TASKS["integration-tests"]="BV=9 TC=8 RR=8 JS=2 = 12.5"
    ROAM_RISKS["test-gaps"]="Type=Resolve Impact=HIGH Prob=40% Mitigation='Add 2 integration tests'"
fi

# Gate 4: PRD Requirements (MPP: Protocol)
echo ""
echo "=== GATE 4: PRD Requirements (MPP: Protocol) ==="
PRD_COUNT=$(find docs/prd -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

if [[ $PRD_COUNT -ge 3 ]]; then
    echo -e "${GREEN}✅ PASS: Found $PRD_COUNT PRD(s)${NC}"
    PROTOCOL_SCORES[requirements]=100
else
    echo -e "${YELLOW}⚠️  WARN: Found $PRD_COUNT PRD(s), expected 3+${NC}"
    ((WARNINGS++))
    PROTOCOL_SCORES[requirements]=60
fi

# Gate 5: Validation Coherence (MPP: Method + Protocol)
echo ""
echo "=== GATE 5: Validation Coherence ==="
if bash scripts/validation-core-cli.sh email --help 2>&1 | grep -q "\-\-json"; then
    echo -e "${GREEN}✅ PASS: validation-core.sh supports --json output${NC}"
    PROTOCOL_SCORES[validation]=100
else
    echo -e "${RED}❌ FAIL: validation-core.sh missing --json support${NC}"
    ((BLOCKERS++))
    PROTOCOL_SCORES[validation]=0
    WSJF_TASKS["json-output"]="BV=10 TC=9 RR=7 JS=1 = 26.0"
fi

# Gate 6: DPC Robustness (%/# × R(t))
echo ""
echo "=== GATE 6: DPC Robustness (%/# × R(t)) ==="

# Calculate coverage
TOTAL_CHECKS=5
PASSED_CHECKS=$((TOTAL_CHECKS - WARNINGS - BLOCKERS))
COVERAGE_PCT=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

# Calculate robustness (implemented vs declared)
DECLARED_CHECKS=5
IMPLEMENTED_CHECKS=4  # Assume 1 is stub
ROBUSTNESS_PCT=$((IMPLEMENTED_CHECKS * 100 / DECLARED_CHECKS))

# Calculate DPC_R(t)
DPC_R=$(echo "scale=1; $COVERAGE_PCT * $ROBUSTNESS_PCT / 100" | bc)

echo -e "${BLUE}📊 DPC Metrics:${NC}"
echo "  %/#: $PASSED_CHECKS/$TOTAL_CHECKS ($COVERAGE_PCT%)"
echo "  R(t): $ROBUSTNESS_PCT%"
echo "  DPC_R(t): ${DPC_R}%"

if (( $(echo "$DPC_R >= 75.0" | bc -l) )); then
    echo -e "${GREEN}✅ PASS: DPC_R(t) = ${DPC_R}% ≥ 75% (robust coverage)${NC}"
    METRICS_SCORES[dpc]=$DPC_R
else
    echo -e "${RED}❌ FAIL: DPC_R(t) = ${DPC_R}% < 75% (insufficient robustness)${NC}"
    ((BLOCKERS++))
    METRICS_SCORES[dpc]=$DPC_R
fi

# MCP/MPP/WSJF/ROAM Summary
echo ""
echo "========================================="
echo -e "${BLUE}MCP/MPP SCORES:${NC}"
echo "========================================="
echo "Method (MCP):      ${MCP_SCORES[method]:-0}%"
echo "Pattern (MPP):     ${MPP_SCORES[pattern]:-0}%"
echo "Protocol (MPP):    ${PROTOCOL_SCORES[validation]:-0}%"
echo "Metrics (MCP):     ${METRICS_SCORES[coverage]:-0}%"

# Calculate average MCP/MPP score
TOTAL_MCP_MPP=0
COUNT=0
for score in "${MCP_SCORES[@]}" "${MPP_SCORES[@]}" "${PROTOCOL_SCORES[@]}" "${METRICS_SCORES[@]}"; do
    TOTAL_MCP_MPP=$((TOTAL_MCP_MPP + score))
    ((COUNT++))
done
AVG_MCP_MPP=$((TOTAL_MCP_MPP / COUNT))
echo ""
echo -e "${BLUE}Average MCP/MPP: ${AVG_MCP_MPP}%${NC}"

# WSJF Summary
if [[ ${#WSJF_TASKS[@]} -gt 0 ]]; then
    echo ""
    echo "========================================="
    echo -e "${YELLOW}WSJF TASKS (Priority Order):${NC}"
    echo "========================================="
    for task in "${!WSJF_TASKS[@]}"; do
        echo "  - $task: ${WSJF_TASKS[$task]}"
    done
fi

# ROAM Summary
if [[ ${#ROAM_RISKS[@]} -gt 0 ]]; then
    echo ""
    echo "========================================="
    echo -e "${YELLOW}ROAM RISKS:${NC}"
    echo "========================================="
    for risk in "${!ROAM_RISKS[@]}"; do
        echo "  - $risk: ${ROAM_RISKS[$risk]}"
    done
fi

# Final Summary
echo ""
echo "========================================="
echo "SUMMARY:"
echo "  🚫 Blockers: $BLOCKERS"
echo "  ⚠️  Warnings: $WARNINGS"
echo "  🔧 Missing Deps: $DEPS_MISSING"
echo "========================================="

# Determine exit code
if [[ $BLOCKERS -gt 0 ]]; then
    echo -e "EXIT: 1 (BLOCKER) ${RED}🚫${NC}"
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "EXIT: 2 (WARNING) ${YELLOW}⚠️${NC}"
    exit 2
elif [[ $DEPS_MISSING -gt 0 ]]; then
    echo -e "EXIT: 3 (DEPS MISSING) ${BLUE}🔧${NC}"
    exit 3
else
    echo -e "EXIT: 0 (PASS) ${GREEN}✨${NC}"
    exit 0
fi
