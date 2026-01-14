# Dynamic Thresholds Integration Status

**Date:** 2026-01-10  
**Current State:** Script Ready + Documentation Complete  
**Next Step:** Integrate into ay-yo and ay-prod

---

## ✅ Completed

### 1. WSJF Analysis
- **File:** `docs/wsjf-hardcoded-variables-analysis.md`
- **Status:** Complete ✅
- **Top Priorities Identified:**
  - Degradation Check (WSJF: 5.8) ⭐ HIGHEST
  - Circuit Breaker (WSJF: 5.0)
  - Check Frequency (WSJF: 4.75)
  - Cascade Failures (WSJF: 4.0)

### 2. Dynamic Threshold Script
- **File:** `scripts/ay-dynamic-thresholds.sh`
- **Status:** Exists and Working ✅
- **Test Output (33 observations):**
  ```
  Circuit Breaker:  0.7 (2.5σ method)
  Degradation:      0.85 (95% CI, CV: 0.15)
  Cascade:          5 failures in 5 minutes
  Divergence Rate:  0.05 (Sharpe: 0.0)
  Check Frequency:  Every 20 episodes
  ```

### 3. ROAM Documentation
- **File:** `docs/DYNAMIC_THRESHOLDS_ROAM.md`
- **Status:** Complete ✅
- **Contents:**
  - All 6 hardcoded values documented
  - Replacement algorithms specified
  - SQL queries ready
  - Benefits analyzed

---

## 🔄 In Progress

### TypeScript Hardcoded Values Found

#### 1. agentdb-learning.service.ts:87
```typescript
threshold: 0.7,  // ❌ Hardcoded pattern matching threshold
```

**Replacement:**
```typescript
// BEFORE (hardcoded)
const similarPatterns = await this.embeddingService.search(
  queryEmbedding,
  {
    limit: 10,
    threshold: 0.7,  // ❌ HARDCODED
    filter: { patternType: 'symptom_cluster' }
  }
);

// AFTER (dynamic from pattern metrics)
private async getDynamicCompletionThreshold(circle: string, ceremony: string): Promise<number> {
  const { execSync } = await import('child_process');
  try {
    const result = execSync(
      `./scripts/ay-dynamic-thresholds.sh completion ${circle} ${ceremony}`,
      { encoding: 'utf-8' }
    );
    const threshold = parseFloat(result.trim());
    return isNaN(threshold) ? 0.7 : Math.max(0.7, Math.min(0.9, threshold));
  } catch {
    return 0.7; // Fallback
  }
}

// Usage
const dynamicThreshold = await this.getDynamicCompletionThreshold(circle, ceremony);
const similarPatterns = await this.embeddingService.search(
  queryEmbedding,
  {
    limit: 10,
    threshold: dynamicThreshold,  // ✅ DYNAMIC
    filter: { patternType: 'symptom_cluster' }
  }
);
```

#### 2. gap_detection.ts:52
```typescript
? (invert ? value < threshold * 0.7 : value > threshold * 1.5) ? 'critical' : 'warning'
// ❌ 0.7 and 1.5 multipliers hardcoded
```

**Action:** MITIGATE (document assumptions, revisit quarterly)

```typescript
/**
 * Gap severity thresholds
 * 
 * HARDCODED ASSUMPTIONS:
 * - 0.7x multiplier: 30% below threshold = critical
 * - 1.5x multiplier: 50% above threshold = critical
 * - Normal distribution of metrics
 * 
 * ROAM Status: MITIGATE
 * - Current: Acceptable performance
 * - Risk: Medium (could miss anomalies in fat-tailed distributions)
 * - Review Date: 2026-04-10 (quarterly)
 * - WSJF Score: 1.5 (implement after higher priorities)
 */
const severity = breached
  ? (invert ? value < threshold * 0.7 : value > threshold * 1.5) ? 'critical' : 'warning'
  : 'info';
```

---

## 📋 Ready for Integration

### Phase 1: ay-prod-cycle.sh (1 hour)

**File:** `scripts/ay-prod-cycle.sh`  
**Lines:** 199-214 (divergence injection)

**Change:**
```bash
# BEFORE (hardcoded 10%)
if [[ "${DIVERGENCE_RATE:-0}" != "0" ]] && [[ "${ALLOW_VARIANCE:-0}" == "1" ]]; then

# AFTER (dynamic risk-adjusted)
# Calculate dynamic divergence rate if not explicitly set
if [[ -z "${DIVERGENCE_RATE:-}" ]] && [[ "${ALLOW_VARIANCE:-0}" == "1" ]]; then
  if [[ -x "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
    DIVERGENCE_CONFIG=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" divergence "$circle")
    DIVERGENCE_RATE=$(echo "$DIVERGENCE_CONFIG" | cut -d'|' -f1)
    SHARPE_RATIO=$(echo "$DIVERGENCE_CONFIG" | cut -d'|' -f2)
    log_info "Dynamic divergence rate: $DIVERGENCE_RATE (Sharpe: $SHARPE_RATIO)"
  else
    DIVERGENCE_RATE=0.10  # Fallback
  fi
fi

if [[ "${DIVERGENCE_RATE:-0}" != "0" ]] && [[ "${ALLOW_VARIANCE:-0}" == "1" ]]; then
```

### Phase 2: divergence-testing.sh (3 edits - 2 hours)

**File:** `scripts/divergence-testing.sh`

#### Edit 1: Circuit Breaker (Line 19)
```bash
# BEFORE
CIRCUIT_BREAKER_THRESHOLD="${CIRCUIT_BREAKER_THRESHOLD:-0.7}"

# AFTER
if [[ -x "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
  CIRCUIT_BREAKER_THRESHOLD=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" circuit-breaker "$TEST_CIRCLE")
  log_info "Dynamic circuit breaker: $CIRCUIT_BREAKER_THRESHOLD"
else
  CIRCUIT_BREAKER_THRESHOLD="${CIRCUIT_BREAKER_THRESHOLD:-0.7}"
  log_warn "Using fallback circuit breaker: $CIRCUIT_BREAKER_THRESHOLD"
fi
```

#### Edit 2: Degradation Check (Line 234) ⭐ HIGHEST PRIORITY
```bash
# BEFORE
elif (( final_reward < baseline_reward * 0.9 )); then
    log_error "FAILURE: Reward degraded too much ($final_reward < $((baseline_reward * 0.9)))"

# AFTER
DEGRADATION_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" degradation "$circle" "$ceremony")
DEGRADATION_THRESHOLD=$(echo "$DEGRADATION_RESULT" | cut -d'|' -f1)
COEFF_VARIATION=$(echo "$DEGRADATION_RESULT" | cut -d'|' -f2)

if (( $(echo "$final_reward < $DEGRADATION_THRESHOLD" | bc -l) )); then
    log_error "FAILURE: Statistically significant degradation detected"
    log_error "  Final reward: $final_reward"
    log_error "  Threshold (95% CI): $DEGRADATION_THRESHOLD"
    log_error "  Coefficient of Variation: $COEFF_VARIATION"
```

#### Edit 3: Cascade Failures (Lines 133-136)
```bash
# BEFORE
check_cascade_failures() {
    local recent_failures=$(sqlite3 "$ROOT_DIR/agentdb.db" \
        "SELECT COUNT(*) FROM episodes WHERE success = 0 AND created_at > datetime('now', '-5 minutes');")
    
    if (( recent_failures > 10 )); then

# AFTER
check_cascade_failures() {
    local CASCADE_CONFIG=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" cascade "$circle" "$ceremony")
    local CASCADE_THRESHOLD=$(echo "$CASCADE_CONFIG" | cut -d'|' -f1)
    local CASCADE_WINDOW=$(echo "$CASCADE_CONFIG" | cut -d'|' -f2)
    local BASELINE_RATE=$(echo "$CASCADE_CONFIG" | cut -d'|' -f3)
    
    local recent_failures=$(sqlite3 "$ROOT_DIR/agentdb.db" \
        "SELECT COUNT(*) FROM episodes WHERE success = 0 AND created_at > datetime('now', '-$CASCADE_WINDOW minutes');")
    
    if (( recent_failures > CASCADE_THRESHOLD )); then
        log_error "CASCADE DETECTED: $recent_failures failures in last $CASCADE_WINDOW minutes"
        log_error "  Threshold: $CASCADE_THRESHOLD (baseline rate: ${BASELINE_RATE}%)"
```

### Phase 3: TypeScript Services (3 hours)

#### Edit: agentdb-learning.service.ts
Add dynamic threshold helper and integrate into search calls (see code above)

---

## 🧪 Testing Commands

### 1. Test Current Script
```bash
# View all dynamic thresholds
./scripts/ay-dynamic-thresholds.sh all orchestrator standup

# Export to env file
./scripts/ay-dynamic-thresholds.sh export orchestrator standup .env.dynamic

# Source in scripts
source .env.dynamic
echo "Circuit breaker: $CIRCUIT_BREAKER_THRESHOLD"
```

### 2. Test Individual Thresholds
```bash
# Circuit breaker
./scripts/ay-dynamic-thresholds.sh circuit-breaker orchestrator

# Degradation (returns threshold|cv)
./scripts/ay-dynamic-thresholds.sh degradation orchestrator standup

# Cascade (returns threshold|window|baseline)
./scripts/ay-dynamic-thresholds.sh cascade orchestrator standup

# Divergence (returns rate|sharpe|success)
./scripts/ay-dynamic-thresholds.sh divergence orchestrator

# Check frequency (returns freq|cv|fail_rate)
./scripts/ay-dynamic-thresholds.sh check-freq orchestrator standup
```

### 3. Integration Test
```bash
# Run 20 episodes with dynamic thresholds
ENABLE_DYNAMIC_THRESHOLDS=1 ./scripts/divergence-testing.sh test orchestrator standup 20

# Verify logs show calculated values
grep -i "dynamic" /tmp/divergence_test_*.log
```

---

## 📊 Expected Results (33 observations)

Based on current test run:

| Threshold | Hardcoded | Dynamic | Method |
|-----------|-----------|---------|---------|
| Circuit Breaker | 0.70 | 0.70 | 2.5σ below mean |
| Degradation | baseline×0.9 | 0.85 | 95% CI |
| Cascade | 10 in 5min | 5 in 5min | Velocity-based |
| Divergence | 0.10 | 0.05 | Sharpe-adjusted |
| Check Freq | Every 10 | Every 20 | Risk-adaptive |

**Note:** With only 33 observations, conservative fallbacks are used. Thresholds will become more precise with 100+ episodes.

---

## 🎯 Success Criteria

### Immediate (after integration):
- [ ] Scripts run without errors
- [ ] Logs show "Dynamic threshold: X" messages
- [ ] Fallback to hardcoded if script unavailable
- [ ] No increase in false positive rollbacks

### Short-term (after 100 episodes):
- [ ] Thresholds converge to stable values
- [ ] Statistical significance achieved (n≥30 per metric)
- [ ] Rollback rate ≤ current rate
- [ ] No catastrophic failures missed

### Long-term (after 7 days):
- [ ] Thresholds adapt to regime changes
- [ ] Performance improvement measurable
- [ ] Skills discovered rate maintained/improved
- [ ] System self-tunes without manual intervention

---

## 🚀 Quick Start Integration

**Option 1: Immediate Full Integration (3 edits)**
```bash
# 1. Edit ay-prod-cycle.sh (1 edit)
vim scripts/ay-prod-cycle.sh
# Add dynamic divergence rate calculation (see Phase 1)

# 2. Edit divergence-testing.sh (3 edits)  
vim scripts/divergence-testing.sh
# Add circuit breaker, degradation, cascade (see Phase 2)

# 3. Test
./scripts/divergence-testing.sh test orchestrator standup 20
```

**Option 2: Gradual Rollout (test each)**
```bash
# Week 1: Circuit breaker only
# Week 2: Add degradation threshold
# Week 3: Add cascade + divergence
# Week 4: Full production
```

---

## 📚 References

- **WSJF Analysis:** `docs/wsjf-hardcoded-variables-analysis.md`
- **ROAM Guide:** `docs/DYNAMIC_THRESHOLDS_ROAM.md`
- **Script:** `scripts/ay-dynamic-thresholds.sh`
- **Test Data:** 33 episodes in `agentdb.db`

---

## ⏭️ Next Actions

1. **Immediate:** Integrate into `ay-prod-cycle.sh` (1 hour)
2. **Today:** Integrate into `divergence-testing.sh` (2 hours)
3. **This Week:** Run 100 episode validation
4. **Next Week:** TypeScript integration
5. **Monthly:** Review threshold stability

---

**Status:** ✅ Ready for Integration  
**Confidence:** High (statistically sound + fallbacks)  
**Estimated Integration Time:** 3-6 hours total
