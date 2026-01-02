# Pattern Logging Enhancements & Federation Integration

## Overview
Enhanced pattern logging in `af prod-cycle` with better behavioral vs mutation distinction, plus new federation agent integration for automated anomaly detection and governance adjustments.

## Changes Made

### 1. Enhanced `log_pattern_event` Function (scripts/af)

**Behavioral Type Classification**:
- `advisory`: Observational pattern events without state changes
- `blocking`: Enforcement events that prevent actions (e.g., `block-`, `prevent-`, `deny-`)
- `mutation`: Events that actively change system state (e.g., `set-`, `change-`, `modify-`)
- `enforcement`: General enforcement actions

**New Metadata Fields**:
- `behavioral_type`: Categorizes the event behavior
- `mutation_status`: Boolean indicating if state was mutated

**Mode Detection Logic**:
```bash
case "$mode" in
    mutate|mutation|enforce)
        mutation_status="true"
        behavioral_type="mutation"
        ;;
    advisory|observe)
        mutation_status="false"
        behavioral_type="advisory"
        ;;
    enforcement)
        # Smart detection based on action prefix
        if [[ "$action" =~ ^(block|prevent|deny|throttle)- ]]; then
            behavioral_type="blocking"
        elif [[ "$action" =~ ^(set|change|modify|update)- ]]; then
            mutation_status="true"
            behavioral_type="mutation"
        fi
        ;;
esac
```

### 2. Pattern Metrics Analyzer (`tools/federation/pattern_metrics_analyzer.ts`)

**Capabilities**:
- **Anomaly Detection**: Identifies 5 types of anomalies
  - Pattern overuse (e.g., safe-degrade triggered too often)
  - Pattern underuse (e.g., observability-first coverage <50%)
  - Mutation spikes (>70% mutation rate in recent events)
  - Behavioral drift (inconsistent mode usage across patterns)
  - Economic degradation (rising Cost of Delay)

- **Governance Adjustments**: Auto-proposes parameter changes
  - Threshold adjustments (e.g., `safe_degrade.incident_threshold: 8 → 10`)
  - Budget increases (e.g., `iteration_budget.max_iterations: 100 → 120`)
  - Mode enforcement (e.g., enable `AF_GOVERNANCE_EXECUTOR_DRY_RUN`)

- **Retro Question Generation**: Context-aware questions based on patterns
  - Technical: Root cause analysis questions
  - Governance: Policy and threshold questions
  - Process: Workflow and coverage questions
  - Learning: Validation and improvement questions

**Usage**:
```bash
# Full analysis with report generation
./scripts/af pattern-analysis

# JSON output for programmatic consumption
./scripts/af pattern-analysis --json

# Just show anomalies
./scripts/af pattern-anomalies

# Custom output location
./scripts/af pattern-analysis --output=/tmp/analysis.json
```

### 3. New Commands in `af` Script

**`af pattern-analysis`**:
- Analyzes `.goalie/pattern_metrics.jsonl`
- Generates comprehensive report
- Writes to `.goalie/pattern_analysis_report.json` by default

**`af pattern-anomalies`**:
- Quick view of detected anomalies
- Pipes analyzer output through `jq` to extract anomalies

## Pattern Metrics Schema Enhancements

All pattern events now include:
```json
{
  "ts": "2025-12-01T16:00:00Z",
  "pattern": "safe-degrade",
  "mode": "enforcement",
  "metadata": {
    "behavioral_type": "blocking",
    "mutation_status": false,
    "reason": "high-system-load",
    "action": "block-autocommit"
  }
}
```

## Integration with Federation Agents

### Retro Coach Integration
The pattern analyzer automatically generates retro questions that can be consumed by `retro_coach.ts`:

```typescript
// Auto-generated questions based on pattern anomalies
{
  "category": "technical",
  "question": "What root causes are triggering safe-degrade pattern 7 times?",
  "context": "Safe-degrade pattern triggered 7 times in recent cycles",
  "triggered_by": ["safe-degrade", "pattern_overuse"]
}
```

### Governance Agent Integration
Proposed adjustments can be applied by governance agent:

```typescript
{
  "parameter": "safe_degrade.incident_threshold",
  "current_value": 8,
  "suggested_value": 10,
  "reason": "Frequent safe-degrade triggers indicate threshold may be too sensitive",
  "pattern_trigger": "safe-degrade overuse detected"
}
```

## Workflow Examples

### 1. Daily Pattern Health Check
```bash
# Run analysis
./scripts/af pattern-analysis

# Check for critical anomalies
./scripts/af pattern-anomalies | jq '.[] | select(.severity == "critical")'

# Generate retro questions from analysis
./scripts/af retro-coach --json | jq '.retro_questions'
```

### 2. Prod-Cycle with Pattern Tracking
```bash
# Run prod-cycle with all pattern logging enabled
AF_PROD_SAFE_DEGRADE=1 \
AF_PROD_OBSERVABILITY_FIRST=1 \
AF_PROD_CIRCLE_RISK_FOCUS=1 \
./scripts/af prod-cycle 10

# Analyze results
./scripts/af pattern-analysis
```

### 3. Automated Governance Tuning
```bash
# Run analysis and extract adjustments
ADJUSTMENTS=$(./scripts/af pattern-analysis --json | jq '.governance_adjustments')

# Apply adjustments via governance agent
echo "$ADJUSTMENTS" | npx tsx tools/federation/governance_agent.ts --apply-adjustments
```

## Anomaly Detection Thresholds

| Anomaly Type | Trigger Condition | Severity |
|--------------|-------------------|----------|
| Safe-degrade overuse | ≥5 triggers in last 20 events | HIGH |
| Observability underuse | <50% coverage across runs | CRITICAL |
| Mutation spike | ≥70% mutations in last 10 events | MEDIUM |
| Behavioral drift | >2 unique modes per pattern | MEDIUM |
| Economic degradation | Average COD >50 | HIGH |

## Pattern Coverage Targets

Based on the analysis framework:
- **Observability-first**: Target 90%+ coverage (currently enforced as CRITICAL if <50%)
- **Safe-degrade**: Target <5 triggers per 20 cycles (HIGH severity if ≥5)
- **Mutation events**: Target <50% of total events (MEDIUM severity if ≥70%)

## Next Steps

1. **Integration with CI/CD**: Add `af pattern-anomalies` check to CI pipeline
2. **Dashboard Visualization**: Use analysis report in VS Code extension
3. **Automated Tuning**: Wire governance adjustments into prod-cycle
4. **Historical Trending**: Track anomaly counts over time for pattern health metrics

## Testing

To test the enhancements:

```bash
# 1. Ensure pattern metrics exist
tail -20 .goalie/pattern_metrics.jsonl

# 2. Run analyzer
./scripts/af pattern-analysis

# 3. Verify report
cat .goalie/pattern_analysis_report.json | jq '.summary'

# 4. Check anomaly detection
./scripts/af pattern-anomalies
```

## Dependencies

- **Node.js**: For running TypeScript analyzer
- **jq**: For JSON processing in CLI
- **npx/tsx**: For TypeScript execution

## Files Modified/Created

1. **scripts/af** (modified):
   - Enhanced `log_pattern_event` with behavioral type classification
   - Added `pattern-analysis` and `pattern-anomalies` commands
   - Updated help text

2. **tools/federation/pattern_metrics_analyzer.ts** (created):
   - Complete pattern metrics analysis framework
   - Anomaly detection engine
   - Governance adjustment proposer
   - Retro question generator

3. **.goalie/PATTERN_LOGGING_ENHANCEMENTS.md** (created):
   - This documentation

## Success Metrics

Track these metrics to validate effectiveness:
- Anomaly detection accuracy (false positive rate <10%)
- Governance adjustment acceptance rate (>70% applied)
- Retro question relevance score (user feedback)
- Pattern coverage improvement over time (target 90%+)
