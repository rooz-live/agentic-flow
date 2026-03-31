# NOW / NEXT / LATER: MCP/MPP Integration Action Plan

**Generated:** 2026-01-13T03:10:00Z  
**Context:** System has simulated learning, needs actual measurement  
**Current Corruption Score:** 1/6 (governance detects simulation)

---

## 🔴 NOW (Execute Immediately - 0-2 hours)

### Option A: Make Reward Calculator Work ⚡ **RECOMMENDED**

**Status:** Reward calculator exists but not being called properly

**Quick Fix:**
```bash
# 1. Test reward calculator directly
./scripts/ay-reward-calculator.sh standup

# 2. If it works, verify it's executable
chmod +x scripts/ay-reward-calculator.sh

# 3. Check ay-prod-cycle.sh is calling it (line 248-265)
grep -A5 "ay-reward-calculator" scripts/ay-prod-cycle.sh

# 4. Run one ceremony and check reward
ENABLE_AUTO_LEARNING=1 ./scripts/ay-yo.sh orchestrator standup advisory | grep reward
```

**Expected Outcome:**
- Rewards change from random (0.30, 0.85, 1.0) to measured (varies by quality)
- Governance corruption score drops from 1/6 to 0/6
- Episodes get `reward_version=2` (measured)

**Time:** 30 minutes  
**Impact:** HIGH - Fixes governance failure immediately

---

### Option B: Document Current State & Accept Simulation 📋

**If reward calculator doesn't work easily:**

```bash
# Create honesty disclaimer
cat > reports/SYSTEM-STATUS.md <<EOF
# System Status: Simulated Learning Mode

**Current Implementation:** Infrastructure testing phase
- ✅ Episode generation works
- ✅ Skills circulation works (31.7x reuse)
- ✅ Governance detection works
- ⚠️ Rewards are SIMULATED (random for testing)

**Production Readiness:** 75%
- Infrastructure: READY
- Measurement: NOT READY
- Timeline: 4 weeks to full MCP/MPP

**Honest Assessment:** System can generate and circulate skills, but cannot
measure actual ceremony quality. Use for mechanism testing only.
EOF
```

**Expected Outcome:**
- Truth-telling maintained
- Governance continues to flag simulation
- System remains useful for infrastructure testing

**Time:** 15 minutes  
**Impact:** MEDIUM - Maintains honesty, defers measurement

---

## 🟡 NEXT (Execute Soon - 1-7 days)

### Option C: Implement Week 1 Properly (Metric Collection)

**Full implementation of diagnostic plan Week 1:**

#### 1. Create Metric Schema (Day 1)
```bash
mkdir -p schemas
cat > schemas/ceremony-metrics.json <<EOF
{
  "standup": {
    "metrics": ["alignment_score", "blocker_detection", "action_clarity", "time_efficiency"],
    "weights": [0.3, 0.3, 0.2, 0.2]
  },
  "wsjf": {
    "metrics": ["prioritization", "business_value", "cost_quality", "risk_awareness"],
    "weights": [0.4, 0.3, 0.2, 0.1]
  },
  "retro": {
    "metrics": ["participation", "insights", "safety", "capture"],
    "weights": [0.3, 0.4, 0.2, 0.1]
  }
}
EOF
```

#### 2. Create Metrics Database Table (Day 2)
```bash
./scripts/ay-init-metrics-table.sh  # Create this script

# Contents:
sqlite3 agentdb.db <<EOF
CREATE TABLE IF NOT EXISTS ceremony_metrics (
  id INTEGER PRIMARY KEY,
  episode_id INTEGER NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);
CREATE INDEX idx_metrics_episode ON ceremony_metrics(episode_id);
CREATE INDEX idx_metrics_name ON ceremony_metrics(metric_name);
EOF
```

#### 3. Wire to Episode Generation (Day 3-4)
```bash
# Modify ay-prod-cycle.sh to:
# 1. Call ay-collect-metrics.sh after ceremony
# 2. Store metrics in database
# 3. Use metrics for reward calculation
```

#### 4. Validate (Day 5-7)
```bash
# Run 20 ceremonies
for i in {1..20}; do
  ENABLE_AUTO_LEARNING=1 ./scripts/ay-yo.sh orchestrator standup advisory
done

# Check metrics collected
sqlite3 agentdb.db "SELECT COUNT(*), AVG(metric_value) FROM ceremony_metrics;"

# Check rewards changed
sqlite3 agentdb.db "SELECT AVG(reward), STDDEV(reward) FROM episodes WHERE timestamp > datetime('now', '-1 hour');"
```

**Time:** 7 days (1 week)  
**Impact:** VERY HIGH - Actual learning begins

---

### Option D: Implement Simplified Metric Collection (Quick Win)

**Lightweight version - just measure what exists:**

```bash
# Create: scripts/ay-simple-metrics.sh
#!/usr/bin/env bash
# Extract metrics from existing episode data

extract_metrics() {
  local episode_file="$1"
  
  if [[ ! -f "$episode_file" ]]; then
    echo "0.5"
    return
  fi
  
  # Extract measurable data
  local skills_count=$(jq -r '.skills | length' "$episode_file")
  local duration=$(jq -r '.duration // 0' "$episode_file")
  
  # Simple scoring:
  # - More skills = better engagement
  # - Faster = more efficient
  local skill_score=$(echo "scale=2; $skills_count * 0.25" | bc)
  local time_score=$(echo "scale=2; 1 - ($duration / 1800)" | bc)  # 30min max
  
  # Average
  local reward=$(echo "scale=2; ($skill_score + $time_score) / 2" | bc)
  
  # Clamp [0,1]
  if (( $(echo "$reward > 1" | bc -l) )); then
    reward=1.0
  elif (( $(echo "$reward < 0" | bc -l) )); then
    reward=0.5
  fi
  
  echo "$reward"
}

extract_metrics "$@"
```

**Wire into ay-prod-cycle.sh:**
```bash
# Replace line 248-265
if [[ -x "$SCRIPT_DIR/ay-simple-metrics.sh" ]]; then
  reward=$("$SCRIPT_DIR/ay-simple-metrics.sh" "$episode_file")
  log_info "✓ Measured reward: $reward (from episode metrics)"
else
  # Fallback to random
fi
```

**Time:** 2 days  
**Impact:** MEDIUM - Better than random, not as good as full implementation

---

## 🟢 LATER (Future Work - 2-4 weeks)

### Option E: Full MCP/MPP Integration (Original Plan)

**Complete 4-week plan from diagnostic report:**

**Week 1:** Metric Collection Infrastructure ✅ (covered in Option C)  
**Week 2:** Dynamic Reward Calculation  
**Week 3:** Pattern Learning  
**Week 4:** MCP Integration  

**Details:** See `reports/HARDCODED-REWARDS-DIAGNOSTIC.md` lines 469-687

**Time:** 4 weeks  
**Impact:** MAXIMUM - Full learning system operational

---

### Option F: Parallel Implementation (Advanced)

**Run both systems simultaneously:**

1. **Keep simulated rewards** for comparison baseline
2. **Add measured rewards** in parallel
3. **Compare distributions** to validate measurement
4. **Switch over** when measured proves more informative

```sql
-- Add reward_v2 column
ALTER TABLE episodes ADD COLUMN reward_v2 REAL;

-- Store both
INSERT INTO episodes (..., reward, reward_v2, reward_version) 
VALUES (..., $random_reward, $measured_reward, 2);

-- Compare after 100 episodes
SELECT 
  AVG(reward) as v1_avg, STDDEV(reward) as v1_std,
  AVG(reward_v2) as v2_avg, STDDEV(reward_v2) as v2_std,
  CORR(reward, reward_v2) as correlation
FROM episodes
WHERE timestamp > datetime('now', '-7 days');
```

**Time:** 2 weeks (parallel to other work)  
**Impact:** HIGH - Validates measurement without breaking existing system

---

## Decision Matrix

| Option | Time | Impact | Risk | Recommended For |
|--------|------|--------|------|-----------------|
| A: Fix Reward Calculator | 30min | HIGH | LOW | **Immediate action** |
| B: Document Simulation | 15min | MEDIUM | ZERO | Honest deferral |
| C: Week 1 Full | 7 days | VERY HIGH | MEDIUM | Committed timeline |
| D: Simple Metrics | 2 days | MEDIUM | LOW | Quick improvement |
| E: Full 4-Week | 4 weeks | MAXIMUM | HIGH | Production system |
| F: Parallel | 2 weeks | HIGH | MEDIUM | Validation approach |

---

## Recommended Sequence

### Path 1: Fast Track (If reward calculator works)
1. **NOW:** Fix reward calculator (Option A) - 30min
2. **NEXT:** Validate with 50 episodes - 2 days
3. **LATER:** Add pattern learning (Week 3) - 1 week

**Total:** 9 days to working system

### Path 2: Steady Build (If starting fresh)
1. **NOW:** Document current state (Option B) - 15min
2. **NEXT:** Simple metrics (Option D) - 2 days
3. **NEXT:** Full Week 1 (Option C) - 7 days
4. **LATER:** Complete 4-week plan (Option E) - 3 weeks

**Total:** 4 weeks to full system

### Path 3: Validation Approach (If uncertain)
1. **NOW:** Document + Fix calculator (A+B) - 45min
2. **NEXT:** Parallel implementation (Option F) - 2 weeks
3. **LATER:** Switch to measured once validated - 1 week

**Total:** 3 weeks with safety net

---

## What To Do RIGHT NOW

**Execute this command block:**

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Test reward calculator
echo "Testing reward calculator..."
./scripts/ay-reward-calculator.sh standup 2>&1 | head -20

# If it outputs a number (0.0-1.0), it works!
# If it errors, document and move to Option B or D

# Check if it's being called
echo ""
echo "Checking if being called in ceremony execution..."
grep -n "ay-reward-calculator" scripts/ay-prod-cycle.sh

# Run validation
echo ""
echo "Running governance validation..."
./scripts/ay-enhanced.sh | grep -A10 "Governance Review"
```

**Based on output:**
- ✅ **If reward calculator works:** Continue with Path 1 (Fast Track)
- ❌ **If reward calculator fails:** Choose Path 2 (Steady Build) or Path 3 (Validation)

---

## Current Status Summary

**What Works:**
- ✅ Governance detection (identifies simulation)
- ✅ Episode generation (488 episodes)
- ✅ Skills circulation (31.7x reuse)
- ✅ Auto-learning trigger (every 10 episodes)
- ✅ Validation framework (6/6 criteria)

**What Doesn't:**
- ❌ Reward measurement (still random)
- ❌ Metric collection (no structured data)
- ❌ Pattern learning (no weight adjustment)
- ❌ MCP integration (no real-time measurement)

**Verdict:**
- Infrastructure: ✅ READY
- Measurement: ⚠️ NEEDS WORK
- Learning: ❌ NOT FUNCTIONAL
- Honesty: ✅ MAINTAINED

---

*"Fast execution beats perfect planning. Test the reward calculator first. 30 minutes of debugging worth more than 30 hours of new code."*

**Next Command:** Run the test block above, then report results.
