# Hardcoded Values Audit & Dynamic MPP Wiring Plan

**Date**: 2026-01-13  
**Status**: AUDIT COMPLETE - Actionable remediation plan ready

## Executive Summary

Phase 1 data pipeline is operational BUT **rewards and thresholds are still hardcoded** instead of learning from MPP (Message Passing Protocol) causal edges and historical patterns. This prevents the system from **self-improving** based on actual ceremony effectiveness.

## Critical Findings

### 1. Skills Extraction Has Hardcoded Defaults
**File**: `scripts/ay-skills-agentdb.sh`  
**Line 158**: `success_rate=$(echo "$skill_json" | jq -r '.success_rate // 0.8')`

**Problem**: Falls back to 0.8 when learning data should provide actual confidence.

**Fix**: Query AgentDB for historical success rate:
```bash
success_rate=$(npx agentdb causal query "$skill_name" --min-confidence 0.0 | jq -r '.[0].uplift // 0.8')
```

### 2. Trajectory Tracking Uses Hardcoded ROAM Score
**File**: `scripts/ay-trajectory-tracking.sh`  
**Line 97**: `local roam_score=81  # Default from last assessment`

**Problem**: Hardcoded fallback prevents detecting ROAM degradation.

**Fix**: Query from latest assessment or calculate from episodes:
```bash
roam_score=$(jq -r '.overall_score' "$REPORTS_DIR/roam-assessment.json" || \
    sqlite3 "$AGENTDB_PATH" "SELECT AVG(reward)*100 FROM episodes WHERE created_at > strftime('%s','now','-7 days')")
```

### 3. Integrated Cycle Uses Hardcoded Reward Thresholds
**File**: `scripts/ay-integrated-cycle.sh`  
**Lines 175, 623**: `reward < 0.5` (hardcoded false positive detection)  
**Line 245**: `reward=1.0` (hardcoded ceremony reward)

**Problem**: 
- 0.5 threshold doesn't adapt to system performance
- 1.0 reward doesn't reflect actual ceremony quality

**Fix**: Use dynamic thresholds from `ay-dynamic-thresholds.sh`:
```bash
# Get adaptive threshold
threshold=$(./scripts/ay-dynamic-thresholds.sh circuit-breaker orchestrator | cut -d'|' -f1)
false_positives=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success=1 AND reward < $threshold")

# Calculate ceremony reward dynamically
reward=$(./scripts/ay-reward-calculator.sh "$ceremony_type" "$ceremony_output")
```

### 4. Learning Circulation Has Hardcoded Confidence
**File**: `scripts/ay-learning-circulation.sh`  
**Line 152**: `confidence="0.8"`  
**Line 159**: `if (( $(echo "$confidence >= 0.7" | bc -l) )); then`

**Problem**: 
- Confidence always 0.8 (never learns from actual effectiveness)
- 0.7 threshold never adapts

**Fix**: Query from causal edges:
```bash
confidence=$(npx agentdb causal query "$pattern" --min-confidence 0.0 | jq -r '.[0].confidence // 0.5')
min_threshold=$(./scripts/ay-dynamic-thresholds.sh degradation orchestrator "$pattern" | cut -d'|' -f1)
```

### 5. Baseline Audit Has Hardcoded Fallbacks
**File**: `scripts/ay-baseline-audit.sh`  
**Lines 342, 409**: `baseline_reward=0.75` (fallback)  
**Line 184**: `reward < 0.6` (error threshold)

**Problem**: Fallbacks prevent learning from actual baselines.

**Fix**: Calculate baseline from historical data:
```bash
baseline_reward=$(sqlite3 "$AGENTDB_PATH" \
    "SELECT AVG(reward) FROM (
        SELECT reward FROM episodes 
        WHERE success=1 AND created_at > strftime('%s','now','-30 days')
        ORDER BY created_at DESC LIMIT 100
    )")
```

### 6. Divergence Monitor Has Hardcoded Circuit Breaker
**File**: `scripts/ay-divergence-monitor.sh`  
**Line 69**: `threshold=${CIRCUIT_BREAKER_REWARD:-0.7}`  
**Line 71**: `if (( $(echo "$avg_reward >= 0.9" | bc -l) )); then`

**Problem**: 0.7/0.9 thresholds don't adapt to system behavior.

**Fix**: Already has dynamic threshold script! Just needs wiring:
```bash
threshold=$(./scripts/ay-dynamic-thresholds.sh circuit-breaker orchestrator | cut -d'|' -f1)
healthy_threshold=$(echo "$threshold * 1.3" | bc)  # 30% above CB threshold
```

## MPP/MCP Integration Requirements

### What's Working ✅
1. `ay-reward-calculator.sh` - Has MPP query logic (`query_mpp_for_reward_adjustment`)
2. `ay-dynamic-thresholds.sh` - Calculates adaptive thresholds from episodes
3. AgentDB causal edges - Stores uplift/confidence data

### What's Missing ❌
1. **Wiring**: Scripts don't CALL reward calculator or dynamic thresholds
2. **Ceremony Output Capture**: No `/tmp/ceremony_output_*.txt` files created
3. **Causal Edge Population**: Skills extraction doesn't create causal edges
4. **Feedback Loop**: Rewards flow one-way (ceremony→episode) but don't update thresholds

## Remediation Plan (Priority Order)

### Phase 2A: Wire Existing Components (2 hours)
**Goal**: Connect reward calculator and dynamic thresholds to FIRE cycle

1. **Modify `ay-integrated-cycle.sh` lines 245-260** (30 min):
   ```bash
   # Replace hardcoded reward=1.0
   ceremony_output=$(cat "/tmp/ceremony_output_${ceremony}.txt" 2>/dev/null || echo "")
   reward=$(./scripts/ay-reward-calculator.sh "$ceremony" "$ceremony_output")
   ```

2. **Modify `ay-integrated-cycle.sh` lines 175, 623** (20 min):
   ```bash
   # Replace hardcoded 0.5 threshold
   fp_threshold=$(./scripts/ay-dynamic-thresholds.sh circuit-breaker orchestrator | cut -d'|' -f1)
   false_positives=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success=1 AND reward < $fp_threshold")
   ```

3. **Add ceremony output capture to each ceremony script** (40 min):
   ```bash
   # In ay-wsjf-runner.sh, ay-orchestrator.sh, etc.
   exec > >(tee "/tmp/ceremony_output_${CEREMONY_TYPE}.txt")
   ```

4. **Modify `ay-skills-agentdb.sh` to create causal edges** (30 min):
   ```bash
   # After persisting skill
   npx agentdb causal record "$skill_name" "$success_rate" \
       --context "$episode_id" --edge-type "skill_effectiveness"
   ```

### Phase 2B: Validate Feedback Loop (1 hour)
**Goal**: Prove thresholds adapt based on learned patterns

1. Run 3 FIRE cycles with ceremony output capture
2. Verify rewards vary (not all 1.0)
3. Check causal edges populated in AgentDB
4. Confirm thresholds change after 10+ episodes

### Phase 2C: Eliminate Remaining Hardcoded Values (2 hours)
**Goal**: Make ROAM, baselines, circulation fully dynamic

1. Fix trajectory ROAM score calculation
2. Fix baseline audit fallback logic
3. Fix learning circulation confidence queries
4. Add error handling for missing AgentDB data

## Expected Outcomes

### Before (Current State)
```json
{
  "rewards": "All ceremonies = 1.0 (hardcoded)",
  "thresholds": "0.5 false positive, 0.7 circuit breaker (fixed)",
  "skills": "success_rate defaults to 0.8",
  "adaptation": "NONE - system doesn't learn"
}
```

### After (Dynamic State)
```json
{
  "rewards": "standup=0.75, wsjf=0.85, review=0.60 (measured)",
  "thresholds": "0.62 false positive, 0.68 circuit breaker (adaptive)",
  "skills": "ssl-coverage-check=0.95, standup-ceremony=0.78 (actual)",
  "adaptation": "Thresholds tighten as system improves"
}
```

## Validation Checklist

- [ ] Ceremony rewards vary based on output quality
- [ ] Dynamic thresholds script called from FIRE cycle
- [ ] AgentDB causal edges populated with skill effectiveness
- [ ] Trajectory tracking reads actual ROAM (not hardcoded 81)
- [ ] False positive threshold adapts over time
- [ ] Circuit breaker threshold based on recent performance
- [ ] Confidence scores from historical data (not 0.8 default)
- [ ] Run `ay fire` 3 times and see metrics improve

## Risk Assessment

**LOW RISK**: All changes are additive (wire existing components). No breaking changes to data structures.

**HIGH VALUE**: Unlocks self-improvement - system gets smarter with every iteration.

**EFFORT**: ~5 hours total (2h Phase 2A + 1h Phase 2B + 2h Phase 2C)

## Next Steps

1. ✅ Phase 1 Complete (data pipeline operational)
2. → **Phase 2A START**: Wire reward calculator to FIRE cycle
3. → Phase 2B: Validate feedback loop
4. → Phase 2C: Eliminate remaining hardcoded values
5. → Phase 3: Advanced trajectory visualization

**Ready to proceed with Phase 2A?**
