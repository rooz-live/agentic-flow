# Pattern Telemetry Validation - Quick Start Guide

**Status**: ✅ CI/CD Infrastructure Complete  
**Date**: 2025-11-30

## Installation

Since your Python is externally managed by Homebrew, use the project virtual environment:

```bash
# Already created for you
source .venv/bin/activate

# Dependencies already installed
# - jsonschema
# - pytest
```

## Running Validations

### 1. Validate JSON Schema
```bash
.venv/bin/python3 -c "
import json
from jsonschema import Draft202012Validator
schema = json.load(open('docs/PATTERN_EVENT_SCHEMA.json'))
Draft202012Validator.check_schema(schema)
print('✓ Schema is valid')
"
```

### 2. Validate Pattern Metrics
```bash
.venv/bin/python3 scripts/analysis/validate_pattern_metrics.py
```

### 3. Run Pytest Suite
```bash
.venv/bin/pytest tests/test_pattern_schema.py -v --tb=short
```

## Current Validation Results

**Metrics File**: `.goalie/pattern_metrics.jsonl` (2396 events)

### Issues Found (2025-11-30)

1. **Schema Validation**: 2394/2396 events FAILED
   - **Missing `run_id` field** (required)
   - Most events from legacy format before schema standardization

2. **Tag Coverage**: 5.2% (threshold: 90.0%)
   - Only 124 events have tags
   - Most events missing categorization

3. **Economic Scoring**: 2249/2396 events missing COD/WSJF
   - 147 events have economic scoring
   - Most legacy events don't include economic data

### JSON Parsing Issues
- Line 1: Extra data after JSON
- Line 74: Extra data after JSON  
- Line 171: Invalid JSON formatting
- Line 2391-2399: Invalid JSON

## Fixing the Metrics File

The existing `.goalie/pattern_metrics.jsonl` contains **legacy events** that don't conform to the new schema. Here are your options:

### Option 1: Clean Slate (Recommended)
```bash
# Backup existing metrics
mv .goalie/pattern_metrics.jsonl .goalie/pattern_metrics.jsonl.legacy

# Start fresh with new events
# New events will automatically conform to schema
```

### Option 2: Fix Existing Events
```bash
# Create migration script
.venv/bin/python3 scripts/analysis/migrate_legacy_metrics.py

# This would:
# - Add missing run_id fields
# - Add tags based on pattern names
# - Add economic scoring (defaults: cod=0.0, wsjf_score=0.0)
# - Fix JSON formatting issues
```

### Option 3: Filter Valid Events
```bash
# Extract only valid events
.venv/bin/python3 -c "
import json
from jsonschema import Draft202012Validator

schema = json.load(open('docs/PATTERN_EVENT_SCHEMA.json'))
validator = Draft202012Validator(schema)

with open('.goalie/pattern_metrics.jsonl', 'r') as f:
    with open('.goalie/pattern_metrics_valid.jsonl', 'w') as out:
        for line in f:
            try:
                event = json.loads(line.strip())
                validator.validate(event)
                out.write(json.dumps(event) + '\n')
            except:
                pass

print('Valid events extracted to .goalie/pattern_metrics_valid.jsonl')
"
```

## Generating New Valid Events

All new telemetry emission code now conforms to the schema:

### Bash Helpers
```bash
# Source pattern helpers
source scripts/af_pattern_helpers.sh

# Emit valid events
log_safe_degrade "advisory" "health" "High load" "degrade-to-minimal"
log_observability_first "advisory" "prod-cycle-gate" "Metrics written" "track-coverage"
```

### TypeScript Agents
```bash
# Governance agent (emits valid events)
./scripts/af governance-agent --json

# Retro coach (emits valid events)
./scripts/af retro-coach --json
```

### Full Production Cycle
```bash
# Run full cycle (all events will be valid)
./scripts/af full-cycle --circle orchestrator 3
```

## Validation in CI/CD

The GitHub Actions workflow is configured to:
- Validate schema on every PR/push
- Check tag coverage ≥90%
- Verify economic scoring 100%
- Comment on PRs with results
- Block merge if validation fails

**Workflow**: `.github/workflows/pattern-telemetry-validation.yml`

## Understanding Validation Errors

### Schema Validation Errors

**Missing required field**:
```
Event #1 (pattern=depth-ladder, ts=2025-11-19T20:31:01Z): 'run_id' is a required property
```
**Fix**: Add `run_id` to event (auto-generated in new code)

**Invalid type**:
```
Event #42 (pattern=..., ts=...): False is not of type 'string'
```
**Fix**: Check field types match schema

### Tag Coverage Errors

**Below threshold**:
```
Tag coverage: 5.2% < 90.0% threshold
```
**Fix**: Ensure all events have at least one tag from enum

### Economic Scoring Errors

**Missing fields**:
```
Event #1 (pattern=depth-ladder, ts=...): missing cod, wsjf_score
```
**Fix**: Add `economic: {cod: 0.0, wsjf_score: 0.0}` to all events

## Schema Reference

### Required Fields
Every event MUST have:
- `ts` (ISO 8601 timestamp)
- `run` (run type)
- `run_id` (unique run identifier)
- `iteration` (cycle number)
- `circle` (analyst|assessor|innovator|intuitive|orchestrator|seeker|governance|retro|unknown)
- `depth` (0-4)
- `pattern` (kebab-case pattern name)
- `pattern:kebab-name` (same as pattern)
- `mode` (advisory|mutate|enforcement)
- `mutation` (boolean)
- `gate` (quality gate name)
- `framework` (empty string or framework name)
- `scheduler` (empty string or scheduler name)
- `tags` (array with at least one tag)
- `economic` (object with cod and wsjf_score)
- `reason` (string)
- `action` (string)
- `prod_mode` (advisory|mutate|enforcement)

### Valid Tags
- Federation
- ML
- HPC
- Stats
- Device/Web
- Observability
- Forensic
- Rust

### Valid Circles
- analyst
- assessor
- innovator
- intuitive
- orchestrator
- seeker
- governance
- retro
- unknown

## Troubleshooting

### Virtual Environment Issues
```bash
# Recreate venv if needed
rm -rf .venv
python3 -m venv .venv
.venv/bin/pip install jsonschema pytest
```

### Pytest Config Error
If you see "Unknown config option: env", ignore - this is a warning from an existing pytest.ini file.

### Import Errors
```bash
# Ensure you're using the venv Python
.venv/bin/python3 scripts/analysis/validate_pattern_metrics.py

# NOT: python3 scripts/analysis/validate_pattern_metrics.py
```

## Next Steps

1. **Decide on metrics file strategy** (clean slate recommended)
2. **Generate new events** using updated code
3. **Run validation** to confirm ≥90% tag coverage
4. **Enable CI workflow** by pushing changes
5. **Monitor PR comments** for validation results

## Example Valid Event

```json
{
  "ts": "2025-11-30T23:58:00Z",
  "run": "governance-agent",
  "run_id": "gov-1732835880",
  "iteration": 0,
  "circle": "governance",
  "depth": 0,
  "pattern": "observability-first",
  "pattern:kebab-name": "observability-first",
  "mode": "enforcement",
  "mutation": true,
  "gate": "prod-cycle-gate",
  "framework": "",
  "scheduler": "",
  "tags": ["Federation", "Observability"],
  "economic": {
    "cod": 0.0,
    "wsjf_score": 0.0
  },
  "reason": "observability-first pattern missing in prod-cycle",
  "action": "block-and-suggest-fix",
  "prod_mode": "enforcement",
  "metrics": {
    "enforced": 1,
    "missing_signals": 1,
    "suggestion_made": 1
  }
}
```

## Support

- Schema: `docs/PATTERN_EVENT_SCHEMA.json`
- Validation script: `scripts/analysis/validate_pattern_metrics.py`
- Test suite: `tests/test_pattern_schema.py`
- Implementation guide: `.goalie/GOVERNANCE_RETRO_CLI_COMPLETE.md`
- Full details: `.goalie/CI_TESTING_COMPLETE.md`
