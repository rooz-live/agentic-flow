"""verified-result bypass must refuse stale bundles without trust."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENGINE = ROOT / "scripts" / "metrics" / "earnings_engine.py"


def test_verified_result_refuses_without_trust(tmp_path: Path):
    bundle = {
        "disposition": "SHIP",
        "verification": {"commit": "deadbeef", "diff_sha256": "abc"},
    }
    bundle_path = tmp_path / "bundle.json"
    bundle_path.write_text(json.dumps(bundle), encoding="utf-8")
    missing_scorecard = tmp_path / "missing.json"
    proc = subprocess.run(
        [
            sys.executable,
            str(ENGINE),
            "--scorecard",
            str(missing_scorecard),
            "--verified-result",
            str(bundle_path),
            "--verify",
        ],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
        env={**dict(__import__("os").environ), "AF_VERIFIED_RESULT_TRUST": "0"},
        check=False,
    )
    assert proc.returncode != 0
    assert "AF_VERIFIED_RESULT_TRUST" in proc.stderr or "verification failed" in proc.stderr.lower()
