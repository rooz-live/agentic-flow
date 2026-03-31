import json
from pathlib import Path

import pytest
import yaml

from scripts.analysis import dt_e2e_check as e2e


def _setup_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    goalie_dir = tmp_path / ".goalie"
    goalie_dir.mkdir()
    monkeypatch.setattr(e2e, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(e2e, "GOALIE_DIR", goalie_dir)
    monkeypatch.setattr(e2e, "SUMMARY_JSON", goalie_dir / "dt_evaluation_summary.json")
    monkeypatch.setattr(
        e2e,
        "STAGING_SUGGESTED",
        goalie_dir / "dt_validation_thresholds_staging_suggested.yaml",
    )
    monkeypatch.setattr(
        e2e,
        "PROD_SUGGESTED",
        goalie_dir / "dt_validation_thresholds_production_suggested.yaml",
    )
    return goalie_dir


def test_dt_e2e_check_success(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _setup_env(tmp_path, monkeypatch)

    calls = []

    def fake_run_step(name: str, args, verbose: bool) -> int:  # type: ignore[override]
        calls.append((name, tuple(args)))
        return 0

    monkeypatch.setattr(e2e, "_run_step", fake_run_step)

    summary = {
        "total_evaluations": 5,
        "top1_accuracy": {"median": 0.8},
        "per_circle_stats": {},
        "config_impact": {
            e2e.PROD_SUGGESTED.name: {
                "pass_count": 4,
                "fail_count": 1,
                "pass_rate": 0.8,
                "failure_reasons": {},
            }
        },
    }
    e2e.SUMMARY_JSON.write_text(json.dumps(summary), encoding="utf-8")

    for path in (e2e.STAGING_SUGGESTED, e2e.PROD_SUGGESTED):
        path.write_text(
            yaml.safe_dump({"model_quality_thresholds": {"min_top1_accuracy": 0.75}}),
            encoding="utf-8",
        )

    rc = e2e.main(["--skip-prod-cycle"])
    assert rc == 0

    names = [c[0] for c in calls]
    assert names == [
        "Step 2: af dt-dashboard",
        "Step 3: af dt-suggest-thresholds",
        "Step 4: af dt-dashboard --dry-run-config",
    ]


def test_dt_e2e_check_missing_summary(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _setup_env(tmp_path, monkeypatch)
    monkeypatch.setattr(e2e, "_run_step", lambda name, args, verbose: 0)  # type: ignore[override]

    rc = e2e.main(["--skip-prod-cycle"])
    assert rc == 1


def test_dt_e2e_check_malformed_json(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _setup_env(tmp_path, monkeypatch)
    monkeypatch.setattr(e2e, "_run_step", lambda name, args, verbose: 0)  # type: ignore[override]

    e2e.SUMMARY_JSON.write_text("not-json", encoding="utf-8")

    rc = e2e.main(["--skip-prod-cycle"])
    assert rc == 1


def test_dt_e2e_check_invalid_threshold_yaml(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _setup_env(tmp_path, monkeypatch)
    monkeypatch.setattr(e2e, "_run_step", lambda name, args, verbose: 0)  # type: ignore[override]

    summary = {
        "total_evaluations": 3,
        "top1_accuracy": {"median": 0.7},
        "per_circle_stats": {},
        "config_impact": {
            e2e.PROD_SUGGESTED.name: {
                "pass_count": 2,
                "fail_count": 1,
                "pass_rate": 0.67,
                "failure_reasons": {},
            }
        },
    }
    e2e.SUMMARY_JSON.write_text(json.dumps(summary), encoding="utf-8")

    # Staging YAML missing model_quality_thresholds to trigger validation failure.
    e2e.STAGING_SUGGESTED.write_text("foo: bar\n", encoding="utf-8")
    e2e.PROD_SUGGESTED.write_text(
        yaml.safe_dump({"model_quality_thresholds": {"min_top1_accuracy": 0.7}}),
        encoding="utf-8",
    )

    rc = e2e.main(["--skip-prod-cycle"])
    assert rc == 1




@pytest.mark.parametrize("rate", [0.0, 1.0])
def test_dt_e2e_check_allows_pass_rate_bounds(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, rate: float
) -> None:
    _setup_env(tmp_path, monkeypatch)
    monkeypatch.setattr(e2e, "_run_step", lambda name, args, verbose: 0)  # type: ignore[override]

    summary = {
        "total_evaluations": 3,
        "top1_accuracy": {"median": 0.8},
        "per_circle_stats": {},
        "config_impact": {
            e2e.PROD_SUGGESTED.name: {
                "pass_count": 2,
                "fail_count": 1,
                "pass_rate": rate,
                "failure_reasons": {},
            }
        },
    }
    e2e.SUMMARY_JSON.write_text(json.dumps(summary), encoding="utf-8")

    for path in (e2e.STAGING_SUGGESTED, e2e.PROD_SUGGESTED):
        path.write_text(
            yaml.safe_dump({"model_quality_thresholds": {"min_top1_accuracy": 0.75}}),
            encoding="utf-8",
        )

    rc = e2e.main(["--skip-prod-cycle"])
    assert rc == 0


def test_dt_e2e_check_missing_pass_rate(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _setup_env(tmp_path, monkeypatch)
    monkeypatch.setattr(e2e, "_run_step", lambda name, args, verbose: 0)  # type: ignore[override]

    summary = {
        "total_evaluations": 3,
        "top1_accuracy": {"median": 0.8},
        "per_circle_stats": {},
        "config_impact": {
            e2e.PROD_SUGGESTED.name: {
                "pass_count": 2,
                "fail_count": 1,
                # pass_rate intentionally omitted
                "failure_reasons": {},
            }
        },
    }
    e2e.SUMMARY_JSON.write_text(json.dumps(summary), encoding="utf-8")

    for path in (e2e.STAGING_SUGGESTED, e2e.PROD_SUGGESTED):
        path.write_text(
            yaml.safe_dump({"model_quality_thresholds": {"min_top1_accuracy": 0.75}}),
            encoding="utf-8",
        )

    rc = e2e.main(["--skip-prod-cycle"])
    assert rc == 1


def test_dt_e2e_check_non_numeric_pass_rate(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _setup_env(tmp_path, monkeypatch)
    monkeypatch.setattr(e2e, "_run_step", lambda name, args, verbose: 0)  # type: ignore[override]

    summary = {
        "total_evaluations": 3,
        "top1_accuracy": {"median": 0.8},
        "per_circle_stats": {},
        "config_impact": {
            e2e.PROD_SUGGESTED.name: {
                "pass_count": 2,
                "fail_count": 1,
                "pass_rate": "not-a-number",
                "failure_reasons": {},
            }
        },
    }
    e2e.SUMMARY_JSON.write_text(json.dumps(summary), encoding="utf-8")

    for path in (e2e.STAGING_SUGGESTED, e2e.PROD_SUGGESTED):
        path.write_text(
            yaml.safe_dump({"model_quality_thresholds": {"min_top1_accuracy": 0.75}}),
            encoding="utf-8",
        )

    rc = e2e.main(["--skip-prod-cycle"])
    assert rc == 1


@pytest.mark.parametrize("pass_rate", [-0.1, 1.1])
def test_dt_e2e_check_out_of_range_pass_rate(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, pass_rate: float
) -> None:
    _setup_env(tmp_path, monkeypatch)
    monkeypatch.setattr(e2e, "_run_step", lambda name, args, verbose: 0)  # type: ignore[override]

    summary = {
        "total_evaluations": 3,
        "top1_accuracy": {"median": 0.8},
        "per_circle_stats": {},
        "config_impact": {
            e2e.PROD_SUGGESTED.name: {
                "pass_count": 2,
                "fail_count": 1,
                "pass_rate": pass_rate,
                "failure_reasons": {},
            }
        },
    }
    e2e.SUMMARY_JSON.write_text(json.dumps(summary), encoding="utf-8")

    for path in (e2e.STAGING_SUGGESTED, e2e.PROD_SUGGESTED):
        path.write_text(
            yaml.safe_dump({"model_quality_thresholds": {"min_top1_accuracy": 0.75}}),
            encoding="utf-8",
        )

    rc = e2e.main(["--skip-prod-cycle"])
    assert rc == 1


def test_dt_e2e_check_missing_config_impact_entry_for_prod(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _setup_env(tmp_path, monkeypatch)
    monkeypatch.setattr(e2e, "_run_step", lambda name, args, verbose: 0)  # type: ignore[override]

    summary = {
        "total_evaluations": 3,
        "top1_accuracy": {"median": 0.8},
        "per_circle_stats": {},
        "config_impact": {},  # No entry for PROD_SUGGESTED.name
    }
    e2e.SUMMARY_JSON.write_text(json.dumps(summary), encoding="utf-8")

    for path in (e2e.STAGING_SUGGESTED, e2e.PROD_SUGGESTED):
        path.write_text(
            yaml.safe_dump({"model_quality_thresholds": {"min_top1_accuracy": 0.75}}),
            encoding="utf-8",
        )

    rc = e2e.main(["--skip-prod-cycle"])
    assert rc == 1
