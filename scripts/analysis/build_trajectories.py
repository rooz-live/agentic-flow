#!/usr/bin/env python3
"""Build offline RL trajectories from .goalie/metrics_log.jsonl."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class RunBuffers:
    states: Dict[int, Dict[str, Any]] = field(default_factory=dict)
    actions: Dict[int, Dict[str, Any]] = field(default_factory=dict)
    rewards: Dict[int, Dict[str, Any]] = field(default_factory=dict)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create decision-transformer trajectories")
    parser.add_argument(
        "--log-file",
        type=Path,
        default=Path(".goalie/metrics_log.jsonl"),
        help="Path to metrics log (default: .goalie/metrics_log.jsonl)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".goalie/trajectories.jsonl"),
        help="Output file for trajectories (JSONL or Parquet depending on --format)",
    )
    parser.add_argument(
        "--format",
        choices=("jsonl", "parquet"),
        default="jsonl",
        help="Output format",
    )
    parser.add_argument(
        "--min-cycles",
        type=int,
        default=1,
        help="Minimum number of state entries per run to include",
    )
    return parser.parse_args()


def load_metrics(log_file: Path) -> Dict[str, RunBuffers]:
    buffers: Dict[str, RunBuffers] = defaultdict(RunBuffers)
    total_lines = 0
    if not log_file.exists():
        raise FileNotFoundError(f"Metrics log not found: {log_file}")

    with log_file.open("r", encoding="utf-8") as handle:
        for line in handle:
            total_lines += 1
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                print(f"[warn] skipping malformed line {total_lines}", file=sys.stderr)
                continue

            run_id = record.get("run_id")
            cycle = record.get("cycle_index")
            event_type = record.get("type")
            if not run_id or cycle is None or event_type not in {"state", "action", "reward"}:
                continue

            buf = buffers[run_id]
            payload = dict(record)
            payload.pop("type", None)
            payload.pop("run_id", None)

            if event_type == "state":
                buf.states[cycle] = payload
            elif event_type == "action":
                buf.actions[cycle] = payload
            else:
                buf.rewards[cycle] = payload

    if total_lines == 0:
        raise RuntimeError(f"Metrics log {log_file} is empty")

    return buffers


def build_trajectories(buffers: Dict[str, RunBuffers], min_cycles: int) -> List[Dict[str, Any]]:
    trajectories: List[Dict[str, Any]] = []
    for run_id, buf in buffers.items():
        if len(buf.states) < min_cycles:
            continue
        cycles = sorted(buf.states.keys())
        for idx, cycle in enumerate(cycles):
            state = buf.states.get(cycle)
            action = buf.actions.get(cycle)
            reward = buf.rewards.get(cycle)
            next_state: Optional[Dict[str, Any]] = None
            if idx + 1 < len(cycles):
                next_state = buf.states.get(cycles[idx + 1])

            entry = {
                "run_id": run_id,
                "cycle_index": cycle,
                "state": state,
                "action": action,
                "reward": reward,
                "next_state": next_state,
            }
            trajectories.append(entry)
    return trajectories


def write_output(
    trajectories: List[Dict[str, Any]], output: Path, output_format: str
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    if output_format == "jsonl":
        with output.open("w", encoding="utf-8") as handle:
            for row in trajectories:
                handle.write(json.dumps(row) + "\n")
        print(f"Wrote {len(trajectories)} trajectories to {output}")
        return

    try:
        import pandas as pd  # type: ignore
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "pandas is required for Parquet output. Install pandas and pyarrow."
        ) from exc

    df = pd.DataFrame(trajectories)
    try:
        import pyarrow  # type: ignore  # noqa: F401
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("pyarrow is required for Parquet output.") from exc

    df.to_parquet(output, index=False)
    print(f"Wrote {len(df)} trajectories to {output} (Parquet)")


def summarize(trajectories: List[Dict[str, Any]]) -> None:
    runs = {}
    for entry in trajectories:
        run_id = entry["run_id"]
        runs.setdefault(run_id, 0)
        runs[run_id] += 1

    if not runs:
        print("No trajectories generated", file=sys.stderr)
        return

    print(f"Runs included: {len(runs)}")
    print(f"Average sequence length: {sum(runs.values())/len(runs):.2f} cycles")
    missing_action = sum(1 for t in trajectories if t["action"] is None)
    missing_reward = sum(1 for t in trajectories if t["reward"] is None)
    print(f"Entries missing actions: {missing_action}")
    print(f"Entries missing rewards: {missing_reward}")


def main() -> None:
    args = parse_args()
    buffers = load_metrics(args.log_file)
    trajectories = build_trajectories(buffers, args.min_cycles)
    write_output(trajectories, args.output, args.format)
    summarize(trajectories)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # pragma: no cover - CLI script
        print(f"[build_trajectories] error: {exc}", file=sys.stderr)
        sys.exit(1)
