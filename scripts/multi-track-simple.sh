#!/usr/bin/env bash
set -euo pipefail

# Simplified Multi-Track Orchestration (No Memory Store Dependencies)
# Focus: Get swarms operational for March 6 move

PROJECT_ROOT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
checkpoint() { echo -e "${CYAN}[CHECKPOINT]${NC} $1"; }

# Initialize 5 swarms quickly
log "=== Initializing 5 WSJF-Prioritized Swarms ==="

# Track 1: Physical Move (WSJF 45.0 - CRITICAL)
log "Track 1: Physical Move (WSJF 45.0)"
npx ruflo swarm init --topology hierarchical --max-agents 10 --strategy specialized --name "physical-move-swarm" && \
    success "Physical move swarm ready"
checkpoint "Move swarm: 10 agent capacity"

# Track 2: Utilities/Credit (WSJF 35.0 - HIGH)
log "Track 2: Utilities/Credit (WSJF 35.0)"
npx ruflo swarm init --topology hierarchical --max-agents 8 --strategy specialized --name "utilities-unblock-swarm" && \
    success "Utilities swarm ready"
checkpoint "Utilities swarm: 8 agent capacity"

# Track 3: Legal/Contracts (WSJF 30.0 - HIGH)
log "Track 3: Legal/Contracts (WSJF 30.0)"
npx ruflo swarm init --topology hierarchical --max-agents 8 --strategy specialized --name "contract-legal-swarm" && \
    success "Legal swarm ready"
checkpoint "Legal swarm: 8 agent capacity"

# Track 4: Income/Consulting (WSJF 25.0 - MEDIUM)
log "Track 4: Income/Consulting (WSJF 25.0)"
npx ruflo swarm init --topology hierarchical-mesh --max-agents 9 --strategy specialized --name "income-unblock-swarm" && \
    success "Income swarm ready"
checkpoint "Income swarm: 9 agent capacity"

# Track 5: Tech/Dashboard (WSJF 15.0 - LOW)
log "Track 5: Tech/Dashboard (WSJF 15.0)"
npx ruflo swarm init --topology hierarchical --max-agents 7 --strategy specialized --name "tech-enablement-swarm" && \
    success "Tech swarm ready"
checkpoint "Tech swarm: 7 agent capacity"

echo ""
success "All 5 swarms initialized! Total capacity: 42 agents"

# Show status
echo ""
log "=== Swarm Status ==="
npx ruflo swarm list --format table

echo ""
log "=== Next Actions ==="
echo "1. Route tasks to swarms:"
echo "   npx ruflo hooks route --task 'Mover quote aggregation' --context physical-move-swarm"
echo "   npx ruflo hooks route --task 'Draft FCRA letters' --context utilities-unblock-swarm"
echo "   npx ruflo hooks route --task 'Review 110 Frazier lease' --context contract-legal-swarm"
echo ""
echo "2. Monitor progress:"
echo "   npx ruflo swarm status --name physical-move-swarm"
echo ""
echo "3. Timeline:"
echo "   Tonight: Get mover quotes, draft letters, review lease"
echo "   Tomorrow: Execute move, submit disputes, prep March 10 materials"
