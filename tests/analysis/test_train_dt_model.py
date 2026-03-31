from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path
from typing import Tuple

import numpy as np
import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[2]
TRAIN_SCRIPT = PROJECT_ROOT / "scripts" / "analysis" / "train_dt_model.py"
PREPARE_SCRIPT = PROJECT_ROOT / "scripts" / "analysis" / "prepare_dt_dataset.py"
GOALIE_DIR = PROJECT_ROOT / ".goalie"


def _load_train_module():
    if not TRAIN_SCRIPT.is_file():
        raise AssertionError(f"train_dt_model.py not found at {TRAIN_SCRIPT}")
    spec = importlib.util.spec_from_file_location("train_dt_model", TRAIN_SCRIPT)
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise AssertionError("Failed to create module spec for train_dt_model")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


def _prepare_test_dataset(tmp_path: Path) -> Tuple[Path, Path]:
    trajectories = GOALIE_DIR / "test_trajectories.jsonl"
    assert trajectories.is_file()
    npz_path = tmp_path / "test_dt_dataset.npz"
    jsonl_path = tmp_path / "test_dt_dataset.jsonl"
    cmd = [
        sys.executable,
        str(PREPARE_SCRIPT),
        "--trajectories",
        str(trajectories),
        "--output-jsonl",
        str(jsonl_path),
        "--output-npz",
        str(npz_path),
    ]
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    return npz_path, jsonl_path


def test_validate_dataset_schema_passes_with_valid_dataset(tmp_path: Path):
    mod = _load_train_module()
    npz_path, jsonl_path = _prepare_test_dataset(tmp_path)
    dataset = mod.load_dt_dataset(npz_path, jsonl_path)
    # Should not raise
    mod.validate_dataset_schema(dataset)


def test_validate_dataset_schema_fails_with_missing_features():
    mod = _load_train_module()
    states = np.zeros((1, 1), dtype="float32")
    actions = np.zeros((1, 1), dtype="float32")
    rewards = np.zeros((1, 1), dtype="float32")
    rtgs = np.zeros((1, 1), dtype="float32")
    metadata = {
        "state_feature_names": ["missing_feature"],
        "action_feature_names": ["another_missing_feature"],
    }
    dataset = mod.DTDataset(
        states=states,
        actions=actions,
        rewards=rewards,
        rtgs=rtgs,
        metadata=metadata,
        episodes=[[0]],
    )
    with pytest.raises(RuntimeError):
        mod.validate_dataset_schema(dataset)


@pytest.mark.skipif(
    getattr(_load_train_module(), "torch", None) is None,
    reason="PyTorch is not available",
)
def test_model_forward_pass_shape():
    mod = _load_train_module()
    torch = mod.torch
    DecisionTransformer = mod.DecisionTransformer

    batch_size, T = 2, 4
    state_dim, action_dim = 3, 5
    vocab_size, cont_dim = 7, 4

    model = DecisionTransformer(
        state_dim=state_dim,
        action_dim=action_dim,
        hidden_size=16,
        num_layers=1,
        num_heads=2,
        context_length=T,
        vocab_size=vocab_size,
        cont_action_dim=cont_dim,
        dropout=0.0,
    )

    states = torch.zeros(batch_size, T, state_dim)
    prev_actions = torch.zeros(batch_size, T, action_dim)
    rtgs = torch.zeros(batch_size, T, 1)
    timesteps = torch.arange(T).unsqueeze(0).repeat(batch_size, 1)
    mask = torch.ones(batch_size, T, dtype=torch.bool)

    logits_id, cont = model(states, prev_actions, rtgs, timesteps, mask)
    assert logits_id.shape == (batch_size, T, vocab_size)
    assert cont.shape == (batch_size, T, cont_dim)


def test_training_dry_run_with_schema_validation(tmp_path: Path):
    npz_path, jsonl_path = _prepare_test_dataset(tmp_path)
    cmd = [
        sys.executable,
        str(TRAIN_SCRIPT),
        "--dataset-npz",
        str(npz_path),
        "--dataset-jsonl",
        str(jsonl_path),
        "--dry-run",
    ]
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    out = proc.stdout
    assert "Schema validation passed" in out
    assert "DT Training Dataset Summary:" in out

