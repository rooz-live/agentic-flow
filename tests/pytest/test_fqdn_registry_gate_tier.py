"""Registry contract: TLD gate subdomains and apex domains are in fqdn_registry.yaml."""
from __future__ import annotations

from pathlib import Path

import pytest
import yaml


@pytest.fixture()
def registry():
    path = Path(__file__).resolve().parents[2] / "config" / "fqdn_registry.yaml"
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def test_tld_gate_subdomains_present(registry):
    fqdns = {d["fqdn"] for d in registry["domains"]}
    required = {
        "interface.rooz.live",
        "law.rooz.live",
        "hab.yo.life",
        "pur.tag.vote",
        "file.720.chat",
    }
    missing = required - fqdns
    assert not missing, f"TLD gate subdomains missing from registry: {missing}"


def test_tld_gate_subdomains_marked_smoke(registry):
    by_fqdn = {d["fqdn"]: d for d in registry["domains"]}
    for sub in ("interface.rooz.live", "law.rooz.live", "hab.yo.life", "pur.tag.vote", "file.720.chat"):
        assert by_fqdn[sub].get("gate_tier") == "smoke", f"{sub} should have gate_tier=smoke"


def test_apex_domains_in_tld_gate_present(registry):
    fqdns = {d["fqdn"] for d in registry["domains"]}
    required = {"summerjobswap.com", "nextwavenetwork.com", "yo.life", "rooz.live", "tag.vote", "720.chat"}
    missing = required - fqdns
    assert not missing, f"Apex domains from TLD gate missing: {missing}"


def test_missing_apex_domains_added(registry):
    fqdns = {d["fqdn"] for d in registry["domains"]}
    assert "chatfans.fans" in fqdns
    assert "mbo.bio" in fqdns
