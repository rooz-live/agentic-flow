#!/usr/bin/env bash
# compare-all-validators.sh - Generate coverage metrics and comparison report
# Usage: ./validation-runner.sh | ./compare-all-validators.sh
# Output: CONSOLIDATION-TRUTH-REPORT.md

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_FILE="$PROJECT_ROOT/CONSOLIDATION-TRUTH-REPORT.md"
BASELINE_FILE="$PROJECT_ROOT/.validation-baseline.json"
HISTORY_FILE="$PROJECT_ROOT/.validation-history.jsonl"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Read JSON input from stdin or file
INPUT_JSON=""
if [ -t 0 ]; then
  # stdin is a terminal, check for file argument
  if [ $# -gt 0 ]; then
    INPUT_JSON="$(<"$1")"
  else
    echo -e "${RED}Error: No input provided. Pipe JSON or provide file path.${NC}" >&2
    echo "Usage: ./validation-runner.sh | $0" >&2
    echo "   or: $0 results.json" >&2
    exit 1
  fi
else
  # stdin is piped
  INPUT_JSON="$(cat)"
fi

# Validate JSON input
if ! echo "$INPUT_JSON" | jq empty 2>/dev/null; then
  echo -e "${RED}Error: Invalid JSON input${NC}" >&2
  exit 1
fi

# Extract metrics from JSON
TIMESTAMP=$(echo "$INPUT_JSON" | jq -r '.timestamp // now | todate')
TOTAL_VALIDATORS=$(echo "$INPUT_JSON" | jq '.results | length')
PASSED_VALIDATORS=$(echo "$INPUT_JSON" | jq '[.results[] | select(.status == "pass")] | length')
FAILED_VALIDATORS=$(echo "$INPUT_JSON" | jq '[.results[] | select(.status == "fail")] | length')
SKIPPED_VALIDATORS=$(echo "$INPUT_JSON" | jq '[.results[] | select(.status == "skip")] | length')

# Calculate coverage percentage
if [ "$TOTAL_VALIDATORS" -eq 0 ]; then
  COVERAGE_PERCENT=0
else
  COVERAGE_PERCENT=$(echo "scale=2; ($PASSED_VALIDATORS * 100) / $TOTAL_VALIDATORS" | bc)
fi

# Extract category breakdown
CATEGORIES=$(echo "$INPUT_JSON" | jq -r '[.results[].category] | unique | .[]')

# Function to calculate category metrics
calculate_category_metrics() {
  local category="$1"
  local total=$(echo "$INPUT_JSON" | jq "[.results[] | select(.category == \"$category\")] | length")
  local passed=$(echo "$INPUT_JSON" | jq "[.results[] | select(.category == \"$category\" and .status == \"pass\")] | length")
  local percent=0

  if [ "$total" -gt 0 ]; then
    percent=$(echo "scale=2; ($passed * 100) / $total" | bc)
  fi

  echo "$passed/$total ($percent%)"
}

# Function to get failed validators
get_failed_validators() {
  echo "$INPUT_JSON" | jq -r '.results[] | select(.status == "fail") | "- **\(.validator)** (\(.category)): \(.message // "No details")"'
}

# Function to calculate trend
calculate_trend() {
  if [ ! -f "$BASELINE_FILE" ]; then
    echo "NO_BASELINE"
    return
  fi

  local baseline_coverage=$(jq -r '.coverage_percent // 0' "$BASELINE_FILE")
  local diff=$(echo "$COVERAGE_PERCENT - $baseline_coverage" | bc)

  if (( $(echo "$diff > 0" | bc -l) )); then
    echo "IMPROVING"
  elif (( $(echo "$diff < 0" | bc -l) )); then
    echo "DEGRADING"
  else
    echo "STABLE"
  fi
}

# Function to get recommendations
generate_recommendations() {
  local recs=()

  # Coverage-based recommendations
  if (( $(echo "$COVERAGE_PERCENT < 70" | bc -l) )); then
    recs+=("🚨 **Critical**: Coverage below 70% - immediate action required")
  elif (( $(echo "$COVERAGE_PERCENT < 85" | bc -l) )); then
    recs+=("⚠️  **Warning**: Coverage below 85% - improvement needed")
  fi

  # Failed validators recommendations
  if [ "$FAILED_VALIDATORS" -gt 0 ]; then
    recs+=("🔧 **Fix Failures**: $FAILED_VALIDATORS validator(s) failing - see details below")
  fi

  # Trend-based recommendations
  local trend=$(calculate_trend)
  if [ "$trend" == "DEGRADING" ]; then
    recs+=("📉 **Trend Alert**: Coverage decreasing - review recent changes")
  elif [ "$trend" == "IMPROVING" ]; then
    recs+=("✅ **Good Progress**: Coverage improving - maintain momentum")
  fi

  # Category-specific recommendations
  for category in $CATEGORIES; do
    local cat_failed=$(echo "$INPUT_JSON" | jq "[.results[] | select(.category == \"$category\" and .status == \"fail\")] | length")
    if [ "$cat_failed" -gt 2 ]; then
      recs+=("📁 **Category Focus**: $category has $cat_failed failures - needs attention")
    fi
  done

  # Output recommendations
  if [ ${#recs[@]} -eq 0 ]; then
    echo "✨ **Excellent**: All validators passing, no action required"
  else
    printf '%s\n' "${recs[@]}"
  fi
}

# Function to get trend emoji
get_trend_emoji() {
  local trend="$1"
  case "$trend" in
    IMPROVING) echo "📈" ;;
    DEGRADING) echo "📉" ;;
    STABLE) echo "➡️" ;;
    NO_BASELINE) echo "🆕" ;;
    *) echo "❓" ;;
  esac
}

# Function to format history table
format_history() {
  if [ ! -f "$HISTORY_FILE" ]; then
    echo "No historical data available"
    return
  fi

  echo "| Date | Coverage | Passed | Failed | Trend |"
  echo "|------|----------|--------|--------|-------|"

  tail -5 "$HISTORY_FILE" | while IFS= read -r line; do
    local date=$(echo "$line" | jq -r '.timestamp | split("T")[0]')
    local coverage=$(echo "$line" | jq -r '.coverage_percent')
    local passed=$(echo "$line" | jq -r '.passed_validators')
    local failed=$(echo "$line" | jq -r '.failed_validators')
    local trend=$(echo "$line" | jq -r '.trend // "N/A"')

    printf "| %s | %.1f%% | %d | %d | %s |\n" "$date" "$coverage" "$passed" "$failed" "$trend"
  done
}

# Calculate trend
TREND=$(calculate_trend)
TREND_EMOJI=$(get_trend_emoji "$TREND")

# Generate markdown report
cat > "$REPORT_FILE" << REPORT_EOF
# 📊 Validation Coverage Report

**Generated**: $TIMESTAMP
**Trend**: $TREND_EMOJI $TREND

---

## 🎯 Overall Score

### Coverage: $PASSED_VALIDATORS/$TOTAL_VALIDATORS ($COVERAGE_PERCENT%)

\`\`\`
████████████████████$(printf '░%.0s' $(seq 1 $((100 - ${COVERAGE_PERCENT%.*}))))
\`\`\`

| Metric | Count | Percentage |
|--------|-------|------------|
| ✅ Passed | $PASSED_VALIDATORS | $(echo "scale=1; ($PASSED_VALIDATORS * 100) / $TOTAL_VALIDATORS" | bc)% |
| ❌ Failed | $FAILED_VALIDATORS | $(echo "scale=1; ($FAILED_VALIDATORS * 100) / $TOTAL_VALIDATORS" | bc)% |
| ⏭️ Skipped | $SKIPPED_VALIDATORS | $(echo "scale=1; ($SKIPPED_VALIDATORS * 100) / $TOTAL_VALIDATORS" | bc)% |
| 📊 **Total** | **$TOTAL_VALIDATORS** | **100%** |

---

## 📁 Breakdown by Category

REPORT_EOF

# Add category breakdown
while IFS= read -r category; do
  local metrics=$(calculate_category_metrics "$category")
  echo "- **$category**: $metrics" >> "$REPORT_FILE"
done <<< "$CATEGORIES"

# Add failed validators section
cat >> "$REPORT_FILE" << 'REPORT_EOF'

---

## ❌ Failed Validators

REPORT_EOF

if [ "$FAILED_VALIDATORS" -eq 0 ]; then
  echo "✨ **All validators passing!**" >> "$REPORT_FILE"
else
  get_failed_validators >> "$REPORT_FILE"
fi

# Add recommendations section
cat >> "$REPORT_FILE" << 'REPORT_EOF'

---

## 💡 Recommendations

REPORT_EOF

generate_recommendations >> "$REPORT_FILE"

# Add trend analysis
cat >> "$REPORT_FILE" << 'REPORT_EOF'

---

## 📈 Trend Analysis

REPORT_EOF

if [ -f "$BASELINE_FILE" ]; then
  local baseline_coverage
  local baseline_date
  local diff
  baseline_coverage=$(jq -r '.coverage_percent' "$BASELINE_FILE")
  baseline_date=$(jq -r '.timestamp | split("T")[0]' "$BASELINE_FILE")
  diff=$(echo "$COVERAGE_PERCENT - $baseline_coverage" | bc)

  cat >> "$REPORT_FILE" << TREND_EOF
**Baseline**: $baseline_coverage% (from $baseline_date)
**Current**: $COVERAGE_PERCENT%
**Change**: $diff%

TREND_EOF
else
  echo "No baseline data - this is the first run." >> "$REPORT_FILE"
fi

# Add historical data table
echo "" >> "$REPORT_FILE"
echo "### Recent History" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
format_history >> "$REPORT_FILE"

# Add footer
cat >> "$REPORT_FILE" << 'REPORT_EOF'

---

## 📝 Notes

- Coverage is calculated as: `(passed_validators / total_validators) * 100`
- Trend compares current run against baseline stored in `.validation-baseline.json`
- Failed validators require investigation before deployment
- Target coverage: ≥85% (Warning: <85%, Critical: <70%)

---

*Generated by compare-all-validators.sh*
*Report saved to: CONSOLIDATION-TRUTH-REPORT.md*
REPORT_EOF

# Update baseline (if coverage improved or no baseline exists)
if [ ! -f "$BASELINE_FILE" ] || [ "$TREND" == "IMPROVING" ]; then
  echo "$INPUT_JSON" | jq "{
    timestamp: .timestamp,
    coverage_percent: $COVERAGE_PERCENT,
    passed_validators: $PASSED_VALIDATORS,
    failed_validators: $FAILED_VALIDATORS,
    total_validators: $TOTAL_VALIDATORS,
    trend: \"$TREND\"
  }" > "$BASELINE_FILE"
  echo -e "${GREEN}✓ Updated baseline${NC}" >&2
fi

# Append to history
echo "$INPUT_JSON" | jq "{
  timestamp: .timestamp,
  coverage_percent: $COVERAGE_PERCENT,
  passed_validators: $PASSED_VALIDATORS,
  failed_validators: $FAILED_VALIDATORS,
  total_validators: $TOTAL_VALIDATORS,
  trend: \"$TREND\"
}" >> "$HISTORY_FILE"

# Print summary to terminal
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   VALIDATION COVERAGE REPORT          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Coverage: ${GREEN}$PASSED_VALIDATORS${NC}/${TOTAL_VALIDATORS} (${GREEN}$COVERAGE_PERCENT%${NC})"
echo -e "Trend:    $TREND_EMOJI $TREND"
echo ""
echo -e "Failed:   ${RED}$FAILED_VALIDATORS${NC}"
echo -e "Skipped:  ${YELLOW}$SKIPPED_VALIDATORS${NC}"
echo ""
echo -e "Report saved to: ${BLUE}$REPORT_FILE${NC}"
echo ""

# Exit with appropriate code
if [ "$FAILED_VALIDATORS" -gt 0 ]; then
  exit 1
else
  exit 0
fi
