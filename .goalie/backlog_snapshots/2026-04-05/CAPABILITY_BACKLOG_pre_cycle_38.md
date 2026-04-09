# CAPABILITY BACKLOG — WSJF live index (truncated)

**Generated:** 2026-04-04Z (hygiene cycle)  
**Sort:** Cost of Delay ÷ Job Size (highest first)  
**Full pre-truncate copy (restorable):** `.goalie/backlog_snapshots/2026-04-04/CAPABILITY_BACKLOG.md`

---

## CRITICAL TRUST BLOCKERS (WSJF 95–100)

| # | Item | WSJF | Pointer |
|---|------|------|---------|
| 1 | Superproject git health | 100 | Anchor work in healthy tree `projects/investing/agentic-flow`; superproject merge NO-GO until tree rehydrated — `.goalie/go_no_go_ledger.md` |
| 2 | Agentic QE / Verification | 100 | Ensure CI executes `npm run test:mutation` and `scripts/contract-enforcement-gate.sh verify` seamlessly |

---

## INFRASTRUCTURE & GATES (WSJF 90–94)

| # | Item | WSJF | Pointer |
|---|------|------|---------|
| 3 | Local Agentic (opencode) | 95 | Fully localized, boundless execution ring using `opencode-ai` + Qwen/DeepSeek architecture |
| 4 | Deep CSQBM | 92 | `scripts/validators/project/check-csqbm.sh` (`CSQBM_DEEP_WHY`, lookback) |

---

## TELEMETRY & CAUSALITY (WSJF 70–79)

| # | Item | WSJF | Pointer |
|---|------|------|---------|
| 5 | HostBill / STX.12 Prep | 78 | `scripts/ci/hostbill-sync-agent.py` → `.goalie/hostbill_ledger.json` |

---

## Before next merge (checklist)

- [ ] `npm run typecheck` && `npm run lint`
- [ ] `TRUST_GIT=/usr/bin/git bash scripts/validate-foundation.sh --trust-path` → Merge GO + trust bundle GREEN
- [ ] AgentDB / CASE_REGISTRY freshness per CSQBM

---

*WSJF rescore after each cycle; demoted rows remain recoverable from `.goalie/backlog_snapshots/`.*
