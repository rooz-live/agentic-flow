# Script Integration Tracker

## Overview
Tracking pending scripts from `.goalie/` and other locations that need integration into the `af` CLI for production maturity.

---

## Priority Matrix

| Priority | Script | Current Location | Target Command | Status | Blocker |
|----------|--------|------------------|----------------|--------|---------|
| **P0** | intent_coverage.py | scripts/agentic/ | `af intent-coverage --required-patterns` | 🟡 PARTIAL | Need --required-patterns flag |
| **P1** | measure_system_state.sh | .goalie/ | `af system-health` | 🔴 PENDING | Not integrated |
| **P1** | QUICK_ACTIONS.sh | .goalie/ | `af quick-health` | 🔴 PENDING | Not integrated |
| **P2** | revenue_attribution.py | scripts/agentic/ | `af revenue-attribution` | 🟢 DONE | Via evidence emitter |
| **P2** | tier_depth_checker.py | scripts/agentic/ | `af tier-depth` | 🟢 DONE | Via --tier-depth flag |
| **P2** | graduation_assessor.py | scripts/agentic/ | `af evidence assess` | 🟡 PARTIAL | Need full graduation logic |
| **P3** | warp_health_monitor.sh | project root | `af infra-health` | 🔴 PENDING | Optional, not critical |

---

## Integration Specifications

### P0: intent-coverage --required-patterns

**Current State:**
```bash
./scripts/af intent-coverage --json
# Works but doesn't accept custom patterns
```

**Target State:**
```bash
./scripts/af intent-coverage \
  --required-patterns safe_degrade,observability_first,wsjf-enrichment \
  --min-hit-pct 60.0 \
  --json
```

**Implementation:**
```bash
# Add to scripts/af around line 400
intent-coverage|pattern-coverage)
    shift
    JSON_OUTPUT=false
    REQUIRED_PATTERNS=""
    MIN_HIT_PCT=60.0
    OTHER_ARGS=()

    while [[ $# -gt 0 ]]; do
        case $1 in
            --json)
                JSON_OUTPUT=true
                OTHER_ARGS+=("--json")
                shift
                ;;
            --required-patterns)
                REQUIRED_PATTERNS="$2"
                OTHER_ARGS+=("--required-patterns" "$2")
                shift 2
                ;;
            --min-hit-pct)
                MIN_HIT_PCT="$2"
                OTHER_ARGS+=("--min-hit-pct" "$2")
                shift 2
                ;;
            *)
                OTHER_ARGS+=("$1")
                shift
                ;;
        esac
    done

    if [ -f "$SCRIPT_DIR/agentic/intent_coverage.py" ]; then
        python3 "$SCRIPT_DIR/agentic/intent_coverage.py" "${OTHER_ARGS[@]}"
    else
        echo "Error: Intent coverage script not found"
        exit 1
    fi
    ;;
```

**Testing:**
```bash
./scripts/af intent-coverage \
  --required-patterns safe_degrade,observability_first \
  --min-hit-pct 60.0 \
  --json | jq '.pattern_hit_pct'
```

**Blocker:** Need to create `scripts/agentic/intent_coverage.py` if it doesn't exist

---

### P1: System Health (measure_system_state.sh)

**Current Script:** `.goalie/measure_system_state.sh`

**Target Command:**
```bash
./scripts/af system-health --json
```

**Integration Plan:**
1. Move script to `scripts/monitoring/system_health.sh`
2. Make CI/CD portable (abstract Warp-specific checks)
3. Add to `af` CLI

**Implementation:**
```bash
# Add to scripts/af
system-health|system-state)
    shift
    JSON_OUTPUT=false
    OTHER_ARGS=()

    while [[ $# -gt 0 ]]; do
        case $1 in
            --json)
                JSON_OUTPUT=true
                OTHER_ARGS+=("--json")
                shift
                ;;
            --baseline)
                OTHER_ARGS+=("--baseline" "$2")
                shift 2
                ;;
            *)
                OTHER_ARGS+=("$1")
                shift
                ;;
        esac
    done

    if [ -f "$SCRIPT_DIR/monitoring/system_health.sh" ]; then
        "$SCRIPT_DIR/monitoring/system_health.sh" "${OTHER_ARGS[@]}"
    else
        echo "Error: System health script not found"
        exit 1
    fi
    ;;
```

**CI/CD Portability:**
```bash
# Detect environment
if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$JENKINS_HOME" ]; then
    # CI/CD mode: generic system checks
    TERMINAL_TYPE="ci"
elif ps aux | grep -q "Warp.app"; then
    # Local dev with Warp
    TERMINAL_TYPE="warp"
else
    # Generic terminal
    TERMINAL_TYPE="generic"
fi

# Load appropriate checks
case "$TERMINAL_TYPE" in
    ci)
        check_container_resources
        check_disk_quota
        ;;
    warp)
        check_warp_memory
        check_warp_tabs
        check_system_resources
        ;;
    generic)
        check_system_resources
        ;;
esac
```

---

### P1: Quick Health Checks (QUICK_ACTIONS.sh)

**Current Script:** `.goalie/QUICK_ACTIONS.sh`

**Target Command:**
```bash
./scripts/af quick-health --json
```

**Refactored Structure:**
```bash
#!/usr/bin/env bash
# Quick health checks for daily use

quick_health() {
    local json_output="$1"
    
    # Revenue concentration
    revenue_concentration=$(./scripts/af wsjf-by-circle --json | \
        jq -r '.circles.assessor.revenue_pct')
    
    # Integration health
    integration_failures=$(./scripts/af pattern-stats --pattern integration --json | \
        jq -r '.failure_count')
    
    # Deploy safety
    deploy_failures=$(./scripts/af pattern-stats --pattern deploy_fail --json | \
        jq -r '.count')
    
    # Evidence emitter health
    emitter_success_rate=$(./scripts/af evidence list --json | \
        jq -r '[.emitters[].success_rate] | add / length')
    
    if [ "$json_output" = "true" ]; then
        cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "revenue_concentration_pct": $revenue_concentration,
  "integration_failures": $integration_failures,
  "deploy_failures": $deploy_failures,
  "emitter_success_rate": $emitter_success_rate,
  "overall_health": "$(get_overall_health)"
}
EOF
    else
        echo "📊 Quick Health Check"
        echo "  Revenue Concentration: ${revenue_concentration}%"
        echo "  Integration Failures: $integration_failures"
        echo "  Deploy Failures: $deploy_failures"
        echo "  Emitter Success Rate: ${emitter_success_rate}%"
    fi
}
```

---

### P3: Infrastructure Health (warp_health_monitor.sh)

**Current Script:** `warp_health_monitor.sh`

**Target Command:**
```bash
./scripts/af infra-health --json
```

**Decision:** OPTIONAL integration
- Keep as standalone utility
- Add as optional pre-flight check
- Not required for CI/CD

**Minimal Integration:**
```bash
# Add to scripts/af
infra-health|infrastructure-health)
    shift
    
    if [ -f "$PROJECT_ROOT/warp_health_monitor.sh" ]; then
        "$PROJECT_ROOT/warp_health_monitor.sh" "$@"
    else
        echo "Infrastructure health monitoring not available"
        echo "Install: Warp terminal health monitor"
        exit 1
    fi
    ;;
```

---

## Integration Workflow

### Step 1: Pre-Flight (Before Integration)
```bash
# Run pre-flight checks
./scripts/preflight_health_check.sh strict

# Review pending integrations
cat docs/SCRIPT_INTEGRATION_TRACKER.md
```

### Step 2: Implementation
```bash
# For each P0/P1 script:
1. Create wrapper in scripts/af
2. Add argument parsing
3. Add error handling
4. Update help text
5. Add to evidence_config.json if applicable
```

### Step 3: Testing
```bash
# Test new command
./scripts/af <new-command> --json | jq

# Test in prod-cycle context
AF_ENV=local ./scripts/af prod-cycle --iterations 5 --mode advisory
```

### Step 4: Post-Flight Validation
```bash
# Run post-flight checks
./scripts/postflight_validation.sh --check-integration <command-name>
```

---

## Escalation Path

### When Script Integration is Blocked

**Level 1: Self-Service (Developer)**
- Review this tracker
- Check for missing dependencies
- Test in isolation first

**Level 2: Team Discussion (Orchestrator Circle)**
- Bring to daily standup
- Assess priority vs effort
- Decide: integrate now, defer, or deprecate

**Level 3: Architectural Decision (Innovator Circle)**
- Major refactoring needed
- Breaking changes required
- Alternative approach needed

---

## Post-Integration Checklist

For each integrated script:
- [ ] Added to `scripts/af` with argument parsing
- [ ] Documented in `--help` output
- [ ] Added example to `docs/PROD_MATURITY_EXECUTION_WORKFLOW.md`
- [ ] Tested in isolation: `./scripts/af <command> --json`
- [ ] Tested in context: `af prod-cycle` with emitter enabled
- [ ] Updated `evidence_config.json` if evidence emitter
- [ ] Added to `preflight_health_check.sh` if critical
- [ ] CI/CD compatibility verified (if applicable)
- [ ] Updated this tracker: 🔴 → 🟡 → 🟢

---

## Current Sprint Focus

### Sprint Goals (Based on RCA)
1. ✅ Fix WSJF-enrichment failures (circuit breaker)
2. ⏳ Integrate `intent-coverage --required-patterns` (P0)
3. ⏳ Integrate `system-health` (P1)
4. ⏳ Integrate `quick-health` (P1)

### Next Sprint
5. Graduation assessor full logic (P2)
6. Infrastructure health optional integration (P3)

---

## Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Scripts in .goalie/ | 2 | 0 | 🔴 |
| Integrated into `af` | 8 | 12+ | 🟡 |
| Pre-flight checks | 7 | 10 | 🟡 |
| CI/CD portable | 60% | 95% | 🟡 |
| Evidence emitters | 5 | 8 | 🟡 |

---

**Last Updated:** 2025-12-17  
**Owner:** Platform Team  
**Review Cadence:** Sprint planning  
**Related Docs:**
- preflight_health_check.sh
- postflight_validation.sh
- PROD_MATURITY_EXECUTION_WORKFLOW.md
- RCA_PROD_MATURITY_5W_ROAM.md
