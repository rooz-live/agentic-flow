# Quick Start: DoR/DoD Time-Boxed System

## ⚡ 5-Minute Setup

### 1. Verify Configuration

```bash
cd ~/Documents/code/investing/agentic-flow

# View DoR budget configuration
scripts/ay-prod-cycle-with-dor.sh config
```

### 2. Run First Time-Boxed Ceremony

```bash
# Orchestrator standup (5-minute DoR budget)
scripts/ay-prod-cycle-with-dor.sh exec orchestrator standup advisory
```

### 3. View Results

```bash
# Check compliance dashboard
scripts/ay-prod-cycle-with-dor.sh dashboard

# View yo.life cockpit
scripts/ay-yo-enhanced.sh dashboard
```

## 🎯 Run Complete Cycle

Execute all circles with time-boxed DoR:

```bash
#!/bin/bash
# Save as: run-complete-dor-cycle.sh

cd ~/Documents/code/investing/agentic-flow

echo "=== Running Complete DoR/DoD Cycle ==="
echo ""

# 1. Start with dashboard
echo "1. Current State"
scripts/ay-yo-enhanced.sh dashboard
echo ""

# 2. Run time-boxed ceremonies
echo "2. Executing Time-Boxed Ceremonies"
scripts/ay-prod-cycle-with-dor.sh exec orchestrator standup advisory  # 5m
scripts/ay-prod-cycle-with-dor.sh exec assessor wsjf advisory         # 15m
scripts/ay-prod-cycle-with-dor.sh exec analyst refine advisory        # 30m
echo ""

# 3. Capture learning
echo "3. Learning Cycle"
scripts/ay-prod-cycle.sh learn 5
echo ""

# 4. Show compliance
echo "4. DoR Compliance Report"
scripts/ay-prod-cycle-with-dor.sh dashboard
echo ""

# 5. Show equity
echo "5. Circle Equity"
scripts/ay-yo.sh equity
echo ""

echo "=== Cycle Complete ==="
```

Make it executable:

```bash
chmod +x run-complete-dor-cycle.sh
./run-complete-dor-cycle.sh
```

## 📊 Monitoring Commands

```bash
# Real-time equity monitoring
watch -n 5 'scripts/ay-yo.sh equity'

# DoR compliance dashboard
watch -n 10 'scripts/ay-prod-cycle-with-dor.sh dashboard'

# Temporal pivot view
scripts/ay-yo-enhanced.sh pivot temporal

# Spatial pivot view
scripts/ay-yo-enhanced.sh pivot spatial
```

## 🧪 Run Tests

```bash
# DoR time constraints
npm test -- src/tests/dor-time-constraints.test.ts

# Quality alignment
npm test -- src/tests/quality-alignment.test.ts

# Watch mode
npm test -- src/tests/dor-time-constraints.test.ts --watch
```

## 📈 Example Workflow

### Morning Standup (Orchestrator)
```bash
# 5-minute time-boxed standup
scripts/ay-prod-cycle-with-dor.sh exec orchestrator standup advisory
```

### WSJF Prioritization (Assessor)
```bash
# 15-minute time-boxed WSJF
scripts/ay-prod-cycle-with-dor.sh exec assessor wsjf advisory
```

### Story Refinement (Analyst)
```bash
# 30-minute time-boxed refinement
scripts/ay-prod-cycle-with-dor.sh exec analyst refine advisory
```

### End-of-Day Retro (Innovator)
```bash
# 10-minute time-boxed retro
scripts/ay-prod-cycle.sh innovator retro advisory
```

## 🔍 Check What DoR Budget You Have

Quick reference:

| Circle | DoR Budget | Use Case |
|--------|------------|----------|
| orchestrator | 5 min | Daily standup, quick coordination |
| assessor | 15 min | WSJF calculation, priority review |
| analyst | 30 min | Story refinement, technical analysis |
| innovator | 10 min | Retrospective setup, learning |
| seeker | 20 min | Backlog grooming, replenishment |
| intuitive | 25 min | Pattern synthesis, sensemaking |

## 🚨 What If DoR Times Out?

When a ceremony times out, it means DoR exceeded budget. This is **feedback**:

1. **Check violation report**:
   ```bash
   ls -lh .dor-violations/
   cat .dor-violations/<latest>.json
   ```

2. **Ask in retro**:
   - Was the DoR truly necessary?
   - Can we simplify preparation?
   - Is the ceremony scope too large?

3. **Adjust if needed**:
   - Most cases: DoR should stay constrained
   - Edge case: Budget may need adjustment (submit to retro)

## 📚 Key Commands Reference

```bash
# Execute with DoR enforcement
scripts/ay-prod-cycle-with-dor.sh exec <circle> <ceremony> [adr]

# View configuration
scripts/ay-prod-cycle-with-dor.sh config

# Compliance dashboard
scripts/ay-prod-cycle-with-dor.sh dashboard

# Yo.life dashboard
scripts/ay-yo-enhanced.sh dashboard

# Circle equity
scripts/ay-yo.sh equity

# Learning loop
scripts/ay-prod-learn-loop.sh

# Run tests
npm test -- src/tests/dor-time-constraints.test.ts
```

## 🎓 Understanding the Philosophy

> **DoR is a servant to DoD, not the master**

Time-boxing DoR forces:
- ✅ Essential vs. nice-to-have clarification
- ✅ Action over analysis
- ✅ Learning through iteration
- ✅ Retro-driven improvement

**The retro feedback loop makes it self-correcting:**
- If DoR insufficient → retro captures it
- If DoR excessive → minimal_cycle pressure surfaces it

## 🔗 Next Steps

1. Read full documentation: `docs/DOR_DOD_SYSTEM.md`
2. Explore yo.life: https://yo.life
3. Join rooz co-op: https://rooz.yo.life
4. Review circle mappings in `config/dor-budgets.json`

## 💡 Pro Tips

1. **Start with orchestrator** (5m) - fastest feedback
2. **Monitor equity** - no circle should dominate
3. **Trust the timeout** - it's forcing good habits
4. **Capture learnings** - use `ay-prod-store-episode.sh`
5. **Run retros regularly** - innovator circle validates DoR assumptions

## 📧 Support

Questions? Email: rooz.live@yoservice.com
