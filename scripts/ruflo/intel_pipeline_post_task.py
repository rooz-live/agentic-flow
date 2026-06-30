#!/usr/bin/env python3
"""Ruflo intelligence pipeline JUDGE step — provenance-gated pattern store (invert: no PASS without receipt)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def _repo_root() -> Path:
    return Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))


def _ruflo_version(root: Path) -> str | None:
    """RUFLO_VERSION sourced from config/ruflo/version.env (canonical) then env var.

    Returns None when unresolvable — never fabricates a hardcoded version (drift
    guard). The previous hardcoded ``3.15.0`` fallback silently diverged from the
    canonical pin; callers must handle None explicitly (fail-closed / honest record).
    """
    vf = root / "config/ruflo/version.env"
    if vf.is_file():
        for line in vf.read_text(encoding="utf-8").splitlines():
            if line.startswith("RUFLO_VERSION="):
                return line.split("=", 1)[1].strip()
    return os.environ.get("RUFLO_VERSION")


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
    if os.environ.get("AF_CI_PROVENANCE_HEAD") and not receipt.get("head_sha"):
        return None
    return 0.92


def _store_pattern(root: Path, key: str, value: str, quality: float) -> bool:
    ver = _ruflo_version(root)
    if os.environ.get("AF_SKIP_NETWORK", "0") == "1":
        return False
    if ver is None:
        # No fabricated version → never invoke npx ruflo@<stale>. Honest skip.
        print(
            "WARN: RUFLO_VERSION unresolvable (config/ruflo/version.env missing) — "
            "pattern store skipped (drift guard)",
            file=sys.stderr,
        )
        return False
    cmd = [
        "npx", "-y", f"ruflo@{ver}", "memory", "store",
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
    root = _repo_root()
    out = root / ".goalie/evidence/intel_pipeline_latest.json"
    receipt = _latest_receipt(root)
    quality = _quality_from_receipt(receipt) if receipt else None
    stored = False
    dry = os.environ.get("AF_INTEL_PIPELINE_DRY", "0") == "1"

    if quality is not None and receipt and not dry:
        key = f"mpp-pass-{receipt.get('head_sha', 'unknown')[:12]}"
        stored = _store_pattern(
            root, key,
            json.dumps({"receipt": receipt.get("status"), "scorecard": receipt.get("scorecard")}),
            quality,
        )

    # Fail-closed JUDGE (inversion of the old default-off `enforce` flag, which made
    # the return-1 branches dead code → false greens). A real (non-dry) run MUST close
    # on a valid PASS receipt with provenance-backed quality. The ONLY escape hatch is
    # explicit dry-run (AF_INTEL_PIPELINE_DRY=1).
    if dry:
        judge_exit = 0
    elif receipt is None:
        judge_exit = 1
    elif receipt.get("status") != "PASS":
        judge_exit = 1
    elif quality is None:
        judge_exit = 1
    else:
        judge_exit = 0

    payload = {
        "schema": "intel_pipeline.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dry_run": dry,
        "steps": {
            "retrieve": "skipped_cli_optional",
            "judge": {
                "quality": quality,
                "receipt_status": (receipt or {}).get("status"),
                "exit": judge_exit,
            },
            "distill": "deferred_until_50_pass",
            "consolidate": "deferred_ewc",
        },
        "pattern_stored": stored,
        "inbox_zero_gate": quality is not None,
        "ruflo_version": _ruflo_version(root),
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"path": str(out), "quality": quality, "stored": stored, "judge_exit": judge_exit}))

    return judge_exit


if __name__ == "__main__":
    raise SystemExit(main())
