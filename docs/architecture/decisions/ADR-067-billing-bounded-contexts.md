---
date: 2026-06-23
status: accepted
related_tests: tests/invoice-engine-verify.e2e.spec.ts
---

# ADR-067: Billing Pipeline Bounded Contexts

**Status:** Accepted  
**Date:** 2026-06-23  
**Deciders:** Architecture Team, Billing Core  
**Circle:** orchestrator  
**Ceremony:** wsjf  

---

## Context and Problem Statement

The billing domain spans multiple critical sub-systems: Entity Identity, EventOps, Calculation Engine, Rate Engine, Job Manifest, Project Context, and Invoice Engine. Currently, these subsystems interact across vague boundaries, leading to risks such as UUID collisions, rate drift (calculations running on updated rates mid-month), and schema drift. 

We need to formalize these boundaries into explicit Bounded Contexts using Domain-Driven Design (DDD) to enforce immutability, idempotent reconciliations, and clear integration protocols.

**Key Questions:**
- What are the firm boundaries of the Invoice Engine?
- How does the system handle pricing dimension updates (Rate Engine) without corrupting in-flight calculations?
- How are events from the field (EventOps) reconciled against Job Manifests?

---

## Decision Drivers

- **Immutability:** Issued invoices and historical events cannot be mutated.
- **Traceability:** Credit notes and ledger reconciliations must preserve audit trails.
- **Idempotency:** Re-processing events or calculations must not duplicate charges.
- **Schema Validation:** Ensure `docs/api/billing.proto` is the single source of truth across all boundaries.

---

## Considered Options

### Option 1: Monolithic Billing Engine
Combine EventOps, Calculation, and Invoice into a single contextual boundary.
**Pros:** Easy to implement initially.
**Cons:** High risk of schema drift; difficult to parallelize or scale EventOps separately from Invoice generation.

### Option 2: Segregated Bounded Contexts with Explicit Contracts (Chosen)
Define strict DDD Bounded Contexts for each major subsystem, integrated via canonical schemas and event streams.

**Pros:** 
- Clear ownership (Billing Core vs Platform EventOps).
- Limits blast radius of failures (e.g., HostBill synchronization drops can be handled asynchronously).
- Enforces strict contract boundaries.

**Cons:** 
- Requires more integration overhead.

---

## Decision Outcome

**Chosen Option:** Option 2 - Segregated Bounded Contexts with Explicit Contracts

**Rationale:**
The billing pipeline must be resilient to edge failures and race conditions. By formalizing bounded contexts, we isolate responsibilities:
1. **EventOps Context:** Responsible for high-throughput ingestion of field events. Immutable facts buffer.
2. **Entity Identity Context:** Resolves UUIDs (temporal UUIDv7) for technicians and clients.
3. **Project Context & Job Manifest:** Defines budget caps, geo-fences, and signed-off tasks.
4. **Rate Engine Context:** Maintains pricing dimensions. Crucially, rates are *time-locked* at the start of a Job Manifest to prevent calculation drift.
5. **Calculation & Ledger Context:** Aggregates time/budget.
6. **Invoice Engine Context:** Final generation stage. Completely immutable post-issuance.

**Implementation Notes:**
- Implement time-locked rate snapshots (ROAM R2) in the Job Manifest.
- Deploy an async HostBill reconciliation job (ROAM R4) rather than real-time synchronous retries for the ledger.

---

## Consequences

### Positive Consequences
- ✅ Eliminates calculation drift through rate snapshotting.
- ✅ Resilient to HostBill API timeouts via batch reconciliation.
- ✅ Strict schema enforcement prevents boundary drift.

### Negative Consequences
- ⚠️ Asynchronous reconciliation requires robust monitoring (e.g., DLQs).

---

## ROAM Classification

**Risk:** Calculation drift (R2), HostBill drops (R4)
**Mitigation:** Rate Snapshots, Async Reconciliation Job
