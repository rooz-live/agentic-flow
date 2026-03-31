from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Tuple

import numpy as np
import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[2]
TRAIN_SCRIPT = PROJECT_ROOT / "scripts" / "analysis" / "train_dt_model.py"
EVAL_SCRIPT = PROJECT_ROOT / "scripts" / "analysis" / "evaluate_dt_model.py"
PREPARE_SCRIPT = PROJECT_ROOT / "scripts" / "analysis" / "prepare_dt_dataset.py"
AF_SCRIPT = PROJECT_ROOT / "scripts" / "af"
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


def _load_eval_module():
    if not EVAL_SCRIPT.is_file():
        raise AssertionError(f"evaluate_dt_model.py not found at {EVAL_SCRIPT}")
    spec = importlib.util.spec_from_file_location("evaluate_dt_model", EVAL_SCRIPT)
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise AssertionError("Failed to create module spec for evaluate_dt_model")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


_TRAIN_MOD = _load_train_module()
_TORCH = getattr(_TRAIN_MOD, "torch", None)
pytestmark = pytest.mark.skipif(_TORCH is None, reason="PyTorch is not available")


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


@pytest.fixture(scope="module")
def trained_checkpoint(tmp_path_factory: pytest.TempPathFactory) -> Tuple[Path, Path, Path]:
    tmp_path = tmp_path_factory.mktemp("dt_eval")
    npz_path, jsonl_path = _prepare_test_dataset(tmp_path)

    ckpt_path = GOALIE_DIR / "dt_model_test-eval.pt"
    if ckpt_path.is_file():
        ckpt_path.unlink()

    cmd = [
        sys.executable,
        str(TRAIN_SCRIPT),
        "--dataset-npz",
        str(npz_path),
        "--dataset-jsonl",
        str(jsonl_path),
        "--epochs",
        "1",
        "--batch-size",
        "2",
        "--context-length",
        "3",
        "--hidden-size",
        "16",
        "--num-layers",
        "1",
        "--num-heads",
        "2",
        "--run-name",
        "test-eval",
    ]
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    assert ckpt_path.is_file(), "Expected checkpoint file to be created"
    return ckpt_path, npz_path, jsonl_path


def test_evaluate_dt_model_loads_checkpoint(trained_checkpoint: Tuple[Path, Path, Path]) -> None:
    ckpt_path, npz_path, jsonl_path = trained_checkpoint
    eval_mod = _load_eval_module()

    args = eval_mod.parse_args(
        [
            "--checkpoint",
            str(ckpt_path),
            "--eval-dataset-npz",
            str(npz_path),
            "--eval-dataset-jsonl",
            str(jsonl_path),
            "--batch-size",
            "2",
        ]
    )
    results = eval_mod.evaluate(args)
    assert isinstance(results, dict)
    assert results["total_positions"] > 0


def test_evaluate_dt_model_computes_metrics(trained_checkpoint: Tuple[Path, Path, Path]) -> None:
    ckpt_path, npz_path, jsonl_path = trained_checkpoint
    eval_mod = _load_eval_module()

    args = eval_mod.parse_args(
        [
            "--checkpoint",
            str(ckpt_path),
            "--eval-dataset-npz",
            str(npz_path),
            "--eval-dataset-jsonl",
            str(jsonl_path),
            "--batch-size",
            "2",
        ]
    )
    results = eval_mod.evaluate(args)

    assert results["total_positions"] > 0
    assert 0.0 <= results["top1_accuracy"] <= 1.0
    assert 0.0 <= results["top3_accuracy"] <= 1.0
    assert isinstance(results["per_circle"], dict)
    assert isinstance(results["per_action"], dict)

    episodes = results.get("episodes") or {}
    assert "per_episode" in episodes
    assert isinstance(episodes["per_episode"], dict)


def test_evaluate_dt_model_cli(trained_checkpoint: Tuple[Path, Path, Path], tmp_path: Path) -> None:
    ckpt_path, npz_path, jsonl_path = trained_checkpoint
    output_json = tmp_path / "dt_eval_results.json"

    cmd = [
        str(AF_SCRIPT),
        "evaluate-dt",
        "--checkpoint",
        str(ckpt_path),
        "--eval-dataset-npz",
        str(npz_path),
        "--eval-dataset-jsonl",
        str(jsonl_path),
        "--output-json",
        str(output_json),
    ]
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr

    out = proc.stdout
    assert "DT Evaluation Summary" in out
    assert output_json.is_file()

    data = json.loads(output_json.read_text(encoding="utf-8"))
    assert data.get("total_positions", 0) > 0

    # Metrics log should contain a dt_evaluation event for this checkpoint.
    metrics_log = GOALIE_DIR / "metrics_log.jsonl"
    assert metrics_log.is_file()
    events = [
        json.loads(line)
        for line in metrics_log.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert any(
        e.get("type") == "dt_evaluation" and e.get("checkpoint") == str(ckpt_path)
        for e in events
    )



def test_validate_dt_model_cli(trained_checkpoint: Tuple[Path, Path, Path], tmp_path: Path) -> None:
    """validate-dt-model should exit 0 when thresholds are lenient."""

    ckpt_path, npz_path, jsonl_path = trained_checkpoint
    thresholds_path = tmp_path / "dt_validation_thresholds.yaml"
    thresholds_path.write_text(
        "model_quality_thresholds:\n"
        "  min_top1_accuracy: 0.0\n"
        "  max_cont_mae: 999.0\n"
        "  per_circle_min_top1_orchestrator: 0.0\n",
        encoding="utf-8",
    )

    cmd = [
        str(AF_SCRIPT),
        "validate-dt-model",
        "--checkpoint",
        str(ckpt_path),
        "--eval-dataset-npz",
        str(npz_path),
        "--eval-dataset-jsonl",
        str(jsonl_path),
        "--threshold-config",
        str(thresholds_path),
    ]
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    out = proc.stdout
    assert "[validate-dt-model] Threshold evaluation:" in out
    assert "[validate-dt-model] All criteria passed." in out

