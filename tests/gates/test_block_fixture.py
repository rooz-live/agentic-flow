"""Negative-path test: an intentionally-bad scorecard must BLOCK (exit code 2).

Pairs with the real PR demo that carries the same BLOCK scorecard in its body to
verify the required CI gate fails and prevents merge.
"""

import importlib.util
import json
import pathlib


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
FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "block_example.json"


def test_block_fixture_disposition_is_block():
    card = json.loads(FIXTURE.read_text())
    result = gate.evaluate(card)
    assert result["disposition"] == "BLOCK"
    # Both intended hard gates should be present.
    blocks = " ".join(result["blocks"])
    assert "reward_direction" in blocks
    assert "untagged" in blocks


def test_block_fixture_main_exit_code_is_2():
    assert gate.main(["--file", str(FIXTURE)]) == 2
