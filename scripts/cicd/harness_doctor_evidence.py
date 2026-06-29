#!/usr/bin/env python3
"""Run one.sh harness doctor and persist rc for utilization policy."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def main() -> int:
    root = repo_root()
    out = root / ".goalie/evidence/harness_doctor_latest.json"
    harness_pkg = root / "apps/agent-harness/package.json"
    if not harness_pkg.is_file():
        payload = {
            "schema": "harness_doctor.v1",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "doctor_exit": 127,
            "skipped": True,
            "reason": "apps/agent-harness missing",
        }
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        return 0

    one_sh = root / "scripts/one.sh"
    try:
        proc = subprocess.run(
            ["bash", str(one_sh), "harness", "doctor"],
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=int(os.environ.get("HARNESS_DOCTOR_TIMEOUT_SEC", "120")),
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        payload = {
            "schema": "harness_doctor.v1",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "doctor_exit": 124,
            "error": str(exc),
        }
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        if os.environ.get("AF_HARNESS_DOCTOR_ENFORCE", "0") == "1":
            return 124
        return 0

    payload = {
        "schema": "harness_doctor.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "doctor_exit": proc.returncode,
        "stdout_tail": (proc.stdout or "")[-2000:],
        "stderr_tail": (proc.stderr or "")[-1000:],
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"path": str(out), "doctor_exit": proc.returncode}))
    if os.environ.get("AF_HARNESS_DOCTOR_ENFORCE", "0") == "1" and proc.returncode != 0:
        return proc.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
