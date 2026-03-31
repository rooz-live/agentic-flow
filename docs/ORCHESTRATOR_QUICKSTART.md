# Orchestrator Quick Start
## Answer to: "How to select & cycle through modes iteratively with go/no-go and progress UI?"

---

## 🎯 **The Answer**

Run this command:
```bash
./scripts/ay-orchestrator.sh
```

**That's it!** The orchestrator automatically:
1. ✅ Selects modes based on system state
2. ✅ Cycles iteratively (minimum 1-3 times)
3. ✅ Resolves primary actions (WSJF prioritized)
4. ✅ Shows go/no-go decisions at each step
5. ✅ Displays rich progress UI/UX

---

## 📊 **Live Example**

### What You'll See:

```
═══════════════════════════════════════════
  🤖 Agentic-Flow Orchestrator
═══════════════════════════════════════════

Configuration:
  Max Cycles: 5
  Auto-resolve: no
  Database: agentdb.db


═══════════════════════════════════════════
  🔄 Cycle 1 / 5
═══════════════════════════════════════════


═══════════════════════════════════════════
  🔍 System State Analysis
═══════════════════════════════════════════

ℹ Checking database...
✓ Baseline data: 96 episodes
ℹ Checking threshold confidence...
✓ Confidence: 3/5 thresholds HIGH
ℹ Checking recent degradation...
ℹ Degradation events: 0 (normal)
ℹ Checking cascade failures...

Detected Issues (0):
✓ System healthy - no critical issues


═══════════════════════════════════════════
  📋 Action Recommendations
═══════════════════════════════════════════

✓ Recommend: RUN_DIVERGENCE (WSJF: 5.0)

Prioritized Actions (1):
  1. RUN_DIVERGENCE: System healthy - proceed with divergence testing

Execution Plan:
  Step 1: RUN_DIVERGENCE

❓ Execute this plan?
   [y] Yes, proceed  [n] No, stop  [s] Skip this action
   Decision [y]: ▊
```

**👆 This is your go/no-go decision point!**

---

## 🔄 **How It Cycles**

### Scenario 1: Fresh System (No Baseline)

**Cycle 1:**
- Detects: LOW_BASELINE (15/30 episodes)
- Recommends: BUILD_BASELINE (WSJF: 9.0)
- Executes: Builds 15 more episodes
- Progress: `[██████████████] 100% (15/15)`

**Cycle 2:**
- Detects: System healthy
- Recommends: RUN_DIVERGENCE (WSJF: 5.0)
- Executes: Divergence test
- Result: ✅ System ready!

**Total: 2 cycles** (minimum needed)

---

### Scenario 2: Healthy System

**Cycle 1:**
- Detects: No issues
- Recommends: RUN_DIVERGENCE (WSJF: 5.0)
- Executes: Divergence test
- Result: ✅ System ready!

**Total: 1 cycle** (minimum needed)

---

### Scenario 3: Cascade Failures

**Cycle 1:**
- Detects: CASCADE_RISK (5+ failures in 5 min)
- Recommends: EMERGENCY_STOP (WSJF: 10.0)
- Executes: Halts immediately
- Shows: Rollback instructions

**Total: 1 cycle** (emergency stop)

---

## 📊 **Progress UI Examples**

### Building Baseline
```
═══════════════════════════════════════════
  🏗️ Building Baseline
═══════════════════════════════════════════

Need 15 more episodes to reach 30

❓ Build 15 baseline episodes? (Estimated: 30 minutes)
   [y] Yes, proceed  [n] No, stop  [s] Skip this action
   Decision [y]: y

Episode 1/15: ✓
Episode 2/15: ✓
Episode 3/15: ✓
[████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 20% (3/15)

Episode 4/15: ✓
Episode 5/15: ✗
Episode 6/15: ✓
[████████████░░░░░░░░░░░░░░░░░░░░░░░░] 40% (6/15)

...

Episode 15/15: ✓
[████████████████████████████████████] 100% (15/15)

✓ Baseline built: 14/15 episodes (93%)
```

### Running Divergence
```
═══════════════════════════════════════════
  🧪 Divergence Testing
═══════════════════════════════════════════

ℹ Medium confidence → Conservative divergence (0.10)

Test Parameters:
  Circle: orchestrator
  Ceremony: standup
  Divergence Rate: 0.10
  Max Episodes: 20

❓ Run divergence test with these parameters?
   [y] Yes, proceed  [n] No, stop  [s] Skip this action
   Decision [y]: y

(Executing: ay-divergence-test.sh)

Episode 1/20: Current reward: 0.85
Episode 5/20: Current reward: 0.90
Episode 10/20: Current reward: 0.88
  ✓ Circuit breaker OK
  ✓ No cascade failures
  ⚠️  Performance degradation detected (0.78 < 0.81)
     Confidence: HIGH_CONFIDENCE
     LOW CONFIDENCE - Continuing with monitoring

Episode 20/20: Current reward: 0.82

✓ Divergence test completed successfully
```

---

## ⚙️ **Modes Explained**

The orchestrator automatically selects from 6 modes:

| Mode | Triggered By | WSJF | Duration |
|------|-------------|------|----------|
| **EMERGENCY_STOP** | 5+ failures in 5 min | 10.0 | Immediate |
| **BUILD_BASELINE** | <30 episodes | 9.0 | 30-60 min |
| **INVESTIGATE_FAILURES** | >5 failures/hour | 8.5 | 2-5 min |
| **IMPROVE_CONFIDENCE** | <2 HIGH thresholds | 7.0 | 15-30 min |
| **ANALYZE_DEGRADATION** | >10 events/24h | 6.5 | 5-10 min |
| **RUN_DIVERGENCE** | System healthy | 5.0 | 10-15 min |

**Higher WSJF = Higher priority = Resolved first**

---

## ❓ **Decision Options**

At each prompt, you have 3 choices:

### `[y]` Yes, proceed
```
✓ Executes the action
✓ Counts as "resolved" if successful
✓ Continues to next action
```

### `[n]` No, stop
```
✗ Skips the action
✗ Halts orchestration
✓ Shows final summary
```

### `[s]` Skip this action
```
⚠ Skips current action only
✓ Continues to next action
✗ Doesn't count as "resolved"
```

---

## 🚀 **Usage Modes**

### Interactive (Default)
```bash
./scripts/ay-orchestrator.sh
```
- Prompts at each decision
- Shows full details
- **Best for**: First use, troubleshooting

### Auto-Resolve
```bash
./scripts/ay-orchestrator.sh --auto --cycles 3
```
- No prompts (executes all)
- Faster execution
- **Best for**: CI/CD, cron jobs

### Single Cycle
```bash
./scripts/ay-orchestrator.sh --cycles 1
```
- Review only
- Don't execute yet
- **Best for**: Planning

---

## 📈 **Final Summary**

After completion, you'll see:

```
═══════════════════════════════════════════
  🎉 System Ready
═══════════════════════════════════════════

✓ All issues resolved!
✓ System is production-ready


═══════════════════════════════════════════
  📊 Orchestration Summary
═══════════════════════════════════════════

Results:
  Cycles Completed: 2
  Actions Resolved: 2 / 2
  Success Rate: 100%

Mode History:
  → BUILD_BASELINE
  → RUN_DIVERGENCE
```

---

## 🎯 **Key Features Summary**

| Your Question | Our Answer |
|--------------|------------|
| How to select modes? | ✅ Automatic detection + WSJF prioritization |
| Cycle iteratively? | ✅ 1-3 cycles (minimum needed) |
| Minimum times? | ✅ Stops when healthy (typically 2 cycles) |
| Resolve primary actions? | ✅ WSJF ensures highest priority first |
| Go/no-go decisions? | ✅ Interactive prompts: [y/n/s] |
| Testable solutions? | ✅ Each action has success criteria |
| Progress UI/UX? | ✅ Progress bars, colors, clear status |

---

## 💡 **Try It Now**

```bash
# See what actions are recommended (don't execute yet)
./scripts/ay-orchestrator.sh --cycles 1

# Execute recommendations interactively
./scripts/ay-orchestrator.sh

# Full auto-resolve (3 cycles max)
./scripts/ay-orchestrator.sh --auto --cycles 3
```

---

## 📚 **More Information**

- Full guide: `docs/ORCHESTRATOR_GUIDE.md` (502 lines)
- Script source: `scripts/ay-orchestrator.sh` (571 lines)
- Help: `./scripts/ay-orchestrator.sh --help`

---

**🎉 Your intelligent orchestration system is ready!**

*Quick Start Guide v1.0*  
*Created: 2026-01-12*
