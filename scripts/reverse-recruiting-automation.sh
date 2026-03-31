#!/bin/bash

################################################################################
# REVERSE RECRUITING AUTOMATION
# Automates job search using AI agents with RAG/LLMLingua compression
# 
# Usage:
#   ./scripts/reverse-recruiting-automation.sh \
#     --target-companies "720.chat,TAG.VOTE,O-GOV.com" \
#     --role "Agentic Coach/Analyst" \
#     --hours 250
#
# MCP/MPP Framework:
# - Method: Ruflo swarm + AgentDB vector storage
# - Pattern: Hierarchical topology with specialized recruiter agents
# - Protocol: RAG compression + LazyLLM pruning for token efficiency
################################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
TARGET_COMPANIES="720.chat,TAG.VOTE,O-GOV.com"
ROLE="Agentic Coach/Analyst"
HOURS=250
BASE_DIR="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --target-companies)
            TARGET_COMPANIES="$2"
            shift 2
            ;;
        --role)
            ROLE="$2"
            shift 2
            ;;
        --hours)
            HOURS="$2"
            shift 2
            ;;
        *)
            echo -e "${YELLOW}Unknown argument: $1${NC}"
            shift
            ;;
    esac
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}REVERSE RECRUITING AUTOMATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Target Companies: $TARGET_COMPANIES"
echo "Role: $ROLE"
echo "Hours: $HOURS"
echo ""

cd "$BASE_DIR"

# Step 1: Initialize Ruflo swarm
echo -e "${BLUE}Step 1: Initialize Ruflo Swarm${NC}"
npx ruflo swarm init --topology hierarchical --max-agents 8 --strategy specialized
echo -e "${GREEN}✓${NC} Swarm initialized"
echo ""

# Step 2: Spawn recruiter agent
echo -e "${BLUE}Step 2: Spawn Reverse Recruiter Agent${NC}"
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
"$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t recruiter --name reverse-recruiter
echo -e "${GREEN}✓${NC} Agent spawned"
echo ""

# Step 3: Store target companies in AgentDB vector memory
echo -e "${BLUE}Step 3: Store Target Companies (AgentDB Vector Storage)${NC}"
npx ruflo memory store \
  --key "target-companies" \
  --value "$TARGET_COMPANIES" \
  --namespace recruiting
echo -e "${GREEN}✓${NC} Companies stored"
echo ""

# Step 4: Store role requirements
echo -e "${BLUE}Step 4: Store Role Requirements${NC}"
npx ruflo memory store \
  --key "role-requirements" \
  --value "$ROLE - $HOURS hours" \
  --namespace recruiting
echo -e "${GREEN}✓${NC} Role stored"
echo ""

# Step 5: Store LinkedIn profile data
echo -e "${BLUE}Step 5: Store LinkedIn Profile (RAG/LLMLingua Compression)${NC}"
npx ruflo memory store \
  --key "linkedin-profile" \
  --value "Shahrooz Bhopti - Agentic Coach, Data Analytics, Agile" \
  --namespace recruiting \
  --compress llmlingua
echo -e "${GREEN}✓${NC} Profile stored with compression"
echo ""

# Step 6: Search for similar roles using vector search
echo -e "${BLUE}Step 6: Search for Similar Roles (Vector Similarity)${NC}"
npx ruflo memory search \
  --query "agentic coach data analytics agile scrum product" \
  --namespace recruiting \
  --limit 10
echo -e "${GREEN}✓${NC} Search complete"
echo ""

# Step 7: Route task to swarm
echo -e "${BLUE}Step 7: Route Task to Swarm${NC}"
npx ruflo hooks route --task "apply to $HOURS hour $ROLE consulting roles at $TARGET_COMPANIES"
echo -e "${GREEN}✓${NC} Task routed"
echo ""

# Step 8: Integration with external APIs
echo -e "${BLUE}Step 8: External API Integration${NC}"
echo "  - Simplify.jobs: https://simplify.jobs"
echo "  - Sprout: https://www.usesprout.com"
echo "  - MyPersonalRecruiter: https://mypersonalrecruiter.com"
echo ""

echo -e "${GREEN}✅ Reverse Recruiting Automation Complete${NC}"
echo ""
echo "Next steps:"
echo "  1. Check ruflo dashboard for agent activity"
echo "  2. Monitor memory store for new opportunities"
echo "  3. Review generated applications"
echo "  4. Track response rates via hooks post-task"
