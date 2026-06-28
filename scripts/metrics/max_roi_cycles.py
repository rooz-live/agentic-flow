#!/usr/bin/env python3
"""Max-ROI cycles/hour from loop timer + cycle knobs + shippable pace."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import yaml

SCHEMA = "metrics.max_roi_cycles.v1"


def repo_root() -> Path:
    return Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))


def _pace(root: Path) -> float:
    import sys
    sys.path.insert(0, str(root / "scripts" / "metrics"))
    from pace_from_lnnnl import pace_from_lnnnl_doc
    p = root / ".goalie" / "LNNNL.yaml"
    doc = yaml.safe_load(p.read_text(encoding="utf-8")) if p.is_file() else {}
    return pace_from_lnnnl_doc(doc)


def _knobs(root: Path) -> dict:
    import sys
    sys.path.insert(0, str(root / "scripts" / "cicd" / "lib"))
    import cycle_knob_engine as cke
    return cke.load_knobs(root)


def _timer_doc(root: Path) -> dict:
    lp = root / "config" / "cicd" / "loop_prompts.yaml"
    if not lp.is_file():
        return {}
    doc = yaml.safe_load(lp.read_text(encoding="utf-8")) or {}
    return doc.get("timer") or {}


def _ceremony_in_idle(root: Path) -> bool:
    if os.environ.get("CEREMONY_IN_IDLE", "").lower() in ("1", "true", "yes"):
        return True
    if os.environ.get("CEREMONY_IN_IDLE", "").lower() in ("0", "false", "no"):
        return False
    timer = _timer_doc(root)
    budget = (yaml.safe_load((root / "config/cicd/loop_prompts.yaml").read_text(encoding="utf-8")) or {}).get("budget", {}).get("program", {}) if (root / "config/cicd/loop_prompts.yaml").is_file() else {}
    return bool(timer.get("ceremony_in_idle") or budget.get("ceremony_in_idle"))


def _ceremony_overhead(root: Path) -> float:
    lp = root / "config" / "cicd" / "loop_prompts.yaml"
    if not lp.is_file():
        return 0.0
    doc = yaml.safe_load(lp.read_text(encoding="utf-8")) or {}
    budget = (doc.get("budget") or {}).get("program") or {}
    if _ceremony_in_idle(root):
        return 0.0
    return float(budget.get("ceremony_overhead_minutes", 3))


def _timer_interval(root: Path) -> float:
    lp = root / "config" / "cicd" / "loop_prompts.yaml"
    if not lp.is_file():
        return 20.0
    doc = yaml.safe_load(lp.read_text(encoding="utf-8")) or {}
    return float((doc.get("timer") or {}).get("interval_minutes", 20))


def compute(root: Path | None = None) -> dict:
    root = root or repo_root()
    knobs = _knobs(root)
    tick_min = float(knobs.get("max_minutes_per_tick", 40))
    idle_min = float(os.environ.get("LOOP_INTERVAL_MINUTES", _timer_interval(root)))
    target_roi = float(_timer_doc(root).get("target_roi_cycles_per_hour", 2.0))
    target_tick = float(_timer_doc(root).get("target_max_minutes_per_tick", 20))
    ceremony_min = _ceremony_overhead(root)
    pace = _pace(root)
    utilize = os.environ.get("AQE_UTILIZE_DEFERRABLE", "0") == "1"

    # Wall cycles: loop timer cadence (tick budget + idle sleep)
    period_min = tick_min + idle_min + ceremony_min
    cycles_per_hour = 60.0 / period_min if period_min > 0 else 0.0

    # Back-to-back FA/SA ceiling (no idle)
    burst_cycles_per_hour = 60.0 / tick_min if tick_min > 0 else 0.0

    # ROI-weighted shippable cycles (pace CoD × utilization)
    if pace >= 1.0:
        util_factor = 1.0
        mode = "full"
    elif utilize:
        util_factor = 0.5
        mode = "deferrable"
    else:
        util_factor = 0.0
        mode = "deferred"

    roi_cycles_per_hour = round(cycles_per_hour * (pace / 1.5) * util_factor, 4)
    burst_roi_cycles_per_hour = round(burst_cycles_per_hour * (pace / 1.5) * util_factor, 4)

    return {
        "schema": SCHEMA,
        "cycles_per_hour": round(cycles_per_hour, 4),
        "burst_cycles_per_hour": round(burst_cycles_per_hour, 4),
        "roi_cycles_per_hour": roi_cycles_per_hour,
        "burst_roi_cycles_per_hour": burst_roi_cycles_per_hour,
        "pace_cod_weight": pace,
        "utilize_mode": mode,
        "max_minutes_per_tick": tick_min,
        "idle_interval_minutes": idle_min,
        "ceremony_overhead_minutes": ceremony_min,
        "effective_period_minutes": round(period_min, 4),
        "sweet_spot_ticks": knobs.get("sweet_spot_ticks"),
        "ceremony_in_idle": _ceremony_in_idle(root),
        "target_roi_cycles_per_hour": target_roi,
        "target_max_minutes_per_tick": target_tick,
        "roi_gap": round(target_roi - roi_cycles_per_hour, 4),
        "formula": "roi = (60/(tick+idle+ceremony)) * (pace/1.5) * util_factor",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--write-evidence", action="store_true")
    args = parser.parse_args()
    root = repo_root()
    payload = compute(root)
    if args.write_evidence:
        out = root / ".goalie" / "evidence" / "max_roi_cycles_latest.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    if args.json or not args.write_evidence:
        print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
