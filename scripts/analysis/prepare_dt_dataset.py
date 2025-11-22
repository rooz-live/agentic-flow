#!/usr/bin/env python3
"""Normalize Decision Transformer input features from trajectory JSONL."""

from __future__ import annotations

import argparse
import json
import math
import statistics
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

CIRCLES = ["analyst", "assessor", "innovator", "intuitive", "orchestrator", "seeker"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize DT training dataset")
    parser.add_argument(
        "--trajectories",
        type=Path,
        default=Path(".goalie/trajectories.jsonl"),
        help="Input trajectories JSONL (output of build_trajectories.py)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".goalie/dt_dataset.jsonl"),
        help="Normalized dataset output path",
    )
    parser.add_argument(
        "--min-runs",
        type=int,
        default=100,
        help="Minimum prod-cycle runs required before emitting dataset",
    )
    return parser.parse_args()


def load_trajectories(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Trajectories file not found: {path}")
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                print("[warn] skipping malformed trajectory row", file=sys.stderr)
    if not rows:
        raise RuntimeError("Trajectories file is empty")
    return rows


def collect_stats(rows: List[Dict[str, Any]]) -> Tuple[float, float, float, float]:
    risk_scores: List[float] = []
    durations: List[float] = []
    for row in rows:
        state = row.get("state") or {}
        gov = (state.get("governor_health") or {})
        risk = gov.get("risk_score")
        if isinstance(risk, (int, float)):
            risk_scores.append(float(risk))
        reward = row.get("reward") or {}
        duration = reward.get("duration_ms")
        if isinstance(duration, (int, float)):
            durations.append(float(duration))
    risk_mean = statistics.fmean(risk_scores) if risk_scores else 0.0
    risk_std = statistics.pstdev(risk_scores) if len(risk_scores) > 1 else 1.0
    dur_mean = statistics.fmean(durations) if durations else 0.0
    dur_std = statistics.pstdev(durations) if len(durations) > 1 else 1.0
    if math.isclose(risk_std, 0):
        risk_std = 1.0
    if math.isclose(dur_std, 0):
        dur_std = 1.0
    return risk_mean, risk_std, dur_mean, dur_std


def normalize(value: float, mean: float, std: float) -> float:
    return (value - mean) / std if std else 0.0


def circle_bucket(circle: str | None) -> int:
    if not circle:
        return -1
    try:
        return CIRCLES.index(circle)
    except ValueError:
        return -1


def flatten_metrics(state: Dict[str, Any]) -> Dict[str, Any]:
    metrics = state.get("metrics") or {}
    return {
        "safe_degrade_triggers": metrics.get("safe_degrade.triggers", 0),
        "guardrail_enforced": metrics.get("guardrail_lock.enforced", 0),
        "guardrail_requests": metrics.get("guardrail_lock.user_requests", 0),
        "iteration_budget_consumed": metrics.get("iteration_budget.consumed", 0),
        "observability_missing": metrics.get("observability_first.missing_signals", 0),
    }


def build_dataset(rows: List[Dict[str, Any]], stats: Tuple[float, float, float, float]) -> List[Dict[str, Any]]:
    risk_mean, risk_std, dur_mean, dur_std = stats
    dataset: List[Dict[str, Any]] = []
    runs_seen = set()
    for row in rows:
        state = row.get("state") or {}
        reward = row.get("reward") or {}
        gov = state.get("governor_health") or {}
        metrics = flatten_metrics(state)
        risk_score = gov.get("risk_score", 0.0)
        duration = reward.get("duration_ms", 0.0)
        record = {
            "run_id": row.get("run_id"),
            "cycle_index": row.get("cycle_index"),
            "circle_bucket": circle_bucket(state.get("circle")),
            "depth": state.get("depth"),
            "norm_risk_score": normalize(float(risk_score), risk_mean, risk_std),
            "norm_duration_ms": normalize(float(duration), dur_mean, dur_std),
            "safe_degrade_flag": 1 if metrics["safe_degrade_triggers"] else 0,
            "guardrail_enforced": metrics["guardrail_enforced"],
            "guardrail_requests": metrics["guardrail_requests"],
            "iteration_budget_consumed": metrics["iteration_budget_consumed"],
            "observability_missing": metrics["observability_missing"],
            "reward_status": reward.get("status", "unknown"),
        }
        dataset.append(record)
        runs_seen.add(row.get("run_id"))
    return dataset, runs_seen


def write_dataset(rows: List[Dict[str, Any]], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row) + "\n")
    print(f"Wrote {len(rows)} normalized datapoints to {output}")


def main() -> None:
    args = parse_args()
    trajectories = load_trajectories(args.trajectories)
    stats = collect_stats(trajectories)
    dataset, runs_seen = build_dataset(trajectories, stats)
    if len(runs_seen) < args.min_runs:
        print(
            f"[warn] only {len(runs_seen)} runs found (< {args.min_runs})."
            " Collect more prod-cycle traces for robust DT training.",
            file=sys.stderr,
        )
    write_dataset(dataset, args.output)
    print(
        f"Dataset summary: runs={len(runs_seen)}, avg-length={len(dataset)/(len(runs_seen) or 1):.2f}"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[prepare_dt_dataset] error: {exc}", file=sys.stderr)
        sys.exit(1)
