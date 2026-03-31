#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""agentdb_pattern_integration.py
===================================

Bridge between pattern telemetry (.goalie/pattern_metrics.jsonl) and AgentDB
for learning and reflexion. Converts pattern transitions into AgentDB episodes
and skills.

Capabilities
------------
1. Parse pattern_metrics.jsonl and extract learning signals
2. Generate AgentDB reflexion entries for safe_degrade outcomes
3. Build skill library from successful pattern applications
4. Create causal memory links between patterns
5. Feed pattern outcomes to NightlyLearner for optimization

Usage
-----
# Sync recent patterns to AgentDB
python3 scripts/agentic/agentdb_pattern_integration.py --sync-recent --hours 24

# Generate reflexion entries for all safe_degrade events
python3 scripts/agentic/agentdb_pattern_integration.py --pattern safe_degrade --action reflexion

# Build skills from high-success patterns
python3 scripts/agentic/agentdb_pattern_integration.py --build-skills --min-success-rate 0.8

# Create causal memory graph
python3 scripts/agentic/agentdb_pattern_integration.py --build-causal-graph
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PATTERN_LOG = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
AGENTDB_PATH = PROJECT_ROOT / "agent-memory.db"


def _parse_pattern_event(line: str) -> Optional[Dict[str, Any]]:
    """Parse a single JSONL line from pattern_metrics.jsonl."""
    try:
        return json.loads(line.strip())
    except json.JSONDecodeError:
        return None


def _read_recent_patterns(hours: int = 24) -> List[Dict[str, Any]]:
    """Read pattern events from the last N hours."""
    if not PATTERN_LOG.exists():
        return []
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    events: List[Dict[str, Any]] = []
    
    with PATTERN_LOG.open("r", encoding="utf-8") as f:
        for line in f:
            event = _parse_pattern_event(line)
            if not event:
                continue
            
            # Parse timestamp
            ts_str = event.get("ts", "")
            try:
                event_time = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                if event_time >= cutoff:
                    events.append(event)
            except (ValueError, AttributeError):
                continue
    
    return events


def _init_agentdb() -> sqlite3.Connection:
    """Initialize AgentDB SQLite database if not exists."""
    db = sqlite3.connect(str(AGENTDB_PATH))
    db.row_factory = sqlite3.Row
    
    # Create episodes table for reflexion
    db.execute("""
        CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL,
            session_id TEXT NOT NULL,
            task TEXT NOT NULL,
            input TEXT,
            output TEXT,
            critique TEXT,
            reward REAL DEFAULT 0.0,
            success BOOLEAN DEFAULT 0,
            latency_ms INTEGER,
            tokens_used INTEGER,
            tags TEXT,
            metadata TEXT
        )
    """)
    
    # Create skills table
    db.execute("""
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            signature TEXT NOT NULL,
            code TEXT,
            success_rate REAL DEFAULT 0.0,
            uses INTEGER DEFAULT 0,
            avg_reward REAL DEFAULT 0.0,
            created_from_episode INTEGER,
            metadata TEXT
        )
    """)
    
    # Create causal memory edges
    db.execute("""
        CREATE TABLE IF NOT EXISTS causal_edges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_pattern TEXT NOT NULL,
            to_pattern TEXT NOT NULL,
            from_circle TEXT,
            to_circle TEXT,
            transition_count INTEGER DEFAULT 1,
            avg_outcome_score REAL DEFAULT 0.0,
            metadata TEXT
        )
    """)
    
    db.commit()
    return db


def store_pattern_as_episode(db: sqlite3.Connection, event: Dict[str, Any]) -> int:
    """Convert pattern event to AgentDB episode (reflexion entry)."""
    pattern = event.get("pattern", "unknown")
    circle = event.get("circle", "unknown")
    depth = event.get("depth", 0)
    pattern_state = event.get("pattern_state", {})
    observability = event.get("observability", {})
    
    # Extract outcome signals
    if pattern == "safe_degrade":
        triggers = pattern_state.get("safe_degrade", {}).get("triggers", 0)
        actions = pattern_state.get("safe_degrade", {}).get("actions", [])
        recovery_cycles = pattern_state.get("safe_degrade", {}).get("recovery_cycles", 0)
        
        # High triggers = low reward (system stressed)
        reward = max(0.0, 1.0 - (triggers * 0.2))
        success = recovery_cycles > 0
        critique = f"safe_degrade triggered {triggers} times. Actions: {', '.join(actions)}. Recovery cycles: {recovery_cycles}"
    
    elif pattern == "guardrail_lock":
        enforced = pattern_state.get("guardrail_lock", {}).get("enforced", 0)
        health_state = pattern_state.get("guardrail_lock", {}).get("health_state", "unknown")
        
        reward = 0.9 if health_state == "green" else (0.5 if health_state == "amber" else 0.2)
        success = enforced == 1
        critique = f"guardrail_lock enforced={enforced}, health_state={health_state}"
    
    elif pattern == "iteration_budget":
        requested = pattern_state.get("iteration_budget", {}).get("requested", 0)
        enforced = pattern_state.get("iteration_budget", {}).get("enforced", 0)
        
        # Closer to requested = better
        reward = enforced / requested if requested > 0 else 0.0
        success = enforced >= requested
        critique = f"iteration_budget requested={requested}, enforced={enforced}"
    
    else:
        # Generic pattern
        reward = 0.5
        success = True
        critique = f"Pattern {pattern} executed in circle {circle} at depth {depth}"
    
    ts = int(datetime.fromisoformat(event.get("ts", datetime.now(timezone.utc).isoformat()).replace("Z", "+00:00")).timestamp())
    
    cursor = db.execute("""
        INSERT INTO episodes (
            ts, session_id, task, input, output, critique, reward, success, 
            latency_ms, tokens_used, tags, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ts,
        observability.get("host", "unknown"),
        f"{pattern}:{circle}",
        json.dumps({"depth": depth, "gate": event.get("gate")}),
        json.dumps(pattern_state),
        critique,
        reward,
        1 if success else 0,
        None,  # latency not tracked in patterns
        None,  # tokens not tracked in patterns
        json.dumps([pattern, circle, f"depth:{depth}"]),
        json.dumps(observability)
    ))
    
    db.commit()
    return cursor.lastrowid


def build_skills_from_patterns(db: sqlite3.Connection, min_success_rate: float = 0.8) -> int:
    """Consolidate successful pattern applications into reusable skills."""
    # Find patterns with high success rates
    cursor = db.execute("""
        SELECT 
            task,
            COUNT(*) as attempts,
            AVG(reward) as avg_reward,
            SUM(success) * 1.0 / COUNT(*) as success_rate
        FROM episodes
        WHERE task LIKE '%:%'  -- pattern:circle format
        GROUP BY task
        HAVING success_rate >= ? AND attempts >= 3
    """, (min_success_rate,))
    
    skills_created = 0
    
    for row in cursor:
        task = row["task"]
        pattern, circle = task.split(":", 1) if ":" in task else (task, "unknown")
        
        # Check if skill already exists
        existing = db.execute("SELECT id FROM skills WHERE name = ?", (task,)).fetchone()
        if existing:
            continue
        
        # Create skill
        db.execute("""
            INSERT INTO skills (
                name, description, signature, code, success_rate, uses, avg_reward, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            task,
            f"Successful application of {pattern} pattern in {circle} circle",
            json.dumps({"pattern": pattern, "circle": circle}),
            f"# Apply {pattern} pattern\n# Success rate: {row['success_rate']:.2%}\n# Avg reward: {row['avg_reward']:.2f}",
            row["success_rate"],
            row["attempts"],
            row["avg_reward"],
            json.dumps({"consolidated_at": datetime.now(timezone.utc).isoformat()})
        ))
        
        skills_created += 1
    
    db.commit()
    return skills_created


def build_causal_graph(db: sqlite3.Connection) -> int:
    """Build causal memory graph from pattern transitions."""
    # Read all patterns
    events = _read_recent_patterns(hours=24 * 7)  # Last week
    
    edges_created = 0
    
    # Track consecutive patterns (transitions)
    for i in range(len(events) - 1):
        current = events[i]
        next_event = events[i + 1]
        
        from_pattern = current.get("pattern")
        to_pattern = next_event.get("pattern")
        from_circle = current.get("circle")
        to_circle = next_event.get("circle")
        
        if not from_pattern or not to_pattern:
            continue
        
        # Check if edge exists
        existing = db.execute("""
            SELECT id, transition_count, avg_outcome_score 
            FROM causal_edges 
            WHERE from_pattern = ? AND to_pattern = ? AND from_circle = ? AND to_circle = ?
        """, (from_pattern, to_pattern, from_circle, to_circle)).fetchone()
        
        # Compute outcome score (based on next pattern's success)
        next_state = next_event.get("pattern_state", {})
        outcome_score = 0.5  # neutral
        
        if to_pattern == "safe_degrade":
            triggers = next_state.get("safe_degrade", {}).get("triggers", 0)
            outcome_score = max(0.0, 1.0 - (triggers * 0.2))
        
        if existing:
            # Update existing edge
            new_count = existing["transition_count"] + 1
            new_avg = ((existing["avg_outcome_score"] * existing["transition_count"]) + outcome_score) / new_count
            
            db.execute("""
                UPDATE causal_edges 
                SET transition_count = ?, avg_outcome_score = ?
                WHERE id = ?
            """, (new_count, new_avg, existing["id"]))
        else:
            # Create new edge
            db.execute("""
                INSERT INTO causal_edges (
                    from_pattern, to_pattern, from_circle, to_circle, 
                    transition_count, avg_outcome_score, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                from_pattern, to_pattern, from_circle, to_circle,
                1, outcome_score,
                json.dumps({"created_at": datetime.now(timezone.utc).isoformat()})
            ))
            
            edges_created += 1
    
    db.commit()
    return edges_created


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="AgentDB pattern telemetry integration")
    parser.add_argument("--sync-recent", action="store_true", help="Sync recent patterns to AgentDB")
    parser.add_argument("--hours", type=int, default=24, help="Hours of recent data to sync")
    parser.add_argument("--pattern", help="Filter by specific pattern (e.g., safe_degrade)")
    parser.add_argument("--action", choices=["reflexion", "skills", "causal"], help="Action to perform")
    parser.add_argument("--build-skills", action="store_true", help="Build skill library from patterns")
    parser.add_argument("--min-success-rate", type=float, default=0.8, help="Minimum success rate for skills")
    parser.add_argument("--build-causal-graph", action="store_true", help="Build causal memory graph")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    
    db = _init_agentdb()
    
    if args.sync_recent:
        events = _read_recent_patterns(hours=args.hours)
        
        if args.pattern:
            events = [e for e in events if e.get("pattern") == args.pattern]
        
        episodes_created = 0
        for event in events:
            try:
                store_pattern_as_episode(db, event)
                episodes_created += 1
            except Exception as e:
                print(f"Warning: Failed to store event: {e}")
        
        print(f"Synced {episodes_created} pattern events to AgentDB episodes")
    
    if args.build_skills or args.action == "skills":
        skills_created = build_skills_from_patterns(db, args.min_success_rate)
        print(f"Created {skills_created} new skills from successful patterns")
    
    if args.build_causal_graph or args.action == "causal":
        edges_created = build_causal_graph(db)
        print(f"Created {edges_created} new causal memory edges")
    
    db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
