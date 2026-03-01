# ADR-019: Validation Consolidation (Core → Runner → Compare → Report)

**Status**: Accepted  
**Date**: 2026-02-26  
**Context**: Multiple email validators with duplicated logic; need single source of truth and one constant for locality (%/#, %.#).

---

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
