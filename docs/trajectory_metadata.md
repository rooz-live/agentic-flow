# Prod-Cycle Trajectory Dataset

This note describes how `scripts/analysis/build_trajectories.py` converts
`.goalie/metrics_log.jsonl` into Decision Transformer friendly sequences and what
quality guarantees the downstream agents can expect.

## Source Events
- `action` events: emitted before each `af full-cycle …` invocation.
- `state` events: emitted after each cycle with pattern metrics, ROAM deltas,
  safe-degrade stats, guardrail health, budgets, and observability counts.
- `reward` events: emitted after each cycle with execution status and latency.

Governance middleware now exports real `AF_PC_*` counters so the state payloads
reflect actual pattern behaviour instead of placeholders.

## Schema per trajectory row
Each trajectory entry contains:

| Field | Description |
| --- | --- |
| `run_id` | UUID for a prod-cycle run. |
| `cycle_index` | Iteration index within the run. |
| `state` | Raw state event payload minus the `type`/`run_id` fields. Includes `metrics.safe_degrade.*`, `metrics.circle_risk_focus.*`, `metrics.guardrail_lock.*`, `metrics.iteration_budget.*`, `metrics.observability_first.*`, and `governor_health.*`. |
| `action` | Matching action payload (command, target) if emitted for that cycle. |
| `reward` | Reward payload (duration, status) if present. |
| `next_state` | The following state snapshot (or `null` for the terminal step). |

## Data-quality checks
1. **Run coverage**: CLI prints the number of runs and the average trajectory length.
2. **Missing action/reward counters**: Script reports how many entries lack paired
   action/reward events so you can filter or impute downstream.
3. **Malformed line detection**: Invalid JSON lines are skipped with stderr warnings.
4. **Minimum cycle filter**: `--min-cycles` flag drops short/incomplete runs.
5. **Format validation**: Parquet output requires `pandas` + `pyarrow`; JSONL path has no extra deps.

## Usage
```
python scripts/analysis/build_trajectories.py \
  --log-file .goalie/metrics_log.jsonl \
  --output .goalie/trajectories.jsonl \
  --format jsonl \
  --min-cycles 3
```

The output lives beside the metrics log by default and can be fed directly into
DT preprocessing pipelines for normalization, bucketing, and batching.

## Next steps for Decision Transformer prep
- Aggregate at least 100–200 runs across different circles/depths for adequate
  coverage.
- Normalize continuous signals (risk scores, duration) and bucket categorical
  ones (circle, pattern flags) before training.
- Establish evaluation harness that replays historical trajectories and compares
  transformer recommendations with the existing shell heuristics.
- Track offline model metrics (return, incident reduction) and log them back to
  `.goalie/metrics_log.jsonl` to close the loop.
