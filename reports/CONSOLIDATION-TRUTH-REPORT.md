# Consolidation Truth Report

## What works NOW
- **File-level:** 4/5 passed (80%). Green: validation-runner.sh,email-gate-lean.sh,validate-email-dupe.sh,legal-fact-check.sh
- **Project-level:** 4/10 passed (40%). Green: semantic-validation-gate.sh,validate_coherence.py,check-csqbm.sh,contract-enforcement-gate.sh
- **Conflicting verdicts:** See Discrepancies below.

## Run metadata
- **Date:** 2026-04-06T20:52:15Z
- **Command:** `compare-all-validators.sh `
- **Files validated:** 1
  - MAA_Arbitrator_April6_Timeline_Clarification.eml

## Coverage metrics (%/#)
*(Standard: %/# = state; %.# = velocity. See docs/VALIDATION_METRICS_AND_PROGRESS.md for 4D Progress and one-constant relation.)*

| Scope | Passed | Failed | Skipped | Total | % |
|-------|--------|--------|---------|-------|---|
| File-level | 4 | 1 | 0 | 5 | 80% |
| Project-level | 4 | 2 | 4 | 10 | 40% |

## Per-run results
| Validator | File(s) | Exit | Result | Notes |
|-----------|---------|------|--------|-------|
| validation-runner.sh | MAA_Arbitrator_April6_Timeline_Clarification.eml | 0 | PASS | Running Validation Runner on MAA_Arbitrator_April6 |
| mail-capture-validate.sh | MAA_Arbitrator_April6_Timeline_Clarification.eml | 1 | FAIL | ══════════════════════════════════════════════════ |
| email-gate-lean.sh | MAA_Arbitrator_April6_Timeline_Clarification.eml | 0 | PASS | Email Validation Gate |
| validate-email-dupe.sh | MAA_Arbitrator_April6_Timeline_Clarification.eml | 0 | PASS | 🔍 Checking for duplicates to: "Mike Chaney, ADR Co |
| legal-fact-check.sh | MAA_Arbitrator_April6_Timeline_Clarification.eml | 0 | PASS | [EML-GATE] Auditing correspondence constraint boun |
| validate-foundation.sh | (project) | 1 | SKIP | 🔍 Foundation Validation Gate |
| semantic-validation-gate.sh | (project) | 0 | PASS | ══════════════════════════════════════════════════ |
| agentdb_freshness | (project) | 0 | FAIL | error: unknown command 'kg' |
| validate_coherence.py | (project) | 0 | PASS |  |
| check_roam_staleness.py | (project) | 1 | FAIL | ERROR: Failed to parse ROAM tracker: while parsing |
| check-csqbm.sh | (project) | 0 | PASS | [CSQBM] Asserting interiority's externalities: ver |
| contract-enforcement-gate.sh | (project) | 0 | PASS | [INFO] Verifying ROAM freshness (<= 96h)... |
| batch_classify | (project) | 1 | SKIP |  |
| migrate_email_structure | (project) | 11 | SKIP |  |
| validate_email_pre_send | (project) | 124 | SKIP |  |

## Coverage
- **File-level:** pre-send-email-gate.sh, validation-runner.sh, pre-send-email-workflow.sh, comprehensive-wholeness-validator.sh, mail-capture-validate.sh
- **Project-level:** unified-validation-mesh.sh, validate_coherence.py, check_roam_staleness.py, contract-enforcement-gate.sh

## Discrepancies
Same file, different result across validators:
- **MAA_Arbitrator_April6_Timeline_Clarification.eml:** mixed PASS/FAIL (review per-validator output above)

## Coherence (DDD/ADR/TDD/PRD)
When validate_coherence.py exit 0, see its JSON/output for structural coherence. Traceability: docs/VALIDATION-PIPELINE-TRACING.md

## RCA / Deep-Why Consolidation
- **Model:** Gate evidence -> Causal metrics -> Retro synthesis
- **Status:** 6/8 PASS, 0 FAIL, 2 SKIP

| RCA check | Exit | Result | Notes |
|-----------|------|--------|-------|
| gate_csQBM_deep_why | 0 | PASS | [CSQBM] Asserting interiority's externalities: verifying evidential queries... |
| gate_strict_validation_workflow | 0 | PASS |  |
| causal_governance_rca_fields | 1 | SKIP |  |
| causal_emit_metrics_rca_fields | 0 | PASS |  |
| causal_metrics_anchor_present | 1 | SKIP |  |
| retro_feedback_loop_analyzer | 0 | PASS |  |
| retro_link_metrics_to_retro | 0 | PASS |  |
| retro_cmd_retro_health | 0 | PASS |  |

## Triggering from CLIs (max coverage)
- **Semi-auto (runner + gate):** `advocate validate-email <file>` or `ay validate-email <file>`
- **Full comparison (%/# in this report):** `advocate compare-validators [--latest] [files...]` or `ay compare-validators [--latest] [files...]`
- **Single source of truth (per-check):** `./scripts/validation-core.sh email --file <path> --check placeholders|signature|citations|attachments|all [--json]`

## Architecture
- **validation-core.sh:** Pure functions + CLI; input = file path (+ optional skip flags); output = PASS/FAIL/SKIP lines or JSON. No state.
- **validation-runner.sh:** Orchestration only; sources core, aggregates exit codes, prints summary. No state.
- **Stateful scripts:** unified-validation-mesh.sh (VALIDATION_STATE_DIR), mcp-auto-heal.sh (CIRCUIT_STATE_FILE), warp_health_monitor.sh (STATE_FILE). Comparison runs may be order-dependent where cyclic regression or state is used.
- **Check order:** Cyclic regression in unified-validation-mesh depends on prior run state; first run may differ.
- **Auto-fix:** unified-validation-mesh can mutate shared email files; run compare with read-only or on copies if comparing before/after.

## Stub vs implementation
| Implemented | Deferred |
|-------------|----------|
| compare-all-validators.sh, validation-v1-wip.sh (WIP subset: gate + runner only), validation-core.sh, validation-runner.sh, pre-send-email-gate.sh, unified-validation-mesh.sh, pre-send-email-workflow.sh | RAG/AgentDB vector storage, LLMLingua, LazyLLM, BE tokens |

---


## DPC (Delivery Progress Constant)
- **%/# coverage:** 53% (8/15)
- **R(t) robustness:** 53% (8/15 implemented)
- **DPC(t) = %/# × R(t):** 28
- **T_remain/T_total:** 0% (0d / 13d) [2026-02-18 → 2026-03-03]
- **DPC_R(t) = C × (T/T₀) × R:** 0 (normalized, decays → 0 at deadline)
- **DPC_U(t) = DPC × urgency:** 28 (pressure gauge — rises near deadline if DPC maintained)
- **Urgency factor:** 100/100 (rises as deadline approaches)
- **Urgency zone:** RED
- **T_remain (hourly):** 0h / 312h (0.0%)
- **DPC_R decay:** 0.00 (λ=3, exponential pressure signal)
- **Projected completion:** gap=32, need 0 DPC/day → feasible

