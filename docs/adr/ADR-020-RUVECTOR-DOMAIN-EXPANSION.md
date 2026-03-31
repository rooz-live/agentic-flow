---
date: 2026-03-06
status: accepted
related_tests: TBD
---

# ADR-020: RuVector Domain Expansion for Cross-Domain Transfer Learning

## Date

2026-02-27

**Status**: Accepted
**Deciders**: DDD Domain Modeler, Rust TDD Engineer
**Tags**: ruvector, domain-expansion, transfer-learning, coherence-gate, ddd
**Supersedes**: None
**WSJF Score**: 7.8 (BV:8 + TC:6 + RR:8 / JS:2.8)

---

## Context and Problem Statement

The agentic-flow platform has accumulated domain knowledge across four distinct
bounded contexts: WSJF prioritization, trading signals, risk assessment, and
document validation. Each domain trains independently, losing the opportunity
to compound intelligence across domains.

**Key Questions:**
- Can transfer learning from WSJF scoring improve trading signal evaluation?
- How do we prevent negative transfer (source domain regression)?
- What crate structure maintains DDD boundaries while enabling cross-domain flow?

---

## Decision Drivers

- **Driver 1:** Cross-domain intelligence compounding (WSJF → trading/risk)
- **Driver 2:** DDD boundary preservation (domains must not leak)
- **Driver 3:** Coherence gate safety (no source regression on transfer)
- **Driver 4:** macOS M4 native binary performance
- **Driver 5:** Optional dependency (not all consumers need ruvector)

---

## Considered Options

### Option 1: ruvector-domain-expansion (Rust crate)
**Description:** Use the published `ruvector-domain-expansion` crate (v2.x) which
provides `DomainExpansion` trait, `TransferExperiment`, and coherence gating.

**Pros:**
- ✅ Published crate with stable API
- ✅ Built-in coherence gate (source score ≥ baseline after transfer)
- ✅ Governance task generation per domain
- ✅ Rust-native — compiles to macOS universal binaries

**Cons:**
- ❌ Additional dependency (~2MB compile overhead)
- ❌ v1→v2 breaking changes required migration

### Option 2: Custom transfer learning module
**Description:** Build domain transfer from scratch in `rust_core`.

**Pros:**
- ✅ No external dependency
- ✅ Full control over coherence logic

**Cons:**
- ❌ Significant implementation effort (estimated 3-4 weeks)
- ❌ Untested coherence gate logic
- ❌ Reinventing existing functionality

### Option 3: Python-based transfer (scikit-learn)
**Description:** Use Python transfer learning with scikit-learn or PyTorch.

**Pros:**
- ✅ Rich ML ecosystem

**Cons:**
- ❌ FFI overhead for Rust integration
- ❌ Breaks single-binary deployment model
- ❌ scikit-learn not installed in user environment

---

## Decision Outcome

**Chosen Option:** Option 1 - ruvector-domain-expansion v2

**Rationale:**
The published crate provides exactly the coherence gate and domain registration
system needed. v2 simplified the API (single `DomainExpansion::new()`, built-in
domains for common patterns). The coherence gate is the critical safety mechanism:
it prevents negative transfer by comparing source domain scores before and after
transfer, rejecting transfers where source regresses.

**Implementation:**
- `rust/core/Cargo.toml`: `ruvector-domain-expansion = { version = "2.0", optional = true }`
- Feature-gated: `ruvector = ["dep:ruvector-domain-expansion"]`
- Bridge crate: `crates/wsjf-domain-bridge/` with 4 domain implementations
- 3 binaries: `wsjf-domain-train`, `wsjf-domain-transfer`, `wsjf-parquet-ingest`

---

## Consequences

### Positive Consequences
- ✅ Cross-domain transfer experiments operational (WSJF→trading: 0.957 coherence)
- ✅ 4 custom domains registered with governance task generation
- ✅ macOS universal binaries via `lipo` (arm64 + x86_64)
- ✅ Optional dependency — `cargo build` without `--features ruvector` skips it

### Negative Consequences
- ⚠️ v2 migration required fixing `generate_governance_tasks` (f64→f32) and `initiate_transfer` return type
- ⚠️ Integration test adjustments needed for unregistered domain behavior changes in v2

### Neutral Consequences
- ℹ️ New `crates/wsjf-domain-bridge/` crate added to workspace
- ℹ️ CI matrix expanded to include `wsjf-domain-bridge` builds

---

## Validation & Success Criteria

- Coherence gate correctly rejects transfers where source regresses (verified: WSJF→trading 0.957 vs 0.956 rejected)
- Coherence gate correctly accepts transfers where both improve (verified: WSJF→risk 0.985 both)
- 367 Rust tests pass with zero failures
- macOS binaries compile and run on Apple M4 Max

**Review Date:** 2026-03-27

---

## Related Decisions

- Related to: ADR-018 (WSJF Anti-Pattern Framework — source domain)
- Related to: ADR-021 (Parquet Pipeline — data layer for domain bridge)
- Influences: Future multi-platform binary builds (Linux, Windows)

---

## ROAM Classification

**Risk:** Negative transfer degrading source domain accuracy
**Obstacle:** ruvector v1→v2 API breaking changes
**Assumption:** Coherence gate threshold of equal-or-better is sufficient
**Mitigation:** Coherence gate enforces source ≥ baseline; experiments logged to JSONL for audit
