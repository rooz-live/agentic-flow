"""Inverted OP: one bootstrap pass; export-shell must not re-hit op_read."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "cicd" / "lib"))

import env_key_resolver as er  # noqa: E402
import op_secret_cache as opc  # noqa: E402


def test_op_read_blocked_when_skip_without_allow(monkeypatch):
    monkeypatch.setenv("AF_SKIP_OP_READ", "1")
    monkeypatch.delenv("AF_ALLOW_OP_READ", raising=False)
    with patch.object(opc.subprocess, "run") as run:
        assert opc.op_read("op://Personal/Agentics/MCP API Token") is None
        run.assert_not_called()


def test_tick_bootstrap_caches_values_no_second_op_pass(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("REPO_ROOT", str(tmp_path))
    monkeypatch.delenv("AF_SKIP_OP_READ", raising=False)
    monkeypatch.delenv("AF_ALLOW_OP_READ", raising=False)
    (tmp_path / ".goalie").mkdir(parents=True)
    (tmp_path / ".goalie" / "ROAM_TRACKER.yaml").write_text("dependencies: []\n", encoding="utf-8")
    (tmp_path / ".goalie" / "ROAM_TRACKER_COG.yaml").write_text("risks: []\n", encoding="utf-8")
    (tmp_path / ".env").write_text('GEMINI_API_KEY=plain-env-key\n', encoding="utf-8")

    op_calls: list[str] = []

    def fake_op(ref: str):
        op_calls.append(ref)
        return None

    with patch.object(opc, "op_read", side_effect=fake_op):
        er.clear_value_cache()
        exports, _, _ = er.tick_bootstrap(tmp_path)

    assert "export GEMINI_API_KEY=" in exports
    assert os.environ.get("AF_SKIP_OP_READ") == "1"
    # env-first: no op reads needed for plain .env key
    assert op_calls == []
