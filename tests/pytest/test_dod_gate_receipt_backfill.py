"""Unit tests for DoD gate receipt backfill."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def _read_dod_gate_script():
    return Path(__file__).resolve().parents[2] / "scripts" / "dod-gate.sh"


def test_dod_gate_checks_receipt_summary():
    """dod-gate.sh --full must check the CICD receipt summary overall_ok field."""
    script = _read_dod_gate_script()
    content = script.read_text(encoding="utf-8")
    assert "fetch_run_report.py" in content or "last_edge_receipt" in content or "cicd.receipt" in content, (
        "dod-gate.sh does not check CICD receipts"
    )


def test_edge_reporter_creates_last_edge_receipt_link(tmp_path):
    """edge_reporter must create a latest-receipt symlink for DoD gate."""
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "cicd"))
    import edge_reporter
    results = [
        {
            "fqdn": "billing.bhopti.com",
            "status": "PASS",
            "resolved_ip": "23.92.79.2",
            "expected_ip": "23.92.79.2",
            "duration_seconds": 0.5,
            "skipped": False,
        }
    ]
    cache = {}
    edge_reporter.save_edge_report_and_cache(results, cache, tmp_path, "20260619T100000Z")
    receipt_link = tmp_path / ".goalie" / "evidence" / "last_edge_receipt.json"
    assert receipt_link.is_file(), "last_edge_receipt.json symlink missing"
    data = json.loads(receipt_link.read_text(encoding="utf-8"))
    assert data["schema"] == "cicd.receipt.v1"
    assert data["context"] == "edge"
