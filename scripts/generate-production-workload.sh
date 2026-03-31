#!/usr/bin/env bash
# Production Workload Generator
# Generates decision audit logs, circuit breaker traffic, and threshold learning data
#
# Usage: ./scripts/generate-production-workload.sh [--circles orchestrator,assessor] [--iterations 100]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOGS_DIR="$ROOT_DIR/logs/production-workload"
DB_PATH="$ROOT_DIR/.db/yolife.db"

# Default values
CIRCLES="orchestrator,assessor,innovator,analyst,seeker,intuitive"
ITERATIONS=50
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --circles)
      CIRCLES="$2"
      shift 2
      ;;
    --iterations)
      ITERATIONS="$2"
      shift 2
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Create logs directory
mkdir -p "$LOGS_DIR"

echo "🚀 Production Workload Generator"
echo "================================"
echo "Circles: $CIRCLES"
echo "Iterations: $ITERATIONS"
echo "Logs Directory: $LOGS_DIR"
echo ""

# Function to generate decision audit entry
generate_decision() {
  local circle=$1
  local iteration=$2
  local timestamp=$(date +%s)
  local decision_id="decision-${circle}-${iteration}-${timestamp}"
  
  # Random decision outcome
  local outcomes=("approved" "denied" "deferred" "escalated")
  local result=${outcomes[$RANDOM % ${#outcomes[@]}]}
  
  # Random compliance score
  local compliance_score=$((RANDOM % 40 + 60))  # 60-100
  
  # Generate decision context
  local context="{\"circle\":\"${circle}\",\"iteration\":${iteration},\"timestamp\":${timestamp}}"
  
  echo "{\"decision_id\":\"${decision_id}\",\"type\":\"governance_check\",\"result\":\"${result}\",\"rationale\":\"Production workload test - iteration ${iteration}\",\"compliance_score\":${compliance_score},\"evidence\":[\"automated_test\"],\"context\":${context}}" >> "$LOGS_DIR/decision_audit.jsonl"
  
  if [ "$VERBOSE" = true ]; then
    echo "  ✓ Generated decision: $decision_id ($result, score: $compliance_score)"
  fi
}

# Function to generate circuit breaker event
generate_circuit_breaker_event() {
  local circle=$1
  local iteration=$2
  local timestamp=$(date +%s)
  
  # Simulate failures for circuit breaker learning
  if [ $((RANDOM % 100)) -lt 15 ]; then  # 15% failure rate
    local state="OPEN"
    local failures=$((RANDOM % 5 + 3))  # 3-8 failures
  elif [ $((RANDOM % 100)) -lt 30 ]; then
    local state="HALF_OPEN"
    local failures=$((RANDOM % 2 + 1))  # 1-3 failures
  else
    local state="CLOSED"
    local failures=0
  fi
  
  echo "{\"timestamp\":${timestamp},\"circle\":\"${circle}\",\"state\":\"${state}\",\"failures\":${failures},\"iteration\":${iteration}}" >> "$LOGS_DIR/circuit_breaker_events.jsonl"
  
  if [ "$VERBOSE" = true ]; then
    echo "  ⚡ Circuit breaker: $state (failures: $failures)"
  fi
}

# Function to generate pattern metrics event
generate_pattern_event() {
  local circle=$1
  local iteration=$2
  local timestamp=$(date +%s)
  
  # Random pattern
  local patterns=("safe-degrade" "guardrail-lock" "observability-first" "iteration-budget" "causal-divergence")
  local pattern=${patterns[$RANDOM % ${#patterns[@]}]}
  
  # Random confidence score
  local confidence=$(echo "scale=2; ($RANDOM % 40 + 60) / 100" | bc)
  
  echo "{\"timestamp\":${timestamp},\"circle\":\"${circle}\",\"pattern\":\"${pattern}\",\"confidence\":${confidence},\"iteration\":${iteration}}" >> "$LOGS_DIR/pattern_metrics.jsonl"
  
  if [ "$VERBOSE" = true ]; then
    echo "  📊 Pattern event: $pattern (confidence: $confidence)"
  fi
}

# Main workload generation loop
echo "📝 Generating production workload..."
echo ""

IFS=',' read -ra CIRCLE_ARRAY <<< "$CIRCLES"
total_operations=$((${#CIRCLE_ARRAY[@]} * ITERATIONS * 3))  # 3 types of events per iteration
current=0

for circle in "${CIRCLE_ARRAY[@]}"; do
  echo "Circle: $circle"
  
  for ((i=1; i<=ITERATIONS; i++)); do
    # Generate all three types of events
    generate_decision "$circle" "$i"
    generate_circuit_breaker_event "$circle" "$i"
    generate_pattern_event "$circle" "$i"
    
    current=$((current + 3))
    
    # Progress indicator
    if [ $((i % 10)) -eq 0 ] && [ "$VERBOSE" = false ]; then
      progress=$((current * 100 / total_operations))
      echo -ne "  Progress: $progress% ($current/$total_operations events)\r"
    fi
    
    # Small delay to simulate real workload timing
    sleep 0.01
  done
  
  echo ""
done

echo ""
echo "✅ Production workload generation complete!"
echo ""
echo "📊 Summary:"
echo "  - Decision audit logs: $(wc -l < "$LOGS_DIR/decision_audit.jsonl" | tr -d ' ') entries"
echo "  - Circuit breaker events: $(wc -l < "$LOGS_DIR/circuit_breaker_events.jsonl" | tr -d ' ') entries"
echo "  - Pattern metrics: $(wc -l < "$LOGS_DIR/pattern_metrics.jsonl" | tr -d ' ') entries"
echo "  - Total events: $total_operations"
echo ""
echo "📂 Output location: $LOGS_DIR"
echo ""
echo "🔍 Next steps:"
echo "  1. Analyze decision patterns: jq '.result' $LOGS_DIR/decision_audit.jsonl | sort | uniq -c"
echo "  2. Check circuit breaker states: jq '.state' $LOGS_DIR/circuit_breaker_events.jsonl | sort | uniq -c"
echo "  3. View pattern distribution: jq '.pattern' $LOGS_DIR/pattern_metrics.jsonl | sort | uniq -c"
echo "  4. Import to database for MYM scoring"
echo ""

# Generate summary statistics
echo "📈 Generating statistics..."
{
  echo "{"
  echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\","
  echo "  \"workload\": {"
  echo "    \"circles\": $(echo "$CIRCLES" | jq -R 'split(\",\")'),"
  echo "    \"iterations\": $ITERATIONS,"
  echo "    \"total_events\": $total_operations"
  echo "  },"
  echo "  \"decisions\": {"
  echo "    \"total\": $(wc -l < "$LOGS_DIR/decision_audit.jsonl" | tr -d ' '),"
  echo "    \"by_result\": {"
  echo "      \"approved\": $(grep -c '\"approved\"' "$LOGS_DIR/decision_audit.jsonl" || echo 0),"
  echo "      \"denied\": $(grep -c '\"denied\"' "$LOGS_DIR/decision_audit.jsonl" || echo 0),"
  echo "      \"deferred\": $(grep -c '\"deferred\"' "$LOGS_DIR/decision_audit.jsonl" || echo 0),"
  echo "      \"escalated\": $(grep -c '\"escalated\"' "$LOGS_DIR/decision_audit.jsonl" || echo 0)"
  echo "    },"
  echo "    \"avg_compliance_score\": $(jq '.compliance_score' "$LOGS_DIR/decision_audit.jsonl" | awk '{sum+=$1; n++} END {if (n>0) printf "%.2f", sum/n; else print 0}')"
  echo "  },"
  echo "  \"circuit_breaker\": {"
  echo "    \"total_events\": $(wc -l < "$LOGS_DIR/circuit_breaker_events.jsonl" | tr -d ' '),"
  echo "    \"states\": {"
  echo "      \"OPEN\": $(grep -c '\"OPEN\"' "$LOGS_DIR/circuit_breaker_events.jsonl" || echo 0),"
  echo "      \"CLOSED\": $(grep -c '\"CLOSED\"' "$LOGS_DIR/circuit_breaker_events.jsonl" || echo 0),"
  echo "      \"HALF_OPEN\": $(grep -c '\"HALF_OPEN\"' "$LOGS_DIR/circuit_breaker_events.jsonl" || echo 0)"
  echo "    },"
  echo "    \"total_failures\": $(jq '.failures' "$LOGS_DIR/circuit_breaker_events.jsonl" | awk '{sum+=$1} END {print sum+0}')"
  echo "  },"
  echo "  \"patterns\": {"
  echo "    \"total_events\": $(wc -l < "$LOGS_DIR/pattern_metrics.jsonl" | tr -d ' '),"
  echo "    \"avg_confidence\": $(jq '.confidence' "$LOGS_DIR/pattern_metrics.jsonl" | awk '{sum+=$1; n++} END {if (n>0) printf "%.3f", sum/n; else print 0}')"
  echo "  }"
  echo "}"
} > "$LOGS_DIR/workload_summary.json"

echo "📄 Summary saved to: $LOGS_DIR/workload_summary.json"
echo ""
echo "✨ Production workload ready for MYM analysis!"
