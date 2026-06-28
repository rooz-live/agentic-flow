"""Cycle knob overlay → tick_post pace/AQE policy."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[3]


def load_policy(
    root: Path | None = None,
    *,
    pace: float,
    blocker_pace: float | None = None,
    shippable_lane_empty: bool = False,
    blocker_lane_has_now: bool = False,
    utilize_mode_hint: str | None = None,
) -> dict[str, Any]:
    root = root or repo_root()
    sys_path = str(root / "scripts" / "cicd" / "lib")
    import sys
    if sys_path not in sys.path:
        sys.path.insert(0, sys_path)
    import cycle_knob_engine as cke

    knobs = cke.load_knobs(root)
    vectors: dict[str, Any] = {}
    overlay_path = cke.overlay_path(root)
    if overlay_path.is_file():
        try:
            doc = json.loads(overlay_path.read_text(encoding="utf-8"))
            if cke.overlay_trusted(doc, root):
                vectors = (doc.get("last_cycle") or {}).get("vectors") or {}
        except (json.JSONDecodeError, OSError, TypeError):
            pass

    aqe_coverage_ok = bool((vectors.get("aqe_coverage_pass") or {}).get("ok"))
    aqe_quality_ok = bool((vectors.get("aqe_quality_pass") or {}).get("ok"))
    utilize_deferrable = os.environ.get("AQE_UTILIZE_DEFERRABLE", "0") == "1"

    run_aqe = pace >= 1.0
    run_upstream = pace >= 1.0
    aqe_scope = "changed"
    utilize_mode = "full" if pace >= 1.0 else "deferred"

    if utilize_mode_hint == "blocker-remediation":
        run_aqe = True
        run_upstream = False
        aqe_scope = "coherence"
        utilize_mode = "blocker-remediation"
    elif pace < 1.0 and utilize_deferrable:
        run_aqe = True
        run_upstream = False
        aqe_scope = "coherence"
        utilize_mode = "deferrable"
        if knobs.get("sweet_spot_ticks", 3) <= 2:
            aqe_scope = "coherence-cap"

    if knobs.get("sweet_spot_ticks", 3) <= 2 and pace < 1.5 and utilize_mode not in ("deferrable", "blocker-remediation"):
        run_upstream = False

    run_generate = (
        os.environ.get("CYCLE_AQE_GENERATE", "0") == "1"
        and aqe_coverage_ok and aqe_quality_ok and pace >= 1.0
    )

    # Shippable utilization: 0 or 100 only (never 50% at full shippable pace).
    aqe_util = 100.0 if run_aqe and pace >= 1.0 and utilize_mode == "full" else (
        0.0 if pace >= 1.0 else (100.0 if run_aqe and utilize_mode == "full" else 0.0)
    )
    aqe_deferrable_ran = run_aqe and utilize_mode in ("deferrable", "blocker-remediation")
    aqe_scope_util = (
        100.0 if run_aqe and utilize_mode == "full" and pace >= 1.0
        else (50.0 if aqe_deferrable_ran else 0.0)
    )
    harness_util = 100.0 if run_upstream else (25.0 if utilize_deferrable and pace < 1.0 else 0.0)

    return {
        "pace_cod_weight": pace,
        "blocker_pace_cod_weight": blocker_pace if blocker_pace is not None else 0.5,
        "max_minutes_per_tick": knobs["max_minutes_per_tick"],
        "sweet_spot_ticks": knobs["sweet_spot_ticks"],
        "run_aqe": run_aqe,
        "run_upstream": run_upstream,
        "run_aqe_generate": run_generate,
        "aqe_scope": aqe_scope,
        "utilize_mode": utilize_mode,
        "aqe_utilization_pct": aqe_util,
        "aqe_deferrable_ran": aqe_deferrable_ran,
        "aqe_scope_utilization_pct": aqe_scope_util,
        "harness_utilization_pct": harness_util,
        "knobs": knobs,
        "cycle_vectors_fresh": bool(vectors),
        "shippable_lane_empty": shippable_lane_empty,
        "blocker_lane_has_now": blocker_lane_has_now,
    }


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--pace", type=float, default=0.5)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--utilize-mode-hint", default=None)
    args = parser.parse_args()
    policy = load_policy(pace=args.pace, utilize_mode_hint=args.utilize_mode_hint)
    print(json.dumps(policy, indent=2) if args.json else json.dumps(policy))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
