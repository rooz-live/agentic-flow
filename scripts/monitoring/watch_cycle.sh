#!/usr/bin/env bash
# watch_cycle.sh - Real-time monitor for af prod-cycle
# Displays progress, circle focus, fire factors, and dynamic adjustments

GOALIE_DIR=".goalie"
PATTERN_LOG="$GOALIE_DIR/pattern_metrics.jsonl"
INCIDENTS_LOG="logs/governor_incidents.jsonl"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${BLUE}=== Agentic Flow Cycle Monitor ===${NC}"

while true; do
    # 1. Cycle Progress & Context
    if [ -f "$PATTERN_LOG" ]; then
        LATEST=$(tail -n 1 "$PATTERN_LOG")
        
        # Parse JSON simply using grep/sed to avoid heavy jq dependency in tight loop if possible,
        # but jq is safer.
        RUN_KIND=$(echo "$LATEST" | jq -r .run 2>/dev/null || echo "unknown")
        ITERATION=$(echo "$LATEST" | jq -r .iteration 2>/dev/null || echo "0")
        CIRCLE=$(echo "$LATEST" | jq -r .circle 2>/dev/null || echo "unknown")
        DEPTH=$(echo "$LATEST" | jq -r .depth 2>/dev/null || echo "0")
        PATTERN=$(echo "$LATEST" | jq -r .pattern 2>/dev/null || echo "-")
        MUTATION=$(echo "$LATEST" | jq -r .mutation 2>/dev/null || echo "false")
        TIMESTAMP=$(echo "$LATEST" | jq -r .ts 2>/dev/null || echo "")

        echo -e "\033[3;1H" # Move cursor to line 3
        echo -e "Current Run: ${GREEN}$RUN_KIND${NC}"
        echo -e "Iteration:   ${YELLOW}$ITERATION${NC} (Dynamic Extension Active)"
        echo -e "Context:     Circle=${CYAN}$CIRCLE${NC} | Depth=${CYAN}$DEPTH${NC}"
        echo -e "Latest Action: $PATTERN ($TIMESTAMP)"
        
        if [ "$MUTATION" == "true" ]; then
             echo -e "Mode:        ${RED}MUTATION (Active Changes)${NC}"
        else
             echo -e "Mode:        ${GREEN}ADVISORY (Safe/Dry-Run)${NC}"
        fi
    else
        echo -e "\033[3;1HWaiting for pattern logs..."
    fi

    # 2. Fire Factors (Blockers & Load)
    echo -e "\n${BLUE}--- Fire Factors ---${NC}"
    LOAD=$(uptime | sed 's/.*load average[s]*: //')
    echo -e "System Load: $LOAD"
    
    if [ -f "$INCIDENTS_LOG" ]; then
        RECENT_INCIDENTS=$(grep "system_overload" "$INCIDENTS_LOG" | tail -n 10 | wc -l)
        if [ "$RECENT_INCIDENTS" -gt 0 ]; then
            echo -e "Governor Alerts (Last 10 logged): ${RED}$RECENT_INCIDENTS${NC}"
        else
            echo -e "Governor Alerts: ${GREEN}None recent${NC}"
        fi
    fi

    # 3. Replenishment & Traceability
    echo -e "\n${BLUE}--- Refinement & Replenishment ---${NC}"
    if [ -f ".goalie/CONSOLIDATED_ACTIONS.yaml" ]; then
        LAST_ACTION=$(tail -n 5 ".goalie/CONSOLIDATED_ACTIONS.yaml" | grep "title:" | tail -n 1 | sed 's/.*title: //')
        echo -e "Last Replenished: ${YELLOW}$LAST_ACTION${NC}"
    fi

    # 4. Dynamic Policy Status
    echo -e "\n${BLUE}--- Dynamic Policy ---${NC}"
    # Check the process tree for the flag (approximate)
    if ps aux | grep -q "AF_ALLOW_CODE_AUTOCOMMIT=0"; then
        echo -e "Autocommit: ${RED}DISABLED (High Load/Risk)${NC}"
    else
        echo -e "Autocommit: ${GREEN}ENABLED${NC}"
    fi
    
    sleep 2
done
