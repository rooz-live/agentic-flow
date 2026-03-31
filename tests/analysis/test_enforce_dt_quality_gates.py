import json
from pathlib import Path

from scripts.analysis import enforce_dt_quality_gates as gates


def make_summary(tmp_path: Path, **overrides):
    base = {
        "total_evaluations": 10,
        "date_range": {"start": "2025-11-20", "end": "2025-11-24"},
        "pass_rate": {"staging": 0.95, "production": 0.8},
        "top1_accuracy": {"median": 0.75},
    }
    base.update(overrides)
    tmp_path.mkdir(parents=True, exist_ok=True)
    path = tmp_path / "summary.json"
    path.write_text(json.dumps(base), encoding="utf-8")
    return path, base


def make_reward_summary(tmp_path: Path, means):
    presets = []
    for name, mean in means.items():
        presets.append({"name": name, "reward_stats": {"mean": mean}})
    base = {
        "total_evaluations": 10,
        "date_range": {"start": "2025-11-20", "end": "2025-11-24"},
        "pass_rate": {"staging": 0.95, "production": 0.8},
        "top1_accuracy": {"median": 0.75},
        "reward_preset_analysis": {"presets": presets},
    }
    tmp_path.mkdir(parents=True, exist_ok=True)
    path = tmp_path / "summary.json"
    path.write_text(json.dumps(base), encoding="utf-8")
    return path, base


def test_all_gates_pass_without_baseline(tmp_path: Path):
    summary_path, _ = make_summary(tmp_path)

    rc = gates.main([
        "--summary-json",
        str(summary_path),
        "--min-evaluations",
        "5",
        "--min-staging-pass-rate",
        "0.90",
        "--min-production-pass-rate",
        "0.75",
        "--max-reward-regression-pct",
        "5.0",
        "--max-metric-regression-pct",
        "10.0",
    ])

    assert rc == 0


def test_minimum_evaluations_gate_fails(tmp_path: Path):
    summary_path, _ = make_summary(tmp_path, total_evaluations=3)

    rc = gates.main([
        "--summary-json",
        str(summary_path),
        "--min-evaluations",
        "5",
    ])

    assert rc == 1


def test_pass_rate_gates_can_fail(tmp_path: Path):
    summary_path, _ = make_summary(
        tmp_path,
        pass_rate={"staging": 0.85, "production": 0.6},
    )

    rc = gates.main([
        "--summary-json",
        str(summary_path),
        "--min-staging-pass-rate",
        "0.90",
        "--min-production-pass-rate",
        "0.75",
    ])

    assert rc == 1


def test_reward_regression_detection(tmp_path: Path):
    baseline_path, _ = make_reward_summary(tmp_path / "baseline", {"balanced": 0.72, "governance_conservative": 0.68})
    current_path, _ = make_reward_summary(tmp_path / "current", {"balanced": 0.65, "governance_conservative": 0.62})

    rc = gates.main([
        "--summary-json",
        str(current_path),
        "--baseline-summary-json",
        str(baseline_path),
        "--max-reward-regression-pct",
        "5.0",
        "--max-metric-regression-pct",
        "10.0",
    ])

    assert rc == 1


def test_metric_regression_detection(tmp_path: Path):
    baseline_path, _ = make_summary(tmp_path / "baseline", top1_accuracy={"median": 0.80})
    current_path, _ = make_summary(tmp_path / "current", top1_accuracy={"median": 0.70})

    rc = gates.main([
        "--summary-json",
        str(current_path),
        "--baseline-summary-json",
        str(baseline_path),
        "--max-metric-regression-pct",
        "10.0",
    ])

    assert rc == 1


def test_dry_run_does_not_fail_exit_code(tmp_path: Path):
    summary_path, _ = make_summary(tmp_path, total_evaluations=1)

    rc = gates.main([
        "--summary-json",
        str(summary_path),
        "--min-evaluations",
        "5",
        "--dry-run",
    ])

    assert rc == 0


def test_output_json_schema(tmp_path: Path):
    summary_path, _ = make_summary(tmp_path)
    out_path = tmp_path / "results.json"

    rc = gates.main([
        "--summary-json",
        str(summary_path),
        "--output-json",
        str(out_path),
    ])

    assert rc == 0
    assert out_path.exists()
    data = json.loads(out_path.read_text(encoding="utf-8"))
    assert "timestamp" in data
    assert data["summary_file"] == str(summary_path)
    assert data["overall_status"] in ("pass", "fail")
    assert isinstance(data.get("gates"), list)



def test_cont_mae_regression_detection(tmp_path: Path):
    baseline_path, _ = make_summary(
        tmp_path / "baseline",
        top1_accuracy={"median": 0.80},
        cont_mae={"median": 0.10},
    )
    current_path, _ = make_summary(
        tmp_path / "current",
        top1_accuracy={"median": 0.80},
        cont_mae={"median": 0.12},
    )

    rc = gates.main(
        [
            "--summary-json",
            str(current_path),
            "--baseline-summary-json",
            str(baseline_path),
            "--max-metric-regression-pct",
            "10.0",
        ]
    )

    assert rc == 1



def test_metric_regression_ignores_missing_metrics(tmp_path: Path):
    baseline_path, _ = make_summary(
        tmp_path / "baseline",
        top1_accuracy={"median": 0.75},
        cont_mae={"median": 0.10},
    )
    current_path, _ = make_summary(
        tmp_path / "current",
        top1_accuracy={"median": 0.77},
    )

    rc = gates.main(
        [
            "--summary-json",
            str(current_path),
            "--baseline-summary-json",
            str(baseline_path),
            "--max-metric-regression-pct",
            "10.0",
        ]
    )

    assert rc == 0




def test_calibration_error_regression_detection(tmp_path: Path):
    baseline_path, _ = make_summary(
        tmp_path / "baseline",
        top1_accuracy={"median": 0.80},
        calibration_error={"median": 0.02},
    )
    current_path, _ = make_summary(
        tmp_path / "current",
        top1_accuracy={"median": 0.80},
        calibration_error={"median": 0.03},
    )

    rc = gates.main(
        [
            "--summary-json",
            str(current_path),
            "--baseline-summary-json",
            str(baseline_path),
            "--max-metric-regression-pct",
            "10.0",
        ]
    )

    assert rc == 1



def test_latency_p95_regression_detection(tmp_path: Path):
    baseline_path, _ = make_summary(
        tmp_path / "baseline",
        top1_accuracy={"median": 0.80},
        latency_p95={"median": 0.050},
    )
    current_path, _ = make_summary(
        tmp_path / "current",
        top1_accuracy={"median": 0.80},
        latency_p95={"median": 0.080},
    )

    rc = gates.main(
        [
            "--summary-json",
            str(current_path),
            "--baseline-summary-json",
            str(baseline_path),
            "--max-metric-regression-pct",
            "10.0",
        ]
    )

    assert rc == 1



def test_mixed_new_metric_regression_scenario(tmp_path: Path):
    baseline_path, _ = make_summary(
        tmp_path / "baseline",
        top1_accuracy={"median": 0.80},
        calibration_error={"median": 0.02},
        latency_p50={"median": 0.050},
    )
    current_path, _ = make_summary(
        tmp_path / "current",
        top1_accuracy={"median": 0.80},
        calibration_error={"median": 0.03},  # worse calibration
        latency_p50={"median": 0.040},  # better latency
    )

    rc = gates.main(
        [
            "--summary-json",
            str(current_path),
            "--baseline-summary-json",
            str(baseline_path),
            "--max-metric-regression-pct",
            "10.0",
        ]
    )

    assert rc == 1
