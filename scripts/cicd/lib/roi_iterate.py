#!/usr/bin/env python3
"""One bounded ROI iteration: goal snapshot → ceremony → optional cycle."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import yaml


def repo_root() -> Path:
    return Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[3]))


def _run(cmd: list[str], root: Path, *, timeout: int = 600, env: dict | None = None, quiet: bool = False) -> int:
    run_env = {**os.environ, **(env or {}), "REPO_ROOT": str(root)}
    try:
        kw = {"cwd": root, "env": run_env, "timeout": timeout, "check": False}
        if quiet:
            kw["capture_output"] = True
        return subprocess.run(cmd, **kw).returncode
    except (OSError, subprocess.TimeoutExpired):
        return 1


def next_step(root: Path) -> dict:
    sys.path.insert(0, str(root / "scripts" / "metrics"))
    from max_roi_cycles import compute

    payload = compute(root)
    gap = float(payload.get("roi_gap", 0))
    tick = float(payload.get("max_minutes_per_tick", 40))
    idle = float(payload.get("idle_interval_minutes", 20))
    target_tick = float(payload.get("target_max_minutes_per_tick", 20))
    target_roi = float(payload.get("target_roi_cycles_per_hour", 2.0))
    actions = []
    if idle > 10:
        actions.append({"action": "set_idle", "value": 10, "hint": "LOOP_INTERVAL_MINUTES=10 in loop_prompts timer"})
    if tick > target_tick:
        actions.append({"action": "tighten_tick", "value": max(target_tick, tick - 5), "hint": "green ./scripts/one.sh cycle FA"})
    if not payload.get("ceremony_in_idle"):
        actions.append({"action": "ceremony_in_idle", "value": True, "hint": "LOOP_IDLE_TASK=ceremony"})
    if gap <= 0:
        actions.append({"action": "hold", "hint": "at or above target roi/h"})
    return {
        "schema": "roi_iterate.v1",
        "current": payload,
        "target_roi_cycles_per_hour": target_roi,
        "next_actions": actions[:3],
    }


def _ceremony_slice(root: Path) -> dict:
    p = root / ".goalie/evidence/ceremony_unit_latest.json"
    if not p.is_file():
        return {}
    try:
        doc = json.loads(p.read_text(encoding="utf-8"))
        return doc.get("bounded_slice") or {}
    except (json.JSONDecodeError, OSError):
        return {}


def iterate(root: Path | None = None, *, run_cycle: bool = False, skip_ceremony: bool = False) -> dict:
    root = root or repo_root()
    plan = next_step(root)
    plan["bounded_slice"] = _ceremony_slice(root)

    _run([sys.executable, str(root / "scripts/metrics/max_roi_cycles.py"), "--write-evidence"], root, timeout=30)
    if not skip_ceremony:
        _run(
            [sys.executable, str(root / "scripts/cicd/lib/ceremony_engine.py"), "--json"],
            root,
            timeout=120,
            env={"CEREMONY_MODE": "light"},
            quiet=True,
        )

    if run_cycle:
        ec = _run(["bash", str(root / "scripts/one.sh"), "cycle", "FA"], root, timeout=3600)
        plan["cycle_fa_exit"] = ec
        sys.path.insert(0, str(root / "scripts/metrics"))
        from max_roi_cycles import compute
        plan["after"] = compute(root)

    out = root / ".goalie/evidence/roi_iterate_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    return plan


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--cycle", action="store_true", help="Also run cycle FA after ceremony")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    plan = iterate(run_cycle=args.cycle)
    if args.json:
        print(json.dumps(plan, indent=2))
    else:
        cur = plan["current"]
        print(f"roi/h={cur['roi_cycles_per_hour']} target={cur.get('target_roi_cycles_per_hour')} gap={cur.get('roi_gap')}")
        for a in plan["next_actions"]:
            print(f"  next: {a['action']} — {a.get('hint','')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
