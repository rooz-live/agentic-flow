# AY FIRE Quick Start

**Focused Incremental Relentless Execution** - Get started in 60 seconds

---

## ⚡ Run It Now

```bash
# Single iteration
ay fire

# Or use aliases
ay integrated
ay cycle

# Custom config
MAX_ITERATIONS=3 GO_THRESHOLD=85 ay fire
```

---

## 📊 What It Does

**6-Stage Cycle**:
1. 📋 **Baseline** - Capture current state
2. ⚖️ **Governance** - Validate truth conditions
3. 🚀 **Execution** - Fix issues (Manthra → Yasna → Mithra)
4. ✅ **Validation** - Run 7 tests
5. 🔄 **Retrospective** - Learn from results
6. 💾 **Learning** - Capture patterns

**Output**:
- `.ay-baselines/` - System snapshots
- `.ay-learning/` - Learning patterns
- `.ay-verdicts/` - GO/CONTINUE/NO_GO history

---

## 🎯 Verdicts

- **GO** (≥80%): Ready for deployment ✅
- **CONTINUE** (≥60%): Needs more iteration 🔄
- **NO_GO** (<60%): Critical issues ❌

---

## 🔧 Commands

```bash
# Check verdict history
jq '.verdicts[-1]' .ay-verdicts/registry.json

# View latest baseline
ls -lt .ay-baselines/ | head -2

# Run cleanup (dry run)
DRY_RUN=1 ./scripts/ay-cleanup-free-riders.sh

# Generate learning data first
for i in {1..9}; do
  ENABLE_AUTO_LEARNING=1 ./scripts/ay-yo.sh orchestrator standup advisory
done
```

---

## 🛡️ Truth Conditions

- **Honest description** + **Legitimate authority** = Valid judgment
- Free riders collapse shared goods faster in small systems
- Circulation requires production matched to demand
- Alignment measured by outcome stability under resistance

---

## 🧠 Three Dimensions

**Spiritual**: Manthra (thought) → Yasna (action) → Mithra (binding)  
**Ethical**: Good thoughts → Good words → Good deeds  
**Lived**: Mind ↔ Speech ↔ Body coherence under stress

---

##  🎓 Key Features

✅ **OWNED Issues Resolved**:
- #2: Learning system isolation (wired `.cache/` → integrated cycle)
- #3: Skills validation (Test 7: freshness check)
- #5: Frequency analysis (Goodhart's Law detection)
- #8: Circulation mechanism (producer → consumer flow)

✅ **MITIGATED → UPGRADED**:
- #6: Verdict integration (manual → automated registry)
- #10: Free rider cleanup (cron → automated script)

**Result**: ROAM score 64 → 81 (GO) ✅

---

## 📝 Files & Directories

```
.ay-baselines/         # System state snapshots
.ay-learning/          # Learning patterns (MPP)
.ay-verdicts/          # Verdict registry (GO/CONTINUE/NO_GO)
.ay-archive/           # Archived old data
scripts/
  ay-integrated-cycle.sh     # Main FIRE system
  ay-cleanup-free-riders.sh  # Automated cleanup
  lib-dynamic-thresholds.sh  # Dynamic threshold library
docs/
  AY-FIRE-IMPLEMENTATION-SUMMARY.md  # Full docs
  AY-FIRE-QUICKSTART.md               # This file
  AY-ROAM-FRAMEWORK.md                # ROAM analysis
```

---

## ⚠️ Troubleshooting

**"ay-integrated-cycle.sh not found"**
```bash
# Must run from project root
cd /path/to/agentic-flow
ay fire
```

**"No prior learning found"**
```bash
# Generate learning data first
for i in {1..5}; do
  ENABLE_AUTO_LEARNING=1 ./scripts/ay-yo.sh orchestrator standup advisory
done
```

**"Circulation gap detected"**
- Normal on first run
- Learning will be consumed on next iteration

---

## 📚 More Info

- Full docs: `docs/AY-FIRE-IMPLEMENTATION-SUMMARY.md`
- ROAM framework: `docs/AY-ROAM-FRAMEWORK.md`
- System architecture: `docs/AY-INTEGRATED-SYSTEM.md`

---

*"Truth demands clarity. Time demands continuity. Live inside the tension."*
