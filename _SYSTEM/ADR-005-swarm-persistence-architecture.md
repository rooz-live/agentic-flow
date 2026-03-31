# ADR 005: Swarm Persistence Architecture & OpenWorm Taxonomy

## Context
Originally, the Swarm’s context window was arbitrarily bottlenecked with a `2,000,000` (2 million) token limit to guard against static longitudinal sprawl (massive fragmented DBs like `agentdb.db`). However, following the "Discover/Consolidate THEN Extend" methodology, a software limitation creates artificial intelligence bounds that do not map to reality.

## Problem Statement
The question was raised: **"Why limit to 2,000,000 tokens max, if an absolute limit above that is required for scale with available memory?"**

## Decision: OpenWorm Contrastive Intelligence Taxonomy
We are abandoning the static 2MM token ceiling. Instead, the persistence architecture will derive its scale dynamically using the **OpenWorm Contrastive Intelligence agility taxonomy** backed by **TurboQuant-DGM extreme compression**:

1. **Episodic Active Connectome (Short-Term Trace)**: Mapped explicitly to the immediate executing agent’s token capacity natively calculated from physical available host memory (e.g., STX node telemetry, macOS `vm_stat` or Linux `free`). If the machine can handle 5 million tokens safely, the Swarm inherits that capacity. Unstructured payload ingestion must be strictly bound using TurboQuant metrics to enforce lean, red-green validated payloads.
2. **Structural Semantic Bounds (Long-Term Truth)**: Governed by the `.integrations/` logic matrices and the `CASE_REGISTRY.yaml` bounds, fully rejecting logic layer gaps via the CSQBM constraint.

### Constraint Shifts
- **Before**: `if dynamic_ceiling > 2000000 then dynamic_ceiling = 2000000`
- **After**: Token limits trace real physical system states indefinitely.

## Execution Consequences
1. `scripts/validation-core.sh` was refactored to remove the `Megabyte Cap`, resolving the artificial block perfectly.
2. `scripts/validators/file/semantic-validation-gate.sh` outputs connectome parameters linked organically to the physical instance, ensuring the local LLM loop dynamically adapts limits mathematically without requiring user prompt intervention.
