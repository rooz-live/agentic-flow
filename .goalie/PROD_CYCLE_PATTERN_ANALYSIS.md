# Pattern Analysis Integration in `af prod-cycle`

## Overview

Pattern analysis is now **automatically integrated** into `af prod-cycle` and runs at the end of each production cycle to provide immediate feedback on pattern anomalies and governance recommendations.

## Features

### 1. Auto-Run Pattern Analysis
After every `prod-cycle` completes, the pattern analyzer automatically:
- Loads all pattern metrics from `.goalie/pattern_metrics.jsonl`
- Detects anomalies in pattern behavior
- Proposes governance parameter adjustments
- Generates context-aware retro questions

### 2. Summary Display
The analysis provides a concise summary showing:
- **Anomaly count**: Number of detected issues
- **Retro questions**: Number of generated retrospective questions
- **Anomaly details**: Severity, pattern, and description for each anomaly
- **Top retro questions**: First 3 questions with link to full report

### 3. Optional Skip Flag
You can disable automatic analysis using:

```bash
# Via command flag
af prod-cycle 10 --skip-pattern-analysis

# Via environment variable
AF_SKIP_PATTERN_ANALYSIS=1 af prod-cycle 10
```

### 4. JSON Export
All analysis results are automatically exported to:
```
.goalie/pattern_analysis_report.json
```

This JSON report can be consumed programmatically by federation agents (retro_coach.ts, governance_agent.ts).

## Usage Examples

### Standard Production Cycle (with auto-analysis)
```bash
af prod-cycle 12
```

**Output includes:**
```
[prod-cycle runs...]

=== Pattern Analysis ===
✓ Pattern analysis complete
  Anomalies detected: 0
  Retro questions: 2

Retro Questions:
  [learning] Are depth-ladder adjustments improving iteration efficiency?
  [process] Is circle-risk-focus identifying the correct high-risk areas?

Full report: .goalie/pattern_analysis_report.json
```

### Skip Auto-Analysis
```bash
# When you want faster completion
af prod-cycle 12 --skip-pattern-analysis

# Or set environment variable
export AF_SKIP_PATTERN_ANALYSIS=1
af prod-cycle 12
```

### Manual Analysis Later
```bash
# Run analysis manually after prod-cycle
af pattern-analysis

# Or check only anomalies
af pattern-anomalies
```

## Integration Points

### Pattern Metrics Collection
Pattern events are automatically emitted during prod-cycle:
- `observability-first` - Telemetry tracking
- `iteration-budget` - Budget enforcement
- `safe-degrade` - Degradation triggers
- `depth-ladder` - Depth adjustments
- `circle-risk-focus` - Circle rotation

All events are logged to `.goalie/pattern_metrics.jsonl`.

### Analysis Triggers
Analysis runs if:
1. ✅ Prod-cycle completes successfully
2. ✅ `--skip-pattern-analysis` flag NOT present
3. ✅ `AF_SKIP_PATTERN_ANALYSIS` NOT set to "1"
4. ✅ Pattern analyzer tool is available

### Failure Handling
- Analysis failures are **non-blocking** - prod-cycle still succeeds
- Warnings shown if analysis fails: `⚠ Pattern analysis failed (non-blocking)`
- Original prod-cycle exit code preserved

## Federation Agent Integration

### Automatic Consumption
Federation agents can automatically consume the analysis report:

```typescript
// tools/federation/retro_coach.ts
import { PatternMetricsAnalyzer } from './pattern_metrics_analyzer';

const analyzer = new PatternMetricsAnalyzer('.goalie');
await analyzer.analyze();

const report = analyzer.getReport();
// Use report.anomalies and report.retro_questions
```

### Direct JSON Access
```bash
# Get anomaly count
jq '.summary.anomalies_detected' .goalie/pattern_analysis_report.json

# List all anomalies
jq '.anomalies[]' .goalie/pattern_analysis_report.json

# Get retro questions
jq '.retro_questions[]' .goalie/pattern_analysis_report.json
```

## Anomaly Types Detected

1. **pattern_overuse** - Pattern triggered too frequently (e.g., safe-degrade ≥5 times in 20 events)
2. **pattern_underuse** - Pattern missing coverage (e.g., observability-first <50% runs)
3. **mutation_spike** - High mutation rate detected (≥70% mutations in last 10 events)
4. **behavioral_drift** - Pattern mode inconsistency (>2 unique modes per pattern)
5. **economic_degradation** - Rising Cost of Delay (average COD >50)

## Governance Adjustments

The analyzer proposes parameter changes based on anomalies:
- `safe_degrade.incident_threshold` - Increase if overused
- `iteration_budget.max_iterations` - Increase if extensions needed
- `AF_PROD_OBSERVABILITY_FIRST` - Force if coverage low
- `AF_GOVERNANCE_EXECUTOR_DRY_RUN` - Enable for high mutation rate

## Report Schema

```json
{
  "summary": {
    "total_metrics": 9,
    "patterns_tracked": 6,
    "runs_analyzed": 4,
    "anomalies_detected": 0,
    "adjustments_proposed": 0,
    "retro_questions_generated": 2
  },
  "anomalies": [...],
  "governance_adjustments": [...],
  "retro_questions": [...],
  "patterns": {
    "observability-first": [...],
    "iteration-budget": [...],
    ...
  }
}
```

## Performance Impact

- **Analysis time**: ~1-2 seconds for 200+ metrics
- **Non-blocking**: Failures don't affect prod-cycle success
- **Minimal overhead**: Only runs once at cycle completion
- **Can be disabled**: Use `--skip-pattern-analysis` for faster completion

## Environment Variables

```bash
# Skip automatic pattern analysis
AF_SKIP_PATTERN_ANALYSIS=1

# Custom goalie directory
AF_GOALIE_DIR=/path/to/.goalie

# Debug mode (verbose logging)
DEBUG=1 af prod-cycle 12
```

## Related Commands

```bash
# View pattern coverage
af pattern-coverage

# Run manual analysis
af pattern-analysis

# Show only anomalies
af pattern-anomalies

# Run retro coach with pattern context
af retro-coach --goalie-dir=.goalie

# Run governance agent
af governance-agent --prod-cycle
```

## Next Steps

1. ✅ Pattern analysis auto-runs after prod-cycle
2. ✅ Federation agents can consume JSON reports
3. 🔄 Integrate with `retro_coach.ts` for auto-retro generation
4. 🔄 Integrate with `governance_agent.ts` for auto-parameter tuning
5. 🔄 Add pattern analysis to dashboard visualization
