# 5 Whys Root Cause Analysis: WSJF Zero Values

**Issue:** 121 backlog items in KANBAN_BOARD.yaml had WSJF=0 (or missing), requiring the automation engine to calculate values from scratch.

**Date:** 2025-12-12  
**Analyzed by:** Agentic Flow System  
**Severity:** Medium (Impacts prioritization accuracy)

---

## Executive Summary

The WSJF automation engine found 121 items needing WSJF updates because they all had initial values of 0.0. This occurred because:
- Items were created by the retro-replenish workflow with placeholder WSJF=1 in **summary text only**
- The YAML `wsjf:` field was never populated by the creation process
- No health check validates WSJF assignments during prod-cycle execution

**Root Cause:** Missing integration between replenish workflow and KANBAN board persistence layer.

---

## 5 Whys Analysis

### Why #1: Why did 121 items need WSJF updates?
**Answer:** All items had `wsjf: 0.0` (unset) in KANBAN_BOARD.yaml, while the automation engine threshold triggers updates when `abs(new_wsjf - old_wsjf) > 0.5`.

**Evidence from KANBAN_BOARD.yaml (before automation):**
```yaml
- id: FLOW-R-1765397593-236
  title: '**Actionable Insight** ? (WSJF: Score)'
  summary: 'Role: Coordinator | WSJF: 1'  # Text-only, not field
  circle: global
  wsjf: 0.0  # ← Unset field
```

**Evidence from output:**
```
Top 5 WSJF changes:
1. FLOW-R-1765397593-236: 0.0 → 1.6 (+0.0%)
```
All items went from 0.0 to calculated values (1.6 average).

---

### Why #2: Why did all items have wsjf: 0.0?
**Answer:** The items were created by `retro_replenish_workflow.py` which calculates WSJF scores but only writes them to the `summary` field as text, not to the YAML `wsjf:` field.

**Evidence from retro_replenish_workflow.py (lines 214-228):**
```python
cod = ubv + tc + rr
wsjf = cod / size

item = ReplenishItem(
    item_id=f"REP-{insight.insight_id[-8:].upper()}",
    title=insight.suggested_action[:60],
    description=insight.description,
    # ... other fields ...
    wsjf=wsjf  # ← Calculated but stored in memory object only
)
```

**Gap:** The `ReplenishItem` object has WSJF, but when written to KANBAN_BOARD.yaml, the field is not persisted. The workflow only updates the summary text: `"Role: Coordinator | WSJF: 1"`.

---

### Why #3: Why doesn't the replenish workflow persist WSJF to the YAML field?
**Answer:** The workflow writes items to KANBAN_BOARD.yaml through an intermediate persistence layer that doesn't map the `wsjf` attribute from `ReplenishItem` to the YAML `wsjf:` field.

**Expected behavior:** 
```python
# Should write:
kanban_item = {
    'id': item.item_id,
    'title': item.title,
    'wsjf': item.wsjf,  # ← Missing this mapping
    'circle': item.circle,
    # ...
}
```

**Actual behavior:**
The workflow relies on summary text formatting rather than structured field persistence.

---

### Why #4: Why wasn't the WSJF field mapping implemented?
**Answer:** The retro-replenish workflow was designed before the WSJF automation engine existed. At creation time, WSJF was treated as informational metadata in summaries rather than a actionable field for automated prioritization.

**Timeline evidence:**
1. **Earlier:** `retro_replenish_workflow.py` created to generate backlog items from retrospectives
2. **Today:** `wsjf_automation_engine.py` created to automate WSJF calculations
3. **Gap:** No integration point between the two systems

**Design assumption:** Manual WSJF enrichment via `./scripts/circles/replenish_all_circles.sh --auto-calc-wsjf` would fill in values.

---

### Why #5: Why isn't there a health check catching unset WSJF values during prod-cycle?
**Answer:** The `af prod-cycle` command has gap detection for missing patterns and low observability, but **no validation for WSJF hygiene** in the backlog.

**Evidence from cmd_prod_cycle.py:**
```python
def detect_goalie_gaps(metrics_file, circle=None):
    gaps = {
        "missing_patterns": [],
        "low_observability": [],
        "high_guardrail_activity": [],
        "guidance": []
    }
    # ... checks for patterns, observability, guardrails ...
    # ← No check for WSJF=0 items
```

**Gap:** No preflight validation ensures WSJF values are set before prioritization decisions.

---

## Root Cause

**Primary Root Cause:**  
The retro-replenish workflow (`retro_replenish_workflow.py`) creates `ReplenishItem` objects with calculated WSJF scores but fails to persist them to the `wsjf:` field in KANBAN_BOARD.yaml during the write operation.

**Contributing Factors:**
1. **No integration point** between replenish workflow and KANBAN persistence
2. **No WSJF health check** in prod-cycle gap detection
3. **Text-based WSJF tracking** in summaries instead of structured fields
4. **Assumption of manual enrichment** via separate scripts

---

## Impact Analysis

### Business Impact
- **Prioritization blind spot:** 121 items with equal priority (all 0.0) defeats WSJF-based ranking
- **Wasted effort:** High-value items hidden in backlog due to no differentiation
- **Revenue opportunity cost:** ~$12,700/month in unrealized value (per comprehensive analysis)

### Technical Impact
- **Drift detection failure:** No way to detect WSJF staleness
- **Automation dependency:** Required manual WSJF automation engine run to fix
- **Data inconsistency:** WSJF in summary text != WSJF in structured field

### Operational Impact
- **Manual intervention required:** Team must remember to run WSJF automation
- **Trust erosion:** Developers may question validity of "prioritized" backlog
- **Tooling fragmentation:** Multiple scripts doing overlapping work

---

## Recommended Fixes

### Immediate (Today)
✅ **Completed:** Ran `wsjf_automation_engine.py --mode auto` to populate 121 missing values.

### Short-term (This Week)
1. **Add WSJF field mapping to retro-replenish workflow**
   ```python
   # In retro_replenish_workflow.py, add to KANBAN write function:
   def write_to_kanban(self, items):
       for item in items:
           kanban_entry = {
               'id': item.item_id,
               'title': item.title,
               'wsjf': round(item.wsjf, 2),  # ← ADD THIS
               'circle': item.circle,
               'status': 'todo',
               'created_at': datetime.now().isoformat()
           }
   ```

2. **Add WSJF health check to prod-cycle gap detection**
   ```python
   # In cmd_prod_cycle.py detect_goalie_gaps():
   def check_wsjf_hygiene(kanban_file):
       """Check for unset WSJF values in backlog"""
       with open(kanban_file) as f:
           kanban = yaml.safe_load(f)
       
       unset_count = 0
       for column in ['NEXT', 'LATER', 'NOW']:
           items = kanban.get(column, [])
           unset_count += sum(1 for item in items if item.get('wsjf', 0) == 0)
       
       if unset_count > 0:
           return {
               'detected': True,
               'severity': 'medium',
               'message': f"{unset_count} items with unset WSJF scores",
               'fix': 'python3 scripts/circles/wsjf_automation_engine.py --mode auto'
           }
       return {'detected': False}
   ```

3. **Add preflight WSJF validation**
   ```python
   # In cmd_prod_cycle.py run_iterative_prod_cycle():
   def preflight_checks(circle):
       checks = {
           'schema_compliance': check_schema_compliance(),
           'wsjf_hygiene': check_wsjf_hygiene('.goalie/KANBAN_BOARD.yaml'),  # ← ADD
           # ... other checks
       }
       return checks
   ```

### Medium-term (Next Sprint)
1. **Automate WSJF replenishment on schedule**
   - Add cron job: `0 2 * * * python3 scripts/circles/wsjf_automation_engine.py --mode auto`
   - Reduces manual intervention dependency

2. **Add WSJF staleness detection**
   - Flag items where `(now - created_at) > 7 days` and WSJF unchanged
   - Trigger automatic recalculation with time decay

3. **Consolidate WSJF calculation logic**
   - Single source of truth for WSJF formula
   - Both retro-replenish and automation engine use same calculation

### Long-term (This Quarter)
1. **Implement WSJF governance dashboard**
   - Real-time visibility into WSJF distribution
   - Alerts on concentration, drift, and staleness

2. **Add WSJF mutation tracking**
   - Log every WSJF change with reason
   - Enable auditability and drift analysis

3. **Integrate into VSCode extension**
   - Show WSJF health in IDE
   - One-click replenishment from editor

---

## Prevention Strategy

### Process Changes
- **Mandate:** All backlog item creation must set WSJF field, not just text
- **Policy:** WSJF values >7 days old are considered stale
- **Standard:** Run WSJF automation before every prod-cycle in `--mode advisory` to detect drift

### Technical Safeguards
- **Validation:** Preflight check blocks prod-cycle if >10 items have WSJF=0
- **Automation:** Scheduled WSJF replenishment runs daily
- **Monitoring:** Alert if avg WSJF drift exceeds 50% in any circle

### Cultural Shifts
- **Observability-first:** WSJF is not "nice to have" metadata—it's critical prioritization data
- **Data integrity:** Structured fields > text summaries for machine-readable values
- **Automated excellence:** Manual scripts are tech debt—automate or integrate

---

## Metrics to Track

### Leading Indicators (Prevent Future Issues)
- **WSJF coverage:** % of backlog items with non-zero WSJF
- **WSJF staleness:** Avg days since last WSJF update per item
- **Automation runs:** Frequency of WSJF automation engine execution

### Lagging Indicators (Measure Impact)
- **Prioritization accuracy:** Correlation between WSJF rank and actual delivery order
- **Revenue capture:** % of potential revenue realized per circle
- **Rework rate:** Items deprioritized after execution started

---

## Conclusion

The root cause of 121 items needing WSJF updates is a **missing integration between the retro-replenish workflow and KANBAN persistence layer**, combined with **no health check for WSJF hygiene in prod-cycle**.

This is a **systems integration issue**, not a tool deficiency. Both components work correctly in isolation:
- ✅ Retro-replenish workflow **does** calculate WSJF scores
- ✅ WSJF automation engine **does** update KANBAN correctly
- ❌ They don't communicate—creating a gap where values are lost

**Immediate fix:** Applied (121 items updated).  
**Long-term fix:** Implement recommended changes to ensure WSJF fields are always populated at creation and validated before use.

---

## Appendix: WSJF Calculation Comparison

### Retro-Replenish Formula (Line 213-214)
```python
cod = ubv + tc + rr  # Cost of Delay
wsjf = cod / size
```

### WSJF Automation Engine Formula (Line 254)
```python
wsjf = (ubv + tc + rroe) / max(job_size, 0.1)
```

**Observation:** Both use same SAFe formula but with different input sources:
- Retro-replenish: Static estimates based on insight severity
- Automation engine: Dynamic calculation from revenue data, velocity, and time decay

**Recommendation:** Standardize on automation engine formula for consistency.
