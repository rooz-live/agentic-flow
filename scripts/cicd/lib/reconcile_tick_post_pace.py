#!/usr/bin/env python3
"""Reconcile tick_post_latest.json pace from tick_cycle_policy_latest.json (F4)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

_BUNDLE_KEYS = (
    "pace_cod_weight",
    "pace_source",
    "blocker_pace_cod_weight",
    "utilize_mode_hint",
    "shippable_lane_empty",
    "blocker_lane_has_now",
)


def _read_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def reconcile(root: Path) -> bool:
    """Apply policy pace to tick evidence when policy is authoritative (post-write)."""
    evidence = root / ".goalie" / "evidence"
    tick_path = evidence / "tick_post_latest.json"
    policy_path = evidence / "tick_cycle_policy_latest.json"
    if not policy_path.is_file():
        return False

    policy = _read_json(policy_path)
    pace = policy.get("pace_cod_weight")
    if pace is None:
        return False

    tick = _read_json(tick_path)
    needs_update = (
        tick.get("pace_cod_weight") != pace
        or tick.get("pace_source") != "policy_snapshot"
        or not tick_path.is_file()
    )
    if not needs_update:
        return False

    tick["pace_cod_weight"] = pace
    tick["pace_source"] = "policy_snapshot"
    tick["pace_reconciled_from"] = "tick_cycle_policy_latest.json"
    tick["blocker_pace_cod_weight"] = policy.get(
        "blocker_pace_cod_weight", tick.get("blocker_pace_cod_weight")
    )
    tick["utilize_mode_hint"] = policy.get("utilize_mode", tick.get("utilize_mode_hint"))
    tick_path.parent.mkdir(parents=True, exist_ok=True)
    tick_path.write_text(json.dumps(tick, indent=2) + "\n", encoding="utf-8")
    return True


def pace_bundle(root: Path) -> dict:
    """Authoritative pace bundle for write_tick_evidence (policy wins over prior tick)."""
    reconcile(root)
    evidence = root / ".goalie" / "evidence"
    policy = _read_json(evidence / "tick_cycle_policy_latest.json")
    tick = _read_json(evidence / "tick_post_latest.json")

    policy_pace = policy.get("pace_cod_weight")
    if policy_pace is not None:
        return {
            "pace_cod_weight": policy_pace,
            "pace_source": "policy_snapshot",
            "blocker_pace_cod_weight": policy.get(
                "blocker_pace_cod_weight", tick.get("blocker_pace_cod_weight")
            ),
            "utilize_mode_hint": policy.get("utilize_mode", tick.get("utilize_mode_hint")),
            "shippable_lane_empty": tick.get("shippable_lane_empty"),
            "blocker_lane_has_now": tick.get("blocker_lane_has_now"),
        }

    if tick.get("pace_cod_weight") is not None or tick.get("pace_source"):
        return {key: tick.get(key) for key in _BUNDLE_KEYS if tick.get(key) is not None}

    return {"pace_source": "stale", "pace_cod_weight": None}


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--bundle-json"]
    bundle_json = "--bundle-json" in sys.argv[1:]
    root = Path(args[0]) if args else Path(__file__).resolve().parents[3]
    if bundle_json:
        print(json.dumps(pace_bundle(root)))
        return 0
    reconcile(root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
