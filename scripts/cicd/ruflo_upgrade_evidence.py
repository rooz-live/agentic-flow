#!/usr/bin/env python3
from __future__ import annotations
import json, os
from datetime import datetime, timezone
from pathlib import Path

def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))
    out = root / ".goalie/evidence/ruflo_upgrade_latest.json"
    evidence = {}
    for name in ("wsjf_ruflo_latest.json", "ruflo_doctor_latest.json", "ruflo_doctor_roam_latest.json", "memory_graph_apply_latest.json"):
        p = root / ".goalie/evidence" / name
        if p.is_file():
            evidence[name.replace(".json", "")] = json.loads(p.read_text(encoding="utf-8"))
    # Source from canonical config/ruflo/version.env (or RUFLO_VERSION env). None
    # when unresolvable — never fabricate a hardcoded literal (drift guard).
    ver = os.environ.get("RUFLO_VERSION")
    vf = root / "config/ruflo/version.env"
    if vf.is_file():
        for line in vf.read_text(encoding="utf-8").splitlines():
            if line.startswith("RUFLO_VERSION="):
                ver = line.split("=", 1)[1].strip()
    payload = {
        "schema": "ruflo_upgrade.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ruflo_version": ver,
        "evidence": evidence,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
