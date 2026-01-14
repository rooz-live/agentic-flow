# Learning Reuse Audit: Now / Next / Later

## Executive Summary

**Status**: Learning circulation pipeline is NOW BUILT but DISCONNECTED from execution.

| Component | Status | Issue |
|-----------|--------|-------|
| Circulation (↓) | ✅ WORKING | Learns skills, stores in agentdb |
| Retrieval (←) | ✅ WORKING | Exports to `.ay-learning/available-skills-{CIRCLE}.json` |
| **INJECTION (→)** | ❌ **NOT WIRED** | Skills file created but never READ by execute_mode() |
| **VALIDATION (↑)** | ❌ **NOT WIRED** | No feedback loop: did used skill succeed? |

---

## FULLY WORKING: Learning Circulation

### How Knowledge Currently Persists

```bash
# ay-learning-circulation.sh (LINES 126-168)
# ✅ Reads: .cache/learning-retro-*.json (retrospective outputs)
# ✅ Extracts: skill patterns + confidence scores
# ✅ Stores: INSERT/UPDATE in agentdb.skills table
#   - skill_name, circle, ceremony, proficiency, learned_at, last_used, usage_count
# ✅ Exports: .ay-learning/available-skills-{CIRCLE}.json
#   [{"name": "ssl-coverage-check", "confidence": 1.0}, ...]

# Wired into: ay-auto.sh LINE 684 (learning_capture_stage)
timeout 30 bash "$SCRIPT_DIR/ay-learning-circulation.sh" "$CIRCLE" "$CEREMONY" "$ITERATION"
```

**What Works**:
- 6 skills stored with proficiency scores (0.8-1.0)
- Skills retrieved as JSON: `ssl-coverage-check (100%), standup-ceremony (85%), ...`
- Agentdb persistence verified:
  ```sql
  SELECT skill_name, proficiency, usage_count FROM skills WHERE circle='orchestrator'
  ssl-coverage-check|1.0|2
  standup-ceremony|0.85|1
  chaotic_workflow|0.8|37
  ```

---

## NOW: What's Missing (NOT WIRED)

### Problem 1: Learned Skills Never Injected Into Execution

**Location**: ay-auto.sh, execute_mode() function (LINES 219-301)

```bash
execute_mode() {
    local mode="$1"
    local iteration="$2"
    
    # 🔴 HARDCODED: No reference to learned skills
    # ❌ Never reads: .ay-learning/available-skills-{CIRCLE}.json
    # ❌ Never passes: LEARNED_SKILLS environment variable
    # ❌ Never calls: query_mpp_for_reward() or similar
    
    case "$mode" in
        init)
            # HARDCODED SCORE: score=80
            npx tsx "$SCRIPT_DIR/generate-test-episodes.ts" ...
            score=80  # ← HARDCODED, not dynamic
            ;;
        improve)
            # HARDCODED SCORE: score=90
            bash "$SCRIPT_DIR/ay-continuous-improve.sh" ...
            score=90  # ← HARDCODED, not dynamic
            ;;
        iterate)
            # HARDCODED SCORE: score=95
            bash "$SCRIPT_DIR/ay-wsjf-iterate.sh" ...
            score=95  # ← HARDCODED, not dynamic
            ;;
    esac
}
```

**Impact**: System NEVER CHECKS "Did ssl-coverage-check work last time?" before trying new approaches.

---

### Problem 2: Reward Hardcoded Instead of Dynamic

**Location**: ay-auto.sh, execute_mode() (LINES 233-237, 244-248, 282-288)

```bash
# Mode init: hardcoded score=80
if npx tsx "$SCRIPT_DIR/generate-test-episodes.ts" ...; then
    result="SUCCESS"
    score=80  # ← Where does this come from? Answer: nowhere. Just guessed.
fi

# Mode improve: hardcoded score=90
if timeout "$timeout" bash "$SCRIPT_DIR/ay-continuous-improve.sh" ...; then
    result="SUCCESS"
    score=90  # ← Also just guessed
fi

# Mode iterate: hardcoded score=95
if bash "$SCRIPT_DIR/ay-wsjf-iterate.sh" ...; then
    result="SUCCESS"
    score=95  # ← HIGHEST score, but why? No basis.
fi
```

**Pattern**: Scores should reflect:
- ✅ Did this skill work last iteration?
- ✅ How confident are we? (from agentdb proficiency)
- ✅ What's the expected uplift? (from MCP/MPP causal edges)

Instead: All scores are static guesses.

---

### Problem 3: Test Criteria Also Hardcoded

**Location**: ay-auto.sh, validate_test_criteria() (LINES 303-325)

```bash
validate_test_criteria() {
    local iteration=$1
    
    # HARDCODED DEFAULTS
    local success_rate=70      # ← Just guessed
    local compliance=80        # ← Just guessed
    local multiplier=90        # ← Just guessed
    local equity=35            # ← Just guessed
    
    # Attempts to read from files, but no agentdb query
    if [[ -f ".metrics/success_rate-latest.json" ]]; then
        success_rate=$(grep ...)
    fi
    # ^^ Only checks files, NEVER checks agentdb for validation data
}
```

**Should Check**:
```bash
# Query: Did skills used in iteration N-1 succeed in iteration N?
sqlite3 agentdb.db \
    "SELECT AVG(validation_success) FROM skill_validations \
     WHERE skill_name IN (SELECT name FROM learned_skills_iteration_N_minus_1) \
     AND validation_iteration = $ITERATION"
```

---

## NEXT: Immediate Wiring (1-2 hours)

### Step 1: Load Learned Skills at Iteration Start

**File**: ay-auto.sh, `main()` function around LINE 732

```bash
# ADD: After line 732 (for ((ITERATION=1; ...))
# Load skills for this iteration
load_learned_skills "$CIRCLE" "$ITERATION"

# Function to add (NEW):
load_learned_skills() {
    local circle="$1"
    local iteration="$2"
    local skills_file=".ay-learning/available-skills-${circle}.json"
    
    if [[ -f "$skills_file" ]]; then
        export LEARNED_SKILLS="$(cat "$skills_file")"
        echo -e "${GREEN}${CHECK}${NC} Loaded $(echo "$LEARNED_SKILLS" | jq length) learned skills"
    else
        export LEARNED_SKILLS="[]"
        echo -e "${YELLOW}⚠${NC} No learned skills available (first iteration?)"
    fi
}
```

### Step 2: Pass Skills to execute_mode()

**File**: ay-auto.sh, LINE 774

```bash
# BEFORE (current):
(execute_mode "$mode" "$ITERATION") &

# AFTER (wired):
(LEARNED_SKILLS="$LEARNED_SKILLS" execute_mode "$mode" "$ITERATION") &
```

### Step 3: Inject Skills into Mode Logic

**File**: ay-auto.sh, execute_mode() function (LINES 219-301)

```bash
execute_mode() {
    local mode="$1"
    local iteration="$2"
    local learned_skills="${LEARNED_SKILLS:-[]}"  # ← NEW: read env var
    
    # NEW: Query agentdb for applicable skills
    local applicable_skills=$(query_applicable_skills "$mode" "$learned_skills")
    
    case "$mode" in
        iterate)
            # NEW: Check if "iterate" skill worked last time
            local iterate_confidence=$(echo "$applicable_skills" | \
                jq '.[] | select(.name=="iterate") | .confidence' 2>/dev/null || echo "0.5")
            
            # DYNAMIC: Score = base score * skill confidence
            if bash "$SCRIPT_DIR/ay-wsjf-iterate.sh" ...; then
                result="SUCCESS"
                score=$(echo "95 * $iterate_confidence" | bc -l | cut -d. -f1)  # Dynamic!
            fi
            ;;
    esac
}

# NEW FUNCTION: Query skills relevant to this mode
query_applicable_skills() {
    local mode="$1"
    local learned_skills="$2"
    
    # Filter skills by mode-relevant patterns
    echo "$learned_skills" | jq \
        ".[] | select(.name | contains(\"$mode\") or contains(\"workflow\"))"
}
```

---

## LATER: Full Validation Loop (4-6 hours)

### Skill Validation Tracking

Currently: Learned skills → stored → retrieved → used (?)

**Missing**: Feedback loop to track **did it work?**

```bash
# After mode execution succeeds/fails:
validate_skill_effectiveness() {
    local skill_name="$1"
    local iteration="$2"
    local success="$3"  # 0=failed, 1=succeeded
    
    # Record validation result in agentdb
    sqlite3 "$AGENTDB_PATH" \
        "INSERT INTO skill_validations (skill_name, iteration, success, validated_at) \
         VALUES ('$skill_name', $iteration, $success, datetime('now'));"
    
    # Update confidence based on success rate
    local success_count=$(sqlite3 "$AGENTDB_PATH" \
        "SELECT COUNT(*) FROM skill_validations \
         WHERE skill_name='$skill_name' AND success=1;")
    local total_count=$(sqlite3 "$AGENTDB_PATH" \
        "SELECT COUNT(*) FROM skill_validations \
         WHERE skill_name='$skill_name';")
    
    local success_rate=$((success_count * 100 / total_count))
    
    # Prune low-confidence skills
    if [[ $success_rate -lt 50 ]]; then
        sqlite3 "$AGENTDB_PATH" \
            "DELETE FROM skills WHERE skill_name='$skill_name';"
        echo "Pruned skill: $skill_name (only 50% success)"
    fi
}
```

### MCP/MPP Causal Query (Optional but Recommended)

**Sketch** (ay-reward-calculator.sh already provided):

```bash
query_mpp_for_reward() {
    local skill_name="$1"
    local circle="$2"
    
    # Query agentdb MCP/MPP causal graph
    # "If we use ssl-coverage-check, how much does health improve?"
    npx agentdb causal query \
        --from "$skill_name" \
        --to "health_score" \
        --circle "$circle" \
        --min-confidence 0.7 | jq '.uplift'
}

# Usage in execute_mode:
local skill_uplift=$(query_mpp_for_reward "ssl-coverage-check" "$CIRCLE")
score=$(echo "80 * (1 + $skill_uplift)" | bc -l)  # Reward adjusted by causality
```

---

## What's NOT Yet Wired

### Frequency Parameterization

**File**: ay-auto.sh LINES 56-60

```bash
FREQUENCY="${FREQUENCY:-fixed}"                 # Used but not acted on
BASELINE_FREQUENCY="${BASELINE_FREQUENCY:-per-cycle}"
REVIEW_FREQUENCY="${REVIEW_FREQUENCY:-per-iteration}"
RETRO_FREQUENCY="${RETRO_FREQUENCY:-end-of-cycle}"
```

**Status**: Defined but unused. `establish_baseline_stage` doesn't check `$BASELINE_FREQUENCY`.

**Fix Needed**:
```bash
establish_baseline_stage() {
    # Currently always runs
    # Should check: if [[ "$BASELINE_FREQUENCY" != "per-cycle" ]]; then return; fi
}
```

### Order Analysis (Iteration N → N+1)

Currently: Each iteration recomputes everything from scratch.

**Missing**: Explicit iteration handoff showing:
- "Iteration 1 used skills: [a, b, c]"
- "Iteration 2 used skills: [a, b, c, d]" ← new skill added
- "Iteration 2 validation: skill a worked (✓), skill b failed (✗)"

**Suggest**: Add to learning_capture_stage:
```bash
echo "Iteration $ITERATION used skills:"
echo "$LEARNED_SKILLS" | jq '.[] | .name'
```

### Error Parameterization

**File**: ay-auto.sh LINES 63-67

```bash
THRESHOLD_SUCCESS_RATE=70
THRESHOLD_COMPLIANCE=85
THRESHOLD_MULTIPLIER=95
THRESHOLD_EQUITY=40
```

**Status**: Defined but hardcoded. Should be:
```bash
THRESHOLD_SUCCESS_RATE="${THRESHOLD_SUCCESS_RATE:-70}"
THRESHOLD_COMPLIANCE="${THRESHOLD_COMPLIANCE:-85}"
# ... etc
```

---

## Architecture Decision: Hardcoded vs. Dynamic Rewards

### Option A: Hardcoded (Current)

```bash
# ay-auto.sh, LINE 283-284
if bash ay-wsjf-iterate.sh; then
    score=95  # ← Fixed regardless of context
fi
```

**Pros**: Simple, predictable
**Cons**: Never improves, ignores history

### Option B: MPC/MPP Causal (Recommended)

```bash
# NEW: ay-reward-calculator.sh
calculate_mode_reward() {
    local mode="$1"
    local circle="$2"
    local learned_skills="$3"
    
    # Base score for mode
    local base_score=50
    case "$mode" in
        iterate) base_score=95 ;;
        improve) base_score=90 ;;
        monitor) base_score=85 ;;
    esac
    
    # Uplift from applicable learned skills
    local uplift=$(echo "$learned_skills" | jq \
        "map(select(.name | contains(\"${mode}\"))) | \
         map(.confidence) | add / length // 0" | bc -l)
    
    # Final score: base * (1 + uplift)
    echo "$base_score * (1 + $uplift)" | bc -l | cut -d. -f1
}
```

---

## Recommended Implementation Order

### NOW (Today):
1. ✅ ay-learning-circulation.sh FIXED (script works)
2. → Load learned skills in ay-auto.sh main loop
3. → Inject LEARNED_SKILLS env var into execute_mode()
4. → Query agentdb for applicable skill confidence

### NEXT (Tomorrow):
5. → Dynamic reward calculation (skill confidence × base score)
6. → Add skill_validations table schema to agentdb
7. → Track validation results after mode execution
8. → Prune low-confidence skills (<50% success)

### LATER (This Week):
9. → MCP/MPP causal query integration (optional but powerful)
10. → Iteration handoff reporting (what skills used, what worked)
11. → Frequency parameterization enforcement
12. → Error threshold parameterization enforcement

---

## Files to Modify

| File | Lines | Change | Complexity |
|------|-------|--------|------------|
| ay-auto.sh | 732-780 | Load skills, inject env | 2/5 |
| ay-auto.sh | 219-301 | Dynamic reward calculation | 3/5 |
| ay-reward-calculator.sh | NEW | MCP/MPP query (optional) | 4/5 |
| agentdb.db | N/A | Add skill_validations table | 1/5 |

---

## Success Criteria

- [ ] Iteration 1 learns skills → stored in agentdb ✅
- [ ] Iteration 2 loads skills → injected into execute_mode()
- [ ] Iteration 2 uses same-mode skill → gets dynamic reward boost
- [ ] Iteration 2 validates skill → records success/failure
- [ ] Low-confidence skills pruned → system gets smarter over time
- [ ] Two-run test: `bash scripts/ay; bash scripts/ay` → proves knowledge reuse

