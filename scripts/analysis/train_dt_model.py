#!/usr/bin/env python3
"""Minimal Decision Transformer training script skeleton.

This focuses on wiring data loading and dry-run inspection to the existing
DT dataset format produced by prepare_dt_dataset.py. The actual model and
training loop are left as TODOs for future phases.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

try:
    import numpy as np
except Exception:  # pragma: no cover - numpy is optional
    np = None  # type: ignore[assignment]


@dataclass
class DTDataset:
    states: "np.ndarray"
    actions: "np.ndarray"
    rewards: "np.ndarray"
    rtgs: "np.ndarray"
    metadata: Dict[str, Any]
    episodes: List[List[int]]


def parse_args(argv: List[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Decision Transformer (skeleton)")
    parser.add_argument("--dataset-npz", type=Path, default=Path(".goalie/dt_dataset.npz"))
    parser.add_argument("--dataset-jsonl", type=Path, default=Path(".goalie/dt_dataset.jsonl"))
    parser.add_argument("--output-model", type=Path, default=Path(".goalie/dt_model.pt"))
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--context-length", type=int, default=20)
    parser.add_argument("--hidden-size", type=int, default=128)
    parser.add_argument("--num-layers", type=int, default=3)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--device", type=str, default="cpu")
    parser.add_argument("--dry-run", action="store_true", help="Inspect dataset and exit without training")
    return parser.parse_args(argv)


def load_dt_dataset(npz_path: Path, jsonl_path: Path) -> DTDataset:
    if np is None:
        raise RuntimeError("NumPy is required to load DT .npz dataset but is not available")
    if not npz_path.is_file():
        raise FileNotFoundError(f"DT dataset npz not found: {npz_path}")
    if not jsonl_path.is_file():
        raise FileNotFoundError(f"DT dataset jsonl not found: {jsonl_path}")

    data = np.load(npz_path, allow_pickle=False)
    states = data["state"]
    actions = data["action"]
    rewards = data["reward"]
    rtgs = data["rtg"]

    metadata: Dict[str, Any] | None = None
    episodes_map: Dict[str, List[int]] = {}
    with jsonl_path.open("r", encoding="utf-8") as handle:
        for idx, line in enumerate(handle):
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            if metadata is None and isinstance(rec.get("metadata"), dict):
                metadata = rec["metadata"]
            run_id = rec.get("run_id") or "unknown"
            episodes_map.setdefault(run_id, []).append(idx)

    if metadata is None:
        metadata = {}

    episodes = [sorted(idxs) for idxs in episodes_map.values()]
    return DTDataset(states=states, actions=actions, rewards=rewards, rtgs=rtgs, metadata=metadata, episodes=episodes)


class DecisionTransformer:  # pragma: no cover - placeholder model
    """Placeholder DT model skeleton.

    The actual neural architecture (e.g. PyTorch, JAX, TensorFlow) is
    intentionally omitted to avoid adding heavy dependencies. This class
    documents the expected interface only.
    """

    def __init__(self, state_dim: int, action_dim: int, hidden_size: int, num_layers: int, context_length: int) -> None:
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.context_length = context_length

    def forward(self, states: "np.ndarray", actions: "np.ndarray", rtgs: "np.ndarray", timesteps: "np.ndarray") -> Any:
        raise NotImplementedError("DecisionTransformer.forward is not implemented; this is a skeleton")


def train(dataset: DTDataset, args: argparse.Namespace) -> None:
    """Skeleton training loop.

    This function is intentionally minimal and does not implement actual
    gradient-based optimization. It serves as a placeholder to be filled in
    once a concrete DL framework is selected.
    """

    state_dim = dataset.states.shape[1]
    action_dim = dataset.actions.shape[1]
    _model = DecisionTransformer(
        state_dim=state_dim,
        action_dim=action_dim,
        hidden_size=args.hidden_size,
        num_layers=args.num_layers,
        context_length=args.context_length,
    )
    print(
        "[train-dt] Training loop is not implemented yet. "
        "Run with --dry-run to inspect dataset only.",
        file=sys.stderr,
    )


def main(argv: List[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        dataset = load_dt_dataset(args.dataset_npz, args.dataset_jsonl)
    except Exception as exc:  # pragma: no cover - simple CLI wrapper
        print(f"[train-dt] Error loading dataset: {exc}", file=sys.stderr)
        return 1

    states, actions, rewards, rtgs = dataset.states, dataset.actions, dataset.rewards, dataset.rtgs
    num_steps = int(states.shape[0])
    state_dim = int(states.shape[1]) if states.ndim == 2 else 0
    action_dim = int(actions.shape[1]) if actions.ndim == 2 else 0
    num_episodes = len(dataset.episodes)

    if args.dry_run:
        action_vocab = dataset.metadata.get("action_vocab", {}) if isinstance(dataset.metadata, dict) else {}
        state_features = dataset.metadata.get("state_feature_names", [])
        action_features = dataset.metadata.get("action_feature_names", [])
        print("DT Training Dataset Summary:")
        print(f"  Total timesteps: {num_steps}")
        print(f"  Episodes: {num_episodes}")
        print(f"  State dim: {state_dim}")
        print(f"  Action dim: {action_dim}")
        print(f"  Action vocabulary size: {len(action_vocab)}")
        print(f"  Sample state features: {state_features[:10]}")
        print(f"  Sample action features: {action_features[:10]}")
        print(f"  Arrays: state={states.shape}, action={actions.shape}, reward={rewards.shape}, rtg={rtgs.shape}")
        return 0

    train(dataset, args)
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())

