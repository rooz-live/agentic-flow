"""Unit tests for scripts/hire/sync_profile.py JSON-RPC envelope."""
from __future__ import annotations

import importlib.util
import io
import json
import os
import sys
import urllib.error
from pathlib import Path
from unittest.mock import patch


def _load_module():
    path = Path(__file__).resolve().parents[2] / "scripts" / "hire" / "sync_profile.py"
    spec = importlib.util.spec_from_file_location("sync_profile", path)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_json_rpc_envelope_sent(tmp_path, monkeypatch):
    mod = _load_module()
    profile = tmp_path / "profile_readme.md"
    profile.write_text("# Profile", encoding="utf-8")
    receipt = tmp_path / "hire_sync_receipt.json"

    monkeypatch.setattr(mod, "PROFILE_PATH", profile)
    monkeypatch.setattr(mod, "RECEIPT_PATH", receipt)
    monkeypatch.setenv("MCP_API_TOKEN", "test-token")

    captured = []

    class _FakeResp:
        status = 200

        def __init__(self, data):
            self.data = data

        def read(self):
            return json.dumps({"jsonrpc": "2.0", "result": "ok", "id": "1"}).encode()

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

    def _fake_urlopen(req, timeout=None):
        captured.append(req)
        body = json.loads(req.data)
        assert body["jsonrpc"] == "2.0"
        assert body["method"] == "profile/sync"
        assert body["params"]["email"] == "s@rooz.live"
        assert body["params"]["profile_markdown"] == "# Profile"
        return _FakeResp(body)

    monkeypatch.setattr("urllib.request.urlopen", _fake_urlopen)

    rc = mod.main()
    assert rc == 0
    assert len(captured) == 1
    assert receipt.exists()
    receipt_data = json.loads(receipt.read_text(encoding="utf-8"))
    assert receipt_data["success"]
    assert receipt_data["jsonrpc_valid"]
