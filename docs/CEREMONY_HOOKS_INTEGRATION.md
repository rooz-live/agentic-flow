# Ceremony Hooks Integration

Complete integration of dynamic ceremony lifecycle hooks across the ay/yo workflow system.

## Architecture

### Hook System Design

```
PRE-CEREMONY → CEREMONY → POST-CEREMONY → BATCH-ANALYSIS → POST-BATCH
     ↓             ↓             ↓                ↓              ↓
 - WSJF        Execute      Observability    Pattern       Retro
 - Risk                     Gaps             Stats         Approval
 - ROAM                     ROAM Auto-                    Economic
                            Escalation                    Calc
                            Metrics                       Alignment
                                                          Graduation
```

### Lifecycle Stages

1. **PRE-CEREMONY**: Validate conditions before ceremony execution
   - WSJF priority check
   - Risk threshold validation
   - ROAM blocker detection

2. **CEREMONY**: Standard execution (handled by ay-prod-cycle.sh)

3. **POST-CEREMONY**: Immediate post-execution checks
   - Observability gap detection
   - ROAM auto-escalation on failure
   - Ceremony metrics recording

4. **BATCH-ANALYSIS**: Periodic analysis across multiple ceremonies
   - Pattern statistics (every 10 ceremonies)
   - Causal experiment analysis (with --analyze flag)

5. **POST-BATCH**: Final checks after learning loop completion
   - Retro approval verification
   - Economic attribution calculation
   - Alignment verification
   - Graduation assessment

## Integration Points

### 1. ay-prod-cycle.sh

**Location**: `scripts/ay-prod-cycle.sh`

**Hooks Integrated**:
- Line 8-11: Source ceremony-hooks.sh
- Line 157-160: PRE-CEREMONY hooks before execution
- Line 223-226: POST-CEREMONY hooks on success
- Line 231-234: POST-CEREMONY hooks on failure

**Example**:
```bash
./scripts/ay-prod-cycle.sh orchestrator standup
```

### 2. ay-prod-learn-loop.sh

**Location**: `scripts/ay-prod-learn-loop.sh`

**Hooks Integrated**:
- Line 8-11: Source ceremony-hooks.sh
- Line 170-173: BATCH-ANALYSIS hooks (periodic)
- Line 178-180: BATCH-ANALYSIS hooks (causal)
- Line 344-347: POST-BATCH hooks (final)

**Example**:
```bash
./scripts/ay-prod-learn-loop.sh --analyze 20
```

### 3. ay-yo-enhanced.sh

**Location**: `scripts/ay-yo-enhanced.sh`

**Hooks Integrated**:
- Line 8-11: Source ceremony-hooks.sh
- Line 587-594: `hooks` command to show configuration

**Example**:
```bash
./scripts/ay-yo-enhanced.sh hooks
```

## Environment Variables

### Master Switch
```bash
export ENABLE_CEREMONY_HOOKS=1  # Default: 1 (enabled)
```

### Pre-Ceremony Hooks
```bash
export ENABLE_WSJF_CHECK=1        # Check WSJF priorities
export ENABLE_RISK_CHECK=1        # Validate risk thresholds
export ENABLE_ROAM_CHECK=1        # Detect ROAM blockers
```

### Post-Ceremony Hooks
```bash
export ENABLE_OBSERVABILITY_CHECK=1  # Default: 1
export ENABLE_ROAM_ESCALATION=1      # Auto-escalate on failure
export ENABLE_CEREMONY_METRICS=1     # Default: 1
```

### Batch-Analysis Hooks
```bash
export ENABLE_PATTERN_ANALYSIS=1  # Analyze patterns every 10 ceremonies
```

### Post-Batch Hooks
```bash
export ENABLE_RETRO_APPROVAL=1      # Check retro approval before commit
export ENABLE_ECONOMIC_CALC=1       # Calculate economic attribution
export ENABLE_ALIGNMENT_CHECK=1     # Verify alignment
export ENABLE_GRADUATION_REPORT=1   # Generate graduation assessment
```

## Configuration Examples

### Phase 1: Essentials (Recommended Start)

```bash
# Enable only high-priority, low-effort hooks
export ENABLE_CEREMONY_HOOKS=1
export ENABLE_OBSERVABILITY_CHECK=1
export ENABLE_CEREMONY_METRICS=1
export ENABLE_WSJF_CHECK=1
```

### Phase 2: Risk & Governance

```bash
# Add risk and compliance checks
export ENABLE_RISK_CHECK=1
export ENABLE_ROAM_CHECK=1
export ENABLE_ROAM_ESCALATION=1
export ENABLE_RETRO_APPROVAL=1
```

### Phase 3: Full Observability

```bash
# Enable all analytics
export ENABLE_PATTERN_ANALYSIS=1
export ENABLE_ECONOMIC_CALC=1
export ENABLE_ALIGNMENT_CHECK=1
export ENABLE_GRADUATION_REPORT=1
```

## Usage Examples

### Basic Ceremony with Hooks

```bash
# Enable observability check
export ENABLE_OBSERVABILITY_CHECK=1

# Run ceremony
./scripts/ay-prod-cycle.sh orchestrator standup
```

**Output**:
```
[HOOK] ═══ PRE-CEREMONY HOOKS (orchestrator::standup) ═══

[INFO] Executing standup ceremony for orchestrator circle
...
[HOOK] ═══ POST-CEREMONY HOOKS (orchestrator::standup) ═══
[HOOK] Detecting observability gaps for orchestrator::standup...
[HOOK-✓] No observability gaps
```

### Learning Loop with Full Analysis

```bash
# Enable all hooks
export ENABLE_CEREMONY_HOOKS=1
export ENABLE_OBSERVABILITY_CHECK=1
export ENABLE_PATTERN_ANALYSIS=1
export ENABLE_RETRO_APPROVAL=1

# Run with auto-analysis
./scripts/ay-prod-learn-loop.sh --analyze 20
```

**Features**:
- Observability checks after each ceremony
- Pattern analysis every 10 ceremonies
- Causal analysis every 5 iterations
- Retro approval check at completion

### Dashboard Hook Configuration

```bash
# View current hook configuration
./scripts/ay-yo-enhanced.sh hooks
```

**Output**:
```
═══ Ceremony Hook Configuration ═══

Environment Variables:
  ENABLE_CEREMONY_HOOKS=1 (master switch)

Pre-Ceremony:
  ENABLE_WSJF_CHECK=0
  ENABLE_RISK_CHECK=0
  ENABLE_ROAM_CHECK=0

Post-Ceremony:
  ENABLE_OBSERVABILITY_CHECK=1
  ENABLE_ROAM_ESCALATION=0
  ENABLE_CEREMONY_METRICS=1

Batch-Analysis:
  ENABLE_PATTERN_ANALYSIS=0

Post-Batch:
  ENABLE_RETRO_APPROVAL=0
  ENABLE_ECONOMIC_CALC=0
  ENABLE_ALIGNMENT_CHECK=0
  ENABLE_GRADUATION_REPORT=0
```

## Integrated Capabilities

### 1. WSJF Management (cmd_wsjf.py)
- **Hook**: PRE-CEREMONY
- **Purpose**: Shows top WSJF priorities before ceremony
- **Enable**: `ENABLE_WSJF_CHECK=1`

### 2. Observability Gaps (cmd_detect_observability_gaps.py)
- **Hook**: POST-CEREMONY
- **Purpose**: Detects missing metrics/traces in episodes
- **Enable**: `ENABLE_OBSERVABILITY_CHECK=1` (default)

### 3. Pattern Stats (cmd_pattern_stats_enhanced.py)
- **Hook**: BATCH-ANALYSIS
- **Purpose**: Analyzes patterns every 10 ceremonies
- **Enable**: `ENABLE_PATTERN_ANALYSIS=1`

### 4. Retro Approval (cmd_retro.py)
- **Hook**: POST-BATCH
- **Purpose**: Verifies retro approval before final commit
- **Enable**: `ENABLE_RETRO_APPROVAL=1`

### 5. Risk Analytics (agentic/risk_analytics.py)
- **Hook**: PRE-CEREMONY
- **Purpose**: Validates risk thresholds
- **Enable**: `ENABLE_RISK_CHECK=1`

### 6. Economic Calculator (agentic/economic_calculator.py)
- **Hook**: POST-BATCH
- **Purpose**: Calculates economic attribution
- **Enable**: `ENABLE_ECONOMIC_CALC=1`

### 7. Alignment Checker (agentic/alignment_checker.py)
- **Hook**: POST-BATCH
- **Purpose**: Verifies alignment with objectives
- **Enable**: `ENABLE_ALIGNMENT_CHECK=1`

### 8. ROAM Auto-Escalation (agentic/roam_auto_escalation.py)
- **Hook**: POST-CEREMONY (on failure)
- **Purpose**: Auto-escalates ROAM on ceremony failure
- **Enable**: `ENABLE_ROAM_ESCALATION=1`

## Metrics & Observability

### Ceremony Metrics

All ceremonies record metrics to `.goalie/ceremony_metrics.jsonl`:

```json
{
  "timestamp": "2025-01-08T12:00:00Z",
  "circle": "orchestrator",
  "ceremony": "standup",
  "duration": 5,
  "type": "ceremony_completion"
}
```

### Hook Logs

Hook execution is logged with distinctive prefixes:
- `[HOOK]` - General hook activity
- `[HOOK-✓]` - Success
- `[HOOK-⚠]` - Warning
- `[HOOK-✗]` - Error

## Troubleshooting

### Hooks Not Running

**Problem**: Hooks don't execute during ceremonies.

**Solution**:
```bash
# Check if hooks are enabled
echo $ENABLE_CEREMONY_HOOKS

# Enable master switch
export ENABLE_CEREMONY_HOOKS=1

# Verify hook script exists
ls scripts/hooks/ceremony-hooks.sh
```

### Missing Dependencies

**Problem**: Hook script fails with "command not found".

**Solution**:
```bash
# Check Python dependencies
python3 scripts/cmd_wsjf.py --help
python3 scripts/cmd_detect_observability_gaps.py --help

# Check TypeScript/Node
tsx --version
```

### Hook Failures Don't Block Execution

**Behavior**: This is by design - hooks are non-blocking.

**Why**: Hooks provide visibility and automation but shouldn't prevent ceremonies from running. All hook failures are logged but don't exit with error codes.

## Migration Path

### From No Hooks → Phase 1

1. No configuration needed - observability checks enabled by default
2. Run ceremonies as normal
3. Check `.goalie/ceremony_metrics.jsonl` for recorded metrics

### From Phase 1 → Phase 2

```bash
# Add to your shell profile or .env
export ENABLE_WSJF_CHECK=1
export ENABLE_RISK_CHECK=1
export ENABLE_ROAM_CHECK=1
```

### From Phase 2 → Phase 3

```bash
# Enable all remaining hooks
export ENABLE_PATTERN_ANALYSIS=1
export ENABLE_RETRO_APPROVAL=1
export ENABLE_ECONOMIC_CALC=1
export ENABLE_ALIGNMENT_CHECK=1
export ENABLE_GRADUATION_REPORT=1
```

## Best Practices

1. **Start with defaults**: Observability check + metrics are enabled by default
2. **Enable incrementally**: Add one hook at a time, verify behavior
3. **Monitor failures**: Check hook warnings/errors in ceremony output
4. **Use batch hooks sparingly**: Pattern analysis and economic calc add overhead
5. **Retro approval for prod**: Enable `ENABLE_RETRO_APPROVAL=1` before production deployments

## Implementation Details

### Hook Function Signatures

```bash
# Pre-ceremony
run_pre_ceremony_hooks <circle> <ceremony>

# Post-ceremony
run_post_ceremony_hooks <circle> <ceremony> <exit_code> <episode_file> <duration> <error_msg>

# Batch-analysis
run_batch_analysis_hooks <total_ceremonies> <trigger_reason>

# Post-batch
run_post_batch_hooks <total_ceremonies>
```

### Function Availability Checks

All scripts check function availability before calling:

```bash
if declare -f run_pre_ceremony_hooks >/dev/null 2>&1; then
  run_pre_ceremony_hooks "$circle" "$ceremony"
fi
```

This ensures graceful degradation if hooks aren't loaded.

## Related Documentation

- [Causal Learning Integration](CAUSAL_LEARNING_INTEGRATION.md)
- [Production Cycle Guide](../scripts/README.md)
- [Dashboard Usage](AY_YO_ENHANCED.md)

## Testing

### Test Single Hook

```bash
# Source hooks manually
source scripts/hooks/ceremony-hooks.sh

# Test configuration display
show_hook_config

# Test pre-ceremony hook
ENABLE_WSJF_CHECK=1 run_pre_ceremony_hooks orchestrator standup
```

### Test Full Integration

```bash
# Run ceremony with observability check
ENABLE_OBSERVABILITY_CHECK=1 ./scripts/ay-prod-cycle.sh orchestrator standup

# Run learning loop with all phase 1 hooks
export ENABLE_CEREMONY_HOOKS=1
export ENABLE_OBSERVABILITY_CHECK=1
export ENABLE_WSJF_CHECK=1
./scripts/ay-prod-learn-loop.sh --analyze 10
```

## Contribution Guidelines

### Adding New Hooks

1. Add function to `scripts/hooks/ceremony-hooks.sh`
2. Add environment variable check with sensible default
3. Export function at bottom of file
4. Update `show_hook_config()` to display new variable
5. Update this documentation

### Hook Development Principles

- **Non-blocking**: Never exit with error, always log and continue
- **Opt-in**: Default to disabled for non-essential hooks
- **Idempotent**: Safe to run multiple times
- **Fast**: Complete in <1s for ceremony-level hooks
- **Observable**: Log all actions with clear prefixes
