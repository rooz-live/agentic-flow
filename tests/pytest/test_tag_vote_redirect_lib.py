"""Canonical tag.vote redirect config contract tests."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "edge"))

from tag_vote_redirect_lib import (  # noqa: E402
    destinations,
    load_policy,
    render_htaccess,
    sync_domain_routes,
)


def test_canonical_destinations():
    policy = load_policy(ROOT)
    domain, apex, cog = destinations(policy)
    assert domain == "tag.vote"
    assert "discord" in apex.lower()
    assert "cognitum" in cog.lower()
    assert "2rbzTT" in cog


def test_htaccess_uses_canonical_urls():
    policy = load_policy(ROOT)
    _, apex, cog = destinations(policy)
    ht = render_htaccess(policy)
    assert cog in ht
    assert apex in ht
    assert "cognitum.one/?ref=" not in ht.split("RewriteRule ^/?$")[0]


def test_domain_routes_matches_canonical():
    routes = sync_domain_routes(ROOT, write=False)
    policy = load_policy(ROOT)
    _, apex, cog = destinations(policy)
    tag = next(e for e in routes["domains"] if e["fqdn"] == "tag.vote")
    assert tag["expected_redirect"] == apex
    assert tag["expected_cog_redirect"] == cog
    assert tag.get("canonical") == "config/edge/tag_vote_redirect.yaml"


def test_check_cli_ok():
    from tag_vote_redirect_lib import main

    assert main(["check"]) == 0
