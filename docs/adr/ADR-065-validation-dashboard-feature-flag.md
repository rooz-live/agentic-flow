---
date: 2026-03-03
status: Accepted
supersedes: null
related_prd: docs/prd/validation-dashboard.md
related_tests: tests/integration/test_validation_dashboard_auth.py
author: Shahrooz Bhopti
tags: [feature-flag, validation, consulting-demo]
---

# ADR-065: Validation Dashboard Feature Flag

## Date

2026-03-03

## Status
Accepted

## Context
Need to deploy validation dashboard to prod without risking downtime during consulting calls.

## Decision
Use env var-based feature flag (`VALIDATION_DASHBOARD_ENABLED=true/false`) with instant toggle.

## Implementation
```bash
# .env.production
VALIDATION_DASHBOARD_ENABLED=false
DEMO_MODE=true
```

## Consequences
### Pros
- Zero-downtime rollback
- Instant demo enable/disable
- No external service dependencies
- $0 cost

### Cons
- Manual toggle required (no UI)
- No A/B testing capability (upgrade to PostHog if needed)

## Alternatives Considered
1. **LaunchDarkly** (SaaS, $0-$20/mo) → Best for multi-env
2. **Unleash** (Open-source, self-hosted) → Best for privacy/control
3. **PostHog** (Analytics + flags) → Best for A/B testing

## Timeline
- **Week 1 (Mar 4-10)**: Custom env vars (this ADR)
- **Week 4+ (Apr 1+)**: Upgrade to PostHog if A/B testing needed

## Success Metrics
- ✅ Deploy with flag OFF
- ✅ Toggle ON for demo links
- ✅ Zero production incidents
- ✅ 1+ consulting demos completed
- ✅ $5K+ contract signed

---

*Date: 2026-03-03*  
*Author: Shahrooz Bhopti*  
*Reviewers: N/A (solo project)*
