import argparse
import html
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT_JSON = PROJECT_ROOT / ".goalie" / "dt_quality_gates_result.json"
DEFAULT_OUTPUT_HTML = PROJECT_ROOT / ".goalie" / "dt_gates_summary.html"
DEFAULT_OUTPUT_SLACK = PROJECT_ROOT / ".goalie" / "dt_gates_slack_payload.json"


def load_results(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _escape(value: Any) -> str:
    return html.escape(str(value))

METRIC_GUIDANCE: Dict[str, str] = {
    "top1_accuracy": "Investigate input distributions, label quality, and recent data drift; consider retraining or threshold adjustments.",
    "top3_accuracy": "Check whether evaluation data has shifted and review model capacity or training configuration.",
    "cont_mae": "Inspect continuous-output calibration, loss distributions, and potential outliers; consider regularization or re-training.",
    "calibration_error": "Review calibration plots and confidence histograms; consider temperature scaling or isotonic regression.",
    "latency_p50": "Profile model inference, review batch sizes, and verify that hardware utilization is healthy.",
    "latency_p95": "Consider profiling model inference, checking batch sizes, or reviewing hardware resources for tail latency.",
    "latency_p99": "Investigate worst-case inference paths, contention on shared resources, and noisy neighbours on shared hardware.",
}


def _render_top_regressions_html(result: Dict[str, Any]) -> str:
    """Render a Top Regressions section from the metric_regression gate, if present.

    This is purely presentational and is safe to skip when older payloads do not
    include metric details.
    """
    gates = result.get("gates", []) or []
    metric_gate: Optional[Dict[str, Any]] = None
    for gate in gates:
        if gate.get("name") == "metric_regression":
            metric_gate = gate
            break

    if not metric_gate:
        return ""

    raw_metrics = metric_gate.get("metrics") or []
    if not isinstance(raw_metrics, list) or not raw_metrics:
        return ""

    items: List[Dict[str, Any]] = []
    for m in raw_metrics:
        try:
            change_pct = float(m.get("change_pct", 0.0))
        except (TypeError, ValueError):
            change_pct = 0.0
        try:
            baseline = float(m.get("baseline_median"))
            current = float(m.get("current_median"))
        except (TypeError, ValueError):
            continue
        threshold_pct = float(m.get("threshold_pct") or 0.0)
        higher_is_better = bool(m.get("higher_is_better"))
        regressed = bool(m.get("regressed"))
        abs_change = abs(change_pct)

        is_improvement = False
        if higher_is_better:
            is_improvement = change_pct > 0
        else:
            is_improvement = change_pct < 0

        severity_label = ""
        severity_class = ""
        if regressed and threshold_pct > 0:
            ratio = abs_change / threshold_pct
            if ratio > 3.0:
                severity_label, severity_class = "Severe", "severity-severe"
            elif ratio >= 2.0:
                severity_label, severity_class = "Moderate", "severity-moderate"
            elif ratio >= 1.0:
                severity_label, severity_class = "Minor", "severity-minor"

        items.append(
            {
                "name": m.get("name", ""),
                "baseline": baseline,
                "current": current,
                "change_pct": change_pct,
                "abs_change": abs_change,
                "regressed": regressed,
                "is_improvement": is_improvement,
                "severity_label": severity_label,
                "severity_class": severity_class,
                "threshold_pct": threshold_pct,
            }
        )

    if not items:
        return ""

    items.sort(key=lambda x: x["abs_change"], reverse=True)
    top_items = items[:3]
    if not top_items:
        return ""

    rows: List[str] = []
    remediation_items: List[str] = []
    gate_remediation = metric_gate.get("remediation") or ""

    for item in top_items:
        name = str(item.get("name", ""))
        baseline_val = item["baseline"]
        current_val = item["current"]
        change_pct = item["change_pct"]
        abs_change = item["abs_change"]
        regressed = item["regressed"]
        is_improvement = item["is_improvement"]
        severity_label = item["severity_label"]
        severity_class = item["severity_class"]

        status_text = "✗ Regressed" if regressed else "✓ Pass"
        if not regressed and is_improvement:
            status_text += " (improved)"
        elif not regressed and not is_improvement and abs_change > 0:
            status_text += " (changed)"

        change_str = f"{change_pct:+.1f}%"
        if regressed:
            change_class = "change-regressed"
        elif is_improvement:
            change_class = "change-improved"
        else:
            change_class = "change-minor"

        severity_html = ""
        if severity_label:
            severity_html = f"<span class='severity {severity_class}'>{_escape(severity_label)}</span>"

        rows.append(
            "<tr>"
            f"<td>{_escape(name)}</td>"
            f"<td>{baseline_val:.3f}</td>"
            f"<td>{current_val:.3f}</td>"
            f"<td class='{change_class}'>{_escape(change_str)} {severity_html}</td>"
            f"<td>{_escape(status_text)}</td>"
            "</tr>"
        )

        if regressed:
            guidance = METRIC_GUIDANCE.get(name, "")
            parts: List[str] = []
            if gate_remediation:
                parts.append(gate_remediation)
            if guidance:
                parts.append(guidance)
            if parts:
                remediation_items.append(
                    f"<li><strong>{_escape(name)}</strong>: {_escape(' '.join(parts))}</li>"
                )

    if not rows:
        return ""

    section_html = (
        "<section class='top-regressions'>"
        "<h2>Top Regressions</h2>"
        "<table class='regressions-table'>"
        "<thead><tr><th>Metric</th><th>Baseline</th><th>Current</th><th>Change %</th><th>Status</th></tr></thead>"
        "<tbody>" + "".join(rows) + "</tbody></table>"
    )

    if remediation_items:
        section_html += (
            "<div class='regression-remediation'>"
            "<h3>Remediation guidance</h3>"
            "<ul>" + "".join(remediation_items) + "</ul>"
            "</div>"
        )

    section_html += "</section>"
    return section_html


def generate_html(result: Dict[str, Any]) -> str:
    status = str(result.get("overall_status", "fail")).lower()
    is_pass = status == "pass"
    color = "#2ecc71" if is_pass else "#e74c3c"
    status_text = "PASS" if is_pass else "FAIL"
    timestamp = result.get("timestamp") or ""
    total = result.get("total_evaluations", 0)
    gates = result.get("gates", []) or []

    rows: List[str] = []
    failed_blocks: List[str] = []

    for gate in gates:
        name = gate.get("name", "")
        gate_status = gate.get("status", "")
        message = gate.get("message", "")
        row_class = "fail" if gate_status == "fail" else ("skip" if gate_status == "skip" else "pass")
        rows.append(
            f"<tr class='{row_class}'><td>{_escape(name)}</td><td>{_escape(gate_status)}</td><td>{_escape(message)}</td></tr>"
        )
        if gate_status == "fail":
            remediation = gate.get("remediation") or ""
            failed_blocks.append(
                "<div class='failed-gate'>"
                f"<h3>{_escape(name)}</h3>"
                f"<p class='message'>{_escape(message)}</p>"
                f"<p class='remediation'>{_escape(remediation)}</p>"
                "</div>"
            )

    failed_html = "".join(failed_blocks) if failed_blocks else "<p>No failed gates.</p>"
    top_regressions_html = _render_top_regressions_html(result)


    html_str = f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <title>DT Quality Gates Summary</title>
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <style>
    body {{ font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 16px; background: #f5f5f5; }}
    .card {{ max-width: 960px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); padding: 16px 20px 20px; }}
    .status-banner {{ border-radius: 6px; padding: 12px 16px; color: #ffffff; margin-bottom: 16px; background: {color}; }}
    .status-banner h1 {{ margin: 0; font-size: 18px; }}
    .meta {{ font-size: 12px; color: #f0f0f0; margin-top: 4px; }}
    .meta span + span::before {{ content: \" · \"; margin: 0 4px; }}
    h2 {{ font-size: 16px; margin: 16px 0 8px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }}
    th, td {{ padding: 6px 8px; text-align: left; border-bottom: 1px solid #eeeeee; }}
    th {{ background: #fafafa; font-weight: 600; }}
    tr.fail td {{ background: #ffefef; }}
    tr.skip td {{ color: #888888; }}
    .failed-section {{ margin-top: 20px; }}
    .failed-gate {{ border-left: 3px solid #e74c3c; padding-left: 10px; margin-bottom: 12px; }}
    .failed-gate h3 {{ margin: 0 0 4px; font-size: 14px; }}
    .failed-gate .message {{ margin: 0 0 4px; }}
    .failed-gate .remediation {{ margin: 0; font-size: 12px; color: #666666; }}

    .top-regressions {{ margin-top: 16px; }}
    .regressions-table th, .regressions-table td {{ font-size: 12px; }}
    .change-improved {{ color: #2ecc71; font-weight: 600; }}
    .change-minor {{ color: #f39c12; }}
    .change-regressed {{ color: #e74c3c; font-weight: 600; }}
    .severity {{ padding: 2px 6px; border-radius: 10px; font-size: 11px; margin-left: 4px; }}
    .severity-minor {{ background: #fff3cd; color: #7f6000; }}
    .severity-moderate {{ background: #ffe0b2; color: #8e4b10; }}
    .severity-severe {{ background: #fadbd8; color: #922b21; }}
    .regression-remediation {{ margin-top: 8px; font-size: 12px; color: #555555; }}
    .regression-remediation ul {{ padding-left: 18px; margin: 4px 0 0; }}

    @media (max-width: 600px) {{
      table, thead, tbody, th, td, tr {{ display: block; }}
      thead {{ display: none; }}
      tr {{ margin-bottom: 8px; }}
      td {{ border: none; padding: 4px 0; }}
      td::before {{ font-weight: 600; display: inline-block; width: 110px; }}
      td:nth-child(1)::before {{ content: 'Gate'; }}
      td:nth-child(2)::before {{ content: 'Status'; }}
      td:nth-child(3)::before {{ content: 'Message'; }}
    }}
  </style>
</head>
<body>
  <div class=\"card\">
    <div class=\"status-banner\">
      <h1>DT Quality Gates: {status_text}</h1>
      <div class=\"meta\">
        <span>Evaluations: {total}</span>{' ' + ('<span>' + _escape(timestamp) + '</span>') if timestamp else ''}
      </div>
    </div>
    {top_regressions_html}
    <h2>Gate Summary</h2>
    <table>
      <thead><tr><th>Gate</th><th>Status</th><th>Message</th></tr></thead>
      <tbody>
        {''.join(rows)}
      </tbody>
    </table>
    <div class=\"failed-section\">
      <h2>Failed Gates</h2>
      {failed_html}
    </div>
  </div>
</body>
</html>
"""
    return html_str


def generate_slack_payload(result: Dict[str, Any]) -> Dict[str, Any]:
    status = str(result.get("overall_status", "fail")).lower()
    is_pass = status == "pass"
    color = "#2ecc71" if is_pass else "#e74c3c"
    emoji = ":white_check_mark:" if is_pass else ":x:"
    total = result.get("total_evaluations", 0)
    timestamp = result.get("timestamp") or ""
    gates = result.get("gates", []) or []

    title = f"DT Quality Gates: {'PASS' if is_pass else 'FAIL'} {emoji}"
    lines: List[str] = [
        f"*Overall:* {'PASS' if is_pass else 'FAIL'}  •  *Evaluations:* {total}",
    ]
    if timestamp:
        lines.append(f"*Timestamp:* `{timestamp}`")

    failed = [g for g in gates if g.get("status") == "fail"]
    if failed:
        lines.append(f"*Failed gates ({len(failed)}):*")
        for gate in failed:
            name = gate.get("name", "")
            message = gate.get("message", "")
            remediation = gate.get("remediation") or ""
            line = f"• *{name}*: {message}"
            if remediation:
                line += f" _({remediation})_"
            lines.append(line)
    else:
        lines.append("All gates passed :tada:")

    text = "\n".join(lines)
    footer = "See docs/dt_threshold_calibration.md for calibration & governance details."

    payload: Dict[str, Any] = {
        "text": title,
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": f"*{title}*"},
                    },
                    {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": text},
                    },
                    {
                        "type": "context",
                        "elements": [
                            {"type": "mrkdwn", "text": footer},
                        ],
                    },
                ],
            }
        ],
    }
    return payload


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Publish DT quality gates summary in HTML and Slack formats.")
    parser.add_argument(
        "--input-json",
        type=str,
        default=str(DEFAULT_INPUT_JSON),
        help="Path to dt_quality_gates_result.json (default: .goalie/dt_quality_gates_result.json)",
    )
    parser.add_argument(
        "--format",
        action="append",
        choices=["html", "slack"],
        help="One or more output formats to generate (html, slack). Default: both.",
    )
    parser.add_argument(
        "--output-html",
        type=str,
        default=str(DEFAULT_OUTPUT_HTML),
        help="Path to write HTML summary (default: .goalie/dt_gates_summary.html)",
    )
    parser.add_argument(
        "--output-slack-json",
        type=str,
        default=str(DEFAULT_OUTPUT_SLACK),
        help="Path to write Slack payload JSON (default: .goalie/dt_gates_slack_payload.json)",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    formats = args.format or ["html", "slack"]

    input_path = Path(args.input_json)
    if not input_path.exists():
        print(f"Input JSON not found: {input_path}", file=sys.stderr)
        return 1

    result = load_results(input_path)

    if "html" in formats:
        html_str = generate_html(result)
        html_path = Path(args.output_html)
        html_path.parent.mkdir(parents=True, exist_ok=True)
        html_path.write_text(html_str, encoding="utf-8")

    if "slack" in formats:
        payload = generate_slack_payload(result)
        slack_path = Path(args.output_slack_json)
        slack_path.parent.mkdir(parents=True, exist_ok=True)
        slack_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
