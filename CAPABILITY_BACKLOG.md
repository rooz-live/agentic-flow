# CAPABILITY BACKLOG — WSJF live index (truncated)

**Generated:** 2026-04-03Z (hygiene cycle)  
**Sort:** Cost of Delay ÷ Job Size (highest first)  
**Full pre-truncate copy (restorable):** `.goalie/backlog_snapshots/2026-04-03/CAPABILITY_BACKLOG.md`

---

## CRITICAL TRUST BLOCKERS (WSJF 95–100)

| # | Item | WSJF | Pointer |
|---|------|------|---------|
| 1 | GitNexus code intelligence | 100 | `npx gitnexus analyze` — https://github.com/abhigyanpatwari/GitNexus |
| 2 | Superproject git health | 100 | Anchor work in healthy tree `projects/investing/agentic-flow`; superproject merge NO-GO until tree rehydrated — `.goalie/go_no_go_ledger.md` |

---

## INFRASTRUCTURE & GATES (WSJF 90–94)

| # | Item | WSJF | Pointer |
|---|------|------|---------|
| 3 | Agentic QE Fleet | 95 | `npx agentic-qe@3.9.0 init --auto` — https://github.com/proffesor-for-testing/agentic-qe |
| 4 | PI MCP Adapter | 92 | `src/mcp/pi-adapter.ts` (implemented) — https://github.com/nicobailon/pi-mcp-adapter |
| 5 | Polyglot LLM | 90 | https://github.com/eleutherai/polyglot — Next |

---

## VALIDATION & VERIFICATION (WSJF 80–89)

| # | Item | WSJF | Pointer |
|---|------|------|---------|
| 6 | Stryker mutation | 88 | `stryker.conf.js` → `scripts/policy/governance.py`; `npm run test:mutation` |
| 7 | Contract enforcement | 85 | `scripts/contract-enforcement-gate.sh verify` — `.contract-enforcement/audit-trail.jsonl` |
| 8 | Deep CSQBM | 82 | `scripts/validators/project/check-csqbm.sh` (`CSQBM_DEEP_WHY`, lookback) |

---

## TELEMETRY & CAUSALITY (WSJF 70–79)

| # | Item | WSJF | Pointer |
|---|------|------|---------|
| 9 | HostBill / STX | 78 | `scripts/ci/hostbill-sync-agent.py` → `.goalie/hostbill_ledger.json` |
| 10 | Governance engine | 75 | `scripts/policy/governance.py` — AdmissionController + DI — `tests/test_governance_admission.py` |
| 11 | AgentDB freshness | 72 | `.agentdb/agentdb.sqlite` + CSQBM; &lt;96h per covenant |

---

## CAPABILITY MIGRATION & EXTERNAL (WSJF 50–69)

**Parked detail (full bullets):** snapshot file § §12–17 — ElizaOS, risk-analytics, TLD tunnel (`scripts/start-tld-tunnel.sh`, `.tld-config`), StarlingX STX-11, OpenCode, MCP ecosystem links.

---

## RESEARCH & EMERGING (WSJF 30–49)

**Parked detail (full bullets):** snapshot file § §18–23 — AlphaEvolve, TurboQuant / DGM docs under `docs/TURBOQUANT-DGM-METRICS-2026-03-28.md`, NotebookLM CLI, VisionClaw skills, agentic-jujutsu.

---

## Before next merge (checklist)

- [ ] `npm run typecheck` && `npm run lint`
- [ ] `pytest tests/test_governance_admission.py` (or full suite if governance touched)
- [ ] `TRUST_GIT=/usr/bin/git bash scripts/validate-foundation.sh --trust-path` → Merge GO + trust bundle GREEN
- [ ] AgentDB / CASE_REGISTRY freshness per CSQBM

---

*WSJF rescore after each cycle; demoted rows remain recoverable from `.goalie/backlog_snapshots/2026-04-03/`.*
