from __future__ import annotations

import importlib.util
import math
from pathlib import Path
from typing import Any

import subprocess

import pytest


REPO_ROOT = Path(__file__).resolve().parents[3]
PROJECT_ROOT = Path(__file__).resolve().parents[1]
BUILD_SCRIPT_PATH = PROJECT_ROOT / "scripts" / "analysis" / "build_trajectories.py"


def _load_build_module() -> Any:
    """Load build_trajectories.py directly from its script path.

    This mirrors the dynamic import pattern used in other tests so that we do
    not depend on the repo being installed as a Python package.
    """

    if not BUILD_SCRIPT_PATH.is_file():
        raise AssertionError(f"build_trajectories.py not found at {BUILD_SCRIPT_PATH}")

    spec = importlib.util.spec_from_file_location(
        "_build_trajectories_test", BUILD_SCRIPT_PATH
    )
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise AssertionError("Failed to create module spec for build_trajectories.py")

    module = importlib.util.module_from_spec(spec)

    # Ensure dataclasses and other runtime introspection see this module.
    import sys as _sys

    _sys.modules[spec.name] = module
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


@pytest.fixture(scope="module")
def build_module() -> Any:  # pragma: no cover - fixture used for future unit tests
    """Load build_trajectories.py once per test module.

    Kept for parity with test_reward_presets.py and to support potential
    non-CLI unit tests that may be added later.
    """

    return _load_build_module()


PREVIEW_SCRIPT_PATH = PROJECT_ROOT / "scripts" / "analysis" / "preview_rewards.py"


def _load_preview_module() -> Any:
    """Load preview_rewards.py directly from its script path for unit tests."""

    if not PREVIEW_SCRIPT_PATH.is_file():
        raise AssertionError(f"preview_rewards.py not found at {PREVIEW_SCRIPT_PATH}")

    spec = importlib.util.spec_from_file_location(
        "_preview_rewards_test", PREVIEW_SCRIPT_PATH
    )
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise AssertionError("Failed to create module spec for preview_rewards.py")

    module = importlib.util.module_from_spec(spec)

    # Ensure this dynamically loaded module is visible to dataclasses and
    # other runtime introspection helpers.
    import sys as _sys

    _sys.modules[spec.name] = module
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


@pytest.fixture(scope="module")
def preview_module() -> Any:
    """Load preview_rewards.py once per test module."""

    return _load_preview_module()


TRAJECTORIES_TEST_PATH = REPO_ROOT / ".goalie" / "trajectories_test.jsonl"


def _run_preview_rewards(*args: str) -> subprocess.CompletedProcess[str]:
    """Run preview_rewards.py with the given CLI arguments."""

    script_path = PROJECT_ROOT / "scripts" / "analysis" / "preview_rewards.py"
    assert script_path.is_file(), f"CLI script not found at {script_path}"

    return subprocess.run(
        ["python3", str(script_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def test_preview_rewards_cli_help() -> None:
    """Smoke test: --help prints usage and exits successfully."""

    result = _run_preview_rewards("--help")

    assert result.returncode == 0

    # Argparse help text should include the description and key options.
    combined = result.stdout + result.stderr
    assert "Preview hybrid rewards for trajectories" in combined
    assert "--trajectories" in combined
    assert "--preset" in combined


def test_preview_rewards_cli_with_preset() -> None:
    """Smoke test: running with a known preset produces summary output."""

    assert TRAJECTORIES_TEST_PATH.is_file(), (
        f"Test trajectories file not found at {TRAJECTORIES_TEST_PATH}"
    )

    result = _run_preview_rewards(
        "--trajectories",
        str(TRAJECTORIES_TEST_PATH),
        "--preset",
        "balanced",
    )

    assert result.returncode == 0, result.stderr

    stdout = result.stdout
    assert "Reward Preview:" in stdout
    assert "Trajectories file:" in stdout
    assert "Reward statistics:" in stdout
    assert "Histogram (hybrid reward.value):" in stdout
    assert "By status:" in stdout


def test_preview_rewards_cli_verbose_mode() -> None:
    """Smoke test: verbose mode also succeeds and prints core sections."""

    assert TRAJECTORIES_TEST_PATH.is_file(), (
        f"Test trajectories file not found at {TRAJECTORIES_TEST_PATH}"
    )

    result = _run_preview_rewards(
        "--trajectories",
        str(TRAJECTORIES_TEST_PATH),
        "--preset",
        "balanced",
        "--verbose",
    )

    assert result.returncode == 0, result.stderr

    stdout = result.stdout
    # Same core sections should be present under verbose mode.
    assert "Reward Preview:" in stdout
    assert "Trajectories file:" in stdout
    assert "Reward statistics:" in stdout
    assert "Histogram (hybrid reward.value):" in stdout
    assert "By status:" in stdout



def test_summarize_with_empty_list(preview_module) -> None:
    """summarize() should return NaNs for all fields on empty input."""

    stats = preview_module.summarize([])

    assert math.isnan(stats["min"])
    assert math.isnan(stats["max"])
    assert math.isnan(stats["mean"])
    assert math.isnan(stats["median"])
    assert math.isnan(stats["std"])


def test_summarize_with_valid_samples(preview_module) -> None:
    """summarize() should compute correct statistics for simple values."""

    RewardSample = preview_module.RewardSample
    samples = [
        RewardSample(run_id="run1", cycle_index=0, status="ok", duration_ms=10.0, reward_value=0.2),
        RewardSample(run_id="run2", cycle_index=1, status="ok", duration_ms=20.0, reward_value=0.5),
        RewardSample(run_id="run3", cycle_index=2, status="ok", duration_ms=30.0, reward_value=0.8),
    ]
    values = [s.reward_value for s in samples]

    stats = preview_module.summarize(values)

    assert stats["min"] == pytest.approx(0.2)
    assert stats["max"] == pytest.approx(0.8)
    assert stats["mean"] == pytest.approx(0.5)
    assert stats["median"] == pytest.approx(0.5)
    # Population standard deviation of [0.2, 0.5, 0.8] around mean 0.5.
    assert stats["std"] == pytest.approx(0.244948, rel=1e-5)


def test_build_histogram_basic(preview_module) -> None:
    """build_histogram() should bucket values into five bins over [0.0, 1.0]."""

    values = [0.1, 0.3, 0.5, 0.7, 0.9]

    bins = preview_module.build_histogram(values)

    assert len(bins) == 5
    # Each value should land in a different bin.
    assert bins == [1, 1, 1, 1, 1]

    # Empty input returns all-zero bins.
    empty_bins = preview_module.build_histogram([])
    assert empty_bins == [0, 0, 0, 0, 0]



def _extract_total_steps(output: str) -> int:
    """Helper to pull the 'Total steps' count from CLI output."""

    for line in output.splitlines():
        line = line.strip()
        if line.startswith("Total steps:"):
            return int(line.split("Total steps:")[1].strip())
    raise AssertionError("Total steps line not found in preview_rewards output")



def test_preview_rewards_cli_cycle_filter_reduces_steps() -> None:
    """--cycle should narrow the set of trajectories considered."""

    assert TRAJECTORIES_TEST_PATH.is_file(), (
        f"Test trajectories file not found at {TRAJECTORIES_TEST_PATH}"
    )

    base = _run_preview_rewards(
        "--trajectories",
        str(TRAJECTORIES_TEST_PATH),
        "--preset",
        "balanced",
    )
    assert base.returncode == 0, base.stderr
    base_steps = _extract_total_steps(base.stdout)

    filtered = _run_preview_rewards(
        "--trajectories",
        str(TRAJECTORIES_TEST_PATH),
        "--preset",
        "balanced",
        "--cycle",
        "1",
    )
    assert filtered.returncode == 0, filtered.stderr
    filtered_steps = _extract_total_steps(filtered.stdout)

    # trajectories_test.jsonl has two records with cycle_index == 1.
    assert filtered_steps == 2
    assert filtered_steps < base_steps



def test_compute_duration_stats_filters_by_status(preview_module) -> None:
    """compute_duration_stats() should respect status_filter and basic stats."""

    RewardSample = preview_module.RewardSample
    samples = [
        RewardSample(
            run_id="r1",
            cycle_index=1,
            status="success",
            duration_ms=10.0,
            reward_value=0.1,
        ),
        RewardSample(
            run_id="r2",
            cycle_index=1,
            status="success",
            duration_ms=30.0,
            reward_value=0.2,
        ),
        RewardSample(
            run_id="r3",
            cycle_index=1,
            status="failure",
            duration_ms=50.0,
            reward_value=0.0,
        ),
    ]

    all_stats = preview_module.compute_duration_stats(samples)
    success_stats = preview_module.compute_duration_stats(samples, status_filter="success")
    failure_stats = preview_module.compute_duration_stats(samples, status_filter="failure")

    # All durations: [10, 30, 50]
    assert all_stats["min"] == pytest.approx(10.0)
    assert all_stats["max"] == pytest.approx(50.0)
    assert all_stats["mean"] == pytest.approx(30.0)
    assert all_stats["p95"] == pytest.approx(50.0)

    # Success durations: [10, 30]
    assert success_stats["min"] == pytest.approx(10.0)
    assert success_stats["max"] == pytest.approx(30.0)
    assert success_stats["mean"] == pytest.approx(20.0)
    assert success_stats["p95"] == pytest.approx(30.0)

    # Failure durations: [50]
    assert failure_stats["min"] == pytest.approx(50.0)
    assert failure_stats["max"] == pytest.approx(50.0)
    assert failure_stats["mean"] == pytest.approx(50.0)
    assert failure_stats["p95"] == pytest.approx(50.0)



def test_compute_duration_stats_empty(preview_module) -> None:
    """compute_duration_stats() should return NaNs on empty input."""

    stats = preview_module.compute_duration_stats([])
    assert math.isnan(stats["min"])
    assert math.isnan(stats["mean"])
    assert math.isnan(stats["p95"])
    assert math.isnan(stats["max"])
