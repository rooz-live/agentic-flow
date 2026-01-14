# ay-auto.sh Wiring Audit: What's Done vs What's Missing

**Date**: January 12, 2026, 23:35 UTC
**Status**: PARTIALLY WIRED - READY FOR COMPLETION
**Priority**: HIGH - Blocks production use

---

## ✅ ALREADY FULLY WIRED

### 1. **Parameter Configuration** ✅
```bash
MAX_ITERATIONS (env var)
GO_THRESHOLD (env var, default 80)
CONTINUE_THRESHOLD (env var, default 50)
FREQUENCY (env var, default "fixed")
BASELINE_FREQUENCY (env var, default "per-cycle")
REVIEW_FREQUENCY (env var, default "per-iteration")
RETRO_FREQUENCY (env var, default "end-of-cycle")
THRESHOLD_SUCCESS_RATE = 70
THRESHOLD_COMPLIANCE = 85
THRESHOLD_MULTIPLIER = 95
THRESHOLD_EQUITY = 40
```
**Status**: All parameterized, not hardcoded ✅

### 2. **Intelligent Mode Selection** ✅
```bash
analyze_system_state()        # Calls ay-dynamic-thresholds.sh
select_optimal_mode()         # Routes to init/improve/monitor/divergence/iterate
```
**Status**: Logic implemented ✅

### 3. **Mode Execution with Fallbacks** ✅
```bash
execute_mode()
  - init:       Generate episodes
  - improve:    Continuous improvement
  - monitor:    Cascade status check
  - divergence: Divergence rate check
  - iterate:    WSJF iteration
```
**Status**: All modes have execution + timeout + fallback ✅

### 4. **Test Criteria Validation** ✅
```bash
validate_test_criteria()      # 4-point check per iteration
render_criteria_progress()    # Visual progress bars
```
**Status**: Implemented with progress bars ✅

### 5. **Solution Validation** ✅
```bash
validate_solution()           # GO/CONTINUE/NO_GO verdict
```
**Status**: Returns verdict based on health thresholds ✅

### 6. **Rich TUI Rendering** ✅
```bash
render_dashboard()            # Interactive dashboard
render_criteria_progress()    # Progress bars
draw_box(), draw_separator()  # Box drawing
show_spinner()                # Progress animation
```
**Status**: All visual elements implemented ✅

### 7. **Stage Execution (Partial)** ⚠️
```bash
establish_baseline_stage()    # Lines 497-529 ✅
governance_review_stage()     # Lines 531-564 ⚠️ (calls scripts that may not exist)
retrospective_analysis_stage()# Lines 566-586 ⚠️ (calls scripts that may not exist)
learning_capture_stage()      # Lines 588-621 ⚠️ (calls scripts that may not exist)
```

---

## ⚠️ PARTIALLY WIRED (NEEDS COMPLETION)

### 1. **Baseline Metrics Establishment** ⚠️

**Current** (lines 506-514):
```bash
if [[ -x "$SCRIPT_DIR/baseline-metrics.sh" ]]; then
    echo -e "${CYAN}${ARROW}${NC} Running baseline-metrics.sh..."
    "$SCRIPT_DIR/baseline-metrics.sh" 2>&1 | head -20
fi
```

**Issues**:
- ❌ `baseline-metrics.sh` may timeout (observed >15s)
- ❌ No timeout protection
- ❌ Output truncated to 20 lines (why?)
- ❌ No error handling if script fails
- ❌ Python baseline script may not exist

**Needs**:
```bash
# Add timeout (60s max)
timeout 60 bash "$SCRIPT_DIR/baseline-metrics.sh" || {
    echo -e "${YELLOW}⚠${NC} baseline-metrics.sh timeout"
    # Continue with fallback defaults
}

# Better error handling
if [[ -f ".metrics/baseline-$(date +%Y%m%d).json" ]]; then
    baseline_health=$(jq .health_score .metrics/baseline-*.json | head -1 || echo "0")
else
    echo -e "${YELLOW}⚠${NC} No baseline metrics available, using defaults"
fi
```

---

### 2. **Governance Review** ⚠️

**Current** (lines 539-556):
```bash
if [[ -x "$SCRIPT_DIR/pre_cycle_script_review.py" ]]; then
    echo -e "${CYAN}${ARROW}${NC} Pre-cycle script review..."
    if "$SCRIPT_DIR/pre_cycle_script_review.py" "$CIRCLE" 2>&1 | grep -q "✓\\|PASS"; then
        echo -e "${GREEN}${CHECK}${NC} Pre-cycle review passed"
    fi
fi

if [[ -x "$SCRIPT_DIR/enforce_dt_quality_gates.py" ]]; then
    echo -e "${CYAN}${ARROW}${NC} Quality gate enforcement..."
    if "$SCRIPT_DIR/enforce_dt_quality_gates.py" 2>&1 | grep -q "PASS\\|✓"; then
        echo -e "${GREEN}${CHECK}${NC} Quality gates passed"
    fi
fi
```

**Issues**:
- ❌ Scripts may not exist
- ❌ No timeout protection
- ❌ Grep pattern may not match actual output
- ❌ No clear PASS/FAIL criteria
- ❌ No skip flag (--skip-governance)
- ❌ No frequency parameterization honored

**Needs**:
```bash
governance_review_stage() {
    # Skip if requested
    if [[ "${SKIP_GOVERNANCE:-false}" == "true" ]]; then
        echo -e "${YELLOW}⚠${NC} Skipping governance review"
        return
    fi

    # Check frequency
    if [[ "$REVIEW_FREQUENCY" != "per-iteration" && "$REVIEW_FREQUENCY" != "end-of-cycle" ]]; then
        return
    fi

    # Add timeouts and better error handling
    local review_pass=true

    if [[ -x "$SCRIPT_DIR/pre_cycle_script_review.py" ]]; then
        if ! timeout 30 "$SCRIPT_DIR/pre_cycle_script_review.py" "$CIRCLE" >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠${NC} Pre-cycle review timeout/failed"
            review_pass=false
        fi
    fi

    if [[ -x "$SCRIPT_DIR/enforce_dt_quality_gates.py" ]]; then
        if ! timeout 30 "$SCRIPT_DIR/enforce_dt_quality_gates.py" >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠${NC} Quality gates failed"
            review_pass=false
        fi
    fi

    if [[ "$review_pass" == "true" ]]; then
        echo -e "${GREEN}${CHECK}${NC} Governance review passed"
    else
        echo -e "${YELLOW}⚠${NC} Governance review incomplete"
    fi
}
```

---

### 3. **Retrospective Analysis** ⚠️

**Current** (lines 574-582):
```bash
if [[ -x "$SCRIPT_DIR/retrospective_analysis.py" ]]; then
    echo -e "${CYAN}${ARROW}${NC} Running retrospective analysis..."
    "$SCRIPT_DIR/retrospective_analysis.py" --circle "$CIRCLE" --ceremony "$CEREMONY" 2>&1 | head -15 || true
fi

if [[ -x "$SCRIPT_DIR/retro_insights.sh" ]]; then
    echo -e "${CYAN}${ARROW}${NC} Capturing retro insights..."
    "$SCRIPT_DIR/retro_insights.sh" "$CIRCLE" 2>&1 | head -10 || true
fi
```

**Issues**:
- ❌ No timeout protection
- ❌ Output truncated (why?)
- ❌ No error handling
- ❌ No skip flag (--skip-retro)
- ❌ No frequency parameterization honored
- ❌ `retro_insights.sh` may not exist (only `.py` observed)

**Needs**:
```bash
retrospective_analysis_stage() {
    # Skip if requested
    if [[ "${SKIP_RETRO:-false}" == "true" ]]; then
        echo -e "${YELLOW}⚠${NC} Skipping retrospective analysis"
        return
    fi

    # Check frequency
    if [[ "$RETRO_FREQUENCY" != "end-of-cycle" ]]; then
        return
    fi

    mkdir -p ".ay-retro"

    # Run with timeout
    if [[ -x "$SCRIPT_DIR/retrospective_analysis.py" ]]; then
        if ! timeout 60 "$SCRIPT_DIR/retrospective_analysis.py" \
            --circle "$CIRCLE" --ceremony "$CEREMONY" \
            > ".ay-retro/retro-$(date +%s).json" 2>&1; then
            echo -e "${YELLOW}⚠${NC} Retrospective analysis timeout"
        fi
    fi

    echo -e "${GREEN}${CHECK}${NC} Retrospective analysis complete"
}
```

---

### 4. **Learning Capture & Skill Validation** ⚠️

**Current** (lines 596-617):
```bash
if [[ -x "$SCRIPT_DIR/learning_capture_parity.py" ]]; then
    echo -e "${CYAN}${ARROW}${NC} Capturing learning from cycle..."
    "$SCRIPT_DIR/learning_capture_parity.py" --circle "$CIRCLE" --export-learning true 2>&1 | head -10 || true
fi

# Validate skills
if [[ -x "$SCRIPT_DIR/validate-learned-skills.sh" ]]; then
    echo -e "${CYAN}${ARROW}${NC} Validating learned skills..."
    if bash "$SCRIPT_DIR/validate-learned-skills.sh" "$CIRCLE" 2>&1 | grep -q "All automated checks passed"; then
        echo -e "${GREEN}${CHECK}${NC} Skill validation passed"
    elif bash "$SCRIPT_DIR/validate-learned-skills.sh" "$CIRCLE" 2>&1 | grep -q "❌"; then
        echo -e "${YELLOW}⚠${NC} Skill validation found issues (review required)"
    fi
fi

# Re-export skills
if command -v npx &>/dev/null; then
    echo -e "${CYAN}${ARROW}${NC} Re-exporting skills data..."
    if npx agentdb skill export --circle "$CIRCLE" > ".ay-learning/skills-$(date +%s).json" 2>/dev/null; then
        echo -e "${GREEN}${CHECK}${NC} Skills re-exported"
    fi
fi
```

**Issues**:
- ❌ Script calls may timeout
- ❌ Output truncated (why?)
- ❌ No grep pattern for actual output from validate-learned-skills.sh
- ❌ npx/agentdb may not exist
- ❌ No skip flag (--skip-learning)
- ❌ Validation script called twice (inefficient)

**Needs**:
```bash
learning_capture_stage() {
    mkdir -p ".ay-learning"

    # Capture learning
    if [[ -x "$SCRIPT_DIR/learning_capture_parity.py" ]]; then
        if timeout 60 "$SCRIPT_DIR/learning_capture_parity.py" \
            --circle "$CIRCLE" --export-learning true \
            > ".ay-learning/capture-$(date +%s).json" 2>&1; then
            echo -e "${GREEN}${CHECK}${NC} Learning captured"
        else
            echo -e "${YELLOW}⚠${NC} Learning capture timeout"
        fi
    fi

    # Validate skills once
    local validation_result=""
    if [[ -x "$SCRIPT_DIR/validate-learned-skills.sh" ]]; then
        validation_result=$(timeout 60 bash "$SCRIPT_DIR/validate-learned-skills.sh" "$CIRCLE" 2>&1)
        
        if echo "$validation_result" | grep -q "passed\|PASS"; then
            echo -e "${GREEN}${CHECK}${NC} Skill validation passed"
        elif echo "$validation_result" | grep -q "failed\|FAIL"; then
            echo -e "${YELLOW}⚠${NC} Skill validation issues (review needed)"
        fi
    fi

    echo -e "${GREEN}${CHECK}${NC} Learning capture complete"
}
```

---

## ❌ NOT YET WIRED

### 1. **Baseline Frequency Parameterization** ❌
Lines 641: baseline established always, ignores BASELINE_FREQUENCY
```bash
# Current: always run baseline
establish_baseline_stage
```

**Needs**:
```bash
if [[ "$BASELINE_FREQUENCY" == "per-cycle" ]]; then
    establish_baseline_stage
elif [[ "$BASELINE_FREQUENCY" == "per-iteration" && "$ITERATION" -eq 1 ]]; then
    establish_baseline_stage
fi
```

---

### 2. **Early Exit on GO Threshold** ⚠️ PARTIALLY
Lines 667: checks `health_score >= target_score`, but `target_score` is hardcoded to 80
```bash
local target_score=80  # HARDCODED!
if [ "$health_score" -ge "$target_score" ]; then
    # Early exit
fi
```

**Should be**:
```bash
if [ "$health_score" -ge "$GO_THRESHOLD" ]; then
    # Early exit
fi
```

---

### 3. **Recommendations Based on Issues** ⚠️ PARTIAL
Lines 472-486: Shows recommendations but only static ones based on issues
```bash
if [[ "$issues" == *"INSUFFICIENT_DATA"* ]]; then
    echo -e "${BOX_V}   ${YELLOW}●${NC} Generate more episodes (${CYAN}init${NC})"
fi
```

**Needs**: 
- Recommend which FLAGS to use (--skip-baseline for loops, --fast-mode for speed, etc.)
- Recommend next mode based on what just failed
- Recommend parameter adjustments (--go-threshold=X, --max-iterations=X)

---

### 4. **Skip Flags Not Wired** ❌
Parameter parsing exists in IMPLEMENTATION_PLAN but not yet in ay-auto.sh:
```bash
--skip-baseline       # Not checked in establish_baseline_stage
--skip-governance     # Not checked in governance_review_stage
--skip-retro          # Not checked in retrospective_analysis_stage
--fast-mode           # Not checked anywhere
```

**Need to add**:
```bash
# Near line 50, add:
SKIP_BASELINE="${SKIP_BASELINE:-false}"
SKIP_GOVERNANCE="${SKIP_GOVERNANCE:-false}"
SKIP_RETRO="${SKIP_RETRO:-false}"

# Then check in each stage
if [[ "${SKIP_BASELINE:-false}" == "true" ]]; then
    return
fi
```

---

### 5. **Order Dependencies Not Documented** ❌
Stage order is:
1. Baseline (PRE-CYCLE)
2. Governance (PRE-ITERATION)
3. Mode execution + validation
4. Governance (PER-ITERATION if set)
5. Governance (PRE-VERDICT if needed)
6. Retrospective (POST-GO)
7. Learning (POST-RETRO)

**Needs documentation** of why this order matters.

---

### 6. **Hardcoded Values Remaining** ❌

| Line | Value | Should Be |
|------|-------|-----------|
| 59-62 | THRESHOLD_* hardcoded | Make parameterizable |
| 652 | `target_score=80` | Use GO_THRESHOLD |
| 574, 598 | `| head -15`, `| head -10` | Why truncate? Remove or explain |
| 506 | `| head -20` | Why truncate? |

---

## 🎯 What's UNRESOLVED

| Item | Impact | Blocker |
|------|--------|---------|
| Timeout handling in stages | Hangs on slow scripts | YES |
| Skip flags not wired | Can't skip stages | YES |
| Frequency params not honored | Always run baseline | MEDIUM |
| Hardcoded target_score | GO threshold ignored | MEDIUM |
| Output truncation | Losing data | MEDIUM |
| Script existence checks | Assumes scripts exist | MEDIUM |
| Validation grep patterns | May not match output | LOW |
| Recommendations parameterization | Static help only | LOW |

---

## ⏱️ EFFORT TO COMPLETE

| Task | Time | Blocker |
|------|------|---------|
| Add timeouts to all stage calls | 30 min | YES |
| Wire skip flags | 20 min | YES |
| Honor frequency parameters | 20 min | MEDIUM |
| Fix target_score hardcoding | 10 min | MEDIUM |
| Better error handling | 20 min | LOW |
| Parameter-driven recommendations | 30 min | LOW |
| **TOTAL** | **2 hours** | Needed |

---

## 📋 IMPLEMENTATION PRIORITY

### CRITICAL (Blocks Production Use)
1. [ ] Add `timeout 60` to all stage script calls
2. [ ] Wire --skip-baseline, --skip-governance, --skip-retro flags
3. [ ] Replace hardcoded `target_score=80` with `$GO_THRESHOLD`

### HIGH (Affects Correctness)
4. [ ] Honor BASELINE_FREQUENCY parameterization
5. [ ] Fix grep patterns to match actual script output
6. [ ] Remove or explain output truncation (lines 506, 574, 598)

### MEDIUM (Nice to Have)
7. [ ] Make THRESHOLD_* parameters configurable
8. [ ] Add dynamic recommendations based on failures
9. [ ] Document stage ordering and why it matters
10. [ ] Better error messages when scripts missing

---

## 🎬 Next Steps

**Immediately after this audit**, implement:
1. Timeout protection (safest first)
2. Skip flag wiring (enables flexibility)
3. Target_score fix (correctness)

Then test minimum iterations to resolve primary actions.

