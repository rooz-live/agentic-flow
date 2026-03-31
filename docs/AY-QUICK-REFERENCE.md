# AY Quick Reference

## ✅ Status: `get_circuit_breaker_threshold` FIXED

The migration blocker is **resolved**. Run `ay integrated` now.

---

## 🔥 Run the Integrated Cycle

```bash
# Default (5 iterations, 80% threshold)
ay integrated

# Custom settings
MAX_ITERATIONS=3 GO_THRESHOLD=90 ay integrated

# Aliases
ay cycle    # Same as integrated
ay fire     # Focused Incremental Relentless Execution
```

---

## 📊 What It Does

### 6-Stage Cycle (Per Iteration)

1. **Baseline** 📋 - Capture current state (scripts/docs/episodes/metrics)
2. **Governance** ⚖️ - Validate truth conditions + authority legitimacy
3. **Execution** 🔥 - Run recommended actions (Manthra→Yasna→Mithra)
4. **Validation** ✅ - Test against 6 criteria with progress bars
5. **Retrospective** 🔄 - What worked? What failed? Lessons learned?
6. **Learning** 🧠 - Capture patterns (MPP) + export to `.ay-learning/`

### Verdicts

- **GO ✅** (≥80%) - Ready for deployment
- **CONTINUE 🔄** (≥60%) - Needs more iteration
- **NO_GO ❌** (<60%) - Critical issues

---

## 🎯 Three Dimensions

### Never flatten to single axis. All three required:

1. **🧠 Spiritual** - Manthra (thought) → Yasna (action) → Mithra (binding)
2. **💬 Ethical** - Good thoughts → Good words → Good deeds
3. **✋ Lived** - Coherence under stress (mind ↔ speech ↔ body)

---

## 🔍 Truth Conditions

Valid judgment requires **both**:
- ✅ Honest description (maps to reality)
- ✅ Legitimate authority (competence + alignment)

---

## 📈 Progress Tracking

```
Actions [████████████████████░░░░░░░░░░░] 80% (4/5)
● Overall Score: 85/80 ✓
```

---

## 📁 Outputs

- `.ay-baselines/` - Infrastructure, performance, regime snapshots
- `.ay-learning/` - Patterns, skills, metrics per iteration

---

## ⚙️ Configuration

```bash
MAX_ITERATIONS=5          # Max iterations before NO_GO
GO_THRESHOLD=80           # Score needed for GO
CONTINUE_THRESHOLD=60     # Score needed to continue
MIN_RESOLVED_ACTIONS=3    # Minimum actions to resolve
```

---

## 🚀 Example Output

```bash
╔═══════════════════════════════════════════════════════╗
║   AY INTEGRATED CYCLE                                 ║
║   Focused Incremental Relentless Execution           ║
║   🧠 Manthra → 🙏 Yasna → ⚖️  Mithra                   ║
╚═══════════════════════════════════════════════════════╝

💭 Thought: Perceiving system infrastructure...
✅ Infrastructure baseline: 57 scripts, 254 docs, 201 episodes

💬 Word: Detecting system regime...
System Regime: 🟢 Stable (failures steady or declining)

✋ Deed: Baseline established

[... governance, execution, validation, retro, learning ...]

VERDICT: GO ✅
```

---

## 🎓 Key Principles

1. **Iterative validation** - Catch issues early
2. **Progress visibility** - Know where you are
3. **Truth conditions** - Prevent misalignment
4. **Three dimensions** - Spiritual + Ethical + Lived
5. **Learning capture** - Patterns persist across iterations
6. **Coherence under stress** - Real test of alignment

---

## 📖 Full Documentation

See `AY-INTEGRATED-SYSTEM.md` for complete details.

---

**Co-Authored-By**: Warp <agent@warp.dev>
