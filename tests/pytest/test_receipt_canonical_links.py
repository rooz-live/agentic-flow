"""Unit tests for canonical CICD receipt symlinks."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def test_upstream_reporter_creates_last_upstream_receipt(tmp_path):
    """upstream_reporter must create .goalie/evidence/last_upstream_receipt.json."""
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "cicd"))
    import upstream_reporter
    results = [
        {
            "repository_id": "repo-a",
            "integration_status": "PASS",
            "latest_commit_sha": "sha123",
            "duration_seconds": 1.0,
            "skipped": False,
            "log": "ok",
        }
    ]
    upstream_reporter.save_report_and_cache(
        results, {}, tmp_path, "20260619T100000Z", run_id="run-1"
    )
    link = tmp_path / ".goalie" / "evidence" / "last_upstream_receipt.json"
    assert link.is_file(), "last_upstream_receipt.json missing"
    data = json.loads(link.read_text(encoding="utf-8"))
    assert data["schema"] == "cicd.receipt.v1"
    assert data["context"] == "upstream"


def test_local_upgrader_creates_last_local_receipt(tmp_path):
    """local_upgrader must create .goalie/evidence/last_local_receipt.json."""
    from unittest.mock import patch
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "cicd"))
    import local_upgrader

    repo_path = tmp_path / "my_repo"
    repo_path.mkdir()
    (repo_path / "requirements.txt").touch()

    with patch("local_upgrader.scan_repositories") as mock_scan, \
         patch("local_upgrader.get_default_branch") as mock_branch, \
         patch("local_upgrader.run_cmd") as mock_cmd:
        mock_scan.return_value = [repo_path]
        mock_branch.return_value = "main"
        mock_cmd.side_effect = [
            (True, "abc123\n"),    # git rev-parse HEAD
            (True, "up to date\n"), # git pull
            (True, "venv ok\n"),    # uv venv
            (True, "installed\n"),   # pip install
            (True, "upgraded\n"),    # pip upgrade
            (True, "pytest ok\n"),  # test command
        ]
        local_upgrader.run_local_sweep([str(tmp_path)], dry_run=False, project_root=tmp_path)

    link = tmp_path / ".goalie" / "evidence" / "last_local_receipt.json"
    assert link.is_file(), "last_local_receipt.json missing"
    data = json.loads(link.read_text(encoding="utf-8"))
    assert data["schema"] == "cicd.receipt.v1"
    assert data["context"] == "local"


def test_dod_gate_checks_all_receipt_contexts():
    """dod-gate.sh must check upstream, local, and edge receipt contexts."""
    script = Path(__file__).resolve().parents[2] / "scripts" / "dod-gate.sh"
    content = script.read_text(encoding="utf-8")
    for ctx in ("last_upstream_receipt", "last_local_receipt", "last_edge_receipt"):
        assert ctx in content, f"dod-gate.sh missing {ctx} check"
