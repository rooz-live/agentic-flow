#!/usr/bin/env python3
"""
Log pattern events to .goalie/pattern_metrics.jsonl conforming to schema v1.0

Usage:
    python log_pattern_event.py \
        --pattern safe-degrade \
        --circle analyst \
        --depth 2 \
        --trigger-reason high_load \
        --degraded-to read-only

Environment variables:
    AF_RUN_KIND: Run type (prod-cycle, full-cycle, etc.)
    AF_RUN_ID: Unique run identifier
    AF_RUN_ITERATION: Cycle index
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


def get_env_or_default(key: str, default: str = "") -> str:
    """Get environment variable or default value."""
    return os.getenv(key, default)


def create_base_event(
    pattern: str,
    circle: str,
    depth: int,
    mode: str = "advisory",
    mutation: bool = False,
    gate: str = "health",
    framework: str = "",
    scheduler: str = "",
    tags: Optional[List[str]] = None,
    cod: float = 0.0,
    wsjf_score: float = 0.0,
) -> Dict[str, Any]:
    """Create base pattern event with required fields."""
    
    # Get run context from environment
    run_kind = get_env_or_default("AF_RUN_KIND", "prod-cycle")
    run_id = get_env_or_default("AF_RUN_ID", f"manual-{datetime.utcnow().timestamp()}")
    iteration = int(get_env_or_default("AF_RUN_ITERATION", "1"))
    
    return {
        "ts": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "run": run_kind,
        "run_id": run_id,
        "iteration": iteration,
        "circle": circle,
        "depth": depth,
        "pattern": pattern,
        "mode": mode,
        "mutation": mutation,
        "gate": gate,
        "framework": framework,
        "scheduler": scheduler,
        "tags": tags or [],
        "economic": {
            "cod": cod,
            "wsjf_score": wsjf_score,
        },
    }


def log_guardrail_lock_event(
    circle: str,
    depth: int,
    enforced: int,
    health_state: str,
    user_requests: int = 0,
    lock_reason: str = "",
    **kwargs
) -> Dict[str, Any]:
    """Log guardrail-lock pattern event."""
    event = create_base_event(
        pattern="guardrail-lock",
        circle=circle,
        depth=depth,
        mode="enforcement" if enforced else "advisory",
        mutation=bool(enforced),
        gate="health",
        tags=["HPC"],
        **kwargs
    )
    
    event.update({
        "enforced": enforced,
        "health_state": health_state,
        "user_requests": user_requests,
        "lock_reason": lock_reason,
    })
    
    return event


def log_observability_first_event(
    circle: str,
    depth: int,
    metrics_written: int,
    missing_signals: int = 0,
    suggestion_made: int = 0,
    **kwargs
) -> Dict[str, Any]:
    """Log observability-first pattern event."""
    event = create_base_event(
        pattern="observability-first",
        circle=circle,
        depth=depth,
        mode="advisory",
        mutation=False,
        gate="health",
        tags=["Federation"],
        **kwargs
    )
    
    event.update({
        "metrics_written": metrics_written,
        "missing_signals": missing_signals,
        "suggestion_made": suggestion_made,
    })
    
    return event


def write_event(event: Dict[str, Any], output_file: str = None):
    """Write event to pattern_metrics.jsonl."""
    if output_file is None:
        project_root = Path(__file__).parent.parent
        output_file = str(project_root / ".goalie" / "pattern_metrics.jsonl")
    
    # Ensure directory exists
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    
    # Append event as single-line JSON
    with open(output_file, "a") as f:
        f.write(json.dumps(event, separators=(',', ':')) + "\n")
    
    return event


if __name__ == "__main__":
    # Simple CLI for common patterns
    parser = argparse.ArgumentParser(description="Log pattern events")
    parser.add_argument("--pattern", required=True)
    parser.add_argument("--circle", required=True)
    parser.add_argument("--depth", type=int, required=True)
    parser.add_argument("--enforced", type=int, default=0)
    parser.add_argument("--health-state", default="unknown")
    parser.add_argument("--metrics-written", type=int, default=0)
    
    args = parser.parse_args()
    
    if args.pattern == "guardrail-lock":
        event = log_guardrail_lock_event(
            circle=args.circle,
            depth=args.depth,
            enforced=args.enforced,
            health_state=args.health_state,
        )
        write_event(event)
        print(f"Logged guardrail-lock event", file=sys.stderr)
    elif args.pattern == "observability-first":
        event = log_observability_first_event(
            circle=args.circle,
            depth=args.depth,
            metrics_written=args.metrics_written,
        )
        write_event(event)
        print(f"Logged observability-first event", file=sys.stderr)
