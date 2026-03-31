# ay-auto.sh Implementation Checklist

## Quick Reference: What Needs to be Added

### Phase 1: Wire 4 Missing Stages (20-30 minutes)

#### 1. Add Baseline Establishment (Before Line 414)
```bash
# INSERT THIS BEFORE main() calls analyze_system_state
establish_baseline_stage() {
    log_phase "Stage 0: Establish Baseline Metrics"
    
    mkdir -p ".ay-baselines"
    
    # Capture baseline metrics
    if [[ -x "$SCRIPT_DIR/baseline-metrics.sh" ]]; then
        "$SCRIPT_DIR/baseline-metrics.sh" | tee ".ay-baselines/baseline-$(date +%s).log"
    fi
    
    if [[ -x "$SCRIPT_DIR/benchmarks/establish_baselines.py" ]]; then
        python3 "$SCRIPT_DIR/benchmarks/establish_baselines.py" 2>&1 | tee ".ay-baselines/baselines-py-$(date +%s).log"
    fi
    
    log_success "Baseline metrics established"
    echo ""
}
```

**Where:** Insert at line 401 (in main function, before analyze_system_state)

#### 2. Add Governance Review (After Line 464, inside main loop)
```bash
# INSERT THIS AFTER validate_solution() is called
governance_review_stage() {
    local mode="$1"
    local iteration="$2"
    
    log_phase "Stage 4.5: Governance Review"
    
    local review_pass=true
    
    # Pre-cycle script review
    if [[ -x "$SCRIPT_DIR/pre_cycle_script_review.py" ]]; then
        if ! "$SCRIPT_DIR/pre_cycle_script_review.py" "$CIRCLE" >/dev/null 2>&1; then
            log_warn "Pre-cycle script review failed"
            review_pass=false
        fi
    fi
    
    # Quality gates
    if [[ -x "$SCRIPT_DIR/enforce_dt_quality_gates.py" ]]; then
        if ! "$SCRIPT_DIR/enforce_dt_quality_gates.py" >/dev/null 2>&1; then
            log_warn "Quality gates failed"
            review_pass=false
        fi
    fi
    
    if [[ "$review_pass" == "false" ]]; then
        echo "GOVERNANCE_HOLD"
        return 1
    else
        echo "GOVERNANCE_PASS"
        return 0
    fi
}
```

**Where:** Insert at line 475 (after verdict display in main loop)

#### 3. Add Retrospective Analysis (After GO Verdict)
```bash
# INSERT THIS AFTER "GO" verdict is printed
retrospective_analysis_stage() {
    local circle="$1"
    local ceremony="$2"
    
    log_phase "Stage 5: Retrospective Analysis"
    
    mkdir -p ".ay-retro"
    
    # Run retrospective analysis
    if [[ -x "$SCRIPT_DIR/retrospective_analysis.py" ]]; then
        "$SCRIPT_DIR/retrospective_analysis.py" \
            --circle "$circle" \
            --ceremony "$ceremony" \
            2>&1 | tee ".ay-retro/retro-$(date +%s).log"
    fi
    
    # Capture insights
    if [[ -x "$SCRIPT_DIR/retro_insights.sh" ]]; then
        "$SCRIPT_DIR/retro_insights.sh" "$circle" \
            2>&1 | tee ".ay-retro/insights-$(date +%s).log"
    fi
    
    log_success "Retrospective analysis complete"
}
```

**Where:** Insert at line 473 (right after GO verdict case block)

#### 4. Add Learning Capture (After Retrospective)
```bash
# INSERT THIS AFTER retrospective analysis
learning_capture_stage() {
    local circle="$1"
    
    log_phase "Stage 6: Learning Capture & Skill Update"
    
    mkdir -p ".ay-learning"
    
    # Capture learning from cycle
    if [[ -x "$SCRIPT_DIR/learning_capture_parity.py" ]]; then
        "$SCRIPT_DIR/learning_capture_parity.py" \
            --circle "$circle" \
            --export-learning true \
            2>&1 | tee ".ay-learning/learning-$(date +%s).log"
    fi
    
    # Validate learned skills
    if [[ -x "$SCRIPT_DIR/validate-learned-skills.sh" ]]; then
        if bash "$SCRIPT_DIR/validate-learned-skills.sh" "$circle" 2>&1 | tee ".ay-learning/skills-validation-$(date +%s).log" | grep -q "❌"; then
            log_warn "Skill validation found issues - review required"
        fi
    fi
    
    # Re-export skills
    if command -v npx &>/dev/null; then
        npx agentdb skill export --circle "$circle" > ".ay-learning/skills-$(date +%s).json"
        log_success "Skills re-exported"
    fi
    
    log_success "Learning capture complete"
}
```

**Where:** Insert at line 475 (after retrospective_analysis_stage call)

---

## Phase 2: Add Progress Bars Per Criterion (15-20 minutes)

### Add Test Criteria Validation

```bash
# INSERT THIS NEW FUNCTION BEFORE main()
validate_test_criteria() {
    local iteration=$1
    
    log_phase "Validating Test Criteria (Iteration $iteration)"
    
    # Query metrics
    local success_rate=$(query_metric "success_rate" 2>/dev/null || echo "0")
    local compliance=$(query_metric "compliance" 2>/dev/null || echo "0")
    local multiplier=$(query_metric "multiplier_tuning" 2>/dev/null || echo "100")
    local equity=$(query_metric "circle_equity" 2>/dev/null || echo "100")
    
    # Define thresholds
    local threshold_success=70
    local threshold_compliance=85
    local threshold_multiplier=95
    local threshold_equity=40
    
    # Display progress
    echo ""
    echo -e "${CYAN}${BOX_V} Success Rate:${NC}   $(render_progress_bar \"$success_rate\" 100) ${success_rate}% (need ≥${threshold_success}%)"
    echo -e "${CYAN}${BOX_V} Compliance:${NC}       $(render_progress_bar \"$compliance\" 100) ${compliance}% (need ≥${threshold_compliance}%)"
    echo -e "${CYAN}${BOX_V} Multiplier:${NC}       $(render_progress_bar \"$multiplier\" 100) ${multiplier}% (need ≥${threshold_multiplier}%)"
    echo -e "${CYAN}${BOX_V} Circle Equity:${NC}  $(render_progress_bar \"$equity\" 40) ${equity}% (need ≤${threshold_equity}%)"
    echo ""
    
    # Count passed criteria
    local passed=0
    [[ $(( success_rate )) -ge $threshold_success ]] && ((passed++))
    [[ $(( compliance )) -ge $threshold_compliance ]] && ((passed++))
    [[ $(( multiplier )) -ge $threshold_multiplier ]] && ((passed++))
    [[ $(( equity )) -le $threshold_equity ]] && ((passed++))
    
    # Return verdict based on criteria
    if [[ $passed -ge 4 ]]; then
        echo "GO_CRITERIA_PASSED"
    elif [[ $passed -ge 2 ]]; then
        echo "CONTINUE_PARTIAL"
    else
        echo "NO_GO_INSUFFICIENT"
    fi
}

query_metric() {
    local metric=$1
    # Query from .metrics directory if available
    if [[ -f ".metrics/$metric-latest.json" ]]; then
        grep -o "\"value\": [0-9.]*" ".metrics/$metric-latest.json" | cut -d' ' -f2 || echo "0"
    else
        echo "0"
    fi
}
```

**Where:** Insert before main() function (around line 300)

---

## Phase 3: Add Parameterization (20-30 minutes)

### Add Parameter Parsing

```bash
# INSERT THIS AT TOP OF FILE (after variable declarations, line ~45)
# Parameter defaults
FREQUENCY="${FREQUENCY:-fixed}"           # fixed, hourly, daily, per-ceremony
BASELINE_FREQUENCY="${BASELINE_FREQUENCY:-per-cycle}"
REVIEW_FREQUENCY="${REVIEW_FREQUENCY:-per-iteration}"
RETRO_FREQUENCY="${RETRO_FREQUENCY:-end-of-cycle}"
MAX_TIME="${MAX_TIME:-}"                  # Optional: max runtime in seconds
GO_THRESHOLD="${GO_THRESHOLD:-80}"
CONTINUE_THRESHOLD="${CONTINUE_THRESHOLD:-50}"

# Add parameter parsing function
parse_parameters() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --frequency=*)
                FREQUENCY="${1#*=}"
                ;;
            --max-iterations=*)
                MAX_ITERATIONS="${1#*=}"
                ;;
            --max-time=*)
                MAX_TIME="${1#*=}"
                ;;
            --go-threshold=*)
                GO_THRESHOLD="${1#*=}"
                ;;
            --continue-threshold=*)
                CONTINUE_THRESHOLD="${1#*=}"
                ;;
            --circle=*)
                CIRCLE="${1#*=}"
                ;;
            --ceremony=*)
                CEREMONY="${1#*=}"
                ;;
            *)
                echo "Unknown parameter: $1"
                ;;
        esac
        shift
    done
}
```

**Where:** Insert after variable declarations (line 45)

### Update validate_solution() to use thresholds

```bash
# REPLACE lines 284-293 with:
validate_solution() {
    local mode="$1"
    
    # Re-analyze system state after mode execution
    local new_state
    new_state=$(analyze_system_state)
    
    local new_health=$(echo "$new_state" | grep "HEALTH_SCORE" | cut -d: -f2)
    local new_high=$(echo "$new_state" | grep "HIGH_CONFIDENCE" | cut -d: -f2)
    
    # Determine go/no-go based on configurable thresholds
    if [ "$new_health" -ge "$GO_THRESHOLD" ] && [ "$new_high" -ge 5 ]; then
        echo "GO"
        return 0
    elif [ "$new_health" -ge "$CONTINUE_THRESHOLD" ]; then
        echo "CONTINUE"
        return 0
    else
        echo "NO_GO"
        return 1
    fi
}
```

**Where:** Replace lines 284-293

---

## Phase 4: Add Baseline Versioning (15-20 minutes)

### Add Baseline Delta Tracking

```bash
# INSERT THIS NEW FUNCTION BEFORE main()
track_baseline_delta() {
    local iteration=$1
    local current_health=$2
    
    log_phase "Tracking Baseline Delta (Iteration $iteration)"
    
    mkdir -p ".ay-baselines"
    
    # Get initial baseline
    local baseline_file=".ay-baselines/initial_baseline.json"
    if [[ ! -f "$baseline_file" ]]; then
        log_warn "No initial baseline found"
        return 1
    fi
    
    # Extract baseline health
    local baseline_health=$(grep -o "\"health\": [0-9.]*" "$baseline_file" | cut -d' ' -f2)
    
    # Calculate delta
    local delta=$((current_health - baseline_health))
    local improvement_pct=$((delta * 100 / baseline_health))
    
    # Store delta
    cat > ".ay-baselines/delta-iter-$iteration.json" <<EOF
{
    "iteration": $iteration,
    "baseline_health": $baseline_health,
    "current_health": $current_health,
    "delta": $delta,
    "improvement_percent": $improvement_pct,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    log_success "Delta tracked: $delta points ($improvement_pct% improvement)"
    
    # Display delta in dashboard
    if [[ $delta -gt 0 ]]; then
        echo -e "${GREEN}↑ Improvement: ${delta} points (${improvement_pct}%)${NC}"
    else
        echo -e "${RED}↓ Regression: ${delta} points (${improvement_pct}%)${NC}"
    fi
}
```

**Where:** Insert before main() function

### Call in main loop

```bash
# ADD THIS AFTER validate_test_criteria() call in main loop (around line 467)
track_baseline_delta "$ITERATION" "$health_score"
```

---

## Actual Line-by-Line Changes

### Summary of File Changes

```
File: ay-auto.sh
Lines to modify:

1. Line 42-45: ADD parameters for frequency and thresholds
2. Line 401: ADD parse_parameters "$@"
3. Line 414: ADD establish_baseline_stage call (BEFORE analyze_system_state)
4. Line 430: ADD test criteria validation function
5. Line 468: REPLACE hardcoded thresholds with parameterized values
6. Line 473: ADD governance_review_stage() call
7. Line 475: ADD retrospective_analysis_stage() call
8. Line 477: ADD learning_capture_stage() call
9. Line 467: ADD track_baseline_delta() call
```

---

## Testing Checklist

### Before Integration

- [ ] Verify baseline-metrics.sh exists and is executable
- [ ] Verify establish_baselines.py exists and is executable
- [ ] Verify validate-learned-skills.sh exists and is executable
- [ ] Verify pre_cycle_script_review.py exists and is executable
- [ ] Verify enforce_dt_quality_gates.py exists and is executable
- [ ] Verify retrospective_analysis.py exists and is executable
- [ ] Verify learning_capture_parity.py exists and is executable
- [ ] Verify ay-dynamic-thresholds.sh is callable with "all" parameter
- [ ] Verify ay-wsjf-iterate.sh exists with --max-iterations parameter

### After Each Stage Integration

- [ ] Test baseline establishment: `./scripts/ay-auto.sh --max-iterations=1`
- [ ] Test governance review wiring
- [ ] Test retro analysis wiring
- [ ] Test learning capture wiring
- [ ] Verify progress bars display correctly
- [ ] Verify verdicts (GO/CONTINUE/NO_GO) are still working
- [ ] Check all directories created (.ay-baselines, .ay-retro, .ay-learning)
- [ ] Verify logs are written to appropriate locations

### Full Integration Test

```bash
# Run with all features
./scripts/ay-auto.sh \
    --max-iterations=3 \
    --frequency=fixed \
    --go-threshold=80 \
    --continue-threshold=50

# Expected output:
# Stage 0: Establish Baseline Metrics ✓
# Stage 1: Analyzing system state ✓
# Stage 2: Mode cycling (iterations 1-3) ✓
# Stage 3: Validation ✓
# Stage 4: Verdict ✓
# Stage 4.5: Governance Review ✓
# Stage 5: Retrospective Analysis ✓
# Stage 6: Learning Capture ✓
```

---

## Implementation Order (Recommended)

**Day 1: Core Integration (4-5 hours)**
1. Add establish_baseline_stage() 
2. Add governance_review_stage()
3. Add retrospective_analysis_stage()
4. Add learning_capture_stage()
5. Test end-to-end with 1-2 iterations

**Day 2: Validation Improvements (3-4 hours)**
1. Add validate_test_criteria()
2. Add progress bars per criterion
3. Add track_baseline_delta()
4. Test with 3-5 iterations

**Day 3: Parameterization (2-3 hours)**
1. Add parameter parsing
2. Replace hardcoded thresholds
3. Test with different parameters

**Day 4: Comprehensive Testing**
1. Full integration test
2. Verify all outputs
3. Document usage
4. Create example scenarios

---

## Expected Results After Implementation

### Before
```
./ay auto
├─ Analyze system state
├─ Cycle modes (5 iterations)
├─ Validate solutions
└─ Show verdict
Total: 4 stages, ~30 seconds
Output: verdict only
```

### After
```
./ay auto
├─ Establish baselines
├─ Analyze system state
├─ Cycle modes (5 iterations)
├─ Review governance
├─ Retrospective analysis
├─ Learning capture
├─ Skill validation
└─ Show final verdict
Total: 8 stages, ~2-3 minutes
Output: Full audit trail, learnings, metrics, skills export
```

---

## Quick Validation Commands

```bash
# Check if all required scripts exist
for script in baseline-metrics.sh establish_baselines.py validate-learned-skills.sh \
              pre_cycle_script_review.py enforce_dt_quality_gates.py \
              retrospective_analysis.py learning_capture_parity.py; do
    if [[ -x "./scripts/$script" ]]; then
        echo "✓ $script"
    else
        echo "✗ $script (MISSING)"
    fi
done

# Run with test mode
./scripts/ay-auto.sh --max-iterations=1 --go-threshold=50

# Check output directories
ls -la .ay-baselines/ .ay-retro/ .ay-learning/ 2>/dev/null || echo "Directories will be created on first run"
```

