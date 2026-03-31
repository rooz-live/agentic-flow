from pathlib import Path

import json

import pytest

from scripts.analysis import dt_evaluation_dashboard as dash


def write_event(path: Path, **overrides):
    base = {
        "timestamp": "2025-11-24T00:00:00Z",
        "type": "dt_evaluation",
        "checkpoint": ".goalie/dt_model.pt",
        "run_name": "test-run",
        "metrics": {
            "top1_accuracy": 0.7,
            "top3_accuracy": 0.9,
            "total_positions": 100,
        },
        "per_circle_top1": {"orchestrator": 0.75, "assessor": 0.65},
        "cont_overall": {"mae": 0.1, "mse": 0.01},
    }
    base.update(overrides)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(base) + "\n")


@pytest.mark.skipif(
    not (Path(".goalie/dt_validation_thresholds.yaml").exists()),
    reason="DT thresholds config not present",
)
def test_dashboard_generates_html_and_json(tmp_path: Path, monkeypatch):
    metrics_log = tmp_path / "metrics_log.jsonl"
    write_event(metrics_log)
    write_event(
        metrics_log,
        metrics={
            "top1_accuracy": 0.8,
            "top3_accuracy": 0.95,
            "total_positions": 120,
        },
        cont_overall={"mae": 0.12, "mse": 0.015},
    )

    output_html = tmp_path / "dt_dashboard.html"
    export_json = tmp_path / "summary.json"

    rc = dash.main(
        [
            "--metrics-log",
            str(metrics_log),
            "--output-html",
            str(output_html),
            "--export-json",
            str(export_json),
        ]
    )
    assert rc == 0
    assert output_html.exists()
    html = output_html.read_text(encoding="utf-8")
    assert "Decision Transformer Evaluation Dashboard" in html

    assert export_json.exists()
    summary = json.loads(export_json.read_text(encoding="utf-8"))
    assert summary["total_evaluations"] == 2
    assert "top1_accuracy" in summary
    assert summary["top1_accuracy"]["median"] >= 0.7


@pytest.mark.skipif(
    not (Path(".goalie/dt_validation_thresholds.yaml").exists()),
    reason="DT thresholds config not present",
)
def test_dry_run_config_populates_config_impact_and_table(
    tmp_path: Path, capsys
):
    metrics_log = tmp_path / "metrics_log.jsonl"
    write_event(metrics_log)
    write_event(
        metrics_log,
        metrics={
            "top1_accuracy": 0.8,
            "top3_accuracy": 0.95,
            "total_positions": 120,
        },
        cont_overall={"mae": 0.12, "mse": 0.015},
    )

    candidate = tmp_path / "dt_validation_thresholds_candidate.yaml"
    candidate.write_text(
        "model_quality_thresholds:\n"
        "  min_top1_accuracy: 0.9\n"
        "  max_cont_mae: 0.05\n",
        encoding="utf-8",
    )
    export_json = tmp_path / "summary.json"

    rc = dash.main(
        [
            "--metrics-log",
            str(metrics_log),
            "--export-json",
            str(export_json),
            "--dry-run-config",
            str(candidate),
        ]
    )
    assert rc == 0

    data = json.loads(export_json.read_text(encoding="utf-8"))
    # per-circle stats exported for use by dt-suggest-thresholds
    assert "per_circle_stats" in data
    assert data["per_circle_stats"]

    impact = data["config_impact"]
    assert "staging" in impact
    assert "production" in impact
    assert candidate.name in impact

    cand = impact[candidate.name]
    assert isinstance(cand["pass_count"], int)
    assert isinstance(cand["fail_count"], int)
    assert isinstance(cand["failure_reasons"], dict)
    # at least min_top1_accuracy should appear as a failure reason
    assert any(
        "min_top1_accuracy" in name for name in cand["failure_reasons"].keys()
    )

    out = capsys.readouterr().out
    assert "Config" in out and "Pass%" in out
    assert candidate.name in out



@pytest.mark.skipif(
    not (Path(".goalie/dt_validation_thresholds.yaml").exists()),
    reason="DT thresholds config not present",
)
def test_reward_preset_analysis_in_json_summary(tmp_path: Path):
    metrics_log = tmp_path / "metrics_log.jsonl"
    write_event(metrics_log)
    write_event(
        metrics_log,
        metrics={
            "top1_accuracy": 0.85,
            "top3_accuracy": 0.97,
            "total_positions": 150,
        },
        cont_overall={"mae": 0.09, "mse": 0.01},
    )

    trajectories = tmp_path / "trajectories.jsonl"
    trajectories.write_text(
        "\n".join(
            json.dumps({"reward": {"status": status, "duration_ms": duration}})
            for status, duration in [
                ("success", 1000.0),
                ("failure", 50000.0),
                ("other", 20000.0),
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    export_json = tmp_path / "summary.json"
    rc = dash.main(
        [
            "--metrics-log",
            str(metrics_log),
            "--export-json",
            str(export_json),
            "--trajectories",
            str(trajectories),
            "--format",
            "json",
        ]
    )
    assert rc == 0

    data = json.loads(export_json.read_text(encoding="utf-8"))
    rpa = data.get("reward_preset_analysis")
    assert rpa is not None
    assert rpa["trajectories_file"] == str(trajectories)
    assert rpa["total_steps"] >= 1
    presets = rpa["presets"]
    assert isinstance(presets, list) and presets
    first = presets[0]
    assert "name" in first
    assert "reward_stats" in first
    assert "status_counts" in first
    assert "duration_stats" in first
    assert "threshold_curves" in first
    curves = first["threshold_curves"]
    assert isinstance(curves, list) and curves
    point = curves[0]
    assert "threshold" in point and "success_rate" in point


@pytest.mark.skipif(
    not (Path(".goalie/dt_validation_thresholds.yaml").exists()),
    reason="DT thresholds config not present",
)
def test_csv_output_written(tmp_path: Path):
    metrics_log = tmp_path / "metrics_log.jsonl"
    write_event(metrics_log)

    output_csv = tmp_path / "dt_metrics.csv"
    rc = dash.main(
        [
            "--metrics-log",
            str(metrics_log),
            "--output-csv",
            str(output_csv),
            "--format",
            "csv",
        ]
    )
    assert rc == 0
    assert output_csv.exists()
    lines = output_csv.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) >= 2
    header = lines[0]
    assert "top1_accuracy" in header
    assert "checkpoint" in header



@pytest.mark.skipif(
    not (Path(".goalie/dt_validation_thresholds.yaml").exists()),
    reason="DT thresholds config not present",
)
def test_calibration_and_performance_section_and_json_stats(tmp_path: Path):
    metrics_log = tmp_path / "metrics_log.jsonl"
    # two events with the new metrics populated
    write_event(
        metrics_log,
        metrics={
            "top1_accuracy": 0.70,
            "top3_accuracy": 0.90,
            "total_positions": 100,
            "calibration_error": 0.10,
            "latency_p50": 0.010,
            "latency_p95": 0.020,
            "latency_p99": 0.030,
        },
    )
    write_event(
        metrics_log,
        metrics={
            "top1_accuracy": 0.80,
            "top3_accuracy": 0.95,
            "total_positions": 120,
            "calibration_error": 0.20,
            "latency_p50": 0.015,
            "latency_p95": 0.025,
            "latency_p99": 0.035,
        },
        cont_overall={"mae": 0.12, "mse": 0.015},
    )

    output_html = tmp_path / "dt_dashboard.html"
    export_json = tmp_path / "summary.json"

    rc = dash.main(
        [
            "--metrics-log",
            str(metrics_log),
            "--output-html",
            str(output_html),
            "--export-json",
            str(export_json),
        ]
    )
    assert rc == 0
    assert output_html.exists()

    html = output_html.read_text(encoding="utf-8")
    # New Calibration & Performance Metrics section and containers
    assert "<div id=\"calibration-performance\">" in html
    assert "<h2>Calibration &amp; Performance Metrics</h2>" in html
    assert "id=\"calibration-ece\"" in html
    assert "id=\"latency-metrics\"" in html
    # JavaScript functions for rendering the new plots
    assert "renderCalibrationMetrics()" in html
    assert "renderLatencyMetrics()" in html

    # JSON summary should contain statistics for the new metrics
    assert export_json.exists()
    summary = json.loads(export_json.read_text(encoding="utf-8"))
    calib = summary.get("calibration_error")
    assert calib is not None and "median" in calib and calib["median"] > 0
    for key in ("latency_p50", "latency_p95", "latency_p99"):
        stats = summary.get(key)
        assert stats is not None and "median" in stats


@pytest.mark.skipif(
    not (Path(".goalie/dt_validation_thresholds.yaml").exists()),
    reason="DT thresholds config not present",
)
def test_dashboard_handles_missing_new_metrics_gracefully(tmp_path: Path):
    metrics_log = tmp_path / "metrics_log.jsonl"
    # Events without the new metrics simulate older evaluation logs
    write_event(metrics_log)
    write_event(
        metrics_log,
        metrics={
            "top1_accuracy": 0.8,
            "top3_accuracy": 0.95,
            "total_positions": 120,
        },
        cont_overall={"mae": 0.12, "mse": 0.015},
    )

    output_html = tmp_path / "dt_dashboard.html"
    export_json = tmp_path / "summary.json"

    rc = dash.main(
        [
            "--metrics-log",
            str(metrics_log),
            "--output-html",
            str(output_html),
            "--export-json",
            str(export_json),
        ]
    )
    assert rc == 0
    assert output_html.exists()

    html = output_html.read_text(encoding="utf-8")
    # Section still renders, but JS should fall back to friendly messages
    assert "Calibration &amp; Performance Metrics" in html
    assert "No calibration metrics available" in html
    assert "No latency metrics available" in html

    # JSON should still be well-formed and include the core metrics
    assert export_json.exists()
    summary = json.loads(export_json.read_text(encoding="utf-8"))
    assert summary["total_evaluations"] == 2
    assert "top1_accuracy" in summary



@pytest.mark.skipif(
    not (Path(".goalie/dt_validation_thresholds.yaml").exists()),
    reason="DT thresholds config not present",
)
def test_iris_section_and_summary_in_dt_dashboard(tmp_path: Path):
    metrics_log = tmp_path / "metrics_log.jsonl"
    # At least one DT evaluation event so the dashboard runs.
    write_event(metrics_log)

    # Append a single iris_evaluation event.
    iris_event = {
        "timestamp": "2025-11-24T00:05:00Z",
        "type": "iris_evaluation",
        "iris_command": "health",
        "circles_involved": ["assessor"],
        "actions_taken": [
            {
                "circle": "assessor",
                "action": "Detected drift in prompts",
                "priority": "critical",
            }
        ],
        "production_maturity": {
            "starlingx_openstack": {"status": "degraded"},
            "communication_stack": {"telnyx": {"status": "critical"}},
            "messaging_protocols": ["smtp"],
        },
        "execution_context": {
            "incremental": True,
            "relentless": False,
            "focused": True,
        },
    }
    with metrics_log.open("a", encoding="utf-8") as f:
        f.write(json.dumps(iris_event) + "\n")

    output_html = tmp_path / "dt_dashboard.html"
    export_json = tmp_path / "summary.json"

    rc = dash.main(
        [
            "--metrics-log",
            str(metrics_log),
            "--output-html",
            str(output_html),
            "--export-json",
            str(export_json),
            "--iris-command",
            "health",
        ]
    )
    assert rc == 0
    assert output_html.exists()

    html = output_html.read_text(encoding="utf-8")
    assert '<div id="iris-section">' in html
    assert "IRIS governance &amp; drift signals" in html

    assert export_json.exists()
    summary = json.loads(export_json.read_text(encoding="utf-8"))
    iris_summary = summary.get("iris_summary")
    assert iris_summary is not None
    assert iris_summary["iris_events"] == 1
    assert iris_summary["command_counts"].get("health") == 1
    assert iris_summary["actions_by_priority"].get("critical") == 1
    assert "component_health" in iris_summary
    assert "dt_correlation" in iris_summary
