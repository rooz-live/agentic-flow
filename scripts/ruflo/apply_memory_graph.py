#!/usr/bin/env python3
"""Enable Ruflo memory graph flags when doctor is green."""
from __future__ import annotations
import json, os
from datetime import datetime, timezone
from pathlib import Path

def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))
    doctor_path = root / ".goalie/evidence/ruflo_doctor_latest.json"
    cfg_path = root / ".claude-flow/config.yaml"
    out = root / ".goalie/evidence/memory_graph_apply_latest.json"
    doctor = json.loads(doctor_path.read_text(encoding="utf-8")) if doctor_path.is_file() else {}
    if doctor.get("blockers"):
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({"applied": False, "reason": "doctor_blockers"}, indent=2) + "\n")
        print("skip memory graph: doctor blockers")
        return 0
    if not cfg_path.is_file():
        return 0
    text = cfg_path.read_text(encoding="utf-8")
    replacements = {
        "enableHNSW: false": "enableHNSW: true",
        "enabled: false\n    sonaMode:": "enabled: true\n    sonaMode:",
        "memoryGraph:\n    enabled: false": "memoryGraph:\n    enabled: true",
    }
    applied = []
    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new, 1)
            applied.append(old.split(":")[0].strip())
    if applied:
        cfg_path.write_text(text, encoding="utf-8")
    payload = {
        "schema": "memory_graph_apply.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "applied": bool(applied),
        "flags": applied,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
