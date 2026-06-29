#!/usr/bin/env python3
"""Merge ruflo doctor blockers into ROAM risk evidence (invert: doctor before intelligence)."""
from __future__ import annotations
import json, os
from datetime import datetime, timezone
from pathlib import Path

def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))
    doctor_path = root / ".goalie/evidence/ruflo_doctor_latest.json"
    out = root / ".goalie/evidence/ruflo_doctor_roam_latest.json"
    roam_path = root / ".goalie/ROAM_TRACKER.yaml"
    doctor = json.loads(doctor_path.read_text(encoding="utf-8")) if doctor_path.is_file() else {}
    risks = []
    items = doctor.get("roam_blockers") or doctor.get("blockers") or []
    items += doctor.get("roam_warnings") or doctor.get("warnings") or []
    for item in items:
        risks.append({
            "id": item.get("id", "R-DOCTOR-UNK"),
            "source": "ruflo_doctor",
            "disposition": item.get("disposition", "Accepted"),
            "severity": item.get("severity", "medium"),
            "note": item.get("note", ""),
        })
    payload = {
        "schema": "ruflo_doctor_roam.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "doctor_exit": doctor.get("doctor_exit"),
        "inbox_zero_gate": doctor.get("inbox_zero_gate", True),
        "blocker_count": len(doctor.get("blockers", [])),
        "warning_count": len(doctor.get("warnings", [])),
        "risks": risks,
        "roam_tracker_present": roam_path.is_file(),
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"path": str(out), "risks": len(risks)}))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
