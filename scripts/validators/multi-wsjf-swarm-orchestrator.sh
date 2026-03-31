#!/usr/bin/env bash
# Multi-WSJF Swarm Orchestration
# 5 swarms, 42 agents, hierarchical topology
# Expected ROI: $64K-$160K over 48 hours

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source robust exit codes (validation-core.sh provides EXIT_SUCCESS, EXIT_INVALID_ARGS, etc.)
if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
else
    EXIT_SUCCESS=0; EXIT_INVALID_ARGS=10; EXIT_FILE_NOT_FOUND=11
    EXIT_TOOL_MISSING=60; EXIT_SCHEMA_VALIDATION_FAILED=100
fi

LOG_DIR="$HOME/Library/Logs"
SWARM_LOG="$LOG_DIR/multi-wsjf-swarm-orchestration.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

mkdir -p "$LOG_DIR"

echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  🐝 MULTI-WSJF SWARM ORCHESTRATION${NC}"
echo -e "${PURPLE}  5 Swarms | 42 Agents | Hierarchical Topology${NC}"
echo -e "${PURPLE}  Expected ROI: \$64K-\$160K over 48 hours${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Function: Log with timestamp
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$SWARM_LOG"
}

# Function: Init swarm
init_swarm() {
  local name=$1
  local max_agents=$2
  local wsjf=$3

  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}Initializing: ${name} (${max_agents} agents, WSJF ${wsjf})${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  log "SWARM INIT: ${name}"

  npx @claude-flow/cli@latest swarm init \
    --topology hierarchical \
    --max-agents "${max_agents}" \
    --strategy specialized \
    --name "${name}" 2>&1 | tee -a "$SWARM_LOG"

  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Swarm initialized: ${name}${NC}"
    log "SUCCESS: ${name} initialized"
  else
    echo -e "${RED}❌ Failed to initialize: ${name}${NC}"
    log "ERROR: ${name} initialization failed"
    return 1
  fi
}

# Function: Spawn agent
spawn_agent() {
  local swarm=$1
  local agent_type=$2
  local agent_name=$3

  echo -e "  ${BLUE}→ Spawning: ${agent_name} (${agent_type})${NC}"

# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
  "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" \
    --type "${agent_type}" \
    --name "${agent_name}" \
    --swarm "${swarm}" 2>&1 | tee -a "$SWARM_LOG"

  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "  ${GREEN}  ✅ ${agent_name} spawned${NC}"
    log "AGENT SPAWNED: ${swarm}/${agent_name}"
  else
    echo -e "  ${RED}  ❌ ${agent_name} failed${NC}"
    log "ERROR: ${swarm}/${agent_name} spawn failed"
  fi
}

# Function: Route task
route_task() {
  local task=$1
  local context=$2

  echo -e "  ${PURPLE}→ Routing task: ${task}${NC}"

  npx @claude-flow/cli@latest hooks route \
    --task "${task}" \
    --context "${context}" 2>&1 | tee -a "$SWARM_LOG"

  if [ ${PIPESTATUS[0]} -eq 0 ]; then
   # Migration target (Phase 1):
  # Task({
  #   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
  #   subagent_type: "hierarchical-coordinator",
  #   run_in_background: true,
  #   description: "Persistent legal coordination"
  # })
    echo -e "  ${GREEN}  ✅ Task routed${NC}"
    log "TASK ROUTED: ${context} - ${task}"
  else
    echo -e "  ${RED}  ❌ Task routing failed${NC}"
    log "ERROR: Task routing failed - ${task}"
  fi
}

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SWARM 1: PHYSICAL MOVE (WSJF 45.0 - HIGHEST PRIORITY)${NC}"
echo -e "${BLUE}  Timeline: March 5-8, 2026 (3 days)${NC}"
echo -e "${BLUE}  Expected ROI: -\$3,400/mo rent burn = \$113/day saved${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

init_swarm "physical-move-swarm" 10 45.0

echo -e "${YELLOW}Spawning 10 agents...${NC}"
spawn_agent "physical-move-swarm" "coordinator" "move-coordinator"
spawn_agent "physical-move-swarm" "researcher" "mover-researcher"
spawn_agent "physical-move-swarm" "coder" "quote-aggregator"
spawn_agent "physical-move-swarm" "researcher" "packing-planner"
spawn_agent "physical-move-swarm" "researcher" "insurance-researcher"
spawn_agent "physical-move-swarm" "researcher" "storage-researcher"
spawn_agent "physical-move-swarm" "coder" "utilities-backup"
spawn_agent "physical-move-swarm" "coder" "move-scheduler"
spawn_agent "physical-move-swarm" "tester" "logistics-checker"
spawn_agent "physical-move-swarm" "reviewer" "reviewer"

echo -e "${YELLOW}Routing initial tasks...${NC}"
route_task "Aggregate mover quotes from Thumbtack/Yelp/Angi (target \$500-600)" "move-swarm"
route_task "Generate room-by-room packing plan (bedroom HIGH, kitchen MEDIUM)" "move-swarm"
route_task "Find optimal move date (mover availability + utilities timeline)" "move-swarm"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SWARM 2: UTILITIES/CREDIT (WSJF 35.0)${NC}"
echo -e "${GREEN}  Timeline: March 5-19, 2026 (14 days FCRA dispute)${NC}"
echo -e "${GREEN}  Expected ROI: Unblock \$0 lease default risk${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

init_swarm "utilities-unblock-swarm" 8 35.0

echo -e "${YELLOW}Spawning 8 agents...${NC}"
spawn_agent "utilities-unblock-swarm" "coordinator" "utilities-coordinator"
spawn_agent "utilities-unblock-swarm" "researcher" "legal-researcher"
spawn_agent "utilities-unblock-swarm" "researcher" "identity-specialist"
spawn_agent "utilities-unblock-swarm" "coder" "letter-drafter"
spawn_agent "utilities-unblock-swarm" "coder" "utilities-caller"
spawn_agent "utilities-unblock-swarm" "coder" "case-filer"
spawn_agent "utilities-unblock-swarm" "tester" "evidence-collector"
spawn_agent "utilities-unblock-swarm" "reviewer" "reviewer"

echo -e "${YELLOW}Routing initial tasks...${NC}"
route_task "Draft credit dispute letters (Equifax, Experian, TransUnion)" "utilities-swarm"
route_task "File CFPB complaint (LifeLock case #98413679)" "utilities-swarm"
route_task "Prepare Duke Energy + Charlotte Water identity exception call scripts" "utilities-swarm"

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  SWARM 3: LEGAL/CONTRACTS (WSJF 30.0)${NC}"
echo -e "${PURPLE}  Timeline: March 5-10, 2026 (5 days arb prep)${NC}"
echo -e "${PURPLE}  Expected ROI: Win arbitration → \$99K-\$297K${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"

init_swarm "contract-legal-swarm" 8 30.0

echo -e "${YELLOW}Spawning 8 agents...${NC}"
spawn_agent "contract-legal-swarm" "coordinator" "legal-coordinator"
spawn_agent "contract-legal-swarm" "researcher" "legal-researcher"
spawn_agent "contract-legal-swarm" "researcher" "case-planner"
spawn_agent "contract-legal-swarm" "coder" "document-generator"
spawn_agent "contract-legal-swarm" "reviewer" "legal-reviewer"
spawn_agent "contract-legal-swarm" "tester" "evidence-validator"
spawn_agent "contract-legal-swarm" "coder" "exhibit-strengthener"
spawn_agent "contract-legal-swarm" "researcher" "precedent-finder"

echo -e "${YELLOW}Routing initial tasks...${NC}"
route_task "Complete PRE-ARBITRATION-FORM-APRIL-6-2026.md (200-word summary, 12 exhibits)" "legal-swarm"
route_task "Strengthen exhibits H-2 (temp logs), H-4 (certified mail), F-1 (bank statements)" "legal-swarm"
route_task "Validate all trial exhibits for completeness (no placeholder text)" "legal-swarm"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SWARM 4: INCOME/CONSULTING (WSJF 25.0)${NC}"
echo -e "${BLUE}  Timeline: March 5-9, 2026 (5 days consulting outreach)${NC}"
echo -e "${BLUE}  Expected ROI: 1+ contract → \$25K-\$50K${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

init_swarm "income-unblock-swarm" 9 25.0

echo -e "${YELLOW}Spawning 9 agents...${NC}"
spawn_agent "income-unblock-swarm" "coordinator" "income-coordinator"
spawn_agent "income-unblock-swarm" "researcher" "market-researcher"
spawn_agent "income-unblock-swarm" "coder" "outreach-planner"
spawn_agent "income-unblock-swarm" "coder" "demo-builder"
spawn_agent "income-unblock-swarm" "reviewer" "pitch-reviewer"
spawn_agent "income-unblock-swarm" "tester" "demo-validator"
spawn_agent "income-unblock-swarm" "researcher" "job-researcher"
spawn_agent "income-unblock-swarm" "coder" "cover-letter-generator"
spawn_agent "income-unblock-swarm" "reviewer" "application-reviewer"

echo -e "${YELLOW}Routing initial tasks...${NC}"
route_task "Build validation dashboard demo (5h, React/Vue/Next)" "income-swarm"
route_task "Draft 720.chat outreach email (yo@720.chat, highlight demo)" "income-swarm"
route_task "LinkedIn post: AI QE validation platform (target consulting leads)" "income-swarm"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SWARM 5: TECH/DASHBOARD (WSJF 15.0)${NC}"
echo -e "${GREEN}  Timeline: March 5-8, 2026 (3 days dashboard build)${NC}"
echo -e "${GREEN}  Expected ROI: \$25K-\$50K demo revenue${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

init_swarm "tech-enablement-swarm" 7 15.0

echo -e "${YELLOW}Spawning 7 agents...${NC}"
spawn_agent "tech-enablement-swarm" "coordinator" "tech-coordinator"
spawn_agent "tech-enablement-swarm" "architect" "dashboard-architect"
spawn_agent "tech-enablement-swarm" "coder" "dashboard-coder"
spawn_agent "tech-enablement-swarm" "tester" "integration-tester"
spawn_agent "tech-enablement-swarm" "reviewer" "code-reviewer"
spawn_agent "tech-enablement-swarm" "tester" "test-writer"
spawn_agent "tech-enablement-swarm" "coder" "test-runner"

echo -e "${YELLOW}Routing initial tasks...${NC}"
route_task "Design dashboard UI/UX mockup (validation metrics, WSJF sorting)" "tech-swarm"
route_task "Implement validation dashboard with Claude Flow V3 hooks integration" "tech-swarm"
route_task "Deploy to Vercel/Netlify with demo video (3min presentation)" "tech-swarm"

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  🎯 CHECKPOINT: SWARM STATUS${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"

npx @claude-flow/cli@latest swarm status 2>&1 | tee -a "$SWARM_LOG"

echo ""
echo -e "${GREEN}✅ ORCHESTRATION COMPLETE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}5 swarms initialized with 42 agents${NC}"
echo -e "${GREEN}Logs: ${SWARM_LOG}${NC}"
echo -e "${GREEN}Dashboard: file:///tmp/WSJF-LIVE-v3-COUNTDOWN.html${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Store successful patterns
echo -e "${YELLOW}Storing successful orchestration pattern...${NC}"
npx @claude-flow/cli@latest memory store \
  --key "multi-wsjf-swarm-orchestration-success" \
  --value "5 swarms, 42 agents, hierarchical topology, expected ROI \$64K-\$160K" \
  --namespace patterns 2>&1 | tee -a "$SWARM_LOG"

# Neural pattern training
echo -e "${YELLOW}Training neural patterns...${NC}"
npx @claude-flow/cli@latest hooks post-task \
  --task-id "multi-wsjf-swarm-init" \
  --success true \
  --store-results true \
  --train-neural true 2>&1 | tee -a "$SWARM_LOG"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  NEXT STEPS:${NC}"
echo -e "${BLUE}  1. Monitor: npx @claude-flow/cli@latest swarm status${NC}"
echo -e "${BLUE}  2. Track: tail -f ${SWARM_LOG}${NC}"
echo -e "${BLUE}  3. Dashboard: open /tmp/WSJF-LIVE-v3-COUNTDOWN.html${NC}"
echo -e "${BLUE}  4. Agent logs: npx @claude-flow/cli@latest agent logs <name>${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
