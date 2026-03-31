# Production Quality Framework for AF Prod

## Overview

The Quality Framework provides comprehensive pre/post context validation, exit code protocols, and protocol pattern factors to ensure `af prod` executes safely with proper ROAM risk management.

## Quality Levels

| Level | Description | Behavior |
|-------|-------------|----------|
| **CRITICAL** | Must pass, blocks execution | Fails immediately if not met |
| **HIGH** | Should pass, warns but continues | Fails in strict mode, warns otherwise |
| **MEDIUM** | Nice to have, informational | Always continues, provides guidance |
| **LOW** | Optional, best practice | Informational only |

## Pre-Context Quality Gates

Run **before** prod execution to validate readiness:

### Critical Checks
- ✅ **Sufficient Disk Space** - At least 1GB free space required
- ✅ **No Concurrent Runs** - Prevents race conditions and data corruption

### High Priority Checks
- ✅ **Goalie Artifacts Exist** - `.goalie/pattern_metrics.jsonl` must be present
- ✅ **WSJF Data Available** - Backlog items exist for prioritization
- ✅ **ROAM Tracking Active** - Evidence collection enabled
- ✅ **Health Checks Enabled** - Health monitoring configured

### Medium Priority Checks
- ✅ **System Stability Baseline** - At least 10 metric events for baseline
- ✅ **Iteration Budget Respected** - Reasonable iteration counts

## Post-Context Quality Gates

Run **after** prod execution to validate outcomes:

### High Priority Checks
- ✅ **Evidence Collected** - Evidence emitters captured data
- ✅ **Metrics Captured** - Pattern metrics logged properly
- ✅ **No Degradation** - System degradation within acceptable limits
  - Fails if >10 degradation events
  - Warns if >5 degradation events

### Medium Priority Checks
- ✅ **WSJF Updated** - Economic analysis ran post-execution
- ✅ **Graduation Assessed** - Autocommit readiness evaluated

## Exit Code Protocol

Standardized exit codes for all `af prod` operations:

| Code | Meaning | Use Case |
|------|---------|----------|
| **0** | Success | All operations completed successfully |
| **1** | Failure | Critical failure, operation did not complete |
| **2** | Partial Success | Some operations succeeded, others failed |
| **130** | Interrupted | User interrupted with Ctrl-C |

### Protocol Patterns

#### Advisory Mode (Default)
```bash
./scripts/af prod --rotations 3 --mode advisory
# Exit 0: Informational assessments, continues on warnings
```

#### Strict Mode (CI/CD Gates)
```bash
./scripts/quality/prod_quality_gates.py --context pre --strict
# Exit 1: Fails on HIGH level issues
```

#### Graduation Assessment
```bash
# Advisory (exit 0, informational)
./scripts/af evidence assess --recent 10

# Strict (exit 1 if not qualified)
./scripts/af evidence assess --recent 10 --strict
```

## Usage

### Run Pre-Context Checks

```bash
# Before starting prod execution
python3 scripts/quality/prod_quality_gates.py --context pre

# Strict mode (fail on HIGH issues)
python3 scripts/quality/prod_quality_gates.py --context pre --strict

# JSON output
python3 scripts/quality/prod_quality_gates.py --context pre --json
```

**Example Output:**
```
======================================================================
🔍 PRE-CONTEXT QUALITY CHECKS
======================================================================
✅ [HIGH    ] goalie_artifacts_exist         - All artifacts present
❌ [HIGH    ] wsjf_data_available            - Backlog directory not found
   💡 Run: ./scripts/af wsjf-replenish
✅ [MEDIUM  ] system_stability_baseline      - Baseline established
✅ [CRITICAL] sufficient_disk_space          - 258.55GB free
✅ [CRITICAL] no_concurrent_runs             - No concurrent runs
✅ [HIGH    ] roam_tracking_active           - ROAM tracking active (1234 entries)

======================================================================
Overall: ✅ PASS
======================================================================
```

### Run Post-Context Checks

```bash
# After prod execution completes
python3 scripts/quality/prod_quality_gates.py --context post

# Check both pre and post
python3 scripts/quality/prod_quality_gates.py --context both
```

### Integrated Workflow

```bash
# 1. Pre-flight checks
python3 scripts/quality/prod_quality_gates.py --context pre || exit 1

# 2. Run adaptive prod
./scripts/af prod --rotations 3 --mode advisory

# 3. Post-flight validation
python3 scripts/quality/prod_quality_gates.py --context post
```

## ROAM Risk Management

The Quality Framework directly supports ROAM tracking:

### Risk (R)
- **Pre-checks** identify risks before execution
- **Concurrent run detection** prevents conflicts
- **Disk space checks** prevent failures

### Opportunity (O)
- **Stability baseline** identifies improvement opportunities
- **Iteration budget** optimization recommendations

### Assumptions (A)
- **Exit code protocol** standardizes expectations
- **Quality levels** clarify assumption criticality

### Mitigation (M)
- **Remediation steps** provided for every failed check
- **Graduation assessment** validates readiness
- **Evidence collection** provides audit trail

## Check Remediation Guide

### Failed: goalie_artifacts_exist
```bash
mkdir -p .goalie && touch .goalie/pattern_metrics.jsonl
```

### Failed: wsjf_data_available
```bash
./scripts/af wsjf-replenish
```

### Failed: system_stability_baseline
```bash
# Run at least one cycle to establish baseline
./scripts/af prod-cycle --mode advisory --iterations 5
```

### Failed: evidence_collected
```bash
# Verify emitters are enabled
cat config/evidence_config.json
# Enable if needed
./scripts/af evidence enable revenue-safe
```

### Failed: roam_tracking_active
```bash
# Ensure evidence assessment runs
./scripts/af prod --rotations 1 --mode advisory
# Evidence should be collected automatically
```

## Integration with af prod

The `cmd_prod.py` orchestrator integrates quality gates:

1. **Pre-Execution**: Validates system readiness
2. **During Execution**: Monitors health checks
3. **Post-Execution**: Verifies evidence collection

### Quality Gate Integration Points

```python
# In cmd_prod.py
class ProdOrchestrator:
    def run_adaptive_rotation(self, max_rotations: int = 3, mode: str = "advisory"):
        # Pre-checks
        quality_gates = QualityGateOrchestrator()
        pre_results = quality_gates.run_pre_checks(strict=False)
        
        if not pre_results['passed']:
            # Log warnings but continue (advisory mode)
            pass
        
        # ... rotation logic ...
        
        # Post-checks
        post_results = quality_gates.run_post_checks(strict=False)
```

## Best Practices

### 1. Always Run Pre-Checks
```bash
# Add to your workflow
python3 scripts/quality/prod_quality_gates.py --context pre && \
  ./scripts/af prod --rotations 3 --mode advisory
```

### 2. Use Strict Mode in CI/CD
```yaml
# .github/workflows/prod.yml
- name: Quality Gate - Pre
  run: python3 scripts/quality/prod_quality_gates.py --context pre --strict

- name: Run Prod
  run: ./scripts/af prod --rotations 3 --mode advisory

- name: Quality Gate - Post
  run: python3 scripts/quality/prod_quality_gates.py --context post --strict
```

### 3. Monitor ROAM Metrics
```bash
# Check evidence regularly
./scripts/af evidence assess --recent 20

# Review pattern metrics
./scripts/af pattern-stats
```

### 4. Set Up Alerts
```bash
# Post-execution validation
if ! python3 scripts/quality/prod_quality_gates.py --context post; then
  # Alert team
  echo "Post-execution quality gates failed" | mail -s "AF Prod Alert" team@example.com
fi
```

## Quality Metrics Dashboard

Track quality over time:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Pre-Check Pass Rate | >95% | - | - |
| Post-Check Pass Rate | >90% | - | - |
| Degradation Events | <5/run | - | - |
| WSJF Update Rate | 100% | - | - |
| Evidence Collection | 100% | - | - |

## Troubleshooting

### Issue: Pre-checks fail consistently
**Solution**: Review remediation steps for each failed check

### Issue: Post-checks show degradation
**Solution**: Run `./scripts/af pattern-stats` to identify patterns

### Issue: ROAM tracking inactive
**Solution**: Verify `config/evidence_config.json` has emitters enabled

### Issue: Exit codes inconsistent
**Solution**: Ensure all scripts follow the protocol (0/1/2/130)

## Exit Code Reference Card

```
┌─────────────────────────────────────────────┐
│  AF Prod Exit Code Protocol                │
├─────────┬────────────┬─────────────────────┤
│  Code   │  Meaning   │  Action Required    │
├─────────┼────────────┼─────────────────────┤
│    0    │  Success   │  None               │
│    1    │  Failure   │  Review logs        │
│    2    │  Partial   │  Review warnings    │
│   130   │  Interrupt │  Rerun if needed    │
└─────────┴────────────┴─────────────────────┘
```

## Summary

The Quality Framework ensures:
- ✅ **Pre-flight validation** prevents known failure modes
- ✅ **Post-flight verification** confirms expected outcomes
- ✅ **Standardized exit codes** enable automation
- ✅ **ROAM risk tracking** provides audit trail
- ✅ **Actionable remediation** guides issue resolution

Use this framework to maintain high quality standards for all `af prod` executions.
