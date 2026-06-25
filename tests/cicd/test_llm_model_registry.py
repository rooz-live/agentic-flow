"""Tests for OpenRouter LLM tier registry."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / "scripts" / "cicd" / "lib"
sys.path.insert(0, str(LIB))

from llm_model_registry import export_env, resolve_model  # noqa: E402


def test_resolve_standard_tier():
    resolved = resolve_model("standard", ROOT)
    assert resolved["provider"] == "openrouter"
    assert resolved["model_id"] == "z-ai/glm-5.2"
    assert resolved["tier"] == "standard"


def test_resolve_free_tier():
    resolved = resolve_model("free", ROOT)
    assert resolved["model_id"] == "google/gemma-4-31b-it"


def test_export_env_sets_aqe_keys():
    env = export_env("standard", ROOT)
    assert env["AQE_MODEL"] == "z-ai/glm-5.2"
    assert env["OPENROUTER_MODEL"] == "z-ai/glm-5.2"
    assert env["AQE_FREE_TIER_MODEL"] == "google/gemma-4-31b-it"
    assert env["AQE_LLM_TIER"] == "standard"


def test_cli_json():
    proc = subprocess.run(
        [sys.executable, str(LIB / "llm_model_registry.py"), "--tier", "free", "--json"],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
        check=False,
    )
    assert proc.returncode == 0
    payload = json.loads(proc.stdout)
    assert payload["model_id"] == "google/gemma-4-31b-it"
