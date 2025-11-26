#!/usr/bin/env python3
"""Suggest DT model-quality thresholds from dashboard summary.

Reads .goalie/dt_evaluation_summary.json (or a supplied JSON path) and
emits staging/production threshold YAMLs based on simple quantile
heuristics, then optionally runs the DT dashboard in --dry-run-config
mode to preview impact and check pass-rate targets.

For end-to-end validation of this workflow (including threshold
suggestion), see `af dt-e2e-check` and
`docs/dt_threshold_calibration.md#ci-integration-with-af-dt-e2e-check`.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"
DEFAULT_SUMMARY = GOALIE_DIR / "dt_evaluation_summary.json"
DEFAULT_STAGING = GOALIE_DIR / "dt_validation_thresholds_staging_suggested.yaml"
DEFAULT_PRODUCTION = GOALIE_DIR / "dt_validation_thresholds_production_suggested.yaml"
DASHBOARD_SCRIPT = Path(__file__).resolve().with_name("dt_evaluation_dashboard.py")


def load_summary(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        raise SystemExit(
            f"Evaluation summary not found at {path}. Run 'af dt-dashboard' first or "
            "provide --input-json."
        )
    return json.loads(path.read_text(encoding="utf-8"))


def _float_or_default(d: Dict[str, Any], key: str, default: float | None) -> float | None:
    val = d.get(key)
    if val is None:
        return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def compute_suggestions(summary: Dict[str, Any], iris_metrics: Dict[str, Any] | None = None) -> Dict[str, Dict[str, Any]]:
    """Return staging/production threshold suggestions based on quantiles.

    Args:
        summary: DT evaluation summary
        iris_metrics: Optional IRIS metrics for adaptive calibration

    IRIS Integration:
        - Adjusts thresholds based on production_maturity status
        - Relaxes thresholds if IRIS detects system degradation
        - Tightens thresholds if IRIS detects optimization opportunities
    """

    top1 = summary.get("top1_accuracy") or {}
    cont_mae = summary.get("cont_mae") or {}
    per_circle_med = summary.get("per_circle_median_top1") or {}
    per_circle_stats = summary.get("per_circle_stats") or {}

    p25_top1 = _float_or_default(top1, "p25", 0.0) or 0.0
    median_top1 = _float_or_default(top1, "median", 0.0) or 0.0
    p75_mae = _float_or_default(cont_mae, "p75", None)
    median_mae = _float_or_default(cont_mae, "median", None)

    # IRIS-based adjustments
    iris_adjustment = 0.0
    if iris_metrics:
        # Check production maturity
        maturity = iris_metrics.get("production_maturity", {})
        degraded_count = sum(1 for comp in maturity.values()
                           if isinstance(comp, dict) and comp.get("status") == "degraded")

        # Relax thresholds if infrastructure degraded
        if degraded_count > 0:
            iris_adjustment = -0.05 * degraded_count  # Lower accuracy requirements
            print(f"  IRIS: {degraded_count} degraded component(s), relaxing thresholds by {abs(iris_adjustment):.2f}")

        # Check for optimization patterns
        optimization_count = sum(1 for action in iris_metrics.get("actions_taken", [])
                               if "optimiz" in action.get("action", "").lower() and
                                  action.get("priority") == "important")

        # Tighten thresholds if optimizations available
        if optimization_count > 0:
            iris_adjustment = 0.03 * optimization_count  # Higher accuracy requirements
            print(f"  IRIS: {optimization_count} optimization(s) available, tightening thresholds by {iris_adjustment:.2f}")

    def circle_p25(name: str, median_fallback: float) -> float:
        stats = per_circle_stats.get(name) or {}
        val = stats.get("p25")
        try:
            return float(val)
        except (TypeError, ValueError):
            return median_fallback

    staging: Dict[str, Any] = {}
    production: Dict[str, Any] = {}

    # Staging: lenient, catches obviously broken models.
    staging["min_top1_accuracy"] = max(0.0, round(p25_top1 - 0.10 + iris_adjustment, 3))
    if p75_mae is not None:
        staging["max_cont_mae"] = round(p75_mae + 0.10, 4)

    for circle, med in per_circle_med.items():
        med_f = float(med)
        p25_c = circle_p25(circle, med_f)
        staging[f"per_circle_min_top1_{circle}"] = max(
            0.0, round(p25_c - 0.05 + iris_adjustment, 3)
        )

    # Production: stricter, centered on observed medians.
    production["min_top1_accuracy"] = round(median_top1 + iris_adjustment, 3)
    if median_mae is not None:
        production["max_cont_mae"] = round(median_mae, 4)

    for circle in ("orchestrator", "assessor"):
        if circle in per_circle_med:
            production[f"per_circle_min_top1_{circle}"] = round(
                float(per_circle_med[circle]) + iris_adjustment, 3
            )

    return {"staging": staging, "production": production}


def write_yaml(path: Path, thresholds: Dict[str, Any]) -> None:
    import yaml

    data = {"model_quality_thresholds": thresholds}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, sort_keys=True), encoding="utf-8")


def run_preview(
    summary_path: Path,
    prod_yaml: Path,
    target_min: float,
    target_max: float,
) -> int:
    """Run dt_evaluation_dashboard in dry-run mode and enforce pass-rate band."""

    if not DASHBOARD_SCRIPT.is_file():
        print(
            "dt_evaluation_dashboard.py not found; skipping impact preview.",
            file=sys.stderr,
        )
        return 0

    cmd = [
        sys.executable,
        str(DASHBOARD_SCRIPT),
        "--dry-run-config",
        str(prod_yaml),
        "--export-json",
        str(summary_path),
        "--format",
        "table",
    ]
    subprocess.run(cmd, check=False)

    data = load_summary(summary_path)
    impacts = data.get("config_impact") or {}
    name = prod_yaml.name
    impact = impacts.get(name)
    if not impact:
        print(
            f"No config_impact entry for {name}; cannot evaluate pass rate.",
            file=sys.stderr,
        )
        return 1

    rate = float(impact.get("pass_rate") or 0.0)
    pct = rate * 100.0
    print()
    print(
        "Suggested production thresholds pass rate: "
        f"{pct:.1f}% (target {target_min*100:.1f}-{target_max*100:.1f}% range)"
    )
    if rate < target_min or rate > target_max:
        print("\u2717 Suggested thresholds fall outside target band.")
        return 1
    print("\u2713 Suggested thresholds within target pass-rate band.")
    return 0


def load_iris_metrics() -> Dict[str, Any] | None:
    """Load latest IRIS metrics from metrics_log.jsonl."""
    metrics_log = GOALIE_DIR / "metrics_log.jsonl"
    if not metrics_log.exists():
        return None

    try:
        iris_events = []
        with open(metrics_log) as f:
            for line in f:
                try:
                    event = json.loads(line)
                    if event.get("type") == "iris_evaluation":
                        iris_events.append(event)
                except json.JSONDecodeError:
                    continue

        # Return latest event
        if iris_events:
            return iris_events[-1]
    except Exception:
        pass

    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Suggest DT model-quality thresholds from evaluation summary.",
    )
    parser.add_argument("--input-json", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--output-staging", type=Path, default=DEFAULT_STAGING)
    parser.add_argument("--output-production", type=Path, default=DEFAULT_PRODUCTION)
    parser.add_argument("--target-pass-rate-min", type=float, default=0.75)
    parser.add_argument("--target-pass-rate-max", type=float, default=0.90)
    parser.add_argument(
        "--no-preview",
        action="store_true",
        help="Skip running dt-dashboard --dry-run-config preview.",
    )
    parser.add_argument(
        "--with-iris",
        action="store_true",
        help="Include IRIS metrics in threshold calibration (adaptive thresholds).",
    )
    args = parser.parse_args(argv)

    summary = load_summary(args.input_json)
    total = int(summary.get("total_evaluations", 0))
    date_range = summary.get("date_range") or {}

    print("=== DT Threshold Suggestion Tool ===\n")
    print(f"Reading evaluation summary from: {args.input_json}")
    print(f"Total evaluations analyzed: {total}")
    start = date_range.get("start")
    end = date_range.get("end")
    if start and end:
        print(f"Date range: {start} to {end}\n")

    # Load IRIS metrics if requested
    iris_metrics = None
    if args.with_iris:
        print("IRIS Integration: Loading latest metrics...")
        iris_metrics = load_iris_metrics()
        if iris_metrics:
            print(f"  ✅ Loaded IRIS evaluation from {iris_metrics.get('timestamp')}")
        else:
            print("  ⚠️  No IRIS metrics found, using standard calibration")
        print()

    suggestions = compute_suggestions(summary, iris_metrics)
    staging = suggestions["staging"]
    production = suggestions["production"]

    print("Suggested staging thresholds (p25-based, lenient):")
    for k, v in sorted(staging.items()):
        print(f"  {k}: {v}")

    print("\nSuggested production thresholds (median-based, stricter):")
    for k, v in sorted(production.items()):
        print(f"  {k}: {v}")

    print("\nWriting suggested thresholds to:")
    print(f"  Staging:    {args.output_staging}")
    print(f"  Production: {args.output_production}")

    write_yaml(args.output_staging, staging)
    write_yaml(args.output_production, production)

    if args.no_preview:
        return 0

    return run_preview(
        args.input_json,
        args.output_production,
        args.target_pass_rate_min,
        args.target_pass_rate_max,
    )


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
