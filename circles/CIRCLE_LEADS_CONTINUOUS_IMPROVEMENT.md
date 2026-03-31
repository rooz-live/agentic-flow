# Circle Leads Continuous Improvement Framework
## Agentic Flow: Purpose/Domains/Accountability & Plan/Do/Act

## NOW - Immediate Calibration & Environment Health (0-24 hours)

### ✅ COMPLETE: Calibration Scripts Restoration
**Status**: Scripts created and validated  
**Pattern**: `safe-degrade` + `guardrail-lock`

- [x] Created `/scripts/ci/setup_calibration.sh` - Environment preparation and validation
- [x] Created `/scripts/ci/run_calibration_enhanced.sh` - Enhanced calibration wrapper with:
  - `--validation-mode`: Pre-flight environment checks
  - `--auto-approve`: Skip manual confirmation prompts
  - `--dry-run`: Simulate execution without file creation
  - `--count N`: Analyze N commits (default: 100)
  - `--neural` & `--claude`: Enhanced AI analysis
- [x] Test execution confirmed: 574 commits available, all validation checks passed
- [x] Integration with `.goalie/CONSOLIDATED_ACTIONS.yaml` (PHASE-B-1)

**Commands**:
```bash
./scripts/ci/setup_calibration.sh
./scripts/ci/run_calibration_enhanced.sh --count 100 --validation-mode --auto-approve --dry-run
```

### Analyst Circle: Standards Steward
**Purpose**: Data quality foundation and risk analytics baseline  
**Accountability**: Ensure metrics exist before WSJF/ROAM decisions

**Actions**:
1. **Validate AgentDB Population** (PHASE-A-3: COMPLETE)
   - Import calibration results: `python3 ./scripts/ci/import_calibration_to_agentdb.py --limit 50`
   - Verify BEAM dimensions: `npx agentdb db stats`
   - Target: >10 events, >28 contexts, >15 BEAM dimensions

2. **Baseline Metrics Collection** (PHASE-A-1: COMPLETE)
   - Performance baselines exist at `./metrics/performance_baselines.json`
   - Risk analytics DB initialized: `./metrics/risk_analytics_baseline.db`
   - Learning events logging to `./logs/learning/events.jsonl`

**Success Criteria**:
- [ ] Calibration data imported to AgentDB
- [ ] Pattern metrics populated for safe-degrade, depth-ladder
- [ ] No missing signals in observability-first pattern

---

### Assessor Circle: Performance Assurance Assessment  
**Purpose**: BLOCKER remediation and dependency validation  
**Accountability**: Unblock PHASE-B deliverables

**Actions**:
1. **BLOCKER-001 Resolution** (HIGH priority, WSJF: 6.5)
   - Status: Scripts created ✅
   - Next: Import calibration results to AgentDB
   - Verify dry-run execution before full run

2. **BLOCKER-003 Validation** (MEDIUM priority, COMPLETE)
   - SSH accessible: `stx-aio-0.corp.interface.tag.ooo`
   - Device 24460: 251GB RAM, 134 days uptime
   - IPMI test script: `./scripts/ci/test_device_24460_ssh_ipmi_enhanced.py`

**Success Criteria**:
- [ ] BLOCKER-001 moved to COMPLETE (dry-run → full run → import)
- [ ] Zero HIGH severity blockers in PHASE-B
- [ ] Process governor health validated (<40% CPU threshold)

---

### Orchestrator Circle: Cadence & Ceremony Lead
**Purpose**: Pattern metrics instrumentation and BML cycle health  
**Accountability**: Close Build-Measure-Learn feedback loops

**Actions**:
1. **Pattern Telemetry Hardening**
   - Update `log_pattern_event` helper in `scripts/af` to log new fields:
     - `safe_degrade.triggers`, `safe_degrade.actions`, `safe_degrade.recovery_cycles`
     - `circle_risk_focus.top_owner`, `circle_risk_focus.extra_iterations`
     - `guardrail_lock.enforced`, `guardrail_lock.health_state`
   - Write to `.goalie/pattern_metrics.jsonl`
   
2. **Full Cycle Validation**
   - Execute: `./scripts/af full-cycle 3 --circle orchestrator`
   - Verify metrics emission to `.goalie/metrics_log.jsonl`
   - Confirm BML cycle commits captured

**Success Criteria**:
- [ ] Pattern metrics schema validated
- [ ] At least 3 clean full-cycle iterations
- [ ] Zero WIP violations (<5% constraint)

---

## NEXT - Circle Coordination & Federation (24-72 hours)

### Innovator Circle: Innovation Council Facilitator
**Purpose**: Federation agents and governance automation  
**Accountability**: Integrate retro coach + governance agent into production cycle

**Actions**:
1. **Governance Agent Instrumentation**
   - CLI contract defined: `npx tsx tools/federation/governance_agent.ts --goalie-dir .goalie`
   - Outputs to `.goalie/metrics_log.jsonl` and `.goalie/insights_log.jsonl`
   - WSJF enrichment with COD weighting

2. **Retro Coach Integration**
   - Forensic action analysis: verify vs. unverified high-priority actions
   - RCA method tagging: 5-whys, fishbone, timeline-analysis
   - Context-aware questions based on pattern metrics

3. **Federation Runtime**
   - Configure: `npx agentic-flow@latest federation start`
   - Wire `af full-cycle` pre/post steps to `npx agentic-jujutsu status/analyze`

**Success Criteria**:
- [ ] Governance agent returns valid JSON with topEconomicGaps
- [ ] Retro coach emits forensic analysis (verified count, avg CoD delta)
- [ ] Federation agents callable from `af` commands

---

### Intuitive Circle: Sensemaking & Strategy Lead
**Purpose**: Observability-first pattern implementation  
**Accountability**: No failures without supporting metrics

**Actions**:
1. **Observability Gap Detection**
   - Run: `./scripts/af detect-observability-gaps --json`
   - Tag missing signals as ROAM risks (category: observability)
   - Auto-generate Goalie actions for telemetry gaps

2. **Dashboard Enhancement**
   - VS Code extension scaffold: Kanban TreeView (NOW/NEXT/LATER roots)
   - Pattern Metrics WebView: safe-degrade, guardrail-lock charts
   - Commands: `goalieDashboard.refresh`, `goalieDashboard.applySafeCodeFixesBatch`

**Success Criteria**:
- [ ] Zero failures logged without pattern metrics
- [ ] Observability coverage >90%
- [ ] Dashboard renders Kanban board + pattern charts

---

### Seeker Circle: Exploration & Discovery Lead
**Purpose**: Dependency automation and codebase health  
**Accountability**: Keep dependencies current without manual toil

**Actions**:
1. **Dependency Automation Setup**
   - Enable Renovate for mixed JS/Rust repos
   - Custom rules for ruvector packages, agentdb, neural-trader
   - Include VS Code extension dependencies

2. **Rust-First Enhancements**
   - `cargo add agentic-jujutsu` (Rust side)
   - Wrappers for pattern logging from Rust
   - CI job: `cargo test --workspace`

**Success Criteria**:
- [ ] Renovate config committed and active
- [ ] Rust crates buildable + testable in CI
- [ ] Zero high-severity dependency alerts

---

## LATER - Scaling & Optimization (72+ hours)

### Advanced Monitoring & Memory Profiling
**Pattern**: `observability-first` + `stat-robustness-sweep`

1. **Memory Leak Detection Daemon**
   - Process dependency visualization
   - Real-time PID monitoring with baseline tracking
   - Automated alerts when leaks detected

2. **Process Governance Optimization**
   - Shift from reactive throttling → proactive admission control
   - Queueing system for heavy analysis scripts (doc_query, code_search)
   - Predictive scaling based on system load trends

---

### Holacracy Practice Integration
**Circles**: All circles cross-functional collaboration

1. **Training Program Mapping**
   - Link retro questions to Holacracy Practitioner/Mastery courses
   - Integrate Circle Lead/Facilitator/Secretary playbooks
   - Autonomous team patterns + cross-functional team dynamics

2. **Governance Process Automation**
   - Automated role assignment based on WSJF priorities
   - Circle-specific retro templates
   - Distributed authority verification

---

### Advanced Code Fix Automation
**Pattern**: `autocommit-shadow` → `risk-based-batching`

1. **Risk-Based Batching Policy Engine**
   - Filter proposals by `approvalRequired === false`
   - Risk tiers: low (config/test), medium (observability), high (core/ml)
   - Economic filter: `totalImpactAvg >= 1e6` AND `riskLevel <= medium`

2. **Circle/Depth-Based Batching**
   - Batch apply only for circle in ["Assessor", "Compute"] and depth <= 1
   - Keep Innovator/Seeker at higher depths (>= 3) strictly manual
   - Track batch outcomes for continuous policy improvement

---

## Success Metrics & Validation

### Process Metrics (Target: <1hr retro→code commit)
- Time from `insight.id` to first `commit.id`
- % of actions completed per cycle (>80%)
- Context switches per day (<5)

### Flow Metrics
- Lead time: track trend
- Cycle time: track trend
- Throughput: track trend
- WIP violations: <5%

### Learning Metrics
- Experiments run per sprint (>3)
- % of retro items → features (>60%)
- Time to implement learning (<1 week)

### Pattern Coverage (Observability-First)
- Unique patterns logged / total patterns
- Direct events + inferred events per pattern
- Coverage percentage: target >90%

---

## Validation Commands

```bash
# NOW - Immediate execution
./scripts/ci/setup_calibration.sh
./scripts/ci/run_calibration_enhanced.sh --count 100 --validation-mode --auto-approve --dry-run
./scripts/af status
./scripts/af governor-health

# NEXT - Circle coordination
./scripts/af full-cycle 3 --circle orchestrator
./scripts/af retro-coach --json
./scripts/af governance-agent --json
npx agentic-jujutsu status

# LATER - Optimization
./scripts/af detect-observability-gaps --json
./scripts/af pattern-coverage --json
./scripts/af dt-dashboard
```

---

## Retrospective Questions per Pattern

### Safe Degrade
- Did degrade-on-failure contain blast radius or create noise?
- Were there times we wanted to continue deploying but degraded too aggressively?
- Did we get useful feedback (logs, metrics) to fix root causes?

### Depth Ladder
- Did depth escalations happen too early (deploy pains at depth 4)?
- Did teams feel stuck at depth 3 even when safe to move to 4?
- Were jumps incremental (2→3→4) or confusing (0→4)?

### Circle Risk Focus
- When we focused on a circle (e.g. Seeker), did ROAM risk go down?
- Did focus create neglect in other circles?
- Were resulting actions budgetable & incremental?

### Autocommit Shadow
- Were shadow candidates exactly what we'd commit manually?
- Did shadow mode expose missing rules in code_guardrails.py?
- After enabling real autocommit, were there surprises?

### Guardrail Lock
- Did enforced test-first feel like protection or friction?
- Were there legitimate cases needing `--no-test-first`?
- How often did lock correlate with real incidents?

### Failure Strategy
- In fail-fast mode, did we stop too early?
- In degrade-and-continue, did we spam broken cycles?
- Which strategy had faster MTTR?

### Iteration Budget
- Did budget stop runaway loops?
- Were there times we wanted more cycles but cap blocked work?
- Did budget correlate to smaller, incremental improvements?

### Observability First
- When things went wrong, did we have enough telemetry?
- Did pattern nudges lead to better dashboards/traces?
- Did we ever feel over-instrumented (too many noisy metrics)?

---

## ROAM Risk Tracking

| Risk ID | Description | Owner | Mitigation | Status |
|---------|-------------|-------|------------|--------|
| R-001 | High System Load Throttling | Orchestrator | Implement proactive admission control | OWNED |
| R-002 | Low Action Completion | Assessor | Dynamic cycle extension + WIP limits | MITIGATED |
| R-004 | Reactive Dependency on processGovernor | Innovator | Multi-dimensional health checks | OWNED |

---

## Implementation Roadmap

### Week 1: NOW Lane Execution
- Day 1: Calibration scripts + AgentDB population
- Day 2: BLOCKER-001 resolution + validation
- Day 3: Pattern telemetry hardening + test execution

### Week 2: NEXT Lane Federation
- Day 4-5: Governance agent + retro coach integration
- Day 6: Federation runtime configuration
- Day 7: Dashboard scaffold + observability gaps

### Week 3: LATER Lane Optimization
- Day 8-10: Memory profiling + process governance
- Day 11-12: Holacracy practice mapping
- Day 13-14: Code fix automation policies

---

## Circle Lead Sync Cadence

### Daily Standup (P/D/A format)
**Purpose**: What did we Plan, Do, and learn to Act on next?

- **Plan**: Today's circle-specific priorities from NOW lane
- **Do**: Yesterday's completed actions + blockers resolved
- **Act**: Insights captured → actions created → retro refined

### Weekly Review (Objective Standups)
**Domains**: Circle-specific domains validated against objectives

- Analyst: Data quality baselines met?
- Assessor: Blockers cleared, health green?
- Innovator: Experiments run, federation agents operational?
- Intuitive: Observability gaps closed?
- Orchestrator: BML cycles complete, WIP within limits?
- Seeker: Dependencies current, codebase health improving?

### Bi-Weekly Retro (Actionable Refinements)
**Accountability**: Close feedback loops, replenish backlogs

- Retro questions answered per pattern
- Actions created from insights
- Priorities replenished based on forensic analysis
- ROAM risks updated

---

*This framework implements incremental relentless execution with measurable success criteria and clear circle accountability.*
