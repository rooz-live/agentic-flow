# Controlled Divergence Testing Guide

## Quick Start (Safe Path)

```bash
# 1. Make script executable
chmod +x scripts/ay-divergence-test.sh

# 2. Start with safest configuration
DIVERGENCE_RATE=0.1 MAX_EPISODES=50 \
  scripts/ay-divergence-test.sh single orchestrator

# 3. Monitor in separate terminal
scripts/ay-divergence-test.sh monitor

# 4. Check results
scripts/ay-divergence-test.sh report
```

## Decision Tree: Should You Enable Divergence?

```
START
  │
  ├─ Do you have 30+ baseline observations? ─── NO ──> Run baseline first
  │                                                     scripts/ay-wsjf-runner.sh baseline
  └─ YES
      │
      ├─ Is this a production-critical phase? ─── YES ──> DO NOT enable divergence
      │                                                    Wait until after deadline
      └─ NO
          │
          ├─ Can you monitor in real-time? ─── NO ──> DO NOT enable divergence
          │                                             Too risky without monitoring
          └─ YES
              │
              └─ Do you have backup/rollback plan? ─── NO ──> Create backup first
                                                               cp agentdb.db agentdb.db.backup
                                                       YES
                                                         │
                                                         └─> ✅ SAFE TO PROCEED
```

## Risk Assessment

### ✅ PROCEED IF (All Must Be True)

1. **Baseline established**: ≥30 observations
2. **Monitoring capability**: Real-time dashboard available
3. **Backup ready**: Database backed up
4. **Time available**: Can tolerate 10-30% temporary degradation
5. **Not production-critical**: No urgent deadlines

### ❌ DO NOT PROCEED IF (Any Is True)

1. **Production deadline**: Critical phase in progress
2. **No monitoring**: Cannot watch in real-time
3. **Dependencies at risk**: Downstream systems would break
4. **Insufficient baseline**: <30 observations
5. **No rollback plan**: Cannot restore if things fail

## Safety Levels

### Level 1: Ultra-Safe (Recommended Start)

```bash
# Configuration
DIVERGENCE_RATE=0.1          # Only 10% imperfect
MAX_EPISODES=50              # Limited exposure
CIRCUIT_BREAKER_THRESHOLD=0.8  # Abort if success < 80%

# Execute
DIVERGENCE_RATE=0.1 MAX_EPISODES=50 \
  scripts/ay-divergence-test.sh single orchestrator
```

**Expected**:
- 5 divergent episodes out of 50
- Success rate: 85-95%
- Skills extracted: 0-3 (first run)
- Risk: VERY LOW

### Level 2: Moderate (After Level 1 Success)

```bash
# Configuration
DIVERGENCE_RATE=0.2          # 20% imperfect
MAX_EPISODES=100             # More data
CIRCUIT_BREAKER_THRESHOLD=0.75  # Slightly more tolerant

# Execute
DIVERGENCE_RATE=0.2 MAX_EPISODES=100 \
  scripts/ay-divergence-test.sh single orchestrator
```

**Expected**:
- 20 divergent episodes out of 100
- Success rate: 75-85%
- Skills extracted: 3-8
- Risk: LOW-MODERATE

### Level 3: Aggressive (After Level 2 Success)

```bash
# Configuration
DIVERGENCE_RATE=0.3          # 30% imperfect
MAX_EPISODES=100             # More data
CIRCUIT_BREAKER_THRESHOLD=0.7  # More tolerant

# Execute
DIVERGENCE_RATE=0.3 MAX_EPISODES=100 \
  scripts/ay-divergence-test.sh single analyst
```

**Expected**:
- 30 divergent episodes out of 100
- Success rate: 70-80%
- Skills extracted: 5-15
- Risk: MODERATE

### Level 4: Multi-Circle (Advanced)

```bash
# Only after successful Level 3
DIVERGENCE_RATE=0.15 \
  scripts/ay-divergence-test.sh multi
```

**Expected**:
- Tests orchestrator + analyst sequentially
- 15% divergence per circle
- Skills extracted: 10-30
- Risk: MODERATE-HIGH (cascade risk)

## What Happens During Divergence Test?

### Phase 1: Pre-Flight (30 seconds)

```
🚦 Pre-Flight Safety Checks

✓ Backup created: agentdb.db.divergence_backup
✓ Integration script found
✓ Baseline sufficient: 77 observations
✓ Disk space OK: 89%
✓ Memory OK: 237MB

✓ Pre-flight complete - SAFE TO PROCEED
```

### Phase 2: Execution (4-10 minutes)

```
[PHASE] Controlled Divergence Test

Configuration:
  Circle: orchestrator
  Ceremony: standup
  Divergence Rate: 0.1 (10%)
  Max Episodes: 50
  Circuit Breaker: 0.7

[ℹ] Episode 1: STANDARD (no variance)
[✓] Episode 1: SUCCESS

[ℹ] Episode 2: STANDARD (no variance)
[✓] Episode 2: SUCCESS

[ℹ] Episode 3: DIVERGENT (variance injected)
[⚠] Episode 3: FAILED

[ℹ] Episode 4: STANDARD (no variance)
[✓] Episode 4: SUCCESS

...

══════════════════════════════════════════
  Divergence Test Progress
══════════════════════════════════════════

  Circle: orchestrator
  Episode: 10/50 (20%)
  Skills Extracted: 0
  Total Episodes: 10

[ℹ] Current Reward: 0.90
[ℹ] Checking for learned anti-patterns...
```

### Phase 3: Completion (10 seconds)

```
[PHASE] Divergence Test Complete

══════════════════════════════════════════
  Final Results
══════════════════════════════════════════

  Circle: orchestrator
  Episodes: 50
  Successes: 45
  Failures: 5
  Success Rate: 90%

[✓] Skills Extracted: 2 ✓

[✓] SUCCESS: Safe to expand to more circles

Next steps:
  1. Review learned skills: npx agentdb skill export --circle orchestrator
  2. Expand to more circles: scripts/ay-divergence-test.sh multi-circle
  3. Increase divergence rate: DIVERGENCE_RATE=0.2 scripts/ay-divergence-test.sh orchestrator

[✓] Report saved: divergence-results/report_orchestrator_20260109_160532.txt
```

## Circuit Breaker Scenarios

### Scenario A: Success Rate Too Low

```
Episode: 20/50 (40%)
Current Reward: 0.65

[✗] CIRCUIT BREAKER TRIGGERED

  Current Reward: 0.65
  Threshold: 0.7

[✗] Adaptive learning ABORTED

[PHASE] Rolling Back Database

[ℹ] Restoring from backup...
[✓] Database restored
[✓] Divergence disabled
```

**Action**: Investigate why success rate dropped. Check logs for errors.

### Scenario B: Cascade Failure

```
Episode: 30/50 (60%)
Current Reward: 0.85

[✗] CASCADE FAILURE DETECTED: 25% failure rate

[✗] Cascade failures detected - ABORTING

[PHASE] Rolling Back Database
```

**Action**: One circle's divergence is breaking other circles. Reduce divergence rate.

### Scenario C: Anti-Pattern Detected

```
Episode: 40/50 (80%)
Current Reward: 0.90

[ℹ] Checking for learned anti-patterns...
[⚠] Suspiciously fast ceremonies: 3.2s average
[⚠] Possible reward hacking - skipping validation?
[⚠] Suspiciously high success rate: 99.5%
[⚠] Validate that quality hasn't degraded
```

**Action**: Manually inspect recent ceremonies. Check if validation is being skipped.

## Monitoring Dashboard

### Terminal 1: Run Test

```bash
DIVERGENCE_RATE=0.1 MAX_EPISODES=50 \
  scripts/ay-divergence-test.sh single orchestrator
```

### Terminal 2: Live Monitor

```bash
scripts/ay-divergence-test.sh monitor
```

**Output**:
```
══════════════════════════════════════════
  Divergence Test Monitor (Live)
  Thu Jan  9 16:15:42 PST 2026
══════════════════════════════════════════

  Episode: 25
  Skills: 1
  Total Episodes: 25

Skills: 1
Episodes: 25
Average Reward: 0.88
```

### Terminal 3: Watch Database

```bash
watch -n 10 'sqlite3 agentdb.db "
SELECT 
  circle,
  COUNT(*) as episodes,
  ROUND(AVG(success)*100,1) as success_pct
FROM observations
WHERE created_at > datetime('\''now'\'', '\''-1 hour'\'')
GROUP BY circle;
"'
```

## Interpreting Results

### Success Criteria

**After 50 episodes at 10% divergence**:

| Metric | Target | Interpretation |
|--------|--------|----------------|
| Success Rate | ≥80% | System tolerates variance well |
| Skills Extracted | ≥2 | Learning is functioning |
| Cascade Failures | 0 | No downstream impact |
| Anti-Patterns | 0 warnings | Quality maintained |

### Decision Matrix

| Success Rate | Skills | Next Action |
|-------------|--------|-------------|
| ≥90% | ≥2 | ✅ Increase to 20% divergence |
| 80-89% | ≥2 | ✅ Run 50 more at same rate |
| 70-79% | ≥1 | ⚠️ Continue monitoring, don't expand |
| <70% | Any | ❌ Rollback, investigate failures |
| Any | 0 | ⚠️ Check skill extraction setup |

## Rollback Procedures

### Manual Rollback

```bash
# 1. Stop any running tests
pkill -f ay-divergence-test.sh

# 2. Restore backup
scripts/ay-divergence-test.sh rollback

# 3. Verify restoration
npx agentdb stats
sqlite3 agentdb.db "SELECT COUNT(*) FROM observations;"
```

### Emergency Rollback (If Script Fails)

```bash
# 1. Find backup
ls -la agentdb.db.divergence_backup

# 2. Manual restore
cp agentdb.db.divergence_backup agentdb.db

# 3. Disable divergence
export DIVERGENCE_RATE=0
export ALLOW_VARIANCE=0
```

## Validation Checklist

After divergence test completes, validate:

### 1. Skills Review

```bash
# Export learned skills
npx agentdb skill export --circle orchestrator | jq .

# Look for:
# - Reasonable skill names (not gibberish)
# - Proficiency values 0.0-1.0
# - Observations count > 0
```

### 2. Quality Audit

```bash
# Sample recent ceremonies
sqlite3 agentdb.db << EOF
SELECT 
  circle,
  ceremony,
  duration_seconds,
  success,
  created_at
FROM observations
ORDER BY created_at DESC
LIMIT 20;
EOF

# Check for:
# - Durations look normal (not too fast/slow)
# - Mix of success/failure (not all 100%)
# - No obvious anomalies
```

### 3. Cascade Check

```bash
# Check all circles still working
scripts/ay-yo-integrate.sh dashboard | grep "Circle Equity" -A 7

# Verify:
# - All circles represented
# - No circle at 0% (broken)
# - Equity not severely skewed
```

### 4. Human-in-Loop Verification

```bash
# Run one ceremony manually and inspect
scripts/ay-yo-integrate.sh exec orchestrator standup advisory

# Validate:
# - DoR validation passed
# - DoD validation passed
# - Output looks sensible
# - Duration reasonable
```

## Advanced: Multi-Metric Reward

Current reward is success rate only. For anti-pattern resistance, consider:

```bash
# Reward formula (conceptual)
reward = (
  success_rate * 0.4 +
  quality_score * 0.3 +
  duration_efficiency * 0.2 +
  validation_completeness * 0.1
)

# Where:
# - quality_score: DoD validation depth
# - duration_efficiency: not too fast, not too slow
# - validation_completeness: all checks passed
```

This prevents "gaming" where system optimizes only for success rate.

## Troubleshooting

### Issue: No skills extracted after 50 episodes

**Diagnosis**:
```bash
# Check episode files
ls -la /tmp/episode_*.json | wc -l
# Should be > 0

# Check if skill extraction works
scripts/diagnose-skills.sh
```

**Solution**: See `docs/DEBUG_CONTINUOUS_IMPROVEMENT.md`

### Issue: Success rate below 70%

**Diagnosis**:
```bash
# Check failure reasons
sqlite3 agentdb.db "
SELECT 
  error_message,
  COUNT(*) as count
FROM observations
WHERE success = 0
GROUP BY error_message;
"
```

**Solution**: Lower divergence rate or fix underlying issues

### Issue: Cascade failures

**Diagnosis**:
```bash
# Check which circles are failing
sqlite3 agentdb.db "
SELECT 
  circle,
  COUNT(*) as failures
FROM observations
WHERE success = 0
  AND created_at > datetime('now', '-1 hour')
GROUP BY circle
ORDER BY failures DESC;
"
```

**Solution**: Test circles in isolation first

## Next Steps After Successful Divergence

1. **Expand circles**: Add analyst, then innovator
2. **Increase variance**: Move from 10% → 20% → 30%
3. **Longer runs**: 50 → 100 → 200 episodes
4. **Production mode**: Enable divergence in continuous improvement daemon
5. **Weekly training**: Run causal learner on accumulated data

## Production Deployment (Final Stage)

Once validated:

```bash
# 1. Enable divergence in production mode
export DIVERGENCE_RATE=0.1
export ALLOW_VARIANCE=1

# 2. Start continuous improvement
scripts/ay-wsjf-runner.sh production

# 3. Monitor for 24 hours
scripts/ay-wsjf-runner.sh monitor

# 4. Weekly review
npx agentdb skill export --all > weekly_skills_$(date +%Y%m%d).json
```

---

**Remember**: Start small, monitor closely, rollback quickly if needed. Divergence testing is about building confidence gradually, not rushing to production.
