---
date: 2026-03-10
status: accepted
deciders: ["shahrooz"]
supersedes: null
tests: ["tunnel-url-tracker.sh", "cascade-tunnel.sh multi-ledger"]
---

# ADR-018: Subdomain Selection for Multi-Ledger Tunnel Hierarchy

## Context

The system requires publicly accessible URLs for the legal dashboard with a hierarchical
ledger structure. Each ledger level (ROOT, GATEWAY, EVIDENCE, PROCESS) needs a memorable
subdomain that optimizes for:
- Muscle memory (character count)
- Legal domain semantics
- Cliodynamic stability (etymological depth)

## Decision

**PROCESS ledger subdomain: `file.rooz.live`**

### WSJF Analysis

| Candidate | Chars | Cliodynamics | BV | TC | RR | Size | WSJF |
|-----------|-------|--------------|----|----|----|----|------|
| **file** | 4 | Roman *facere* (ancient) | 90 | 95 | 85 | 4 | **95.0** ✅ |
| arb | 3 | Modern ADR (20th century) | 80 | 90 | 75 | 3 | 81.7 |
| brief | 5 | English common law | 75 | 80 | 80 | 5 | 47.0 |
| motion | 6 | Procedural mechanics | 60 | 70 | 70 | 6 | 33.3 |
| claim | 5 | Modern formalization | 70 | 75 | 70 | 5 | 43.0 |

### Complete Hierarchy

| Ledger | Subdomain | Exit Code | Purpose |
|--------|-----------|-----------|---------|
| ROOT | `law.rooz.live` | 150 | Legal aggregate root |
| GATEWAY | `pur.tag.vote` | 151 | WSJF/email validation |
| EVIDENCE | `hab.yo.life` | 152 | Habitability evidence |
| PROCESS | `file.720.chat` | 153 | Filing/execution layer |

## Rationale

1. **"file" is the fundamental atomic legal action** - Filing is universal across all legal
   systems (Roman *facere* → "to do/make" → medieval *filare* → "to string documents").

2. **Arbitration is a process TYPE; filing IS the process** - `arb` is case-specific (ADR),
   while `file` encompasses all actions: complaints, motions, briefs, appeals.

3. **4 characters = optimal muscle memory** - Below the 5-char threshold for instant recall.

4. **Exit code 153 alignment** - Maps directly to the PROCESS ledger in the semantic exit
   code system (zone 150-199 = Business Logic Errors).

## Consequences

- All tunnel scripts updated to use `file.rooz.live` for PROCESS ledger
- Dashboard links reflect the new subdomain hierarchy
- Exit code 153 (`EXIT_LEDGER_FILE`) reserved for filing/execution failures

## Related

- ADR-007: Dashboard Tunnel Strategy
- Exit code registry: `exit-codes-robust.sh`
- Tunnel orchestrator: `cascade-tunnel.sh multi-ledger`

