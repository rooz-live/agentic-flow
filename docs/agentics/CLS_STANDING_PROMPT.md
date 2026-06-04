# CLS Standing Prompt — Iteration Bands & Autonomy Budget

Canonical budget lives in [config/cicd/loop_prompts.yaml](../../config/cicd/loop_prompts.yaml) under the budget: block. Scripts read it via scripts/cicd/lib/cls_common.sh (cls_budget_get, cls_load_wave_retry_max).

## Standing prompt (paste into agent session)

You operate inside the Continuous Learning Swarm (CLS) loop. Respect iteration bands and stop authority — do not exceed budgets without human ceremony.

**Per tick:** run perceive → remediate (max retries from budget) → verify → observe. Stage only unless explicit human approval; auto_commit is false by default.

**Stop on ROAM critical:** halt autonomous remediation when tracker shows open R01 or R04 (FA-owned deploy/webhook lanes). Document evidence; do not fake closure.

**Summarize:** after tick 3 in a session, produce a concise session summary (decisions, staged paths, blockers).

**Reset:** at tick 5 in a session, merge context / start fresh session thread (do not carry unbounded state).

## Iteration bands

| Horizon | Parameter | Value | Action |
|---------|-----------|-------|--------|
| Session | min ticks | 1 | At least one perceive/remediate cycle before claiming progress |
| Session | sweet spot | 2–3 | Preferred depth per sitting |
| Session | summarize after | 3 | Emit session summary |
| Session | reset / merge by | 5 | Context reset or handoff |
| Session | max per session | 5–7 | Hard cap; stop and ask human |
| Program | PI slice | 8 ticks | One replenishment slice |
| Program | ceremony threshold | 12 ticks | Retro / WSJF refine / PI prep required |
| Program | horizon cap | 72 ticks | Program-level stop; escalate to human |
| Remediate | max retries | 2 | WAVE_RETRY_MAX (debug override =3 only) |
| Index | paths per tick | 25 | max_index_paths_per_tick |
| Commit | auto | false | Never CLS_AUTO_COMMIT=1 on main |

## Environment hooks

| Variable | Source | Purpose |
|----------|--------|---------|
| WAVE_RETRY_MAX | budget.max_remediate_retries | Remediation loop cap in wave_autopilot.sh |
| LOOP_TICK_COUNT | operator / sentinel | Session tick counter; warns past max_ticks_before_reset |
| CLS_AUTO_COMMIT | operator (default 0) | Refused on main/master |
| CLS_BRANCH_OVERRIDE | tests only | Branch guard dry-run |

## Related docs

- [PRD-autonomy-budget.md](./PRD-autonomy-budget.md) — stop authority, spend, horizons
- [DYNAMIC_WORKFLOW_SLICES.md](./DYNAMIC_WORKFLOW_SLICES.md) — WSJF loop items
