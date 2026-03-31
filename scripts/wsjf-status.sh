#!/usr/bin/env bash
# scripts/wsjf-status.sh
# Quick WSJF status check

set -euo pipefail

WSJF_MATRIX="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/WSJF-RISK-MATRIX.yaml"
WSJF_HTML="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/WSJF-DASHBOARD.html"
LOG_FILE="/Users/shahroozbhopti/Library/Logs/wsjf-escalator.log"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎯 WSJF Risk Status${NC}"
echo "════════════════════════════════════════════"

# Check recent escalations in memory
echo -e "\n${YELLOW}Recent Escalations (last 24h):${NC}"
npx ruflo memory search --query "wsjf-risk" --namespace wsjf-escalations --limit 5 2>/dev/null | grep -A 5 "Found" || echo "  No escalations found"

# Check last scan time
if [[ -f "$LOG_FILE" ]]; then
    echo -e "\n${YELLOW}Last Scan:${NC}"
    tail -1 "$LOG_FILE" 2>/dev/null || echo "  No log entries"
fi

# Check LaunchAgent status
echo -e "\n${YELLOW}Automation Status:${NC}"
if launchctl list | grep -q "bhopti.legal.wsjf-escalator"; then
    echo -e "  ${GREEN}✅ WSJF Escalator: RUNNING (every 15 min)${NC}"
else
    echo -e "  ${RED}❌ WSJF Escalator: NOT RUNNING${NC}"
fi

# Dashboard status
echo -e "\n${YELLOW}Dashboard:${NC}"
if [[ -f "$WSJF_HTML" ]]; then
    echo -e "  ${GREEN}✅ Available at: file://$WSJF_HTML${NC}"
    echo "  (Auto-refreshes every 5 min)"
else
    echo -e "  ${YELLOW}⏳ Will be created on first scan${NC}"
fi

# File count in legal folders
echo -e "\n${YELLOW}Monitored Files:${NC}"
PDF_COUNT=$(find ~/Documents/Personal/CLT/MAA/ -name "*.pdf" 2>/dev/null | wc -l | xargs)
EML_COUNT=$(find ~/Documents/Personal/CLT/MAA/ -name "*.eml" 2>/dev/null | wc -l | xargs)
MD_COUNT=$(find ~/Documents/Personal/CLT/MAA/ -name "*.md" 2>/dev/null | wc -l | xargs)

echo "  📄 PDFs: $PDF_COUNT"
echo "  📧 Emails: $EML_COUNT"
echo "  📝 Markdown: $MD_COUNT"

echo ""
echo "════════════════════════════════════════════"
echo -e "${GREEN}Run 'open $WSJF_HTML' to view dashboard${NC}"
