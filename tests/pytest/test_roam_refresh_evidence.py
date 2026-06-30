"""Evidence-gated ROAM refresh must not run without AF_ROAM_REFRESH_EVIDENCE."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_roam_refresh_timestamps_requires_evidence():
    env = os.environ.copy()
    env["AF_ROAM_REFRESH_TIMESTAMPS"] = "1"
    env.pop("AF_ROAM_REFRESH_EVIDENCE", None)
    proc = subprocess.run(
        [sys.executable, str(ROOT / "scripts/cicd/update_lnnnl.py")],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert proc.returncode != 0
    assert "AF_ROAM_REFRESH_EVIDENCE" in (proc.stdout + proc.stderr)


def test_load_roam_refresh_evidence_parses_items(tmp_path: Path):
    sys.path.insert(0, str(ROOT))
    from scripts.cicd.update_lnnnl import _load_roam_refresh_evidence

    evidence = tmp_path / "refresh.json"
    evidence.write_text(
        json.dumps(
            {
                "items": [
                    {"id": "R-TEST-01", "disposition": "owned", "evidence": "tests/fixture", "note": "unit"}
                ]
            }
        ),
        encoding="utf-8",
    )
    os.environ["AF_ROAM_REFRESH_EVIDENCE"] = str(evidence)
    allowed, _ = _load_roam_refresh_evidence(str(ROOT))
    del os.environ["AF_ROAM_REFRESH_EVIDENCE"]
    assert "R-TEST-01" in allowed
    assert allowed["R-TEST-01"]["disposition"] == "owned"
