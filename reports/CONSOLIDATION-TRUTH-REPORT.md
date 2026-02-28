# Consolidation Truth Report

## What works NOW
- **File-level:** 5/5 passed (100%). Green: pre-send-email-gate.sh,validation-runner.sh,pre-send-email-workflow.sh,comprehensive-wholeness-validator.sh,mail-capture-validate.sh
- **Project-level:** 4/4 passed (100%). Green: unified-validation-mesh.sh,validate_coherence.py,check_roam_staleness.py,contract-enforcement-gate.sh
- **Conflicting verdicts:** See Discrepancies below.

## Run metadata
- **Date:** 2026-02-28T00:58:06Z
- **Command:** `compare-all-validators.sh `
- **Files validated:** 1
  - clean-email-test.eml

## Coverage metrics (%/#)
*(Standard: %/# = state; %.# = velocity. See docs/VALIDATION_METRICS_AND_PROGRESS.md for 4D Progress and one-constant relation.)*

| Scope | Passed | Failed | Skipped | Total | % |
|-------|--------|--------|---------|-------|---|
| File-level | 5 | 0 | 0 | 5 | 100% |
| Project-level | 4 | 0 | 0 | 4 | 100% |

## Per-run results
| Validator | File(s) | Exit | Result | Notes |
|-----------|---------|------|--------|-------|
| pre-send-email-gate.sh | clean-email-test.eml | 2 | PASS | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| validation-runner.sh | clean-email-test.eml | 0 | PASS | Running Validation Runner on clean-email-test.eml |
| pre-send-email-workflow.sh | clean-email-test.eml | 0 | PASS | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| comprehensive-wholeness-validator.sh | clean-email-test.eml | 1 | PASS | ══════════════════════════════════════════════════ |
| mail-capture-validate.sh | clean-email-test.eml | 0 | PASS | ══════════════════════════════════════════════════ |
| unified-validation-mesh.sh | (project) | 124 | PASS | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| validate_coherence.py | (project) | 0 | PASS | { |
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
- **%/# coverage:** 100% (9/9)
- **R(t) robustness:** 63% (7/11 implemented)
- **DPC(t) = %/# × R(t):** 63
- **%.# velocity:** 21% in 52min = 0.40%/min

