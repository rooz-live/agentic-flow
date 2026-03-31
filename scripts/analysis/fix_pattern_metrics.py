#!/usr/bin/env python3
"""
Fix Pattern Metrics Schema Violations

This script repairs pattern_metrics.jsonl to conform to PATTERN_EVENT_SCHEMA.json:
1. Adds missing required fields with sensible defaults
2. Ensures 'pattern:kebab-name' matches 'pattern'
3. Adds missing economic.cod and economic.wsjf_score
4. Ensures proper 'run' and 'run_id' fields
5. Normalizes circle names to lowercase enum values
6. Adds proper 'reason', 'action', and 'prod_mode' fields
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any


def normalize_circle(circle: str) -> str:
    """Normalize circle name to schema enum values"""
    circle_lower = circle.lower()
    valid_circles = ["analyst", "assessor", "innovator", "intuitive", "orchestrator", "seeker", "governance", "retro", "unknown"]
    
    if circle_lower in valid_circles:
        return circle_lower
    
    # Handle variations
    if circle_lower == "pre-flight":
        return "orchestrator"
    
    return "unknown"


def normalize_mode(mode: str) -> str:
    """Normalize mode to schema enum values"""
    if mode in ["advisory", "mutate", "enforcement"]:
        return mode
    if mode == "enforce":
        return "enforcement"
    return "advisory"


def extract_metadata_field(event: Dict[str, Any], field: str, default: Any) -> Any:
    """Extract field from metadata or return default"""
    metadata = event.get("metadata", {})
    return metadata.get(field, default)


def fix_event(event: Dict[str, Any], line_num: int) -> Dict[str, Any]:
    """Fix a single event to conform to schema"""
    fixed = event.copy()
    
    # 1. Ensure 'run' field exists
    if "run" not in fixed:
        fixed["run"] = "prod-cycle"
    
    # 2. Ensure 'run_id' field exists
    if "run_id" not in fixed:
        # Try to extract from metadata or generate from timestamp
        ts = fixed.get("ts", "unknown")
        fixed["run_id"] = f"run-{ts.replace(':', '').replace('-', '').replace('.', '')}"
    
    # 3. Normalize circle
    if "circle" in fixed:
        fixed["circle"] = normalize_circle(fixed["circle"])
    else:
        fixed["circle"] = "orchestrator"
    
    # 4. Ensure 'pattern:kebab-name' matches 'pattern'
    if "pattern" in fixed:
        fixed["pattern:kebab-name"] = fixed["pattern"]
    
    # 5. Normalize mode
    if "mode" in fixed:
        fixed["mode"] = normalize_mode(fixed["mode"])
    else:
        fixed["mode"] = "advisory"
    
    # 6. Ensure economic scoring exists
    if "economic" not in fixed:
        fixed["economic"] = {}
    
    economic = fixed["economic"]
    if "cod" not in economic:
        economic["cod"] = extract_metadata_field(fixed, "cod", 0.0)
    if "wsjf_score" not in economic:
        economic["wsjf_score"] = extract_metadata_field(fixed, "wsjf_score", 0.0)
    
    fixed["economic"] = economic
    
    # 7. Extract fields from metadata if they exist at top level
    metadata_fields = ["framework", "scheduler", "ts"]
    for field in metadata_fields:
        if field not in fixed:
            value = extract_metadata_field(fixed, field, "")
            if field == "ts" and not value:
                # If ts is missing entirely, use a default
                value = "2025-12-02T00:00:00Z"
            fixed[field] = value
    
    # Ensure framework and scheduler are strings (not None)
    if fixed.get("framework") is None:
        fixed["framework"] = ""
    if fixed.get("scheduler") is None:
        fixed["scheduler"] = ""
    
    # 8. Ensure 'reason' field exists
    if "reason" not in fixed:
        # Try to extract from metadata
        reason = extract_metadata_field(fixed, "reason", None)
        if reason:
            fixed["reason"] = reason
        else:
            # Generate from pattern and action
            pattern = fixed.get("pattern", "unknown")
            action = extract_metadata_field(fixed, "action", None)
            if action:
                fixed["reason"] = f"{pattern}: {action}"
            else:
                fixed["reason"] = f"{pattern} pattern execution"
    
    # 9. Ensure 'action' field exists
    if "action" not in fixed:
        action = extract_metadata_field(fixed, "action", None)
        if action:
            fixed["action"] = action
        else:
            # Generate based on mode
            mode = fixed.get("mode", "advisory")
            if mode == "enforcement":
                fixed["action"] = "enforce"
            elif mode == "mutate":
                fixed["action"] = "mutate"
            else:
                fixed["action"] = "monitor"
    
    # 10. Ensure 'prod_mode' field exists
    if "prod_mode" not in fixed:
        # Use mode as default
        fixed["prod_mode"] = fixed.get("mode", "advisory")
    
    # 11. Ensure tags is a list
    if "tags" not in fixed:
        fixed["tags"] = []
    elif not isinstance(fixed["tags"], list):
        fixed["tags"] = []
    
    # Filter tags to only include valid ones
    valid_tags = ["Federation", "ML", "HPC", "Stats", "Device/Web", "Observability", "Forensic", "Rust"]
    fixed["tags"] = [tag for tag in fixed["tags"] if tag in valid_tags]
    
    # Add tags based on pattern if tags are empty
    if not fixed["tags"]:
        pattern = fixed.get("pattern", "")
        # Add HPC tag for HPC-related patterns
        if pattern in ["guardrail-lock", "hpc-batch-window"]:
            fixed["tags"] = ["HPC"]
        # Add Federation tag for observability patterns
        elif pattern in ["observability-first", "autocommit-shadow"]:
            fixed["tags"] = ["Federation"]
        # Add Observability tag for safe-degrade
        elif pattern in ["safe-degrade"]:
            fixed["tags"] = ["Observability"]
        # Default to Observability for unknown patterns
        else:
            fixed["tags"] = ["Observability"]
    
    # 12. Ensure 'mutation' field exists
    if "mutation" not in fixed:
        # Infer from mode
        mode = fixed.get("mode", "advisory")
        fixed["mutation"] = (mode == "mutate")
    
    # 13. Move pattern-specific fields to 'metrics' object
    # Define required schema fields
    required_fields = {
        "ts", "run", "run_id", "iteration", "circle", "depth", "pattern",
        "pattern:kebab-name", "mode", "mutation", "gate", "framework",
        "scheduler", "tags", "economic", "reason", "action", "prod_mode"
    }
    
    # Optional schema fields that are allowed at top level
    optional_fields = {"metrics", "context", "roam_delta", "outcome"}
    
    # Create metrics dict if it doesn't exist
    if "metrics" not in fixed:
        fixed["metrics"] = {}
    
    # Move any non-schema fields to metrics
    fields_to_move = []
    for field in list(fixed.keys()):
        if field not in required_fields and field not in optional_fields:
            fields_to_move.append(field)
    
    for field in fields_to_move:
        fixed["metrics"][field] = fixed[field]
        del fixed[field]
    
    # 14. Clean up: remove metadata, observability, pattern_state from metrics too
    for field in ["metadata", "observability", "pattern_state"]:
        if field in fixed.get("metrics", {}):
            del fixed["metrics"][field]
    
    return fixed


def main():
    metrics_file = Path(".goalie/pattern_metrics.jsonl")
    backup_file = Path(".goalie/pattern_metrics.jsonl.backup")
    
    if not metrics_file.exists():
        print(f"ERROR: {metrics_file} not found", file=sys.stderr)
        sys.exit(1)
    
    # Create backup
    print(f"Creating backup: {backup_file}")
    import shutil
    shutil.copy2(metrics_file, backup_file)
    
    # Load and fix events
    fixed_events = []
    with open(metrics_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                event = json.loads(line)
                fixed = fix_event(event, line_num)
                fixed_events.append(fixed)
            except json.JSONDecodeError as e:
                print(f"WARNING: Line {line_num} invalid JSON, skipping: {e}", file=sys.stderr)
                continue
            except Exception as e:
                print(f"ERROR: Line {line_num} failed to fix: {e}", file=sys.stderr)
                continue
    
    # Write fixed events
    print(f"Writing {len(fixed_events)} fixed events to {metrics_file}")
    with open(metrics_file, 'w') as f:
        for event in fixed_events:
            f.write(json.dumps(event, separators=(',', ':')) + '\n')
    
    print(f"✓ Fixed {len(fixed_events)} events")
    print(f"  Backup saved to: {backup_file}")


if __name__ == '__main__':
    main()
