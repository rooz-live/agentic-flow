# AY Production Runbook

## Overview
This runbook provides operational procedures for managing the AY (Agentic Yield) maturity system in production.

## Pre-Flight Checks

### Before Each Production Run
```bash
# 1. Verify database integrity
bash scripts/ay-prod.sh --check orchestrator standup

# 2. Check ROAM staleness
bash scripts/ay-roam-staleness-check.sh

# 3. Validate skill persistence
bash scripts/ay-skills-agentdb.sh

# 4. Review governance compliance
bash scripts/ay-governance-check.sh
```

## Operational Modes

### Safe Mode (Deterministic)
```bash
bash scripts/ay-prod.sh --safe orchestrator standup
```
- No divergence
- 100% deterministic
- Use for critical production workloads

### Adaptive Mode (Recommended)
```bash
bash scripts/ay-prod.sh --adaptive orchestrator standup
```
- Dynamic thresholds
- Minimal variance
- Balances stability and learning

### Learning Mode (Post-Validation)
```bash
bash scripts/ay-prod.sh --learn orchestrator standup
```
- 5% controlled divergence
- Continuous improvement
- Requires validation first

## Monitoring

### Key Metrics
- **ROAM Staleness**: Target <3 days
- **Test Coverage**: Target 80%
- **Skill Confidence**: Average >0.75
- **OK Rate**: Target >95%
- **Stability Score**: Target >0.80

### Check Metrics
```bash
# View maturity state
cat reports/maturity/maturity-state.json | jq

# Check ROAM scores
cat reports/roam-assessment-enhanced.json | jq '.mym_scores'

# Review skill validations
cat reports/skill-validations.json | jq '.validations | length'
```

## Incident Response

### ROAM Staleness Alert
```bash
# 1. Force ROAM update
bash scripts/ay-assess.sh

# 2. Verify freshness
bash scripts/ay-roam-staleness-check.sh

# 3. Update MYM scores
bash scripts/ay-maturity-enhance.sh --roam-only
```

### Low Confidence Skills
```bash
# 1. Identify low confidence skills
cat reports/skills-store.json | jq '[.skills[] | select(.success_rate < 0.5)]'

# 2. Trigger validation
bash scripts/ay-update-skill-confidence.sh <skill_name> success "validation evidence"

# 3. Review and retrain
bash scripts/ay-prod-learn-loop.sh
```

### Circuit Breaker Activation
```bash
# 1. Generate test traffic
bash scripts/ay-generate-circuit-traffic.sh

# 2. Review thresholds
bash scripts/ay-dynamic-thresholds.sh

# 3. Adjust if needed
# Edit thresholds in agentdb
```

## Maintenance

### Daily Tasks
- [ ] Check ROAM staleness
- [ ] Review skill validations
- [ ] Monitor test coverage
- [ ] Verify governance compliance

### Weekly Tasks
- [ ] Run P0 validation
- [ ] Update confidence scores
- [ ] Generate iteration handoff
- [ ] Review decision audit logs

### Monthly Tasks
- [ ] Full maturity assessment
- [ ] Multi-LLM consultation
- [ ] Update production runbook
- [ ] Archive old reports

## Escalation

### Critical Issues
1. Database corruption
2. Persistent test failures
3. ROAM staleness >7 days
4. Governance violations

### Contact
- Primary: AY System Owner
- Secondary: DevOps Team
- Escalation: Architecture Team

## References
- [AY Maturity Documentation](./maturity/)
- [FIRE Methodology](./FIRE.md)
- [ROAM Assessment Guide](./ROAM.md)
- [Governance Policies](../src/governance/)
