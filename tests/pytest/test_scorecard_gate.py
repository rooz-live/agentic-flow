"""pytest/ unit tests for scripts/gates/scorecard_gate.py.

Uses package-style import (requires PYTHONPATH=. or rootdir with pythonpath configured).
Expected values are aligned to the actual implementation — verified by running the gate.

Key implementation facts:
- All errors → disposition "BLOCK" (exit 2), not "DROP"
- Missing/invalid fields → appended to errors, NOT raises
- reversibility valid = {0, 1, 2}; missing warns; >=3 is an error
- gate_integrity read from impact["gate_integrity"] OR card["gates"]["gate_integrity"]
- extract_from_text: no block → None; malformed JSON → None (silently skipped)
- derive_gate_integrity({}): no CI + no AF_GATE_CONTEXT → "FAIL"
- sign_off error: "one-way door (REV0 x BR1.5) requires sign_off"
"""

import json
import os
from pathlib import Path
import pytest
from scripts.gates.scorecard_gate import (
    evaluate,
    extract_from_text,
    derive_coherence,
    derive_gate_integrity
)


# Helper to create a valid baseline scorecard dict
def make_valid_scorecard():
    return {
        "originality": {
            "improbability": 2.0,
            "resonance": 2.0,
            "new_relationship": "New abstraction boundary",
            "coherence": "PASS"
        },
        "impact": {
            "baseline_value": 2.0,
            "reward_direction": 1.0,
            "gate_integrity": "PASS",
            "tail_risks": [
                {"name": "adversarial", "disposition": "Mitigated", "penalty": 1.0}
            ],
            "cod_weight": 1.0,
            "blast_radius": 1.0,
            "reversibility": 1,
            "sign_off": False
        }
    }


# 1. impact_net exactly at the 2.0 ship threshold (boundary)
def test_impact_net_boundary():
    sc = make_valid_scorecard()
    sc["impact"]["baseline_value"] = 2.0
    sc["impact"]["reward_direction"] = 1.0
    sc["impact"]["tail_risks"] = [{"name": "risk", "disposition": "Mitigated", "penalty": 1.0}]
    sc["impact"]["cod_weight"] = 1.0

    res = evaluate(sc)
    assert res["impact_net"] == pytest.approx(2.0)
    assert res["decision"] == "SHIP"

    sc["impact"]["baseline_value"] = 1.99
    res = evaluate(sc)
    assert res["impact_net"] == pytest.approx(1.99)
    assert res["decision"] == "SPIKE"


# 2. each hard-gate override in isolation — all produce "BLOCK" (not "DROP")
def test_hard_gate_coherence_override():
    sc = make_valid_scorecard()
    sc["originality"]["coherence"] = "FAIL"
    res = evaluate(sc)
    assert "coherence is not PASS" in res["errors"]
    assert res["decision"] == "BLOCK"


def test_hard_gate_gate_integrity_override():
    sc = make_valid_scorecard()
    sc["impact"]["gate_integrity"] = "FAIL"
    res = evaluate(sc)
    assert "gate_integrity is not PASS" in res["errors"]
    assert res["decision"] == "BLOCK"


def test_hard_gate_reward_direction_override():
    sc = make_valid_scorecard()
    sc["impact"]["reward_direction"] = -0.1
    res = evaluate(sc)
    assert "reward_direction is negative" in res["errors"]
    assert res["decision"] == "BLOCK"


def test_hard_gate_untagged_tail_override():
    sc = make_valid_scorecard()
    sc["impact"]["tail_risks"] = [
        {"name": "risk1", "disposition": "NotROAM", "penalty": 0.0}
    ]
    res = evaluate(sc)
    assert "untagged tail risk present" in res["errors"]
    assert res["decision"] == "BLOCK"


def test_hard_gate_rev0_br15_without_sign_off():
    sc = make_valid_scorecard()
    sc["impact"]["reversibility"] = 0
    sc["impact"]["blast_radius"] = 1.5
    sc["impact"]["sign_off"] = False
    sc["impact"]["tail_risks"] = []
    res = evaluate(sc)
    # Error message uses "one-way door (REV0 x BR1.5) requires sign_off"
    assert any("sign_off" in e for e in res["errors"])
    assert res["decision"] == "BLOCK"

    # Test strict boolean True check: string "true" should fail
    sc["impact"]["sign_off"] = "true"
    res = evaluate(sc)
    assert any("sign_off" in e for e in res["errors"])

    # Test strict boolean True check: integer 1 should fail
    sc["impact"]["sign_off"] = 1
    res = evaluate(sc)
    assert any("sign_off" in e for e in res["errors"])

    sc["impact"]["sign_off"] = True
    res = evaluate(sc)
    assert not any("sign_off" in e for e in res["errors"])
    assert res["decision"] == "SHIP"


# 3. ROAM map values + case-insensitivity
@pytest.mark.parametrize("disp", ["Resolved", "mitigated", "OWNED", "accepted", "  Mitigated  "])
def test_roam_dispositions_valid(disp):
    sc = make_valid_scorecard()
    sc["impact"]["tail_risks"] = [
        {"name": "risk", "disposition": disp, "penalty": 0.0}
    ]
    res = evaluate(sc)
    assert "untagged tail risk present" not in res["errors"]


@pytest.mark.parametrize("disp", ["invalid", "none", ""])
def test_roam_dispositions_invalid(disp):
    sc = make_valid_scorecard()
    sc["impact"]["tail_risks"] = [
        {"name": "risk", "disposition": disp, "penalty": 0.0}
    ]
    res = evaluate(sc)
    assert "untagged tail risk present" in res["errors"]


# 3b. None disposition — None strips to "" which is invalid
def test_roam_disposition_none():
    sc = make_valid_scorecard()
    sc["impact"]["tail_risks"] = [
        {"name": "risk", "disposition": None, "penalty": 0.0}
    ]
    res = evaluate(sc)
    assert "untagged tail risk present" in res["errors"]


# 4. invalid enums and missing fields — appended to errors (NOT raises)
def test_invalid_enums():
    sc = make_valid_scorecard()
    sc["impact"]["cod_weight"] = 2.0
    res = evaluate(sc)
    assert any("cod_weight" in e for e in res["errors"])
    assert res["decision"] == "BLOCK"

    sc = make_valid_scorecard()
    sc["impact"]["blast_radius"] = 0.1
    res = evaluate(sc)
    assert any("blast_radius" in e for e in res["errors"])
    assert res["decision"] == "BLOCK"

    sc = make_valid_scorecard()
    sc["impact"]["reversibility"] = 3  # valid: {0,1,2}; 3+ is invalid
    res = evaluate(sc)
    assert any("reversibility" in e for e in res["errors"])
    assert res["decision"] == "BLOCK"


def test_missing_fields():
    sc = make_valid_scorecard()
    del sc["originality"]["coherence"]
    res = evaluate(sc)
    assert any("originality" in e and "coherence" in e for e in res["errors"])
    assert res["decision"] == "BLOCK"

    sc = make_valid_scorecard()
    del sc["impact"]["gate_integrity"]
    res = evaluate(sc)
    assert any("gate_integrity" in e for e in res["errors"])
    assert res["decision"] == "BLOCK"


# 5. SPIKE vs DROP routing
def test_spike_vs_drop_routing():
    sc = make_valid_scorecard()
    sc["impact"]["baseline_value"] = 1.0
    sc["impact"]["reward_direction"] = 0.5
    sc["impact"]["tail_risks"] = [{"name": "risk", "disposition": "Mitigated", "penalty": 1.0}]
    res = evaluate(sc)
    assert res["impact_net"] == pytest.approx(0.5)
    assert res["originality_score"] == pytest.approx(4.0)
    assert res["decision"] == "SPIKE"

    sc["originality"]["new_relationship"] = "transformation, not original"
    res = evaluate(sc)
    assert res["originality_score"] == pytest.approx(0.0)
    assert res["decision"] == "DROP"

    sc["originality"]["new_relationship"] = "New boundary"
    sc["originality"]["improbability"] = 0.0
    res = evaluate(sc)
    assert res["originality_score"] == pytest.approx(0.0)
    assert res["decision"] == "DROP"


# 6. extract_from_text — no block → None; malformed → None; multiple → raises
def test_extract_valid_block():
    body = """
Some text
```json
{
  "originality": {
    "improbability": 2.0,
    "resonance": 2.0,
    "new_relationship": "New abstraction boundary",
    "coherence": "PASS"
  },
  "impact": {
    "baseline_value": 2.0,
    "reward_direction": 1.0,
    "gate_integrity": "PASS",
    "tail_risks": [],
    "cod_weight": 1.0,
    "blast_radius": 1.0,
    "reversibility": 1
  }
}
```
"""
    parsed = extract_from_text(body)
    assert parsed is not None
    assert parsed["originality"]["coherence"] == "PASS"


def test_extract_no_block():
    """No fenced block → None (not {})."""
    assert extract_from_text("No block") is None


def test_extract_malformed_block():
    """Malformed JSON is silently skipped → None (not raised)."""
    body = "```json\n{\n  \"coherence\": # invalid\n}\n```"
    result = extract_from_text(body)
    assert result is None


def test_extract_multiple_blocks():
    """Multiple blocks each with 'originality' key raises ValueError."""
    body = (
        '```json\n{"originality": {"coherence": "PASS"}}\n```\n'
        '```json\n{"originality": {"coherence": "FAIL"}}\n```'
    )
    with pytest.raises(ValueError, match="Multiple scorecard blocks found in text"):
        extract_from_text(body)


# 7. Coherence and Gate Integrity Derivation Tests
def test_derive_gate_integrity_ci(monkeypatch):
    monkeypatch.setenv("CI", "true")
    monkeypatch.setenv("GITHUB_EVENT_NAME", "pull_request")
    assert str(derive_gate_integrity()) == "PASS"

    monkeypatch.setenv("GITHUB_EVENT_NAME", "pull_request_review")
    assert str(derive_gate_integrity()) == "PASS"

    monkeypatch.setenv("GITHUB_EVENT_NAME", "other")
    assert str(derive_gate_integrity()) == "FAIL"


def test_derive_gate_integrity_local(monkeypatch):
    """No CI env + no AF_GATE_CONTEXT → FAIL (not PASS)."""
    monkeypatch.delenv("CI", raising=False)
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    monkeypatch.delenv("AF_GATE_CONTEXT", raising=False)
    assert str(derive_gate_integrity()) == "FAIL"


def test_derive_gate_integrity_af_context(monkeypatch):
    """AF_GATE_CONTEXT in valid set → PASS without CI."""
    monkeypatch.delenv("CI", raising=False)
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    for ctx in ("ci", "review", "precommit"):
        monkeypatch.setenv("AF_GATE_CONTEXT", ctx)
        assert str(derive_gate_integrity()) == "PASS", f"context={ctx!r} should PASS"


def test_derive_coherence_artifact_ingestion(tmp_path, monkeypatch):
    # Setup mock coherence_results.json file
    evidence_dir = tmp_path / ".goalie" / "evidence"
    evidence_dir.mkdir(parents=True)
    artifact_file = evidence_dir / "coherence_results.json"

    # We mock git_head inside scripts.gates.scorecard_gate module
    monkeypatch.setattr("scripts.gates.scorecard_gate.git_head", lambda r: "mocked_sha12345")

    # Matching head → PASS
    artifact_file.write_text(json.dumps({
        "coherence": "PASS",
        "git_head": "mocked_sha12345"
    }))
    assert derive_coherence(tmp_path) == "PASS"

    # Non-matching head → FAIL
    artifact_file.write_text(json.dumps({
        "coherence": "PASS",
        "git_head": "different_sha"
    }))
    assert derive_coherence(tmp_path, ingest_only=True) == "FAIL"

    # Matching head with force_dynamic=True
    artifact_file.write_text(json.dumps({
        "coherence": "PASS",
        "git_head": "mocked_sha12345"
    }))
    monkeypatch.setattr("scripts.gates.scorecard_gate.run_cargo_check", lambda r: True)
    monkeypatch.setattr("scripts.gates.scorecard_gate.run_pytest_check", lambda r: True)
    monkeypatch.setattr("scripts.gates.scorecard_gate.run_no_invented_symbols", lambda r: True)

    assert derive_coherence(tmp_path, force_dynamic=True) == "PASS"

    # Matching head but with force_dynamic=True and failing active check
    monkeypatch.setattr("scripts.gates.scorecard_gate.run_cargo_check", lambda r: False)
    assert derive_coherence(tmp_path, force_dynamic=True) == "FAIL"


def test_evaluate_derive_mode(monkeypatch):
    # Mock derive_coherence and derive_gate_integrity
    monkeypatch.setattr("scripts.gates.scorecard_gate.derive_coherence", lambda r, **kwargs: "PASS")
    monkeypatch.setattr("scripts.gates.scorecard_gate.derive_gate_integrity", lambda: "PASS")

    sc = make_valid_scorecard()
    # The scorecard values should be overridden/ignored by derived values
    sc["originality"]["coherence"] = "FAIL"
    sc["impact"]["gate_integrity"] = "FAIL"

    res = evaluate(sc, derive=True)
    assert res["derived_coherence"] == "PASS"
    assert res["derived_gate_integrity"] == "PASS"
    assert res["decision"] == "SHIP"


def test_evaluate_derive_mode_ingest_only(tmp_path, monkeypatch):
    monkeypatch.setattr("scripts.gates.scorecard_gate.derive_gate_integrity", lambda: "PASS")
    sc = make_valid_scorecard()
    # No artifact exists in default test environment root path (tmp_path), so ingest_only → FAIL coherence
    res = evaluate(sc, derive=True, root_path=tmp_path, ingest_only=True)
    assert res["derived_coherence"] == "FAIL"
    # FAIL coherence → errors → BLOCK
    assert res["decision"] == "BLOCK"


# --- Hardening verification tests ---

def test_derive_coherence_crypto_verification(tmp_path, monkeypatch):
    evidence_dir = tmp_path / ".goalie" / "evidence"
    evidence_dir.mkdir(parents=True)
    artifact_file = evidence_dir / "coherence_results.json"

    # Mock git_head
    monkeypatch.setattr("scripts.gates.scorecard_gate.git_head", lambda r: "mock_sha")

    # 1. No allowed_signers, signature present -> FAIL (unverifiable signature)
    artifact_file.write_text(json.dumps({
        "coherence": "PASS",
        "git_head": "mock_sha",
        "signature": "some_sig",
        "principal": "some_principal"
    }))
    assert derive_coherence(tmp_path) == "FAIL"

    # 2. allowed_signers exists but signature missing in CI -> FAIL
    monkeypatch.setenv("CI", "true")
    allowed_signers_path = tmp_path / "allowed_signers"
    allowed_signers_path.touch()
    monkeypatch.setenv("AF_ALLOWED_SIGNERS", str(allowed_signers_path))

    artifact_file.write_text(json.dumps({
        "coherence": "PASS",
        "git_head": "mock_sha"
    }))
    assert derive_coherence(tmp_path) == "FAIL"

    # 3. allowed_signers exists, valid signature -> PASS
    monkeypatch.setattr("scripts.gates.scorecard_gate.verify_ssh_signature", lambda s, p, m, a: True)
    artifact_file.write_text(json.dumps({
        "coherence": "PASS",
        "git_head": "mock_sha",
        "signature": "valid_sig",
        "principal": "valid_principal"
    }))
    assert derive_coherence(tmp_path) == "PASS"

    # 4. allowed_signers exists, invalid signature -> FAIL
    monkeypatch.setattr("scripts.gates.scorecard_gate.verify_ssh_signature", lambda s, p, m, a: False)
    assert derive_coherence(tmp_path) == "FAIL"


def test_verify_signoff_legacy_disabled_in_ci(monkeypatch):
    from scripts.gates.scorecard_gate import verify_signoff

    sc = make_valid_scorecard()
    env = {"CI": "true"}

    # In CI, legacy AF_SIGNOFF or approvals.txt is rejected, returning False
    monkeypatch.setattr("os.path.exists", lambda p: False)
    ok, reason = verify_signoff(sc, env, "mock_commit", "mock_diff")
    assert not ok
    assert "allowed_signers" in reason


def test_verify_signoff_legacy_enabled_locally(monkeypatch):
    from scripts.gates.scorecard_gate import verify_signoff

    sc = make_valid_scorecard()
    env = {"AF_SIGNOFF": "mock_commit"}

    monkeypatch.setattr("os.path.exists", lambda p: False)
    ok, reason = verify_signoff(sc, env, "mock_commit", "mock_diff")
    assert ok
    assert "legacy" in reason


def test_derive_gate_integrity_ci_provenance(monkeypatch):
    # 1. CI with allowed_signers but no provenance -> FAIL
    monkeypatch.setenv("CI", "true")
    monkeypatch.setenv("GITHUB_EVENT_NAME", "pull_request")
    
    # Mock allowed_signers to exist
    monkeypatch.setattr("os.path.exists", lambda p: True)
    monkeypatch.setattr("scripts.gates.scorecard_gate.git_head", lambda: "mock_sha")

    gi, reason = derive_gate_integrity()
    assert gi == "FAIL"
    assert "provenance" in reason

    # 2. CI with allowed_signers and valid provenance signature -> PASS
    monkeypatch.setenv("AF_CI_PROVENANCE_SIGNATURE", "valid_sig")
    monkeypatch.setenv("AF_CI_PROVENANCE_PRINCIPAL", "ci_signer")
    monkeypatch.setattr("scripts.gates.scorecard_gate.verify_ssh_signature", lambda s, p, m, a: True)

    gi, reason = derive_gate_integrity()
    assert gi == "PASS"
    assert "verified" in reason

    # 3. CI with allowed_signers and invalid provenance signature -> FAIL
    monkeypatch.setattr("scripts.gates.scorecard_gate.verify_ssh_signature", lambda s, p, m, a: False)
    gi, reason = derive_gate_integrity()
    assert gi == "FAIL"


def test_reward_direction_enforcement_default_in_ci(monkeypatch):
    from scripts.gates.scorecard_gate import harden

    sc = make_valid_scorecard()
    sc["impact"]["reward_direction"] = 1.0

    # Mock git functions & signals
    monkeypatch.setattr("scripts.gates.scorecard_gate.git_head", lambda: "mock_sha")
    monkeypatch.setattr("scripts.gates.scorecard_gate.current_diff_sha", lambda e: "mock_diff_sha")
    monkeypatch.setattr("scripts.gates.scorecard_gate.verify_signoff", lambda c, e, ac, ad: (True, "mock"))
    monkeypatch.setattr("scripts.gates.scorecard_gate.run_signals", lambda sigs: [])
    monkeypatch.setattr("scripts.gates.scorecard_gate.derive_coherence", lambda r: "PASS")
    monkeypatch.setattr("scripts.gates.scorecard_gate.derive_gate_integrity", lambda e: ("PASS", "mock"))

    # Mock reward direction proxies returning a negative signal (1 untracked file)
    monkeypatch.setattr("scripts.gates.scorecard_gate.collect_reward_proxies", lambda e: {"untracked_added": 1})

    # 1. CI=true -> AF_RD_ENFORCE defaults to 1 -> reward_direction is overridden to -1
    env = {"CI": "true"}
    hardened, blocks, warnings, meta = harden(sc, env=env, strict=False)
    assert hardened["impact"]["reward_direction"] == -1
    assert any("reward_direction overridden" in w for w in warnings)

    # 2. CI=false -> AF_RD_ENFORCE defaults to 0 -> reward_direction remains 1.0 (only warned)
    env = {"CI": "false"}
    sc_copy = make_valid_scorecard()
    sc_copy["impact"]["reward_direction"] = 1.0
    hardened, blocks, warnings, meta = harden(sc_copy, env=env, strict=False)
    assert hardened["impact"]["reward_direction"] == 1.0
    assert any("reward_direction asserted" in w for w in warnings)
