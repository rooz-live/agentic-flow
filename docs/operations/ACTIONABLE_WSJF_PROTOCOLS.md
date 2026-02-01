# Actionable WSJF Protocols: Incremental Relentless Execution

## Overview

Enhanced WSJF (Weighted Shortest Job First) protocols with **actionable context**, **forward/backtesting strategies**, and a comprehensive **admin/user panel UI/UX** for managing agentic flow production cycles.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Admin Panel UI (Port 8896)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Circle      │  │ Actionable   │  │ Testing Strategy │   │
│  │ Health      │  │ Recommenda-  │  │ • Forward Test   │   │
│  │ Dashboard   │  │ tions (WSJF) │  │ • Backtest      │   │
│  └─────────────┘  └──────────────┘  │ • Milestones    │   │
│                                       └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Actionable Context Engine                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Input: pattern_metrics.jsonl, baseline_metrics.json   │ │
│  │ Process: Identify opportunities → Calculate WSJF →   │ │
│  │          Generate strategies → Forward/Backtest       │ │
│  │ Output: Prioritized actionable recommendations       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Production Cycle Execution                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Pre-flight   │→ │ Replenishment │→ │ Iterative Cycles │  │
│  │ Validation   │  │ (WSJF calc)   │  │ (3-5 iterations) │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Actionable Context Engine (`cmd_actionable_context.py`)

Generates context-rich, execution-ready recommendations.

**Features:**
- **WSJF-driven prioritization** (CoD = UBV + TC + RR / Size)
- **Actionable context** with execution strategies
- **Forward testing** (advisory mode dry-run)
- **Backtesting** (baseline comparison)
- **Incremental milestones** (checkpoint-based execution)
- **Risk assessment** & blocker identification
- **Next command generation** (copy-paste ready)

**Usage:**
```bash
# Generate recommendations
python3 scripts/cmd_actionable_context.py

# Output saved to .goalie/actionable_recommendations.json
```

**Sample Output:**
```
🎯 ACTIONABLE RECOMMENDATIONS (WSJF-Prioritized)
═══════════════════════════════════════════════
#1 [IMMEDIATE] Resolve safe_degrade bottleneck
───────────────────────────────────────────────
ID:           ACT-1733941231-ASS
Circle:       assessor
WSJF Score:   15.0 (CoD: 45 / Size: 3)
Risk Level:   HIGH
Duration:     30min - 1h

🎬 EXECUTION STRATEGY:
   Execute in single focused sprint with feature flag protection

📋 SUCCESS CRITERIA:
   ✓ Bottleneck pattern count reduced by 80%
   ✓ No new safe_degrade triggers
   ✓ Action completion rate > 90%

🔄 INCREMENTAL MILESTONES:
   1. Pre-flight Validation (5min)
   2. Execute change (15min)
   3. Post-flight verification (10min)

🧪 TESTING STRATEGY:
   Forward Test: af prod-cycle 1 --circle assessor --mode advisory
   Backtest:     Compare 4 metrics vs baseline

▶️  NEXT COMMAND:
   af prod-cycle 1 --circle assessor --mode mutate
```

### 2. Admin Panel UI (`tools/dashboard/admin_panel.html`)

Modern, dark-themed admin interface for managing agentic flow cycles.

**Features:**
- **Real-time system metrics** (Pattern events, test pass rate, action completion, CPU idle)
- **Circle health dashboard** with color-coded health scores
- **WSJF-prioritized actionable recommendations**
- **Interactive testing strategies:**
  - **Forward Test** tab: Simulation/dry-run with progress tracking
  - **Backtest** tab: Historical baseline comparison
  - **Milestones** tab: Visual timeline with checkpoint tracking
- **One-click execution** of recommendations
- **Live progress indicators** and terminal output
- **Responsive design** for desktop/tablet viewing

**Launch:**
```bash
# Open admin panel in browser
./scripts/launch_admin_panel.sh

# Or manually:
open tools/dashboard/admin_panel.html
```

**UI Components:**

| Component | Description |
|-----------|-------------|
| **Header** | System status, current cycle, overall WSJF score |
| **Sidebar** | Circle health list (scores 40-55), quick action buttons |
| **Metrics Grid** | Key metrics with trend indicators (↑/↓) |
| **Recommendations Panel** | WSJF-sorted action items with full context |
| **Testing Strategy Panel** | Three-tab interface for execution validation |
| **Terminal View** | Live command output simulation |
| **Milestone Timeline** | Visual progress through incremental checkpoints |

### 3. Enhanced `af prod-cycle` Command

Updated production cycle with integrated actionable context.

**Improvements:**
1. **Pre-cycle replenishment** (default ON) with WSJF auto-calc
2. **Pre-flight validation** (schema, governance risk, critical patterns)
3. **Governance agent integration** (automated risk scoring)
4. **Post-cycle retro coach** (automated retrospective analysis)
5. **Actionable recommendations generation** (automatic on completion)

**Workflow:**
```bash
# Standard run (replenishment enabled by default)
af prod-cycle 5 --circle innovator

# Internally executes:
# 1. Pre-flight checks (schema, governance, patterns)
# 2. Governance agent analysis
# 3. WSJF replenishment: af replenish-circle innovator --auto-calc-wsjf
# 4. Iterative cycles (5 iterations max, early stop on stability)
# 5. Retro coach analysis
# 6. Actionable recommendations generation

# Skip replenishment
af prod-cycle 5 --circle innovator --no-replenish

# Advisory mode (no mutations)
af prod-cycle 1 --circle innovator --mode advisory
```

## Method Pattern: Incremental Relentless Execution

### WSJF Calculation

**Formula:**
```
CoD = User-Business Value + Time Criticality + Risk Reduction
WSJF = CoD / Job Size
```

**Action Types:**
- **IMMEDIATE** (WSJF ≥ 15): Execute in single sprint, feature-flagged
- **INCREMENTAL** (WSJF ≥ 10): Break into 3-5 checkpoints, validate each
- **EXPERIMENTAL** (WSJF ≥ 5): Isolated environment, A/B testing
- **DEFERRED** (WSJF < 5): Schedule for next cycle

### Forward Testing Strategy

**Purpose:** Validate changes before production execution

```bash
# Step 1: Advisory mode dry-run
af prod-cycle 1 --circle {circle} --mode advisory

# Step 2: Validation checks
# - Schema compliance: All pattern events valid?
# - Governance risk: Score < 50?
# - Safe degrade: No triggers?

# Step 3: Success threshold check
# - Pass rate ≥ 90% → Proceed to mutate mode
# - Pass rate < 90% → Debug and retry
```

### Backtesting Strategy

**Purpose:** Compare against historical baseline

**Metrics Compared:**
1. **Pattern count** (regression if < -5%)
2. **Action completion rate** (regression if < -5%)
3. **Test pass rate** (regression if < -2%)
4. **System load** (regression if > +10%)

**Baseline File:** `.goalie/BASELINE_METRICS.json`

### Incremental Milestones

**Checkpoint-based execution** with validation at each stage:

**For IMMEDIATE actions (30min - 1h):**
1. Pre-flight validation (5min)
2. Execute change (15min)
3. Post-flight verification (10min)

**For INCREMENTAL actions (2-4h):**
1. Checkpoint 1: Setup & validation (30min)
2. Checkpoint 2: Core implementation (2h)
3. Checkpoint 3: Integration testing (1h)
4. Checkpoint 4: Performance validation (30min)
5. Checkpoint 5: Deployment & monitoring (1h)

**For EXPERIMENTAL actions (1-2 days):**
1. Experiment design (1h)
2. Controlled execution (4h)
3. Results analysis (2h)

## Integration Points

### With Circle Replenishment

```bash
# Manual replenishment (all circles)
for circle in orchestrator innovator analyst assessor seeker intuitive; do
  af replenish-circle $circle --auto-calc-wsjf --aggregate
done

# Or use the unified script (if available)
./scripts/circles/replenish_all_circles.sh --auto-calc-wsjf
```

### With Pattern Metrics

```bash
# View pattern coverage
af pattern-coverage --json

# View WSJF distribution
af wsjf-by-circle --circle innovator
```

### With Governance Agent

```bash
# Run governance analysis
af governance-agent --json

# Check governance risk score
# Score < 50 → Prod-cycle allowed
# Score ≥ 50 → Advisory mode only
```

## Files Modified/Created

### Modified
- `scripts/cmd_prod_cycle.py` - Added actionable context generation call
- `scripts/cmd_actionable_context.py` - Enhanced with WSJF protocols

### Created
- `tools/dashboard/admin_panel.html` - Full-featured admin UI
- `scripts/launch_admin_panel.sh` - Browser launcher
- `docs/ACTIONABLE_WSJF_PROTOCOLS.md` - This documentation

## Configuration

### Environment Variables

```bash
# Enable actionable context generation (default: ON)
export AF_ACTIONABLE_CONTEXT=1

# Enable forward testing before mutate (default: OFF)
export AF_FORWARD_TEST_REQUIRED=1

# Enable backtest comparison (default: ON)
export AF_BACKTEST_ENABLED=1

# Backtest regression threshold (default: 0.05 = 5%)
export AF_BACKTEST_THRESHOLD=0.05

# Checkpoint frequency for incremental execution
export AF_CHECKPOINT_FREQUENCY="after_milestone"  # or "hourly", "every_10min"
```

### WSJF Thresholds

Edit `scripts/cmd_actionable_context.py`:

```python
# Action type thresholds
if wsjf >= 15:
    action_type = "immediate"
elif wsjf >= 10:
    action_type = "incremental"
elif wsjf >= 5:
    action_type = "experimental"
else:
    action_type = "deferred"
```

## Best Practices

### 1. Always Run Forward Test First

```bash
# Test before executing
af prod-cycle 1 --circle innovator --mode advisory

# If successful, execute
af prod-cycle 5 --circle innovator --mode mutate
```

### 2. Review Actionable Recommendations

```bash
# Generate recommendations
python3 scripts/cmd_actionable_context.py

# Review top 3 items, execute in WSJF order
```

### 3. Monitor Admin Panel During Execution

```bash
# Launch panel
./scripts/launch_admin_panel.sh

# Watch real-time progress:
# - Circle health scores
# - Metric trends
# - Testing strategy progress
```

### 4. Use Incremental Execution for High-Risk Items

```bash
# For WSJF ≥ 10 items:
# - Break into checkpoints
# - Validate at each stage
# - Use --no-deploy flag for dry-runs
```

### 5. Maintain Baseline Metrics

```bash
# Update baseline after successful cycles
cp .goalie/pattern_metrics.jsonl .goalie/BASELINE_METRICS.json

# Or use automatic baseline tracking (if enabled)
```

## Troubleshooting

### Issue: Recommendations show "No opportunities"

**Solution:** Check pattern event count:
```bash
wc -l .goalie/pattern_metrics.jsonl
# Need at least 100 events for meaningful analysis
```

### Issue: Forward test always fails

**Solution:** Check pre-flight validation:
```bash
# Run pre-flight manually
af prod-cycle 1 --mode advisory

# Fix issues:
# - Schema compliance → Run validation scripts
# - Governance risk → Reduce recent failures
# - Critical patterns → Resolve safe_degrade triggers
```

### Issue: Admin panel shows outdated data

**Solution:** Refresh metrics:
```bash
# Regenerate recommendations
python3 scripts/cmd_actionable_context.py

# Reload panel in browser (Cmd+R / F5)
```

## Example Workflow

### Complete Cycle 43 (Innovator Focus)

```bash
# Step 1: Launch admin panel
./scripts/launch_admin_panel.sh

# Step 2: Generate recommendations
python3 scripts/cmd_actionable_context.py

# Step 3: Review top recommendation in panel
# → "Train Decision Transformer on pattern data" (WSJF: 2.8)

# Step 4: Forward test (advisory mode)
af prod-cycle 1 --circle innovator --mode advisory

# Step 5: If successful, execute incrementally
af prod-cycle 5 --circle innovator --mode mutate

# Step 6: Monitor progress in admin panel
# → Watch milestones complete
# → Check backtest regression alerts

# Step 7: Post-cycle validation
# → Review retro insights
# → Update BASELINE_METRICS.json
```

## Metrics & Success Criteria

### System Metrics

| Metric | Target | Cycle 42 Actual |
|--------|--------|-----------------|
| Pattern Events | 545 | 666 (121%) ✅ |
| Test Pass Rate | ≥ 95% | 99.6% ✅ |
| Action Completion | ≥ 80% | 14% ❌ |
| CPU Idle | ≥ 35% | 35.5% ✅ |

### Recommendation Effectiveness

| Metric | Target |
|--------|--------|
| WSJF Accuracy | ≥ 85% |
| Forward Test Success | ≥ 90% |
| Backtest Regression Rate | < 5% |
| Execution Time Reduction | 15-20% |

## Future Enhancements

1. **Real-time WebSocket integration** for live updates
2. **Backend API** for actionable context engine
3. **Historical trend charts** in admin panel
4. **AI-powered WSJF prediction** using Decision Transformer
5. **Multi-circle coordination** dashboard
6. **Slack/Discord notifications** for high-WSJF items
7. **Export to GitHub Issues** with WSJF metadata

## References

- Cycle 42 Status: `.goalie/circle_improvement_status.yaml`
- Pattern Metrics: `.goalie/pattern_metrics.jsonl`
- Baseline Metrics: `.goalie/BASELINE_METRICS.json`
- CoD/WSJF Documentation: `docs/patterns/cod-wsjf-prioritization.md`
- Admin Panel Source: `tools/dashboard/admin_panel.html`
