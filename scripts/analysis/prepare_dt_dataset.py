#!/usr/bin/env python3
"""Normalize Decision Transformer input features from trajectory JSONL."""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, DefaultDict, Dict, List, Tuple

try:
    import numpy as np
except Exception:  # pragma: no cover - numpy is optional
    np = None  # type: ignore[assignment]

CIRCLES = [
    "analyst",
    "assessor",
    "innovator",
    "intuitive",
    "orchestrator",
    "seeker",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare Decision Transformer offline dataset",
    )
    parser.add_argument(
        "--trajectories",
        type=Path,
        default=Path(".goalie/trajectories.jsonl"),
        help="Input trajectories JSONL (output of build_trajectories.py)",
    )
    parser.add_argument(
        "--output-jsonl",
        type=Path,
        default=Path(".goalie/dt_dataset.jsonl"),
        help="Per-timestep JSONL dataset output path",
    )
    parser.add_argument(
        "--output-npz",
        type=Path,
        default=Path(".goalie/dt_dataset.npz"),
        help="Optional NumPy .npz sequence dataset output path",
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
                print(
                    "[warn] skipping malformed trajectory row",
                    file=sys.stderr,
                )
    if not rows:
        raise RuntimeError("Trajectories file is empty")
    return rows


def group_episodes(
    trajectories: List[Dict[str, Any]],
) -> DefaultDict[str, List[Dict[str, Any]]]:
    """Group trajectory rows into episodes by run_id and sorted cycle_index."""

    episodes: DefaultDict[str, List[Dict[str, Any]]] = defaultdict(list)
    for t in trajectories:
        run_id = t.get("run_id") or "unknown"
        idx = t.get("cycle_index")
        if idx is None:
            state = t.get("state") or {}
            idx = state.get("iteration")
        if idx is None:
            continue
        episodes[run_id].append(t)

    for run_id, steps in episodes.items():
        steps.sort(key=lambda s: int(s.get("cycle_index") or 0))
    return episodes


def extract_state_features(
    state: Dict[str, Any],
    cycle_index: int,
) -> Dict[str, float]:
    gov = state.get("governor_health") or {}
    metrics = state.get("metrics") or {}

    features: Dict[str, float] = {}
    features["cycle_index"] = float(cycle_index)
    risk = gov.get("risk_score")
    if isinstance(risk, (int, float)):
        features["risk_score"] = float(risk)

    circle = state.get("circle")
    features["circle_bucket"] = float(
        CIRCLES.index(circle) if circle in CIRCLES else -1,
    )

    depth = state.get("depth")
    if isinstance(depth, (int, float)):
        features["depth"] = float(depth)

    avg_score = metrics.get("average_score")
    if isinstance(avg_score, (int, float)):
        features["average_score"] = float(avg_score)

    # Governance metrics flags (reused from previous version).
    features["safe_degrade_triggers"] = float(
        metrics.get("safe_degrade.triggers", 0),
    )
    features["guardrail_enforced"] = float(
        metrics.get("guardrail_lock.enforced", 0),
    )
    features["guardrail_requests"] = float(
        metrics.get("guardrail_lock.user_requests", 0),
    )
    features["iteration_budget_consumed"] = float(
        metrics.get("iteration_budget.consumed", 0),
    )
    features["observability_missing"] = float(
        metrics.get("observability_first.missing_signals", 0),
    )
    return features


def extract_action_features(
    action: Dict[str, Any] | None,
    action_vocab: Dict[str, int],
) -> Dict[str, float]:
    if action is None:
        return {"action_id": -1.0}

    cmd = action.get("command") or "unknown"
    if cmd not in action_vocab:
        action_vocab[cmd] = len(action_vocab)
    action_id = action_vocab[cmd]

    features: Dict[str, float] = {"action_id": float(action_id)}

    target = action.get("target")
    if isinstance(target, (int, float)):
        features["action_target"] = float(target)

    return features


def extract_reward_value(step: Dict[str, Any]) -> float | None:
    reward = step.get("reward")
    if isinstance(reward, dict) and isinstance(
        reward.get("value"), (int, float)
    ):
        return float(reward["value"])
    return None


def compute_normalization(
    feature_vectors: List[List[float]],
) -> Tuple[List[float], List[float]]:
    if not feature_vectors:
        return [], []

    dim = len(feature_vectors[0])
    sums = [0.0] * dim
    sq_sums = [0.0] * dim
    count = 0

    for vec in feature_vectors:
        if len(vec) != dim:
            continue
        count += 1
        for i, v in enumerate(vec):
            sums[i] += v
            sq_sums[i] += v * v

    means = [0.0] * dim
    stds = [1.0] * dim
    if count:
        for i in range(dim):
            mean = sums[i] / count
            var = max(sq_sums[i] / count - mean * mean, 0.0)
            std = math.sqrt(var) or 1.0
            means[i] = mean
            stds[i] = std
    return means, stds


def apply_normalization(
    vec: List[float],
    means: List[float],
    stds: List[float],
) -> List[float]:
    if not means or not stds or len(vec) != len(means):
        return vec
    return [
        (v - m) / s if s else 0.0
        for v, m, s in zip(vec, means, stds)
    ]


def compute_returns_to_go(rewards: List[float]) -> List[float]:
    rtg = [0.0] * len(rewards)
    running = 0.0
    for i in range(len(rewards) - 1, -1, -1):
        running += rewards[i]
        rtg[i] = running
    return rtg


def build_sequences(
    episodes: DefaultDict[str, List[Dict[str, Any]]],
) -> Tuple[
    List[Dict[str, Any]],
    List[List[float]],
    List[List[float]],
    List[float],
    Dict[str, int],
]:
    """Build per-timestep records and raw feature matrices.

    This is used for normalization and DT offline training preparation.
    """

    records: List[Dict[str, Any]] = []
    state_vecs: List[List[float]] = []
    action_vecs: List[List[float]] = []
    rewards: List[float] = []
    action_vocab: Dict[str, int] = {}

    for run_id, steps in episodes.items():
        episode_rewards: List[float] = []
        ep_state_vecs: List[List[float]] = []
        ep_action_vecs: List[List[float]] = []

        for t, step in enumerate(steps):
            state = step.get("state") or {}
            action = step.get("action")
            cycle_index = step.get("cycle_index") or t

            reward_val = extract_reward_value(step)
            if reward_val is None:
                print(
                    "[warn] skipping step without canonical reward.value",
                    file=sys.stderr,
                )
                continue

            s_feats = extract_state_features(state, int(cycle_index))
            a_feats = extract_action_features(action, action_vocab)

            s_vec = [v for _, v in sorted(s_feats.items())]
            a_vec = [v for _, v in sorted(a_feats.items())]

            ep_state_vecs.append(s_vec)
            ep_action_vecs.append(a_vec)
            episode_rewards.append(reward_val)

        if not episode_rewards:
            continue

        rtg = compute_returns_to_go(episode_rewards)

        for t in range(len(episode_rewards)):
            record = {
                "run_id": run_id,
                "t": t,
                "reward": episode_rewards[t],
                "rtg": rtg[t],
            }
            records.append(record)
            state_vecs.append(ep_state_vecs[t])
            action_vecs.append(ep_action_vecs[t])
            rewards.append(episode_rewards[t])

    return records, state_vecs, action_vecs, rewards, action_vocab


def write_jsonl_dataset(
    records: List[Dict[str, Any]],
    state_vecs: List[List[float]],
    action_vecs: List[List[float]],
    output: Path,
    state_feature_names: List[str],
    action_feature_names: List[str],
    metadata: Dict[str, Any],
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        for rec, s_vec, a_vec in zip(records, state_vecs, action_vecs):
            row = dict(rec)
            row["state_features"] = dict(
                zip(state_feature_names, s_vec),
            )
            row["action_features"] = dict(
                zip(action_feature_names, a_vec),
            )
            row["metadata"] = metadata
            handle.write(json.dumps(row) + "\n")
    print(f"Wrote {len(records)} DT datapoints to {output}")


def write_npz_dataset(
    records: List[Dict[str, Any]],
    state_vecs: List[List[float]],
    action_vecs: List[List[float]],
    rewards: List[float],
    rtgs: List[float],
    metadata: Dict[str, Any],
    output: Path,
) -> None:
    if np is None:
        print(
            "[info] numpy not available; skipping .npz dataset generation",
            file=sys.stderr,
        )
        return

    output.parent.mkdir(parents=True, exist_ok=True)

    state_arr = np.asarray(state_vecs, dtype="float32")
    action_arr = np.asarray(action_vecs, dtype="float32")
    reward_arr = np.asarray(rewards, dtype="float32")
    rtg_arr = np.asarray(rtgs, dtype="float32")

    if not (
        state_arr.shape[0]
        == action_arr.shape[0]
        == reward_arr.shape[0]
        == rtg_arr.shape[0]
    ):
        print(
            "[warn] mismatch in sequence lengths; skipping .npz output",
            file=sys.stderr,
        )
        return

    np.savez_compressed(
        output,
        state=state_arr,
        action=action_arr,
        reward=reward_arr,
        rtg=rtg_arr,
    )
    print(f"Wrote NumPy DT dataset to {output}")


def main() -> None:
    args = parse_args()
    trajectories = load_trajectories(args.trajectories)
    episodes = group_episodes(trajectories)

    records, state_vecs, action_vecs, rewards, action_vocab = build_sequences(
        episodes,
    )
    if not records:
        print(
            "[warn] no valid DT datapoints after filtering for canonical "
            "rewards",
            file=sys.stderr,
        )
        return

    state_feature_names = sorted(
        extract_state_features({}, 0).keys(),
    )
    action_feature_names = sorted(
        {"action_id": 0.0}.keys(),
    )

    state_means, state_stds = compute_normalization(state_vecs)
    action_means, action_stds = compute_normalization(action_vecs)

    norm_state_vecs = [
        apply_normalization(v, state_means, state_stds)
        for v in state_vecs
    ]
    norm_action_vecs = [
        apply_normalization(v, action_means, action_stds)
        for v in action_vecs
    ]

    rtgs = compute_returns_to_go(rewards)

    metadata: Dict[str, Any] = {
        "state_feature_names": state_feature_names,
        "action_feature_names": action_feature_names,
        "action_vocab": action_vocab,
        "state_means": state_means,
        "state_stds": state_stds,
        "action_means": action_means,
        "action_stds": action_stds,
        "total_steps": len(records),
    }

    write_jsonl_dataset(
        records,
        norm_state_vecs,
        norm_action_vecs,
        args.output_jsonl,
        state_feature_names,
        action_feature_names,
        metadata,
    )

    if args.min_runs:
        runs_seen = set(r.get("run_id") for r in records)
        if len(runs_seen) < args.min_runs:
            msg = (
                f"[warn] only {len(runs_seen)} runs found (< {args.min_runs})."
                " Collect more prod-cycle traces for robust DT training."
            )
            print(msg, file=sys.stderr)

    write_npz_dataset(
        records,
        norm_state_vecs,
        norm_action_vecs,
        rewards,
        rtgs,
        metadata,
        args.output_npz,
    )

    avg_len = len(records) / max(len(episodes) or 1, 1)
    print(
        f"Dataset summary: episodes={len(episodes)}, "
        f"steps={len(records)}, avg-episode-length={avg_len:.2f}",
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[prepare_dt_dataset] error: {exc}", file=sys.stderr)
        sys.exit(1)
