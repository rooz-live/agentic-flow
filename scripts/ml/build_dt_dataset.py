#!/usr/bin/env python3
"""
Decision Transformer Dataset Builder
=====================================

Converts pattern_metrics.jsonl into DT-compatible trajectories for offline RL.

Trajectory Format:
- observations: [pattern_type, circle, depth, economic_context, pattern_state]
- actions: [no_action, throttle, enforce_budget, rollback, autocommit]
- rewards: -COD (immediate) + WSJF_delta (terminal) - risk*0.1 (shaping)
- returns_to_go: cumulative discounted future rewards

Usage:
    python scripts/ml/build_dt_dataset.py --output .goalie/dt_trajectories.jsonl
    python scripts/ml/build_dt_dataset.py --stats
"""

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Tuple
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PATTERN_METRICS = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
DT_OUTPUT = PROJECT_ROOT / ".goalie" / "dt_trajectories.jsonl"

# Pattern type encoding (11 dimensions, one-hot)
PATTERNS = [
    "safe-degrade", "safe_degrade",
    "guardrail-lock", "guardrail_lock",
    "iteration-budget", "iteration_budget",
    "observability-first", "observability_first",
    "failure-strategy", "failure_strategy",
    "adaptive-throttling", "adaptive_throttling",
    "fault-tolerance", "fault_tolerance",
    "autocommit-shadow", "autocommit_shadow",
    "replenish-circle", "replenish_circle",
    "preflight_check",
    "full_cycle_complete"
]

# Circle encoding (4 dimensions, one-hot)
CIRCLES = ["analyst", "assessor", "innovator", "intuitive", "orchestrator", "seeker"]

# Action space (5 discrete actions)
ACTIONS = ["no_action", "throttle", "enforce_budget", "rollback", "autocommit"]

# Reward function weights
REWARD_COD_WEIGHT = -1.0  # Penalize cost of delay
REWARD_WSJF_WEIGHT = 0.5  # Reward WSJF improvement
REWARD_RISK_WEIGHT = -0.1  # Penalize risk
GAMMA = 0.95  # Discount factor


def load_pattern_events() -> List[Dict[str, Any]]:
    """Load all pattern events from metrics file."""
    events = []
    if not PATTERN_METRICS.exists():
        return events
    
    with open(PATTERN_METRICS, "r") as f:
        for line in f:
            if line.strip():
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return events


def group_by_runs(events: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Group events by run_id to form trajectories."""
    runs = defaultdict(list)
    for event in events:
        run_id = event.get("run_id", "unknown")
        runs[run_id].append(event)
    
    # Sort each run by timestamp
    for run_id in runs:
        runs[run_id].sort(key=lambda e: e.get("timestamp", ""))
    
    return runs


def encode_pattern(pattern: str) -> List[float]:
    """One-hot encode pattern type (11 dimensions)."""
    # Normalize pattern name
    pattern = pattern.replace("_", "-")
    vec = [0.0] * 11
    if pattern in PATTERNS[:22]:  # First 11 unique patterns
        idx = PATTERNS[:22].index(pattern) // 2
        vec[idx] = 1.0
    return vec


def encode_circle(circle: str) -> List[float]:
    """One-hot encode circle (6 dimensions)."""
    vec = [0.0] * 6
    if circle.lower() in CIRCLES:
        idx = CIRCLES.index(circle.lower())
        vec[idx] = 1.0
    return vec


def extract_state(event: Dict[str, Any]) -> List[float]:
    """
    Extract state observation from event.
    
    State dimensions (30-50):
    - pattern_type: 11 (one-hot)
    - circle: 6 (one-hot)
    - depth: 1 (normalized 0-1)
    - economic_context: 3 (COD, WSJF, risk normalized)
    - pattern_metrics: ~10-29 (pattern-specific features)
    
    Total: ~31-50 dimensions
    """
    state = []
    
    # 1. Pattern type (11)
    state.extend(encode_pattern(event.get("pattern", "")))
    
    # 2. Circle (6)
    state.extend(encode_circle(event.get("circle", "")))
    
    # 3. Depth (1, normalized)
    depth = event.get("depth", 0)
    state.append(min(depth / 5.0, 1.0))  # Normalize to [0, 1], cap at 5
    
    # 4. Economic context (3)
    econ = event.get("economic", {})
    cod = econ.get("cost_of_delay", 0) / 10000.0  # Normalize
    wsjf = econ.get("wsjf_score", 0) / 10000.0
    risk = econ.get("risk_score", 0) / 10.0
    state.extend([cod, wsjf, risk])
    
    # 5. Pattern-specific metrics (variable, pad to 10)
    pattern_features = extract_pattern_features(event)
    state.extend(pattern_features)
    
    # Pad to fixed length (31)
    while len(state) < 31:
        state.append(0.0)
    
    return state[:31]  # Cap at 31 dimensions


def extract_pattern_features(event: Dict[str, Any]) -> List[float]:
    """Extract pattern-specific features from event data."""
    features = []
    data = event.get("data", {})
    pattern = event.get("pattern", "")
    
    if "safe" in pattern:
        features.append(float(data.get("trigger_count", 0)))
    elif "iteration" in pattern or "budget" in pattern:
        features.append(float(data.get("requested", 0)) / 10.0)
        features.append(float(data.get("enforced", 0)) / 10.0)
        features.append(float(data.get("saved", 0)) / 10.0)
    elif "observability" in pattern:
        features.append(float(data.get("metrics_written", 0)) / 100.0)
        features.append(float(data.get("missing_signals", 0)) / 10.0)
    elif "preflight" in pattern:
        features.append(1.0 if data.get("status") == "passed" else 0.0)
    elif "full_cycle" in pattern:
        features.append(1.0)  # Terminal state marker
    
    # Pad to 10 dimensions
    while len(features) < 10:
        features.append(0.0)
    
    return features[:10]


def infer_action(event: Dict[str, Any], next_event: Dict[str, Any] = None) -> int:
    """
    Infer action taken based on event and next state.
    
    Actions:
    0 = no_action (observability, logging)
    1 = throttle (adaptive-throttling, safe-degrade)
    2 = enforce_budget (iteration-budget enforcement)
    3 = rollback (safe-degrade, failure-strategy)
    4 = autocommit (autocommit-shadow, full-cycle-complete)
    """
    pattern = event.get("pattern", "")
    mode = event.get("mode", "advisory")
    data = event.get("data", {})
    
    if "throttling" in pattern or ("safe" in pattern and mode == "mutate"):
        return 1  # throttle
    elif "budget" in pattern and mode in ["enforcement", "mutate"]:
        return 2  # enforce_budget
    elif "failure" in pattern or (data.get("trigger") and mode == "mutate"):
        return 3  # rollback
    elif "autocommit" in pattern or "full_cycle" in pattern:
        return 4  # autocommit
    else:
        return 0  # no_action


def calculate_reward(event: Dict[str, Any], next_event: Dict[str, Any] = None) -> float:
    """
    Calculate reward for this transition.
    
    Reward = -COD (immediate cost) + WSJF_delta (improvement) - risk*0.1
    """
    econ = event.get("economic", {})
    cod = econ.get("cost_of_delay", 0)
    wsjf = econ.get("wsjf_score", 0)
    risk = econ.get("risk_score", 0)
    
    # Immediate cost of delay penalty
    reward = REWARD_COD_WEIGHT * (cod / 1000.0)
    
    # WSJF improvement reward (if next event exists)
    if next_event:
        next_econ = next_event.get("economic", {})
        next_wsjf = next_econ.get("wsjf_score", 0)
        wsjf_delta = next_wsjf - wsjf
        reward += REWARD_WSJF_WEIGHT * (wsjf_delta / 100.0)
    
    # Risk shaping penalty
    reward += REWARD_RISK_WEIGHT * risk
    
    # Terminal reward bonus for cycle completion
    if event.get("pattern") == "full_cycle_complete":
        reward += 5.0
    
    return reward


def build_trajectory(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Build single trajectory from event sequence.
    
    Returns:
        {
            "observations": List[List[float]],  # States
            "actions": List[int],                # Actions
            "rewards": List[float],              # Immediate rewards
            "returns_to_go": List[float],        # Cumulative returns
            "timesteps": List[int],              # Timestep indices
            "run_id": str,
            "length": int
        }
    """
    if not events:
        return None
    
    observations = []
    actions = []
    rewards = []
    timesteps = []
    
    for i, event in enumerate(events):
        # Extract state
        state = extract_state(event)
        observations.append(state)
        
        # Infer action
        next_event = events[i + 1] if i + 1 < len(events) else None
        action = infer_action(event, next_event)
        actions.append(action)
        
        # Calculate reward
        reward = calculate_reward(event, next_event)
        rewards.append(reward)
        
        # Timestep
        timesteps.append(i)
    
    # Compute returns-to-go
    returns_to_go = []
    rtg = 0.0
    for r in reversed(rewards):
        rtg = r + GAMMA * rtg
        returns_to_go.insert(0, rtg)
    
    return {
        "observations": observations,
        "actions": actions,
        "rewards": rewards,
        "returns_to_go": returns_to_go,
        "timesteps": timesteps,
        "run_id": events[0].get("run_id", "unknown"),
        "length": len(events)
    }


def filter_valid_trajectories(trajectories: List[Dict[str, Any]], min_length: int = 3) -> List[Dict[str, Any]]:
    """Filter out trajectories that are too short or invalid."""
    valid = []
    for traj in trajectories:
        if traj and traj["length"] >= min_length:
            # Verify arrays match in length
            if (len(traj["observations"]) == len(traj["actions"]) == 
                len(traj["rewards"]) == len(traj["returns_to_go"])):
                valid.append(traj)
    return valid


def compute_statistics(trajectories: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute dataset statistics."""
    if not trajectories:
        return {"error": "No trajectories"}
    
    lengths = [t["length"] for t in trajectories]
    returns = [t["returns_to_go"][0] for t in trajectories if t["returns_to_go"]]
    
    # Action distribution
    action_counts = defaultdict(int)
    for traj in trajectories:
        for action in traj["actions"]:
            action_counts[ACTIONS[action]] += 1
    
    total_actions = sum(action_counts.values())
    action_dist = {k: v / total_actions for k, v in action_counts.items()}
    
    return {
        "num_trajectories": len(trajectories),
        "total_transitions": sum(lengths),
        "avg_length": np.mean(lengths),
        "min_length": np.min(lengths),
        "max_length": np.max(lengths),
        "avg_return": np.mean(returns) if returns else 0.0,
        "std_return": np.std(returns) if returns else 0.0,
        "action_distribution": action_dist,
        "state_dim": len(trajectories[0]["observations"][0]) if trajectories else 0,
        "action_space": len(ACTIONS)
    }


def main():
    parser = argparse.ArgumentParser(description="Build DT Dataset from Pattern Metrics")
    parser.add_argument("--output", type=Path, default=DT_OUTPUT, help="Output file")
    parser.add_argument("--stats", action="store_true", help="Show statistics only")
    parser.add_argument("--min-length", type=int, default=3, help="Min trajectory length")
    args = parser.parse_args()
    
    print("📊 Loading pattern events...")
    events = load_pattern_events()
    print(f"   Loaded {len(events)} events")
    
    print("🔄 Grouping by run_id...")
    runs = group_by_runs(events)
    print(f"   Found {len(runs)} unique runs")
    
    print("🏗️  Building trajectories...")
    trajectories = []
    for run_id, run_events in runs.items():
        traj = build_trajectory(run_events)
        if traj:
            trajectories.append(traj)
    
    print(f"   Built {len(trajectories)} raw trajectories")
    
    print("✅ Filtering valid trajectories...")
    valid = filter_valid_trajectories(trajectories, min_length=args.min_length)
    print(f"   {len(valid)} valid trajectories (min_length={args.min_length})")
    
    stats = compute_statistics(valid)
    
    print("\n📈 Dataset Statistics:")
    print(f"   Trajectories: {stats['num_trajectories']}")
    print(f"   Total transitions: {stats['total_transitions']}")
    print(f"   Avg length: {stats['avg_length']:.1f} (min={stats['min_length']}, max={stats['max_length']})")
    print(f"   Avg return: {stats['avg_return']:.2f} ± {stats['std_return']:.2f}")
    print(f"   State dim: {stats['state_dim']}")
    print(f"   Action space: {stats['action_space']}")
    print(f"\n   Action distribution:")
    for action, pct in stats['action_distribution'].items():
        print(f"      {action:20s} {pct:6.1%}")
    
    if args.stats:
        return
    
    print(f"\n💾 Writing trajectories to {args.output}...")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w") as f:
        for traj in valid:
            f.write(json.dumps(traj) + "\n")
    
    print(f"✅ Wrote {len(valid)} trajectories")


if __name__ == "__main__":
    main()
