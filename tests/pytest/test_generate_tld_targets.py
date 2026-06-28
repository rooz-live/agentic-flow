"""Tests for scripts/metrics/generate_tld_targets.py (fqdn_registry → tld-targets)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
GEN_MODULE = REPO_ROOT / "scripts" / "metrics" / "generate_tld_targets.py"

sys.path.insert(0, str(GEN_MODULE.parent))
import generate_tld_targets as gen  # noqa: E402


def test_build_targets_includes_tag_vote_with_redirects():
    doc = gen.build_targets(REPO_ROOT)
    by_tld = {t["tld"]: t for t in doc["targets"]}
    tag = by_tld["tag.vote"]
    assert tag["gate_tier"] == "apex"
    assert tag["redirects"] is True
    assert "tag" in tag["titlePattern"]


def test_redirect_config_entries_reference_existing_canonical_yaml():
    registry = yaml.safe_load((REPO_ROOT / gen.REGISTRY_REL).read_text(encoding="utf-8"))
    for entry in registry.get("domains") or []:
        rel = entry.get("redirect_config")
        if not rel:
            continue
        path = REPO_ROOT / rel
        assert path.is_file(), f"{entry['fqdn']}: missing redirect_config {rel}"
        policy = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert policy.get("domain") == entry["fqdn"]


def test_generated_json_matches_registry_check():
    expected = json.dumps(gen.build_targets(REPO_ROOT), indent=2) + "\n"
    on_disk = (REPO_ROOT / gen.OUT_REL).read_text(encoding="utf-8")
    assert on_disk == expected
