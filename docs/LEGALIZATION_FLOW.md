# Legalization Flow: No Blind Acceptance

**Date**: 2026-02-13  
**Principle**: Don't blindly accept unvalidated, unverified prior acceptance criteria.  
**Flow**: Review/Define DoD → Build Validation → Implement → Verify → CICD Measure Learn

---

## Rule: No Blind Acceptance

| Reject | Accept |
|--------|--------|
| Prior criteria without verification | Criteria validated against current context |
| "We've always done it this way" | Evidence-based DoD |
| Assumed success metrics | Measured outcomes |
| Unverified precedent | Citation-checked, current law |

**Gate**: Every DoD criterion must be **verifiable** and **verified** before work is considered done.

---

## Legalization Flow (Inverted)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REVIEW/DEFINE DoD  →  BUILD VALIDATION  →  IMPLEMENT  →  VERIFY            │
│       ↑                      ↑                  ↑              ↑            │
│  Don't assume           Tests first         Code to spec    Run gates       │
│  prior criteria         exist before        guided by      before done     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Review/Define DoD
- **Challenge** prior acceptance criteria
- **Define** verifiable exit criteria (measurable, testable)
- **Document** in ADR/PRD
- **Do not** copy-paste from old checklists without validation

### Phase 2: Build Validation
- **Build** tests/validators before implementation
- **Gate** implementation on validation passing
- **DoR** checklist: All criteria have validation methods

### Phase 3: Implement
- **Implement** guided by DoD
- **TDD**: Red → Green → Refactor
- **No** "hope it works" deployment

### Phase 4: Verify
- **Run** all validation gates
- **Measure** against DoD
- **Log** to .goalie/metrics for learning

### Phase 5: CICD Measure Learn
- **Build**: Produce artifacts
- **Measure**: Verify URLs, API, consensus
- **Learn**: Log to metrics, improve next cycle

---

## OODA Integration (Inbox Zero / Goal Planner)

| OODA Step | Legal Inbox | Goal Planner |
|-----------|-------------|--------------|
| **Observe** | Scan inbox, detect patterns | List goals, capture status |
| **Orient** | Classify risk (ROAM), prioritize (WSJF) | Assess urgency, dependencies |
| **Decide** | DoR check, allocate resource | Choose next action |
| **Act** | Send/Validate, DoD verify | Execute, measure |

**Feedback loop**: Act → Observe (outcome) → Orient (update context) → Decide (next) → Act

**Inbox Zero**: Each email = OODA cycle. Don't defer without explicit DoR (ready) or DoD (done).

**Reference**: `docs/quality/DOR_DOD_FRAMEWORK.md`

---

## CICD Build/Measure/Learn

| Phase | Action | Output |
|-------|--------|--------|
| **Build** | Export, generate, compile | Artifacts (PDF, .eml, etc.) |
| **Measure** | URL health, API test, consensus | Pass/fail metrics |
| **Learn** | Log to .goalie/*.jsonl | Metrics for next cycle |

**Example** (CV deploy):
```bash
./scripts/cv-deploy-cicd.sh build    # pandoc → docs/cv/build/
./scripts/cv-deploy-cicd.sh measure  # URLs + cPanel API
./scripts/cv-deploy-cicd.sh learning # .goalie/cv_deploy_metrics.jsonl
```

**Example** (Legal email):
```bash
advocate dor validate -f draft.eml   # DoR gates
./scripts/run-validation-dashboard.sh -f draft.eml  # 21-role consensus
advocate dod validate -f sent.eml    # DoD verify
```

---

## Semi-Auto Patent System (ADR Reference)

| Component | DoD | Validation |
|-----------|-----|------------|
| Creation Engine | USPTO-compliant draft | 33-role governance |
| Examiner Simulator | Rejection likelihood | Prior art search |
| Enforcement Analyzer | Claim strength | Design-around detection |
| Appraisal | Value estimate | Market analysis |
| Portfolio Optimizer | Strategy | Gap analysis |

**Reference**: `docs/SEMI_AUTO_PATENT_SYSTEM_ADR.md`

---

## Related Docs

- `docs/quality/DOR_DOD_FRAMEWORK.md` – DoR/DoD gates, OODA
- `docs/ROAM_RISK_ANALYSIS_INVERTED_THINKING.md` – Inversion, ROAM
- `docs/SEMI_AUTO_PATENT_SYSTEM_ADR.md` – Patent ADR
