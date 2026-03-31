from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, DefaultDict, List

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = PROJECT_ROOT / "scripts" / "analysis" / "prepare_dt_dataset.py"
AF_PATH = PROJECT_ROOT / "scripts" / "af"
GOALIE_DIR = PROJECT_ROOT / ".goalie"


def _load_module():
    if not SCRIPT_PATH.is_file():
        raise AssertionError(f"prepare_dt_dataset.py not found at {SCRIPT_PATH}")
    spec = importlib.util.spec_from_file_location("prepare_dt_dataset", SCRIPT_PATH)
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise AssertionError("Failed to create module spec for prepare_dt_dataset")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


@pytest.mark.parametrize("with_fields", [True, False])
def test_extract_state_features_complete_and_missing(with_fields: bool):
    mod = _load_module()

    state: Dict[str, Any]
    if with_fields:
        state = {
            "circle": mod.CIRCLES[0],
            "depth": 2,
            "metrics": {
                "average_score": 0.8,
                "safe_degrade.triggers": 1,
                "guardrail_lock.enforced": 2,
                "guardrail_lock.user_requests": 3,
                "iteration_budget.consumed": 4,
                "observability_first.missing_signals": 5,
            },
            "risk_distribution": {mod.CIRCLES[0]: 0.5, mod.CIRCLES[1]: 0.2},
            "patterns": {"safe-degrade": True, "depth-ladder": 1},
            "governor_health": {
                "risk_score": 0.7,
                "recent_incidents": 2,
                "throttle_active": True,
                "safe_degrade_active": True,
                "guardrail_active": False,
                "custom_metric": 1.5,
            },
        }
    else:
        state = {}

    feats = mod.extract_state_features(state, cycle_index=3)

    # Core keys always present
    for key in [
        "cycle_index",
        "risk_score",
        "circle_bucket",
        "depth",
        "average_score",
        "safe_degrade_triggers",
        "guardrail_enforced",
        "guardrail_requests",
        "iteration_budget_consumed",
        "observability_missing",
    ]:
        assert key in feats

    # Risk features for all circles
    for circle_name in mod.CIRCLES:
        assert f"risk_{circle_name}" in feats

    # Pattern flags
    for pattern_key in [
        "pattern_safe_degrade",
        "pattern_depth_ladder",
        "pattern_circle_risk_focus",
        "pattern_autocommit_shadow",
        "pattern_guardrail_lock",
        "pattern_failure_strategy",
        "pattern_iteration_budget",
        "pattern_observability_first",
    ]:
        assert pattern_key in feats

    # Governor metrics
    for key in [
        "governor_recent_incidents",
        "governor_throttle_active",
        "governor_safe_degrade_active",
        "governor_guardrail_active",
    ]:
        assert key in feats

    # Feature space should be reasonably rich
    assert len(feats) >= 25


def test_extract_action_features_with_params_and_none():
    mod = _load_module()

    vocab: Dict[str, int] = {}
    action: Dict[str, Any] = {
        "command": "test-command",
        "target": 42,
        "circle": mod.CIRCLES[0],
        "depth": 3,
        "lr": 0.01,
        "batch_size": 16,
    }

    feats = mod.extract_action_features(action, vocab)
    assert vocab["test-command"] == 0
    assert feats["action_id"] == 0.0
    assert feats["action_target"] == 42.0
    assert feats["action_circle"] >= 0.0
    assert feats["action_depth"] == 3.0
    assert feats["action_param_lr"] == 0.01
    assert feats["action_param_batch_size"] == 16.0

    feats_none = mod.extract_action_features(None, {})
    for key in ["action_id", "action_target", "action_circle", "action_depth"]:
        assert key in feats_none


def test_build_sequences_feature_union():
    mod = _load_module()

    episodes: DefaultDict[str, List[Dict[str, Any]]] = DefaultDict(list)
    episodes["run-a"] = [
        {
            "state": {
                "circle": mod.CIRCLES[0],
                "depth": 0,
                "risk_distribution": {mod.CIRCLES[0]: 1.0},
                "patterns": {"safe-degrade": True},
                "governor_health": {"risk_score": 0.1},
            },
            "action": {"command": "cmd-a", "circle": mod.CIRCLES[0], "depth": 0, "target": 0.5, "alpha": 0.9},
            "reward": {"value": 0.1},
            "cycle_index": 0,
        }
    ]
    episodes["run-b"] = [
        {
            "state": {
                "circle": mod.CIRCLES[1],
                "depth": 1,
                "risk_distribution": {mod.CIRCLES[1]: 0.7},
                "patterns": {"depth-ladder": True},
                "governor_health": {"risk_score": 0.2, "extra_metric": 2.0},
            },
            "action": {"command": "cmd-b", "circle": mod.CIRCLES[1], "depth": 1, "target": 0.7, "beta": 1.1},
            "reward": {"value": 0.2},
            "cycle_index": 0,
        }
    ]

    (
        records,
        state_vecs,
        action_vecs,
        rewards,
        action_vocab,
        state_feature_names,
        action_feature_names,
    ) = mod.build_sequences(episodes)

    assert records
    assert rewards

    # Feature names are union and sorted
    assert "governor_extra_metric" in state_feature_names
    assert "action_param_alpha" in action_feature_names
    assert "action_param_beta" in action_feature_names
    assert state_feature_names == sorted(state_feature_names)
    assert action_feature_names == sorted(action_feature_names)

    for vec in state_vecs:
        assert len(vec) == len(state_feature_names)
    for vec in action_vecs:
        assert len(vec) == len(action_feature_names)


def test_prepare_dataset_with_synthetic_trajectories(tmp_path: Path):
    mod = _load_module()
    trajectories = GOALIE_DIR / "test_trajectories.jsonl"
    assert trajectories.is_file()

    cmd = [
        sys.executable,
        str(SCRIPT_PATH),
        "--trajectories",
        str(trajectories),
        "--summary-only",
    ]
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    out = proc.stdout
    assert "DT Dataset Summary:" in out
    assert "Total steps:" in out
    assert "Vocabulary size:" in out
    assert "State Features:" in out


def test_prepare_dataset_no_canonical_rewards(tmp_path: Path):
    mod = _load_module()
    tmp_traj = tmp_path / "bad_rewards.jsonl"
    payload = {"run_id": "legacy", "cycle_index": 0, "state": {}, "action": {}, "reward": {"legacy": 1.0}}
    tmp_traj.write_text(json.dumps(payload) + "\n", encoding="utf-8")

    cmd = [
        sys.executable,
        str(SCRIPT_PATH),
        "--trajectories",
        str(tmp_traj),
        "--summary-only",
    ]
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    assert proc.returncode == 1
    assert "No valid DT datapoints" in proc.stderr


@pytest.mark.skip(reason="dt-dataset-summary command not yet added to scripts/af")
def test_af_dt_dataset_summary_cli_uses_synthetic_fixture():
    assert AF_PATH.is_file()
    trajectories = GOALIE_DIR / "test_trajectories.jsonl"
    assert trajectories.is_file()

    cmd = [
        str(AF_PATH),
        "dt-dataset-summary",
        "--trajectories",
        str(trajectories),
    ]
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    assert "DT Dataset Summary:" in proc.stdout

