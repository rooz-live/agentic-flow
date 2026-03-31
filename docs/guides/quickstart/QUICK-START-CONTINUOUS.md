# 🚀 Quick Start: Continuous Improvement Mode

**Status**: ✅ Ready to Start  
**Date**: 2025-01-09  
**Risk**: Low (3.2/10)

---

## ✅ Pre-Flight Status

All 4 requirements met:
1. ✅ Skills extracting (13 patterns)
2. ✅ Core scripts exist (workaround for missing scripts)
3. ✅ Pre-flight checks pass
4. ✅ Baseline equity established (1609 episodes)

---

## 🎯 Start Continuous Mode (3 Simple Steps)

### Step 1: Start the loop (background)
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Start continuous improvement in background
nohup ./scripts/manual-continuous-mode.sh > /tmp/continuous.log 2>&1 &
echo $! > /tmp/continuous.pid

echo "✅ Started continuous mode (PID: $(cat /tmp/continuous.pid))"
```

### Step 2: Monitor (optional)
```bash
# Watch real-time logs
tail -f /tmp/continuous.log

# Or monitor stats
watch -n 10 'npx agentdb stats | grep -E "Episodes:|Skills:"'

# Or check status
sqlite3 agentdb.db "SELECT COUNT(*) FROM skill_candidates;" && echo "skills"
```

### Step 3: Stop when needed
```bash
# Graceful shutdown
kill $(cat /tmp/continuous.pid)

# Or force stop
pkill -f manual-continuous-mode
```

---

## 📊 What It Does

Every 5 minutes (customizable), the loop:
1. **Runs all 6 circles** (orchestrator, assessor, analyst, innovator, seeker, intuitive)
2. **Extracts new skills** from episodes (pattern recognition)
3. **Updates offline cache** (`.cache/skills/`)
4. **Monitors resources** (memory, load)
5. **Logs progress** (`/tmp/continuous.log`)

---

## 🔧 Configuration

### Change interval (default: 5 minutes)
```bash
# 10 minutes
export CHECK_INTERVAL_SECONDS=600
./scripts/manual-continuous-mode.sh

# 30 minutes  
export CHECK_INTERVAL_SECONDS=1800
./scripts/manual-continuous-mode.sh

# 1 hour
export CHECK_INTERVAL_SECONDS=3600
./scripts/manual-continuous-mode.sh
```

### Run single cycle (test mode)
```bash
# Just one iteration, then stop
./scripts/ay-yo-integrate.sh all
npx agentdb skill consolidate
npx agentdb stats
```

### Staged rollout (conservative)
```bash
# Stage 1: 3 test cycles (1 min apart)
for i in {1..3}; do
  echo "Test cycle $i/3"
  ./scripts/ay-yo-integrate.sh all
  npx agentdb skill consolidate
  sleep 60
done

# Stage 2: Start with 30 min interval
export CHECK_INTERVAL_SECONDS=1800
nohup ./scripts/manual-continuous-mode.sh > /tmp/continuous.log 2>&1 &

# Stage 3: Reduce to 5 min once stable (restart required)
kill $(cat /tmp/continuous.pid)
export CHECK_INTERVAL_SECONDS=300
nohup ./scripts/manual-continuous-mode.sh > /tmp/continuous.log 2>&1 &
```

---

## 📈 Expected Results (24 hours)

**Before (now)**:
- Episodes: 1609
- Skill Patterns: 13
- All patterns: 1.00 reward

**After 24 hours**:
- Episodes: ~1700-1900 (+100-300)
- Skill Patterns: ~15-20 (+2-7 new patterns)
- Equity Score: 75-85 (better balance)
- Cache updates: 288 times (every 5 min)

---

## 🔍 Monitoring Commands

```bash
# Live stats (updates every 10 seconds)
watch -n 10 'npx agentdb stats'

# Skill count over time
watch -n 60 'sqlite3 agentdb.db "SELECT COUNT(*) FROM skill_candidates;"'

# Recent episodes
sqlite3 agentdb.db "SELECT id, task, reward, success FROM episodes ORDER BY ts DESC LIMIT 5;"

# Circle balance
sqlite3 agentdb.db "
  SELECT 
    json_extract(metadata, '$.circle') as circle,
    COUNT(*) as episodes,
    AVG(reward) as avg_reward
  FROM episodes 
  WHERE metadata IS NOT NULL
  GROUP BY circle
  ORDER BY episodes DESC;
"

# Memory usage
vm_stat | grep "Pages free" | awk '{print $3 * 4096 / 1024 / 1024 " MB free"}'

# Check if running
ps aux | grep manual-continuous-mode | grep -v grep || echo "Not running"
```

---

## 🛡️ Safety Features

**Automatic**:
- ✅ Resource monitoring (memory, load)
- ✅ Graceful degradation (pauses if low memory)
- ✅ Retry logic (3 attempts per ceremony)
- ✅ Offline fallback (uses cached skills)
- ✅ Error logging (`/tmp/continuous.log`)

**Manual overrides**:
```bash
# Pause (send SIGSTOP)
kill -STOP $(cat /tmp/continuous.pid)

# Resume
kill -CONT $(cat /tmp/continuous.pid)

# Stop gracefully
kill $(cat /tmp/continuous.pid)
```

---

## ❓ FAQ

### Q: MCP server not running?
**A**: Not needed! AgentDB uses local WASM (sql.js). MCP is optional for cloud features.

### Q: Skills count shows 0?
**A**: Skills are in `skill_candidates` table. Check:
```bash
sqlite3 agentdb.db "SELECT COUNT(*) FROM skill_candidates;"
```

### Q: Missing scripts error?
**A**: Core scripts exist. Optional scripts (ay-ceremony-seeker.sh, calculate-wsjf-auto.sh) not needed for basic operation.

### Q: How to update cache manually?
**A**:
```bash
./scripts/export-skills-cache.sh
```

### Q: Claude-flow@v3alpha needed?
**A**: No. Only for upstream contribution to claude-flow project. Not needed for ay-prod.

### Q: WASM optimization available?
**A**: Already enabled. Check output:
```bash
npx agentdb stats
# ✅ Using sql.js (WASM SQLite, no build tools required)
```

---

## 📝 Logs & Troubleshooting

### View logs
```bash
# Real-time
tail -f /tmp/continuous.log

# Last 50 lines
tail -50 /tmp/continuous.log

# Search for errors
grep -i error /tmp/continuous.log

# Search for successes
grep "✓" /tmp/continuous.log
```

### Common issues

**Issue**: Script stops unexpectedly
```bash
# Check logs
tail -100 /tmp/continuous.log

# Check if still running
ps aux | grep manual-continuous-mode

# Restart
nohup ./scripts/manual-continuous-mode.sh > /tmp/continuous.log 2>&1 &
```

**Issue**: Low memory warning
```bash
# Pause and wait for resources
kill -STOP $(cat /tmp/continuous.pid)

# Check memory
vm_stat | grep "Pages free"

# Resume when ready
kill -CONT $(cat /tmp/continuous.pid)
```

**Issue**: Skills not increasing
```bash
# Check consolidation
npx agentdb skill consolidate

# Verify database
sqlite3 agentdb.db "SELECT COUNT(*) FROM episodes;"
sqlite3 agentdb.db "SELECT COUNT(*) FROM skill_candidates;"

# May need more episodes (run a few cycles manually)
for i in {1..5}; do ./scripts/ay-yo-integrate.sh all; done
npx agentdb skill consolidate
```

---

## 🎉 Ready!

**Start now**:
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
nohup ./scripts/manual-continuous-mode.sh > /tmp/continuous.log 2>&1 &
echo $! > /tmp/continuous.pid
echo "✅ Started! Monitor: tail -f /tmp/continuous.log"
```

Full details: `docs/CONTINUOUS-MODE-READY.md`
