"""Unit tests for scripts/hire/sync_earnings_to_hire.py."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest


def _load_module():
    path = Path(__file__).resolve().parents[2] / "scripts" / "hire" / "sync_earnings_to_hire.py"
    spec = importlib.util.spec_from_file_location("sync_earnings_to_hire", path)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture()
def mod():
    return _load_module()


def test_dry_run_prints_payload(monkeypatch, capsys, mod):
    def _fake_export():
        return {"schema": "metrics.earnings_export.v1", "earnings": {"agent": 1.0}}
    monkeypatch.setattr(mod, "_build_earnings_export", _fake_export)

    rc = mod.main(["--email", "x@y.com", "--dry-run"])
    assert rc == 0
    out = capsys.readouterr().out
    data = json.loads(out)
    assert data["email"] == "x@y.com"
    assert data["payload"]["method"] == "earnings/sync"
    assert data["payload"]["earnings"]["earnings"]["agent"] == 1.0


def test_main_returns_1_on_rpc_error(monkeypatch, mod, tmp_path):
    def _fake_export():
        return {"earnings": {"agent": 1.0}}
    monkeypatch.setattr(mod, "_build_earnings_export", _fake_export)

    captured = []

    class _FakeRpc:
        @staticmethod
        def error_message(resp):
            return resp.get("error", {}).get("message")

    class _FakeClient:
        mcp_jsonrpc = _FakeRpc()

        @staticmethod
        def sync_profile(email, payload):
            captured.append((email, payload))
            return {"status_code": 200, "error": {"code": -32600, "message": "Invalid"}}

    monkeypatch.setattr(mod, "_load_hire_client", _FakeClient)

    rc = mod.main(["--email", "x@y.com"])
    assert rc == 1
    assert len(captured) == 1
    assert captured[0][0] == "x@y.com"
    assert captured[0][1]["method"] == "earnings/sync"
