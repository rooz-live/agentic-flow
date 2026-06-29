# AGENTS.md — Honest Baseline (2026-05-26, updated wave-9 — 2026-06-29)

## Ground Truth (verified by filesystem + git)

This is a multi-language workspace (TypeScript, Python, Rust) implementing a field-technician billing platform with agentic QE tooling.

### What EXISTS and is COMMITTED to git:
- **Billing domain primitives** (14 Python modules): Entity Identity, Calculation Engine, Ceremony Logger, EventOps, Event Store (memory + PG), Invoice Engine, Job Manifest, Project Context, Schema Validation, Rate Engine, Tax/Currency, Cost Ledger, API Server
- **MPP Layer** (Method Pattern Protocol): mpp_core.py (736 LOC), pattern_catalog.py (693 LOC), mcp_registry.py (773 LOC)
- **Infrastructure**: incremental_compiler.py, bounded_contexts.py, api_controllers.py, api_gateway.py, pipeline_engine.py, test_harness.py, agent_contracts.py, multi_modal.py
- **Rust gateways**: stripe_gateway.rs (HMAC-SHA256 webhook verification), hostbill_gateway.rs (billing emission)
- **Edge config**: src/proxies/edge_gateway.cfg (Caddy: billing.bhopti.com, crm.bhopti.com, api.interface.tag.ooo)
- **DDD domain layer**: domain/validation/ (aggregates, value objects, events), domain/legal/, domain/wsjf/
- **Rust workspace** (6 crates): `cargo check` passes clean. PyO3 eventops_pyo3
- **Tests**: 105 pytest pass (tests/billing/ + tests/pytest/), 0 fail. 5,056 Playwright tests. 23 *-verify.e2e.spec.ts
- **Schema**: `docs/api/billing.proto` (proto_version: 1.1.0, 510 LOC, canonical protobuf)
- **Anti-CVT gate**: `.git/hooks/pre-commit` enforced. `AGENT_SLICE=publication bash code/tooling/scripts/agent_session_dor.sh` must exit 0.
- **Public FQDN**: `billing.bhopti.com` — **blocked: DNS timeout** (exit 1, evidence in `.goalie/evidence/public-edge/`)
- **CI**: `.github/workflows/billing-deploy.yml`, `ci.yml`, `e2e-verify.yml`
- **Tracked totals**: 425 src/ files, 310 tests/ files, 20 domain/ files

### What EXISTS on disk but needs triage (~1,500 remaining untracked):
- Many src/ subdirectories (analytics, orchestration, dashboard, trading UI, etc.)
- These are capabilities at risk of loss. Do NOT delete without reviewing.
- Strategy: Retain via config upgrade, not delete.

### What WORKS (verified commands):
```bash
python3 -m pytest tests/ --rootdir=tests -q --tb=line --ignore=tests/integrations  # 96 pass, 0 fail
npx playwright test --list  # 5,056 tests discoverable
./scripts/dod-gate.sh --pre-task  # Index perception check
cargo check  # exit 0
```

### What DOES NOT work:
- `npm test` / `jest` — many test files reference missing deps
- `maturin develop` — installs via `pip3 install maturin --break-system-packages` then `python3 -m maturin develop --release` in `src/rust/eventops_pyo3/`
- `tests/integrations/test_notifiers.py` — needs `telegram` module
- `billing.bhopti.com` — DNS not yet delegated (curl exit 28, resolve timeout)

## Anti-CVT Rules (MANDATORY for all agents)

1. **No work exists until committed.** Run `git status` before claiming done.
2. **Config must match reality.** If you reference a file in config, it must exist in git.
3. **One domain at a time.** Prove vertically before expanding horizontally.
4. **Test-first literally:** tests/ directory created before src/. Test fails. Then pass.
5. **Never claim coverage without running:** `python3 -m pytest --cov` must produce real numbers.
6. **Pre-task perception:** Run `AGENT_SLICE=publication bash code/tooling/scripts/agent_session_dor.sh` BEFORE starting work. Must exit 0.
7. **Retain, don't delete:** When consolidating, prefer config upgrade over file deletion.
8. **Invert thinking:** Before creating new capability, check if it already exists in the tracked index.
9. **Capability index gate:** `git ls-files tooling/scripts/<capability>` before claiming capability exists. If absent from index, it does not exist.
10. **Public edge proof:** `bash code/tooling/scripts/public_synthetic_check.sh billing.bhopti.com` must exit 0 before any public edge DoD claim. SKIPPED ≠ passing. Exit 1 = blocked, document blocker.

## DoD Gate (ENFORCED — not aspirational)

```bash
# PRE-TASK: Run before starting ANY work (perceive + index gate)
AGENT_SLICE=publication bash code/tooling/scripts/agent_session_dor.sh

# POST-TASK: Run before ANY commit claim
./scripts/dod-gate.sh --post-task

# FULL: Both gates + DoD checklist
./scripts/dod-gate.sh --full
```

### Minimum viable DoD (must ALL pass before commit):
```bash
# 1. Tests green
python3 -m pytest tests/billing/ tests/pytest/ -q --tb=line 2>&1 | grep -E "passed|failed"

# 2. Playwright spec list non-zero
npx playwright test --list 2>&1 | grep "Total:"

# 3. THE gate that breaks the CVT cycle — nothing staged = rejected
git diff --cached --stat | grep -q "."

# 4. Capability in index
git ls-files tooling/scripts/<capability>  # must return a path

# 5. Public edge (or explicit BLOCKED with evidence)
bash code/tooling/scripts/public_synthetic_check.sh billing.bhopti.com
# exit 0 = live. exit 1 = document blocker in .goalie/evidence/public-edge/
```

## Verification Commands
```bash
# Full test suite
python3 -m pytest tests/ --rootdir=tests -q --tb=line --ignore=tests/integrations

# Rust workspace
cargo check

# Git tracking (MPP layer)
git ls-files src/methods/ src/patterns/ src/protocols/ src/gateways/ src/compilers/ src/contexts/ src/controllers/

# Billing primitives
git ls-files src/billing src/identity src/eventops src/ceremony src/calculation src/jobs src/projects src/eventstore src/validation src/rates src/tax

# Untracked audit
git ls-files --others --exclude-standard | grep "^src/" | wc -l
```

## Architecture: Billing Pipeline Flow
```
[ Entity Identity ] --> [ EventOps ] --> [ Calculation Engine ] --> [ Invoice Engine ]
  (UUID resolution)    (Immutable facts)  (Time/Budget aggregation)  (Generate/Issue/Credit)
       |                     |                    |                         |
  [ Rate Engine ]    [ Ceremony Logger ]   [ Cost & Budget Ledger ]  [ Tax & Currency ]
  (Pricing matrices)  (Standup/Review/Retro) (Budget tracking)       (Jurisdiction rules)
       |                     |                    |
  [ Job Manifest ]   [ Project Context ]   [ Schema Validation ]
  (Task/sign-off)    (Budget/constraints)   (Contract enforcement)
```

## Key Files
- `docs/api/billing.proto` — Canonical schema (source of truth)
- `docs/billing/CONSOLIDATION_INVENTORY.md` — Domain status tracker
- `src/rust/eventops_pyo3/src/lib.rs` — Rust FFI for billing ops
- `src/rust_bridge.py` — Python-Rust bridge (numpy guard, lazy import)
- `tests/pytest/conftest_billing.py` — 8 shared fixtures
- `playwright.config.ts` — E2E test runner config

## WSJF Priority (Next Actions — Long Horizon Swarm)

### DONE (Wave 4 — committed a06dcdd7)
| # | Item | WSJF | Status |
|---|------|------|--------|
| G1 | Pre-commit hook installed (CVT termination) | 9.9 | ✅ DONE |
| G2 | `tooling/scripts/agent_session_dor.sh` canonical | 9.8 | ✅ DONE |
| G3 | `tooling/scripts/public_synthetic_check.sh` canonical | 9.7 | ✅ DONE |
| G4 | Surgical index: 26 scripts + tests/billing + deploy/k8s committed | 9.5 | ✅ DONE |
| G5 | `tests/billing/` 93 pass + committed | 9.3 | ✅ DONE |
| G6 | `config/fqdn_registry.yaml` + `FQDN_CANONICAL.md` committed | 9.0 | ✅ DONE |
| G7 | `tests/schema-regression.e2e.spec.ts` (proto v1.1.0 gate) | 7.0 | ✅ DONE |
| G8 | `tests/e2e/public-edge-verify.e2e.spec.ts` (flag-gated) | 9.0 | ✅ DONE |
| G9 | `tests/integration/hostbill-stripe-boundary.e2e.spec.ts` | 8.8 | ✅ DONE |

### DONE (Wave 5 — committed f79c2eee4, 2026-06-19)
Scorecard: **SHIP** | impact_net=6.0 | tail_penalty=1.0 | 244 AQE cycles/hour capacity
Gate overhead per cycle: DoR=1.7s + scorecard=0.3s + pytest(147)=12.8s = **14.7s total**

| # | Item | WSJF | Status |
|---|------|------|--------|
| W5-1 | `eventops-grpc.service` deployed — api.interface.tag.ooo gRPC HTTP 200 | 9.5 | ✅ R-EVENTOPS-01: Resolved |
| W5-2 | OroCommerce KVM live: crm/shop.bhopti.com HTTP 200 | 7.5 | ✅ R-OROCRM-01: Resolved |
| W5-3 | `deploy-uapi`: 21/21 TLD files deployed via WHM UAPI | 7.0 | ✅ DONE |
| W5-4 | ns2.tag.ooo NS record added (zone-corruption SPOF mitigated) | 8.5 | ✅ R-SPOF-01: Mitigated |
| W5-5 | billing/crm/shop/mailadmin: `pending → delegated` in fqdn_registry.yaml | 8.0 | ✅ DONE |
| W5-6 | tld-deploy-gate.spec.ts: +4 billing infra probes, gRPC 502-as-invariant test | 7.5 | ✅ DONE |
| W5-7 | BaseBillingE2ESpec: `FQDN_MIGRATION_STATUS` TypeScript record type | 7.0 | ✅ DONE |
| W5-8 | one.sh: `dod-gate` + `scorecard` subcommands (monolith deconstruct) | 6.5 | ✅ DONE |
| W5-9 | coherence_results.json artifact: derives coherence from real signals (not self-asserted) | 9.0 | ✅ self-assertion bypass: Mitigated |
| W5-10 | public-edge-verify: @blocked-evidence → @eventops-gate (asserts HTTP 200) | 9.0 | ✅ DONE |

### NOW (Highest CoD — active blockers)
| # | Item | WSJF | Status |
|---|------|------|--------|
| 1 | HostBill gateway: reqwest HTTP client, real API calls | 6.5 | ✅ DONE |
| 2 | Stripe webhook end-to-end (edge → Rust → EventStore → Invoice) | 6.0 | ✅ DONE |
| 3 | ns2.tag.ooo on separate IP (full hardware SPOF elimination, R-SPOF-01) | 5.5 | 🔴 BLOCKED: second DNS host |
| 4 | gate_integrity: wire scorecard --verify to CI artifact (.github/workflows) | 5.0 | ✅ DONE |
| 5 | OroCommerce CRM integration: crm.bhopti.com → real B2B workflow | 5.5 | ✅ DONE |

### DONE (Wave 6 — upstream engine expansion, 2026-06-26)
| # | Item | WSJF | Status |
|---|------|------|--------|
| U1 | `upstream_fetcher.py` — parallel `ThreadPoolExecutor` ls-remote, per-repo `timeout_s`, registry schema validation | 8.5 | ✅ DONE |
| U2 | `upstream_runner.py` — per-repo `run_timeout_s` + `retry`, DoR cmd check, log truncation, parallel execution | 8.3 | ✅ DONE |
| U3 | `upstream_reporter.py` — DLQ JSONL write, ROAM trigger via `dlq_roam_apply.py`, `--json` stdout, lane annotation | 8.1 | ✅ DONE |
| U4 | `upstream_upgrade_engine.py` — coherence gate binding, DoD artefact, `--parallel`, `--json`, `--no-coherence` | 8.4 | ✅ DONE |
| U5 | `upstream_registry.json` — `timeout_s`, `run_timeout_s`, `retry`, `roam_risk_id`, `notify_on_fail`, `dor_cmd` per repo | 7.8 | ✅ DONE |
| U6 | `tests/gates/test_upstream_engine.sh` — 15 tests (F1, R1–R5, P1–P4, E1–E5), all green | 8.0 | ✅ DONE |
| U7 | `one.sh upstream` subcommand — delegates to engine; monolith guard updated (< 200 lines) | 7.5 | ✅ DONE |
| U8 | ci circles (assess/orchestrate/swarm) verified wired in `scripts/ci/`, short-circuit on failure | 9.0 | ✅ DONE |

### DONE (Wave 7 — edge sync + local upgrader hardening, 2026-06-19)
| # | Item | WSJF | Status |
|---|------|------|--------|
| U9  | `edge_gateway_sync_engine.py` wired into `one.sh` as `edge-sync` subcommand | 8.5 | ✅ DONE |
| U10 | `edge_runner.py` — per-FQDN timeout, retry, HTTP health probe, DLQ write, ROAM passthrough | 8.0 | ✅ DONE |
| U11 | `edge_reporter.py` — `--json`, `last_edge_sync.json` symlink, ROAM signal file | 7.8 | ✅ DONE |
| U12 | `edge_gateway_sync_engine.py` — coherence gate, DoD artefact, `--json` flag | 8.0 | ✅ DONE |
| U13 | `tests/gates/test_edge_gateway_sync.sh` — 13 TDD tests (F1–F3, R1–R5, P1–P3, E1–E2), all green | 7.8 | ✅ DONE |
| U14 | `local_upgrader.py` — configurable timeout, `--json`, DoD artefact, sandbox TTL | 7.5 | ✅ DONE |
| U15 | `upstream_upgrade_engine.py` — pass `json_output` to local sweep | 7.2 | ✅ DONE |
| U16 | `tests/gates/test_local_upgrader.sh` — 10 TDD tests (S1–S10), all green | 7.2 | ✅ DONE |
| U17 | ROAM R-EDGE-01 + R-LOCAL-01 resolved | 7.0 | ✅ DONE |

### DONE (Wave 8 — harness-type detection + registry expansion, 2026-06-22)
Scorecard: **SHIP** | 292/292 pytest pass | 20/20 upstream engine TDD pass | harness families: cargo/pytest/npm/playwright/shell/python/unknown
New relationship: `harness_type` field in every runner result — enables grouping, dashboards, and DoR routing by language ecosystem.

| # | Item | WSJF | Status |
|---|------|------|--------|
| W8-1 | `upstream_runner.py` — `detect_harness()` classifies 7 families from cmd regex + manifest fallback | 8.5 | ✅ DONE |
| W8-2 | `harness_type` in every `run_one_repo()` + `_result()` + skip-list result dict | 8.3 | ✅ DONE |
| W8-3 | `upstream_registry.json` expanded: 5→13 repos (gemma-pytorch, gemma4-benchmarks, needle-in-a-haystack, opencompass, needle-tools, google-deepmind-gemma, adk-python, cactus-needle) | 7.8 | ✅ DONE |
| W8-4 | `harness_hint` field added to all 13 registry entries (self-documents expected harness) | 7.5 | ✅ DONE |
| W8-5 | `tests/gates/test_upstream_engine.sh` expanded: 15→20 tests (R6–R12 harness, G1–G3 registry) | 8.0 | ✅ DONE |
| W8-6 | Scorecard gate already hardened (sign_off strict bool, pytest.approx) — 38/38 pass confirmed | 7.0 | ✅ CONFIRMED |

### DONE (Wave 9 — anti-CVT theater + F9 hire JSONL + ceremony cadence, 2026-06-29)
Scorecard: **SHIP** | 399 pytest collected | 4/4 F9 hire JSONL green | 3/3 intel pipeline contract green
Key: redblue/weight-eft confirmed not-on-npm; agenticow→agentic-flow corrected; ceremony cadence defined.

| # | Item | WSJF | Status |
|---|------|------|--------|
| W9-1 | `run_all.sh`: drop bare `\|\| true` on provenance/edge-sync/deploy-receipt; named-skip pattern with captured exit + warn | 8.8 | ✅ DONE |
| W9-2 | `test_intel_pipeline_contract.sh`: T2 proves enforce=1+no-receipt→exit 1 (path NOT dead weight); T3 default-safe | 8.5 | ✅ DONE |
| W9-3 | `test_redblue_mock_judge.sh`: @metaharness/redblue not-on-npm → degraded=true probe; ROAM R-REDBLUE-01 documented | 8.3 | ✅ DONE |
| W9-4 | `portfolio.yaml`: agenticow.npm corrected agenticow→agentic-flow; redblue+weight-eft channel→optional+degraded_ok:true | 8.0 | ✅ DONE |
| W9-5 | `TestF9HireJSONLEndToEnd` (4 tests): verify→sync two-step, ≥2 JSONL receipts all 200, empty-email chain integrity | 8.5 | ✅ DONE |
| W9-6 | `docs/DEFINITIONS.md` §7: Agile Ceremony Cadence with 8-ceremony matrix, anti-CVT rules, PI Planning artifact table | 7.5 | ✅ DONE |

### NEXT
| # | Item | WSJF | Status |
|---|------|------|--------|
| 6 | k6 load at 150% profile (`tests/load/k6_billing.js` staged) | 7.5 | ✅ DONE |
| 7 | app_id field in all 19 TLD manifest.json files (PWA app store submission gap) | 5.0 | ✅ DONE |
| 8 | docs.bhopti.com / admin.bhopti.com: resolve ${PLACEHOLDER} origins | 4.5 | ✅ DONE |

### LATER
| # | Item | WSJF | Status |
|---|------|------|--------|
| 9 | MPP DDD bounded context deconstruct (src/billing/* ADRs) | 7.0 | ✅ DONE |
| 10 | ROAM risk register (billing pipeline full) | 6.0 | ✅ DONE |

## MPP Layer Reference (Method Pattern Protocol)
```
src/methods/mpp_core.py        — Method contracts, execution, validation (736 LOC)
src/patterns/pattern_catalog.py — Pattern library, code generation (693 LOC)
src/protocols/mcp_registry.py  — Protocol registry, semantic matching (773 LOC)
src/compilers/incremental_compiler.py — Incremental build system (737 LOC)
src/contexts/bounded_contexts.py — DDD context boundaries (667 LOC)
src/controllers/api_controllers.py — HTTP routing, request handling (683 LOC)
src/gateways/api_gateway.py    — Load balancing, circuit breakers (779 LOC)
src/gateways/stripe_gateway.rs — Cryptographic webhook validation (65 LOC)
src/gateways/hostbill_gateway.rs — HostBill billing emission (29 LOC, stub)
src/harnesses/test_harness.py  — Quality gates, test execution (915 LOC)
src/models/agent_contracts.py  — Multi-agent coordination (831 LOC)
src/pipelines/pipeline_engine.py — CI/CD pipeline orchestration (953 LOC)
src/embeddings/multi_modal.py  — Code/log/metric embeddings (468 LOC)
src/proxies/edge_gateway.cfg   — Caddy reverse proxy (63 LOC)
```

## Bounded Quality & Maturity Definitions

### Bounded Quality Gates (DoN, DoR, DoD)
- **DoN (Definition of Now)**: Dictates what must be worked on *right now* to maximize ROI and minimize Cost of Delay (CoD). Configured under `wsjf_now_items` in `config/cicd/loop_prompts.yaml`. Prioritizes critical-path blockers/SPOFs, LNNNL queue head-of-lane items, and ROAM tail-risks over general features.
- **DoR (Definition of Readiness)**: Entry criteria before task execution: workspace clean state verified by `agent_session_dor.sh` (exits 0), cryptographically verified signer keys present, and local test harnesses (Cargo, pytest, Playwright) fully functional.
- **DoD (Definition of Done)**: Exit criteria for shippable changes: post-task gate validation `dod-gate.sh --post-task` (exits 0), 100% green test suites, signed gate scorecard (`current.json`), all modifications committed (no untracked environment pollution), and public edge health check pass.

### Product Maturity & Edge Flow Contexts
- **TLD Cypher / Registry**: Canonical FQDN inventory map (`config/fqdn_registry.yaml`) cataloged by `gate_tier` taxonomy (`smoke`, `billing`, `apex`) with a drift detector (`tld_registry_drift.py`) validating spec-to-registry coherence.
- **iOS/Android Prod Maturity**: Web-redirect store presence Capacitor shell (`apps/summerjobswap/`) with web funnel checks. Native binary is marked as *not shippable* (lack of native signing, Detox, fastlane, Firebase setup) and managed under the accepted risk register (`R-MOBILE-01`).
- **Earnings Web Flow**: End-to-end ledger and sync process (`earnings_ledger.jsonl`, `earnings_latest.json`) translating agent scorecard performance into verified earnings using a shared JSON-RPC MCP envelope synced via `sync_earnings_to_hire.py`.

### Earnings Per Circle Metrics (EPA, EPE, EPEng, EPI)
- **Agent: Earning's Per Agent (EPA)**: Focuses on execution execution concurrency. Disciplined by `decentralized_lock.py` leveraging OS-level atomic `flock` locks to allow parallel workers to execute upgrades concurrently without collisions.
- **Engine: Earning's Per Engine (EPE)**: Focuses on execution throughput and environment hygiene. Disciplined by running validations in transient sandbox directories (`scratch/sandbox/`) with package-lock/Cargo.lock hash matching.
- **Engineer: Earning's Per Engineer (EPEng)**: Focuses on Cost of Delay / WSJF prioritization and automated build evidence. Disciplined by integrating scorecards directly into CI/CD pipelines to output cryptographically verified build receipts.
- **Ingenuity: Earning's Per Ingenuity (EPI)**: Focuses on originality yield. Disciplined by scoring rubric gating where `Originality = Improbability x Resonance x NewRelationship` under the strict constraint of `Coherence == PASS`.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **agentic-flow** (428554 symbols, 687884 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/agentic-flow/context` | Codebase overview, check index freshness |
| `gitnexus://repo/agentic-flow/clusters` | All functional areas |
| `gitnexus://repo/agentic-flow/processes` | All execution flows |
| `gitnexus://repo/agentic-flow/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
