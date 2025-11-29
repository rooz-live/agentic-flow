#!/usr/bin/env python3
"""Suggest Governance Agent health thresholds from evaluation summary.

Reads .goalie/governance_evaluation_summary.json and emits staging/production
threshold YAMLs based on simple quantile heuristics, then optionally runs the
Governance dashboard in --dry-run-config mode to preview impact.
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
DEFAULT_SUMMARY = GOALIE_DIR / "governance_evaluation_summary.json"
DEFAULT_STAGING = GOALIE_DIR / "governance_thresholds_staging_suggested.yaml"
DEFAULT_PRODUCTION = GOALIE_DIR / "governance_thresholds_production_suggested.yaml"
DASHBOARD_SCRIPT = Path(__file__).resolve().with_name("governance_evaluation_dashboard.py")


def load_summary(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        raise SystemExit(
            f"Governance evaluation summary not found at {path}. Run 'af governance-dashboard' first or "
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


def compute_suggestions(summary: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Return staging/production governance threshold suggestions."""

    metrics = summary.get("metric_stats") or {}
    risk = metrics.get("risk_score") or {}
    incidents = metrics.get("recent_incidents") or {}
    sd = metrics.get("safe_degrade_triggers") or {}

    p75_risk = _float_or_default(risk, "p75", None)
    p90_risk = _float_or_default(risk, "p90", p75_risk or 0.0)
    p75_inc = _float_or_default(incidents, "p75", 0.0)
    p90_inc = _float_or_default(incidents, "p90", p75_inc)
    p75_sd = _float_or_default(sd, "p75", 0.0)
    p90_sd = _float_or_default(sd, "p90", p75_sd)

    staging: Dict[str, Any] = {}
    production: Dict[str, Any] = {}

    if p90_risk is not None:
        staging["max_risk_score"] = round((p90_risk or 0.0) * 1.10, 3)
    if p90_inc is not None:
        staging["max_recent_incidents"] = int(round((p90_inc or 0.0) * 1.25)) + 1
    if p90_sd is not None:
        staging["max_safe_degrade_triggers"] = int(round((p90_sd or 0.0) * 1.25)) + 1

    if p75_risk is not None:
        production["max_risk_score"] = round((p75_risk or 0.0) * 1.05, 3)
    if p75_inc is not None:
        production["max_recent_incidents"] = max(0, int(round((p75_inc or 0.0) * 1.10)))
    if p75_sd is not None:
        production["max_safe_degrade_triggers"] = max(0, int(round((p75_sd or 0.0) * 1.10)))

    return {"staging": staging, "production": production}


def write_yaml(path: Path, thresholds: Dict[str, Any]) -> None:
    import yaml

    data = {"governance_health_thresholds": thresholds}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, sort_keys=True), encoding="utf-8")


def run_preview(
    summary_path: Path,
    prod_yaml: Path,
    target_min: float,
    target_max: float,
) -> int:
    """Run governance_evaluation_dashboard in dry-run mode and enforce band."""

    if not DASHBOARD_SCRIPT.is_file():
        print(
            "governance_evaluation_dashboard.py not found; skipping impact preview.",
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
        "Suggested governance thresholds pass rate: "
        f"{pct:.1f}% (target {target_min*100:.1f}-{target_max*100:.1f}% range)"
    )
    if rate < target_min or rate > target_max:
        print("\u2717 Suggested thresholds fall outside target band.")
        return 1
    print("\u2713 Suggested thresholds within target pass-rate band.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Suggest Governance Agent health thresholds from evaluation summary.",
    )
    parser.add_argument("--input-json", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--output-staging", type=Path, default=DEFAULT_STAGING)
    parser.add_argument("--output-production", type=Path, default=DEFAULT_PRODUCTION)
    parser.add_argument("--target-pass-rate-min", type=float, default=0.75)
    parser.add_argument("--target-pass-rate-max", type=float, default=0.90)
    parser.add_argument(
        "--no-preview",
        action="store_true",
        help="Skip running governance-dashboard --dry-run-config preview.",
    )
    args = parser.parse_args(argv)

    summary = load_summary(args.input_json)
    total = int(summary.get("total_iterations", 0))

    print("=== Governance Threshold Suggestion Tool ===\n")
    print(f"Reading evaluation summary from: {args.input_json}")
    print(f"Totaliterations analyzed: {total}\n")

    suggestions = compute_suggestions(summary)
    staging = suggestions["staging"]
    production = suggestions["production"]

    print("Suggested staging thresholds (lenient):")
    for k, v in sorted(staging.items()):
        print(f"  {k}: {v}")

    print("\nSuggested production thresholds (stricter):")
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

