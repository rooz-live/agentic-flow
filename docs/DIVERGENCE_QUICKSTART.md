# Controlled Divergence Testing - Quick Start Guide

## TL;DR

**Start with minimal risk Phase 1 test (20 episodes, 10% divergence):**

```bash
# Terminal 1: Run test
DIVERGENCE_RATE=0.1 MAX_EPISODES=20 \
./scripts/ay-divergence-test.sh test orchestrator standup

# Terminal 2: Monitor in real-time
./scripts/ay-divergence-monitor.sh

# Emergency abort if needed
./scripts/ay-divergence-test.sh rollback
```

---

## What Is Controlled Divergence?

**Problem:** Static skills mapping doesn't adapt to actual patterns  
**Solution:** Introduce controlled "imperfection" (divergence) to generate learning signal  
**Goal:** Extract skills from episodes automatically via Multi-Path Planning (MPP)

**Analogy:** Like training a model with varied data vs. perfect examples only

---

## Pre-Flight Checklist (2 minutes)

```bash
# Run automated checks
./scripts/ay-pre-flight-check.sh
```

**Expected output:**
- ✓ All dependencies installed
- ✓ AgentDB responsive
- ✓ Scripts executable
- ⚠️ Skills = 0 (this is normal - they'll be learned)

---

## Phase 1: Safe Starter Test (Recommended)

### Configuration

| Parameter | Value | Why |
|-----------|-------|-----|
| Circle | `orchestrator` | Most isolated, no dependencies |
| Ceremony | `standup` | Simple, fast ceremony |
| Divergence | `0.1` (10%) | Minimal risk |
| Episodes | `20` | Statistical significance without long runtime |
| Circuit Breaker | `0.7` | Abort if reward drops below 70% |

### Run Command

```bash
# Start test
DIVERGENCE_RATE=0.1 MAX_EPISODES=20 \
./scripts/ay-divergence-test.sh test orchestrator standup
```

**Expected runtime:** 5-10 minutes

### What to Watch

Open monitoring dashboard in separate terminal:

```bash
./scripts/ay-divergence-monitor.sh
```

**Monitor these metrics:**

1. **Success Rate**: Should stay > 70%
2. **Average Reward**: Should stay > 0.8
3. **Skills Extracted**: Should show > 0 after ~15 episodes
4. **Cascade Failures**: Should be 0

### Success Criteria

After 20 episodes:

- ✓ Skills > 0 (learning active)
- ✓ Average Reward > 0.8
- ✓ No circuit breaker triggers
- ✓ Success rate > 70%

**If all pass → Proceed to Phase 2**

---

## Phase 2: Expand to Second Circle (Optional)

```bash
# Test second safe circle
DIVERGENCE_RATE=0.15 MAX_EPISODES=50 \
./scripts/ay-divergence-test.sh test analyst refine
```

**Watch for:**
- Skills extracted for both circles
- Reward maintained > 0.75
- No cascade to other circles

---

## Emergency Procedures

### Abort Test

Press `Ctrl+C` in Terminal 1 (test terminal)

### Rollback Database

```bash
./scripts/ay-divergence-test.sh rollback
```

**This will:**
1. Restore database from backup (< 30s)
2. Disable divergence
3. Return to static skills

### Verify Rollback

```bash
# Check database
node ./node_modules/.bin/agentdb stats | grep Episodes

# Test normal operation
./scripts/ay-prod-cycle.sh orchestrator standup advisory
```

---

## Post-Test Analysis

### View Results

```bash
./scripts/ay-divergence-test.sh analyze
```

**Expected output:**
```
╔══════════════════════════════════════╗
║  Divergence Test Analysis           ║
╠══════════════════════════════════════╣
║  Total episodes: 20
║  Successes: 16
║  Failures: 4
║  Success rate: 80.0%
╚══════════════════════════════════════╝

Current AgentDB State:
  - Skills: 3
  - Average Reward: 0.850
```

### Check Learned Skills

```bash
# View skills extracted
node ./node_modules/.bin/agentdb stats | grep Skills

# Export for validation
node ./node_modules/.bin/agentdb skill export --circle orchestrator
```

---

## Decision Tree

```
Start Test
    ↓
Success Rate > 70%? ────NO────→ ROLLBACK
    ↓ YES
Skills > 0? ────NO────→ Run 10 more episodes
    ↓ YES
Reward > 0.8? ────NO────→ REVIEW & ROLLBACK
    ↓ YES
✅ SUCCESS → Proceed to Phase 2
```

---

## Common Issues

### Issue: AgentDB Not Responding

**Symptoms:** Pre-flight check times out

**Fix:**
```bash
# Kill blocking processes
pkill -f "agentdb learner"

# Retry
./scripts/ay-pre-flight-check.sh
```

### Issue: No Skills Extracted After 20 Episodes

**Symptoms:** Skills = 0 after test complete

**Fix:**
```bash
# Run 20 more episodes to accumulate signal
DIVERGENCE_RATE=0.1 MAX_EPISODES=20 \
./scripts/ay-divergence-test.sh test orchestrator standup
```

### Issue: High Failure Rate (>40%)

**Symptoms:** Success rate < 60%

**Fix:**
```bash
# Reduce divergence rate
DIVERGENCE_RATE=0.05 MAX_EPISODES=20 \
./scripts/ay-divergence-test.sh test orchestrator standup
```

### Issue: Circuit Breaker Triggered

**Symptoms:** "Circuit breaker triggered" message, automatic rollback

**Fix:**
- **DO NOT re-run immediately**
- Review failure log: `cat .divergence-failures.log`
- Investigate root cause
- Consider adjusting circuit breaker threshold

---

## FAQ

**Q: Why start with only 10% divergence?**  
A: Minimize risk while still generating learning signal. Can increase later if successful.

**Q: How long until skills are extracted?**  
A: Typically 15-30 episodes for first skills, 50-100 for rich skill library.

**Q: Can I test multiple circles simultaneously?**  
A: Not recommended in Phase 1. Test one safe circle first, then expand.

**Q: What if I'm in production deadline?**  
A: **DO NOT RUN.** Wait for non-critical period.

**Q: Can I pause mid-test?**  
A: Yes, Ctrl+C. State is preserved. Resume with same command.

**Q: Do I need MCP server?**  
A: No - local WASM AgentDB is sufficient.

---

## Next Steps After Success

1. **Validate Skills**: Human review of extracted skills
2. **Expand**: Test second safe circle (analyst)
3. **Compare**: Baseline vs. learned performance
4. **Document**: Record learned patterns
5. **Graduate**: Move to continuous learning (Phase 3)

---

## Support

**Documentation:**
- Full ROAM analysis: `docs/DIVERGENCE_TESTING_ROAM.md`
- Risk register: See ROAM document

**Scripts:**
- Test runner: `scripts/ay-divergence-test.sh`
- Monitor: `scripts/ay-divergence-monitor.sh`
- Pre-flight: `scripts/ay-pre-flight-check.sh`

**Logs:**
- Results: `.divergence-test-results.jsonl`
- Failures: `.divergence-failures.log`
- Episodes: `/tmp/episode_*.json`

