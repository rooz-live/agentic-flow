---
date: 2026-03-29
status: accepted
related_tests: scripts/validators/project/check-csqbm.sh
---

# ADR-006: Vector Search Merge Provisioning

**Date**: 2026-03-29
**Status**: Accepted
**Context / Scope**: 
The Swarm operates as a dynamic Darwin Gödel Machine (DGM). To prevent **Graph Paralysis** (R-2026-019), the intelligence layer (`agentdb.db` & `ruvector`) relies on an MCP/MPP provisioning schema to ensure context freshness prior to any PI Sync or code merge. Historically, static files (`CASE_REGISTRY.yaml`) bypassed dynamic knowledge graphs, causing "Completion Theater."

**Decision**:
1. **Red-Green TDD Enforcement**: During `.github/workflows/strict-validation.yml`, `scripts/validators/project/check-csqbm.sh` must explicitly execute a mandatory **Vector Synchronization Gate**.
2. **Domain-Driven Design (DDD) Layer**: The persistence layer (StarlingX/DBOS) cannot invoke a superproject merge without the intelligence layer indicating that `agentdb.db` is actively synchronized.
3. **Pre-flight Assertion**: If `agentdb.db` telemetry does not register as `fresh` within a given iteration window (< 96 hours or custom `CSQBM_LOOKBACK_MINUTES` threshold), the matrix fails natively.

**Consequences**:
- *Positive*: Unbreakable vector topology binding. The AI cannot drift from the knowledge base.
- *Negative*: A structurally orphaned PI Pipeline must resolve its telemetry bridges manually if the vector search portfolio goes offline.

**ROAM Risks Addressed**:
- R-2026-019: Stale Graph Hallucinations (Graph Paralysis) mitigated intrinsically by bash-level exit constraints.
