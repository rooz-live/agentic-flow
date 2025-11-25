#!/usr/bin/env python3
"""Minimal Decision Transformer training script skeleton.

This focuses on wiring data loading and dry-run inspection to the existing
DT dataset format produced by prepare_dt_dataset.py. The actual model and
training loop are left as TODOs for future phases.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

try:
    import numpy as np
except Exception:  # pragma: no cover - numpy is optional
    np = None  # type: ignore[assignment]

try:  # Optional PyTorch dependency for actual training
    import torch
    from torch import nn
    from torch.utils.data import DataLoader, Dataset
    import torch.nn.functional as F
except Exception:  # pragma: no cover - torch is optional
    torch = None  # type: ignore[assignment]
    nn = None  # type: ignore[assignment]
    DataLoader = None  # type: ignore[assignment]
    Dataset = object  # type: ignore[assignment]
    F = None  # type: ignore[assignment]



if nn is not None:
    BaseModule = nn.Module  # type: ignore[assignment]
else:  # pragma: no cover - torch is optional
    class BaseModule:  # type: ignore[too-many-instance-attributes]
        """Fallback base class used when PyTorch is not available."""

        pass


class DTDataset:
    def __init__(
        self,
        states: "np.ndarray",
        actions: "np.ndarray",
        rewards: "np.ndarray",
        rtgs: "np.ndarray",
        metadata: Dict[str, Any],
        episodes: List[List[int]],
    ) -> None:
        self.states = states
        self.actions = actions
        self.rewards = rewards
        self.rtgs = rtgs
        self.metadata = metadata
        self.episodes = episodes


def parse_args(argv: List[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Decision Transformer")
    parser.add_argument(
        "--dataset-npz",
        type=Path,
        default=Path(".goalie/dt_dataset.npz"),
        help="Path to DT dataset .npz file",
    )
    parser.add_argument(
        "--dataset-jsonl",
        type=Path,
        default=Path(".goalie/dt_dataset.jsonl"),
        help="Path to DT dataset .jsonl file",
    )
    parser.add_argument(
        "--output-model",
        type=Path,
        default=Path(".goalie/dt_model.pt"),
        help="Where to save the trained DT checkpoint",
    )
    parser.add_argument(
        "--run-name",
        type=str,
        default=None,
        help=(
            "Optional label for this training run; suffixes output model filename "
            "when not explicitly provided."
        ),
    )
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--context-length", type=int, default=20)
    parser.add_argument("--hidden-size", type=int, default=128)
    parser.add_argument("--num-layers", type=int, default=3)
    parser.add_argument("--num-heads", type=int, default=8)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument(
        "--cont-loss-scale",
        type=float,
        default=1.0,
        help="Scale factor for continuous action loss",
    )
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", type=str, default="cpu")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect dataset, validate schema, and exit without training",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Run schema/model validation only and exit",
    )
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


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class ActionFeatureConfig:
    def __init__(
        self,
        id_index: int,
        cont_indices: List[int],
        vocab_size: int,
        action_means: List[float],
        action_stds: List[float],
    ) -> None:
        self.id_index = id_index
        self.cont_indices = cont_indices
        self.vocab_size = vocab_size
        self.action_means = action_means
        self.action_stds = action_stds


def build_action_feature_config(metadata: Dict[str, Any]) -> ActionFeatureConfig:
    names = metadata.get("action_feature_names") or []
    if "action_id" not in names:
        raise RuntimeError("action_feature_names is missing required 'action_id'")
    id_index = names.index("action_id")
    cont_indices = [i for i in range(len(names)) if i != id_index]
    action_means = metadata.get("action_means") or []
    action_stds = metadata.get("action_stds") or []

    vocab = metadata.get("action_vocab") or {}
    if isinstance(vocab, dict) and vocab:
        try:
            ids = [int(v) for v in vocab.values()]
            vocab_size = max(ids) + 1
        except Exception:
            vocab_size = len(vocab)
    else:
        vocab_size = 0

    return ActionFeatureConfig(
        id_index=id_index,
        cont_indices=cont_indices,
        vocab_size=vocab_size,
        action_means=action_means,
        action_stds=action_stds,
    )


def _import_dt_schema_module():
    if "dt_schema" in sys.modules:
        return sys.modules["dt_schema"]

    try:
        if str(PROJECT_ROOT) not in sys.path:
            sys.path.insert(0, str(PROJECT_ROOT))
        import dt_schema  # type: ignore[import]
    except Exception as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"could not import dt_schema: {exc}") from exc
    return dt_schema


def validate_dataset_schema(dataset: DTDataset, schema_id: str = "dt-schema-v1") -> None:
    if not isinstance(dataset.metadata, dict):
        print(
            "[train-dt] Warning: dataset.metadata is not a dict; skipping schema validation.",
            file=sys.stderr,
        )
        return

    try:
        dt_schema = _import_dt_schema_module()
    except RuntimeError as exc:
        print(f"[train-dt] Warning: {exc}; skipping schema validation.", file=sys.stderr)
        return

    meta = dataset.metadata
    state_features = meta.get("state_feature_names") or []
    action_features = meta.get("action_feature_names") or []

    try:
        schema = dt_schema.load_schema(schema_id)
        is_valid, issues = dt_schema.validate_feature_alignment(
            schema,
            state_features,
            action_features,
        )
    except Exception as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"schema validation failed: {exc}") from exc

    if issues:
        print("[train-dt] Schema validation issues:", file=sys.stderr)
        for msg in issues:
            print(f"  - {msg}", file=sys.stderr)

    if not is_valid:
        raise RuntimeError(f"Dataset features are not compatible with schema {schema_id}")

    print(f"[train-dt] Schema validation passed ({schema_id})")


def validate_model_config(dataset: DTDataset, args: argparse.Namespace) -> None:
    states = dataset.states
    actions = dataset.actions
    state_dim = int(states.shape[1]) if states.ndim == 2 else 0
    action_dim = int(actions.shape[1]) if actions.ndim == 2 else 0
    if state_dim <= 0:
        raise RuntimeError("state_dim must be positive")
    if action_dim <= 0:
        raise RuntimeError("action_dim must be positive")
    if args.context_length <= 0:
        raise RuntimeError("context_length must be positive")
    if args.batch_size <= 0:
        raise RuntimeError("batch_size must be positive")

    num_heads = getattr(args, "num_heads", 8)
    print(
        "[train-dt] Model/data configuration: "
        f"state_dim={state_dim}, action_dim={action_dim}, "
        f"hidden_size={args.hidden_size}, context_length={args.context_length}, "
        f"num_layers={args.num_layers}, num_heads={num_heads}",
    )


def set_random_seeds(seed: int) -> None:
    random.seed(seed)
    if np is not None:
        np.random.seed(seed)
    if torch is not None:
        torch.manual_seed(seed)
        if torch.cuda.is_available():  # type: ignore[truthy-function]
            torch.cuda.manual_seed_all(seed)  # type: ignore[has-type]


class SequenceDataset(Dataset):  # type: ignore[misc]
    """Episode-aware dataset that produces variable-length context windows."""

    def __init__(self, dataset: DTDataset, context_length: int) -> None:
        if np is None:
            raise RuntimeError("NumPy is required for SequenceDataset")
        if torch is None:
            raise RuntimeError("PyTorch is required for SequenceDataset")
        self.dataset = dataset
        self.context_length = context_length
        self.state_dim = int(dataset.states.shape[1])
        self.action_dim = int(dataset.actions.shape[1])
        self._index: List[Tuple[int, int]] = []
        for ep_idx, episode in enumerate(dataset.episodes):
            for pos in range(len(episode)):
                self._index.append((ep_idx, pos))

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._index)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        ep_idx, pos = self._index[idx]
        episode = self.dataset.episodes[ep_idx]
        start_pos = max(0, pos + 1 - self.context_length)
        positions = list(range(start_pos, pos + 1))
        length = len(positions)
        indices = [episode[p] for p in positions]

        states = self.dataset.states[indices]
        rtgs = self.dataset.rtgs[indices]

        action_dim = self.action_dim
        prev_actions = np.zeros((length, action_dim), dtype=self.dataset.actions.dtype)
        for out_i, p in enumerate(positions):
            if p > 0:
                prev_idx = episode[p - 1]
                prev_actions[out_i] = self.dataset.actions[prev_idx]

        target_actions = self.dataset.actions[indices]
        timesteps = np.arange(length, dtype=np.int64)

        return {
            "states": states,
            "prev_actions": prev_actions,
            "rtgs": rtgs,
            "target_actions": target_actions,
            "timesteps": timesteps,
            "length": length,
            "indices": np.asarray(indices, dtype=np.int64),
        }


def collate_batch(
    batch: List[Dict[str, Any]],
    context_length: int,
    action_cfg: ActionFeatureConfig,
) -> Dict[str, torch.Tensor]:
    if torch is None:
        raise RuntimeError("PyTorch is required to collate batches")

    batch_size = len(batch)
    state_dim = int(batch[0]["states"].shape[1])
    action_dim = int(batch[0]["prev_actions"].shape[1])
    cont_indices = action_cfg.cont_indices
    cont_dim = len(cont_indices)

    states = torch.zeros(batch_size, context_length, state_dim, dtype=torch.float32)
    prev_actions = torch.zeros(batch_size, context_length, action_dim, dtype=torch.float32)
    rtgs = torch.zeros(batch_size, context_length, 1, dtype=torch.float32)
    target_ids = torch.zeros(batch_size, context_length, dtype=torch.long)
    target_cont = torch.zeros(batch_size, context_length, cont_dim, dtype=torch.float32)
    mask = torch.zeros(batch_size, context_length, dtype=torch.bool)
    timesteps = torch.zeros(batch_size, context_length, dtype=torch.long)
    indices = torch.full((batch_size, context_length), -1, dtype=torch.long)

    for i, sample in enumerate(batch):
        length = int(sample["length"])
        length = min(length, context_length)
        start = context_length - length

        states_np = sample["states"][-length:]
        prev_np = sample["prev_actions"][-length:]
        rtg_np = sample["rtgs"][-length:]
        tgt_np = sample["target_actions"][-length:]
        time_np = sample["timesteps"][-length:]

        states[i, start : start + length] = torch.as_tensor(states_np, dtype=torch.float32)
        prev_actions[i, start : start + length] = torch.as_tensor(prev_np, dtype=torch.float32)
        rtgs[i, start : start + length, 0] = torch.as_tensor(rtg_np, dtype=torch.float32)
        timesteps[i, start : start + length] = torch.as_tensor(time_np, dtype=torch.long)
        mask[i, start : start + length] = True

        indices_np = sample.get("indices")
        if indices_np is not None:
            indices[i, start : start + length] = torch.as_tensor(
                indices_np[-length:],
                dtype=torch.long,
            )

        id_idx = action_cfg.id_index
        ids_norm = tgt_np[:, id_idx]
        means = action_cfg.action_means
        stds = action_cfg.action_stds
        if means and stds and len(means) > id_idx and len(stds) > id_idx:
            mu = means[id_idx]
            sigma = stds[id_idx] or 1.0
            raw_ids = ids_norm * sigma + mu
        else:
            raw_ids = ids_norm
        ids = np.rint(raw_ids).astype("int64")
        if action_cfg.vocab_size > 0:
            ids = np.clip(ids, 0, action_cfg.vocab_size - 1)
        target_ids[i, start : start + length] = torch.as_tensor(ids, dtype=torch.long)

        if cont_dim:
            cont_values = tgt_np[:, cont_indices]
            target_cont[i, start : start + length] = torch.as_tensor(
                cont_values,
                dtype=torch.float32,
            )

    return {
        "states": states,
        "prev_actions": prev_actions,
        "rtgs": rtgs,
        "timesteps": timesteps,
        "target_action_ids": target_ids,
        "target_action_cont": target_cont,
        "mask": mask,
        "indices": indices,
    }


class DecisionTransformer(BaseModule):  # type: ignore[misc]
    """Lightweight PyTorch Decision Transformer.

    This implementation is intentionally simple and optimized for small
    offline datasets and synthetic fixtures. It embeds state, previous
    action, and return-to-go into a shared hidden space and uses a
    TransformerEncoder with causal masking to predict the next action.
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        hidden_size: int,
        num_layers: int,
        num_heads: int,
        context_length: int,
        vocab_size: int,
        cont_action_dim: int,
        dropout: float = 0.1,
    ) -> None:
        if nn is None or torch is None:
            raise RuntimeError("PyTorch is required to use DecisionTransformer")
        super().__init__()

        self.state_dim = state_dim
        self.action_dim = action_dim
        self.hidden_size = hidden_size
        self.context_length = context_length
        self.vocab_size = max(int(vocab_size), 1)
        self.cont_action_dim = max(int(cont_action_dim), 0)

        self.state_embed = nn.Linear(state_dim, hidden_size)
        self.action_embed = nn.Linear(action_dim, hidden_size)
        self.rtg_embed = nn.Linear(1, hidden_size)

        self.pos_embedding = nn.Embedding(context_length, hidden_size)

        ff_dim = max(hidden_size * 4, hidden_size)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_size,
            nhead=num_heads,
            dim_feedforward=ff_dim,
            dropout=dropout,
            batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        self.action_head_id = nn.Linear(hidden_size, self.vocab_size)
        self.action_head_cont = (
            nn.Linear(hidden_size, self.cont_action_dim) if self.cont_action_dim > 0 else None
        )

    def _causal_mask(self, length: int, device: torch.device) -> torch.Tensor:
        # Mask out attention to future positions (upper triangular).
        mask = torch.full((length, length), float("-inf"), device=device)
        return torch.triu(mask, diagonal=1)

    def forward(
        self,
        states: torch.Tensor,
        prev_actions: torch.Tensor,
        rtgs: torch.Tensor,
        timesteps: torch.Tensor,
        mask: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Forward pass.

        Parameters
        ----------
        states:
            [batch, T, state_dim] normalized state features.
        prev_actions:
            [batch, T, action_dim] normalized previous-step action features.
        rtgs:
            [batch, T, 1] returns-to-go.
        timesteps:
            [batch, T] integer timestep indices (0-based within window).
        mask:
            [batch, T] bool where True marks valid positions.
        """

        device = states.device
        batch_size, seq_len, _ = states.shape

        x = self.state_embed(states) + self.action_embed(prev_actions) + self.rtg_embed(rtgs)

        pos_ids = timesteps.clamp(min=0, max=self.context_length - 1)
        pos_emb = self.pos_embedding(pos_ids)
        x = x + pos_emb

        key_padding_mask = ~mask
        causal_mask = self._causal_mask(seq_len, device)

        h = self.transformer(x, mask=causal_mask, src_key_padding_mask=key_padding_mask)

        logits_id = self.action_head_id(h)
        if self.cont_action_dim > 0 and self.action_head_cont is not None:
            cont = self.action_head_cont(h)
        else:
            cont = torch.zeros(batch_size, seq_len, 0, device=device, dtype=h.dtype)
        return logits_id, cont


def train(dataset: DTDataset, args: argparse.Namespace) -> None:
    """Concrete PyTorch training loop for the Decision Transformer."""

    if np is None:
        raise RuntimeError("NumPy is required for training but is not available")
    if torch is None or nn is None or F is None or DataLoader is None:
        raise RuntimeError("PyTorch is required for training but is not available")

    set_random_seeds(args.seed)

    requested_device = args.device or "cpu"
    device = torch.device(requested_device)
    if requested_device != "cpu" and not torch.cuda.is_available():  # type: ignore[truthy-function]
        print(
            f"[train-dt] Requested device '{requested_device}' is not available; falling back to CPU",
            file=sys.stderr,
        )
        device = torch.device("cpu")

    action_cfg = build_action_feature_config(dataset.metadata or {})
    seq_dataset = SequenceDataset(dataset, context_length=args.context_length)
    collate = lambda batch: collate_batch(batch, args.context_length, action_cfg)
    loader = DataLoader(
        seq_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=collate,
    )

    state_dim = int(dataset.states.shape[1])
    action_dim = int(dataset.actions.shape[1])
    cont_dim = len(action_cfg.cont_indices)

    model = DecisionTransformer(
        state_dim=state_dim,
        action_dim=action_dim,
        hidden_size=args.hidden_size,
        num_layers=args.num_layers,
        num_heads=args.num_heads,
        context_length=args.context_length,
        vocab_size=action_cfg.vocab_size,
        cont_action_dim=cont_dim,
        dropout=args.dropout,
    ).to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)
    cont_scale = float(args.cont_loss_scale)

    for epoch in range(args.epochs):
        model.train()
        total_loss = 0.0
        total_batches = 0

        for batch in loader:
            batch_tensors = {
                k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in batch.items()
            }

            logits_id, pred_cont = model(
                batch_tensors["states"],
                batch_tensors["prev_actions"],
                batch_tensors["rtgs"],
                batch_tensors["timesteps"],
                batch_tensors["mask"],
            )

            mask = batch_tensors["mask"]
            target_ids = batch_tensors["target_action_ids"]
            target_cont = batch_tensors["target_action_cont"]

            if mask.sum() == 0:
                continue

            ce_loss = F.cross_entropy(logits_id[mask], target_ids[mask])
            loss = ce_loss

            if pred_cont.shape[-1] > 0:
                pred_cont_flat = pred_cont[mask]
                target_cont_flat = target_cont[mask]
                mse_loss = F.mse_loss(pred_cont_flat, target_cont_flat)
                loss = loss + cont_scale * mse_loss

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += float(loss.item())
            total_batches += 1

        avg_loss = total_loss / max(total_batches, 1)
        print(f"[train-dt] Epoch {epoch + 1}/{args.epochs}: loss={avg_loss:.4f}")

    args.output_model.parent.mkdir(parents=True, exist_ok=True)
    model_cpu = model.to("cpu")
    checkpoint = {
        "model_state_dict": model_cpu.state_dict(),
        "metadata": dataset.metadata,
        "schema_id": (dataset.metadata or {}).get("schema_id"),
        "args": {k: getattr(args, k) for k in vars(args)},
    }
    torch.save(checkpoint, args.output_model)
    print(f"[train-dt] Saved model checkpoint to {args.output_model}")


def main(argv: List[str] | None = None) -> int:
    args = parse_args(argv)

    default_model_path = Path(".goalie/dt_model.pt")
    if args.run_name and args.output_model == default_model_path:
        safe_tag = "".join(ch for ch in args.run_name if ch.isalnum() or ch in {"-", "_"}) or "unnamed"
        args.output_model = default_model_path.with_name(f"dt_model_{safe_tag}.pt")

    try:
        dataset = load_dt_dataset(args.dataset_npz, args.dataset_jsonl)
    except Exception as exc:  # pragma: no cover - simple CLI wrapper
        print(f"[train-dt] Error loading dataset: {exc}", file=sys.stderr)
        return 1

    try:
        validate_dataset_schema(dataset)
        validate_model_config(dataset, args)
    except Exception as exc:
        print(f"[train-dt] Validation error: {exc}", file=sys.stderr)
        return 1

    if args.validate_only:
        return 0

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
        if args.run_name:
            print(f"  Run name: {args.run_name}")
        print(f"  Total timesteps: {num_steps}")
        print(f"  Episodes: {num_episodes}")
        print(f"  State dim: {state_dim}")
        print(f"  Action dim: {action_dim}")
        print(f"  Action vocabulary size: {len(action_vocab)}")
        print(f"  Sample state features: {state_features[:10]}")
        print(f"  Sample action features: {action_features[:10]}")
        print(
            "  Arrays: "
            f"state={states.shape}, action={actions.shape}, reward={rewards.shape}, rtg={rtgs.shape}",
        )
        return 0

    try:
        train(dataset, args)
    except Exception as exc:  # pragma: no cover - simple CLI wrapper
        print(f"[train-dt] Error during training: {exc}", file=sys.stderr)
        return 1

    meta_log = Path(".goalie/dt_training_runs.jsonl")
    meta_log.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "run_name": args.run_name,
        "output_model": str(args.output_model),
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "context_length": args.context_length,
        "hidden_size": args.hidden_size,
        "num_layers": args.num_layers,
        "learning_rate": args.learning_rate,
        "device": args.device,
        "timesteps": num_steps,
        "episodes": num_episodes,
    }
    try:
        with meta_log.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record) + "\n")
    except OSError:
        print("[train-dt] Warning: failed to append training metadata log", file=sys.stderr)

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())

