"""Shared scorecard_not_block vector for cycle_tick and cycle_knob_engine."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


def evaluate_scorecard_not_block(root: Path) -> dict[str, Any]:
    sc_path = root / ".goalie" / "scorecards" / "current.json"
    if not sc_path.is_file():
        ok = os.environ.get("AF_REQUIRE_SCORECARD", "0") != "1"
        return {
            "ok": ok,
            "exit_code": 0 if ok else 1,
            "disposition": "MISSING" if not ok else "SKIP",
            "errors": [] if ok else ["scorecard missing"],
        }
    env = dict(os.environ)
    env.setdefault("AF_ALLOW_OWNED_LOCAL", "1")
    proc = subprocess.run(
        [
            sys.executable,
            str(root / "scripts/gates/scorecard_gate.py"),
            "--file",
            str(sc_path),
            "--verify",
            "--ingest-only",
            "--json",
        ],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=300,
        env=env,
    )
    try:
        gate = json.loads(proc.stdout) if proc.stdout.strip() else {}
    except json.JSONDecodeError:
        gate = {}
    disp = gate.get("disposition") or gate.get("decision") or "BLOCK"
    errors = gate.get("errors") or gate.get("blocks") or []
    ok = disp not in ("BLOCK", "DROP") and proc.returncode == 0
    return {
        "ok": ok,
        "exit_code": proc.returncode,
        "disposition": disp,
        "errors": errors[:5],
    }
