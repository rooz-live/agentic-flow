# AY AUTO - Unified Auto-Resolution Workflow

## Overview

`ay auto` is a unified command that combines all stages of intelligent system resolution:

1. **Analysis** - Analyze system state and identify primary issues
2. **Orchestration** - Intelligently select and cycle through modes
3. **Validation** - Test solutions against 4 validation criteria
4. **Verdict** - Deliver GO/NO-GO decision with actionable recommendations

## Quick Start

```bash
# Run full unified workflow
./ay auto

# Or from anywhere in the project
ay auto
```

## Workflow Stages

### Stage 1: Analysis (∼2 min)
- Analyzes system health using `ay-dynamic-thresholds.sh`
- Identifies 6 key metrics with confidence levels
- Calculates health score (0-100%)
- Detects primary issues:
  - `INSUFFICIENT_DATA` - Not enough episodes
  - `LOW_HEALTH` - Health score < 50%
  - `CASCADE_RISK` - Cascade failure risk detected
  - `MONITORING_GAP` - Check frequency gap detected

**Output**: System health dashboard with issue detection

### Stage 2: Orchestration (∼25-40 min)
Intelligently cycles through modes to resolve primary issues:

#### Minimum 4-Mode Validation Strategy
1. **improve:quick:2** - Quick continuous improvement (2 iterations)
2. **wsjf-iterate:tune** - WSJF multiplier tuning
3. **wsjf-iterate:iterate:2** - WSJF iteration (2 cycles)
4. **backtest:quick** - 100K episode quick backtest

#### Mode Selection Logic
- **Iteration 1**: If insufficient data → `init` mode (generate episodes)
- **Iteration 2**: Always run `improve` (health score < 50% or default)
- **Iteration 3+**: 
  - If cascade risk → `monitor` (check cascade status)
  - If monitoring gap → `divergence` (check divergence rate)
  - Default → `iterate` (WSJF optimization)

#### Mode Execution Results
| Mode | Success Criteria | Score | Time |
|------|------------------|-------|------|
| init | Episodes generated | 80 | ∼5 min |
| improve | Improvement cycles complete | 90 | ∼10 min |
| monitor | Statistical cascade status | 85 | ∼5 min |
| divergence | HIGH_CONFIDENCE divergence | 85 | ∼5 min |
| iterate | WSJF iteration success | 95 | ∼15 min |

**Output**: Mode execution history, progress bars, individual scores

### Stage 3: Validation (∼5 min)
Tests solutions against 4 test criteria:

#### Test Criteria
1. **Success Rate** (Threshold: ≥70%)
   - Measures success rate from recent executions
   - Must meet or exceed 70% to pass

2. **Multiplier Tuning** (Threshold: Validated)
   - Checks if multipliers are properly tuned
   - Compares against baseline values
   - Must be validated before proceeding

3. **Compliance** (Threshold: ≥85%)
   - Measures system compliance metrics
   - Must meet or exceed 85%

4. **Circle Equity** (Threshold: ≤40% per circle)
   - Ensures balanced distribution across circles
   - No single circle should dominate (>40%)
   - Prevents resource monopoly

#### Validation Test Modes
- `improve:quick:2` - Quick improvement test
- `wsjf-iterate:tune` - Multiplier tuning validation
- `wsjf-iterate:iterate:2` - WSJF iteration validation
- `backtest:quick` - 100K episode validation

**Output**: Test results table with pass/fail status for each criterion

### Stage 4: Verdict (∼1 min)
Final decision and recommendations:

#### GO Verdict
✅ System passes all validation criteria
- Actionable: Deploy or continue operations
- Confidence: HIGH

#### CONTINUE Verdict
⚡ System shows progress but needs refinement
- Actionable: Run additional iterations
- Confidence: MEDIUM

#### NO_GO Verdict
❌ System fails critical validation criteria
- Actionable: Manual review required
- Recommendations provided for next steps

**Output**: Color-coded verdict with detailed recommendations

## Total Execution Time

**Minimum**: 33-48 minutes
- Stage 1: ∼2 min
- Stage 2: ∼25-40 min (includes mode cycling)
- Stage 3: ∼5 min
- Stage 4: ∼1 min

## Output Directories

### `.ay-orchestrate/`
State tracking for orchestration stage:
- `progress.txt` - Current iteration and mode status
- `mode_history.json` - Mode execution history
- Latest health scores

### `.ay-validate/`
Validation test results:
- `test_results.json` - All test criteria results
- `verdict.json` - Final GO/NO-GO decision
- Actionable recommendations

### `.metrics/`
System metrics storage:
- `multipliers/latest.json` - Tuned multiplier values
- `backtest/summary.json` - Backtest statistics

## Environment Variables

```bash
# Control workflow behavior
MAX_ITERATIONS=5                  # Max orchestration iterations (default: 5)
MIN_CONFIDENCE=HIGH_CONFIDENCE    # Minimum confidence threshold
AY_CIRCLE=orchestrator            # Circle for analysis (default: orchestrator)
AY_CEREMONY=standup               # Ceremony for analysis (default: standup)

# Override detection logic
FORCE_MODE=improve                # Force specific mode instead of auto-select
SKIP_VALIDATION=0                 # Skip validation stage if 1
VERBOSE=1                         # Detailed output if 1
```

## Integration Points

### Dependency Scripts
- `ay-dynamic-thresholds.sh` - System state analysis
- `ay-wsjf-iterate.sh` - WSJF iteration and tuning
- `ay-backtest.sh` - Episode backtesting
- `ay-continuous-improve.sh` - Improvement cycles
- `generate-test-episodes.ts` - Episode generation

### Integration with Main Command
```bash
# Integrated as subcommand
./ay auto

# Accessible from anywhere with symlink
ay auto

# With optional mode argument (future)
ay auto interactive  # Interactive mode selection
```

## Usage Examples

### Run Full Unified Workflow
```bash
./ay auto
```

### With Custom Configuration
```bash
MAX_ITERATIONS=3 AY_CIRCLE=assessor ./ay auto
```

### Run Specific Stage Only (via underlying scripts)
```bash
# Just orchestration
./scripts/ay-orchestrate.sh auto

# Just validation
./scripts/ay-validate.sh auto

# Custom orchestration mode
./scripts/ay-orchestrate.sh interactive
```

## Status Tracking

Real-time TUI dashboard shows:
- **System Health**: Current health score with progress bar
- **Current Mode**: Active mode with execution status
- **Mode History**: All executed modes with results and scores
- **Recommended Actions**: Next steps based on current state
- **Iteration Counter**: Current iteration vs. maximum

### Progress Indicators
- ✓ Success (GREEN)
- ✗ Failed (RED)
- → In progress (CYAN)
- ▸ Partial (YELLOW)

## Performance Metrics

### Success Criteria
- Min mode score: 50/100
- Target health: 80%+
- Min operational metrics: 5/6

### Test Thresholds
- Success Rate: ≥70%
- Compliance: ≥85%
- Circle Equity: ≤40% per circle
- Multiplier Status: Tuned and validated

## Troubleshooting

### Script Not Found
**Error**: "ay-auto.sh not found"
**Solution**: Ensure `/scripts/ay-auto.sh` exists and is executable
```bash
ls -l /path/to/scripts/ay-auto.sh
chmod +x /path/to/scripts/ay-auto.sh
```

### Insufficient Data
**Issue**: Stuck on `init` mode
**Solution**: 
```bash
# Generate more test episodes
npx tsx scripts/generate-test-episodes.ts --count 50 --days 7
```

### Low Health Score
**Issue**: Health remains <50% after iterations
**Solution**:
```bash
# Run extended improvement cycles
./ay improve 10 full

# Or check individual metrics
./scripts/ay-dynamic-thresholds.sh all orchestrator standup
```

### Validation Failures
**Issue**: Multiple test criteria failing
**Solution**:
```bash
# Run individual validation tests
./scripts/ay-validate.sh auto

# Review detailed metrics
cat .ay-validate/test_results.json
```

## Next Steps After Verdict

### If GO
- ✅ Proceed with deployment
- Monitor for regressions
- Archive results for analysis

### If CONTINUE
- Run `./ay auto` again for refinement
- Monitor specific failing criteria
- May achieve GO in next iteration

### If NO_GO
- Review `.ay-validate/verdict.json` for specific failures
- Address recommendations in summary
- May require manual intervention:
  ```bash
  # Manual mode selection
  ./scripts/ay-orchestrate.sh interactive
  
  # Detailed system analysis
  ./scripts/ay-dynamic-thresholds.sh all orchestrator standup
  ```

## Advanced Configuration

### Custom Mode Sequences
Edit `ay-auto.sh` line 160-182 to customize mode selection:
```bash
select_optimal_mode() {
    local state="$1"
    local iteration=$2
    
    # Add custom logic here
    if [[ "$issues" == *"CUSTOM_ISSUE"* ]]; then
        echo "custom_mode"
    fi
}
```

### Validation Criteria Adjustment
Edit validation script thresholds in `ay-validate.sh`:
```bash
# Success Rate threshold (default: 70)
SUCCESS_THRESHOLD=75

# Compliance threshold (default: 85)
COMPLIANCE_THRESHOLD=90
```

## Architecture

```
ay auto
├── Stage 1: analyze_system_state()
│   ├── ay-dynamic-thresholds.sh all
│   ├── Health score calculation
│   └── Issue detection
│
├── Stage 2: orchestrate_modes() [Iterative]
│   ├── select_optimal_mode()
│   ├── execute_mode() [init|improve|monitor|divergence|iterate]
│   ├── validate_solution()
│   └── Repeat until GO or max_iterations
│
├── Stage 3: validate_comprehensive()
│   ├── Test 1: Success Rate
│   ├── Test 2: Multiplier Tuning
│   ├── Test 3: Compliance
│   ├── Test 4: Circle Equity
│   └── Aggregate results
│
└── Stage 4: render_final_verdict()
    ├── Color-coded status
    ├── Actionable recommendations
    └── State persistence
```

## Version & Status

- **Version**: 1.0.0
- **Status**: COMPLETE ✅
- **Last Updated**: 2025-01-12
- **Tested Platforms**: macOS 13+, Linux

## See Also

- [AY_ORCHESTRATE.md](./AY_ORCHESTRATE.md) - Detailed orchestration guide
- [AY_VALIDATE.md](./AY_VALIDATE.md) - Detailed validation guide
- [IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md) - Implementation summary
