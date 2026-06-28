from pathlib import Path

from scripts.metrics.scorecard_resolver import is_scorecard_document, resolve_scorecard_path


def test_is_scorecard_document_rejects_coherence_artifact():
    assert not is_scorecard_document({"gate": "coherence", "coherence": "PASS"})
    assert not is_scorecard_document({"decision": "BLOCK", "impact": {}, "gates": {}})


def test_is_scorecard_document_accepts_scorecard_shape():
    doc = {
        "originality": {"improbability": 1, "resonance": 1},
        "impact": {"baseline_value": 1, "cod_weight": 1},
    }
    assert is_scorecard_document(doc)


def test_resolve_prefers_current_over_latest(tmp_path, monkeypatch):
    monkeypatch.setenv("REPO_ROOT", str(tmp_path))
    sc = tmp_path / ".goalie" / "scorecards"
    sc.mkdir(parents=True)
    latest = sc / "latest.json"
    current = sc / "current.json"
    latest.write_text('{"originality": {}, "impact": {}}\n', encoding="utf-8")
    current.write_text('{"originality": {}, "impact": {}}\n', encoding="utf-8")
    resolved = resolve_scorecard_path(tmp_path)
    assert resolved == current


def test_resolve_ignores_coherence_results(tmp_path, monkeypatch):
    monkeypatch.setenv("REPO_ROOT", str(tmp_path))
    (tmp_path / "coherence_results.json").write_text(
        '{"gate":"coherence","coherence":"PASS"}\n', encoding="utf-8"
    )
    sc = tmp_path / ".goalie" / "scorecards"
    sc.mkdir(parents=True)
    sc.joinpath("current.json").write_text(
        '{"originality": {}, "impact": {}}\n', encoding="utf-8"
    )
    assert resolve_scorecard_path(tmp_path).name == "current.json"
