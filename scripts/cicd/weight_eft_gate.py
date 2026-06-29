#!/usr/bin/env python3
"""Minimal weight-eft hook after N PASS receipts (RUFLO-P3-EFT backlog)."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

PASS_RECEIPT_THRESHOLD = int(os.environ.get("WEIGHT_EFT_PASS_THRESHOLD", "50"))


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def count_pass_receipts(root: Path) -> int:
    receipts = root / ".goalie/evidence/receipts"
    if not receipts.is_dir():
        return 0
    n = 0
    for path in receipts.glob("tick_*.json"):
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if doc.get("status") == "PASS":
            n += 1
    return n


def main() -> int:
    root = repo_root()
    out = root / ".goalie/evidence/weight_eft_gate_latest.json"
    pass_n = count_pass_receipts(root)
    pkg = root / "apps/agent-harness/package.json"
    declared = False
    if pkg.is_file():
        try:
            doc = json.loads(pkg.read_text(encoding="utf-8"))
            declared = "@metaharness/weight-eft" in (doc.get("devDependencies") or {})
        except json.JSONDecodeError:
            pass

    ready = pass_n >= PASS_RECEIPT_THRESHOLD and declared
    payload = {
        "schema": "weight_eft_gate.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "pass_receipt_count": pass_n,
        "threshold": PASS_RECEIPT_THRESHOLD,
        "package_declared": declared,
        "ready": ready,
        "action": "spike_deferred" if not ready else "ready_for_integration",
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload))
    if os.environ.get("AF_WEIGHT_EFT_ENFORCE", "0") == "1" and ready and not declared:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
