#!/usr/bin/env python3
"""DT Training Data Quality Analysis for Phase 2 Review."""
import json
from collections import Counter
from pathlib import Path

def main():
    project_root = Path(__file__).parent.parent.parent
    dt_file = project_root / ".goalie" / "dt_unified_training.jsonl"
    
    if not dt_file.exists():
        print(f"ERROR: {dt_file} not found")
        return 1
    
    records = []
    with open(dt_file) as f:
        for line in f:
            records.append(json.loads(line))
    
    print("=" * 60)
    print("DT TRAINING DATA QUALITY ANALYSIS")
    print("=" * 60)
    print(f"\n1. DATASET SIZE: {len(records)} records")
    
    # Schema check
    schemas = Counter(tuple(sorted(r.keys())) for r in records)
    print(f"\n2. SCHEMA VARIANTS: {len(schemas)}")
    for s, c in schemas.items():
        print(f"   {list(s)[:4]}... : {c} records")
    
    # Rewards
    rewards = []
    for r in records:
        if "rewards" in r and r["rewards"]:
            rewards.extend(r["rewards"])
    print(f"\n3. REWARD DISTRIBUTION (n={len(rewards)})")
    for v, c in sorted(Counter([round(x, 1) for x in rewards]).items()):
        print(f"   {v:+.1f}: {c}")
    
    # Actions  
    actions = []
    for r in records:
        if "actions" in r and r["actions"]:
            actions.extend(r["actions"])
    print(f"\n4. ACTIONS: {len(set(actions))} unique")
    if actions:
        print(f"   Range: [{min(actions)}, {max(actions)}]")
    
    # Sources
    sources = Counter()
    for r in records:
        if "metadata" in r and "source" in r["metadata"]:
            sources[r["metadata"]["source"]] += 1
        else:
            sources["offline"] += 1
    print(f"\n5. DATA SOURCES")
    for s, c in sources.items():
        print(f"   {s}: {c}")
    
    print("\n6. HACKATHON READINESS CHECK")
    checks = [
        ("Records >= 100", len(records) >= 100),
        ("Multiple reward values", len(set(round(x, 1) for x in rewards)) > 1),
        ("Multiple actions", len(set(actions)) > 1),
        ("Both sources present", len(sources) >= 2),
        ("All required fields", all("states" in r and "actions" in r and "rewards" in r for r in records))
    ]
    all_passed = True
    for name, passed in checks:
        status = "PASS" if passed else "FAIL"
        if not passed:
            all_passed = False
        print(f"   [{status}] {name}")
    
    print(f"\n{'='*60}")
    print(f"HACKATHON READINESS: {'YES' if all_passed else 'NO'}")
    print(f"{'='*60}")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit(main())

