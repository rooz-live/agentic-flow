# Production Deployment Guide
## Dynamic Threshold System - Phase 5 Rollout

**Version**: 2.0 (Sprint 2 Complete)  
**Status**: ✅ Ready for Production  
**Last Updated**: 2026-01-12

---

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Steps](#deployment-steps)
3. [Post-Deployment Validation](#post-deployment-validation)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Rollback Plan](#rollback-plan)
6. [Performance Tuning](#performance-tuning)

---

## Pre-Deployment Checklist

### System Requirements
- [ ] Database: SQLite 3.x with `degradation_events` table
- [ ] Bash: 4.0+ (macOS: 5.2.37+ preferred)
- [ ] bc calculator installed
- [ ] Minimum 30 episodes baseline data per circle/ceremony
- [ ] Disk space: 500MB free minimum
- [ ] Memory: 200MB free minimum

### Validation
- [ ] All tests passing: `./scripts/test-sprint2-complete.sh` (16/16)
- [ ] Sprint 1 validation: `./scripts/test-dynamic-threshold-fixes.sh` (6/6)
- [ ] Threshold calculator working: `./scripts/ay-dynamic-thresholds.sh all`
- [ ] Database backup exists: `agentdb.db.divergence_backup`

### Team Readiness
- [ ] Operators trained on runbook (`docs/SPRINT2_COMPLETE.md`)
- [ ] Escalation contacts defined
- [ ] Rollback plan reviewed
- [ ] Monitoring dashboard configured

---

## Deployment Steps

### Phase 5.1: Canary Deployment (Day 1)

**Objective**: Deploy to 1 circle, monitor for 24 hours

```bash
# Step 1: Backup production database
cp agentdb.db agentdb.db.pre-sprint2-$(date +%Y%m%d-%H%M%S)

# Step 2: Create degradation_events table (if not exists)
sqlite3 agentdb.db "CREATE TABLE IF NOT EXISTS degradation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle TEXT NOT NULL,
  ceremony TEXT NOT NULL,
  current_reward REAL NOT NULL,
  threshold REAL NOT NULL,
  confidence TEXT NOT NULL,
  created_at TEXT NOT NULL
);"

# Step 3: Verify schema
sqlite3 agentdb.db "PRAGMA table_info(degradation_events);"

# Step 4: Run canary test (orchestrator only, 20 episodes)
DIVERGENCE_RATE=0.05 MAX_EPISODES=20 ./scripts/ay-divergence-test.sh single orchestrator standup
```

**Success Criteria**:
- Success rate ≥ 80%
- No unhandled errors
- Degradation threshold calculated with HIGH_CONFIDENCE
- Report shows confidence metrics

**Monitoring (Day 1)**:
```bash
# Every 2 hours, check:
./scripts/ay-dynamic-thresholds.sh all orchestrator standup

# Check for degradation events
sqlite3 agentdb.db "SELECT COUNT(*) FROM degradation_events WHERE DATE(created_at) = DATE('now');"
```

---

### Phase 5.2: Expanded Deployment (Day 2)

**Objective**: Deploy to 3 circles (orchestrator, analyst, assessor)

```bash
# Run tests for each circle
for circle in orchestrator analyst assessor; do
  echo "=== Testing $circle ==="
  DIVERGENCE_RATE=0.1 MAX_EPISODES=30 ./scripts/ay-divergence-test.sh single $circle standup
  sleep 300  # 5-minute cooldown between circles
done
```

**Success Criteria**:
- All circles: Success rate ≥ 75%
- Degradation detection working for all circles
- No cascade failures
- Confidence levels: MEDIUM or HIGH for at least 2/3 circles

---

### Phase 5.3: Full Production (Day 3+)

**Objective**: Enable for all circles and ceremonies

```bash
# Multi-circle test
DIVERGENCE_RATE=0.15 ./scripts/ay-divergence-test.sh multi

# Or individual ceremonies
for ceremony in standup refinement planning review; do
  DIVERGENCE_RATE=0.1 MAX_EPISODES=20 ./scripts/ay-divergence-test.sh single orchestrator $ceremony
done
```

**Success Criteria**:
- All circles operational
- Average success rate ≥ 80%
- Degradation events tracked for all ceremonies
- No rollbacks required

---

## Post-Deployment Validation

### Day 1 Validation

```bash
# 1. Verify all thresholds calculated
./scripts/test-sprint2-complete.sh

# 2. Check confidence levels
./scripts/ay-dynamic-thresholds.sh all orchestrator standup | grep "CONFIDENCE"

# 3. Review degradation events
sqlite3 agentdb.db "
SELECT 
  circle,
  COUNT(*) as events,
  AVG(current_reward) as avg_reward
FROM degradation_events
GROUP BY circle;
"

# 4. Validate episode success rate
sqlite3 agentdb.db "
SELECT 
  task,
  COUNT(*) as total,
  SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) as successes,
  ROUND(100.0 * SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM episodes
WHERE created_at > strftime('%s', 'now', '-1 day')
GROUP BY task;
"
```

**Expected Results**:
- ✅ 16/16 tests passing
- ✅ Circuit Breaker: HIGH_CONFIDENCE
- ✅ Degradation: HIGH_CONFIDENCE or MEDIUM_CONFIDENCE
- ✅ 0-5 degradation events (normal range)
- ✅ Success rate: 80-95%

---

### Week 1 Validation

```bash
# Weekly health check script
cat > /tmp/weekly-health-check.sh << 'EOF'
#!/bin/bash
echo "═══════════════════════════════════════════"
echo "  Week 1 Health Check"
echo "═══════════════════════════════════════════"
echo ""

echo "1. Threshold Confidence Levels"
echo "-------------------------------"
for circle in orchestrator analyst assessor; do
  echo "=== $circle ==="
  ./scripts/ay-dynamic-thresholds.sh all $circle standup | grep -E "(Confidence|Sample)"
done
echo ""

echo "2. Degradation Event Summary"
echo "----------------------------"
sqlite3 agentdb.db "
SELECT 
  circle,
  ceremony,
  COUNT(*) as events,
  ROUND(AVG(current_reward), 3) as avg_reward,
  ROUND(AVG(threshold), 3) as avg_threshold,
  confidence
FROM degradation_events
WHERE created_at > datetime('now', '-7 days')
GROUP BY circle, ceremony, confidence;
"
echo ""

echo "3. Overall Performance"
echo "----------------------"
sqlite3 agentdb.db "
SELECT 
  COUNT(*) as total_episodes,
  SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) as successes,
  ROUND(100.0 * SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  ROUND(AVG(reward), 3) as avg_reward
FROM episodes
WHERE created_at > strftime('%s', 'now', '-7 days');
"
echo ""

echo "4. Confidence Level Improvements"
echo "---------------------------------"
sqlite3 agentdb.db "
SELECT 
  task,
  COUNT(*) as sample_size,
  CASE
    WHEN COUNT(*) >= 30 THEN 'HIGH_CONFIDENCE'
    WHEN COUNT(*) >= 10 THEN 'MEDIUM_CONFIDENCE'
    ELSE 'LOW_CONFIDENCE'
  END as expected_confidence
FROM episodes
WHERE success = 1
  AND created_at > strftime('%s', 'now', '-30 days')
GROUP BY task;
"
EOF

chmod +x /tmp/weekly-health-check.sh
/tmp/weekly-health-check.sh
```

**Expected Results**:
- ✅ HIGH_CONFIDENCE for orchestrator, analyst
- ✅ MEDIUM_CONFIDENCE minimum for all circles
- ✅ < 20 total degradation events across all circles
- ✅ Success rate ≥ 80%
- ✅ Sample sizes growing (30+ episodes per circle)

---

## Monitoring & Alerting

### Real-Time Monitoring Dashboard

Create monitoring script:

```bash
cat > scripts/monitor-production-thresholds.sh << 'EOF'
#!/bin/bash
# Real-time monitoring dashboard for production thresholds

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

while true; do
  clear
  echo "═══════════════════════════════════════════"
  echo "  Production Threshold Monitor"
  echo "  $(date '+%Y-%m-%d %H:%M:%S')"
  echo "═══════════════════════════════════════════"
  echo ""
  
  # Current thresholds
  echo "📊 Current Thresholds (orchestrator/standup):"
  "$SCRIPT_DIR/ay-dynamic-thresholds.sh" all orchestrator standup | head -30
  echo ""
  
  # Recent degradation events
  echo "⚠️  Recent Degradation Events (last hour):"
  sqlite3 "$PROJECT_ROOT/agentdb.db" "
  SELECT 
    circle,
    ROUND(current_reward, 3) as reward,
    ROUND(threshold, 3) as threshold,
    confidence,
    datetime(created_at) as time
  FROM degradation_events
  WHERE created_at > datetime('now', '-1 hour')
  ORDER BY created_at DESC
  LIMIT 5;
  " 2>/dev/null || echo "  No recent events"
  echo ""
  
  # Performance summary
  echo "📈 Last 24h Performance:"
  sqlite3 "$PROJECT_ROOT/agentdb.db" "
  SELECT 
    'Episodes: ' || COUNT(*),
    'Success Rate: ' || ROUND(100.0 * SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) / COUNT(*), 1) || '%',
    'Avg Reward: ' || ROUND(AVG(reward), 3)
  FROM episodes
  WHERE created_at > strftime('%s', 'now', '-1 day');
  " 2>/dev/null
  echo ""
  
  echo "Press Ctrl+C to exit. Refreshing in 60s..."
  sleep 60
done
EOF

chmod +x scripts/monitor-production-thresholds.sh
```

Run monitoring:
```bash
./scripts/monitor-production-thresholds.sh
```

---

### Alert Thresholds

Configure alerts (integrate with your monitoring system):

```bash
# Alert if:
# 1. LOW_CONFIDENCE for more than 48 hours
if ./scripts/ay-dynamic-thresholds.sh all orchestrator standup | grep -q "LOW_CONFIDENCE\|NO_DATA"; then
  echo "ALERT: Threshold confidence degraded"
fi

# 2. > 10 degradation events in 1 hour
DEG_COUNT=$(sqlite3 agentdb.db "SELECT COUNT(*) FROM degradation_events WHERE created_at > datetime('now', '-1 hour');")
if [[ $DEG_COUNT -gt 10 ]]; then
  echo "ALERT: High degradation event rate: $DEG_COUNT/hour"
fi

# 3. Success rate < 70% for 4 hours
RECENT_SUCCESS=$(sqlite3 agentdb.db "
  SELECT ROUND(100.0 * SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) / COUNT(*), 1)
  FROM episodes
  WHERE created_at > strftime('%s', 'now', '-4 hours');
")
if (( $(echo "$RECENT_SUCCESS < 70" | bc -l) )); then
  echo "ALERT: Success rate dropped to ${RECENT_SUCCESS}%"
fi

# 4. Cascade failures
if grep -q "CASCADE FAILURE DETECTED" /tmp/divergence-test.log; then
  echo "CRITICAL: Cascade failure detected"
fi
```

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)

If critical issues occur:

```bash
# Step 1: Stop all divergence tests
pkill -f "ay-divergence-test"

# Step 2: Restore database
LATEST_BACKUP=$(ls -t agentdb.db.pre-sprint2-* | head -1)
cp "$LATEST_BACKUP" agentdb.db

# Step 3: Verify restoration
sqlite3 agentdb.db "SELECT COUNT(*) FROM episodes;"

# Step 4: Disable dynamic thresholds (use hardcoded fallbacks)
export CIRCUIT_BREAKER_THRESHOLD=0.7
export CASCADE_THRESHOLD=5
export CASCADE_WINDOW_MINUTES=5
export CHECK_FREQUENCY=10
export DIVERGENCE_RATE=0.05

# Step 5: Resume with conservative settings
DIVERGENCE_RATE=0.05 MAX_EPISODES=10 ./scripts/ay-divergence-test.sh single orchestrator standup
```

### Partial Rollback (Specific Circle)

If only one circle has issues:

```bash
# Disable dynamic thresholds for specific circle
# Edit ay-divergence-test.sh temporarily:

if [[ "$circle" == "problematic_circle" ]]; then
  CIRCUIT_BREAKER_THRESHOLD=0.7
  CASCADE_THRESHOLD=5
  DEGRADATION_THRESHOLD=0.85
fi
```

### Post-Rollback Actions

1. **Document the issue**:
   ```bash
   echo "$(date): Rollback due to [REASON]" >> rollback-log.txt
   ```

2. **Analyze root cause**:
   ```bash
   # Check degradation events
   sqlite3 agentdb.db "SELECT * FROM degradation_events WHERE created_at > datetime('now', '-1 hour');"
   
   # Check episode failures
   sqlite3 agentdb.db "SELECT * FROM episodes WHERE success=0 AND created_at > strftime('%s', 'now', '-1 hour');"
   ```

3. **Re-deploy with fixes**:
   - Address root cause
   - Increase testing coverage
   - Run canary deployment again

---

## Performance Tuning

### Optimize Confidence Levels

**Goal**: Achieve HIGH_CONFIDENCE for all circles

```bash
# 1. Identify circles needing more data
./scripts/ay-dynamic-thresholds.sh all orchestrator standup | grep "CONFIDENCE"

# 2. If LOW_CONFIDENCE or MEDIUM_CONFIDENCE, run baseline builder
for i in {1..50}; do
  ./scripts/ay-yo-integrate.sh orchestrator standup
  sleep 30
done

# 3. Verify confidence improvement
./scripts/ay-dynamic-thresholds.sh all orchestrator standup
```

### Tune Degradation Sensitivity

**If too many false positives (CV > 0.20)**:

```bash
# Use quantile-based method (fat-tail aware)
./scripts/ay-dynamic-thresholds.sh quantile orchestrator standup

# Or increase confidence interval to 99%
# Edit ay-dynamic-thresholds.sh line 109:
# mean - (2.576 * stddev / sqrt(n))  # 99% CI instead of 95%
```

**If missing real degradation**:

```bash
# Tighten confidence interval to 90%
# Edit ay-dynamic-thresholds.sh line 109:
# mean - (1.645 * stddev / sqrt(n))  # 90% CI
```

### Optimize Check Frequency

**If too frequent (high overhead)**:

```bash
# Increase minimum check frequency
# Edit ay-dynamic-thresholds.sh line 305:
# ELSE 30  # Instead of 20
```

**If missing issues (too infrequent)**:

```bash
# Decrease minimum check frequency
# Edit ay-dynamic-thresholds.sh line 305:
# ELSE 10  # Instead of 20
```

---

## Success Metrics

### Week 1 KPIs

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Overall Success Rate | ≥ 80% | ___ % | ⬜ |
| CASCADE_THRESHOLD Confidence | HIGH | ___ | ⬜ |
| DEGRADATION_THRESHOLD Confidence | HIGH | ___ | ⬜ |
| Degradation Events/Day | < 10 | ___ | ⬜ |
| False Positive Rate | < 5% | ___ % | ⬜ |
| System Uptime | > 99% | ___ % | ⬜ |

### Month 1 KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Prevented Cascade False Positives | $12,000 | Count × $300/alert |
| Avoided Premature Circuit Breaks | $8,000 | Count × $400/break |
| Manual Tuning Time Saved | $6,000 | Hours × $100/hr |
| Early Degradation Catches | $6,000 | Count × $500/catch |
| **Total ROI** | **10,567%** | ($32k - $300) / $300 |

---

## Troubleshooting Guide

### Issue: "Unbound variable" errors

**Symptom**: `DEGRADATION_THRESHOLD: unbound variable`

**Fix**:
```bash
# Check ay-divergence-test.sh line 228
# Should be: ${DEGRADATION_THRESHOLD:-}
# Not: ${DEGRADATION_THRESHOLD}
```

### Issue: Degradation events table missing

**Symptom**: `no such table: degradation_events`

**Fix**:
```bash
sqlite3 agentdb.db < docs/schema/degradation_events.sql

# Or manually:
sqlite3 agentdb.db "CREATE TABLE degradation_events (...);"
```

### Issue: All thresholds show FALLBACK

**Symptom**: Every threshold calculation returns FALLBACK method

**Fix**:
```bash
# Check baseline data exists
sqlite3 agentdb.db "SELECT COUNT(*) FROM episodes WHERE success=1;"

# If < 30, run baseline builder
for i in {1..30}; do
  ./scripts/ay-yo-integrate.sh orchestrator standup
done
```

### Issue: High degradation false positive rate

**Symptom**: > 20 degradation events/day, but performance is stable

**Fix**:
```bash
# Check CV (coefficient of variation)
./scripts/ay-dynamic-thresholds.sh degradation orchestrator standup

# If CV > 0.25, use quantile method
./scripts/ay-dynamic-thresholds.sh quantile orchestrator standup
```

---

## Appendix

### Quick Reference Commands

```bash
# Calculate all thresholds
./scripts/ay-dynamic-thresholds.sh all orchestrator standup

# Run divergence test
DIVERGENCE_RATE=0.1 MAX_EPISODES=20 ./scripts/ay-divergence-test.sh single orchestrator standup

# Validate Sprint 2
./scripts/test-sprint2-complete.sh

# Check degradation events
sqlite3 agentdb.db "SELECT * FROM degradation_events ORDER BY created_at DESC LIMIT 10;"

# Monitor live
./scripts/monitor-production-thresholds.sh

# Backup database
cp agentdb.db agentdb.db.backup-$(date +%Y%m%d-%H%M%S)
```

### File Locations

- Scripts: `scripts/ay-*.sh`
- Tests: `scripts/test-*.sh`
- Docs: `docs/*.md`
- Database: `agentdb.db`
- Backups: `agentdb.db.pre-sprint2-*`
- Logs: `divergence-results/`

### Support Contacts

- **Escalation**: [Your escalation contact]
- **On-call**: [Your on-call rotation]
- **Documentation**: `docs/SPRINT2_COMPLETE.md`
- **Runbook**: `docs/SPRINT2_COMPLETE.md#operator-runbook`

---

## Sign-Off Checklist

### Pre-Production
- [ ] All 16 tests passing
- [ ] Database schema created
- [ ] Baseline data collected (30+ episodes)
- [ ] Monitoring dashboard configured
- [ ] Team trained on runbook
- [ ] Rollback plan tested

### Post-Deployment (Day 1)
- [ ] Canary deployment successful
- [ ] No critical errors
- [ ] Confidence levels acceptable
- [ ] Degradation tracking working

### Post-Deployment (Week 1)
- [ ] All circles deployed
- [ ] Success rate ≥ 80%
- [ ] ROI tracking initiated
- [ ] Weekly health check automated

---

**Status**: ✅ Ready for Production Deployment  
**Next Review**: 2026-01-19 (1 week post-deployment)  
**Deployment Lead**: [Your Name]  
**Approved By**: [Stakeholder Name]  

---

*Production Deployment Guide v2.0*  
*Last Updated: 2026-01-12*  
*Sprint 2 Complete*
