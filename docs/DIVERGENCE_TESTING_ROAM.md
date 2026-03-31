# Controlled Divergence Testing - ROAM Risk Register

## Executive Summary

**Decision: PROCEED WITH STRICT SAFEGUARDS**

Controlled divergence testing offers high potential for adaptive learning but requires careful risk management. This document outlines the ROAM (Resolved, Owned, Accepted, Mitigated) framework for safe implementation.

---

## Risk Matrix

| Risk | Severity | Likelihood | Impact | ROAM | Owner | Mitigation |
|------|----------|------------|--------|------|-------|------------|
| **Cascade Failure** | HIGH | LOW | Production pipeline breaks across multiple circles | **M** (Mitigated) | System | Isolate to safe circles only (orchestrator, analyst) |
| **Anti-pattern Learning** | MEDIUM | MEDIUM | System learns "shortcuts" that maximize metrics without real improvement | **M** (Mitigated) | Learning | Multi-dimensional reward + human validation |
| **Reward Hacking** | MEDIUM | MEDIUM | Gaming metrics (e.g., skip validation → faster → higher reward) | **M** (Mitigated) | Learning | Circuit breaker at 0.7 reward threshold |
| **Temporary Performance Loss** | LOW | HIGH | 10-30% degradation during learning phase | **O** (Owned) | Operations | Timeboxed testing, not in production deadline periods |
| **Data Variance** | LOW | HIGH | Noisy learning signal from imperfect episodes | **O** (Owned) | Analytics | Statistical filtering, confidence intervals |
| **Increased Complexity** | LOW | HIGH | More moving parts to monitor and debug | **A** (Accepted) | Architecture | Trade-off for adaptive capability |

---

## Decision Criteria

### ✅ PROCEED IF:

1. **Backup/Rollback Ready**
   - Database backed up automatically
   - One-command rollback available
   - Tested restoration process

2. **Real-time Monitoring**
   - Dashboard shows live metrics
   - Circuit breakers functional
   - Cascade detection active

3. **Tolerant of Degradation**
   - Can accept 10-30% temporary performance loss
   - Not in critical production deadline
   - Time to iterate (days/weeks)

4. **Isolated Testing**
   - Only safe circles (orchestrator, analyst)
   - No dependent systems affected
   - Manual validation gates in place

### ❌ DO NOT PROCEED IF:

1. **Production Critical Phase**
   - Active production deadlines
   - Cannot tolerate any failures
   - Dependent systems at risk

2. **No Monitoring Capability**
   - Cannot watch in real-time
   - No circuit breaker infrastructure
   - Missing rollback process

3. **High Stakes Context**
   - Real customer data at risk
   - Regulatory compliance concerns
   - Financial transactions involved

4. **Resource Constrained**
   - No time to iterate
   - Cannot dedicate attention
   - Missing backup infrastructure

---

## Implementation Phases

### Phase 1: Minimal Risk (RECOMMENDED START)

```bash
# Conservative test: 1 circle, low divergence, small batch
DIVERGENCE_RATE=0.1 \
MAX_EPISODES=20 \
./scripts/ay-divergence-test.sh test orchestrator standup
```

**Success Criteria:**
- ✓ Skills > 0 after 20 episodes
- ✓ Average Reward > 0.8
- ✓ No cascade failures
- ✓ Success rate > 70%

**If successful → Phase 2**

### Phase 2: Moderate Risk (EXPAND GRADUALLY)

```bash
# Expand to 2 safe circles, moderate episodes
DIVERGENCE_RATE=0.15 \
MAX_EPISODES=50 \
./scripts/ay-divergence-test.sh test analyst refine
```

**Success Criteria:**
- ✓ Skills extracted for both circles
- ✓ Average Reward maintained > 0.75
- ✓ Learning patterns emerge
- ✓ Success rate > 65%

**If successful → Phase 3**

### Phase 3: Production Learning (HIGH STAKES)

```bash
# Multi-circle with continuous monitoring
for circle in orchestrator analyst innovator; do
    DIVERGENCE_RATE=0.2 \
    MAX_EPISODES=100 \
    ./scripts/ay-divergence-test.sh test "$circle" standup &
done

# Monitor closely
./scripts/ay-divergence-monitor.sh
```

**Abort Conditions:**
- ✗ Average Reward < 0.7
- ✗ >5 cascade failures in 10 minutes
- ✗ Skills not extracting after 100 episodes
- ✗ Success rate < 50%

---

## Mitigation Strategies

### 1. Cascade Failure Prevention

**Problem:** One circle's failures trigger failures in dependent circles

**Mitigation:**
```bash
# Only test isolated circles
SAFE_CIRCLES=(orchestrator analyst)

# Verify no dependencies
./scripts/check-circle-dependencies.sh
```

### 2. Anti-pattern Detection

**Problem:** System learns "shortcuts" (e.g., skip validation steps)

**Mitigation:**
- Multi-dimensional reward: `reward = 0.5*speed + 0.3*quality + 0.2*correctness`
- Validation gates: Require certain steps completed
- Human-in-loop: Sample 10% of learned skills for validation

### 3. Reward Hacking Prevention

**Problem:** Gaming metrics without real improvement

**Mitigation:**
```bash
# Penalty for skipped critical steps
reward = base_reward - (skipped_steps * 0.2)

# Holdout test set
# Train on 80% episodes, validate on 20%
```

### 4. Circuit Breaker Implementation

**Problem:** Runaway degradation

**Mitigation:**
```bash
# Automatic abort if reward drops below threshold
CIRCUIT_BREAKER_REWARD=0.7

# Check every 10 episodes
if avg_reward < 0.7; then
    restore_backup()
    disable_divergence()
    alert_operator()
fi
```

---

## Monitoring Dashboard

```bash
# Terminal 1: Run test
./scripts/ay-divergence-test.sh test orchestrator standup

# Terminal 2: Monitor in real-time
./scripts/ay-divergence-monitor.sh

# Terminal 3: Watch logs
tail -f .divergence-test-results.jsonl
```

---

## Rollback Procedure

### Emergency Rollback (< 30 seconds)

```bash
./scripts/ay-divergence-test.sh rollback
```

This will:
1. Restore latest database backup
2. Disable divergence (`DIVERGENCE_RATE=0`)
3. Enable offline mode (`MCP_OFFLINE_MODE=1`)
4. Return to static skills mapping

### Verification After Rollback

```bash
# Verify database restored
node ./node_modules/.bin/agentdb stats | grep "Episodes"

# Verify divergence disabled
echo $DIVERGENCE_RATE  # Should be 0 or empty

# Test normal operation
./scripts/ay-prod-cycle.sh orchestrator standup advisory
```

---

## Analysis & Learning

### Post-Test Analysis

```bash
# Generate report
./scripts/ay-divergence-test.sh analyze

# Expected output:
# - Total episodes
# - Success/failure breakdown
# - Skills extracted count
# - Average reward trend
```

### Extracting Learned Skills

```bash
# Export skills for each circle tested
node ./node_modules/.bin/agentdb skill export --circle orchestrator > learned_skills_orchestrator.json

# Validate against ground truth
./scripts/validate-learned-skills.sh learned_skills_orchestrator.json
```

---

## Success Metrics

### Short-term (First 50 episodes)

- ✓ Skills > 0 (learning active)
- ✓ Average Reward > 0.7 (acceptable performance)
- ✓ Success rate > 60% (more successes than failures)
- ✓ No circuit breaker triggers

### Medium-term (100-200 episodes)

- ✓ Skills > 5 (diverse patterns learned)
- ✓ Average Reward > 0.8 (improving performance)
- ✓ Success rate > 70% (consistent improvement)
- ✓ Learning patterns validated by human

### Long-term (500+ episodes)

- ✓ Skills > 20 (rich skill library)
- ✓ Average Reward > 0.9 (optimal performance)
- ✓ Success rate > 85% (mature learning)
- ✓ Outperforms static mapping baseline

---

## Recommendation: **PROCEED WITH PHASE 1**

### Why Proceed:

1. **Infrastructure Ready**
   - ✅ Circuit breakers implemented
   - ✅ Monitoring dashboard created
   - ✅ Backup/rollback tested
   - ✅ Isolated safe circles identified

2. **Risk Well-Managed**
   - ✅ All HIGH/MEDIUM risks mitigated
   - ✅ Real-time monitoring available
   - ✅ Emergency abort process defined
   - ✅ Impact limited to safe circles

3. **High Upside**
   - Adaptive learning capability
   - Reduced manual skill definition
   - Continuous improvement potential
   - Data-driven optimization

### Start Command:

```bash
# Safe, conservative test (20 episodes, 10% divergence)
DIVERGENCE_RATE=0.1 MAX_EPISODES=20 \
./scripts/ay-divergence-test.sh test orchestrator standup
```

### Monitor Command:

```bash
# Watch in real-time (separate terminal)
./scripts/ay-divergence-monitor.sh
```

### Emergency Abort:

```bash
# If things go wrong
./scripts/ay-divergence-test.sh rollback
```

---

## Appendix: Validation Checklist

Before running divergence testing, verify:

- [ ] Database backup exists
- [ ] Rollback procedure tested
- [ ] Monitoring dashboard functional
- [ ] Circuit breakers configured
- [ ] Safe circles identified
- [ ] No production deadlines this week
- [ ] Team aware of testing
- [ ] Time allocated for monitoring
- [ ] Rollback plan communicated
- [ ] Success criteria defined

**Sign-off:** _________________________  
**Date:** _________________________  
**Risk Acceptance Level:** Moderate (with mitigations)

