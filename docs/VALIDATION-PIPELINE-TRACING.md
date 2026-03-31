# Validation Pipeline Traceability (VDD/DDD/ADR/PRD/TDD)

Mapping of validation scripts to DoR (Definition of Ready), DoD (Definition of Done), and PRD/ADR/TDD layers. Coherence is validated project-wide by [scripts/validate_coherence.py](../scripts/validate_coherence.py).

## Script → DoR / DoD / Layer

| Script | DoR | DoD | PRD/ADR/TDD layer |
|--------|-----|-----|-------------------|
| **validation-core.sh** | File path exists; check name (placeholders/signature/citations/attachments/all) | PASS/FAIL per check; exit 0 all pass, 1 any fail, 2 usage | TDD (pure checks = test-like); DoD = PASS/FAIL per check |
| **validation-runner.sh** | File path; core sourced | Run all 4 core checks; aggregate; VERDICT; exit 0/1/2 | Orchestration DoR/DoD; TDD (runner runs tests) |
| **compare-all-validators.sh** | File list or --latest; validators listed | %/# metrics; CONSOLIDATION-TRUTH-REPORT.md; What works NOW | PRD (requirement: which validators pass/fail, %/#); ADR (decision: single report, one constant) |
| **pre-send-email-gate.sh** | File path; env flags (SKIP_*) | 5 sections; exit 0 approved, 1 blocked, 2 not ready | DoD = 0/1/2 exit, 5 sections |
| **pre-send-email-workflow.sh** | File path; SENT_EMAILS_DIR optional; COMPARE_MODE for compare runs | pass_rate ≥ MIN_WHOLENESS_SCORE; ceremony (ROAM/WSJF) non-blocking; exit 0/1/2 | Ceremony (ROAM/WSJF) + DoD (pass rate) |
| **unified-validation-mesh.sh** | Feature flags; validate personal-only | Feature-flagged checks; state in VALIDATION_STATE_DIR | ADR (mesh pattern); stateful |
| **validate_coherence.py** | Project root; layer globs (PRD/ADR/DDD/TDD) | Exit 0 pass, 1 fail; JSON; structural coherence | DDD/ADR/TDD/PRD coherence oracle |

## Layer definitions (for coherence)

- **PRD:** Product Requirements — feature specs, acceptance criteria (e.g. "report %/#").
- **ADR:** Architecture Decision Records — decisions (e.g. core → runner → compare → report).
- **DDD:** Domain-driven design — aggregates, bounded contexts (e.g. validation domain).
- **TDD:** Test-driven development — validation-core checks as test-like; runner aggregates.

## See also

- [VALIDATION_METRICS_AND_PROGRESS.md](VALIDATION_METRICS_AND_PROGRESS.md) — %/#, %.#, one constant, 4D Progress
- [scripts/CONSOLIDATION-TRUTH-INDEX.md](../scripts/CONSOLIDATION-TRUTH-INDEX.md) — validators audit, how to run
- [docs/adr/](adr/) — ADRs including validation consolidation
