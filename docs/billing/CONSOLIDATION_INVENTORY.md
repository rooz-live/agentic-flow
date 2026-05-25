# Billing Domain Consolidation Inventory
**Rule: Do not create registry file #2 — extend this file**
*Last updated: 2026-05-25 (green-room audit) | Replaces: phase3-comprehensive-review.md (superseded)*

---

## Spec Catalog: 35 files × 11,930 lines

### Billing Domains (9 core)

| Domain | TDD File | Lines | VERIFY File | Lines | Overlap% | Canonical? |
|--------|----------|-------|-------------|-------|----------|------------|
| entity-identity | ✅ tdd (295L) | 295 | ✅ verify (257L) | 257 | ~65% | ✅ Both |
| rate-engine | ✅ tdd (331L) | 331 | ✅ verify | — | ~55% | ✅ Both |
| ceremony-logger | ✅ tdd (136L) | 136 | ✅ verify (104L) | 104 | ~60% | ✅ Both |
| job-manifest | ✅ tdd (146L) | 146 | ✅ verify | — | ~50% | ✅ Both |
| cost-ledger | ✅ tdd (136L) | 136 | ✅ verify (69L) | 69 | ~55% | ✅ Both |
| project-context | ✅ tdd (142L) | 142 | ✅ verify (42L) | 42 | ~50% | ✅ Both |
| tax-currency | ✅ tdd (133L) | 133 | ✅ verify | — | ~50% | ✅ Both |
| calculation-engine | ✅ tdd (238L) | 238 | ✅ verify | — | ~50% | ✅ Both |
| eventops | ✅ tdd (187L) | 187 | ✅ verify | — | ~55% | ✅ Both |
| **invoice-engine** | ❌ TDD N/A | — | 🔴 MISSING | — | — | **Phase 3 NOW** |

**All 9 legacy billing domains: VERIFY gap closed. Invoice Engine (domain 10): NEW — create now.**

### Infrastructure Domains (11 non-billing, pre-existing)

| Domain | TDD File | Lines | VERIFY File | Lines | Status |
|--------|----------|-------|-------------|-------|--------|
| compilers | ✅ (499L) | 499 | ✅ (273L) | 273 | Pre-existing |
| config-domain | ✅ (476L) | 476 | ✅ (310L) | 310 | Pre-existing |
| contexts | ✅ (507L) | 507 | ✅ (300L) | 300 | Pre-existing |
| controllers | ✅ (562L) | 562 | ✅ (329L) | 329 | Pre-existing |
| gateways | ✅ (619L) | 619 | ✅ (345L) | 345 | Pre-existing |
| harnesses | ✅ (581L) | 581 | ✅ (405L) | 405 | Pre-existing |
| methods-mpp | ✅ (481L) | 481 | ✅ (293L) | 293 | Pre-existing |
| models | ✅ (569L) | 569 | ✅ (438L) | 438 | Pre-existing |
| patterns | ✅ (484L) | 484 | ✅ (384L) | 384 | Pre-existing |
| pipelines | ✅ (545L) | 545 | ✅ (414L) | 414 | Pre-existing |
| protocols | ✅ (556L) | 556 | ✅ (344L) | 344 | Pre-existing |

---

## Duplicate Pattern Analysis

### Shared Boilerplate (>50% in all TDD specs)

Every TDD spec repeats identical code at lines 1-24:
```typescript
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = join(__dirname, '..');

function readFile(path: string): string {
  return readFileSync(join(PROJECT_ROOT, path), 'utf-8');
}
function fileExists(path: string): boolean {
  return existsSync(join(PROJECT_ROOT, path));
}
```
- **25 files × ~24 lines = 600 lines of pure duplication**
- **Fix:** `BaseBillingE2ESpec.ts` harness extracts this once

### Schema Definitions (4 sources, no canonical)

| Schema | Location | Format | Generator? |
|--------|----------|--------|-----------|
| 9 domain schemas | `src/validation/schema_engine.py:DOMAIN_SCHEMAS` | Python dict | No |
| 5 Rust structs | `src/rust/eventops_pyo3/src/lib.rs` | Rust struct | No |
| Types | `src/vector/core/types.ts` | TypeScript interface | No |
| Protobuf | `/docs/api/billing.proto` | **MISSING** | — |

**Fix:** Create `/docs/api/billing.proto` as canonical → generate all others

### "Unified" Integration Tests (3 candidates)

| File | Lines | Status | Winner? |
|------|-------|--------|---------|
| `tests/billing-platform-integration.e2e.spec.ts` | 488 | Created this session | ✅ CANONICAL |
| `tests/rust-python-integration.e2e.spec.ts` | ~200 | Rust-specific | Keep (different scope) |
| `tests/integration/` (dir) | 22 items | Mixed scope | Review separately |

---

## Convergence Table (should share via harness)

| Pattern | TDD billing specs | TDD infra specs | Fix |
|---------|------------------|-----------------|-----|
| `readFile`/`fileExists` helpers | 9/9 | 11/11 | Extract to `BaseBillingE2ESpec` |
| `PROJECT_ROOT = join(__dirname, '..')` | 9/9 | 11/11 | Extract to harness |
| `import { test, expect }` | 9/9 | 11/11 | Extract to harness |
| Error code assertions `ERR_*` | 9/9 | 5/11 | Shared error constants |
| `test.describe('RED:' / 'GREEN:')` | 9/9 | 8/11 | Shared phase labels |

## Anti-Fragile Divergence Table (keep separate intentionally)

| Spec | Reason to Keep Separate |
|------|------------------------|
| `rate-engine-tdd.e2e.spec.ts` | Pre-implementation contract (history) |
| `entity-identity-tdd.e2e.spec.ts` | Pre-implementation contract (history) |
| `rust-python-integration.e2e.spec.ts` | Rust-specific, different runtime |
| `harnesses-tdd.e2e.spec.ts` | Tests the test framework itself |
| Infrastructure domain specs (11) | Different bounded context, different owners |

---

## Archive Plan

### Archive (move, don't delete — anti-fragile)
Move 9 billing TDD specs to `tests/archive/` with retention headers:
- `calculation-engine-tdd.e2e.spec.ts`
- `ceremony-logger-tdd.e2e.spec.ts`
- `cost-ledger-tdd.e2e.spec.ts`
- `entity-identity-tdd.e2e.spec.ts`
- `eventops-tdd.e2e.spec.ts`
- `job-manifest-tdd.e2e.spec.ts`
- `project-context-tdd.e2e.spec.ts`
- `rate-engine-tdd.e2e.spec.ts`
- `tax-currency-tdd.e2e.spec.ts`

### Retain Active
- All 15 VERIFY specs (active contracts)
- `billing-platform-integration.e2e.spec.ts` (canonical integration)
- `rust-python-integration.e2e.spec.ts` (different scope)
- All 11 infrastructure TDD/VERIFY pairs (pre-existing, different owner)

---

## Canonical Sources (Post-Consolidation)

| Artifact | Canonical Path | Status |
|----------|---------------|--------|
| Domain schemas | `/docs/api/billing.proto` | 🔴 MISSING → Create |
| E2E harness | `tests/harness/BaseBillingE2ESpec.ts` | 🔴 MISSING → Create |
| Integration test | `tests/billing-platform-integration.e2e.spec.ts` | ✅ EXISTS |
| Python schemas | `src/validation/schema_engine.py` | ✅ EXISTS (update to import proto) |
| Rust structs | `src/rust/eventops_pyo3/src/lib.rs` | ✅ EXISTS (update to import proto) |
| Event store | `src/eventstore/event_store.py` | ✅ EXISTS (needs PG backend) |
| WSJF tracker | `src/robust_wsjf_framework.py` | ✅ EXISTS |

---

## WSJF: Remaining Actions (updated 2026-05-25 Phase 4)

### Wave 3 — Completed ✅
| Action | COD | Job Size | WSJF | Status |
|--------|-----|----------|------|--------|
| Create billing.proto | HIGH | Small | 8.00 | ✅ DONE |
| Create BaseBillingE2ESpec.ts | MEDIUM | Small | 6.00 | ✅ DONE |
| Archive 9 TDD billing specs | LOW | XSmall | 5.00 | ✅ DONE |
| Create 5 missing VERIFY specs | MEDIUM | Medium | 5.50 | ✅ DONE |
| PostgreSQL EventStore backend | HIGH | Medium | 6.25 | ✅ DONE |
| Fix Rust compilation (PyO3 0.22) | HIGH | Small | 8.33 | ✅ DONE |
| Invoice Engine domain (domain 10) | CRITICAL | Medium | 9.50 | ✅ DONE |
| Merge chunked-delivery → harness | HIGH | XSmall | 8.50 | ✅ DONE |
| pytest billing marker + conftest | HIGH | Small | 8.00 | ✅ DONE |
| validate_ceremony_logger in Rust | HIGH | Small | 7.50 | ✅ DONE (existed) |
| chunk_domain_payloads in Rust | HIGH | Small | 7.50 | ✅ DONE (existed) |

### Wave 4 — Active (Phase 4)
| Action | COD | Job Size | WSJF | Phase | Status |
|--------|-----|----------|------|-------|--------|
| Regression + DoD gate run | CRITICAL | XSmall | 9.80 | NOW | 🟡 IN PROGRESS |
| Stale inventory fix | HIGH | XSmall | 9.50 | NOW | ✅ DONE |
| Schema regression spec | HIGH | Small | 7.00 | NEAR | 🔴 TODO |
| Public edge FQDN VERIFY spec | CRITICAL | Medium | 9.00 | NEAR | 🔴 TODO |
| HostBill/Oro/Stripe FQDN config | CRITICAL | Medium | 8.80 | NEAR | 🔴 TODO |
| CI/CD via .gitlab-ci.yml | HIGH | Medium | 8.50 | NEAR | 🔴 TODO |
| Stripe live boundary test | HIGH | Small | 6.80 | NEAR | 🔴 TODO |
| k6 load test at 150% | HIGH | Medium | 7.50 | LATER | 🔴 TODO |
| MPP DDD bounded context deconstruct | MEDIUM | Large | 7.00 | LATER | 🔴 TODO |
| ROAM risk register (billing) | MEDIUM | Small | 6.00 | LATER | 🔴 TODO |

---

## Green-Room Audit: Cross-Session CVT Fragment Map (2026-05-25)

### Previously Unindexed "Unified" Artifacts

| File | Session | Unique Capability | Action |
|------|---------|-----------------|--------|
| `tests/e2e/chunked-delivery.config.ts` | Prior | FQDN registry, batch sizing (MAX=3) | ✅ Merge into harness |
| `tests/e2e/billing-verify.e2e.spec.ts` | Prior | Edge HTTPS + Stripe webhook boundary | ✅ Archive after merge |
| `tests/pytest/test_eventops_pyo3.py` | Prior | 7 domain smoke tests (ceremony, chunk) | ✅ Extend (missing Rust fns) |
| `src/rust_bridge.py` | Prior | ctypes FFI → `libagentic_flow_core` | ✅ Keep (different scope) |
| `scripts/agentic/unified_interface.py` | Earlier | CLI unified interface | ⚠️ Out of billing scope |
| `src/cli/unified_af_cli.py` | Earlier | Agentic flow CLI | ⚠️ Out of billing scope |
| `agentic-flow-corrupted/` | Stale | Corrupted env snapshot | 🚫 Do not extract |
| `risk-analytics.bak/` | Stale | Risk analytics backup | 🚫 Do not extract |

### Rust Bridge Scope Separation (anti-compatible, keep distinct)

| Bridge | File | ABI | Scope | Overlap? |
|--------|------|-----|-------|---------|
| **PyO3 billing bridge** | `src/rust/eventops_pyo3/src/lib.rs` | PyO3 0.22 + ABI3 | Domain validation, geo, UUID v7, tax, billing math | None |
| **ctypes core bridge** | `src/rust_bridge.py` | ctypes → `libagentic_flow_core` | Cosine similarity, neural ops, vector math | None |

**Rule: Do NOT merge these two bridges.** They serve orthogonal domains.

### Missing Rust Functions (pytest references functions not yet in lib.rs)

`tests/pytest/test_eventops_pyo3.py` calls two functions not yet exported:

| Function | Required by | Status |
|----------|------------|--------|
| `validate_ceremony_logger(payload)` | `test_validate_ceremony_logger` | 🔴 Implement |
| `chunk_domain_payloads(payload, size)` | `test_chunk_domain_payloads` | 🔴 Implement |

Note: `CeremonyLogFact` struct already defined in `lib.rs:74-85` — only the `#[pyfunction]` wrapper is missing.

---

## Canonical Sources (Post Green-Room, 2026-05-25)

| Artifact | Canonical Path | Status |
|----------|---------------|--------|
| Domain schemas (proto) | `docs/api/billing.proto` | ✅ EXISTS — 9 domains + Invoice pending |
| E2E harness | `tests/harness/BaseBillingE2ESpec.ts` | ✅ EXISTS — merge FQDN pending |
| Integration test | `tests/billing-platform-integration.e2e.spec.ts` | ✅ EXISTS |
| 9 billing VERIFY specs | `tests/*-verify.e2e.spec.ts` | ✅ ALL 9 EXIST |
| Invoice Engine VERIFY | `tests/invoice-engine-verify.e2e.spec.ts` | 🔴 MISSING |
| Python schemas | `src/validation/schema_engine.py` | ✅ EXISTS |
| Invoice domain impl | `src/billing/invoice_engine.py` | 🔴 MISSING |
| Rust bridge (PyO3) | `src/rust/eventops_pyo3/src/lib.rs` | ✅ EXISTS — 2 fns missing |
| Rust bridge (ctypes) | `src/rust_bridge.py` | ✅ EXISTS — different scope |
| Event store (memory) | `src/eventstore/event_store.py` | ✅ EXISTS |
| Event store (postgres) | `src/eventstore/event_store_pg.py` | ✅ EXISTS |
| WSJF tracker | `src/robust_wsjf_framework.py` | ✅ EXISTS |
| pytest conftest billing | `tests/pytest/conftest_billing.py` | 🔴 MISSING |
| FQDN registry | `tests/e2e/chunked-delivery.config.ts` | ✅ EXISTS — merge pending |
| Archived TDD specs (9) | `tests/archive/2026-05-25-*-tdd.e2e.spec.ts` | ✅ ALL 9 ARCHIVED |

---

## DoR / DoD Gate Status

### Definition of Ready (before next sprint story)
- [x] `docs/api/billing.proto` locked (9 domains, 30+ messages)
- [x] `docs/billing/CONSOLIDATION_INVENTORY.md` current
- [x] WSJF scores approved (Invoice Engine: 9.5)
- [x] Invoice domain added to `billing.proto` (domain 10, messages + RPCs)
- [x] `billing` pytest marker registered in `tests/pytest.ini`

### Definition of Done (this wave)
- [x] All 9 billing domains have Playwright VERIFY spec
- [x] Rust bridge compiles (PyO3 0.22, Python 3.14 ABI3)
- [x] PostgreSQL append-only event store implemented
- [x] 9 billing TDD specs archived with retention headers
- [x] Invoice engine implemented (`src/billing/invoice_engine.py`)
- [x] Invoice VERIFY spec created (`tests/invoice-engine-verify.e2e.spec.ts`)
- [x] Invoice domain added to `docs/api/billing.proto` (domain 10)
- [x] Harness contains FQDN + chunked-delivery capability (merged from chunked-delivery.config.ts)
- [x] `edgeHelpers` assertEdgeFQDN + assertStripeWebhookBoundary in harness
- [x] `billing-verify.e2e.spec.ts` archived with retention header
- [x] `chunked-delivery.config.ts` → thin re-export shim (single source of truth)
- [x] pytest `billing` marker registered in `tests/pytest.ini`
- [x] `tests/pytest/conftest_billing.py` fixtures created (5 fixtures)
- [x] 5 `@pytest.mark.billing` smoke tests added to `test_eventops_pyo3.py`
- [x] `validate_ceremony_logger` + `chunk_domain_payloads` confirmed in Rust bridge (existed + registered)
- [x] Zero new "unified_*" files created this wave
- [x] `CONSOLIDATION_INVENTORY.md` updated with all wave artifacts

### New Artifacts Created This Wave
| Artifact | Path | Status |
|----------|------|--------|
| Invoice Engine | `src/billing/invoice_engine.py` | ✅ |
| Invoice VERIFY spec | `tests/invoice-engine-verify.e2e.spec.ts` | ✅ |
| pytest conftest | `tests/pytest/conftest_billing.py` | ✅ |
| Archived fragment | `tests/archive/2026-05-25-billing-verify.e2e.spec.ts` | ✅ |
