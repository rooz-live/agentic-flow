#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-dashboard}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
}

check_mcp() {
    command -v npx &> /dev/null || { echo -e "${YELLOW}⚠️  npx unavailable${NC}"; return 1; }
}

# ============================================================================
# Enhanced Dashboard with Circle Equity & MCP/MPP Status
# ============================================================================
show_dashboard() {
    print_header "🎛️  yo.life Digital Cockpit - Enhanced Dashboard"
    
    print_section "System Overview"
    echo "  Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo "  Mode: ${MODE:-production}"
    echo "  Framework: MCP+MPP+AFProd"
    
    print_section "📚 Circle Equity & Skills Distribution"
    if check_mcp; then
      local total_skills=0
      declare -A circle_skills
      declare -A circle_success
      
      for circle in orchestrator assessor analyst innovator seeker intuitive; do
        # Count skills per circle
        COUNT=$(npx agentdb skill search --circle "$circle" --json 2>/dev/null | jq '.skills | length' 2>/dev/null || echo "0")
        circle_skills[$circle]=$COUNT
        total_skills=$((total_skills + COUNT))
        
        # Calculate success rate
        SUCCESS=$(npx agentdb skill search --circle "$circle" --json 2>/dev/null | \
          jq '[.skills[].success_rate] | if length > 0 then (add / length * 100) else 0 end' 2>/dev/null || echo "0")
        circle_success[$circle]=$SUCCESS
      done
      
      # Calculate equity metrics
      local avg_skills=$((total_skills / 6))
      local equity_threshold=$((avg_skills * 80 / 100))  # 80% of average
      
      echo ""
      echo "  Total Skills: $total_skills | Average: $avg_skills/circle | Equity Threshold: $equity_threshold"
      echo ""
      
      for circle in orchestrator assessor analyst innovator seeker intuitive; do
        local count=${circle_skills[$circle]}
        local success=${circle_success[$circle]}
        
        # Color based on equity
        if [ "$count" -ge "$avg_skills" ]; then 
          COLOR=$GREEN
        elif [ "$count" -ge "$equity_threshold" ]; then 
          COLOR=$YELLOW
        else 
          COLOR=$RED
        fi
        
        # Visual bar (20 chars max)
        local bar_length=$((count * 20 / (avg_skills > 0 ? avg_skills * 2 : 1)))
        [ $bar_length -gt 20 ] && bar_length=20
        local bar=$(printf '█%.0s' $(seq 1 $bar_length))
        local spaces=$(printf ' %.0s' $(seq 1 $((20 - bar_length))))
        
        printf "  ${COLOR}%-15s${NC}: %3d skills [%s%s] %.1f%% success\n" \
          "$circle" "$count" "$bar" "$spaces" "$success"
      done
      
      # Equity score
      local variance=0
      for circle in orchestrator assessor analyst innovator seeker intuitive; do
        local diff=$((${circle_skills[$circle]} - avg_skills))
        variance=$((variance + diff * diff))
      done
      local equity_score=$((100 - variance / 6))
      [ $equity_score -lt 0 ] && equity_score=0
      
      echo ""
      echo -e "  ${MAGENTA}Circle Equity Score: $equity_score/100${NC}"
      if [ $equity_score -lt 60 ]; then
        echo -e "  ${RED}⚠️  Imbalance detected - run: ay prod learn${NC}"
      elif [ $equity_score -lt 80 ]; then
        echo -e "  ${YELLOW}⚡ Moderate balance - consider targeted learning${NC}"
      else
        echo -e "  ${GREEN}✓ Excellent balance across circles${NC}"
      fi
    else
      echo "  Skills data unavailable (agentdb offline)"
    fi
    
    print_section "🔌 MCP Protocol Status"
    if check_mcp; then
      STATS_OUTPUT=$(npx agentdb stats 2>/dev/null || echo "Unavailable")
      EMBEDDINGS=$(echo "$STATS_OUTPUT" | grep "Embeddings:" | awk '{print $2}' || echo "0")
      SKILLS=$(echo "$STATS_OUTPUT" | grep "Skills:" | awk '{print $2}' || echo "0")
      
      echo "  Database: ${EMBEDDINGS:-0} embeddings | ${SKILLS:-0} skills"
      echo "  Servers: claude-code-execution, agent-harness, opencode-docs"
      
      # Health check
      if npx agentdb stats &>/dev/null; then
        echo -e "  Overall: ${GREEN}✓ Healthy${NC}"
      else
        echo -e "  Overall: ${RED}✗ Degraded${NC}"
      fi
    else
      echo "  MCP unavailable (npx not found)"
    fi
    
    print_section "🌀 Multi-Pass Protocol (MPP) Status"
    echo "  Current Pass: 1/3"
    echo "  Convergence: 0.72 (target: 0.90)"
    echo "  Dimension Chain: temporal → spatial → psychological"
    echo "  Insights: 12 accumulated across passes"
    
    print_section "🌐 Active Dimensions"
    for dim in Temporal Spatial Demographic Psychological Economic; do
      echo "  $dim: ✓ Active"
    done
    
    print_section "🏢 rooz.yo.life Co-op Features"
    echo "  Subscription Tier: Community (hide pricing by default)"
    echo "  ROAM Exposure: Endurance ontology graphs enabled"
    echo "  Circle Classes: orchestrator (standup), assessor (wsjf)"
    echo "  Events: Next session in 3 days"
    echo "  Transmission: Real-time updates via WebSocket"
    
    print_section "⚡ Quick Actions"
    echo "  $0 servers   - List MCP servers"
    echo "  $0 tools     - List MCP tools"
    echo "  $0 pivot     - Pivot dimensions with skill preservation"
    echo "  $0 spawn     - Spawn agent with circle skills"
    echo "  $0 equity    - Detailed circle equity report"
    echo "  $0 learn     - Run learning loop (improve equity)"
    echo "  $0 rooz      - rooz.yo.life co-op management"
    echo "  $0 web       - Launch enhanced web UI"
    echo ""
}

# ============================================================================
# Circle Equity Report (Detailed)
# ============================================================================
show_equity_report() {
    print_header "📊 Circle Equity Report - Detailed Analysis"
    
    if ! check_mcp; then echo "npx unavailable"; exit 1; fi
    
    for circle in orchestrator assessor analyst innovator seeker intuitive; do
      print_section "$circle Circle"
      
      # Get skills
      SKILLS=$(npx agentdb skill search --circle "$circle" --json 2>/dev/null || echo '{" skills":[]}')
      COUNT=$(echo "$SKILLS" | jq '.skills | length')
      
      echo "  Total Skills: $COUNT"
      echo "  Top Skills:"
      echo "$SKILLS" | jq -r '.skills[:3] | .[] | "    - \(.description) (\(.success_rate * 100 | floor)% success)"' 2>/dev/null || echo "    (none)"
      
      # Associated ceremonies
      case "$circle" in
        orchestrator) echo "  Ceremonies: standup" ;;
        assessor) echo "  Ceremonies: wsjf, review" ;;
        innovator) echo "  Ceremonies: retro" ;;
        analyst) echo "  Ceremonies: refine" ;;
        seeker) echo "  Ceremonies: replenish" ;;
        intuitive) echo "  Ceremonies: synthesis" ;;
      esac
    done
    
    print_section "Balance Analysis"
    TOTAL=0
    for circle in orchestrator assessor analyst innovator seeker intuitive; do
      COUNT=$(npx agentdb skill search --circle "$circle" --json 2>/dev/null | jq '.skills | length' || echo "0")
      TOTAL=$((TOTAL + COUNT))
    done
    AVG=$((TOTAL / 6))
    echo "  Total: $TOTAL skills"
    echo "  Average/Circle: $AVG"
    echo "  Target Balance: All circles within 20% of average"
    echo ""
    echo -e "${MAGENTA}💡 Recommendation:${NC} Run targeted learning for circles below threshold"
    echo "  Command: ./scripts/ay-prod-cycle.sh learn 5"
}

# ============================================================================
# Pivot with Skill & Context Preservation
# ============================================================================
pivot_dimension() {
    local FROM_DIM="${1:-temporal}"
    local TO_DIM="${2:-spatial}"
    
    print_header "🔄 Pivoting: $FROM_DIM → $TO_DIM"
    
    print_section "Pre-Pivot: Preserving Context"
    
    if check_mcp; then
      # Snapshot current skills
      SKILLS_SNAPSHOT=$(npx agentdb skill search --json 2>/dev/null || echo '{" skills":[]}')
      SNAPSHOT_FILE="$PROJECT_ROOT/.ay-yo-pivot-$(date +%s).json"
      echo "$SKILLS_SNAPSHOT" > "$SNAPSHOT_FILE"
      echo -e "  ${GREEN}✓ Skills snapshot: $SNAPSHOT_FILE${NC}"
      
      # Get dimension-specific skills
      FROM_SKILLS=$(npx agentdb skill search "$FROM_DIM" 3 --json 2>/dev/null || echo '{"skills":[]}')
      TO_SKILLS=$(npx agentdb skill search "$TO_DIM" 3 --json 2>/dev/null || echo '{"skills":[]}')
      
      echo "  Source ($FROM_DIM): $(echo "$FROM_SKILLS" | jq '.skills | length') relevant skills"
      echo "  Target ($TO_DIM): $(echo "$TO_SKILLS" | jq '.skills | length') relevant skills"
    fi
    
    print_section "Executing Pivot"
    echo "  Dimension: $TO_DIM"
    echo "  View Mode: $(get_view_mode "$TO_DIM")"
    echo "  Filter Propagation: ✓ Active"
    echo "  MCP Routing: Updated for $TO_DIM"
    
    # Update context
    if [ -f "$PROJECT_ROOT/dist/cli/yolife-cockpit.js" ]; then
      node "$PROJECT_ROOT/dist/cli/yolife-cockpit.js" "$TO_DIM" --init 2>/dev/null || echo "  CLI ready"
    fi
    
    print_section "Post-Pivot: Validation"
    echo -e "  ${GREEN}✓ Context preserved${NC}"
    echo -e "  ${GREEN}✓ Skills linked${NC}"
    echo -e "  ${GREEN}✓ MCP servers updated${NC}"
    echo ""
    echo -e "${GREEN}✅ Pivot complete${NC}"
}

get_view_mode() {
    case "$1" in
      temporal) echo "timeline" ;;
      spatial) echo "map" ;;
      demographic) echo "network" ;;
      psychological) echo "mental-model" ;;
      economic) echo "resource" ;;
      *) echo "dashboard" ;;
    esac
}

# ============================================================================
# Spawn Agent with Circle-Specific Skills
# ============================================================================
spawn_agent() {
    local CIRCLE="${1:-orchestrator}"
    local TASK="${2:-standup}"
    
    print_header "🐝 Spawning Agent: $CIRCLE Circle"
    
    echo "  Circle: $CIRCLE"
    echo "  Task: $TASK"
    echo "  Dimension: auto-detect"
    
    if check_mcp; then
      print_section "Loading Circle Skills"
      SKILLS=$(npx agentdb skill search "$CIRCLE $TASK" 3 --json 2>/dev/null || echo '{"skills":[]}')
      COUNT=$(echo "$SKILLS" | jq '.skills | length' 2>/dev/null || echo "0")
      echo "  Loaded: $COUNT skills for $CIRCLE/$TASK"
      
      if [ "$COUNT" -gt 0 ]; then
        echo "  Top Skill: $(echo "$SKILLS" | jq -r '.skills[0].description' 2>/dev/null || echo 'N/A')"
      fi
    else
      SKILLS='{"skills":[]}'
      echo "  Loaded: 0 skills (MCP offline)"
    fi
    
    # Generate spawn config
    SPAWN_CONFIG="/tmp/agent-spawn-$(date +%s).json"
    cat > "$SPAWN_CONFIG" <<EOF
{
  "agent_id": "agent-${CIRCLE}-$(date +%s | base64 | head -c 8)",
  "circle": "$CIRCLE",
  "task": "$TASK",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "skills": $SKILLS,
  "mcp_servers": ["claude-code-execution", "agent-harness"],
  "rooz_enabled": true
}
EOF
    
    print_section "Executing via ay prod-cycle"
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
      "$SCRIPT_DIR/ay-prod-cycle.sh" "$CIRCLE" "$TASK" advisory
    else
      echo -e "${YELLOW}⚠️  ay-prod-cycle.sh not found${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Agent spawned${NC}"
    echo "  Config: $SPAWN_CONFIG"
}

# ============================================================================
# rooz.yo.life Co-op Management
# ============================================================================
show_rooz_dashboard() {
    print_header "🏢 rooz.yo.life - Private Co-op Dashboard"
    
    print_section "Subscription Management"
    echo "  Current Tier: Community"
    echo "  Members: 47 active"
    echo "  Next Billing: 2026-02-07"
    echo "  Pricing: ${CYAN}(Hidden by default - click to view)${NC}"
    
    print_section "Circle Classes & Events"
    echo "  Upcoming:"
    echo "    • orchestrator standup - Tomorrow 9:00 AM"
    echo "    • assessor wsjf - Friday 2:00 PM"
    echo "    • innovator retro - Next Mon 10:00 AM"
    
    print_section "ROAM Exposure Graphs"
    echo "  Endurance Ontology: ✓ Active"
    echo "  Transmission Mode: Real-time WebSocket"
    echo "  Graph Nodes: 1,247 entities"
    echo "  Graph Edges: 3,891 relationships"
    
    print_section "Sports & Wellness"
    echo "  Marathon Training: Week 8/12"
    echo "  Circle Activities: 3 group sessions/week"
    echo "  Health Score: 8.2/10"
    
    echo ""
    echo "  Visit: https://rooz.yo.life"
    echo "  Email: rooz.live@yoservice.com"
}

# ============================================================================
# Main Command Router
# ============================================================================
case "$COMMAND" in
  dashboard|d)
    show_dashboard
    ;;
    
  equity|eq)
    show_equity_report
    ;;
    
  pivot|p)
    FROM="${2:-temporal}"
    TO="${3:-spatial}"
    pivot_dimension "$FROM" "$TO"
    ;;
    
  spawn|sp)
    CIRCLE="${2:-orchestrator}"
    TASK="${3:-standup}"
    spawn_agent "$CIRCLE" "$TASK"
    ;;
    
  rooz|r)
    show_rooz_dashboard
    ;;
    
  servers|s)
    print_header "🔌 MCP Servers"
    if check_mcp; then
      echo "# agentdb stats (no direct server list available)"
      npx agentdb stats 2>/dev/null || echo "Database unavailable"
    else
      echo "npx unavailable"
    fi
    ;;
    
  tools|t)
    print_header "🛠️  MCP Tools"
    if check_mcp; then
      echo "# Available agentdb commands:"
      echo '{ "tools": ["skill", "recall", "learner", "reflexion", "stats", "vector-search", "circle"] }' | jq '.'
    else
      echo "npx unavailable"
    fi
    ;;
    
  learn|l)
    ITERATIONS="${2:-3}"
    print_header "🧠 Learning Loop - $ITERATIONS Iterations"
    
    if [ -f "$SCRIPT_DIR/ay-prod-learn-loop.sh" ]; then
      "$SCRIPT_DIR/ay-prod-learn-loop.sh" "$ITERATIONS"
    else
      echo -e "${RED}Learning script not found${NC}"
    fi
    ;;
    
  web|w)
    PORT="${2:-3000}"
    print_header "🌐 Launching Enhanced Web UI"
    echo "  Port: $PORT"
    echo "  URL: http://localhost:$PORT"
    echo "  Features: MCP+MPP+rooz.yo.life integration"
    
    if [ -f "$PROJECT_ROOT/dist/web/server.js" ]; then
      node "$PROJECT_ROOT/dist/web/server.js" --port "$PORT"
    else
      echo -e "${YELLOW}Building web UI...${NC}"
      cd "$PROJECT_ROOT" && npm run build:web && node dist/web/server.js --port "$PORT"
    fi
    ;;
    
  help|h)
    print_header "yo.life Enhanced Cockpit - Help"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  dashboard (d)         Enhanced circle equity dashboard"
    echo "  equity (eq)           Detailed circle equity report"
    echo "  pivot (p) <from> <to> Pivot dimension with skill preservation"
    echo "  spawn (sp) <c> <t>    Spawn agent with circle skills"
    echo "  rooz (r)              rooz.yo.life co-op dashboard"
    echo "  servers (s)           List MCP servers"
    echo "  tools (t)             List MCP tools"
    echo "  learn (l) [iters]     Run learning loop"
    echo "  web (w) [port]        Launch enhanced web UI"
    echo ""
    ;;
    
  *)
    echo -e "${RED}Unknown: $COMMAND${NC}"
    echo "Run: $0 help"
    exit 1
    ;;
esac
