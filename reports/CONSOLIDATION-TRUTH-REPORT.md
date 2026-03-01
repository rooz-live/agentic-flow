# Consolidation Truth Report

## What works NOW
- **File-level:** 0/4 passed (0%). Green: none
- **Project-level:** 2/3 passed (66%). Green: check_roam_staleness.py,contract-enforcement-gate.sh
- **Conflicting verdicts:** See Discrepancies below.

## Run metadata
- **Date:** 2026-03-01T04:26:26Z
- **Command:** `compare-all-validators.sh `
- **Files validated:** 2
  - EMAIL-TO-LANDLORD-110-FRAZIER.md
  - EMAIL-TO-AMANDA-REQUEST-APPROVAL.md

## Coverage metrics (%/#)
*(Standard: %/# = state; %.# = velocity. See docs/VALIDATION_METRICS_AND_PROGRESS.md for 4D Progress and one-constant relation.)*

| Scope | Passed | Failed | Skipped | Total | % |
|-------|--------|--------|---------|-------|---|
| File-level | 0 | 2 | 2 | 4 | 0% |
| Project-level | 2 | 0 | 1 | 3 | 66% |

## Per-run results
| Validator | File(s) | Exit | Result | Notes |
|-----------|---------|------|--------|-------|
| validation-runner.sh | EMAIL-TO-LANDLORD-110-FRAZIER.md | 1 | SKIP | /Users/shahroozbhopti/Documents/code/investing/age |
| mail-capture-validate.sh | EMAIL-TO-LANDLORD-110-FRAZIER.md | 1 | FAIL | ══════════════════════════════════════════════════ |
| validation-runner.sh | EMAIL-TO-AMANDA-REQUEST-APPROVAL.md | 1 | SKIP | /Users/shahroozbhopti/Documents/code/investing/age |
| mail-capture-validate.sh | EMAIL-TO-AMANDA-REQUEST-APPROVAL.md | 1 | FAIL | ══════════════════════════════════════════════════ |
| validate_coherence.py | (project) | 1 | SKIP |  |
| check_roam_staleness.py | (project) | 0 | PASS | ================================================== |
| contract-enforcement-gate.sh | (project) | 0 | PASS | [INFO] Verifying ROAM freshness (<= 96h)... |

## Coverage
- **File-level:** pre-send-email-gate.sh, validation-runner.sh, pre-send-email-workflow.sh, comprehensive-wholeness-validator.sh, mail-capture-validate.sh
- **Project-level:** unified-validation-mesh.sh, validate_coherence.py, check_roam_staleness.py, contract-enforcement-gate.sh

## Discrepancies
Same file, different result across validators:

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
- **%/# coverage:** 28% (2/7)
- **R(t) robustness:** 40% (2/5 implemented)
- **DPC(t) = %/# × R(t):** 11
- **T_remain/T_total:** 23% (3d / 13d) [2026-02-18 → 2026-03-03]
- **DPC_R(t) = C × (T/T₀) × R:** 2 (normalized, decays → 0 at deadline)
- **DPC_U(t) = DPC × urgency:** 47 (pressure gauge — rises near deadline if DPC maintained)
- **Urgency factor:** 434/100 (rises as deadline approaches)
- **Urgency zone:** RED
- **T_remain (hourly):** 72h / 312h (23.1%)
- **DPC_R decay:** 0.20 (λ=3, exponential pressure signal)
- **Projected completion:** gap=49, need 16 DPC/day → stretch
- **%.# velocity:** 21% in 16min = 1.31%/min (EMA: -0.10%/min)

