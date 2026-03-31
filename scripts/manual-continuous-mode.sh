#!/usr/bin/env bash
set -euo pipefail

# Manual Continuous Improvement Mode
# Workaround for missing ay-continuous-improve.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
CHECK_INTERVAL_SECONDS=${CHECK_INTERVAL_SECONDS:-300}  # 5 minutes default
CYCLE_COUNT=0
START_TIME=$(date +%s)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔄 Continuous Improvement Mode${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Configuration:"
echo "  Check Interval: ${CHECK_INTERVAL_SECONDS}s"
echo "  Start Time: $(date)"
echo "  PID: $$"
echo ""
echo "To stop: kill $$"
echo ""

# Trap cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}🛑 Stopping Continuous Mode${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    local end_time=$(date +%s)
    local runtime=$((end_time - START_TIME))
    local hours=$((runtime / 3600))
    local minutes=$(((runtime % 3600) / 60))
    
    echo ""
    echo "Summary:"
    echo "  Total Cycles: $CYCLE_COUNT"
    echo "  Runtime: ${hours}h ${minutes}m"
    echo "  End Time: $(date)"
    echo ""
    
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main continuous loop
while true; do
    CYCLE_COUNT=$((CYCLE_COUNT + 1))
    CYCLE_START=$(date +%s)
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔄 Cycle #${CYCLE_COUNT}: $(date)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Step 1: Run all circles
    echo "▶ Step 1: Running all circles..."
    if "$SCRIPT_DIR/ay-yo-integrate.sh" all 2>&1 | grep -E "✅|Episode|Complete"; then
        echo -e "  ${GREEN}✓${NC} All circles completed"
    else
        echo -e "  ${YELLOW}⚠${NC} Some circles may have issues"
    fi
    
    # Step 2: Extract new skills
    echo ""
    echo "▶ Step 2: Extracting skills..."
    CONSOLIDATE_OUTPUT=$(npx agentdb skill consolidate 2>&1)
    
    if echo "$CONSOLIDATE_OUTPUT" | grep -qE "Created|updated"; then
        NEW_SKILLS=$(echo "$CONSOLIDATE_OUTPUT" | grep -oE "Created [0-9]+" | grep -oE "[0-9]+")
        UPDATED_SKILLS=$(echo "$CONSOLIDATE_OUTPUT" | grep -oE "updated [0-9]+" | grep -oE "[0-9]+")
        echo -e "  ${GREEN}✓${NC} Skills: +$NEW_SKILLS new, ~$UPDATED_SKILLS updated"
    else
        echo -e "  ${YELLOW}⊘${NC} No new skills (normal if recent consolidation)"
    fi
    
    # Step 3: Update cache
    echo ""
    echo "▶ Step 3: Updating offline cache..."
    if "$SCRIPT_DIR/export-skills-cache.sh" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Cache updated"
    else
        echo -e "  ${YELLOW}⚠${NC} Cache update failed (continuing)"
    fi
    
    # Step 4: Status report
    echo ""
    echo "▶ Step 4: Current Status"
    STATS=$(npx agentdb stats 2>&1)
    
    EPISODES=$(echo "$STATS" | grep "Episodes:" | awk '{print $2}')
    EMBEDDINGS=$(echo "$STATS" | grep "Embeddings:" | awk '{print $2}')
    
    # Count skill candidates
    SKILL_COUNT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM skill_candidates;" 2>/dev/null || echo "0")
    
    echo "  Episodes: $EPISODES"
    echo "  Embeddings: $EMBEDDINGS"
    echo "  Skill Patterns: $SKILL_COUNT"
    
    # Step 5: Resource check
    echo ""
    echo "▶ Step 5: Resource Status"
    
    # Memory check (macOS)
    if command -v vm_stat >/dev/null 2>&1; then
        FREE_MEM=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
        FREE_MB=$((FREE_MEM * 4096 / 1024 / 1024))
        
        if [ "$FREE_MB" -gt 500 ]; then
            echo -e "  ${GREEN}✓${NC} Memory: ${FREE_MB}MB free"
        elif [ "$FREE_MB" -gt 200 ]; then
            echo -e "  ${YELLOW}⚠${NC} Memory: ${FREE_MB}MB free (getting low)"
        else
            echo -e "  ${YELLOW}⚠${NC} Memory: ${FREE_MB}MB free (pausing 5 min)"
            sleep 300
        fi
    fi
    
    # Load average
    if command -v uptime >/dev/null 2>&1; then
        LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
        echo "  Load Average: $LOAD"
    fi
    
    # Cycle timing
    CYCLE_END=$(date +%s)
    CYCLE_DURATION=$((CYCLE_END - CYCLE_START))
    echo ""
    echo "Cycle Duration: ${CYCLE_DURATION}s"
    
    # Wait for next cycle
    echo ""
    echo -e "${CYAN}⏸️  Sleeping for ${CHECK_INTERVAL_SECONDS}s (until $(date -v+${CHECK_INTERVAL_SECONDS}S +'%H:%M:%S'))${NC}"
    echo ""
    
    sleep "$CHECK_INTERVAL_SECONDS"
done
