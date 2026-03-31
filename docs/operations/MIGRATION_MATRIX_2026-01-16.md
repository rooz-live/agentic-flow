# Migration Matrix & Execution Plan
**Date**: 2026-01-16  
**Status**: Phase 1 Complete - Analysis Done  
**Scale**: 7,724 docs, 686 scripts, 210 tests, 2,499 free riders

---

## 📊 PHASE 1 RESULTS (Complete)

### Current State
| Category | Count | Status |
|----------|-------|--------|
| Documentation | 7,724 | ⚠️ Highly fragmented |
| Scripts | 686 | ⚠️ Mixed purposes |
| Test Files | 210 | ✅ Manageable |
| Free Rider Scripts | 318 | 🚨 46% of scripts |
| Free Rider Code | 2,499 | 🚨 Massive cleanup needed |
| TypeScript Files | 212 | ✅ Core codebase |
| JavaScript Files | 4 | ✅ Minimal |
| Config Files | 9,322 | 🚨 Excessive |

### Storage Analysis
- **archive/**: 7.9GB (should be compressed/external)
- **target/**: 4.0GB (build artifacts, should be .gitignore)
- **ai_env_3.11/**: 918MB (venv, should be external)
- **ml_env/**: 624MB (venv, should be external)
- **external/**: 577MB (dependencies?)

### Quick Wins Completed ✅
- Governance docs: 9 files → `docs/governance/`
- Operations docs: 3 files → `docs/operations/`
- Architecture docs: 20 files → `docs/architecture/`

---

## 🎯 REVISED STRATEGY

Given the massive scale (7,724 docs vs expected 672), we need a **phased, data-driven approach**:

### Phase 2: Surgical Cleanup (Week 1)
**Goal**: Remove 90% of noise before restructuring

1. **Archive Compression** (saves 7.9GB)
   ```bash
   tar -czf archive-pre-2026.tar.gz archive/
   mv archive-pre-2026.tar.gz ~/Dropbox/agentic-flow-archive/
   rm -rf archive/
   ```

2. **Build Artifact Cleanup** (saves 4GB)
   ```bash
   echo "target/" >> .gitignore
   echo "ai_env_3.11/" >> .gitignore
   echo "ml_env/" >> .gitignore
   rm -rf target/ ai_env_3.11/ ml_env/
   ```

3. **Free Rider Retirement** (removes 2,499 files)
   ```bash
   # Move files >90 days old
   mkdir -p retiring/code retiring/scripts
   find . -name '*.ts' -o -name '*.js' -mtime +90 | xargs -I {} mv {} retiring/code/
   find ./scripts -type f -mtime +90 -exec mv {} retiring/scripts/ \;
   ```

4. **Config Deduplication** (9,322 → ~50 configs)
   ```bash
   # Most are likely node_modules or duplicates
   find . -name 'package-lock.json' -delete
   find . -name 'tsconfig.tsbuildinfo' -delete
   ```

**Expected Results**:
- Reduce from 7,724 docs → ~500 active docs
- Reduce from 686 scripts → ~150 active scripts
- Free up ~13GB disk space
- Make repo manageable for restructuring

---

## Phase 3: Microservice Separation (Week 2)

### Target Structure
```
/Users/shahroozbhopti/Documents/code/
├── projects/
│   ├── agentic-flow/          # Core platform
│   ├── hostbill-integration/   # Billing microservice
│   ├── yolife-deployment/      # Deployment automation
│   └── discord-bot/            # Community microservice
├── config/                     # Shared configs
├── docs/                       # Consolidated docs
├── observability/              # Monitoring & dashboards
└── tooling/                    # Shared utilities
```

### Migration Priority
1. **Separate Discord Bot** (reduce coupling)
   - Move: `src/discord/` → `/code/projects/discord-bot/src/`
   - Dependencies: `discord.js`, `discord-api-types`
   - Tests: `tests/*discord*` → `/code/projects/discord-bot/tests/`

2. **Separate HostBill Integration**
   - Move: `src/hostbill/` → `/code/projects/hostbill-integration/src/`
   - Scripts: `scripts/hostbill*` → `/code/projects/hostbill-integration/scripts/`
   - Config: `config/hostbill_config.json`

3. **Separate YOLIFE Deployment**
   - Move: `scripts/ay-yolife.sh`, `deploy-*` → `/code/projects/yolife-deployment/`
   - Tests: `tests/integration/yolife-connectivity.test.ts`

4. **Core agentic-flow** (keep as main repo)
   - Retain: `src/`, `tests/`, core `scripts/ay*`
   - Symlink from: `/code/projects/agentic-flow/` → current location

---

## Phase 4: Deck.gl Dashboard Layer (Week 2-3)

### Dashboard Architecture

#### Layer 1: Queen Visualization (HexagonLayer)
**File**: `/code/observability/dashboards/swarm-queen.html`
**Purpose**: Aggregate swarm state, agent density
**Data Source**: `/code/observability/metrics/trajectory/baselines.json`

```typescript
import {Deck} from '@deck.gl/core';
import {HexagonLayer} from '@deck.gl/aggregation-layers';

const deck = new Deck({
  container: 'deck-container',
  initialViewState: {
    longitude: -122.4,
    latitude: 37.8,
    zoom: 12
  },
  controller: true,
  layers: [
    new HexagonLayer({
      id: 'queen-layer',
      data: '/observability/metrics/trajectory/baselines.json',
      getPosition: d => [d.lng, d.lat],
      radius: 1000,
      coverage: 0.8,
      elevationScale: 50,
      colorRange: [
        [1, 152, 189],
        [73, 227, 206],
        [216, 254, 181],
        [254, 237, 177],
        [254, 173, 84],
        [209, 55, 78]
      ]
    })
  ]
});
```

#### Layer 2: Agent ROAM Metrics (ScatterplotLayer)
**File**: `/code/observability/dashboards/agent-roam.html`
**Purpose**: 3D visualization of agent ROAM scores
**Data Source**: `/code/config/roam/tracker.yaml`

```typescript
import {ScatterplotLayer} from '@deck.gl/layers';

const agentLayer = new ScatterplotLayer({
  id: 'agent-roam',
  data: agentData,  // From tracker.yaml
  pickable: true,
  opacity: 0.8,
  stroked: true,
  filled: true,
  radiusScale: 6,
  radiusMinPixels: 1,
  radiusMaxPixels: 100,
  lineWidthMinPixels: 1,
  getPosition: d => [d.x, d.y, d.roam_score * 10],
  getRadius: d => Math.sqrt(d.roam_score) * 10,
  getFillColor: d => d.roam_score >= 80 ? [0, 255, 0] : 
                     d.roam_score >= 60 ? [255, 255, 0] : 
                     [255, 0, 0],
  getLineColor: [0, 0, 0]
});
```

#### Layer 3: Memory Connections (ArcLayer)
**File**: `/code/observability/dashboards/memory-arc.html`
**Purpose**: Vector search result connections
**Data Source**: `/code/observability/metrics/llm-observatory/connections.json`

```typescript
import {ArcLayer} from '@deck.gl/layers';

const memoryLayer = new ArcLayer({
  id: 'memory-arc',
  data: memoryConnections,
  pickable: true,
  getWidth: 5,
  getSourcePosition: d => d.source,
  getTargetPosition: d => d.target,
  getSourceColor: d => [Math.sqrt(d.inbound), 140, 0],
  getTargetColor: d => [Math.sqrt(d.outbound), 140, 0],
  getHeight: 0.5,
  getTilt: 0
});
```

#### Layer 4: Real-time Execution (StreamLayer)
**File**: `/code/observability/dashboards/execution-stream.html`
**Purpose**: WebGL real-time streaming updates
**Data Source**: `ws://localhost:8888/stream`

```typescript
import {PathLayer} from '@deck.gl/layers';

// WebSocket for real-time data
const ws = new WebSocket('ws://localhost:8888/stream');
let executionData = [];

ws.onmessage = (event) => {
  const newExecution = JSON.parse(event.data);
  executionData.push(newExecution);
  updateLayers();
};

const streamLayer = new PathLayer({
  id: 'execution-stream',
  data: executionData,
  pickable: true,
  widthScale: 20,
  widthMinPixels: 2,
  getPath: d => d.trajectory,
  getColor: d => d.success ? [0, 255, 0] : [255, 0, 0],
  getWidth: d => 5
});
```

### Dashboard Integration

**Main Dashboard**: `/code/observability/dashboards/index.html`
```html
<!DOCTYPE html>
<html>
<head>
  <title>Agentic Flow - Hierarchical Mesh Dashboard</title>
  <script src="https://unpkg.com/deck.gl@latest/dist.min.js"></script>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; }
    #deck-container { position: absolute; width: 100%; height: 100vh; }
    #controls {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 1;
    }
    .layer-toggle { margin: 10px 0; }
    .metric { font-size: 24px; margin: 10px 0; }
  </style>
</head>
<body>
  <div id="deck-container"></div>
  <div id="controls">
    <h2>🐝 Swarm Control</h2>
    <div class="metric">Queen: <span id="queen-status">ACTIVE</span></div>
    <div class="metric">Agents: <span id="agent-count">3</span>/15</div>
    <div class="metric">ROAM: <span id="roam-score">64</span>/100</div>
    <div class="metric">Memory: <span id="memory-entries">0</span></div>
    <div class="metric">Exec: <span id="exec-rate">0</span>/s</div>
    
    <hr>
    
    <div class="layer-toggle">
      <label><input type="checkbox" id="layer1" checked> Layer 1: Queen</label>
    </div>
    <div class="layer-toggle">
      <label><input type="checkbox" id="layer2" checked> Layer 2: Agents</label>
    </div>
    <div class="layer-toggle">
      <label><input type="checkbox" id="layer3" checked> Layer 3: Memory</label>
    </div>
    <div class="layer-toggle">
      <label><input type="checkbox" id="layer4" checked> Layer 4: Execution</label>
    </div>
  </div>
  
  <script>
    // Initialize Deck.gl with all 4 layers
    // See individual layer files for details
  </script>
</body>
</html>
```

---

## Phase 5: Testing & Validation (Week 3)

### E2E Tests with Playwright

**File**: `/code/testing/e2e/workflows/ay-fire-cycle.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('AY Fire Cycle - Hierarchical Mesh', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8888');
  });

  test('Queen layer renders with agent data', async ({ page }) => {
    // Wait for Deck.gl to initialize
    await page.waitForSelector('#deck-container canvas');
    
    // Verify queen status
    const queenStatus = await page.locator('#queen-status').textContent();
    expect(queenStatus).toBe('ACTIVE');
    
    // Verify agent count
    const agentCount = await page.locator('#agent-count').textContent();
    expect(parseInt(agentCount.split('/')[0])).toBeGreaterThanOrEqual(3);
  });

  test('ROAM score updates in real-time', async ({ page }) => {
    const initialScore = await page.locator('#roam-score').textContent();
    
    // Trigger ay fire cycle
    await page.evaluate(() => {
      fetch('/api/trigger-ay-fire', { method: 'POST' });
    });
    
    // Wait for update
    await page.waitForTimeout(5000);
    
    const updatedScore = await page.locator('#roam-score').textContent();
    expect(updatedScore).not.toBe(initialScore);
  });

  test('All 4 layers toggle correctly', async ({ page }) => {
    // Toggle Layer 2 off
    await page.click('#layer2');
    
    // Verify layer is hidden
    const canvas = page.locator('#deck-container canvas');
    // Layer visibility verification (inspect canvas state)
    
    // Toggle back on
    await page.click('#layer2');
  });

  test('Memory arc connections display', async ({ page }) => {
    // Verify Layer 3 (ArcLayer) shows connections
    await page.waitForSelector('#layer3:checked');
    
    const memoryCount = await page.locator('#memory-entries').textContent();
    expect(parseInt(memoryCount)).toBeGreaterThan(0);
  });
});
```

### Integration Tests (Real Subdomains)

**File**: `/code/testing/integration/yolife-full.test.ts`
```typescript
import { describe, test, expect } from '@jest/globals';

describe('YOLIFE Integration - Real Subdomains', () => {
  const STX_HOST = process.env.YOLIFE_STX_HOST || 'stx-aio-0.corp.interface.tag.ooo';
  const CPANEL_HOST = process.env.YOLIFE_CPANEL_HOST || 'dev.interface.tag.ooo';
  const AWS_HOST = process.env.YOLIFE_AWS_HOST || 'i-097706d9355b9f1b2';

  test('STX deployment via SSH', async () => {
    const result = await exec(`ssh -i $HOME/.ssh/starlingx_key -p 2222 ubuntu@${STX_HOST} "echo OK"`);
    expect(result.stdout).toContain('OK');
  });

  test('cPanel deployment via REST API', async () => {
    const client = createCPanelClient();
    const health = await client.healthCheck();
    expect(health.healthy).toBe(true);
  });

  test('AWS deployment via Systems Manager', async () => {
    // Use AWS Systems Manager instead of SSH
    const result = await sendSSMCommand(AWS_HOST, 'echo OK');
    expect(result.Status).toBe('Success');
  });
});
```

---

## Phase 6: Production Release Criteria

### Go/No-Go Checklist

**Technical** (Manthra - Truth):
- [ ] TypeScript errors < 10
- [ ] Test coverage ≥ 80%
- [ ] ROAM score ≥ 80
- [ ] Free riders < 50 files
- [ ] Archive compressed (saves 7.9GB)
- [ ] Build artifacts removed (saves 4GB)

**Observability** (Yasna - Action):
- [ ] Deck.gl Queen layer rendering
- [ ] Agent ROAM ScatterplotLayer operational
- [ ] Memory ArcLayer showing connections
- [ ] Execution StreamLayer real-time updates
- [ ] Status line updating every 2s

**Integration** (Mithra - Binding):
- [ ] STX SSH connectivity verified
- [ ] cPanel API operational
- [ ] AWS/GitLab reachable
- [ ] E2E tests passing on real subdomains
- [ ] Playwright visual regression passing

### WSJF Release Timeline

| Milestone | Date | Maturity | Coverage | ROAM | Tokenization |
|-----------|------|----------|----------|------|--------------|
| **Current** | 2026-01-16 | 70/100 | 50% | 64 | Not ready |
| **Phase 2 Complete** | 2026-01-23 | 75/100 | 60% | 70 | Pre-alpha |
| **Phase 4 Complete** | 2026-02-06 | 85/100 | 75% | 80 | Alpha |
| **Production Ready** | 2026-03-06 | 90/100 | 85% | 85 | Beta (PE eligible) |
| **Enterprise Launch** | 2026-06-01 | 95/100 | 90% | 90 | v1.0 (Tokenization) |

---

## Next Actions

### Tomorrow (2026-01-17)
1. ✅ Phase 2 cleanup: Remove 13GB of artifacts/archives
2. ✅ Retire 2,499 free rider files
3. ✅ Create `/code/projects/` structure
4. ✅ Begin Discord bot separation

### Week 1 Complete
- Disk space freed: ~13GB
- Active files: 7,724 → ~500 docs, 686 → ~150 scripts
- Microservices: 3 separated (discord, hostbill, yolife)
- Foundation ready for Deck.gl dashboards

### Week 2-3
- Implement all 4 Deck.gl layers
- E2E tests with Playwright
- Integration tests on real subdomains
- Status line real-time updates

### Week 4
- Production release candidate
- WSJF scoring: Deck.gl (5.7) complete
- Go/No-Go decision
- Prepare for Q2 tokenization

---

**Question**: Proceed with Phase 2 cleanup tomorrow? This will:
- Free 13GB disk space
- Remove 2,817 free rider files
- Make repo manageable
- Enable faster iteration

**Approval needed before proceeding** ✅
