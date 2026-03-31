import json
from pathlib import Path

import pytest
import yaml

from scripts.analysis import suggest_dt_thresholds as sugg


def make_basic_summary() -> dict:
    return {
        "total_evaluations": 10,
        "top1_accuracy": {
            "min": 0.6,
            "p25": 0.7,
            "median": 0.8,
            "p75": 0.85,
            "p90": 0.9,
            "max": 0.92,
        },
        "cont_mae": {
            "min": 0.05,
            "p25": 0.08,
            "median": 0.12,
            "p75": 0.15,
            "p90": 0.2,
            "max": 0.25,
        },
        "per_circle_median_top1": {
            "orchestrator": 0.82,
            "assessor": 0.78,
        },
        "per_circle_stats": {
            "orchestrator": {"p25": 0.8},
            "assessor": {"p25": 0.75},
        },
    }


def test_compute_suggestions_uses_quantiles():
    summary = make_basic_summary()

    out = sugg.compute_suggestions(summary)
    staging = out["staging"]
    production = out["production"]

    # Staging: p25_top1 - 0.10
    assert staging["min_top1_accuracy"] == pytest.approx(0.6, rel=1e-3)
    # Staging: p75_cont_mae + 0.10
    assert staging["max_cont_mae"] == pytest.approx(0.25, rel=1e-3)
    # Staging per-circle: p25_circle - 0.05
    assert staging["per_circle_min_top1_orchestrator"] == pytest.approx(0.75, rel=1e-3)
    assert staging["per_circle_min_top1_assessor"] == pytest.approx(0.70, rel=1e-3)

    # Production: medians
    assert production["min_top1_accuracy"] == pytest.approx(0.8, rel=1e-3)
    assert production["max_cont_mae"] == pytest.approx(0.12, rel=1e-3)
    assert production["per_circle_min_top1_orchestrator"] == pytest.approx(0.82, rel=1e-3)
    assert production["per_circle_min_top1_assessor"] == pytest.approx(0.78, rel=1e-3)


def test_main_writes_yaml_and_invokes_preview(tmp_path: Path, monkeypatch):
    summary = make_basic_summary()
    summary_path = tmp_path / "summary.json"
    summary_path.write_text(json.dumps(summary), encoding="utf-8")

    staging_yaml = tmp_path / "staging.yaml"
    prod_yaml = tmp_path / "prod.yaml"

    called = {}

    def fake_preview(summary_p: Path, prod_p: Path, tmin: float, tmax: float) -> int:
        called["summary"] = summary_p
        called["prod"] = prod_p
        called["band"] = (tmin, tmax)
        return 0

    monkeypatch.setattr(sugg, "run_preview", fake_preview)

    rc = sugg.main(
        [
            "--input-json",
            str(summary_path),
            "--output-staging",
            str(staging_yaml),
            "--output-production",
            str(prod_yaml),
        ]
    )

    assert rc == 0
    assert staging_yaml.is_file()
    assert prod_yaml.is_file()

    staging_cfg = yaml.safe_load(staging_yaml.read_text(encoding="utf-8"))
    prod_cfg = yaml.safe_load(prod_yaml.read_text(encoding="utf-8"))

    assert "model_quality_thresholds" in staging_cfg
    assert "model_quality_thresholds" in prod_cfg
    assert "min_top1_accuracy" in staging_cfg["model_quality_thresholds"]
    assert "min_top1_accuracy" in prod_cfg["model_quality_thresholds"]

    assert called["summary"] == summary_path
    assert called["prod"] == prod_yaml
    assert called["band"] == (0.75, 0.90)




def test_compute_suggestions_handles_missing_optional_fields() -> None:
    summary = {
        "total_evaluations": 0,
        "top1_accuracy": {"median": 0.0},
        # cont_mae, per_circle_median_top1, per_circle_stats omitted on purpose
    }

    out = sugg.compute_suggestions(summary)
    staging = out["staging"]
    production = out["production"]

    assert "min_top1_accuracy" in staging
    assert "min_top1_accuracy" in production
    # No cont_mae information, so max_cont_mae keys should be absent.
    assert "max_cont_mae" not in staging
    assert "max_cont_mae" not in production


def test_compute_suggestions_single_circle_stats() -> None:
    summary = {
        "total_evaluations": 5,
        "top1_accuracy": {"p25": 0.8, "median": 0.9},
        "per_circle_median_top1": {"orchestrator": 0.91},
        "per_circle_stats": {"orchestrator": {"p25": 0.85}},
    }

    out = sugg.compute_suggestions(summary)
    staging = out["staging"]
    production = out["production"]

    assert "per_circle_min_top1_orchestrator" in staging
    assert "per_circle_min_top1_orchestrator" in production
    assert "per_circle_min_top1_assessor" not in staging
    assert "per_circle_min_top1_assessor" not in production


def _setup_preview_fixture(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    pass_rate: float,
) -> tuple[Path, Path]:
    dummy_dashboard = tmp_path / "dt_evaluation_dashboard.py"
    dummy_dashboard.write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    monkeypatch.setattr(sugg, "DASHBOARD_SCRIPT", dummy_dashboard)

    summary_path = tmp_path / "summary.json"
    prod_yaml = tmp_path / "prod.yaml"
    prod_yaml.write_text("dummy", encoding="utf-8")

    data = {
        "config_impact": {
            prod_yaml.name: {"pass_rate": pass_rate},
        }
    }

    def fake_load_summary(path: Path) -> dict:  # type: ignore[override]
        assert path == summary_path
        return data

    monkeypatch.setattr(sugg, "load_summary", fake_load_summary)
    monkeypatch.setattr(sugg.subprocess, "run", lambda *args, **kwargs: None)

    return summary_path, prod_yaml


@pytest.mark.parametrize("rate", [0.75, 0.90])
def test_run_preview_accepts_band_edges(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, rate: float) -> None:
    summary_path, prod_yaml = _setup_preview_fixture(tmp_path, monkeypatch, rate)

    rc = sugg.run_preview(summary_path, prod_yaml, 0.75, 0.90)
    assert rc == 0


@pytest.mark.parametrize("rate", [0.74, 0.91])
def test_run_preview_rejects_outside_band(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, rate: float) -> None:
    summary_path, prod_yaml = _setup_preview_fixture(tmp_path, monkeypatch, rate)

    rc = sugg.run_preview(summary_path, prod_yaml, 0.75, 0.90)
    assert rc == 1


def test_run_preview_errors_when_config_impact_missing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    dummy_dashboard = tmp_path / "dt_evaluation_dashboard.py"
    dummy_dashboard.write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    monkeypatch.setattr(sugg, "DASHBOARD_SCRIPT", dummy_dashboard)

    summary_path = tmp_path / "summary.json"
    prod_yaml = tmp_path / "prod.yaml"
    prod_yaml.write_text("dummy", encoding="utf-8")

    data = {"config_impact": {}}

    def fake_load_summary(path: Path) -> dict:  # type: ignore[override]
        assert path == summary_path
        return data

    monkeypatch.setattr(sugg, "load_summary", fake_load_summary)
    monkeypatch.setattr(sugg.subprocess, "run", lambda *args, **kwargs: None)

    rc = sugg.run_preview(summary_path, prod_yaml, 0.75, 0.90)
    assert rc == 1
