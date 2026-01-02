# Production Workflow Guide

## Overview

Two production workflow options are available:

1. **`af prod`** - Intelligent adaptive orchestrator (recommended)
2. **`run_production_cycle.sh`** - Manual full-workflow script

## af prod (Adaptive Orchestrator)

### What It Does

`af prod` intelligently rotates between `prod-cycle` and `prod-swarm` based on real-time system needs assessment:

- **Stability Score**: Analyzes failure/degradation rate
- **Maturity Gaps**: Counts observability/coverage gaps
- **Economic Volatility**: Tracks WSJF changes
- **Adaptive Iteration Count**: Adjusts cycles dynamically

### Usage

```bash
# Basic adaptive production (recommended)
./scripts/af prod

# With custom rotations and mode
./scripts/af prod --rotations 3 --mode advisory

# With full monitoring workflow
./scripts/af prod --with-monitoring

# Assessment only (no execution)
./scripts/af prod --assess-only --json
```

### Options

- `--rotations N` - Maximum rotations (default: 3)
- `--mode MODE` - Cycle mode: advisory, mutate, enforcement (default: advisory)
- `--assess-only` - Only run needs assessment, don't execute
- `--with-monitoring` - Run full monitoring workflow after production cycles
- `--json` - Output JSON format

### When to Use

✅ **Use `af prod` when:**
- You want intelligent adaptive orchestration
- System stability/maturity varies over time
- You need automated decision-making
- Running in production environments

## run_production_cycle.sh (Manual Workflow)

### What It Does

Runs a **fixed sequence** of production commands and monitoring scripts:

1. Core production cycle commands
2. Continuous improvement orchestrator
3. System verification scripts
4. Monitoring and health checks

### Usage

```bash
# Run full manual workflow
./run_production_cycle.sh
```

### When to Use

✅ **Use `run_production_cycle.sh` when:**
- You need manual control over workflow steps
- Running one-off diagnostics
- Testing/debugging specific monitoring scripts
- Development/staging environments

## Comparison

| Feature | af prod | run_production_cycle.sh |
|---------|---------|-------------------------|
| **Adaptive** | ✅ Yes (needs assessment) | ❌ No (fixed sequence) |
| **Monitoring** | Optional (`--with-monitoring`) | Always included |
| **Health Checks** | Built-in | Built-in |
| **Iteration Control** | Intelligent | Manual |
| **JSON Output** | ✅ Yes | ❌ No |
| **Best For** | Production | Development/Testing |

## Monitoring Integration

### af prod with Monitoring

```bash
./scripts/af prod --rotations 3 --with-monitoring
```

Runs adaptive orchestration **then** executes:

- `verify_logger_enhanced.py`
- `verify_system_improvements.py`
- `validate_learning_parity.py`
- `temporal/budget_tracker.py`
- `execution/wip_monitor.py`
- `monitoring/site_health_monitor.py`
- `monitoring/heartbeat_monitor.py`

### Standalone Monitoring

```bash
./run_production_cycle.sh
```

Runs **all** production commands plus monitoring in a fixed sequence.

## Examples

### Development Workflow

```bash
# Test with manual control
./run_production_cycle.sh

# Or step-by-step with af commands
./scripts/af prod-cycle --mode advisory --iterations 5
./scripts/orchestrate_continuous_improvement.py
./scripts/monitoring/site_health_monitor.py
```

### Production Workflow

```bash
# Recommended: adaptive with monitoring
./scripts/af prod --rotations 3 --mode advisory --with-monitoring --json

# Or: adaptive without monitoring (faster)
./scripts/af prod --rotations 5 --mode mutate
```

## Architecture

```
af prod
├── Needs Assessment
│   ├── Stability Score
│   ├── Maturity Gaps
│   └── Economic Volatility
├── Adaptive Rotation
│   ├── prod-cycle (N iterations)
│   └── prod-swarm (M iterations)
└── Optional Monitoring (--with-monitoring)
    ├── System Verification
    └── Health Checks

run_production_cycle.sh
├── af prod (basic)
├── af pattern-coverage
├── af goalie-gaps
├── prod-cycle (fixed)
├── orchestrate_continuous_improvement.py
├── System Verification Scripts
└── Monitoring Scripts
```

## Recommendation

**For production:** Use `af prod --with-monitoring`

**For development:** Use `run_production_cycle.sh` or individual `af` commands

**For CI/CD:** Use `af prod --json` for structured output
