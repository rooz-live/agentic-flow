from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any, Dict


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = PROJECT_ROOT / "scripts" / "analysis" / "prepare_dt_dataset.py"


def _load_module():
    """Load the prepare_dt_dataset module directly from its script path.

    This keeps the tests decoupled from Python packaging configuration.
    """

    if not SCRIPT_PATH.is_file():
        raise AssertionError(f"prepare_dt_dataset.py not found at {SCRIPT_PATH}")

    spec = importlib.util.spec_from_file_location("prepare_dt_dataset", SCRIPT_PATH)
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise AssertionError("Failed to create module spec for prepare_dt_dataset")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


def test_extract_state_features_includes_risk_and_patterns():
    mod = _load_module()

    state: Dict[str, Any] = {
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
        "risk_distribution": {
            mod.CIRCLES[0]: 0.5,
            mod.CIRCLES[1]: 0.2,
        },
        "patterns": {
            "safe-degrade": True,
            "depth-ladder": 1,
        },
        "governor_health": {
            "risk_score": 0.7,
            "recent_incidents": 2,
            "throttle_active": True,
        },
    }

    feats = mod.extract_state_features(state, cycle_index=3)

    # Core structural fields
    assert feats["cycle_index"] == 3.0
    assert feats["risk_score"] == 0.7
    assert feats["depth"] == 2.0
    assert feats["average_score"] == 0.8

    # Risk distribution by circle
    assert feats[f"risk_{mod.CIRCLES[0]}"] == 0.5
    assert feats[f"risk_{mod.CIRCLES[1]}"] == 0.2

    # Pattern one-hot features
    assert feats["pattern_safe_degrade"] == 1.0
    assert feats["pattern_depth_ladder"] == 1.0

    # Governor health metrics
    assert feats["governor_recent_incidents"] == 2.0
    assert feats["governor_throttle_active"] == 1.0


def test_extract_action_features_none_has_stable_schema():
    mod = _load_module()

    feats = mod.extract_action_features(None, {})

    assert feats["action_id"] == -1.0
    assert feats["action_target"] == 0.0
    assert feats["action_circle"] == -1.0
    assert feats["action_depth"] == 0.0


def test_extract_action_features_populated_infers_vocab_and_params():
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

    # Vocab and ids
    assert vocab["test-command"] == 0
    assert feats["action_id"] == 0.0

    # Core scalar fields
    assert feats["action_target"] == 42.0
    assert feats["action_circle"] >= 0.0
    assert feats["action_depth"] == 3.0

    # Dynamic numeric params
    assert feats["action_param_lr"] == 0.01
    assert feats["action_param_batch_size"] == 16.0


def _load_dt_schema_module():
    """Load the dt_schema module directly from the project root."""

    module_path = PROJECT_ROOT / "dt_schema.py"
    if not module_path.is_file():
        raise AssertionError(f"dt_schema.py not found at {module_path}")

    spec = importlib.util.spec_from_file_location(
        "dt_schema_for_prepare_tests",
        module_path,
    )
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise AssertionError("Failed to create module spec for dt_schema")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


def test_schema_alignment_with_synthetic_data():
    mod = _load_module()
    dt_schema = _load_dt_schema_module()

    # Resolve synthetic trajectories relative to repository root.
    repo_root = PROJECT_ROOT.parents[1]
    trajectories_path = repo_root / ".goalie" / "trajectories_test.jsonl"
    assert trajectories_path.is_file(), (
        f"synthetic trajectories not found at {trajectories_path}"
    )

    trajectories = mod.load_trajectories(trajectories_path)
    episodes = mod.group_episodes(trajectories)

    (
        records,
        state_vecs,
        action_vecs,
        rewards,
        action_vocab,
        state_feature_names,
        action_feature_names,
    ) = mod.build_sequences(episodes)

    assert records, "Expected non-empty DT records from synthetic trajectories"

    schema = dt_schema.load_schema("dt-schema-v1")
    is_valid, issues = dt_schema.validate_feature_alignment(
        schema,
        state_feature_names,
        action_feature_names,
    )

    assert is_valid
    assert issues == []
