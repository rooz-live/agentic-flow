#!/usr/bin/env bash
set -euo pipefail

# Default to interactive cockpit for manual control
COMMAND="${1:-run}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TMP_DIR="${AY_TMP_DIR:-/tmp}"

# Load dynamic thresholds library
source "$SCRIPT_DIR/lib/dynamic-thresholds.sh" 2>/dev/null || true

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
}

check_mcp() {
    command -v npx &> /dev/null || { echo -e "${YELLOW}⚠️  npx unavailable${NC}"; return 1; }
}

case "$COMMAND" in
  dashboard|dash|db)
    print_header "yo.life Digital Cockpit"
    echo ""
    echo "Circles:"
    echo "  orchestrator"
    echo "  assessor"
    echo "  analyst"
    echo "  innovator"
    echo "  seeker"
    echo "  intuitive"
    echo ""
    echo "Circle Equity:"
    echo "  (dashboard view - detailed equity: ./scripts/ay-yo.sh equity)"
    echo ""
    ;;

  run|cycle)
    print_header "🚀 ay-yo run: inventory → cockpit (WSJF)"
    #1) Ensure schema + seed (idempotent)
    if command -v npx >/dev/null 2>&1; then
      echo "Ensuring completion tracker schema..."
      npx tsx "$SCRIPT_DIR/setup-completion-tracker.ts" >/dev/null || true
    fi
    #2) Optional: yolife inventory first if caller exported AY_YO_RUN_INVENTORY=1
    if [[ "${AY_YO_RUN_INVENTORY:-0}" == "1" ]]; then
      print_section "yolife inventory"
      echo "(skipped — external inventory entrypoint not wired here)"
    fi
    #3) Launch cockpit directly (always available path)
    if command -v npx >/dev/null 2>&1; then
      print_section "Launching WSJF cockpit"
      exec npx tsx "$SCRIPT_DIR/ay-yo-interactive-cockpit.ts"
    else
      echo -e "${RED}npx unavailable — cannot launch cockpit${NC}"
      exit 1
    fi
    ;;

  wsjf-cycle|wc)
    print_header "🔁 WSJF Auto-Cycle"
    # Optional backup beforehand
    if [[ "${AY_BACKUP:-1}" == "1" && -x "$SCRIPT_DIR/backup-agentdb.sh" ]]; then
      print_section "Backup"
      "$SCRIPT_DIR/backup-agentdb.sh" || echo -e "${YELLOW}⚠️  Backup failed (continuing)${NC}"
    fi
    # Ensure schema
    if command -v npx >/dev/null 2>&1; then
      npx tsx "$SCRIPT_DIR/setup-completion-tracker.ts" >/dev/null || true
      LIMIT_ARG="${2:-}"
      if [[ -n "$LIMIT_ARG" ]]; then
        exec npx tsx "$SCRIPT_DIR/ay-yo-interactive-cockpit.ts" --autocycle --limit="$LIMIT_ARG"
      else
        exec npx tsx "$SCRIPT_DIR/ay-yo-interactive-cockpit.ts" --autocycle --limit=3
      fi
    else
      echo -e "${RED}npx unavailable — cannot run auto-cycle${NC}"
      exit 1
    fi
    ;;

  auto|cycle)
    MODE="${2:-interactive}"
    MAX_ITERATIONS="${3:-10}"

    case "$MODE" in
      interactive|i)
        print_header "🔄 Intelligent Auto-Cycle (Interactive)"
        if command -v npx >/dev/null 2>&1; then
          npx tsx "$SCRIPT_DIR/ay-auto-cycle.ts" "$MAX_ITERATIONS"
        else
          echo -e "${RED}npx unavailable${NC}"
          exit 1
        fi
        ;;
      automatic|a|auto)
        print_header "🔄 Intelligent Auto-Cycle (Automatic)"
        if command -v npx >/dev/null 2>&1; then
          npx tsx "$SCRIPT_DIR/ay-auto-cycle.ts" "$MAX_ITERATIONS" --auto
        else
          echo -e "${RED}npx unavailable${NC}"
          exit 1
        fi
        ;;
      *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo "Available: interactive (i), automatic (a)"
        exit 1
        ;;
    esac
    ;;

  servers)
    print_header "🔌 MCP Servers"
    if check_mcp; then
      echo "# agentdb stats (no direct server list available)"
      npx agentdb stats 2>/dev/null || echo "Database unavailable"
    else
      echo "npx unavailable"; exit 1
    fi
    ;;

  tools|t)
    print_header "🛠️  MCP Tools"
    if check_mcp; then
      echo "# Available agentdb commands:"
      echo '{ "tools": ["skill", "recall", "learner", "reflexion", "stats", "vector-search"] }' | jq '.'
    else
      echo "npx unavailable"; exit 1
    fi
    ;;

  pivot|p)
    DIMENSION="${2:-temporal}"
    print_header "🔄 Pivoting to $DIMENSION dimension"

    if check_mcp; then
      print_section "Preserving Skills"
      SKILLS=$(npx agentdb skill search --json 2>/dev/null || echo '{"skills":[]}')
      SNAPSHOT="$PROJECT_ROOT/.ay-yo-skills-snapshot-$(date +%s).json"
      echo "$SKILLS" > "$SNAPSHOT"
      echo -e " ${GREEN}✓ Skills preserved: $SNAPSHOT${NC}"
    fi

    print_section "Updating Context"
    echo "  Dimension: $DIMENSION"

    if [ -f "$PROJECT_ROOT/dist/cli/yolife-cockpit.js" ]; then
      node "$PROJECT_ROOT/dist/cli/yolife-cockpit.js" "$DIMENSION" --init 2>/dev/null || echo "Ready"
    fi

    echo ""
    echo -e "${GREEN}✅ Pivoted to $DIMENSION${NC}"
    ;;

  spawn|sp)
    CIRCLE="${2:-orchestrator}"
    TASK="${3:-standup}"
    print_header "🐝 Spawning Agent"

    echo "  Circle: $CIRCLE"
    echo "  Task:   $TASK"

    if check_mcp; then
      print_section "Loading Skills"
      SKILLS=$("$SCRIPT_DIR/ay-prod-skill-lookup.sh" "$CIRCLE" "$TASK" --json 2>/dev/null || echo '{"skills":[]}')
      COUNT=$(echo "$SKILLS" | jq '.skills | length' 2>/dev/null || echo "0")
      echo "  Loaded $COUNT skills"
    else
      SKILLS='{"skills":[]}'
    fi

    SPAWN="$TMP_DIR/agent-spawn-$(date +%s).json"
    cat > "$SPAWN" <<EOF
{
  "agent": "$CIRCLE",
  "task": "$TASK",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "skills": $SKILLS
}
EOF

    print_section "Executing"
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
      "$SCRIPT_DIR/ay-prod-cycle.sh" "$CIRCLE" "$TASK" advisory
    else
      echo -e "${YELLOW}⚠️  Executor not found${NC}"
    fi

    echo ""
    echo -e "${GREEN}✅ Agent spawned${NC}"
    ;;

  thresholds|th)
    SUBCOMMAND="${2:-show}"
    print_header "📊 Dynamic Thresholds"

    if [ -f "$SCRIPT_DIR/calculate-thresholds.sh" ]; then
      "$SCRIPT_DIR/calculate-thresholds.sh" all
    else
      echo -e "${RED}Threshold calculator not found${NC}"
      exit 1
    fi
    ;;

  rewards|rw)
    SUBCOMMAND="${2:-diagnose}"

    case "$SUBCOMMAND" in
      diagnose|diag|d)
        print_header "🔍 Reward Distribution Diagnostics"
        if [ -f "$SCRIPT_DIR/diagnose-rewards.sh" ]; then
          "$SCRIPT_DIR/diagnose-rewards.sh"
        else
          echo -e "${RED}Diagnostic tool not found${NC}"
          exit 1
        fi
        ;;
      test|t)
        print_header "🧪 Testing Reward Calculator"
        if command -v npx >/dev/null 2>&1; then
          npx tsx -e "import { calculateRewardBreakdown } from './src/core/reward-calculator'; const b = await calculateRewardBreakdown({success:true,duration_ms:8000,expected_duration_ms:10000,quality_score:0.95,difficulty:1.2}); console.log(JSON.stringify(b,null,2));"
          else
          echo -e "${RED}npx unavailable${NC}"
          exit 1
        fi
        ;;
      simulate|sim|s)
        print_header "🎲 Simulating Reward Variance"
        if command -v npx >/dev/null 2>&1; then
          npx tsx "$SCRIPT_DIR/simulate-rewards.ts" "${3:-100}"
        else
          echo -e "${RED}npx unavailable${NC}"
          exit 1
        fi
        ;;
      breakdown|b)
        EPISODE_ID="${3:-}"
        if [ -z "$EPISODE_ID" ]; then
          echo -e "${RED}Usage: $0 rewards breakdown <episode_id>${NC}"
          exit 1
        fi
        print_header "📊 Reward Breakdown for Episode $EPISODE_ID"
        if command -v npx >/dev/null 2>&1; then
          npx tsx -e "import { calculateRewardBreakdown } from './src/core/reward-calculator'; console.log('Fetching episode $EPISODE_ID...'); console.log('Feature coming soon');"
          else
          echo -e "${RED}npx unavailable${NC}"
          exit 1
        fi
        ;;
      config|cfg|c)
        print_header "⚙️  Reward System Configuration"
        ;;
      *)
        echo -e "${RED}Unknown subcommand: $SUBCOMMAND${NC}"
        echo "Run: $0 rewards help"
        exit 1
        ;;
    esac
    ;;

  equity|eq)
    print_header "📊 Circle Equity Report"

    if ! check_mcp; then echo "npx unavailable"; exit 1; fi

    for circle in orchestrator assessor analyst innovator seeker intuitive; do
      print_section "$circle Circle"
      SKILLS_OUTPUT=$(npx agentdb skill search "$circle" 100 2>/dev/null || echo "")

      # Simple count - no skills exist yet
      if echo "$SKILLS_OUTPUT" | grep -q "No skills found"; then
        echo "  Total Skills: 0"
        echo "  No skills yet"
      else
        # Count results if any exist
        COUNT=$(echo "$SKILLS_OUTPUT" | grep -c "^#" || echo "0")
        echo "  Total Skills: $COUNT"
        echo "$SKILLS_OUTPUT" | head -12 | tail -n +2
      fi
    done

    print_section "Balance Analysis"
    echo "  Total: 0 skills (waiting for first production cycle)"
    echo "  Avg/Circle: 0"
    echo "  Status: Ready for skill accumulation"
    echo ""
    ;;

  dimension|dim)
    DIMENSION="${2:-temporal}"
    TASK="${3:-map}"
    print_header "🌐 yo.life Dimension: $DIMENSION"

    if check_mcp; then
      print_section "Loading Skills"
      SKILLS=$(npx agentdb skill search "$DIMENSION $TASK" 3 --json 2>/dev/null || echo '{"skills":[]}')
      BEST=$(echo "$SKILLS" | jq -r '.skills[0].description' 2>/dev/null)
      SUCCESS=$(echo "$SKILLS" | jq -r '.skills[0].success_rate' 2>/dev/null)

      if [ "$BEST" != "null" ] && [ ! -z "$BEST" ]; then
        echo -e "${GREEN}Best Practice (${SUCCESS}% success):${NC}"
        echo "  $BEST"
      fi
    fi

    print_section "Executing yo.life"
    if [ -f "$PROJECT_ROOT/dist/cli/yolife-cockpit.js" ]; then
      case "$DIMENSION" in
        temporal|spatial|demographic|psychological|economic)
          node "$PROJECT_ROOT/dist/cli/yolife-cockpit.js" "$DIMENSION"
          OUTCOME=$?
          ;;
        *)
          echo -e "${RED}Invalid dimension: $DIMENSION${NC}"
          exit 1
          ;;
      esac

      # Store episode for learning
      if check_mcp; then
        REWARD=$([ "$OUTCOME" -eq 0 ] && echo "1.0" || echo "0.0")
        EPISODE_ID="yolife_${DIMENSION}_$(date +%s)"
        EPISODE_FILE="$TMP_DIR/yolife-episode-$EPISODE_ID.json"

        cat > "$EPISODE_FILE" <<EOF
{
  "name": "${EPISODE_ID}",
  "task": "$TASK on yo.life ($DIMENSION dimension)",
  "reward": $REWARD,
  "trajectory": [
    {"state": "Executing yo.life $TASK", "action": "yolife_$TASK", "reward": $REWARD}
  ],
  "metadata": {
    "dimension": "$DIMENSION",
    "task_type": "yolife",
    "outcome": "$([ "$OUTCOME" -eq 0 ] && echo 'success' || echo 'failure')",
    "patterns": ["yo.life", "$TASK", "$DIMENSION"]
  }
}
EOF

        echo -e "\n${GREEN}✓ Episode stored: $EPISODE_FILE${NC}"

        # Store trajectory in database using TrajectoryStorage
        if [ -f "$SCRIPT_DIR/store-trajectory.sh" ]; then
            "$SCRIPT_DIR/store-trajectory.sh" "$EPISODE_ID" "$OUTCOME" "$REWARD" "$CIRCLE" "$CEREMONY" "$EPISODE_FILE" 2>/dev/null || true
            echo -e "\n  ${BLUE}💾 Trajectory stored in database${NC}"
        else
            echo -e "\n${YELLOW}⚠️  Trajectory storage not available, JSON file only${NC}"
        fi
      fi
    else
      echo -e "\n${YELLOW}⚠️  yo.life CLI not built${NC}"
      exit 1
    fi
    ;;

  learn|l)
    ITERATIONS="${2:-3}"
    print_header "🧠 Learning Loop - $ITERATIONS Iterations"

    if [ -f "$SCRIPT_DIR/ay-prod-learn-loop.sh" ]; then
      "$SCRIPT_DIR/ay-prod-learn-loop.sh" "$ITERATIONS"
    else
      echo -e "${RED}Learning script not found${NC}"
      exit 1
    fi
    ;;

  import|imp|import-skills)
    SKILLS_DIR="${2:-.claude/skills/}"
    print_header "📥 Importing Skills"

    if [ -f "$SCRIPT_DIR/ay-yo-import-skills.sh" ]; then
      "$SCRIPT_DIR/ay-yo-import-skills.sh" "$SKILLS_DIR"
    else
      echo -e "${RED}Import script not found${NC}"
      exit 1
    fi
    ;;

  interactive|i)
    # Interactive mode is now the default (no args = interactive)
    print_header "🎮 Interactive Cockpit (WSJF-Prioritized)"
    echo "Press number keys to execute recommended actions"
    echo "Press 'r' to refresh, 'q' to quit"
    echo ""

    if [ -f "$SCRIPT_DIR/ay-yo-interactive.sh" ]; then
      exec "$SCRIPT_DIR/ay-yo-interactive.sh"
    else
      echo -e "${RED}Interactive cockpit not found${NC}"
      exit 1
    fi
    ;;

  test|t)
    TEST_TYPE="${2:-all}"
    print_header "🧪 Running Tests: $TEST_TYPE"

    if [ -f "$SCRIPT_DIR/ay-prod-failure-scenarios.sh" ]; then
      "$SCRIPT_DIR/ay-prod-failure-scenarios.sh"
    else
      echo -e "${RED}Test not found: ay-prod-failure-scenarios.sh${NC}"
      exit 1
    fi

    if [ -f "$SCRIPT_DIR/test-phase-d-integration.sh" ]; then
      "$SCRIPT_DIR/test-phase-d-integration.sh"
    else
      echo -e "${RED}Test not found: test-phase-d-integration.sh${NC}"
      exit 1
    fi

    if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "a" ]; then
      if [ -f "$SCRIPT_DIR/ay-prod-failure-scenarios.sh" ]; then
        "$SCRIPT_DIR/ay-prod-failure-scenarios.sh"
        if [ -f "$SCRIPT_DIR/test-phase-d-integration.sh" ]; then
          "$SCRIPT_DIR/test-phase-d-integration.sh"
        fi
        echo "Running all test suites..."
      else
        echo -e "${RED}Test suite not found: ay-prod-failure-scenarios.sh${NC}"
        exit 1
      fi
    fi
    ;;

  monitor|m)
    MODE="${2:-once}"
    print_header "🌐 Domain Monitoring"

    if [ ! -f "$SCRIPT_DIR/stx-domain-monitor.sh" ]; then
      echo -e "${RED}Monitor not found: stx-domain-monitor.sh${NC}"
      exit 1
    fi

    case "$MODE" in
      continuous|c)
        INTERVAL="${3:-60}"
        "$SCRIPT_DIR/stx-domain-monitor.sh" continuous "$INTERVAL"
        ;;
      once|o|*)
        "$SCRIPT_DIR/stx-domain-monitor.sh" once
        ;;
      *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo "Run: $0 thresholds (show, circuit-breaker, degradation)"
        exit 1
        ;;
    esac
    ;;

  ssh-probe|probe)
    print_header "🔌 SSH Infrastructure Probe"

    echo -e "${BLUE}▶ Running SSH connectivity check..."
    echo "  Target: stx-aio"
    echo "  This verifies infrastructure health for ceremony execution"
    echo ""

    # Load SSH config from .env
    if [ -f "$PROJECT_ROOT/.env" ]; then
      STX_IP=$(grep "^YOLIFE_STX_HOST=" "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2)
      STX_USER=$(grep "^YOLIFE_STX_USER=" "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2 | sed "s|~|$HOME|g")
      STX_KEY=$(grep "^YOLIFE_STX_KEY=" "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2 | sed "s|~|$HOME|g")
      STX_KEY_EXPANDED="${STX_KEY/#\~/$HOME}"
      STX_PORT=$(grep "^YOLIFE_STX_PORTS=" "$PROJECT_ROOT/.env" 2>/dev/null | cut -d',' -f1 || echo "2222")

      # Perform actual SSH test
      if [ -n "$STX_IP" ] && [ -f "$STX_KEY_EXPANDED" ]; then
        if timeout 5 ssh -i "$STX_KEY_EXPANDED" -o ConnectTimeout=3 -o StrictHostKeyChecking=no -o BatchMode=yes \
            "$STX_USER@$STX_IP" -p "$STX_PORT" "echo 'PROBE_OK'" 2>/dev/null | grep -q "PROBE_OK"; then
            echo -e "${GREEN}✓ SSH connection successful${NC}"
            echo "  Host: $STX_USER@$STX_IP:$STX_PORT"
            echo "  Key: $STX_KEY"
            echo "  __AF_OK__"  # Success marker for infrastructure-health.ts
            exit 0
        else
          echo -e "${RED}✗ SSH connection failed${NC}"
          echo "  Host: $STX_USER@$STX_IP:$STX_PORT"
          echo "  Key: $STX_KEY"
          echo " Troubleshooting:"
          echo "    - Verify remote host is running"
          echo "    - Check network connectivity"
          echo "    - Validate key permissions (should be 600)"
          exit 1
        fi
      else
        echo -e "${YELLOW}⊘  SSH test skipped (missing config)${NC}"
        [ -z "$STX_IP" ] && echo "  ✗ YOLIFE_STX_HOST not set"
        [ ! -f "$STX_KEY_EXPANDED" ] && echo "  ✗ SSH key not found: $STX_KEY"
        exit 1
      fi
    else
      echo -e "${YELLOW}⊘  SSH test skipped (.env not found)${NC}"
      exit 1
    fi
    ;;

  web|w)
    PORT="${2:-3000}"
    print_header "🌐 Launching Web UI"
    echo "  Port: $PORT"
    echo "  URL: http://localhost:$PORT"

    if [ -f "$PROJECT_ROOT/dist/web/server.js" ]; then
      node "$PROJECT_ROOT/dist/web/server.js" --port "$PORT"
    elif [ -f "$PROJECT_ROOT/src/web/server.ts" ]; then
      npx tsx "$PROJECT_ROOT/src/web/server.ts" --port "$PORT"
    else
      echo -e "${YELLOW}Web UI not implemented${NC}"
      exit 1
    fi
    ;;

  help|h)
    print_header "yo.life Digital Cockpit - Help"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Core Commands:"
    echo "  (default)                  Interactive cockpit (WSJF-prioritized) ⭐️"
    echo "  run                        Launch interactive WSJF cockpit"
    echo "  wsjf-cycle [n]             Auto-execute top WSJF actions (default n=3)"
    echo "  auto [mode] [n]            🔄 Intelligent auto-cycle (interactive/automatic, max n iterations)"
    echo "  cycle [mode] [n]           Alias for 'auto'"
    echo ""
    echo "Reward System:"
    echo "  rewards (rw) diagnose      🔍 Diagnose reward distribution issues"
    echo "  rewards test               🧪 Test reward calculator"
    echo "  rewards simulate [n]       🎲 Simulate n episodes (default: 100)"
    echo "  rewards config             ⚙️  Show reward system configuration"
    echo "  rewards help               🎯 Full reward system help"
    echo ""
    echo "Thresholds & Monitoring:"
    echo "  thresholds (th) [sub]      📊 Dynamic thresholds (show, circuit-breaker, degradation)"
    echo "  monitor (m) [mode]         🌐 Domain monitoring (once, continuous)"
    echo "  ssh-probe (probe)          🔌 Infrastructure SSH connectivity check"
    echo ""
    echo "Learning & Skills:"
    echo "  learn (l) [n]              🧠 Run learning loop (n iterations)"
    echo "  import (imp) [dir]         📥 Import skills from directory"
    echo "  equity (eq)                📊 Detailed circle equity report"
    echo ""
    echo "Agents & Execution:"
    echo "  spawn (sp) <c> <t>         🐝 Spawn agent (circle, task)"
    echo "  dimension (dim) <d>        🌍 yo.life dimension view"
    echo "  pivot (p) <dim>            🔄 Pivot dimension"
    echo ""
    echo "Development:"
    echo "  test (t) [type]            🧪 Run test suites (failure, phase-d, all)"
    echo "  web (w) [port]             🌐 Launch web UI (default: 3000)"
    echo "  servers                    🔌 Database stats"
    echo "  tools                      🛠️  AgentDB commands"
    echo ""
    echo "Dimensions: temporal, spatial, demographic, psychological, economic"
    echo "Circles: orchestrator, assessor, innovator, analyst, seeker, intuitive"
    echo ""
    echo "Examples:"
    echo "  $0                         # Launch interactive cockpit"
    echo "  $0 auto                    # Run intelligent auto-cycle (interactive mode)"
    echo "  $0 auto automatic 5        # Run 5 iterations automatically (no prompts)"
    echo ""
    echo "  $0 rewards diagnose        # Check current reward distribution"
    echo "  $0 thresholds              # Show all thresholds"
    echo "  $0 learn 5                 # Run 5 learning iterations"
    echo "  $0 import claude/skills  # Import skills from directory"
    echo "  $0 equity                  # Detailed circle equity report"
    echo ""
    echo "  [Error] Unknown subcommand: $SUBCOMMAND${NC}"
    echo "Run: $0 rewards help"
    exit 1
    ;;
    esac
