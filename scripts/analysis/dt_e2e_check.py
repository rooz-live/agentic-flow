#!/usr/bin/env python3
"""End-to-end DT threshold calibration check.

Runs the four-step DT calibration pipeline via `af` subcommands and validates
that key artifacts exist and have the expected structure. Intended for CI.
For usage examples and CI integration patterns, see
`docs/dt_threshold_calibration.md#ci-integration-with-af-dt-e2e-check`.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Tuple

import yaml
import subprocess

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"
AF_SCRIPT = PROJECT_ROOT / "scripts" / "af"
SUMMARY_JSON = GOALIE_DIR / "dt_evaluation_summary.json"
STAGING_SUGGESTED = GOALIE_DIR / "dt_validation_thresholds_staging_suggested.yaml"
PROD_SUGGESTED = GOALIE_DIR / "dt_validation_thresholds_production_suggested.yaml"


def _run_step(name: str, args: Tuple[str, ...], verbose: bool) -> int:
    cmd = [str(AF_SCRIPT), *args]
    if verbose:
        print(f"[dt-e2e-check] {name}: {' '.join(cmd)}")
    proc = subprocess.run(cmd, cwd=str(PROJECT_ROOT), check=False)
    if proc.returncode != 0:
        print(
            f"[dt-e2e-check] {name} failed with exit code {proc.returncode}",
            file=sys.stderr,
        )
    return proc.returncode


def _validate_summary(path: Path) -> Tuple[bool, Dict[str, Any] | None]:
    if not path.is_file():
        print(f"[dt-e2e-check] Missing JSON summary file: {path}", file=sys.stderr)
        return False, None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"[dt-e2e-check] Malformed JSON in {path}: {exc}", file=sys.stderr)
        return False, None
    if not isinstance(data, dict):  # pragma: no cover - defensive
        print(
            f"[dt-e2e-check] Expected JSON object in {path}, got {type(data)}",
            file=sys.stderr,
        )
        return False, None

    required_keys = [
        "total_evaluations",
        "top1_accuracy",
        "per_circle_stats",
        "config_impact",
    ]
    for key in required_keys:
        if key not in data:
            print(
                f"[dt-e2e-check] Missing key '{key}' in dt_evaluation_summary.json",
                file=sys.stderr,
            )
            return False, None
    return True, data


def _validate_threshold_yaml(path: Path) -> bool:
    if not path.is_file():
        print(f"[dt-e2e-check] Missing thresholds file: {path}", file=sys.stderr)
        return False
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        print(f"[dt-e2e-check] Malformed YAML in {path}: {exc}", file=sys.stderr)
        return False
    if not isinstance(data, dict):  # pragma: no cover - defensive
        print(
            f"[dt-e2e-check] Expected YAML mapping in {path}, got {type(data)}",
            file=sys.stderr,
        )
        return False

    thresholds = data.get("model_quality_thresholds")
    if not isinstance(thresholds, dict):
        print(
            f"[dt-e2e-check] Missing 'model_quality_thresholds' in {path}",
            file=sys.stderr,
        )
        return False
    if "min_top1_accuracy" not in thresholds:
        print(
            "[dt-e2e-check] Missing 'min_top1_accuracy' in model_quality_thresholds",
            file=sys.stderr,
        )
        return False
    return True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run DT calibration pipeline and validate artifacts.",
    )
    parser.add_argument(
        "--prod-cycle-iterations",
        type=int,
        default=20,
        help="Number of iterations for 'af prod-cycle' (default: 20)",
    )
    parser.add_argument(
        "--skip-prod-cycle",
        action="store_true",
        help="Skip running 'af prod-cycle' if recent data already exists.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging.",
    )
    args = parser.parse_args(argv)

    # Step 1: Generate evaluation data.
    if not args.skip_prod_cycle:
        rc = _run_step(
            "Step 1: af prod-cycle",
            ("prod-cycle", str(args.prod_cycle_iterations)),
            args.verbose,
        )
        if rc != 0:
            return rc

    # Step 2: Build dashboard (HTML + JSON summary).
    rc = _run_step(
        "Step 2: af dt-dashboard",
        ("dt-dashboard", "--format", "html", "--format", "json"),
        args.verbose,
    )
    if rc != 0:
        return rc

    ok, summary = _validate_summary(SUMMARY_JSON)
    if not ok:
        return 1

    # Step 3: Generate suggested thresholds.
    rc = _run_step(
        "Step 3: af dt-suggest-thresholds",
        ("dt-suggest-thresholds",),
        args.verbose,
    )
    if rc != 0:
        return rc

    for path, label in (
        (STAGING_SUGGESTED, "staging"),
        (PROD_SUGGESTED, "production"),
    ):
        if not _validate_threshold_yaml(path):
            print(
                f"[dt-e2e-check] Validation failed for {label} thresholds at {path}",
                file=sys.stderr,
            )
            return 1

    # Step 4: Preview suggested production thresholds.
    rc = _run_step(
        "Step 4: af dt-dashboard --dry-run-config",
        ("dt-dashboard", "--dry-run-config", str(PROD_SUGGESTED), "--format", "table"),
        args.verbose,
    )
    if rc != 0:
        return rc

    ok, summary2 = _validate_summary(SUMMARY_JSON)
    if not ok:
        return 1

    impacts = summary2.get("config_impact") or {}
    prod_key = PROD_SUGGESTED.name
    impact = impacts.get(prod_key)
    if not isinstance(impact, Dict):
        print(
            f"[dt-e2e-check] Missing config_impact entry for '{prod_key}' in dt_evaluation_summary.json",
            file=sys.stderr,
        )
        return 1

    rate_val = impact.get("pass_rate")
    try:
        rate = float(rate_val)
    except (TypeError, ValueError):
        print(
            f"[dt-e2e-check] Non-numeric pass_rate for '{prod_key}': {rate_val!r}",
            file=sys.stderr,
        )
        return 1
    if not (0.0 <= rate <= 1.0):
        print(
            f"[dt-e2e-check] pass_rate {rate:.3f} for '{prod_key}' is outside [0.0, 1.0]",
            file=sys.stderr,
        )
        return 1

    if args.verbose:
        print(f"[dt-e2e-check] Suggested production pass_rate={rate:.3f}")

    print("[dt-e2e-check] SUCCESS: DT calibration pipeline is healthy.")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())

