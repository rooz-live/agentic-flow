# Production Workflow Integration Summary

## What Changed

The `af prod-cycle` and `af prod-swarm` commands now support **automatic health checks and graduation assessment** through new workflow flags.

### New Flags

#### `--with-health-check` (alias: `--pre-health`)
Runs `quick-health` before cycle/swarm execution. Non-blocking - warnings don't stop execution.

#### `--with-evidence-assess` (alias: `--post-assess`)
Runs graduation assessment after cycle/swarm completion with formatted output.

#### `--with-full-workflow`
Enables both pre-health check AND post-assessment in a single flag.

---

## Before vs After

### ❌ Old Way (3 manual steps)
```bash
# Step 1: Check health
./scripts/af quick-health

# Step 2: Run cycle
AF_ENV=local ./scripts/af prod-cycle \
  --mode advisory \
  --iterations 25 \
  --default-emitters \
  --json

# Step 3: Assess graduation
./scripts/af evidence assess --json | jq '{
  status: .graduation.assessment,
  green_streak: "\(.graduation.green_streak_count)/\(.graduation.green_streak_required)",
  stability: "\(.graduation.stability_score)%",
  ready: .graduation.ready_for_graduation
}'
```

**Problems:**
- Easy to skip steps
- Inconsistent execution
- Manual jq formatting
- Not CI/CD friendly

### ✅ New Way (single command)
```bash
AF_ENV=local ./scripts/af prod-cycle \
  --mode advisory \
  --iterations 25 \
  --with-full-workflow \
  --default-emitters \
  --json
```

**Benefits:**
- ✅ Automatic pre-flight health checks
- ✅ Integrated evidence collection
- ✅ Post-cycle graduation assessment with formatted output
- ✅ Consistent execution every time
- ✅ CI/CD friendly
- ✅ Non-blocking warnings

---

## Usage Examples

### Advisory Cycle with Full Workflow
```bash
./scripts/af prod-cycle \
  --mode advisory \
  --iterations 25 \
  --with-full-workflow \
  --json
```

**Output:**
```
🏥 Pre-Cycle Health Check
📊 Quick Health Check
  Revenue Concentration: 45%
  Evidence Emitter Health: 85%
  Pattern Coverage: 72%
  System Health: 3/4 checks passed

[... cycle execution ...]

📊 Post-Cycle Graduation Assessment

🎓 Graduation Status: MEETS_THRESHOLD
   Green Streak: 3/5
   Stability: 78%/85%
   Ready: ⏸️  NOT YET
```

### Production Swarm with Full Workflow
```bash
./scripts/af prod-swarm \
  --golden-iters 25 \
  --golden-reps 3 \
  --with-full-workflow \
  --default-emitters \
  --save-table
```

### Partial Workflows

**Only Pre-Health Check:**
```bash
./scripts/af prod-cycle \
  --mode advisory \
  --iterations 25 \
  --with-health-check
```

**Only Post-Assessment:**
```bash
./scripts/af prod-cycle \
  --mode advisory \
  --iterations 25 \
  --with-evidence-assess
```

### Shadow Cycle Sequence (10 cycles for graduation)
```bash
for i in {1..10}; do
  echo "=== Shadow Cycle $i/10 ==="
  
  ./scripts/af prod-cycle \
    --mode advisory \
    --iterations 25 \
    --with-full-workflow \
    --default-emitters \
    --json > ".goalie/shadow_cycle_${i}.json"
  
  # Brief pause between cycles
  sleep 30
done

# Check final graduation status
./scripts/af evidence assess --json | jq -r '
  "🎓 Final Status: \(.graduation.assessment)",
  "   Shadow Cycles: \(.graduation.shadow_cycles_completed)/\(.graduation.shadow_cycles_before_recommend)",
  "   Ready for Autocommit: \(.graduation.ready_for_graduation)"
'
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Production Cycle

on:
  schedule:
    - cron: '0 8 * * 1-5'  # Weekdays at 8am
  workflow_dispatch:

jobs:
  prod-cycle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run production cycle with full workflow
        env:
          AF_ENV: ci
        run: |
          ./scripts/af prod-cycle \
            --mode advisory \
            --iterations 25 \
            --with-full-workflow \
            --default-emitters \
            --json > cycle_result.json
      
      - name: Check graduation status
        run: |
          if jq -e '.graduation.ready_for_graduation == true' cycle_result.json; then
            echo "✅ Ready for autocommit graduation!"
            echo "GRADUATION_READY=true" >> $GITHUB_ENV
          fi
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: cycle-results
          path: |
            cycle_result.json
            .goalie/
```

---

## Technical Details

### Implementation

**Modified Files:**
- `scripts/af` - Added workflow flags and execution logic

**New Integrations:**
- Pre-health: Calls `./scripts/af quick-health`
- Post-assess: Calls `python3 scripts/agentic/graduation_assessor.py --json` with formatted output via `jq`

**Behavior:**
- Pre-health warnings are non-blocking (uses `|| echo "⚠️ warnings"`)
- Post-assessment only runs if graduation assessor script exists
- JSON output is auto-formatted for human readability (when `jq` available)
- Falls back to raw JSON if `jq` is not installed

### Output Format

**Pre-Health Check:**
```
🏥 Pre-Cycle Health Check
📊 Quick Health Check
  Revenue Concentration: X%
  Evidence Emitter Health: Y%
  Pattern Coverage: Z%
  System Health: N/4 checks passed
```

**Post-Assessment:**
```
📊 Post-Cycle Graduation Assessment

🎓 Graduation Status: {assessment}
   Green Streak: X/Y
   Stability: X%/Y%
   Ready: ✅ YES | ⏸️ NOT YET
```

### Dependencies

**Required:**
- `scripts/af` (main CLI)
- `scripts/cmd_prod_cycle.py` or `scripts/af_prod_cycle.py`
- `src/prod_cycle_swarm_runner.py` (for prod-swarm)

**Optional but Recommended:**
- `scripts/agentic/graduation_assessor.py` - For post-assessment
- `jq` - For formatted output (falls back to raw JSON)
- `.goalie/quick_health` script (or quick-health command implementation)

---

## Demo

Run the interactive demo to see the workflow in action:

```bash
./scripts/demo_integrated_workflow.sh
```

This will show:
1. Old manual 3-step process
2. New integrated single-command workflow
3. Optional live demo execution (5 iterations)

---

## Backward Compatibility

**100% backward compatible!**

- All existing commands work exactly as before
- New flags are **optional**
- Default behavior unchanged when flags not used
- No breaking changes to existing scripts or workflows

---

## Related Documentation

- `QUICKSTART_PROD_CYCLE.md` - Complete production workflows
- `docs/RCA_PROD_MATURITY_5W_ROAM.md` - Root cause analysis & thresholds
- `docs/PROD_MATURITY_EXECUTION_WORKFLOW.md` - Detailed execution workflows
- `docs/SCRIPT_INTEGRATION_TRACKER.md` - Integration status tracking
- `scripts/preflight_health_check.sh` - Comprehensive pre-flight checks

---

## Quick Reference

### Flags Summary

| Flag | Alias | Effect | Use Case |
|------|-------|--------|----------|
| `--with-health-check` | `--pre-health` | Pre-cycle health check only | Quick validation before cycle |
| `--with-evidence-assess` | `--post-assess` | Post-cycle assessment only | Graduation tracking |
| `--with-full-workflow` | - | Both pre & post | Complete automated workflow |

### Command Combinations

| Goal | Command |
|------|---------|
| **Quick Test** | `./scripts/af prod-cycle --mode advisory --iterations 5 --with-full-workflow` |
| **Shadow Cycle** | `./scripts/af prod-cycle --mode advisory --iterations 25 --with-full-workflow --json` |
| **Golden Swarm** | `./scripts/af prod-swarm --golden-iters 25 --with-full-workflow --default-emitters` |
| **A/B Test** | `./scripts/af prod-swarm --ab-test --variant-a-iters 25 --variant-b-iters 50 --with-full-workflow` |

---

## Migration Guide

### If you have scripts calling prod-cycle:

**Option 1: No changes needed (backward compatible)**
```bash
# This still works exactly as before
./scripts/af prod-cycle --mode advisory --iterations 25
```

**Option 2: Add workflow flags for automation**
```bash
# Add single flag for complete workflow
./scripts/af prod-cycle --mode advisory --iterations 25 --with-full-workflow
```

### If you have CI/CD pipelines:

**Before:**
```yaml
- name: Health Check
  run: ./scripts/af quick-health
  
- name: Prod Cycle
  run: ./scripts/af prod-cycle --mode advisory --iterations 25 --json

- name: Assess
  run: ./scripts/af evidence assess --json
```

**After:**
```yaml
- name: Prod Cycle with Full Workflow
  run: |
    ./scripts/af prod-cycle \
      --mode advisory \
      --iterations 25 \
      --with-full-workflow \
      --json
```

---

## FAQs

**Q: Will pre-health failures block execution?**  
A: No, health check warnings are non-blocking. The cycle will proceed even with warnings.

**Q: What if graduation_assessor.py is missing?**  
A: Post-assessment will show a warning but won't fail. The cycle completes successfully.

**Q: Can I use this in existing automation?**  
A: Yes! It's 100% backward compatible. Existing commands work unchanged.

**Q: Does this work with all circles?**  
A: Yes, all circles supported: assessor, analyst, innovator, intuitive, testing, orchestrator.

**Q: What about JSON output?**  
A: JSON mode (`--json`) is fully supported. Output is formatted if `jq` is available, otherwise raw JSON.

**Q: How do I disable formatting?**  
A: Set `JSON_OUTPUT=true` in the bash script or pipe through `cat` to get raw output.

---

**Last Updated:** 2025-12-17  
**Version:** 1.0.0  
**Status:** Production Ready
