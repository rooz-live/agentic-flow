# AGENTS.md — Honest Baseline (2026-05-25, updated session 2)

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
- **Tests**: 96 pytest pass, 0 fail, 11 skip. 5,056 Playwright tests in 110 files. 22 *-verify.e2e.spec.ts
- **Schema**: `docs/api/billing.proto` (510 LOC, canonical protobuf)
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
- `maturin develop` not run yet — 11 PyO3 tests skip
- `tests/integrations/test_notifiers.py` — needs `telegram` module

## Anti-CVT Rules (MANDATORY for all agents)

1. **No work exists until committed.** Run `git status` before claiming done.
2. **Config must match reality.** If you reference a file in config, it must exist in git.
3. **One domain at a time.** Prove vertically before expanding horizontally.
4. **Test-first literally:** tests/ directory created before src/. Test fails. Then pass.
5. **Never claim coverage without running:** `python3 -m pytest --cov` must produce real numbers.
6. **Pre-task perception:** Run `./scripts/dod-gate.sh --pre-task` BEFORE starting work to see existing capabilities.
7. **Retain, don't delete:** When consolidating, prefer config upgrade over file deletion.
8. **Invert thinking:** Before creating new capability, check if it already exists in the tracked index.

## DoD Gate (ENFORCED — not aspirational)

```bash
# PRE-TASK: Run before starting ANY work (perceive existing capabilities)
./scripts/dod-gate.sh --pre-task

# POST-TASK: Run before ANY commit claim
./scripts/dod-gate.sh --post-task

# FULL: Both gates + DoD checklist
./scripts/dod-gate.sh --full
```

### Minimum viable DoD (must pass before commit):
```bash
python3 -m pytest tests/ --rootdir=tests -q --tb=line --ignore=tests/integrations 2>&1 | grep -E "passed|failed"
npx playwright test --list 2>&1 | grep "Total:"
git diff --cached --stat  # Must show actual staged files
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

### NOW (Highest CoD, Shortest Duration)
| # | Item | WSJF | Status |
|---|------|------|--------|
| 1 | Triage remaining ~1,500 untracked src/ files — commit or .gitignore | 9.5 | In Progress |
| 2 | Run `maturin develop` → unlock 11 PyO3 tests | 8.0 | Ready |
| 3 | Schema regression CI gate (.github/workflows) | 7.5 | Ready |

### NEXT (High CoD, Medium Duration)
| # | Item | WSJF | Status |
|---|------|------|--------|
| 4 | Public FQDN edge deploy — billing.bhopti.com resolves live | 7.2 | Blocked: DNS |
| 5 | HostBill gateway completion (reqwest HTTP client, real API calls) | 6.5 | Ready |
| 6 | Stripe webhook end-to-end (edge → Rust → EventStore → Invoice) | 6.0 | Ready |
| 7 | OroCommerce CRM integration (crm.bhopti.com) | 5.5 | Blocked: DNS |

### LATER (Strategic, Long Duration)
| # | Item | WSJF | Status |
|---|------|------|--------|
| 8 | Immutable Event Store PostgreSQL deploy (append-only) | 5.5 | Design |
| 9 | Performance benchmarks — k6 at 150% scale, p99 targets | 3.0 | Design |
| 10 | Chunked delivery mechanism for multi-domain batch sizing | 3.0 | Design |

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
