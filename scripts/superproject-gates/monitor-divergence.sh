#!/bin/bash
# monitor-divergence.sh - Real-time monitoring for divergence testing
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

REFRESH_INTERVAL=${REFRESH_INTERVAL:-10}  # Refresh every 10 seconds

# Load statistical thresholds
if [[ -f "$SCRIPT_DIR/lib/statistical-thresholds.sh" ]]; then
    source "$SCRIPT_DIR/lib/statistical-thresholds.sh"
    STATISTICAL_THRESHOLDS_ENABLED=true
else
    STATISTICAL_THRESHOLDS_ENABLED=false
fi

export AGENTDB_PATH="${AGENTDB_PATH:-$PROJECT_ROOT/agentdb.db}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

while true; do
    clear
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 Divergence Testing Monitor${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') | Refresh: ${REFRESH_INTERVAL}s"
    echo ""
    
    # ========================================
    # AgentDB Stats
    # ========================================
    echo -e "${GREEN}=== AgentDB Statistics ===${NC}"
    if timeout 5s npx agentdb stats 2>/dev/null; then
        :  # Stats printed above
    else
        echo -e "${YELLOW}⚠️  AgentDB unavailable (using local WASM)${NC}"
    fi
    echo ""
    
    # ========================================
    # Recent Episodes (last 30 minutes)
    # ========================================
    echo -e "${GREEN}=== Recent Episode Statistics (30 min) ===${NC}"
    
    total_recent=$(find /tmp -name "ay-prod-episode-*.json" -mmin -30 -type f 2>/dev/null | wc -l | tr -d ' ')
    successful_recent=$(find /tmp -name "ay-prod-episode-*.json" -mmin -30 -type f -exec grep -l '"outcome":"success"' {} \; 2>/dev/null | wc -l | tr -d ' ')
    failed_recent=$(find /tmp -name "ay-prod-episode-*.json" -mmin -30 -type f -exec grep -l '"outcome":"failure"' {} \; 2>/dev/null | wc -l | tr -d ' ')
    
    echo "Total Episodes: $total_recent"
    echo "Successful: $successful_recent"
    echo "Failed: $failed_recent"
    
    if [ $total_recent -gt 0 ]; then
        success_rate=$(echo "scale=2; $successful_recent / $total_recent * 100" | bc)
        
        if (( $(echo "$success_rate >= 80" | bc -l) )); then
            echo -e "Success Rate: ${GREEN}${success_rate}%${NC}"
        elif (( $(echo "$success_rate >= 60" | bc -l) )); then
            echo -e "Success Rate: ${YELLOW}${success_rate}%${NC}"
        else
            echo -e "Success Rate: ${RED}${success_rate}%${NC}"
        fi
    fi
    echo ""
    
    # ========================================
    # Circuit Breaker Status (Statistical)
    # ========================================
    echo -e "${GREEN}=== Circuit Breaker Status ===${NC}"
    
    if [[ "$STATISTICAL_THRESHOLDS_ENABLED" == "true" ]]; then
        # Use statistical threshold for circuit breaker
        cb_threshold=$(get_circuit_breaker "orchestrator" "" "$AGENTDB_PATH" 2>/dev/null || echo "0.7")
        echo "Adaptive Threshold: $cb_threshold (5th percentile)"
    else
        cb_threshold=0.7
        echo "Threshold: $cb_threshold (hardcoded)"
    fi
    
    # Average reward
    avg_reward=$(timeout 5s npx agentdb stats 2>/dev/null | grep "Average Reward" | awk '{print $3}' || echo "1.0")
    if (( $(echo "$avg_reward >= $cb_threshold" | bc -l) )); then
        echo -e "Average Reward: ${GREEN}${avg_reward}${NC} (above threshold)"
    elif (( $(echo "$avg_reward >= $(echo "$cb_threshold * 0.9" | bc -l)" | bc -l) )); then
        echo -e "Average Reward: ${YELLOW}${avg_reward}${NC} (approaching threshold)"
    else
        echo -e "Average Reward: ${RED}${avg_reward} ⚠️${NC} (CIRCUIT BREAKER TRIGGERED)"
    fi
    
    # Cascade failure detection with statistical thresholds
    if [[ "$STATISTICAL_THRESHOLDS_ENABLED" == "true" ]]; then
        cascade_result=$(get_cascade_threshold "orchestrator" "standup" "$AGENTDB_PATH" 2>/dev/null || echo "10|5||0")
        cascade_threshold=$(echo "$cascade_result" | cut -d'|' -f1)
        cascade_window=$(echo "$cascade_result" | cut -d'|' -f2)
        echo "Cascade Detection: $cascade_threshold failures in ${cascade_window}min (velocity-based)"
    else
        cascade_threshold=10
        cascade_window=5
        echo "Cascade Detection: $cascade_threshold failures in ${cascade_window}min (hardcoded)"
    fi
    
    # Count recent failures
    consecutive_failures=0
    for i in $(seq 1 5); do
        last_episode=$(find /tmp -name "ay-prod-episode-*.json" -type f 2>/dev/null | sort -t_ -k4 -n | tail -n $i | head -n 1)
        if [ -f "$last_episode" ] && grep -q '"outcome":"failure"' "$last_episode" 2>/dev/null; then
            ((consecutive_failures++))
        else
            break
        fi
    done
    
    if [ $consecutive_failures -ge "$cascade_threshold" ]; then
        echo -e "Recent Failures: ${RED}${consecutive_failures} 🚨 CASCADE DETECTED${NC}"
    elif [ $consecutive_failures -ge $((cascade_threshold / 2)) ]; then
        echo -e "Recent Failures: ${YELLOW}${consecutive_failures} ⚠️${NC}"
    else
        echo -e "Recent Failures: ${GREEN}${consecutive_failures}${NC}"
    fi
    echo ""
    
    # ========================================
    # Learned Skills
    # ========================================
    echo -e "${GREEN}=== Learned Skills (Top 5) ===${NC}"
    timeout 5s npx agentdb skill search "orchestrator" 5 2>/dev/null | head -n 10 || echo "  (No skills available yet)"
    echo ""
    
    # ========================================
    # Latest Episodes (last 5)
    # ========================================
    echo -e "${GREEN}=== Latest Episodes ===${NC}"
    for episode in $(find /tmp -name "ay-prod-episode-*.json" -type f 2>/dev/null | sort -t_ -k4 -n | tail -n 5); do
        episode_id=$(basename "$episode" .json | sed 's/ay-prod-episode-//')
        outcome=$(grep -o '"outcome":"[^"]*"' "$episode" 2>/dev/null | cut -d'"' -f4 || echo "unknown")
        timestamp=$(stat -f "%Sm" -t "%H:%M:%S" "$episode" 2>/dev/null || echo "??:??:??")
        
        if [ "$outcome" = "success" ]; then
            echo -e "  ${GREEN}✅${NC} $timestamp | $episode_id"
        else
            echo -e "  ${RED}❌${NC} $timestamp | $episode_id"
        fi
    done
    echo ""
    
    # ========================================
    # System Health
    # ========================================
    echo -e "${GREEN}=== System Health ===${NC}"
    
    # Memory usage
    mem_used=$(ps -o rss= -p $$ | awk '{print int($1/1024)}')
    echo "Script Memory: ${mem_used}MB"
    
    # Episode files in /tmp
    episode_files=$(find /tmp -name "ay-prod-episode-*.json" -o -name "yolife-episode-*.json" 2>/dev/null | wc -l | tr -d ' ')
    echo "Episode Files in /tmp: $episode_files"
    
    if [ $episode_files -gt 1000 ]; then
        echo -e "${YELLOW}⚠️  Consider cleaning old episodes${NC}"
    fi
    echo ""
    
    # ========================================
    # Controls
    # ========================================
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "Press Ctrl+C to exit"
    
    sleep $REFRESH_INTERVAL
done
