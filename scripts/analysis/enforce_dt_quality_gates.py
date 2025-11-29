#!/usr/bin/env python3
"""Enforce DT evaluation quality gates from dt_evaluation_summary.json.

This script is designed for CI/CD use. It reads the JSON summary emitted by
`dt_evaluation_dashboard.py` and applies a set of governance gates.

Exit codes:
- 0: all gates passed (or only skipped)
- 1: at least one gate failed (unless --dry-run is set)
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SUMMARY = PROJECT_ROOT / ".goalie" / "dt_evaluation_summary.json"


@dataclass
class GateResult:
    name: str
    status: str  # "pass", "fail", or "skip"
    message: str
    remediation: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


def _pct(val: float) -> str:
    return f"{val * 100.0:.1f}%"


def _load_json(path: Path) -> Dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):  # pragma: no cover - defensive
        raise ValueError(f"Expected JSON object in {path}, got {type(data)}")
    return data


def _safe_get(d: Dict[str, Any], *keys: str, default: Any = None) -> Any:
    cur: Any = d
    for k in keys:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur


def evaluate_minimum_evaluations(summary: Dict[str, Any], min_evals: int) -> GateResult:
    total = int(summary.get("total_evaluations", 0))
    if total >= min_evals:
        return GateResult(
            name="minimum_evaluations",
            status="pass",
            message=f"{total} >= {min_evals}",
        )
    return GateResult(
        name="minimum_evaluations",
        status="fail",
        message=f"{total} < {min_evals}",
        remediation="Increase evaluation coverage before deploying (run additional DT evaluations).",
        extra={"actual": total, "threshold": min_evals},
    )


def evaluate_pass_rate(summary: Dict[str, Any], env: str, min_rate: float) -> GateResult:
    pass_rates = summary.get("pass_rate") or {}
    actual = float(pass_rates.get(env, 0.0) or 0.0)
    if actual >= min_rate:
        return GateResult(
            name=f"{env}_pass_rate",
            status="pass",
            message=f"{_pct(actual)} >= {_pct(min_rate)}",
            extra={"actual": actual, "threshold": min_rate},
        )
    return GateResult(
        name=f"{env}_pass_rate",
        status="fail",
        message=f"{_pct(actual)} < {_pct(min_rate)}",
        remediation=(
            "Review recent DT evaluations and adjust thresholds or retrain the model "
            f"for {env} environment."
        ),
        extra={"actual": actual, "threshold": min_rate},
    )


def _extract_reward_means(summary: Dict[str, Any]) -> Dict[str, float]:
    rpa = summary.get("reward_preset_analysis") or {}
    presets = rpa.get("presets") or []
    out: Dict[str, float] = {}
    for p in presets:
        name = p.get("name")
        stats = p.get("reward_stats") or {}
        mean = stats.get("mean")
        if name and isinstance(mean, (int, float)):
            out[str(name)] = float(mean)
    return out


def evaluate_reward_regressions(
    summary: Dict[str, Any],
    baseline: Optional[Dict[str, Any]],
    max_regression_pct: float,
) -> GateResult:
    if not baseline:
        return GateResult(
            name="reward_preset_regression",
            status="skip",
            message="No baseline provided; skipping reward regression check.",
        )

    current_means = _extract_reward_means(summary)
    base_means = _extract_reward_means(baseline)

    regressions: List[Dict[str, Any]] = []
    for preset, base_mean in base_means.items():
        curr_mean = current_means.get(preset)
        if curr_mean is None:
            continue
        if base_mean <= 0.0:
            continue
        change_pct = (curr_mean - base_mean) / base_mean * 100.0
        if change_pct < -max_regression_pct:
            regressions.append(
                {
                    "preset": preset,
                    "baseline_mean": base_mean,
                    "current_mean": curr_mean,
                    "change_pct": change_pct,
                    "threshold_pct": max_regression_pct,
                }
            )

    if not regressions:
        return GateResult(
            name="reward_preset_regression",
            status="pass",
            message="No reward presets regressed beyond threshold.",
        )

    msg = f"{len(regressions)} presets regressed beyond threshold"
    return GateResult(
        name="reward_preset_regression",
        status="fail",
        message=msg,
        remediation=(
            "Investigate trajectory quality, reward function changes, or data shifts "
            "affecting reward behavior."
        ),
        extra={"regressions": regressions},
    )


def _extract_metric_median(summary: Dict[str, Any], metric_key: str) -> Optional[float]:
    stats = summary.get(metric_key) or {}
    med = stats.get("median")
    if isinstance(med, (int, float)):
        return float(med)
    return None


def evaluate_metric_regressions(
    summary: Dict[str, Any],
    baseline: Optional[Dict[str, Any]],
    max_regression_pct: float,
) -> GateResult:
    """Detect regressions in global median metrics.

    This currently checks `top1_accuracy`, `cont_mae`, `top3_accuracy`,
    `calibration_error`, `latency_p50`, `latency_p95`, and `latency_p99`.
    For "higher is better" metrics (accuracies), large negative changes are
    treated as regressions. For "lower is better" metrics (errors and
    latencies), large positive changes are treated as regressions.
    """
    if not baseline:
        return GateResult(
            name="metric_regression",
            status="skip",
            message="No baseline provided; skipping metric regression check.",
        )

    # (metric_key, higher_is_better)
    metric_specs = [
        ("top1_accuracy", True),
        ("cont_mae", False),
        ("top3_accuracy", True),
        ("calibration_error", False),
        ("latency_p50", False),
        ("latency_p95", False),
        ("latency_p99", False),
    ]

    metrics_payload: List[Dict[str, Any]] = []
    regressed_names: List[str] = []

    for metric_key, higher_is_better in metric_specs:
        base_med = _extract_metric_median(baseline, metric_key)
        curr_med = _extract_metric_median(summary, metric_key)
        if base_med is None or curr_med is None or base_med <= 0.0:
            continue

        change_pct = (curr_med - base_med) / base_med * 100.0
        regressed = False
        if higher_is_better:
            if change_pct < -max_regression_pct:
                regressed = True
        else:
            if change_pct > max_regression_pct:
                regressed = True

        metrics_payload.append(
            {
                "name": metric_key,
                "baseline_median": base_med,
                "current_median": curr_med,
                "change_pct": change_pct,
                "threshold_pct": max_regression_pct,
                "higher_is_better": higher_is_better,
                "regressed": regressed,
            }
        )
        if regressed:
            regressed_names.append(metric_key)

    if not metrics_payload:
        return GateResult(
            name="metric_regression",
            status="skip",
            message="Insufficient metric data to compute regressions.",
        )

    if regressed_names:
        msg = f"{len(regressed_names)} metrics regressed: {', '.join(regressed_names)}"
        return GateResult(
            name="metric_regression",
            status="fail",
            message=msg,
            remediation=(
                "Investigate model performance regressions and consider retraining, "
                "data fixes, or threshold adjustments for the affected metrics."
            ),
            extra={"metrics": metrics_payload},
        )

    return GateResult(
        name="metric_regression",
        status="pass",
        message="No significant metric regressions detected.",
        extra={"metrics": metrics_payload},
    )


def build_json_payload(
    summary: Dict[str, Any],
    baseline: Optional[Dict[str, Any]],
    gates: List[GateResult],
    summary_path: Path,
    baseline_path: Optional[Path],
) -> Dict[str, Any]:
    ts = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    failed = [g for g in gates if g.status == "fail"]
    passed = [g for g in gates if g.status == "pass"]

    gates_payload = []
    for g in gates:
        entry: Dict[str, Any] = {
            "name": g.name,
            "status": g.status,
            "message": g.message,
        }
        if g.remediation:
            entry["remediation"] = g.remediation
        if g.extra is not None:
            entry.update(g.extra)
        gates_payload.append(entry)

    return {
        "timestamp": ts,
        "summary_file": str(summary_path),
        "baseline_file": str(baseline_path) if baseline_path else None,
        "total_evaluations": int(summary.get("total_evaluations", 0)),
        "date_range": summary.get("date_range", {}),
        "gates": gates_payload,
        "overall_status": "fail" if failed else "pass",
        "failed_gate_count": len(failed),
        "passed_gate_count": len(passed),
    }


def print_human_summary(
    summary_path: Path,
    baseline_path: Optional[Path],
    summary: Dict[str, Any],
    gates: List[GateResult],
) -> None:
    total = int(summary.get("total_evaluations", 0))
    date_range = summary.get("date_range", {}) or {}
    start = date_range.get("start", "?")
    end = date_range.get("end", "?")

    print("=== DT Quality Gate Enforcement ===\n")
    print(f"Reading summary from: {summary_path}")
    if baseline_path is not None:
        print(f"Reading baseline from: {baseline_path}")
    print(f"Total evaluations: {total}")
    print(f"Date range: {start} to {end}\n")

    print("Quality Gate Results:")
    failed = 0
    for g in gates:
        icon = "✓" if g.status == "pass" else ("✗" if g.status == "fail" else "-")
        line = f"{icon} {g.status.upper():4}: {g.name.replace('_', ' ')} ({g.message})"
        print(line)
        if g.status == "fail":
            failed += 1
            if g.remediation:
                print(f"  → Action: {g.remediation}")
    print("")

    if failed:
        print(f"{failed} quality gates failed. Blocking deployment.")
        print("\nFailed Gates:")
        idx = 1
        for g in gates:
            if g.status != "fail":
                continue
            print(f"  {idx}. {g.name.replace('_', ' ')} - {g.message}")
            if g.remediation:
                print(f"     → Action: {g.remediation}")
            idx += 1
    else:
        print("All quality gates passed. Safe to deploy.")


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Enforce DT evaluation quality gates from summary JSON.")
    parser.add_argument(
        "--summary-json",
        type=Path,
        default=DEFAULT_SUMMARY,
        help="Path to dt_evaluation_summary.json (from dt_evaluation_dashboard).",
    )
    parser.add_argument(
        "--baseline-summary-json",
        type=Path,
        default=None,
        help="Optional baseline summary JSON to detect regressions.",
    )
    parser.add_argument(
        "--min-production-pass-rate",
        type=float,
        default=0.75,
        help="Minimum acceptable production pass rate (0-1).",
    )
    parser.add_argument(
        "--min-staging-pass-rate",
        type=float,
        default=0.90,
        help="Minimum acceptable staging pass rate (0-1).",
    )
    parser.add_argument(
        "--min-evaluations",
        type=int,
        default=5,
        help="Minimum number of evaluations required.",
    )
    parser.add_argument(
        "--max-reward-regression-pct",
        type=float,
        default=5.0,
        help="Maximum allowed percentage drop in reward preset means vs baseline.",
    )
    parser.add_argument(
        "--max-metric-regression-pct",
        type=float,
        default=10.0,
        help=(
            "Maximum allowed percentage regression in global median metrics "
            "(top1_accuracy, cont_mae, top3_accuracy, calibration_error, "
            "latency_p50, latency_p95, latency_p99) vs baseline."
        ),
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=None,
        help="Optional path to write machine-readable gate results JSON.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not exit with non-zero status even if gates fail.",
    )

    args = parser.parse_args(argv)

    if not args.summary_json.is_file():
        raise SystemExit(f"Summary JSON not found: {args.summary_json}")

    summary = _load_json(args.summary_json)

    baseline: Optional[Dict[str, Any]] = None
    baseline_path: Optional[Path] = None
    if args.baseline_summary_json is not None and args.baseline_summary_json.is_file():
        baseline_path = args.baseline_summary_json
        baseline = _load_json(args.baseline_summary_json)

    gates: List[GateResult] = []
    gates.append(evaluate_minimum_evaluations(summary, args.min_evaluations))
    gates.append(evaluate_pass_rate(summary, "staging", args.min_staging_pass_rate))
    gates.append(evaluate_pass_rate(summary, "production", args.min_production_pass_rate))
    gates.append(evaluate_reward_regressions(summary, baseline, args.max_reward_regression_pct))
    gates.append(evaluate_metric_regressions(summary, baseline, args.max_metric_regression_pct))

    print_human_summary(args.summary_json, baseline_path, summary, gates)

    payload = build_json_payload(summary, baseline, gates, args.summary_json, baseline_path)
    if args.output_json is not None:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    failed = any(g.status == "fail" for g in gates)
    if failed and not args.dry_run:
        return 1
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
