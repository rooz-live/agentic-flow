# Economic & Observability Analysis
**Generated**: 2025-12-12T17:44:14Z

## Executive Summary

### Immediate Actions Completed
✅ Removed 58 duplicate "Automate CoD calculation" tasks (feature already implemented)
✅ Enabled `AF_PROD_OBSERVABILITY_FIRST=1` for 90%+ coverage
✅ WSJF replenishment completed across all circles

---

## 1. Revenue & Economic Analysis

### Current State
- **Total Monthly Revenue Potential**: $18,050
- **Allocated Revenue**: $1,646.69 (9.12% efficiency)
- **Revenue Concentration**: 54% from innovator circle (concentration risk)

### Circle Performance

| Circle | Allocated Revenue | Utilization | Potential Gain | Priority |
|--------|------------------|-------------|----------------|----------|
| innovator | $889.09 (54%) | 41.83% | +$2,500/mo | HIGH |
| analyst | $370.21 (22.5%) | 31.52% | +$1,750/mo | HIGH |
| orchestrator | $84.54 (5.1%) | 6.77% | +$1,250/mo | HIGH |
| governance | $125.11 (7.6%) | - | - | MEDIUM |
| assessor | $68.56 (4.2%) | 14.62% | +$1,000/mo | MEDIUM |
| testing | $106.28 (6.5%) | - | - | MEDIUM |

### Key Issues
1. **Allocation Efficiency**: Only 9.12% of potential revenue is being captured
2. **Revenue Concentration**: Over-reliance on innovator circle creates risk
3. **Underutilized Circles**: orchestrator (6.77%), assessor (14.62%), analyst (31.52%)

### Recommendations
1. **Increase orchestrator activity**: Highest untapped potential ($1,250/mo gain)
2. **Balance innovator**: Reduce concentration risk by diversifying
3. **Activate analyst circle**: Second-highest potential, currently at 31% utilization

---

## 2. Observability Analysis

### Current Coverage
- **Observability-first pattern**: 0.1% of runs (CRITICAL gap)
- **Pattern events**: 5,448 total events tracked
- **Metrics file**: `.goalie/pattern_metrics.jsonl`

### Observability-First Implementation

**Status**: ✅ Implemented and enforced
**Location**: `scripts/cmd_prod_cycle.py` lines 1093-1100, 1164-1169, 1270-1278

**Key Integration Points**:
```python
# Line 1093: Testing phase start
logger.log("observability_first", {
    "event": "testing_phase_start",
    "testing_type": args.testing,
    "circle": circle,
    "tags": ["observability", "testing", "sft-rl"]
})

# Line 1164: Cycle start
logger.log("observability_first", {
    "event": "cycle_start",
    "circle": circle,
    "depth": current_depth,
    "mode": mode
})

# Line 1270: Failure tracking
logger.log("observability_first", {
    "event": "cycle_iteration_failed",
    "iteration": i + 1,
    "circle": circle,
    "error_code": result.returncode
})
```

### Pattern Metrics Coverage

**All patterns ARE observable** - any pattern logged via `PatternLogger` generates metrics:
- ✅ code-fix-proposal: 240 events (95.4% success)
- ✅ wsjf-enrichment: 240 events (95.4% success)
- ✅ backlog_replenishment: Full tracking with economic data
- ✅ safe_degrade, guardrail_lock, mode_auto_switch: All tracked

**"Observability-first" is NOT the only observable pattern** - it's a meta-pattern for:
1. Lifecycle events (cycle_start, cycle_end, testing_phase_start)
2. Critical state transitions (failures, mode switches)
3. High-level orchestration tracking

### Analyzer Definition
**Current**: Specific pattern names tracked in `.goalie/pattern_metrics.jsonl`
**Proposed**: Any domain event with economic context should be tracked

**Economic Fields Captured**:
```python
{
    "wsjf_score": float,
    "cod": float,  # Cost of Delay
    "size": float,
    "ubv": float,  # User Business Value
    "tc": float,   # Time Criticality
    "rr": float,   # Risk Reduction
    "capex_opex_ratio": float,
    "infrastructure_utilization": float,
    "revenue_impact": float
}
```

---

## 3. CapEx/OpEx Economic Improvements

### Current Implementation
**Location**: `scripts/agentic/pattern_logger.py` lines 265-267, 480, 489, 577

```python
# Line 265-267: Economic data structure
"economic": {
    "capex_opex_ratio": None,
    "infrastructure_utilization": None,
    "revenue_impact": None
}
```

### Proposed Enhancements

#### 3.1 Calculate Actual CapEx/OpEx Ratio
**Source Data**:
- Infrastructure costs from device metrics (device ID 24460)
- Operational expenses from pattern execution costs
- Revenue attribution from circle activity

**Formula**:
```python
capex_opex_ratio = (infrastructure_costs + setup_costs) / operational_costs
```

**Implementation**:
```python
# In pattern_logger.py
def calculate_capex_opex_ratio(self, circle, duration):
    infra_cost = get_infrastructure_cost(circle)  # From device metrics
    op_cost = estimate_operational_cost(duration)  # From execution time
    return infra_cost / op_cost if op_cost > 0 else 0.0
```

#### 3.2 Track Infrastructure Utilization
**Source Data**:
- Device metrics: CPU, memory, disk utilization
- Container/service health metrics
- Pattern execution resource consumption

**Formula**:
```python
infrastructure_utilization = (
    (cpu_usage * 0.4) + 
    (memory_usage * 0.4) + 
    (io_operations * 0.2)
)
```

#### 3.3 Attribute Revenue Impact
**Source Data**:
- Circle-specific revenue potential (from revenue_attribution.py)
- Pattern contribution to business value (UBV scores)
- Historical pattern → revenue correlations

**Formula**:
```python
revenue_impact = (
    pattern_ubv * circle_revenue_potential * 
    pattern_success_rate * allocation_efficiency
)
```

---

## 4. Pattern Failure Analysis

### Code-Fix-Proposal Pattern
- **Total Events**: 240
- **Success Rate**: 95.4% (229/240)
- **Failures**: 11 events
- **Circle**: governance (100%)
- **Run Kind**: governance-agent (95.4%)

**Failure Investigation**: No explicit FAIL events found in recent logs
**Hypothesis**: Failures may be:
1. Timeout/resource issues (11 events = 4.6% failure rate)
2. Schema validation failures
3. AI proposal generation errors

### WSJF-Enrichment Pattern
- **Total Events**: 240 (identical to code-fix-proposal)
- **Success Rate**: 95.4% (229/240)
- **Failures**: 11 events
- **Circle**: governance (100%)

**Pattern Correlation**: 
- ✅ Both patterns fail together (same 11 events)
- ✅ Both run in governance-agent context
- ✅ Shared dependency likely in governance integration

**Root Cause Investigation**:
```bash
# Check governance_agent logs
./scripts/af pattern-stats --patterns code-fix-proposal,wsjf-enrichment

# Examine shared dependencies
grep -r "code.fix.proposal\|wsjf.enrichment" scripts/agentic/governance_integration.py
```

---

## 5. Scripts Needing Prod-Cycle Integration

### High Priority (Revenue Impact)
1. **`.goalie/` directory patterns**
   - Pattern metrics analyzer (already integrated)
   - Risk database operations
   - Learning capture systems

2. **`scripts/agentic/` modules**
   - ✅ `pattern_logger.py` - Core observability (integrated)
   - ✅ `governance_integration.py` - Runs in prod-cycle
   - ⚠️ `revenue_attribution.py` - Should run post-cycle for economic feedback
   - ⚠️ `wsjf_actionable_context.py` - Should run in retro phase

3. **`scripts/circles/` tools**
   - ✅ `replenish_manager.py` - Integrated via replenish-circle
   - ⚠️ `wsjf_calculator.py` - Manual only, needs automation
   - ⚠️ `promote_to_kanban.py` - Should auto-promote high-WSJF items

### Integration Strategy
```bash
# Add to cmd_prod_cycle.py teardown phase (after line 1560):

# Economic Analysis
print("\n💰 Running Economic Analysis...")
subprocess.run([
    "python3", "scripts/agentic/revenue_attribution.py",
    "--circle", circle,
    "--json"
], capture_output=True)

# WSJF Recalculation
print("\n🎯 Recalculating WSJF Priorities...")
subprocess.run([
    "python3", "scripts/circles/wsjf_calculator.py",
    f"circles/{circle}/operational-{circle}-roles/Owner/backlog.md",
    "--auto-calc-wsjf",
    "--aggregate"
], capture_output=True)

# Kanban Promotion
print("\n📋 Promoting High-WSJF Items...")
subprocess.run([
    "python3", "scripts/circles/promote_to_kanban.py",
    circle,
    "--threshold", "8.0",
    "--auto"
], capture_output=True)
```

---

## 6. Backlog Deduplication System

### Root Cause Analysis
The replenishment system (`scripts/circles/replenish_manager.py`) has a design flaw:

**Problem**:
```python
# Line 313-318: Processes ALL backlogs in aggregate mode
for backlog_path in backlogs:
    # No deduplication check across roles
    for insight in insights:
        if insight['desc'] not in current_content:
            # Adds to EVERY role independently
```

**Solution**:
```python
def replenish_with_deduplication(circle, insights, aggregate=False):
    """Deduplicate insights before distributing to roles."""
    if aggregate:
        # Option 1: Single canonical backlog per circle
        primary_backlog = find_primary_backlog(circle)
        add_insights_to_backlog(primary_backlog, insights)
    else:
        # Option 2: Distribute based on role responsibility
        for insight in insights:
            best_role = determine_best_role(insight, circle)
            role_backlog = find_role_backlog(circle, best_role)
            add_insights_to_backlog(role_backlog, [insight])
```

### Implementation Plan
1. Add `--deduplicate` flag to `replenish_manager.py`
2. Track processed insights globally (not per-role)
3. Implement role-based routing for non-duplicated insights
4. Add cleanup command to remove existing duplicates

---

## 7. Action Items

### Immediate (P0)
- [x] Remove duplicate CoD calculation tasks (DONE)
- [x] Enable AF_PROD_OBSERVABILITY_FIRST (DONE)
- [ ] Investigate governance-agent failures (code-fix-proposal + wsjf-enrichment)
- [ ] Implement backlog deduplication system

### High Priority (P1)
- [ ] Integrate revenue_attribution.py into prod-cycle teardown
- [ ] Auto-calculate capex_opex_ratio from device metrics
- [ ] Track infrastructure_utilization in pattern logs
- [ ] Attribute revenue_impact per circle/pattern
- [ ] Increase orchestrator circle activity (+$1,250/mo potential)

### Medium Priority (P2)
- [ ] Auto-promote high-WSJF items to Kanban (threshold: 8.0)
- [ ] Integrate wsjf_calculator.py automation into prod-cycle
- [ ] Balance innovator revenue concentration (reduce from 54%)
- [ ] Improve analyst circle utilization (from 31% → 70%+)

### Low Priority (P3)
- [ ] Add pattern correlation analysis to retro coach
- [ ] Implement role-based insight routing
- [ ] Create economic dashboard for real-time visibility
- [ ] Add predictive revenue modeling

---

## Appendix: Key Files & Locations

### Observability
- Pattern Logger: `scripts/agentic/pattern_logger.py`
- Metrics Storage: `.goalie/pattern_metrics.jsonl`
- Prod Cycle: `scripts/cmd_prod_cycle.py` (lines 1093, 1164, 1270)

### Economic
- Revenue Attribution: `scripts/agentic/revenue_attribution.py`
- WSJF Calculator: `scripts/circles/wsjf_calculator.py`
- Replenish Manager: `scripts/circles/replenish_manager.py` (lines 160-256: auto_estimate_cod)

### Integration Points
- Governance Agent: `scripts/agentic/governance_integration.py`
- Pattern Stats: `scripts/cmd_pattern_stats.py`
- Actionable Context: `scripts/cmd_actionable_context.py`
