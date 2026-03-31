# AF Prod - Adaptive Production Orchestrator

## Overview

`af prod` is an intelligent orchestrator that automatically rotates between `prod-cycle` and `prod-swarm` based on real-time system needs assessment. It dynamically determines the optimal number of iterations for each phase by analyzing:

- **System Stability** - Failure and degradation rates
- **Maturity Gaps** - Observability and coverage deficits
- **Economic Volatility** - WSJF and priority fluctuations

## Usage

### Basic Adaptive Rotation (Recommended)
```bash
AF_ENV=local ./scripts/af prod --rotations 3 --mode advisory
```

This will:
1. Assess current system needs
2. Run prod-cycle with dynamically determined iterations
3. Run prod-swarm with dynamically determined iterations
4. Repeat for up to 3 rotations or until high stability is achieved

### Assessment Only
```bash
./scripts/af prod --assess-only
```

View current needs assessment without executing:
```
📊 Current Needs Assessment:
   Stability: 100.0%
   Maturity Gaps: 0
   Economic Volatility: 50.0%
   Recommended Cycle Iterations: 3
   Recommended Swarm Iterations: 5
   Confidence: 50.0%
   📝 High stability, reducing iterations
```

### With JSON Output
```bash
./scripts/af prod --rotations 3 --mode advisory --json
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--rotations N` | Maximum number of cycle→swarm rotations | 3 |
| `--mode MODE` | Production cycle mode: advisory, mutate, enforcement | advisory |
| `--assess-only` | Only run needs assessment, don't execute | false |
| `--json` | Output results as JSON | false |

## Needs Assessment Logic

### Stability Score (0-1)
- **High (>0.9)**: Reduces iterations for efficiency
- **Low (<0.7)**: Increases cycle iterations for focus
- Calculated from failure and degradation rates

### Maturity Gaps (count)
- **High (>5)**: Increases swarm iterations for exploration
- Tracks observability gaps, coverage deficits, tier/depth issues

### Economic Volatility (0-1)
- **High (>0.5)**: Increases swarm iterations for comparison
- Calculated from WSJF change coefficient of variation

## Dynamic Iteration Recommendations

### Cycle Iterations
- **Default**: 5 iterations
- **Low Stability (<0.7)**: 5-10 iterations (more focus needed)
- **High Stability (>0.9) + Low Gaps**: 3 iterations (can reduce)

### Swarm Iterations
- **Default**: 10 iterations
- **High Gaps (>5)**: 10-50 iterations (more exploration)
- **High Volatility (>0.5)**: 10-100 iterations (more comparison)
- **High Stability (>0.9) + Low Gaps**: 5 iterations (can reduce)

## Early Exit Conditions

The orchestrator will stop early if:
- Stability > 95% AND Maturity Gaps < 2
- Any cycle or swarm fails

## Workflow Integration

Each rotation includes:
- ✅ Pre-cycle/swarm health check (`--with-health-check`)
- ✅ Post-cycle/swarm graduation assessment (`--with-evidence-assess`)

This is equivalent to running each phase with `--with-full-workflow`.

### Advisory vs Strict Mode

Evidence assessment runs in **advisory mode** by default:
- 📊 Provides visibility into graduation readiness
- ⚠️ Reports BLOCK/APPROVE status without failing the orchestrator
- 🔄 Allows rotations to continue even with insufficient evidence
- ✅ Exit code 0 for informational assessments

For CI/CD gates that must enforce graduation criteria:
```bash
# Strict mode - fails if not qualified
./scripts/af evidence assess --strict --recent 10
```

## Example Output

```
======================================================================
🎯 ADAPTIVE PRODUCTION ORCHESTRATOR
======================================================================

======================================================================
🔄 Rotation 1/3
======================================================================

📊 Assessing Current Needs...
   Stability: 100.0%
   Maturity Gaps: 0
   Economic Volatility: 50.0%
   Confidence: 50.0%
   📝 High stability, reducing iterations

   → Cycle iterations: 3
   → Swarm iterations: 5

======================================================================
🔄 Running prod-cycle (iterations=3, mode=advisory)
======================================================================
[... cycle output ...]

======================================================================
🐝 Running prod-swarm (iterations=5)
======================================================================
[... swarm output ...]

======================================================================
📋 EXECUTION SUMMARY
======================================================================

   Total Rotations: 1
   Total Cycle Iterations: 3
   Total Swarm Iterations: 5
   Overall Success: ✅ YES

   Rotation Details:
      1. Cycle(3): ✅ | Swarm(5): ✅

======================================================================
```

## Comparison to Manual Approach

### Manual (Static)
```bash
# Fixed iterations, no adaptation
./scripts/af prod-cycle --mode advisory --iterations 5 --with-full-workflow
./scripts/af prod-swarm --golden-iters 10 --with-full-workflow --default-emitters
```

### Adaptive (Dynamic)
```bash
# Automatically adjusts based on system state
./scripts/af prod --rotations 3 --mode advisory
```

**Benefits of Adaptive:**
- 🎯 Optimizes iteration counts based on real-time metrics
- 🔄 Automatically rotates between cycle and swarm
- ⚡ Early exit when stability achieved
- 📊 Continuous needs assessment
- 🏥 Integrated health checks and graduation assessment

## Integration with Existing Commands

`af prod` orchestrates but does not replace:
- `af prod-cycle` - Still available for direct cycle execution
- `af prod-swarm` - Still available for direct swarm execution
- `af evidence assess` - Automatically called after each phase

Think of `af prod` as the "smart wrapper" that knows when and how much to run each component.
