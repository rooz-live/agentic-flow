#!/usr/bin/env python3
"""DT evaluation dashboard: aggregate dt_evaluation events into HTML + summary.

Reads .goalie/metrics_log.jsonl, filters dt_evaluation events, computes summary
statistics to help calibrate DT model-quality thresholds, and emits an
interactive Plotly.js HTML dashboard plus stdout summary.

This script underpins `af dt-dashboard` and is exercised by
`af dt-e2e-check` as part of the full calibration pipeline, including
`--dry-run-config` previews.
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from fnmatch import fnmatch
from importlib import util as importlib_util
from pathlib import Path
from statistics import median
from typing import Any, Dict, Iterable, List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"
METRICS_LOG = GOALIE_DIR / "metrics_log.jsonl"
DEFAULT_HTML = GOALIE_DIR / "dt_evaluation_dashboard.html"
DEFAULT_EXPORT_JSON = GOALIE_DIR / "dt_evaluation_summary.json"
DEFAULT_DISTRIBUTION_JSON = GOALIE_DIR / "dt_distribution_analysis.json"

DEFAULT_TRAJECTORIES = GOALIE_DIR / "trajectories.jsonl"
BUILD_TRAJECTORIES_SCRIPT = Path(__file__).resolve().with_name("build_trajectories.py")

DEFAULT_CSV = GOALIE_DIR / "dt_evaluation_metrics.csv"
EVAL_SCRIPT = Path(__file__).resolve().with_name("evaluate_dt_model.py")

_DT_EVAL_MOD = None


def _load_dt_eval_module():
    global _DT_EVAL_MOD
    if _DT_EVAL_MOD is not None:
        return _DT_EVAL_MOD
    if not EVAL_SCRIPT.is_file():
        raise RuntimeError(f"evaluate_dt_model.py not found at {EVAL_SCRIPT}")
    spec = importlib_util.spec_from_file_location("dt_eval_model", EVAL_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("Failed to load dt_eval_model module")
    mod = importlib_util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[arg-type]
    _DT_EVAL_MOD = mod
    return mod


def _load_reward_module():
    """Dynamically load build_trajectories.py to reuse reward presets.

    This mirrors the dynamic import strategy used in other DT tooling so the
    dashboard can be run either as a script or as an imported module.
    """

    if not BUILD_TRAJECTORIES_SCRIPT.is_file():
        return None

    spec = importlib_util.spec_from_file_location(
        "_build_trajectories_for_dashboard", BUILD_TRAJECTORIES_SCRIPT
    )
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        return None

    module = importlib_util.module_from_spec(spec)
    import sys as _sys

    _sys.modules[spec.name] = module
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


def _clean_float_for_json(value: float) -> Optional[float]:
    """Convert NaN/inf to None so JSON output stays valid."""

    if not isinstance(value, (int, float)):
        return None
    if isinstance(value, float) and (math.isnan(value) or not math.isfinite(value)):
        return None
    return float(value)


def _summarize_values(values: List[float]) -> Dict[str, float]:
    if not values:
        return {
            "min": math.nan,
            "max": math.nan,
            "mean": math.nan,
            "median": math.nan,
            "std": math.nan,
        }

    vals = sorted(values)
    n = len(vals)
    v_min = vals[0]
    v_max = vals[-1]
    mean = sum(vals) / n
    if n % 2:
        med = vals[n // 2]
    else:
        med = 0.5 * (vals[n // 2 - 1] + vals[n // 2])
    var = sum((v - mean) ** 2 for v in vals) / n
    std = math.sqrt(var)
    return {"min": v_min, "max": v_max, "mean": mean, "median": med, "std": std}


def _duration_stats(values: List[float]) -> Dict[str, float]:
    if not values:
        return {"min": math.nan, "mean": math.nan, "p95": math.nan, "max": math.nan}

    vals = sorted(values)
    n = len(vals)
    v_min = vals[0]
    v_max = vals[-1]
    mean = sum(vals) / n
    idx = max(0, min(n - 1, int(math.ceil(0.95 * n) - 1)))
    p95 = vals[idx]
    return {"min": v_min, "mean": mean, "p95": p95, "max": v_max}


def compute_reward_preset_analysis(trajectories_path: Path) -> Optional[Dict[str, Any]]:
    """Compute reward preset stats and threshold curves from trajectories.

    The schema is intentionally aligned with compare_presets.py JSON output but
    extended with "threshold_curves" per preset so governance tooling can reason
    about how strict a reward threshold to apply.
    """

    try:
        mod = _load_reward_module()
    except Exception:  # pragma: no cover - defensive
        return None
    if mod is None:
        return None

    compute_reward_value = getattr(mod, "compute_reward_value", None)
    reward_presets = getattr(mod, "REWARD_PRESETS", None)
    if compute_reward_value is None or not isinstance(reward_presets, dict):
        return None

    if not trajectories_path or not trajectories_path.is_file():
        return None

    steps: List[Dict[str, Any]] = []
    try:
        with trajectories_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                reward = rec.get("reward") or {}
                if not isinstance(reward, dict):
                    continue
                status = reward.get("status")
                duration_ms = reward.get("duration_ms")
                if status is None or not isinstance(duration_ms, (int, float)) or duration_ms < 0:
                    continue
                steps.append({
                    "status": str(status),
                    "duration_ms": float(duration_ms),
                })
    except FileNotFoundError:
        return None

    if not steps:
        return None

    total_steps = len(steps)
    thresholds = [round(t, 2) for t in (x / 20.0 for x in range(1, 20))]  # 0.05..0.95

    default_order = [
        "status_dominant",
        "latency_sensitive",
        "balanced",
        "governance_conservative",
    ]
    preset_names = [name for name in default_order if name in reward_presets] or sorted(
        reward_presets.keys()
    )

    presets_payload: List[Dict[str, Any]] = []
    for name in preset_names:
        max_duration, alpha = reward_presets[name]
        rewards: List[float] = []
        status_counts: Dict[str, int] = {}
        durations_all: List[float] = []
        durations_success: List[float] = []
        durations_failure: List[float] = []

        for step in steps:
            duration = step["duration_ms"]
            status = (step["status"] or "").strip().lower()
            value = float(
                compute_reward_value(
                    status=status,
                    duration_ms=duration,
                    max_duration_ms=float(max_duration),
                    alpha=float(alpha),
                )
            )
            rewards.append(value)
            durations_all.append(duration)

            status_counts[status] = status_counts.get(status, 0) + 1
            if status == "success":
                durations_success.append(duration)
            elif status == "failure":
                durations_failure.append(duration)

        reward_stats = _summarize_values(rewards)
        dur_all = _duration_stats(durations_all)
        dur_success = _duration_stats(durations_success)
        dur_failure = _duration_stats(durations_failure)

        threshold_curves: List[Dict[str, Any]] = []
        for thr in thresholds:
            if not rewards:
                frac = 0.0
            else:
                count = sum(1 for v in rewards if v >= thr)
                frac = float(count) / float(len(rewards))
            threshold_curves.append(
                {
                    "threshold": thr,
                    "success_rate": frac,
                }
            )

        other_count = sum(
            count for key, count in status_counts.items() if key not in {"success", "failure"}
        )

        presets_payload.append(
            {
                "name": name,
                "reward_stats": {k: _clean_float_for_json(v) for k, v in reward_stats.items()},
                "status_counts": {
                    "success": int(status_counts.get("success", 0)),
                    "failure": int(status_counts.get("failure", 0)),
                    "other": int(other_count),
                },
                "duration_stats": {
                    "all": {k: _clean_float_for_json(v) for k, v in dur_all.items()},
                    "success": {k: _clean_float_for_json(v) for k, v in dur_success.items()},
                    "failure": {k: _clean_float_for_json(v) for k, v in dur_failure.items()},
                },
                "threshold_curves": [
                    {
                        "threshold": c["threshold"],
                        "success_rate": _clean_float_for_json(c["success_rate"]),
                    }
                    for c in threshold_curves
                ],
            }
        )

    return {
        "trajectories_file": str(trajectories_path),
        "total_steps": total_steps,
        "presets": presets_payload,
    }

def load_model_thresholds(config_path: Optional[Path]) -> Dict[str, Any]:
    """Reuse evaluate_dt_model.load_model_thresholds for consistent parsing."""
    mod = _load_dt_eval_module()
    return mod.load_model_thresholds(config_path)  # type: ignore[attr-defined]


def parse_time(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        txt = value.strip()
        if "T" not in txt:
            dt = datetime.fromisoformat(txt)
        else:
            dt = datetime.fromisoformat(txt.replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            dt = dt.astimezone(tz=None).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def within_range(ts: Optional[str], since: Optional[datetime], until: Optional[datetime]) -> bool:
    if not ts:
        return True
    dt = parse_time(ts)
    if dt is None:
        return True
    if since and dt < since:
        return False
    if until and dt > until:
        return False
    return True


@dataclass
class DtEvalEvent:
    timestamp: datetime
    ts_str: str
    checkpoint: str
    run_name: Optional[str]
    top1: float
    top3: float
    cont_mae: Optional[float]
    cont_mse: Optional[float]
    total_positions: int
    per_circle_top1: Dict[str, float]
    calibration_error: Optional[float] = None
    latency_p50: Optional[float] = None
    latency_p95: Optional[float] = None
    latency_p99: Optional[float] = None

    @property
    def checkpoint_name(self) -> str:
        return Path(self.checkpoint).name if self.checkpoint else ""


def read_dt_events(
    path: Path,
    since: Optional[datetime],
    until: Optional[datetime],
    checkpoint_pattern: Optional[str],
    compare: Optional[List[str]],
) -> List[DtEvalEvent]:
    if not path.exists():
        return []
    compare_set = {Path(c).name for c in compare} if compare else None
    events: List[DtEvalEvent] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if obj.get("type") != "dt_evaluation":
                continue
            ts = obj.get("timestamp") or ""
            if not within_range(ts, since, until):
                continue
            ckpt = str(obj.get("checkpoint") or "")
            run_name = obj.get("run_name")
            if checkpoint_pattern:
                name = Path(ckpt).name
                if not (fnmatch(name, checkpoint_pattern) or fnmatch(ckpt, checkpoint_pattern)):
                    continue
            if compare_set is not None:
                name = Path(ckpt).name
                if name not in compare_set and ckpt not in compare_set:
                    continue
            metrics = obj.get("metrics") or {}
            cont = obj.get("cont_overall") or {}
            per_circle = obj.get("per_circle_top1") or {}
            dt = parse_time(ts)
            if dt is None:
                continue
            calib = metrics.get("calibration_error")
            lat50 = metrics.get("latency_p50")
            lat95 = metrics.get("latency_p95")
            lat99 = metrics.get("latency_p99")
            events.append(
                DtEvalEvent(
                    timestamp=dt,
                    ts_str=ts,
                    checkpoint=ckpt,
                    run_name=run_name,
                    top1=float(metrics.get("top1_accuracy") or 0.0),
                    top3=float(metrics.get("top3_accuracy") or 0.0),
                    cont_mae=(None if cont.get("mae") is None else float(cont.get("mae"))),
                    cont_mse=(None if cont.get("mse") is None else float(cont.get("mse"))),
                    total_positions=int(metrics.get("total_positions") or 0),
                    per_circle_top1={str(k): float(v) for k, v in per_circle.items()},
                    calibration_error=(None if calib is None else float(calib)),
                    latency_p50=(None if lat50 is None else float(lat50)),
                    latency_p95=(None if lat95 is None else float(lat95)),
                    latency_p99=(None if lat99 is None else float(lat99)),
                )
            )
    events.sort(key=lambda e: e.timestamp)
    return events


def percentile(sorted_vals: List[float], q: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    q = max(0.0, min(1.0, q))
    pos = q * (len(sorted_vals) - 1)
    lo = int(pos)
    hi = min(lo + 1, len(sorted_vals) - 1)
    frac = pos - lo
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * frac


def summarize_metric(values: Iterable[float]) -> Dict[str, float]:
    vals = [v for v in values if v is not None]
    if not vals:
        return {}
    vals.sort()
    return {
        "min": vals[0],
        "p25": percentile(vals, 0.25),
        "median": median(vals),
        "p75": percentile(vals, 0.75),
        "p90": percentile(vals, 0.90),
        "max": vals[-1],
    }


def compute_threshold_recommendations(
    top1_stats: Dict[str, float],
    cont_mae_stats: Dict[str, float],
    per_circle_medians: Dict[str, float],
) -> Dict[str, Any]:
    rec: Dict[str, Any] = {"staging": {}, "production": {}}
    if top1_stats:
        p25 = top1_stats["p25"]
        med = top1_stats["median"]
        rec["staging"]["min_top1_accuracy"] = max(0.0, round(p25 * 0.90, 2))
        rec["production"]["min_top1_accuracy"] = round(med, 2)
    if cont_mae_stats:
        p75 = cont_mae_stats["p75"]
        med = cont_mae_stats["median"]
        rec["staging"]["max_cont_mae"] = round(p75 * 1.10, 3)
        rec["production"]["max_cont_mae"] = round(med, 3)
    for circle in ("orchestrator", "assessor"):
        if circle in per_circle_medians:
            rec["production"][f"per_circle_min_top1_{circle}"] = round(
                per_circle_medians[circle], 2
            )
    return rec


def pass_rate(events: List[DtEvalEvent], thresholds: Dict[str, Any]) -> float:
    """Compute simple pass-rate using baseline threshold rules.

    This is kept for backward compatibility and used as a fallback when the
    full check_model_quality helper is not available.
    """
    if not events or not thresholds:
        return 0.0
    min_top1 = float(thresholds.get("min_top1_accuracy") or 0.0)
    max_mae = thresholds.get("max_cont_mae")
    per_circle = thresholds.get("per_circle_min_top1") or {}
    passed = 0
    for ev in events:
        if ev.top1 < min_top1:
            continue
        if max_mae is not None and ev.cont_mae is not None:
            if ev.cont_mae > float(max_mae):
                continue
        ok_c = True
        for circle, min_acc in per_circle.items():
            acc = float(ev.per_circle_top1.get(circle) or 0.0)
            if acc < float(min_acc):
                ok_c = False
                break
        if not ok_c:
            continue
        passed += 1
    return passed / len(events)


@dataclass
class ConfigImpact:
    name: str
    pass_count: int
    fail_count: int
    pass_rate: float
    failure_reasons: Dict[str, int]


def evaluate_config_impact(
    events: List[DtEvalEvent], thresholds: Dict[str, Any], name: str
) -> ConfigImpact:
    """Evaluate how a threshold config would have performed historically."""
    if not events or not thresholds:
        return ConfigImpact(name=name, pass_count=0, fail_count=0, pass_rate=0.0, failure_reasons={})

    mod = _load_dt_eval_module()
    check_model_quality = getattr(mod, "check_model_quality", None)

    if check_model_quality is None:  # pragma: no cover - defensive fallback
        rate = pass_rate(events, thresholds)
        total = len(events)
        passed = int(round(rate * total))
        failed = total - passed
        return ConfigImpact(
            name=name,
            pass_count=passed,
            fail_count=failed,
            pass_rate=rate,
            failure_reasons={},
        )

    failure_reasons: Counter[str] = Counter()
    passed = 0
    failed = 0

    for ev in events:
        results: Dict[str, Any] = {
            "top1_accuracy": ev.top1,
            "top3_accuracy": ev.top3,
            "total_positions": ev.total_positions,
            "cont_overall": None
            if ev.cont_mae is None and ev.cont_mse is None
            else {"mae": ev.cont_mae or 0.0, "mse": ev.cont_mse or 0.0},
            "per_circle": {
                circle: {"top1_accuracy": acc}
                for circle, acc in ev.per_circle_top1.items()
            },
        }
        ok, crits = check_model_quality(results, thresholds)  # type: ignore[misc]
        if ok:
            passed += 1
        else:
            failed += 1
            for crit_name, crit_ok, _msg in crits:
                if not crit_ok:
                    failure_reasons[crit_name] += 1

    total = passed + failed
    rate = float(passed) / float(total) if total else 0.0
    return ConfigImpact(
        name=name,
        pass_count=passed,
        fail_count=failed,
        pass_rate=rate,
        failure_reasons=dict(failure_reasons),
    )


def compute_checkpoint_summary(events: List[DtEvalEvent]) -> Dict[str, Dict[str, Any]]:
    """Aggregate per-checkpoint evaluation stats for HTML checkpoint table."""
    by_ckpt: Dict[str, List[DtEvalEvent]] = {}
    for ev in events:
        key = ev.checkpoint_name or ev.checkpoint or "<unknown>"
        by_ckpt.setdefault(key, []).append(ev)

    summary: Dict[str, Dict[str, Any]] = {}
    for name, evs in by_ckpt.items():
        top1_vals = [e.top1 for e in evs]
        mae_vals = [e.cont_mae for e in evs if e.cont_mae is not None]
        summary[name] = {
            "count": len(evs),
            "median_top1": median(top1_vals) if top1_vals else 0.0,
            "median_cont_mae": (median(mae_vals) if mae_vals else None),
        }

    return summary


def format_table(headers: List[str], rows: List[List[str]]) -> str:
    """Render a simple left-aligned ASCII table.

    Kept intentionally lightweight so dashboard summaries remain dependency-free
    while still being readable in CI logs and terminals.
    """

    if not headers:
        return ""

    widths = [len(str(h)) for h in headers]
    for row in rows:
        for idx, cell in enumerate(row):
            if idx < len(widths):
                widths[idx] = max(widths[idx], len(str(cell)))

    def _format_row(values: List[str]) -> str:
        return "  ".join(str(v).ljust(widths[i]) for i, v in enumerate(values))

    lines = [_format_row(headers)]
    lines.append("-" * len(lines[0]))
    for row in rows:
        lines.append(_format_row(row))
    return "\n".join(lines)



def print_config_impact_table(impacts: Dict[str, ConfigImpact]) -> None:
    """Print ASCII comparison table of config pass rates and failure reasons."""
    if not impacts:
        print("\nThreshold impact preview: (no threshold configs available)")
        return

    print("\nThreshold impact preview (historical evaluations):")
    print(render_config_impact_table(impacts))


def render_config_impact_table(impacts: Dict[str, ConfigImpact]) -> str:
    if not impacts:
        return "No threshold impact data available."
    headers = ["Config", "Pass%", "Passes", "Fails", "Top Failure Reasons"]
    rows = []
    for name, impact in impacts.items():
        reasons = ", ".join(
            f"{k} ({v})" for k, v in sorted(impact.failure_reasons.items(), key=lambda kv: kv[1], reverse=True)[:3]
        ) or "—"
        rows.append(
            [
                name,
                f"{impact.pass_rate * 100:.1f}%",
                str(impact.pass_count),
                str(impact.fail_count),
                reasons,
            ]
        )
    return format_table(headers, rows)


def print_metric_summary_tables(
    top1_stats: Dict[str, float],
    top3_stats: Dict[str, float],
    cont_mae_stats: Dict[str, float],
    per_circle_medians: Dict[str, float],
    extra_metric_stats: Optional[Dict[str, Dict[str, float]]] = None,
) -> None:
    """Pretty-print metric summaries when --format table is requested."""

    def _row(name: str, stats: Dict[str, float]) -> List[str]:
        if not stats:
            return [name, "-", "-", "-", "-", "-", "-"]
        return [
            name,
            f"{stats['min']:.3f}",
            f"{stats['p25']:.3f}",
            f"{stats['median']:.3f}",
            f"{stats['p75']:.3f}",
            f"{stats['p90']:.3f}",
            f"{stats['max']:.3f}",
        ]

    headers = ["Metric", "min", "p25", "median", "p75", "p90", "max"]
    rows = [
        _row("top1_accuracy", top1_stats),
        _row("top3_accuracy", top3_stats),
        _row("cont_mae", cont_mae_stats),
    ]

    if extra_metric_stats:
        for metric_name, stats in sorted(extra_metric_stats.items()):
            rows.append(_row(metric_name, stats))
    print("\nMetric distribution table:")
    print(format_table(headers, rows))

    if per_circle_medians:
        circle_headers = ["Circle", "median_top1"]
        circle_rows = [
            [circle, f"{value:.3f}"] for circle, value in sorted(per_circle_medians.items())
        ]
        print("\nPer-circle median top1:")
        print(format_table(circle_headers, circle_rows))


def _build_histogram(values: List[float], bins: int = 20) -> Dict[str, Any]:
    """Simple histogram helper for distribution analysis.

    Returns a dict with `bin_edges` (length N+1) and `counts` (length N).
    """

    vals = [float(v) for v in values if isinstance(v, (int, float))]
    if not vals or bins <= 0:
        return {"bin_edges": [], "counts": []}

    v_min = min(vals)
    v_max = max(vals)
    if v_min == v_max:
        # Single-value distribution; use one bin centered on the value.
        return {"bin_edges": [v_min, v_max], "counts": [len(vals)]}

    width = (v_max - v_min) / float(bins)
    edges = [v_min + i * width for i in range(bins + 1)]
    counts = [0 for _ in range(bins)]
    for v in vals:
        if v <= edges[0]:
            counts[0] += 1
            continue
        if v >= edges[-1]:
            counts[-1] += 1
            continue
        idx = int((v - v_min) / width)
        idx = max(0, min(bins - 1, idx))
        counts[idx] += 1
    return {"bin_edges": edges, "counts": counts}


def _event_fails_threshold(
    ev: DtEvalEvent, thresholds: Dict[str, Any]
) -> bool:
    """Return True if a single evaluation fails given thresholds.

    This mirrors the logic in pass_rate() but at per-event granularity.
    """

    if not thresholds:
        return False

    min_top1 = float(thresholds.get("min_top1_accuracy") or 0.0)
    max_mae = thresholds.get("max_cont_mae")
    per_circle = thresholds.get("per_circle_min_top1") or {}

    if ev.top1 < min_top1:
        return True
    if (
        max_mae is not None
        and ev.cont_mae is not None
        and ev.cont_mae > float(max_mae)
    ):
        return True

    for circle, req in per_circle.items():
        acc = ev.per_circle_top1.get(circle)
        if acc is None or acc < float(req):
            return True
    return False


def compute_distribution_report(
    events: List[DtEvalEvent],
    production_thresholds: Dict[str, Any],
) -> Dict[str, Any]:
    """Build distribution report used by downstream visualization script.

    The report intentionally stays lightweight and JSON-serializable.
    """

    top1_values = [e.top1 for e in events]
    mae_values = [e.cont_mae for e in events if e.cont_mae is not None]

    per_circle_values: Dict[str, List[float]] = {}
    for ev in events:
        for circle, acc in ev.per_circle_top1.items():
            per_circle_values.setdefault(circle, []).append(acc)

    per_circle_summary: Dict[str, Any] = {}
    for circle, vals in per_circle_values.items():
        stats = summarize_metric(vals)
        per_circle_summary[circle] = {
            "count": len(vals),
            "stats": {k: _clean_float_for_json(v) for k, v in stats.items()},
            "values": vals,
        }

    # Outliers: evaluations that would fail suggested production thresholds.
    outliers = []
    if production_thresholds:
        # Normalize per-circle thresholds into the newer nested form if needed.
        per_circle_thr = production_thresholds.get("per_circle_min_top1") or {}
        if not per_circle_thr:
            for key, value in production_thresholds.items():
                if key.startswith("per_circle_min_top1_"):
                    circle = key[len("per_circle_min_top1_"):]
                    per_circle_thr[circle] = value
        thresholds_norm = dict(production_thresholds)
        thresholds_norm["per_circle_min_top1"] = per_circle_thr

        for ev in events:
            if _event_fails_threshold(ev, thresholds_norm):
                for circle, req in per_circle_thr.items():
                    acc = ev.per_circle_top1.get(circle)
                    if acc is None or acc >= float(req):
                        continue
                    eval_id = f"{ev.checkpoint or '<unknown>'}/{ev.ts_str}"
                    outliers.append(
                        {
                            "eval_id": eval_id,
                            "circle": circle,
                            "top1_accuracy": acc,
                            "cont_mae": ev.cont_mae,
                        }
                    )

    meta = {
        "total_evaluations": len(events),
        "date_range": {
            "start": events[0].ts_str if events else None,
            "end": events[-1].ts_str if events else None,
        },
    }

    return {
        "meta": meta,
        "top1_accuracy_histogram": _build_histogram(top1_values),
        "cont_mae_histogram": _build_histogram(mae_values),
        "per_circle_accuracy": per_circle_summary,
        "suggested_production_thresholds": production_thresholds,
        "outliers": outliers,
    }


def write_csv(events: List[DtEvalEvent], path: Path) -> None:
    """Write per-evaluation metrics to CSV for spreadsheet analysis."""
    if not events:
        return
    import csv

    circles = sorted({c for ev in events for c in ev.per_circle_top1.keys()})
    fieldnames = [
        "timestamp",
        "checkpoint",
        "run_name",
        "top1_accuracy",
        "top3_accuracy",
        "cont_mae",
        "cont_mse",
        "total_positions",
        "calibration_error",
        "latency_p50",
        "latency_p95",
        "latency_p99",
    ] + [f"per_circle_top1[{c}]" for c in circles]

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for ev in events:
            row = {
                "timestamp": ev.ts_str,
                "checkpoint": ev.checkpoint,
                "run_name": ev.run_name or "",
                "top1_accuracy": ev.top1,
                "top3_accuracy": ev.top3,
                "cont_mae": ev.cont_mae if ev.cont_mae is not None else "",
                "cont_mse": ev.cont_mse if ev.cont_mse is not None else "",
                "total_positions": ev.total_positions,
                "calibration_error": ev.calibration_error if ev.calibration_error is not None else "",
                "latency_p50": ev.latency_p50 if ev.latency_p50 is not None else "",
                "latency_p95": ev.latency_p95 if ev.latency_p95 is not None else "",
                "latency_p99": ev.latency_p99 if ev.latency_p99 is not None else "",
            }
            for c in circles:
                row[f"per_circle_top1[{c}]"] = ev.per_circle_top1.get(c, "")
            writer.writerow(row)


def build_html(
    events: List[DtEvalEvent],
    top1_stats: Dict[str, float],
    top3_stats: Dict[str, float],
    cont_mae_stats: Dict[str, float],
    extra_metric_stats: Dict[str, Dict[str, float]],
    per_circle_medians: Dict[str, float],
    thresholds: Dict[str, Dict[str, Any]],
    recommendations: Dict[str, Any],
    config_impact: Dict[str, Any],
    checkpoint_summary: Dict[str, Any],
    reward_preset_analysis: Optional[Dict[str, Any]] = None,
) -> str:
    ts = [e.ts_str for e in events]
    top1 = [e.top1 for e in events]
    top3 = [e.top3 for e in events]
    cont_mae = [e.cont_mae for e in events]
    circles = sorted({c for e in events for c in e.per_circle_top1.keys()})
    circle_series = {
        c: {
            "x": [e.ts_str for e in events],
            "y": [e.per_circle_top1.get(c, 0.0) for e in events],
        }
        for c in circles
    }
    calibration_error = [e.calibration_error for e in events]
    latency_p50 = [e.latency_p50 for e in events]
    latency_p95 = [e.latency_p95 for e in events]
    latency_p99 = [e.latency_p99 for e in events]
    checkpoints = [e.checkpoint for e in events]
    checkpoint_names = [e.checkpoint_name for e in events]
    run_names = [e.run_name or "" for e in events]

    data = {
        "timestamps": ts,
        "top1": top1,
        "top3": top3,
        "cont_mae": cont_mae,
        "calibration_error": calibration_error,
        "latency_p50": latency_p50,
        "latency_p95": latency_p95,
        "latency_p99": latency_p99,
        "per_circle": circle_series,
        "top1_stats": top1_stats,
        "top3_stats": top3_stats,
        "cont_mae_stats": cont_mae_stats,
        "extra_metric_stats": extra_metric_stats,
        "per_circle_medians": per_circle_medians,
        "thresholds": thresholds,
        "recommendations": recommendations,
        "config_impact": config_impact,
        "checkpoint_summary": checkpoint_summary,
        "checkpoints": checkpoints,
        "checkpoint_names": checkpoint_names,
        "run_names": run_names,
        "reward_preset_analysis": reward_preset_analysis,
    }
    json_data = json.dumps(data)
    html = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>DT Evaluation Dashboard</title>
  <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
</head>
<body>
  <h1>Decision Transformer Evaluation Dashboard</h1>
  <div id="summary">
    <h2>Summary</h2>
    <div id="summary-table"></div>
    <div id="config-impact-table"></div>
    <div id="checkpoint-comparison"></div>
  </div>
  <div id="threshold-controls">
    <h3>Threshold toggles</h3>
    <div id="threshold-toggles"></div>
  </div>
  <div id="global-metrics" style="width:100%;height:400px;"></div>
  <div id="per-circle" style="width:100%;height:400px;"></div>
  <div id="calibration-performance">
    <h2>Calibration &amp; Performance Metrics</h2>
    <div id="calibration-ece" style="width:100%;height:300px;"></div>
    <div id="latency-metrics" style="width:100%;height:350px;"></div>
  </div>
  <div id="reward-presets">
    <h2>Reward preset analysis</h2>
    <div id="reward-presets-summary"></div>
    <div id="reward-presets-plot" style="width:100%;height:400px;"></div>
  </div>
  <script>
    const data = __DATA__;
    const ts = data.timestamps;
    const t1 = data.top1;
    const t3 = data.top3;
    const mae = data.cont_mae;
    const calibrationSeries = data.calibration_error || [];
    const latencyP50 = data.latency_p50 || [];
    const latencyP95 = data.latency_p95 || [];
    const latencyP99 = data.latency_p99 || [];
    const staging = data.thresholds.staging || {};
    const prod = data.thresholds.production || {};
    const ckpts = data.checkpoints || [];
    const ckptNames = data.checkpoint_names || [];
    const runNames = data.run_names || [];
    const extraMetricStats = data.extra_metric_stats || {};

    const custom = ts.map((_, idx) => [
      ckptNames[idx] || "",
      runNames[idx] || "",
      ckpts[idx] || "",
    ]);

    function makeTrace(x, y, name, yaxis) {
      return {
        x,
        y,
        mode: 'lines+markers',
        name,
        yaxis: yaxis || 'y',
        customdata: custom,
        hovertemplate:
          'ts=%{x}<br>' + name + '=%{y:.3f}<br>' +
          'checkpoint=%{customdata[0]}<br>' +
          'run=%{customdata[1]}' +
          '<extra></extra>',
      };
    }

    const traces = [];
    const thresholdToggleEntries = [];
    traces.push(makeTrace(ts, t1, 'top1_accuracy', 'y1'));
    traces.push(makeTrace(ts, t3, 'top3_accuracy', 'y1'));
    if (mae.some(v => v !== null)) {
      traces.push(makeTrace(ts, mae, 'cont_mae', 'y2'));
    }

    function addThresholdTrace(label, value, color, yaxis) {
      if (value == null || Number.isNaN(value)) {
        return;
      }
      const trace = {
        x: ts,
        y: ts.map(() => value),
        mode: 'lines',
        name: label,
        line: {dash: 'dash', color},
        yaxis,
      };
      const index = traces.push(trace) - 1;
      thresholdToggleEntries.push({label, index});
    }

    addThresholdTrace('staging min_top1', staging.min_top1_accuracy, 'orange', 'y1');
    addThresholdTrace('production min_top1', prod.min_top1_accuracy, 'red', 'y1');
    addThresholdTrace('staging max_cont_mae', staging.max_cont_mae, 'orange', 'y2');
    addThresholdTrace('production max_cont_mae', prod.max_cont_mae, 'red', 'y2');

    Plotly.newPlot('global-metrics', traces, {
      title: 'Global DT Metrics Over Time',
      xaxis: {title: 'timestamp'},
      yaxis: {title: 'accuracy'},
      yaxis2: {title: 'cont_mae', overlaying: 'y', side: 'right'},
      legend: {orientation: 'h'},
    });

    const circleTraces = [];
    for (const [circle, series] of Object.entries(data.per_circle)) {
      circleTraces.push(makeTrace(series.x, series.y, circle, 'y'));
    }
    Plotly.newPlot('per-circle', circleTraces, {
      title: 'Per-circle top1_accuracy Over Time',
      xaxis: {title: 'timestamp'},
      yaxis: {title: 'top1_accuracy'},
      legend: {orientation: 'h'},
    });

    function renderSummary() {
      const top1Stats = data.top1_stats || {};
      const top3Stats = data.top3_stats || {};
      const maeStats = data.cont_mae_stats || {};
      const extraStats = data.extra_metric_stats || {};

      function statsRow(name, stats) {
        if (!stats || Object.keys(stats).length === 0) return '';
        const vals = [
          stats.min, stats.p25, stats.median, stats.p75, stats.p90, stats.max,
        ].map(v => (v == null ? '' : v.toFixed(3)));
        return '<tr><td>' + name + '</td>' +
               '<td>' + vals[0] + '</td><td>' + vals[1] + '</td>' +
               '<td>' + vals[2] + '</td><td>' + vals[3] + '</td>' +
               '<td>' + vals[4] + '</td><td>' + vals[5] + '</td></tr>';
      }

      let html = '<table border="1" cellpadding="4" cellspacing="0">' +
        '<thead><tr><th>Metric</th><th>min</th><th>p25</th><th>median</th>' +
        '<th>p75</th><th>p90</th><th>max</th></tr></thead><tbody>';
      html += statsRow('top1_accuracy', top1Stats);
      html += statsRow('top3_accuracy', top3Stats);
      html += statsRow('cont_mae', maeStats);
      for (const [metric, stats] of Object.entries(extraStats)) {
        const label = metric.replace(/_/g, ' ');
        html += statsRow(label, stats);
      }
      html += '</tbody></table>';
      document.getElementById('summary-table').innerHTML = html;

      const impact = data.config_impact || {};
      let impactHtml = '<h3>Threshold impact (pass rates)</h3>';
      const cfgNames = Object.keys(impact);
      if (cfgNames.length === 0) {
        impactHtml += '<p>No threshold configurations available.</p>';
      } else {
        impactHtml += '<table border="1" cellpadding="4" cellspacing="0">' +
          '<thead><tr><th>Config</th><th>Pass%</th><th>Pass</th>' +
          '<th>Fail</th><th>Top failure reasons</th></tr></thead><tbody>';
        for (const cfg of cfgNames) {
          const c = impact[cfg];
          const reasons = Object.entries(c.failure_reasons || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => name + ' (' + count + ')')
            .join(', ') || '-';
          const ratePct = (c.pass_rate * 100).toFixed(1);
          impactHtml += '<tr><td>' + cfg + '</td><td>' + ratePct + '</td>' +
            '<td>' + c.pass_count + '</td><td>' + c.fail_count + '</td>' +
            '<td>' + reasons + '</td></tr>';
        }
        impactHtml += '</tbody></table>';
      }
      document.getElementById('config-impact-table').innerHTML = impactHtml;

      const ckSummary = data.checkpoint_summary || {};
      let ckHtml = '<h3>Checkpoint comparison</h3>';
      const ckNames = Object.keys(ckSummary);
      if (ckNames.length === 0) {
        ckHtml += '<p>No checkpoints found.</p>';
      } else {
        ckHtml += '<table border="1" cellpadding="4" cellspacing="0">' +
          '<thead><tr><th>Checkpoint</th><th>Evaluations</th>' +
          '<th>median top1</th><th>median cont_mae</th></tr></thead><tbody>';
        for (const name of ckNames) {
          const s = ckSummary[name];
          const medTop1 = s.median_top1 != null ? s.median_top1.toFixed(3) : '';
          const medMae = s.median_cont_mae != null ? s.median_cont_mae.toFixed(3) : '-';
          ckHtml += '<tr><td>' + name + '</td><td>' + s.count + '</td>' +
            '<td>' + medTop1 + '</td><td>' + medMae + '</td></tr>';
        }
        ckHtml += '</tbody></table>';
      }
      document.getElementById('checkpoint-comparison').innerHTML = ckHtml;
    }


    function renderRewardPresets() {
      const container = document.getElementById('reward-presets-summary');
      if (!container) return;

      const rpa = data.reward_preset_analysis || null;
      if (!rpa || !Array.isArray(rpa.presets) || rpa.presets.length === 0) {
        container.innerHTML = '<p>No reward preset analysis available. Provide a trajectories file when generating the dashboard.</p>';
        const plotDiv = document.getElementById('reward-presets-plot');
        if (plotDiv) {
          plotDiv.innerHTML = '';
        }
        return;
      }

      const presets = rpa.presets;
      let html = '<table border="1" cellpadding="4" cellspacing="0">' +
        '<thead><tr><th>Preset</th><th>mean reward</th><th>median reward</th>' +
        '<th>success</th><th>failure</th><th>other</th></tr></thead><tbody>';
      for (const p of presets) {
        const rs = p.reward_stats || {};
        const sc = p.status_counts || {};
        const mean = rs.mean != null ? rs.mean.toFixed(3) : '';
        const median = rs.median != null ? rs.median.toFixed(3) : '';
        html += '<tr><td>' + p.name + '</td>' +
          '<td>' + mean + '</td><td>' + median + '</td>' +
          '<td>' + (sc.success || 0) + '</td>' +
          '<td>' + (sc.failure || 0) + '</td>' +
          '<td>' + (sc.other || 0) + '</td></tr>';
      }
      html += '</tbody></table>';
      container.innerHTML = html;

      const traces = [];
      for (const p of presets) {
        const curve = p.threshold_curves || [];
        if (!curve.length) continue;
        const xs = curve.map(c => c.threshold);
        const ys = curve.map(c => c.success_rate);
        traces.push({
          x: xs,
          y: ys,
          mode: 'lines',
          name: p.name,
        });
      }
      const plotDiv = document.getElementById('reward-presets-plot');
      if (plotDiv && traces.length > 0) {
        Plotly.newPlot('reward-presets-plot', traces, {
          title: 'Reward threshold vs success rate',
          xaxis: {title: 'reward threshold'},
          yaxis: {title: 'fraction of steps with reward ≥ threshold', range: [0, 1]},
          legend: {orientation: 'h'},
        });
      } else if (plotDiv) {
        plotDiv.innerHTML = '';
      }
    }

    function renderThresholdToggles() {
      const container = document.getElementById('threshold-toggles');
      if (!container) return;
      if (thresholdToggleEntries.length === 0) {
        container.innerHTML = '<p>No threshold lines available.</p>';
        return;
      }
      const fragment = document.createDocumentFragment();
      thresholdToggleEntries.forEach((entry, idx) => {
        const wrapper = document.createElement('div');
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `threshold-toggle-${idx}`;
        checkbox.checked = true;
        checkbox.addEventListener('change', (event) => {
          const visible = event.target.checked ? true : 'legendonly';
          Plotly.restyle('global-metrics', {visible}, [entry.index]);
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + entry.label));
        wrapper.appendChild(label);
        fragment.appendChild(wrapper);
      });
      container.innerHTML = '';
      container.appendChild(fragment);
    }

    function renderCalibrationMetrics() {
      const calibDiv = document.getElementById('calibration-ece');
      if (!calibDiv) return;
      if (!Array.isArray(calibrationSeries) || calibrationSeries.length === 0 || !calibrationSeries.some(v => v != null)) {
        calibDiv.innerHTML = '<p>No calibration metrics available.</p>';
        return;
      }
      const calibTrace = {
        x: ts,
        y: calibrationSeries,
        mode: 'lines+markers',
        name: 'calibration_error',
        line: {color: '#6c5ce7'},
        customdata: custom,
        hovertemplate:
          'ts=%{x}<br>calibration_error=%{y:.3f}<br>' +
          'checkpoint=%{customdata[0]}<br>' +
          'run=%{customdata[1]}' +
          '<extra></extra>',
      };
      const traces = [calibTrace];
      const stats = (extraMetricStats && extraMetricStats['calibration_error']) || null;
      function addBand(label, value, color, dash) {
        if (value == null || Number.isNaN(value)) return;
        traces.push({
          x: ts,
          y: ts.map(() => value),
          mode: 'lines',
          name: label,
          line: {color, dash},
          hoverinfo: 'skip',
        });
      }
      if (stats) {
        addBand('median', stats.median, '#636e72', 'dash');
        addBand('p25', stats.p25, '#b2bec3', 'dot');
        addBand('p75', stats.p75, '#b2bec3', 'dot');
      }
      Plotly.newPlot('calibration-ece', traces, {
        title: 'Calibration error over time',
        xaxis: {title: 'timestamp'},
        yaxis: {title: 'Expected Calibration Error (ECE)', range: [0, 1]},
        legend: {orientation: 'h'},
      });
    }

    function renderLatencyMetrics() {
      const latDiv = document.getElementById('latency-metrics');
      if (!latDiv) return;
      const latencySeries = [
        {name: 'latency_p50', values: latencyP50, color: '#4c78a8', dash: 'solid'},
        {name: 'latency_p95', values: latencyP95, color: '#f58518', dash: 'dash'},
        {name: 'latency_p99', values: latencyP99, color: '#e45756', dash: 'dot'},
      ];
      const latencyTraces = [];
      latencySeries.forEach(series => {
        if (!Array.isArray(series.values)) return;
        const hasData = series.values.some(v => v != null);
        if (!hasData) return;
        latencyTraces.push({
          x: ts,
          y: series.values,
          mode: 'lines+markers',
          name: series.name,
          line: {color: series.color, dash: series.dash},
          customdata: custom,
          hovertemplate:
            'ts=%{x}<br>' + series.name + '=%{y:.3f}<br>' +
            'checkpoint=%{customdata[0]}<br>' +
            'run=%{customdata[1]}' +
            '<extra></extra>',
        });
      });
      if (latencyTraces.length === 0) {
        latDiv.innerHTML = '<p>No latency metrics available.</p>';
        return;
      }
      Plotly.newPlot('latency-metrics', latencyTraces, {
        title: 'Latency percentiles over time',
        xaxis: {title: 'timestamp'},
        yaxis: {title: 'Inference Latency (seconds)'},
        legend: {orientation: 'h'},
      });
    }

    renderSummary();
    renderRewardPresets();
    renderThresholdToggles();
    renderCalibrationMetrics();
    renderLatencyMetrics();
  </script>
</body>
</html>
"""
    return html.replace("__DATA__", json_data)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="DT evaluation dashboard")
    parser.add_argument("--metrics-log", type=Path, default=METRICS_LOG)
    parser.add_argument("--output-html", type=Path, default=DEFAULT_HTML)
    parser.add_argument("--export-json", type=Path, default=DEFAULT_EXPORT_JSON)
    parser.add_argument(
        "--distribution-json",
        type=Path,
        default=DEFAULT_DISTRIBUTION_JSON,
        help="Output path for distribution analysis JSON report.",
    )
    parser.add_argument("--output-csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument(
        "--trajectories",
        type=Path,
        default=DEFAULT_TRAJECTORIES,
        help="Optional trajectories file for reward preset analysis.",
    )
    parser.add_argument("--since", type=str, default=None)
    parser.add_argument("--until", type=str, default=None)
    parser.add_argument("--checkpoint-pattern", type=str, default=None)
    parser.add_argument("--compare", nargs="*", default=None)
    parser.add_argument(
        "--format",
        choices=["html", "json", "csv", "table"],
        action="append",
        default=None,
        help="Output format(s) to generate (default: html).",
    )
    parser.add_argument(
        "--dry-run-config",
        type=Path,
        default=None,
        help="Hypothetical threshold YAML to preview impact against history.",
    )
    parser.add_argument(
        "--analyze-distributions",
        action="store_true",
        help="Compute distribution report into --distribution-json.",
    )
    parser.add_argument("--open", action="store_true", help="Open HTML in browser")
    args = parser.parse_args(argv)

    raw_formats = args.format or ["html"]
    formats = list(dict.fromkeys(raw_formats))
    since = parse_time(args.since)
    until = parse_time(args.until)

    events = read_dt_events(
        args.metrics_log,
        since=since,
        until=until,
        checkpoint_pattern=args.checkpoint_pattern,
        compare=args.compare,
    )
    if not events:
        print("=== DT Evaluation Dashboard Summary ===\n")
        print(
            f"No dt_evaluation events found in {args.metrics_log} "
            "(after applying filters). Run af evaluate-dt or af validate-dt-model first."
        )
        return 0

    top1_stats = summarize_metric(e.top1 for e in events)
    top3_stats = summarize_metric(e.top3 for e in events)
    cont_mae_stats = summarize_metric(
        e.cont_mae for e in events if e.cont_mae is not None
    )
    calibration_error_stats = summarize_metric(
        e.calibration_error for e in events if e.calibration_error is not None
    )
    latency_p50_stats = summarize_metric(
        e.latency_p50 for e in events if e.latency_p50 is not None
    )
    latency_p95_stats = summarize_metric(
        e.latency_p95 for e in events if e.latency_p95 is not None
    )
    latency_p99_stats = summarize_metric(
        e.latency_p99 for e in events if e.latency_p99 is not None
    )

    extra_metric_stats: Dict[str, Dict[str, float]] = {}
    if calibration_error_stats:
        extra_metric_stats["calibration_error"] = calibration_error_stats
    if latency_p50_stats:
        extra_metric_stats["latency_p50"] = latency_p50_stats
    if latency_p95_stats:
        extra_metric_stats["latency_p95"] = latency_p95_stats
    if latency_p99_stats:
        extra_metric_stats["latency_p99"] = latency_p99_stats

    per_circle_values: Dict[str, List[float]] = {}
    for ev in events:
        for circle, acc in ev.per_circle_top1.items():
            per_circle_values.setdefault(circle, []).append(acc)
    per_circle_medians = {
        c: median(vals) for c, vals in per_circle_values.items() if vals
    }
    per_circle_stats = {
        c: summarize_metric(vals) for c, vals in per_circle_values.items() if vals
    }

    # Load current staging/production thresholds using shared parser.
    staging_cfg = GOALIE_DIR / "dt_validation_thresholds_staging.yaml"
    prod_cfg = GOALIE_DIR / "dt_validation_thresholds_production.yaml"
    base_cfg = GOALIE_DIR / "dt_validation_thresholds.yaml"
    thresholds: Dict[str, Dict[str, Any]] = {}
    thresholds["staging"] = load_model_thresholds(
        staging_cfg if staging_cfg.is_file() else (base_cfg if base_cfg.is_file() else None)
    )
    thresholds["production"] = load_model_thresholds(
        prod_cfg if prod_cfg.is_file() else (base_cfg if base_cfg.is_file() else None)
    )

    recommendations = compute_threshold_recommendations(
        top1_stats, cont_mae_stats, per_circle_medians
    )

    # Pass/fail rates under current thresholds (simple view).
    staging_rate = pass_rate(events, thresholds.get("staging", {}))
    prod_rate = pass_rate(events, thresholds.get("production", {}))

    # Threshold impact preview using full check_model_quality where available.
    config_impacts: Dict[str, ConfigImpact] = {}
    if thresholds.get("staging"):
        config_impacts["staging"] = evaluate_config_impact(
            events, thresholds["staging"], "staging"
        )
    if thresholds.get("production"):
        config_impacts["production"] = evaluate_config_impact(
            events, thresholds["production"], "production"
        )
    dry_run_thresholds: Dict[str, Any] = {}
    if args.dry_run_config is not None:
        dry_run_thresholds = load_model_thresholds(args.dry_run_config)
        if dry_run_thresholds:
            name = args.dry_run_config.name
            config_impacts[name] = evaluate_config_impact(
                events, dry_run_thresholds, name
            )

    checkpoint_summary = compute_checkpoint_summary(events)

    reward_preset_analysis: Optional[Dict[str, Any]] = None
    if args.trajectories is not None:
        reward_preset_analysis = compute_reward_preset_analysis(args.trajectories)

    # Write requested outputs
    if "html" in formats:
        args.output_html.parent.mkdir(parents=True, exist_ok=True)
        html = build_html(
            events,
            top1_stats,
            top3_stats,
            cont_mae_stats,
            extra_metric_stats,
            per_circle_medians,
            thresholds,
            recommendations,
            {k: v.__dict__ for k, v in config_impacts.items()},
            checkpoint_summary,
            reward_preset_analysis,
        )
        args.output_html.write_text(html, encoding="utf-8")

    if "csv" in formats:
        write_csv(events, args.output_csv)

    if "json" in formats or "html" in formats:
        export = {
            "total_evaluations": len(events),
            "date_range": {
                "start": events[0].ts_str,
                "end": events[-1].ts_str,
            },
            "unique_checkpoints": sorted(
                {e.checkpoint for e in events if e.checkpoint}
            ),
            "top1_accuracy": top1_stats,
            "top3_accuracy": top3_stats,
            "cont_mae": cont_mae_stats,
            "calibration_error": calibration_error_stats,
            "latency_p50": latency_p50_stats,
            "latency_p95": latency_p95_stats,
            "latency_p99": latency_p99_stats,
            "per_circle_median_top1": per_circle_medians,
            "per_circle_stats": per_circle_stats,
            "thresholds": thresholds,
            "recommendations": recommendations,
            "pass_rate": {
                "staging": staging_rate,
                "production": prod_rate,
            },
            "config_impact": {
                name: impact.__dict__ for name, impact in config_impacts.items()
            },
            "checkpoint_summary": checkpoint_summary,
            "reward_preset_analysis": reward_preset_analysis,
            "dry_run_config": (
                str(args.dry_run_config) if args.dry_run_config is not None else None
            ),
        }
        args.export_json.parent.mkdir(parents=True, exist_ok=True)
        args.export_json.write_text(
            json.dumps(export, indent=2), encoding="utf-8"
        )

    if args.analyze_distributions:
        # Use suggested production thresholds when available; otherwise fall back
        # to current production thresholds. This ties the analysis directly to
        # the thresholds we intend to use for governance.
        production_thresholds = (
            recommendations.get("production")
            or thresholds.get("production")
            or {}
        )
        distribution_report = compute_distribution_report(events, production_thresholds)
        args.distribution_json.parent.mkdir(parents=True, exist_ok=True)
        args.distribution_json.write_text(
            json.dumps(distribution_report, indent=2), encoding="utf-8"
        )


    # Human-readable summary
    start_date = events[0].timestamp.date().isoformat()
    end_date = events[-1].timestamp.date().isoformat()
    checkpoints = {e.checkpoint for e in events if e.checkpoint}

    def fmt_stats(name: str, stats: Dict[str, float]) -> str:
        if not stats:
            return f"  {name}:       (no data)"
        return (
            f"  {name}:  min={stats['min']:.3f}, p25={stats['p25']:.3f}, "
            f"median={stats['median']:.3f}, p75={stats['p75']:.3f}, max={stats['max']:.3f}"
        )

    print("=== DT Evaluation Dashboard Summary ===\n")
    print(f"Total Evaluations: {len(events)}")
    print(f"Date Range: {start_date} to {end_date}")
    print(f"Unique Checkpoints: {len(checkpoints)}\n")

    print("Global Metrics (across all evaluations):")
    print(fmt_stats("top1_accuracy", top1_stats))
    print(fmt_stats("top3_accuracy", top3_stats))
    print(fmt_stats("cont_mae", cont_mae_stats))
    print("\nPer-Circle top1_accuracy (median):")
    for circle, med_val in sorted(per_circle_medians.items()):
        print(f"  {circle}: {med_val:.3f}")

    print("\nThreshold Calibration Recommendations:")
    stag = recommendations.get("staging", {})
    prod = recommendations.get("production", {})
    print("  Staging:")
    if stag:
        for k, v in stag.items():
            print(f"    - {k}: {v:.3f}")
    else:
        print("    (no recommendations)"
        )
    print("  \n  Production:")
    if prod:
        for k, v in prod.items():
            print(f"    - {k}: {v:.3f}")
    else:
        print("    (no recommendations)")

    print(f"\nCurrent pass rates under thresholds:")
    print(f"  Staging config:    {staging_rate:.1%}")
    print(f"  Production config: {prod_rate:.1%}")

    if "table" in formats:
        print_metric_summary_tables(
            top1_stats,
            top3_stats,
            cont_mae_stats,
            per_circle_medians,
            extra_metric_stats,
        )
        print()
        print_config_impact_table(config_impacts)
    elif args.dry_run_config is not None:
        print_config_impact_table(config_impacts)

    if "html" in formats:
        print(f"\nDashboard saved to: {args.output_html}")
    if "json" in formats or "html" in formats:
        print(f"Summary JSON saved to: {args.export_json}")
    if "csv" in formats:
        print(f"CSV metrics saved to: {args.output_csv}")

    if args.open:
        try:
            import webbrowser

            webbrowser.open(args.output_html.resolve().as_uri())
        except Exception:
            pass

    return 0


if __name__ == "__main__":  # pragma: no cover - manual invocation
    raise SystemExit(main())
