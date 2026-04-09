#!/usr/bin/env bash
# divergence-test.sh - Controlled divergence testing with circuit breakers
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ============================================================================
# Configuration
# ============================================================================

# Divergence parameters
DIVERGENCE_RATE=${DIVERGENCE_RATE:-0.1}  # 10% imperfection by default
DIVERGENCE_CIRCLE=${DIVERGENCE_CIRCLE:-"orchestrator"}  # Start with isolated circle
EPISODE_COUNT=${EPISODE_COUNT:-50}  # Number of test episodes
SLEEP_BETWEEN=${SLEEP_BETWEEN:-5}  # Seconds between episodes

# Circuit breaker thresholds
CIRCUIT_BREAKER_REWARD=${CIRCUIT_BREAKER_REWARD:-0.7}  # Abort if reward < 0.7
CIRCUIT_BREAKER_FAILURE_RATE=${CIRCUIT_BREAKER_FAILURE_RATE:-0.5}  # Abort if >50% failures
CIRCUIT_BREAKER_CONSECUTIVE_FAILURES=${CIRCUIT_BREAKER_CONSECUTIVE_FAILURES:-5}  # Abort after 5 consecutive failures

# Monitoring
MONITOR_INTERVAL=${MONITOR_INTERVAL:-10}  # Check stats every 10 episodes
BACKUP_DB=${BACKUP_DB:-true}  # Create backup before starting

# Safety classifications
declare -A CIRCLE_SAFETY=(
    ["orchestrator"]="SAFE"      # No dependencies, isolated
    ["analyst"]="SAFE"           # Mostly isolated
    ["assessor"]="RISKY"         # Has dependencies
    ["innovator"]="RISKY"        # Affects learning patterns
    ["seeker"]="RISKY"           # Backlog replenishment critical
    ["intuitive"]="RISKY"        # Synthesis affects multiple circles
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# Pre-flight Safety Checks
# ============================================================================

preflight_checks() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🛡️  Divergence Testing Pre-flight Checks${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # 1. Check circle safety
    local safety=${CIRCLE_SAFETY[$DIVERGENCE_CIRCLE]:-"UNKNOWN"}
    echo "1. Circle Safety Classification: $safety"
    
    if [ "$safety" = "RISKY" ]; then
        echo -e "${YELLOW}   ⚠️  WARNING: Testing on RISKY circle${NC}"
        echo "   This circle has dependencies that could cascade failures"
        read -p "   Continue anyway? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "   Aborted by user"
            exit 1
        fi
    elif [ "$safety" = "UNKNOWN" ]; then
        echo -e "${RED}   ❌ ERROR: Unknown circle: $DIVERGENCE_CIRCLE${NC}"
        exit 1
    else
        echo -e "${GREEN}   ✅ SAFE circle selected${NC}"
    fi
    echo ""
    
    # 2. Check if AgentDB is accessible
    echo "2. AgentDB Accessibility"
    if ! timeout 5s npx agentdb stats &>/dev/null; then
        echo -e "${YELLOW}   ⚠️  AgentDB timeout (using local WASM fallback)${NC}"
    else
        echo -e "${GREEN}   ✅ AgentDB responsive${NC}"
    fi
    echo ""
    
    # 3. Check divergence rate
    echo "3. Divergence Configuration"
    echo "   Rate: ${DIVERGENCE_RATE} ($(echo "$DIVERGENCE_RATE * 100" | bc)% imperfection)"
    echo "   Episodes: $EPISODE_COUNT"
    echo "   Circuit Breaker Thresholds:"
    echo "     - Min Reward: $CIRCUIT_BREAKER_REWARD"
    echo "     - Max Failure Rate: $CIRCUIT_BREAKER_FAILURE_RATE"
    echo "     - Max Consecutive Failures: $CIRCUIT_BREAKER_CONSECUTIVE_FAILURES"
    echo ""
    
    # 4. Backup database
    if [ "$BACKUP_DB" = "true" ]; then
        echo "4. Database Backup"
        local db_path="$PROJECT_ROOT/.db/agentdb.db"
        local backup_path="$PROJECT_ROOT/.db/agentdb.db.backup.$(date +%s)"
        
        if [ -f "$db_path" ]; then
            cp "$db_path" "$backup_path"
            echo -e "${GREEN}   ✅ Backup created: $(basename $backup_path)${NC}"
            echo "   Rollback command:"
            echo "     mv $backup_path $db_path"
        else
            echo "   ⚠️  Database not found (will create new)"
        fi
    fi
    echo ""
    
    # 5. Final confirmation
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  FINAL CONFIRMATION${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "You are about to:"
    echo "  - Run $EPISODE_COUNT episodes with $DIVERGENCE_RATE divergence"
    echo "  - Test on $DIVERGENCE_CIRCLE circle (${CIRCLE_SAFETY[$DIVERGENCE_CIRCLE]})"
    echo "  - Accept temporary performance degradation"
    echo ""
    read -p "Proceed with divergence testing? (yes/no): " final_confirm
    if [ "$final_confirm" != "yes" ]; then
        echo "Aborted by user"
        exit 0
    fi
    echo ""
}

# ============================================================================
# Monitoring and Circuit Breakers
# ============================================================================

check_circuit_breakers() {
    local episode_num=$1
    
    # Only check every MONITOR_INTERVAL episodes
    if [ $((episode_num % MONITOR_INTERVAL)) -ne 0 ]; then
        return 0
    fi
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 Circuit Breaker Check (Episode $episode_num)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # 1. Check average reward (requires agentdb stats)
    local avg_reward=$(timeout 5s npx agentdb stats 2>/dev/null | grep "Average Reward" | awk '{print $3}' || echo "1.0")
    echo "Average Reward: $avg_reward"
    
    if (( $(echo "$avg_reward < $CIRCUIT_BREAKER_REWARD" | bc -l) )); then
        echo -e "${RED}🚨 CIRCUIT BREAKER TRIGGERED: Reward dropped below $CIRCUIT_BREAKER_REWARD${NC}"
        echo "Aborting divergence testing..."
        return 1
    fi
    
    # 2. Check failure rate (last N episodes)
    local recent_failures=$(find /tmp -name "ay-prod-episode-*.json" -mmin -$((MONITOR_INTERVAL * SLEEP_BETWEEN / 60 + 1)) -exec grep -l '"outcome":"failure"' {} \; 2>/dev/null | wc -l)
    local recent_episodes=$(find /tmp -name "ay-prod-episode-*.json" -mmin -$((MONITOR_INTERVAL * SLEEP_BETWEEN / 60 + 1)) 2>/dev/null | wc -l)
    
    if [ $recent_episodes -gt 0 ]; then
        local failure_rate=$(echo "scale=2; $recent_failures / $recent_episodes" | bc)
        echo "Recent Failure Rate: $failure_rate (${recent_failures}/${recent_episodes})"
        
        if (( $(echo "$failure_rate > $CIRCUIT_BREAKER_FAILURE_RATE" | bc -l) )); then
            echo -e "${RED}🚨 CIRCUIT BREAKER TRIGGERED: Failure rate exceeded $CIRCUIT_BREAKER_FAILURE_RATE${NC}"
            echo "Aborting divergence testing..."
            return 1
        fi
    fi
    
    # 3. Check consecutive failures
    local consecutive_failures=0
    for i in $(seq 1 $CIRCUIT_BREAKER_CONSECUTIVE_FAILURES); do
        local last_episode=$(find /tmp -name "ay-prod-episode-*.json" -type f | sort -t_ -k4 -n | tail -n $i | head -n 1)
        if [ -f "$last_episode" ] && grep -q '"outcome":"failure"' "$last_episode"; then
            ((consecutive_failures++))
        else
            break
        fi
    done
    
    echo "Consecutive Failures: $consecutive_failures"
    
    if [ $consecutive_failures -ge $CIRCUIT_BREAKER_CONSECUTIVE_FAILURES ]; then
        echo -e "${RED}🚨 CIRCUIT BREAKER TRIGGERED: $consecutive_failures consecutive failures${NC}"
        echo "Aborting divergence testing..."
        return 1
    fi
    
    echo -e "${GREEN}✅ All circuit breakers OK${NC}"
    echo ""
    return 0
}

# ============================================================================
# Divergence Injection
# ============================================================================

inject_divergence() {
    # Randomly decide if this episode should have divergence
    local random=$(( RANDOM % 100 ))
    local divergence_threshold=$(echo "$DIVERGENCE_RATE * 100" | bc | cut -d. -f1)
    
    if [ $random -lt $divergence_threshold ]; then
        echo "🎲 Divergence: INJECTED"
        export AY_INJECT_FAILURE=1  # Signal to ceremony to introduce variance
        export AY_FAILURE_TYPE="random"  # Could be: timeout, validation_skip, partial_result
        return 0
    else
        echo "🎲 Divergence: NORMAL"
        unset AY_INJECT_FAILURE
        unset AY_FAILURE_TYPE
        return 1
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🧪 Controlled Divergence Testing${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Pre-flight checks
    preflight_checks
    
    # Initialize counters
    local success_count=0
    local failure_count=0
    local divergent_count=0
    
    # Run episodes
    echo -e "${GREEN}🚀 Starting divergence testing...${NC}"
    echo ""
    
    for i in $(seq 1 $EPISODE_COUNT); do
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}Episode $i/$EPISODE_COUNT${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        # Inject divergence randomly
        if inject_divergence; then
            ((divergent_count++))
        fi
        
        # Run ceremony
        if "$SCRIPT_DIR/ay-prod-cycle.sh" "$DIVERGENCE_CIRCLE" standup advisory; then
            ((success_count++))
            echo -e "${GREEN}✅ Episode $i: SUCCESS${NC}"
        else
            ((failure_count++))
            echo -e "${RED}❌ Episode $i: FAILURE${NC}"
        fi
        
        # Check circuit breakers
        if ! check_circuit_breakers $i; then
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${RED}🚨 TESTING ABORTED BY CIRCUIT BREAKER${NC}"
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            break
        fi
        
        # Sleep between episodes (except last)
        if [ $i -lt $EPISODE_COUNT ]; then
            sleep $SLEEP_BETWEEN
        fi
    done
    
    # Final report
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 Divergence Testing Results${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Total Episodes: $((success_count + failure_count))"
    echo "Successes: $success_count"
    echo "Failures: $failure_count"
    echo "Divergent Episodes: $divergent_count"
    echo ""
    
    local success_rate=$(echo "scale=2; $success_count / ($success_count + $failure_count) * 100" | bc)
    echo "Success Rate: ${success_rate}%"
    echo "Expected Success Rate: $(echo "scale=2; (1 - $DIVERGENCE_RATE) * 100" | bc)%"
    echo ""
    
    # Check learned skills
    echo "Learned Skills:"
    timeout 5s npx agentdb skill search "$DIVERGENCE_CIRCLE" 10 2>/dev/null || echo "  (AgentDB unavailable - check local cache)"
    echo ""
    
    # Recommendation
    if (( $(echo "$success_rate > 70" | bc -l) )); then
        echo -e "${GREEN}✅ RECOMMENDATION: Learning appears successful${NC}"
        echo "   System maintained acceptable performance despite divergence"
    elif (( $(echo "$success_rate > 50" | bc -l) )); then
        echo -e "${YELLOW}⚠️  RECOMMENDATION: Marginal results${NC}"
        echo "   Consider reducing divergence rate or increasing episode count"
    else
        echo -e "${RED}❌ RECOMMENDATION: Testing failed${NC}"
        echo "   Restore backup and investigate circuit breaker triggers"
    fi
}

# Entry point
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
