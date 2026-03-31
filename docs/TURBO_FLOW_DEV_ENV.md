---
date: 2026-03-10
status: Draft
---

## Turbo Flow Dev Environment (DevPod + Manual)

This document describes **how to bring up the Turbo Flow v4 environment** without violating local constraints:

- **Discover/Consolidate THEN extend**: prefer existing flows over new infra.
- **No unapproved installs**: do not install new global dependencies unless explicitly authorized.
- **No LaunchAgent changes**: keep all automation user‑invoked.

### 1. DevPod-based setup (preferred)

If DevPod is available on your machine:

```bash
devpod up https://github.com/marcuspat/turbo-flow --ide vscode
```

This will:

- Clone the `turbo-flow` repository into a DevPod workspace.
- Start VS Code attached to a dev container configured by the repo.
- Run the `.devcontainer` tooling defined by `turbo-flow` (without modifying your host LaunchAgents).

Use this mode when:

- You want maximum isolation from host dependencies.
- You do not need to bind Turbo Flow tightly to the `agentic-flow` repo yet.

### 2. Manual clone & v4 setup (fallback)

If DevPod is not available or fails:

```bash
git clone https://github.com/marcuspat/turbo-flow -b main
cd turbo-flow/v4
chmod +x .devcontainer/setup-turboflow-4.sh
./.devcontainer/setup-turboflow-4.sh
source ~/.bashrc
turbo-status
```

Guidelines:

- Treat `./.devcontainer/setup-turboflow-4.sh` as the **single source of truth** for host‑side setup; do not add ad‑hoc installer scripts.
- Avoid editing any LaunchAgents or systemd units from this script without a separate ROAM risk review.

### 3. Integration with `agentic-flow` validation and tunnels

Instead of building new validation or tunnel orchestration inside Turbo Flow:

- **Reuse the existing shells** from this repo:
  - Validation: `scripts/validation-runner.sh`, `scripts/pre-send-email-gate.sh`, `scripts/compare-all-validators.sh`.
  - Tunnels/dashboards: `scripts/orchestrators/cascade-tunnel.sh`, `_SYSTEM/_AUTOMATION/eta-live-stream.sh`, `_SYSTEM/_AUTOMATION/run-bounded-eta.sh`.
- From inside the Turbo Flow dev container, you can **point pipelines at this repo** via a mounted volume and run these commands directly, preserving one source of truth.

Example pattern (inside Turbo Flow task definitions or scripts):

```bash
# Assuming /workspace/agentic-flow is mounted into the Turbo Flow environment
AGENTIC_FLOW_ROOT=/workspace/agentic-flow

cd "$AGENTIC_FLOW_ROOT"
./scripts/validation-runner.sh some-email.eml
```

This keeps validation/tunnel logic consolidated while still allowing Turbo Flow to orchestrate runs.

### 4. `run_bounded` integration points

The `_SYSTEM/_AUTOMATION/robust-quality.sh` script provides a generic **bounded execution wrapper**:

```bash
source _SYSTEM/_AUTOMATION/robust-quality.sh

run_bounded "turbo-flow-suite" 40 600 "none" \
  npx turbo test --filter important-pipeline
```

Recommended integration approach:

- **Do not** change Turbo Flow’s core scripts.
- Instead, create small wrapper scripts in `agentic-flow` that:
  - `cd` into the Turbo Flow checkout.
  - Invoke the relevant `turbo` command.
  - Wrap the call in `run_bounded` for:
    - Progress/ETA hooks (if `eta-live-stream` is sourced).
    - 0/1/2/3–style bounded exit codes (success, blocker, warnings, deps).

This keeps bounded execution semantics in one place (ROBUST), and allows Turbo Flow to remain a standard upstream project.

### 5. Things *not* to do without explicit approval

- Do **not**:
  - Install new global versions of Node, pnpm, or Docker solely for Turbo Flow.
  - Add LaunchAgents, systemd services, or cron jobs tied to Turbo Flow scripts.
  - Duplicate validation or tunnel logic that already exists in `agentic-flow`.

If you need any of the above, capture the need in ROAM/ADR first, then implement as a separate, reviewed change.

