"""Contract tests for config/fqdn_registry.yaml apex entries."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
REGISTRY = REPO_ROOT / "config" / "fqdn_registry.yaml"

REQUIRED_KEYS = ("fqdn", "migration_status", "health_path", "roam_risk_id", "gate_tier")

APEX_FQDNS = (
    "720.chat",
    "amp.vote",
    "artchat.art",
    "bhopti.com",
    "yoservice.com",
)


@pytest.fixture(scope="module")
def domains():
    assert REGISTRY.is_file(), f"missing registry: {REGISTRY}"
    data = yaml.safe_load(REGISTRY.read_text(encoding="utf-8")) or {}
    return data.get("domains") or []


def test_registry_has_domains(domains):
    assert len(domains) >= len(APEX_FQDNS)


@pytest.mark.parametrize("apex", APEX_FQDNS)
def test_apex_entries_present(domains, apex):
    matches = [d for d in domains if d.get("fqdn") == apex]
    assert matches, f"missing apex entry: {apex}"


def test_every_domain_has_required_keys(domains):
    for entry in domains:
        fqdn = entry.get("fqdn", "<unknown>")
        for key in REQUIRED_KEYS:
            assert key in entry and entry[key] not in (None, ""), f"{fqdn} missing {key}"


def test_health_path_non_empty(domains):
    for entry in domains:
        hp = entry.get("health_path")
        assert isinstance(hp, str) and hp.strip(), f"{entry.get('fqdn')} health_path empty"


def test_no_duplicate_fqdns(domains):
    seen: set[str] = set()
    for entry in domains:
        fqdn = entry.get("fqdn", "<unknown>")
        assert fqdn not in seen, f"duplicate fqdn: {fqdn}"
        seen.add(fqdn)


def test_telegram_epic_cab_present_and_smoke(domains):
    by_fqdn = {d.get("fqdn"): d for d in domains}
    assert "telegram.epic.cab" in by_fqdn, "telegram.epic.cab missing from registry"
    assert by_fqdn["telegram.epic.cab"].get("gate_tier") == "smoke"
