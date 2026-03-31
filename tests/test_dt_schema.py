from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from typing import Any, Dict, List

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = PROJECT_ROOT / "dt_schema.py"


def _load_module():
    """Load the dt_schema module directly from its script path.

    This keeps the tests decoupled from Python packaging configuration.
    """

    if not MODULE_PATH.is_file():
        raise AssertionError(f"dt_schema.py not found at {MODULE_PATH}")

    spec = importlib.util.spec_from_file_location("dt_schema", MODULE_PATH)
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise AssertionError("Failed to create module spec for dt_schema")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


def _required_feature_names(schema: Dict[str, Any], key: str) -> List[str]:
    """Return feature names without wildcard patterns for the given space key."""

    features = schema.get(key, []) or []
    names: List[str] = []
    for entry in features:
        name = entry.get("name")
        if isinstance(name, str) and "*" not in name:
            names.append(name)
    return names


def test_load_schema_success():
    """load_schema returns a well-formed schema for dt-schema-v1."""

    mod = _load_module()
    schema = mod.load_schema("dt-schema-v1")

    assert schema["schema_id"] == "dt-schema-v1"
    for key in ("created_at", "description", "version", "state_features", "action_features"):
        assert key in schema

    assert isinstance(schema["state_features"], list)
    assert isinstance(schema["action_features"], list)
    assert schema["state_features"]
    assert schema["action_features"]


def test_load_schema_missing_raises_file_not_found():
    """Loading a non-existent schema id raises FileNotFoundError with a helpful message."""

    mod = _load_module()
    with pytest.raises(FileNotFoundError) as excinfo:
        mod.load_schema("dt-schema-v999")

    msg = str(excinfo.value)
    assert "dt-schema-v999" in msg
    # The mapped filename should also appear in the message.
    assert "dt_schema_v999.json" in msg


def test_load_schema_mismatched_schema_id_populates_warnings(tmp_path: Path):
    """If the schema file's internal id differs, a _warnings entry is added."""

    mod = _load_module()
    original_dir = mod.SCHEMA_DIR
    try:
        mod.SCHEMA_DIR = tmp_path
        schema_path = tmp_path / "dt_schema_v123.json"
        payload = {
            "schema_id": "some-other-id",
            "state_features": [],
            "action_features": [],
        }
        schema_path.write_text(json.dumps(payload), encoding="utf-8")

        schema = mod.load_schema("dt-schema-v123")
        assert schema["schema_id"] == "some-other-id"
        warnings = schema.get("_warnings")
        assert isinstance(warnings, list)
        assert any("does not match requested id" in w for w in warnings)
    finally:
        mod.SCHEMA_DIR = original_dir


def test_validate_feature_alignment_with_exact_schema_names_is_valid():
    """Passing exactly the schema-required feature names yields a clean validation."""

    mod = _load_module()
    schema = mod.load_schema("dt-schema-v1")

    state_required = _required_feature_names(schema, "state_features")
    action_required = _required_feature_names(schema, "action_features")

    is_valid, issues = mod.validate_feature_alignment(schema, state_required, action_required)

    assert is_valid
    assert issues == []


def test_validate_feature_alignment_missing_required_features_fails():
    """Omitting a required feature reports a missing-feature error and is not valid."""

    mod = _load_module()
    schema = mod.load_schema("dt-schema-v1")

    state_required = _required_feature_names(schema, "state_features")
    action_required = _required_feature_names(schema, "action_features")

    # Drop one known required state feature.
    state_missing = [name for name in state_required if name != "cycle_index"]

    is_valid, issues = mod.validate_feature_alignment(schema, state_missing, action_required)

    assert not is_valid
    assert any("Missing state feature: cycle_index" in msg for msg in issues)


def test_validate_feature_alignment_extra_undocumented_features_yield_warnings_only():
    """Extra features become warnings but keep the alignment valid."""

    mod = _load_module()
    schema = mod.load_schema("dt-schema-v1")

    state_required = _required_feature_names(schema, "state_features")
    action_required = _required_feature_names(schema, "action_features")

    state_extra = state_required + ["unknown_state_feature"]
    action_extra = action_required + ["unknown_action_feature"]

    is_valid, issues = mod.validate_feature_alignment(schema, state_extra, action_extra)

    assert is_valid
    assert any("Warning: undocumented state feature: unknown_state_feature" in msg for msg in issues)
    assert any("Warning: undocumented action feature: unknown_action_feature" in msg for msg in issues)


def test_validate_feature_alignment_dynamic_features_covered_by_wildcards():
    """Dynamic governor_* and action_param_* features are accepted without warnings."""

    mod = _load_module()
    schema = mod.load_schema("dt-schema-v1")

    state_required = _required_feature_names(schema, "state_features")
    action_required = _required_feature_names(schema, "action_features")

    state_with_dynamic = state_required + ["governor_custom_metric"]
    action_with_dynamic = action_required + ["action_param_learning_rate"]

    is_valid, issues = mod.validate_feature_alignment(schema, state_with_dynamic, action_with_dynamic)

    assert is_valid
    assert issues == []


def test_get_feature_metadata_exact_and_wildcard_matches():
    """get_feature_metadata resolves both exact names and wildcard patterns."""

    mod = _load_module()
    schema = mod.load_schema("dt-schema-v1")

    exact = mod.get_feature_metadata(schema, "pattern_safe_degrade", feature_space="state")
    assert exact is not None
    assert exact["name"] == "pattern_safe_degrade"
    for key in ("type", "description", "tags", "default_value"):
        assert key in exact

    wildcard_state = mod.get_feature_metadata(schema, "governor_custom_field", feature_space="state")
    assert wildcard_state is not None
    assert wildcard_state["name"] == "governor_*"

    wildcard_action = mod.get_feature_metadata(schema, "action_param_lr", feature_space="action")
    assert wildcard_action is not None
    assert wildcard_action["name"] == "action_param_*"

    missing = mod.get_feature_metadata(schema, "nonexistent_feature", feature_space="state")
    assert missing is None


def test_list_available_schemas_includes_v1_and_is_sorted():
    """list_available_schemas discovers dt-schema-v1 and returns a sorted list."""

    mod = _load_module()

    schema_ids = mod.list_available_schemas()

    assert isinstance(schema_ids, list)
    assert all(isinstance(s, str) for s in schema_ids)
    assert schema_ids == sorted(schema_ids)
    assert "dt-schema-v1" in schema_ids


def test_list_available_schemas_empty_directory_returns_empty_list(tmp_path: Path):
    """When the schema directory does not exist, an empty list is returned."""

    mod = _load_module()
    original_dir = mod.SCHEMA_DIR
    try:
        mod.SCHEMA_DIR = tmp_path / "no_schemas_here"
        ids = mod.list_available_schemas()
        assert ids == []
    finally:
        mod.SCHEMA_DIR = original_dir

