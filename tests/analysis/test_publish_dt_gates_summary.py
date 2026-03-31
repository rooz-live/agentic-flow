import json
from pathlib import Path

from scripts.analysis import publish_dt_gates_summary as pub


def make_gate_results(tmp_path: Path, gates, overall_status: str = "fail"):
    data = {
        "timestamp": "2025-11-24T18:35:12Z",
        "summary_file": "./.goalie/dt_evaluation_summary.json",
        "baseline_file": "./.goalie/dt_evaluation_summary_baseline.json",
        "total_evaluations": 10,
        "date_range": {"start": "2025-11-20", "end": "2025-11-24"},
        "gates": gates,
        "overall_status": overall_status,
        "failed_gate_count": sum(1 for g in gates if g.get("status") == "fail"),
        "passed_gate_count": sum(1 for g in gates if g.get("status") == "pass"),
    }
    tmp_path.mkdir(parents=True, exist_ok=True)
    path = tmp_path / "dt_quality_gates_result.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return path, data


def test_publish_html_summary_includes_failed_gates(tmp_path: Path):
    gates = [
        {
            "name": "minimum_evaluations",
            "status": "fail",
            "message": "3 < 5",
            "remediation": "Increase evaluation coverage before deploying.",
        },
        {
            "name": "staging_pass_rate",
            "status": "pass",
            "message": "95.0% >= 90.0%",
        },
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="fail")
    html_path = tmp_path / "summary.html"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "html",
            "--output-html",
            str(html_path),
        ]
    )

    assert rc == 0
    text = html_path.read_text(encoding="utf-8")
    assert "DT Quality Gates: FAIL" in text
    assert "minimum_evaluations" in text
    assert "Increase evaluation coverage" in text


def test_publish_slack_payload_contains_failed_gate_summary(tmp_path: Path):
    gates = [
        {
            "name": "production_pass_rate",
            "status": "fail",
            "message": "60.0% < 75.0%",
            "remediation": "Review recent DT evaluations.",
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="fail")
    slack_path = tmp_path / "slack.json"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "slack",
            "--output-slack-json",
            str(slack_path),
        ]
    )

    assert rc == 0
    assert slack_path.exists()
    payload = json.loads(slack_path.read_text(encoding="utf-8"))
    assert "attachments" in payload
    attachment = payload["attachments"][0]
    assert attachment["color"] == "#e74c3c"
    blocks = attachment["blocks"]
    texts = [b["text"]["text"] for b in blocks if b.get("type") == "section"]
    assert any("DT Quality Gates: FAIL" in t for t in texts)
    assert any("production_pass_rate" in t or "Failed gates" in t for t in texts)


def test_default_formats_generate_both_outputs(tmp_path: Path):
    gates = [
        {
            "name": "minimum_evaluations",
            "status": "pass",
            "message": "10 >= 5",
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="pass")
    html_path = tmp_path / "summary.html"
    slack_path = tmp_path / "slack.json"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--output-html",
            str(html_path),
            "--output-slack-json",
            str(slack_path),
        ]
    )

    assert rc == 0
    assert html_path.exists()
    assert slack_path.exists()




def test_top_regressions_section_renders_with_metrics(tmp_path: Path):
    metrics = [
        {
            "name": "calibration_error",
            "baseline_median": 0.120,
            "current_median": 0.174,
            "change_pct": 45.2,
            "threshold_pct": 10.0,
            "higher_is_better": False,
            "regressed": True,
        },
        {
            "name": "latency_p95",
            "baseline_median": 0.245,
            "current_median": 0.290,
            "change_pct": 18.4,
            "threshold_pct": 5.0,
            "higher_is_better": False,
            "regressed": True,
        },
        {
            "name": "cont_mae",
            "baseline_median": 0.110,
            "current_median": 0.119,
            "change_pct": 8.1,
            "threshold_pct": 5.0,
            "higher_is_better": False,
            "regressed": True,
        },
        {
            "name": "top1_accuracy",
            "baseline_median": 0.70,
            "current_median": 0.72,
            "change_pct": 2.9,
            "threshold_pct": 10.0,
            "higher_is_better": True,
            "regressed": False,
        },
        {
            "name": "latency_p99",
            "baseline_median": 0.300,
            "current_median": 0.310,
            "change_pct": 3.3,
            "threshold_pct": 5.0,
            "higher_is_better": False,
            "regressed": False,
        },
    ]
    gates = [
        {
            "name": "metric_regression",
            "status": "fail",
            "message": "Some metrics regressed",
            "remediation": "Investigate metric regressions.",
            "metrics": metrics,
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="fail")
    html_path = tmp_path / "summary.html"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "html",
            "--output-html",
            str(html_path),
        ]
    )

    assert rc == 0
    text = html_path.read_text(encoding="utf-8")
    assert "<section class='top-regressions'>" in text
    assert "<h2>Top Regressions</h2>" in text
    assert "<table class='regressions-table'>" in text

    # Top regressions table should include exactly 3 metric rows
    section = text.split("<section class='top-regressions'>", 1)[1]
    tbody = section.split("<tbody>", 1)[1].split("</tbody>", 1)[0]
    assert tbody.count("<tr>") == 3

    # Severity badges and remediation guidance should be present
    assert "class='severity severity-" in text
    assert "class='regression-remediation'" in text
    assert "Remediation guidance" in text
    assert "Review calibration plots and confidence histograms" in text


def test_top_regressions_section_absent_without_metric_regression_gate(tmp_path: Path):
    gates = [
        {
            "name": "minimum_evaluations",
            "status": "fail",
            "message": "3 < 5",
            "remediation": "Increase evaluation coverage before deploying.",
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="fail")
    html_path = tmp_path / "summary.html"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "html",
            "--output-html",
            str(html_path),
        ]
    )

    assert rc == 0
    text = html_path.read_text(encoding="utf-8")
    assert "<section class='top-regressions'>" not in text
    # Existing sections should still render
    assert "Gate Summary" in text
    assert "Failed Gates" in text


def test_top_regressions_section_absent_with_empty_metrics(tmp_path: Path):
    gates = [
        {
            "name": "metric_regression",
            "status": "pass",
            "message": "No regressions",
            "metrics": [],
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="pass")
    html_path = tmp_path / "summary.html"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "html",
            "--output-html",
            str(html_path),
        ]
    )

    assert rc == 0
    text = html_path.read_text(encoding="utf-8")
    assert "<section class='top-regressions'>" not in text
    assert "Gate Summary" in text
    assert "Failed Gates" in text or "No failed gates" in text


def test_slack_payload_includes_top_metric_regressions_block(tmp_path: Path):
    metrics = [
        {
            "name": "calibration_error",
            "baseline_median": 0.120,
            "current_median": 0.174,
            "change_pct": 45.2,
            "threshold_pct": 10.0,
            "higher_is_better": False,
            "regressed": True,
        },
        {
            "name": "latency_p95",
            "baseline_median": 0.245,
            "current_median": 0.290,
            "change_pct": 18.4,
            "threshold_pct": 5.0,
            "higher_is_better": False,
            "regressed": True,
        },
    ]
    gates = [
        {
            "name": "metric_regression",
            "status": "fail",
            "message": "Some metrics regressed",
            "remediation": "Investigate metric regressions.",
            "metrics": metrics,
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="fail")
    slack_path = tmp_path / "slack.json"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "slack",
            "--output-slack-json",
            str(slack_path),
        ]
    )

    assert rc == 0
    payload = json.loads(slack_path.read_text(encoding="utf-8"))
    attachment = payload["attachments"][0]
    blocks = attachment["blocks"]
    section_texts = [b["text"]["text"] for b in blocks if b.get("type") == "section"]

    top_block = next(t for t in section_texts if "Top Metric Regressions" in t)
    assert "*⚠️ Top Metric Regressions*" in top_block
    assert "calibration_error" in top_block
    # Most severe regression should include a severity marker and remediation hint
    assert "SEVERE" in top_block or "severe" in top_block
    assert "->" in top_block
    assert "Review calibration plots and confidence histograms" in top_block


def test_slack_payload_omits_top_regressions_when_no_regressions(tmp_path: Path):
    gates = [
        {
            "name": "metric_regression",
            "status": "pass",
            "message": "No regressions",
            "metrics": [
                {
                    "name": "top1_accuracy",
                    "baseline_median": 0.70,
                    "current_median": 0.71,
                    "change_pct": 1.4,
                    "threshold_pct": 10.0,
                    "higher_is_better": True,
                    "regressed": False,
                }
            ],
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="pass")
    slack_path = tmp_path / "slack.json"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "slack",
            "--output-slack-json",
            str(slack_path),
        ]
    )

    assert rc == 0
    payload = json.loads(slack_path.read_text(encoding="utf-8"))
    attachment = payload["attachments"][0]
    blocks = attachment["blocks"]
    section_texts = [b["text"]["text"] for b in blocks if b.get("type") == "section"]

    assert not any("Top Metric Regressions" in t for t in section_texts)



def test_slack_payload_includes_top_improvements_when_present(tmp_path: Path):
    metrics = [
        {
            "name": "top1_accuracy",
            "baseline_median": 0.70,
            "current_median": 0.80,
            "change_pct": 14.3,
            "threshold_pct": 5.0,
            "higher_is_better": True,
            "regressed": False,
        },
        {
            "name": "latency_p95",
            "baseline_median": 0.300,
            "current_median": 0.250,
            "change_pct": -16.7,
            "threshold_pct": 5.0,
            "higher_is_better": False,
            "regressed": False,
        },
    ]
    gates = [
        {
            "name": "metric_regression",
            "status": "pass",
            "message": "No regressions, some improvements",
            "metrics": metrics,
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="pass")
    slack_path = tmp_path / "slack.json"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "slack",
            "--output-slack-json",
            str(slack_path),
        ]
    )
    assert rc == 0
    payload = json.loads(slack_path.read_text(encoding="utf-8"))
    attachment = payload["attachments"][0]
    blocks = attachment["blocks"]
    section_texts = [b["text"]["text"] for b in blocks if b.get("type") == "section"]

    # No regressions block should appear
    assert not any("Top Metric Regressions" in t for t in section_texts)
    # Improvements section should be present
    improvements_block = next(t for t in section_texts if "Top Improvements" in t)
    assert "top1_accuracy" in improvements_block
    assert "latency_p95" in improvements_block




def test_top_regressions_handles_zero_or_missing_thresholds(tmp_path: Path):
    metrics = [
        {
            "name": "latency_p95",
            "baseline_median": 0.200,
            "current_median": 0.260,
            "change_pct": 30.0,
            "threshold_pct": 0.0,
            "higher_is_better": False,
            "regressed": True,
        },
        {
            "name": "calibration_error",
            "baseline_median": 0.050,
            "current_median": 0.090,
            "change_pct": 80.0,
            "threshold_pct": None,
            "higher_is_better": False,
            "regressed": True,
        },
        {
            "name": "cont_mae",
            "baseline_median": 0.100,
            "current_median": 0.110,
            "change_pct": 10.0,
            "threshold_pct": 5.0,
            "higher_is_better": False,
            "regressed": True,
        },
    ]
    gates = [
        {
            "name": "metric_regression",
            "status": "fail",
            "message": "Some metrics regressed",
            "remediation": "Investigate metric regressions.",
            "metrics": metrics,
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="fail")
    html_path = tmp_path / "summary.html"
    slack_path = tmp_path / "slack.json"

    # HTML should render Top Regressions without errors
    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "html",
            "--output-html",
            str(html_path),
        ]
    )
    assert rc == 0
    text = html_path.read_text(encoding="utf-8")
    assert "<section class='top-regressions'>" in text
    # Metrics with zero or missing thresholds still appear
    assert "latency_p95" in text
    assert "calibration_error" in text
    assert "cont_mae" in text

    # Slack payload should also render without exceptions
    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "slack",
            "--output-slack-json",
            str(slack_path),
        ]
    )
    assert rc == 0
    payload = json.loads(slack_path.read_text(encoding="utf-8"))
    attachment = payload["attachments"][0]
    blocks = attachment["blocks"]
    section_texts = [b["text"]["text"] for b in blocks if b.get("type") == "section"]
    top_block = next(t for t in section_texts if "Top Metric Regressions" in t)
    assert "latency_p95" in top_block
    assert "calibration_error" in top_block or "cont_mae" in top_block



def test_top_regressions_skips_metrics_with_missing_medians(tmp_path: Path):
    metrics = [
        {
            "name": "good_metric",
            "baseline_median": 0.200,
            "current_median": 0.250,
            "change_pct": 25.0,
            "threshold_pct": 10.0,
            "higher_is_better": False,
            "regressed": True,
        },
        {
            "name": "missing_baseline",
            "baseline_median": None,
            "current_median": 0.300,
            "change_pct": 50.0,
            "threshold_pct": 10.0,
            "higher_is_better": False,
            "regressed": True,
        },
        {
            "name": "missing_current",
            "baseline_median": 0.300,
            # current_median omitted on purpose
            "change_pct": 20.0,
            "threshold_pct": 10.0,
            "higher_is_better": False,
            "regressed": True,
        },
    ]
    gates = [
        {
            "name": "metric_regression",
            "status": "fail",
            "message": "Some metrics regressed",
            "remediation": "Investigate metric regressions.",
            "metrics": metrics,
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="fail")
    html_path = tmp_path / "summary.html"
    slack_path = tmp_path / "slack.json"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "html",
            "--output-html",
            str(html_path),
        ]
    )
    assert rc == 0
    text = html_path.read_text(encoding="utf-8")
    # Only the metric with valid medians should appear in Top Regressions
    assert "good_metric" in text
    assert "missing_baseline" not in text
    assert "missing_current" not in text

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "slack",
            "--output-slack-json",
            str(slack_path),
        ]
    )
    assert rc == 0
    payload = json.loads(slack_path.read_text(encoding="utf-8"))
    attachment = payload["attachments"][0]
    blocks = attachment["blocks"]
    section_texts = [b["text"]["text"] for b in blocks if b.get("type") == "section"]
    top_block = next(t for t in section_texts if "Top Metric Regressions" in t)
    assert "good_metric" in top_block
    assert "missing_baseline" not in top_block
    assert "missing_current" not in top_block



def test_top_regressions_handles_extreme_change_percentages_and_critical_severity(tmp_path: Path):
    metrics = [
        {
            "name": "huge_regression",
            "baseline_median": 0.100,
            "current_median": 0.600,
            "change_pct": 500.0,
            "threshold_pct": 10.0,
            "higher_is_better": False,
            "regressed": True,
        },
        {
            "name": "near_wipeout",
            "baseline_median": 0.950,
            "current_median": 0.050,
            "change_pct": -95.0,
            "threshold_pct": 10.0,
            "higher_is_better": True,
            "regressed": True,
        },
    ]
    gates = [
        {
            "name": "metric_regression",
            "status": "fail",
            "message": "Extreme regressions",
            "remediation": "Investigate immediately.",
            "metrics": metrics,
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="fail")
    html_path = tmp_path / "summary.html"
    slack_path = tmp_path / "slack.json"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "html",
            "--output-html",
            str(html_path),
        ]
    )
    assert rc == 0
    text = html_path.read_text(encoding="utf-8")
    # Extreme percentages should be rendered in a readable way
    assert "+500.0%" in text
    assert "-95.0%" in text
    # Critical severity badge should appear for very large regressions
    assert "severity-critical" in text or "Critical" in text

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "slack",
            "--output-slack-json",
            str(slack_path),
        ]
    )
    assert rc == 0
    payload = json.loads(slack_path.read_text(encoding="utf-8"))
    attachment = payload["attachments"][0]
    blocks = attachment["blocks"]
    section_texts = [b["text"]["text"] for b in blocks if b.get("type") == "section"]
    top_block = next(t for t in section_texts if "Top Metric Regressions" in t)
    assert "+500.0%" in top_block
    assert "-95.0%" in top_block
    assert "CRITICAL" in top_block or "🔥" in top_block


def test_slack_payload_mixed_regressions_and_improvements(tmp_path: Path):
    """Verify both sections appear when regressions and improvements coexist."""
    metrics = [
        {
            "name": "regressed_metric",
            "baseline_median": 0.500,
            "current_median": 0.600,
            "change_pct": 20.0,
            "threshold_pct": 10.0,
            "higher_is_better": True,
            "regressed": True,
        },
        {
            "name": "improved_metric",
            "baseline_median": 1.000,
            "current_median": 0.850,
            "change_pct": -15.0,
            "threshold_pct": 5.0,
            "higher_is_better": False,
            "regressed": False,
        },
    ]
    gates = [
        {
            "name": "metric_regression",
            "status": "fail",
            "message": "Mixed regressions and improvements",
            "metrics": metrics,
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="fail")
    slack_path = tmp_path / "slack.json"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "slack",
            "--output-slack-json",
            str(slack_path),
        ]
    )
    assert rc == 0
    payload = json.loads(slack_path.read_text(encoding="utf-8"))
    attachment = payload["attachments"][0]
    blocks = attachment["blocks"]
    section_texts = [b["text"]["text"] for b in blocks if b.get("type") == "section"]

    assert any("Top Metric Regressions" in t for t in section_texts)
    assert any("Top Improvements" in t for t in section_texts)
    assert any("regressed_metric" in t for t in section_texts)
    assert any("improved_metric" in t for t in section_texts)


def test_slack_payload_backward_compatibility_no_meaningful_changes(tmp_path: Path):
    """Verify no extra sections when only tiny, non-meaningful changes exist."""
    metrics = [
        {
            "name": "stable_metric",
            "baseline_median": 1.000,
            "current_median": 1.005,
            "change_pct": 0.5,
            "threshold_pct": 10.0,
            "higher_is_better": True,
            "regressed": False,
        }
    ]
    gates = [
        {
            "name": "metric_regression",
            "status": "pass",
            "message": "No meaningful changes",
            "metrics": metrics,
        }
    ]
    input_path, _ = make_gate_results(tmp_path, gates, overall_status="pass")
    slack_path = tmp_path / "slack.json"

    rc = pub.main(
        [
            "--input-json",
            str(input_path),
            "--format",
            "slack",
            "--output-slack-json",
            str(slack_path),
        ]
    )
    assert rc == 0
    payload = json.loads(slack_path.read_text(encoding="utf-8"))
    attachment = payload["attachments"][0]
    blocks = attachment["blocks"]
    section_texts = [b["text"]["text"] for b in blocks if b.get("type") == "section"]

    assert not any("Top Metric Regressions" in t for t in section_texts)
    assert not any("Top Improvements" in t for t in section_texts)
    assert "blocks" in attachment
    assert isinstance(blocks, list)
