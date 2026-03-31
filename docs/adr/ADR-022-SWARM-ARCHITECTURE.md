---
date: 2026-03-07
status: accepted
---

# ADR 022: Swarm Agent Supervisor Architecture

**Status**: Accepted
**Date**: 2026-03-07

---

## Date
2026-03-07

## Context

The prior problem with the swarm agent implementation was that agents were spawned ephemerally via a one-shot CLI command (`npx @claude-flow/cli@latest agent spawn`). This caused the agents to terminate immediately after spawning because there was no background daemon or persistent process tracking them. Consequently, the agents could not engage in continuous tasks or execute parallel workflows, returning "No active swarm".

## Decision

We elected to adopt **Option A: File-based Bash Supervisor (`MASTER-PARALLEL-COORDINATOR.sh` / `swarm-agent-supervisor.sh`)** for now.
This supervisor acts as a daemon that forks processes and maintains the necessary lifecycle for swarm agents to survive without requiring complex state management.

### Alternatives Considered

- *Custom bash supervisor daemon with PID tracking:* Medium complexity, deferred to future.
- *PM2/systemd process manager:* Native monitoring but higher dependency footprint. Ideal for production but premature.
- *Docker Compose agent pool:* Required for cloud deployment but too heavy for local laptop execution at this stage.

## Consequences

- **Positive:** Immediate unblocking of parallel agent routines for legal and utility tracks with no additional tooling required.
- **Negative:** File-based tracking can be brittle if abruptly terminated.
- **Mitigation:** Ensure the `swarm-agent-supervisor.sh` script handles `SIGINT` properly and cleans up PID tracking files or temporary state on exit.
