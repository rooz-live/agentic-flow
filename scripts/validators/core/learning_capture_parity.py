#!/usr/bin/env python3
"""
Learning Capture Parity Validation
Pattern: actionable_context, relentless_execution
Owner: Intuitive Circle → Analyst Circle
Purpose: Ensure all processGovernor events are captured in retro-coach insights
"""

import json
import sys
import os
from collections import defaultdict
from pathlib import Path
from datetime import datetime, timedelta

def validate_learning_parity():
    """Validate that retro-coach captures all processGovernor events"""
    
    project_root = Path(__file__).parent.parent.parent
    goalie_dir = project_root / '.goalie'
    cycle_log_path = goalie_dir / 'cycle_log.jsonl'
    retro_log_path = goalie_dir / 'retro.jsonl'
    
    print("=" * 60)
    print("📊 LEARNING CAPTURE PARITY VALIDATION")
    print("=" * 60)
    print()
    
    # Load cycle log (processGovernor events)
    cycle_events = defaultdict(int)
    total_cycle_events = 0
    
    print("[1/4] Loading cycle log (processGovernor events)...")
    if cycle_log_path.exists():
        with open(cycle_log_path, 'r') as f:
            for line in f:
                try:
                    event = json.loads(line)
                    event_type = event.get('type', 'unknown')
                    cycle_events[event_type] += 1
                    total_cycle_events += 1
                except json.JSONDecodeError:
                    continue
        
        print(f"  ✅ Loaded {total_cycle_events} events from cycle log")
        print(f"  📋 Event types: {len(cycle_events)}")
    else:
        print(f"  ❌ Cycle log not found at {cycle_log_path}")
        return 1
    
    # Load retro insights
    print()
    print("[2/4] Loading retro insights...")
    retro_insights = []
    
    if retro_log_path.exists():
        with open(retro_log_path, 'r') as f:
            for line in f:
                try:
                    retro_insights.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        
        print(f"  ✅ Loaded {len(retro_insights)} insights from retro log")
    else:
        print(f"  ⚠️  Retro log not found at {retro_log_path}")
        print(f"     Creating empty retro log...")
        goalie_dir.mkdir(parents=True, exist_ok=True)
        retro_log_path.touch()
    
    # Calculate parity
    print()
    print("[3/4] Calculating learning capture parity...")
    captured_events = len(retro_insights)
    
    if total_cycle_events > 0:
        parity_pct = (captured_events / total_cycle_events * 100)
    else:
        parity_pct = 0
    
    print(f"  Total Events: {total_cycle_events}")
    print(f"  Captured Insights: {captured_events}")
    print(f"  Parity: {parity_pct:.1f}%")
    
    # Analyze event coverage
    print()
    print("[4/4] Analyzing event type coverage...")
    print()
    print("  Top 10 Event Types:")
    sorted_events = sorted(cycle_events.items(), key=lambda x: x[1], reverse=True)
    for event_type, count in sorted_events[:10]:
        print(f"    - {event_type}: {count} events")
    
    # Validate threshold
    print()
    print("=" * 60)
    
    threshold = 80
    if parity_pct >= threshold:
        print(f"✅ PARITY VALIDATION PASSED ({parity_pct:.1f}% >= {threshold}%)")
        status = 0
    else:
        print(f"⚠️  PARITY BELOW THRESHOLD ({parity_pct:.1f}% < {threshold}%)")
        status = 1
    
    print("=" * 60)
    print()
    
    # Recommendations
    if parity_pct < threshold:
        print("Recommendations:")
        print("  1. Review retro-coach configuration")
        print("  2. Ensure event types are being captured")
        print("  3. Check for filtering logic that may exclude events")
        print("  4. Increase insight generation frequency")
        print()
    
    # Write parity metric to cycle log
    parity_metric = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "pattern": "actionable_context",
        "event": "learning_parity_check",
        "total_events": total_cycle_events,
        "captured_insights": captured_events,
        "parity_percentage": round(parity_pct, 2),
        "passed_threshold": parity_pct >= threshold
    }
    
    with open(cycle_log_path, 'a') as f:
        f.write(json.dumps(parity_metric) + '\n')
    
    return status

if __name__ == '__main__':
    try:
        sys.exit(validate_learning_parity())
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
