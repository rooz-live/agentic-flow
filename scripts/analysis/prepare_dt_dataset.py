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
    parser.add_argument(
        "--summary-only",
        action="store_true",
        help=(
            "Only print dataset summary statistics; do not write JSONL/NPZ "
            "outputs. Exits with code 1 when no valid datapoints are found."
        ),
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print detailed feature and normalization information in summary mode",
    )
    parser.add_argument(
        "--validate-schema",
        action="store_true",
        help=(
            "Validate feature names against the DT schema registry before "
            "writing outputs."
        ),
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
    """Extract rich state features for DT.

    The schema is fixed and backward-compatible: all expected keys are always
    present, with sensible defaults when the underlying signal is missing.
    """

    gov = state.get("governor_health") or {}
    metrics = state.get("metrics") or {}
    risk_dist = state.get("risk_distribution") or {}
    patterns = state.get("patterns") or {}

    features: Dict[str, float] = {}

    # Core structural context
    features["cycle_index"] = float(cycle_index)

    risk = gov.get("risk_score")
    if isinstance(risk, (int, float)):
        features["risk_score"] = float(risk)
    else:
        features["risk_score"] = 0.0

    circle = state.get("circle")
    features["circle_bucket"] = float(
        CIRCLES.index(circle) if circle in CIRCLES else -1,
    )

    depth = state.get("depth")
    features["depth"] = float(depth) if isinstance(depth, (int, float)) else 0.0

    avg_score = metrics.get("average_score")
    features["average_score"] = (
        float(avg_score) if isinstance(avg_score, (int, float)) else 0.0
    )

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

    # Risk distribution by circle (0.0 default when not present).
    for circle_name in CIRCLES:
        key = f"risk_{circle_name}"
        value = risk_dist.get(circle_name)
        features[key] = float(value) if isinstance(value, (int, float)) else 0.0

    # Helper to interpret pattern activity in a tolerant way.
    def _is_active(val: Any) -> bool:
        if isinstance(val, bool):
            return val
        if isinstance(val, (int, float)):
            return val != 0
        if isinstance(val, str):
            return val.lower() in {"active", "on", "true", "yes", "1"}
        return False

    pattern_map = {
        "safe-degrade": "pattern_safe_degrade",
        "depth-ladder": "pattern_depth_ladder",
        "circle-risk-focus": "pattern_circle_risk_focus",
        "autocommit-shadow": "pattern_autocommit_shadow",
        "guardrail-lock": "pattern_guardrail_lock",
        "failure-strategy": "pattern_failure_strategy",
        "iteration-budget": "pattern_iteration_budget",
        "observability-first": "pattern_observability_first",
    }
    for raw_key, feat_name in pattern_map.items():
        val = patterns.get(raw_key)
        features[feat_name] = 1.0 if _is_active(val) else 0.0

    # Governor health metrics beyond risk_score.
    recent_incidents = gov.get("recent_incidents")
    features["governor_recent_incidents"] = (
        float(recent_incidents)
        if isinstance(recent_incidents, (int, float))
        else 0.0
    )

    def _bool_to_float(v: Any) -> float:
        if isinstance(v, bool):
            return 1.0 if v else 0.0
        if isinstance(v, (int, float)):
            return 1.0 if v != 0 else 0.0
        if isinstance(v, str):
            return 1.0 if v.lower() in {"true", "yes", "on", "active", "1"} else 0.0
        return 0.0

    features["governor_throttle_active"] = _bool_to_float(
        gov.get("throttle_active"),
    )
    features["governor_safe_degrade_active"] = _bool_to_float(
        gov.get("safe_degrade_active"),
    )
    features["governor_guardrail_active"] = _bool_to_float(
        gov.get("guardrail_active"),
    )

    # Any additional numeric fields in governor_health get a namespaced feature.
    for k, v in gov.items():
        if k in {"status", "risk_score", "recent_incidents", "throttle_active", "safe_degrade_active", "guardrail_active"}:
            continue
        if isinstance(v, (int, float)):
            features[f"governor_{k}"] = float(v)

    return features


def extract_action_features(
    action: Dict[str, Any] | None,
    action_vocab: Dict[str, int],
) -> Dict[str, float]:
    """Extract rich action features for DT.

    The schema is designed to be stable: even when ``action`` is ``None`` we
    emit all core keys with sentinel defaults so that feature vectors remain
    aligned across timesteps.
    """

    # Base schema with defaults, used both for None and real actions.
    base: Dict[str, float] = {
        "action_id": -1.0,
        "action_target": 0.0,
        "action_circle": -1.0,
        "action_depth": 0.0,
    }

    if action is None:
        return dict(base)

    cmd = action.get("command") or "unknown"
    if cmd not in action_vocab:
        action_vocab[cmd] = len(action_vocab)
    action_id = action_vocab[cmd]

    features: Dict[str, float] = dict(base)
    features["action_id"] = float(action_id)

    target = action.get("target")
    if isinstance(target, (int, float)):
        features["action_target"] = float(target)

    circle = action.get("circle")
    features["action_circle"] = float(
        CIRCLES.index(circle) if circle in CIRCLES else -1,
    )

    depth = action.get("depth")
    if isinstance(depth, (int, float)):
        features["action_depth"] = float(depth)

    # Additional numeric parameters on the action payload get namespaced
    # features so they can be learned independently.
    blacklist = {
        "command",
        "target",
        "circle",
        "depth",
        "timestamp",
        "type",
    }
    for key, value in action.items():
        if key in blacklist:
            continue
        if isinstance(value, (int, float)):
            features[f"action_param_{key}"] = float(value)

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
    List[str],
    List[str],
]:
    """Build per-timestep records and raw feature matrices.

    This is used for normalization and DT offline training preparation.

    Returns
    -------
    records:
        Per-timestep metadata (run_id, t, reward, rtg).
    state_vecs, action_vecs:
        Dense feature matrices aligned with ``state_feature_names`` and
        ``action_feature_names``.
    rewards:
        Flat list of reward values.
    action_vocab:
        Mapping from action command string to integer id.
    state_feature_names, action_feature_names:
        Ordered feature name lists reflecting the actual keys observed in the
        trajectories.
    """

    records: List[Dict[str, Any]] = []
    state_dicts: List[Dict[str, float]] = []
    action_dicts: List[Dict[str, float]] = []
    rewards: List[float] = []
    action_vocab: Dict[str, int] = {}

    for run_id, steps in episodes.items():
        episode_rewards: List[float] = []
        ep_state_dicts: List[Dict[str, float]] = []
        ep_action_dicts: List[Dict[str, float]] = []

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

            ep_state_dicts.append(s_feats)
            ep_action_dicts.append(a_feats)
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
            state_dicts.append(ep_state_dicts[t])
            action_dicts.append(ep_action_dicts[t])
            rewards.append(episode_rewards[t])

    # Derive a consistent feature ordering from the actual data.
    state_keys: set[str] = set()
    action_keys: set[str] = set()
    for feats in state_dicts:
        state_keys.update(feats.keys())
    for feats in action_dicts:
        action_keys.update(feats.keys())

    state_feature_names = sorted(state_keys)
    action_feature_names = sorted(action_keys)

    # Build dense feature matrices aligned with the above names, defaulting
    # missing values to 0.0 for backward compatibility.
    state_vecs = [
        [feats.get(name, 0.0) for name in state_feature_names]
        for feats in state_dicts
    ]
    action_vecs = [
        [feats.get(name, 0.0) for name in action_feature_names]
        for feats in action_dicts
    ]

    return (
        records,
        state_vecs,
        action_vecs,
        rewards,
        action_vocab,
        state_feature_names,
        action_feature_names,
    )


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

    try:
        trajectories = load_trajectories(args.trajectories)
    except FileNotFoundError:
        print(
            "[dt-dataset-summary] No trajectories found. Run a prod-cycle first.",
            file=sys.stderr,
        )
        sys.exit(1)
    except RuntimeError as exc:
        print(f"[prepare_dt_dataset] {exc}", file=sys.stderr)
        sys.exit(1)

    episodes = group_episodes(trajectories)

    (
        records,
        state_vecs,
        action_vecs,
        rewards,
        action_vocab,
        state_feature_names,
        action_feature_names,
    ) = build_sequences(episodes)

    total_episodes = len(episodes)
    total_steps = len(records)

    if not records:
        print(
            "[dt-dataset-summary] No valid DT datapoints (all rewards malformed).",
            file=sys.stderr,
        )
        if args.summary_only:
            # Print a structured summary with zero datapoints for easier debugging.
            print("DT Dataset Summary:")
            print(f"  Episodes: {total_episodes}")
            print(f"  Total steps: {total_steps}")
            print("  Average episode length: 0.00")
            print("")
            print("  Rewards:")
            print("    Count: 0")
            print("    Range: [0.0000, 0.0000]")
            print("    Mean: 0.0000, Std: 0.0000")
            print("")
            print("  Actions:")
            print("    Vocabulary size: 0")
            print("    Sample commands: ")
            print("")
            print("  State Features: 0")
            if args.verbose:
                print("    Names: ")
            print("  Action Features: 0")
            if args.verbose:
                print("    Names: ")
            print("")
            print("  Normalization:")
            print("    State means (first 5): []")
            print("    State stds (first 5): []")
            print("    Action means (first 5): []")
            print("    Action stds (first 5): []")
            sys.exit(1)
        return

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
        "schema_id": "dt-schema-v1",
        "state_feature_names": state_feature_names,
        "action_feature_names": action_feature_names,
        "action_vocab": action_vocab,
        "state_means": state_means,
        "state_stds": state_stds,
        "action_means": action_means,
        "action_stds": action_stds,
        "total_steps": len(records),
    }

    if args.validate_schema:
        from importlib import util as _importlib_util

        schema_module_path = Path(__file__).resolve().parents[2] / "dt_schema.py"
        if not schema_module_path.is_file():
            print(
                f"[error] schema module not found at {schema_module_path}",
                file=sys.stderr,
            )
            sys.exit(1)

        spec = _importlib_util.spec_from_file_location(
            "dt_schema",
            schema_module_path,
        )
        if spec is None or spec.loader is None:
            print("[error] failed to load dt_schema module", file=sys.stderr)
            sys.exit(1)

        dt_schema = _importlib_util.module_from_spec(spec)
        spec.loader.exec_module(dt_schema)  # type: ignore[arg-type]

        try:
            schema = dt_schema.load_schema("dt-schema-v1")
            is_valid, issues = dt_schema.validate_feature_alignment(
                schema,
                state_feature_names,
                action_feature_names,
            )
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[error] schema validation failed: {exc}", file=sys.stderr)
            sys.exit(1)

        if issues:
            print("[schema] validation issues:", file=sys.stderr)
            for msg in issues:
                print(f"  - {msg}", file=sys.stderr)

        if not is_valid:
            sys.exit(1)

    if args.summary_only:
        avg_episode_length = (
            float(total_steps) / float(total_episodes)
            if total_episodes > 0
            else 0.0
        )

        if rewards:
            if np is not None:
                r_arr = np.asarray(rewards, dtype="float32")
                min_reward = float(r_arr.min())
                max_reward = float(r_arr.max())
                mean_reward = float(r_arr.mean())
                std_reward = float(r_arr.std())
            else:
                min_reward = float(min(rewards))
                max_reward = float(max(rewards))
                mean_reward = float(sum(rewards) / len(rewards))
                var = sum((r - mean_reward) ** 2 for r in rewards) / max(
                    len(rewards) - 1,
                    1,
                )
                std_reward = math.sqrt(max(var, 0.0))
        else:
            min_reward = max_reward = mean_reward = std_reward = 0.0

        print("DT Dataset Summary:")
        print(f"  Episodes: {total_episodes}")
        print(f"  Total steps: {total_steps}")
        print(f"  Average episode length: {avg_episode_length:.2f}")
        print("")
        print("  Rewards:")
        print(f"    Count: {len(rewards)}")
        print(f"    Range: [{min_reward:.4f}, {max_reward:.4f}]")
        print(f"    Mean: {mean_reward:.4f}, Std: {std_reward:.4f}")
        print("")
        print("  Actions:")
        print(f"    Vocabulary size: {len(action_vocab)}")
        sample_cmds = ", ".join(sorted(action_vocab.keys())[:10])
        print(f"    Sample commands: {sample_cmds}")
        print("")
        print(f"  State Features: {len(state_feature_names)}")
        if args.verbose:
            print("    Names: " + ", ".join(state_feature_names))
        print(f"  Action Features: {len(action_feature_names)}")
        if args.verbose:
            print("    Names: " + ", ".join(action_feature_names))
        print("")
        print("  Normalization:")
        print(f"    State means (first 5): {state_means[:5]}")
        print(f"    State stds (first 5): {state_stds[:5]}")
        print(f"    Action means (first 5): {action_means[:5]}")
        print(f"    Action stds (first 5): {action_stds[:5]}")

        if total_steps <= 0:
            sys.exit(1)
        sys.exit(0)

    total_episodes = len(episodes)
    avg_len = len(records) / max(total_episodes or 1, 1)

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

    print(
        f"Dataset summary: episodes={total_episodes}, "
        f"steps={len(records)}, avg-episode-length={avg_len:.2f}",
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[prepare_dt_dataset] error: {exc}", file=sys.stderr)
        sys.exit(1)
