# Fix: Recommended Actions Not Updated After Auto-Cycle

## Problem

After auto-cycle completion (via `ay-prod-learn-loop.sh`), recommended actions were not being refreshed from new insights generated during the cycle. Users reported that the action list remained stale even though new retro insights had been logged.

## Root Cause

The auto-cycle workflow had these steps:

1. Run learning iterations across circles
2. Call `run_batch_analysis_hooks` periodically during iterations
3. Generate retro insights and log them to `.goalie/insights_log.jsonl`
4. ❌ **Missing**: No call to `suggest_actions.py` to regenerate action recommendations

The `suggest_actions.py` script is read-only and requires explicit invocation. It was being called manually via `af suggest-actions` but not automatically after cycle completion.

## Solution

Added automatic action refresh as part of post-batch hooks:

### 1. New Function: `refresh_recommended_actions`

Added to `scripts/hooks/ceremony-hooks.sh`:

```bash
refresh_recommended_actions() {
  if [[ "${ENABLE_ACTION_REFRESH:-1}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Refreshing recommended actions from insights..."
  
  # Run suggest-actions to regenerate action recommendations from all recent insights
  if [[ -f "$ROOT_DIR/scripts/agentic/suggest_actions.py" ]]; then
    local actions_output="$ROOT_DIR/.goalie/suggested_actions_latest.txt"
    if python3 "$ROOT_DIR/scripts/agentic/suggest_actions.py" > "$actions_output" 2>/dev/null; then
      local action_count=$(grep -c "suggested_action:" "$actions_output" || echo "0")
      log_hook_success "$action_count recommended actions updated"
      
      # Display summary to console
      if [[ $action_count -gt 0 ]]; then
        log_hook "Recent action suggestions:"
        grep "suggested_action:" "$actions_output" | head -3
      fi
    else
      log_hook_warn "Failed to refresh actions"
    fi
  fi
}
```

### 2. Integration into Post-Batch Hooks

Modified `run_post_batch_hooks` in `scripts/hooks/ceremony-hooks.sh`:

```bash
run_post_batch_hooks() {
  local total_ceremonies="$1"
  
  # ... existing checks ...
  
  # Refresh recommended actions after cycle completion
  refresh_recommended_actions
  
  echo ""
}
```

### 3. Call Post-Batch Hooks After Learning Completion

Added calls to `run_post_batch_hooks` in `scripts/ay-prod-learn-loop.sh`:

- **Parallel learning mode** (line 230-233):
  ```bash
  # POST-BATCH HOOKS (after all learning iterations complete)
  if declare -f run_post_batch_hooks >/dev/null 2>&1; then
    run_post_batch_hooks "$total_ceremonies"
  fi
  ```

- **Sequential learning mode** (line 274-278):
  ```bash
  # POST-BATCH HOOKS (after all sequential learning completes)
  if declare -f run_post_batch_hooks >/dev/null 2>&1; then
    run_post_batch_hooks "$total_ceremonies"
  fi
  ```

- **Single-circle mode** (line 377-380):
  ```bash
  # POST-BATCH HOOKS (after circle-specific learning completes)
  if declare -f run_post_batch_hooks >/dev/null 2>&1; then
    run_post_batch_hooks "$iterations"
  fi
  ```

### 4. Configuration Control

Added new environment variable to control the feature:

```bash
ENABLE_ACTION_REFRESH=${ENABLE_ACTION_REFRESH:-1}  # Default: enabled
```

Users can disable it by setting `ENABLE_ACTION_REFRESH=0` before running auto-cycle.

## Files Modified

1. `scripts/hooks/ceremony-hooks.sh`
   - Added `refresh_recommended_actions()` function (lines 348-371)
   - Integrated into `run_post_batch_hooks()` (line 394-395)
   - Added config display (line 428)

2. `scripts/ay-prod-learn-loop.sh`
   - Added post-batch hooks call in parallel mode (lines 230-233)
   - Added post-batch hooks call in sequential mode (lines 274-278)
   - Added post-batch hooks call in single-circle mode (lines 377-380)
   - Added ceremony counter to sequential mode (line 259, 269)

## Testing

Created `tests/test-action-refresh.sh` to verify:

1. ✅ Adding insights to `.goalie/insights_log.jsonl`
2. ✅ Running `suggest_actions.py` generates recommendations
3. ✅ New insights appear in action suggestions
4. ✅ `refresh_recommended_actions` function exists
5. ✅ Post-batch hooks called after learning completion

Test output:
```
=== Test Summary ===
✓ Recommended actions refresh mechanism verified
✓ Actions are updated from recent insights
✓ Post-batch hooks integrated into learning loops
```

## Data Format Requirements

**Important**: The `suggest_actions.py` script requires `.goalie/insights_log.jsonl` to be in valid JSONL format (one JSON object per line). Multi-line pretty-printed JSON will cause parsing errors.

Valid format:
```json
{"timestamp": "2026-01-12T20:00:00Z", "type": "retro_insight", "text": "Add logging"}
{"timestamp": "2026-01-12T20:01:00Z", "type": "retro_insight", "text": "Implement circuit breaker"}
```

Invalid format:
```json
{
  "timestamp": "2026-01-12T20:00:00Z",
  "type": "retro_insight",
  "text": "Add logging"
}
```

If the file becomes corrupted, clean it with:
```bash
grep '^{.*}$' .goalie/insights_log.jsonl > .goalie/insights_log.jsonl.tmp
mv .goalie/insights_log.jsonl.tmp .goalie/insights_log.jsonl
```

## Usage

### Automatic (Default)

Actions are now automatically refreshed after every auto-cycle:

```bash
# All of these will refresh actions at completion:
./scripts/ay-prod-learn-loop.sh 5
./scripts/ay-prod-learn-loop.sh --parallel 10
./scripts/ay-prod-learn-loop.sh --sequential 3
./scripts/ay-prod-learn-loop.sh --circle orchestrator 2
```

### Manual

Users can still manually refresh actions anytime:

```bash
./scripts/af suggest-actions
```

Or directly:

```bash
python3 ./scripts/agentic/suggest_actions.py > .goalie/suggested_actions_latest.txt
```

### View Actions

```bash
cat .goalie/suggested_actions_latest.txt
```

Or view observability-specific actions:

```bash
cat .goalie/OBSERVABILITY_ACTIONS.yaml
```

## Verification

After running an auto-cycle, verify actions were refreshed:

```bash
# Run a short cycle
./scripts/ay-prod-learn-loop.sh 2

# Check for refresh message in output
# Should see: "[HOOK] N recommended actions updated"

# View updated actions
cat .goalie/suggested_actions_latest.txt

# Check timestamp
ls -lh .goalie/suggested_actions_latest.txt
```

## Benefits

1. **Automated Workflow**: Actions automatically stay synchronized with insights
2. **Reduced Manual Work**: No need to remember to run `af suggest-actions` manually
3. **Improved Visibility**: Post-cycle summary shows action count and top suggestions
4. **Configurable**: Can disable with `ENABLE_ACTION_REFRESH=0` if needed
5. **Consistent Behavior**: Works across all learning modes (parallel, sequential, single-circle)

## Related Files

- `scripts/agentic/suggest_actions.py` - Core action suggestion logic
- `.goalie/insights_log.jsonl` - Source of retro insights
- `.goalie/suggested_actions_latest.txt` - Output file with formatted actions
- `.goalie/OBSERVABILITY_ACTIONS.yaml` - Observability-specific actions (auto-generated)

## Future Improvements

1. Add action deduplication across cycles
2. Track action completion/dismissal
3. Prioritize actions by WSJF/economic value
4. Integrate with Kanban board auto-promotion
5. Add action aging/staleness detection
