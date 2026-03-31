from pathlib import Path

import importlib.util
import json
import sys

import pytest


def _load_gov_module() -> object:
    """Load governance_evaluation_dashboard via its file path.

    This avoids relying on package import layout and mirrors how the
    suggest_governance_thresholds helper invokes the script.
    """

    root = Path(__file__).resolve().parents[2]
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    script = root / "scripts" / "analysis" / "governance_evaluation_dashboard.py"
    spec = importlib.util.spec_from_file_location(
        "governance_evaluation_dashboard", script
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    # Register in sys.modules so that dataclasses and relative imports work.
    sys.modules[spec.name] = module  # type: ignore[arg-type]
    spec.loader.exec_module(module)  # type: ignore[assignment]
    return module


gov = _load_gov_module()


def write_metric_event(path: Path, **overrides):
    base = {
        "timestamp": "2025-11-24T00:00:00Z",
        "type": "state",
        "system": {
            "risk_score": 0.5,
            "status": "stable",
            "recent_incidents": 1,
        },
        "safe_degrade": {
            "enabled": True,
            "triggers": [
                {
                    "reason": "test",
                }
            ],
        },
    }
    base.update(overrides)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(base) + "\n")


def write_iris_event(path: Path, **overrides):
    base = {
        "timestamp": "2025-11-24T01:00:00Z",
        "type": "iris_evaluation",
        "iris_command": "health",
        "circles_involved": ["governance"],
        "actions_taken": [
            {
                "circle": "governance",
                "priority": "critical",
                "action": "stabilize-infra",
            }
        ],
        "production_maturity": {
            "infra": {"status": "degraded"},
        },
    }
    base.update(overrides)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(base) + "\n")


@pytest.mark.skipif(
    not (Path(".goalie/governance_thresholds_staging.yaml").exists())
    or not (Path(".goalie/governance_thresholds_production.yaml").exists()),
    reason="Governance thresholds config not present",
)
def test_governance_dashboard_html_and_iris_section(tmp_path: Path):
    metrics_log = tmp_path / "metrics_log.jsonl"
    write_metric_event(metrics_log)
    write_iris_event(metrics_log)

    output_html = tmp_path / "governance_dashboard.html"
    export_json = tmp_path / "summary.json"

    rc = gov.main(
        [
            "--metrics-log",
            str(metrics_log),
            "--export-json",
            str(export_json),
            "--output-html",
            str(output_html),
            "--format",
            "html",
        ]
    )

    assert rc == 0
    assert output_html.exists()

    html = output_html.read_text(encoding="utf-8")
    assert '<div id="iris-section">' in html
    assert "renderIrisSection()" in html

    summary = json.loads(export_json.read_text(encoding="utf-8"))
    iris = summary.get("iris") or {}
    assert iris.get("iris_events") == 1
    assert iris.get("component_health")


def test_governance_dashboard_handles_no_iris(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    metrics_log = tmp_path / "metrics_log.jsonl"
    write_metric_event(metrics_log)

    # Avoid relying on real thresholds files for this test.
    monkeypatch.setattr(gov, "GOALIE_DIR", tmp_path)

    output_html = tmp_path / "governance_dashboard.html"
    export_json = tmp_path / "summary.json"

    rc = gov.main(
        [
            "--metrics-log",
            str(metrics_log),
            "--export-json",
            str(export_json),
            "--output-html",
            str(output_html),
            "--format",
            "html",
        ]
    )

    assert rc == 0
    assert output_html.exists()

    html = output_html.read_text(encoding="utf-8")
    # We still render the IRIS section container but with a friendly message.
    assert '<div id="iris-section">' in html
    assert "No IRIS metrics available" in html

