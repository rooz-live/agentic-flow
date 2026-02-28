# Consolidation Truth Report

## What works NOW
- **File-level:** 2/10 passed (20%). Green: validation-runner.sh
- **Project-level:** 2/4 passed (50%). Green: validate_coherence.py,contract-enforcement-gate.sh
- **Conflicting verdicts:** See Discrepancies below.

## Run metadata
- **Date:** 2026-02-28T21:36:44Z
- **Command:** `compare-all-validators.sh `
- **Files validated:** 2
  - EMAIL-TO-LANDLORD-110-FRAZIER.md
  - EMAIL-TO-AMANDA-REQUEST-APPROVAL.md

## Coverage metrics (%/#)
*(Standard: %/# = state; %.# = velocity. See docs/VALIDATION_METRICS_AND_PROGRESS.md for 4D Progress and one-constant relation.)*

| Scope | Passed | Failed | Skipped | Total | % |
|-------|--------|--------|---------|-------|---|
| File-level | 2 | 2 | 6 | 10 | 20% |
| Project-level | 2 | 1 | 1 | 4 | 50% |

## Per-run results
| Validator | File(s) | Exit | Result | Notes |
|-----------|---------|------|--------|-------|
| pre-send-email-gate.sh | EMAIL-TO-LANDLORD-110-FRAZIER.md | 127 | SKIP | bash: line 1: /Users/shahroozbhopti/Documents/code |
| validation-runner.sh | EMAIL-TO-LANDLORD-110-FRAZIER.md | 0 | PASS | Running Validation Runner on EMAIL-TO-LANDLORD-110 |
| pre-send-email-workflow.sh | EMAIL-TO-LANDLORD-110-FRAZIER.md | 127 | SKIP | bash: line 1: /Users/shahroozbhopti/Documents/code |
| comprehensive-wholeness-validator.sh | EMAIL-TO-LANDLORD-110-FRAZIER.md | 127 | SKIP | bash: line 1: /Users/shahroozbhopti/Documents/code |
| mail-capture-validate.sh | EMAIL-TO-LANDLORD-110-FRAZIER.md | 1 | FAIL | ══════════════════════════════════════════════════ |
| pre-send-email-gate.sh | EMAIL-TO-AMANDA-REQUEST-APPROVAL.md | 127 | SKIP | bash: line 1: /Users/shahroozbhopti/Documents/code |
| validation-runner.sh | EMAIL-TO-AMANDA-REQUEST-APPROVAL.md | 0 | PASS | Running Validation Runner on EMAIL-TO-AMANDA-REQUE |
| pre-send-email-workflow.sh | EMAIL-TO-AMANDA-REQUEST-APPROVAL.md | 127 | SKIP | bash: line 1: /Users/shahroozbhopti/Documents/code |
| comprehensive-wholeness-validator.sh | EMAIL-TO-AMANDA-REQUEST-APPROVAL.md | 127 | SKIP | bash: line 1: /Users/shahroozbhopti/Documents/code |
| mail-capture-validate.sh | EMAIL-TO-AMANDA-REQUEST-APPROVAL.md | 1 | FAIL | ══════════════════════════════════════════════════ |
| unified-validation-mesh.sh | (project) | 127 | SKIP | bash: line 1: /Users/shahroozbhopti/Documents/code |
| validate_coherence.py | (project) | 0 | PASS |  |
| check_roam_staleness.py | (project) | 1 | FAIL | ================================================== |
| contract-enforcement-gate.sh | (project) | 0 | PASS | [INFO] Verifying ROAM freshness (<= 96h)... |

## Coverage
- **File-level:** pre-send-email-gate.sh, validation-runner.sh, pre-send-email-workflow.sh, comprehensive-wholeness-validator.sh, mail-capture-validate.sh
- **Project-level:** unified-validation-mesh.sh, validate_coherence.py, check_roam_staleness.py, contract-enforcement-gate.sh

## Discrepancies
Same file, different result across validators:
- **EMAIL-TO-LANDLORD-110-FRAZIER.md:** mixed PASS/FAIL (review per-validator output above)
- **EMAIL-TO-AMANDA-REQUEST-APPROVAL.md:** mixed PASS/FAIL (review per-validator output above)

## Coherence (DDD/ADR/TDD/PRD)
When validate_coherence.py exit 0, see its JSON/output for structural coherence. Traceability: docs/VALIDATION-PIPELINE-TRACING.md

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
- **%/# coverage:** 28% (4/14)
- **R(t) robustness:** 33% (3/9 implemented)
- **DPC(t) = %/# × R(t):** 9
- **T_remain/T_total:** 23% (3d / 13d) [2026-02-18 → 2026-03-03]
- **DPC_R(t) = C × (T/T₀) × R:** 2 (normalized, decays → 0 at deadline)
- **Urgency factor:** 434/100 (rises as deadline approaches)
- **%.# velocity:** 0% in 1min = 0.00%/min (EMA: -1.41%/min)

