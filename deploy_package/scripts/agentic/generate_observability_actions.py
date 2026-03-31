#!/usr/bin/env python3
"""generate_observability_actions.py

Auto-generate observability actions from pattern_metrics.jsonl.
This script reads pattern metrics and generates OBSERVABILITY_ACTIONS.yaml entries
for patterns that have high COD but no corresponding observability actions.

Design goals:
- Read pattern_metrics.jsonl and PATTERNS.yaml
- Identify patterns with high COD and missing observability
- Generate OBSERVABILITY_ACTIONS.yaml entries
- Integrate with `af suggest-actions` workflow
"""

from __future__ import annotations

import json
import yaml
from pathlib import Path
from typing import List, Dict, Any, Set
import sys
from collections import defaultdict


def load_patterns_yaml(project_root: Path) -> Dict[str, Dict[str, Any]]:
    """Load PATTERNS.yaml and return a dict mapping pattern ID to pattern definition."""
    patterns_path = project_root / ".goalie" / "PATTERNS.yaml"
    if not patterns_path.exists():
        return {}
    
    with patterns_path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    
    patterns = {}
    for pattern in data.get("patterns", []):
        patterns[pattern["id"]] = pattern
    
    return patterns


def load_pattern_metrics(project_root: Path) -> List[Dict[str, Any]]:
    """Load pattern_metrics.jsonl and return list of pattern events."""
    metrics_path = project_root / ".goalie" / "pattern_metrics.jsonl"
    if not metrics_path.exists():
        return []
    
    events = []
    with metrics_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
                events.append(event)
            except json.JSONDecodeError:
                continue
    
    return events


def load_existing_observability_actions(project_root: Path) -> Set[str]:
    """Load existing OBSERVABILITY_ACTIONS.yaml and return set of pattern IDs that already have actions."""
    actions_path = project_root / ".goalie" / "OBSERVABILITY_ACTIONS.yaml"
    if not actions_path.exists():
        return set()
    
    with actions_path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    
    patterns_with_actions = set()
    for item in data.get("items", []):
        pattern = item.get("pattern")
        if pattern:
            patterns_with_actions.add(pattern)
    
    return patterns_with_actions


def compute_pattern_gaps(
    events: List[Dict[str, Any]],
    patterns: Dict[str, Dict[str, Any]],
    existing_actions: Set[str],
    cod_threshold: float = 100.0
) -> List[Dict[str, Any]]:
    """Compute patterns with high COD that need observability actions."""
    # Aggregate by pattern, circle, depth
    agg: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "pattern": "",
        "circle": "",
        "depth": 0,
        "cod_values": [],
        "count": 0,
        "frameworks": set(),
        "schedulers": set(),
        "workload_tags": set(),
    })
    
    for event in events:
        pattern = event.get("pattern", "")
        if not pattern or pattern not in patterns:
            continue
        
        # Skip if already has observability action
        if pattern in existing_actions:
            continue
        
        circle = event.get("circle", "n/a")
        depth = event.get("depth", 0)
        key = f"{pattern}|{circle}|{depth}"
        
        economic = event.get("economic", {})
        cod = economic.get("cod")
        if cod is None:
            continue
        
        agg[key]["pattern"] = pattern
        agg[key]["circle"] = circle
        agg[key]["depth"] = depth
        agg[key]["cod_values"].append(cod)
        agg[key]["count"] += 1
        
        framework = event.get("framework")
        if framework:
            agg[key]["frameworks"].add(framework)
        
        scheduler = event.get("scheduler")
        if scheduler:
            agg[key]["schedulers"].add(scheduler)
        
        tags = event.get("tags", [])
        for tag in tags:
            if tag in ["ML", "HPC", "Stats", "Device/Web"]:
                agg[key]["workload_tags"].add(tag)
    
    # Filter by COD threshold and compute averages
    gaps = []
    for key, data in agg.items():
        if not data["cod_values"]:
            continue
        
        cod_avg = sum(data["cod_values"]) / len(data["cod_values"])
        if cod_avg < cod_threshold:
            continue
        
        pattern_def = patterns.get(data["pattern"], {})
        gaps.append({
            "pattern": data["pattern"],
            "circle": data["circle"],
            "depth": data["depth"],
            "cod_avg": cod_avg,
            "count": data["count"],
            "frameworks": sorted(data["frameworks"]),
            "schedulers": sorted(data["schedulers"]),
            "workload_tags": sorted(data["workload_tags"]),
            "pattern_def": pattern_def,
        })
    
    # Sort by COD descending
    gaps.sort(key=lambda x: x["cod_avg"], reverse=True)
    return gaps


def generate_observability_action(gap: Dict[str, Any], ts: str) -> Dict[str, Any]:
    """Generate an observability action entry from a gap."""
    pattern = gap["pattern"]
    pattern_def = gap.get("pattern_def", {})
    
    # Generate title
    name = pattern_def.get("name", pattern.replace("-", " ").title())
    title = f"Add observability for {name}"
    
    # Determine observability type based on pattern
    observability_type = "metrics"
    if "failure" in pattern or "corruption" in pattern:
        observability_type = "alerting"
    elif "network" in pattern or "bottleneck" in pattern:
        observability_type = "tracing"
    elif "degrade" in pattern or "fallback" in pattern:
        observability_type = "logging"
    
    # Generate tags
    tags = ["observability-gap", "technical-radar:logging-metrics"]
    tags.extend(gap["workload_tags"])
    
    # Generate action ID
    safe_ts = ts.replace(" ", "_").replace(":", "").replace("-", "").replace("T", "_").replace("Z", "")
    action_id = f"OBS-{pattern.upper().replace('-', '-')}-{safe_ts[:8]}"
    
    action = {
        "id": action_id,
        "title": title,
        "category": "observability",
        "source": "pattern_metrics",
        "timestamp": ts,
        "depth": gap["depth"],
        "circle": gap["circle"],
        "pattern": pattern,
        "tags": tags,
        "status": "pending",
        "observability_type": observability_type,
    }
    
    if gap["frameworks"]:
        action["framework_hint"] = "|".join(gap["frameworks"])
    
    if gap["schedulers"]:
        action["scheduler_hint"] = "|".join(gap["schedulers"])
    
    return action


def main() -> int:
    script_path = Path(__file__).resolve()
    project_root = script_path.parents[2]
    goalie_dir = project_root / ".goalie"
    goalie_dir.mkdir(parents=True, exist_ok=True)
    
    # Load data
    patterns = load_patterns_yaml(project_root)
    events = load_pattern_metrics(project_root)
    existing_actions = load_existing_observability_actions(project_root)
    
    if not patterns:
        sys.stderr.write("Warning: PATTERNS.yaml not found. Using pattern metrics only.\n")
    
    if not events:
        sys.stdout.write("No pattern metrics found.\n")
        return 0
    
    # Compute gaps
    gaps = compute_pattern_gaps(events, patterns, existing_actions, cod_threshold=100.0)
    
    if not gaps:
        sys.stdout.write("No high-COD patterns found that need observability actions.\n")
        return 0
    
    # Generate actions
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    
    actions_path = goalie_dir / "OBSERVABILITY_ACTIONS.yaml"
    exists_before = actions_path.exists()
    
    new_actions = []
    for gap in gaps[:20]:  # Limit to top 20
        action = generate_observability_action(gap, ts)
        new_actions.append(action)
    
    # Append to file
    with actions_path.open("a", encoding="utf-8") as f:
        if not exists_before:
            f.write("---\n")
            f.write("# Observability / Logging / Metrics Gap Actions (auto-generated)\n")
            f.write("items:\n")
        
        for action in new_actions:
            f.write(f"  - id: {action['id']}\n")
            f.write(f"    title: \"{action['title']}\"\n")
            f.write(f"    category: {action['category']}\n")
            f.write(f"    source: {action['source']}\n")
            f.write(f"    timestamp: \"{action['timestamp']}\"\n")
            f.write(f"    depth: {action['depth']}\n")
            f.write(f"    circle: \"{action['circle']}\"\n")
            f.write(f"    pattern: \"{action['pattern']}\"\n")
            f.write(f"    tags: {json.dumps(action['tags'])}\n")
            f.write(f"    status: {action['status']}\n")
            f.write(f"    observability_type: {action['observability_type']}\n")
            if "framework_hint" in action:
                f.write(f"    framework_hint: \"{action['framework_hint']}\"\n")
            if "scheduler_hint" in action:
                f.write(f"    scheduler_hint: \"{action['scheduler_hint']}\"\n")
            f.write("\n")
    
    sys.stdout.write(f"Generated {len(new_actions)} observability actions.\n")
    sys.stdout.write(f"Top gaps:\n")
    for gap in gaps[:5]:
        sys.stdout.write(f"  - {gap['pattern']} (circle={gap['circle']}, depth={gap['depth']}, cod_avg={gap['cod_avg']:.2f})\n")
    
    return 0


if __name__ == "__main__":
    try:
        import yaml
    except ImportError:
        sys.stderr.write("Error: PyYAML not installed. Install with: pip install pyyaml\n")
        sys.exit(1)
    
    raise SystemExit(main())

