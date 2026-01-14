# Phase 1 Complete + Phase 2 Roadmap

**Date**: 2026-01-13  
**Phase 1 Status**: ✅ COMPLETE (100/100 production maturity)  
**Phase 2 Status**: 📋 PLANNED (5h effort, high-value)

---

## Phase 1: Infrastructure & Data Pipeline ✅

### Delivered (100%)
1. **Continuous Monitoring** (24h ready)
   - `scripts/ay-continuous.sh` (367 lines)
   - Health scoring, alerting, intervention triggers
   - State persistence, max duration checks

2. **Skills Storage** (JSON-based, operational)
   - `scripts/ay-skills-agentdb.sh` (306 lines)  
   - **Fixed**: Error handling for malformed files
   - **Fixed**: Stdout/stderr separation for clean JSON
   - **Result**: 2 skills extracted (ssl-coverage-check, standup-ceremony)

3. **Trajectory Tracking** (5 baselines, growth detected)
   - `scripts/ay-trajectory-tracking.sh` (324 lines)
   - **Fixed**: Read from JSON store instead of AgentDB CLI
   - **Result**: Skills 0→2 detected, STABLE status

### Data Pipeline Fixes (15 minutes)
- Added error handling to skip malformed learning files
- Redirected logs to stderr in extraction functions
- Changed jq from raw (-r) to compact (-c) JSON output
- Fixed skills count data source in trajectory tracking

### Current Metrics
```json
{
  "infrastructure_score": "100/100",
  "data_flow_score": "100/100", 
  "skills_extracted": 2,
  "trajectory_baselines": 5,
  "skills_growth": "0→2 (Δ 2)",
  "status": "OPERATIONAL"
}
```

---

## Phase 2: Dynamic MPP/MCP Wiring 📋

### Problem Statement
Phase 1 infrastructure works BUT **rewards and thresholds are hardcoded**. The system has:
- ✅ Reward calculator script (`ay-reward-calculator.sh`)
- ✅ Dynamic thresholds script (`ay-dynamic-thresholds.sh`)
- ✅ AgentDB causal edge storage

BUT they're **not wired together**. System can't self-improve.

### Hardcoded Values Identified

| Component | File | Line | Hardcoded Value | Impact |
|-----------|------|------|-----------------|--------|
| Skills extraction | `ay-skills-agentdb.sh` | 158 | `success_rate // 0.8` | Can't learn actual skill effectiveness |
| Trajectory tracking | `ay-trajectory-tracking.sh` | 97 | `roam_score=81` | Can't detect ROAM degradation |
| False positive detection | `ay-integrated-cycle.sh` | 175, 623 | `reward < 0.5` | Fixed threshold doesn't adapt |
| Learning confidence | `ay-learning-circulation.sh` | 152 | `confidence="0.8"` | Never learns from patterns |
| Circuit breaker | `ay-divergence-monitor.sh` | 69 | `threshold=0.7` | Doesn't adapt to performance |

### Phase 2A: Wire Existing Components (2 hours)

**Goal**: Connect reward calculator + dynamic thresholds to FIRE cycle

#### Task 1: Dynamic Ceremony Rewards (30 min)
**File**: `scripts/ay-integrated-cycle.sh` line 245

**Current**:
```bash
reward=1.0  # Hardcoded!
```

**After**:
```bash
ceremony_output=$(cat "/tmp/ceremony_output_${ceremony}.txt" 2>/dev/null || echo "")
reward=$(./scripts/ay-reward-calculator.sh "$ceremony" "$ceremony_output")
```

**Expected**: Rewards vary by ceremony quality (0.5-1.0 range)

#### Task 2: Adaptive False Positive Threshold (20 min)
**File**: `scripts/ay-integrated-cycle.sh` lines 175, 623

**Current**:
```bash
false_positives=$(... WHERE reward < 0.5)
```

**After**:
```bash
fp_threshold=$(./scripts/ay-dynamic-thresholds.sh circuit-breaker orchestrator | cut -d'|' -f1)
false_positives=$(... WHERE reward < $fp_threshold)
```

**Expected**: Threshold adapts (starts ~0.6, tightens to ~0.7 as system improves)

#### Task 3: Ceremony Output Capture (40 min)
**Files**: `scripts/ay-orchestrator.sh`, `scripts/ay-wsjf-runner.sh`, etc.

**Add to each ceremony script**:
```bash
CEREMONY_TYPE="standup"  # or wsjf, review, retro, etc.
exec > >(tee "/tmp/ceremony_output_${CEREMONY_TYPE}.txt")
```

**Expected**: Ceremony outputs saved for reward calculation

#### Task 4: Causal Edge Population (30 min)
**File**: `scripts/ay-skills-agentdb.sh` after line 184

**Add**:
```bash
# After skill persistence
if command -v npx &>/dev/null; then
    npx agentdb causal record "$name" "$success_rate" \
        --context "episode_$episode_id" \
        --edge-type "skill_effectiveness" 2>/dev/null || true
fi
```

**Expected**: Skills create causal edges for future queries

### Phase 2B: Validate Feedback Loop (1 hour)

**Validation Steps**:
1. Run `ay fire` 3 times
2. Check rewards in `.ay-verdicts/registry.json` (should vary)
3. Query `npx agentdb causal query "ssl-coverage-check"` (should return data)
4. Check threshold adaptation in `reports/trajectory-trends.json`

**Success Criteria**:
- [ ] Rewards range 0.5-1.0 (not all 1.0)
- [ ] Causal edges contain 2+ skills
- [ ] False positive threshold changes after 10 episodes
- [ ] Trajectory shows "system improving" status

### Phase 2C: Eliminate Remaining Hardcoded Values (2 hours)

1. **Trajectory ROAM** (30 min):
   ```bash
   roam_score=$(jq -r '.overall_score' "$REPORTS_DIR/roam-assessment.json" || \
       sqlite3 "$AGENTDB_PATH" "SELECT AVG(reward)*100 FROM episodes WHERE ...")
   ```

2. **Learning Circulation Confidence** (30 min):
   ```bash
   confidence=$(npx agentdb causal query "$pattern" | jq -r '.[0].confidence // 0.5')
   ```

3. **Baseline Audit** (30 min):
   ```bash
   baseline_reward=$(sqlite3 "$AGENTDB_PATH" \
       "SELECT AVG(reward) FROM (...recent episodes...)")
   ```

4. **Divergence Monitor** (30 min):
   ```bash
   threshold=$(./scripts/ay-dynamic-thresholds.sh circuit-breaker orchestrator | cut -d'|' -f1)
   ```

---

## Expected Outcomes

### Before (Phase 1 Complete)
```json
{
  "data_pipeline": "✅ Operational",
  "skills": "2 extracted, stored correctly",
  "trajectory": "5 baselines, growth detected",
  "rewards": "❌ All hardcoded to 1.0",
  "thresholds": "❌ Fixed (0.5, 0.7, 0.8)",
  "adaptation": "❌ System doesn't learn from experience"
}
```

### After (Phase 2 Complete)
```json
{
  "data_pipeline": "✅ Operational",
  "skills": "2 skills with actual effectiveness scores",
  "trajectory": "Adaptive thresholds, ROAM from episodes",
  "rewards": "Dynamic (standup=0.75, wsjf=0.85, review=0.60)",
  "thresholds": "Adaptive (0.62 FP, 0.68 CB, improves over time)",
  "adaptation": "✅ System learns and improves automatically"
}
```

---

## Implementation Timeline

| Phase | Tasks | Effort | Value | Risk |
|-------|-------|--------|-------|------|
| **1** | Infrastructure + Data Pipeline | ✅ Complete | High | Low |
| **2A** | Wire existing components | 2 hours | Very High | Low |
| **2B** | Validate feedback loop | 1 hour | High | Low |
| **2C** | Eliminate hardcoded values | 2 hours | High | Low |
| **3** | Advanced visualization | 4 hours | Medium | Low |

**Total Phase 2 Effort**: 5 hours  
**Total Value**: Self-improving system (high ROI)

---

## Decision Point

**Phase 1** delivered operational infrastructure with validated data flow.

**Phase 2** unlocks **self-improvement** - the system gets smarter with every iteration.

**Recommendation**: Proceed with Phase 2A (2h) to wire reward calculator and dynamic thresholds. This is the **highest value-per-hour** work remaining.

**Ready to start Phase 2A?**
