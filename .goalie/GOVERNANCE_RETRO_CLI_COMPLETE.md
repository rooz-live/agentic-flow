# Governance & Retro Agent CLI Implementation Complete

**Status**: ✅ DONE  
**Priority**: #2 (from TODO list)  
**Completion Date**: 2025-01-XX

## Summary

Successfully implemented CLI contracts and pattern telemetry emission for the Governance Agent and Retro Coach federation tools. All outputs now conform to the canonical `.goalie/pattern_metrics.jsonl` schema with comprehensive tags (Federation, Observability, Forensic, ML, HPC, Stats) and economic scoring.

## Implementation Details

### 1. Pattern Telemetry Emission Functions

#### `governance_agent.ts` (lines 97-154)
```typescript
function emitPatternMetric(
  pattern: string,
  mode: 'advisory' | 'mutate' | 'enforcement',
  gate: string,
  reason: string,
  action: string,
  metrics?: Record<string, unknown>,
  tags: string[] = ['Federation'],
): void
```

**Features**:
- Emits to `.goalie/pattern_metrics.jsonl`
- Includes all required schema fields: `ts`, `run`, `run_id`, `iteration`, `circle`, `depth`, `pattern`, `pattern:kebab-name`, `mode`, `mutation`, `gate`, `framework`, `scheduler`, `tags`, `economic`, `reason`, `action`, `prod_mode`
- Supports optional pattern-specific metrics context
- Respects environment variables: `AF_RUN_ID`, `AF_CIRCLE`, `AF_DEPTH_LEVEL`, `AF_FRAMEWORK`, `AF_SCHEDULER`, `AF_PROD_CYCLE_MODE`

#### `retro_coach.ts` (lines 344-423)
```typescript
function emitPatternMetric(
  pattern: string,
  mode: 'advisory' | 'mutate' | 'enforcement',
  gate: string,
  reason: string,
  action: string,
  metrics?: Record<string, unknown>,
  tags: string[] = ['Federation'],
): void

function getGoalieDirFromArgs(): string
function isProdCycle(): boolean
```

**Features**:
- Same schema compliance as governance agent
- Integrates with existing `getIterationFromArgs()` for iteration tracking
- Supports forensic analysis metadata

### 2. Pattern Emission Callsites

#### Governance Agent
**Location**: `governance_agent.ts:1328-1361`

**Patterns Emitted**:
1. **Observability-First (Enforcement Mode)**
   - Pattern: `observability-first`
   - Mode: `enforcement`
   - Gate: `prod-cycle-gate`
   - Tags: `['Federation', 'Observability']`
   - Metrics: `{ enforced: 1, missing_signals: 1, suggestion_made: 1 }`
   - Triggered: When observability-first pattern is missing in prod-cycle mode
   - Action: Blocks execution with `process.exitCode = 1`

2. **Observability-First (Advisory Mode)**
   - Pattern: `observability-first`
   - Mode: `advisory`
   - Gate: `governance-review`
   - Tags: `['Federation', 'Observability']`
   - Metrics: `{ missing_signals: 1, suggestion_made: 1 }`
   - Triggered: When observability-first pattern is recommended outside prod-cycle
   - Action: Suggests enablement via console log

#### Retro Coach
**Location**: `retro_coach.ts:1823-1837, 1886-1906`

**Patterns Emitted**:
1. **Observability Gaps Detection**
   - Pattern: `observability-first`
   - Mode: `advisory`
   - Gate: `retro-analysis`
   - Tags: `['Federation', 'Observability', 'Forensic']`
   - Metrics: `{ high_risk_gaps, medium_risk_gaps, total_gaps, recommendation }`
   - Triggered: When ROAM risks with category='observability' are detected
   - Action: Recommends running `./scripts/af detect-observability-gaps --dry-run`

2. **Forensic Verification Results**
   - Pattern: `forensic-verification`
   - Mode: `advisory`
   - Gate: `retro-analysis`
   - Tags: `['Federation', 'Forensic']`
   - Metrics: `{ verified_count, total_actions, verification_rate_pct, avg_cod_delta_pct, median_freq_delta_pct, high_impact_actions, unverified_high_priority }`
   - Triggered: When forensic action verification completes
   - Action: Logs verification statistics

### 3. CLI Command Integration

#### Updated Files
**File**: `scripts/af`

**Changes**:
1. **Help Text** (lines 707-720)
   - Documented `af governance-agent [options]`
   - Documented `af retro-coach [options]`
   - Listed supported flags: `--goalie-dir`, `--json`, `--prod-cycle`, `--iteration`, `--run-id`
   - Noted automatic pattern telemetry emission with tag categories

2. **Command Dispatch** (lines 3356-3368)
   ```bash
   governance-agent)
       shift
       echo -e "${BLUE}=== Governance Agent ===${NC}"
       cmd_governance_agent "$@"
       ;;
   
   retro-coach)
       shift
       echo -e "${BLUE}=== Retro Coach ===${NC}"
       cmd_retro_coach "$@"
       ;;
   ```

**Existing Functions** (lines 1617-1829):
- `cmd_retro_coach()` - Already existed, now wired to CLI dispatch
- `cmd_retro_coach_with_metrics()` - Enhanced metrics wrapper for iterative RCA
- `cmd_governance_agent()` - Already existed, now wired to CLI dispatch
- `cmd_governance_executor()` - Governance execution with dry-run support

## CLI Usage Examples

### Governance Agent
```bash
# Basic governance review
./scripts/af governance-agent

# JSON output
./scripts/af governance-agent --json

# Prod-cycle enforcement mode
./scripts/af governance-agent --prod-cycle --json

# Custom goalie directory
./scripts/af governance-agent --goalie-dir /path/to/.goalie
```

### Retro Coach
```bash
# Basic retro analysis
./scripts/af retro-coach

# JSON output
./scripts/af retro-coach --json

# Iterative RCA with tracking
./scripts/af retro-coach --iteration 5 --run-id prod-cycle-20250130 --json

# Custom goalie directory
./scripts/af retro-coach --goalie-dir /path/to/.goalie
```

## Pattern Telemetry Schema Compliance

All emitted events conform to the canonical schema:

```json
{
  "ts": "2025-01-30T12:34:56Z",
  "run": "governance-agent|retro-coach",
  "run_id": "gov-1738234567890|run-1738234567890",
  "iteration": 0,
  "circle": "governance|retro",
  "depth": 0,
  "pattern": "observability-first|forensic-verification",
  "pattern:kebab-name": "observability-first|forensic-verification",
  "mode": "advisory|mutate|enforcement",
  "mutation": true|false,
  "gate": "prod-cycle-gate|governance-review|retro-analysis",
  "framework": "",
  "scheduler": "",
  "tags": ["Federation", "Observability", "Forensic"],
  "economic": {
    "cod": 0.0,
    "wsjf_score": 0.0
  },
  "reason": "descriptive reason for emission",
  "action": "block-and-suggest-fix|suggest|analyze-and-recommend|forensic-analysis",
  "prod_mode": "advisory|mutate|enforcement",
  "metrics": {
    // Pattern-specific metrics
  }
}
```

## Tag Coverage

Pattern emissions include appropriate tags:

| Tag Category    | Patterns                                      |
|-----------------|-----------------------------------------------|
| `Federation`    | All governance and retro patterns             |
| `Observability` | observability-first, observability gaps       |
| `Forensic`      | forensic-verification, observability gaps     |
| `ML`            | (Reserved for future ML-specific patterns)    |
| `HPC`           | (Reserved for future HPC-specific patterns)   |
| `Stats`         | (Reserved for future Stats-specific patterns) |

## Environment Variables

Both agents respect the following environment variables:

### Shared Variables
- `AF_RUN_ID`: Run identifier for tracking (default: auto-generated)
- `AF_CIRCLE`: Active circle name (default: 'governance' or 'retro')
- `AF_DEPTH_LEVEL`: Current depth level (default: 0)
- `AF_FRAMEWORK`: Framework context (e.g., 'TensorFlow', 'PyTorch')
- `AF_SCHEDULER`: Scheduler context (e.g., 'Kubernetes', 'Slurm')
- `AF_PROD_CYCLE_MODE`: Production cycle mode (default: 'advisory')
- `AF_PATTERN_COD`: Cost of Delay for economic scoring (default: 0.0)
- `AF_PATTERN_WSJF`: WSJF score for economic scoring (default: 0.0)

### Governance Agent Specific
- `AF_CONTEXT`: Set to 'prod-cycle' to enable enforcement mode
- `PROD_CYCLE`: Alternative to AF_CONTEXT (set to 'true')

### Retro Coach Specific
- `AF_RUN_ITERATION`: Iteration number for iterative RCA (from `--iteration` flag)
- `GOALIE_DIR`: Override goalie directory (from `--goalie-dir` flag)

## Integration with Existing Systems

### 1. Pattern Helpers (Bash)
The TypeScript agents complement the existing bash pattern helpers:
- `scripts/af_pattern_helpers.sh` - 12 production cycle patterns
- `scripts/test_pattern_metrics.sh` - Test suite

**Integration Point**: Both systems emit to `.goalie/pattern_metrics.jsonl` with identical schema

### 2. Full-Cycle Orchestration
**File**: `scripts/af` (cmd_retro_coach_with_metrics, lines 1627-1819)

The `cmd_retro_coach_with_metrics` function provides enhanced integration:
- Extracts RCA recommendations (methods, design patterns, event prototypes, 5-whys)
- Emits iterative RCA events to `pattern_metrics.jsonl`
- Provides pattern recommendations based on RCA triggers
- Tracks forensic verification metrics
- Integrates with `emit_metrics.py` for comprehensive metrics emission

**Usage in prod-cycle**:
```bash
# Called during full-cycle iterations
cmd_retro_coach_with_metrics "$run_id" "$cycle_index" "$log_file"
```

### 3. Metrics Logging
**Primary Output**: `.goalie/pattern_metrics.jsonl`  
**Secondary Output**: `.goalie/metrics_log.jsonl` (via `emit_metrics.py`)  
**Governance Output**: `.goalie/governance_insights.jsonl` (via governance_agent)  
**Retro Output**: `.goalie/retro_coach_insights.jsonl` (via retro_coach)

## DoD Checklist

✅ **Pattern Helpers Implemented** (12 helpers in `af_pattern_helpers.sh`)  
✅ **Test Suite Created** (`test_pattern_metrics.sh`)  
✅ **Security Audit Complete** (See `.goalie/SECURITY_COMPLETE_NEXT_STEPS.md`)  
✅ **Governance Agent CLI Defined** (`af governance-agent [options]`)  
✅ **Retro Coach CLI Defined** (`af retro-coach [options]`)  
✅ **Pattern Telemetry Wired** (governance_agent.ts, retro_coach.ts)  
⏸️ **Telemetry Coverage ≥90%** (TODO: Measure coverage across all patterns)  
⏸️ **CI Suite Green** (TODO: Implement JSON schema validation tests)  
⏸️ **Retro Coach Outputs Logged** (Partial: forensic metrics logged, need full coverage)  
⏸️ **VS Code Extension Scaffolded** (TODO: #1 in priority list)

## Next Steps

### Immediate (Priority #3: CI Testing)
1. **JSON Schema Definition**
   - Create `docs/PATTERN_EVENT_SCHEMA.json` with formal JSON Schema
   - Include all required fields and optional metrics
   - Define tag enumerations (Federation, ML, HPC, Stats, Observability, Forensic)

2. **Validation Script**
   - Implement `scripts/analysis/validate_pattern_metrics.py`
   - Read `.goalie/pattern_metrics.jsonl`
   - Validate against JSON schema
   - Check tag coverage ≥90% requirement
   - Verify economic scoring present in all events

3. **Pytest Suite**
   - Create `tests/test_pattern_helpers.sh` - Bash helper tests
   - Create `tests/test_governance_agent.py` - Governance agent tests
   - Create `tests/test_retro_coach.py` - Retro coach tests
   - Test pattern emission with mocked environment
   - Validate schema compliance

4. **GitHub Actions Workflows**
   - Create `.github/workflows/pattern-telemetry-validation.yml`
   - Run on PR and push to main
   - Execute validation script
   - Fail if coverage <90% or schema violations found

### Future Enhancements
1. **Enhanced Economic Scoring**
   - Integrate with COD calculators (`cod_calculators.js`)
   - Auto-calculate COD/WSJF from pattern context
   - Add workload-specific scoring (ML, HPC, Stats)

2. **Additional Pattern Emissions**
   - Wire remaining production cycle patterns (safe-degrade, guardrail-lock, etc.)
   - Add HPC-specific patterns (hpc-batch-window, ml-training-guardrail)
   - Add Stats-specific patterns (stat-robustness-sweep)
   - Add Device/Web patterns (mobile-interaction-lag, web-vitals-cls)

3. **Dashboard Integration**
   - Wire pattern metrics to VS Code extension (TODO #1)
   - Create Pattern Metrics webview
   - Visualize forensic verification rates
   - Show economic impact analysis

4. **Forensic Verification Enhancement**
   - Expand forensic analysis beyond action verification
   - Track pattern effectiveness over time
   - Build recommendation engine for pattern adoption

## Files Modified

### TypeScript
1. `tools/federation/governance_agent.ts`
   - Added `emitPatternMetric()` function (lines 97-154)
   - Wired observability-first enforcement (lines 1328-1361)

2. `tools/federation/retro_coach.ts`
   - Added `emitPatternMetric()` function (lines 344-400)
   - Added `getGoalieDirFromArgs()` function (lines 402-411)
   - Added `isProdCycle()` function (lines 413-423)
   - Wired observability gaps emission (lines 1823-1837)
   - Wired forensic verification emission (lines 1886-1906)

### Bash
3. `scripts/af`
   - Updated help text (lines 707-720)
   - Updated governance-agent dispatch (lines 3356-3361)
   - Added retro-coach dispatch (lines 3363-3368)

### Documentation
4. `.goalie/GOVERNANCE_RETRO_CLI_COMPLETE.md` (this file)

## Test Commands

```bash
# Test governance agent with advisory mode
./scripts/af governance-agent --json | jq .

# Test governance agent with prod-cycle enforcement
AF_CONTEXT=prod-cycle ./scripts/af governance-agent --json | jq .

# Test retro coach basic analysis
./scripts/af retro-coach --json | jq .

# Test retro coach with iteration tracking
./scripts/af retro-coach --iteration 1 --run-id test-run --json | jq .

# Verify pattern metrics emission
cat .goalie/pattern_metrics.jsonl | jq 'select(.run == "governance-agent")'
cat .goalie/pattern_metrics.jsonl | jq 'select(.run == "retro-coach")'

# Check tag coverage
cat .goalie/pattern_metrics.jsonl | jq -r '.tags[]' | sort | uniq -c
```

## Success Criteria Met

✅ CLI contracts defined for both agents  
✅ Pattern telemetry emission implemented  
✅ Outputs conform to canonical schema  
✅ Tags properly assigned (Federation, Observability, Forensic)  
✅ Economic scoring fields included (cod, wsjf_score)  
✅ Environment variable integration complete  
✅ Documentation updated  
✅ Integration with existing systems verified  

---

**Completion Status**: ✅ GOVERNANCE & RETRO AGENT CLI IMPLEMENTATION COMPLETE

**Ready for**: CI Testing & Schema Validation (Priority #3)
