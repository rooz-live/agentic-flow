"""Unit tests for scripts/one.sh subcommand wiring."""
from __future__ import annotations

import subprocess

import pytest
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


def test_aqe_init_help_shows_fleet_options():
    """one.sh aqe init --help must surface fleet init options."""
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["bash", str(root / "scripts" / "one.sh"), "aqe", "init", "--help"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=30,
    )
    assert result.returncode == 0, f"stderr: {result.stderr}"
    assert "fleet init" in result.stdout or "topology" in result.stdout


def test_ruflo_init_help_shows_minimal_option():
    """one.sh ruflo init --help must surface minimal / start-daemon options."""
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["bash", str(root / "scripts" / "one.sh"), "ruflo", "init", "--help"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=30,
    )
    assert result.returncode == 0, f"stderr: {result.stderr}"
    assert "--minimal" in result.stdout or "--start-daemon" in result.stdout


@pytest.mark.parametrize(
    "cmd,expected",
    [
        ("loop", "loop timer engine"),
        ("schedule", "LNNNL"),
        ("goal", "max-ROI"),
        ("ceremony", "ceremony unit"),
        ("ci", "CI circle"),
        ("run-safely", "git stash checkpoint"),
    ],
)
def test_one_sh_help_text_routes_to_slice(cmd, expected):
    """one.sh <primitive> --help must print a slice-specific message and exit 0."""
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["bash", str(root / "scripts" / "one.sh"), cmd, "--help"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=30,
    )
    assert result.returncode == 0, f"stderr: {result.stderr}"
    assert expected.lower() in result.stdout.lower()

def test_harness_help_documents_metaharness():
    """one.sh harness --help must document MetaHarness commands (not npm generic help)."""
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["bash", str(root / "scripts" / "one.sh"), "harness", "--help"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=30,
    )
    assert result.returncode == 0, f"stderr: {result.stderr}"
    out = (result.stdout + result.stderr).lower()
    assert "metaharness" in out or "doctor" in out
    assert "evolve" in out


def test_harness_doctor_via_one_sh():
    """one.sh harness doctor must run MetaHarness kernel checks."""
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["bash", str(root / "scripts" / "one.sh"), "harness", "doctor"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=60,
    )
    assert result.returncode == 0, f"stderr: {result.stderr}\nstdout: {result.stdout}"
    assert "kernel" in result.stdout.lower() or "checks passed" in result.stdout.lower()


def test_workflow_alias_matches_ruflo_help():
    """one.sh workflow must alias one.sh ruflo."""
    root = Path(__file__).resolve().parents[2]
    ruflo = subprocess.run(
        ["bash", str(root / "scripts" / "one.sh"), "ruflo", "--help"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=30,
    )
    workflow = subprocess.run(
        ["bash", str(root / "scripts" / "one.sh"), "workflow", "--help"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=30,
    )
    assert ruflo.returncode == 0 and workflow.returncode == 0
    assert ruflo.stdout == workflow.stdout

