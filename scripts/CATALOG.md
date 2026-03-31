# scripts/ CATALOG
> Updated 2026-02-28 | DPC=60, R(t)=77%, coverage=78% (11/14)
> Source of truth: `reports/CONSOLIDATION-TRUTH-REPORT.md`

## Canonical Validators (source of truth)

### Email Validation Pipeline
| Script | Lines | Status | CLI | Description |
|--------|-------|--------|-----|-------------|
| `validation-core.sh` | 893 | ✅ CANONICAL | `--file <path> --check all --json` | Pure functions, no side effects. Source of truth for checks. |
| `validation-runner.sh` | 197 | ✅ CANONICAL | `<file> [--json]` | Orchestration: sources core, runs 4 checks, PASS/FAIL/BLOCKED verdict. |
| `compare-all-validators.sh` | 429 | ✅ CANONICAL | `[--latest] [--json] [files...]` | Meta-validator. Runs file + project validators, writes CONSOLIDATION-TRUTH-REPORT.md. |
| `pre-send-email-gate.sh` | 297 | ✅ GREEN | `<file>` | 5-section gate with exit 0/1/2. PASS on both truth report emails. |
| `pre-send-email-workflow.sh` | 606 | ✅ GREEN | `<file>` | Full pre-send ceremony with backup creation. |
| `comprehensive-wholeness-validator.sh` | 305 | ✅ GREEN | `<file>` | Master orchestrator: circles, WSJF, PI sync, wholeness. PASS on truth report. |
| `unified-validation-mesh.sh` | 466 | ❌ DIFFERENT API | `{validate\|report} [full\|code-only\|personal-only]` | Project-wide TDD/VDD/DDD/ADR/PRD mesh. Not file-level. |
| `mail-capture-validate.sh` | 701 | ❌ DIFFERENT API | `--source <dir> --dest <dir> [flags]` | Mail.app ↔ Advocacy pipeline integration. Not single-file. |

### Project Coherence
| Script | Lines | Status | CLI | Description |
|--------|-------|--------|-----|-------------|
| `validate_coherence.py` | 2358 | ✅ CANONICAL 757/757 | `--project-root <dir> [--layer ddd\|tdd\|adr\|prd] [--json]` | Full DDD/TDD/ADR/PRD coherence with COH-001 through COH-010. |
| `validate_coherence_fast.py` | 41 | ✅ GREEN | `--project-root <dir>` | Lightweight coherence subset for CI fast path. |
| `governance/check_roam_staleness.py` | 300 | ✅ GREEN | `--project-root <dir>` | ROAM risk staleness detection. |

### CLI Entry Points
| Command | Delegates to | Description |
|---------|-------------|-------------|
| `advocate validate-email <file>` | validation-runner.sh + pre-send-email-gate.sh | Single-email validation |
| `advocate compare-validators [files...]` | compare-all-validators.sh | Multi-validator comparison |
| `validation-core.sh email --file <path> --check all --json` | (self) | Per-check JSON output |

## Categories (by subdirectory)

### (root) — 397 scripts
Primary orchestration, CLI wrappers, and standalone tools.

**ay-* family** (~80 scripts): Advocacy/automation orchestrators. Prefixed `ay-` for the `advocate` CLI.
Key canonical: `ay-validate-email.sh`, `ay-compare-validators.sh`, `ay-roam-staleness-check.sh`, `ay-validate.sh`

**cmd_* family** (~20 scripts): Python command modules for metrics, patterns, WSJF, retros.
Key canonical: `cmd_wsjf.py`, `cmd_prod_cycle.py`, `cmd_retro.py`, `cmd_pattern_stats.py`

**deploy-* family** (~15 scripts): Deployment to various targets (StarlingX, cPanel, Canary, Discord).

**fix_* family** (~10 scripts): One-shot schema/data migration fixers.

### agentic/ — 55 scripts
Agent coordination: alignment checker, health check, ROAM escalation, schema validation, circle orchestration.

### analysis/ — 33 scripts
Decision Transformer validation, pattern metrics, memory leak checks, success criteria.

### circles/ — 15 scripts
Six-circle orchestration (analyst, assessor, innovator, intuitive, orchestrator, seeker).

### monitoring/ — 13 scripts
Integration health checks, Prometheus exporters, alerting.

### governance/ — 10 scripts
ROAM staleness, policy enforcement, DoR/DoD validation.

### integrations/ — 9 scripts
Rust validator bridge, external API integrations.

### infrastructure/ — 8 scripts
Server provisioning, DNS, SSL, networking.

### ci/ — 8 scripts
CI pipeline helpers: dependency check, local validation, pre-merge gates.

### hooks/ — 7 scripts
Claude Flow hooks: pre-task, post-task, session management.

### migration/ — 6 scripts
Pre/post migration validation, schema migration.

### validation/ — 5 scripts
Config parity, payment gateway, SNN, WSJF validation.

### Other subdirectories
`policy/` (5), `ml/` (5), `research/` (3), `patterns/` (3), `lib/` (3), `deployment/` (3), `db/` (3), `canary/` (3), `agentdb/` (3), `utils/` (2), `starlingx/` (2), `orchestration/` (2), `deploy/` (2), `data/` (2), `credentials/` (2), `aisp/` (2), and 20 single-script subdirectories.

## API Normalization Notes
`compare-all-validators.sh` already handles the different CLIs internally:
- `comprehensive-wholeness-validator.sh` → invoked with `--target-file <path>`
- `mail-capture-validate.sh` → invoked with `--file <path>`
- `unified-validation-mesh.sh` → invoked as `validate personal-only` (project-level, not file-level)

These scripts are **not broken** — they serve different purposes (project-wide mesh, Mail.app pipeline). The compare script normalizes their invocation. No wrapper needed.

## Anti-Patterns to Avoid
- **Do not create new validators** without checking this catalog first.
- **Do not add scripts to root** — use appropriate subdirectory.
- **All new validators** must accept `--file <path>` and `--json` flags.
- **Exit codes**: 0 = PASS, 1 = FAIL, 2 = BLOCKED, 3 = usage error.

## DPC_R(t) Metric
```
DPC_R(t) = C(t) × R(t)
  C(t) = pass_count / total_count          # coverage snapshot
  R(t) = implemented_checks / declared_checks  # robustness (anti-fragility)

Current: C = 4/6 email validators GREEN (67%), R ≈ 0.96
         DPC_R(now) = 0.64 email | 1.00 project coherence
```
