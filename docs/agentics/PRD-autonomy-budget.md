# PRD: CLS Autonomy Budget

## Problem

Unbounded agent loops burn context, produce scope creep, and bypass FA-owned ROAM lanes. We need explicit iteration bands and stop authority wired into config, scripts, and tests.

## Goals

1. Encode session vs program horizons in config/cicd/loop_prompts.yaml (budget:).
2. Scripts consume budget (WAVE_RETRY_MAX, tick warnings, main-branch commit guard).
3. Contract tests enforce schema and refusal behavior.

## Non-goals

- Automatic commits on protected branches.
- Closing R01/R04 without human/FA verification.
- Replacing WSJF item selection (still dynamic via wsjf_now_items).

## Stop authority

| Trigger | Behavior |
|---------|----------|
| stop_on_roam_critical: [R01, R04] | Agent stops autonomous remediation; document blocker |
| max_remediate_retries: 2 | wave_autopilot exits remediate loop |
| auto_commit: false | No commit unless human sets CLS_AUTO_COMMIT=1 (never on main) |
| Session max_ticks_per_session: 7 | Operator stops loop |
| Program horizon_cap_ticks: 72 | Escalate to PI ceremony / human |

## Horizons

**Session (single sitting):** 1 min → 2–3 sweet → summarize @3 → reset @5 → max 7.

**Program (PI slice):** 8 ticks per slice, 12 max before ceremony, 72 program cap.

## Remaining steps / spend signals

- LOOP_TICK_COUNT compared to session.max_ticks_before_reset (warn in run_loop_tick.sh).
- Perceive/compliance exit codes remain termination gates (termination_requires in loop_prompts).
- Index slice bounded by max_index_paths_per_tick: 25 (P1-INDEX-02 substrate).

## Config reference

See budget: in [config/cicd/loop_prompts.yaml](../../config/cicd/loop_prompts.yaml).

## Verification

```bash
bash tests/cicd/test_autonomy_budget.sh
bash tests/cicd/test_wave_autopilot_contract.sh
bash tests/cicd/test_cls_manifest_canonical.sh
```
