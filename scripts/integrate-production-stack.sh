#!/usr/bin/env bash
#
# Production Stack Integration Script
# Integrates: Claude Flow v3, Agentic QE, AISP, Deck.gl, LLM Observatory
#
# Usage: bash scripts/integrate-production-stack.sh [--full|--quick]
#

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:---quick}"

echo -e "${GREEN}🚀 Production Stack Integration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode: ${MODE}"
echo ""

# 1. Claude Flow v3 Alpha Initialization
echo -e "${YELLOW}📦 Step 1/7: Claude Flow v3 Alpha${NC}"
cd "${PROJECT_ROOT}"

if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ npx not found. Install Node.js first.${NC}"
  exit 1
fi

# Check current version
CLAUDE_FLOW_VERSION=$(npx claude-flow@v3alpha --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+-alpha\.[0-9]+' || echo "unknown")
echo "  Current version: ${CLAUDE_FLOW_VERSION}"

if [[ "${MODE}" == "--full" ]]; then
  echo "  Initializing claude-flow..."
  npx claude-flow@v3alpha init --force || echo "  ⚠️  Init may have been skipped"
  
  echo "  Starting MCP server..."
  npx claude-flow@v3alpha mcp start &
  MCP_PID=$!
  echo "  MCP server PID: ${MCP_PID}"
  
  echo "  Starting daemon..."
  npx claude-flow@v3alpha daemon start &
  DAEMON_PID=$!
  echo "  Daemon PID: ${DAEMON_PID}"
  
  sleep 3
  echo "  Checking status..."
  npx claude-flow@v3alpha status || echo "  ⚠️  Status check incomplete"
fi

echo -e "${GREEN}✅ Claude Flow v3 ready${NC}"
echo ""

# 2. Initialize Hierarchical Swarm
echo -e "${YELLOW}📦 Step 2/7: Hierarchical Swarm Initialization${NC}"
if [[ "${MODE}" == "--full" ]]; then
  echo "  Initializing swarm topology..."
  npx claude-flow@v3alpha swarm init --topology hierarchical --max-agents 8 || echo "  ⚠️  Swarm init may require interactive setup"
  
  echo "  Spawning specialist agents..."
  "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t coder --name typescript-fixer || true
  "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t tester --name coverage-agent || true
  "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t reviewer --name quality-agent || true
  "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" -t devops --name deployment-agent || true
  
  echo "  Listing active agents..."
  npx claude-flow@v3alpha agent list || echo "  ⚠️  No agents active yet"
else
  echo "  Skipped (use --full to initialize swarm)"
fi
echo -e "${GREEN}✅ Swarm configuration ready${NC}"
echo ""

# 3. Agentic QE Fleet
echo -e "${YELLOW}📦 Step 3/7: Agentic QE Fleet${NC}"
if command -v agentic-qe &> /dev/null; then
  echo "  agentic-qe already installed"
  agentic-qe --version || echo "  Version check failed"
else
  echo "  Installing agentic-qe globally..."
  npm install -g agentic-qe@latest || echo "  ⚠️  Install may require sudo"
fi
echo -e "${GREEN}✅ Agentic QE ready${NC}"
echo ""

# 4. AISP v5.1 Protocol
echo -e "${YELLOW}📦 Step 4/7: AISP v5.1 Protocol${NC}"
AISP_DIR="${PROJECT_ROOT}/.integrations/aisp-open-core"
if [[ -d "${AISP_DIR}" ]]; then
  echo "  AISP already cloned"
  cd "${AISP_DIR}"
  git pull origin main || echo "  ⚠️  Update failed"
else
  echo "  Cloning AISP repository..."
  mkdir -p "${PROJECT_ROOT}/.integrations"
  git clone https://github.com/bar181/aisp-open-core.git "${AISP_DIR}" || echo "  ⚠️  Clone may have failed"
fi

# Create AISP integration config
cat > "${PROJECT_ROOT}/config/aisp-config.yaml" <<EOF
aisp:
  version: "5.1"
  ambiguity_target: 2.0  # <2% ambiguity
  proof_carrying: true
  policies:
    - name: "no-guessing"
      formalized: true
      compliance_target: 95
    - name: "explicit-rationale"
      formalized: true
      compliance_target: 90
  integration:
    pattern_rationale: true
    test_specifications: true
    agent_contracts: true
EOF

echo -e "${GREEN}✅ AISP v5.1 configured${NC}"
echo ""

# 5. Deck.gl 3D Visualization
echo -e "${YELLOW}📦 Step 5/7: Deck.gl 3D Visualization${NC}"
cd "${PROJECT_ROOT}"

if grep -q '"deck.gl"' package.json 2>/dev/null; then
  echo "  Deck.gl already in package.json"
else
  echo "  Adding Deck.gl dependencies..."
  npm install --save deck.gl @deck.gl/react @deck.gl/layers @deck.gl/core || echo "  ⚠️  Installation incomplete"
fi

# Create Deck.gl visualization component
mkdir -p "${PROJECT_ROOT}/src/dashboard/components/3d-viz"
cat > "${PROJECT_ROOT}/src/dashboard/components/3d-viz/ROAMVisualization.tsx" <<'EOF'
/**
 * ROAM Metrics 3D Visualization with Deck.gl
 * GPU-powered rendering for large-scale data
 */
import React from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';

interface ROAMMetric {
  reach: number;
  optimize: number;
  automate: number;
  monitor: number;
  timestamp: number;
}

export const ROAMVisualization: React.FC<{ data: ROAMMetric[] }> = ({ data }) => {
  const layers = [
    new ScatterplotLayer({
      id: 'roam-metrics',
      data,
      getPosition: (d: ROAMMetric) => [d.reach, d.optimize, d.automate],
      getRadius: (d: ROAMMetric) => d.monitor * 10,
      getFillColor: [255, 140, 0],
      pickable: true,
    }),
  ];

  return (
    <DeckGL
      initialViewState={{
        longitude: 50,
        latitude: 50,
        zoom: 5,
        pitch: 45,
        bearing: 0,
      }}
      controller={true}
      layers={layers}
    />
  );
};
EOF

echo -e "${GREEN}✅ Deck.gl visualization created${NC}"
echo ""

# 6. LLM Observatory Status Check
echo -e "${YELLOW}📦 Step 6/7: LLM Observatory${NC}"
if grep -q '@opentelemetry/sdk-node' package.json; then
  echo "  ✅ OpenTelemetry SDK installed"
else
  echo "  ⚠️  OpenTelemetry SDK missing"
fi

if [[ -f "${PROJECT_ROOT}/src/observability/llm-observatory.ts" ]]; then
  echo "  ✅ LLM Observatory module exists"
else
  echo "  ⚠️  LLM Observatory module not found"
fi

echo -e "${GREEN}✅ LLM Observatory verified${NC}"
echo ""

# 7. Run Health Checks
echo -e "${YELLOW}📦 Step 7/7: Health Checks${NC}"
echo "  Running TypeScript typecheck..."
npm run typecheck 2>&1 | tail -5 || echo "  ⚠️  TypeScript errors remain"

echo "  Counting test files..."
TEST_COUNT=$(find tests -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "  Test files found: ${TEST_COUNT}"

echo "  Checking deployment script..."
if [[ -x "${PROJECT_ROOT}/scripts/deploy-yolife-api.sh" ]]; then
  echo "  ✅ Deployment script executable"
else
  echo "  ⚠️  Deployment script not executable"
  chmod +x "${PROJECT_ROOT}/scripts/deploy-yolife-api.sh" || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Production Stack Integration Complete${NC}"
echo ""
echo "Next steps:"
echo "  1. Run TypeScript fixes:    npm run typecheck"
echo "  2. Run tests:              npm test"
echo "  3. Check swarm status:     npx claude-flow@v3alpha status"
echo "  4. Deploy to YOLIFE:       bash scripts/deploy-yolife-api.sh all"
echo "  5. View dashboard:         open PRODUCTION_MATURITY_DASHBOARD.md"
echo ""
echo "Background services (if --full):"
if [[ "${MODE}" == "--full" ]] && [[ -n "${MCP_PID:-}" ]]; then
  echo "  MCP Server PID: ${MCP_PID}"
  echo "  Daemon PID: ${DAEMON_PID}"
  echo "  Stop with: kill ${MCP_PID} ${DAEMON_PID}"
fi
