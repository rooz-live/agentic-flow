# Complete Wiring Diagnostic: Baseline/Error/Frequency/Parameterization/Audit/Review/Retro

## 🎯 User Questions Being Answered

1. **Baseline/error/frequency parameterization/hardcoded/order analysis**
2. **Audit/review/retro infrastructure**
3. **Trigger MPP Learning?** Validate Skills? Re-export Data?
4. **Scripts/skills not yet fully wired?**
5. **Validate solutions against test criteria, threshold progress bars per iteration?**
6. **Verdict: GO/CONTINUE/NO_GO?**
7. **How may running "ay" select and cycle through modes iteratively to resolve primary recommended actions?**

---

## 📊 BASELINE INFRASTRUCTURE ANALYSIS

### What Exists ✅

**Baseline Scripts Found:**
- `baseline-metrics.sh` - Core baseline establishment
- `establish_baselines.py` - Python benchmarks
- `establish_baselines.js` - JavaScript benchmarks
- `emit_safe_degrade_baseline.py` - Safe degradation baseline
- `measure_baselines.ts` - TypeScript measurement

**Baseline Integration Status:**
```
✅ Scripts exist
✓ Can measure baseline states
✓ Can compare against baselines
✗ NOT called before first iteration in ay auto
✗ NOT stored in versioned format
✗ NOT compared in validation stage
✗ NO baseline delta calculations
```

### What's Missing ❌

#### 1. Pre-Cycle Baseline Establishment
```bash
# Currently: ay auto starts analysis directly
# Missing: Establish baseline before iterations

# Expected flow:
./ay auto
  ├─ [MISSING] Stage: Establish Baselines
  │   ├─ Run: establish_baselines.py
  │   ├─ Capture: Success rate, compliance, performance
  │   └─ Store: .ay-baselines/baseline_*.json
  ├─ Stage: Analysis
  ├─ Stage: Mode Cycling
  └─ ...
```

**Fix Required:** Add baseline stage at line 414 in ay-auto.sh

#### 2. Baseline Versioning
```
Missing:
  ✗ Baseline version tracking
  ✗ Baseline comparison across cycles
  ✗ Baseline delta metrics
  ✗ Baseline rollback capability
  
Needed:
  • Timestamp all baselines
  • Store baseline history
  • Calculate improvement %
  • Enable baseline reset/rollback
```

---

## 🔴 ERROR HANDLING & FREQUENCY ANALYSIS

### Current Error Handling Status

**What's Implemented:**
```bash
✓ ay-auto.sh: Error handling in mode execution
✓ ay-orchestrate.sh: Error tracking ($failed variable)
✓ Error logging to progress.log
✗ NO structured error recovery
✗ NO error frequency tracking
```

**Current Code (ay-auto.sh line 189-271):**
```bash
execute_mode() {
    # Sets MODE_STATUS and MODE_SCORES
    # But: No error classification
    # And: No frequency tracking
}
```

### Frequency Parameterization Issues

**Current State:**
```bash
# ay-auto.sh hardcodes:
MAX_ITERATIONS="${MAX_ITERATIONS:-5}"     # Line 42
# No other frequency parameters

# Missing parameterization:
✗ Iteration frequency (per-second, per-minute, per-hour)
✗ Mode retry frequency (after failure)
✗ Baseline check frequency
✗ Validation frequency per iteration
✗ Governance review frequency
✗ Retro analysis frequency
```

**What Exists (Hardcoded in Other Scripts):**
```
✓ ay-dynamic-thresholds.sh: 30-60 second intervals
✓ setup-continuous-improvement.sh: Daily frequencies
✓ install_wsjf_cron.sh: Cron-based frequencies
✗ None parameterized for ay auto
```

### Required Frequency Parameters

```bash
# Add to ay auto:
./ay auto --frequency=hourly --max-iterations=10
./ay auto --frequency=per-ceremony --max-time=4hours
./ay auto --baseline-frequency=per-cycle
./ay auto --review-frequency=per-5-iterations
./ay auto --retro-frequency=end-of-cycle
./ay auto --validation-frequency=per-iteration
```

---

## 🔍 ORDER & HARDCODED ANALYSIS

### Current Execution Order (ay-auto.sh)

```
Line 401: main()
Line 414: analyze_system_state()        ← Stage 1
Line 431-484: for loop (MAX_ITERATIONS)  ← Iterations
  Line 448: select_optimal_mode()        ← Stage 2
  Line 456: execute_mode()               ← Stage 3
  Line 466: validate_solution()          ← Stage 4
Line 486-498: max iterations handling    ← Verdict
```

**Issues:**
```
✗ Baselines never established (should be first)
✗ Governance review never executed (should be before verdict)
✗ Retro analysis never executed (should be after verdict)
✗ Learning capture never triggered (should be last)
```

### Hardcoded Values Found

```bash
# ay-auto.sh
Line 42:  MAX_ITERATIONS="${MAX_ITERATIONS:-5}"
Line 43:  MIN_CONFIDENCE="${MIN_CONFIDENCE:-HIGH_CONFIDENCE}"
Line 44:  CIRCLE="${AY_CIRCLE:-orchestrator}"
Line 45:  CEREMONY="${AY_CEREMONY:-standup}"
Line 284: [ "$new_health" -ge 80 ]        # GO threshold
Line 284: [ "$new_high" -ge 5 ]           # High confidence count
Line 285: [ "$new_health" -ge 50 ]        # CONTINUE threshold
Line 308-309: Box width=80 (hardcoded for UI)
Line 284: validate_solution() thresholds (80%, 50%, etc.)

# ay-orchestrate.sh
Line 96-98: Default recommendations (hardcoded)
Line 159: "ay improve" command (hardcoded)
```

**Problems:**
- Thresholds not configurable
- Frequencies not parameterized
- Order not flexible
- No adaptive adjustment

---

## 🔧 AUDIT/REVIEW INFRASTRUCTURE

### What Exists ✅

**Review Scripts:**
- `pre_cycle_script_review.py` (356 lines)
- `governance.py` (1936 lines)
- `governance_agent.py`
- `enforce_dt_quality_gates.py` (408 lines)
- `prod_quality_gates.py` (225 lines)
- `compliance_as_code.py` (163 lines)
- `dt_evaluation_dashboard.py`
- `dt_e2e_check.py`
- `validate_pattern_metrics.py`

**Review Coverage:**
```
✓ Pattern validation
✓ Governance compliance
✓ Quality gates
✓ Risk assessment
✓ Dependency checks
✓ E2E validation
```

### What's NOT Wired ❌

**Integration Status:**
```
✓ Scripts exist
✗ NOT called during ay auto iterations
✗ NOT blocking/warning on violations
✗ NOT integrated into verdict generation
✗ NO governance holds/gates
✗ NO compliance checks before deployment
```

**Missing Integration Points:**
```bash
# After validation stage (line 464 in ay-auto.sh):
# Add:
if [[ -x "$SCRIPT_DIR/pre_cycle_script_review.py" ]]; then
    if ! "$SCRIPT_DIR/pre_cycle_script_review.py" "$CIRCLE"; then
        VERDICT="GOVERNANCE_HOLD"
        return 1
    fi
fi

if ! "$SCRIPT_DIR/enforce_dt_quality_gates.py"; then
    VERDICT="QUALITY_GATE_FAILED"
    return 1
fi
```

---

## 📚 RETROSPECTIVE ANALYSIS INFRASTRUCTURE

### What Exists ✅

**Retro Scripts:**
- `retrospective_analysis.py` (937 lines)
- `retro_insights.sh` (107 lines)
- `retro_replenish_workflow.py` (392 lines)
- `link_metrics_to_retro.sh` (316 lines)
- `feedback-loop-analyzer.sh` (515 lines)
- `learning_capture_parity.py` (115 lines)

**Retro Capabilities:**
```
✓ Pattern analysis
✓ Learning extraction
✓ Metric correlation
✓ Feedback loops
✓ Next cycle recommendations
✓ Metric-to-retro linking
```

### What's NOT Wired ❌

**Integration Status:**
```
✓ Scripts exist (comprehensive)
✗ NEVER triggered after ay auto completion
✗ NOT part of main workflow
✗ Results NOT fed into next cycle
✗ Learning NOT incorporated into baseline
```

**Expected Flow (Currently Missing):**
```bash
# After verdict "GO" (line 472 in ay-auto.sh):
# Add:
if [[ "$decision" == "GO" ]]; then
    log_phase "Stage 5: Retrospective Analysis"
    
    # Capture what worked
    "$SCRIPT_DIR/retrospective_analysis.py" \
        --circle "$CIRCLE" \
        --ceremony "$CEREMONY"
    
    # Extract learnings
    "$SCRIPT_DIR/learning_capture_parity.py" \
        --export-learning true
    
    # Prepare next cycle
    "$SCRIPT_DIR/retro_replenish_workflow.py" \
        --feedback-mode true
fi
```

---

## 🎓 MPP LEARNING & SKILL VALIDATION

### Script: validate-learned-skills.sh (135 lines)

**Current Status:**
```bash
✓ Exists and is executable
✓ Exports skills from agentdb
✓ Analyzes skill quality
✓ Detects anti-patterns (skip, fast, shortcut)
✓ Quality checks (confidence, usage)
✓ Manual validation checklist

✗ NOT called by ay auto
✗ NOT integrated into skill validation stage
✗ NOT blocking deployment on quality issues
```

**What It Does:**
```bash
1. Export skills via: npx agentdb skill export --circle
2. Check for anti-patterns (reward hacking)
3. Validate confidence scores (< 0.7 = warning)
4. Validate usage counts (< 5 = warning)
5. Output: Validation checklist for human review
```

**Missing Integration:**
```bash
# Add to ay auto after GO verdict:
log_phase "Stage 5.5: Skill Validation"

if bash "$SCRIPT_DIR/validate-learned-skills.sh" "$CIRCLE" 2>&1 | grep -q "❌"; then
    echo "Skill validation failed - review required"
    VERDICT="SKILL_VALIDATION_FAILED"
    exit 1
fi
```

### MPP Learning Trigger

**What Exists:**
```bash
✓ validate-learned-skills.sh: Can validate learned skills
✓ retrospective_analysis.py: Can extract patterns
✓ learning_capture_parity.py: Can capture learning
✗ NO central MPP trigger
✗ NO "learn from this cycle" mechanism
```

**Missing:**
```bash
# Create: trigger-mpp-learning.sh
#!/bin/bash
# Should:
# 1. Capture cycle outcomes
# 2. Extract patterns (retrospective_analysis.py)
# 3. Train neural patterns (if claude-flow available)
# 4. Update skill database
# 5. Export updated skills (re-export data)

# Called as:
trigger_mpp_learning() {
    log_phase "Triggering MPP Learning"
    "$SCRIPT_DIR/retrospective_analysis.py" --circle "$CIRCLE"
    npx agentdb skill export --circle "$CIRCLE" > .metrics/skills-export-$(date +%s).json
    # Train patterns if neural framework available
}
```

---

## 📋 SKILL EXPORT & DATA RE-EXPORT

### Current State

**Script: export-skills.ts (155 lines)**
```bash
✓ Exists
✓ Can export skills in TypeScript
✓ References agentdb

✗ NOT called by ay auto
✗ NOT triggered after learning capture
✗ NO re-export on skill updates
```

**Missing Re-Export Workflow:**
```bash
# Add after learning_capture_parity.py:
re_export_data() {
    log_phase "Re-exporting Updated Skills Data"
    
    # Export latest skills
    npx agentdb skill export --circle "$CIRCLE" \
        > ".metrics/skills-$(date +%s).json"
    
    # Update baseline with new skills
    cp ".metrics/skills-$(date +%s).json" \
        ".ay-baselines/skills-baseline.json"
    
    # Log export for audit trail
    echo "Exported skills at $(date)" >> ".ay-audit.log"
}
```

---

## ✅ VALIDATION & TEST CRITERIA

### Current Validation (ay-auto.sh lines 273-294)

```bash
validate_solution() {
    # Checks:
    ✓ new_health >= 80 && new_high >= 5  → "GO"
    ✓ new_health >= 50                   → "CONTINUE"
    ✓ else                               → "NO_GO"
    
    # Problems:
    ✗ NO progress bars per iteration
    ✗ NO detailed test criteria
    ✗ NO threshold explanations
    ✗ Hardcoded thresholds (80%, 50%)
}
```

### Required Test Criteria

```bash
# Create: validation-test-criteria.sh
# Should validate against:

CRITERIA_SUCCESS_RATE=70          # At least 70% success
CRITERIA_COMPLIANCE=85            # At least 85% compliant
CRITERIA_MULTIPLIER_TUNING=0.95   # Multiplier stability ±5%
CRITERIA_CIRCLE_EQUITY=40         # Circle equity balance < 40%

# Threshold progress per iteration:
Iteration 1:
  └─ Health: [████░░░░░░] 40%
  └─ Tests: 2/4 passing

Iteration 2:
  └─ Health: [██████░░░░] 60%
  └─ Tests: 3/4 passing

Iteration 3:
  └─ Health: [████████░░] 80%
  └─ Tests: 4/4 passing → "GO"
```

### Missing: Progress Bar Per Iteration

**Current:** Shows only current mode
**Needed:** Show cumulative progress

```bash
# Add to render_dashboard():
show_threshold_progress() {
    local success_rate=$(query_success_rate)
    local compliance=$(query_compliance)
    local multiplier=$(query_multiplier)
    local equity=$(query_equity)
    
    echo -e "${BOX_V} Success Rate: $(render_progress_bar \"$success_rate\" 100)  ${GREEN}${success_rate}%${NC}${BOX_V}"
    echo -e "${BOX_V} Compliance:   $(render_progress_bar \"$compliance\" 100)  ${GREEN}${compliance}%${NC}${BOX_V}"
    echo -e "${BOX_V} Multiplier:   $(render_progress_bar \"$multiplier\" 100)  ${GREEN}${multiplier}%${NC}${BOX_V}"
    echo -e "${BOX_V} Circle Equity:$(render_progress_bar \"$equity\" 40)   ${GREEN}${equity}%${NC}${BOX_V}"
}
```

---

## 🚀 MODE CYCLING & ITERATIVE RESOLUTION

### Current Implementation (ay-auto.sh)

**Stage 1: Analysis**
```bash
# Line 419: analyze_system_state()
# Outputs: HEALTH_SCORE, HIGH_CONFIDENCE, FALLBACK_COUNT, ISSUES
```

**Stage 2: Mode Selection** 
```bash
# Line 448: select_optimal_mode()
# Logic: Based on issues, selects: init, improve, monitor, divergence, iterate
# Problems:
#   ✗ Selection is rule-based, not adaptive
#   ✗ No history of tried modes
#   ✗ No backtracking if mode fails
```

**Stage 3: Mode Execution**
```bash
# Line 456: execute_mode()
# Supports: init, improve, monitor, divergence, iterate
# Status: Mostly working, but:
#   ✗ ay-continuous-improve.sh symlink issue (FIXED in v1)
#   ✗ generate-test-episodes.ts might fail
#   ✗ ay-wsjf-iterate.sh parameter validation needed
```

**Stage 4: Validation**
```bash
# Line 466: validate_solution()
# Verdict: GO / CONTINUE / NO_GO
# Status: Working, but:
#   ✗ Hardcoded thresholds
#   ✗ No detailed criteria
#   ✗ No progress tracking
```

### Iterative Resolution Algorithm

**Current Loop (lines 431-484):**
```
For iteration 1 to MAX_ITERATIONS (5):
  1. Re-analyze system state
  2. Select optimal mode
  3. Render dashboard
  4. Execute mode in background
  5. Validate solution
  6. Show verdict
  7. Sleep 2 seconds
  8. Loop to next iteration
```

**Issues:**
```
✗ Loop terminates after MAX_ITERATIONS even if not resolved
✗ No "minimum resolution" check
✗ No adaptive iteration count based on complexity
✗ No fallback if all modes fail
```

### Expected Resolution Logic

```bash
# What user asked: "minimum number of times to at least resolve primary recommended actions"

# Currently: Always does 5 iterations max
# Needed: 
#   - Detect "primary recommended actions" from ay governance-agent
#   - Loop until actions are resolved OR max iterations reached
#   - Stop early if all actions resolved

# Implementation:
determine_primary_actions() {
    # Query: af governance-agent
    # Parse: P1, P2, P3 priorities
    # Return: Array of action IDs to resolve
}

is_action_resolved() {
    # Check if action marked as done
    # Update from metrics/governance state
}

resolve_primary_actions() {
    for action in "${PRIMARY_ACTIONS[@]}"; do
        while ! is_action_resolved "$action" && [ "$ITERATION" -lt "$MAX_ITERATIONS" ]; do
            execute_iteration
            ((ITERATION++))
        done
    done
}
```

---

## 📝 SCRIPTS NOT YET FULLY WIRED

### Critical (Blocks ay auto)

1. **ay-auto.sh itself**
   - Status: 80% complete
   - Missing:
     - Baseline establishment stage
     - Governance review stage
     - Retro analysis stage
     - Learning capture stage
     - Progress bar per test criterion
   - Action: Add 4 stages (20 min work)

2. **establish_baselines.py**
   - Status: 100% complete (script itself)
   - Missing: Integration into ay auto
   - Action: Call at line 414 in ay-auto.sh

3. **validate-learned-skills.sh**
   - Status: 100% complete (script itself)
   - Missing: Integration into verdict stage
   - Action: Call after GO verdict

### Important (Affects validation/testing)

4. **generate-test-episodes.ts** (line 201 in ay-auto.sh)
   - Status: Referenced but untested
   - Issue: May require Node.js/tsx
   - Fix: Verify it exists and runs

5. **ay-wsjf-iterate.sh** (line 252 in ay-auto.sh)
   - Status: Referenced, parameter validation needed
   - Issue: Line 191 mentions parameters
   - Action: Test with --max-iterations parameter

6. **ay-continuous-improve.sh** (line 213 in ay-auto.sh)
   - Status: FIXED (symlink to ay-yo-continuous-improvement.sh exists)
   - Current: Works

### Validation/Review (Not wired)

7. **pre_cycle_script_review.py**
   - Status: 100% complete, NOT called
   - Action: Add to governance review stage

8. **enforce_dt_quality_gates.py**
   - Status: 100% complete, NOT called
   - Action: Add to governance review stage

9. **retrospective_analysis.py**
   - Status: 100% complete, NOT called
   - Action: Add to retro analysis stage

10. **learning_capture_parity.py**
    - Status: 100% complete, NOT called
    - Action: Add to learning capture stage

---

## 🎯 WIRING PRIORITY & ROADMAP

### Phase 1: CRITICAL (1 day)

1. **Add 4 missing stages to ay-auto.sh:**
   - Pre-Cycle: establish_baselines.py
   - Post-Validation: Governance review (pre_cycle_script_review.py + enforce_dt_quality_gates.py)
   - Post-Verdict: Retrospective (retrospective_analysis.py + retro_insights.sh)
   - Post-Retro: Learning capture (learning_capture_parity.py)

2. **Add validation criteria thresholds:**
   - Make hardcoded values parameterizable
   - Add progress bars per criterion
   - Document GO/CONTINUE/NO_GO logic

3. **Add baseline versioning:**
   - Store baseline with timestamp
   - Compare delta in validation
   - Calculate improvement %

### Phase 2: IMPORTANT (2-3 days)

4. **Add frequency parameterization:**
   - `--frequency` parameter
   - `--baseline-frequency`
   - `--review-frequency`
   - `--retro-frequency`

5. **Add error frequency tracking:**
   - Classify errors by type
   - Track retry frequency
   - Implement backoff strategy

6. **Wire primary action resolution:**
   - Query governance-agent for priorities
   - Loop until resolved
   - Don't just iterate MAX_ITERATIONS

### Phase 3: NICE-TO-HAVE (3-5 days)

7. **Adaptive mode selection:**
   - History of tried modes
   - Learn from failures
   - Predict best next mode

8. **Skill validation automation:**
   - Auto-call validate-learned-skills.sh
   - Block deployment on anti-patterns
   - Auto-export skills after learning

9. **MPP Learning integration:**
   - Central trigger-mpp-learning.sh
   - Auto-train neural patterns
   - Update skills in agentdb

---

## 📊 Summary: What's Wired vs. Not Wired

### Wired ✅ (50%)
- Basic mode execution (init, improve, monitor, divergence, iterate)
- System state analysis
- Simple validation (thresholds)
- Progress visualization (dashboard)
- Verdict generation (GO/CONTINUE/NO_GO)
- Error tracking (basic)

### NOT Wired ❌ (50%)
- Baseline establishment (pre-cycle)
- Baseline versioning & delta tracking
- Governance review (pre-verdict)
- Retrospective analysis (post-verdict)
- Learning capture (post-retro)
- Skill validation (post-learning)
- Frequency parameterization
- Error classification & frequency
- Primary action detection
- Adaptive iteration stopping
- Progress bars per test criterion
- Skill export & re-export

---

## 🔑 Key Insights

1. **Infrastructure exists but disconnected**: 80% of scripts exist, just not wired
2. **Hardcoded values limit flexibility**: Need parameterization for real-world use
3. **No baseline comparison**: Can't measure improvement without baseline delta
4. **Incomplete feedback loop**: No learning → retro → baseline update cycle
5. **Missing governance gates**: Can deploy untested solutions (dangerous)
6. **Skill validation optional**: No blocking on reward hacking patterns

---

## ✅ Recommendation

**Implement in this order:**

1. **Day 1**: Wire 4 missing stages (baseline, governance, retro, learning)
2. **Day 2**: Add parameterization for frequencies & thresholds
3. **Day 3**: Baseline versioning & delta tracking
4. **Day 4**: Skill validation automation
5. **Day 5**: Primary action detection & adaptive stopping

**Estimated Total Effort**: 40-60 hours
**Expected Impact**: ay auto becomes production-ready with full feedback loop
