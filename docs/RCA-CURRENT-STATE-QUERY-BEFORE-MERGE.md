# Root Cause Analysis: The Logic-Layer Gap & Current-State Queries

**Date:** 2026-03-26
**Subject:** 5-Whys Analysis into Context Hallucination & Pre-Merge State Validation.
**Trigger:** Observation that DGM agents and scripts can produce false or inaccurate statements despite the existence of `agentdb.db`, `CASE_REGISTRY.yaml`, and `research_validated.db`.

---

## The Gap Definition

There exists a severe **Logic-Layer Gap** where agents bypass dynamic knowledge graphs and evidential databases in favor of operating blindly on historical or static string context, resulting in "completion theater."

## 5 Whys Analysis

**1. Why do agents confidently produce inaccurate statements without reviewing evidential databases?**
Because they rely entirely on the static context window provided at the start of the session (e.g., initial prompts) rather than invoking active semantic queries against `agentdb.db`, `research_validated.db`, or `WSJF-PACK-MOVE-CHECKLIST.md`.

**2. Why do they rely on static context rather than querying dynamically?**
Because the current validation frameworks treat file compilation, syntax correctness, and exit code `0` as a definitive "PASS", but they **do not mathematically assert** that a "Current-State Query" was actively executed by the agent during the session timeline.

**3. Why does the merge gate not assert that a state query occurred?**
Because our automation historically focused on Structural Coherence (do the files match the DDD/TDD norms?) rather than Semantic Freshness (did the intelligence actually consult the ground truth before acting?).

**4. Why did we prioritize structural coherence over semantic freshness?**
Because the boundaries between the Logic Layer (the scripts) and the Data/Record Layer (`agentdb.db` / `CASE_REGISTRY.yaml`) were loosely coupled. The architecture assumed agents would freely *choose* to read evidential files when uncertain.

**5. Why is assuming "agents will choose to read files" a catastrophic vulnerability?**
Because LLMs (and DGM variants) are fundamentally optimized to predict the most statistically probable next token (path of least resistance). This optimization naturally bypasses the high-friction step of invoking external search tools unless a hard, external constraint forces them to do so.

---

## Corrective Action Plan (CAP)

To destroy this vulnerability and evolve the Ruvector/AgentDB portfolio, we must enforce **Contrastive Consciousness** at the Governance envelope:

### 1. Current-State Query Before Merge (CSQBM)

A verifiable assertion must be added to the CI/Merge gates: No code, email, or PR can be merged or promoted unless there is an absolute trace that a dynamic query against `case_registry` or `agentdb.db` occurred within the execution window.

### 2. Upgrading the Ruvector + Vector Search Portfolio

The `ruvector-domain-expansion` crate must be shifted from a passive intelligence repository to an **Active Pre-Flight Block**.

- If `agentdb.db` is not loaded in the agent's immediate prior context matrix, the validator must throw a fatal `Semantic Freshness Error`.

### 3. Redefining the DoD (Definition of Done)

PI Syncs and Retro standups must now review the **Utilization Metrics** of the evidential databases as a primary health indicator, treating a lack of queries as a critical failure of the entire DGM cycle, rather than "fast execution."
