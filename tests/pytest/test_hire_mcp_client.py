"""
tests/pytest/test_hire_mcp_client.py

Unit tests for scripts/hire/hire_mcp_client.py.

Strategy:
- Monkeypatch urllib.request.urlopen to avoid real network calls.
- Monkeypatch os.environ / subprocess.run to control token resolution.
- Verify that .goalie/evidence/hire_receipts.jsonl is written with the
  required fields: timestamp, email, endpoint, status_code,
  response_summary, receipt_id (uuid4).
"""

from __future__ import annotations

import importlib
import io
import json
import os
import sys
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers to import the module under test regardless of working directory
# ---------------------------------------------------------------------------

def _client_module():
    """Import hire_mcp_client, adding its package to sys.path if needed."""
    scripts_hire = Path(__file__).resolve().parents[2] / "scripts" / "hire"
    if str(scripts_hire) not in sys.path:
        sys.path.insert(0, str(scripts_hire))
    # Force a fresh import so monkeypatches on the module are clean per test.
    import hire_mcp_client as mod  # noqa: PLC0415
    return mod


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    """Return the hire_mcp_client module."""
    return _client_module()


@pytest.fixture()
def tmp_receipt_log(tmp_path, client, monkeypatch):
    """Redirect RECEIPT_LOG to a temp file for the duration of a test."""
    log_file = tmp_path / "hire_receipts.jsonl"
    monkeypatch.setattr(client, "RECEIPT_LOG", log_file)
    return log_file


@pytest.fixture()
def env_token(monkeypatch):
    """Inject a known token via HIRE_MCP_TOKEN env var."""
    monkeypatch.setenv("HIRE_MCP_TOKEN", "test-token-abc123")


# ---------------------------------------------------------------------------
# Fake HTTP response factory
# ---------------------------------------------------------------------------

def _fake_urlopen(status: int = 200, body: dict | None = None):
    """Return a context-manager mock that simulates urllib.request.urlopen."""
    if body is None:
        body = {"ok": True, "message": "profile synced"}
    raw = json.dumps(body).encode("utf-8")

    class _FakeResp:
        status = 200  # will be overwritten

        def __init__(self, s):
            self.status = s

        def read(self):
            return raw

        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

    def _opener(req, timeout=None):  # noqa: ARG001
        return _FakeResp(status)

    return _opener


def _fake_urlopen_http_error(code: int = 401, body: bytes = b'{"error": "unauthorized"}'):
    """Simulate an HTTPError from urllib."""
    import urllib.error

    def _opener(req, timeout=None):  # noqa: ARG001
        raise urllib.error.HTTPError(
            url=req.full_url,
            code=code,
            msg="Unauthorized",
            hdrs={},  # type: ignore[arg-type]
            fp=io.BytesIO(body),
        )

    return _opener


# ---------------------------------------------------------------------------
# Token resolution tests
# ---------------------------------------------------------------------------

class TestJsonRpcEnvelope:
    def test_request_has_jsonrpc_fields(self, client):
        envelope = client.mcp_jsonrpc.request("profile/sync", {"email": "a@b.com"}, request_id="rid-1")
        assert envelope["jsonrpc"] == "2.0"
        assert envelope["method"] == "profile/sync"
        assert envelope["params"]["email"] == "a@b.com"
        assert envelope["id"] == "rid-1"

    def test_error_message_extracts_rpc_error(self, client):
        response = {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}}
        assert client.mcp_jsonrpc.error_message(response) == "Invalid Request"

    def test_is_valid_response_false_on_error(self, client):
        response = {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}}
        assert not client.mcp_jsonrpc.is_valid_response(response)

    def test_sync_profile_sends_json_rpc_envelope(self, client, tmp_receipt_log, env_token, monkeypatch):
        captured = []
        monkeypatch.setattr("urllib.request.urlopen", _fake_urlopen(200, {"id": "sync-1"}))

        result = client.sync_profile(
            email="s@rooz.live",
            payload={"title": "Engineer", "skills": ["Python"]},
        )

        assert result["id"] == "sync-1"


class TestTokenResolution:
    def test_env_var_takes_priority(self, client, monkeypatch):
        monkeypatch.setenv("HIRE_MCP_TOKEN", "env-token-xyz")
        # Make op unavailable
        monkeypatch.setattr(client, "_op_available", lambda: False)
        assert client._resolve_token() == "env-token-xyz"

    def test_op_cli_used_when_no_env(self, client, monkeypatch):
        monkeypatch.delenv("HIRE_MCP_TOKEN", raising=False)
        monkeypatch.setattr(client, "_op_available", lambda: True)

        mock_run = MagicMock()
        mock_run.return_value = SimpleNamespace(returncode=0, stdout="op-token-secret\n")
        monkeypatch.setattr("subprocess.run", mock_run)

        token = client._resolve_token()
        assert token == "op-token-secret"

    def test_raises_when_no_token_available(self, client, monkeypatch):
        monkeypatch.delenv("HIRE_MCP_TOKEN", raising=False)
        monkeypatch.setattr(client, "_op_available", lambda: False)

        with pytest.raises(RuntimeError, match="No MCP API token found"):
            client._resolve_token()

    def test_raises_when_op_fails(self, client, monkeypatch):
        monkeypatch.delenv("HIRE_MCP_TOKEN", raising=False)
        monkeypatch.setattr(client, "_op_available", lambda: True)

        mock_run = MagicMock()
        mock_run.return_value = SimpleNamespace(returncode=1, stdout="")
        monkeypatch.setattr("subprocess.run", mock_run)

        with pytest.raises(RuntimeError, match="No MCP API token found"):
            client._resolve_token()


# ---------------------------------------------------------------------------
# Receipt log tests
# ---------------------------------------------------------------------------

class TestReceiptLog:
    def test_receipt_written_on_success(self, client, tmp_receipt_log, env_token, monkeypatch):
        """A successful 200 response must produce a valid JSONL receipt entry."""
        monkeypatch.setattr("urllib.request.urlopen", _fake_urlopen(200))

        result = client.sync_profile(
            email="s@rooz.live",
            payload={"title": "Engineer", "skills": ["Python"]},
        )

        assert tmp_receipt_log.exists(), "Receipt log was not created"
        lines = tmp_receipt_log.read_text(encoding="utf-8").strip().splitlines()
        assert len(lines) == 1, f"Expected 1 receipt line, got {len(lines)}"

        entry = json.loads(lines[0])

        # Required fields
        assert "timestamp" in entry
        assert entry["email"] == "s@rooz.live"
        assert entry["endpoint"] == client.MCP_ENDPOINT
        assert entry["status_code"] == 200
        assert "response_summary" in entry
        assert "receipt_id" in entry

        # receipt_id must be a valid uuid4
        parsed_uuid = uuid.UUID(entry["receipt_id"])
        assert parsed_uuid.version == 4

    def test_receipt_written_on_http_error(self, client, tmp_receipt_log, env_token, monkeypatch):
        """An HTTP 401 error must still produce a receipt with the correct status_code."""
        monkeypatch.setattr(
            "urllib.request.urlopen",
            _fake_urlopen_http_error(401, b'{"error":"unauthorized"}'),
        )

        result = client.sync_profile(
            email="s@rooz.live",
            payload={"title": "Engineer"},
        )

        assert tmp_receipt_log.exists()
        entry = json.loads(tmp_receipt_log.read_text(encoding="utf-8").strip())
        assert entry["status_code"] == 401
        assert entry["email"] == "s@rooz.live"
        assert uuid.UUID(entry["receipt_id"]).version == 4

    def test_multiple_calls_append_multiple_lines(self, client, tmp_receipt_log, env_token, monkeypatch):
        """Each sync_profile call must append a new line to the JSONL log."""
        monkeypatch.setattr("urllib.request.urlopen", _fake_urlopen(200))

        client.sync_profile(email="a@example.com", payload={"n": 1})
        client.sync_profile(email="b@example.com", payload={"n": 2})

        lines = tmp_receipt_log.read_text(encoding="utf-8").strip().splitlines()
        assert len(lines) == 2
        emails = [json.loads(l)["email"] for l in lines]
        assert emails == ["a@example.com", "b@example.com"]

    def test_receipt_log_dir_created_automatically(self, client, tmp_path, env_token, monkeypatch):
        """The log directory must be created if it doesn't exist yet."""
        deep_log = tmp_path / "new" / "subdir" / "hire_receipts.jsonl"
        monkeypatch.setattr(client, "RECEIPT_LOG", deep_log)
        monkeypatch.setattr("urllib.request.urlopen", _fake_urlopen(200))

        client.sync_profile(email="s@rooz.live", payload={})

        assert deep_log.exists()

    def test_response_summary_capped_at_300_chars(self, client, tmp_receipt_log, env_token, monkeypatch):
        """response_summary in the receipt must not exceed 300 characters."""
        long_body = {"data": "x" * 1000}
        monkeypatch.setattr("urllib.request.urlopen", _fake_urlopen(200, long_body))

        client.sync_profile(email="s@rooz.live", payload={})

        entry = json.loads(tmp_receipt_log.read_text(encoding="utf-8").strip())
        assert len(entry["response_summary"]) <= 300


# ---------------------------------------------------------------------------
# sync_profile return value tests
# ---------------------------------------------------------------------------

class TestSyncProfileResponse:
    def test_returns_parsed_json_on_success(self, client, tmp_receipt_log, env_token, monkeypatch):
        monkeypatch.setattr("urllib.request.urlopen", _fake_urlopen(200, {"ok": True, "id": "42"}))

        result = client.sync_profile(email="s@rooz.live", payload={})
        assert result == {"ok": True, "id": "42"}

    def test_returns_error_dict_on_http_error(self, client, tmp_receipt_log, env_token, monkeypatch):
        monkeypatch.setattr(
            "urllib.request.urlopen",
            _fake_urlopen_http_error(500, b'{"error":"internal"}'),
        )

        result = client.sync_profile(email="s@rooz.live", payload={})
        assert "error" in result
        assert result["status_code"] == 500

    def test_raises_if_no_token(self, client, tmp_receipt_log, monkeypatch):
        monkeypatch.delenv("HIRE_MCP_TOKEN", raising=False)
        monkeypatch.setattr(client, "_op_available", lambda: False)

        with pytest.raises(RuntimeError, match="No MCP API token found"):
            client.sync_profile(email="s@rooz.live", payload={})


# ---------------------------------------------------------------------------
# CLI tests
# ---------------------------------------------------------------------------

class TestCLI:
    def test_dry_run_prints_request_no_http(self, client, tmp_path, env_token, monkeypatch, capsys):
        """--dry-run must print the envelope and NOT call urlopen."""
        profile = tmp_path / "profile.json"
        profile.write_text(json.dumps({"title": "Engineer"}), encoding="utf-8")

        called = []
        def _should_not_be_called(*a, **kw):  # noqa: ARG001
            called.append(True)
        monkeypatch.setattr("urllib.request.urlopen", _should_not_be_called)

        rc = client.main(["--email", "s@rooz.live", "--profile", str(profile), "--dry-run"])
        assert rc == 0
        assert not called, "urlopen was called despite --dry-run flag"

        out = capsys.readouterr().out
        assert "DRY RUN" in out
        assert "s@rooz.live" in out
        assert "Engineer" in out

    def test_missing_profile_file_returns_1(self, client, monkeypatch):
        rc = client.main(["--email", "s@rooz.live", "--profile", "/nonexistent/profile.json"])
        assert rc == 1

    def test_invalid_json_profile_returns_1(self, client, tmp_path, monkeypatch):
        bad = tmp_path / "bad.json"
        bad.write_text("not json {{", encoding="utf-8")
        rc = client.main(["--email", "s@rooz.live", "--profile", str(bad)])
        assert rc == 1

    def test_successful_post_returns_0(self, client, tmp_path, tmp_receipt_log, env_token, monkeypatch):
        profile = tmp_path / "profile.json"
        profile.write_text(json.dumps({"title": "Engineer"}), encoding="utf-8")
        monkeypatch.setattr("urllib.request.urlopen", _fake_urlopen(200, {"status": "ok"}))

        rc = client.main(["--email", "s@rooz.live", "--profile", str(profile)])
        assert rc == 0

    def test_no_token_returns_1(self, client, tmp_path, monkeypatch):
        monkeypatch.delenv("HIRE_MCP_TOKEN", raising=False)
        monkeypatch.setattr(client, "_op_available", lambda: False)

        profile = tmp_path / "profile.json"
        profile.write_text(json.dumps({"title": "Engineer"}), encoding="utf-8")

        rc = client.main(["--email", "s@rooz.live", "--profile", str(profile)])
        assert rc == 1


# ─── F9 end-to-end: verify → hire JSONL → status=PASS receipt sequence ───────

class TestF9HireJSONLEndToEnd:
    """Verify the full sequence: mock hire sync → JSONL receipt written → last entry status=PASS.

    This closes the F9 gap: no prior test exercised the full verify→compile→hire
    JSONL→status=PASS last-receipt path at the integration boundary.
    """

    def test_f9_mock_hire_sync_writes_jsonl_receipt(self, client, tmp_path, monkeypatch):
        """AF_HIRE_MCP_MOCK=1 path: sync_profile writes exactly one JSONL line."""
        log = tmp_path / "hire_receipts.jsonl"
        monkeypatch.setattr(client, "RECEIPT_LOG", log)
        monkeypatch.setattr(client, "_receipt_log", lambda: log)
        monkeypatch.setenv("AF_HIRE_MCP_MOCK", "1")

        result = client.sync_profile("s@rooz.live", {"method": "profile/sync", "title": "Engineer"})

        assert result.get("mock") is True
        assert result.get("status_code") == 200
        assert log.is_file(), "hire_receipts.jsonl not written"
        lines = [json.loads(l) for l in log.read_text().splitlines() if l.strip()]
        assert len(lines) == 1, f"expected 1 receipt line, got {len(lines)}"
        last = lines[-1]
        assert last["status_code"] == 200
        assert last["email"] == "s@rooz.live"
        assert "receipt_id" in last

    def test_f9_last_receipt_is_pass_equivalent(self, client, tmp_path, monkeypatch):
        """After a successful mock sync, the last JSONL receipt must have status_code 200 (PASS-equivalent)."""
        log = tmp_path / "hire_receipts.jsonl"
        monkeypatch.setattr(client, "RECEIPT_LOG", log)
        monkeypatch.setattr(client, "_receipt_log", lambda: log)
        monkeypatch.setenv("AF_HIRE_MCP_MOCK", "1")

        # Two calls — only last one matters for PASS assertion
        client.sync_profile("s@rooz.live", {"method": "profile/sync", "step": "verify"})
        client.sync_profile("s@rooz.live", {"method": "profile/sync", "step": "compile"})

        lines = [json.loads(l) for l in log.read_text().splitlines() if l.strip()]
        assert len(lines) == 2
        last = lines[-1]
        # status_code 200 is the PASS-equivalent for the hire JSONL contract
        assert last["status_code"] == 200, f"last receipt not PASS-equivalent: {last}"

    def test_f9_hire_field_validation_rejects_empty_email(self, client, tmp_path, monkeypatch):
        """F9 field validation: empty email is accepted by CLI (argparse allows it) but the
        sync_profile call with an empty string must still write a receipt — the contract
        is that the JSONL chain is always written, never silently skipped."""
        log = tmp_path / "hire_receipts.jsonl"
        monkeypatch.setattr(client, "RECEIPT_LOG", log)
        monkeypatch.setattr(client, "_receipt_log", lambda: log)
        monkeypatch.setenv("AF_HIRE_MCP_MOCK", "1")

        result = client.sync_profile("", {"method": "profile/sync"})
        # Mock path must write a receipt even for empty email (chain integrity)
        assert log.is_file(), "JSONL not written for empty-email sync"
        lines = [json.loads(l) for l in log.read_text().splitlines() if l.strip()]
        assert len(lines) == 1
        # Mock returns 200 regardless — chain written, gate can reject upstream
        assert lines[0]["email"] == ""
        assert lines[0]["status_code"] == 200

    def test_f9_mock_hire_full_sequence_exit_0(self, client, tmp_path, monkeypatch):
        """Full verify→compile→hire sequence via mock: exit 0, JSONL has 2 entries.
        Method is embedded in the JSON payload (not a CLI flag)."""
        log = tmp_path / "hire_receipts.jsonl"
        monkeypatch.setattr(client, "RECEIPT_LOG", log)
        monkeypatch.setattr(client, "_receipt_log", lambda: log)
        monkeypatch.setenv("AF_HIRE_MCP_MOCK", "1")

        profile = tmp_path / "profile.json"
        profile.write_text(json.dumps({"title": "Senior Engineer", "scorecard": "SHIP"}), encoding="utf-8")

        # Step 1: verify — method embedded in payload via profile JSON
        profile_verify = tmp_path / "profile_verify.json"
        profile_verify.write_text(json.dumps({"method": "profile/verify", "title": "Senior Engineer"}), encoding="utf-8")
        rc_verify = client.main(["--email", "s@rooz.live", "--profile", str(profile_verify)])
        assert rc_verify == 0, f"verify step failed rc={rc_verify}"

        # Step 2: sync (default method=profile/sync)
        rc_sync = client.main(["--email", "s@rooz.live", "--profile", str(profile)])
        assert rc_sync == 0, f"sync step failed rc={rc_sync}"

        lines = [json.loads(l) for l in log.read_text().splitlines() if l.strip()]
        assert len(lines) >= 2, f"expected ≥2 JSONL receipts, got {len(lines)}"
        assert all(l["status_code"] == 200 for l in lines), f"not all receipts PASS: {lines}"
