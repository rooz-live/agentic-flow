# Divergence Testing - Complete Command Reference

## Quick Start (Copy-Paste Ready)

```bash
# 1. Pre-flight check
./scripts/ay-pre-flight-check.sh

# 2. Run Phase 1 test (Terminal 1)
DIVERGENCE_RATE=0.1 MAX_EPISODES=20 \
./scripts/ay-divergence-test.sh test orchestrator standup

# 3. Monitor (Terminal 2)
./scripts/ay-divergence-monitor.sh

# 4. Emergency rollback (if needed)
./scripts/ay-divergence-test.sh rollback
```

---

## All Available Commands

### Pre-Flight & Setup

```bash
# Validate system readiness
./scripts/ay-pre-flight-check.sh

# Create skills cache (optional)
./scripts/export-skills-cache.sh

# Check AgentDB status
node ./node_modules/.bin/agentdb stats
```

### Phase 1: Single Circle Test (RECOMMENDED START)

```bash
# Conservative test: 10% divergence, 20 episodes
DIVERGENCE_RATE=0.1 MAX_EPISODES=20 \
./scripts/ay-divergence-test.sh test orchestrator standup

# Expected runtime: 5-10 minutes
# Expected outcome: Skills > 0, Reward > 0.8
```

### Phase 2: Moderate Expansion

```bash
# Increase divergence after success
DIVERGENCE_RATE=0.15 MAX_EPISODES=50 \
./scripts/ay-divergence-test.sh test orchestrator standup

# Test second circle
DIVERGENCE_RATE=0.15 MAX_EPISODES=50 \
./scripts/ay-divergence-test.sh test analyst refine
```

### Phase 3: Multi-Circle (ADVANCED)

```bash
# Run multiple circles in parallel (risky)
for circle in orchestrator analyst; do
    DIVERGENCE_RATE=0.2 MAX_EPISODES=100 \
    ./scripts/ay-divergence-test.sh test "$circle" standup &
done

# Wait for all to complete
wait

# Analyze combined results
./scripts/ay-divergence-test.sh analyze
```

---

## Monitoring Commands

### Real-time Dashboard

```bash
# Live monitoring (auto-refresh every 10s)
./scripts/ay-divergence-monitor.sh

# Press Ctrl+C to exit
```

### Manual Checks

```bash
# Check AgentDB stats
node ./node_modules/.bin/agentdb stats | grep -E "Episodes|Skills|Average Reward"

# Count successes/failures
if [ -f .divergence-test-results.jsonl ]; then
    echo "Successes: $(grep -c '"status":"success"' .divergence-test-results.jsonl)"
    echo "Failures: $(grep -c '"status":"failed"' .divergence-test-results.jsonl)"
fi

# Recent cascade failures
find /tmp -name "episode_*.json" -mmin -10 -exec grep -l "failed" {} \; 2>/dev/null | wc -l
```

### Watch Commands

```bash
# Watch AgentDB stats (auto-refresh)
watch -n 10 'node ./node_modules/.bin/agentdb stats'

# Watch test results file
tail -f .divergence-test-results.jsonl

# Watch failure log
tail -f .divergence-failures.log
```

---

## Analysis Commands

### Post-Test Analysis

```bash
# Generate report
./scripts/ay-divergence-test.sh analyze

# Expected output:
# - Total episodes
# - Success/failure breakdown
# - Skills extracted
# - Average reward
```

### Skills Extraction

```bash
# View current skills count
node ./node_modules/.bin/agentdb stats | grep Skills

# Export skills (if > 0)
node ./node_modules/.bin/agentdb skill export --circle orchestrator | jq .

# Save to file
node ./node_modules/.bin/agentdb skill export --circle orchestrator > learned_skills.json
```

### Detailed Metrics

```bash
# Episodes count
node ./node_modules/.bin/agentdb stats | grep Episodes

# Average reward
node ./node_modules/.bin/agentdb stats | grep "Average Reward"

# Embedding coverage
node ./node_modules/.bin/agentdb stats | grep "Embedding Coverage"

# All stats
node ./node_modules/.bin/agentdb stats
```

---

## Emergency Procedures

### Abort Test

```bash
# Stop running test
Ctrl+C  # In test terminal

# Verify stopped
ps aux | grep divergence-test
```

### Rollback Database

```bash
# Automatic rollback (< 30 seconds)
./scripts/ay-divergence-test.sh rollback

# Manual rollback
cp agentdb.db.backup-YYYYMMDD-HHMMSS agentdb.db

# Verify rollback successful
node ./node_modules/.bin/agentdb stats | grep Episodes
```

### Kill Blocking Processes

```bash
# If AgentDB hangs
pkill -f "agentdb learner"
pkill -f "agentdb reflexion"

# Verify killed
ps aux | grep agentdb | grep -v grep
```

### Reset Test State

```bash
# Clear test results
rm -f .divergence-test-results.jsonl
rm -f .divergence-failures.log

# Clear temp episodes
rm -f /tmp/episode_*.json

# Disable divergence
unset DIVERGENCE_RATE
unset MAX_EPISODES
```

---

## Environment Variables

### Required

```bash
# None - all have defaults
```

### Optional Configuration

```bash
export DIVERGENCE_RATE=0.1           # Variance (0.0-1.0, default: 0.1)
export MAX_EPISODES=20               # Episodes per test (default: 50)
export CIRCUIT_BREAKER_REWARD=0.7    # Abort threshold (default: 0.7)
export TEST_MODE=1                   # Enable test mode (default: 1)
export MCP_OFFLINE_MODE=1            # Force offline (default: auto-detect)
```

### Safe Overrides

```bash
# Lower divergence (safer)
export DIVERGENCE_RATE=0.05

# More episodes (better stats)
export MAX_EPISODES=100

# Stricter circuit breaker
export CIRCUIT_BREAKER_REWARD=0.8
```

---

## Troubleshooting Commands

### Issue: Pre-flight Fails

```bash
# Fix: Kill blocking processes
pkill -f "agentdb learner"

# Retry pre-flight
./scripts/ay-pre-flight-check.sh
```

### Issue: No Skills Extracted

```bash
# Check episodes count
node ./node_modules/.bin/agentdb stats | grep Episodes

# If < 50, run more episodes
DIVERGENCE_RATE=0.1 MAX_EPISODES=30 \
./scripts/ay-divergence-test.sh test orchestrator standup
```

### Issue: High Failure Rate

```bash
# Check current success rate
grep -c '"status":"success"' .divergence-test-results.jsonl
grep -c '"status":"failed"' .divergence-test-results.jsonl

# If < 60%, reduce divergence
DIVERGENCE_RATE=0.05 MAX_EPISODES=20 \
./scripts/ay-divergence-test.sh test orchestrator standup
```

### Issue: Circuit Breaker Triggered

```bash
# View trigger event
tail -5 .divergence-failures.log

# Check average reward
node ./node_modules/.bin/agentdb stats | grep "Average Reward"

# Rollback and investigate
./scripts/ay-divergence-test.sh rollback
```

---

## Validation Commands

### Baseline Comparison

```bash
# Run baseline (no divergence)
DIVERGENCE_RATE=0 MAX_EPISODES=10 \
./scripts/ay-prod-cycle.sh orchestrator standup advisory

# Run divergence test
DIVERGENCE_RATE=0.1 MAX_EPISODES=10 \
./scripts/ay-divergence-test.sh test orchestrator standup

# Compare rewards
node ./node_modules/.bin/agentdb stats | grep "Average Reward"
```

### Human-in-Loop Validation

```bash
# Export learned skills
node ./node_modules/.bin/agentdb skill export --circle orchestrator > skills_to_validate.json

# Review manually
cat skills_to_validate.json | jq .

# Sample 10% for validation
cat skills_to_validate.json | jq '.skills | .[0:5]'
```

---

## Batch Operations

### Run All Safe Circles

```bash
# Sequential (safer)
for circle in orchestrator analyst; do
    echo "Testing $circle..."
    DIVERGENCE_RATE=0.1 MAX_EPISODES=20 \
    ./scripts/ay-divergence-test.sh test "$circle" standup
    
    sleep 30  # Cooldown between circles
done

# Analyze all
./scripts/ay-divergence-test.sh analyze
```

### Parallel Execution (Risky)

```bash
# Run 2 circles in parallel
DIVERGENCE_RATE=0.1 MAX_EPISODES=50 \
./scripts/ay-divergence-test.sh test orchestrator standup &

DIVERGENCE_RATE=0.1 MAX_EPISODES=50 \
./scripts/ay-divergence-test.sh test analyst refine &

# Monitor both
./scripts/ay-divergence-monitor.sh

# Wait for completion
wait
```

---

## Logs & Files

### Important Files

```bash
agentdb.db                          # Main database
agentdb.db.backup-*                 # Automatic backups
.divergence-test-results.jsonl     # Test results log
.divergence-failures.log            # Circuit breaker events
/tmp/episode_*.json                 # Individual episodes
.cache/skills/*.json                # Skills cache
```

### View Logs

```bash
# Test results (latest 10)
tail -10 .divergence-test-results.jsonl | jq .

# Failures only
grep '"status":"failed"' .divergence-test-results.jsonl | jq .

# Circuit breaker events
cat .divergence-failures.log

# Recent episodes
ls -lt /tmp/episode_*.json | head -5
```

### Clean Up

```bash
# Remove old episodes (> 1 day)
find /tmp -name "episode_*.json" -mtime +1 -delete

# Remove old backups (> 7 days)
find . -name "agentdb.db.backup-*" -mtime +7 -delete

# Archive test results
mv .divergence-test-results.jsonl \
   .divergence-test-results-$(date +%Y%m%d).jsonl
```

---

## Production Checklist

Before running in production:

- [ ] Pre-flight check passes
- [ ] Database backup exists
- [ ] Monitoring dashboard working
- [ ] Rollback procedure tested
- [ ] No production deadlines this week
- [ ] Team notified
- [ ] Emergency contacts ready
- [ ] Success criteria defined

---

## Reference Documentation

- **Full Risk Analysis:** `docs/DIVERGENCE_TESTING_ROAM.md`
- **Quick Start:** `docs/DIVERGENCE_QUICKSTART.md`
- **This Reference:** `docs/DIVERGENCE_COMMANDS.md`

---

## Support

**Scripts:**
- Test runner: `./scripts/ay-divergence-test.sh`
- Monitor: `./scripts/ay-divergence-monitor.sh`
- Pre-flight: `./scripts/ay-pre-flight-check.sh`

**Issues:** Open GitHub issue with logs attached

**Emergency:** Run rollback immediately, investigate later

