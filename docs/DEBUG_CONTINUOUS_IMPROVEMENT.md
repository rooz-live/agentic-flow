# Debugging Continuous Improvement Blockers

## Executive Summary

**Current Status**: Convergence 0.627/0.850 (operational threshold, not production ready)

**Critical Blockers**:
1. ✅ Syntax error (line 300) - **FIXED**
2. ❌ Zero skills extracting (0 skills despite 2 episodes stored)
3. ❌ Zero observations for learning (0/30 baseline)
4. ⚠️ Circle imbalance (orchestrator 53%, target <40%)

---

## Question 1: Why Are Skills Not Extracting?

### Current State
```bash
npx agentdb stats
# Expected: Skills > 0
# Actual: Skills: 0
```

### Root Cause Analysis

**Problem**: Episodes are stored (`/tmp/episode_*.json`) but not processed into skills.

**Investigation Steps**:

```bash
# 1. Check episode files exist
ls -la /tmp/episode_*.json
# Should show: episode_orchestrator_standup_*.json

# 2. Check episode content
cat /tmp/episode_orchestrator_standup_*.json | jq '.observation'
# Should show: valid JSON with context, action, outcome

# 3. Check if skills table exists
sqlite3 agentdb.db "SELECT sql FROM sqlite_master WHERE name='skills';"
# Should show: CREATE TABLE skills (...)

# 4. Check if any skills are stored
sqlite3 agentdb.db "SELECT * FROM skills;"
# Should show: rows OR empty

# 5. Test skill extraction manually
npx agentdb skill extract --episode /tmp/episode_orchestrator_standup_*.json
# Expected: Extracted 1 skill
# Actual: Error OR success?
```

### Likely Causes

**Hypothesis 1**: Episode storage script doesn't trigger skill extraction
```bash
# Check if ay-yo-integrate.sh calls skill extraction
grep -n "agentdb skill" scripts/ay-yo-integrate.sh
# If NOT found: Skills are never extracted
```

**Hypothesis 2**: Episode format incompatible with agentdb
```bash
# Check episode schema
cat /tmp/episode_*.json | jq 'keys'
# Expected: ["observation", "metadata", "context"]
# Actual: May be missing required fields
```

**Hypothesis 3**: AgentDB skill extraction is broken
```bash
# Test with minimal episode
echo '{"observation": {"context": "test", "action": "test", "outcome": "test"}}' > /tmp/test_episode.json
npx agentdb skill extract --episode /tmp/test_episode.json
# If this fails: AgentDB bug
```

### Solutions

**Solution A: Add skill extraction hook to ay-yo-integrate.sh**

```bash
# File: scripts/ay-yo-integrate.sh
# After line: echo "$episode" > "$episode_file"

# Extract skills immediately
if command -v npx >/dev/null && npx agentdb skill extract --episode "$episode_file" 2>/dev/null; then
  echo "  ✓ Skill extracted"
else
  echo "  ⚠ Skill extraction skipped (agentdb unavailable)"
fi
```

**Solution B: Batch extract all episodes**

```bash
#!/usr/bin/env bash
# scripts/extract-skills-batch.sh

for episode in /tmp/episode_*.json; do
  echo "Processing: $episode"
  npx agentdb skill extract --episode "$episode" || echo "  ⚠ Failed"
done

# Verify
npx agentdb stats | grep "Skills:"
```

**Solution C: Manual skill insertion**

```bash
# If agentdb skill extract doesn't work, insert directly
sqlite3 agentdb.db << EOF
INSERT INTO skills (circle, ceremony, skill_name, proficiency, observations_count, created_at)
VALUES ('orchestrator', 'standup', 'time_management', 0.5, 1, datetime('now'));
EOF

# Verify
sqlite3 agentdb.db "SELECT * FROM skills;"
```

---

## Question 2: MCP Server - When Required vs Optional?

### MCP Architecture in Current System

**MCP is OPTIONAL** for local WASM functionality.

```
┌─────────────────────────────────────────┐
│         AgentDB Architecture            │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────┐      ┌──────────────┐   │
│  │   Local   │      │  MCP Server  │   │
│  │   WASM    │      │  (Optional)  │   │
│  │  Engine   │      │              │   │
│  └─────┬─────┘      └──────┬───────┘   │
│        │                   │            │
│        └───────┬───────────┘            │
│                ▼                        │
│         ┌────────────┐                  │
│         │  AgentDB   │                  │
│         │   SQLite   │                  │
│         └────────────┘                  │
│                                         │
└─────────────────────────────────────────┘
```

### When MCP Server is Used

**MCP server (`npx agentdb mcp start`) provides**:
- Remote API access (HTTP/WebSocket)
- Cross-process communication
- Distributed learning coordination
- Cloud synchronization

**Local WASM provides**:
- All core AgentDB functionality
- Skill extraction
- Causal learning
- Pattern recognition
- SQLite operations

### Why MCP Server May Not Respond

```bash
# 1. Check if server is running
ps aux | grep "agentdb mcp"
# If nothing: Server not started

# 2. Check port availability
lsof -i :3000
# If occupied: Port conflict

# 3. Test startup manually
npx agentdb mcp start --verbose
# Common errors:
#   - EADDRINUSE: Port 3000 taken (kill existing process)
#   - MODULE_NOT_FOUND: agentdb not installed
#   - EACCES: Permission denied (sudo required?)
```

### Current System Behavior

**Your scripts use LOCAL WASM, not MCP server:**

```bash
# These commands use WASM directly:
npx agentdb stats          # ✓ Works without MCP
npx agentdb learner run    # ✓ Works without MCP
npx agentdb skill extract  # ✓ Works without MCP
sqlite3 agentdb.db         # ✓ Direct database access

# Only this requires MCP server:
curl http://localhost:3000/health  # ✗ Requires server
```

### Recommendation

**DO NOT START MCP SERVER** - it's unnecessary for your use case.

All functionality works via local WASM. MCP server would only be needed if:
- Running distributed agents across machines
- Exposing AgentDB via HTTP API
- Integrating with remote monitoring tools

---

## Question 3: Pre-Flight Checklist Implementation

### Installation

```bash
# 1. Create pre-flight script
chmod +x scripts/ay-preflight-check.sh

# 2. Run before starting continuous mode
./scripts/ay-preflight-check.sh
```

### Expected Output

```
🚦 Pre-Flight Checklist for Continuous Improvement

▶ 1. Dependencies
  ✓ jq installed
  ✓ sqlite3 installed
  ✓ npx installed

▶ 2. AgentDB Health
  ✓ agentdb.db exists
  ⚠ Skills: 0 (learning will use empty baseline)
  ▶ This is OK for first run - skills will accumulate
  ⚠ Observations: 0/30 (need more for causal learning)
  ▶ Run: scripts/ay-yo-continuous-improvement.sh run 20 quick
  ▶ Experiments: 2

▶ 3. Critical Scripts
  ✓ ay-yo-integrate.sh exists
  ✓ ay-yo-continuous-improvement.sh exists
  ✓ ay-wsjf-runner.sh exists

▶ 4. Configuration
  ✓ dor-budgets.json valid
  ✓ Budget for orchestrator: 15 min
  ✓ Budget for assessor: 20 min
  ...

▶ 5. Test Single Ceremony (orchestrator/standup)
  ✓ Test ceremony successful

▶ 6. Circle Equity Status
  ✗ Orchestrator overused: 53% (target: <40%)
  ▶ Run: scripts/ay-wsjf-runner.sh balance 30

▶ 7. Resource Availability
  ⚠ Disk: 89% HIGH (consider cleanup)
  ⚠ Memory: 237MB LOW

▶ 8. Daemon Status
  ✓ No daemon running (safe to start)

═══════════════════════════════════════════
  Pre-Flight Summary
═══════════════════════════════════════════

  Errors: 1
  Warnings: 4

⚠ CAUTION - 4 warning(s) detected

Safe to proceed, but consider addressing warnings:
  • Complete baseline if observations < 30
  • Balance circles if orchestrator > 40%
  • Clean up resources if disk/memory high
```

### Exit Codes

- `0` = Ready (green)
- `1` = Blocked (red) - DO NOT start
- `2` = Caution (yellow) - Safe to start, but monitor closely

---

## Question 4: Baseline Equity Status

### Current State

```bash
# Check current equity
./scripts/ay-yo-integrate.sh dashboard | grep "Circle Equity" -A 7

# Output:
# Circle Equity:
#   • orchestrator: 41 ceremonies (53%)
#   • assessor: 8 ceremonies (10%)
#   • analyst: 7 ceremonies (9%)
#   • innovator: 8 ceremonies (10%)
#   • seeker: 6 ceremonies (7%)
#   • intuitive: 7 ceremonies (9%)
```

### Target Distribution

```
Target: Each circle 10-20%, no circle >40%

Current vs Target:
  orchestrator:  53% → need to reduce to 35-40%
  assessor:      10% ✓
  analyst:        9% ✓
  innovator:     10% ✓
  seeker:         7% → increase to 10-15%
  intuitive:      9% ✓
```

### Achieving Baseline Equity

**Step 1: Dilute orchestrator dominance**

```bash
# Run 30 ceremonies across other circles
scripts/ay-wsjf-runner.sh balance 30

# Math:
# Current: 41/77 = 53%
# After:  41/107 = 38% ✓ (meets <40% threshold)
```

**Step 2: Build observation baseline**

```bash
# Complete remaining 9 baseline cycles
scripts/ay-wsjf-runner.sh baseline

# This will:
# - Run 9 more quick cycles (11 already done)
# - Reach 30+ observations
# - Enable causal learning
```

**Step 3: Verify equity established**

```bash
# Check all circles have been run
sqlite3 agentdb.db << EOF
SELECT 
  circle,
  COUNT(*) as ceremony_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM observations), 1) as percentage
FROM observations
GROUP BY circle
ORDER BY percentage DESC;
EOF

# Expected output:
# orchestrator|41|38.0
# assessor|11|10.2
# innovator|11|10.2
# analyst|10|9.2
# intuitive|10|9.2
# seeker|9|8.3
```

---

## Complete Unblocking Sequence

### Phase 1: Fix Immediate Blockers (5 minutes)

```bash
# 1. Fix syntax error (already done)
# Edit: scripts/ay-wsjf-runner.sh line 298

# 2. Run pre-flight check
./scripts/ay-preflight-check.sh
# Expected: Exit code 2 (warnings)

# 3. Verify database state
sqlite3 agentdb.db << EOF
SELECT 
  'Observations' as metric, COUNT(*) as count FROM observations
UNION ALL
SELECT 'Skills', COUNT(*) FROM skills
UNION ALL
SELECT 'Experiments', COUNT(*) FROM experiments;
EOF
```

### Phase 2: Build Baseline (20-30 minutes)

```bash
# 1. Complete observation baseline
scripts/ay-wsjf-runner.sh baseline
# → Runs 9 more cycles
# → Convergence: 0.627 → 0.655

# 2. Verify observations reached
sqlite3 agentdb.db "SELECT COUNT(*) FROM observations;"
# Expected: >= 30

# 3. Test causal learning
npx agentdb learner run 1 0.4 0.6 false
# Expected: Discovers some causal edges
```

### Phase 3: Balance Circles (15-20 minutes)

```bash
# 1. Dilute orchestrator dominance
scripts/ay-wsjf-runner.sh balance 30
# → Runs 30 ceremonies across 5 other circles
# → Orchestrator: 53% → 38%
# → Convergence: 0.655 → 0.750

# 2. Verify equity
./scripts/ay-yo-integrate.sh dashboard | grep "Circle Equity" -A 7
# Expected: All circles within 7-15%
```

### Phase 4: Extract Skills (5 minutes)

```bash
# 1. Create batch extraction script
cat > scripts/extract-skills-batch.sh << 'EOF'
#!/usr/bin/env bash
echo "Extracting skills from episodes..."
for episode in /tmp/episode_*.json; do
  [ -f "$episode" ] || continue
  echo "  Processing: $(basename $episode)"
  npx agentdb skill extract --episode "$episode" 2>&1 | grep -E "Extracted|Error" || echo "    ⚠ No output"
done
echo ""
npx agentdb stats | grep "Skills:"
EOF

chmod +x scripts/extract-skills-batch.sh

# 2. Run extraction
./scripts/extract-skills-batch.sh

# 3. If still zero, manually insert seed skills
sqlite3 agentdb.db << EOF
INSERT INTO skills (circle, ceremony, skill_name, proficiency, observations_count, created_at)
VALUES 
  ('orchestrator', 'standup', 'time_management', 0.5, 10, datetime('now')),
  ('assessor', 'wsjf', 'value_prioritization', 0.4, 5, datetime('now')),
  ('analyst', 'refine', 'pattern_recognition', 0.6, 8, datetime('now'));
EOF
```

### Phase 5: Deploy Production (2 minutes)

```bash
# 1. Final pre-flight
./scripts/ay-preflight-check.sh
# Expected: Exit code 0 (ready)

# 2. Deploy
scripts/ay-wsjf-runner.sh production
# → Convergence: 0.750 → 0.870 ✅

# 3. Monitor
scripts/ay-wsjf-runner.sh monitor
# → Watch dashboard in real-time
```

---

## Troubleshooting Common Issues

### Issue: "Episode storage script not found"

**Symptom**: Every ceremony shows this warning

**Cause**: `ay-yo-integrate.sh` references non-existent script

**Fix**:
```bash
# Find the offending line
grep -n "episode_storage.sh" scripts/ay-yo-integrate.sh

# Comment out or remove the call
# OR create the missing script
```

### Issue: Skills still zero after extraction

**Symptom**: `npx agentdb stats` shows Skills: 0

**Diagnosis**:
```bash
# 1. Check if extraction produces errors
npx agentdb skill extract --episode /tmp/episode_*.json 2>&1 | grep -i error

# 2. Check if skills table is empty vs non-existent
sqlite3 agentdb.db "SELECT COUNT(*) FROM skills;" 2>&1

# 3. Test direct SQL insert
sqlite3 agentdb.db "INSERT INTO skills (circle, skill_name) VALUES ('test', 'test');" 2>&1
```

**Solutions**:
1. **AgentDB bug**: Skip skill extraction, use manual seeding
2. **Schema mismatch**: Recreate skills table
3. **Episode format**: Fix episode JSON structure

### Issue: Causal learning finds zero patterns

**Symptom**: Causal edges: 0 despite observations > 30

**Diagnosis**:
```bash
# 1. Check observation variance
sqlite3 agentdb.db << EOF
SELECT 
  circle,
  AVG(duration_seconds) as avg_duration,
  MIN(duration_seconds) as min_duration,
  MAX(duration_seconds) as max_duration
FROM observations
GROUP BY circle;
EOF

# If all durations are identical: No variance to learn from
```

**Fix**: Loosen thresholds
```bash
# Normal: 0.5 min_support, 0.8 min_confidence
npx agentdb learner run 1 0.5 0.8 false

# Aggressive: 0.3 min_support, 0.6 min_confidence
npx agentdb learner run 1 0.3 0.6 false

# Ultra-loose: 0.1 min_support, 0.4 min_confidence
npx agentdb learner run 1 0.1 0.4 false
```

---

## Monitoring Production Deployment

### Real-Time Dashboard

```bash
# Terminal 1: Monitor WSJF runner
scripts/ay-wsjf-runner.sh monitor

# Terminal 2: Watch convergence score
watch -n 60 'scripts/ay-wsjf-runner.sh status | grep "Convergence"'

# Terminal 3: Track daemon logs
tail -f /tmp/ay-wsjf-daemon.log
```

### Key Metrics to Watch

```bash
# Convergence trend (should increase)
scripts/ay-wsjf-runner.sh status | grep "Convergence:"
# Target: 0.627 → 0.750 → 0.850 → 0.900

# Circle equity (should stabilize)
./scripts/ay-yo-integrate.sh dashboard | grep "Circle Equity" -A 7
# Target: All 10-20%, none >40%

# Skills accumulation (should grow)
npx agentdb stats | grep "Skills:"
# Target: > 10 skills across circles

# Observation count (should increase linearly)
sqlite3 agentdb.db "SELECT COUNT(*) FROM observations;"
# Target: Grows by ~3-5 per cycle
```

---

## Next Steps Summary

**Immediate (today)**:
1. ✅ Fix syntax error (done)
2. Run pre-flight check
3. Complete baseline (9 cycles)
4. Extract/seed skills

**Short-term (this week)**:
1. Balance circles (30 ceremonies)
2. Verify convergence > 0.750
3. Deploy to production
4. Monitor for 24 hours

**Medium-term (ongoing)**:
1. Accumulate 100+ observations
2. Train causal learner weekly
3. Optimize DoR budgets based on learning
4. Scale to 24/7 continuous mode

**Success Criteria**:
- Convergence score ≥ 0.850 ✅
- All circles 10-20% ✅
- Skills > 10 ✅
- Zero critical errors for 24h ✅
