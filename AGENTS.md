# AGENTS.md — Honest Baseline (2026-05-25)

## Ground Truth (verified by filesystem + git)

This is a multi-language workspace (TypeScript, Python, Rust) implementing a field-technician billing platform with agentic QE tooling.

### What EXISTS and is COMMITTED to git:
- **Billing domain primitives** (9 Python modules, 4,141 LOC): Entity Identity, Calculation Engine, Ceremony Logger, EventOps, Event Store (memory + PG), Invoice Engine, Job Manifest, Project Context, Schema Validation
- **Rust workspace** (6 crates): `cargo check` passes clean. PyO3 eventops_pyo3, rust_core, ffi, tui, neural-trader, agentic-flow-quic
- **Tests**: 59 billing pytest pass, 11 skip (PyO3 needs `maturin develop`). 20+ verify E2E specs discoverable by Playwright
- **Schema**: `docs/api/billing.proto` (510 LOC, canonical protobuf)
- **CI**: `.github/workflows/billing-deploy.yml`
- **~675 total files tracked in git** (src + tests)

### What EXISTS on disk but is NOT committed (~1,950 files):
- Many src/ subdirectories (analytics, orchestration, dashboard, trading UI, etc.)
- Many test files and docs
- These are capabilities at risk of loss. Do NOT delete without reviewing.

### What WORKS (verified commands):
```bash
python3 -m pytest tests/billing/ tests/pytest/ -v  # 59 pass, 11 skip
cargo check                                         # exit 0 (warnings only)
```

### What DOES NOT work:
- `npm test` / `jest` — many test files reference missing deps (jsonschema, etc.)
- `maturin develop` not run yet — PyO3 tests skip
- Full `pytest tests/` — 12 collection errors from unrelated test files with missing deps

## Anti-CVT Rules (MANDATORY for all agents)

1. **No work exists until committed.** Run `git status` before claiming done.
2. **Config must match reality.** If you reference a file in config, it must exist in git.
3. **One domain at a time.** Prove vertically before expanding horizontally.
4. **Test-first literally:** tests/ directory created before src/. Test fails. Then pass.
5. **Never claim coverage without running:** `python3 -m pytest --cov` must produce real numbers.

## Verification Commands (DoD gate)
```bash
# Billing domain (Python)
python3 -m pytest tests/billing/ tests/pytest/ -v --tb=short

# Rust workspace
cargo check

# Git tracking
git ls-files src/billing src/identity src/eventops src/ceremony src/calculation src/jobs src/projects src/eventstore src/validation

# Untracked audit
git status --short | grep "^?" | wc -l
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

## WSJF Priority (Next Actions)
| # | Item | WSJF | Status |
|---|------|------|--------|
| 1 | Run `maturin develop` to unlock 11 skipped PyO3 tests | 9.5 | Ready |
| 2 | Audit remaining ~1,950 untracked files for commit candidates | 9.0 | Ready |
| 3 | Fix 12 pytest collection errors (missing deps) | 8.5 | Ready |
| 4 | Public FQDN edge VERIFY (LIVE_EDGE_TEST flag-gated) | 8.0 | Blocked on infra |
| 5 | HostBill/Oro/Stripe FQDN wiring | 7.5 | Blocked on DNS |
