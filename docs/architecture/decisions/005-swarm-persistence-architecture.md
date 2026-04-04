---
date: "2026-04-04"
status: "accepted"
---

# ADR-005: Swarm Persistence Architecture Formalization

> [!IMPORTANT]
> **ACTIVE CONSTRAINT (DBOS Connectome Pattern)**: Per Phase 15 and TurboQuant-DGM extreme compression principles, Swarm persistence is strictly bounded by the `Layer Aggregation Model`. Longitudinal static sprawl is physically rejected by the daemons via the "Discover/Consolidate THEN Extend" principle. Background scheduled tasks dynamically source and enforce the CSQBM truth covenant via `check-csqbm.sh --deep-why`. The execution topology will structurally halt (`CSQBM_HALT`) if the `agentdb.db` staleness exceeds 96 hours, guaranteeing zero LLM parameter bloat and averting hallucinatory completion theater.

## Context and Problem Statement

The multi-agent orchestration architecture initially relied on ephemeral, one-shot CLI invocations, causing state loss and demanding expensive context regeneration. Moving via Cycle AM, we severed reliance on longitudinal static sprawl (`agentdb.db` fragmentation), favoring a persistent Swarm architecture mapping a dynamic, token-trimmed active connectome bound. Now, under the TurboQuant-DGM local LLM loop metrics, unstructured payload ingestion MUST be compressed, strictly evaluated via MYM-Alignment scoring, and physically bounded before execution to prevent contextual hallucinatory spread.

### Inverted Thinking Constraint (Layer Aggregation Model Integration)

Per the "Discover/Consolidate THEN Extend" principle, the Swarm boundary dictates all downstream architectural limits. R-2026-018 (Systemic Attention Fragmentation) physically bars new scripts from evaluating dynamic thresholds implicitly. This ADR codifies the exact constraints driven uniformly down to `semantic-validation-gate.sh` and `mcp-scheduler-daemon.sh`:

## 1. MYM-Alignment Scorer (Governance Alignment)

All scheduled logic bridges and gateway validations enforce the triple architectural dimensions:

- **Manthra (TRUTH / Intention Alignment)**: Does the payload actively solve the objective safely? Evaluates physical environment pressure directly inside `/tmp/mcp-scheduler.log`.
- **Yasna (TIME / Documentation Accuracy)**: Is the telemetry fully preserved and mapped temporally natively? Binds STX/HostBill OpenStack telemetry bounds organically.
- **Mithra (LIVE / Implementation Coherence)**: Do the semantic integration constraints compile successfully and structurally enforce Red/Green TDD validation execution before executing loops?

## 2. TurboQuant Connectome Topology Limits

The structural token boundaries strictly dictate operational sprawl:

- **Baseline**: 4,000 DBOS Pydantic Tokens (representing the maximum initial footprint boundary for unstructured file intake, such as Email hashes mapped iteratively in `semantic-validation-gate.sh`).
- **Expanded**: 8,000 Tokens (Permitted natively during formal verification property checking of integrated pipelines).
- **Absolute Ceiling**: 32,000 Tokens mapping up strictly governed via Orchestration contexts ONLY (`scripts/config/chunking-config.json`). Exceeding this boundary triggers physical exit limits natively mapping LLM saturation zeroing.

## 3. Temporal Active Capability Freshness

Execution routing models prioritize high-utilization metrics within `.goalie/metrics_log.jsonl` dynamically ranking scripts based on native traces: `century`, `decade`, `year`, `season`, `month`, `week`, `day`, `hour`, `now`, `next`, `later`.

**Temporal Truth Validity (CSQBM Truth Covenant)**:

The execution model (`aqe-model-router.sh`, `mcp-scheduler-daemon.sh`) runs *exclusively* under periodic 96-hour stale-verified contexts. Daemons MUST invoke `check-csqbm.sh --deep-why` structurally prior to bridging.

- **Physical Halt Variable**: If CSQBM traces fail verification (i.e. `agentdb.db staleness MAX_AGE = +5760 minutes (96 hours)`), the logic layer immediately executes `CSQBM_HALT`, rejecting structural telemetry generation until evidence boundaries are inherently met natively.

## Consequences & Governance Matrix

- **Positive**: Agents persist reliably under strictly enforced dynamic Connectome bounds.
- **Positive**: 100% Traceability across CSM Matrix dynamically triggering PI merge strictly when Infrastructure + CSQBM = GREEN.
- **Constraint (CSQBM Boundary Integration)**: DGM logic explicitly requires all background daemons to execute the verification checks organically. Swarms are physically banned from operating asynchronously if the dynamic knowledge graph falls out of temporal bounds, mathematically guaranteeing an escape from completion theater.
