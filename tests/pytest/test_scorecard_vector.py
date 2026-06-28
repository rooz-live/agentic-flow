"""Contract tests for cycle scorecard vector (gate integrity)."""
from __future__ import annotations

import os
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]


def test_scorecard_vector_does_not_default_allow_owned_local():
    src = (ROOT / "scripts/cicd/lib/scorecard_vector.py").read_text(encoding="utf-8")
    assert "AF_ALLOW_OWNED_LOCAL" not in src or "setdefault" not in src.split("AF_ALLOW_OWNED_LOCAL")[0][-80:]
    assert 'setdefault("AF_ALLOW_OWNED_LOCAL"' not in src


def test_deploy_uapi_shim_hard_fails():
    shim = (ROOT / "scripts/deploy_uapi.sh").read_text(encoding="utf-8")
    assert "exit 1" in shim
    assert "exec bash" not in shim
    assert "one.sh deploy-uapi" in shim
