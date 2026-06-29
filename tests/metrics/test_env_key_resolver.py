"""Env key resolver: .env* vectors + op:// Antigravity vault."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/cicd/lib"))

from env_key_resolver import _env_files, _parse_dotenv, resolve_keys, DEP_KEY_MAP


def test_env_glob_includes_config_dotenv():
    files = _env_files(ROOT)
    rel = {str(p.relative_to(ROOT)) for p in files}
    assert "config/.env" in rel or ".env" in rel


def test_parse_config_dotenv_finds_llm_keys(tmp_path):
  # Use real repo config/.env when present
    cfg = ROOT / "config/.env"
    if not cfg.is_file():
        return
    dot = _parse_dotenv(cfg, keys={"GEMINI_API_KEY", "ANTHROPIC_API_KEY"})
    assert "GEMINI_API_KEY" in dot or "ANTHROPIC_API_KEY" in dot


def test_resolve_keys_finds_gemini_or_anthropic():
    os.environ.setdefault("AF_SKIP_OP_READ", "1")
    keys = resolve_keys(ROOT)
    assert DEP_KEY_MAP["DEP-008"] in keys
    assert DEP_KEY_MAP["DEP-009"] in keys
    # At least one should be present in this repo (config/.env)
    assert keys["GEMINI_API_KEY"].present or keys["ANTHROPIC_API_KEY"].present


def test_parse_dotenv_lazy_only_requested_keys(tmp_path, monkeypatch):
    calls: list[str] = []

    def fake_op_read(ref: str):
        calls.append(ref)
        return "secret-value"

    monkeypatch.setattr("env_key_resolver.op_read", fake_op_read)
    dotenv = tmp_path / ".env"
    dotenv.write_text(
        "CPANEL_PASSWORD=op://Personal/WHM/pass\n"
        "ZAI_API_KEY=op://Personal/Z.ai/Devin\n",
        encoding="utf-8",
    )
    from env_key_resolver import _parse_dotenv

    out = _parse_dotenv(dotenv, keys={"ZAI_API_KEY"})
    assert out == {"ZAI_API_KEY": "secret-value"}
    assert calls == ["op://Personal/Z.ai/Devin"]


def test_vault_scan_gated_by_env(monkeypatch):
    monkeypatch.delenv("AF_OP_VAULT_SCAN", raising=False)
    monkeypatch.setenv("AF_SKIP_OP_READ", "1")
    from env_key_resolver import _scan_op_vault_for_keys

    assert _scan_op_vault_for_keys(["GEMINI_API_KEY"]) == {}


def test_op_cache_reuses_value(monkeypatch):
    import op_secret_cache

    op_secret_cache.clear_op_cache()
    calls: list[str] = []

    def fake_run(cmd, **kwargs):
        class R:
            returncode = 0
            stdout = "cached-secret\n"

        calls.append(cmd[-1])
        return R()

    monkeypatch.delenv("AF_SKIP_OP_READ", raising=False)
    monkeypatch.setattr(op_secret_cache.subprocess, "run", fake_run)
    monkeypatch.setattr(op_secret_cache, "cache_ttl_sec", lambda: 900)

    ref = "op://Personal/Z.ai/Devin"
    assert op_secret_cache.op_read(ref) == "cached-secret"
    assert op_secret_cache.op_read(ref) == "cached-secret"
    assert calls == [ref]


def test_resolve_key_value_skips_unrelated_dotenv_op_refs(tmp_path, monkeypatch):
    calls: list[str] = []

    def fake_op_read(ref: str):
        calls.append(ref)
        return "zai-key" if "Z.ai" in ref else None

    monkeypatch.setattr("env_key_resolver.op_read", fake_op_read)
    monkeypatch.delenv("AF_SKIP_OP_READ", raising=False)
    monkeypatch.delenv("ZAI_API_KEY", raising=False)
    (tmp_path / ".env").write_text(
        "CPANEL_PASSWORD=op://Personal/WHM/pass\n"
        "ZAI_API_KEY=op://Personal/Z.ai/Devin\n",
        encoding="utf-8",
    )
    from env_key_resolver import resolve_key_value, clear_value_cache

    clear_value_cache()
    val, src = resolve_key_value("ZAI_API_KEY", tmp_path)
    assert val == "zai-key"
    assert calls == ["op://Personal/Z.ai/Devin"]
