# Enhanced `ay` Command Integration Guide

## Overview

The `ay` command has been significantly enhanced with new subcommands for continuous improvement, WSJF iteration with multiplier tuning, 382K episode backtesting, and real-time monitoring.

## New Subcommands

### 1. `ay improve` - Continuous Improvement Cycles

Run automated improvement cycles with configurable modes.

**Usage:**
```bash
./ay improve [iterations] [mode]
```

**Parameters:**
- `iterations`: Number of cycles to run (default: 5)
- `mode`: Execution mode
  - `quick`: Orchestrator only (fastest)
  - `full`: Orchestrator, Assessor, Innovator (balanced)
  - `deep`: All circles (comprehensive)

**Examples:**
```bash
# Run 5 full improvement cycles
./ay improve

# Run 10 quick cycles
./ay improve 10 quick

# Run 3 deep cycles with all circles
./ay improve 3 deep
```

**Features:**
- Automated DoR/DoD compliance tracking
- Circle equity balancing
- Skills consolidation
- Budget optimization
- Metrics aggregation

### 2. `ay wsjf-iterate` - WSJF Iteration with Multiplier Tuning

Execute WSJF iterations with dynamic multiplier tuning based on validation data.

**Usage:**
```bash
./ay wsjf-iterate <command> [options]
```

**Commands:**
```bash
# Tune multipliers from observations
./ay wsjf-iterate tune

# Tune with validation data
./ay wsjf-iterate tune validation-metrics.json

# Execute 3 iterations with tuned multipliers
./ay wsjf-iterate iterate 3

# Run with custom multipliers
./ay wsjf-iterate iterate 5 "1.1|1.0|1.2|0.9"

# Validate current multipliers
./ay wsjf-iterate validate

# Export metrics
./ay wsjf-iterate export metrics.json
```

**Multiplier Format:**
Multipliers are specified as pipe-separated values for each circle:
```
orchestrator|assessor|analyst|innovator
```

**Examples:**
```bash
# Quick tune-and-iterate workflow
./ay wsjf-iterate tune
./ay wsjf-iterate iterate 3
./ay wsjf-iterate validate

# With validation data from backtest
./ay wsjf-iterate tune backtest-results.json
./ay wsjf-iterate iterate 5
```

**Output:**
- Multiplier JSON saved to `.metrics/multipliers/latest.json`
- Validation against 24-hour performance data
- Success rate tracking (target: ≥70%)

### 3. `ay backtest` - 382K Episode Backtesting

Run comprehensive backtests with parallel execution and metrics aggregation.

**Usage:**
```bash
./ay backtest <command> [options]
```

**Commands:**
```bash
# Full 382K episode backtest
./ay backtest full

# Quick 100K episode backtest
./ay backtest quick

# Validate latest results
./ay backtest validate

# Export results to JSON
./ay backtest export backtest-results.json
```

**Examples:**
```bash
# Run quick validation
./ay backtest quick
./ay backtest validate

# Run full backtest with validation and export
./ay backtest full
./ay backtest export results.json

# Check results
cat .metrics/backtest/summary.json | jq .
```

**Output Files:**
- `.metrics/backtest/summary.json` - Aggregated results
- `.metrics/backtest/batch_*.json` - Individual batch metrics
- Success rate, average reward, variance statistics

**Parallel Execution:**
- Automatically uses all available CPU cores
- Batches: ~1000 episodes per job
- Aggregates results after all batches complete

### 4. `ay monitor` - Real-time Monitoring Dashboard

Continuous monitoring with configurable refresh interval.

**Usage:**
```bash
./ay monitor [interval]
```

**Parameters:**
- `interval`: Refresh interval in seconds (default: 60)

**Examples:**
```bash
# Monitor with default 60s interval
./ay monitor

# Monitor every 30 seconds
./ay monitor 30

# Monitor every 10 seconds (high frequency)
./ay monitor 10

# Stop monitoring
# Press Ctrl+C
```

**Display Includes:**
- AgentDB statistics (episodes, skills, rewards)
- Test progress and success rates
- Circuit breaker status
- Cascade failure detection
- Skills learning progress
- Recent failure events

## Integration Workflow

### Complete Improvement Workflow

```bash
# 1. Start continuous monitoring
./ay monitor 30 &  # Background monitoring

# 2. Run improvement cycles
./ay improve 5 full

# 3. Tune multipliers from observations
./ay wsjf-iterate tune

# 4. Execute WSJF iterations
./ay wsjf-iterate iterate 3
./ay wsjf-iterate validate

# 5. Run backtest for validation
./ay backtest quick
./ay backtest validate

# 6. Export results
./ay wsjf-iterate export wsjf-metrics.json
./ay backtest export backtest-results.json
```

### Production Readiness Workflow

```bash
# 1. Build baseline
./ay improve 3 quick    # Quick cycles for initial data

# 2. Validate multipliers
./ay wsjf-iterate tune
./ay wsjf-iterate validate

# 3. Run comprehensive backtest
./ay backtest full
./ay backtest validate

# 4. If successful, deploy
./ay prod-cycle --balance 10

# 5. Continuous monitoring
./ay monitor 30 &
```

## Configuration

### Environment Variables

```bash
# Enable/disable ceremony hooks
export ENABLE_CEREMONY_HOOKS=1

# Enable observability checks
export ENABLE_OBSERVABILITY_CHECK=1

# Enable WSJF priority checks
export ENABLE_WSJF_CHECK=1

# Custom metrics directory
export METRICS_DIR=".metrics"

# Database path
export DB_PATH="agentdb.db"
```

### Thresholds

All threshold calculations are dynamic and data-driven:

**Multiplier Validation:**
- Success rate ≥70%: ✓ Passed
- Success rate 50-70%: ⚠ Acceptable but needs improvement
- Success rate <50%: ✗ Needs tuning

**Backtest Validation:**
- Success rate ≥70%: ✓ Production ready
- Success rate <70%: ⚠ Needs review

**Circle Equity:**
- Variance threshold: 2x expected proportion
- Triggers rebalancing when exceeded

## Metrics and Outputs

### Directory Structure

```
.metrics/
├── episodes/              # Episode data
├── observations/          # Observation logs
├── multipliers/           # Tuned multipliers
│   └── latest.json       # Latest tuned multipliers
├── validation/            # Validation results
└── backtest/             # Backtest results
    ├── batch_*.json      # Individual batch results
    └── summary.json      # Aggregated summary
```

### Metrics Files

**Multiplier JSON** (`.metrics/multipliers/latest.json`):
```json
{
  "timestamp": "2026-01-12T21:02:06Z",
  "orchestrator": 1.1,
  "assessor": 1.0,
  "analyst": 1.2,
  "innovator": 0.9,
  "adjustment_reason": "validation_based_tuning"
}
```

**Backtest Summary** (`.metrics/backtest/summary.json`):
```json
{
  "timestamp": "2026-01-12T21:02:06Z",
  "backtest_config": {
    "total_episodes": 382000,
    "batches_completed": 12,
    "parallel_jobs": 8
  },
  "results": {
    "total_episodes": 382000,
    "successful_episodes": 267400,
    "success_rate": 70.0,
    "average_reward": 0.75,
    "reward_stddev": 0.15
  }
}
```

## Troubleshooting

### Issue: Scripts not found

**Problem:** `ay-wsjf-iterate.sh not found`

**Solution:**
```bash
# Make scripts executable
chmod +x ./scripts/ay-wsjf-iterate.sh
chmod +x ./scripts/ay-backtest.sh

# Verify
ls -la ./scripts/ay-*.sh
```

### Issue: Database not available

**Problem:** Multiplier tuning fails - "database not found"

**Solution:**
```bash
# Initialize database
npm run init  # If available
# OR
sqlite3 agentdb.db "SELECT COUNT(*) FROM observations;" 2>/dev/null || echo "Initialize first"
```

### Issue: Backtest slow

**Problem:** Backtest takes too long

**Solution:**
```bash
# Use quick backtest instead
./ay backtest quick

# Reduce iteration count
ITERATIONS=5 ./ay backtest quick

# Check available cores
nproc
```

### Issue: Monitor not updating

**Problem:** Monitor shows stale data

**Solution:**
```bash
# Restart monitor with shorter interval
./ay monitor 10

# Check database activity
tail -f .metrics/backtest/batch_*.json 2>/dev/null
```

## Advanced Usage

### Custom Multipliers

```bash
# Use specific multipliers for iteration
./ay wsjf-iterate iterate 5 "1.2|1.1|0.9|1.0"

# Compare with defaults
./ay wsjf-iterate iterate 5 "1.0|1.0|1.0|1.0"
```

### Parallel Improvement

```bash
# Run in background while monitoring
./ay improve 10 deep &
IMPROVE_PID=$!

./ay monitor 30 &
MONITOR_PID=$!

wait $IMPROVE_PID
kill $MONITOR_PID

# Analyze results
jq . .metrics/backtest/summary.json
```

### Metrics Analysis

```bash
# View latest multipliers
cat .metrics/multipliers/latest.json | jq .

# Check backtest results
cat .metrics/backtest/summary.json | jq .results

# List all batch results
ls -lh .metrics/backtest/batch_*.json | wc -l
```

## Performance Characteristics

### Execution Times

| Command | Mode | Episodes | Time |
|---------|------|----------|------|
| `ay improve` | quick | ~100 | 2-5m |
| `ay improve` | full | ~300 | 5-15m |
| `ay improve` | deep | ~600 | 15-30m |
| `ay wsjf-iterate iterate 3` | - | ~900 | 10-20m |
| `ay backtest quick` | - | 100K | 30-60m |
| `ay backtest full` | - | 382K | 2-4h |

### Resource Usage

- CPU: Utilizes all available cores (parallel batches)
- Memory: ~500MB base + batch overhead
- Disk: ~10-100MB per backtest run (metrics storage)

## Integration with Production

### Pre-production Checklist

```bash
# 1. Build baseline
./ay improve 5 full
echo "✓ Baseline built"

# 2. Tune multipliers
./ay wsjf-iterate tune
./ay wsjf-iterate validate
echo "✓ Multipliers validated"

# 3. Run backtest
./ay backtest quick
./ay backtest validate
echo "✓ Backtest passed"

# 4. Check metrics
jq .results .metrics/backtest/summary.json
echo "✓ Ready for production"

# 5. Deploy
./ay prod-cycle --balance 10
```

### Monitoring Production

```bash
# Start background monitoring
./ay monitor 30 > /tmp/ay-monitor.log 2>&1 &
echo $! > /tmp/ay-monitor.pid

# View live logs
tail -f /tmp/ay-monitor.log

# Stop monitoring
kill $(cat /tmp/ay-monitor.pid)
```

## See Also

- `./scripts/ay-yo-continuous-improvement.sh` - Detailed improvement cycles
- `./scripts/ay-wsjf-runner.sh` - WSJF runner with advanced features
- `./scripts/ay-divergence-monitor.sh` - Divergence testing monitor
- `./prod --help` - Production ceremony execution

## Support

For issues or questions:
1. Check `.metrics/` directory for metrics
2. Review script logs for errors
3. Validate database with: `sqlite3 agentdb.db "SELECT COUNT(*) FROM observations;"`
4. Check Hook status: `cat .hooks-status.log`
