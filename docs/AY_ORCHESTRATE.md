# AY Orchestrate: Intelligent Mode Orchestration

## Overview

The `ay orchestrate` command automatically analyzes system recommendations and cycles through optimal modes to resolve issues. It's the **recommended way** to improve system performance with minimal manual intervention.

## Quick Start

```bash
# Auto-resolve issues (analyzes recommendations automatically)
./ay orchestrate

# Interactive mode selection (choose your workflow)
./ay orchestrate interactive
```

## How It Works

### 1. **Analysis Phase**
Orchestrate first analyzes system state to identify:
- Primary recommendations (P1, P2, P3)
- Circle equity balance issues
- Learning baseline gaps
- Production readiness status

### 2. **Sequencing Phase**
Builds an optimal mode sequence based on recommendations:
- Determines minimum modes needed
- Prioritizes by impact
- Chains complementary operations
- Validates dependencies

### 3. **Execution Phase**
Executes modes iteratively with:
- Real-time progress bars
- Color-coded status indicators
- Detailed output for each mode
- Automatic pause between modes

### 4. **Summary Phase**
Displays comprehensive results:
- Completion status
- Execution duration
- Key metrics achieved
- Recommended next steps

## Auto Mode (Recommended)

**Default behavior** - Orchestrate analyzes recommendations and runs optimal sequence.

```bash
./ay orchestrate
# or
./ay orchestrate auto
```

### Example Output

```
╔════════════════════════════════════════════════════════════╗
║  AY Orchestration Engine
╚════════════════════════════════════════════════════════════╝

• Analyzing system state and recommendations...

Recommendations:
  P1: Balance Circle Equity
  P2: Build Learning Baseline
  P3: Production Deployment

[PHASE] Determining optimal mode sequence...

Mode Sequence (4 modes):
  1. improve:full:3
  2. wsjf-iterate:tune
  3. wsjf-iterate:iterate:3
  4. backtest:quick
```

### Automatic Mode Sequences

Based on recommendations, orchestrate selects:

**Scenario 1: Circle Equity Issue**
```
improve:full:3          → Balance circles
wsjf-iterate:tune       → Calculate multipliers
wsjf-iterate:iterate:3  → Execute iterations
```

**Scenario 2: Low Baseline**
```
improve:quick:5         → Quick data collection
wsjf-iterate:tune       → Tune multipliers
backtest:quick          → Validate
```

**Scenario 3: Full Optimization**
```
improve:full:3          → Full cycles
improve:quick:5         → Build baseline
wsjf-iterate:tune       → Tune multipliers
wsjf-iterate:iterate:3  → Execute iterations
backtest:quick          → Validate
```

## Interactive Mode

Choose your workflow interactively.

```bash
./ay orchestrate interactive
```

### Available Workflows

```
1. Quick optimization (~10-15 minutes)
   • Quick improve × 3
   • WSJF tune
   • WSJF iterate × 2

2. Standard workflow (~30-45 minutes)
   • Full improve × 3
   • WSJF tune
   • WSJF iterate × 3
   • Quick backtest

3. Full validation (~1-2 hours)
   • Deep improve × 3
   • WSJF tune
   • WSJF iterate × 5
   • Full backtest (382K episodes)

4. Custom sequence
   • Enter modes line-by-line
   • Format: command:subcommand[:args]
```

### Example: Custom Sequence

```bash
./ay orchestrate interactive
Select mode (1-4): 4
Enter mode specs (one per line, empty line to finish):
> improve:quick:2
> wsjf-iterate:tune
> wsjf-iterate:iterate:2
> 
[Executing custom sequence...]
```

## Mode Specifications

Modes follow this format:

```
command:subcommand[:arg1][:arg2]
```

### Valid Modes

#### Improvement Modes
```
improve:quick:N         # N quick cycles (1 core, ~2-5m each)
improve:full:N          # N full cycles (2 cores, ~5-15m each)
improve:deep:N          # N deep cycles (3+ cores, ~15-30m each)
```

#### WSJF Modes
```
wsjf-iterate:tune                    # Tune multipliers
wsjf-iterate:iterate:N               # N iterations with tuned multipliers
wsjf-iterate:validate                # Validate multipliers
```

#### Backtest Modes
```
backtest:quick          # 100K episodes (~30-60m)
backtest:full           # 382K episodes (~2-4h)
backtest:validate       # Check results against threshold
```

## Progress Indicators

### Progress Bar
```
Progress: ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2/4
```
- Filled blocks (▓) = completed
- Empty blocks (░) = remaining
- Shows current/total modes

### Status Icons
```
✓   Success - Mode completed
✗   Failed - Mode did not complete
→   Step - Starting new operation
•   Info - General information
⏱   Duration - Time measurement
⚠   Warning - Potential issue
```

### Color Coding
```
GREEN   Successful completion
RED     Failed or error
YELLOW  Warning or attention needed
CYAN    Information or phase
MAGENTA Step or mode indicator
```

## Understanding the Output

### Mode Execution

Each mode displays:
```
┌─ Mode 1/4: improve full
│
→ Running improvement cycle: 3 iterations (full mode)
  [execute and show last 10 lines of output]
└─
```

### Mode Summary

After execution:
```
✓ Mode 1 completed
Progress: ▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1/4
```

### Final Summary

```
╔════════════════════════════════════════════════════════════╗
║  Orchestration Summary
╚════════════════════════════════════════════════════════════╝

Execution Results:
  ✓ Completed:    4/4 modes
  ⏱ Duration:     15m 32s

Key Metrics:
  • Multipliers tuned
  • Backtest success rate: 73.5%

✅ ALL MODES COMPLETED SUCCESSFULLY

Next Steps:
  ✓ All modes completed successfully
  • Deploy with: ./ay prod-cycle --balance 10
  • Monitor with: ./ay monitor 30 &
```

## Common Workflows

### Workflow 1: Quick Fix (10-15 min)
```bash
./ay orchestrate interactive
# Select: 1 (Quick optimization)
```

**What it does:**
- Runs 3 quick improvement cycles
- Tunes multipliers
- Tests 2 WSJF iterations
- Perfect for: Quick validation, testing changes

### Workflow 2: Standard Improvement (30-45 min)
```bash
./ay orchestrate
# Auto-selects optimal sequence
```

**What it does:**
- Runs 3 full improvement cycles
- Tunes multipliers
- Executes 3 WSJF iterations
- Validates with quick backtest
- Perfect for: Regular optimization, production prep

### Workflow 3: Full Validation (1-2 hours)
```bash
./ay orchestrate interactive
# Select: 3 (Full validation)
```

**What it does:**
- Runs 3 deep improvement cycles
- Tunes multipliers
- Executes 5 WSJF iterations
- Full 382K episode backtest
- Perfect for: Major updates, production deployment

### Workflow 4: Custom Optimization
```bash
./ay orchestrate interactive
# Select: 4 (Custom sequence)
# Enter: improve:quick:5
#        wsjf-iterate:tune
#        backtest:quick
```

## Minimum Cycles for Resolution

The orchestrator determines the **minimum sequence** to resolve primary recommendations:

| Recommendation | Minimum Modes | Time |
|---|---|---|
| Circle Equity | improve:full:3 + wsjf-iterate | ~20m |
| Low Baseline | improve:quick:5 + wsjf-iterate | ~25m |
| WSJF Needed | wsjf-iterate:tune + iterate:3 | ~15m |
| Production Ready | all above + backtest:quick | ~45m |

## Output Files

After orchestration completes, outputs are saved to:

### Metrics Directory (`.metrics/`)
```
.metrics/
├── multipliers/latest.json          # Tuned multipliers
├── backtest/summary.json            # Backtest results
└── backtest/batch_*.json            # Individual batches
```

### State Directory (`.ay-orchestrate/`)
```
.ay-orchestrate/
├── progress.json                    # Orchestration status
└── progress.log                     # Detailed progress log
```

## Monitoring During Execution

Watch progress in real-time:

```bash
# In another terminal
tail -f .ay-orchestrate/progress.log
```

Or check metrics:
```bash
# View current multipliers
cat .metrics/multipliers/latest.json | jq .

# View backtest results
cat .metrics/backtest/summary.json | jq .results
```

## Troubleshooting

### Issue: "Scripts not found"
```bash
# Make scripts executable
chmod +x ./scripts/ay-*.sh

# Verify
ls -la ./scripts/ay-orchestrate.sh ./scripts/ay-*.sh
```

### Issue: Mode fails but continues
```bash
# Check progress log
cat .ay-orchestrate/progress.log

# Retry orchestration
./ay orchestrate
```

### Issue: Taking too long
```bash
# Use quick mode instead
./ay orchestrate interactive
# Select: 1 (Quick optimization)

# Or custom with fewer iterations
./ay orchestrate interactive
# Select: 4 (Custom)
# Enter: improve:quick:2
#        wsjf-iterate:tune
```

### Issue: Backtest very slow
```bash
# Skip full backtest, use quick
./ay orchestrate interactive
# Select: 2 (Standard - includes quick backtest)
# Remove full backtest from custom sequence
```

## Performance Tips

1. **Start with Quick Optimization**
   - Fastest way to test
   - ~10-15 minutes
   - Good for validation

2. **Use Auto Mode**
   - Analyzes recommendations
   - Picks optimal sequence
   - No manual selection needed

3. **Parallel Monitoring**
   - Run monitoring in background
   - Watch progress live
   - `./ay monitor 10 &`

4. **Check Metrics**
   - View results immediately
   - JSON format for analysis
   - `.metrics/` directory

## Advanced Usage

### Programmatic Integration
```bash
#!/bin/bash
if ./ay orchestrate; then
  echo "Orchestration successful"
  ./ay prod-cycle --balance 10
else
  echo "Orchestration failed"
  exit 1
fi
```

### Scheduled Execution
```bash
# Add to crontab for nightly optimization
0 2 * * * cd /path/to/agentic-flow && ./ay orchestrate >> /tmp/orchestrate.log 2>&1
```

### Conditional Workflows
```bash
# Check system state first
if [[ -f ".metrics/backtest/summary.json" ]]; then
  echo "Recent backtest found"
  ./ay orchestrate interactive  # Manual selection
else
  echo "No recent data"
  ./ay orchestrate              # Auto mode
fi
```

## Key Features

✅ **Automatic Analysis** - Reads system recommendations  
✅ **Optimal Sequencing** - Determines minimum modes needed  
✅ **Progress Visualization** - Real-time progress bars and status  
✅ **Color-Coded Output** - Easy to scan results  
✅ **Metrics Export** - JSON format for analysis  
✅ **State Tracking** - Progress saved across sessions  
✅ **Error Tolerance** - Continues if a mode fails  
✅ **Next Steps** - Recommends actions after completion  

## Quick Reference

```bash
# Auto-resolve (recommended)
./ay orchestrate

# Interactive selection
./ay orchestrate interactive

# Check status
cat .ay-orchestrate/progress.log

# View metrics
jq . .metrics/multipliers/latest.json
jq . .metrics/backtest/summary.json

# Retry after failure
./ay orchestrate
```

## See Also

- `./docs/AY_INTEGRATION.md` - Individual command details
- `./scripts/ay-orchestrate.sh` - Implementation details
- `./ay --help` - Main ay command help
- `./ay <cmd> --help` - Subcommand help
