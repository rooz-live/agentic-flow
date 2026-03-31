# Divergence Testing - Quick Reference Card

## ⚡ TL;DR

```bash
# Safest start (recommended)
chmod +x scripts/ay-divergence-test.sh
DIVERGENCE_RATE=0.1 MAX_EPISODES=50 scripts/ay-divergence-test.sh single orchestrator
```

## 🚦 Go/No-Go Decision (30 seconds)

| Check | Status | Action |
|-------|--------|--------|
| Baseline ≥30 obs? | ❌ | `scripts/ay-wsjf-runner.sh baseline` |
| Can monitor? | ❌ | Wait until you can watch |
| Backup exists? | ❌ | `cp agentdb.db agentdb.db.backup` |
| Production critical? | ✅ | **STOP - Don't diverge** |
| All above OK? | ✅ | **GO - Safe to proceed** |

## 📊 Risk Levels

| Level | Rate | Episodes | Risk | When |
|-------|------|----------|------|------|
| 1 | 0.1 | 50 | VERY LOW | First time |
| 2 | 0.2 | 100 | LOW | After Level 1 success |
| 3 | 0.3 | 100 | MODERATE | After Level 2 success |
| 4 | 0.15 | multi | MODERATE-HIGH | Advanced only |

## 🎯 Success Criteria

After 50 episodes at 10% divergence:

- ✅ Success Rate: ≥80%
- ✅ Skills Extracted: ≥2
- ✅ Cascade Failures: 0
- ✅ Anti-Patterns: 0 warnings

## 🛑 Circuit Breakers (Auto-Abort)

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Success rate drop | <70% | Auto-rollback |
| Cascade failures | >20% | Auto-rollback |
| Manual abort | Ctrl+C | Call rollback script |

## 📈 Progression Path

```
Level 1 (10%, 50ep) → Success ≥80%
    ↓
Level 2 (20%, 100ep) → Success ≥80%
    ↓
Level 3 (30%, 100ep) → Success ≥70%
    ↓
Multi-Circle (15%) → All circles successful
    ↓
Production (10% continuous)
```

## ⚠️ Warning Signs

| Sign | Meaning | Action |
|------|---------|--------|
| Ceremonies <5s | Reward hacking | Manual inspection |
| Success >98% | Gaming metrics | Validate quality |
| Variance <2s | Found shortcut | Check anti-patterns |
| Cascade failures | Breaking others | Reduce divergence |

## 🔄 Rollback Commands

```bash
# Automatic
scripts/ay-divergence-test.sh rollback

# Manual (if script fails)
cp agentdb.db.divergence_backup agentdb.db
export DIVERGENCE_RATE=0
```

## 📱 Monitoring Setup

```bash
# Terminal 1: Run test
DIVERGENCE_RATE=0.1 MAX_EPISODES=50 \
  scripts/ay-divergence-test.sh single orchestrator

# Terminal 2: Monitor
scripts/ay-divergence-test.sh monitor

# Terminal 3: Database watch
watch -n 10 'npx agentdb stats'
```

## ✅ Post-Test Validation

```bash
# 1. Check skills
npx agentdb skill export --circle orchestrator | jq .

# 2. Verify quality
sqlite3 agentdb.db "SELECT AVG(duration_seconds) FROM observations WHERE circle='orchestrator';"

# 3. Manual test
scripts/ay-yo-integrate.sh exec orchestrator standup advisory

# 4. View report
scripts/ay-divergence-test.sh report
```

## 🚀 Commands Cheat Sheet

| Command | Purpose |
|---------|---------|
| `single <circle>` | Test one circle (safe) |
| `multi` | Test multiple (risky) |
| `rollback` | Restore backup |
| `report` | Show latest results |
| `monitor` | Live dashboard |

## 🎓 Decision Matrix

| Success | Skills | Action |
|---------|--------|--------|
| ≥90% | ≥2 | ✅ Increase to 20% |
| 80-89% | ≥2 | ✅ Run 50 more |
| 70-79% | ≥1 | ⚠️ Monitor, don't expand |
| <70% | Any | ❌ Rollback |
| Any | 0 | ⚠️ Fix skill extraction |

## 📞 Emergency Contacts

- **Full Guide**: `docs/DIVERGENCE_TESTING_GUIDE.md`
- **Debug Guide**: `docs/DEBUG_CONTINUOUS_IMPROVEMENT.md`
- **Script**: `scripts/ay-divergence-test.sh`

---

**Remember**: When in doubt, rollback. Data is cheap, debugging cascade failures is expensive.
