#!/usr/bin/env python3
"""Validate Decision Transformer trajectories.

Reads .goalie/trajectories.jsonl (stitched by stitch_trajectories.py) and
computes basic statistics to assess training readiness for a Decision
Transformer-style offline RL setup.

- Handles missing files gracefully (prints info, exits 0).
- Uses only stdlib (no RL libs).
- Supports optional --json output.
"""

import argparse
import json
import os
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def find_goalie_dir() -> Optional[Path]:
    script_path = Path(__file__).resolve()
    project_root = script_path.parents[2]
    goalie = project_root / ".goalie"
    if goalie.exists():
        return goalie
    cwd_goalie = Path(os.getcwd()) / ".goalie"
    if cwd_goalie.exists():
        return cwd_goalie
    return None


def read_trajectories(path: Path) -> List[Dict[str, Any]]:
    trajectories: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            trajectories.append(obj)
    return trajectories


def group_episodes(trajectories: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    by_run: Dict[str, List[Tuple[int, Dict[str, Any]]]] = defaultdict(list)
    for t in trajectories:
        run_id = t.get("run_id") or "unknown"
        idx = t.get("cycle_index")
        if idx is None:
            # Fallback: derive from state.iteration
            state = t.get("state") or {}
            idx = state.get("iteration")
        if idx is None:
            continue
        by_run[run_id].append((int(idx), t))

    episodes: Dict[str, List[Dict[str, Any]]] = {}
    for run_id, items in by_run.items():
        sorted_items = [t for _, t in sorted(items, key=lambda x: x[0])]
        episodes[run_id] = sorted_items
    return episodes


def horizon_histogram(lengths: List[int]) -> Dict[str, int]:
    buckets = {
        "1-5": 0,
        "6-10": 0,
        "11-15": 0,
        "16+": 0,
    }
    for L in lengths:
        if L <= 5:
            buckets["1-5"] += 1
        elif L <= 10:
            buckets["6-10"] += 1
        elif L <= 15:
            buckets["11-15"] += 1
        else:
            buckets["16+"] += 1
    return buckets


def extract_rewards(episodes: Dict[str, List[Dict[str, Any]]]) -> Tuple[List[float], int, int]:
    """Extract canonical reward.value values and track malformed entries.

    The canonical schema is a dict with a numeric `value` field. Any other
    structure is treated as malformed for DT readiness purposes.
    """

    values: List[float] = []
    total = 0
    malformed = 0
    for steps in episodes.values():
        for t in steps:
            reward = t.get("reward")
            if reward is None:
                continue
            total += 1
            if isinstance(reward, dict) and isinstance(reward.get("value"), (int, float)):
                values.append(float(reward["value"]))
            else:
                malformed += 1
    return values, total, malformed


def reward_histogram(values: List[float], bins: int = 10) -> Dict[str, int]:
    if not values:
        return {}
    lo = min(values)
    hi = max(values)
    if lo == hi:
        return {f"[{lo:.3g}]": len(values)}
    width = (hi - lo) / bins
    counts: Dict[str, int] = {}
    for v in values:
        idx = int((v - lo) / width)
        if idx == bins:
            idx -= 1
        start = lo + idx * width
        end = start + width
        label = f"[{start:.3g}, {end:.3g})"
        counts[label] = counts.get(label, 0) + 1
    return counts


def analyze_state_features(episodes: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    field_counts: Counter = Counter()
    total_steps = 0
    for steps in episodes.values():
        for t in steps:
            state = t.get("state") or {}
            if not isinstance(state, dict):
                continue
            total_steps += 1
            for k in state.keys():
                field_counts[k] += 1
    coverage = {
        k: {
            "count": c,
            "fraction": c / total_steps if total_steps else 0.0,
        }
        for k, c in field_counts.items()
    }
    return {"total_state_steps": total_steps, "fields": coverage}


def analyze_actions(episodes: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    total_steps = 0
    non_null_actions = 0
    command_counts: Counter = Counter()
    type_counts: Counter = Counter()
    for steps in episodes.values():
        for t in steps:
            total_steps += 1
            action = t.get("action")
            if not action:
                continue
            non_null_actions += 1
            if isinstance(action, dict):
                cmd = action.get("command") or action.get("name")
                if cmd:
                    command_counts[cmd] += 1
                a_type = action.get("type")
                if a_type:
                    type_counts[a_type] += 1
    return {
        "total_steps": total_steps,
        "steps_with_action": non_null_actions,
        "action_step_fraction": (non_null_actions / total_steps) if total_steps else 0.0,
        "commands": dict(command_counts),
        "types": dict(type_counts),
    }


def validate_readiness(
    episode_lengths: List[int],
    rewards: List[float],
    thresholds: Dict[str, Any],
) -> Dict[str, List[str]]:
    """Apply readiness rules using the provided thresholds."""

    warnings: List[str] = []
    infos: List[str] = []

    min_episodes = int(thresholds.get("min_episodes", 10))
    max_var = float(thresholds.get("max_horizon_variance", 50.0))
    min_diversity = int(thresholds.get("min_reward_diversity", 2))

    episode_count = len(episode_lengths)
    if episode_count < min_episodes:
        warnings.append(
            f"Low episode count: {episode_count} (< {min_episodes}). "
            "Consider collecting more data."
        )
    else:
        infos.append(f"Episode count looks reasonable: {episode_count} episodes.")

    if episode_lengths:
        try:
            variance = statistics.pvariance(episode_lengths)
        except statistics.StatisticsError:
            variance = 0.0
        if variance > max_var:
            warnings.append(
                "High horizon variance: "
                f"{variance:.2f} (> {max_var}). "
                "Consider normalizing episode lengths or bucketing."
            )
        else:
            infos.append(f"Horizon variance is acceptable: {variance:.2f}.")

    if rewards:
        unique_rewards = len(set(round(r, 6) for r in rewards))
        if unique_rewards < min_diversity:
            warnings.append(
                "Reward signal has low diversity "
                f"({unique_rewards} < {min_diversity}). Offline RL may struggle."
            )
        else:
            infos.append(
                f"Reward signal has {unique_rewards} distinct values "
                f"(>= {min_diversity})."
            )
    else:
        warnings.append("No reward values found. DT will not have a learning signal.")

    return {"warnings": warnings, "info": infos}


def build_summary(
    episodes: Dict[str, List[Dict[str, Any]]],
    thresholds: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    episode_lengths = [len(steps) for steps in episodes.values()]
    rewards, total_reward_entries, malformed_rewards = extract_rewards(episodes)

    horizon: Dict[str, Any] = {
        "episode_count": len(episode_lengths),
        "lengths": {
            "min": min(episode_lengths) if episode_lengths else 0,
            "max": max(episode_lengths) if episode_lengths else 0,
            "mean": (
                statistics.mean(episode_lengths)
                if episode_lengths
                else 0.0
            ),
        },
        "histogram": horizon_histogram(episode_lengths),
    }

    if thresholds is None:
        thresholds = load_thresholds()

    reward_stats: Dict[str, Any]
    if rewards:
        reward_stats = {
            "count": len(rewards),
            "min": min(rewards),
            "max": max(rewards),
            "mean": statistics.mean(rewards),
            "median": statistics.median(rewards),
            "histogram": reward_histogram(rewards),
            "total_entries": total_reward_entries,
            "malformed_entries": malformed_rewards,
            "malformed_fraction": (
                malformed_rewards / total_reward_entries
                if total_reward_entries
                else 0.0
            ),
        }
    else:
        reward_stats = {
            "count": 0,
            "histogram": {},
            "total_entries": total_reward_entries,
            "malformed_entries": malformed_rewards,
            "malformed_fraction": (
                malformed_rewards / total_reward_entries
                if total_reward_entries
                else 0.0
            ),
        }

    state_features = analyze_state_features(episodes)
    actions = analyze_actions(episodes)
    readiness = validate_readiness(episode_lengths, rewards, thresholds)

    episodes_per_run = {
        run_id: len(steps)
        for run_id, steps in episodes.items()
    }

    return {
        "episode_stats": {
            "total_episodes": len(episode_lengths),
            "episodes_per_run": episodes_per_run,
            "average_episode_length": horizon["lengths"]["mean"],
        },
        "horizon": horizon,
        "rewards": reward_stats,
        "thresholds": thresholds,
        "state_features": state_features,
        "actions": actions,
        "readiness": readiness,
    }


def print_human(summary: Dict[str, Any]) -> None:
    ep = summary["episode_stats"]
    print("Decision Transformer Trajectories Validation")
    print("=========================================")
    print(f"Total episodes: {ep['total_episodes']}")
    print(f"Average episode length: {ep['average_episode_length']:.2f} steps")

    print("\nEpisodes per run_id:")
    for run_id, n in sorted(ep["episodes_per_run"].items()):
        print(f"  {run_id}: {n} steps")

    horizon = summary["horizon"]
    print("\nHorizon distribution:")
    print(f"  Min length: {horizon['lengths']['min']}")
    print(f"  Max length: {horizon['lengths']['max']}")
    print(f"  Mean length: {horizon['lengths']['mean']:.2f}")
    print("  Histogram:")
    for bucket, count in horizon["histogram"].items():
        print(f"    {bucket}: {count} episodes")

    rewards = summary["rewards"]
    print("\nReward distribution:")
    print(f"  Count: {rewards['count']}")
    if rewards["count"]:
        print(f"  Min: {rewards['min']:.4f}")
        print(f"  Max: {rewards['max']:.4f}")
        print(f"  Mean: {rewards['mean']:.4f}")
        print(f"  Median: {rewards['median']:.4f}")
        print("  Histogram buckets:")
        for bucket, count in rewards["histogram"].items():
            print(f"    {bucket}: {count}")
    else:
        print("  No reward values found.")

    sf = summary["state_features"]
    print("\nState feature coverage:")
    print(f"  Total state steps: {sf['total_state_steps']}")
    for name, meta in sorted(
        sf["fields"].items(), key=lambda item: -item[1]["count"]
    ):
        print(
            f"  {name}: {meta['count']} steps "
            f"({meta['fraction'] * 100:.1f}% of state steps)"
        )


def load_thresholds(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Load readiness thresholds from YAML or return defaults.

    This avoids a hard dependency on PyYAML by using a minimal parser for the
    expected structure when present; if parsing fails, defaults are used.
    """

    default = {
        "min_episodes": 10,
        "max_horizon_variance": 50.0,
        "min_reward_diversity": 2,
        "min_action_coverage": 0.1,
    }

    path: Optional[Path] = None
    if config_path:
        path = Path(config_path)
    else:
        goalie = find_goalie_dir()
        if goalie is not None:
            path = goalie / "dt_validation_thresholds.yaml"

    if not path or not path.exists():
        return default

    try:
        # Minimal, line-based YAML reader tailored to our simple schema
        out: Dict[str, Any] = dict(default)
        current_section: Optional[str] = None
        with path.open("r", encoding="utf-8") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                if line.endswith(":") and ":" not in line[:-1]:
                    current_section = line[:-1]
                    continue
                if ":" not in line:
                    continue
                key, value = [p.strip() for p in line.split(":", 1)]
                if current_section == "readiness_thresholds":
                    try:
                        if "." in value:
                            parsed: Any = float(value)
                        else:
                            parsed = int(value)
                    except ValueError:
                        try:
                            parsed = float(value)
                        except ValueError:
                            continue
                    out[key] = parsed
        return out
    except Exception:
        return default


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Validate Decision Transformer trajectories from "
            ".goalie/trajectories.jsonl"
        ),
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output JSON instead of human text",
    )
    parser.add_argument(
        "--thresholds",
        type=str,
        default=None,
        help=(
            "Optional path to dt_validation_thresholds.yaml; "
            "defaults to .goalie/dt_validation_thresholds.yaml when omitted."
        ),
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help=(
            "Enable strict mode: exit non-zero when malformed reward "
            "fraction or readiness warnings exceed tolerance."
        ),
    )
    parser.add_argument(
        "--tolerance",
        type=float,
        default=0.01,
        help=(
            "Maximum tolerated malformed reward fraction in strict mode "
            "(e.g. 0.01 for 1%)."
        ),
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)

    goalie = find_goalie_dir()
    if goalie is None:
        print(
            "Info: .goalie directory not found; no trajectories to validate.",
            file=sys.stderr,
        )
        return 0

    traj_path = goalie / "trajectories.jsonl"
    if not traj_path.exists():
        print(
            "Info: trajectories.jsonl not found at "
            f"{traj_path}; run stitch_trajectories.py first.",
            file=sys.stderr,
        )
        return 0

    trajectories = read_trajectories(traj_path)
    if not trajectories:
        print(
            "Info: trajectories.jsonl is empty or unreadable;\n"
            "nothing to validate.",
            file=sys.stderr,
        )
        return 0

    episodes = group_episodes(trajectories)

    thresholds_arg: Optional[str] = args.thresholds
    thresholds = load_thresholds(thresholds_arg)

    summary = build_summary(episodes, thresholds)

    # Strict-mode evaluation (informational-only by default)
    violations: List[str] = []
    malformed_fraction = summary["rewards"].get("malformed_fraction", 0.0)
    tolerance = float(args.tolerance)
    if malformed_fraction > tolerance:
        violations.append(
            f"Malformed reward fraction {malformed_fraction:.3f} exceeds "
            f"tolerance {tolerance:.3f}"
        )

    readiness = summary.get("readiness", {})
    for w in readiness.get("warnings", []):
        violations.append(w)

    strict_status = {
        "strict": bool(args.strict),
        "tolerance": tolerance,
        "violations": violations,
        "malformed_fraction": malformed_fraction,
    }
    summary["strict_status"] = strict_status

    if args.json:
        json.dump(summary, sys.stdout, indent=2, sort_keys=True)
        sys.stdout.write("\n")
    else:
        print_human(summary)
        if args.strict:
            print("\nStrict status:")
            print(f"  tolerance: {tolerance:.3f}")
            print(f"  malformed_fraction: {malformed_fraction:.3f}")
            if violations:
                print("  violations:")
                for v in violations:
                    print(f"    - {v}")
            else:
                print("  no violations")

    if args.strict and violations:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
