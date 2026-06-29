#!/usr/bin/env python3
"""Ruflo intelligence pipeline JUDGE step — provenance-gated pattern store (invert: no PASS without receipt)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def _latest_receipt(root: Path) -> dict | None:
    receipts = root / ".goalie/evidence/receipts"
    if not receipts.is_dir():
        return None
    files = sorted(receipts.glob("tick_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        return None
    try:
        return json.loads(files[0].read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def _quality_from_receipt(receipt: dict) -> float | None:
    if receipt.get("status") != "PASS":
        return None
    # Provenance gate: require head_sha when CI provenance env present
    if os.environ.get("AF_CI_PROVENANCE_HEAD") and not receipt.get("head_sha"):
        return None
    return 0.92


def _store_pattern(root: Path, key: str, value: str, quality: float) -> bool:
    cmd = [
        "npx", "-y", "ruflo@3.15.0", "memory", "store",
        "--key", key,
        "--value", value,
        "--namespace", "patterns",
        "--tags", "mpp,receipt,provenance",
    ]
    try:
        proc = subprocess.run(cmd, cwd=str(root), capture_output=True, text=True, timeout=60)
        return proc.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))
    out = root / ".goalie/evidence/intel_pipeline_latest.json"
    receipt = _latest_receipt(root)
    quality = _quality_from_receipt(receipt) if receipt else None
    stored = False
    if quality is not None and receipt:
        key = f"mpp-pass-{receipt.get('head_sha', 'unknown')[:12]}"
        stored = _store_pattern(root, key, json.dumps({"receipt": receipt.get("status"), "scorecard": receipt.get("scorecard")}), quality)

    payload = {
        "schema": "intel_pipeline.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "steps": {
            "retrieve": "skipped_cli_optional",
            "judge": {"quality": quality, "receipt_status": (receipt or {}).get("status")},
            "distill": "deferred_until_50_pass",
            "consolidate": "deferred_ewc",
        },
        "pattern_stored": stored,
        "inbox_zero_gate": quality is not None,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"path": str(out), "quality": quality, "stored": stored}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
