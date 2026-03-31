#!/usr/bin/env python3
"""Preview hybrid reward distributions for existing trajectories.

This script is read-only: it never modifies the trajectories file. It computes
hybrid reward values using the same formula as build_trajectories.compute_reward_value
and prints summary statistics and a small leaderboard of highest/lowest rewards.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import importlib.util


@dataclass
class RewardSample:
    run_id: str
    cycle_index: int
    status: str
    duration_ms: float
    reward_value: float


def _load_build_module() -> Any:
    """Load build_trajectories.py as a module to reuse compute_reward_value.

    We avoid importing via package name to keep this script robust to how the
    repo is laid out on disk.
    """

    script_dir = Path(__file__).resolve().parent
    build_path = script_dir / "build_trajectories.py"
    if not build_path.is_file():
        raise FileNotFoundError(f"build_trajectories.py not found at {build_path}")

    spec = importlib.util.spec_from_file_location("_build_trajectories_module", build_path)
    if spec is None or spec.loader is None:  # pragma: no cover
        raise RuntimeError("Failed to create module spec for build_trajectories.py")

    module = importlib.util.module_from_spec(spec)
    # Ensure dataclasses and other runtime introspection see this module.
    import sys as _sys

    _sys.modules[spec.name] = module
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Preview hybrid rewards for trajectories")
    parser.add_argument(
        "--trajectories",
        type=Path,
        default=Path(".goalie/trajectories.jsonl"),
        help="Path to trajectories JSONL file (default: .goalie/trajectories.jsonl)",
    )
    parser.add_argument(
        "--max-duration",
        type=float,
        default=60000.0,
        help=(
            "Maximum duration in milliseconds for reward computation "
            "when no preset is specified (default: 60000.0)"
        ),
    )
    parser.add_argument(
        "--alpha",
        type=float,
        default=0.5,
        help=(
            "Weight between status and speed factors in hybrid reward (0.0–1.0) "
            "when no preset is specified"
        ),
    )
    parser.add_argument(
        "--preset",
        type=str,
        help=(
            "Named reward preset from build_trajectories.REWARD_PRESETS; "
            "overrides --max-duration and --alpha when set."
        ),
    )
    parser.add_argument(
        "--cycle",
        type=int,
        help="Filter to exact cycle_index value (optional)",
    )
    parser.add_argument(
        "--min-cycle",
        type=int,
        help="Filter to minimum cycle_index (inclusive, optional)",
    )
    parser.add_argument(
        "--max-cycle",
        type=int,
        help="Filter to maximum cycle_index (inclusive, optional)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging/warnings",
    )
    return parser.parse_args()


def load_trajectories(
    path: Path,
    verbose: bool = False,
    cycle: Optional[int] = None,
    min_cycle: Optional[int] = None,
    max_cycle: Optional[int] = None,
) -> List[Dict[str, Any]]:
    if not path.is_file():
        raise FileNotFoundError(f"Trajectories file not found: {path}")

    records: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for lineno, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                if verbose:
                    print(f"[preview_rewards] skipping malformed line {lineno}", file=sys.stderr)
                continue
            if not isinstance(rec, dict):
                continue

            # Apply optional cycle-based filtering if any filter is provided.
            if cycle is not None or min_cycle is not None or max_cycle is not None:
                idx = rec.get("cycle_index")
                if not isinstance(idx, int):
                    # Skip records without a valid integer cycle_index when filtering.
                    continue
                if cycle is not None and idx != cycle:
                    continue
                if min_cycle is not None and idx < min_cycle:
                    continue
                if max_cycle is not None and idx > max_cycle:
                    continue

            records.append(rec)
    return records


def summarize(values: List[float]) -> Dict[str, float]:
    if not values:
        return {"min": math.nan, "max": math.nan, "mean": math.nan, "median": math.nan, "std": math.nan}

    vals = sorted(values)
    n = len(vals)
    v_min = vals[0]
    v_max = vals[-1]
    mean = sum(vals) / n
    if n % 2:
        median = vals[n // 2]
    else:
        median = 0.5 * (vals[n // 2 - 1] + vals[n // 2])
    var = sum((v - mean) ** 2 for v in vals) / n
    std = math.sqrt(var)
    return {"min": v_min, "max": v_max, "mean": mean, "median": median, "std": std}


def build_histogram(values: List[float]) -> List[int]:
    """Build a simple 5-bin histogram over [0.0, 1.0]."""

    bins = [0, 0, 0, 0, 0]
    if not values:
        return bins
    for v in values:
        if v < 0.0:
            idx = 0
        elif v >= 1.0:
            idx = 4
        else:
            idx = min(int(v * 5), 4)
        bins[idx] += 1
    return bins


def compute_duration_stats(
    samples: List[RewardSample],
    status_filter: Optional[str] = None,
) -> Dict[str, float]:
    """Compute duration_ms statistics (min, mean, p95, max) over RewardSample list.

    When status_filter is provided, only samples whose normalized status matches
    the filter (case-insensitive) are included.
    """

    if status_filter is not None:
        target = status_filter.strip().lower()
        durations = [
            s.duration_ms
            for s in samples
            if (s.status or "").strip().lower() == target
        ]
    else:
        durations = [s.duration_ms for s in samples]

    if not durations:
        return {"min": math.nan, "mean": math.nan, "p95": math.nan, "max": math.nan}

    vals = sorted(durations)
    n = len(vals)
    v_min = vals[0]
    v_max = vals[-1]
    mean = sum(vals) / n
    # Simple percentile: nearest-rank with clamp.
    idx = max(0, min(n - 1, int(math.ceil(0.95 * n) - 1)))
    p95 = vals[idx]
    return {"min": v_min, "mean": mean, "p95": p95, "max": v_max}


def main() -> None:
    args = parse_args()
    build_mod = _load_build_module()
    compute_reward_value = getattr(build_mod, "compute_reward_value")
    reward_presets = getattr(build_mod, "REWARD_PRESETS", {})

    if args.preset:
        preset_name = args.preset
        if preset_name not in reward_presets:
            available = ", ".join(sorted(reward_presets)) or "<none>"
            print(
                f"[preview_rewards] unknown preset '{preset_name}'. "
                f"Available presets: {available}",
                file=sys.stderr,
            )
            sys.exit(1)
        max_duration = float(reward_presets[preset_name][0])
        alpha = float(reward_presets[preset_name][1])
    else:
        max_duration = args.max_duration
        alpha = args.alpha

    trajectories = load_trajectories(
        args.trajectories,
        verbose=args.verbose,
        cycle=args.cycle,
        min_cycle=args.min_cycle,
        max_cycle=args.max_cycle,
    )

    samples: List[RewardSample] = []
    status_counts: Dict[str, int] = {}

    for rec in trajectories:
        reward = rec.get("reward")
        if not isinstance(reward, dict):
            continue
        status = str(reward.get("status") or "")
        duration_ms = reward.get("duration_ms")
        if not isinstance(duration_ms, (int, float)) or duration_ms < 0:
            if args.verbose:
                print(
                    "[preview_rewards] skipping entry with invalid duration_ms: "
                    f"{duration_ms}",
                    file=sys.stderr,
                )
            continue

        value = float(
            compute_reward_value(
                status=status,
                duration_ms=float(duration_ms),
                max_duration_ms=max_duration,
                alpha=alpha,
            )
        )
        run_id = str(rec.get("run_id") or "")
        cycle_index = int(rec.get("cycle_index") or 0)
        samples.append(
            RewardSample(
                run_id=run_id,
                cycle_index=cycle_index,
                status=status,
                duration_ms=float(duration_ms),
                reward_value=value,
            )
        )
        key = status.strip().lower() or "unknown"
        status_counts[key] = status_counts.get(key, 0) + 1

    print("Reward Preview:")
    print(f"  Trajectories file: {args.trajectories}")
    print(f"  Total steps: {len(trajectories)}")
    print(f"  Steps with computed rewards: {len(samples)}")

    values = [s.reward_value for s in samples]
    stats = summarize(values)

    print("\n  Reward statistics:")
    print(f"    Min:   {stats['min']:.4f}")
    print(f"    Max:   {stats['max']:.4f}")
    print(f"    Mean:  {stats['mean']:.4f}")
    print(f"    Median:{stats['median']:.4f}")
    print(f"    Std:   {stats['std']:.4f}")

    duration_all = compute_duration_stats(samples)
    duration_success = compute_duration_stats(samples, status_filter="success")
    duration_failure = compute_duration_stats(samples, status_filter="failure")

    print("\n  Duration statistics (duration_ms):")
    print("    All steps:")
    print(f"      Min:   {duration_all['min']:.1f}")
    print(f"      Mean:  {duration_all['mean']:.1f}")
    print(f"      P95:   {duration_all['p95']:.1f}")
    print(f"      Max:   {duration_all['max']:.1f}")

    print("    Successes only:")
    print(f"      Min:   {duration_success['min']:.1f}")
    print(f"      Mean:  {duration_success['mean']:.1f}")
    print(f"      P95:   {duration_success['p95']:.1f}")
    print(f"      Max:   {duration_success['max']:.1f}")

    print("    Failures only:")
    print(f"      Min:   {duration_failure['min']:.1f}")
    print(f"      Mean:  {duration_failure['mean']:.1f}")
    print(f"      P95:   {duration_failure['p95']:.1f}")
    print(f"      Max:   {duration_failure['max']:.1f}")

    bins = build_histogram(values)
    ranges = ["[0.0,0.2)", "[0.2,0.4)", "[0.4,0.6)", "[0.6,0.8)", "[0.8,1.0]"]
    print("\n  Histogram (hybrid reward.value):")
    for label, count in zip(ranges, bins):
        print(f"    {label}: {count}")

    print("\n  By status:")
    for key, count in sorted(status_counts.items()):
        print(f"    {key or 'unknown'}: {count}")

    if samples:
        sorted_samples = sorted(samples, key=lambda s: s.reward_value)
        print("\n  Top 5 lowest rewards:")
        for s in sorted_samples[:5]:
            print(
                f"    {s.reward_value:.4f} | run_id={s.run_id} cycle={s.cycle_index} "
                f"status={s.status} duration_ms={s.duration_ms:.0f}"
            )

        print("\n  Top 5 highest rewards:")
        for s in reversed(sorted_samples[-5:]):
            print(
                f"    {s.reward_value:.4f} | run_id={s.run_id} cycle={s.cycle_index} "
                f"status={s.status} duration_ms={s.duration_ms:.0f}"
            )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # pragma: no cover - CLI script
        print(f"[preview_rewards] error: {exc}", file=sys.stderr)
        sys.exit(1)
