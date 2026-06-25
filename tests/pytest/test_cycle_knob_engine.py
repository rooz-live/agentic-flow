"""Unit tests for scripts.cicd.lib.cycle_knob_engine."""
import json
from pathlib import Path

import pytest

import scripts.cicd.lib.cycle_knob_engine as cke


def test_quality_vector_names_reads_loop_prompts(tmp_path, monkeypatch):
    cfg = tmp_path / "config" / "cicd" / "loop_prompts.yaml"
    cfg.parent.mkdir(parents=True)
    cfg.write_text("quality_vectors:\n- coherence_exit_0\n- pytest_coverage_pass\n", encoding="utf-8")
    monkeypatch.setattr(cke, "repo_root", lambda: tmp_path)
    assert cke.quality_vector_names() == ["coherence_exit_0", "pytest_coverage_pass"]


def test_quality_vector_names_fallback_when_no_file(tmp_path, monkeypatch):
    monkeypatch.setattr(cke, "repo_root", lambda: tmp_path)
    assert "coherence_exit_0" in cke.quality_vector_names()


def test_evaluate_pass_all_ok():
    vectors = {"a": {"ok": True}, "b": {"ok": True}}
    passed, failures = cke.evaluate_pass(vectors, ["a", "b"])
    assert passed
    assert failures == []


def test_evaluate_pass_detects_failure():
    vectors = {"a": {"ok": True}, "b": {"ok": False}}
    passed, failures = cke.evaluate_pass(vectors, ["a", "b"])
    assert not passed
    assert failures == ["b"]


def test_bounds_clamp_knob_values():
    assert cke.BOUNDS["sweet_spot_ticks"] == (2, 5)
    assert cke.BOUNDS["max_minutes_per_tick"] == (20, 60)


def test_vectors_from_env_reads_file(tmp_path, monkeypatch):
    vf = tmp_path / "vectors.json"
    vf.write_text(json.dumps({"x": {"ok": True}}), encoding="utf-8")
    monkeypatch.setenv("CYCLE_VECTORS_FILE", str(vf))
    assert cke.vectors_from_env() == {"x": {"ok": True}}


def test_vectors_from_env_reads_json_env(monkeypatch):
    monkeypatch.setenv("CYCLE_VECTORS_JSON", '{"y": {"ok": false}}')
    assert cke.vectors_from_env() == {"y": {"ok": False}}
