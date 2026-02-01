# Pattern Transition Logging Guide

**Date**: 2025-11-30  
**Component**: Pattern Telemetry (NEXT #6)  
**Purpose**: Document how to log pattern transitions for observability

## Overview

Pattern transitions are critical decision points where the system changes behavior based on guardrails, budgets, or degradation strategies. Logging these transitions enables:

1. **Retrospective Analysis**: Understand why decisions were made
2. **Performance Tuning**: Identify which patterns trigger most frequently
3. **Anomaly Detection**: Detect unusual transition patterns
4. **Learning**: Feed transition data to AgentDB for pattern optimization

## Key Patterns to Log

### 1. safe_degrade Transitions

**When to Log**: System degrades from higher to lower capability level

**Example Scenarios**:
- Memory pressure → reduce batch size
- High system load → skip non-critical operations
- API rate limit → switch to fallback endpoint

**Usage**:
```bash
python3 scripts/agentic/pattern_logging_helper.py \
  --pattern safe_degrade \
  --circle orchestrator \
  --depth 4 \
  --gate gate:deploy \
  --mode enforce \
  --tags "transition" "degrade:high-to-low" \
  --pattern-state '{
    "safe_degrade": {
      "triggers": 1,
      "from_depth": 5,
      "to_depth": 3,
      "reason": "memory_pressure_threshold_exceeded",
      "actions": ["skip_autocommit", "reduce_batch_size"],
      "recovery_cycles": 2
    }
  }'
```

### 2. guardrail_lock Activation

**When to Log**: Guardrail activates to prevent unsafe operation

**Example Scenarios**:
- Test failures → block deployment
- Budget exceeded → halt new jobs
- Security scan failed → prevent release

**Usage**:
```bash
python3 scripts/agentic/pattern_logging_helper.py \
  --pattern guardrail_lock \
  --circle assessor \
  --depth 3 \
  --gate gate:quality \
  --mode enforce \
  --tags "transition" "lock:activated" \
  --pattern-state '{
    "guardrail_lock": {
      "enforced": 1,
      "trigger_condition": "test_failure_rate > 0.05",
      "health_state": "red",
      "blocked_operations": ["deploy", "merge"],
      "recovery_required": true
    }
  }'
```

### 3. iteration_budget Extension

**When to Log**: Budget extended due to incomplete work

**Example Scenarios**:
- Complex refactoring needs more cycles
- Test suite not converging
- Code review iteration requires extra rounds

**Usage**:
```bash
python3 scripts/agentic/pattern_logging_helper.py \
  --pattern iteration_budget \
  --circle analyst \
  --depth 3 \
  --gate gate:iteration \
  --mode mutate \
  --tags "transition" "budget:extended" \
  --pattern-state '{
    "iteration_budget": {
      "requested": 8,
      "original_budget": 5,
      "enforced": 7,
      "extension_reason": "unfinished_business_unsafe_to_skip",
      "autocommit_runs": 0
    }
  }'
```

### 4. depth_ladder Adjustment

**When to Log**: Circle depth changes (deeper = more detailed, shallower = faster)

**Example Scenarios**:
- Analyst → depth 5 for deep analysis
- Seeker → depth 2 for quick exploration
- Critical bug → depth 6 for thorough investigation

**Usage**:
```bash
python3 scripts/agentic/pattern_logging_helper.py \
  --pattern depth_ladder \
  --circle innovator \
  --depth 4 \
  --gate gate:calibration \
  --mode mutate \
  --tags "transition" "depth:adjusted" \
  --pattern-state '{
    "depth_ladder": {
      "from_depth": 3,
      "to_depth": 4,
      "reason": "complexity_increased",
      "trigger": "ml_training_failure_detected"
    }
  }'
```

### 5. circle_risk_focus Selection

**When to Log**: Circle rotation based on risk/priority

**Example Scenarios**:
- High priority bug → Analyst circle
- Performance issue → Assessor circle  
- New feature exploration → Innovator circle

**Usage**:
```bash
python3 scripts/agentic/pattern_logging_helper.py \
  --pattern circle_risk_focus \
  --circle analyst \
  --depth 3 \
  --gate gate:selection \
  --mode enforce \
  --tags "transition" "circle:rotated" \
  --pattern-state '{
    "circle_risk_focus": {
      "from_circle": "seeker",
      "to_circle": "analyst",
      "reason": "critical_bug_detected",
      "priority": "critical"
    }
  }'
```

## Integration with af Script

The `scripts/af` bash script should call the pattern helper on all key transitions:

```bash
# Example: Log safe_degrade when memory high
if [ "$MEMORY_PCT" -gt 85 ]; then
  python3 scripts/agentic/pattern_logging_helper.py \
    --pattern safe_degrade \
    --circle orchestrator \
    --depth "$CURRENT_DEPTH" \
    --gate gate:health \
    --mode enforce \
    --tags "transition" "memory:high" \
    --pattern-state "{\"safe_degrade\": {\"triggers\": 1, \"reason\": \"memory_threshold_85pct\"}}"
fi
```

## Observability Fields (Automatic)

All transition logs automatically include:
- `observability.host`: Hostname where transition occurred
- `observability.pid`: Process ID
- `observability.user`: User who triggered action
- `observability.environment`: dev/staging/production
- `observability.python_version`: Runtime version

## Querying Transitions

### Find all safe_degrade transitions:
```bash
grep '"pattern": "safe_degrade"' .goalie/pattern_metrics.jsonl | \
  jq -r '[.ts, .pattern_state.safe_degrade.reason] | @tsv'
```

### Count guardrail_lock activations by circle:
```bash
grep '"pattern": "guardrail_lock"' .goalie/pattern_metrics.jsonl | \
  jq -r '.circle' | sort | uniq -c
```

### Find iteration budget extensions:
```bash
grep '"pattern": "iteration_budget"' .goalie/pattern_metrics.jsonl | \
  jq 'select(.pattern_state.iteration_budget.enforced > .pattern_state.iteration_budget.requested)'
```

## Integration with AgentDB (NEXT #10)

Transition logs will feed into AgentDB for:
1. **Reflexion**: Store outcomes of safe_degrade decisions
2. **Skill Library**: Learn which patterns work best
3. **Causal Memory**: Understand pattern relationships

Example:
```python
from agentic_flow.agentdb import ReflexionMemory

# Store safe_degrade outcome
reflexion = ReflexionMemory()
reflexion.store(
    session_id="prod-cycle-123",
    task_id="deploy-v2.1",
    outcome_score=0.95,
    success=True,
    reflection="safe_degrade to depth 3 prevented memory issue"
)
```

## Best Practices

1. **Log Every Transition**: Don't skip transitions - they're critical for understanding
2. **Include Reason**: Always provide `reason` field explaining why transition occurred
3. **Tag Appropriately**: Use descriptive tags for filtering (e.g., `"memory:high"`, `"budget:extended"`)
4. **Consistent Format**: Use the pattern_logging_helper.py script, not ad-hoc JSON
5. **Mirror to Metrics**: Use `--mirror-metrics` for high-level summaries in metrics_log.jsonl

## Monitoring Dashboard Integration

The VS Code extension (NEXT #7) will visualize transitions:
- Timeline view of all transitions
- Heatmap of safe_degrade triggers by time
- Circle rotation frequency analysis
- Depth ladder adjustment trends

## Next Steps

1. ✅ Pattern telemetry schema enhanced (NOW #6)
2. 🔄 Integrate transition logging in scripts/af
3. 📊 Build VS Code extension visualizations (NEXT #7)
4. 🤖 Connect to AgentDB for learning (NEXT #10)
5. 📈 Create governance agent to analyze patterns (NEXT #8)
