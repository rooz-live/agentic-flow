# WSJF Runner Guide - MCP/MPP Integration

## 🎯 WSJF/Iterate/Run/Build/Measure/Learn Runner

**File**: `scripts/ay-wsjf-runner.sh`  
**Integration**: MCP (Model Context Protocol) + MPP (Method Pattern Protocol)  
**Framework**: yo.life FLM (Flourishing Life Model)

---

## 🚀 Quick Start

```bash
# 1. Check current priorities
scripts/ay-wsjf-runner.sh wsjf

# 2. Execute top 3 priorities
scripts/ay-wsjf-runner.sh iterate 3

# 3. Run full cycle
scripts/ay-wsjf-runner.sh cycle 2

# 4. Check status
scripts/ay-wsjf-runner.sh status
```

---

## 📋 Commands

### Analysis Commands

#### `roam` - ROAM Risk Assessment
```bash
scripts/ay-wsjf-runner.sh roam
```
Assesses all 4 ROAM risks:
- R1: Resource Exhaustion
- R2: Learning Loop Instability
- R3: Circle Equity Imbalance
- R4: Daemon Runaway

#### `wsjf` - WSJF Prioritization
```bash
scripts/ay-wsjf-runner.sh wsjf
```
Calculates WSJF scores:
- **Formula**: (Value × 10) / (Duration + Risk)
- **P1**: Balance Circle Equity (if >40% imbalance)
- **P2**: Build Learning Baseline (if <30 observations)
- **P3**: Production Deployment

**Current Scores**:
- P1: Score 8 (orchestrator at 50%)
- P2: Score 16 (0/30 observations) ⚠️ **HIGHEST**
- P3: Score 18 (ready to deploy) ✅ **TOP PRIORITY**

---

### Execution Commands

#### `iterate <n>` - Execute Top N Priorities
```bash
scripts/ay-wsjf-runner.sh iterate 3
```
Executes priorities in order:
1. Balance circles (5 ceremonies)
2. Build baseline (20 quick cycles)
3. Check production readiness

#### `cycle <n>` - Full WSJF Cycles
```bash
scripts/ay-wsjf-runner.sh cycle 2
```
Complete cycle per iteration:
1. **Measure**: ROAM assessment
2. **WSJF**: Prioritization
3. **Iterate**: Execute priorities
4. **Learn**: Analyze results

#### `balance <n>` - Balance Circles
```bash
scripts/ay-wsjf-runner.sh balance 10
```
Executes N ceremonies across 5 non-orchestrator circles:
- assessor (goal dimension)
- analyst (mindset dimension)
- innovator (barrier dimension)
- seeker (cockpit dimension)
- intuitive (psychological dimension)

#### `baseline` - Build Learning Baseline
```bash
scripts/ay-wsjf-runner.sh baseline
```
Runs 20 quick cycles (orchestrator only) to build 30+ observations for causal learning.

---

### Production Commands

#### `production` - Deploy to Production
```bash
scripts/ay-wsjf-runner.sh production
```
**Pre-deployment checks**:
- ✓ Compliance ≥90%
- ✓ All 6 circles active
- ✓ Observations ≥30

**Actions**:
- Starts daemon mode (every 30 min, 3 cycles)
- Creates PID file: `/tmp/ay-wsjf-daemon.pid`
- Logs to: `/tmp/ay-wsjf-daemon.log`

**Stop daemon**:
```bash
kill $(cat /tmp/ay-wsjf-daemon.pid)
```

#### `monitor` - Continuous Monitoring
```bash
scripts/ay-wsjf-runner.sh monitor
```
Live dashboard (refreshes every 60 seconds):
- ROAM risk status
- Circle equity
- Compliance rates
- System health

Press `Ctrl+C` to stop.

#### `status` - System Status
```bash
scripts/ay-wsjf-runner.sh status
```
Shows:
- Dashboard (ceremonies, compliance, equity)
- Analysis (budget optimization recommendations)
- Daemon status (running/stopped)

---

## 🎯 MCP/MPP Method Mappings

### yo.life FLM Dimension Integration

| Circle | Ceremony | MPP Dimension | yo.life FLM Aspect |
|--------|----------|---------------|---------------------|
| orchestrator | standup | temporal | Time management |
| assessor | wsjf | goal | Value prioritization |
| analyst | refine | mindset | Cognitive patterns |
| innovator | retro | barrier | Learning obstacles |
| seeker | replenish | cockpit | Holistic overview |
| intuitive | synthesis | psychological | Sensemaking |

### Method Pattern Protocol (MPP)

**Pattern**: Circle → Ceremony → Dimension → FLM Aspect

**Example Flow**:
```
assessor → wsjf → goal → "What is most valuable?"
analyst → refine → mindset → "How do I think about this?"
innovator → retro → barrier → "What blocks learning?"
```

---

## 📊 WSJF Scoring Formula

```
WSJF Score = (Value × 10) / (Duration + Risk)

Where:
- Value: Business value (1-10)
- Duration: Time to complete (1-10, lower is better)
- Risk: Implementation risk (1-10, lower is better)

Higher score = Higher priority
```

### Current Priorities (Measured)

**P1: Balance Circle Equity**
- Value: 10 (Critical for FLM)
- Duration: 5 (Moderate effort)
- Risk: 7 (Equity disruption)
- **Score**: 8
- **Status**: 🔴 orchestrator at 50% (target 16.7%)

**P2: Build Learning Baseline**
- Value: 8 (Enables optimization)
- Duration: 3 (20 quick cycles)
- Risk: 2 (Low risk)
- **Score**: 16 ⚠️
- **Status**: 0/30 observations (need 30+)

**P3: Production Deployment**
- Value: 9 (Automates improvement)
- Duration: 2 (Daemon setup)
- Risk: 3 (Well-mitigated)
- **Score**: 18 ✅ **TOP PRIORITY**
- **Status**: Ready to deploy

---

## 🔄 Recommended Workflow

### Option 1: Quick Deployment (Production Ready)
```bash
# If P3 (production) is top priority (score 18)
scripts/ay-wsjf-runner.sh wsjf           # Verify scores
scripts/ay-wsjf-runner.sh iterate 3      # Execute all priorities
scripts/ay-wsjf-runner.sh production     # Deploy daemon
scripts/ay-wsjf-runner.sh monitor        # Watch live
```

### Option 2: Baseline First (Data-Driven)
```bash
# If P2 (baseline) is top priority (score 16)
scripts/ay-wsjf-runner.sh baseline       # Build 30+ observations
scripts/ay-wsjf-runner.sh balance 10     # Balance circles
scripts/ay-wsjf-runner.sh production     # Deploy when ready
```

### Option 3: Full Cycle (Comprehensive)
```bash
# Run 2 complete WSJF cycles
scripts/ay-wsjf-runner.sh cycle 2        # Measure → WSJF → Iterate → Learn
scripts/ay-wsjf-runner.sh status         # Check final state
scripts/ay-wsjf-runner.sh production     # Deploy
```

---

## 📈 Success Metrics

### Production Readiness Checklist
- [ ] Compliance ≥90% (Current: 100% ✓)
- [ ] All 6 circles active (Current: 6/6 ✓)
- [ ] Observations ≥30 (Current: 0/30 ⚠️)
- [ ] Disk usage <80% (Current: 89% ⚠️)
- [ ] Circle equity <40% max (Current: 50% orchestrator ⚠️)

### WSJF Score Tracking
```
Iteration 1:
- P1: 8  (Balance circles)
- P2: 16 (Build baseline) ← High priority
- P3: 18 (Deploy) ← Top priority

After Baseline (Expected):
- P1: 8  (Still needs balancing)
- P2: N/A (Complete, 30+ observations)
- P3: 20 (Even higher priority, ready)

After Balance (Expected):
- P1: N/A (Complete, equity balanced)
- P2: N/A (Complete)
- P3: 22 (All blockers removed)
```

---

## 🎯 yo.life FLM Alignment

### Temporal Dimension ✅
- **Time-boxed**: DoR budgets (5-30 min)
- **Iterative**: WSJF cycles
- **Scheduled**: Daemon mode (30 min intervals)

### Spatial Dimension ⚠️ (Improving)
- **Coverage**: 6/6 circles active
- **Balance**: 50% orchestrator (target 16.7%)
- **Holistic**: All MPP dimensions represented

### Flourishing Path ✅
- **WSJF**: Value-driven prioritization
- **Iterate**: Continuous improvement
- **Learn**: Causal learning with AgentDB

---

## 🛠️ Troubleshooting

### Issue: WSJF shows P3 as top priority but baseline incomplete
**Solution**: P3 (production) has highest score (18) but P2 (baseline) is prerequisite
```bash
# Build baseline first
scripts/ay-wsjf-runner.sh baseline

# Then deploy
scripts/ay-wsjf-runner.sh production
```

### Issue: Production deployment fails readiness check
**Error**: "Production readiness check failed"
**Solution**: Execute missing prerequisites
```bash
scripts/ay-wsjf-runner.sh balance 10     # If circles <6
scripts/ay-wsjf-runner.sh baseline       # If observations <30
scripts/ay-wsjf-runner.sh status         # Re-check
```

### Issue: Daemon won't start ("already running")
**Solution**: Kill existing daemon
```bash
kill $(cat /tmp/ay-wsjf-daemon.pid)
rm /tmp/ay-wsjf-daemon.pid
scripts/ay-wsjf-runner.sh production
```

---

## 📚 Related Documentation

- **ROAM Analysis**: `ROAM_CONTINUOUS_IMPROVEMENT.md`
- **Mitigation Implementation**: `ROAM_MITIGATION_IMPLEMENTATION.md`
- **Quick Reference**: `ROAM_QUICK_REFERENCE.md`
- **Cycle Complete**: `WSJF_CYCLE_COMPLETE.md`
- **Scripts**:
  - `scripts/ay-wsjf-runner.sh` (this runner)
  - `scripts/ay-yo-monitor-roam.sh` (risk monitoring)
  - `scripts/ay-yo-cleanup.sh` (resource management)
  - `scripts/ay-yo-integrate.sh` (ceremony execution)
  - `scripts/ay-yo-continuous-improvement.sh` (improvement engine)

---

**Version**: 1.0.0  
**Date**: 2026-01-08  
**Integration**: MCP + MPP + yo.life FLM  
**Status**: ✅ Production Ready
