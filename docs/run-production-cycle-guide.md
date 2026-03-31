# Production Cycle Runner Guide

## Overview

`run_production_cycle.sh` is a **maturity-adaptive** production workflow runner that automatically tunes iterations and mode based on system maturity, with optional component wiring for fast/focused runs.

## Quick Start

```bash
# Auto-tuned run (recommended)
./run_production_cycle.sh

# Quick assessment (1 iteration, advisory mode)
./run_production_cycle.sh --iterations 1 --mode advisory

# Minimal run (core only, fastest)
./run_production_cycle.sh --skip-verify --skip-monitor

# Maturity-building (10 iterations, mutate mode)
./run_production_cycle.sh --iterations 10 --mode mutate
```

## Auto-Tuning Logic

The script automatically adjusts iterations and mode based on **production maturity score** from `.goalie/prod_learning_evidence.jsonl`:

| Maturity Range | Iterations | Mode         | Rationale                       |
|----------------|------------|--------------|--------------------------------|
| 0-40           | 1          | advisory     | Unsafe, explore carefully      |
| 40-70          | 5          | advisory     | Stabilizing, build confidence  |
| 70-85          | 10         | mutate       | Production-ready, mutate code  |
| 85-100         | 25         | enforcement  | Mature, maximize throughput    |

### How It Works

1. **First Run**: No learning evidence → Safe defaults (1 iteration, advisory)
2. **Subsequent Runs**: Reads latest maturity score → Auto-tunes parameters
3. **Manual Override**: Use `--iterations` and `--mode` to bypass auto-tuning

## Configuration Options

### Command-Line Flags

```bash
./run_production_cycle.sh [OPTIONS]

OPTIONS:
  --iterations N        Prod-cycle iterations (auto, 1-50) [default: auto]
  --mode M              Execution mode (auto, advisory, mutate, enforcement) [default: auto]
  --skip-core           Skip core prod commands (prod, pattern-coverage, goalie-gaps)
  --skip-verify         Skip verification scripts
  --skip-monitor        Skip monitoring scripts
  --skip-learning       Skip learning evidence collector
  --verbose, -v         Verbose output
  --json                JSON output format
  --help, -h            Show this help
```

### Environment Variables

```bash
# Override defaults via environment
AF_PROD_ITERATIONS=5 ./run_production_cycle.sh
AF_PROD_MODE=mutate ./run_production_cycle.sh
AF_SKIP_MONITOR=true ./run_production_cycle.sh

# Available environment variables:
AF_PROD_ITERATIONS    # Override default iterations
AF_PROD_MODE          # Override default mode
AF_SKIP_CORE          # Skip core commands (true/false)
AF_SKIP_VERIFY        # Skip verification (true/false)
AF_SKIP_MONITOR       # Skip monitoring (true/false)
AF_SKIP_LEARNING      # Skip learning collector (true/false)
AF_VERBOSE            # Verbose output (true/false)
AF_JSON               # JSON output (true/false)
```

## Component Breakdown

The script executes 5 component groups in order:

### 1. Core Production Commands (required)

```bash
./scripts/af prod                                  # Adaptive orchestrator
./scripts/af pattern-coverage --required-patterns  # Pattern coverage
./scripts/af goalie-gaps --filter autocommit-readiness  # Autocommit gaps
```

**Skip with**: `--skip-core` (not recommended)

### 2. Prod-Cycle Iterations (required)

```bash
AF_ENV=local ./scripts/af prod-cycle --iterations N --mode M
```

**Configure with**: `--iterations N --mode M`

### 3. Continuous Improvement (always runs)

```bash
./scripts/orchestrate_continuous_improvement.py
```

### 4. Verification Scripts (optional)

```bash
./scripts/verify_logger_enhanced.py
./scripts/verify_system_improvements.py
./scripts/validate_learning_parity.py
```

**Skip with**: `--skip-verify`

### 5. Monitoring Scripts (optional)

```bash
./scripts/temporal/budget_tracker.py
./scripts/agentdb/audit_agentdb.py
./scripts/analysis/check_pattern_tag_coverage.py
./scripts/execution/wip_monitor.py
./scripts/monitoring/site_health_monitor.py
./scripts/monitoring/heartbeat_monitor.py
```

**Skip with**: `--skip-monitor`

### 6. Learning Evidence Collector (optional)

```bash
./scripts/agentic/prod_learning_collector.py
```

**Skip with**: `--skip-learning` (not recommended - breaks auto-tuning)

## Usage Examples

### Scenario 1: First-Time Setup

```bash
# Run with safe defaults (no learning evidence yet)
./run_production_cycle.sh

# Expected: 1 iteration, advisory mode, all components
# Generates: .goalie/prod_learning_evidence.jsonl (maturity baseline)
```

### Scenario 2: Daily Production Cycle

```bash
# Auto-tuned based on maturity
./run_production_cycle.sh

# System reads maturity score and adjusts:
# - Maturity 35 → 1 iteration, advisory
# - Maturity 75 → 10 iterations, mutate
# - Maturity 90 → 25 iterations, enforcement
```

### Scenario 3: Quick Health Check

```bash
# Fast assessment (skip slow components)
./run_production_cycle.sh --iterations 1 --mode advisory --skip-monitor

# Runtime: ~2-3 minutes (vs 10-15 minutes full cycle)
```

### Scenario 4: Maturity Building Sprint

```bash
# Run 10 iterations in mutate mode (force maturity growth)
./run_production_cycle.sh --iterations 10 --mode mutate

# Builds learning evidence → Increases maturity score
# Next auto-run will use higher iterations/mode
```

### Scenario 5: CI/CD Integration

```bash
# Minimal run for CI/CD pipeline
AF_SKIP_MONITOR=true AF_SKIP_VERIFY=true ./run_production_cycle.sh --json

# Output: JSON status for downstream processing
# Runtime: ~3-5 minutes
```

### Scenario 6: Debugging/Troubleshooting

```bash
# Verbose mode to diagnose issues
./run_production_cycle.sh --verbose

# Shows: maturity score, auto-tuning decisions, component execution
```

## Integration with `af prod`

The enhanced `af prod` orchestrator uses learning evidence from `run_production_cycle.sh` to apply **compounding benefits**:

```bash
# 1. Generate learning evidence
./run_production_cycle.sh

# 2. View compounding assessment
python3 scripts/cmd_prod_enhanced.py --assess-only

# 3. Run af prod with compounding
python3 scripts/cmd_prod_enhanced.py --rotations 3

# Expected: Higher maturity → More iterations, autocommit enabled, 5-10x throughput
```

### Feedback Loop

```
run_production_cycle.sh → Learning Evidence → af prod Enhanced → Better Maturity → ...
```

## Performance Characteristics

| Configuration              | Runtime   | Use Case                     |
|----------------------------|-----------|------------------------------|
| Minimal (core only)        | 2-3 min   | CI/CD, fast feedback         |
| Standard (skip monitor)    | 5-7 min   | Development, daily runs      |
| Full (all components)      | 10-15 min | Production, weekly deep dive |
| Maturity sprint (10+ iter) | 20-30 min | Maturity building, QA        |

## Common Patterns

### Pattern 1: Gradual Maturity Growth

```bash
# Week 1: Safe exploration
./run_production_cycle.sh  # Maturity 30 → 1 iter, advisory

# Week 2: Stabilizing
./run_production_cycle.sh  # Maturity 50 → 5 iter, advisory

# Week 3: Production-ready
./run_production_cycle.sh  # Maturity 72 → 10 iter, mutate

# Week 4: Mature system
./run_production_cycle.sh  # Maturity 88 → 25 iter, enforcement
```

### Pattern 2: Regression Detection

```bash
# Maturity drops after bad deployment
./run_production_cycle.sh  # Maturity 45 (was 75) → Auto-reduces to 1 iter, advisory

# System self-protects by reducing risk exposure
```

### Pattern 3: Sprint Acceleration

```bash
# Force high iterations to build maturity
for i in {1..5}; do
  ./run_production_cycle.sh --iterations 10 --mode mutate
done

# Rapidly builds learning evidence and maturity score
```

## Troubleshooting

### Issue: Script fails with "command not found"

**Cause**: Missing executable permissions on monitoring scripts

**Fix**:
```bash
chmod +x scripts/*.py scripts/**/*.py
```

### Issue: Auto-tuning always uses defaults (1 iter, advisory)

**Cause**: No learning evidence file or malformed JSON

**Fix**:
```bash
# Check if evidence file exists
ls -lh .goalie/prod_learning_evidence.jsonl

# Validate JSON
tail -1 .goalie/prod_learning_evidence.jsonl | python3 -m json.tool

# Force regeneration
rm .goalie/prod_learning_evidence.jsonl
./run_production_cycle.sh
```

### Issue: Maturity score not increasing

**Cause**: 
- Infrastructure failures (site health critical)
- High revenue concentration
- Low circle utilization

**Fix**:
```bash
# Check monitoring outputs
cat logs/site_health.jsonl  # Deployment health
cat .goalie/wip_limits.jsonl  # Circle utilization
cat .goalie/prod_learning_evidence.jsonl  # Latest maturity

# Focus on weakest factor (lowest weight)
./scripts/orchestrate_continuous_improvement.py
```

## Advanced: Custom Workflow

Create your own workflow by copying and modifying:

```bash
cp run_production_cycle.sh my_custom_workflow.sh

# Edit to add custom steps:
# - Pre-deployment checks
# - Database migrations
# - Custom monitoring
# - Alerting integrations
```

## Related Documentation

- **[af-prod-usage.md](./af-prod-usage.md)**: Difference between `af prod` and `run_production_cycle.sh`
- **[production-learning-loop.md](./production-learning-loop.md)**: Learning feedback loop architecture
- **[compounding-benefits-quick-ref.md](./compounding-benefits-quick-ref.md)**: Compounding multipliers reference

## Summary

**Key Benefits**:
1. **Auto-tuning**: Maturity-adaptive iterations and mode
2. **Optional components**: Skip slow parts for fast feedback
3. **Safe defaults**: Conservative first run, scales with confidence
4. **Feedback loop**: Generates evidence for `af prod` compounding
5. **Flexible**: CLI flags + environment variables for any workflow

**Recommended Usage**:
```bash
# Daily: Auto-tuned production cycle
./run_production_cycle.sh

# Weekly: Full deep dive
./run_production_cycle.sh --verbose

# CI/CD: Minimal fast check
./run_production_cycle.sh --skip-monitor --skip-verify --json
```
