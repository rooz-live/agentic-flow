# ADR 008: Ecosystem Harvesting Strategy

**Status:** Proposed
**Date:** 2026-03-31
**Context:** The `agentic-flow` repository requires continuous infusion of external capabilities (Agentic-QE, Anthropic MCP, DBOS telemetry) without violating the *Discover/Consolidate THEN Extend* constraints (R-2026-018). We must formally define the perimeter ingestion matrix evaluating third-party GitHub frameworks preventing unchecked logic sprawl.

## Decision
We establish the Ecosystem Harvest Ledger (`.goalie/ecosystem_harvest_ledger.md`) mapping external dependencies to explicit PRD constraints and `yo.life` ROI metrics before integration. All external modules MUST:
1. Conform to the CSQBM (Current-State Query Before Merge) framework (Deep-Why tracking).
2. Integrate via defined `scripts/daemons` or `scripts/validators` bounding process contracts cleanly.
3. Establish a Red-Green TDD trace validating the boundary physically.

## Rationale
"Invisible Efficiency Matters." To prevent trillion-dollar industries from farming our system's attention, the Swarm must consciously triage external modules through WSJF scoring evaluating the *Cost of Delay* against the *Job Size*. The `check-csqbm.sh` logic explicitly defends interiority's externalities.

## Consequences
- **Positive:** Bounded capability mapping dynamically tracks ROAM elements mitigating security regressions cleanly. External sprawl (like downloading massive raw git submodules) is actively blocked unless it possesses an exact Substitution Map.
- **Negative:** Increased pre-flight planning friction parsing the external Github URIs prior to pulling physical pipelines.
