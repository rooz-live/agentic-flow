import json
from pathlib import Path

from scripts.metrics import earnings_export_json as exp


def test_build_export_requires_verified_ledger(tmp_path, monkeypatch):
    monkeypatch.setenv("REPO_ROOT", str(tmp_path))
    ledger = tmp_path / ".goalie" / "earnings_ledger.jsonl"
    ledger.parent.mkdir(parents=True)
    ledger.write_text('{"verified": false, "earnings": {"total_earnings": 9}}\n', encoding="utf-8")
    payload = exp.build_export(tmp_path, require_verified=True)
    assert payload["source"] == "empty"
    assert payload["verified"] is False


def test_build_export_uses_verified_ledger(tmp_path, monkeypatch):
    monkeypatch.setenv("REPO_ROOT", str(tmp_path))
    ledger = tmp_path / ".goalie" / "earnings_ledger.jsonl"
    ledger.parent.mkdir(parents=True)
    ledger.write_text(
        json.dumps(
            {
                "verified": True,
                "commit": "abc123",
                "earnings": {"agent": 1, "engine": 1, "engineer": 1, "ingenuity": 1, "total_earnings": 4},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    payload = exp.build_export(tmp_path, require_verified=True)
    assert payload["source"] == "ledger_verified"
    assert payload["verified"] is True
    assert payload["earnings"]["total_earnings"] == 4
