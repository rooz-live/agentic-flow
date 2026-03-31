#!/usr/bin/env python3
"""
Prompt Intent Coverage Metric

Measures how well executed patterns align with required intent atoms.
Intent atoms are the fundamental patterns that should be hit for a given prompt/task.

Usage:
    python3 cmd_prompt_intent_coverage.py --correlation-id <run_id> --json
    python3 cmd_prompt_intent_coverage.py --since-minutes 60 --required-pattern observability_first
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Set
from collections import defaultdict

PROJECT_ROOT = os.environ.get("PROJECT_ROOT") or os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
GOALIE_DIR = Path(PROJECT_ROOT) / ".goalie"
METRICS_FILE = GOALIE_DIR / "pattern_metrics.jsonl"
EVIDENCE_CONFIG = GOALIE_DIR / "evidence_config.json"

def load_evidence_config() -> Dict[str, Any]:
    """Load evidence config for intent coverage settings."""
    if EVIDENCE_CONFIG.exists():
        try:
            with open(EVIDENCE_CONFIG, "r") as f:
                return json.load(f)
        except:
            pass
    return {}

# Default required intent atoms by run_kind/gate
DEFAULT_INTENT_ATOMS: Dict[str, List[str]] = {
    "governance": [
        "full_cycle_complete",
        "wsjf_prioritization",
        "backlog_item_scored",
    ],
    "production": [
        "observability_first",
        "safe_degrade",
        "health_check",
    ],
    "retro": [
        "retro_complete",
        "actionable_recommendations",
        "replenish_complete",
    ],
    "wsjf": [
        "wsjf_prioritization",
        "backlog_item_scored",
        "wsjf-enrichment",
    ],
    "default": [
        "observability_first",
        "safe_degrade",
    ],
    "swarm": [
        "observability_first",
        "action_completed",
        "safe_degrade",
    ],
}


def load_events(
    correlation_id: str = None,
    since_minutes: int = 0,
    run_kind_filter: str = None,
) -> List[Dict[str, Any]]:
    """Load pattern events from metrics file."""
    if not METRICS_FILE.exists():
        return []

    cutoff = None
    if since_minutes > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=since_minutes)

    events = []
    with open(METRICS_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)

                # Filter by correlation_id
                if correlation_id:
                    ev_cid = event.get("correlation_id") or event.get("run_id") or ""
                    if str(ev_cid) != str(correlation_id):
                        continue

                # Filter by run_kind
                if run_kind_filter:
                    rk = event.get("run_kind") or event.get("run") or ""
                    if str(rk) != str(run_kind_filter):
                        continue

                # Filter by time
                if cutoff:
                    ts_str = event.get("timestamp") or event.get("ts", "")
                    if ts_str:
                        try:
                            event_time = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                            if event_time < cutoff:
                                continue
                        except:
                            continue

                events.append(event)
            except json.JSONDecodeError:
                continue

    return events


def calculate_intent_coverage(
    events: List[Dict[str, Any]],
    required_patterns: List[str] = None,
) -> Dict[str, Any]:
    """Calculate prompt intent coverage metrics.

    Returns:
        - intent_coverage_pct: % of required patterns that were hit
        - patterns_hit: list of required patterns that were observed
        - patterns_missed: list of required patterns not observed
        - extra_patterns: patterns observed but not in required set
        - by_gate: breakdown by gate/run_kind
    """
    # Collect observed patterns
    observed_patterns: Set[str] = set()
    patterns_by_gate: Dict[str, Set[str]] = defaultdict(set)
    pattern_counts: Dict[str, int] = defaultdict(int)

    for event in events:
        pattern = event.get("pattern") or "unknown"
        gate = event.get("gate") or event.get("run_kind") or "default"
        observed_patterns.add(pattern)
        patterns_by_gate[gate].add(pattern)
        pattern_counts[pattern] += 1

    # Determine required patterns
    if required_patterns:
        required = set(required_patterns)
    else:
        # First check evidence_config.json for required_patterns
        config = load_evidence_config()
        intent_cfg = config.get("intent_coverage", {})
        cfg_required = intent_cfg.get("required_patterns", [])
        if cfg_required:
            required = set(cfg_required)
        else:
            # Fallback: Auto-detect from gates observed
            required = set()
            for gate in patterns_by_gate.keys():
                atoms = DEFAULT_INTENT_ATOMS.get(gate, DEFAULT_INTENT_ATOMS["default"])
                required.update(atoms)

    # Calculate coverage
    patterns_hit = required & observed_patterns
    patterns_missed = required - observed_patterns
    extra_patterns = observed_patterns - required

    coverage_pct = (len(patterns_hit) / len(required) * 100.0) if required else 0.0

    # By-gate breakdown
    by_gate = {}
    for gate, gate_patterns in patterns_by_gate.items():
        gate_required = set(DEFAULT_INTENT_ATOMS.get(gate, DEFAULT_INTENT_ATOMS["default"]))
        gate_hit = gate_required & gate_patterns
        gate_missed = gate_required - gate_patterns
        gate_cov = (len(gate_hit) / len(gate_required) * 100.0) if gate_required else 0.0
        by_gate[gate] = {
            "required": list(gate_required),
            "hit": list(gate_hit),
            "missed": list(gate_missed),
            "coverage_pct": round(gate_cov, 2),
            "total_events": sum(pattern_counts[p] for p in gate_patterns),
        }

    return {
        "intent_coverage_pct": round(coverage_pct, 2),
        "required_patterns": list(required),
        "patterns_hit": list(patterns_hit),
        "patterns_missed": list(patterns_missed),
        "extra_patterns": list(extra_patterns),
        "pattern_counts": dict(pattern_counts),
        "by_gate": by_gate,
        "total_events": len(events),
        "unique_patterns": len(observed_patterns),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Calculate prompt intent coverage metric")
    parser.add_argument("--correlation-id", default="", help="Filter by correlation/run ID")
    parser.add_argument("--since-minutes", type=int, default=0, help="Only include events from last N minutes")
    parser.add_argument("--run-kind", default="", help="Filter by run_kind")
    parser.add_argument("--required-pattern", action="append", dest="required_patterns", help="Specify required pattern (can repeat)")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    args = parser.parse_args()

    events = load_events(
        correlation_id=args.correlation_id or None,
        since_minutes=args.since_minutes,
        run_kind_filter=args.run_kind or None,
    )

    if not events:
        result = {
            "error": "No events found",
            "intent_coverage_pct": 0.0,
            "total_events": 0,
        }
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print("No events found matching criteria")
        return 1

    coverage = calculate_intent_coverage(events, args.required_patterns)
    coverage["generated_at"] = datetime.now(timezone.utc).isoformat()

    if args.json:
        print(json.dumps(coverage, indent=2))
    else:
        print(f"Intent Coverage: {coverage['intent_coverage_pct']:.1f}%")
        print(f"Required Patterns: {len(coverage['required_patterns'])}")
        print(f"Patterns Hit: {len(coverage['patterns_hit'])}")
        print(f"Patterns Missed: {len(coverage['patterns_missed'])}")
        if coverage["patterns_missed"]:
            print(f"  Missing: {', '.join(coverage['patterns_missed'])}")
        print(f"Total Events: {coverage['total_events']}")
        print(f"Unique Patterns: {coverage['unique_patterns']}")
        print("\nBy Gate:")
        for gate, gdata in coverage["by_gate"].items():
            print(f"  {gate}: {gdata['coverage_pct']:.1f}% ({len(gdata['hit'])}/{len(gdata['required'])})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
