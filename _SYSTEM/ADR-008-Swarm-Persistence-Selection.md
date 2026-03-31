# ADR 008: Swarm Agent Persistence Architecture

## Context
Agentic-flow currently relies heavily on localized ephemeral CLI execution contexts (`npx @claude-flow/cli agent spawn`). This creates critical gaps in Swarm state persistence, especially regarding multi-agent negotiation scenarios and recursive iteration (VibeThinker RL loops).

The system requires a highly robust background scheduling and daemon structure to maintain agent life cycles outside of terminal windows without succumbing to TCC `Exit 126` blocks or OOM `Exit 240` exhaustion traps. Consolidating the architectural truth established in `005-swarm-persistence-architecture.md`, this daemon architecture is restrained by a **Domain-Driven Design (DDD) physical token ceiling** and governed by strict **96-hour staleness telemetry**.

### DDD Token Connectome Limits
To prevent hallucinatory scale while ensuring dense coverage, token limits scale mechanically based on the physical folder structure:
- **Legal Domain** (`*BHOPTI-LEGAL*` | `*COURT-FILINGS*`): 32,000 bytes (~8,000 tokens) 
- **Utilities Domain** (`*utilities*` | `*movers*`): 8,000 bytes (~2,000 tokens)
- **Income/Job Domain**: 12,000 bytes (~3,000 tokens)
- **Default Fallback**: 16,000 bytes (~4,000 tokens)

## Options Evaluated

### 1. Claude Code Task Tool (Native Integration)
- **Pros**: Direct API hooks; utilizes the underlying warp-integration; maintains immediate visibility into the orchestrator context window.
- **Cons**: Still coupled to terminal lifetimes unless paired with external multiplexers (`tmux`/`screen`).

### 2. Bash Supervisor Daemon (`supervisor.sh`)
- **Pros**: Already partially implemented. Writes straight to `AGENT_PIDS_FILE` inside `~/.claude-flow/swarm-state/`. Lightweight, entirely within the user's bash execution boundaries.
- **Cons**: Susceptible to `kill -9` without a system-level watchdog. Subject to macOS TCC constraints if accessing file systems heavily.

### 3. Docker Compose (Containerized Swarm Pool)
- **Pros**: Absolute containment. Isolated memory limits (prevents OS-level OOM deaths). Agents can communicate over a local docker network.
- **Cons**: Highest initial configuration cost. Mount points into Host OS (like `/BHOPTI-LEGAL`) require volume configurations.

## Decision: Hybrid Bash Supervisor + Claude Task Tool
Since `agentic-flow` thrives on localized LLM file mutation directly on the macOS filesystem, we will prioritize **Option 2 (Bash Supervisor daemon)** as the raw executor, but immediately bind it through **Option 1 (Claude Code Tasks)** for context visibility.

**Docker Compose** is rejected for the NOW cycle to prevent adding virtualization orchestration latency while the codebase is actively red-green-refactoring.

## Action Items
1. Formalize `delegate-agent-spawn.sh` to fully replace ephemeral cli `spawn` commands.
2. Ensure the daemon logs state to `~/.claude-flow/swarm-state/registry.txt`.
