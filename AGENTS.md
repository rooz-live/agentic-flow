# AGENTS.md — Honest Baseline (2026-05-26, updated wave-5 — 2026-06-19)

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
| 1 | HostBill gateway: reqwest HTTP client, real API calls | 6.5 | 🟡 READY |
| 2 | Stripe webhook end-to-end (edge → Rust → EventStore → Invoice) | 6.0 | 🟡 READY |
| 3 | ns2.tag.ooo on separate IP (full hardware SPOF elimination, R-SPOF-01) | 5.5 | 🔴 BLOCKED: second DNS host |
| 4 | gate_integrity: wire scorecard --verify to CI artifact (.github/workflows) | 5.0 | 🟡 READY |
| 5 | OroCommerce CRM integration: crm.bhopti.com → real B2B workflow | 5.5 | 🟡 READY |

### NEXT
| # | Item | WSJF | Status |
|---|------|------|--------|
| 6 | k6 load at 150% profile (`tests/load/k6_billing.js` staged) | 7.5 | Ready |
| 7 | app_id field in all 19 TLD manifest.json files (PWA app store submission gap) | 5.0 | Ready |
| 8 | docs.bhopti.com / admin.bhopti.com: resolve ${PLACEHOLDER} origins | 4.5 | Design |

### LATER
| # | Item | WSJF | Status |
|---|------|------|--------|
| 9 | MPP DDD bounded context deconstruct (src/billing/* ADRs) | 7.0 | Design |
| 10 | ROAM risk register (billing pipeline full) | 6.0 | Design |

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
