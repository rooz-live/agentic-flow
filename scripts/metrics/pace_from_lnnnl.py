"""Pace (CoD weight) from LNNNL — shippable lane only."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import yaml

SHIPPABLE_LOOP = re.compile(r"\b(?:P1-[A-Z0-9]+-\d+|NNEAR-\d+)\b", re.I)


def is_shippable_work(item: str) -> bool:
    s = str(item or "").strip()
    return bool(s and SHIPPABLE_LOOP.search(s))


def _shippable_lane(doc: dict | None) -> dict:
    doc = doc or {}
    lanes = doc.get("lanes") or {}
    ship = lanes.get("shippable")
    if isinstance(ship, dict) and any(str(v or "").strip() for v in ship.values()):
        return ship
    sched = doc.get("schedule") or {}
    if sched.get("shippable_now") or sched.get("shippable_near"):
        return {
            "now": sched.get("shippable_now") or "",
            "near": sched.get("shippable_near") or "",
            "next": sched.get("shippable_next") or "",
        }
    return sched


def pace_cod_weight_from_schedule(schedule: dict | None, *, lnnnl: dict | None = None) -> float:
    sched = _shippable_lane(lnnnl) if lnnnl is not None else (schedule or {})
    for key, weight in (("now", 1.5), ("near", 1.0)):
        if is_shippable_work(str(sched.get(key) or "")):
            return weight
    return 0.5


def pace_from_lnnnl_doc(doc: dict | None) -> float:
    return pace_cod_weight_from_schedule(doc.get("schedule") if doc else None, lnnnl=doc)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-lnnnl", action="store_true")
    args = parser.parse_args()
    if args.from_lnnnl:
        p = Path(".goalie/LNNNL.yaml")
        d = yaml.safe_load(p.read_text(encoding="utf-8")) if p.is_file() else {}
        print(pace_from_lnnnl_doc(d))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
