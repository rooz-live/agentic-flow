#!/usr/bin/env python3
"""List named Decision Transformer reward presets and their semantics.

This script is read-only. It dynamically imports the hybrid reward function and
preset definitions from ``build_trajectories.py`` and prints a human-friendly
summary to help developers choose appropriate presets.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import importlib.util


CANONICAL_DURATIONS: List[Tuple[str, float]] = [
    ("fast", 17_000.0),
    ("typical", 34_000.0),
    ("slow", 60_000.0),
]


# Short, human-oriented descriptions for each known preset.
USE_CASE_DESCRIPTIONS: Dict[str, str] = {
    "balanced": (
        "Default for DT training; balances binary status semantics with "
        "latency sensitivity."
    ),
    "governance_conservative": (
        "Governance analysis with aggressive penalties for slow successes; "
        "emphasizes conservative behavior."
    ),
    "latency_sensitive": (
        "Performance and latency-focused analysis where speed among "
        "successes matters significantly."
    ),
    "status_dominant": (
        "Production-style, nearly binary success/failure semantics with "
        "only light differentiation by latency."
    ),
}


def _load_build_module() -> Any:
    """Load ``build_trajectories.py`` as a module.

    This mirrors the pattern used in ``preview_rewards.py`` so that
    dataclasses and other runtime introspection work correctly even when the
    repo is not installed as a package.
    """

    script_dir = Path(__file__).resolve().parent
    build_path = script_dir / "build_trajectories.py"
    if not build_path.is_file():
        raise FileNotFoundError(f"build_trajectories.py not found at {build_path}")

    spec = importlib.util.spec_from_file_location(
        "_build_trajectories_module", build_path
    )
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise RuntimeError("Failed to create module spec for build_trajectories.py")

    module = importlib.util.module_from_spec(spec)
    # Ensure dataclasses and other runtime introspection see this module.
    import sys as _sys

    _sys.modules[spec.name] = module
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "List Decision Transformer hybrid reward presets and their "
            "expected behavior."
        )
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help=(
            "Show canonical success/failure reward values at "
            "17_000ms, 34_000ms, and 60_000ms."
        ),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    build_mod = _load_build_module()
    presets: Dict[str, Tuple[float, float]] = getattr(build_mod, "REWARD_PRESETS", {})
    compute_reward = getattr(build_mod, "compute_reward_value", None)

    if not presets or compute_reward is None:
        print(
            "REWARD_PRESETS or compute_reward_value not found in build_trajectories.py",
            file=sys.stderr,
        )
        return 1

    print("Available Reward Presets:\n")

    for name in sorted(presets.keys()):
        max_duration_ms, alpha = presets[name]

        # Theoretical success rewards at canonical durations.
        success_values: List[float] = [
            float(
                compute_reward(
                    status="success",
                    duration_ms=d,
                    max_duration_ms=max_duration_ms,
                    alpha=alpha,
                )
            )
            for _, d in CANONICAL_DURATIONS
        ]

        min_success = min(success_values)
        max_success = max(success_values)

        print(f"  {name}")
        print(f"    max_duration_ms: {max_duration_ms:.1f}")
        print(f"    alpha: {alpha:.2f}")
        print(f"    Success reward range: ~{min_success:.2f}-{max_success:.2f}")

        desc = USE_CASE_DESCRIPTIONS.get(name)
        if desc:
            print(f"    Use case: {desc}")

        if args.verbose:
            print("    Canonical success rewards:")
            for label, d in CANONICAL_DURATIONS:
                value = float(
                    compute_reward(
                        status="success",
                        duration_ms=d,
                        max_duration_ms=max_duration_ms,
                        alpha=alpha,
                    )
                )
                print(f"      {label:7} ({int(d):6d} ms): {value:.4f}")

            failure = float(
                compute_reward(
                    status="failure",
                    duration_ms=CANONICAL_DURATIONS[1][1],
                    max_duration_ms=max_duration_ms,
                    alpha=alpha,
                )
            )
            print(
                "    Canonical failure reward (typical, status='failure'): "
                f"{failure:.4f}"
            )

        print()

    print("Usage:")
    print("  af reward-preview --preset <preset-name> --trajectories <path>")
    print(
        "  build_trajectories.py --reward-preset <preset-name> --compute-reward-value"
    )

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    raise SystemExit(main())

