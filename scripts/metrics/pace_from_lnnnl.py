"""Pace (CoD weight) from LNNNL schedule — shippable LOOP_ITEM only, not env-secret theater."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import yaml

SHIPPABLE_LOOP = re.compile(r"\bP1-[A-Z0-9]+-\d+\b", re.I)


def is_shippable_work(item: str) -> bool:
    """True when schedule slot names shippable loop work (P1-*), not DEP/R tail strings."""
    s = str(item or "").strip()
    if not s:
        return False
    return bool(SHIPPABLE_LOOP.search(s))


def pace_cod_weight_from_schedule(schedule: dict | None) -> float:
    """Map first shippable tier to WSJF pace: now=1.5, near=1.0, else 0.5."""
    sched = schedule or {}
    for key, weight in (("now", 1.5), ("near", 1.0)):
        if is_shippable_work(str(sched.get(key) or "")):
            return weight
    return 0.5


def main() -> None:
    parser = argparse.ArgumentParser(description="Pace CoD weight from LNNNL schedule")
    parser.add_argument("--from-lnnnl", action="store_true", help="read .goalie/LNNNL.yaml")
    args = parser.parse_args()
    if args.from_lnnnl:
        p = Path(".goalie/LNNNL.yaml")
        d = yaml.safe_load(p.read_text(encoding="utf-8")) if p.is_file() else {}
        print(pace_cod_weight_from_schedule(d.get("schedule")))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
