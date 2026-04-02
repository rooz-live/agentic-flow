#!/bin/bash
# Push Status Dashboard - Visualize push readiness and evidence
# Part of trust-git-spine verification

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
EVIDENCE_DIR=".goalie/push_evidence"
LATEST_EVIDENCE="$EVIDENCE_DIR/push_latest.json"

echo -e "${BOLD}${CYAN}📊 Push Status Dashboard${NC}"
echo "=================================="
echo

# Check if evidence exists
if [[ ! -f "$LATEST_EVIDENCE" ]]; then
    echo -e "${RED}❌ No push evidence found${NC}"
    echo "Run: bash scripts/ci/track-push-evidence.sh"
    exit 1
fi

# Parse evidence
BRANCH=$(jq -r '.submodule.branch' "$LATEST_EVIDENCE")
COMMIT=$(jq -r '.submodule.commit' "$LATEST_EVIDENCE" | cut -c1-8)
CLEAN_STATUS=$(jq -r '.submodule.status.clean' "$LATEST_EVIDENCE")
STAGED_STATUS=$(jq -r '.submodule.status.staged' "$LATEST_EVIDENCE")
UNTRACKED_COUNT=$(jq -r '.submodule.status.untracked' "$LATEST_EVIDENCE")
AHEAD_COUNT=$(jq -r '.submodule.push_status.ahead' "$LATEST_EVIDENCE")
BEHIND_COUNT=$(jq -r '.submodule.push_status.behind' "$LATEST_EVIDENCE")
READINESS_SCORE=$(jq -r '.submodule.push_status.readiness_score // 0' "$LATEST_EVIDENCE")
CSQBM_STATUS=$(jq -r '.trust_gates.csqbm' "$LATEST_EVIDENCE" | grep -o "PASS\|FAIL" || echo "FAIL")
AGENTDB_STATUS=$(jq -r '.trust_gates.agentdb_freshness' "$LATEST_EVIDENCE")

# Display status
echo -e "${BOLD}Repository Status${NC}"
echo "─────────────────"
echo -e "Branch: ${CYAN}$BRANCH${NC}"
echo -e "Commit: ${CYAN}$COMMIT${NC}"
echo -e "Working tree: $([ "$CLEAN_STATUS" = "true" ] && echo "${GREEN}Clean${NC}" || echo "${YELLOW}Modified${NC}")"
echo -e "Staged files: $([ "$STAGED_STATUS" = "true" ] && echo "${YELLOW}Yes${NC}" || echo "None")"
echo -e "Untracked files: $([ "$UNTRACKED_COUNT" -gt 0 ] && echo "${YELLOW}$UNTRACKED_COUNT${NC}" || echo "None")"
echo

echo -e "${BOLD}Push Status${NC}"
echo "────────────"
echo -e "Ahead: ${CYAN}$AHEAD_COUNT${NC} commit(s)"
echo -e "Behind: ${CYAN}$BEHIND_COUNT${NC} commit(s)"
echo

echo -e "${BOLD}Trust Gates${NC}"
echo "───────────"
echo -e "CSQBM: $([ "$CSQBM_STATUS" = "PASS" ] && echo "${GREEN}✓ PASS${NC}" || echo "${RED}✗ FAIL${NC}")"
echo -e "AgentDB: $([ "$AGENTDB_STATUS" = "EXISTS" ] && echo "${GREEN}✓ EXISTS${NC}" || echo "${RED}✗ MISSING${NC}")"
echo

# Push readiness visualization
echo -e "${BOLD}Push Readiness${NC}"
echo "────────────────"

# Visual readiness score
READINESS_TOTAL=3
READINESS_PERCENT=$((READINESS_SCORE * 100 / READINESS_TOTAL))

echo -n "["
for i in $(seq 1 $READINESS_TOTAL); do
    if [[ $i -le $READINESS_SCORE ]]; then
        echo -n "${GREEN}█${NC}"
    else
        echo -n "${RED}░${NC}"
    fi
done
echo "] $READINESS_SCORE/$READINESS_TOTAL ($READINESS_PERCENT%)"

echo

# Readiness criteria
echo -e "\n${BOLD}Readiness Criteria${NC}"
echo "──────────────────"
echo -e "[$([ "$CLEAN_STATUS" = "true" ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}")] Clean working tree"
echo -e "[$([ "$CSQBM_STATUS" = "PASS" ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}")] CSQBM verification"
echo -e "[$([ "$AHEAD_COUNT" -gt 0 ] && echo -e "${YELLOW}→${NC}" || echo -e "${GREEN}✓${NC}")] Dry-run push (only when ahead)"

echo

# Action recommendations
echo -e "${BOLD}Recommended Actions${NC}"
echo "────────────────────"

if [[ "$CLEAN_STATUS" != "true" ]]; then
    echo -e "${YELLOW}• Commit or stash changes before pushing${NC}"
fi

if [[ "$CSQBM_STATUS" != "PASS" ]]; then
    echo -e "${YELLOW}• Run: bash scripts/validate-foundation.sh --trust-path${NC}"
fi

if [[ "$AHEAD_COUNT" -gt 0 ]]; then
    if [[ "$READINESS_SCORE" -eq 3 ]]; then
        echo -e "${GREEN}• Ready to push! Run: git push origin $BRANCH${NC}"
    else
        echo -e "${RED}• Address readiness issues before pushing${NC}"
    fi
else
    echo -e "${BLUE}• No commits to push${NC}"
fi

echo

# Show recent evidence files
echo -e "${BOLD}Recent Evidence${NC}"
echo "────────────────"
ls -lt "$EVIDENCE_DIR"/push_*.json 2>/dev/null | head -5 | while read -r line; do
    file=$(echo "$line" | awk '{print $9}')
    timestamp=$(basename "$file" .json | sed 's/push_//')
    echo "• $(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$timestamp" "+%Y-%m-%d %H:%M:%S")"
done

echo

# Show push preview if available
PREVIEW_FILE=$(jq -r '.submodule.push_status.preview_file // empty' "$LATEST_EVIDENCE")
if [[ -n "$PREVIEW_FILE" && -f "$EVIDENCE_DIR/$PREVIEW_FILE" ]]; then
    echo -e "${BOLD}Push Preview${NC}"
    echo "────────────"
    cat "$EVIDENCE_DIR/$PREVIEW_FILE" | while read -r commit; do
        echo "  $commit"
    done
    echo
fi
