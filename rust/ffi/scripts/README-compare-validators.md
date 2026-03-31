# compare-all-validators.sh Documentation

## Overview

`compare-all-validators.sh` processes validation results from `validation-runner.sh` and generates comprehensive coverage metrics with trend analysis, category breakdowns, and actionable recommendations.

## Usage

### Basic Usage (Piped Input)
```bash
./validation-runner.sh | ./compare-all-validators.sh
```

### File Input
```bash
./compare-all-validators.sh results.json
```

### Full Pipeline
```bash
# Run all validators and generate report in one command
./validation-runner.sh | ./compare-all-validators.sh

# Check exit code
if [ $? -eq 0 ]; then
  echo "All validators passed!"
else
  echo "Some validators failed - see CONSOLIDATION-TRUTH-REPORT.md"
fi
```

## Input Format

Expects JSON from `validation-runner.sh`:
```json
{
  "timestamp": "2026-02-26T18:20:00Z",
  "results": [
    {
      "validator": "syntax-validator",
      "category": "syntax",
      "status": "pass",
      "message": "All syntax checks passed"
    },
    {
      "validator": "security-validator",
      "category": "security",
      "status": "fail",
      "message": "SQL injection vulnerability detected"
    }
  ]
}
```

## Output

### 1. Terminal Output
```
╔════════════════════════════════════════╗
║   VALIDATION COVERAGE REPORT          ║
╚════════════════════════════════════════╝

Coverage: 8/10 (80.00%)
Trend:    📈 IMPROVING

Failed:   2
Skipped:  0

Report saved to: CONSOLIDATION-TRUTH-REPORT.md
```

### 2. Markdown Report (CONSOLIDATION-TRUTH-REPORT.md)

Generated report includes:

- **Overall Score**: Visual progress bar + metrics table
- **Category Breakdown**: Coverage by category (syntax, security, performance, etc.)
- **Failed Validators**: Detailed list of failures with messages
- **Recommendations**: Actionable items based on coverage and trends
- **Trend Analysis**: Comparison against baseline
- **Recent History**: Last 5 runs with trend indicators

### 3. Baseline File (.validation-baseline.json)

Stores best/most recent successful run:
```json
{
  "timestamp": "2026-02-26T18:20:00Z",
  "coverage_percent": 80.00,
  "passed_validators": 8,
  "failed_validators": 2,
  "total_validators": 10,
  "trend": "IMPROVING"
}
```

### 4. History File (.validation-history.jsonl)

Appends each run for trend analysis:
```jsonl
{"timestamp":"2026-02-25T10:00:00Z","coverage_percent":75.00,"passed_validators":7,"failed_validators":3,"total_validators":10,"trend":"NO_BASELINE"}
{"timestamp":"2026-02-26T18:20:00Z","coverage_percent":80.00,"passed_validators":8,"failed_validators":2,"total_validators":10,"trend":"IMPROVING"}
```

## Metrics Calculation

### Coverage Formula
```
Coverage % = (passed_validators / total_validators) * 100
```

### Trend Calculation
```bash
if current_coverage > baseline_coverage:
  trend = "IMPROVING" 📈
elif current_coverage < baseline_coverage:
  trend = "DEGRADING" 📉
else:
  trend = "STABLE" ➡️
```

### Category Metrics
```bash
category_coverage = (passed_in_category / total_in_category) * 100
```

## Recommendations Logic

| Condition | Recommendation |
|-----------|----------------|
| Coverage < 70% | 🚨 **Critical**: Coverage below 70% - immediate action required |
| Coverage < 85% | ⚠️  **Warning**: Coverage below 85% - improvement needed |
| Failed > 0 | 🔧 **Fix Failures**: N validator(s) failing - see details below |
| Trend = DEGRADING | 📉 **Trend Alert**: Coverage decreasing - review recent changes |
| Trend = IMPROVING | ✅ **Good Progress**: Coverage improving - maintain momentum |
| Category failures > 2 | 📁 **Category Focus**: [category] has N failures - needs attention |
| All passing | ✨ **Excellent**: All validators passing, no action required |

## Thresholds

- **Target**: ≥85% coverage
- **Warning**: 70-84% coverage
- **Critical**: <70% coverage

## Exit Codes

- `0`: All validators passed
- `1`: One or more validators failed

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Validators
  run: ./scripts/validation-runner.sh | ./scripts/compare-all-validators.sh

- name: Upload Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: validation-report
    path: CONSOLIDATION-TRUTH-REPORT.md

- name: Comment on PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v6
  with:
    script: |
      const fs = require('fs');
      const report = fs.readFileSync('CONSOLIDATION-TRUTH-REPORT.md', 'utf8');
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: report
      });
```

### GitLab CI Example
```yaml
validation:
  script:
    - ./scripts/validation-runner.sh | ./scripts/compare-all-validators.sh
  artifacts:
    paths:
      - CONSOLIDATION-TRUTH-REPORT.md
    reports:
      junit: .validation-results.xml
  allow_failure: false
```

## Troubleshooting

### No Input Provided
```bash
Error: No input provided. Pipe JSON or provide file path.
Usage: ./validation-runner.sh | ./compare-all-validators.sh
   or: ./compare-all-validators.sh results.json
```

**Solution**: Ensure JSON is piped or provide file path

### Invalid JSON Input
```bash
Error: Invalid JSON input
```

**Solution**: Verify JSON structure matches expected format

### Missing jq
```bash
jq: command not found
```

**Solution**: Install jq (`brew install jq` on macOS, `apt-get install jq` on Ubuntu)

### Missing bc
```bash
bc: command not found
```

**Solution**: Install bc calculator (`brew install bc` on macOS, `apt-get install bc` on Ubuntu)

## Sample Output

See `CONSOLIDATION-TRUTH-REPORT-SAMPLE.md` for complete example report.

## Files Generated

| File | Purpose | Format |
|------|---------|--------|
| `CONSOLIDATION-TRUTH-REPORT.md` | Main report | Markdown |
| `.validation-baseline.json` | Baseline for comparison | JSON |
| `.validation-history.jsonl` | Historical trends | JSONL |

## Dependencies

- **bash** ≥4.0
- **jq** - JSON processor
- **bc** - Calculator for percentages
- **cat**, **printf**, **tail** - Standard Unix utilities

## Best Practices

1. **Run Before Commits**: Check coverage before committing
2. **Track Trends**: Monitor `.validation-history.jsonl` for patterns
3. **Fix Failures First**: Address failed validators before new features
4. **Maintain ≥85%**: Keep coverage above warning threshold
5. **Review Baseline**: Update baseline after significant improvements

## Related Scripts

- `validation-runner.sh` - Runs all validators and outputs JSON
- `validate-ddd-boundaries.sh` - DDD boundary validator
- `validate-tdd-coverage.sh` - TDD coverage validator
- `contract-enforcement-gate.sh` - Contract enforcement

## Pattern Stored in Memory

Coverage metrics calculation pattern stored at:
- **Namespace**: `patterns`
- **Key**: `coverage-metrics-formula`
- **Value**: Coverage formula, trend calculation, thresholds

## License

Part of the agentic-flow validation suite.
