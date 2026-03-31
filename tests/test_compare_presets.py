from __future__ import annotations

import importlib.util
import csv
import io
import json
from pathlib import Path
from typing import Any

import subprocess

import pytest


REPO_ROOT = Path(__file__).resolve().parents[3]
PROJECT_ROOT = Path(__file__).resolve().parents[1]
COMPARE_SCRIPT_PATH = PROJECT_ROOT / "scripts" / "analysis" / "compare_presets.py"


def _load_compare_module() -> Any:
    """Load compare_presets.py directly from its script path.

    Mirrors the dynamic import pattern used in other DT tooling tests so we do
    not depend on the repo being installed as a package. Keeping this fixture
    makes it easy to add direct unit tests for helpers in the future.
    """

    if not COMPARE_SCRIPT_PATH.is_file():
        raise AssertionError(f"compare_presets.py not found at {COMPARE_SCRIPT_PATH}")

    spec = importlib.util.spec_from_file_location(
        "_compare_presets_test", COMPARE_SCRIPT_PATH
    )
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise AssertionError("Failed to create module spec for compare_presets.py")

    module = importlib.util.module_from_spec(spec)

    # Ensure this dynamically loaded module is visible to other helpers.
    import sys as _sys

    _sys.modules[spec.name] = module
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


@pytest.fixture(scope="module")
def compare_module() -> Any:  # pragma: no cover - fixture reserved for future tests
    """Load compare_presets.py once per test module."""

    return _load_compare_module()


TRAJECTORIES_TEST_PATH = REPO_ROOT / ".goalie" / "trajectories_test.jsonl"


def _run_compare_presets(*args: str) -> subprocess.CompletedProcess[str]:
    """Run compare_presets.py with the given CLI arguments."""

    assert COMPARE_SCRIPT_PATH.is_file(), f"CLI script not found at {COMPARE_SCRIPT_PATH}"

    return subprocess.run(
        ["python3", str(COMPARE_SCRIPT_PATH), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def _extract_total_steps(output: str) -> int:
    """Helper to pull the 'Total steps after filtering' count from CLI output."""

    for line in output.splitlines():
        line = line.strip()
        if line.startswith("Total steps after filtering:"):
            return int(line.split("Total steps after filtering:")[1].strip())
    raise AssertionError("Total steps line not found in compare_presets output")


def test_compare_presets_cli_help() -> None:
    """Smoke test: --help prints usage and exits successfully."""

    result = _run_compare_presets("--help")

    assert result.returncode == 0

    combined = result.stdout + result.stderr
    assert "Compare hybrid reward presets over a trajectories JSONL file" in combined
    assert "--trajectories" in combined
    assert "--cycle" in combined


def test_compare_presets_cli_smoke_with_test_data() -> None:
    """Smoke test: running against trajectories_test.jsonl prints a table."""

    assert TRAJECTORIES_TEST_PATH.is_file(), (
        f"Test trajectories file not found at {TRAJECTORIES_TEST_PATH}"
    )

    result = _run_compare_presets(
        "--trajectories",
        str(TRAJECTORIES_TEST_PATH),
    )

    assert result.returncode == 0, result.stderr

    stdout = result.stdout
    assert "Reward preset comparison:" in stdout
    assert "Comparison table:" in stdout
    # At least the balanced preset should appear in the table.
    assert "balanced" in stdout


def test_compare_presets_cli_cycle_filter_reduces_steps() -> None:
    """--cycle should narrow the set of trajectories considered for comparison."""

    assert TRAJECTORIES_TEST_PATH.is_file(), (
        f"Test trajectories file not found at {TRAJECTORIES_TEST_PATH}"
    )

    base = _run_compare_presets(
        "--trajectories",
        str(TRAJECTORIES_TEST_PATH),
    )
    assert base.returncode == 0, base.stderr
    base_steps = _extract_total_steps(base.stdout)

    filtered = _run_compare_presets(
        "--trajectories",
        str(TRAJECTORIES_TEST_PATH),
        "--cycle",
        "1",
    )
    assert filtered.returncode == 0, filtered.stderr
    filtered_steps = _extract_total_steps(filtered.stdout)

    # trajectories_test.jsonl has two records with cycle_index == 1.
    assert filtered_steps == 2
    assert filtered_steps < base_steps

def test_compare_presets_json_format() -> None:
    """--format json should produce valid JSON with expected structure."""

    assert TRAJECTORIES_TEST_PATH.is_file(), (
        f"Test trajectories file not found at {TRAJECTORIES_TEST_PATH}"
    )

    result = _run_compare_presets(
        "--trajectories",
        str(TRAJECTORIES_TEST_PATH),
        "--format",
        "json",
    )

    assert result.returncode == 0, result.stderr

    data = json.loads(result.stdout)
    assert isinstance(data, dict)
    assert set(data.keys()) >= {"metadata", "presets"}

    meta = data["metadata"]
    assert isinstance(meta, dict)
    assert meta["trajectories_file"] == str(TRAJECTORIES_TEST_PATH)
    assert isinstance(meta["total_steps"], int)

    presets = data["presets"]
    assert isinstance(presets, list)
    assert presets, "Expected at least one preset entry"

    first = presets[0]
    assert "name" in first
    assert "reward_stats" in first
    assert "status_counts" in first
    assert "duration_stats" in first

    rs = first["reward_stats"]
    assert set(rs.keys()) >= {"min", "max", "mean", "median", "std"}

    sc = first["status_counts"]
    assert set(sc.keys()) >= {"success", "failure"}

    ds = first["duration_stats"]
    assert set(ds.keys()) >= {"all", "success", "failure"}
    for key in ["all", "success", "failure"]:
        sub = ds[key]
        assert set(sub.keys()) >= {"min", "mean", "p95", "max"}



def test_compare_presets_csv_format() -> None:
    """--format csv should produce CSV with expected headers and rows."""

    assert TRAJECTORIES_TEST_PATH.is_file(), (
        f"Test trajectories file not found at {TRAJECTORIES_TEST_PATH}"
    )

    result = _run_compare_presets(
        "--trajectories",
        str(TRAJECTORIES_TEST_PATH),
        "--format",
        "csv",
    )

    assert result.returncode == 0, result.stderr

    reader = csv.DictReader(io.StringIO(result.stdout))
    expected_fields = [
        "preset_name",
        "reward_min",
        "reward_max",
        "reward_mean",
        "reward_median",
        "reward_std",
        "success_count",
        "failure_count",
        "duration_all_mean",
        "duration_success_mean",
        "duration_failure_mean",
    ]
    assert reader.fieldnames == expected_fields

    rows = list(reader)
    assert rows, "Expected at least one CSV row"

    names = {row["preset_name"] for row in rows}
    assert "balanced" in names

    for row in rows:
        # Counts should be parseable as integers when present.
        if row["success_count"]:
            int(row["success_count"])
        if row["failure_count"]:
            int(row["failure_count"])
