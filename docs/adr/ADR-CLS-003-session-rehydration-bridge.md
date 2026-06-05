# ADR-CLS-003: Session Rehydration Bridge (BT-9)

## Status
Accepted — 2026-06-05

## Context
Long-horizon CLS loops accumulate chat history, causing rule-drift (Anti-CVT) and
divergent remediation cascades. The IDE owns thread memory; shell autopilot cannot
force a clean session. Hundreds of ticks in one chat is unsustainable.

## Decision
1. **Write path**: `write_tick_rehydration_manifest.sh` serializes tick state to
   `.goalie/evidence/learning/rehydration_*.json` + `rehydration_latest.json`
   (schema `cls.rehydration.v1`).
2. **Read path**: `session_rehydration_reader.sh` emits `AGENT_REHYDRATION_CLS` on
   session start / loop tick — fresh threads load manifest only, not prior chat.
3. **Budget hooks**: `cls_warn_session_tick_budget` warns at `sweet_spot_ticks` (3)
   and `max_ticks_before_reset` (5); `cls_session_reset_callback` POSTs to
   `CLS_HOST_RESET_URL` when host API exists (fail-open today).
4. **Cursor hook**: `.cursor/hooks/cls-session-rehydration.sh` on `sessionStart`
   injects compact rehydration context when manifest present.

## Consequences
- Horizontal scale = federated 3–5 tick PRs + squash merge + new session, not one chat.
- FA still owns commit, phase2_signoff, SSH deploy (zero-trust ceremonies).
- ROAM R01/R04 remain separate from billing perceive (ADR-CLS-001 dual-edge truth).
- Host auto-reset deferred until IDE exposes `POST /session/reset`.

## References
- `config/cicd/loop_prompts.yaml` → `budget.rehydration`
- `docs/agentics/PRD-autonomy-budget.md`
- Breakthrough queue: **BT-9**
