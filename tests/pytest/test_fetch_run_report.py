"""Unit tests for scripts/cicd/fetch_run_report.py."""
from __future__ import annotations

import importlib.util
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest


def _load_module():
    path = Path(__file__).resolve().parents[2] / "scripts" / "cicd" / "fetch_run_report.py"
    spec = importlib.util.spec_from_file_location("fetch_run_report", path)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture()
def mod():
    return _load_module()


def _make_receipt(context: str, status: str, ts: str) -> dict:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "cicd" / "lib"))
    import receipt
    return receipt.make(
        context=context,
        status=status,
        command="test",
        exit_code=0 if status == "PASS" else 1,
        receipt_id="00000000-0000-0000-0000-000000000000",
        timestamp=ts,
    )


def test_collect_receipts_filters_by_context(tmp_path, mod):
    (tmp_path / "receipt_up.json").write_text(json.dumps(_make_receipt("upstream", "PASS", "2026-06-25T00:00:00Z")))
    (tmp_path / "receipt_local.json").write_text(json.dumps(_make_receipt("local", "PASS", "2026-06-25T00:00:00Z")))
    (tmp_path / "bad.json").write_text("not a receipt")
    found = mod._collect_receipts(tmp_path, contexts={"upstream"})
    assert len(found) == 1
    assert found[0]["context"] == "upstream"


def test_collect_receipts_filters_by_status(tmp_path, mod):
    (tmp_path / "receipt_pass.json").write_text(json.dumps(_make_receipt("upstream", "PASS", "2026-06-25T00:00:00Z")))
    (tmp_path / "receipt_fail.json").write_text(json.dumps(_make_receipt("upstream", "FAIL", "2026-06-25T00:00:00Z")))
    found = mod._collect_receipts(tmp_path, statuses={"FAIL"})
    assert len(found) == 1
    assert found[0]["status"] == "FAIL"


def test_collect_receipts_filters_by_time(tmp_path, mod):
    old = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat().replace("+00:00", "Z")
    new = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    (tmp_path / "receipt_old.json").write_text(json.dumps(_make_receipt("upstream", "PASS", old)))
    (tmp_path / "receipt_new.json").write_text(json.dumps(_make_receipt("upstream", "PASS", new)))
    since = datetime.now(timezone.utc) - timedelta(days=1)
    found = mod._collect_receipts(tmp_path, since=since)
    assert len(found) == 1
    assert found[0]["_path"].endswith("receipt_new.json")


def test_summary_counts_by_context(mod, tmp_path):
    (tmp_path / "receipt_up.json").write_text(json.dumps(_make_receipt("upstream", "PASS", "2026-06-25T00:00:00Z")))
    (tmp_path / "receipt_edge.json").write_text(json.dumps(_make_receipt("edge", "FAIL", "2026-06-25T00:00:00Z")))
    receipts = mod._collect_receipts(tmp_path)
    summary = mod._summarize(receipts)
    assert summary["total_receipts"] == 2
    assert summary["overall_ok"] is False
    assert summary["by_context"]["upstream"]["PASS"] == 1
    assert summary["by_context"]["edge"]["FAIL"] == 1


def test_main_returns_1_on_failures(tmp_path, mod, capsys):
    (tmp_path / "receipt_edge.json").write_text(json.dumps(_make_receipt("edge", "FAIL", "2026-06-25T00:00:00Z")))
    rc = mod.main(["--evidence-dir", str(tmp_path), "--summary"])
    assert rc == 1
    out = capsys.readouterr().out
    data = json.loads(out)
    assert data["overall_ok"] is False
