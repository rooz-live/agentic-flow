# Production Cycle Quick Start Guide

## Complete Workflow: Zero to Production Maturity

### Prerequisites Check
```bash
# 1. Run pre-flight health check
./scripts/preflight_health_check.sh strict

# 2. Check current state
./scripts/af quick-health --json
```

---

## Daily Workflow

### Morning: Health Check
```bash
# Quick dashboard (30 seconds)
./scripts/af quick-health

# Expected Output:
# 📊 Quick Health Check
#   Revenue Concentration: 45%
#   Evidence Emitter Health: 85%
#   Pattern Coverage: 72%
#   System Health: 3/4 checks passed
```

### Phase 1: Pattern Coverage Validation
```bash
# Check required patterns with RCA-recommended list
./scripts/af intent-coverage \
  --required-patterns safe_degrade,observability_first,guardrail_lock_check,wsjf-enrichment,actionable_recommendations \
  --min-hit-pct 60.0 \
  --json

# Target: >60% hit rate for graduation eligibility
```

### Phase 2: Autocommit Readiness Check
```bash
# Check graduation gaps
./scripts/af goalie-gaps --filter autocommit-readiness --json

# Expected blockers:
# - green_streak < 5
# - stability_score < 85
# - shadow_cycles < 10
```

### Phase 3: Advisory Cycle (Shadow Mode)
```bash
# Run 25-iteration advisory cycle with evidence collection
AF_ENV=local ./scripts/af prod-cycle \
  --iterations 25 \
  --mode advisory \
  --circle assessor \
  --default-emitters \
  --tier-depth-coverage \
  --json \
  --log-goalie

# Duration: ~15-30 minutes
# Collects: economic_compounding, observability_gaps, maturity_coverage, pattern_hit_pct
```

### Phase 4: Post-Cycle Analysis
```bash
# Integration statistics
./scripts/orchestrate_continuous_improvement.py --json

# Logger verification
./scripts/verify_logger_enhanced.py --json

# System improvements
./scripts/verify_system_improvements.py --json

# Learning parity
./scripts/validate_learning_parity.py --json

# Budget tracking
./scripts/temporal/budget_tracker.py --cycle-id $AF_RUN_ID --json

# AgentDB audit
./scripts/agentdb/audit_agentdb.py --json

# Pattern coverage
./scripts/analysis/check_pattern_tag_coverage.py --json

# WIP monitoring
./scripts/execution/wip_monitor.py --json

# Health checks
./scripts/monitoring/site_health_monitor.py --json
./scripts/monitoring/heartbeat_monitor.py --json
```

### Phase 5: Graduation Assessment
```bash
# Check if ready for autocommit
./scripts/af evidence assess --json | jq '{
  status: .graduation.assessment,
  green_streak: "\(.graduation.green_streak_count)/\(.graduation.green_streak_required)",
  stability: "\(.graduation.stability_score)%/\(.graduation.min_stability_score)%",
  ready: .graduation.ready_for_graduation
}'
```

---

## Autocommit Graduation Path

### Shadow Cycle Sequence (10 cycles minimum)
```bash
for i in {1..10}; do
  echo "=== Shadow Cycle $i/10 ==="
  
  # Pre-flight
  ./scripts/preflight_health_check.sh strict || break
  
  # Advisory cycle
  AF_ENV=local ./scripts/af prod-cycle \
    --iterations 25 \
    --mode advisory \
    --default-emitters \
    --json > ".goalie/shadow_cycle_${i}.json"
  
  # Check graduation status
  ./scripts/af evidence assess --json | jq '{
    cycle: '$i',
    green_streak: .graduation.green_streak_count,
    stability: .graduation.stability_score,
    ready: .graduation.ready_for_graduation
  }'
  
  # Sleep between cycles (avoid rate limiting)
  sleep 30
done
```

### Graduation Criteria Check
```bash
# Generate graduation review document
./scripts/af evidence assess --json | jq '
{
  "Graduation Candidate": {
    "Run ID": .graduation.latest_run_id,
    "Timestamp": .graduation.assessment_timestamp
  },
  "Metrics": {
    "Green Streak": "\(.graduation.green_streak_count)/\(.graduation.green_streak_required)",
    "Stability": "\(.graduation.stability_score)%/\(.graduation.min_stability_score)%",
    "OK Rate": "\((.graduation.ok_rate * 100) | round)%/\((.graduation.min_ok_rate * 100) | round)%",
    "System Errors": .graduation.sys_state_err_count,
    "Aborts": .graduation.abort_count,
    "Shadow Cycles": "\(.graduation.shadow_cycles_completed)/\(.graduation.shadow_cycles_before_recommend)"
  },
  "Status": .graduation.assessment,
  "Blockers": .graduation.blockers
}
' > .goalie/graduation_review.json

cat .goalie/graduation_review.json
```

### Retro Approval Gate
```bash
# Present to team (Assessor Circle)
echo "📋 Autocommit Graduation Review"
echo ""
cat .goalie/graduation_review.json | jq -C
echo ""
read -p "Approved by team? (yes/NO) " -r
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "✅ APPROVED: Enabling autocommit for next cycle"
else
    echo "⏸️  DEFERRED: Continue shadow cycles"
    exit 0
fi
```

### Enable Autocommit (After Approval)
```bash
# ONE-TIME: Enable autocommit after team approval
AF_ALLOW_CODE_AUTOCOMMIT=1 \
AF_FULL_CYCLE_AUTOCOMMIT=1 \
AF_ENV=local \
./scripts/af prod-cycle \
  --iterations 25 \
  --mode mutate \
  --default-emitters \
  --json

# Monitor closely for first 3 cycles!
```

---

## Production Swarm Workflows

### Golden Baseline (25 iterations, 3 reps)
```bash
./scripts/af prod-swarm \
  --golden-iters 25 \
  --golden-reps 3 \
  --save-table \
  --label "sprint-42-golden" \
  --default-emitters \
  --auto-compare \
  --winner-grade \
  --json > .goalie/swarm_golden_$(date +%Y%m%d).json
```

### Platinum Baseline (100 iterations, 2 reps)
```bash
./scripts/af prod-swarm \
  --platinum-iters 100 \
  --platinum-reps 2 \
  --save-table \
  --label "sprint-42-platinum" \
  --default-emitters \
  --auto-compare \
  --winner-grade \
  --json > .goalie/swarm_platinum_$(date +%Y%m%d).json
```

### A/B Testing
```bash
# Compare baseline vs extended iterations
./scripts/af prod-swarm \
  --ab-test \
  --variant-a-iters 25 --variant-a-label "baseline" \
  --variant-b-iters 50 --variant-b-label "extended" \
  --ab-reps 5 \
  --auto-compare \
  --json > .goalie/swarm_ab_test_$(date +%Y%m%d).json
```

### Multi-Variant Testing (5 variants)
```bash
./scripts/af prod-swarm \
  --variant-a-iters 10 --variant-a-label "fast" \
  --variant-b-iters 25 --variant-b-label "golden" \
  --variant-c-iters 50 --variant-c-label "extended" \
  --variant-d-iters 75 --variant-d-label "thorough" \
  --variant-e-iters 100 --variant-e-label "platinum" \
  --ab-reps 3 \
  --auto-compare \
  --save-table \
  --json > .goalie/swarm_multi_variant_$(date +%Y%m%d).json
```

### Swarm Comparison Analysis
```bash
# 3-way comparison: prior vs current vs autoref
./scripts/af swarm-compare \
  --prior .goalie/swarm_table_prior_*.tsv \
  --current .goalie/swarm_table_current_*.tsv \
  --autoref .goalie/swarm_table_autoref_golden.tsv \
  --output-format json \
  --save-path .goalie/swarm_compare_3way.json

# View deltas
cat .goalie/swarm_compare_3way.json | jq '{
  multiplier_delta_pct,
  safety_regression_count,
  maturity_progression_steps,
  recommendation: .assessment.recommendation
}'
```

---

## Troubleshooting

### WSJF-Enrichment Failures
```bash
# Check circuit breaker status
./scripts/af evidence list --json | jq '.emitters.economic_compounding.circuit_breaker_state'

# View recent failures
./scripts/af goalie-insights --filter wsjf-enrichment --json | \
  jq '[.insights[] | select(.level == "error")] | .[-5:]'

# Test emitter directly
python3 scripts/agentic/revenue_attribution.py --circle assessor --json
```

### Infrastructure Issues
```bash
# Check Warp terminal health (if applicable)
AF_CHECK_INFRA_HEALTH=1 ./scripts/preflight_health_check.sh strict

# Or directly
./warp_health_monitor.sh --status

# System resource check
./scripts/af system-health --json
```

### Evidence Config Issues
```bash
# Validate current config
./scripts/af evidence list --json | jq '.emitters[] | {
  name,
  enabled,
  success_rate,
  avg_duration_ms,
  circuit_breaker_state
}'

# Check against RCA recommendations
cat .goalie/evidence_config.json | jq '{
  green_streak: .autocommit_graduation.green_streak_required,
  stability: .autocommit_graduation.min_stability_score,
  shadow_cycles: .autocommit_graduation.shadow_cycles_before_recommend
}'

# Expected (per RCA):
# green_streak: 5
# stability: 85.0
# shadow_cycles: 10
```

---

## Performance Optimization

### Fast Pre-Flight (Skip Optional Checks)
```bash
AF_SKIP_OPTIONAL_CHECKS=1 ./scripts/preflight_health_check.sh permissive
```

### Minimal Evidence (Fast Cycles)
```bash
# Only critical emitters
AF_ENV=local ./scripts/af prod-cycle \
  --iterations 25 \
  --mode advisory \
  --enable-emitter economic_compounding \
  --enable-emitter observability_gaps \
  --json
```

### Parallel Swarm Execution
```bash
# Run multiple swarms in background
./scripts/af prod-swarm --golden-iters 25 --json &
./scripts/af prod-swarm --platinum-iters 100 --json &
wait

# Aggregate results
jq -s 'add' .goalie/swarm_*.json > .goalie/swarm_aggregate.json
```

---

## Continuous Integration

### CI/CD Pipeline Template
```yaml
# .github/workflows/prod-cycle.yml
name: Production Cycle

on:
  schedule:
    - cron: '0 8 * * 1-5'  # Weekdays at 8am
  workflow_dispatch:

jobs:
  prod-cycle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Pre-flight check
        run: |
          ./scripts/preflight_health_check.sh permissive
      
      - name: Run advisory cycle
        env:
          AF_ENV: ci
        run: |
          ./scripts/af prod-cycle \
            --iterations 25 \
            --mode advisory \
            --default-emitters \
            --json > cycle_result.json
      
      - name: Assess graduation
        run: |
          ./scripts/af evidence assess --json > graduation.json
          cat graduation.json
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: cycle-results
          path: |
            cycle_result.json
            graduation.json
            .goalie/
```

---

## Metrics Dashboard

### Key Metrics to Track
```bash
# Revenue concentration (target: <40%)
REVENUE_CONC=$(./scripts/af wsjf-by-circle --json | jq -r '.circles.assessor.revenue_pct')

# WSJF failure rate (target: <5%)
WSJF_FAILURES=$(./scripts/af goalie-insights --filter wsjf-enrichment --json | \
  jq '[.insights[] | select(.pattern | test("WSJF.*FAIL"))] | length')

# Pattern coverage (target: >80%)
PATTERN_HIT=$(./scripts/af intent-coverage --json | jq -r '.pattern_hit_pct')

# Graduation readiness (target: 100% ready)
GRADUATION_READY=$(./scripts/af evidence assess --json | jq -r '.graduation.ready_for_graduation')

echo "📊 Key Metrics:"
echo "  Revenue Concentration: ${REVENUE_CONC}%"
echo "  WSJF Failure Rate: ${WSJF_FAILURES} failures"
echo "  Pattern Coverage: ${PATTERN_HIT}%"
echo "  Graduation Ready: ${GRADUATION_READY}"
```

---

## Reference

**Related Documentation:**
- `docs/RCA_PROD_MATURITY_5W_ROAM.md` - Root cause analysis
- `docs/PROD_MATURITY_EXECUTION_WORKFLOW.md` - Detailed workflows
- `docs/SCRIPT_INTEGRATION_TRACKER.md` - Integration status
- `scripts/preflight_health_check.sh` - Pre-flight checks
- `.goalie/evidence_config.json` - Configuration

**Support:**
- Review `.goalie/preflight_health.json` for health snapshots
- Check `.warp_health_monitor.log` for infrastructure issues
- Inspect `.goalie/evidence.jsonl` for evidence trail

**Last Updated:** 2025-12-17  
**Version:** 1.0.0  
**Status:** Production Ready
