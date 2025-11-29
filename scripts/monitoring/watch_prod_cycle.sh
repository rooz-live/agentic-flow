#!/usr/bin/env bash
# watch_prod_cycle.sh - Real-time monitor for af prod-cycle telemetry

GOALIE_DIR=".goalie"
TELEMETRY_LOG="$GOALIE_DIR/prod_cycle_telemetry.jsonl"
EXECUTOR_LOG="$GOALIE_DIR/executor_log.jsonl"
INCIDENTS_LOG="logs/governor_incidents.jsonl"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${BLUE}=== Agentic Flow Prod-Cycle Monitor ===${NC}"

while true; do
    echo -e "\033[3;1H"  # Move cursor to line 3

    # 1. Prod-cycle telemetry
    if [ -f "$TELEMETRY_LOG" ]; then
        LATEST=$(tail -n 1 "$TELEMETRY_LOG")

        ITERATION=$(echo "$LATEST" | jq -r .iteration 2>/dev/null || echo "0")
        MAX_ITER=$(echo "$LATEST" | jq -r .maxIterations 2>/dev/null || echo "0")
        CIRCLE=$(echo "$LATEST" | jq -r .circle 2>/dev/null || echo "unknown")
        DEPTH=$(echo "$LATEST" | jq -r .depth 2>/dev/null || echo "0")
        DECISION=$(echo "$LATEST" | jq -r .decision 2>/dev/null || echo "normal")
        REASON=$(echo "$LATEST" | jq -r .reason 2>/dev/null || echo "-")
        VRATE=$(echo "$LATEST" | jq -r .verifiedRate 2>/dev/null || echo "")
        CPU=$(echo "$LATEST" | jq -r .cpuPct 2>/dev/null || echo "")
        AUTOCOMMIT=$(echo "$LATEST" | jq -r .autocommit 2>/dev/null || echo "")

        echo -e "Prod-cycle Iteration: ${YELLOW}$ITERATION${NC} / $MAX_ITER"
        echo -e "Context: Circle=${CYAN}$CIRCLE${NC} | Depth=${CYAN}$DEPTH${NC}"
        echo -e "Decision: $DECISION (reason: $REASON)"
        if [ -n "$VRATE" ] && [ "$VRATE" != "null" ]; then
            echo -e "Verified Rate: ${GREEN}$VRATE${NC}"
        fi
        if [ -n "$CPU" ] && [ "$CPU" != "null" ]; then
            echo -e "Approx CPU: ${YELLOW}$CPU%${NC}"
        fi
        if [ "$AUTOCOMMIT" = "1" ]; then
            echo -e "Autocommit: ${GREEN}ENABLED${NC}"
        else
            echo -e "Autocommit: ${RED}DISABLED${NC}"
        fi
    else
        echo -e "Waiting for prod-cycle telemetry at $TELEMETRY_LOG ..."
    fi

    # 2. Executor status
    echo -e "\n${BLUE}--- Governance Executor ---${NC}"
    if [ -f "$EXECUTOR_LOG" ]; then
        LAST_EXEC=$(tail -n 1 "$EXECUTOR_LOG")
        PATTERN=$(echo "$LAST_EXEC" | jq -r .pattern 2>/dev/null || echo "-")
        FILEPATH=$(echo "$LAST_EXEC" | jq -r .filePath 2>/dev/null || echo "-")
        ESTATUS=$(echo "$LAST_EXEC" | jq -r .status 2>/dev/null || echo "-")
        echo -e "Last proposal: $PATTERN -> $FILEPATH ($ESTATUS)"
    else
        echo -e "No executor_log.jsonl yet"
    fi

    # 3. System & governor incidents
    echo -e "\n${BLUE}--- System Health ---${NC}"
    LOAD=$(uptime | sed 's/.*load average[s]*: //')
    echo -e "System Load: $LOAD"

    if [ -f "$INCIDENTS_LOG" ]; then
        RECENT_INCIDENTS=$(grep "system_overload" "$INCIDENTS_LOG" | tail -n 10 | wc -l)
        if [ "$RECENT_INCIDENTS" -gt 0 ]; then
            echo -e "Governor Alerts (last 10): ${RED}$RECENT_INCIDENTS${NC}"
        else
            echo -e "Governor Alerts: ${GREEN}None recent${NC}"
        fi
    fi

    sleep 2

done

