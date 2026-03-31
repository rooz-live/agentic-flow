#!/usr/bin/env bash
# monitor-divergence.sh - Real-time monitoring for divergence testing
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

REFRESH_INTERVAL="${REFRESH_INTERVAL:-10}"

while true; do
    clear
    
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        DIVERGENCE TESTING - REAL-TIME MONITOR                 ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # AgentDB Stats
    echo -e "${CYAN}📊 AgentDB Statistics${NC}"
    npx agentdb stats 2>/dev/null | grep -E "Episodes|Skills|Average Reward|Causal" | while read -r line; do
        if echo "$line" | grep -q "Skills: 0"; then
            echo -e "  ${YELLOW}$line${NC}"
        elif echo "$line" | grep -q "Skills:"; then
            echo -e "  ${GREEN}$line${NC}"
        elif echo "$line" | grep -q "Average Reward"; then
            local reward=$(echo "$line" | awk '{print $3}')
            if (( $(echo "$reward < 0.7" | bc -l) )); then
                echo -e "  ${RED}$line${NC}"
            elif (( $(echo "$reward < 0.9" | bc -l) )); then
                echo -e "  ${YELLOW}$line${NC}"
            else
                echo -e "  ${GREEN}$line${NC}"
            fi
        else
            echo "  $line"
        fi
    done
    
    echo ""
    
    # Recent Failures
    echo -e "${CYAN}⚠️  Recent Failures (last 5 minutes)${NC}"
    local failures=$(find /tmp -name "episode_*.json" -mmin -5 -exec grep -l "FAILED\|ERROR" {} \; 2>/dev/null | wc -l | tr -d ' ')
    if [ "$failures" -gt 0 ]; then
        echo -e "  ${RED}✗ $failures episodes failed${NC}"
    else
        echo -e "  ${GREEN}✓ No failures detected${NC}"
    fi
    
    echo ""
    
    # Circuit Breaker Status
    echo -e "${CYAN}🛡️  Circuit Breaker Status${NC}"
    local avg_reward=$(npx agentdb stats 2>/dev/null | grep "Average Reward:" | awk '{print $3}')
    
    if [ -n "$avg_reward" ]; then
        if (( $(echo "$avg_reward < 0.6" | bc -l) )); then
            echo -e "  ${RED}🚨 TRIGGERED! Reward: $avg_reward (< 0.6)${NC}"
        elif (( $(echo "$avg_reward < 0.7" | bc -l) )); then
            echo -e "  ${YELLOW}⚠️  WARNING: Reward: $avg_reward (< 0.7)${NC}"
        else
            echo -e "  ${GREEN}✓ OK: Reward: $avg_reward${NC}"
        fi
    else
        echo -e "  ${YELLOW}⚠️  Unable to read reward${NC}"
    fi
    
    echo ""
    
    # Cascade Check
    echo -e "${CYAN}🔗 Cascade Failure Check${NC}"
    local cascade_detected=0
    for circle in orchestrator assessor innovator analyst seeker intuitive; do
        local circle_failures=$(find /tmp -name "episode_${circle}_*.json" -mmin -5 -exec grep -l "FAILED" {} \; 2>/dev/null | wc -l | tr -d ' ')
        
        if [ "$circle_failures" -gt 3 ]; then
            echo -e "  ${RED}✗ $circle: $circle_failures failures (cascade?)${NC}"
            cascade_detected=1
        elif [ "$circle_failures" -gt 0 ]; then
            echo -e "  ${YELLOW}⚠ $circle: $circle_failures failures${NC}"
        fi
    done
    
    if [ $cascade_detected -eq 0 ]; then
        echo -e "  ${GREEN}✓ No cascades detected${NC}"
    fi
    
    echo ""
    
    # Backup Status
    echo -e "${CYAN}💾 Backup Status${NC}"
    if [ -f "${ROOT_DIR}/agentdb.db.backup" ]; then
        local backup_age=$(( $(date +%s) - $(stat -f%m "${ROOT_DIR}/agentdb.db.backup" 2>/dev/null || stat -c%Y "${ROOT_DIR}/agentdb.db.backup") ))
        local backup_minutes=$((backup_age / 60))
        echo -e "  ${GREEN}✓ Backup available (${backup_minutes} minutes old)${NC}"
    else
        echo -e "  ${RED}✗ No backup found${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
    echo -e "Refreshing every ${REFRESH_INTERVAL}s... (Ctrl+C to stop)"
    
    sleep "$REFRESH_INTERVAL"
done
