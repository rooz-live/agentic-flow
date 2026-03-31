---
date: "2026-03-08"
status: "accepted"
---

> [!IMPORTANT]
> **ACTIVE CONSTRAINT (DBOS Connectome Pattern)**: Per Phase 15 and TurboQuant-DGM extreme compression principles, Swarm persistence is strictly bounded by a 4,000-token (16,000 bytes) active connectome ceiling. Longitudinal static sprawl is physically rejected by the daemons via the "Discover/Consolidate THEN Extend" principle. Background scheduled tasks dynamically source the `validation-core.sh` truth matrix and will structurally halt if knowledge graph staleness exceeds 96 hours (CSQBM boundary), preventing LLM parameter bloat.
# ADR: Swarm Persistence Architecture Decision

## Context and Problem Statement
The multi-agent orchestration architecture initially relied on ephemeral, one-shot CLI invocations (`npx @claude-flow/cli agent spawn`). This caused total state loss between runs and forced expensive context regeneration. Moving to Phase 6, we are intentionally departing from the static longitudinal sprawl (`agentdb.db` fragmentation) toward a persistent swarm architecture that uses dynamic, token-trimmed active connectome bounds (4,000 token active memory ceiling mapped natively via DBOS durable execution patterns). Under the TurboQuant metrics, unstructured payload ingestion MUST be compressed and strictly bound to prevent contextual hallucinatory spread.

### Inverted Thinking Constraint (Phase 18 Integration)
Per the "Discover/Consolidate THEN Extend" principle, the Swarm boundary dictates all downstream architectural limits. R-2026-018 (Systemic Attention Fragmentation) physically bars new scripts from evaluating dynamic thresholds implicitly. This ADR codifies the exact constraints driven uniformly down to `semantic-validation-gate.sh`, `email-gate-lean.sh`, and `mcp-scheduler-daemon.sh`:
- **DBOS Memory Ceiling**: Limit input payloads linearly based on $O(1)$ semantic value, mathematically terminating payloads `> 4000` tokens (~16,000 bytes).
- **Temporal Topologies**: Execution routing models (such as `aqe-model-router.sh`) are executed *exclusively* under periodic 96-hour stale-verified `agentdb.db` contexts (ADR-005 truth bindings).
- **Physical Constraints**: If CSQBM traces are empty, the logic layers immediately halt execution.

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
- **CSQBM Boundary Constraint (Governance & Truth Integration)**: DGM logic explicitly requires all background daemons to source the central `validation-core.sh` truth matrix natively. Swarms are physically banned from operating asynchronously if the dynamic knowledge graph falls into staleness (>96 hours). The O(1) telemetry execution hook ensures no completion theater.
