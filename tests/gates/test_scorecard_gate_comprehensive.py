"""Comprehensive unit tests for scripts/gates/scorecard_gate.py.

This file covers all scenarios requested in the task instruction.
"""

import copy
import importlib.util
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

# Baseline VALID card that ships.
# originality_score = 2.0 * 3.0 * 1.0 = 6.0
# tail_penalty = severity(2.0) * roam(mitigated=0.5) * blast_radius(1.0) = 1.0
# impact_net = (baseline(2.0) + reward_direction(1.0) - tail_penalty(1.0)) * cod_weight(1.0) = 2.0
# This is exactly at the 2.0 ship threshold.
BASELINE_VALID = {
    "originality": {
        "improbability": 2.0,
        "resonance": 3.0,
        "new_relationship": True,
        "coherence": "PASS",
    },
    "impact": {
        "baseline_value": 2.0,
        "reward_direction": 1.0,
        "gate_integrity": "PASS",
        "tails": [{"name": "risk1", "severity": 2.0, "roam": "mitigated"}],
        "blast_radius": 1.0,
        "cod_weight": 1.0,
        "reversibility": 2,
        "sign_off": True,
    },
    "gates": {
        "gate_integrity": "PASS"
    },
    "sign_off": True
}

def get_base():
    return copy.deepcopy(BASELINE_VALID)

# --------------------------------------------------------------------------- #
# 1. impact_net exactly at the 2.0 ship threshold (boundary)
# --------------------------------------------------------------------------- #
def test_impact_net_exactly_at_threshold_ships():
    c = get_base()
    # impact_net = (2.0 + 1.0 - 1.0) * 1.0 = 2.0
    r = gate.evaluate(c)
    assert r["impact_net"] == pytest.approx(2.0)
    assert r["disposition"] == "SHIP"
    assert not r["errors"]

def test_impact_net_just_below_threshold_drops_or_spikes():
    c = get_base()
    c["impact"]["baseline_value"] = 1.99
    # impact_net = (1.99 + 1.0 - 1.0) * 1.0 = 1.99
    # With originality_score = 6.0, it routes to SPIKE
    r = gate.evaluate(c)
    assert r["impact_net"] == pytest.approx(1.99)
    assert r["disposition"] == "SPIKE"
    assert not r["errors"]

    # If originality_score is also low, it routes to DROP
    c["originality"]["resonance"] = 1.0
    # originality_score = 2.0 * 1.0 = 2.0 (< 4.0)
    r2 = gate.evaluate(c)
    assert r2["impact_net"] == pytest.approx(1.99)
    assert r2["disposition"] == "DROP"
    assert not r2["errors"]

def test_impact_net_just_above_threshold_ships():
    c = get_base()
    c["impact"]["baseline_value"] = 2.01
    # impact_net = (2.01 + 1.0 - 1.0) * 1.0 = 2.01
    r = gate.evaluate(c)
    assert r["impact_net"] == pytest.approx(2.01)
    assert r["disposition"] == "SHIP"
    assert not r["errors"]

# --------------------------------------------------------------------------- #
# 2. Hard-gate overrides in isolation
# --------------------------------------------------------------------------- #
def test_hard_gate_coherence_not_pass_blocks():
    # Coherence != PASS blocks and originality score is zeroed
    c = get_base()
    c["originality"]["coherence"] = "FAIL"
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert r["originality_score"] == 0.0
    assert any("coherence" in err for err in r["errors"])

def test_hard_gate_gate_integrity_not_pass_blocks():
    # gate_integrity != PASS blocks
    c = get_base()
    c["gates"]["gate_integrity"] = "FAIL"
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert any("gate_integrity" in err for err in r["errors"])

def test_hard_gate_reward_direction_negative_blocks():
    # reward_direction < 0 blocks
    c = get_base()
    c["impact"]["reward_direction"] = -0.1
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert any("reward_direction is negative" in err for err in r["errors"])

def test_hard_gate_untagged_tail_blocks():
    # Untagged tail risk blocks
    c = get_base()
    c["impact"]["tails"] = [{"name": "risk1", "severity": 1.0}]  # no roam disposition
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert any("untagged tail risk present" in err for err in r["errors"])

def test_hard_gate_rev0_br15_without_signoff_blocks():
    # REV0 x BR1.5 without sign_off blocks
    c = get_base()
    c["impact"]["reversibility"] = 0
    c["impact"]["blast_radius"] = 1.5
    c["sign_off"] = False
    c["impact"]["sign_off"] = False
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert any("requires sign_off" in err for err in r["errors"])

# --------------------------------------------------------------------------- #
# 3. ROAM map values + case-insensitivity
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("disposition,multiplier", [
    ("resolved", 0.0),
    ("mitigated", 0.5),
    ("owned", 1.0),
    ("accepted", 1.0),
    ("RESOLVED", 0.0),
    ("MiTiGaTeD", 0.5),
    ("Owned", 1.0),
    ("ACCEPTED", 1.0),
])
def test_roam_map_values_and_case_insensitivity(disposition, multiplier):
    c = get_base()
    c["impact"]["tails"] = [{"name": "risk1", "severity": 2.0, "roam": disposition}]
    r = gate.evaluate(c)
    expected_penalty = 2.0 * multiplier * 1.0
    assert r["tail_penalty"] == pytest.approx(expected_penalty)
    assert not r["errors"]

# --------------------------------------------------------------------------- #
# 4. Invalid enums and missing fields
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("invalid_blast", [0.2, 1.2, 1.8])
def test_invalid_blast_radius_blocks(invalid_blast):
    c = get_base()
    c["impact"]["blast_radius"] = invalid_blast
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert any("blast_radius must be in" in err for err in r["errors"])

@pytest.mark.parametrize("invalid_cod", [0.2, 1.2, 1.8])
def test_invalid_cod_weight_blocks(invalid_cod):
    c = get_base()
    c["impact"]["cod_weight"] = invalid_cod
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert any("cod_weight must be in" in err for err in r["errors"])

@pytest.mark.parametrize("invalid_rev", [-1, 3, 2.5])
def test_invalid_reversibility_blocks(invalid_rev):
    c = get_base()
    c["impact"]["reversibility"] = invalid_rev
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert any("reversibility must be 0, 1, or 2" in err for err in r["errors"])

def test_missing_fields_blocks():
    # Remove required originality field
    c = get_base()
    del c["originality"]["resonance"]
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert any("Missing required originality field: resonance" in err for err in r["errors"])

    # Remove required impact field
    c = get_base()
    del c["impact"]["baseline_value"]
    r = gate.evaluate(c)
    assert r["disposition"] == "BLOCK"
    assert any("Missing required impact field: baseline_value" in err for err in r["errors"])

# --------------------------------------------------------------------------- #
# 5. SPIKE vs DROP routing
# --------------------------------------------------------------------------- #
def test_spike_routing():
    # Doesn't ship (impact_net < 2.0), but originality >= 4.0 -> SPIKE
    c = get_base()
    c["impact"]["baseline_value"] = 1.0
    c["impact"]["reward_direction"] = 0.0
    c["impact"]["tails"] = []
    # impact_net = (1.0 + 0.0 - 0.0) * 1.0 = 1.0 (drops below 2.0)
    # originality_score = 2.0 * 3.0 * 1.0 = 6.0 (>= 4.0)
    r = gate.evaluate(c)
    assert r["impact_net"] == pytest.approx(1.0)
    assert r["originality_score"] == pytest.approx(6.0)
    assert r["disposition"] == "SPIKE"

def test_drop_routing():
    # Doesn't ship (impact_net < 2.0), and originality < 4.0 -> DROP
    c = get_base()
    c["impact"]["baseline_value"] = 1.0
    c["impact"]["reward_direction"] = 0.0
    c["impact"]["tails"] = []
    c["originality"]["resonance"] = 1.0
    # impact_net = (1.0 + 0.0 - 0.0) * 1.0 = 1.0 (drops below 2.0)
    # originality_score = 2.0 * 1.0 * 1.0 = 2.0 (< 4.0)
    r = gate.evaluate(c)
    assert r["impact_net"] == pytest.approx(1.0)
    assert r["originality_score"] == pytest.approx(2.0)
    assert r["disposition"] == "DROP"

# --------------------------------------------------------------------------- #
# 6. extract_from_text: multiple/malformed fenced blocks
# --------------------------------------------------------------------------- #
def test_extract_from_text_multiple_blocks_raises():
    text = """
Some text
```json
{
  "originality": {
    "coherence": "PASS"
  }
}
```
And another one
```scorecard
{
  "originality": {
    "coherence": "FAIL"
  }
}
```
"""
    with pytest.raises(ValueError, match="Multiple scorecard blocks found in text"):
        gate.extract_from_text(text)

def test_extract_from_text_malformed_block_returns_none():
    text = """
Some text
```json
{
  "originality": {
    "coherence": "PASS"
  ,
}
```
"""
    assert gate.extract_from_text(text) is None
