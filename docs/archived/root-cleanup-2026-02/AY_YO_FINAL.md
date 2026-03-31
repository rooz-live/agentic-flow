# ay yo - Single Muscle Memory Command ✅

## You Were Right

**One command. Not multiple commands.**

```bash
./scripts/ay-yo
```

That's it. No `run`, no `execute`, no subcommands. Just `ay yo`.

## What Changed

### Before (Too Many Commands)
```bash
./scripts/ay-yo-enhanced.sh run 10          # Too verbose
./scripts/ay-yo-enhanced.sh spawn ...       # Too many options
./scripts/ay-prod-learn-loop.sh --analyze   # Too low-level
```

### After (Muscle Memory)
```bash
./scripts/ay-yo        # Default: 10 cycles, hooks enabled
./scripts/ay-yo 20     # 20 cycles
./scripts/ay-yo 50 analyze  # With analysis
```

## Implementation

**Created**: `scripts/ay-yo` (106 lines)

```bash
#!/usr/bin/env bash
# ay-yo - Single muscle memory command for focused incremental relentless execution

# Loads hooks automatically
# Shows status
# Runs learning cycles
# Done
```

## Hook Integration

**Fully integrated**. Zero configuration needed.

```
./scripts/ay-yo
    ↓
Shows: "✓ Ceremony hooks enabled"
    ↓
Runs: ay-prod-learn-loop.sh (with hooks)
    ↓
Each ceremony: PRE → EXECUTE → POST hooks
    ↓
Each iteration: BATCH-ANALYSIS hooks
    ↓
Completion: POST-BATCH hooks
```

## What's Enabled by Default

- ✅ Observability gap detection
- ✅ Ceremony metrics recording (`.goalie/ceremony_metrics.jsonl`)
- ✅ Causal observation tracking

## Usage

```bash
# Daily practice (default 10 cycles)
./scripts/ay-yo

# Deep work (50 cycles with analysis)
./scripts/ay-yo 50 analyze

# Custom
./scripts/ay-yo 20
```

## Design Principles

1. **Zero Cognitive Load**: Type `ay yo`, system does the rest
2. **Muscle Memory**: Same command every single time
3. **Smart Defaults**: Hooks enabled, sensible iterations
4. **Non-Blocking**: Hooks never stop execution
5. **Progressive**: Enable more via env vars as needed

## Optional Enhancement

Want more hooks? Set environment variables:

```bash
export ENABLE_WSJF_CHECK=1
export ENABLE_PATTERN_ANALYSIS=1
export ENABLE_RETRO_APPROVAL=1

./scripts/ay-yo
```

## Files

### Core Command
- `scripts/ay-yo` (106 lines) - **THE COMMAND**

### Hook System
- `scripts/hooks/ceremony-hooks.sh` (405 lines) - Hook framework
- `scripts/ay-prod-cycle.sh` (modified) - PRE/POST ceremony hooks
- `scripts/ay-prod-learn-loop.sh` (modified) - BATCH/POST-BATCH hooks

### Documentation
- `docs/AY_YO.md` - Simple guide
- `docs/CEREMONY_HOOKS_INTEGRATION.md` - Complete reference

### Legacy (Still Available)
- `scripts/ay-yo-enhanced.sh` - Dashboard, insights, config display

## Migration

### Old Way
```bash
# Remember which script to call
./scripts/ay-prod-cycle.sh orchestrator standup
./scripts/ay-prod-learn-loop.sh --analyze 10
./scripts/ay-yo-enhanced.sh run 20 analyze

# Check hooks separately
./scripts/ay-yo-enhanced.sh hooks
```

### New Way
```bash
# One command
./scripts/ay-yo

# That's it
```

## Test Results

```bash
$ ./scripts/ay-yo 1

ay yo - Focused Incremental Relentless Execution

✓ Ceremony hooks enabled
  • Observability checks
  • Metrics recording

Executing: 1 cycles

[INFO] Starting parallel learning across all circles...
[HOOK] ═══ BATCH-ANALYSIS HOOKS (n=6, reason=periodic) ═══
[✓] Parallel learning completed!
```

## Philosophy

**Focused Incremental Relentless Execution**

One command that you can type without thinking:

```bash
ay yo
```

Every morning. Every deep work session. Every time.

The system handles:
- Running all circles
- Applying hooks
- Recording metrics
- Tracking observations
- Enabling learning

You handle:
- Typing `ay yo`

## What's Different from Enhanced?

| Feature | `ay-yo` | `ay-yo-enhanced.sh` |
|---------|---------|---------------------|
| **Primary Use** | Execute cycles | Dashboard & tools |
| **Default Action** | Run 10 cycles | Show dashboard |
| **Complexity** | Minimal | Multi-command |
| **Muscle Memory** | ✅ One command | ❌ Many commands |
| **Hook Integration** | ✅ Built-in | ✅ Via subcommands |

**Both work. `ay-yo` is for execution. `ay-yo-enhanced.sh` is for inspection.**

## Recommended Workflow

### Daily Execution
```bash
./scripts/ay-yo
```

### Weekly Analysis
```bash
./scripts/ay-yo 50 analyze
./scripts/ay-yo-enhanced.sh insights
```

### Configuration Check
```bash
./scripts/ay-yo-enhanced.sh hooks
```

## Summary

✅ **One command**: `./scripts/ay-yo`  
✅ **Zero cognitive load**: No arguments = sensible defaults  
✅ **Hooks integrated**: Enabled by default  
✅ **Muscle memory**: Same every time  
✅ **106 lines**: Simple, focused, relentless  

---

**You were right. One command. Not `run`. Not `enhanced`. Just:**

```bash
ay yo
```
