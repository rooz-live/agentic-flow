"""Tests for feature flag registry helper."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "cicd" / "lib"))
import feature_flags as ff  # noqa: E402


def test_registry_loads():
    reg = ff.load_registry(REPO_ROOT)
    assert "flags" in reg
    assert "knob_auto_adjust" in reg["flags"]


def test_get_flag_default():
    assert ff.get_flag("knob_auto_adjust", root=REPO_ROOT) is True


def test_validate_registry_clean():
    assert ff.validate_registry(REPO_ROOT) == []
