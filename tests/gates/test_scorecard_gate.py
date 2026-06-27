"""Unit tests for scripts/gates/scorecard_gate.py.

The gate is a standalone script (not a package), so we import it by path.
Expected values are derived from the actual implementation logic, verified
by running the gate and observing its outputs.

Key implementation facts (current version):
- All validation errors → disposition "BLOCK" (exit 2)
- Missing/invalid fields → appended to errors, NOT raised (safe math fallbacks apply)
- reversibility valid = {0, 1, 2}; missing warns; 3+ is an error
- gate_integrity read from card["gates"]["gate_integrity"] OR impact["gate_integrity"]
- extract_from_text: filters blocks by "originality" key, malformed JSON → None, no block → None
- derive_gate_integrity({}): no CI + no AF_GATE_CONTEXT → "FAIL"
"""

import copy
import importlib.util
import io
import json
import pathlib

import pytest


def _load_gate():
    here = pathlib.Path(__file__).resolve()
    for parent in here.parents:
        cand = parent / "scripts" / "gates" / "scorecard_gate.py"
        if cand.exists():
            spec = importlib.util.spec_from_file_location("scorecard_gate", cand)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod
    raise RuntimeError("scorecard_gate.py not found above test file")


gate = _load_gate()

# Fully valid SHIP card.
# gate_integrity lives in impact (also accepted under "gates" sub-object per implementation).
# reversibility: 1 (fully reversible; valid values are 0, 1, 2).
# impact_net = (2 + 1 - tail_penalty) * 1.5
#   tail_penalty = severity(2) * ROAM_mult(0.5) * blast_radius(1.0) = 1.0
#   impact_net   = (2 + 1 - 1.0) * 1.5 = 3.0
# originality  = 2 * 3 * 1.0 = 6.0
VALID = {
    "originality": {
        "improbability": 2,
        "resonance": 3,
        "new_relationship": True,
        "coherence": "PASS",
    },
    "impact": {
        "baseline_value": 2,
        "reward_direction": 1,
        "gate_integrity": "PASS",
        "tails": [{"name": "t", "severity": 2, "roam": "Mitigated"}],
        "blast_radius": 1.0,
        "cod_weight": 1.5,
        "reversibility": 1,
    },
    "sign_off": False,
}


def base():
    return copy.deepcopy(VALID)


def has(items, needle):
    return any(needle in str(item) for item in items)


# --------------------------------------------------------------------------- #
# evaluate(): disposition + scoring
# --------------------------------------------------------------------------- #
def test_valid_card_ships():
    r = gate.evaluate(base())
    assert r["disposition"] == "SHIP"
    assert r["impact_net"] == pytest.approx(3.0)
    assert r["originality_score"] == pytest.approx(6.0)
    assert r["tail_penalty"] == pytest.approx(1.0)
    assert r["blocks"] == []


def test_ship_threshold_is_inclusive():
    """impact_net exactly at the 2.0 threshold ships (boundary condition)."""
    c = base()
    c["originality"].update(improbability=1, resonance=1)
    c["impact"].update(
        baseline_value=2, reward_direction=0, cod_weight=1.0, blast_radius=1.0, tails=[]
    )
    r = gate.evaluate(c)
    assert r["impact_net"] == pytest.approx(2.0)
    assert r["disposition"] == "SHIP"


def test_just_below_threshold_drops():
    """impact_net just below 2.0 drops."""
    c = base()
    c["originality"].update(improbability=1, resonance=1)
    c["impact"].update(
        baseline_value=1, reward_direction=0, cod_weight=1.0, blast_radius=1.0, tails=[]
    )
    r = gate.evaluate(c)
    assert r["impact_net"] == pytest.approx(1.0)
    assert r["disposition"] == "DROP"


def test_high_originality_low_impact_spikes():
    """originality >= 4 with impact below threshold → SPIKE."""
    c = base()
    c["originality"].update(improbability=2, resonance=2, new_relationship=True)
    c["impact"].update(
        baseline_value=0, reward_direction=0, blast_radius=0.5, cod_weight=0.5, tails=[]
    )
    r = gate.evaluate(c)
    assert r["originality_score"] == pytest.approx(4.0)
    assert r["impact_net"] == pytest.approx(0.0)
    assert r["disposition"] == "SPIKE"


# --------------------------------------------------------------------------- #
# Hard gates — each in isolation (otherwise-valid card).
# All hard-gate errors produce "BLOCK" (exit 2).
# --------------------------------------------------------------------------- #
def test_coherence_fail_blocks_and_zeros_originality():
    c = base()
    c["originality"]["coherence"] = "FAIL"
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert r["originality_score"] == 0.0
    assert has(r["blocks"], "coherence")


def test_gate_integrity_fail_blocks():
    c = base()
    c["impact"]["gate_integrity"] = "FAIL"
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert has(r["blocks"], "gate_integrity")


def test_gate_integrity_can_live_in_gates_subobject():
    """gate_integrity accepted from card['gates']['gate_integrity'] too."""
    c = base()
    del c["impact"]["gate_integrity"]
    c["gates"] = {"gate_integrity": "PASS"}
    r = gate.evaluate(c)
    assert r["disposition"] == "SHIP"


def test_missing_gate_integrity_blocks():
    """gate_integrity absent from both impact and gates → missing field error → BLOCK."""
    c = base()
    del c["impact"]["gate_integrity"]
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert has(r["blocks"], "gate_integrity")


def test_negative_reward_direction_blocks():
    c = base()
    c["impact"]["reward_direction"] = -1
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert has(r["blocks"], "reward_direction")


def test_untagged_tail_blocks():
    c = base()
    c["impact"]["tails"] = [{"name": "x", "severity": 2}]
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert has(r["blocks"], "untagged")


def test_rev0_br15_blocks_without_signoff():
    """REV0 × BR1.5 without sign_off → BLOCK."""
    c = base()
    c["impact"]["reversibility"] = 0
    c["impact"]["blast_radius"] = 1.5
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert has(r["blocks"], "sign_off") or has(r["blocks"], "one-way door")


def test_rev0_br15_sign_off_must_be_strict_bool_true():
    """sign_off must be exactly boolean True — strings, int, and None all fail."""
    for bad_val in ["true", "True", 1, 0, None, False, "yes"]:
        c = base()
        c["impact"]["reversibility"] = 0
        c["impact"]["blast_radius"] = 1.5
        c["sign_off"] = bad_val
        r = gate.evaluate(c)
        assert r["disposition"] == "BLOCK", (
            f"sign_off={bad_val!r} should have blocked but got {r['disposition']}"
        )


def test_rev0_br15_allowed_with_bool_true_signoff():
    """REV0 × BR1.5 with sign_off=True ships."""
    c = base()
    c["impact"]["reversibility"] = 0
    c["impact"]["blast_radius"] = 1.5
    c["sign_off"] = True
    r = gate.evaluate(c)
    assert r["blocks"] == []
    # tail_penalty = 2 * 0.5 * 1.5 = 1.5; impact_net = (2 + 1 - 1.5) * 1.5 = 2.25
    assert r["impact_net"] == pytest.approx(2.25)
    assert r["disposition"] == "SHIP"


# --------------------------------------------------------------------------- #
# ROAM map + case-insensitivity
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "roam,mult", [("Resolved", 0.0), ("Mitigated", 0.5), ("Owned", 1.0), ("Accepted", 1.0)]
)
def test_roam_penalty_multipliers(roam, mult):
    c = base()
    c["impact"].update(blast_radius=1.0, cod_weight=1.0)
    c["impact"]["tails"] = [{"name": "t", "severity": 2, "roam": roam}]
    r = gate.evaluate(c)
    assert r["tail_penalty"] == pytest.approx(2 * mult)
    assert r["impact_net"] == pytest.approx(3 - 2 * mult)


def test_coherence_case_insensitive():
    c = base()
    c["originality"]["coherence"] = "pass"
    r = gate.evaluate(c)
    assert not has(r["blocks"], "coherence")


def test_roam_case_insensitive():
    c = base()
    c["impact"]["tails"] = [{"name": "t", "severity": 2, "roam": "mItIgAtEd"}]
    r = gate.evaluate(c)
    assert r["tail_penalty"] == pytest.approx(1.0)  # 2 * 0.5 * blast(1.0)


@pytest.mark.parametrize("bad_disp", ["invalid", "none", ""])
def test_roam_invalid_disposition_blocks(bad_disp):
    c = base()
    c["impact"]["tails"] = [{"name": "t", "severity": 2, "disposition": bad_disp}]
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert has(r["blocks"], "untagged")


# --------------------------------------------------------------------------- #
# Enum / field validation — invalid values → errors (BLOCK), NOT raises
# --------------------------------------------------------------------------- #
def test_invalid_blast_radius_blocks():
    """Invalid blast_radius appends an error → BLOCK, does NOT raise."""
    c = base()
    c["impact"]["blast_radius"] = 2.0
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert has(r["blocks"], "blast_radius")


def test_invalid_cod_weight_blocks():
    c = base()
    c["impact"]["cod_weight"] = 0.7
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert has(r["blocks"], "cod_weight")


def test_invalid_reversibility_blocks():
    """reversibility=3 is invalid → BLOCK."""
    c = base()
    c["impact"]["reversibility"] = 3
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert has(r["blocks"], "reversibility")


def test_missing_baseline_value_blocks():
    c = base()
    del c["impact"]["baseline_value"]
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert has(r["blocks"], "baseline_value")


def test_bool_is_not_a_number_for_improbability():
    c = base()
    c["originality"]["improbability"] = True
    r = gate.evaluate(c)
    assert has(r["blocks"], "improbability")


def test_empty_card_blocks():
    r = gate.evaluate({})
    assert r["disposition"] == "BLOCK"


def test_reversibility_missing_warns_not_blocks():
    """Missing reversibility warns and defaults to 2 (reversible) — does NOT block."""
    c = base()
    del c["impact"]["reversibility"]
    r = gate.evaluate(c)
    assert r["disposition"] == "SHIP"
    assert has(r["warnings"], "reversibility")


def test_reversibility_valid_values_ship():
    """All valid reversibility values (0, 1, 2) allow ship for otherwise-good card."""
    for rev in (0, 1, 2):
        c = base()
        c["impact"]["reversibility"] = rev
        r = gate.evaluate(c)
        assert r["disposition"] == "SHIP", f"reversibility={rev} should SHIP"


def test_no_tails_warns():
    c = base()
    c["impact"]["tails"] = []
    r = gate.evaluate(c)
    assert has(r["warnings"], "no tails")


def test_ship_threshold_override(monkeypatch):
    monkeypatch.setattr(gate, "SHIP_THRESHOLD", 5.0)
    r = gate.evaluate(base())  # impact_net 3.0 < 5.0, originality 6 >= 4 -> SPIKE
    assert r["disposition"] == "SPIKE"


# --------------------------------------------------------------------------- #
# extract_from_text(): PR/MR body parsing
#
# Current implementation filters by "originality" key presence, silently skips
# malformed JSON, and returns None (not {}) when no matching block found.
# --------------------------------------------------------------------------- #
def test_extract_scorecard_fence_nested():
    text = '```scorecard\n{"originality": {"coherence": "PASS"}, "impact": {"x": 1}}\n```'
    obj = gate.extract_from_text(text)
    assert obj is not None
    assert obj["originality"]["coherence"] == "PASS"


def test_extract_json_fence():
    result = gate.extract_from_text('```json\n{"originality": {}}\n```')
    assert result is not None
    assert "originality" in result


def test_extract_untagged_fence():
    result = gate.extract_from_text('```\n{"originality": {"k": 1}}\n```')
    assert result is not None


def test_extract_html_comment_region():
    text = '<!-- SCORECARD -->\n{"originality": {}}\n<!-- /SCORECARD -->'
    result = gate.extract_from_text(text)
    assert result is not None


def test_extract_multiple_scorecard_blocks_raises():
    """Multiple blocks that each contain 'originality' raises ValueError."""
    text = (
        '```json\n{"originality": {"coherence": "PASS"}}\n```\n'
        '```json\n{"originality": {"coherence": "FAIL"}}\n```'
    )
    with pytest.raises(ValueError, match="Multiple scorecard blocks found"):
        gate.extract_from_text(text)


def test_extract_malformed_json_returns_none():
    """Malformed JSON in a fenced block is silently skipped → returns None."""
    result = gate.extract_from_text("```scorecard\n{not json}\n```")
    assert result is None


def test_extract_no_block_returns_none():
    assert gate.extract_from_text("just prose, no fences") is None


def test_extract_block_without_originality_key_returns_none():
    """A valid JSON block without 'originality' key is not a scorecard → None."""
    assert gate.extract_from_text('```json\n{"foo": 1}\n```') is None


def test_extract_non_dict_json_returns_none():
    assert gate.extract_from_text('```json\n[1, 2, 3]\n```') is None


# --------------------------------------------------------------------------- #
# main(): exit codes + source resolution
# --------------------------------------------------------------------------- #
def test_main_file_ship(tmp_path, monkeypatch):
    monkeypatch.delenv("CI", raising=False)
    monkeypatch.delenv("AF_GATE_CONTEXT", raising=False)
    p = tmp_path / "c.json"
    p.write_text(json.dumps(VALID))
    assert gate.main(["--file", str(p)]) == 0


def test_main_file_block(tmp_path, monkeypatch):
    """Coherence FAIL → BLOCK → exit 2."""
    monkeypatch.delenv("CI", raising=False)
    monkeypatch.delenv("AF_GATE_CONTEXT", raising=False)
    c = base()
    c["originality"]["coherence"] = "FAIL"
    p = tmp_path / "c.json"
    p.write_text(json.dumps(c))
    assert gate.main(["--file", str(p)]) == 2


def test_main_bad_json_returns_parse_error(tmp_path, monkeypatch):
    monkeypatch.delenv("CI", raising=False)
    monkeypatch.delenv("AF_GATE_CONTEXT", raising=False)
    p = tmp_path / "bad.json"
    p.write_text("{not json")
    assert gate.main(["--file", str(p)]) == 3


def test_main_precommit_soft_skip(tmp_path, monkeypatch):
    monkeypatch.setattr(gate, "DEFAULT_SCORECARD", str(tmp_path / "nope.json"))
    monkeypatch.delenv("AF_REQUIRE_SCORECARD", raising=False)
    assert gate.main(["--precommit"]) == 0


def test_main_precommit_enforced(tmp_path, monkeypatch):
    monkeypatch.setattr(gate, "DEFAULT_SCORECARD", str(tmp_path / "nope.json"))
    monkeypatch.setenv("AF_REQUIRE_SCORECARD", "1")
    assert gate.main(["--precommit"]) == 2


def test_main_pr_body_stdin(monkeypatch):
    monkeypatch.delenv("CI", raising=False)
    monkeypatch.delenv("AF_GATE_CONTEXT", raising=False)
    body = "## PR\n```scorecard\n" + json.dumps(VALID) + "\n```"
    monkeypatch.setattr("sys.stdin", io.StringIO(body))
    assert gate.main(["--pr-body", "-"]) == 0


# --------------------------------------------------------------------------- #
# Hardening: derived signals replace self-asserted fields
# --------------------------------------------------------------------------- #
def test_derive_coherence_all_required_ok():
    res = [
        {"name": "a", "required": True, "ok": True},
        {"name": "b", "required": True, "ok": True},
    ]
    assert gate.derive_coherence(res) == "PASS"


def test_derive_coherence_one_required_fails():
    res = [
        {"name": "a", "required": True, "ok": True},
        {"name": "b", "required": True, "ok": False},
    ]
    assert gate.derive_coherence(res) == "FAIL"


def test_derive_coherence_ignores_non_required():
    res = [
        {"name": "a", "required": True, "ok": True},
        {"name": "b", "required": False, "ok": False},
    ]
    assert gate.derive_coherence(res) == "PASS"


def test_derive_coherence_nothing_required_is_fail():
    res = [{"name": "a", "required": False, "ok": True}]
    assert gate.derive_coherence(res) == "FAIL"


def test_derive_gate_integrity_ci_pull_request(monkeypatch):
    """CI + pull_request event + cryptographic verification → PASS."""
    import os
    monkeypatch.setattr(os.path, "exists", lambda p: True)
    monkeypatch.setattr(gate, "git_head", lambda: "mock_commit")
    monkeypatch.setattr(gate, "verify_ssh_signature", lambda s, p, m, a: True)
    verdict, _ = gate.derive_gate_integrity({
        "CI": "true",
        "GITHUB_EVENT_NAME": "pull_request",
        "AF_CI_PROVENANCE_SIGNATURE": "mock_sig",
        "AF_CI_PROVENANCE_PRINCIPAL": "mock_signer"
    })
    assert verdict == "PASS"




def test_derive_gate_integrity_ci_invalid_event():
    """CI but wrong event (push) → FAIL."""
    verdict, _ = gate.derive_gate_integrity({"CI": "true", "GITHUB_EVENT_NAME": "push"})
    assert verdict == "FAIL"


def test_derive_gate_integrity_context_token():
    """AF_GATE_CONTEXT in {'ci','review','precommit'} → PASS without CI env."""
    verdict, _ = gate.derive_gate_integrity({"AF_GATE_CONTEXT": "review"})
    assert verdict == "PASS"


def test_derive_gate_integrity_empty_env_fails():
    """No CI env and no AF_GATE_CONTEXT → OWNED (local fallback)."""
    verdict, _ = gate.derive_gate_integrity({})
    assert verdict == "OWNED"


def test_check_binding_missing_strict_blocks():
    blocks, warns = gate.check_binding({}, "abc", "def", strict=True)
    assert blocks and not warns


def test_check_binding_missing_lenient_warns():
    blocks, warns = gate.check_binding({}, "abc", "def", strict=False)
    assert warns and not blocks


def test_check_binding_commit_mismatch_blocks():
    blocks, _ = gate.check_binding({"commit": "aaaa"}, "bbbb", None, strict=False)
    assert any("stale" in b for b in blocks)


def test_check_binding_commit_match_ok():
    blocks, _ = gate.check_binding({"commit": "abc123"}, "abc123", None, strict=False)
    assert not blocks


def test_check_binding_diff_mismatch_blocks():
    blocks, _ = gate.check_binding({"diff_sha256": "x"}, "abc", "y", strict=False)
    assert any("diff_sha256" in b for b in blocks)


def test_derive_reward_direction_untracked_negative():
    rd, notes = gate.derive_reward_direction({"untracked_added": 3})
    assert rd == -1 and notes


def test_derive_reward_direction_clean_positive():
    rd, _ = gate.derive_reward_direction({"untracked_added": 0})
    assert rd == 1


def test_run_signals_missing_executable():
    res = gate.run_signals(
        [{"name": "nope", "cmd": ["definitely-not-a-real-bin-xyz"], "required": True}]
    )
    assert res[0]["ok"] is False
    assert res[0]["returncode"] == 127


def test_run_signals_success_and_failure():
    res = gate.run_signals(
        [
            {"name": "ok", "cmd": ["python3", "-c", "import sys; sys.exit(0)"], "required": True},
            {"name": "bad", "cmd": ["python3", "-c", "import sys; sys.exit(1)"], "required": True},
        ]
    )
    assert res[0]["ok"] is True
    assert res[1]["ok"] is False


def test_harden_overrides_self_asserted_fields(monkeypatch):
    monkeypatch.setattr(gate, "load_signals", lambda: [])
    monkeypatch.setattr(
        gate, "run_signals", lambda *a, **k: [{"name": "x", "required": True, "ok": False}]
    )
    monkeypatch.setattr(gate, "git_head", lambda *a, **k: "abc123")
    monkeypatch.setattr(gate, "current_diff_sha", lambda env: None)
    monkeypatch.setattr(gate, "collect_reward_proxies", lambda env: {"untracked_added": 0})
    monkeypatch.setattr(gate, "_git", lambda *a, **k: None)
    c = base()  # self-asserts coherence PASS + gate_integrity PASS
    c["commit"] = "abc123"
    hardened, blocks, warns, meta = gate.harden(
        c, env={"AF_GATE_CONTEXT": "ci"}, strict=False
    )
    assert hardened["originality"]["coherence"] == "FAIL"  # signals overrode the lie
    assert meta["coherence_derived"] == "FAIL"
    assert not blocks  # commit matches HEAD


def test_finalize_merges_blocks_and_attaches_meta():
    r = gate.evaluate(base())  # SHIP
    r2 = gate.finalize(r, ["HARD GATE: stale"], ["w"], {"commit": "x"})
    assert r2["disposition"] == "BLOCK"
    assert "verification" in r2


def _verify_mocks(monkeypatch, signal_ok, head="abc123"):
    monkeypatch.setattr(gate, "load_signals", lambda: [])
    monkeypatch.setattr(
        gate, "run_signals",
        lambda *a, **k: [{"name": "cargo", "required": True, "ok": signal_ok}],
    )
    monkeypatch.setattr(gate, "git_head", lambda *a, **k: head)
    monkeypatch.setattr(gate, "current_diff_sha", lambda env: None)
    monkeypatch.setattr(gate, "collect_reward_proxies", lambda env: {})
    monkeypatch.setattr(gate, "_git", lambda *a, **k: None)
    monkeypatch.setenv("AF_GATE_CONTEXT", "ci")


def test_main_verify_blocks_when_coherence_signal_fails(tmp_path, monkeypatch):
    _verify_mocks(monkeypatch, signal_ok=False)
    c = base()  # LIES: self-asserts coherence PASS
    c["commit"] = "abc123"
    p = tmp_path / "c.json"
    p.write_text(json.dumps(c))
    assert gate.main(["--file", str(p), "--verify"]) == 2


def test_main_verify_ships_when_signals_pass(tmp_path, monkeypatch):
    _verify_mocks(monkeypatch, signal_ok=True)
    c = base()
    c["commit"] = "abc123"
    p = tmp_path / "c.json"
    p.write_text(json.dumps(c))
    assert gate.main(["--file", str(p), "--verify"]) == 0


def test_main_verify_blocks_on_stale_commit(tmp_path, monkeypatch):
    _verify_mocks(monkeypatch, signal_ok=True, head="newsha")
    c = base()
    c["commit"] = "oldsha"  # stale binding
    p = tmp_path / "c.json"
    p.write_text(json.dumps(c))
    assert gate.main(["--file", str(p), "--verify"]) == 2


def test_collect_reward_proxies_is_bounded(monkeypatch):
    # Regression: the untracked scan must be path-scoped to src/ and time-capped.
    calls = []

    def fake_git(args, timeout=30, root="."):
        calls.append({"args": args, "timeout": timeout})
        return "src/foo.py\nother.py\n"

    monkeypatch.setattr(gate, "_git", fake_git)
    proxies = gate.collect_reward_proxies({})
    first_call = calls[0]
    assert "--" in first_call["args"] and "src" in first_call["args"]  # path-scoped
    assert first_call["timeout"] <= 30  # time-capped
    assert proxies["untracked_added"] == 1


# --------------------------------------------------------------------------- #
# GATE-004: no-invented-paths
# --------------------------------------------------------------------------- #
def test_find_invented_paths(monkeypatch):
    def mock_git(args, root="."):
        if "scripts/gates/scorecard_gate.py" in args:
            return "scripts/gates/scorecard_gate.py"
        return None
    monkeypatch.setattr(gate, "_git", mock_git)
    invented = gate.find_invented_paths(
        ["scripts/gates/scorecard_gate.py", "scripts/nope_xyz_123.py"]
    )
    assert invented == ["scripts/nope_xyz_123.py"]  # resolves via git mock


def test_main_verify_blocks_invented_paths(tmp_path, monkeypatch):
    _verify_mocks(monkeypatch, signal_ok=True)
    monkeypatch.setattr(
        gate, "find_invented_paths", lambda refs, root=".": ["src/ghost.py"] if refs else []
    )
    c = base()
    c["commit"] = "abc123"
    c["referenced_paths"] = ["src/ghost.py"]
    p = tmp_path / "c.json"
    p.write_text(json.dumps(c))
    assert gate.main(["--file", str(p), "--verify"]) == 2


# --------------------------------------------------------------------------- #
# GATE-003: unforgeable sign_off
# --------------------------------------------------------------------------- #
def test_verify_signoff_env_commit():
    ok, _ = gate.verify_signoff({}, {"AF_SIGNOFF": "abc123", "AF_LEGACY_SIGNOFF": "1", "AF_ALLOWED_SIGNERS": "/nonexistent"}, "abc123", "diffsha")
    assert ok


def test_verify_signoff_env_diff():
    ok, _ = gate.verify_signoff({}, {"AF_SIGNOFF": "diffsha", "AF_LEGACY_SIGNOFF": "1", "AF_ALLOWED_SIGNERS": "/nonexistent"}, "abc123", "diffsha")
    assert ok


def test_verify_signoff_none():
    ok, _ = gate.verify_signoff({}, {}, "abc123", "diffsha")
    assert not ok


def test_verify_signoff_approvals_file(tmp_path, monkeypatch):
    f = tmp_path / "approvals.txt"
    f.write_text("# approvals\nabc123\n")
    monkeypatch.setattr(gate, "APPROVALS_FILE", str(f))
    ok, _ = gate.verify_signoff({}, {"AF_LEGACY_SIGNOFF": "1", "AF_ALLOWED_SIGNERS": "/nonexistent"}, "abc123", "diff")
    assert ok


def test_verify_signoff_cryptographic_good(tmp_path, monkeypatch):
    allowed_signers = tmp_path / "allowed_signers"
    allowed_signers.write_text("approver@rooz.live ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA\n")
    
    card = {
        "sign_off_principal": "approver@rooz.live",
        "sign_off_signature": "valid-sig"
    }
    
    # Mock verify_ssh_signature to return True
    monkeypatch.setattr(gate, "verify_ssh_signature", lambda sig, princ, msg, path: True)
    
    ok, reason = gate.verify_signoff(card, {"AF_ALLOWED_SIGNERS": str(allowed_signers)}, "abc123commit", None)
    assert ok
    assert "cryptographically verified" in reason


def test_verify_signoff_cryptographic_bad(tmp_path, monkeypatch):
    allowed_signers = tmp_path / "allowed_signers"
    allowed_signers.write_text("approver@rooz.live ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA\n")
    
    card = {
        "sign_off_principal": "approver@rooz.live",
        "sign_off_signature": "invalid-sig"
    }
    
    # Mock verify_ssh_signature to return False
    monkeypatch.setattr(gate, "verify_ssh_signature", lambda sig, princ, msg, path: False)
    
    ok, reason = gate.verify_signoff(card, {"AF_ALLOWED_SIGNERS": str(allowed_signers)}, "abc123commit", None)
    assert not ok
    assert "verification failed" in reason


def test_main_verify_one_way_door_blocks_self_signoff(tmp_path, monkeypatch):
    _verify_mocks(monkeypatch, signal_ok=True)
    monkeypatch.delenv("AF_SIGNOFF", raising=False)
    c = base()
    c["impact"]["reversibility"] = 0
    c["impact"]["blast_radius"] = 1.5
    c["sign_off"] = True  # self-asserted → must be ignored by harden()
    c["commit"] = "abc123"
    p = tmp_path / "c.json"
    p.write_text(json.dumps(c))
    assert gate.main(["--file", str(p), "--verify"]) == 2


def test_main_verify_one_way_door_allows_external_signoff(tmp_path, monkeypatch):
    _verify_mocks(monkeypatch, signal_ok=True)
    monkeypatch.setenv("AF_SIGNOFF", "abc123")  # matches git_head
    c = base()
    c["impact"]["reversibility"] = 0
    c["impact"]["blast_radius"] = 1.5
    c["commit"] = "abc123"
    p = tmp_path / "c.json"
    p.write_text(json.dumps(c))
    
    # 1. Legacy sign-off must be rejected for one-way door -> BLOCK (2)
    assert gate.main(["--file", str(p), "--verify"]) == 2
    
    # 2. Cryptographic signature with allowed_signers exists -> SHIP (0)
    import os
    monkeypatch.setattr(os.path, "exists", lambda path: True)
    monkeypatch.setattr(gate, "verify_ssh_signature", lambda s, p, m, a: True)
    c["sign_off_principal"] = "owner"
    c["sign_off_signature"] = "valid_sig"
    p.write_text(json.dumps(c))
    assert gate.main(["--file", str(p), "--verify"]) == 0




# --------------------------------------------------------------------------- #
# GATE-006: scored reward_direction (opt-in enforcement)
# --------------------------------------------------------------------------- #
def test_harden_rd_advisory_by_default(monkeypatch):
    _verify_mocks(monkeypatch, signal_ok=True)
    monkeypatch.setattr(gate, "collect_reward_proxies", lambda env: {"untracked_added": 5})
    c = base()
    c["commit"] = "abc123"
    hardened, blocks, warns, meta = gate.harden(
        c, env={"AF_GATE_CONTEXT": "ci"}, strict=False
    )
    assert hardened["impact"]["reward_direction"] == 1  # unchanged (advisory)
    assert meta["reward_direction_enforced"] is False
    assert any("proxy" in w for w in warns)


def test_harden_rd_enforced_overrides_negative(monkeypatch):
    _verify_mocks(monkeypatch, signal_ok=True)
    monkeypatch.setattr(gate, "collect_reward_proxies", lambda env: {"untracked_added": 5})
    c = base()
    c["commit"] = "abc123"
    hardened, blocks, warns, meta = gate.harden(
        c, env={"AF_GATE_CONTEXT": "ci", "AF_RD_ENFORCE": "1"}, strict=False
    )
    assert hardened["impact"]["reward_direction"] == -1  # overridden by signals
    assert meta["reward_direction_enforced"] is True


def test_harden_coherence_hybrid_gating_local_ingest(monkeypatch):
    monkeypatch.setattr(gate, "git_head", lambda *a, **k: "abc123")
    monkeypatch.setattr(gate, "current_diff_sha", lambda env: None)
    monkeypatch.setattr(gate, "collect_reward_proxies", lambda env: {})
    
    # Mock derive_coherence to return PASS from ingested file
    monkeypatch.setattr(gate, "derive_coherence", lambda *a, **k: "PASS")
    
    c = base()
    c["commit"] = "abc123"
    
    # Run in local context with ingest_only=True
    hardened, blocks, warns, meta = gate.harden(
        c, env={}, strict=False, ingest_only=True
    )
    assert hardened["originality"]["coherence"] == "PASS"
    assert meta.get("coherence_ingested") is True
    assert "signals" not in meta


def test_harden_coherence_hybrid_gating_ci_ingest(monkeypatch):
    monkeypatch.setattr(gate, "git_head", lambda *a, **k: "abc123")
    monkeypatch.setattr(gate, "current_diff_sha", lambda env: None)
    monkeypatch.setattr(gate, "collect_reward_proxies", lambda env: {})
    
    # Mock load_signals and run_signals
    monkeypatch.setattr(gate, "load_signals", lambda: [])
    monkeypatch.setattr(
        gate, "run_signals", lambda *a, **k: [{"name": "mock", "required": True, "ok": True}]
    )
    # derive_coherence will check signals and return PASS
    monkeypatch.setattr(gate, "derive_coherence", lambda res, *a, **k: "PASS" if isinstance(res, list) else "FAIL")
    
    c = base()
    c["commit"] = "abc123"
    
    # Run in CI context with ingest_only=True
    hardened, blocks, warns, meta = gate.harden(
        c, env={"CI": "true"}, strict=False, ingest_only=True
    )
    assert hardened["originality"]["coherence"] == "PASS"
    assert meta.get("coherence_ingested") is not True  # should not ingest
    assert "signals" in meta  # ran dynamically


def test_harden_blocks_unsigned_db_schema_or_model_alterations(monkeypatch, tmp_path):
    sc = base()
    monkeypatch.setattr(gate, "git_head", lambda *a, **k: "mock_sha")
    monkeypatch.setattr(gate, "current_diff_sha", lambda *a, **k: "mock_diff")
    monkeypatch.setattr(gate, "run_signals", lambda *a, **k: [])
    monkeypatch.setattr(gate, "derive_coherence", lambda *a, **k: "PASS")
    monkeypatch.setattr(gate, "derive_gate_integrity", lambda *a, **k: ("PASS", "mock"))
    monkeypatch.setattr(gate, "verify_signoff", lambda *a, **k: (False, "unsigned"))
    
    def mock_altered(*a, **k):
        return {"src/db/schema.sql"}
    monkeypatch.setattr(gate, "get_altered_files", mock_altered)
    
    hardened, blocks, warns, meta = gate.harden(sc, env={}, strict=False, ingest_only=True)
    assert any("alterations to DB schemas or models require a cryptographically verified review signature" in err for err in blocks)


def test_harden_allows_signed_db_schema_or_model_alterations(monkeypatch, tmp_path):
    sc = base()
    monkeypatch.setattr(gate, "git_head", lambda *a, **k: "mock_sha")
    monkeypatch.setattr(gate, "current_diff_sha", lambda *a, **k: "mock_diff")
    monkeypatch.setattr(gate, "run_signals", lambda *a, **k: [])
    monkeypatch.setattr(gate, "derive_coherence", lambda *a, **k: "PASS")
    monkeypatch.setattr(gate, "derive_gate_integrity", lambda *a, **k: ("PASS", "mock"))
    monkeypatch.setattr(gate, "verify_signoff", lambda *a, **k: (True, "signed"))
    
    def mock_altered(*a, **k):
        return {"src/db/schema.sql"}
    monkeypatch.setattr(gate, "get_altered_files", mock_altered)
    
    hardened, blocks, warns, meta = gate.harden(sc, env={}, strict=False, ingest_only=True)
    assert not any("alterations to DB schemas or models require a cryptographically verified review signature" in err for err in blocks)


def test_load_signals_rejects_unsigned_changes_locally(monkeypatch, tmp_path):
    monkeypatch.setenv("AF_GATE_CONTEXT", "precommit")
    monkeypatch.delenv("CI", raising=False)
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    
    signals_file = tmp_path / "verify_signals.json"
    custom_signals = [{"name": "custom-cmd", "cmd": "echo 1"}]
    signals_file.write_text(json.dumps({
        "signals": custom_signals,
        "signature": "invalid_signature",
        "principal": "owner"
    }))
    
    monkeypatch.setattr(gate, "VERIFY_SIGNALS_FILE", str(signals_file))
    
    # Mock verify_signals.json is modified locally
    def mock_git(args, **kwargs):
        if "status" in args:
            return " M " + str(signals_file)
        return ""
    monkeypatch.setattr(gate, "_git", mock_git)
    
    # Mock verify_ssh_signature to fail
    monkeypatch.setattr(gate, "verify_ssh_signature", lambda *a, **k: False)
    
    # Should fall back to DEFAULT_SIGNALS
    assert gate.load_signals() == gate.DEFAULT_SIGNALS


def test_collect_reward_proxies_scans_all_directories(monkeypatch):
    def mock_git(args, **kwargs):
        if "ls-files" in args:
            target = args[-1]
            return f"{target}/untracked_file.py"
        return ""
    monkeypatch.setattr(gate, "_git", mock_git)
    
    proxies = gate.collect_reward_proxies({})
    assert proxies["untracked_added"] == 4


def test_audit_pytest_imports_allowed_and_untracked(tmp_path, monkeypatch):
    pytest_dir = tmp_path / "tests" / "pytest"
    pytest_dir.mkdir(parents=True)
    (tmp_path / "requirements.txt").write_text("pytest\nrequests\npyyaml\n")
    (tmp_path / "package.json").write_text(json.dumps({"dependencies": {"lodash": "1.0.0"}}))
    
    test_file = pytest_dir / "test_ok.py"
    test_file.write_text("import pytest\nimport os\nimport requests\nimport yaml\n")
    assert gate.audit_pytest_imports(str(tmp_path)) is True
    
    test_file.write_text("import pytest\nimport untracked_pkg\n")
    assert gate.audit_pytest_imports(str(tmp_path)) is False


def test_roam_tracker_update_unregistered_untracked_files(monkeypatch, tmp_path):
    sc = base()
    monkeypatch.setattr(gate, "git_head", lambda *a, **k: "mock_sha")
    monkeypatch.setattr(gate, "current_diff_sha", lambda *a, **k: "mock_diff")
    monkeypatch.setattr(gate, "run_signals", lambda *a, **k: [])
    monkeypatch.setattr(gate, "derive_coherence", lambda *a, **k: "PASS")
    monkeypatch.setattr(gate, "derive_gate_integrity", lambda *a, **k: ("PASS", "mock"))
    monkeypatch.setattr(gate, "verify_signoff", lambda *a, **k: (True, "mock"))
    
    # Mock ROAM_TRACKER.yaml is modified
    # And mock untracked files to return src/new_file.py
    def mock_git(args, **kwargs):
        if "status" in args and "ROAM_TRACKER.yaml" in args:
            return " M ROAM_TRACKER.yaml"
        if "ls-files" in args and "--others" in args:
            return "src/new_file.py"
        return ""
    monkeypatch.setattr(gate, "_git", mock_git)
    
    # Write ROAM_TRACKER.yaml without src/new_file.py
    tracker_file = tmp_path / "ROAM_TRACKER.yaml"
    tracker_file.write_text("metadata:\n  version: '2.5'\n")
    
    monkeypatch.chdir(tmp_path)
    
    hardened, blocks, warns, meta = gate.harden(sc, env={}, strict=False, ingest_only=True)
    assert any("ROAM_TRACKER.yaml was updated, but the following newly added untracked files are not registered" in err for err in blocks)
    
    # Now write ROAM_TRACKER.yaml WITH src/new_file.py
    tracker_file.write_text("metadata:\n  version: '2.5'\nrisks:\n  - path: src/new_file.py\n")
    hardened, blocks, warns, meta = gate.harden(sc, env={}, strict=False, ingest_only=True)
    assert not any("ROAM_TRACKER.yaml was updated, but the following newly added untracked files are not registered" in err for err in blocks)

