# ay yo - Single Muscle Memory Command

## Focused Incremental Relentless Execution

One command. Zero cognitive load.

```bash
ay yo
```

## Usage

```bash
# Default: 10 learning cycles with hooks
./scripts/ay-yo

# Custom iterations
./scripts/ay-yo 20

# With causal analysis
./scripts/ay-yo 20 analyze

# Help
./scripts/ay-yo --help
```

## What It Does

```
ay yo
  ↓
Shows hook status
  ↓
Runs learning cycles across all circles
  ↓
PRE-CEREMONY hooks → Execute → POST-CEREMONY hooks
  ↓
BATCH-ANALYSIS hooks (every iteration)
  ↓
POST-BATCH hooks (on completion)
  ↓
Done
```

## Hooks Enabled by Default

- ✅ Observability gap detection
- ✅ Ceremony metrics recording
- ✅ Causal observation tracking

## Optional Hooks

Enable via environment variables:

```bash
export ENABLE_WSJF_CHECK=1           # WSJF priority checks
export ENABLE_PATTERN_ANALYSIS=1     # Pattern detection
export ENABLE_RETRO_APPROVAL=1       # Retro approval gates
```

See all: `./scripts/ay-yo-enhanced.sh hooks`

## Examples

### Daily Practice
```bash
# Morning: 10 cycles
./scripts/ay-yo

# Check metrics
cat .goalie/ceremony_metrics.jsonl | tail -10
```

### Deep Work Session
```bash
# 50 cycles with analysis
./scripts/ay-yo 50 analyze

# Review insights
./scripts/ay-yo-enhanced.sh insights
```

### Focused Circle Work
```bash
# Use direct scripts for single circle
./scripts/ay-prod-learn-loop.sh --circle orchestrator 10
```

## Philosophy

**One command = One habit**

No subcommands. No flags to remember. Just:

```bash
ay yo
```

The system knows what to do:
- Run ceremonies across all circles
- Apply hooks automatically
- Record observations
- Enable learning

## Integration with Other Tools

### View Results
```bash
./scripts/ay-yo-enhanced.sh dashboard   # Cockpit view
./scripts/ay-yo-enhanced.sh insights    # Causal learning
./scripts/ay-yo-enhanced.sh equity      # Circle balance
```

### Single Ceremony
```bash
./scripts/ay-yo-enhanced.sh spawn orchestrator standup
```

### Configuration
```bash
./scripts/ay-yo-enhanced.sh hooks       # Show hook config
```

## Under the Hood

`ay yo` is a thin wrapper that:

1. Loads ceremony hooks
2. Shows enabled hooks status
3. Calls `ay-prod-learn-loop.sh` with hooks integrated
4. Each ceremony runs through full hook lifecycle

**Files**:
- `scripts/ay-yo` - Main command (106 lines)
- `scripts/hooks/ceremony-hooks.sh` - Hook framework
- `scripts/ay-prod-learn-loop.sh` - Learning loop engine
- `scripts/ay-prod-cycle.sh` - Ceremony execution

## Design Principles

1. **Zero Cognitive Load**: No arguments = sensible defaults
2. **Muscle Memory**: Same command every time
3. **Non-Blocking**: Hooks never prevent execution
4. **Progressive**: Enable more hooks as needed
5. **Observable**: See what's happening

## Quick Reference

| Command | What It Does |
|---------|--------------|
| `./scripts/ay-yo` | Run 10 cycles with hooks |
| `./scripts/ay-yo 20` | Run 20 cycles |
| `./scripts/ay-yo 20 analyze` | Run 20 with analysis |
| `./scripts/ay-yo --help` | Show help |

**That's it.** One command. Focused execution.
