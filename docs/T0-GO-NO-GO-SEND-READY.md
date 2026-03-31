# T0: GO / CONDITIONAL GO / NO-GO vs send-ready (honest checklist)

This artifact separates **machine-defined bands** from **human meaning**. Do not treat one signal as proof of the others without evidence.

## 1. `ay` (Agentic Yield) — action completion only

Source: `scripts/ay.sh` — success rate from primary recommended actions (`done` / `failed` / `skip`).

| Band | Threshold | Typical exit | Use |
|------|-----------|--------------|-----|
| **GO** | ≥ 80% actions done | 0 | Safe for heavier Build–Measure–Learn |
| **CONDITIONAL GO** | 50–79% | 1 | Degraded; fix failures before scaling automation |
| **NO-GO** | &lt; 50% | 2 | Block heavy automation |

**RCA:** Skips and timeouts still move the cycle; a “CONDITIONAL” band does **not** prove tunnels, disk, ROAM freshness, prod branch, or email send-readiness.

## 2. Send-ready / validation (separate contract)

Treat as **DoD for outbound email** only when **all** are true for the **current draft**:

- `validate-full` (or equivalent) returns `good_enough_to_send` consistent with your policy.
- `RUNNER_EXIT ∈ {0,1}` (success or success-with-warnings — per your normalized policy).
- `exit_code` and blocker list match UI “Send Gate” (no drift between panels).

**Do not conflate** §1 with §2. Wire both into AISP or a single PI-sync artifact if you need one executive readout.

## 3. Governance / AISP guard (`ay --check`, `advocate`, `cascade-tunnel`)

Separate lane: roots, `LEGAL_CASE_IDS`, branch gate in prod, env. Exit codes and `reports/aisp-status.json` (and lane-specific JSON) are the evidence files.

## 4. Minimal evidence bundle (no completion theater)

Before declaring GO for a release or send batch, collect:

1. Latest `reports/aisp-status.json` (or lane file) — timestamp and `exit_code`.
2. For email: one `validate-full` JSON snippet — `runner_exit`, `good_enough_to_send`, `%/#`.
3. `df -h` line for `$HOME` data volume — see `reports/DISK-ROAM-RUNBOOK.md`.
4. ROAM: `ROAM_TRACKER.yaml` freshness per your gate (if you enforce it).

## 5. SA vs FA

- **SA:** Human confirms send and ambiguous fixes.
- **FA:** Only where gates exist end-to-end (non-interactive env, validation, readiness functions). If a gate is missing, **downgrade to SA** and record in ROAM.
