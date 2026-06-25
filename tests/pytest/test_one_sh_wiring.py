"""Unit tests for scripts/one.sh subcommand wiring."""
from __future__ import annotations

import subprocess
from pathlib import Path


def test_fetch_run_report_subcommand_routes():
    """one.sh fetch-run-report --help must delegate to fetch_run_report.py."""
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["bash", str(root / "scripts" / "one.sh"), "fetch-run-report", "--help"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=30,
    )
    assert result.returncode == 0, f"stderr: {result.stderr}"
    assert "Fetch-Run-Report" in result.stdout


def test_fetch_run_report_summary_runs_empty():
    """one.sh fetch-run-report --summary must run against an empty evidence dir."""
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["bash", str(root / "scripts" / "one.sh"), "fetch-run-report", "--summary"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=30,
    )
    assert result.returncode == 0, f"stderr: {result.stderr}"
    assert "overall_ok" in result.stdout
