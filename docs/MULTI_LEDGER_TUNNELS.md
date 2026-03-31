---
date: 2026-03-10
status: Draft
---

## Multi-Ledger Tunnel Orchestration (law/pur/hab/file)

This document summarizes how to start, monitor, and reason about the **multi-ledger tunnel system** that exposes dashboards and legal workflows over public URLs (no `file://` or `localhost` dependencies).

### 1. Ledgers and domains

| Ledger | Subdomain      | Exit Code | Purpose                           |
|--------|----------------|-----------|-----------------------------------|
| ROOT   | `law.rooz.live`  | 150       | Legal aggregate root (law/precedent). |
| GATEWAY| `pur.tag.vote`   | 151       | WSJF/email validation gate.      |
| EVIDENCE | `hab.yo.life`  | 152       | Habitability evidence surface.   |
| PROCESS | `file.rooz.live`| 153       | Filing/execution layer.          |

The PROCESS ledger choice is formalized in `docs/adr/ADR-020-WSJF-PROCESS-LEDGER-DOMAIN.md`.

### 2. Startup: cascade tunnel orchestrator

**Entry script**: `scripts/orchestrators/cascade-tunnel.sh`

- **Multi-ledger start**:

  ```bash
  cd ~/Documents/code/investing/agentic-flow
  ./scripts/orchestrators/cascade-tunnel.sh multi-ledger
  ```

- Behavior:
  - Ensures a local HTTP server is running for the BHOPTI-LEGAL dashboard directory.
  - For each ledger (law, pur, hab, file), coordinates tunnel startup via:
    - `_SYSTEM/_AUTOMATION/eta-live-stream.sh` (`run_multi_ledger_tunnel`).
    - `scripts/orchestrators/start-ledger-tunnel.sh` (per-ledger ngrok/localtunnel logic).
  - Writes the active overview URL to `/tmp/active-tunnel-url.txt` and the provider to `/tmp/active-tunnel-provider.txt`.

### 3. Per-ledger tunnels

**Script**: `scripts/orchestrators/start-ledger-tunnel.sh`

- Usage:

  ```bash
  # Example: start PROCESS ledger only
  ./scripts/orchestrators/start-ledger-tunnel.sh file file.rooz.live 8083
  ```

- Valid ledger IDs:
  - `law`, `pur`, `hab`, `file`.
- Ledger configuration (simplified):
  - `law` → `law.rooz.live` (ngrok name `law-root`).
  - `pur` → `pur.tag.vote` (ngrok name `pur-gateway`).
  - `hab` → `hab.yo.life` (ngrok name `hab-evidence`).
  - `file` → `file.rooz.live` (ngrok name `file-process`).

Tunnels prefer **ngrok named tunnels** if configured; otherwise they fall back to simpler `ngrok http` or other providers, still preserving the public URL requirement.

### 4. Bounded execution and ETA streaming

**Scripts**:

- `_SYSTEM/_AUTOMATION/run-bounded-eta.sh`
- `_SYSTEM/_AUTOMATION/eta-live-stream.sh`
- `_SYSTEM/_AUTOMATION/robust-quality.sh`

Patterns:

- `run_multi_ledger_tunnel` (in `eta-live-stream.sh`) starts each ledger with **bounded, per-ledger process IDs** and emits progress events.
- `run_bounded_eta` (in `run-bounded-eta.sh`) and `run_bounded` (in `robust-quality.sh`) provide:
  - Process contracts: `max_steps`, `max_duration`, `dependencies`.
  - Progress hooks: `emit_progress_update`, `update_progress`.
  - Timeout and step guards: exit `124`/`125` on time/step violations.
  - Integration with ROBUST quality scoring via `collect_quality_metrics`.

You can wrap tunnel startups or dashboard jobs in these wrappers to surface ETAs and robust 0/1/2/3‑style modes into dashboards.

### 5. Diagnostics & exit codes

**Script**: `_SYSTEM/_AUTOMATION/debug-exit-codes.sh`

- Quick diagnostic:

  ```bash
  cd ~/Documents/code/investing/agentic-flow
  ./_SYSTEM/_AUTOMATION/debug-exit-codes.sh diag
  ```

- Sample output includes:
  - Port 8080 occupancy.
  - HTTP server health (`curl` to `http://localhost:8080`).
  - Active tunnel provider + URL.
  - A list of any running tunnel processes (tailscale, ngrok, cloudflared, localtunnel).

- Exit-code mappings:
  - `0` — success.
  - `110–119` — various tunnel and HTTP server failures.
  - **150–153** — domain validation / legal context issues:
    - `150`: law (ROOT) domain failure.
    - `151`: pur (GATEWAY) domain failure.
    - `152`: hab (EVIDENCE) domain failure.
    - `153`: file (PROCESS) domain failure.

Use these codes as inputs to ROAM risks:

- **R‑TUNNEL‑ROOT**: `150` — law ledger unreachable → legal aggregate root dashboards down.
- **R‑TUNNEL‑GATEWAY**: `151` — WSJF/email validation unavailable.
- **R‑TUNNEL‑EVIDENCE**: `152` — habitability evidence surface unavailable.
- **R‑TUNNEL‑PROCESS**: `153` — filing/execution tunnel (`file.rooz.live`) unavailable, may delay filings.

### 6. Constraints and guardrails

- Tunnels must expose **public URLs**; avoid workflows that depend on `file://` or `localhost` URLs for critical operations.
- Do **not** introduce new LaunchAgents or background services for tunnels without:
  - An ADR describing the change, and
  - ROAM entries capturing the operational risk.
- Prefer **explicit, user-invoked scripts** (like `cascade-tunnel.sh` and `debug-exit-codes.sh`) for now.

### 7. Future extensions (post-consolidation)

After the consolidated tunnel setup proves stable, future work can include:

- Dashboard integration showing:
  - Current tunnel provider and URL for each ledger.
  - Recent exit-code history (especially 150–153).
  - ROBUST quality scores for each orchestration run.
- Optional integration with agentic-QE to simulate ledger outages and validate circuit-breaker behavior in dashboards and legal workflows.

