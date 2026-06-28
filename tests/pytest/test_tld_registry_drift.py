"""Tests for scripts/metrics/tld_registry_drift.py."""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
DRIFT_MODULE = REPO_ROOT / "scripts" / "metrics" / "tld_registry_drift.py"

sys.path.insert(0, str(DRIFT_MODULE.parent))
import tld_registry_drift as drift  # noqa: E402


def test_drift_detector_loads_spec_and_registry():
    report = drift.compute_drift(REPO_ROOT)
    assert report["schema"] == "metrics.tld_registry_drift.v1"
    assert report["spec_count"] > 0
    assert report["registry_count"] > 0


def test_tld_gate_domains_are_in_registry():
    report = drift.compute_drift(REPO_ROOT)
    assert report["only_in_spec"] == [], f"TLD gate domains missing from registry: {report['only_in_spec']}"


def test_drift_false_when_registry_is_superset():
    report = drift.compute_drift(REPO_ROOT)
    assert report["drift"] is False


def test_telegram_epic_cab_is_in_registry():
    report = drift.compute_drift(REPO_ROOT)
    registry = drift._registry_domains(REPO_ROOT / drift.REGISTRY_REL)
    assert "telegram.epic.cab" in registry


def test_no_duplicate_fqdns_in_registry():
    entries = drift._registry_entries(REPO_ROOT / drift.REGISTRY_REL)
    seen: set[str] = set()
    for e in entries:
        fqdn = e.get("fqdn")
        assert fqdn not in seen, f"duplicate fqdn: {fqdn}"
        seen.add(fqdn)


def test_all_registry_entries_have_gate_tier():
    entries = drift._registry_entries(REPO_ROOT / drift.REGISTRY_REL)
    for e in entries:
        fqdn = e.get("fqdn", "<unknown>")
        assert e.get("gate_tier") in ("smoke", "billing", "apex"), f"{fqdn} has invalid gate_tier"
