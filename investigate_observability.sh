#!/usr/bin/env bash
#
# Investigation Script: Understand Observability Coverage
# Purpose: Answer key questions before implementing fixes
#

set -e

GOALIE_DIR="${GOALIE_DIR:-.goalie}"
REPORT_FILE="$GOALIE_DIR/pattern_analysis_report.json"
METRICS_FILE="$GOALIE_DIR/pattern_metrics.jsonl"

echo "========================================="
echo "Observability Coverage Investigation"
echo "========================================="
echo

# Check if files exist
if [[ ! -f "$REPORT_FILE" ]]; then
  echo "ERROR: Pattern analysis report not found at: $REPORT_FILE"
  echo "Run: npx tsx tools/federation/pattern_metrics_analyzer.ts"
  exit 1
fi

if [[ ! -f "$METRICS_FILE" ]]; then
  echo "ERROR: Pattern metrics file not found at: $METRICS_FILE"
  exit 1
fi

echo "📊 Pattern Distribution Analysis"
echo "=================================="
echo

# Q1: What patterns are being emitted?
echo "1. Top 20 Most Common Patterns:"
echo "   (Shows what patterns runs ARE emitting)"
echo
jq -r '.patterns | to_entries | .[] | "\(.key): \(.value | length)"' "$REPORT_FILE" | \
  sort -t: -k2 -nr | \
  head -20 | \
  awk -F: '{printf "   %-40s %5d events\n", $1, $2}'
echo

# Q2: What run_kinds are there?
echo "2. Run Types (run_kind distribution):"
echo "   (Shows what kinds of runs are happening)"
echo
jq -r 'select(.run_kind) | .run_kind' "$METRICS_FILE" | \
  sort | uniq -c | sort -rn | \
  awk '{printf "   %-40s %5d runs\n", $2, $1}'
echo

# Q3: Which patterns have metrics (are observable)?
echo "3. Patterns with Metrics (Observable Patterns):"
echo "   (Patterns that include metrics data)"
echo
jq -r 'select(.data.metrics) | .pattern' "$METRICS_FILE" | \
  sort | uniq -c | sort -rn | head -20 | \
  awk '{printf "   %-40s %5d events\n", $2, $1}'
echo

# Q4: Observability-first coverage by run_kind
echo "4. Observability-First Pattern by Run Type:"
echo "   (Which run types emit observability-first?)"
echo
if jq -e 'select(.pattern == "observability-first")' "$METRICS_FILE" > /dev/null 2>&1; then
  jq -r 'select(.pattern == "observability-first") | "\(.run_kind) (\(.mode))"' "$METRICS_FILE" | \
    sort | uniq -c | \
    awk '{printf "   %-40s %5d events\n", $2" "$3, $1}'
else
  echo "   (No observability-first events found)"
fi
echo

# Q5: What's the behavioral_type distribution?
echo "5. Behavioral Type Distribution:"
echo "   (Classification of pattern behaviors)"
echo
jq -r 'select(.data.behavioral_type) | .data.behavioral_type' "$METRICS_FILE" | \
  sort | uniq -c | sort -rn | \
  awk '{printf "   %-40s %5d events\n", $2, $1}'
echo

# Q6: Governance agent invocations
echo "6. Governance Agent Invocations:"
echo "   (How often does governance agent run?)"
echo
GOVERNANCE_RUNS=$(jq -r 'select(.run_kind == "governance-agent")' "$METRICS_FILE" | wc -l | xargs)
TOTAL_EVENTS=$(wc -l < "$METRICS_FILE" | xargs)
GOVERNANCE_PCT=$(echo "scale=2; $GOVERNANCE_RUNS * 100 / $TOTAL_EVENTS" | bc)

echo "   Governance agent runs: $GOVERNANCE_RUNS / $TOTAL_EVENTS events (${GOVERNANCE_PCT}%)"
echo

# Q7: Recent mutations
echo "7. Recent Mutation Events:"
echo "   (Last 10 mutation events)"
echo
jq -r 'select(.data.mutation == true) | "\(.timestamp) \(.pattern) (\(.mode))"' "$METRICS_FILE" | \
  tail -10 | \
  awk '{printf "   %s\n", $0}'
echo

echo "========================================="
echo "🔍 Key Questions to Answer"
echo "========================================="
echo
echo "Q1: Is observability-first meant for every run?"
echo "    - If YES: We have a 99.9% gap (need instrumentation)"
echo "    - If NO: Coverage is governance-specific (maybe OK)"
echo
echo "Q2: Are non-observability-first patterns still observable?"
echo "    - Check section 3 above: Do other patterns have metrics?"
echo "    - If YES: Analyzer definition is too narrow"
echo
echo "Q3: What constitutes 'observable' for our system?"
echo "    - Any pattern with metrics?"
echo "    - Specific pattern names only?"
echo "    - Domain events with economic context?"
echo

echo "========================================="
echo "🛠️  Verification Commands"
echo "========================================="
echo
echo "Verify dry-run mode is implemented:"
echo "  grep -r 'GOVERNANCE_EXECUTOR_DRY_RUN' tools/ src/"
echo
echo "Test prod-cycle blocking:"
echo "  AF_CONTEXT=prod-cycle npx tsx tools/federation/governance_agent.ts"
echo
echo "Re-run analyzer after changes:"
echo "  npx tsx tools/federation/pattern_metrics_analyzer.ts"
echo

echo "Investigation complete!"
echo "Review findings and decide on observability strategy."
