#!/usr/bin/env bash
# Test statistical threshold functions

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scripts/lib/statistical-thresholds.sh"

echo "=== Statistical Threshold Function Tests ==="
echo ""
echo "Testing with circle: orchestrator, ceremony: standup"
echo ""

# Test 1: Circuit Breaker
echo "1. Circuit Breaker Threshold"
echo "   Function: get_circuit_breaker"
result=$(get_circuit_breaker "orchestrator" "" "$HOME/.agentdb/agentdb.db" 2>&1) || result="Error: $result"
echo "   Result: $result"
echo ""

# Test 2: Degradation Detection
echo "2. Degradation Detection Threshold"
echo "   Function: get_degradation_threshold"
result=$(get_degradation_threshold "orchestrator" "standup" "$HOME/.agentdb/agentdb.db" 2>&1) || result="Error: $result"
if [[ "$result" != Error:* ]]; then
  threshold=$(echo "$result" | cut -d'|' -f1)
  recent=$(echo "$result" | cut -d'|' -f2)
  mean=$(echo "$result" | cut -d'|' -f3)
  zscore=$(echo "$result" | cut -d'|' -f7 2>/dev/null || echo "N/A")
  echo "   Threshold: $threshold"
  echo "   Recent Reward: $recent"
  echo "   Mean: $mean"
  echo "   Z-Score: $zscore"
else
  echo "   $result"
fi
echo ""

# Test 3: Cascade Failure
echo "3. Cascade Failure Threshold"
echo "   Function: get_cascade_threshold"
result=$(get_cascade_threshold "orchestrator" "standup" "$HOME/.agentdb/agentdb.db" 2>&1) || result="Error: $result"
if [[ "$result" != Error:* ]]; then
  threshold=$(echo "$result" | cut -d'|' -f1)
  window=$(echo "$result" | cut -d'|' -f2)
  echo "   Failures: $threshold in $window minutes"
else
  echo "   $result"
fi
echo ""

# Test 4: WSJF Scores
echo "4. WSJF Component Scores"
echo "   Function: get_wsjf_scores"
result=$(get_wsjf_scores "orchestrator" "$HOME/.agentdb/agentdb.db" 2>&1) || result="Error: $result"
if [[ "$result" != Error:* ]]; then
  bv=$(echo "$result" | cut -d'|' -f1)
  tc=$(echo "$result" | cut -d'|' -f2)
  rr=$(echo "$result" | cut -d'|' -f3)
  echo "   Business Value: $bv"
  echo "   Time Criticality: $tc"
  echo "   Risk Reduction: $rr"
else
  echo "   $result"
fi
echo ""

# Test 5: Divergence Rate
echo "5. Divergence Rate (Exploration)"
echo "   Function: get_divergence"
result=$(get_divergence "orchestrator" "$HOME/.agentdb/agentdb.db" 2>&1) || result="Error: $result"
if [[ "$result" != Error:* ]]; then
  rate=$(echo "$result" | cut -d'|' -f1)
  sharpe=$(echo "$result" | cut -d'|' -f3)
  echo "   Rate: $rate"
  echo "   Sharpe Ratio: $sharpe"
else
  echo "   $result"
fi
echo ""

# Test 6: Equity Threshold
echo "6. Equity Threshold"
echo "   Function: get_equity_threshold"
result=$(get_equity_threshold "$HOME/.agentdb/agentdb.db" 2>&1) || result="Error: $result"
if [[ "$result" != Error:* ]]; then
  threshold=$(echo "$result" | cut -d'|' -f1)
  echo "   Min Equity Score: $threshold"
else
  echo "   $result"
fi
echo ""

echo "=== Database Lock Handling ==="
if [[ -f "$HOME/.agentdb/agentdb.db" ]]; then
  echo "✓ AgentDB exists at $HOME/.agentdb/agentdb.db"
  
  # Check if database is accessible
  if timeout 2 sqlite3 "$HOME/.agentdb/agentdb.db" "SELECT COUNT(*) FROM episodes WHERE created_at > datetime('now', '-30 days');" 2>/dev/null; then
    episode_count=$(sqlite3 "$HOME/.agentdb/agentdb.db" "SELECT COUNT(*) FROM episodes WHERE created_at > datetime('now', '-30 days');")
    echo "✓ Database accessible, $episode_count recent episodes"
  else
    echo "⚠ Database locked or inaccessible (expected if AgentDB is running)"
    echo "  All functions have conservative fallback values"
  fi
else
  echo "⚠ AgentDB not found (functions will use fallback values)"
fi
echo ""

echo "=== Next Steps ==="
echo "1. Wait for AgentDB to finish current operations"
echo "2. Run full backtest: ./scripts/ay-continuous-improve.sh --backtest"
echo "3. Monitor threshold decisions: sqlite3 .db/risk-traceability.db 'SELECT * FROM threshold_validations ORDER BY timestamp DESC LIMIT 10;'"
echo "4. Apply to Phase 1 scripts as documented"
