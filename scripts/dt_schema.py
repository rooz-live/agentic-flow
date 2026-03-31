from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


SCHEMA_DIR = Path(__file__).resolve().parent / "config" / "dt_schemas"


def _schema_path_for_id(schema_id: str) -> Path:
    """Map a schema_id to a JSON file path.

    We use a simple convention: "dt-schema-v1" -> "dt_schema_v1.json".
    """

    stem = schema_id.replace("-", "_")
    return SCHEMA_DIR / f"{stem}.json"


def load_schema(schema_id: str) -> Dict[str, Any]:
    """Load a schema definition by ID.

    Parameters
    ----------
    schema_id:
        Logical schema identifier, e.g. "dt-schema-v1".
    """

    path = _schema_path_for_id(schema_id)
    if not path.is_file():
        raise FileNotFoundError(f"Schema file not found for id {schema_id!r}: {path}")

    with path.open("r", encoding="utf-8") as handle:
        schema = json.load(handle)

    sid = schema.get("schema_id")
    if isinstance(sid, str) and sid != schema_id:
        # Mismatch is not fatal but should be surfaced to callers.
        schema.setdefault("_warnings", []).append(
            f"schema_id in file ({sid}) does not match requested id ({schema_id})",
        )
    return schema


def _features_for_space(schema: Dict[str, Any], feature_space: str) -> List[Dict[str, Any]]:
    key = "state_features" if feature_space == "state" else "action_features"
    feats = schema.get(key, [])
    return feats if isinstance(feats, list) else []


def _split_required_and_patterns(features: List[Dict[str, Any]]) -> Tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
    required: Dict[str, Dict[str, Any]] = {}
    patterns: List[Dict[str, Any]] = []
    for f in features:
        name = f.get("name")
        if not isinstance(name, str):
            continue
        if "*" in name:
            patterns.append(f)
        else:
            required[name] = f
    return required, patterns


def _covered_by_patterns(name: str, patterns: List[Dict[str, Any]]) -> bool:
    for p in patterns:
        pat = p.get("name")
        if not isinstance(pat, str):
            continue
        if pat.endswith("*") and name.startswith(pat[:-1]):
            return True
    return False


def validate_feature_alignment(
    schema: Dict[str, Any],
    state_feature_names: List[str],
    action_feature_names: List[str],
) -> Tuple[bool, List[str]]:
    """Validate that dataset feature names align with the schema.

    Returns
    -------
    is_valid:
        False when required features are missing; extra features yield warnings
        but do not by themselves invalidate the schema.
    issues:
        Human-readable descriptions of problems or warnings.
    """

    issues: List[str] = []

    state_required, state_patterns = _split_required_and_patterns(
        _features_for_space(schema, "state"),
    )
    action_required, action_patterns = _split_required_and_patterns(
        _features_for_space(schema, "action"),
    )

    # Missing required features.
    for name in sorted(state_required):
        if name not in state_feature_names:
            issues.append(f"Missing state feature: {name}")
    for name in sorted(action_required):
        if name not in action_feature_names:
            issues.append(f"Missing action feature: {name}")

    # Extra / undocumented features (warnings only, unless caller treats them as fatal).
    for name in state_feature_names:
        if name in state_required:
            continue
        if _covered_by_patterns(name, state_patterns):
            continue
        issues.append(f"Warning: undocumented state feature: {name}")

    for name in action_feature_names:
        if name in action_required:
            continue
        if _covered_by_patterns(name, action_patterns):
            continue
        issues.append(f"Warning: undocumented action feature: {name}")

    is_valid = not any(msg.startswith("Missing ") for msg in issues)
    return is_valid, issues


def get_feature_metadata(
    schema: Dict[str, Any],
    feature_name: str,
    feature_space: str = "state",
) -> Optional[Dict[str, Any]]:
    """Return the metadata entry for a given feature name, if present.

    Wildcard definitions (e.g. "governor_*", "action_param_*") are matched
    when there is no exact feature name match.
    """

    features = _features_for_space(schema, feature_space)
    # Prefer exact match.
    for f in features:
        if f.get("name") == feature_name:
            return f
    # Fallback to wildcard/prefix match.
    for f in features:
        name = f.get("name")
        if not isinstance(name, str) or "*" not in name:
            continue
        if name.endswith("*") and feature_name.startswith(name[:-1]):
            return f
    return None


def list_available_schemas() -> List[str]:
    """Return all known schema IDs from the local registry directory."""

    if not SCHEMA_DIR.is_dir():
        return []

    schema_ids: List[str] = []
    for path in sorted(SCHEMA_DIR.glob("*.json")):
        try:
            with path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            sid = data.get("schema_id")
            if isinstance(sid, str):
                schema_ids.append(sid)
            else:
                # Fall back to converting filename to an id-like string.
                schema_ids.append(path.stem.replace("_", "-"))
        except Exception:
            continue
    return schema_ids

