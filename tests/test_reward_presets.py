from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

import subprocess

import pytest


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
def build_module() -> Any:
    """Load build_trajectories.py once per test module."""
    return _load_build_module()



def test_reward_presets_exist_and_valid(build_module: Any) -> None:
    presets = getattr(build_module, "REWARD_PRESETS", None)
    assert isinstance(presets, dict), "REWARD_PRESETS should be a dict of presets"

    expected_names = {
        "balanced",
        "governance_conservative",
        "latency_sensitive",
        "status_dominant",
    }
    for name in expected_names:
        assert name in presets, f"Missing expected preset: {name}"

    for name, value in presets.items():
        assert isinstance(value, tuple), f"Preset {name} should map to a tuple"
        assert len(value) == 2, f"Preset {name} tuple should have length 2"

        max_duration_ms, alpha = value
        assert isinstance(max_duration_ms, (int, float))
        assert isinstance(alpha, (int, float))

        assert max_duration_ms > 0.0, f"Preset {name} max_duration_ms must be positive"
        assert 0.0 <= alpha <= 1.0, f"Preset {name} alpha must be in [0.0, 1.0]"


def _compute_canonical_rewards(
    build_module: Any, preset_name: str
) -> tuple[float, float, float, float]:
    """Compute rewards at canonical durations for a given preset.

    Returns (fast_success, typical_success, slow_success, failure_typical).
    """

    presets = build_module.REWARD_PRESETS
    max_duration_ms, alpha = presets[preset_name]

    compute = build_module.compute_reward_value

    fast = compute(
        status="success",
        duration_ms=17_000.0,
        max_duration_ms=max_duration_ms,
        alpha=alpha,
    )
    typical = compute(
        status="success",
        duration_ms=34_000.0,
        max_duration_ms=max_duration_ms,
        alpha=alpha,
    )
    slow = compute(
        status="success",
        duration_ms=60_000.0,
        max_duration_ms=max_duration_ms,
        alpha=alpha,
    )
    failure = compute(
        status="failure",
        duration_ms=34_000.0,
        max_duration_ms=max_duration_ms,
        alpha=alpha,
    )

    return float(fast), float(typical), float(slow), float(failure)


def test_reward_preset_ranges(build_module: Any) -> None:
    """Reward presets should produce the expected numeric ranges.

    These checks intentionally use approximate values so that small, deliberate
    tuning changes will require updating this test explicitly.
    """

    # status_dominant
    fast, typical, slow, failure = _compute_canonical_rewards(
        build_module, "status_dominant"
    )
    assert fast == pytest.approx(0.9681, abs=0.01)
    assert typical == pytest.approx(0.9363, abs=0.01)
    assert slow == pytest.approx(0.8875, abs=0.01)
    assert failure == pytest.approx(0.0, abs=1e-9)

    # latency_sensitive
    fast, typical, slow, failure = _compute_canonical_rewards(
        build_module, "latency_sensitive"
    )
    assert fast == pytest.approx(0.7763, abs=0.01)
    assert typical == pytest.approx(0.5526, abs=0.01)
    assert slow == pytest.approx(0.5000, abs=0.01)
    assert failure == pytest.approx(0.0, abs=1e-9)

    # balanced
    fast, typical, slow, failure = _compute_canonical_rewards(build_module, "balanced")
    assert fast == pytest.approx(0.8583, abs=0.01)
    assert typical == pytest.approx(0.7167, abs=0.01)
    assert slow == pytest.approx(0.5000, abs=0.01)
    assert failure == pytest.approx(0.0, abs=1e-9)

    # governance_conservative
    fast, typical, slow, failure = _compute_canonical_rewards(
        build_module, "governance_conservative"
    )
    assert fast == pytest.approx(0.8300, abs=0.01)
    assert typical == pytest.approx(0.6600, abs=0.01)
    assert slow == pytest.approx(0.4000, abs=0.01)
    assert failure == pytest.approx(0.0, abs=1e-9)


def test_reward_preset_ordering(build_module: Any) -> None:
    """For a typical duration, presets preserve their intended ordering.

    At 34_000ms, we expect:

        status_dominant > balanced > governance_conservative > latency_sensitive > 0.0
    """

    typical_duration = 34_000.0

    def _reward(name: str) -> float:
        max_duration_ms, alpha = build_module.REWARD_PRESETS[name]
        return float(
            build_module.compute_reward_value(
                status="success",
                duration_ms=typical_duration,
                max_duration_ms=max_duration_ms,
                alpha=alpha,
            )
        )

    rd = _reward("status_dominant")
    rb = _reward("balanced")
    rg = _reward("governance_conservative")
    rl = _reward("latency_sensitive")

    assert rd > rb > rg > rl > 0.0



def _run_list_reward_presets(*args: str) -> subprocess.CompletedProcess[str]:
    """Run list_reward_presets.py with the given CLI arguments."""

    script_path = PROJECT_ROOT / "scripts" / "analysis" / "list_reward_presets.py"
    assert script_path.is_file(), f"CLI script not found at {script_path}"

    return subprocess.run(
        ["python3", str(script_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def test_list_reward_presets_cli_smoke_test() -> None:
    """Smoke test: list_reward_presets.py runs and prints expected structure."""

    result = _run_list_reward_presets()

    assert result.returncode == 0, result.stderr

    # Core structural markers
    stdout = result.stdout
    assert "Available Reward Presets:" in stdout
    assert "max_duration_ms:" in stdout
    assert "alpha:" in stdout
    assert "Success reward range:" in stdout
    assert "Usage:" in stdout

    # Known preset names should be listed
    for name in (
        "balanced",
        "governance_conservative",
        "latency_sensitive",
        "status_dominant",
    ):
        assert name in stdout


def test_list_reward_presets_cli_verbose_mode() -> None:
    """Smoke test: verbose mode shows canonical reward information."""

    result = _run_list_reward_presets("--verbose")

    assert result.returncode == 0, result.stderr

    stdout = result.stdout
    # Verbose-specific markers
    assert "Canonical success rewards:" in stdout
    assert "fast" in stdout
    assert "typical" in stdout
    assert "slow" in stdout
    assert "Canonical failure reward" in stdout
