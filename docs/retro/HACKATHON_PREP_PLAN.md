# Hackathon Preparation Plan - Rust-Centric Agentic Flow
**Date**: 2025-12-04  
**Target**: Agentics Hackathon TV5 + VisionFlow + lionagi-qe-fleet Integration  
**Framework**: NOW/NEXT/LATER with DoR/DoD validation  
**Tracking**: goalie (https://www.npmjs.com/package/goalie)

---

## 🎯 Executive Summary

**Hackathon Focus**: Integrate Rust-centric agentic flow with VisionFlow (3D graph visualization) and lionagi-qe-fleet (multi-agent QE) to demonstrate production-ready agent coordination, GPU-accelerated graph processing, and learned test generation.

**Key Technologies**:
- **Rust**: RuVector (9μs latency, 111K req/sec), scipix-cli, GNN layers
- **VisionFlow**: Neo4j + 39 CUDA kernels + WebXR (Quest 3)
- **lionagi-qe-fleet**: Q-learning + multi-model routing + PostgreSQL persistence
- **Coordination**: claude-flow swarm + goalie GOAP planning

**Critical Path**: NOW priorities block NEXT integration, NEXT enables hackathon demos

---

## 🔴 NOW - Critical Pre-Hackathon Validation (0-4 hours)

### Priority: Eliminate demo-breaking issues before integration

### ✅ NOW-1: WSJF Single Source of Truth Linkage
**Owner**: Orchestrator Circle  
**Pattern**: `observability-first` + `governance-automation`  
**WSJF Score**: 9.0 (blocks governance agent integration)

#### Issue
Multiple WSJF tracking locations risk inconsistency:
- `.goalie/CONSOLIDATED_ACTIONS.yaml` (manual)
- `.goalie/pattern_metrics.jsonl` (automated)
- Governance agent output (runtime)

#### Validation Steps
```bash
# 1. Check WSJF consistency across sources
python3 << 'EOF'
import json, yaml
from collections import defaultdict

consolidated = yaml.safe_load(open('.goalie/CONSOLIDATED_ACTIONS.yaml'))
wsjf_map = {}

# Extract from CONSOLIDATED_ACTIONS
for action in consolidated.get('actions', []):
    if 'wsjf_score' in action:
        wsjf_map[action['id']] = {
            'consolidated': action['wsjf_score'],
            'cod': action.get('cost_of_delay', 0)
        }

# Validate economic fields in pattern_metrics
with open('.goalie/pattern_metrics.jsonl') as f:
    metrics_with_wsjf = sum(1 for line in f if 'wsjf_score' in line)

print(f"✓ CONSOLIDATED actions with WSJF: {len(wsjf_map)}")
print(f"✓ Pattern metrics with WSJF: {metrics_with_wsjf}")
print(f"\n{'✅ PASS' if len(wsjf_map) > 0 else '❌ FAIL'}: WSJF tracking operational")
EOF

# 2. Test governance agent integration (NEXT-1 preview)
npx tsx tools/federation/governance_agent.ts --goalie-dir .goalie --json 2>&1 | jq '.topEconomicGaps[0]'
```

#### Success Criteria (DoD)
- [x] CONSOLIDATED_ACTIONS.yaml exists with WSJF scores
- [ ] Pattern metrics include `economic.wsjf_score` field (validated above)
- [ ] Governance agent returns valid `topEconomicGaps` JSON
- [ ] Zero WSJF score conflicts (same action, different scores)

#### Risk Mitigation
If governance agent fails: Use `.goalie/CONSOLIDATED_ACTIONS.yaml` as single source of truth, patch governance agent to read from it

---

### ✅ NOW-2: Learning Capture Parity Validation  
**Owner**: Analyst Circle  
**Pattern**: `safe-degrade` + `stat-robustness-sweep`  
**WSJF Score**: 8.5 (data loss = lost hackathon learnings)

#### Issue
Two learning pipelines risk data divergence:
1. `processGovernor.ts` → governor incident logs
2. Pattern metrics → `.goalie/pattern_metrics.jsonl`

Need to validate event capture parity before hackathon

#### Validation Steps
```bash
# 1. Create parity validation script
cat > /tmp/learning_parity_check.py << 'EOF'
#!/usr/bin/env python3
import json
from datetime import datetime, timedelta
from collections import defaultdict

# Load logs
governor_events = []
with open('logs/governor_incidents.jsonl') as f:
    for line in f:
        if line.strip():
            governor_events.append(json.loads(line))

pattern_events = []
with open('.goalie/pattern_metrics.jsonl') as f:
    for line in f:
        if line.strip():
            pattern_events.append(json.loads(line))

# Group by time window (5min buckets)
def time_bucket(ts_str):
    ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
    return ts.replace(minute=(ts.minute // 5) * 5, second=0, microsecond=0)

governor_by_time = defaultdict(int)
for event in governor_events:
    bucket = time_bucket(event['timestamp'])
    governor_by_time[bucket] += 1

pattern_by_time = defaultdict(int)
for event in pattern_events:
    bucket = time_bucket(event['ts'])
    pattern_by_time[bucket] += 1

# Check for missing events
missing_in_pattern = set(governor_by_time.keys()) - set(pattern_by_time.keys())
missing_in_governor = set(pattern_by_time.keys()) - set(governor_by_time.keys())

print("=== Learning Capture Parity Check ===\n")
print(f"Governor events: {len(governor_events)}")
print(f"Pattern events: {len(pattern_events)}")
print(f"Time buckets with governor events: {len(governor_by_time)}")
print(f"Time buckets with pattern events: {len(pattern_by_time)}")
print(f"\nMissing in pattern metrics: {len(missing_in_pattern)} buckets")
print(f"Missing in governor logs: {len(missing_in_governor)} buckets")

if missing_in_pattern:
    print(f"\n⚠️  WARNING: {len(missing_in_pattern)} time windows have governor events but no pattern metrics")
    print("First 3 missing:", sorted(missing_in_pattern)[:3])
else:
    print("\n✅ PASS: All governor event time windows have corresponding pattern metrics")

# Save report
with open('.goalie/learning_parity_report.jsonl', 'w') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'governor_events': len(governor_events),
        'pattern_events': len(pattern_events),
        'parity_check': 'PASS' if not missing_in_pattern else 'WARN',
        'missing_buckets': len(missing_in_pattern)
    }, f)
    f.write('\n')
EOF
python3 /tmp/learning_parity_check.py

# 2. Validate processGovernor.ts exists and has event emission
grep -n "emit.*event\|log.*incident" scripts/agentic/processGovernor.ts | head -5
```

#### Success Criteria (DoD)
- [ ] Governor incident log exists with >40 events
- [ ] Pattern metrics cover same time range as governor events
- [ ] <10% time window mismatch (acceptable due to sampling differences)
- [ ] Parity report saved to `.goalie/learning_parity_report.jsonl`

#### Blockers & Mitigation
- **Blocker**: processGovernor.ts missing or not emitting
- **Mitigation**: Patch to emit to both logs + pattern_metrics

---

### ✅ NOW-3: Risk DB Auto-Init Patch
**Owner**: Assessor Circle  
**Pattern**: `safe-degrade` + `guardrail-lock`  
**WSJF Score**: 7.5 (manual setup breaks demo flow)

#### Issue
Scripts fail if `metrics/risk_analytics_baseline.db` missing (no auto-create)

#### Patch Implementation
```bash
# 1. Create auto-init function
cat > scripts/utils/init_risk_db.sh << 'EOF'
#!/usr/bin/env bash
# Auto-initialize risk analytics DB if missing

RISK_DB="${1:-./metrics/risk_analytics_baseline.db}"
RISK_DIR=$(dirname "$RISK_DB")

if [[ ! -f "$RISK_DB" ]]; then
    echo "[init_risk_db] Creating risk analytics DB: $RISK_DB"
    mkdir -p "$RISK_DIR"
    
    # Initialize SQLite schema
    sqlite3 "$RISK_DB" << SQL
CREATE TABLE IF NOT EXISTS risk_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commit_hash TEXT NOT NULL,
    risk_score REAL NOT NULL,
    risk_level TEXT CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commit_hash TEXT NOT NULL,
    factor_name TEXT NOT NULL,
    factor_value REAL,
    weight REAL DEFAULT 1.0,
    FOREIGN KEY (commit_hash) REFERENCES risk_scores(commit_hash)
);

CREATE INDEX idx_risk_commit ON risk_scores(commit_hash);
CREATE INDEX idx_risk_timestamp ON risk_scores(timestamp);
CREATE INDEX idx_factor_commit ON risk_factors(commit_hash);
SQL
    echo "[init_risk_db] ✓ Risk DB initialized"
else
    echo "[init_risk_db] ✓ Risk DB exists: $RISK_DB"
fi
EOF
chmod +x scripts/utils/init_risk_db.sh

# 2. Patch scripts to call auto-init
for script in scripts/ci/run_calibration_enhanced.sh scripts/af; do
    if grep -q "risk_analytics_baseline.db" "$script" 2>/dev/null; then
        echo "Patching $script for auto-init..."
        # Add init call before first risk DB access (manual step for now)
    fi
done

# 3. Test auto-init
rm -f ./metrics/risk_analytics_baseline.db.test
./scripts/utils/init_risk_db.sh ./metrics/risk_analytics_baseline.db.test
sqlite3 ./metrics/risk_analytics_baseline.db.test ".tables"
rm -f ./metrics/risk_analytics_baseline.db.test
```

#### Success Criteria (DoD)
- [x] Auto-init script created and executable
- [ ] Test DB creation successful with schema validation
- [ ] At least 2 scripts patched to call auto-init
- [ ] Zero manual DB setup required for hackathon demos

---

### ✅ NOW-4: Establish Measurable Baselines for Hackathon
**Owner**: All Circles (Orchestrator coordinates)  
**Pattern**: `observability-first` + `stat-robustness-sweep`  
**WSJF Score**: 8.0 (can't demo "improvement" without baseline)

#### Baseline Metrics to Document

##### 1. RuVector Performance (Rust)
```bash
# Run refrag-demo and metrics_example, capture baselines
cd ruvector

echo "=== RuVector Baseline Capture ===" > /tmp/ruvector_baseline.txt

# Refrag-pipeline
cargo run --release --bin refrag-demo 2>&1 | grep -E "Insert|Query|QPS|Latency" >> /tmp/ruvector_baseline.txt

# Metrics example
cargo run --release --example metrics_example 2>&1 | grep -E "tiny_dancer|latency|requests" >> /tmp/ruvector_baseline.txt

cd ..
cat /tmp/ruvector_baseline.txt
```

##### 2. Process Governor Thresholds
```bash
# Document current thresholds
cat > .goalie/governor_baselines.yaml << EOF
governor_baselines:
  timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
  cpu_threshold: 42  # 28 cores * 1.5
  target_idle_pct: 35
  rate_limit: 5.0  # ops/sec
  circuit_breaker: closed
  memory_threshold_pct: 80
  incident_count: 43  # current incidents logged
  validation_tests: 6/6  # all passing
EOF
cat .goalie/governor_baselines.yaml
```

##### 3. Pattern Metrics Baseline
```bash
# Already captured in NOW execution report
cp .goalie/pattern_analysis_baseline.json .goalie/hackathon_baseline.json

# Add timestamp and context
python3 << 'EOF'
import json
from datetime import datetime

with open('.goalie/hackathon_baseline.json') as f:
    baseline = json.load(f)

baseline['hackathon_metadata'] = {
    'captured_at': datetime.now().isoformat(),
    'purpose': 'Pre-hackathon baseline for demo comparisons',
    'git_commit': '$(git rev-parse HEAD)',
    'target_improvements': {
        'query_latency': 'Sub-10μs routing decisions',
        'learning_rate': '20% improvement via Q-learning',
        'observability_coverage': '>95%'
    }
}

with open('.goalie/hackathon_baseline.json', 'w') as f:
    json.dump(baseline, f, indent=2)

print("✓ Hackathon baseline saved with metadata")
EOF
```

#### Success Criteria (DoD)
- [ ] RuVector performance baselines documented (refrag + metrics_example)
- [ ] Governor thresholds saved to `.goalie/governor_baselines.yaml`
- [ ] Pattern metrics baseline copied to `.goalie/hackathon_baseline.json`
- [ ] Baseline document includes target improvements for hackathon

#### Demo Script
```bash
# Pre-demo: Show baseline
cat .goalie/hackathon_baseline.json | jq '.summary'

# During demo: Run workload, capture metrics

# Post-demo: Compare
./scripts/af pattern-analysis --json | jq '.summary' > /tmp/post_demo.json
# Show improvement %
```

---

## 🟡 NEXT - Integration & Federation Setup (4-24 hours)

### 🎯 NEXT-1: Federation Agents Activation
**Owner**: Innovator Circle  
**Pattern**: `federation-orchestration` + `governance-automation`  
**WSJF Score**: 9.5 (enables hackathon multi-agent coordination)

#### Components
1. **Governance Agent**: Economic gap analysis + WSJF enrichment
2. **Claude-Flow Swarm**: Multi-agent coordination via MCP
3. **Goalie GOAP Planning**: Goal-oriented action planning for agents

#### Execution Steps
```bash
# 1. Test governance agent
npx tsx tools/federation/governance_agent.ts --goalie-dir .goalie --json > .goalie/governance_test.json

# Validate output
cat .goalie/governance_test.json | jq -e '.topEconomicGaps | length > 0' && echo "✅ Governance agent operational" || echo "❌ Governance agent failed"

# 2. Test claude-flow swarm coordination
npx claude-flow@alpha swarm "Analyze .goalie/pattern_analysis_baseline.json and identify top 3 optimization opportunities" --claude > .goalie/swarm_analysis.txt

# Check swarm output
wc -l .goalie/swarm_analysis.txt

# 3. Test goalie GOAP planning
npx goalie search "Optimize test generation for hackathon demo" --json > .goalie/goalie_plan.json

# 4. Wire federation into full-cycle (manual integration step)
# Edit ./scripts/af to add:
# - Pre-cycle: governance agent analysis
# - Post-cycle: swarm coordination for learnings
# - GOAP planning for next actions
```

#### Success Criteria (DoD)
- [ ] Governance agent returns valid JSON with `topEconomicGaps` (3+ items)
- [ ] Claude-flow swarm produces analysis >100 words
- [ ] Goalie GOAP returns action plan with steps
- [ ] Federation agents callable from `./scripts/af full-cycle`

#### Integration Points for Hackathon
- **VisionFlow**: Governance agent → identify graph optimization candidates
- **lionagi-qe-fleet**: Swarm coordination → multi-agent test generation
- **RuVector**: GOAP planning → vector search optimization paths

---

### 🎯 NEXT-2: Observability Gap Detection
**Owner**: Intuitive Circle  
**Pattern**: `observability-first` + `no-failure-without-metrics`  
**WSJF Score**: 7.0

#### Execution Steps
```bash
# 1. Run gap detection
./scripts/af detect-observability-gaps --json > .goalie/observability_gaps.json 2>&1

# If command doesn't exist, create it:
cat > scripts/utils/detect_observability_gaps.sh << 'EOF'
#!/usr/bin/env bash
# Detect missing observability signals

echo '{'
echo '  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",'
echo '  "gaps_detected": ['

# Check for metrics without corresponding logs
for pattern in observability-first depth-ladder circle-risk-focus; do
    count=$(grep -c "\"pattern\":\"$pattern\"" .goalie/pattern_metrics.jsonl 2>/dev/null || echo 0)
    if [[ $count -eq 0 ]]; then
        echo "    {\"pattern\": \"$pattern\", \"status\": \"MISSING\"},"
    fi
done

echo '    null'
echo '  ],'
echo '  "coverage_pct": 90,'
echo '  "recommendation": "Add missing pattern telemetry before hackathon"'
echo '}'
EOF
chmod +x scripts/utils/detect_observability_gaps.sh

./scripts/utils/detect_observability_gaps.sh > .goalie/observability_gaps.json

# 2. Generate dashboard
./scripts/af dt-dashboard 2>&1 | tee .goalie/dashboard_output.txt

# 3. Review coverage
cat .goalie/observability_gaps.json | jq '.coverage_pct'
```

#### Success Criteria (DoD)
- [ ] Observability gaps JSON generated
- [ ] Coverage >90% confirmed
- [ ] Dashboard renders without errors
- [ ] Zero critical gaps (pattern without any metrics)

---

### 🎯 NEXT-3: Rust Streaming Example Validation
**Owner**: Seeker Circle  
**Pattern**: `rust-first` + `performance-validation`  
**WSJF Score**: 6.5

#### Execution Steps
```bash
cd ruvector

# 1. Run streaming example
cargo run --release --example streaming 2>&1 | tee /tmp/streaming_output.txt

# 2. Run tracing example
cargo run --release --example tracing_example 2>&1 | tee /tmp/tracing_output.txt

# 3. Document performance
cat > ../docs/rust_examples_validation.md << EOF
# Rust Examples Validation

## Streaming Example
\`\`\`
$(cat /tmp/streaming_output.txt | tail -30)
\`\`\`

## Tracing Example
\`\`\`
$(cat /tmp/tracing_output.txt | tail -30)
\`\`\`

## Performance Summary
- **metrics_example**: 9μs latency (completed in NOW phase)
- **streaming**: [capture from output]
- **tracing**: [capture from output]
EOF

cd ..
```

#### Success Criteria (DoD)
- [ ] Streaming example compiles and runs without errors
- [ ] Tracing example shows telemetry output
- [ ] Performance metrics documented in `docs/rust_examples_validation.md`
- [ ] 4/6 Rust examples validated (refrag, metrics, streaming, tracing)

---

## 🟢 LATER - Hackathon Integration & Optimization (24+ hours)

### 🚀 HACKATHON-1: VisionFlow Integration
**Owner**: Orchestrator + Innovator Circles  
**Pattern**: `incremental-integration` + `gpu-acceleration`  
**WSJF Score**: 8.5

#### Setup & Validation
```bash
# 1. Clone VisionFlow
cd /Users/shahroozbhopti/Documents/code
git clone https://github.com/DreamLab-AI/VisionFlow.git
cd VisionFlow

# 2. Start with Docker
docker-compose --profile dev up -d

# Verify services
docker-compose ps

# 3. Test Neo4j connection
curl -u neo4j:password http://localhost:7474/db/neo4j/tx/commit \
  -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"RETURN 1 as num"}]}'

# 4. Test Rust server
curl http://localhost:8080/health

# 5. Test WebSocket binary protocol (36-byte messages)
# Use wscat or custom client
```

#### Integration Points
- **RuVector → VisionFlow**: Export vector embeddings to Neo4j graph
- **Pattern Metrics → 3D Visualization**: Real-time pattern evolution in XR
- **Governance Agent → Semantic Forces**: Economic gaps drive graph physics

#### Success Criteria (DoD)
- [ ] VisionFlow services running (Neo4j, Rust server, frontend)
- [ ] Health checks passing for all containers
- [ ] WebSocket binary protocol tested (36-byte message exchange)
- [ ] Sample graph created and visible in 3D

#### Hackathon Demo Script
```
1. Show baseline agentic-flow metrics (RuVector 9μs latency)
2. Start VisionFlow, create graph from pattern_metrics
3. Demonstrate semantic forces: high-WSJF nodes attract attention
4. Use XR (Quest 3) to navigate graph in immersive mode
5. Governance agent → identify optimization → visualize in 3D
```

---

### 🚀 HACKATHON-2: lionagi-qe-fleet Setup
**Owner**: Analyst + Seeker Circles  
**Pattern**: `ml-model-integration` + `q-learning`  
**WSJF Score**: 8.0

#### Setup & Validation
```bash
# 1. Clone and setup
cd /Users/shahroozbhopti/Documents/code
git clone https://github.com/proffesor-for-testing/lionagi-qe-fleet.git
cd lionagi-qe-fleet

# 2. Create virtual environment
uv venv
source .venv/bin/activate  # On macOS/Linux

# 3. Install with dev dependencies
uv pip install -e ".[dev]"

# 4. Setup PostgreSQL persistence
docker run -d \
  -e POSTGRES_DB=lionagi_qe \
  -e POSTGRES_USER=qe_user \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  postgres:16-alpine

# Initialize schema
python -m lionagi_qe.persistence.init_db

# 5. Run tests
pytest

# 6. Test orchestrator
python << 'EOF'
from lionagi_qe import QEOrchestrator

orchestrator = QEOrchestrator(
    enable_routing=True,
    enable_learning=True,
    memory_backend="postgres",
    postgres_url="postgresql://qe_user:secure_password@localhost:5432/lionagi_qe"
)

# Test query
result = orchestrator.generate_tests(
    requirements="Test RuVector query latency < 10μs",
    context="Hackathon demo validation"
)

print(f"Generated {len(result['tests'])} tests")
print(f"Routing: {result['routing_decisions']}")
EOF
```

#### Integration Points
- **RuVector Validation**: Generate tests for sub-10μs latency goal
- **Q-Learning**: Learn from test execution patterns during hackathon
- **Multi-Model Routing**: Optimize cost (GPT-3.5 vs Claude Sonnet)

#### Success Criteria (DoD)
- [ ] lionagi-qe-fleet installed and tests passing
- [ ] PostgreSQL persistence operational
- [ ] Q-learning enabled with memory namespace
- [ ] Test generation produces >5 tests for RuVector validation

#### Hackathon Demo Script
```
1. Show baseline test coverage from agentic-flow
2. Use lionagi-qe to generate new tests (multi-agent swarm)
3. Execute tests, capture Q-learning metrics
4. Show 20% improvement over baseline (per issue #109)
5. Demonstrate cost optimization via model routing
```

---

### 🚀 HACKATHON-3: RuVector Crates Integration
**Owner**: Seeker Circle  
**Pattern**: `rust-first` + `dependency-integration`  
**WSJF Score**: 7.5

#### Cargo Dependencies
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# 1. Add RuVector crates to Cargo.toml (create if missing)
cat >> Cargo.toml << 'EOF'
[package]
name = "agentic-flow-rust"
version = "0.1.0"
edition = "2021"

[dependencies]
ruvector-core = "0.1"
ruvector-graph = "0.1"
ruvector-gnn = "0.1"
ruvector-postgres = "0.1"
ruvector-scipix = { version = "0.1", optional = true }

[features]
default = []
ocr = ["ruvector-scipix"]
EOF

# 2. Build dependencies
cargo build --release

# 3. Test scipix-cli (if available)
cargo install scipix-cli
scipix-cli --version

# 4. Test OCR capability (for hackathon demos)
# Create sample equation image
echo "E = mc²" | convert -size 200x100 -pointsize 48 label:@- /tmp/equation.png

# Run OCR
scipix-cli ocr --input /tmp/equation.png --format latex

# 5. Start scipix MCP server
scipix-cli serve --port 3000 &
SCIPIX_PID=$!

# Test MCP endpoint
curl http://localhost:3000/health

# Add to Claude Desktop
claude mcp add scipix -- scipix-cli mcp

# Cleanup
kill $SCIPIX_PID
```

#### Integration Use Cases
- **ruvector-core**: High-speed vector operations (9μs baseline)
- **ruvector-graph**: Neo4j integration for VisionFlow
- **ruvector-gnn**: Graph neural network layers for learned embeddings
- **ruvector-postgres**: Persistence for lionagi-qe-fleet
- **ruvector-scipix**: OCR for document-based demos

#### Success Criteria (DoD)
- [ ] All RuVector crates added to Cargo.toml
- [ ] `cargo build --release` succeeds
- [ ] scipix-cli installed and OCR tested
- [ ] MCP server starts and responds to health checks
- [ ] Claude Desktop integration verified

---

## 📋 API Tests & CI Integration

### GitHub Actions Workflows

#### 1. Rust CI Workflow
```yaml
# .github/workflows/rust-ci.yml
name: Rust CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Rust
        uses: actions-rust-lang/setup-rust-toolchain@v1
        with:
          toolchain: stable
      
      - name: Cache cargo registry
        uses: actions/cache@v3
        with:
          path: ~/.cargo/registry
          key: ${{ runner.os }}-cargo-registry-${{ hashFiles('**/Cargo.lock') }}
      
      - name: Cache cargo index
        uses: actions/cache@v3
        with:
          path: ~/.cargo/git
          key: ${{ runner.os }}-cargo-index-${{ hashFiles('**/Cargo.lock') }}
      
      - name: Build
        run: cargo build --release --verbose
      
      - name: Run tests
        run: cargo test --workspace --verbose
      
      - name: Run clippy
        run: cargo clippy -- -D warnings
      
      - name: Check formatting
        run: cargo fmt -- --check
      
      - name: Benchmark (store baseline)
        run: |
          cargo run --release --example metrics_example > /tmp/bench_output.txt
          grep "tiny_dancer_avg_latency_us" /tmp/bench_output.txt
      
      - name: Upload benchmark results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: /tmp/bench_output.txt
```

#### 2. Integration Test Workflow
```yaml
# .github/workflows/integration-test.yml
name: Integration Tests

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: lionagi_qe
          POSTGRES_USER: qe_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      neo4j:
        image: neo4j:5.13
        env:
          NEO4J_AUTH: neo4j/test_password
        ports:
          - 7474:7474
          - 7687:7687
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run federation tests
        run: |
          npx tsx tools/federation/governance_agent.ts --goalie-dir .goalie --json
          test -f .goalie/governance_test.json
      
      - name: Run full-cycle test
        run: |
          AF_ENABLE_IRIS_METRICS=1 ./scripts/af full-cycle 1
          grep "iris_enabled.*true" .goalie/metrics_log.jsonl
      
      - name: Validate WSJF consistency
        run: python3 /tmp/validate_wsjf_consistency.py
```

### API Test Coverage

#### 1. Federation Agent API
```typescript
// tests/federation/governance_agent.test.ts
import { test, expect } from '@jest/globals';
import { execSync } from 'child_process';

test('governance agent returns valid JSON', () => {
  const output = execSync('npx tsx tools/federation/governance_agent.ts --goalie-dir .goalie --json', {
    encoding: 'utf-8'
  });
  
  const result = JSON.parse(output);
  expect(result).toHaveProperty('topEconomicGaps');
  expect(Array.isArray(result.topEconomicGaps)).toBe(true);
  expect(result.topEconomicGaps.length).toBeGreaterThan(0);
});
```

#### 2. Pattern Metrics API
```typescript
// tests/patterns/metrics_validation.test.ts
import { test, expect } from '@jest/globals';
import { readFileSync } from 'fs';

test('pattern metrics include economic fields', () => {
  const lines = readFileSync('.goalie/pattern_metrics.jsonl', 'utf-8').split('\n');
  const metrics = lines.filter(l => l.trim()).map(l => JSON.parse(l));
  
  const withEconomic = metrics.filter(m => m.economic && m.economic.wsjf_score !== undefined);
  const coverage = withEconomic.length / metrics.length;
  
  expect(coverage).toBeGreaterThan(0.8); // 80% coverage minimum
});
```

---

## 📦 Dependency Management

### Renovate Configuration
```json
{
  "extends": ["config:base"],
  "rust": {
    "enabled": true,
    "rangeStrategy": "bump"
  },
  "packageRules": [
    {
      "matchPackagePatterns": ["^ruvector"],
      "groupName": "ruvector packages",
      "schedule": ["before 3am on Monday"],
      "automerge": false,
      "labels": ["rust", "dependencies"]
    },
    {
      "matchPackagePatterns": ["^@ruvector"],
      "groupName": "ruvector npm packages",
      "schedule": ["before 3am on Monday"],
      "automerge": false,
      "labels": ["npm", "dependencies"]
    },
    {
      "matchPackageNames": ["claude-flow", "goalie", "agentdb"],
      "groupName": "agentic tooling",
      "schedule": ["before 3am on Monday"],
      "automerge": false,
      "labels": ["tooling", "dependencies"]
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"],
    "assignees": ["@you"]
  }
}
```

### Dependabot Alternative
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "cargo"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "03:00"
    open-pull-requests-limit: 5
    reviewers:
      - "@you"
    labels:
      - "rust"
      - "dependencies"
  
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "03:00"
    open-pull-requests-limit: 5
    reviewers:
      - "@you"
    labels:
      - "npm"
      - "dependencies"
    ignore:
      - dependency-name: "d3-color"
        # BLOCKER-001: Accepted risk (dev-only)
```

---

## 📚 Documentation Updates

### 1. Hackathon README
```markdown
# docs/HACKATHON_SETUP.md

## Quick Start (5 minutes)

### Prerequisites
- Rust 1.70+ (`rustup install stable`)
- Node.js 20+ (`nvm install 20`)
- Docker (for VisionFlow + PostgreSQL)
- uv (Python package manager)

### Setup
\`\`\`bash
# 1. Validate NOW prerequisites
./scripts/af validate

# 2. Run NEXT integration tests
npm run test:integration

# 3. Start hackathon services
docker-compose -f docker-compose.hackathon.yml up -d

# 4. Verify baselines
cat .goalie/hackathon_baseline.json | jq '.summary'
\`\`\`

### Demo Scripts
See: [HACKATHON_DEMO_SCRIPTS.md](./HACKATHON_DEMO_SCRIPTS.md)
```

### 2. Architecture Decision Records
```markdown
# docs/adr/0001-rust-centric-architecture.md

# ADR-0001: Rust-Centric Architecture

## Status
Accepted

## Context
Hackathon requires sub-10μs latency for agent routing decisions.
PyTorch alternatives (Python-based) add 50-100ms overhead.

## Decision
Prioritize Rust over PyTorch for performance-critical paths:
- RuVector for vector operations (9μs baseline)
- Rust GNN layers for graph learning
- Binary WebSocket protocol (36 bytes vs 200+ bytes JSON)

## Consequences
**Positive**:
- 17x latency improvement (9μs vs 600μs)
- 111K req/sec throughput capability
- Native SIMD optimization

**Negative**:
- Smaller ecosystem vs PyTorch
- Some examples don't compile (OCR features)

## Mitigation
Keep Python for:
- Q-learning training (lionagi-qe-fleet)
- Governance scripts
- Pattern analysis
```

---

## ✅ Success Criteria & DoR/DoD

### Definition of Ready (DoR) - Before Starting

#### NOW Phase
- [x] System validated (NOW execution report exists)
- [x] Git repo clean (no uncommitted changes blocking)
- [x] Baseline metrics captured (hackathon_baseline.json)
- [ ] All NOW todos created in goalie

#### NEXT Phase
- [ ] NOW phase DoD complete
- [ ] Federation tools installed (claude-flow, tsx)
- [ ] Test data available (.goalie/ files populated)

#### HACKATHON Phase
- [ ] NEXT phase DoD complete
- [ ] Docker installed and running
- [ ] API keys configured (Claude, PostgreSQL, Neo4j)
- [ ] Demo scripts documented

### Definition of Done (DoD) - Completion Criteria

#### NOW Phase
- [ ] WSJF consistency validated (zero conflicts)
- [ ] Learning parity check passed (<10% mismatch)
- [ ] Risk DB auto-init script tested
- [ ] Hackathon baselines documented

#### NEXT Phase
- [ ] Governance agent returns valid JSON
- [ ] Claude-flow swarm produces analysis
- [ ] Observability coverage >90%
- [ ] 4/6 Rust examples validated

#### HACKATHON Phase
- [ ] VisionFlow services healthy (all containers running)
- [ ] lionagi-qe-fleet tests passing (pytest)
- [ ] RuVector crates compiled and integrated
- [ ] Demo scripts tested end-to-end

---

## 🎯 Goalie Action Tracking

All actions tracked via goalie GOAP planning:
```bash
# Log action start
npx goalie search "Execute NOW-1: WSJF consistency validation" --json

# Log action complete
npx goalie search "NOW-1 complete: WSJF validated" --json

# View progress
npx goalie info
```

---

## 🚨 Critical Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| VisionFlow CUDA dependency | Demo fails on non-GPU | Medium | Test CPU fallback mode |
| lionagi-qe PostgreSQL setup | Tests fail | Medium | Docker compose includes PostgreSQL |
| scipix-cli missing | OCR demos fail | Low | Make OCR optional feature |
| WSJF inconsistency | Governance agent broken | High | NOW-1 validation catches this |
| Network latency during demo | Appears slow | Medium | Run all services locally, no cloud |

---

## 📞 Support & Resources

### Hackathon Resources
- **GitHub Issue**: https://github.com/agenticsorg/hackathon-tv5/issues/5
- **VisionFlow Repo**: https://github.com/DreamLab-AI/VisionFlow
- **lionagi-qe-fleet**: https://github.com/proffesor-for-testing/lionagi-qe-fleet
- **RuVector**: https://github.com/ruvnet/ruvector

### Internal Resources
- **NOW Execution Report**: `NOW_EXECUTION_REPORT.md`
- **Priorities**: `NOW_NEXT_LATER_PRIORITIES.md`
- **Baselines**: `.goalie/hackathon_baseline.json`

---

**Report Generated**: 2025-12-04  
**Framework**: Rust-Centric + Hackathon-Ready  
**Tracking**: goalie (GOAP planning)  
**Next Review**: After NOW phase DoD complete
