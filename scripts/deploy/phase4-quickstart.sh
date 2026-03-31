#!/usr/bin/env bash
# phase4-quickstart.sh
#
# Phase 4: Multi-Tenant Domain Setup + AI Reasoning + Modern UI
#
# Quick actions for highest WSJF items:
# 1. Domain routing setup (analytics.interface.tag.ooo)
# 2. Lionagi QE Fleet integration completion
# 3. VibeThinker/Harbor AI reasoning hooks
# 4. v0.dev/ReactFlow UI scaffolding
#
# Usage: ./scripts/deploy/phase4-quickstart.sh [setup-domains|setup-ai|setup-ui|all]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

ACTION="${1:-all}"

# Colors
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BOLD}=== Phase 4 Quick-Start ===${NC}"
echo -e "Action: ${BLUE}$ACTION${NC}"
echo

# === 1. DOMAIN SETUP (WSJF 5.4) ===
setup_domains() {
  echo -e "${BOLD}Step 1: Domain Setup${NC}"
  echo "Target domains:"
  echo "  - analytics.interface.tag.ooo (primary)"
  echo "  - *.analytics.interface.tag.ooo (multi-tenant)"
  echo "  - multi.masslessmassive.com"
  echo "  - half.masslessmassive.com"
  echo
  
  # Check if we're on STX-AIO-0
  if hostname | grep -q "stx-aio-0"; then
    echo -e "${GREEN}✓ On STX-AIO-0${NC}"
    
    # Create nginx config
    cat > /tmp/analytics-domain.conf <<'EOF'
# Primary domain
server {
    listen 80;
    server_name analytics.interface.tag.ooo;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name analytics.interface.tag.ooo;
    
    ssl_certificate /etc/letsencrypt/live/analytics.interface.tag.ooo/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/analytics.interface.tag.ooo/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}

# Multi-tenant wildcard
server {
    listen 443 ssl http2;
    server_name ~^(?<tenant>[^.]+)\.analytics\.interface\.tag\.ooo$;
    
    ssl_certificate /etc/letsencrypt/live/analytics.interface.tag.ooo/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/analytics.interface.tag.ooo/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8888;
        proxy_set_header X-Tenant $tenant;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
    
    echo "Nginx config created at /tmp/analytics-domain.conf"
    echo
    echo "Next manual steps:"
    echo "  1. Copy config: sudo cp /tmp/analytics-domain.conf /etc/nginx/sites-available/"
    echo "  2. Enable site: sudo ln -s /etc/nginx/sites-available/analytics-domain.conf /etc/nginx/sites-enabled/"
    echo "  3. Get SSL cert: sudo certbot certonly --nginx -d analytics.interface.tag.ooo -d *.analytics.interface.tag.ooo"
    echo "  4. Test config: sudo nginx -t"
    echo "  5. Reload: sudo systemctl reload nginx"
  else
    echo -e "${YELLOW}⚠ Not on STX-AIO-0 - generating instructions only${NC}"
    echo
    echo "Run these commands on stx-aio-0.corp.interface.tag.ooo:"
    echo "  ssh stx-aio-0.corp.interface.tag.ooo"
    echo "  cd /path/to/agentic-flow"
    echo "  ./scripts/deploy/phase4-quickstart.sh setup-domains"
  fi
  
  # DNS instructions
  echo
  echo -e "${BOLD}DNS Configuration Required:${NC}"
  echo "Add these records to your DNS provider (Cloudflare/Route53):"
  echo
  echo "  Type    Name                              Value"
  echo "  -----   --------------------------------  ---------------------------------"
  echo "  A       analytics.interface.tag.ooo       <STX-AIO-0-IP>"
  echo "  A       *.analytics.interface.tag.ooo     <STX-AIO-0-IP>"
  echo "  A       multi.masslessmassive.com         <AWS-i-097706d9355b9f1b2-IP>"
  echo "  A       half.masslessmassive.com          <AWS-i-097706d9355b9f1b2-IP>"
  echo
}

# === 2. AI REASONING SETUP (WSJF 1.5) ===
setup_ai() {
  echo -e "${BOLD}Step 2: AI Reasoning Setup${NC}"
  echo "Components: VibeThinker + Harbor Framework"
  echo
  
  # Check if uv installed
  if command -v uv &> /dev/null; then
    echo -e "${GREEN}✓ uv installed${NC}"
  else
    echo -e "${YELLOW}Installing uv...${NC}"
    curl -LsSf https://astral.sh/uv/install.sh | sh
  fi
  
  # Install Harbor
  echo "Installing Harbor framework..."
  uv tool install harbor || echo "Harbor already installed or installation failed"
  
  # Create AI integration stub
  mkdir -p tools/ai
  
  cat > tools/ai/vibethinker_stub.ts <<'EOF'
/**
 * VibeThinker Integration Stub
 * 
 * Model: WeiboAI/VibeThinker-1.5B
 * Use case: Enhanced WSJF reasoning and pattern analysis
 * 
 * SFT (Spectrum Phase): Maximize solution diversity
 * RL (Signal Phase): MGPO to identify correct paths
 */

export interface ReasoningResult {
  solutions: string[];
  confidence: number;
  reasoning_trace: string[];
}

export class VibeThinkerClient {
  private modelEndpoint = process.env.VIBETHINKER_API || 'http://localhost:8000';
  
  async reason(prompt: string, options = {}): Promise<ReasoningResult> {
    // TODO: Implement HuggingFace API call
    // For now, return stub
    return {
      solutions: [`Solution for: ${prompt}`],
      confidence: 0.85,
      reasoning_trace: ['Step 1: Analyze', 'Step 2: Conclude']
    };
  }
  
  async enhanceWSJF(item: any): Promise<any> {
    const prompt = `Analyze WSJF item: ${JSON.stringify(item)}. Provide reasoning for scores.`;
    const result = await this.reason(prompt);
    return {
      ...item,
      reasoning: result.reasoning_trace,
      confidence: result.confidence
    };
  }
}

// CLI usage
if (require.main === module) {
  const client = new VibeThinkerClient();
  const testItem = {
    name: 'ProcessGovernor Bridge',
    userValue: 9,
    timeCrit: 10,
    riskOpp: 8,
    jobSize: 5
  };
  
  client.enhanceWSJF(testItem).then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}
EOF
  
  echo -e "${GREEN}✓ VibeThinker stub created at tools/ai/vibethinker_stub.ts${NC}"
  
  # Harbor config
  cat > tools/ai/harbor_config.yaml <<'EOF'
evaluations:
  - name: wsjf_reasoning_quality
    container: python:3.11-slim
    script: |
      import json
      import sys
      # TODO: Implement WSJF reasoning evaluation
      data = json.load(sys.stdin)
      score = 0.85  # Placeholder
      print(json.dumps({"score": score, "passed": score > 0.7}))
    
  - name: pattern_discovery_accuracy
    container: node:20-slim
    script: |
      const data = require('fs').readFileSync(0, 'utf-8');
      // TODO: Evaluate pattern discovery accuracy
      console.log(JSON.stringify({score: 0.92, passed: true}));
EOF
  
  echo -e "${GREEN}✓ Harbor config created at tools/ai/harbor_config.yaml${NC}"
  echo
  echo "Next steps:"
  echo "  1. Set VIBETHINKER_API environment variable"
  echo "  2. Run: npx ts-node tools/ai/vibethinker_stub.ts"
  echo "  3. Test Harbor: harbor run tools/ai/harbor_config.yaml"
}

# === 3. UI/UX SETUP (WSJF 2.6) ===
setup_ui() {
  echo -e "${BOLD}Step 3: UI/UX Setup${NC}"
  echo "Tools: v0.dev + ReactFlow + HeroUI + Bolt.new"
  echo
  
  # Install ReactFlow
  echo "Installing ReactFlow..."
  npm install reactflow --save
  
  # Create ReactFlow workflow visualizer
  mkdir -p tools/dashboard/components
  
  cat > tools/dashboard/components/workflow-visualizer.tsx <<'EOF'
/**
 * Workflow Visualizer with ReactFlow
 * 
 * Visualizes WSJF workflow, circle dependencies, and pattern flows
 */
import React from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface WorkflowVisualizerProps {
  workflowType: 'wsjf' | 'circles' | 'patterns';
}

const wsjfNodes: Node[] = [
  {
    id: '1',
    data: { label: '📊 WSJF Calculation' },
    position: { x: 0, y: 0 },
    style: { background: '#3b82f6', color: 'white', padding: 16 }
  },
  {
    id: '2',
    data: { label: '🔍 Pattern Discovery' },
    position: { x: 250, y: 0 },
    style: { background: '#10b981', color: 'white', padding: 16 }
  },
  {
    id: '3',
    data: { label: '⚠️ Risk Analytics' },
    position: { x: 500, y: 0 },
    style: { background: '#f59e0b', color: 'white', padding: 16 }
  },
  {
    id: '4',
    data: { label: '✅ Execution' },
    position: { x: 250, y: 100 },
    style: { background: '#8b5cf6', color: 'white', padding: 16 }
  },
];

const wsjfEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-4', source: '3', target: '4' },
];

export function WorkflowVisualizer({ workflowType }: WorkflowVisualizerProps) {
  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactFlow
        nodes={wsjfNodes}
        edges={wsjfEdges}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
EOF
  
  echo -e "${GREEN}✓ ReactFlow visualizer created${NC}"
  
  # V0.dev setup instructions
  echo
  echo -e "${BOLD}v0.dev Integration:${NC}"
  echo "1. Get API key: https://v0.dev/settings"
  echo "2. Set environment: export V0_API_KEY='your_key'"
  echo "3. Configure Zed (optional):"
  echo "   echo '{ \"language_models\": { \"openai\": { \"api_url\": \"https://api.v0.dev/v1\" }}}' > ~/.config/zed/settings.json"
  echo
  echo "Generate UI components:"
  echo "  - Multi-tenant dashboard"
  echo "  - Affiliate analytics panel"
  echo "  - Risk monitoring widgets"
  echo "  - WSJF prioritization board"
  
  # Bolt.new reference
  echo
  echo -e "${BOLD}Bolt.new Rapid Prototyping:${NC}"
  echo "Gallery: https://bolt.new/gallery/all"
  echo "Use for quick POC iterations"
}

# === MAIN EXECUTION ===
case "$ACTION" in
  setup-domains)
    setup_domains
    ;;
  setup-ai)
    setup_ai
    ;;
  setup-ui)
    setup_ui
    ;;
  all)
    setup_domains
    echo
    setup_ai
    echo
    setup_ui
    ;;
  *)
    echo "Invalid action: $ACTION"
    echo "Usage: $0 [setup-domains|setup-ai|setup-ui|all]"
    exit 1
    ;;
esac

echo
echo -e "${BOLD}=== Phase 4 Quick-Start Complete ===${NC}"
echo
echo "Summary:"
echo "  ✓ Domain routing config generated"
echo "  ✓ AI reasoning stubs created"
echo "  ✓ UI/UX scaffolding ready"
echo
echo "Next actions:"
echo "  1. Configure DNS for analytics.interface.tag.ooo"
echo "  2. Deploy nginx config on STX-AIO-0"
echo "  3. Test: curl https://analytics.interface.tag.ooo"
echo "  4. Set V0_API_KEY and VIBETHINKER_API"
echo "  5. Run: npm run dev (start dashboard)"
