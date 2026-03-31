#!/usr/bin/env bash
# ay-divergence-monitor.sh - Real-time monitoring for divergence testing
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_LOG="${ROOT_DIR}/.divergence-test-results.jsonl"
FAILURE_LOG="${ROOT_DIR}/.divergence-failures.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

while true; do
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         🔬 DIVERGENCE TESTING MONITOR                       ║${NC}"
    echo -e "${BLUE}║         $(date +'%Y-%m-%d %H:%M:%S')                                   ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # AgentDB Stats
    echo -e "${CYAN}📊 AgentDB Statistics${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if node "$ROOT_DIR/node_modules/.bin/agentdb" stats 2>/dev/null | grep -E "Episodes|Skills|Average Reward|Embedding Coverage"; then
        :
    else
        echo -e "${RED}⚠️  AgentDB not responding${NC}"
    fi
    echo ""
    
    # Test Progress
    if [ -f "$RESULTS_LOG" ]; then
        echo -e "${CYAN}🧪 Test Progress${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        total=$(wc -l < "$RESULTS_LOG" 2>/dev/null || echo "0")
        successes=$(grep -c '"status":"success"' "$RESULTS_LOG" 2>/dev/null || echo "0")
        failures=$(grep -c '"status":"failed"' "$RESULTS_LOG" 2>/dev/null || echo "0")
        success_rate=0
        
        if [ "$total" -gt 0 ]; then
            success_rate=$(echo "scale=1; $successes * 100 / $total" | bc)
        fi
        
        echo -e "  Episodes: $total"
        echo -e "  ${GREEN}✓${NC} Success: $successes ($success_rate%)"
        echo -e "  ${RED}✗${NC} Failures: $failures"
        
        # Trend indicator
        if [ "$total" -gt 10 ]; then
            recent_success=$(tail -10 "$RESULTS_LOG" | grep -c '"status":"success"' || echo "0")
            recent_rate=$(echo "scale=1; $recent_success * 10" | bc)
            echo -e "  Recent (last 10): $recent_success/10 (${recent_rate}%)"
        fi
    else
        echo -e "${YELLOW}⚠️  No test results yet${NC}"
    fi
    echo ""
    
    # Circuit Breaker Status
    echo -e "${CYAN}🔌 Circuit Breaker Status${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    avg_reward=$(node "$ROOT_DIR/node_modules/.bin/agentdb" stats 2>/dev/null | grep "Average Reward:" | awk '{print $3}' || echo "0")
    # Use dynamic threshold if available, fallback to env var or 0.7
    threshold="0.7"  # Default
    if [[ -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
        threshold=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" circuit-breaker orchestrator 2>/dev/null | cut -d'|' -f1 || echo "${CIRCUIT_BREAKER_REWARD:-0.7}")
    else
        threshold=${CIRCUIT_BREAKER_REWARD:-0.7}
    fi
    
    # Calculate healthy threshold as 30% above circuit breaker
    local healthy_threshold=$(echo "$threshold * 1.3" | bc -l 2>/dev/null || echo "0.9")
    if (( $(echo "$avg_reward >= $healthy_threshold" | bc -l) )); then
        echo -e "  ${GREEN}✓ HEALTHY${NC} (reward: $avg_reward, threshold: $threshold)"
    elif (( $(echo "$avg_reward >= $threshold" | bc -l) )); then
        echo -e "  ${YELLOW}⚠ WARNING${NC} (reward: $avg_reward, threshold: $threshold)"
    else
        echo -e "  ${RED}✗ CRITICAL${NC} (reward: $avg_reward, threshold: $threshold)"
        echo -e "  ${RED}→ Circuit breaker should trigger!${NC}"
    fi
    echo ""
    
    # Recent Failures
    if [ -f "$FAILURE_LOG" ] && [ -s "$FAILURE_LOG" ]; then
        echo -e "${CYAN}⚠️  Recent Circuit Breaker Events${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        tail -3 "$FAILURE_LOG" | sed 's/^/  /'
        echo ""
    fi
    
    # Cascade Detection
    echo -e "${CYAN}🌊 Cascade Failure Detection${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    recent_failures=$(find /tmp -name "episode_*.json" -mmin -10 -exec grep -l "status.*failed" {} \; 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$recent_failures" -gt 5 ]; then
        echo -e "  ${RED}✗ HIGH RISK${NC} - $recent_failures failures in last 10 minutes"
    elif [ "$recent_failures" -gt 2 ]; then
        echo -e "  ${YELLOW}⚠ ELEVATED${NC} - $recent_failures failures in last 10 minutes"
    else
        echo -e "  ${GREEN}✓ NORMAL${NC} - $recent_failures failures in last 10 minutes"
    fi
    echo ""
    
    # Skills Learning Progress
    echo -e "${CYAN}🧠 Skills Learning Progress${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    skills=$(node "$ROOT_DIR/node_modules/.bin/agentdb" stats 2>/dev/null | grep "Skills:" | awk '{print $2}' || echo "0")
    
    if [ "$skills" -gt 0 ]; then
        echo -e "  ${GREEN}✓ Learning Active${NC} - $skills skills extracted"
    else
        echo -e "  ${YELLOW}⚠ Accumulating Data${NC} - 0 skills (need more episodes)"
    fi
    echo ""
    
    # Controls
    echo -e "${BLUE}Press Ctrl+C to exit monitoring${NC}"
    
    sleep 10
done
