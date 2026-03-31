#!/usr/bin/env python3
"""
Hybrid Memory Consolidation Script
===================================
Consolidates AgentDB operational memory → MIRAS strategic memory
Based on surprise-based filtering from Titans paper (arXiv:2501.00663)

Usage:
    python scripts/research/hybrid_memory_consolidate.py [--threshold 0.1] [--max 1000]
"""

import json
import argparse
import os
from datetime import datetime
from typing import Dict, List, Any


def compute_surprise(event: Dict) -> float:
    """Compute MIRAS surprise score for an event."""
    reward = event.get('reward') or {}
    if not reward:
        return 0.1
    
    value = reward.get('value', 0)
    components = reward.get('components') or {}
    expected = components.get('success', 0)
    status = reward.get('status', '')
    
    surprise = 0.0
    if expected != 0:
        surprise = abs(value - expected) / abs(expected)
    else:
        surprise = abs(value)
    
    # Failures are surprising (information-rich)
    if status == 'failure':
        surprise += 0.5
    
    return min(1.0, surprise or 0.1)


def load_trajectories(path: str) -> List[Dict]:
    """Load operational memory from trajectories."""
    if not os.path.exists(path):
        return []
    
    events = []
    with open(path, 'r') as f:
        for line in f:
            if line.strip():
                try:
                    event = json.loads(line)
                    event['_miras_surprise'] = compute_surprise(event)
                    events.append(event)
                except json.JSONDecodeError:
                    continue
    return events


def load_strategic_memory(path: str) -> List[Dict]:
    """Load existing strategic memory."""
    if not os.path.exists(path):
        return []
    
    events = []
    with open(path, 'r') as f:
        for line in f:
            if line.strip():
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return events


def consolidate(operational: List[Dict], strategic: List[Dict], 
                threshold: float = 0.1, max_memories: int = 1000) -> Dict:
    """Consolidate high-surprise events from operational → strategic memory."""
    
    # Filter high-surprise events
    high_surprise = [e for e in operational if e.get('_miras_surprise', 0) >= threshold]
    
    # Deduplicate
    existing_ids = set(e.get('run_id', e.get('timestamp', '')) for e in strategic)
    new_events = [e for e in high_surprise 
                  if e.get('run_id', e.get('timestamp', '')) not in existing_ids]
    
    # Mark as strategic and add
    for e in new_events:
        e['_consolidation_tier'] = 'strategic'
    strategic.extend(new_events)
    
    # Sort by surprise (highest first) and enforce capacity
    strategic.sort(key=lambda x: x.get('_miras_surprise', 0), reverse=True)
    if len(strategic) > max_memories:
        strategic = strategic[:max_memories]
    
    # Calculate metrics
    op_bytes = sum(len(json.dumps(e)) for e in operational)
    st_bytes = sum(len(json.dumps(e)) for e in strategic) if strategic else 1
    avg_surprise = sum(e.get('_miras_surprise', 0) for e in strategic) / max(1, len(strategic))
    
    return {
        'strategic': strategic,
        'metrics': {
            'lastRun': datetime.now().isoformat(),
            'operationalEvents': len(operational),
            'strategicMemories': len(strategic),
            'eventsConsolidated': len(new_events),
            'compressionRatio': op_bytes / st_bytes,
            'avgSurpriseScore': avg_surprise,
            'retentionRate': len(strategic) / max(1, len(operational))
        }
    }


def main():
    parser = argparse.ArgumentParser(description='Hybrid Memory Consolidation')
    parser.add_argument('--trajectories', default='.goalie/trajectories.jsonl')
    parser.add_argument('--strategic', default='.goalie/strategic_memory.jsonl')
    parser.add_argument('--metrics', default='.goalie/research/consolidation_metrics.json')
    parser.add_argument('--threshold', type=float, default=0.1)
    parser.add_argument('--max', type=int, default=1000)
    args = parser.parse_args()
    
    print("🧠 Hybrid Memory Consolidator: AgentDB → MIRAS")
    print("=" * 60)
    
    operational = load_trajectories(args.trajectories)
    strategic = load_strategic_memory(args.strategic)
    print(f"📥 Loaded: {len(operational)} operational, {len(strategic)} strategic")
    
    result = consolidate(operational, strategic, args.threshold, args.max)
    m = result['metrics']
    
    # Save strategic memory
    os.makedirs(os.path.dirname(args.strategic), exist_ok=True)
    with open(args.strategic, 'w') as f:
        for e in result['strategic']:
            f.write(json.dumps(e) + '\n')
    
    # Save metrics
    os.makedirs(os.path.dirname(args.metrics), exist_ok=True)
    with open(args.metrics, 'w') as f:
        json.dump(m, f, indent=2)
    
    print(f"\n📊 Consolidation Results:")
    print(f"   Operational Events: {m['operationalEvents']}")
    print(f"   Strategic Memories: {m['strategicMemories']}")
    print(f"   Events Consolidated: {m['eventsConsolidated']}")
    print(f"   Compression Ratio: {m['compressionRatio']:.2f}x")
    print(f"   Avg Surprise Score: {m['avgSurpriseScore']:.3f}")
    print(f"   Retention Rate: {m['retentionRate']:.1%}")
    print(f"\n✅ Strategic memory saved to: {args.strategic}")


if __name__ == '__main__':
    main()

