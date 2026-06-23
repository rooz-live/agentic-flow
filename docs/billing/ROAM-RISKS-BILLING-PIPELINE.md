# Billing Pipeline - ROAM Risk Analysis

**Status**: Active  
**Date**: 2026-06-23  
**Context**: Comprehensive risk mapping across the billing sub-domains (Identity → EventOps → Calculation → Invoice)

---

## Risk Matrix

| Risk | State | Owner | Mitigation |
|------|-------|-------|------------|
| **R1**: EventOps Bulk Ingestion Throttle | MITIGATED | Platform | Buffered DLQ scaling and synchronous Postgres bounds |
| **R2**: Calculation Engine Drift vs Rate Engine | OWNED | Billing Core | Idempotent recalculation and schema validation per batch |
| **R3**: Stripe Webhook Replay / Secret Leak | MITIGATED | SecOps | Rust-based HMAC-SHA256 signature verification edge gate |
| **R4**: HostBill Synchronization Silent Drops | ACCEPTED | Billing Core | Batch reconciliations rather than real-time retries |
| **R5**: UUID Collision in Entity Identity | MITIGATED | Data | Time-sequential UUIDv7 enforcing temporal uniqueness |
| **R6**: OroCommerce CRM Synchronization Lag | MITIGATED | B2B Integration | Playwright Live Edge verification and B2B workflow BDD testing |
| **R7**: Project Context Budget Overruns | MITIGATED | Ledger Ops | Real-time threshold locks on Cost & Budget Ledger |
| **R8**: Cross-Boundary Schema Drift | MITIGATED | Architecture | `docs/api/billing.proto` enforcement and strict pipeline typing |

---

## Detailed Analysis

### R1: EventOps Bulk Ingestion Throttle (MITIGATED)
**Scenario**: High velocity data from tech agents crushes Postgres.
**Impact**: Dropped billing telemetry.
**Mitigation**: PyO3 Rust FFI extension `eventops_pyo3` shifts parsing to Rust. In-memory event store acts as a high-speed buffer before PG flush.

### R2: Calculation Engine Drift vs Rate Engine (OWNED)
**Scenario**: Rate Engine updates mid-month. Calculations on old rates conflict with final Invoice generation.
**Owner**: Billing Core Team.
**Plan**: NEXT - Define a pricing dimension "time-locked rate snapshot" at the Job Manifest level.

### R3: Stripe Webhook Replay (MITIGATED)
**Scenario**: Forged payload triggers duplicate invoice crediting.
**Mitigation**: `stripe_gateway.rs` validates standard webhooks strictly via `reqwest` + HMAC-SHA256 before propagation to the EventStore.

### R4: HostBill Synchronization Silent Drops (ACCEPTED)
**Scenario**: HostBill API times out, dropping the emitted invoice.
**Decision**: ACCEPTED with background reconciliation.
**Rationale**: Re-emitting live requires complex circuit breakers. An async daily reconcile script identifies gaps between Cost Ledger and HostBill.

### R5: UUID Collision in Entity Identity (MITIGATED)
**Scenario**: Massive concurrent job creations trigger UUID collisions.
**Mitigation**: Adoption of UUIDv7 instead of UUIDv4 guarantees sequential sortability and collision resistance by temporal epoch.

### R6: OroCommerce CRM Synchronization Lag (MITIGATED)
**Scenario**: Real B2B workflows on `crm.bhopti.com` fail due to state lag between OroCRM and the Billing ledger.
**Owner**: B2B Integration.
**Mitigation**: Maintained live Playwright and Pytest-BDD boundary integration tests that check health and JWT endpoints and fail the build if lag breaks UX.

### R7: Project Context Budget Overruns (MITIGATED)
**Scenario**: Techs continue working after budget cap exceeded.
**Mitigation**: The Cost & Budget ledger calculates burndown against the Project Context and flags the Ceremony Logger to automatically restrict the Job Manifest.

### R8: Cross-Boundary Schema Drift (MITIGATED)
**Scenario**: Tax/Currency expects `uint64` but Invoice Engine sends `float64`.
**Mitigation**: Complete centralization on `docs/api/billing.proto` via `schema-regression.e2e.spec.ts`.

---

## Action Items

| Priority | Action | Owner | Due |
|----------|--------|-------|-----|
| NOW | Formalize time-locked rate snapshot (R2) | Billing Core | Next Cycle |
| NEXT | Deploy HostBill Reconciliation Job (R4) | Billing Core | Next Cycle |
| LATER | Monitor UUIDv7 temporal density (R5) | Data Team | Q3 |
