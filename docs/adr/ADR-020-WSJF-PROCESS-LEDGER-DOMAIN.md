---
date: 2026-03-10
status: Accepted
supersedes: null
related_prd: docs/prd/PRD-COHERENCE-VALIDATION-PIPELINE.md
related_tests: scripts/ci/adr-frontmatter-gate.sh
---

# ADR-020: PROCESS Ledger Domain Selection (`file.rooz.live`)

## Context

The dashboard and tunnel orchestration stack uses a **multi-ledger topology** to separate concerns:

- **ROOT** — `law.rooz.live` (legal aggregate root, law/precedent context).
- **GATEWAY** — `pur.tag.vote` (WSJF/email validation gate).
- **EVIDENCE** — `hab.yo.life` (habitability and evidence surface).
- **PROCESS** — filing and execution layer for court documents and automation.

Historically, the PROCESS ledger was wired to `file.720.chat` in several scripts:

- `scripts/orchestrators/cascade-tunnel.sh` — multi-ledger tunnel entrypoint.
- `_SYSTEM/_AUTOMATION/eta-live-stream.sh` — ETA live streaming for ledger tunnels.
- `_SYSTEM/_AUTOMATION/run-bounded-eta.sh` — bounded execution wrapper for ledger startup.
- `scripts/orchestrators/start-ledger-tunnel.sh` — per-ledger tunnel bootstrap.

Subdomain choices for PROCESS were evaluated using WSJF (Weighted Shortest Job First) and cliodynamic considerations:

- `file` — short, verb‑like, maps cleanly to “filing” in legal contexts.
- `arb` — arbitration‑specific; too narrow.
- `motion` — procedural; excludes evidence and non‑motion filings.
- `brief` — communication‑focused; ambiguous outside litigation briefs.

To reduce cognitive load and maximize reuse across legal projects and jurisdictions, a single PROCESS subdomain must be:

- **Short** (muscle memory), **semantically stable** (verbs of legal action), and
- Compatible with **existing exit‑code semantics** (e.g. 153 = PROCESS ledger failure).

## Decision

Adopt **`file.rooz.live`** as the canonical PROCESS ledger subdomain.

- Map all PROCESS‑level tunnel logic to `file.rooz.live`.
- Retain exit code **153** as the canonical “PROCESS ledger failure” domain code in tunnel diagnostics.
- Treat “file” as the generic legal action for **filing and execution** workflows:
  - Court filings (complaints, answers, motions, judgments, registers).
  - Automated execution flows (OCR→review→rename→refile, evidence routing).

Concrete code mappings (implemented in scripts):

- `scripts/orchestrators/cascade-tunnel.sh`
  - Multi-ledger log line:
    - `PROCESS: file.rooz.live (Filing/execution)`
- `_SYSTEM/_AUTOMATION/eta-live-stream.sh`
  - Ledger map:
    - `["file"]="file.rooz.live|PROCESS|Filing execution layer"`
- `_SYSTEM/_AUTOMATION/run-bounded-eta.sh`
  - `multi_ledger` process contracts:
    - `file:8083:file.rooz.live`
- `scripts/orchestrators/start-ledger-tunnel.sh`
  - Ledger configs:
    - `["file"]={"ngrok_name":"file-process","reserved":"file.rooz.live","purpose":"Filing execution layer"}`

## Consequences

### Positive

- **Consistency**: All PROCESS‑layer scripts and dashboards reference a single, memorable domain.
- **WSJF alignment**: High WSJF score (95.0) for `file.rooz.live` based on:
  - 4‑character label (`file`) → reduced keystrokes and mental overhead.
  - Etymology (*facere*, “to do/make”) → stable across legal and operational contexts.
  - Applicability to **all filings**, not just arbitrations or motions.
- **Traceable failure semantics**:
  - Exit code `153` remains the PROCESS ledger error, now documented as:
    - “Filing/execution ledger (file.rooz.live) unavailable or misconfigured.”

### Negative / Risks

- Any remaining references to `file.720.chat` in scripts, docs, or DNS config will be **stale** and must be treated as technical debt.
- If future products require multiple PROCESS‑like ledgers (e.g., per‑court vs. per‑arbitration), `file.rooz.live` will need sub‑paths or additional ADRs to avoid domain sprawl.

## Implementation Notes

### Scripts and CI

- `scripts/orchestrators/cascade-tunnel.sh`
  - The `multi-ledger` command starts all four ledgers and now logs the PROCESS ledger as `file.rooz.live`.
- `_SYSTEM/_AUTOMATION/eta-live-stream.sh`
  - `run_multi_ledger_tunnel` uses the updated ledger map for PROCESS.
- `_SYSTEM/_AUTOMATION/run-bounded-eta.sh`
  - Bounded multi-ledger execution associates `file.rooz.live` with the PROCESS ledger and port `8083`.
- `scripts/orchestrators/start-ledger-tunnel.sh`
  - Per-ledger tunnel startup uses named ngrok tunnel `file-process` and reserves `file.rooz.live`.

### Exit Codes and ROAM

- `_SYSTEM/_AUTOMATION/debug-exit-codes.sh`:
  - Treats `150/151/152/153` as domain‑specific failures:
    - `150` — ROOT (`law.rooz.live`) legal context failure.
    - `151` — GATEWAY (`pur.tag.vote`) WSJF/email validation gate failure.
    - `152` — EVIDENCE (`hab.yo.life`) habitability evidence failure.
    - `153` — PROCESS (`file.rooz.live`) filing/execution failure.
- ROAM tracker entries referencing PROCESS tunnel outages should use:
  - **Risk ID**: PROCESS‑tunnel‑unavailable.
  - **Evidence**: logs and exit codes from `debug-exit-codes.sh` and cascade/ETA scripts.

## Status

- **Accepted** — All known PROCESS‑ledger references in orchestration scripts have been updated to `file.rooz.live`.
- Future changes to PROCESS‑level domains (adding, renaming, or splitting) **MUST**:
  - Reference this ADR explicitly.
  - Either:
    - Update this ADR with a `status: Superseded` and create a new ADR, or
    - Add a `supersedes: ADR-020` link in the follow‑on ADR.

