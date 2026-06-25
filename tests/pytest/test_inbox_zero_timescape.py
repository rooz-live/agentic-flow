"""Contract tests for inbox_zero_timescape metrics."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "metrics" / "inbox_zero_timescape.sh"
SCHEMA_PATH = REPO_ROOT / "config" / "metrics" / "timescape_schema.json"

sys.path.insert(0, str(REPO_ROOT / "scripts" / "metrics"))
import inbox_zero_timescape as timescape  # noqa: E402

REQUIRED_TOP_LEVEL = {
    "schema_version",
    "timestamp",
    "pct_closed",
    "open_count",
    "velocity",
    "pace",
    "anti_cvt",
    "window_hours",
    "head_sha",
    "emergent_time_source",
    "details",
}

REQUIRED_DETAILS = {
    "open_roam",
    "closed_roam",
    "open_upstream",
    "closed_upstream",
    "dlq_rows",
}


def test_timescape_formulas():
    payload = timescape.build_timescape(REPO_ROOT, window_hours=24.0)
    details = payload["details"]
    open_count = details["open_roam"] + details["open_upstream"] + details["dlq_rows"]
    closed_count = details["closed_roam"] + details["closed_upstream"]
    total = open_count + closed_count
    expected_pct = (closed_count / total * 100.0) if total > 0 else 100.0
    expected_velocity = closed_count / 24.0
    assert payload["open_count"] == open_count
    assert payload["pct_closed"] == pytest.approx(round(expected_pct, 2))
    assert payload["velocity"] == pytest.approx(round(expected_velocity, 4))
    assert payload["emergent_time_source"] == "wall_clock"


@pytest.fixture
def inbox_zero_artifact(tmp_path):
    evidence = tmp_path / ".goalie" / "evidence"
    evidence.mkdir(parents=True)
    out = evidence / "inbox_zero_latest.json"

    runner = tmp_path / "scripts" / "metrics" / "inbox_zero_timescape_runner.py"
    runner.parent.mkdir(parents=True)
    runner.write_text(
        f"""import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(r"{REPO_ROOT}") / "scripts" / "metrics"))
import inbox_zero_timescape as t
payload = t.build_timescape(Path(r"{tmp_path}"), window_hours=24.0)
Path(r"{out}").write_text(json.dumps(payload, indent=2))
"""
    )

    shim = tmp_path / "scripts" / "metrics" / "inbox_zero_timescape.sh"
    shim.write_text(
        f"""#!/bin/bash
set -euo pipefail
export REPO_ROOT="{tmp_path}"
python3 "{runner}"
"""
    )
    shim.chmod(0o755)
    return shim, out


def test_inbox_zero_timescape_contract(inbox_zero_artifact):
    shim, out = inbox_zero_artifact
    proc = subprocess.run([str(shim)], capture_output=True, text=True, check=False)
    assert proc.returncode == 0, proc.stderr

    data = json.loads(out.read_text(encoding="utf-8"))
    assert REQUIRED_TOP_LEVEL <= set(data.keys())
    assert REQUIRED_DETAILS <= set(data["details"].keys())
    assert data["emergent_time_source"] == "wall_clock"
    assert data["schema_version"] == "1.0.0"


@pytest.mark.skipif(not SCRIPT.exists(), reason="inbox_zero_timescape.sh missing")
def test_inbox_zero_timescape_script_exists_and_executable():
    assert SCRIPT.is_file()
    assert SCRIPT.stat().st_mode & 0o111


@pytest.mark.skipif(not SCHEMA_PATH.exists(), reason="timescape schema missing")
def test_timescape_schema_file_present():
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    assert schema.get("schema_version") == "1.0.0"
    assert "pct_closed" in schema.get("required", [])
