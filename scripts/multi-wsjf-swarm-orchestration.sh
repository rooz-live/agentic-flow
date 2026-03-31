#!/usr/bin/env bash
set -euo pipefail

# Multi-WSJF Swarm Orchestration
# Purpose: Run 3 parallel swarms for high-WSJF tasks
# Timeline: March 5-10, 2026
# Target: Maximize ROI across legal prep, consulting income, and technical demos

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# WSJF-based swarm allocation
# Swarm 1 (Legal Track): WSJF 30.0 - Case #1 Arbitration prep
# Swarm 2 (Income Track): WSJF 35.0-45.0 - Consulting outreach + demo
# Swarm 3 (Tech Track): WSJF 25.0-30.0 - Validation dashboard + tests

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Initialize swarms
init_swarms() {
    log_info "Initializing 3 parallel WSJF-prioritized swarms..."
    
    # Swarm 1: Legal Track (hierarchical, 6-8 agents)
    log_info "Swarm 1: Legal Track (WSJF 30.0)"
    npx ruflo swarm init \
        --topology hierarchical \
        --max-agents 8 \
        --strategy specialized \
        --name "legal-prep-swarm"
    
    # Swarm 2: Income Track (hierarchical-mesh, 10-12 agents)
    log_info "Swarm 2: Income Track (WSJF 35.0-45.0)"
    npx ruflo swarm init \
        --topology hierarchical-mesh \
        --max-agents 12 \
        --strategy specialized \
        --name "consulting-income-swarm"
    
    # Swarm 3: Tech Track (hierarchical, 8 agents)
    log_info "Swarm 3: Tech Track (WSJF 25.0-30.0)"
    npx ruflo swarm init \
        --topology hierarchical \
        --max-agents 8 \
        --strategy specialized \
        --name "validation-dashboard-swarm"
    
    log_success "All 3 swarms initialized"
}

# Spawn agents for Swarm 1 (Legal Track)
spawn_legal_agents() {
    log_info "Spawning agents for Legal Track swarm..."
    
    # Coordinator (queen in hierarchical)
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t hierarchical-coordinator --name legal-coordinator
    
    # Specialized legal agents
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t researcher --name legal-researcher
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t planner --name case-planner
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t coder --name document-generator
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t reviewer --name legal-reviewer
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t tester --name evidence-validator
    
    log_success "Legal swarm agents spawned (6 agents)"
}

# Spawn agents for Swarm 2 (Income Track)
spawn_income_agents() {
    log_info "Spawning agents for Income Track swarm..."
    
    # Coordinator
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t hierarchical-coordinator --name income-coordinator
    
    # Consulting outreach agents
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t researcher --name market-researcher
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t planner --name outreach-planner
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t coder --name demo-builder
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t reviewer --name pitch-reviewer
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t tester --name demo-validator
    
    # Reverse recruiting agents
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t researcher --name job-researcher
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t coder --name cover-letter-generator
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t reviewer --name application-reviewer
    
    log_success "Income swarm agents spawned (9 agents)"
}

# Spawn agents for Swarm 3 (Tech Track)
spawn_tech_agents() {
    log_info "Spawning agents for Tech Track swarm..."
    
    # Coordinator
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t hierarchical-coordinator --name tech-coordinator
    
    # Validation dashboard agents
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t system-architect --name dashboard-architect
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t coder --name dashboard-coder
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t tester --name integration-tester
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t reviewer --name code-reviewer
    
    # Integration test agents
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t tester --name test-writer
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t coder --name test-runner
    
    log_success "Tech swarm agents spawned (7 agents)"
}

# Store swarm context in memory
store_swarm_context() {
    log_info "Storing swarm context in AgentDB..."
    
    # Legal swarm context
    npx ruflo memory store \
        --key "legal-swarm-tasks" \
        --value "1) OCR arbitration order, 2) Confirm April 16 date, 3) Pre-arbitration form prep, 4) March 10 materials" \
        --namespace swarms
    
    # Income swarm context
    npx ruflo memory store \
        --key "income-swarm-tasks" \
        --value "1) Validation dashboard demo, 2) LinkedIn post, 3) 720.chat email, 4) Reverse recruiting automation" \
        --namespace swarms
    
    # Tech swarm context
    npx ruflo memory store \
        --key "tech-swarm-tasks" \
        --value "1) Validation dashboard build, 2) Feature flag implementation, 3) Integration tests, 4) Deploy to rooz.live" \
        --namespace swarms
    
    log_success "Swarm context stored in memory"
}

# Route tasks to swarms
route_tasks() {
    log_info "Routing WSJF tasks to appropriate swarms..."
    
    # Legal Track routing
    npx ruflo hooks route \
        --task "OCR arbitration order PDF and confirm April 16, 2026 date" \
        --context "legal-swarm"
    
    npx ruflo hooks route \
        --task "Prepare March 10 strategy session materials" \
        --context "legal-swarm"
    
    # Income Track routing
    npx ruflo hooks route \
        --task "Build validation dashboard with feature flag" \
        --context "income-swarm"
    
    npx ruflo hooks route \
        --task "Draft LinkedIn post with demo link" \
        --context "income-swarm"
    
    npx ruflo hooks route \
        --task "Build reverse recruiting automation (full-auto)" \
        --context "income-swarm"
    
    # Tech Track routing
    npx ruflo hooks route \
        --task "Write integration tests (feature flag ON/OFF)" \
        --context "tech-swarm"
    
    npx ruflo hooks route \
        --task "Add ADR frontmatter template with date field" \
        --context "tech-swarm"
    
    log_success "Tasks routed to swarms"
}

# Monitor swarm progress
monitor_swarms() {
    log_info "Monitoring swarm progress..."
    
    echo ""
    echo "=== Swarm Status Dashboard ==="
    npx ruflo swarm status --name legal-prep-swarm
    npx ruflo swarm status --name consulting-income-swarm
    npx ruflo swarm status --name validation-dashboard-swarm
    
    echo ""
    echo "=== Agent Status ==="
    npx ruflo agent list --format table
    
    echo ""
    echo "=== Memory Context ==="
    npx ruflo memory search --query "swarm-tasks" --namespace swarms
}

# Generate progress report
generate_report() {
    log_info "Generating multi-WSJF swarm progress report..."
    
    REPORT_DIR="$PROJECT_ROOT/reports/swarms"
    mkdir -p "$REPORT_DIR"
    
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    REPORT_FILE="$REPORT_DIR/multi-wsjf-swarm-report-$TIMESTAMP.md"
    
    cat > "$REPORT_FILE" << 'REPORT_EOF'
# Multi-WSJF Swarm Progress Report

**Generated**: $(date +"%Y-%m-%d %H:%M:%S")
**Timeline**: March 5-10, 2026
**Deadline**: March 10, 2026 (Strategy Session/Tribunal)

## Swarm Allocation

### Swarm 1: Legal Track (WSJF 30.0)
- **Topology**: Hierarchical (6-8 agents)
- **Strategy**: Specialized (anti-drift)
- **Tasks**:
  1. OCR arbitration order PDF
  2. Confirm April 16, 2026 arbitration date
  3. Pre-arbitration form preparation (due April 6)
  4. March 10 strategy session materials

**Status**: $(npx ruflo swarm status --name legal-prep-swarm --format json | jq -r '.status')
**Progress**: $(npx ruflo swarm status --name legal-prep-swarm --format json | jq -r '.progress')

### Swarm 2: Income Track (WSJF 35.0-45.0)
- **Topology**: Hierarchical-mesh (10-12 agents)
- **Strategy**: Specialized + peer communication
- **Tasks**:
  1. Validation dashboard build (5h)
  2. LinkedIn post + 720.chat email (1h)
  3. Reverse recruiting automation (2h)
  4. Consulting call + demo (2h)
  5. Convert demo → $25K-$50K contract (3h)

**Status**: $(npx ruflo swarm status --name consulting-income-swarm --format json | jq -r '.status')
**Progress**: $(npx ruflo swarm status --name consulting-income-swarm --format json | jq -r '.progress')

### Swarm 3: Tech Track (WSJF 25.0-30.0)
- **Topology**: Hierarchical (8 agents)
- **Strategy**: Specialized (TDD/DDD/ADR)
- **Tasks**:
  1. Integration tests (feature flag ON/OFF)
  2. ADR frontmatter template
  3. CI gate for dateless ADRs
  4. DDD domain model (minimal slice)

**Status**: $(npx ruflo swarm status --name validation-dashboard-swarm --format json | jq -r '.status')
**Progress**: $(npx ruflo swarm status --name validation-dashboard-swarm --format json | jq -r '.progress')

## Agent Execution Summary

$(npx ruflo agent list --format table)

## Memory Context

$(npx ruflo memory search --query "swarm-tasks" --namespace swarms --format table)

## WSJF-Based ROI Projection

| Swarm | WSJF | Time Budget | Expected ROI |
|-------|------|-------------|--------------|
| Legal | 30.0 | 4h (March 5-10) | Win arbitration → $99K-$297K |
| Income | 35.0-45.0 | 13h (March 5-9) | 1+ contract → $25K-$50K |
| Tech | 25.0-30.0 | 5h (March 5-7) | Consulting demo credibility |

**Total Time Budget**: 22h across 3 swarms
**Total Expected ROI**: $124K-$347K (if all swarms succeed)

## Next Actions

### Legal Track
- [ ] OCR arbitration order (15 min)
- [ ] Confirm date with portal (5 min)
- [ ] Draft pre-arbitration form template (30 min)
- [ ] March 10 materials (2h)

### Income Track
- [ ] Validation dashboard MVP (3h)
- [ ] Deploy with feature flag OFF (1h)
- [ ] LinkedIn post + email campaign (1h)
- [ ] Reverse recruiting (2h)
- [ ] Consulting call prep (1h)

### Tech Track
- [ ] Integration test 1 (45 min)
- [ ] Integration test 2 (45 min)
- [ ] ADR template (30 min)
- [ ] CI gate (30 min)
- [ ] DDD domain model (45 min)

## Risk Assessment (ROAM)

### Resolved (R)
- Swarms initialized successfully
- Agents spawned and operational
- Memory context stored

### Owned (O)
- Legal track not blocking income track (parallel execution)
- Tech track can proceed independently

### Accepted (A)
- Some swarm agents may fail (graceful degradation)
- Time budgets may extend by 20% (contingency)

### Mitigated (M)
- If legal swarm delayed → manual OCR fallback
- If income swarm delayed → semi-auto recruiting
- If tech swarm delayed → skip Gate 2, focus Gate 1

## DPC_R(t) Metrics

**Coverage (%/#)**: $(find "$PROJECT_ROOT" -name "*validator*.sh" -type f | wc -l | tr -d ' ') validators discovered
**Velocity (%.#)**: Measuring swarm execution speed
**Robustness (R(t))**: Implemented checks / declared checks

**DPC_R(t) = (%/# × R(t)) = [calculating...]**

---

*Report generated by multi-WSJF swarm orchestration system*
REPORT_EOF

    log_success "Report generated: $REPORT_FILE"
    cat "$REPORT_FILE"
}

# Main execution
main() {
    log_info "=== Multi-WSJF Swarm Orchestration ==="
    log_info "Timeline: March 5-10, 2026"
    log_info "Swarms: 3 (Legal, Income, Tech)"
    log_info "Agents: 22 total (6+9+7)"
    
    echo ""
    read -p "Initialize all 3 swarms? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Aborted by user"
        exit 0
    fi
    
    init_swarms
    spawn_legal_agents
    spawn_income_agents
    spawn_tech_agents
    store_swarm_context
    route_tasks
    
    echo ""
    log_success "All swarms initialized and tasks routed"
    
    echo ""
    read -p "Monitor swarm progress? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        monitor_swarms
    fi
    
    echo ""
    read -p "Generate progress report? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        generate_report
    fi
    
    log_success "Multi-WSJF swarm orchestration complete"
}

# Run main
main "$@"
