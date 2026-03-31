# AY Validate: Go/No-Go Solution Testing & Validation

## Overview

The `ay validate` command tests proposed solutions against rigorous criteria and provides **GO/NO-GO verdicts**. It automatically determines the minimum test modes needed and validates solutions through a comprehensive test suite.

## Quick Start

```bash
# Auto-validate a solution (recommended)
./ay validate auto "Circle Equity Balance"

# Interactive solution selection
./ay validate interactive

# Full validation with all tests
./ay validate full "Production Readiness"
```

## How It Works

### 1. **Analysis Phase**
- Identifies primary recommendations
- Determines minimum test modes
- Builds optimal test sequence

### 2. **Execution Phase**
- Runs test modes iteratively
- Shows real-time progress
- Captures metrics for each mode

### 3. **Validation Phase**
- Tests against 4 criteria:
  - **Success Rate** (≥70%)
  - **Multiplier Tuning** (validated)
  - **Compliance** (≥85%)
  - **Circle Equity** (balanced)

### 4. **Verdict Phase**
- **GO VERDICT** - All tests pass, ready to deploy
- **NO-GO VERDICT** - Tests failed, needs iteration
- Provides actionable recommendations

## Test Criteria

### Test 1: Success Rate ✓
- **Threshold:** ≥70%
- **What:** Backtest success rate
- **Pass:** Success rate meets or exceeds 70%
- **Fail:** Below 70% success rate

### Test 2: Multiplier Validation ✓
- **Threshold:** Tuned multipliers exist
- **What:** WSJF multipliers optimized
- **Pass:** Latest multipliers found
- **Fail:** No tuned multipliers

### Test 3: Compliance Rate ✓
- **Threshold:** ≥85%
- **What:** DoR/DoD compliance
- **Pass:** Compliance rate ≥85%
- **Fail:** Below 85% compliance

### Test 4: Circle Equity ✓
- **Threshold:** Max 40% per circle
- **What:** Circle balance
- **Pass:** No circle exceeds 40%
- **Fail:** Circle imbalance detected

## Minimum Test Modes

The validator determines **4 test modes** to validate solutions:

```
1. improve:quick:2          Quick improvement cycles (5-10m)
2. wsjf-iterate:tune        Tune multipliers (5m)
3. wsjf-iterate:iterate:2   Test iterations (10m)
4. backtest:quick           Validate with 100K backtest (30-60m)

Total Minimum Time: ~50-85 minutes
```

## Verdict Displays

### GO Verdict ✅

```
╔═══════════════════════════════════════════════╗
║  ▶ GO VERDICT - Solution Validated
║  Solution: Circle Equity Balance
║  Success Rate: 100%
╚═══════════════════════════════════════════════╝

STATUS: SOLUTION VALIDATED

Recommendation:
  ✓ Ready for deployment
  • Deploy with: ./ay prod-cycle --balance 10
  • Monitor with: ./ay monitor 30 &
```

### NO-GO Verdict ❌

```
╔═══════════════════════════════════════════════╗
║  ■ NO-GO VERDICT - Solution Not Validated
║  Solution: Production Readiness
║  Success Rate: 60%
║  Reason: 3 of 4 tests passed
╚═══════════════════════════════════════════════╝

STATUS: SOLUTION NOT VALIDATED

Recommendation:
  ✗ Not ready for deployment
  • Retry with: ./ay orchestrate
  • Check logs: cat .ay-validate/test_results.json
```

## Usage Examples

### Example 1: Auto-Validate Circle Equity

```bash
./ay validate auto "Circle Equity Balance"

# Automatically:
# 1. Determines test modes (4 modes, ~50-85m)
# 2. Executes improve:quick:2
# 3. Tunes multipliers
# 4. Runs 2 WSJF iterations
# 5. Validates with quick backtest
# 6. Runs test suite
# 7. Shows GO or NO-GO verdict
```

### Example 2: Interactive Validation

```bash
./ay validate interactive

# Presents 5 solution options:
# 1. Circle Equity Balance
# 2. Learning Baseline
# 3. WSJF Optimization
# 4. Production Readiness
# 5. Custom Solution
#
# Then follows same flow as auto-validate
```

### Example 3: Full Validation

```bash
./ay validate full "Production Readiness"

# More comprehensive testing
# (future enhancement for extended test modes)
```

## Progress Indicators

### Progress Bar

```
Progress: ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1/4
```

- Filled blocks (▓) = completed modes
- Empty blocks (░) = remaining modes
- Shows current/total count

### Test Status Icons

```
✓   Test passed
✗   Test failed
[TEST]   Test category
[PHASE]  Major phase
•   Information
```

### Color Coding

```
GREEN    Success, passed tests, GO verdict
RED      Failed tests, NO-GO verdict
YELLOW   Test category header
CYAN     Phase headers, information
MAGENTA  Mode execution
BLUE     Banners and sections
```

## Test Modes Details

### Mode 1: Quick Improvement (5-10 min)
```
improve:quick:2

• 2 quick improvement cycles
• ~5-10 minutes total
• Builds initial data
• Low resource usage
```

### Mode 2: Multiplier Tuning (5 min)
```
wsjf-iterate:tune

• Calculates from observations
• Validates against data
• Saves to .metrics/
• Prepares for iterations
```

### Mode 3: WSJF Iterations (10 min)
```
wsjf-iterate:iterate:2

• 2 iterations with tuned multipliers
• Tests multiplier effectiveness
• Generates test data
• ~10 minutes total
```

### Mode 4: Quick Backtest (30-60 min)
```
backtest:quick

• 100K episode validation
• Tests success rate
• Captures metrics
• Longest single mode
```

## Output Files

### Test Results
```
.ay-validate/test_results.json

{
  "timestamp": "2026-01-12T21:18:05Z",
  "solution": "Circle Equity Balance",
  "tests_passed": 4,
  "tests_total": 4,
  "success_rate": 75,
  "compliance": 90,
  "verdict": "GO"
}
```

### Metrics
```
.metrics/multipliers/latest.json       Tuned multipliers
.metrics/backtest/summary.json         Backtest results
```

## Common Workflows

### Workflow 1: Quick Solution Check
```bash
./ay validate auto "Solution Name"
# Time: ~50-85 minutes
# Tests: 4 critical tests
# Verdict: GO or NO-GO
```

### Workflow 2: Production Readiness
```bash
./ay orchestrate                       # Improve system first
./ay validate auto "Production"        # Then validate
./ay prod-cycle --balance 10           # Deploy if GO
```

### Workflow 3: Iterative Development
```bash
./ay validate auto "Change 1"          # Test change
# Get NO-GO → need more work
./ay orchestrate                       # Improve
./ay validate auto "Change 1"          # Retest
# Get GO → ready to deploy
```

## Minimum Cycles for Resolution

| Action | Test Modes | Time | Result |
|---|---|---|---|
| **Quick Check** | 4 modes | 50-85m | GO/NO-GO verdict |
| **Iterate & Test** | 4 modes × N | 50-85m × N | Final verdict |
| **Full Validation** | Extended | 2-3h | Complete sign-off |

## Interpretation Guide

### GO Verdict Means:
✅ All tests passed
✅ Success rate ≥70%
✅ Multipliers tuned
✅ Compliance ≥85%
✅ Circles balanced
✅ Ready for deployment

### NO-GO Verdict Means:
❌ One or more tests failed
❌ Likely issue with:
  - Low success rate
  - Multiplier issues
  - Non-compliant system
  - Circle imbalance
❌ Needs more iteration

## Recovery from NO-GO

If you get a NO-GO verdict:

**Step 1: Review Results**
```bash
cat .ay-validate/test_results.json | jq .
```

**Step 2: Improve System**
```bash
./ay orchestrate              # Run automatic improvement
# or
./ay orchestrate interactive  # Choose workflow
```

**Step 3: Re-validate**
```bash
./ay validate auto "Your Solution"
```

**Step 4: If Still NO-GO**
```bash
# Run longer validation cycle
./ay orchestrate interactive  # Select #3 (Full validation)
./ay validate full "Your Solution"
```

## Advanced Usage

### Custom Solution Testing
```bash
./ay validate interactive
# Select option 5
# Enter: "My Custom Solution"
# Follows same 4-mode test sequence
```

### Automated Testing in CI/CD
```bash
#!/bin/bash
if ./ay validate auto "Production"; then
  ./ay prod-cycle --balance 10
  exit 0
else
  echo "Solution validation failed"
  exit 1
fi
```

### Batch Solution Validation
```bash
solutions=("Equity" "Baseline" "WSJF" "Production")
for solution in "${solutions[@]}"; do
  ./ay validate auto "$solution" || echo "Failed: $solution"
done
```

## Key Features

✅ **Minimum Test Modes** - 4 modes to validate
✅ **Clear Verdicts** - GO or NO-GO decision
✅ **Comprehensive Testing** - 4 critical tests
✅ **Progress UI** - Real-time progress bars
✅ **Color-Coded Results** - Easy to scan
✅ **JSON Export** - Machine-readable results
✅ **Actionable Recommendations** - Next steps
✅ **Error Tolerance** - Handles failures gracefully

## Thresholds Reference

| Criterion | Threshold | Purpose |
|---|---|---|
| Success Rate | ≥70% | Overall system performance |
| Compliance | ≥85% | DoR/DoD adherence |
| Circle Balance | ≤40% per circle | Fair distribution |
| Multipliers | Existence | Optimization applied |

## Troubleshooting

### Issue: "Scripts not found"
```bash
chmod +x ./scripts/ay-*.sh
ls -la ./scripts/ay-validate.sh
```

### Issue: Test fails immediately
```bash
# Check prerequisites
cat .metrics/backtest/summary.json
cat .metrics/multipliers/latest.json

# Run orchestration first
./ay orchestrate
./ay validate auto "Solution"
```

### Issue: Validation takes too long
```bash
# Minimum time is ~50-85 minutes
# This includes:
# - 2 quick improve cycles: 5-10m
# - Multiplier tuning: 5m
# - 2 WSJF iterations: 10m
# - 100K backtest: 30-60m

# To speed up, run orchestrate first
./ay orchestrate  # Pre-loads data
./ay validate auto "Solution"  # Shorter test
```

## Quick Reference

```bash
# Auto-validate (recommended)
./ay validate auto "Solution Name"

# Interactive selection
./ay validate interactive

# Full validation
./ay validate full "Solution Name"

# Check results
cat .ay-validate/test_results.json

# View metrics
jq . .metrics/multipliers/latest.json
jq . .metrics/backtest/summary.json

# Redeploy after validation
./ay prod-cycle --balance 10
```

## See Also

- `./docs/AY_ORCHESTRATE.md` - Orchestration guide
- `./docs/AY_INTEGRATION.md` - Individual commands
- `./ay --help` - Main command help
- `.ay-validate/test_results.json` - Test results
