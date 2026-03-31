---
date: 2026-03-06
status: accepted
related_tests: TBD
---

# ADR-019: Validation Infrastructure Consolidation (Core → Runner → Compare → Report)

## Status
Accepted

## Date
2026-03-07

## Context

- Several scripts performed overlapping checks (placeholders, legal citations, Pro Se signature, attachments): pre-send-email-gate.sh, unified-validation-mesh.sh, pre-send-email-workflow.sh, validate-emails.sh.
- No single report answered: which validators pass/fail, what %/# coverage, conflicting verdicts.
- advocate/ay CLIs had no validate-email or compare-validators entry points.

---

## Decision

1. **Single source of truth:** [scripts/validation-core.sh](../scripts/validation-core.sh) — pure functions (core_check_placeholders, core_check_legal_citations, core_check_pro_se_signature, core_check_attachments) plus CLI mode `email --file <path> --check all [--json]`. No state.
2. **Orchestration:** [scripts/validation-runner.sh](../scripts/validation-runner.sh) sources core, runs all 4 checks, reports PASS/FAIL/VERDICT.
3. **Aggregation:** [scripts/compare-all-validators.sh](../scripts/compare-all-validators.sh) runs file-level and project-level validators, writes [reports/CONSOLIDATION-TRUTH-REPORT.md](../../reports/CONSOLIDATION-TRUTH-REPORT.md) with %/# metrics and "What works NOW".
4. **Gate:** [scripts/pre-send-email-gate.sh](../scripts/pre-send-email-gate.sh) sources core (no duplicate logic), 5 sections, exit 0/1/2.
5. **Metric standard:** %/# = state (count/percentage); %.# = velocity (rate of change). One constant = relation (C = ∫v·dt, ΔC·ΔT ≥ k). See [docs/VALIDATION_METRICS_AND_PROGRESS.md](../VALIDATION_METRICS_AND_PROGRESS.md).
6. **CLI entry points:** advocate validate-email \<file\>, advocate compare-validators [--latest]; ay validate-email, ay compare-validators (delegate to advocate).

---

## Consequences

- Single place to fix or extend checks (validation-core.sh).
- CONSOLIDATION-TRUTH-REPORT answers: which checks passed/failed, which validators participated vs SKIP, conflicting verdicts.
- Consolidation-first: fix in-place (deps, quoting, COMPARE_MODE) to extend coverage; then extend (RAG/LLMLingua, agentic-qe, Claude Flow).
- Traceability: [docs/VALIDATION-PIPELINE-TRACING.md](../VALIDATION-PIPELINE-TRACING.md) maps scripts to DoR/DoD/PRD/ADR/TDD.

---

## Amendment: Cross-Tree Scope (2026-03-09)

### Context

The original ADR only covered `agentic-flow/scripts/`. Discovery revealed **19 additional validators** in `CLT/MAA/Uptown/BHOPTI-LEGAL/` that were invisible to the orchestrator:
- `_SYSTEM/_AUTOMATION/validate-email.sh` (21-check RFC 5322 validator)
- `_SYSTEM/_AUTOMATION/validation-core.sh` (v1.0, 337 lines, DDD aggregate)
- `_SYSTEM/_AUTOMATION/validation-runner.sh` (8 checks, feature flags)
- `00-DASHBOARD/email-server.js` (8 JS validators + bash bridge)
- `11-ADVOCACY-PIPELINE/scripts/validate-*.sh` (6 advocacy validators)
- `11-ADVOCACY-PIPELINE/scripts/send-with-full-wholeness.sh` (Christopher Alexander 21-point)

### Decision Amendment

1. **Cross-tree inventory**: [VALIDATOR_INVENTORY.md](../../VALIDATOR_INVENTORY.md) is the ONE canonical registry for all validators across both trees. Do not create new inventory files.
2. **Convergence**: Checks that overlap (placeholder, citation, signature, attachment) use `validation-core.sh` pure functions as source of truth. Both trees' `validation-core.sh` should converge.
3. **Anti-fragile divergence**: Validators with different methods (bash RFC parsing vs JS runtime vs Python AST) are kept separate intentionally. Disagreement between them is a signal, not noise.
4. **Dashboard bridge**: `email-server.js` exposes `/validate-full` endpoint that runs JS + bash + runner validators in parallel, providing unified JSON output.
5. **Registry hygiene**: 23 existing registry/inventory/consolidation files discovered. 4 are canonical (extend), 3 are generated (regenerate), 9 are historical (frozen), 5 are flat data (regenerate), 2 are other domains. See VALIDATOR_INVENTORY.md cross-reference map.

### MPP (Method Pattern Protocol)

Each validator is classified by:
- **Method**: How it checks (pure function, orchestration, meta-aggregation, REST API)
- **Pattern**: What structure it follows (DDD value object, DDD aggregate, contrastive ensemble, checklist)
- **Protocol**: How it communicates results (stdout, JSON, exit code, HTTP response)

All validators should converge on a minimum JSON protocol:
```json
{"validator": "name", "result": "PASS|FAIL|WARN", "checks": [...], "exit_code": 0}
```

### Supersedes

This amendment supersedes:
- `docs/VALIDATION-CONSOLIDATION-PLAN.md` (496-line plan)
- `docs/DPC-CONSOLIDATION-ACTION-PLAN.md`
- `scripts/CONSOLIDATION-EXECUTION-PLAN.md`
- `scripts/CONSOLIDATION-STATUS.md`
- `reports/VALIDATION-CONSOLIDATION-ROADMAP-20260228.md`
- `reports/CONSOLIDATION-ROADMAP-20260227-2217.md`
