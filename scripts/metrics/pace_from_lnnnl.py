"""Pace (CoD weight) from LNNNL — shippable and blocker lanes."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import yaml

SHIPPABLE_LOOP = re.compile(r"\b(?:P1-[A-Z0-9]+-\d+|NNEAR-\d+)\b", re.I)
BLOCKER_LOOP = re.compile(r"\[(?:R\d+|DEP-?\d+)\]", re.I)
LAST_GOOD_CACHE = Path(".goalie/evidence/last_pace_bundle.json")


def is_shippable_work(item: str) -> bool:
    s = str(item or "").strip()
    return bool(s and SHIPPABLE_LOOP.search(s))


def is_blocker_work(item: str) -> bool:
    s = str(item or "").strip()
    return bool(s and BLOCKER_LOOP.search(s))


def _lane_from_doc(doc: dict | None, lane_name: str, schedule_prefix: str) -> dict:
    doc = doc or {}
    lanes = doc.get("lanes") or {}
    lane = lanes.get(lane_name)
    if isinstance(lane, dict) and any(str(v or "").strip() for v in lane.values()):
        return lane
    sched = doc.get("schedule") or {}
    if sched.get(f"{schedule_prefix}_now") or sched.get(f"{schedule_prefix}_near"):
        return {
            "now": sched.get(f"{schedule_prefix}_now") or "",
            "near": sched.get(f"{schedule_prefix}_near") or "",
            "next": sched.get(f"{schedule_prefix}_next") or "",
        }
    return sched


def _shippable_lane(doc: dict | None) -> dict:
    return _lane_from_doc(doc, "shippable", "shippable")


def _blocker_lane(doc: dict | None) -> dict:
    return _lane_from_doc(doc, "blockers", "blockers")


def pace_cod_weight_from_schedule(schedule: dict | None, *, lnnnl: dict | None = None) -> float:
    sched = _shippable_lane(lnnnl) if lnnnl is not None else (schedule or {})
    for key, weight in (("now", 1.5), ("near", 1.0)):
        if is_shippable_work(str(sched.get(key) or "")):
            return weight
    return 0.5


def blocker_pace_cod_weight_from_schedule(schedule: dict | None, *, lnnnl: dict | None = None) -> float:
    sched = _blocker_lane(lnnnl) if lnnnl is not None else (schedule or {})
    for key in ("now", "near", "next"):
        if is_blocker_work(str(sched.get(key) or "")):
            return 1.0
    return 0.5


def pace_from_lnnnl_doc(doc: dict | None) -> float:
    return pace_cod_weight_from_schedule(doc.get("schedule") if doc else None, lnnnl=doc)


def _lane_empty(lane: dict) -> bool:
    return not any(str(v or "").strip() for v in lane.values())


def _lane_has_now(lane: dict) -> bool:
    return bool(str(lane.get("now") or "").strip())


def _load_lnnnl(path: Path | None = None) -> dict | None:
    if path is None:
        path = Path(".goalie/LNNNL.yaml")
    elif isinstance(path, str):
        path = Path(path)
    if not path.is_file():
        return None
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError):
        return None


def _save_last_good(bundle: dict) -> None:
    try:
        LAST_GOOD_CACHE.parent.mkdir(parents=True, exist_ok=True)
        LAST_GOOD_CACHE.write_text(
            json.dumps({"shippable_pace": bundle.get("pace_cod_weight")}, indent=2),
            encoding="utf-8",
        )
    except OSError:
        pass


def _load_last_good() -> dict | None:
    try:
        if not LAST_GOOD_CACHE.is_file():
            return None
        return json.loads(LAST_GOOD_CACHE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def resolve_pace_bundle(
    lnnnl_exit: int = 0,
    lnnnl_path: str | Path | None = None,
    lnnnl: dict | None = None,
) -> dict[str, Any]:
    """Return a dual-lane pace bundle for tick_cycle_policy.

    On lnnnl_exit != 0, fall back to the last good cached pace; if none exists,
    report stale with no weight.
    """
    doc = lnnnl if lnnnl is not None else _load_lnnnl(lnnnl_path)

    if lnnnl_exit != 0 or doc is None:
        last_good = _load_last_good()
        if last_good is not None and last_good.get("shippable_pace") is not None:
            return {
                "pace_source": "last_good",
                "pace_cod_weight": last_good["shippable_pace"],
                "shippable_lane_empty": True,
                "blocker_lane_has_now": False,
                "utilize_mode_hint": "deferred",
            }
        return {
            "pace_source": "stale",
            "pace_cod_weight": None,
            "shippable_lane_empty": True,
            "blocker_lane_has_now": False,
            "utilize_mode_hint": "deferred",
        }

    ship_lane = _shippable_lane(doc)
    blocker_lane = _blocker_lane(doc)
    shippable_pace = pace_from_lnnnl_doc(doc)
    blocker_pace = blocker_pace_cod_weight_from_schedule(None, lnnnl=doc)

    shippable_lane_empty = not _lane_has_now(ship_lane) or not is_shippable_work(
        str(ship_lane.get("now") or "")
    )
    if not _lane_empty(ship_lane) and not shippable_lane_empty:
        shippable_lane_empty = False

    blocker_lane_has_now = _lane_has_now(blocker_lane) and is_blocker_work(
        str(blocker_lane.get("now") or "")
    )

    utilize_mode_hint = "full" if shippable_pace >= 1.0 else "deferred"
    if shippable_lane_empty and blocker_lane_has_now:
        utilize_mode_hint = "blocker-remediation"

    bundle = {
        "pace_source": "live",
        "pace_cod_weight": shippable_pace,
        "blocker_pace_cod_weight": blocker_pace,
        "shippable_lane_empty": shippable_lane_empty,
        "blocker_lane_has_now": blocker_lane_has_now,
        "utilize_mode_hint": utilize_mode_hint,
    }
    _save_last_good(bundle)
    return bundle


def main() -> None:
    import os
    import sys

    parser = argparse.ArgumentParser()
    parser.add_argument("--from-lnnnl", action="store_true")
    parser.add_argument("--json", action="store_true", help="Emit resolve_pace_bundle JSON")
    parser.add_argument("--lnnnl-exit", type=int, default=0)
    args = parser.parse_args()
    if args.from_lnnnl and args.json:
        bundle = resolve_pace_bundle(lnnnl_exit=args.lnnnl_exit)
        if os.environ.get("AF_PACE_FAIL_CLOSED", "1") == "1" and bundle.get("pace_source") == "stale":
            print(json.dumps(bundle))
            sys.exit(1)
        print(json.dumps(bundle))
        return
    if args.from_lnnnl:
        p = Path(".goalie/LNNNL.yaml")
        d = yaml.safe_load(p.read_text(encoding="utf-8")) if p.is_file() else {}
        print(pace_from_lnnnl_doc(d))
        return
    parser.print_help()


if __name__ == "__main__":
    main()
