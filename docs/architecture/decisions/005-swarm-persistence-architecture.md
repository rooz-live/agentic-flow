---
date: "2026-04-01"
status: "accepted"
---

> [!IMPORTANT]
> **ACTIVE CONSTRAINT (DBOS Connectome Pattern)**: Per Phase 15 and TurboQuant-DGM extreme compression principles, Swarm persistence is strictly bounded by a 4,000-token (16,000 bytes) active connectome ceiling. Longitudinal static sprawl is physically rejected by the daemons via the "Discover/Consolidate THEN Extend" principle. Background scheduled tasks dynamically source and enforce the CSQBM truth covenant via `check-csqbm.sh --deep-why`. The execution topology will structurally halt (`CSQBM_HALT`) if the `agentdb.db` staleness exceeds 96 hours, guaranteeing zero LLM parameter bloat and averting hallucinatory completion theater.
# ADR: Swarm Persistence Architecture Decision

## Context and Problem Statement
The multi-agent orchestration architecture initially relied on ephemeral, one-shot CLI invocations (`npx @claude-flow/cli agent spawn`). This caused total state loss between runs and forced expensive context regeneration. Moving to Phase 86 (Cycle AM), we are completely severing reliance on longitudinal static sprawl (`agentdb.db` fragmentation) in favor of a persistent Swarm architecture mapping a dynamic, token-trimmed active connectome bound (4,000 token active memory ceiling mapped natively via DBOS durable execution patterns). Under the TurboQuant metrics, unstructured payload ingestion MUST be compressed and strictly bound to prevent contextual hallucinatory spread.

### Inverted Thinking Constraint (Phase 18 Integration + Phase 86 Formalization)
Per the "Discover/Consolidate THEN Extend" principle, the Swarm boundary dictates all downstream architectural limits. R-2026-018 (Systemic Attention Fragmentation) physically bars new scripts from evaluating dynamic thresholds implicitly. This ADR codifies the exact constraints driven uniformly down to `semantic-validation-gate.sh` and `mcp-scheduler-daemon.sh`:
- **DBOS Memory Ceiling**: Limit input payloads linearly based on $O(1)$ semantic value, mathematically terminating payloads `> 8000` tokens structurally bound to `TURBOQUANT-DGM-METRICS-2026-04-02.md` configurations.
- **Temporal Topologies (CSQBM Truth Covenant)**: Execution routing models (such as `aqe-model-router.sh`) are executed *exclusively* under periodic 96-hour stale-verified contexts. Daemons MUST invoke `check-csqbm.sh --deep-why` structurally prior to bridging.
- **Physical Constraints**: If CSQBM traces are empty, the logic layers immediately halt execution, triggering a deterministic `CSQBM_HALT` metric preventing downstream token expenditure without verified architectural hydration.

## Options Considered
1. **Claude Code Task Tool**: Native Warp integration. Excellent local UX, handles single complex workflows.
2. **Bash Daemon (`supervisor.sh` + LaunchAgent)**: Unix-native PID tracking, auto-restarts, zero external dependencies.
3. **Docker Compose Daemon**: Containerized agent pool. High isolation, harder to integrate with local IDE files.

## Decision Outcome
**Chosen option: Hybrid Approach (Bash Daemon `supervisor.sh` with MCP Watchdog via `launchctl` and Cron fallback).**

### Justification
- **Direct Filesystem Access**: The agents need unrestricted, fast access to the `_SYSTEM` YAML databases and `.eml` extraction folders. Containerization (Option 3) introduces severe volume-mounting friction and macOS FUSE overhead.
- **Resource Recovery Integration**: The Bash Daemon naturally hooks into `df -h` and `ps aux` for OOM and Disk Capacity protections (as implemented in Phase 1).
- **Capability Preservation**: We have already stabilized the `swarm-agent-supervisor.sh` respawn loop and dynamically linked it to `delegate-agent-spawn.sh`. Transitioning to a completely new paradigm (Claude Code Tasks exclusively) would abandon tested code and break backward orchestration (`multi-wsjf-swarm-orchestration.sh`).
- **Reliability (Anti-Fragility)**: If LaunchAgents fail due to macOS TCC restrictions (Exit 126), the cron job acts as a secondary mechanical heartbeat, satisfying our multi-layered persistence constraint.

## Consequences
- **Positive**: Agents persist. Background monitoring for emails and WSJF priorities runs continuously. Downstream orchestrators simply "delegate" rather than spawn.
- **Negative**: TCC permissions remain a known issue requiring terminal approval natively in macOS settings (Exit 126).
- **Mitigation**: Using `daemon start` MCP servers to bootstrap operations when LaunchAgents are blocked.
- **CSQBM Boundary Constraint (Governance & Truth Integration)**: DGM logic explicitly requires all background daemons to execute the `check-csqbm.sh --deep-why` matrix natively. Swarms are physically banned from operating asynchronously if the dynamic knowledge graph `agentdb.db` falls into staleness (>96 hours). The $O(1)$ telemetry execution hook ensures no completion theater occurs inside autonomous PI bounds.

### Regenerated System Constraints (Cycle 140 / CSQBM TurboQuant-DGM Matrix)
The following execution boundaries define the operational limits of all unstructured payloads passed functionally to internal gateways (`semantic-validation-gate.sh`) and external cron topologies (`mcp-scheduler-daemon.sh`):

1. **TurboQuant Connectome Topology Limit**: `Maximum Semantic Boundary = 8,000 DBOS Pydantic Tokens` Base configuration mapped recursively scaling strictly up to `32,000` via Orchestration contexts ONLY (`docs/TURBOQUANT-DGM-METRICS-2026-04-02.md`). Anything exceeding this triggers an OpenWorm physical threshold exit natively limiting LLM saturation boundaries completely.
2. **Temporal Truth Validity**: `agentdb.db staleness MAX_AGE = +5760 minutes (96 hours)`. Structural execution MUST halt dynamically (`CSQBM_HALT`) blocking API queries on stale context frameworks.
3. **Discover/Consolidate THEN Extend**: Email logic extraction maps memory natively evaluating Discovery parameters strictly before executing mapping operations limiting unverified data sweeps organically executing natively.
4. **Test-First Red-Green TDD Convergence**: Every deployment or topology bridge requires 100% evidence-backed execution natively mapped via Dependency Injections inherently bypassing mock wrappers explicitly (`check-csqbm.sh --deep-why`).
