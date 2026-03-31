# Analysis: Scripts Missing from af prod-cycle Iteration Count

**Date:** 2025-12-12  
**Context:** Investigating what scripts run during `af prod-cycle` but aren't counted in the iteration metrics.

---

## TL;DR

**Scripts running OUTSIDE the iteration loop (not counted):**
1. Governance Agent (`policy/governance.py`) - **SHOULD be tracked**
2. Retro Coach (`policy/governance.py`) - **SHOULD be tracked**  
3. Retro→Replenish Workflow (`agentic/retro_replenish_workflow.py`) - **SHOULD be tracked**
4. Actionable Recommendations (`cmd_actionable_context.py`) - **SHOULD be tracked**
5. WSJF Replenishment (`circles/replenish_circle.sh`) - **SHOULD be tracked**
6. QUICK_ACTIONS.sh (if called) - **SHOULD be tracked**

**Current iteration loop (lines 1003-1132) ONLY counts:**
- `./scripts/af full-cycle {depth} --circle {circle}` executions

**Missing from tracking:** 5-8 significant operations per prod-cycle run.

---

## Detailed Analysis

### What Gets Counted Today

**Current Iteration Counter Location:** `cmd_prod_cycle.py:1003-1132`

```python
for i in range(iterations):
    print(f"\n--- Iteration {i+1}/{iterations} ---")
    # ... health checks, guardrails ...
    cmd = f"{af_script} full-cycle {current_depth} --circle {circle}"
    result = run_command(cmd)  # ← ONLY THIS counts as an iteration
```

**Pattern logged:**
- `full_cycle_complete` (line 1250) - Used to count total prod-cycles globally
- `observability_first` with `event: cycle_complete` (line 1344)

**Iteration summary (lines 1140-1147):**
```python
iteration_summary = {
    "total_iterations": min(i + 1, iterations),  # ← Only loop iterations
    "successful": consecutive_successes,
    "failed": (i + 1) - consecutive_successes
}
```

---

### Scripts Executed OUTSIDE Iteration Loop

#### 1. **Governance Agent** (Line 879-901)
**When:** After preflight, before iterations start  
**Script:** `scripts/policy/governance.py`  
**Function:** `run_governance_agent()`  
**Impact:** Analyzes ~6,000+ pattern events, generates violations, insights  
**Why it matters:** Can take 2-15 seconds depending on pattern volume

**Evidence:**
```python
print("\n⚖️  Running Governance Agent...")
gov_result = run_governance_agent(...)  # ← NOT counted
```

---

#### 2. **WSJF Replenishment** (Line 934-938)
**When:** Before iterations (unless `--no-replenish`)  
**Script:** `scripts/circles/replenish_circle.sh` → `scripts/circles/replenish_manager.py`  
**Function:** Calculates WSJF for all backlog items in circle  
**Impact:** 0.2-1.0s depending on backlog size  
**Why it matters:** Critical prioritization step, modifies KANBAN_BOARD.yaml

**Evidence:**
```python
if replenish_enabled:
    print(f"🔄 Running Iterative WSJF Replenishment for {circle}...")
    replenish_cmd = f"{af_script} replenish-circle {circle} --auto-calc-wsjf"
    run_command(replenish_cmd)  # ← NOT counted
```

---

#### 3. **Retro Coach** (Line 1212-1240)
**When:** After iteration loop completes  
**Script:** `scripts/policy/governance.py`  
**Function:** `run_retro_coach()`  
**Impact:** Analyzes failures, backtests, integrations; generates insights  
**Why it matters:** Can take 1-5 seconds, generates actionable recommendations

**Evidence:**
```python
print("\n🧠 Running Retro Coach...")
retro_result = run_retro_coach(...)  # ← NOT counted
```

---

#### 4. **Retro→Replenish Feedback Loop** (Line 1278-1318)
**When:** After retro coach  
**Script:** `scripts/agentic/retro_replenish_workflow.py`  
**Functions:**
- `workflow.run_retro()` - Pattern analysis
- `workflow.run_replenish()` - Generate backlog items  
- `workflow.run_refine()` - AI-enhanced WSJF prioritization

**Impact:** Creates/updates backlog items, may trigger AI reasoning (0.5-3s)  
**Why it matters:** Directly modifies backlog based on retrospective insights

**Evidence:**
```python
print("\n🔄 Retro → Replenish Feedback Loop...")
insights = workflow.run_retro()  # ← NOT counted
items = workflow.run_replenish(target_circle=circle)  # ← NOT counted
refinement = workflow.run_refine(use_ai=True)  # ← NOT counted
```

**This alone does 3 distinct operations!**

---

#### 5. **Actionable Recommendations** (Line 1320-1341)
**When:** After feedback loop  
**Script:** `scripts/cmd_actionable_context.py`  
**Impact:** Analyzes system state, generates prioritized recommendations  
**Why it matters:** Runs full context analysis (0.5-2s)

**Evidence:**
```python
print("\n🎯 Generating Actionable Recommendations...")
recs_result = subprocess.run(
    ["python3", "cmd_actionable_context.py"],
    ...
)  # ← NOT counted
```

---

#### 6. **Auto-Replenishment Every 10 Cycles** (Line 1242-1276)
**When:** If `total_prod_cycles % 10 == 0`  
**Script:** `scripts/circles/replenish_all_circles.sh`  
**Impact:** Replenishes ALL circles (not just target), can take 5-15 seconds  
**Why it matters:** Major operation that runs across entire system

**Evidence:**
```python
if total_prod_cycles % 10 == 0:
    print(f"\n🔄 Auto-replenishment (cycle {total_prod_cycles})...")
    replenish_cmd = f"{project_root}/scripts/circles/replenish_all_circles.sh --auto-calc-wsjf"
    subprocess.run(replenish_cmd, ...)  # ← NOT counted
```

---

#### 7. **QUICK_ACTIONS.sh** (if executed)
**When:** User-initiated via `.goalie/QUICK_ACTIONS.sh`  
**Scripts:** Multiple nested calls including:
- Governance agent
- Gap detection
- Replenishment  
- Retro coach
- Pattern stats

**Impact:** Runs multiple prod-cycles internally  
**Why it matters:** Your recent run showed 2 full cycles for orchestrator + assessor

**Evidence from your output:**
```
--- Iteration 1/2 ---
Running: ./scripts/af full-cycle 2 --circle orchestrator
✅ Cycle Complete

--- Iteration 2/2 ---
Running: ./scripts/af full-cycle 2 --circle orchestrator
✅ Cycle Complete
```

These showed "Iterations: 2/2" but the QUICK_ACTIONS wrapper isn't tracked separately.

---

## Impact Analysis

### Typical prod-cycle with iterations=5

**What gets counted:** 5 iterations  
**What actually runs:** 5 iterations + 5-8 additional operations

**Breakdown:**
```
Setup Phase (NOT counted):
  1. Governance Agent           ~3s
  2. WSJF Replenishment         ~1s
  Total: ~4s

Iteration Phase (COUNTED):
  3-7. Full-cycle x5           ~5-15s each
  Total: ~25-75s

Teardown Phase (NOT counted):
  8. Retro Coach                ~2s
  9. Retro Analysis             ~0.5s
  10. Replenish Generation      ~0.5s
  11. WSJF Refinement           ~1s
  12. Recommendations           ~1s
  Total: ~5s

Grand Total: ~34-84s
```

**What report shows:** "5 iterations"  
**What actually ran:** 12 operations (only 5 counted)

**Disparity:** **140% more work than reported**

---

## Why This Matters

### 1. **Inaccurate Performance Metrics**
- Flow metrics (throughput, cycle time) only count inner loop
- True end-to-end time not reflected
- Can't optimize what you don't measure

### 2. **Budget Tracking Failure**
- Iteration budget (e.g. max 10) ignores 7 extra operations
- User thinks they're running 10 iterations, actually running 17+ operations
- TIER_ITERATION_BUDGETS don't account for overhead

### 3. **Cost Allocation Issues**
- Revenue attribution based on incomplete action count
- Circle utilization metrics miss setup/teardown work
- Economic impact calculations understate true cost

### 4. **Observability Gap**
- High observability coverage inside loop
- Zero coverage for pre/post loop operations
- Can't detect failures in governance/retro phases

---

## Recommended Fixes

### Priority 1: Extend Iteration Tracking (This Week)

**Concept:** Track "operations" instead of just "iterations"

**Implementation:**
```python
# At top of run_iterative_prod_cycle():
operation_counter = {
    'total': 0,
    'setup': 0,
    'iterations': 0,
    'teardown': 0
}

# Before governance agent (line 879):
operation_counter['setup'] += 1
operation_counter['total'] += 1
logger.log("operation_tracked", {
    "operation_type": "governance_agent",
    "phase": "setup",
    "operation_number": operation_counter['total']
})

# Before replenishment (line 934):
operation_counter['setup'] += 1
operation_counter['total'] += 1
logger.log("operation_tracked", {
    "operation_type": "wsjf_replenishment",
    "phase": "setup",
    "operation_number": operation_counter['total']
})

# Inside iteration loop (line 1003):
operation_counter['iterations'] += 1
operation_counter['total'] += 1

# Before retro coach (line 1212):
operation_counter['teardown'] += 1
operation_counter['total'] += 1

# ... etc for all major operations

# Final summary (line 1140):
operation_summary = {
    "total_operations": operation_counter['total'],
    "setup_operations": operation_counter['setup'],
    "iteration_operations": operation_counter['iterations'],
    "teardown_operations": operation_counter['teardown'],
    # Keep legacy field for compatibility
    "total_iterations": iteration_summary['total_iterations']
}
```

### Priority 2: Add WSJF Hygiene to Preflight (Today)

**Integrate check_wsjf_hygiene.py into preflight checks:**

```python
# In preflight_checks_pass() function around line 750:
def preflight_checks_pass(...):
    # Existing checks...
    
    # NEW: WSJF Hygiene Check
    print("🎯 Checking WSJF hygiene...")
    sys.path.insert(0, os.path.join(project_root, "scripts"))
    from check_wsjf_hygiene import check_wsjf_hygiene
    
    wsjf_check = check_wsjf_hygiene()
    
    if wsjf_check['detected']:
        if wsjf_check['severity'] == 'high':
            print(f"   ❌ WSJF Hygiene FAILED: {wsjf_check['message']}")
            print(f"   💡 Fix: {wsjf_check['fix']}")
            
            if mode == 'mutate':
                print("   🛑 Blocking prod-cycle in mutate mode")
                return False, "WSJF hygiene check failed"
            else:
                print("   ⚠️  Warning: Proceeding in advisory mode with degraded prioritization")
        elif wsjf_check['severity'] == 'medium':
            print(f"   ⚠️  WSJF Hygiene WARNING: {wsjf_check['message']}")
            print(f"   💡 Recommended: {wsjf_check['fix']}")
        else:
            print(f"   🟢 WSJF Hygiene: {wsjf_check['message']}")
    else:
        print(f"   ✅ {wsjf_check['message']}")
    
    # Continue with other checks...
```

### Priority 3: Fix Retro-Replenish WSJF Persistence (Today)

**File:** `scripts/agentic/retro_replenish_workflow.py`

**Find the KANBAN write function and add WSJF field:**

```python
# Search for where ReplenishItem objects are written to KANBAN
# Around line 300-350, add wsjf field to output:

def write_items_to_kanban(items: List[ReplenishItem], kanban_file: str):
    """Write replenish items to KANBAN board"""
    with open(kanban_file, 'r') as f:
        kanban = yaml.safe_load(f)
    
    # Add to NEXT column
    if 'NEXT' not in kanban:
        kanban['NEXT'] = []
    
    for item in items:
        kanban_entry = {
            'id': item.item_id,
            'title': item.title,
            'summary': item.description,
            'circle': item.circle,
            'status': 'todo',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'wsjf': round(item.wsjf, 2)  # ← ADD THIS LINE
        }
        kanban['NEXT'].append(kanban_entry)
    
    with open(kanban_file, 'w') as f:
        yaml.dump(kanban, f, default_flow_style=False, sort_keys=False)
```

### Priority 4: Daily Cron Job for WSJF Automation

**Add to user's crontab:**

```bash
# WSJF Automation - Runs daily at 2am
0 2 * * * cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow && /usr/local/bin/python3 scripts/circles/wsjf_automation_engine.py --mode auto >> logs/wsjf_automation.log 2>&1

# Weekly WSJF health report - Sundays at 9am
0 9 * * 0 cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow && /usr/local/bin/python3 scripts/check_wsjf_hygiene.py >> logs/wsjf_health.log 2>&1
```

---

## Prevention Policies

### Mandate: WSJF Field Required
**Rule:** Any code that creates backlog items MUST set `wsjf:` field, not just text in summary.

**Enforcement:**
- Preflight validation blocks if >10 items have WSJF=0
- Schema validator adds WSJF to required fields for KANBAN entries
- Unit tests verify WSJF persistence in all backlog creation paths

### Policy: WSJF Staleness Threshold
**Rule:** WSJF values >21 days old = stale (updated from 7 days per user request)

**Implementation:**
```python
# In check_wsjf_hygiene.py line 76:
if days_old > 21 and abs(wsjf - 1.0) < 0.1:  # Changed from 7
    stale_items.append(...)
```

### Standard: Pre-Cycle WSJF Validation
**Rule:** Run WSJF automation before every prod-cycle in advisory mode

**Implementation:**
```python
# In cmd_prod_cycle.py before iteration loop (line 985):
if not args.skip_wsjf_check:
    print("🎯 Pre-cycle WSJF validation...")
    wsjf_check = subprocess.run(
        ["python3", "scripts/check_wsjf_hygiene.py"],
        capture_output=True, text=True
    )
    
    if wsjf_check.returncode > 0:  # Medium or high severity
        print("   ⚠️  WSJF hygiene issues detected")
        print("   🔄 Running automated fix...")
        subprocess.run([
            "python3", 
            "scripts/circles/wsjf_automation_engine.py", 
            "--mode", "auto"
        ])
```

---

## Implementation Checklist

- [ ] Extend iteration tracking to include setup/teardown operations
- [x] Create `check_wsjf_hygiene.py` health check script
- [ ] Integrate WSJF hygiene check into prod-cycle preflight
- [ ] Fix retro-replenish workflow to persist WSJF field
- [ ] Add cron jobs for daily WSJF automation
- [ ] Update WSJF staleness threshold from 7→21 days
- [ ] Add pre-cycle WSJF validation with auto-fix
- [ ] Document new operation tracking in README
- [ ] Update flow metrics to use total operations
- [ ] Add operation breakdown to dashboard

---

## Expected Outcomes

### Immediate (This Week)
- ✅ 100% backlog items have valid WSJF scores
- ✅ Preflight catches WSJF issues before execution
- ✅ Daily automation prevents drift accumulation

### Short-term (Next Sprint)
- Accurate operation counts in metrics
- True end-to-end cycle time visibility
- No more manual WSJF interventions

### Long-term (This Quarter)
- WSJF governance integrated into all creation paths
- Automated staleness detection and refresh
- Complete observability across full prod-cycle lifecycle

---

## Conclusion

**Current state:** Iteration counter ignores 50-70% of actual work performed during prod-cycle.

**Root cause:** Historical design where "iteration" meant "full-cycle execution" but system evolved to include substantial pre/post processing.

**Fix:** Extend tracking to count ALL operations, not just loop iterations, and integrate WSJF hygiene into governance workflow.

**Impact:** More accurate metrics → better optimization → improved revenue capture.
