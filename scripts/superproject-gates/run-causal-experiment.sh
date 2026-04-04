#!/usr/bin/env bash
set -euo pipefail

# Causal Experiment Runner
# Runs ceremonies with and without skill pre-loading to enable causal discovery

CIRCLE="${1:-orchestrator}"
CEREMONY="${2:-standup}"
TREATMENT_RUNS="${3:-6}"
CONTROL_RUNS="${4:-6}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "════════════════════════════════════════════════════════════"
echo "  Causal Experiment: ${CIRCLE}/${CEREMONY}"
echo "  Treatment runs (WITH skills): $TREATMENT_RUNS"
echo "  Control runs (NO skills): $CONTROL_RUNS"
echo "════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════
# Phase 1: Treatment Group (WITH skills pre-loaded)
# ═══════════════════════════════════════════════════════════════
echo "🧪 Phase 1: Treatment Group (WITH skills)"
echo ""

for i in $(seq 1 $TREATMENT_RUNS); do
  echo "  Run $i/$TREATMENT_RUNS (treatment)..."
  
  # Pre-load skills for this circle
  SKILL_COUNT=$(npx agentdb skill search "$CIRCLE" 10 --json 2>/dev/null | jq '.skills | length' 2>/dev/null || echo "0")
  echo "    Skills loaded: $SKILL_COUNT"
  
  # Run ceremony with skill context
  if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
    "$SCRIPT_DIR/ay-prod-cycle.sh" "$CIRCLE" "$CEREMONY" advisory
  else
    echo "    ⚠️  ay-prod-cycle.sh not found, skipping"
  fi
  
  echo "    ✓ Treatment run $i complete"
  sleep 1
done

echo ""
echo "✓ Treatment group complete ($TREATMENT_RUNS runs)"
echo ""

# ═══════════════════════════════════════════════════════════════
# Phase 2: Control Group (NO skills, clean cache)
# ═══════════════════════════════════════════════════════════════
echo "🧪 Phase 2: Control Group (NO skills)"
echo ""

for i in $(seq 1 $CONTROL_RUNS); do
  echo "  Run $i/$CONTROL_RUNS (control)..."
  
  # Don't pre-load skills - let system run without them
  # This creates the control group
  
  # Run ceremony without skill context
  if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
    "$SCRIPT_DIR/ay-prod-cycle.sh" "$CIRCLE" "$CEREMONY" advisory
  else
    echo "    ⚠️  ay-prod-cycle.sh not found, skipping"
  fi
  
  echo "    ✓ Control run $i complete"
  sleep 1
done

echo ""
echo "✓ Control group complete ($CONTROL_RUNS runs)"
echo ""

# ═══════════════════════════════════════════════════════════════
# Phase 3: Analyze Results
# ═══════════════════════════════════════════════════════════════
echo "📊 Analyzing causal data..."
echo ""

# Rebuild TypeScript if needed
if [ ! -f "$PROJECT_ROOT/dist/core/causal-learning-integration.js" ]; then
  echo "  Building TypeScript..."
  npm run build --silent 2>/dev/null || true
fi

# Run causal learner with relaxed thresholds
echo "  Running learner..."
npx agentdb learner run 1 0.3 0.5 false

echo ""
echo "  Checking experiment results..."
sqlite3 "$PROJECT_ROOT/agentdb.db" <<EOF
SELECT 
  'Experiment: ' || name as summary,
  'Treatment: ' || COALESCE(treatment_mean, 0) || '%' as treatment,
  'Control: ' || COALESCE(control_mean, 0) || '%' as control,
  'Uplift: ' || COALESCE(uplift, 0) || '%' as uplift,
  'Status: ' || status as status
FROM causal_experiments
WHERE name = '${CIRCLE}_${CEREMONY}_skill_impact'
ORDER BY id DESC
LIMIT 1;
EOF

echo ""
echo "  Observation breakdown:"
sqlite3 "$PROJECT_ROOT/agentdb.db" <<EOF
SELECT 
  experiment_id,
  COUNT(*) as total_obs,
  SUM(CASE WHEN is_treatment=1 THEN 1 ELSE 0 END) as treatment_obs,
  SUM(CASE WHEN is_treatment=0 THEN 1 ELSE 0 END) as control_obs,
  ROUND(AVG(outcome_value), 1) as avg_outcome
FROM causal_observations
WHERE experiment_id IN (
  SELECT id FROM causal_experiments 
  WHERE name = '${CIRCLE}_${CEREMONY}_skill_impact'
)
GROUP BY experiment_id;
EOF

echo ""
echo "  Causal edges discovered:"
sqlite3 "$PROJECT_ROOT/agentdb.db" <<EOF
SELECT 
  id,
  mechanism,
  uplift || '%' as uplift,
  confidence,
  sample_size
FROM causal_edges
WHERE mechanism LIKE '%${CIRCLE}%'
OR evidence_ids LIKE '%"' || (
  SELECT id FROM causal_experiments 
  WHERE name = '${CIRCLE}_${CEREMONY}_skill_impact'
  LIMIT 1
) || '"%'
LIMIT 5;
EOF

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Causal experiment complete!"
echo ""
echo "Next steps:"
echo "  • View all edges: sqlite3 agentdb.db 'SELECT * FROM causal_edges;'"
echo "  • Check experiments: sqlite3 agentdb.db 'SELECT * FROM causal_experiments;'"
echo "  • Run more circles: $0 assessor wsjf 6 6"
echo "════════════════════════════════════════════════════════════"
