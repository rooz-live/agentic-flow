# ADR-026: DAG Topology Relaxation & Failure Cascade Containment

## Status
Accepted

## Context & Problem Statement
The Swarm orchestrator relies on the `CrossCircleDependencyManager`, which implements Kahn’s Algorithm for topological sorting. However, a Strategic Risk Analysis (ROAM) identified three critical systemic vulnerabilities causing severe execution starvation:

1. **Portfolio Constraints (The Global Kill-Switch):** The orchestrator enforced a strict `failureCascade = true` logic. If *any* task failed with `CRITICAL` severity, the `abortDownstream()` method indiscriminately aborted the *entire* pending queue—even nodes belonging to completely disconnected, independent graphs. While financially hyper-conservative (protects immediate OPEX), it structurally starves Portfolio-level systemic innovations. A minor anomaly in the Seeker circle could abort an independent HostBill mutational PR in the Implementer circle.
2. **Program Topologies (Starvation Wait States):** Program execution relies on Kahn's Algorithm. As complexity scaled, Testing and Assessor circles fell into starvation wait states because the DAG structurally prevented asynchronous horizontal speed by lacking "Soft vs. Hard" blast radius isolation at the component level.
3. **Product vs. Theater:** Relying on global aborts creates "Completion Theater." If the pipeline aborts early due to an unrelated failure, we lose physical telemetry (`/loop`) for the remaining isolated paths, leaving them untested and silently accumulating cognitive drift.

## Decision
We are aggressively refactoring the DAG constraints to balance OPEX protection with execution speed:

1. **Component-Level Isolation (BFS Abort):** We are removing the global `failureCascade` kill-switch. When a `CRITICAL` task failed, the orchestrator will now use Breadth-First Search (BFS) to traverse the adjacency list and abort *only* the topological descendants of the failed node. Disconnected sub-graphs will continue to execute normally.
2. **Soft vs. Hard Dependency Parsing:** `abortStrictDependents()` is upgraded to physically respect the difference between `dependencies` (hard) and `softDependencies` (soft). A soft dependency failure emits a telemetry warning but allows the dependent node to execute, preventing starvation.
3. **Active Telemetry Emission:** The DAG now emits structured JSON payloads specifically designed for the `/loop` Active Sensing Layer to ingest, turning the orchestrator into a physical telemetry driver rather than a silent failure trap.

## Consequences

### Positive (Max ROI Impact)
* **Asynchronous Horizontal Speed:** Independent LLM swarm components (e.g., n8n webhook analysis vs. UI Playwright testing) run concurrently. A failure in one domain no longer starves the other.
* **Granular OPEX Bounding:** Instead of halting all OPEX burn indiscriminately, we only halt the API spend for tasks mathematically doomed to fail (the topological descendants).
* **Physical Telemetry Verification:** The continuous `/loop` receives accurate survival data for edge nodes, eliminating Completion Theater.

### Negative / Risks
* **Graph Complexity:** Circle orchestrators must be meticulously precise when defining `dependencies`. If a hard dependency is accidentally omitted, a downstream node may execute without its required prerequisites, triggering unpredictable side-effects.

## Compliance & Trust Gates
This ADR integrates cleanly into the `[STANDUP → WSJF SELECT → DoR → EXECUTE → VERIFY → COMMIT]` pipeline. The DAG relaxation operates natively in the `EXECUTE` phase, deduplicating wait states and returning exponentially richer telemetry to the `VERIFY` step.