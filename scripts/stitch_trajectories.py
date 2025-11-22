#!/usr/bin/env python3
"""
Stitch Trajectories from Metrics Log.

Reads .goalie/metrics_log.jsonl and groups events
into (State, Action, Reward) tuples.
Outputs .goalie/trajectories.jsonl.

Logic:
- Groups events by 'run_id' and 'cycle_index'.
- Expects sequence: State -> Action -> Reward.
- Handles missing events (partial trajectories).
"""

import json
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, Optional


def main():
    # Determine paths
    # Fallback to finding .goalie relative to script or CWD
    script_path = Path(__file__).resolve()
    project_root = script_path.parent.parent
    
    goalie_dir = project_root / ".goalie"
    if not goalie_dir.exists():
        # Try CWD
        goalie_dir = Path(os.getcwd()) / ".goalie"

    if not goalie_dir.exists():
        print(
            f"Info: .goalie directory not found at {goalie_dir}; "
            "no trajectories to stitch.",
            file=sys.stderr,
        )
        return

    metrics_log = goalie_dir / "metrics_log.jsonl"
    output_file = goalie_dir / "trajectories.jsonl"

    if not metrics_log.exists():
        print(
            f"Info: metrics_log.jsonl not found at {metrics_log}; "
            "no trajectories to stitch.",
            file=sys.stderr,
        )
        return

    # Data structure: run_id -> cycle_index -> {state: ..., action: ..., reward:}
    trajectories: Dict[str, Dict[int, Dict[str, Optional[Dict]]]] = (
        defaultdict(
            lambda: defaultdict(
                lambda: {"state": None, "action": None, "reward": None}
            )
        )
    )

    print(f"Reading {metrics_log}...")
    count = 0
    with open(metrics_log, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                # Default backward compat
                event_type = data.get("type", "state")
                if event_type == "prod_cycle_iteration":
                    event_type = "state"

                run_id = data.get("run_id")
                cycle_index = data.get("cycle_index")

                # Map iteration -> cycle_index for state events
                if cycle_index is None and "iteration" in data:
                    cycle_index = data["iteration"]

                if run_id and cycle_index is not None:
                    trajectories[run_id][cycle_index][event_type] = data
                    count += 1
            except json.JSONDecodeError:
                continue

    print(f"Processed {count} events.")
    
    # Stitch and write
    stitched_count = 0
    with open(output_file, "w") as f:
        for run_id, cycles in trajectories.items():
            # Sort by cycle index
            sorted_cycles = sorted(cycles.items())
            for cycle_idx, events in sorted_cycles:
                state = events["state"]
                action = events["action"]
                reward = events["reward"]

                # We want at least State + Action + Reward for a full
                # RL trajectory step. But we can log partials if needed.
                # For now, let's log the tuple if we have at least State.

                # Construct trajectory object
                ts = (
                    state.get("timestamp") if state
                    else (action.get("timestamp") if action else None)
                )

                trajectory = {
                    "run_id": run_id,
                    "cycle_index": cycle_idx,
                    "timestamp": ts,
                    "state": state,
                    "action": action,
                    "reward": reward,
                    "complete": bool(state and action and reward)
                }

                f.write(json.dumps(trajectory) + "\n")
                stitched_count += 1

    print(f"Stitched {stitched_count} trajectories to {output_file}")


if __name__ == "__main__":
    main()