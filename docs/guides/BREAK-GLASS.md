# Break Glass Policy (ROAM-safe)

This repo uses explicit environment variables to gate high-risk operations (especially in `AF_ENV=prod`).

## Goals

- Avoid "checkbox fatigue" by reserving break-glass for **disruptive / write** operations.
- Keep read-only probes available with explicit confirmation.
- Maintain an append-only audit trail for governance.

## Read-only remote probes

Read-only probes should not consume break-glass.

Example: StarlingX read-only health probe

- In non-prod (`local|dev|stg`):

```bash
./scripts/af stx health
```

- In prod (`AF_ENV=prod`):

```bash
AF_CONFIRM_REMOTE=1 ./scripts/af stx health
```

## Break-glass (disruptive operations)

For write/disruptive operations in `AF_ENV=prod` (install packages, restart services, runtime migrations, kubelet/kubeconfig changes), the command should be gated behind:

- `AF_BREAK_GLASS=1`
- `AF_BREAK_GLASS_REASON="..."`
- `AF_CHANGE_TICKET="..."` (or CAB approval reference)
- Optional: `AF_CAB_APPROVAL_ID="..."`

### What you will see when blocked

- The blocked command
- Why it is considered high-risk
- The exact rerun command
- The required context fields

### Audit trail

When break-glass is satisfied, an entry is appended to:

- `.goalie/break_glass_audit.jsonl`

Fields include timestamp, env, command, reason, ticket, git SHA, dirty count, and local host/user.

### Optional interactive confirmation (TTY)

If running in a TTY, the script may also require:

- typing `PROD` to continue
- typing the last 6 chars of the current git SHA

Disable interactive confirmation by setting:

- `AF_BREAK_GLASS_INTERACTIVE_CONFIRM=0`
