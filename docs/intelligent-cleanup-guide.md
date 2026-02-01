# Intelligent Cleanup Guide

## Overview

The intelligent cleanup process analyzes old code before retirement, preserving valuable functionality and refactoring it into active components.

## What Makes Code "Valuable"?

The system scores files based on:

| Pattern | Score | Why It Matters |
|---------|-------|----------------|
| **Exports** (class, function, const, interface, type) | 10 points each | Indicates reusable, public API |
| **Tests** (describe, test, it) | 5 points each | Proven, tested functionality |
| **Types** (interface, type, enum) | 3 points each | Type safety, documentation |

### Scoring Thresholds

- **Score ≥ 15**: HIGH VALUE - Automatically extracted for refactoring
- **Score 5-14**: MEDIUM VALUE - Flagged for manual review
- **Score < 5**: LOW VALUE - Safe to retire

## Process Flow

```
Old Code (>90 days)
    ↓
┌───────────────────┐
│  Code Analysis    │
│  (automated)      │
└─────┬─────────────┘
      ↓
   [Score]
      ↓
    ┌─┴─────────────────────┬─────────────────────┐
    ↓                       ↓                     ↓
  High Value            Medium Value          Low Value
  (≥15 pts)             (5-14 pts)           (<5 pts)
    ↓                       ↓                     ↓
analysis/              analysis/            retiring/
extracted/             extracted/              code/
                      review-*.ts
    ↓                       ↓                     ↓
[Automated             [Manual              [Delete in
refactoring]           review]              90 days]
    ↓
src/refactored/
```

## Step-by-Step Usage

### 1. Run Intelligent Cleanup

```bash
./phase2-intelligent-cleanup.sh
```

This will:
- ✅ Compress and backup archive (7.9GB)
- ✅ Remove build artifacts (4GB)
- ✅ Analyze all code files >90 days old
- ✅ Score each file for value
- ✅ Extract high/medium value code
- ✅ Retire low-value code
- ✅ Generate analysis reports

### 2. Review Analysis Reports

```bash
# View summary
cat analysis/reports/cleanup-summary.md

# Check detailed scoring
cat analysis/reports/code-analysis.csv

# Review extraction plan
cat analysis/reports/extraction-plan.md
```

### 3. Examine Extracted Code

```bash
# High-value code (ready to refactor)
ls analysis/extracted/*.ts

# Medium-value code (needs review)
ls analysis/extracted/review-*.ts
```

### 4. Run Refactoring Script

```bash
./analysis/refactor.sh
```

This creates the structure:
- `src/refactored/utils/` - Consolidated utility functions
- `src/refactored/patterns/` - Design pattern libraries
- `src/refactored/integrations/` - Integration modules

### 5. Manually Move Valuable Code

```bash
# Example: Move a utility function
mv analysis/extracted/helper-functions.ts src/refactored/utils/helpers.ts

# Update the index
echo "export * from './helpers';" >> src/refactored/utils/index.ts
```

### 6. Update Imports

Search for old imports and replace with new ones:

```typescript
// Old import (retired)
import { myFunction } from '../../legacy/helper';

// New import (refactored)
import { myFunction } from '@/refactored/utils';
```

### 7. Test Everything

```bash
npm test
npm run typecheck
npm run lint
```

### 8. Commit Refactored Code

```bash
git add src/refactored/
git commit -m "refactor: consolidate valuable patterns from legacy code"
```

## Example Scoring

### High-Value File (Score: 33)
```typescript
// file: auth-helpers.ts
export interface AuthToken { ... }        // +3
export interface User { ... }             // +3
export const validateToken = () => { }    // +10
export const refreshToken = () => { }     // +10

describe('auth helpers', () => {          // +5
  test('validates tokens', () => { })     // +5
})
```
**Score: 33** → Extracted to `analysis/extracted/auth-helpers.ts`

### Medium-Value File (Score: 10)
```typescript
// file: utils.ts
export const formatDate = () => { }       // +10
```
**Score: 10** → Flagged for review: `analysis/extracted/review-utils.ts`

### Low-Value File (Score: 0)
```typescript
// file: temp-script.ts
const result = someCalculation();
console.log(result);
```
**Score: 0** → Retired to `retiring/code/temp-script.ts`

## Benefits

1. **Preserves Knowledge** - Valuable patterns aren't lost
2. **Reduces Technical Debt** - Consolidates scattered utilities
3. **Improves Discoverability** - Organized in `src/refactored/`
4. **Safe Retirement** - Only low-value code is removed
5. **Continuous Learning** - Pattern library grows over time

## Directory Structure After Cleanup

```
agentic-flow/
├── analysis/
│   ├── reports/
│   │   ├── cleanup-summary.md      # Overall summary
│   │   ├── code-analysis.csv       # Detailed scoring
│   │   └── extraction-plan.md      # Refactoring plan
│   ├── extracted/                  # High/medium value code
│   │   ├── auth-helpers.ts         # Score ≥ 15
│   │   └── review-utils.ts         # Score 5-14
│   └── refactor.sh                 # Automated refactoring script
│
├── src/refactored/                 # Refactored code destination
│   ├── utils/
│   │   └── index.ts               # Consolidated utilities
│   ├── patterns/
│   │   └── index.ts               # Design patterns
│   └── integrations/
│       └── index.ts               # Integration modules
│
└── retiring/                       # Low-value code (deleted in 90 days)
    ├── code/                       # Score < 5
    ├── scripts/
    └── configs/
```

## Tips & Best Practices

### When to Run
- Before major refactoring
- When disk space is low
- Quarterly maintenance
- Before version releases

### Customizing Scoring
Edit the script's scoring section:
```bash
# Adjust weights based on your priorities
SCORE=$((HAS_EXPORTS * 10 + HAS_TESTS * 5 + HAS_TYPES * 3))

# Add custom patterns
HAS_DOCS=$(grep -c "@param\|@returns" "$file")
SCORE=$((SCORE + HAS_DOCS * 2))
```

### Manual Review Checklist
For files in `analysis/extracted/review-*`:
- [ ] Does it solve a unique problem?
- [ ] Is it still relevant to current architecture?
- [ ] Are there dependencies that are deprecated?
- [ ] Could it be simplified/modernized?
- [ ] Is there a better alternative in active code?

### Integration with CI/CD
```yaml
# .github/workflows/cleanup.yml
name: Quarterly Cleanup
on:
  schedule:
    - cron: '0 0 1 */3 *'  # Every 3 months
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: ./phase2-intelligent-cleanup.sh
      - run: git add analysis/
      - run: git commit -m "chore: quarterly code analysis"
      - uses: actions/upload-artifact@v2
        with:
          name: analysis-reports
          path: analysis/reports/
```

## Troubleshooting

### No old files found
```
⊘ No old code files found (>90 days)
```
**Solution**: Files may not meet the age threshold. Lower it:
```bash
# Change -mtime +90 to -mtime +60 for 60-day threshold
find . -type f \( -name '*.ts' -o -name '*.js' \) -mtime +60
```

### All files scored too low
**Solution**: Adjust scoring thresholds:
```bash
if [ "$SCORE" -ge 10 ]; then  # Lower from 15 to 10
```

### Extracted file has name collision
**Solution**: The script preserves the basename. Add a timestamp:
```bash
cp "$file" "analysis/extracted/$(date +%s)-$BASENAME"
```

## Advanced Features

### Add Custom Analyzers
```bash
# Check for deprecated APIs
HAS_DEPRECATED=$(grep -c "@deprecated" "$file")
DEPRECATION_PENALTY=$((HAS_DEPRECATED * -5))
SCORE=$((SCORE + DEPRECATION_PENALTY))

# Check for security issues
HAS_EVAL=$(grep -c "eval(" "$file")
if [ "$HAS_EVAL" -gt 0 ]; then
  echo "   ⚠️  SECURITY RISK: $BASENAME contains eval()"
fi
```

### Export to Spreadsheet
```bash
# Convert CSV to Excel-friendly format
cat analysis/reports/code-analysis.csv | \
  awk -F'|' '{print $1","$2","$3","$4","$5","$6}' > \
  analysis/reports/code-analysis-excel.csv
```

### Visualize Scoring Distribution
```bash
# Generate histogram
cat analysis/reports/code-analysis.csv | \
  awk -F'|' '{print $2}' | \
  sort -n | uniq -c
```

## Next Steps

After successful cleanup:
1. **Phase 3**: Microservice separation
2. **Phase 4**: Performance optimization  
3. **Phase 5**: Documentation consolidation

## Support

For issues or improvements:
- File an issue: `agentic-flow/issues`
- Review past cleanups: `analysis/reports/`
- Check retirement schedule: `retiring/README.md`
