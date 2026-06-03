# My contributions (rooz-live fork)

Concise attribution for work on [rooz-live/agentic-flow](https://github.com/rooz-live/agentic-flow) — not a duplicate of upstream ruvnet marketing.

## CLS v2 — wave autopilot DAG

- `scripts/cicd/wave_autopilot.sh` — read → remediate → verify → observe DAG with bounded retries (`WAVE_RETRY_MAX`).
- Gate-scoped perceive: billing/public-edge perceive stays separate from FA-owned `interface.tag.vote` deploy lanes (see `tests/cicd/test_roam_edge_contract.sh`).
- `scripts/cicd/unstage_scope_creep.sh` — manifest-aware staging guard so INDEX slices do not sweep unrelated WIP.

## P1-INDEX-02 — substrate WSJF indexing

- `scripts/cicd/index_slice_substrate.sh` + `index_slice_allowlist.sh` — bounded WSJF substrate ticks (default 25 paths) with `.goalie/evidence/learning/index_substrate_manifest.json`.
- Contract: `tests/cicd/test_index_slice_substrate.sh`.

## ROAM — R-CLS synthesis

- `.goalie/ROAM_TRACKER_COG.yaml` — R-CLS rows linking CLS autopilot truth vs edge blockers (R01/R04 remain FA-owned).
- `tests/cicd/test_roam_edge_contract.sh` — TDD that autopilot cannot fake R01/R## closure.

## Trust spine — `one.sh`

- `scripts/one.sh` → `gate-one-pass.sh` trust-path shim; perceive metrics include `trust_artifact_ok` via `scripts/cicd/lib/cls_common.sh`.

## Verification

```bash
bash tests/cicd/test_roam_edge_contract.sh
bash tests/cicd/test_wave_autopilot_contract.sh
bash tests/cicd/test_index_slice_substrate.sh
bash scripts/cicd/wave_autopilot.sh
bash scripts/one.sh trust-path
```
