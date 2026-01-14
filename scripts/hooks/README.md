# Ceremony Hooks - Quick Reference

## TL;DR

```bash
# View hook configuration
./scripts/ay-yo-enhanced.sh hooks

# Enable Phase 1 (recommended start)
export ENABLE_CEREMONY_HOOKS=1
export ENABLE_OBSERVABILITY_CHECK=1
export ENABLE_WSJF_CHECK=1

# Run ceremony with hooks
./scripts/ay-prod-cycle.sh orchestrator standup

# Run learning loop with auto-analysis
./scripts/ay-prod-learn-loop.sh --analyze 20
```

## Hook Lifecycle

```
PRE → CEREMONY → POST → BATCH-ANALYSIS → POST-BATCH
```

## Environment Variables

| Variable | Default | Phase | Purpose |
|----------|---------|-------|---------|
| `ENABLE_CEREMONY_HOOKS` | 1 | All | Master switch |
| `ENABLE_OBSERVABILITY_CHECK` | 1 | 1 | Detect missing metrics |
| `ENABLE_CEREMONY_METRICS` | 1 | 1 | Record ceremony metrics |
| `ENABLE_WSJF_CHECK` | 0 | 1 | Show WSJF priorities |
| `ENABLE_RISK_CHECK` | 0 | 2 | Validate risk thresholds |
| `ENABLE_ROAM_CHECK` | 0 | 2 | Detect blockers |
| `ENABLE_ROAM_ESCALATION` | 0 | 2 | Auto-escalate on failure |
| `ENABLE_RETRO_APPROVAL` | 0 | 2 | Check approval status |
| `ENABLE_PATTERN_ANALYSIS` | 0 | 3 | Analyze patterns |
| `ENABLE_ECONOMIC_CALC` | 0 | 3 | Calculate economics |
| `ENABLE_ALIGNMENT_CHECK` | 0 | 3 | Verify alignment |
| `ENABLE_GRADUATION_REPORT` | 0 | 3 | Generate graduation |

## Integrated Scripts

### PRE-CEREMONY
- `scripts/cmd_wsjf.py` - WSJF priorities
- `scripts/agentic/risk_analytics.py` - Risk validation
- `scripts/agentic/show_roam_risks.py` - ROAM blockers

### POST-CEREMONY
- `scripts/cmd_detect_observability_gaps.py` - Gap detection
- `scripts/agentic/roam_auto_escalation.py` - Auto-escalation
- Metrics: `.goalie/ceremony_metrics.jsonl`

### BATCH-ANALYSIS
- `scripts/cmd_pattern_stats_enhanced.py` - Pattern stats
- `src/integrations/causal-learning-integration.ts` - Causal analysis

### POST-BATCH
- `scripts/cmd_retro.py` - Retro approval
- `scripts/agentic/economic_calculator.py` - Economics
- `scripts/agentic/alignment_checker.py` - Alignment
- `scripts/agentic/graduation_assessor.py` - Graduation

## Commands

### View Configuration
```bash
./scripts/ay-yo-enhanced.sh hooks
```

### Test Hook Manually
```bash
source scripts/hooks/ceremony-hooks.sh
run_pre_ceremony_hooks orchestrator standup
```

### Run with Hooks
```bash
# Single ceremony
ENABLE_WSJF_CHECK=1 ./scripts/ay-prod-cycle.sh orchestrator standup

# Learning loop
ENABLE_PATTERN_ANALYSIS=1 ./scripts/ay-prod-learn-loop.sh --analyze 10
```

## Hook Logs

- `[HOOK]` - Activity
- `[HOOK-✓]` - Success
- `[HOOK-⚠]` - Warning
- `[HOOK-✗]` - Error

## Phases

### Phase 1: Essentials (Start Here)
```bash
export ENABLE_CEREMONY_HOOKS=1
export ENABLE_OBSERVABILITY_CHECK=1
export ENABLE_WSJF_CHECK=1
```

### Phase 2: Risk & Governance
```bash
export ENABLE_RISK_CHECK=1
export ENABLE_ROAM_CHECK=1
export ENABLE_ROAM_ESCALATION=1
export ENABLE_RETRO_APPROVAL=1
```

### Phase 3: Full Analytics
```bash
export ENABLE_PATTERN_ANALYSIS=1
export ENABLE_ECONOMIC_CALC=1
export ENABLE_ALIGNMENT_CHECK=1
export ENABLE_GRADUATION_REPORT=1
```

## Integration Points

| Script | Lines | Hooks |
|--------|-------|-------|
| `ay-prod-cycle.sh` | 8-11, 157-160, 223-234 | PRE, POST |
| `ay-prod-learn-loop.sh` | 8-11, 170-180, 344-347 | BATCH, POST-BATCH |
| `ay-yo-enhanced.sh` | 8-11, 587-594 | Config display |

## Troubleshooting

**Hooks not running?**
```bash
# Check master switch
echo $ENABLE_CEREMONY_HOOKS

# Check script exists
ls scripts/hooks/ceremony-hooks.sh
```

**Hook failures?**
- All failures are non-blocking by design
- Check Python/Node dependencies
- Review error messages in ceremony output

## Documentation

Full docs: [CEREMONY_HOOKS_INTEGRATION.md](../../docs/CEREMONY_HOOKS_INTEGRATION.md)
