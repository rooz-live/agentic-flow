# `ay` Command Guide - Agentic Yield

## Quick Start
```bash
ay  # That's it!
```

## What Happens When You Run `ay`

### Cycle Flow (Minimum 2-6 cycles)

```
┌─────────────────────────────────────────────┐
│ CYCLE 1: validator mode                    │
├─────────────────────────────────────────────┤
│ [█████░░░░░░░░░░░░░░░░░░░░░] 17%          │
│ ✅ Test dynamic threshold functions         │
│ 🔄 Run validation suite         (running)  │
│ ⏳ Execute monitoring dashboard             │
│ ⏳ Verify TypeScript integration            │
│ ⏳ Check false positive rates               │
│ ⏳ Validate ROAM score reduction            │
│ ⏱️  0m 5s                                   │
└─────────────────────────────────────────────┘
         ↓ (validator handles 2 actions)
         
┌─────────────────────────────────────────────┐
│ CYCLE 2: tester mode                       │
├─────────────────────────────────────────────┤
│ [██████████░░░░░░░░░░░░░░░] 33%           │
│ ✅ Test dynamic threshold functions         │
│ ✅ Run validation suite                     │
│ ⏳ Execute monitoring dashboard             │
│ 🔄 Verify TypeScript integration (running) │
│ ⏳ Check false positive rates               │
│ ⏳ Validate ROAM score reduction            │
│ ⏱️  0m 12s                                  │
└─────────────────────────────────────────────┘
         ↓ (tester handles 1 action)
         
┌─────────────────────────────────────────────┐
│ CYCLE 3: monitor mode                      │
├─────────────────────────────────────────────┤
│ [███████████████░░░░░░░░░░] 50%           │
│ ✅ Test dynamic threshold functions         │
│ ✅ Run validation suite                     │
│ 🔄 Execute monitoring dashboard (running)  │
│ ✅ Verify TypeScript integration            │
│ ⏳ Check false positive rates               │
│ ⏳ Validate ROAM score reduction            │
│ ⏱️  0m 18s                                  │
└─────────────────────────────────────────────┘
         ↓ (monitor handles 2 actions)
         
┌─────────────────────────────────────────────┐
│ CYCLE 4: reviewer mode                     │
├─────────────────────────────────────────────┤
│ [██████████████████████████] 100%          │
│ ✅ Test dynamic threshold functions         │
│ ✅ Run validation suite                     │
│ ✅ Execute monitoring dashboard             │
│ ✅ Verify TypeScript integration            │
│ ✅ Check false positive rates               │
│ ✅ Validate ROAM score reduction            │
│ ⏱️  0m 25s                                  │
└─────────────────────────────────────────────┘
         ↓ (ALL COMPLETE!)
```

## Final Report Output

```
╔════════════════════════════════════════════╗
║      AGENTIC YIELD - FINAL REPORT          ║
╚════════════════════════════════════════════╝

Summary:
  Total Actions:    6
  ✅ Completed:      6
  ❌ Failed:         0
  ⏭️  Skipped:        0
  🔄 Total Cycles:   4

Success Rate:
[██████████████████████████████████] 100%

Performance:
  Total Time:       0m 25s
  Avg per Action:   4s

═══════════════════════════════════════════════
✅ GO: Ready for production deployment
   Success rate: 100% (target: ≥80%)

Next Steps:
  1. Review migration patches: backups/*/migration.patch
  2. Deploy to staging (10% traffic)
  3. Monitor: ./scripts/monitor-threshold-performance.sh
  4. Gradual rollout: 10% → 50% → 100%
═══════════════════════════════════════════════

Detailed Results:
  ✅ Test dynamic threshold functions
  ✅ Run validation suite
  ✅ Execute monitoring dashboard
  ✅ Verify TypeScript integration
  ✅ Check false positive rates
  ✅ Validate ROAM score reduction

📄 Report saved: reports/ay-report-20260112-212740.txt
```

## Minimum Cycles Required

### Optimal Path (4 cycles):
1. **Cycle 1 (validator)**: Tests threshold functions + validation suite → 2/6 done
2. **Cycle 2 (tester)**: Verifies TypeScript integration → 3/6 done
3. **Cycle 3 (monitor)**: Executes dashboard + checks false positives → 5/6 done
4. **Cycle 4 (reviewer)**: Validates ROAM score reduction → 6/6 COMPLETE ✅

### Edge Cases:
- **2 cycles**: If all actions pass on first attempt (rare)
- **6-8 cycles**: If actions need retries or mode-specific ordering
- **20 cycles**: Safety limit (auto-stops with warning)

## How Mode Selection Works

Each mode has **specialized responsibilities**:

| Mode | Actions It Handles | Why |
|------|-------------------|-----|
| **validator** | Test functions, Run validation | Core threshold testing |
| **tester** | TypeScript integration | Code quality checks |
| **monitor** | Dashboard, False positives | Runtime validation |
| **reviewer** | ROAM score reduction | Final verification |

### Smart Cycling:
- Actions **skip** if not relevant to current mode
- Completed actions are **never retried**
- Failed actions get **one retry per cycle**
- Progress persists across mode switches

## Go/No-Go Thresholds

```
100%  ━━━━━━━━━━━━━━━━━━━━ ✅ GO (Excellent)
 90%  ━━━━━━━━━━━━━━━━━━░░ ✅ GO (Strong)
 80%  ━━━━━━━━━━━━━━━━░░░░ ✅ GO (Ready)
      ─────────────────────────────────────
 70%  ━━━━━━━━━━━━━━░░░░░░ ⚠️  CONDITIONAL
 60%  ━━━━━━━━━━━━░░░░░░░░ ⚠️  CONDITIONAL
 50%  ━━━━━━━━━░░░░░░░░░░░ ⚠️  CONDITIONAL
      ─────────────────────────────────────
 40%  ━━━━━━░░░░░░░░░░░░░░ ❌ NO-GO
 20%  ━━░░░░░░░░░░░░░░░░░░ ❌ NO-GO
  0%  ░░░░░░░░░░░░░░░░░░░░ ❌ NO-GO
```

## UI/UX Features

### Real-Time Progress
- ✅ **Animated progress bar** (updates every action)
- ✅ **Color-coded status** (green=done, cyan=running, yellow=pending, red=failed)
- ✅ **Live elapsed timer** (shows time in m:s format)
- ✅ **Current mode indicator** (shows which agent is active)
- ✅ **Cycle counter** (tracks iterations)

### Visual Indicators
- 🚀 Command header with mode
- [████░░░░] Progress bar (50 char width)
- ✅ Success (green)
- 🔄 Running (cyan, animated)
- ⏳ Pending (yellow)
- ❌ Failed (red)
- ⏭️  Skipped (blue)
- ⏱️  Elapsed time

### Screen Management
- **Clear screen** between mode switches
- **Auto-refresh** on action updates
- **Final report** stays visible
- **No scrollback pollution**

## Performance Optimization

### Fast Path (2-4 cycles, ~20-30s)
```
validator → tester → monitor → reviewer
    ↓         ↓         ↓          ↓
  2 done    3 done    5 done   6 done ✅
```

### Standard Path (4-6 cycles, ~30-45s)
```
validator → tester → monitor → reviewer → validator → monitor
    ↓         ↓         ↓          ↓          ↓          ↓
  1 done    2 done    4 done    5 done    5 done    6 done ✅
```

### Worst Case (8-12 cycles, ~60-90s)
```
Multiple retries, all actions eventually complete or fail
```

## Exit Codes

```bash
ay
echo $?  # Check result
```

- **0** = GO (≥80% success)
- **1** = CONDITIONAL GO (50-79% success)
- **2** = NO-GO (<50% success)

## Logs & Reports

### Generated Files:
- `reports/ay-report-YYYYMMDD-HHMMSS.txt` - Final report
- `/tmp/ay-validation.log` - Validation script output
- `/tmp/ay-monitor.log` - Monitoring dashboard output

### View Results:
```bash
# Latest report
cat reports/ay-report-*.txt | tail -30

# Validation details
cat /tmp/ay-validation.log

# Monitoring details
cat /tmp/ay-monitor.log
```

## Integration with Migration

### What `ay` Validates:
1. ✅ Dynamic threshold library functions work
2. ✅ Database schema has required columns
3. ✅ Test data exists (113 episodes)
4. ✅ TypeScript wrapper is complete (369 lines)
5. ✅ Monitoring dashboard is executable
6. ✅ False positive rate is acceptable (<50/24h)
7. ✅ ROAM score reduction documented (8.5→2.5)

### Decision Matrix:

| Success Rate | Decision | Action |
|--------------|----------|--------|
| 100% | ✅ GO | Deploy immediately |
| 80-99% | ✅ GO | Deploy with standard monitoring |
| 50-79% | ⚠️ CONDITIONAL | Review failures, fix, re-run |
| 0-49% | ❌ NO-GO | Critical issues, do not deploy |

## Advanced Usage

### Custom Timeout:
```bash
# Modify timeouts in ay.sh
# Line 140: timeout 10 ./scripts/validate-dynamic-thresholds.sh
# Line 178: timeout 5 bash scripts/monitor-threshold-performance.sh
```

### Debug Mode:
```bash
# Run with verbose output
bash -x scripts/ay.sh 2>&1 | tee /tmp/ay-debug.log
```

### Skip Modes:
```bash
# Edit AGENT_MODES array in ay.sh to customize
declare -a AGENT_MODES=(
    "validator"
    "tester"
    # "monitor"  # Skip monitor mode
    "reviewer"
)
```

## Troubleshooting

### Issue: Hangs on validation
**Solution**: Check validation script timeout (default: 10s)
```bash
timeout 5 ./scripts/validate-dynamic-thresholds.sh
```

### Issue: All actions skip
**Solution**: Mode doesn't match action types. Add handlers to mode functions.

### Issue: False positive check fails
**Solution**: Generate more test data
```bash
sqlite3 agentdb.db "SELECT COUNT(*) FROM episodes"  # Should be >100
```

### Issue: ROAM validation fails
**Solution**: Ensure migration doc exists
```bash
ls -la docs/WSJF-MIGRATION-COMPLETE.md
```

## Best Practices

1. **Run `ay` after any migration changes**
2. **Don't interrupt during cycles** (let it complete)
3. **Review reports before deployment**
4. **Re-run if <80% success** (fix issues first)
5. **Save reports for audit trail**

## Example Session

```bash
$ cd ~/Documents/code/investing/agentic-flow
$ ay

Initializing Agentic Yield...

╔════════════════════════════════════════════╗
║  🚀 AGENTIC YIELD (ay) - Mode Cycling      ║
╠════════════════════════════════════════════╣
║  Current Mode: validator                   ║
║  Cycle: 1                                  ║
╚════════════════════════════════════════════╝

[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%

... (cycles through) ...

[██████████████████████████████] 100%

╔════════════════════════════════════════════╗
║      AGENTIC YIELD - FINAL REPORT          ║
╚════════════════════════════════════════════╝

✅ GO: Ready for production deployment
Success rate: 100% (target: ≥80%)

$ echo $?
0

$ cat reports/ay-report-*.txt
... (detailed report) ...
```

## Summary

**`ay` completes in 2-6 cycles (~20-45 seconds) and provides:**
- ✅ Clear GO/NO-GO decision
- ✅ Real-time progress UI
- ✅ Detailed validation reports
- ✅ Automated testable solution verification
- ✅ Exit codes for scripting

**Minimum cycles to resolve all 6 primary actions: 4 cycles** (with optimal mode ordering)

Run `ay` now to validate your migration! 🚀
