# ay yo run - Optimal Hook Integration Guide

## Yes, All Hooks Are Optimally Integrated! ✅

The ceremony hooks are now **fully and optimally** integrated into the `ay yo` workflow via the unified **`run`** command.

## Single-Command Workflow

```bash
# View your hook configuration
./scripts/ay-yo-enhanced.sh hooks

# Run learning cycles with hooks (Phase 1 active by default)
./scripts/ay-yo-enhanced.sh run 10

# Run with automatic causal analysis
./scripts/ay-yo-enhanced.sh run 20 analyze
```

## What Happens During `ay yo run`

### 1. **Pre-Execution Hook Status**
```
[INFO] Ceremony hooks: ENABLED
  • Observability checks: ON
  • WSJF priority checks: OFF (enable with ENABLE_WSJF_CHECK=1)
```

### 2. **For Each Ceremony** (via ay-prod-cycle.sh)
```
PRE-CEREMONY HOOKS
  ↓
  • WSJF priority check (if enabled)
  • Risk threshold validation (if enabled)
  • ROAM blocker detection (if enabled)
  ↓
CEREMONY EXECUTION
  ↓
POST-CEREMONY HOOKS
  ↓
  • Observability gap detection (default: ON)
  • ROAM auto-escalation (if failure + enabled)
  • Metrics recording (default: ON) → .goalie/ceremony_metrics.jsonl
```

### 3. **After Each Iteration** (via ay-prod-learn-loop.sh)
```
BATCH-ANALYSIS HOOKS
  ↓
  • Pattern analysis (every 10 ceremonies, if enabled)
  • Causal analysis trigger (every 5 iterations with --analyze)
```

### 4. **After All Iterations Complete**
```
POST-BATCH HOOKS
  ↓
  • Retro approval check (if enabled)
  • Economic attribution (if enabled)
  • Alignment verification (if enabled)
  • Graduation assessment (if enabled)
```

## Complete Integration Map

### Command Flow

```
./scripts/ay-yo-enhanced.sh run 20 analyze
         ↓
    run_learning()
         ↓
    ay-prod-learn-loop.sh --analyze 20
         ↓
    [For each iteration]
         ↓
    ay-prod-cycle.sh <circle> <ceremony>
         ↓
    [PRE-CEREMONY HOOKS]
         ↓
    Execute ceremony
         ↓
    [POST-CEREMONY HOOKS]
         ↓
    [BATCH-ANALYSIS HOOKS every iteration]
         ↓
    [POST-BATCH HOOKS after completion]
```

## All Commands Available

### Dashboard & Info
```bash
./scripts/ay-yo-enhanced.sh dashboard  # Show cockpit
./scripts/ay-yo-enhanced.sh hooks      # Show hook config
./scripts/ay-yo-enhanced.sh insights   # Causal learning insights
./scripts/ay-yo-enhanced.sh equity     # Circle equity report
```

### Execution
```bash
./scripts/ay-yo-enhanced.sh spawn orchestrator standup  # Single ceremony
./scripts/ay-yo-enhanced.sh run 10                      # Learning cycles
./scripts/ay-yo-enhanced.sh run 20 analyze              # With causal analysis
./scripts/ay-yo-enhanced.sh run 5 false orchestrator    # Specific circle
```

### Analysis
```bash
./scripts/ay-yo-enhanced.sh explain assessor wsjf 0.35  # Causal explanation
```

## Environment Variable Control

### Phase 1 (Active by Default)
```bash
# No configuration needed - just run!
./scripts/ay-yo-enhanced.sh run 10
```

**Enabled by default:**
- `ENABLE_CEREMONY_HOOKS=1` (master switch)
- `ENABLE_OBSERVABILITY_CHECK=1` (gap detection)
- `ENABLE_CEREMONY_METRICS=1` (metrics recording)

### Phase 2 (Opt-in)
```bash
export ENABLE_WSJF_CHECK=1
export ENABLE_RISK_CHECK=1
export ENABLE_ROAM_CHECK=1
export ENABLE_ROAM_ESCALATION=1
export ENABLE_RETRO_APPROVAL=1

./scripts/ay-yo-enhanced.sh run 10
```

### Phase 3 (Full Analytics)
```bash
export ENABLE_PATTERN_ANALYSIS=1
export ENABLE_ECONOMIC_CALC=1
export ENABLE_ALIGNMENT_CHECK=1
export ENABLE_GRADUATION_REPORT=1

./scripts/ay-yo-enhanced.sh run 20 analyze
```

## Example: Full Workflow

```bash
# 1. Check current hook configuration
./scripts/ay-yo-enhanced.sh hooks

# 2. Enable Phase 2 hooks
export ENABLE_WSJF_CHECK=1
export ENABLE_ROAM_ESCALATION=1

# 3. Run 20 learning cycles with analysis
./scripts/ay-yo-enhanced.sh run 20 analyze

# 4. Check causal insights
./scripts/ay-yo-enhanced.sh insights

# 5. Explain low performers
./scripts/ay-yo-enhanced.sh explain assessor wsjf 0.35

# 6. Check recorded metrics
cat .goalie/ceremony_metrics.jsonl | tail -10
```

## What Makes This "Optimal"?

### ✅ Single Entry Point
- One command: `./scripts/ay-yo-enhanced.sh run`
- No need to remember multiple script paths
- Hook status displayed before execution

### ✅ Smart Defaults
- Phase 1 hooks enabled out-of-the-box
- Observability checks automatic
- Metrics recording automatic
- Zero configuration for basic usage

### ✅ Progressive Enhancement
- Phase 1 → Phase 2 → Phase 3
- Enable incrementally via environment variables
- Non-blocking - hooks never prevent execution

### ✅ Full Lifecycle Coverage
- PRE-CEREMONY: Validation & priority checks
- POST-CEREMONY: Observability & escalation
- BATCH-ANALYSIS: Pattern detection & causal analysis
- POST-BATCH: Approval, economics, alignment

### ✅ Integrated with Existing Features
- Works with causal learning (`analyze` flag)
- Works with circle-specific runs
- Works with dashboard & insights commands
- Metrics feed into equity calculations

## Verification

### Test Hook Status
```bash
./scripts/ay-yo-enhanced.sh hooks
```

**Expected Output:**
```
═══ Ceremony Hook Configuration ═══

Environment Variables:
  ENABLE_CEREMONY_HOOKS=1 (master switch)

Pre-Ceremony:
  ENABLE_WSJF_CHECK=0
  ENABLE_RISK_CHECK=0
  ENABLE_ROAM_CHECK=0

Post-Ceremony:
  ENABLE_OBSERVABILITY_CHECK=1
  ENABLE_ROAM_ESCALATION=0
  ENABLE_CEREMONY_METRICS=1

Batch-Analysis:
  ENABLE_PATTERN_ANALYSIS=0

Post-Batch:
  ENABLE_RETRO_APPROVAL=0
  ENABLE_ECONOMIC_CALC=0
  ENABLE_ALIGNMENT_CHECK=0
  ENABLE_GRADUATION_REPORT=0
```

### Test Single Run
```bash
./scripts/ay-yo-enhanced.sh run 1
```

**Expected Output:**
```
═══════════════════════════════════════════
  Learning Cycles (n=1)
═══════════════════════════════════════════

[INFO] Ceremony hooks: ENABLED
  • Observability checks: ON

[INFO] Executing: /Users/.../scripts/ay-prod-learn-loop.sh 1

╔════════════════════════════════════════╗
║  Learning Iteration 1/1                ║
╚════════════════════════════════════════╝

[HOOK] ═══ BATCH-ANALYSIS HOOKS (n=6, reason=periodic) ═══

╔════════════════════════════════════════╗
║  Learning Summary                     ║
╚════════════════════════════════════════╝

[✓] Parallel learning completed!
```

### Test with Analysis
```bash
./scripts/ay-yo-enhanced.sh run 2 analyze
```

**Expected to see:**
```
[HOOK] ═══ BATCH-ANALYSIS HOOKS (n=6, reason=periodic) ═══
[HOOK] ═══ BATCH-ANALYSIS HOOKS (n=12, reason=periodic) ═══
╔════════════════════════════════════════╗
║  Final Causal Analysis                ║
╚════════════════════════════════════════╝
[HOOK] ═══ POST-BATCH HOOKS (total=12) ═══
```

## Migration from Old Commands

### Before (Multiple Scripts)
```bash
# Old way - multiple scripts to remember
./scripts/ay-prod-cycle.sh orchestrator standup
./scripts/ay-prod-learn-loop.sh --analyze 20
./scripts/cmd_wsjf.py --circle orchestrator
./scripts/cmd_detect_observability_gaps.py --episode /tmp/episode.json
```

### After (Unified Interface)
```bash
# New way - single interface, hooks integrated
./scripts/ay-yo-enhanced.sh spawn orchestrator standup  # Single ceremony
./scripts/ay-yo-enhanced.sh run 20 analyze              # Learning cycles
# WSJF and observability checks happen automatically!
```

## Troubleshooting

### Hooks not showing in output?
```bash
# Check master switch
echo $ENABLE_CEREMONY_HOOKS  # Should be 1 or empty (defaults to 1)

# Verify hooks loaded
./scripts/ay-yo-enhanced.sh hooks
```

### Want to disable all hooks?
```bash
export ENABLE_CEREMONY_HOOKS=0
./scripts/ay-yo-enhanced.sh run 10
```

### Want to see more hook activity?
```bash
# Enable additional checks
export ENABLE_WSJF_CHECK=1
export ENABLE_PATTERN_ANALYSIS=1

# Run with analysis for full visibility
./scripts/ay-yo-enhanced.sh run 10 analyze
```

## Summary: Optimal Integration Checklist

- ✅ Single command workflow: `ay yo run`
- ✅ Hook status displayed before execution
- ✅ Phase 1 enabled by default (no config needed)
- ✅ PRE-CEREMONY hooks integrated
- ✅ POST-CEREMONY hooks integrated
- ✅ BATCH-ANALYSIS hooks integrated
- ✅ POST-BATCH hooks integrated
- ✅ Works with causal analysis (`analyze` flag)
- ✅ Works with circle-specific runs
- ✅ Works with single ceremony spawning
- ✅ Metrics auto-recorded
- ✅ Environment variable control
- ✅ Non-blocking execution
- ✅ Graceful degradation
- ✅ Dashboard integration (`hooks` command)

**Answer: YES - all capabilities are optimally integrated into `ay yo run`!** 🎉

## Next Steps

1. **Try it now**: `./scripts/ay-yo-enhanced.sh run 5`
2. **Check metrics**: `cat .goalie/ceremony_metrics.jsonl`
3. **View insights**: `./scripts/ay-yo-enhanced.sh insights`
4. **Enable Phase 2**: Add environment variables to your `.bashrc` or `.env`
5. **Run with analysis**: `./scripts/ay-yo-enhanced.sh run 20 analyze`

For detailed documentation, see:
- [CEREMONY_HOOKS_INTEGRATION.md](CEREMONY_HOOKS_INTEGRATION.md) - Complete guide
- [scripts/hooks/README.md](../scripts/hooks/README.md) - Quick reference
