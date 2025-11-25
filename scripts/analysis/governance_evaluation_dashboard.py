#!/usr/bin/env python3
"""Governance Agent calibration dashboard.

Aggregates prod-cycle governance metrics from .goalie/metrics_log.jsonl and
emits a JSON summary plus optional config-impact table for CI and calibration.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import yaml

from scripts.analysis import retrospective_analysis as retro

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"
DEFAULT_HTML = GOALIE_DIR / "governance_evaluation_dashboard.html"


@dataclass
class ConfigImpact:
    name: str
    pass_count: int
    fail_count: int
    pass_rate: float
    failure_reasons: Dict[str, int]


def summarize_metric(values: Iterable[float]) -> Dict[str, float]:
    vals = sorted(float(v) for v in values if v is not None)
    if not vals:
        return {}

    def pct(p: float) -> float:
        idx = int(round((len(vals) - 1) * p))
        return vals[max(0, min(idx, len(vals) - 1))]

    return {
        "min": vals[0],
        "p25": pct(0.25),
        "median": pct(0.5),
        "p75": pct(0.75),
        "p90": pct(0.9),
        "max": vals[-1],
    }


def load_normalized_metrics(
    metrics_log: Path,
    since: Optional[datetime],
    until: Optional[datetime],
) -> List[Dict[str, Any]]:
    raw = retro.read_jsonl(metrics_log, since, until)
    return retro.normalize_metrics(raw)


def load_thresholds(path: Optional[Path]) -> Dict[str, Any]:
    if path is None or not path.is_file():
        return {}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError:
        return {}
    block = data.get("governance_health_thresholds")
    return block if isinstance(block, dict) else {}


def load_iris_events(
    metrics_log: Path,
    since: Optional[datetime],
    until: Optional[datetime],
    iris_commands: Optional[List[str]] = None,
    iris_circles: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Read iris_evaluation events from the shared metrics log."""
    raw = retro.read_jsonl(metrics_log, since, until)
    events: List[Dict[str, Any]] = []
    cmd_filter = {c.lower() for c in iris_commands} if iris_commands else None
    circle_filter = {c.lower() for c in iris_circles} if iris_circles else None
    for obj in raw:
        if obj.get("type") != "iris_evaluation":
            continue
        cmd = str(obj.get("iris_command") or "")
        if cmd_filter and cmd.lower() not in cmd_filter:
            continue
        circles = [str(c) for c in obj.get("circles_involved") or []]
        if circle_filter:
            lower_circles = {c.lower() for c in circles}
            if not (lower_circles & circle_filter):
                continue
        events.append(obj)
    return events


def _normalize_iris_status(value: Any) -> str:
    if value is None:
        return "unknown"
    if isinstance(value, str):
        txt = value.strip().lower()
    else:
        txt = str(value).strip().lower()
    return txt or "unknown"


def summarize_iris_for_governance(
    iris_events: List[Dict[str, Any]],
    metrics: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Aggregate IRIS metrics for governance and risk correlation views."""
    if not iris_events:
        return {
            "iris_events": 0,
            "actions_by_priority": {},
            "actions_by_circle": {},
            "command_counts": {},
            "circle_participation": {},
            "component_health": {},
            "risk_correlation": {},
        }

    actions_by_priority: Dict[str, int] = {}
    actions_by_circle: Dict[str, Dict[str, int]] = {}
    commands: Dict[str, int] = {}
    circle_participation: Dict[str, int] = {}
    component_stats: Dict[str, Dict[str, Any]] = {}
    degraded_timestamps: List[datetime] = []

    def record_component(name: str, status_payload: Any, ts: Optional[datetime]) -> None:
        status = _normalize_iris_status(
            (status_payload or {}).get("status") if isinstance(status_payload, dict) else status_payload
        )
        stats = component_stats.setdefault(
            name,
            {"status_counts": Counter(), "latest_status": None, "latest_timestamp": None},
        )
        stats["status_counts"][status] += 1
        if ts and (stats["latest_timestamp"] is None or ts > stats["latest_timestamp"]):
            stats["latest_timestamp"] = ts
            stats["latest_status"] = status
        if status in {"critical", "degraded", "warning"} and ts is not None:
            degraded_timestamps.append(ts)

    for ev in iris_events:
        ts_str = ev.get("timestamp")
        ts = retro.parse_time(ts_str) if isinstance(ts_str, str) else None
        cmd = str(ev.get("iris_command") or "")
        commands[cmd] = commands.get(cmd, 0) + 1

        circles = [str(c) for c in ev.get("circles_involved") or []]
        for c in circles:
            circle_participation[c] = circle_participation.get(c, 0) + 1

        for action in ev.get("actions_taken") or []:
            prio = str(action.get("priority") or "normal")
            actions_by_priority[prio] = actions_by_priority.get(prio, 0) + 1
            circle = str(action.get("circle") or "unknown")
            per_circle = actions_by_circle.setdefault(circle, {})
            per_circle[prio] = per_circle.get(prio, 0) + 1

        pm = ev.get("production_maturity") or {}
        record_component("starlingx_openstack", pm.get("starlingx_openstack"), ts)
        record_component("hostbill", pm.get("hostbill"), ts)
        record_component("loki_environments", pm.get("loki_environments"), ts)
        for name, payload in (pm.get("cms_interfaces") or {}).items():
            record_component(f"cms:{name}", payload, ts)
        for name, payload in (pm.get("communication_stack") or {}).items():
            record_component(f"comm:{name}", payload, ts)
        for proto in pm.get("messaging_protocols") or []:
            record_component(f"msg:{proto}", {"status": "unknown"}, ts)

    component_health: Dict[str, Any] = {}
    for name, stats in component_stats.items():
        latest_ts = stats["latest_timestamp"]
        component_health[name] = {
            "status_counts": dict(stats["status_counts"]),
            "latest_status": stats["latest_status"],
            "latest_timestamp": latest_ts.isoformat() if isinstance(latest_ts, datetime) else None,
        }

    risk_vals: List[float] = []
    degraded_risk_vals: List[float] = []
    degraded_windows: List[datetime] = sorted({ts for ts in degraded_timestamps if ts is not None})
    if metrics and degraded_windows:
        for m in metrics:
            ts_str = m.get("timestamp")
            ts = retro.parse_time(ts_str) if isinstance(ts_str, str) else None
            system = m.get("system") or {}
            r = system.get("risk_score")
            if r is None:
                continue
            val = float(r)
            risk_vals.append(val)
            if ts is not None and any(abs((ts - d).total_seconds()) <= 300 for d in degraded_windows):
                degraded_risk_vals.append(val)

    risk_corr = {
        "all_risk": summarize_metric(risk_vals) if risk_vals else {},
        "degraded_risk": summarize_metric(degraded_risk_vals) if degraded_risk_vals else {},
        "degraded_event_count": len(degraded_windows),
        "window_seconds": 300,
    }

    return {
        "iris_events": len(iris_events),
        "actions_by_priority": actions_by_priority,
        "actions_by_circle": actions_by_circle,
        "command_counts": commands,
        "circle_participation": circle_participation,
        "component_health": component_health,
        "risk_correlation": risk_corr,
    }


def build_iris_payload(
    iris_events: List[Dict[str, Any]], iris_summary: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Build JSON-serializable IRIS payload for the governance dashboard HTML.

    The payload mirrors the DT dashboard structure where possible so that the
    front-end can render an event timeline plus aggregated summaries.
    """

    if not iris_events:
        return None

    events_payload: List[Dict[str, Any]] = []
    for ev in iris_events:
        ts_str = ev.get("timestamp") or ""
        ctx = ev.get("execution_context") or {}
        events_payload.append(
            {
                "timestamp": ts_str,
                "iris_command": ev.get("iris_command"),
                "circles_involved": ev.get("circles_involved") or [],
                "execution_context": {
                    "incremental": bool(ctx.get("incremental")),
                    "relentless": bool(ctx.get("relentless")),
                    "focused": bool(ctx.get("focused")),
                },
                "actions_taken": ev.get("actions_taken") or [],
                "production_maturity": ev.get("production_maturity") or {},
            }
        )

    return {"events": events_payload, "summary": iris_summary or {}}


def print_iris_summary(iris: Dict[str, Any]) -> None:
    """Render a brief IRIS governance summary for terminal output."""
    if not iris or iris.get("iris_events", 0) == 0:
        print("No IRIS metrics available for the selected range.")
        return

    print("\n=== IRIS governance summary ===")
    print(f"Total IRIS evaluations: {iris.get('iris_events', 0)}")

    cmd_counts = iris.get("command_counts") or {}
    if cmd_counts:
        print("Commands:")
        for cmd, count in sorted(cmd_counts.items()):
            print(f"  {cmd}: {count}")

    actions_by_priority = iris.get("actions_by_priority") or {}
    if actions_by_priority:
        print("Actions by priority:")
        for prio, count in sorted(actions_by_priority.items()):
            print(f"  {prio}: {count}")

    circle_participation = iris.get("circle_participation") or {}
    if circle_participation:
        print("Circle participation:")
        for circle, count in sorted(circle_participation.items()):
            print(f"  {circle}: {count}")


def evaluate_config_impact(
    metrics: List[Dict[str, Any]], thresholds: Dict[str, Any], name: str
) -> ConfigImpact:
    passes = fails = 0
    reasons: Dict[str, int] = {}
    for m in metrics:
        system = m.get("system") or {}
        safe = m.get("safe_degrade") or {}
        fail_reasons: List[str] = []

        risk = system.get("risk_score")
        max_risk = thresholds.get("max_risk_score")
        if max_risk is not None and risk is not None and float(risk) > float(max_risk):
            fail_reasons.append("max_risk_score")

        incidents = system.get("recent_incidents")
        max_inc = thresholds.get("max_recent_incidents")
        if max_inc is not None and incidents is not None and int(incidents) > int(max_inc):
            fail_reasons.append("max_recent_incidents")

        triggers = safe.get("triggers")
        max_sd = thresholds.get("max_safe_degrade_triggers")
        if max_sd is not None and triggers is not None and int(triggers) > int(max_sd):
            fail_reasons.append("max_safe_degrade_triggers")

        if fail_reasons:
            fails += 1
            for r in fail_reasons:
                reasons[r] = reasons.get(r, 0) + 1
        else:
            passes += 1

    total = passes + fails
    rate = float(passes) / total if total else 0.0
    return ConfigImpact(
        name=name,
        pass_count=passes,
        fail_count=fails,
        pass_rate=rate,
        failure_reasons=reasons,
    )


def build_summary(
    metrics: List[Dict[str, Any]],
    thresholds: Dict[str, Dict[str, Any]],
    dry_run_cfg: Optional[Path],
    iris_events: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    risk_vals = [
        float((m.get("system") or {}).get("risk_score"))
        for m in metrics
        if (m.get("system") or {}).get("risk_score") is not None
    ]
    inc_vals = [
        float((m.get("system") or {}).get("recent_incidents"))
        for m in metrics
        if (m.get("system") or {}).get("recent_incidents") is not None
    ]
    sd_vals = [
        float((m.get("safe_degrade") or {}).get("triggers") or 0.0)
        for m in metrics
    ]
    metric_stats = {
        "risk_score": summarize_metric(risk_vals),
        "recent_incidents": summarize_metric(inc_vals),
        "safe_degrade_triggers": summarize_metric(sd_vals),
    }

    config_impacts: Dict[str, Dict[str, Any]] = {}
    for key, cfg in thresholds.items():
        if cfg:
            impact = evaluate_config_impact(metrics, cfg, key)
            config_impacts[key] = impact.__dict__

    if dry_run_cfg is not None:
        cfg = load_thresholds(dry_run_cfg)
        if cfg:
            impact = evaluate_config_impact(metrics, cfg, dry_run_cfg.name)
            config_impacts[dry_run_cfg.name] = impact.__dict__

    iris_summary = summarize_iris_for_governance(iris_events or [], metrics)

    return {
        "total_iterations": len(metrics),
        "metric_stats": metric_stats,
        "thresholds": thresholds,
        "config_impact": config_impacts,
        "dry_run_config": str(dry_run_cfg) if dry_run_cfg is not None else None,
        "iris": iris_summary,
    }


def print_config_table(summary: Dict[str, Any]) -> None:
    impacts = summary.get("config_impact") or {}
    if not impacts:
        print("No config impact data available.")
        return
    print("Config\tPass%\tPassed\tFailed")
    for name, payload in impacts.items():
        rate = float(payload.get("pass_rate") or 0.0) * 100.0
        print(
            f"{name}\t{rate:.1f}\t{int(payload.get('pass_count', 0))}\t{int(payload.get('fail_count', 0))}"
        )


def build_html(summary: Dict[str, Any], iris_payload: Optional[Dict[str, Any]]) -> str:
    """Construct an interactive governance evaluation HTML dashboard.

    The layout mirrors the DT evaluation dashboard patterns and includes a
    dedicated IRIS section for governance and risk correlation views.
    """

    data = {
        "summary": summary,
        "iris": iris_payload,
    }
    json_data = json.dumps(data)

    html = """<!DOCTYPE html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <title>Governance Evaluation Dashboard</title>
  <script src=\"https://cdn.plot.ly/plotly-2.27.0.min.js\"></script>
</head>
<body>
  <h1>Governance Evaluation Dashboard</h1>
  <div id=\"governance-summary\">
    <h2>Governance metrics</h2>
    <div id=\"gov-metric-stats\"></div>
    <div id=\"gov-config-impact\"></div>
  </div>
  <div id=\"iris-section\">
    <h2>IRIS governance &amp; risk signals</h2>
    <div id=\"iris-command-timeline\" style=\"width:100%;height:300px;\"></div>
    <div id=\"iris-circle-participation\" style=\"width:100%;height:300px;\"></div>
    <div id=\"iris-health-heatmap\" style=\"width:100%;height:350px;\"></div>
    <div id=\"iris-action-backlog\"></div>
    <div id=\"iris-risk-correlation\"></div>
  </div>
  <script>
    const data = __DATA__;
    const summary = data.summary || {};
    const iris = data.iris || null;

    function renderGovernanceSummary() {
      const statsDiv = document.getElementById('gov-metric-stats');
      const cfgDiv = document.getElementById('gov-config-impact');

      const metricStats = summary.metric_stats || {};
      if (statsDiv) {
        const rows = [
          ['risk_score', metricStats.risk_score || {}],
          ['recent_incidents', metricStats.recent_incidents || {}],
          ['safe_degrade_triggers', metricStats.safe_degrade_triggers || {}],
        ];
        let html = '<h3>Metric summaries</h3>';
        html += '<table border="1" cellpadding="4" cellspacing="0">';
        html += '<thead><tr><th>metric</th><th>min</th><th>p25</th><th>median</th><th>p75</th><th>p90</th><th>max</th></tr></thead><tbody>';
        rows.forEach(([name, stats]) => {
          if (!stats || Object.keys(stats).length === 0) {
            return;
          }
          html += '<tr><td>' + name + '</td>' +
            '<td>' + (stats.min ?? '') + '</td>' +
            '<td>' + (stats.p25 ?? '') + '</td>' +
            '<td>' + (stats.median ?? '') + '</td>' +
            '<td>' + (stats.p75 ?? '') + '</td>' +
            '<td>' + (stats.p90 ?? '') + '</td>' +
            '<td>' + (stats.max ?? '') + '</td></tr>';
        });
        html += '</tbody></table>';
        statsDiv.innerHTML = html;
      }

      if (cfgDiv) {
        const impacts = summary.config_impact || {};
        let html = '<h3>Config impact</h3>';
        const names = Object.keys(impacts);
        if (names.length === 0) {
          html += '<p>No config impact data available.</p>';
        } else {
          html += '<table border="1" cellpadding="4" cellspacing="0">';
          html += '<thead><tr><th>config</th><th>pass%</th><th>passed</th><th>failed</th></tr></thead><tbody>';
          names.forEach(name => {
            const imp = impacts[name] || {};
            const rate = (imp.pass_rate != null) ? (100.0 * imp.pass_rate).toFixed(1) : '';
            html += '<tr><td>' + name + '</td>' +
              '<td>' + rate + '</td>' +
              '<td>' + (imp.pass_count ?? '') + '</td>' +
              '<td>' + (imp.fail_count ?? '') + '</td></tr>';
          });
          html += '</tbody></table>';
        }
        cfgDiv.innerHTML = html;
      }
    }


    function renderIrisSection() {
      const section = document.getElementById('iris-section');
      if (!section) return;

      if (!iris || !iris.events || !Array.isArray(iris.events) || iris.events.length === 0) {
        section.innerHTML += '<p>No IRIS metrics available. Run prod-cycle or IRIS commands with metrics logging enabled.</p>';
        return;
      }

      const events = iris.events;
      const irisSummary = (summary && summary.iris) || (iris.summary || {});

      // Command timeline grouped by IRIS command.
      const byCmd = {};
      events.forEach(ev => {
        const cmd = (ev.iris_command || 'unknown').toString();
        if (!byCmd[cmd]) byCmd[cmd] = [];
        byCmd[cmd].push(ev);
      });
      const cmdNames = Object.keys(byCmd).sort();
      const cmdTraces = [];
      cmdNames.forEach(cmd => {
        const list = byCmd[cmd];
        cmdTraces.push({
          x: list.map(e => e.timestamp),
          y: list.map(() => cmd),
          mode: 'markers',
          name: cmd,
          marker: {size: 10},
          hovertemplate: 'ts=%{x}<br>command=' + cmd + '<extra></extra>',
        });
      });
      if (cmdTraces.length > 0) {
        Plotly.newPlot('iris-command-timeline', cmdTraces, {
          title: 'IRIS commands over time',
          xaxis: {title: 'timestamp'},
          yaxis: {title: 'command', type: 'category'},
          legend: {orientation: 'h'},
        });
      } else {
        const div = document.getElementById('iris-command-timeline');
        if (div) {
          div.innerHTML = '<p>No IRIS commands recorded.</p>';
        }
      }

      // Circle participation over time (scatter by circle).
      const byCircle = {};
      events.forEach(ev => {
        const ts = ev.timestamp;
        (ev.circles_involved || []).forEach(c => {
          const name = (c || 'unknown').toString();
          if (!byCircle[name]) byCircle[name] = [];
          byCircle[name].push(ts);
        });
      });
      const circleNames = Object.keys(byCircle).sort();
      const circleTraces = [];
      circleNames.forEach(circle => {
        const tsList = byCircle[circle] || [];
        circleTraces.push({
          x: tsList,
          y: tsList.map(() => circle),
          mode: 'markers',
          name: circle,
          marker: {size: 9},
          hovertemplate: 'ts=%{x}<br>circle=' + circle + '<extra></extra>',
        });
      });
      if (circleTraces.length > 0) {
        Plotly.newPlot('iris-circle-participation', circleTraces, {
          title: 'Circle participation over time',
          xaxis: {title: 'timestamp'},
          yaxis: {title: 'circle', type: 'category'},
          legend: {orientation: 'h'},
        });
      } else {
        const div = document.getElementById('iris-circle-participation');
        if (div) {
          div.innerHTML = '<p>No IRIS circle participation data available.</p>';
        }
      }

      // Component health heatmap using latest status per component.
      const healthDiv = document.getElementById('iris-health-heatmap');
      const health = (irisSummary && irisSummary.component_health) || {};
      const componentNames = Object.keys(health || {}).sort();
      if (healthDiv) {
        if (componentNames.length === 0) {
          healthDiv.innerHTML = '<p>No component health data available from IRIS.</p>';
        } else {
          const statusOrder = ['healthy', 'warning', 'degraded', 'critical', 'unknown'];
          const statusToValue = {};
          statusOrder.forEach((s, idx) => {
            statusToValue[s] = idx / Math.max(1, statusOrder.length - 1);
          });
          const z = [];
          const text = [];
          componentNames.forEach(name => {
            const latest = (health[name] && health[name].latest_status) || 'unknown';
            const key = latest.toString().toLowerCase();
            const value = Object.prototype.hasOwnProperty.call(statusToValue, key)
              ? statusToValue[key]
              : 0.0;
            z.push([value]);
            text.push([latest]);
          });
          const trace = {
            x: ['status'],
            y: componentNames,
            z,
            text,
            type: 'heatmap',
            colorscale: [
              [0.0, '#dfe6e9'],
              [0.25, '#ffeaa7'],
              [0.5, '#fab1a0'],
              [0.75, '#e17055'],
              [1.0, '#d63031'],
            ],
            showscale: false,
            hovertemplate: 'component=%{y}<br>status=%{text}<extra></extra>',
          };
          Plotly.newPlot('iris-health-heatmap', [trace], {
            title: 'IRIS component health (latest status)',
            xaxis: {showticklabels: false},
            yaxis: {title: 'component'},
          });
        }
      }

      // Action backlog organized by circle and priority.
      const backlogDiv = document.getElementById('iris-action-backlog');
      if (backlogDiv) {
        const actionsByCircle = (irisSummary && irisSummary.actions_by_circle) || {};
        let html = '<h3>Action backlog by circle &amp; priority</h3>';
        const circles = Object.keys(actionsByCircle);
        if (circles.length === 0) {
          html += '<p>No IRIS governance actions recorded.</p>';
        } else {
          const allPriorities = new Set();
          Object.values(actionsByCircle).forEach(pmap => {
            Object.keys(pmap).forEach(p => allPriorities.add(p));
          });
          const priorities = Array.from(allPriorities).sort();
          html += '<table border="1" cellpadding="4" cellspacing="0"><thead><tr><th>circle</th>';
          priorities.forEach(p => { html += '<th>' + p + '</th>'; });
          html += '</tr></thead><tbody>';
          circles.forEach(circle => {
            const m = actionsByCircle[circle] || {};
            html += '<tr><td>' + circle + '</td>';
            priorities.forEach(p => {
              const v = m[p] || 0;
              html += '<td>' + v + '</td>';
            });
            html += '</tr>';
          });
          html += '</tbody></table>';
        }
        backlogDiv.innerHTML = html;
      }

      // Risk correlation visualization comparing overall vs near-degraded risk.
      const riskDiv = document.getElementById('iris-risk-correlation');
      if (riskDiv) {
        const corr = (irisSummary && irisSummary.risk_correlation) || {};
        let html = '<h3>Governance risk vs IRIS component alerts</h3>';
        if (!corr || Object.keys(corr).length === 0) {
          html += '<p>No overlapping governance risk and IRIS degradation windows found.</p>';
          riskDiv.innerHTML = html;
        } else {
          const allRisk = corr.all_risk || {};
          const degradedRisk = corr.degraded_risk || {};
          const windowSeconds = corr.window_seconds || 0;
          const degradedEvents = corr.degraded_event_count || 0;
          html += '<p>Window: +/- ' + windowSeconds + 's around degraded/critical component health events.</p>';
          html += '<p>Distinct degraded/critical component windows: ' + degradedEvents + '</p>';

          const statsOrder = ['min', 'p25', 'median', 'p75', 'p90', 'max'];
          html += '<table border="1" cellpadding="4" cellspacing="0">';
          html += '<thead><tr><th>stat</th><th>overall risk</th><th>risk near degraded</th></tr></thead><tbody>';
          statsOrder.forEach(name => {
            const a = (allRisk && Object.prototype.hasOwnProperty.call(allRisk, name)) ? allRisk[name] : '';
            const d = (degradedRisk && Object.prototype.hasOwnProperty.call(degradedRisk, name)) ? degradedRisk[name] : '';
            if (a === '' && d === '') {
              return;
            }
            html += '<tr><td>' + name + '</td>' +
              '<td>' + a + '</td>' +
              '<td>' + d + '</td></tr>';
          });
          html += '</tbody></table>';
          html += '<div id="iris-risk-correlation-chart" style="width:100%;height:300px;"></div>';
          riskDiv.innerHTML = html;

          const medianOverall = allRisk.median;
          const medianDegraded = degradedRisk.median;
          const chartDivId = 'iris-risk-correlation-chart';
          if (medianOverall != null || medianDegraded != null) {
            const trace = {
              x: ['overall', 'near_degraded'],
              y: [medianOverall != null ? medianOverall : null, medianDegraded != null ? medianDegraded : null],
              type: 'bar',
              marker: {color: ['#4c78a8', '#e45756']},
            };
            Plotly.newPlot(chartDivId, [trace], {
              title: 'Median governance risk score',
              yaxis: {title: 'risk_score'},
            });
          }
        }
      }
    }


    renderGovernanceSummary();
    renderIrisSection();

  </script>
</body>
</html>
"""
    return html.replace("__DATA__", json_data)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Governance Agent calibration dashboard.",
    )
    parser.add_argument(
        "--metrics-log",
        type=Path,
        default=GOALIE_DIR / "metrics_log.jsonl",
    )
    parser.add_argument(
        "--export-json",
        type=Path,
        default=GOALIE_DIR / "governance_evaluation_summary.json",
    )
    parser.add_argument(
        "--dry-run-config",
        type=Path,
        help="Optional governance thresholds YAML to preview.",
    )
    parser.add_argument(
        "--format",
        action="append",
        choices=["json", "table", "html"],
        help="Output formats to produce.",
    )
    parser.add_argument(
        "--output-html",
        type=Path,
        default=DEFAULT_HTML,
        help=(
            "Path to write interactive HTML dashboard. "
            "Used when --format includes html."
        ),
    )
    parser.add_argument(
        "--since",
        type=str,
        default=None,
        help="Only include metrics at or after this ISO8601 timestamp.",
    )
    parser.add_argument(
        "--until",
        type=str,
        default=None,
        help="Only include metrics strictly before this ISO8601 timestamp.",
    )
    parser.add_argument(
        "--iris-command",
        action="append",
        help="Filter IRIS metrics to these commands (e.g. health, patterns).",
    )
    parser.add_argument(
        "--iris-circle",
        action="append",
        help="Filter IRIS metrics to events involving these circles.",
    )
    args = parser.parse_args(argv)

    since = retro.parse_time(args.since)
    until = retro.parse_time(args.until)

    metrics = load_normalized_metrics(args.metrics_log, since, until)
    thresholds: Dict[str, Dict[str, Any]] = {}
    thresholds["staging"] = load_thresholds(GOALIE_DIR / "governance_thresholds_staging.yaml")
    thresholds["production"] = load_thresholds(GOALIE_DIR / "governance_thresholds_production.yaml")

    iris_events = load_iris_events(
        args.metrics_log,
        since,
        until,
        iris_commands=args.iris_command,
        iris_circles=args.iris_circle,
    )

    summary = build_summary(metrics, thresholds, args.dry_run_config, iris_events)
    iris_payload = build_iris_payload(iris_events, summary.get("iris") or {})

    args.export_json.parent.mkdir(parents=True, exist_ok=True)
    args.export_json.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    fmts = args.format or ["json"]
    if "html" in fmts:
        args.output_html.parent.mkdir(parents=True, exist_ok=True)
        html = build_html(summary, iris_payload)
        args.output_html.write_text(html, encoding="utf-8")
    if "table" in fmts:
        print_config_table(summary)
        print_iris_summary(summary.get("iris") or {})
    if "json" in fmts and sys.stdout.isatty():
        print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())

