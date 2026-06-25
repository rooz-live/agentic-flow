#!/usr/bin/env python3
"""Ceremony cadence between max-ROI cycles — bounded LNNNL committable units."""
from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

SCHEMA = "ceremony_unit.v1"
STATE_SCHEMA = "ceremony_state.v1"
P1_RE = re.compile(r"\b(P1-[A-Z0-9]+-\d+)\b", re.I)
HEAVY = {"roam_risks", "wsjf_refine", "pi_prep", "pi_sync", "review"}


def repo_root() -> Path:
    return Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[3]))


def _load_loop_prompts(root: Path) -> dict:
    p = root / "config/cicd/loop_prompts.yaml"
    if not p.is_file():
        return {}
    return yaml.safe_load(p.read_text(encoding="utf-8")) or {}


def _load_lnnnl(root: Path) -> dict:
    p = root / ".goalie/LNNNL.yaml"
    if not p.is_file():
        return {}
    return yaml.safe_load(p.read_text(encoding="utf-8")) or {}


def _state_path(root: Path) -> Path:
    return root / ".goalie/cron_state/ceremony_state.json"


def load_state(root: Path) -> dict:
    p = _state_path(root)
    if not p.is_file():
        return {"schema": STATE_SCHEMA, "tick_count": 0, "last_committed_unit": "", "ceremonies": {}}
    return json.loads(p.read_text(encoding="utf-8"))


def save_state(root: Path, state: dict) -> None:
    p = _state_path(root)
    p.parent.mkdir(parents=True, exist_ok=True)
    state["schema"] = STATE_SCHEMA
    state["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    p.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


def bootstrap_state(state: dict, now: datetime | None = None) -> dict:
    """Avoid day-one burst of daily/monthly/heavy ceremonies."""
    now = now or datetime.now(timezone.utc)
    last = state.setdefault("ceremonies", {})
    if not last.get("bootstrapped"):
        last["bootstrapped"] = True
        last.setdefault("roam_day", now.strftime("%Y-%m-%d"))
        last.setdefault("pi_month", now.strftime("%Y-%m"))
        last.setdefault("retro_tick", int(state.get("tick_count", 0)))
    return state


def parse_unit_id(slot: str) -> str:
    m = P1_RE.search(str(slot or ""))
    return m.group(1) if m else str(slot or "").strip()[:80]


def lnnnl_units(root: Path) -> dict[str, str]:
    doc = _load_lnnnl(root)
    lanes = (doc.get("lanes") or {}).get("shippable") or {}
    sched = doc.get("schedule") or {}
    state = load_state(root)
    return {
        "prior": state.get("last_committed_unit") or "",
        "current": parse_unit_id(lanes.get("now") or sched.get("shippable_now") or sched.get("now") or ""),
        "next": parse_unit_id(lanes.get("near") or sched.get("shippable_near") or sched.get("near") or ""),
        "following": parse_unit_id(lanes.get("next") or sched.get("shippable_next") or sched.get("next") or ""),
    }


def _staged_non_empty(root: Path) -> bool:
    try:
        r = subprocess.run(
            ["git", "-C", str(root), "diff", "--cached", "--quiet"],
            capture_output=True,
            check=False,
            timeout=5,
        )
        return r.returncode != 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def ceremony_mode() -> str:
    return os.environ.get("CEREMONY_MODE", os.environ.get("LOOP_CEREMONY", "light")).lower()


def due_ceremonies(root: Path, *, tick_count: int | None = None) -> list[str]:
    prompts = _load_loop_prompts(root)
    cadence = prompts.get("ceremony_cadence") or {}
    budget = (prompts.get("budget") or {}).get("program") or {}
    max_before = int(budget.get("max_ticks_before_ceremony", 12))
    state = bootstrap_state(load_state(root))
    tick = tick_count if tick_count is not None else int(state.get("tick_count", 0))
    last = state.get("ceremonies") or {}
    now = datetime.now(timezone.utc)
    due: list[str] = []
    mode = ceremony_mode()

    if cadence.get("standup_perceive") == "each_tick":
        due.append("standup")

    if mode in ("full", "heavy") and _staged_non_empty(root) and cadence.get("review") == "per_staged_slice":
        due.append("review")

    ticks_since = tick - int(last.get("retro_tick", 0))
    if ticks_since >= max_before:
        due.append("retro_replenish")
        if cadence.get("wsjf_refine") == "after_retro":
            due.append("wsjf_refine")

    day = now.strftime("%Y-%m-%d")
    if mode in ("full", "heavy") and last.get("roam_day") != day and cadence.get("roam_risks") == "daily_via_cls":
        due.append("roam_risks")

    month = now.strftime("%Y-%m")
    pi_cadence = cadence.get("pi_sync") or cadence.get("pi_prep")
    if mode in ("full", "heavy") and last.get("pi_month") != month and pi_cadence == "monthly":
        due.append("pi_prep")
        due.append("pi_sync")

    if mode == "off":
        return []
    if mode == "light":
        return [c for c in due if c in ("standup", "retro_replenish")]
    return due


def _timeout_sec() -> int:
    return int(os.environ.get("CEREMONY_TIMEOUT_SEC", "120"))


def run_ceremony(name: str, root: Path, unit: dict) -> dict[str, Any]:
    result: dict[str, Any] = {"ceremony": name, "ok": True, "actions": []}
    env = {**os.environ, "REPO_ROOT": str(root), "LOOP_ITEM": unit.get("current", "")}
    timeout = _timeout_sec()

    def sh(cmd: list[str], label: str, *, extra_env: dict | None = None) -> None:
        run_env = {**env, **(extra_env or {})}
        try:
            p = subprocess.run(
                cmd, cwd=root, env=run_env, capture_output=True, text=True,
                timeout=timeout, check=False,
            )
            result["actions"].append({"label": label, "exit": p.returncode})
            if p.returncode != 0:
                result["ok"] = False
        except (OSError, subprocess.TimeoutExpired) as e:
            result["actions"].append({"label": label, "error": str(e)})
            result["ok"] = False

    if name == "standup":
        pass
    elif name == "review":
        sh(["bash", str(root / "scripts/dod-gate.sh"), "--perceive"], "dod-gate perceive")
    elif name == "retro_replenish":
        retro = root / ".goalie/evidence/ceremony_retro_latest.json"
        retro.parent.mkdir(parents=True, exist_ok=True)
        retro.write_text(
            json.dumps({"unit": unit, "note": "retro_replenish bounded slice"}, indent=2) + "\n",
            encoding="utf-8",
        )
        result["actions"].append({"label": "retro_note", "path": str(retro.relative_to(root))})
    elif name == "wsjf_refine":
        sh(
            ["python3", str(root / "scripts/cicd/update_lnnnl.py")],
            "wsjf refine",
            extra_env={"AF_SKIP_ROAM_SYNC": "1"},
        )
    elif name == "roam_risks":
        if os.environ.get("CEREMONY_OFFLINE", "0") == "1":
            result["actions"].append({"label": "roam_skipped", "reason": "offline"})
        else:
            sh(["python3", str(root / "scripts/cicd/lib/env_key_resolver.py"), "--sync-roam"], "env sync")
            sh(
                ["python3", str(root / "scripts/cicd/update_lnnnl.py")],
                "roam wsjf",
                extra_env={"AF_SKIP_ROAM_SYNC": "1"},
            )
    elif name == "pi_prep":
        prep = root / ".goalie/evidence/pi_prep_latest.json"
        prep.parent.mkdir(parents=True, exist_ok=True)
        prep.write_text(json.dumps({"units": unit, "note": "pi_prep bounded committable slice"}, indent=2) + "\n")
        result["actions"].append({"label": "pi_prep_note", "path": str(prep.relative_to(root))})
    elif name == "pi_sync":
        sync = root / "scripts/cicd/pi_plan_sync.sh"
        if os.environ.get("CEREMONY_PI_SYNC", "0") == "1" and sync.is_file():
            sh(["bash", str(sync)], "pi_plan_sync")
        else:
            bounded = root / ".goalie/evidence/pi_plan_sync_bounded.json"
            bounded.parent.mkdir(parents=True, exist_ok=True)
            bounded.write_text(json.dumps({"units": unit, "bounded": True}, indent=2) + "\n")
            result["actions"].append({"label": "pi_sync_bounded", "path": str(bounded.relative_to(root))})
    return result


def build_unit_payload(root: Path, *, ceremonies: list[str], results: list[dict]) -> dict:
    units = lnnnl_units(root)
    staged = _staged_non_empty(root)
    return {
        "schema": SCHEMA,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ceremony_mode": ceremony_mode(),
        "ceremonies_due": ceremonies,
        "ceremony_results": results,
        "units": units,
        "committable": staged and bool(units.get("current")),
        "bounded_slice": {
            "prior": units.get("prior"),
            "current": units.get("current"),
            "next": units.get("next"),
            "following": units.get("following"),
        },
    }


def tick_ceremony(
    root: Path | None = None,
    *,
    tick_count: int | None = None,
    commit_unit: bool = False,
    only: str | None = None,
) -> dict:
    root = root or repo_root()
    state = bootstrap_state(load_state(root))
    if tick_count is not None:
        state["tick_count"] = tick_count
    else:
        state["tick_count"] = int(state.get("tick_count", 0)) + 1

    ceremonies = [only] if only else due_ceremonies(root, tick_count=int(state["tick_count"]))
    units = lnnnl_units(root)
    results = [run_ceremony(c, root, units) for c in ceremonies]
    payload = build_unit_payload(root, ceremonies=ceremonies, results=results)

    out = root / ".goalie/evidence/ceremony_unit_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    now = datetime.now(timezone.utc)
    last = state.setdefault("ceremonies", {})
    if "retro_replenish" in ceremonies:
        last["retro_tick"] = int(state["tick_count"])
    if "roam_risks" in ceremonies:
        last["roam_day"] = now.strftime("%Y-%m-%d")
    if "pi_prep" in ceremonies or "pi_sync" in ceremonies:
        last["pi_month"] = now.strftime("%Y-%m")

    if commit_unit and payload.get("committable") and units.get("current"):
        state["last_committed_unit"] = units["current"]

    save_state(root, state)
    return payload


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Ceremony cadence between max-ROI cycles")
    parser.add_argument("--tick", type=int, default=None)
    parser.add_argument("--commit-unit", action="store_true")
    parser.add_argument("--only", choices=[
        "standup", "review", "retro_replenish", "wsjf_refine", "roam_risks", "pi_prep", "pi_sync",
    ])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    payload = tick_ceremony(tick_count=args.tick, commit_unit=args.commit_unit, only=args.only)
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        u = payload["bounded_slice"]
        print(f"ceremony[{payload['ceremony_mode']}]: {','.join(payload['ceremonies_due']) or 'none'}")
        print(f"unit prior={u['prior']} current={u['current']} next={u['next']} committable={payload['committable']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
