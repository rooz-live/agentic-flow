#!/usr/bin/env python3
"""Reconcile tick_post_latest.json pace from tick_cycle_policy_latest.json (F4)."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def reconcile(root: Path) -> bool:
    evidence = root / ".goalie" / "evidence"
    tick_path = evidence / "tick_post_latest.json"
    policy_path = evidence / "tick_cycle_policy_latest.json"
    if not policy_path.is_file():
        return False
    try:
        policy = json.loads(policy_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return False
    pace = policy.get("pace_cod_weight")
    if pace is None:
        return False
    tick: dict = {}
    if tick_path.is_file():
        try:
            tick = json.loads(tick_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            tick = {}
    stale = tick.get("pace_source") == "stale" and tick.get("pace_cod_weight") is None
    if not stale and tick.get("pace_cod_weight") is not None:
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


def main() -> int:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[3]
    reconcile(root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
