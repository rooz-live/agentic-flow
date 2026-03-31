#!/usr/bin/env python3
"""Compare hybrid reward presets over a trajectories file.

This script is read-only: it never modifies the trajectories file. It mirrors the
hybrid reward computation used by build_trajectories.compute_reward_value and
prints a compact comparative table for the main named presets.
"""

from __future__ import annotations

import argparse
import csv
import importlib.util
import json
import math
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _load_build_module() -> Any:
    """Load build_trajectories.py as a module to reuse reward logic."""

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
    parser = argparse.ArgumentParser(
        description="Compare hybrid reward presets over a trajectories JSONL file",
    )
    parser.add_argument(
        "--trajectories",
        type=Path,
        default=Path(".goalie/trajectories.jsonl"),
        help="Path to trajectories JSONL file (default: .goalie/trajectories.jsonl)",
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
        "--format",
        choices=["table", "json", "csv"],
        default="table",
        help="Output format: table (default), json, or csv",
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
                    print(
                        f"[compare_presets] skipping malformed line {lineno}",
                        file=sys.stderr,
                    )
                continue
            if not isinstance(rec, dict):
                continue

            if cycle is not None or min_cycle is not None or max_cycle is not None:
                idx = rec.get("cycle_index")
                if not isinstance(idx, int):
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
        return {
            "min": math.nan,
            "max": math.nan,
            "mean": math.nan,
            "median": math.nan,
            "std": math.nan,
        }

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


def _duration_stats(values: List[float]) -> Dict[str, float]:
    if not values:
        return {"min": math.nan, "mean": math.nan, "p95": math.nan, "max": math.nan}

    vals = sorted(values)
    n = len(vals)
    v_min = vals[0]
    v_max = vals[-1]
    mean = sum(vals) / n
    idx = max(0, min(n - 1, int(math.ceil(0.95 * n) - 1)))
    p95 = vals[idx]
    return {"min": v_min, "mean": mean, "p95": p95, "max": v_max}


def _clean_float_for_json(value: float) -> Optional[float]:
    """Convert NaN/inf to None so JSON output stays valid."""

    if not isinstance(value, (int, float)):
        return None
    if isinstance(value, float) and (math.isnan(value) or not math.isfinite(value)):
        return None
    return float(value)


def _format_float_for_csv(value: float) -> str:
    """Format floats for CSV, using empty string for NaN/inf."""

    if not isinstance(value, (int, float)):
        return ""
    if isinstance(value, float) and (math.isnan(value) or not math.isfinite(value)):
        return ""
    return f"{float(value):.4f}"


def main() -> None:
    args = parse_args()
    build_mod = _load_build_module()
    compute_reward_value = getattr(build_mod, "compute_reward_value")
    reward_presets: Dict[str, Tuple[float, float]] = getattr(
        build_mod, "REWARD_PRESETS", {}
    )

    default_presets = [
        "status_dominant",
        "latency_sensitive",
        "balanced",
        "governance_conservative",
    ]
    presets = [name for name in default_presets if name in reward_presets]
    if not presets:
        print("[compare_presets] no known presets found in REWARD_PRESETS", file=sys.stderr)
        sys.exit(1)

    trajectories = load_trajectories(
        args.trajectories,
        verbose=args.verbose,
        cycle=args.cycle,
        min_cycle=args.min_cycle,
        max_cycle=args.max_cycle,
    )
    total_steps = len(trajectories)

    rows = []
    for name in presets:
        max_duration, alpha = reward_presets[name]
        rewards: List[float] = []
        status_counts: Dict[str, int] = {}
        durations_all: List[float] = []
        durations_success: List[float] = []
        durations_failure: List[float] = []

        for rec in trajectories:
            reward = rec.get("reward")
            if not isinstance(reward, dict):
                continue
            status = str(reward.get("status") or "")
            duration_ms = reward.get("duration_ms")
            if not isinstance(duration_ms, (int, float)) or duration_ms < 0:
                if args.verbose:
                    print(
                        "[compare_presets] skipping entry with invalid duration_ms:",
                        duration_ms,
                        file=sys.stderr,
                    )
                continue

            duration = float(duration_ms)
            value = float(
                compute_reward_value(
                    status=status,
                    duration_ms=duration,
                    max_duration_ms=float(max_duration),
                    alpha=float(alpha),
                )
            )
            rewards.append(value)

            key = status.strip().lower() or "unknown"
            status_counts[key] = status_counts.get(key, 0) + 1
            durations_all.append(duration)
            if key == "success":
                durations_success.append(duration)
            elif key == "failure":
                durations_failure.append(duration)

        reward_stats = summarize(rewards)
        dur_all = _duration_stats(durations_all)
        dur_success = _duration_stats(durations_success)
        dur_failure = _duration_stats(durations_failure)
        rows.append((name, reward_stats, status_counts, dur_all, dur_success, dur_failure))

    if args.format == "table":
        print("Reward preset comparison:")
        print(f"  Trajectories file: {args.trajectories}")
        if args.cycle is not None or args.min_cycle is not None or args.max_cycle is not None:
            print(
                "  Cycle filter:",
                f"cycle={args.cycle!r} min_cycle={args.min_cycle!r} max_cycle={args.max_cycle!r}",
            )
        else:
            print("  Cycle filter: (none)")
        print(f"  Total steps after filtering: {total_steps}")

        header = (
            "Preset             "
            "R_min   R_max   R_mean  R_med   R_std   "
            "Succ  Fail  Dur_mean(all)  Dur_mean(succ)  Dur_mean(fail)"
        )
        print("\nComparison table:")
        print(header)
        print("-" * len(header))

        for name, stats, status_counts, dur_all, dur_success, dur_failure in rows:
            succ = status_counts.get("success", 0)
            fail = status_counts.get("failure", 0)
            line = (
                f"{name:<18}"
                f"{stats['min']:.4f} {stats['max']:.4f} {stats['mean']:.4f} "
                f"{stats['median']:.4f} {stats['std']:.4f}  "
                f"{succ:4d} {fail:4d}  "
                f"{dur_all['mean']:.1f}           "
                f"{dur_success['mean']:.1f}             "
                f"{dur_failure['mean']:.1f}"
            )
            print(line)
        return

    if args.format == "json":
        now = datetime.utcnow().isoformat() + "Z"
        metadata = {
            "trajectories_file": str(args.trajectories),
            "cycle": args.cycle,
            "min_cycle": args.min_cycle,
            "max_cycle": args.max_cycle,
            "total_steps": total_steps,
            "timestamp": now,
        }
        presets_payload = []
        for name, stats, status_counts, dur_all, dur_success, dur_failure in rows:
            reward_stats_clean = {
                k: _clean_float_for_json(v) for k, v in stats.items()
            }
            duration_all_clean = {
                k: _clean_float_for_json(v) for k, v in dur_all.items()
            }
            duration_success_clean = {
                k: _clean_float_for_json(v) for k, v in dur_success.items()
            }
            duration_failure_clean = {
                k: _clean_float_for_json(v) for k, v in dur_failure.items()
            }
            payload = {
                "name": name,
                "reward_stats": reward_stats_clean,
                "status_counts": {
                    "success": int(status_counts.get("success", 0)),
                    "failure": int(status_counts.get("failure", 0)),
                },
                "duration_stats": {
                    "all": duration_all_clean,
                    "success": duration_success_clean,
                    "failure": duration_failure_clean,
                },
            }
            presets_payload.append(payload)

        obj = {"metadata": metadata, "presets": presets_payload}
        print(json.dumps(obj, indent=2, sort_keys=False))
        return

    if args.format == "csv":
        fieldnames = [
            "preset_name",
            "reward_min",
            "reward_max",
            "reward_mean",
            "reward_median",
            "reward_std",
            "success_count",
            "failure_count",
            "duration_all_mean",
            "duration_success_mean",
            "duration_failure_mean",
        ]
        writer = csv.DictWriter(sys.stdout, fieldnames=fieldnames)
        writer.writeheader()
        for name, stats, status_counts, dur_all, dur_success, dur_failure in rows:
            succ = int(status_counts.get("success", 0))
            fail = int(status_counts.get("failure", 0))
            row = {
                "preset_name": name,
                "reward_min": _format_float_for_csv(stats["min"]),
                "reward_max": _format_float_for_csv(stats["max"]),
                "reward_mean": _format_float_for_csv(stats["mean"]),
                "reward_median": _format_float_for_csv(stats["median"]),
                "reward_std": _format_float_for_csv(stats["std"]),
                "success_count": str(succ),
                "failure_count": str(fail),
                "duration_all_mean": _format_float_for_csv(dur_all["mean"]),
                "duration_success_mean": _format_float_for_csv(dur_success["mean"]),
                "duration_failure_mean": _format_float_for_csv(dur_failure["mean"]),
            }
            writer.writerow(row)
        return


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    try:
        main()
    except Exception as exc:  # pragma: no cover - defensive wrapper
        print(f"[compare_presets] error: {exc}", file=sys.stderr)
        sys.exit(1)
