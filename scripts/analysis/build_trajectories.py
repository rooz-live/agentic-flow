#!/usr/bin/env python3
"""Build offline RL trajectories from .goalie/metrics_log.jsonl."""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class RunBuffers:
    states: Dict[int, Dict[str, Any]] = field(default_factory=dict)
    actions: Dict[int, Dict[str, Any]] = field(default_factory=dict)
    rewards: Dict[int, Dict[str, Any]] = field(default_factory=dict)


def _ensure_canonical_reward(
    reward_entry: Optional[Dict[str, Any]],
    state_entry: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Guarantee the reward payload carries reward.value for DT prep.

    Older metrics rows only recorded status/duration. We synthesize a composite
    reward that mirrors emit_metrics.py's weighting so validate_dt_dataset and
    prepare_dt_dataset can consume historical data.
    """

    if not reward_entry:
        return None

    reward_block = reward_entry.get("reward")
    if isinstance(reward_block, dict) and isinstance(
        reward_block.get("value"), (int, float)
    ):
        return reward_entry

    # Copy to avoid mutating the original buffer payload
    reward_payload = dict(reward_entry)

    status = str(reward_payload.get("status") or "").lower()
    if status in {"success", "completed", "ok"}:
        success_term = 1.0
    elif status in {"failure", "error", "blocked"}:
        success_term = -1.0
    else:
        success_term = 0.0

    duration_term = 0.0
    duration_ms = reward_payload.get("duration_ms")
    if isinstance(duration_ms, (int, float)) and duration_ms > 0:
        # Favor shorter iterations: 0.0 at target duration, negative when much longer.
        TARGET_MS = 120_000  # 2 minutes
        clamped = min(float(duration_ms), TARGET_MS * 2)
        duration_term = 1.0 - (clamped / TARGET_MS)
        duration_term = max(-1.0, min(1.0, duration_term))

    roam_term = 0.0
    if state_entry:
        metrics = state_entry.get("metrics") or {}
        roam_val = metrics.get("circle_risk_focus.roam_reduction")
        if isinstance(roam_val, (int, float)):
            roam_term = max(-1.0, min(1.0, float(roam_val)))

    reward_value = (
        1.0 * success_term + 0.2 * duration_term + 0.3 * roam_term
    )

    reward_payload["reward"] = {
        "value": reward_value,
        "components": {
            "success": success_term,
            "duration": duration_term,
            "roam": roam_term,
        },
    }

    return reward_payload


def compute_reward_value(
    status: str,
    duration_ms: float,
    max_duration_ms: float = 60000.0,
    alpha: float = 0.5,
) -> float:
    """Compute hybrid reward.value from status and duration.

    The reward is a convex combination of a binary status factor and a
    time-efficiency factor:

    - ``status_factor`` is 1.0 for success, 0.0 for failure, and 0.5 for other
      statuses.
    - ``speed_factor`` is 1.0 for zero duration and decreases linearly to 0.0
      at ``max_duration_ms`` (clamped for longer durations).

    The final reward is::

        reward = status_factor * (alpha + (1.0 - alpha) * speed_factor)

    which is always in the range [0.0, 1.0].

    Examples (alpha=0.5, max_duration_ms=60000)::

        compute_reward_value("success", 0)       -> ~1.0
        compute_reward_value("success", 60000)   -> ~0.5
        compute_reward_value("failure", 1000)    -> 0.0
    """

    status_norm = (status or "").strip().lower()
    if status_norm == "success":
        status_factor = 1.0
    elif status_norm == "failure":
        status_factor = 0.0
    else:
        status_factor = 0.5

    duration = max(0.0, float(duration_ms))
    max_d = max(1.0, float(max_duration_ms))
    speed_factor = 1.0 - min(duration / max_d, 1.0)

    alpha_clamped = min(max(alpha, 0.0), 1.0)
    return status_factor * (alpha_clamped + (1.0 - alpha_clamped) * speed_factor)

# Named reward parameter presets for compute_reward_value.
# Each preset maps to (max_duration_ms, alpha).
REWARD_PRESETS: Dict[str, Tuple[float, float]] = {
    "status_dominant": (80_000.0, 0.85),
    "latency_sensitive": (38_000.0, 0.5),
    "balanced": (60_000.0, 0.5),
    "governance_conservative": (60_000.0, 0.4),
}





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
    parser.add_argument(
        "--compute-reward-value",
        action="store_true",
        help=(
            "Compute hybrid reward.value for each step based on status and "
            "duration_ms; leaves structure unchanged when disabled."
        ),
    )
    parser.add_argument(
        "--reward-max-duration",
        type=float,
        default=60000.0,
        help=(
            "Maximum duration in milliseconds for reward computation; "
            "durations longer than this are treated as this value."
        ),
    )
    parser.add_argument(
        "--reward-alpha",
        type=float,
        default=0.5,
        help=(
            "Weight between status and speed factors in hybrid reward "
            "computation (0.0–1.0)."
        ),
    )
    parser.add_argument(
        "--reward-preset",
        type=str,
        choices=sorted(REWARD_PRESETS.keys()),
        help=(
            "Named hybrid reward preset; overrides --reward-max-duration and "
            "--reward-alpha when provided."
        ),
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
            reward = _ensure_canonical_reward(
                buf.rewards.get(cycle),
                state,
            )
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

    if args.reward_preset:
        max_duration_ms, alpha = REWARD_PRESETS[args.reward_preset]
        print(
            f"[build_trajectories] using reward preset '{args.reward_preset}' "
            f"(max_duration_ms={max_duration_ms}, alpha={alpha})",
            file=sys.stderr,
        )
        args.reward_max_duration = max_duration_ms
        args.reward_alpha = alpha

    buffers = load_metrics(args.log_file)
    trajectories = build_trajectories(buffers, args.min_cycles)

    reward_values: List[float] = []
    status_counts: Dict[str, int] = defaultdict(int)

    if args.compute_reward_value:
        for entry in trajectories:
            reward = entry.get("reward")
            if not isinstance(reward, dict):
                continue

            status = str(reward.get("status") or "")
            duration_ms = reward.get("duration_ms")
            if not isinstance(duration_ms, (int, float)) or duration_ms < 0:
                print(
                    "[build_trajectories] skipping reward computation for "
                    f"entry with invalid duration_ms: {duration_ms}",
                    file=sys.stderr,
                )
                continue

            value = compute_reward_value(
                status=status,
                duration_ms=float(duration_ms),
                max_duration_ms=args.reward_max_duration,
                alpha=args.reward_alpha,
            )
            reward["value"] = value
            reward_values.append(value)

            status_key = (status or "").strip().lower() or "unknown"
            status_counts[status_key] += 1

    write_output(trajectories, args.output, args.format)
    summarize(trajectories)

    if args.compute_reward_value and reward_values:
        total_steps = len(trajectories)
        values_sorted = sorted(reward_values)
        n = len(values_sorted)
        min_v = values_sorted[0]
        max_v = values_sorted[-1]
        mean_v = sum(values_sorted) / n
        if n % 2:
            median_v = values_sorted[n // 2]
        else:
            median_v = 0.5 * (values_sorted[n // 2 - 1] + values_sorted[n // 2])
        var = sum((v - mean_v) ** 2 for v in values_sorted) / n
        std_v = math.sqrt(var)

        print("Reward summary (hybrid reward.value):")
        print(f"  Total steps: {total_steps}")
        print(f"  Steps with computed reward: {n}")
        print(f"  Min: {min_v:.4f}, Max: {max_v:.4f}")
        print(f"  Mean: {mean_v:.4f}, Median: {median_v:.4f}, Std: {std_v:.4f}")
        print("  By status:")
        for status_key, count in sorted(status_counts.items()):
            print(f"    {status_key}: {count}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # pragma: no cover - CLI script
        print(f"[build_trajectories] error: {exc}", file=sys.stderr)
        sys.exit(1)
