# Production Maturity Execution Workflow

## Quick Start: Complete Production Cycle

```bash
# 1. Check current evidence configuration
./scripts/af evidence list --json

# 2. Run pattern coverage analysis
./scripts/af intent-coverage --required-patterns --json

# 3. Check autocommit readiness gaps
./scripts/af evidence assess --filter autocommit-readiness --json

# 4. Run advisory cycle (25 iterations)
AF_ENV=local ./scripts/af prod-cycle --iterations 25 --mode advisory --json

# 5. After 5 clean cycles, enable autocommit (MANUAL GATE)
AF_ALLOW_CODE_AUTOCOMMIT=1 AF_FULL_CYCLE_AUTOCOMMIT=1 ./scripts/af prod-cycle --mode mutate
```

---

## Pre-Cycle Diagnostics

### Evidence Emitter Health Check
```bash
# List all available emitters and their status
./scripts/af evidence list --json | jq '.emitters[] | {name, enabled, success_rate}'

# Check for WSJF-enrichment failures
./scripts/af goalie-insights --filter wsjf-enrichment --json | \
  jq '[.insights[] | select(.pattern | test("WSJF.*FAIL"))] | length'

# Verify economic compounding emitter
./scripts/af evidence collect --emitter economic_compounding --dry-run --json
```

### Pattern Coverage Analysis
```bash
# Required patterns from evidence_config.json:
# - safe_degrade
# - observability_first  
# - guardrail_lock_check
# - wsjf-enrichment
# - actionable_recommendations

./scripts/af intent-coverage \
  --required-patterns safe_degrade,observability_first,guardrail_lock_check,wsjf-enrichment,actionable_recommendations \
  --min-hit-pct 60.0 \
  --json
```

### Autocommit Readiness Assessment
```bash
# Check graduation criteria
./scripts/af evidence assess --json | jq '{
  green_streak: .graduation.green_streak_count,
  required: .graduation.green_streak_required,
  stability: .graduation.stability_score,
  ok_rate: .graduation.ok_rate,
  sys_errors: .graduation.sys_state_err_count,
  aborts: .graduation.abort_count,
  status: .graduation.assessment
}'

# Specific gap detection
./scripts/af goalie-gaps --filter autocommit-readiness --json | \
  jq '.gaps[] | select(.severity == "blocker")'
```

---

## Production Cycle Execution

### Basic Advisory Cycle
```bash
# Local environment, advisory mode (no mutations)
AF_ENV=local ./scripts/af prod-cycle \
  --iterations 25 \
  --mode advisory \
  --circle assessor \
  --json \
  --log-goalie
```

### With Evidence Collection
```bash
# Enable default emitters
AF_ENV=local ./scripts/af prod-cycle \
  --iterations 25 \
  --mode advisory \
  --default-emitters \
  --json
```

### With Tier-Depth Coverage
```bash
# Include maturity coverage tracking
AF_ENV=local ./scripts/af prod-cycle \
  --iterations 25 \
  --mode advisory \
  --tier-depth-coverage \
  --circle assessor \
  --json
```

### Full Evidence Pipeline
```bash
# All evidence emitters enabled
AF_ENV=local ./scripts/af prod-cycle \
  --iterations 25 \
  --mode advisory \
  --enable-emitter economic_compounding \
  --enable-emitter observability_gaps \
  --enable-emitter maturity_coverage \
  --enable-emitter pattern_hit_pct \
  --enable-emitter prod_cycle_qualification \
  --json
```

---

## Post-Cycle Analysis

### Integration Statistics
```bash
# Pre/Post cycle comparison
./scripts/orchestrate_continuous_improvement.py --compare-cycles --json

# Logger verification
./scripts/verify_logger_enhanced.py --json

# System improvements validation
./scripts/verify_system_improvements.py --json

# Learning parity check
./scripts/validate_learning_parity.py --json
```

### Temporal & Budget Tracking
```bash
# Budget tracking
./scripts/temporal/budget_tracker.py --cycle-id $AF_RUN_ID --json

# AgentDB audit
./scripts/agentdb/audit_agentdb.py --json
```

### Pattern & Coverage Analysis
```bash
# Pattern tag coverage
./scripts/analysis/check_pattern_tag_coverage.py --json

# WIP monitoring
./scripts/execution/wip_monitor.py --json
```

### Health Monitoring
```bash
# Site health
./scripts/monitoring/site_health_monitor.py --json

# Heartbeat monitoring
./scripts/monitoring/heartbeat_monitor.py --json
```

---

## Production Swarm Execution

### Basic Golden/Platinum Swarm
```bash
# 25 iterations (golden baseline)
./scripts/af prod-swarm \
  --golden-iters 25 \
  --golden-reps 3 \
  --save-table \
  --label "sprint-42-golden" \
  --json

# 100 iterations (platinum baseline)
./scripts/af prod-swarm \
  --platinum-iters 100 \
  --platinum-reps 2 \
  --save-table \
  --label "sprint-42-platinum" \
  --json
```

### With Auto-Compare
```bash
# Auto-run swarm-compare after execution
./scripts/af prod-swarm \
  --golden-iters 25 \
  --golden-reps 3 \
  --auto-compare \
  --save-table \
  --label "sprint-42" \
  --json
```

### A/B Testing
```bash
# Compare two variants
./scripts/af prod-swarm \
  --ab-test \
  --variant-a-iters 25 \
  --variant-a-label "baseline" \
  --variant-b-iters 50 \
  --variant-b-label "extended" \
  --ab-reps 5 \
  --auto-compare \
  --json
```

### Multi-Variant Testing (5 variants)
```bash
# Test multiple iteration counts
./scripts/af prod-swarm \
  --variant-a-iters 10 --variant-a-label "fast" \
  --variant-b-iters 25 --variant-b-label "golden" \
  --variant-c-iters 50 --variant-c-label "extended" \
  --variant-d-iters 75 --variant-d-label "thorough" \
  --variant-e-iters 100 --variant-e-label "platinum" \
  --ab-reps 3 \
  --auto-compare \
  --save-table \
  --json
```

### With Default Emitters
```bash
# Use curated emitter set
./scripts/af prod-swarm \
  --golden-iters 25 \
  --golden-reps 3 \
  --default-emitters \
  --auto-compare \
  --winner-grade \
  --json
```

---

## Swarm Comparison Analysis

### Manual 3-Way Comparison
```bash
# Compare prior vs current vs auto-ref
./scripts/af swarm-compare \
  --prior .goalie/swarm_table_prior_20250115.tsv \
  --current .goalie/swarm_table_current_20250117.tsv \
  --autoref .goalie/swarm_table_autoref_golden.tsv \
  --output-format json \
  --save-path .goalie/swarm_compare_3way.json
```

### Delta Analysis
```bash
# Extract deltas from comparison
cat .goalie/swarm_compare_3way.json | jq '{
  multiplier_delta_pct: .deltas.multiplier_delta_pct,
  safety_regression_count: .deltas.safety_regression_count,
  maturity_progression_steps: .deltas.maturity_progression_steps,
  recommendation: .assessment.recommendation
}'
```

---

## WSJF Analysis & Root Cause Investigation

### WSJF Enrichment Failure Analysis
```bash
# Count WSJF failures
FAILURES=$(./scripts/af goalie-insights --filter wsjf-enrichment --json | \
  jq '[.insights[] | select(.pattern | test("WSJF.*FAIL"))] | length')

echo "WSJF-enrichment failures: $FAILURES"

# Pattern-Method-Context-Protocol breakdown
./scripts/af goalie-insights --filter wsjf-enrichment --json | jq '
.insights[] | select(.pattern | test("WSJF.*FAIL")) | {
  pattern: .pattern,
  method_factor: .context.method,
  context_factor: .context.context,
  protocol_factor: .context.protocol,
  timestamp: .timestamp
}'
```

### 5 Whys Investigation Script
```bash
# Automated 5-why extraction (if tagged in insights)
./scripts/af goalie-insights --filter wsjf-enrichment --json | jq '
.insights[] | select(.five_whys) | {
  problem: .pattern,
  why_1: .five_whys.why_1,
  why_2: .five_whys.why_2,
  why_3: .five_whys.why_3,
  why_4: .five_whys.why_4,
  why_5: .five_whys.why_5,
  root_cause: .five_whys.root_cause
}'
```

---

## Infrastructure Utilization Analysis

### Method Factor (Concurrency)
```bash
# Check current concurrency setting
cat .goalie/evidence_config.json | jq '.cli_defaults.max_concurrency'

# Analyze actual concurrency usage
./scripts/af goalie-metrics --json | jq '{
  max_concurrent_emitters: .metrics.evidence.max_concurrent,
  avg_concurrent_emitters: .metrics.evidence.avg_concurrent,
  utilization_pct: (.metrics.evidence.avg_concurrent / .config.max_concurrency * 100)
}'
```

### Context Factor (Phase Parallelism)
```bash
# Analyze phase execution times
./scripts/af goalie-cycle-log --json | jq '
.cycles[-1].phases[] | {
  phase: .name,
  duration_sec: .duration_sec,
  emitters_count: (.emitters | length),
  parallel_capable: .metadata.parallel_capable
}'
```

### Protocol Factor (Event-Driven Readiness)
```bash
# Check for event bus usage
./scripts/af goalie-metrics --json | jq '{
  event_bus_enabled: .config.event_driven,
  polling_interval_sec: .config.check_interval_sec,
  events_published: .metrics.events.published_count
}'
```

---

## Revenue Concentration Analysis

### Circle Revenue Distribution
```bash
# Current distribution
./scripts/af wsjf-by-circle --json | jq '
.circles | to_entries | map({
  circle: .key,
  revenue_pct: .value.revenue_pct,
  wsjf_total: .value.wsjf_total,
  item_count: .value.item_count
}) | sort_by(-.revenue_pct)
'
```

### Assessor Circle Deep Dive
```bash
# Assessor-specific metrics
./scripts/af wsjf-by-circle --json | jq '.circles.assessor | {
  revenue_pct: .revenue_pct,
  target_max: 35.0,
  delta: (.revenue_pct - 35.0),
  recommendation: (if .revenue_pct > 40 then "CRITICAL: Diversify immediately" 
                   elif .revenue_pct > 35 then "WARNING: Approaching limit" 
                   else "OK: Within target" end)
}'
```

### Circle Health Dashboard
```bash
# All circles health check
./scripts/af wsjf-by-circle --json | jq '
.circles | to_entries | map({
  circle: .key,
  revenue_pct: .value.revenue_pct,
  depth_target: .value.depth_target,
  depth_achieved: .value.depth_achieved,
  health: (if .value.revenue_pct > 40 then "CRITICAL"
           elif .value.revenue_pct > 35 then "WARNING"
           elif .value.revenue_pct < 5 then "UNDERUTILIZED"
           else "HEALTHY" end)
}) | sort_by(.health)
'
```

---

## Autocommit Graduation Process

### Shadow Cycle Tracking
```bash
# Track shadow cycles (advisory mode, collecting evidence)
for i in {1..10}; do
  echo "Shadow Cycle $i/10"
  AF_ENV=local ./scripts/af prod-cycle \
    --iterations 25 \
    --mode advisory \
    --default-emitters \
    --json > ".goalie/shadow_cycle_${i}.json"
  
  # Check graduation eligibility after each cycle
  ./scripts/af evidence assess --json | jq '{
    cycle: '$i',
    green_streak: .graduation.green_streak_count,
    stability: .graduation.stability_score,
    ready: .graduation.ready_for_graduation
  }'
  
  sleep 5
done
```

### Graduation Assessment Report
```bash
# Comprehensive graduation report
./scripts/af evidence assess --json | jq '{
  status: .graduation.assessment,
  criteria: {
    green_streak: {
      current: .graduation.green_streak_count,
      required: .graduation.green_streak_required,
      passed: (.graduation.green_streak_count >= .graduation.green_streak_required)
    },
    stability: {
      current: .graduation.stability_score,
      required: .graduation.min_stability_score,
      passed: (.graduation.stability_score >= .graduation.min_stability_score)
    },
    ok_rate: {
      current: .graduation.ok_rate,
      required: .graduation.min_ok_rate,
      passed: (.graduation.ok_rate >= .graduation.min_ok_rate)
    },
    sys_errors: {
      current: .graduation.sys_state_err_count,
      max: .graduation.max_sys_state_err,
      passed: (.graduation.sys_state_err_count <= .graduation.max_sys_state_err)
    },
    aborts: {
      current: .graduation.abort_count,
      max: .graduation.max_abort,
      passed: (.graduation.abort_count <= .graduation.max_abort)
    },
    shadow_cycles: {
      current: .graduation.shadow_cycles_completed,
      required: .graduation.shadow_cycles_before_recommend,
      passed: (.graduation.shadow_cycles_completed >= .graduation.shadow_cycles_before_recommend)
    }
  },
  blockers: .graduation.blockers,
  recommendation: .graduation.recommendation
}'
```

### Retro Approval Gate
```bash
# Generate retro review materials
cat << 'EOF' > .goalie/autocommit_graduation_review.md
# Autocommit Graduation Review

## Graduation Candidate
- Run ID: $(cat .goalie/latest_run_id.txt)
- Date: $(date)

## Metrics Summary
$(./scripts/af evidence assess --json | jq -r '
  "- Green Streak: \(.graduation.green_streak_count)/\(.graduation.green_streak_required)\n" +
  "- Stability: \(.graduation.stability_score | round)%/\(.graduation.min_stability_score | round)%\n" +
  "- OK Rate: \((.graduation.ok_rate * 100) | round)%/\((.graduation.min_ok_rate * 100) | round)%\n" +
  "- System Errors: \(.graduation.sys_state_err_count)\n" +
  "- Aborts: \(.graduation.abort_count)\n" +
  "- Shadow Cycles: \(.graduation.shadow_cycles_completed)/\(.graduation.shadow_cycles_before_recommend)"
')

## Evidence
$(./scripts/af evidence view --run-id $(cat .goalie/latest_run_id.txt) --json)

## ROAM Risk Assessment
- [ ] Owned risks documented and mitigated
- [ ] Accepted risks acknowledged by circle
- [ ] Mitigated controls verified
- [ ] No unresolved blockers

## Retro Decision
- [ ] APPROVED: Enable autocommit
- [ ] DEFERRED: Continue shadow cycles (reason: _______)
- [ ] REJECTED: Fundamental issues found (reason: _______)

Approved by: ___________  Date: _______
EOF

cat .goalie/autocommit_graduation_review.md
```

---

## Evidence Emitter Management

### List All Emitters
```bash
./scripts/af evidence list --json | jq '.emitters[] | {
  name,
  enabled,
  default,
  timeout_sec,
  success_rate,
  avg_duration_ms
}'
```

### Enable/Disable Emitters
```bash
# Enable optional emitter
./scripts/af evidence enable --emitter pattern_hit_pct

# Disable noisy emitter
./scripts/af evidence disable --emitter depth_ladder

# Re-enable default set
./scripts/af evidence enable --default-only
```

### Emitter Performance Analysis
```bash
# Identify slow emitters
./scripts/af evidence list --json | jq '
.emitters[] | select(.avg_duration_ms > 5000) | {
  name,
  avg_duration_ms,
  timeout_sec,
  timeout_rate: .timeout_count / .execution_count,
  recommendation: "Consider increasing timeout or optimizing"
}'
```

### Circuit Breaker Status
```bash
# Check circuit breaker states
./scripts/af evidence list --json | jq '
.emitters[] | select(.circuit_breaker_enabled) | {
  name,
  state: .circuit_breaker_state,
  failure_count: .circuit_breaker_failure_count,
  threshold: .circuit_breaker_threshold,
  recovery_time_remaining: .circuit_breaker_recovery_sec
}'
```

---

## Security Audit Gap Detection

### SEC-AUDIT Pattern Scanning
```bash
# All security audit gaps
./scripts/af goalie-gaps --filter SEC-AUDIT --json | jq '.gaps[] | {
  pattern,
  severity,
  auto_verify_attempted,
  verification_status,
  assigned_circle
}'
```

### DEPENDABOT CVE Tracking
```bash
# Critical CVEs needing attention
./scripts/af goalie-gaps --filter DEPENDABOT-CVE --json | jq '
.gaps[] | select(.severity == "critical") | {
  cve: .pattern,
  package: .context.package,
  current_version: .context.current_version,
  patched_version: .context.patched_version,
  auto_verify: .auto_verify_status,
  sla_hours_remaining: .sla_hours_remaining
}'
```

### Verification Rate Analysis
```bash
# Overall verification rates
./scripts/af goalie-gaps --filter SEC-AUDIT --json | jq '{
  total: (.gaps | length),
  auto_verified: ([.gaps[] | select(.auto_verify_status == "PASS")] | length),
  manual_needed: ([.gaps[] | select(.auto_verify_status == "MANUAL_REQUIRED")] | length),
  failed: ([.gaps[] | select(.auto_verify_status == "FAIL")] | length),
  rate: ([.gaps[] | select(.auto_verify_status == "PASS")] | length) / (.gaps | length)
}'
```

---

## Circle Decision Telemetry

### Decision Lens Coverage
```bash
# Analyze decision participation by circle
./scripts/af goalie-cycle-log --json | jq '
.cycles[-10:] | map(.decisions) | flatten | 
group_by(.circles_consulted[]) | 
map({
  circle: .[0].circles_consulted[0],
  participation_count: length,
  dominant_count: ([.[] | select(.dominant_lens == .circles_consulted[0])] | length)
})
'
```

### Perspective Balance Check
```bash
# Alert on imbalanced perspectives
./scripts/af goalie-metrics --json | jq '
.metrics.circles | to_entries | map({
  circle: .key,
  participation_pct: .value.decision_participation_pct,
  alert: (if .value.decision_participation_pct < 30 then "UNDERUTILIZED"
          elif .value.decision_participation_pct > 60 then "OVER-RELIED"
          else "BALANCED" end)
}) | sort_by(.participation_pct)
'
```

---

## Depth Ladder Phase Tracking

### Phase Progression Dashboard
```bash
# Current phase status for all circles
./scripts/af goalie-metrics --json | jq '
.metrics.circles | to_entries | map({
  circle: .key,
  current_phase: .value.current_phase,
  depth_achieved: .value.depth_achieved,
  depth_target: .value.depth_target,
  progress_pct: (.value.depth_achieved / .value.depth_target * 100),
  projected_graduation_sprints: .value.projected_graduation_sprints
})
'
```

### Phase Transition Events
```bash
# Recent phase transitions
./scripts/af goalie-cycle-log --json | jq '
[.cycles[].events[] | select(.event == "phase_transition")] | 
.[-5:] | 
map({
  timestamp,
  circle,
  from_phase,
  to_phase,
  trigger,
  evidence: .evidence
})
'
```

---

## Continuous Improvement Orchestration

### Full CI Pipeline
```bash
#!/bin/bash
# run_continuous_improvement.sh

set -e

echo "=== Continuous Improvement Pipeline ==="

# 1. Pre-checks
echo "1. Running pre-checks..."
./scripts/af evidence list --json > /tmp/evidence_pre.json
./scripts/af goalie-metrics --json > /tmp/metrics_pre.json

# 2. Shadow cycle
echo "2. Running shadow cycle..."
AF_ENV=local ./scripts/af prod-cycle \
  --iterations 25 \
  --mode advisory \
  --default-emitters \
  --json > /tmp/shadow_cycle.json

# 3. Post-cycle analysis
echo "3. Running post-cycle analysis..."
./scripts/orchestrate_continuous_improvement.py --json > /tmp/orchestration.json
./scripts/verify_logger_enhanced.py --json > /tmp/logger_verify.json
./scripts/verify_system_improvements.py --json > /tmp/system_verify.json
./scripts/validate_learning_parity.py --json > /tmp/learning_parity.json

# 4. Budget tracking
echo "4. Tracking budget..."
./scripts/temporal/budget_tracker.py --cycle-id $AF_RUN_ID --json > /tmp/budget.json

# 5. AgentDB audit
echo "5. Auditing AgentDB..."
./scripts/agentdb/audit_agentdb.py --json > /tmp/agentdb_audit.json

# 6. Pattern coverage
echo "6. Checking pattern coverage..."
./scripts/analysis/check_pattern_tag_coverage.py --json > /tmp/pattern_coverage.json

# 7. WIP monitoring
echo "7. Monitoring WIP..."
./scripts/execution/wip_monitor.py --json > /tmp/wip.json

# 8. Health checks
echo "8. Running health checks..."
./scripts/monitoring/site_health_monitor.py --json > /tmp/site_health.json
./scripts/monitoring/heartbeat_monitor.py --json > /tmp/heartbeat.json

# 9. Consolidate report
echo "9. Generating consolidated report..."
jq -s '{
  pre_evidence: .[0],
  pre_metrics: .[1],
  shadow_cycle: .[2],
  orchestration: .[3],
  logger_verify: .[4],
  system_verify: .[5],
  learning_parity: .[6],
  budget: .[7],
  agentdb_audit: .[8],
  pattern_coverage: .[9],
  wip: .[10],
  site_health: .[11],
  heartbeat: .[12]
}' /tmp/evidence_pre.json \
   /tmp/metrics_pre.json \
   /tmp/shadow_cycle.json \
   /tmp/orchestration.json \
   /tmp/logger_verify.json \
   /tmp/system_verify.json \
   /tmp/learning_parity.json \
   /tmp/budget.json \
   /tmp/agentdb_audit.json \
   /tmp/pattern_coverage.json \
   /tmp/wip.json \
   /tmp/site_health.json \
   /tmp/heartbeat.json \
   > .goalie/ci_report_$(date +%Y%m%d_%H%M%S).json

echo "=== Pipeline Complete ==="
echo "Report saved to: .goalie/ci_report_$(date +%Y%m%d_%H%M%S).json"
```

---

## NPM Package Updates

```bash
# Update all packages
ncu -u && npm install

# Or using npx
npx npm-check-updates -u && npm install
```

---

## Presentation Generation (Optional)

```bash
# Install presentation tools
npm install claude-presentation-master
npx playwright install chromium

# Generate presentations from markdown
cpm generate docs/RCA_PROD_MATURITY_5W_ROAM.md --mode keynote --format html
cpm generate docs/PROD_MATURITY_EXECUTION_WORKFLOW.md --mode business --format pptx
cpm generate .goalie/ci_report_latest.md --mode business --format html,pptx
```

---

## Environment Variables Reference

```bash
# Core
export AF_RUN_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
export AF_ENV=local  # local|dev|stg|prod
export AF_PROD_OBSERVABILITY_FIRST=1

# Autocommit
export AF_ALLOW_CODE_AUTOCOMMIT=0  # 1 to enable
export AF_FULL_CYCLE_AUTOCOMMIT=0  # 1 to enable

# Mode
export AF_PROD_CYCLE_MODE=advisory  # advisory|mutate|enforcement

# Telemetry
export AF_ENABLE_IRIS_METRICS=1
export AF_LOG_GOALIE=1

# Evidence
export AF_EVIDENCE_DEFAULT_EMITTERS=1
export AF_EVIDENCE_CIRCUIT_BREAKER=1

# Paths
export PROJECT_ROOT=/Users/shahroozbhopti/Documents/code/investing/agentic-flow
export PYTHONPATH=$PROJECT_ROOT/scripts:$PROJECT_ROOT:$PYTHONPATH
```

---

## Troubleshooting

### WSJF-Enrichment Failures
```bash
# Check circuit breaker status
./scripts/af evidence list --json | jq '.emitters.economic_compounding.circuit_breaker_state'

# View recent failures
./scripts/af goalie-insights --filter wsjf-enrichment --json | jq '[.insights[] | select(.level == "error")] | .[-5:]'

# Test emitter directly
./scripts/af evidence collect --emitter economic_compounding --dry-run --verbose
```

### Evidence Config Migration
```bash
# Check for config version mismatch
diff <(jq -S '.emitters | keys' .goalie/evidence_config.json) \
     <(jq -S '.emitters | keys' config/evidence_config.json)

# Validate new config
./scripts/af evidence list --config config/evidence_config.json --validate
```

### Graduation Blockers
```bash
# Identify specific blockers
./scripts/af evidence assess --json | jq '.graduation.blockers[] | {
  type,
  description,
  remediation,
  estimated_cycles_to_clear
}'
```

---

**Last Updated:** 2025-12-17  
**Maintained By:** Platform Team  
**Related Docs:** 
- RCA_PROD_MATURITY_5W_ROAM.md
- evidence_config.json
- scripts/af (CLI reference)
