#!/usr/bin/env python3
"""
Decision Transformer Offline Training Data Converter
=====================================================

Converts prod-cycle metrics from .goalie/metrics_log.jsonl and
.goalie/pattern_metrics.jsonl into DT-compatible format for offline RL.

DT Format Requirements:
- states: observation vectors (pattern metrics, governor health, etc.)
- actions: discrete/continuous action representations (circle selection, depth, etc.)
- rewards: immediate reward signals (success, duration, roam delta)
- returns-to-go: cumulative future rewards

Usage:
    python scripts/ml/dt_offline_training.py --output .goalie/dt_training_data.jsonl
    python scripts/ml/dt_offline_training.py --stats  # Show statistics only
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"
METRICS_LOG = GOALIE_DIR / "metrics_log.jsonl"
PATTERN_METRICS = GOALIE_DIR / "pattern_metrics.jsonl"
DT_OUTPUT = GOALIE_DIR / "dt_training_data.jsonl"

# State feature mappings (metrics → DT observation dimensions)
STATE_FEATURES = [
    "safe_degrade.triggers",
    "rca.dt_consecutive_failures",
    "rca.iterations_without_progress",
    "circle_risk_focus.extra_iterations",
    "autocommit_shadow.candidates",
    "iteration_budget.consumed",
    "iteration_budget.remaining",
    "observability_first.metrics_written",
    "governor_health.risk_score",
]

# Action mappings (circle selection as discrete actions)
CIRCLES = ["analyst", "assessor", "innovator", "intuitive", "orchestrator", "seeker"]

def load_metrics_log() -> List[Dict[str, Any]]:
    """Load metrics_log.jsonl entries."""
    entries = []
    if METRICS_LOG.exists():
        with open(METRICS_LOG, "r") as f:
            for line in f:
                if line.strip():
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
    return entries

def extract_state_vector(metrics: Dict[str, Any]) -> List[float]:
    """Convert metrics dict to fixed-length state vector."""
    state = []
    for feature in STATE_FEATURES:
        parts = feature.split(".")
        value = metrics
        for p in parts:
            if isinstance(value, dict):
                value = value.get(p, 0)
            else:
                value = 0
                break
        state.append(float(value) if isinstance(value, (int, float)) else 0.0)
    return state

def extract_action(entry: Dict[str, Any]) -> int:
    """Extract discrete action (circle index) from entry."""
    patterns = entry.get("patterns", {})
    circle = patterns.get("circle-risk-focus", "analyst")
    return CIRCLES.index(circle) if circle in CIRCLES else 0

def extract_reward(entry: Dict[str, Any]) -> float:
    """Extract reward signal from entry."""
    if entry.get("type") == "reward":
        reward_data = entry.get("reward", {})
        return reward_data.get("value", 0.0)
    return 0.0

def convert_to_dt_format(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert metrics entries to DT training format."""
    trajectories = []
    current_run = None
    trajectory = {"states": [], "actions": [], "rewards": [], "timesteps": []}
    
    for entry in entries:
        run_id = entry.get("run_id")
        entry_type = entry.get("type", "")
        
        if run_id != current_run:
            if trajectory["states"]:
                # Compute returns-to-go (cumulative future rewards)
                trajectory["returns_to_go"] = compute_returns_to_go(trajectory["rewards"])
                trajectories.append(trajectory)
            current_run = run_id
            trajectory = {"states": [], "actions": [], "rewards": [], "timesteps": []}
        
        if entry_type == "state":
            metrics = entry.get("metrics", {})
            metrics["governor_health"] = entry.get("governor_health", {})
            state = extract_state_vector(metrics)
            action = extract_action(entry)
            trajectory["states"].append(state)
            trajectory["actions"].append(action)
            trajectory["timesteps"].append(entry.get("cycle_index", 0))
        elif entry_type == "reward":
            reward = extract_reward(entry)
            trajectory["rewards"].append(reward)
    
    # Handle last trajectory
    if trajectory["states"]:
        trajectory["returns_to_go"] = compute_returns_to_go(trajectory["rewards"])
        trajectories.append(trajectory)
    
    return trajectories

def compute_returns_to_go(rewards: List[float], gamma: float = 0.99) -> List[float]:
    """Compute discounted returns-to-go for each timestep."""
    rtg = []
    cumulative = 0.0
    for r in reversed(rewards):
        cumulative = r + gamma * cumulative
        rtg.insert(0, cumulative)
    return rtg

def main():
    parser = argparse.ArgumentParser(description="DT Offline Training Data Converter")
    parser.add_argument("--output", type=Path, default=DT_OUTPUT)
    parser.add_argument("--stats", action="store_true", help="Show statistics only")
    args = parser.parse_args()
    
    print(f"Loading metrics from {METRICS_LOG}...")
    entries = load_metrics_log()
    print(f"Loaded {len(entries)} entries")
    
    trajectories = convert_to_dt_format(entries)
    print(f"Converted to {len(trajectories)} trajectories")
    
    if args.stats:
        total_states = sum(len(t["states"]) for t in trajectories)
        avg_length = total_states / len(trajectories) if trajectories else 0
        print(f"Total state-action pairs: {total_states}")
        print(f"Average trajectory length: {avg_length:.1f}")
        return
    
    with open(args.output, "w") as f:
        for traj in trajectories:
            f.write(json.dumps(traj) + "\n")
    print(f"Written {len(trajectories)} trajectories to {args.output}")

if __name__ == "__main__":
    main()

