# Quick Start - Improved ay yo & ay prod Workflows

## ⚡ TL;DR

```bash
cd ~/Documents/code/investing/agentic-flow

# Daily learning (improved!)
./scripts/ay-yo              # 10 cycles, now with progress bars & summary
# OR
./ay                         # Shortcut (Note: use scripts/ay-yo if symlink issues)

# Production ceremonies (improved!)
./prod orchestrator standup  # Now uses adaptive mode by default
```

---

## What's New? ✨

### 1. Shorter Commands
```bash
# Before: ./scripts/ay-yo
# After:  ./ay

# Before: ./scripts/ay-prod.sh
# After:  ./prod
```

### 2. Better Defaults
```bash
# Production now uses adaptive mode by default (not safe mode)
./prod orchestrator standup  # Adaptive thresholds automatically
./prod --safe orchestrator standup  # Use safe mode if needed
```

### 3. Progress Indicators
```bash
$ ./ay 5

╔════════════════════════════════════════╗
║  Learning Iteration 2/5                ║
╚════════════════════════════════════════╝
Progress: [████████░░░░░░░░░░░░] 40%    # <- NEW!
```

### 4. Execution Summary
```bash
✓ Parallel learning completed!          # <- NEW!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Execution Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Iterations:     5
  ⏱  Duration:       1m 15s
  📊 Ceremonies:     30

Next steps:                              # <- NEW!
  • Review metrics:     ./ay status
  • Run production:     ./prod orchestrator standup
  • Deep analysis:      ./ay 50 analyze
```

---

## Command Reference

### Learning Cycles
```bash
./ay                 # 10 cycles (default)
./ay 20              # 20 cycles
./ay 50 analyze      # 50 cycles with causal analysis
```

### Production Ceremonies
```bash
# Adaptive mode (default - recommended)
./prod orchestrator standup
./prod analyst refine

# Safe mode (deterministic)
./prod --safe orchestrator standup

# Learning mode (5% divergence)
./prod --learn orchestrator standup

# Pre-flight check only
./prod --check orchestrator standup
```

### Status & Help
```bash
./prod --help              # Production command help
./ay --help                # Learning cycles help
./scripts/ay-yo-enhanced.sh insights  # Full dashboard (future: ./ay status)
```

---

## Production Modes

| Mode | Default? | Flag | Use When |
|------|----------|------|----------|
| **Adaptive** | ✅ Yes | (none) | Production - handles real variance |
| Safe | No | `--safe` | Need deterministic behavior |
| Learning | No | `--learn` | After 10+ successful adaptive runs |

---

## Typical Daily Workflow

### Morning Practice
```bash
cd ~/Documents/code/investing/agentic-flow
./ay
# Shows progress bars
# Shows execution summary
# Suggests next steps
```

### Production Execution
```bash
./prod orchestrator standup  # Adaptive mode automatically
# If that's too lenient, try:
./prod --safe orchestrator standup
```

### Deep Work Session
```bash
./ay 50 analyze
# 50 learning cycles with analysis
# Progress bars every iteration
# Full summary at end
```

---

## Migration from Old Commands

| Old | New | Notes |
|-----|-----|-------|
| `./scripts/ay-yo` | `./ay` | Symlink, both work |
| `./scripts/ay-prod.sh` | `./prod` | Symlink, both work |
| `./scripts/ay-prod.sh --adaptive` | `./prod` | Adaptive is now default |
| `./scripts/ay-prod.sh` | `./prod --safe` | Safe mode requires flag |

**All old commands still work!** Changes are backward compatible.

---

## Troubleshooting

### Command not found
```bash
cd ~/Documents/code/investing/agentic-flow
ls -la ay prod
# Should show symlinks

# If missing, recreate:
ln -sf scripts/ay-yo ay
ln -sf scripts/ay-prod.sh prod
```

### Progress bar not showing
Progress indicators are in `./ay` (learning cycles), not `./prod` (single ceremonies).

### Want old safe mode as default?
```bash
# Edit scripts/ay-prod.sh line 154
# Change: local mode="adaptive"
# To:     local mode="safe"
```

---

## Examples

### Example 1: Quick Daily Practice
```bash
$ ./ay

ay yo - Focused Incremental Relentless Execution

✓ Ceremony hooks enabled
  • Observability checks
  • Metrics recording

Executing: 10 cycles

╔════════════════════════════════════════╗
║  Learning Iteration 1/10               ║
╚════════════════════════════════════════╝
Progress: [██░░░░░░░░░░░░░░░░░░] 10%

[INFO] Starting parallel learning...
[orchestrator] Learning iteration 1/10
...

✓ Parallel learning completed!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Execution Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Iterations:     10
  ⏱  Duration:       2m 30s
  📊 Ceremonies:     60

Next steps:
  • Review metrics:     ./ay status
  • Run production:     ./prod orchestrator standup
  • Deep analysis:      ./ay 50 analyze
```

### Example 2: Production Ceremony
```bash
$ ./prod orchestrator standup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Pre-Flight Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Database found
✓ Recent backup found (< 24h old)
✓ Valid circle: orchestrator
✓ Dynamic thresholds available
✓ Divergence testing framework installed

✓ Pre-flight check passed

[ay prod] Adaptive mode (dynamic thresholds)

[Executing orchestrator standup...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Execution Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Circle:    orchestrator
Ceremony:  standup
Mode:      adaptive
Exit Code: 0 (success)
```

---

## What's Next?

See `docs/WORKFLOW_ACCEPTABILITY_IMPROVEMENTS.md` for:
- Week 2: Unified dispatcher, success tracking
- Week 3: Status dashboard, auto-validation

---

**Questions?** Check:
- Full plan: `docs/WORKFLOW_ACCEPTABILITY_IMPROVEMENTS.md`
- Completion report: `docs/WORKFLOW_IMPROVEMENTS_COMPLETED.md`
- Original design: `AY_YO_FINAL.md`
