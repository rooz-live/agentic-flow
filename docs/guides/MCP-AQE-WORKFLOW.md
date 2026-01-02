# MCP + AQE Local Workflow (Canonical)

This repo uses **repo-managed MCP configuration** under `.claude/` and provides wrapper commands via `./scripts/af`.

This guide documents the **verified** local workflow for:

- selecting an environment (`local|dev|stg|prod`) via `af env set`
- verifying configured MCP servers
- initializing AQE memory (per repo)
- checking AQE status

## Preconditions

- Node.js installed (for `npx`)
- Python 3 installed (used by `./scripts/af env set`)
- `jq` installed (recommended for inspecting JSON)

## Workflow (Local)

### Step 1 — Set environment to `local`

```bash
./scripts/af env set local
```

Expected output (example):

```text
AF_ENV set to local
Updated: .claude/mcp.json
Recorded: .goalie/af_env and .goalie/env_audit.jsonl
```

Artifacts:

- `.goalie/af_env` (current selection)
- `.goalie/env_audit.jsonl` (append-only audit trail)

### Step 2 — Verify `.claude/mcp.json` (MCP “list”)

The authoritative list of MCP servers for this repo is `.claude/mcp.json`.

Quick inspection:

```bash
jq -r '.mcpServers | keys | join(",")' .claude/mcp.json
jq -c '.mcpServers["agentic-qe"].args' .claude/mcp.json
```

Verified-good output (example):

```text
mcpServers.count=5
mcpServers.keys=agentic-qe,claude-flow,context7,filesystem,sequential-thinking
agentic-qe.args=["--yes", "aqe-mcp@2.5.10"]
agentic-qe.env.AQE_ENV=local
agentic-qe.env.AQE_LEARNING_ENABLED=true
```

Required invariants:

- `agentic-qe.args` is pinned to **`aqe-mcp@2.5.10`**
- non-AQE servers remain present after `af env set` (this confirms env switching does not wipe other MCP servers)

### Step 3 — Initialize AQE per repo (best-effort)

```bash
./scripts/af aqe init --best-effort
```

Expected output (example):

```text
AQE init complete
Memory: .agentic-qe/memory.db
```

Artifacts:

- `.agentic-qe/memory.db` (ensured)
- `.goalie/aqe_audit.jsonl` (append-only audit trail)

### Step 4 — AQE status (best-effort)

```bash
./scripts/af aqe status
```

Expected baseline output:

```text
AF_ENV=local
AQE_MEMORY_PATH=.agentic-qe/memory.db
Memory DB: present
```

Note:

- If you see a message like `Run "aqe init" to initialize the fleet and enable learning`, that typically means **the memory DB exists**, but the AQE CLI believes the **fleet is not initialized/running**. If you want a running fleet, you may need to start it via the AQE CLI (e.g. `npx aqe start --daemon`) depending on your installation.

## Timing / SLOs (observed)

Observed in a local run (order-of-magnitude guidance):

- `af env set local`: ~1s
- `.claude/mcp.json` verification: <1s
- `af aqe init --best-effort`: ~18s
- `af aqe status`: ~2s

Practical SLOs:

- warm cache: <30s total
- cold cache / first-time `npx`: 1–3 minutes total (network-dependent)

## Versioning notes (MCP server vs AQE CLI)

- MCP server is pinned via `.claude/mcp.json` / `.claude/mcp-config-*.json` (`aqe-mcp@2.5.10`).
- AQE CLI invoked by `./scripts/af aqe *` is currently `npx aqe ...` and may drift to the latest available version.

If you need CLI parity with CI:

- Use pinned npx: `npx aqe@2.5.10 init ...`
- Or install pinned globally: `npm i -g agentic-qe@2.5.10`

## Evidence / system-of-record artifacts

- `.goalie/env_audit.jsonl`
- `.goalie/aqe_audit.jsonl`
- Optional transcript logs if you run an instrumented wrapper (recommended for debugging and SLA measurement)
