#!/usr/bin/env python3
"""
Add circle_owner fields to CONSOLIDATED_ACTIONS.yaml based on CIRCLE_MAPPINGS.yaml
Maps actions to circles based on pattern, phase, priority, and tags
"""

import yaml
import sys
from pathlib import Path

def load_yaml(path):
    """Load YAML file"""
    with open(path) as f:
        return yaml.safe_load(f)

def save_yaml(path, data):
    """Save YAML file"""
    with open(path, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

def determine_circle(action, mappings):
    """Determine circle owner based on action attributes"""
    action_id = action.get('id', '')
    pattern = action.get('pattern', '')
    priority = action.get('priority', 'normal')
    phase = action.get('phase', '')
    tags = action.get('tags', [])
    
    # Priority overrides - critical/urgent → assessor
    if priority in ['critical', 'urgent', 'important']:
        return 'assessor'
    
    # Explicit action assignments from CIRCLE_MAPPINGS.yaml
    for circle_name, circle_data in mappings['circles'].items():
        if action_id in circle_data.get('assigned_actions', []):
            return circle_name
    
    # Pattern-based routing
    pattern_map = {
        'ml-training-guardrail': 'analyst',
        'depth-ladder': 'analyst',
        'safe-degrade': 'assessor',
        'guardrail-lock': 'assessor',
        'governance-review': 'assessor',
        'federation-runtime': 'innovator',
        'retrospective-facilitation': 'innovator',
        'observability-first': 'intuitive',
        'visualization': 'intuitive',
        'circle-risk-focus': 'orchestrator',
        'iteration-budget': 'orchestrator',
        'dependency-automation': 'seeker',
    }
    
    if pattern in pattern_map:
        return pattern_map[pattern]
    
    # Phase-based routing
    if phase == 'A':
        return 'analyst'
    elif phase == 'B':
        return 'assessor'
    elif phase == 'C':
        return 'innovator'
    elif phase == 'D':
        return 'intuitive'
    elif phase == 'E':
        return 'orchestrator'
    
    # Tag-based routing
    if isinstance(tags, list):
        tag_str = ' '.join(tags).lower()
        if any(t in tag_str for t in ['analytics', 'stats', 'ml']):
            return 'analyst'
        elif any(t in tag_str for t in ['dependencies', 'health', 'validation']):
            return 'assessor'
        elif any(t in tag_str for t in ['federation', 'automation', 'innovation']):
            return 'innovator'
        elif any(t in tag_str for t in ['observability', 'metrics', 'dashboard']):
            return 'intuitive'
        elif any(t in tag_str for t in ['bml', 'cycles', 'coordination']):
            return 'orchestrator'
        elif any(t in tag_str for t in ['rust', 'security']):
            return 'seeker'
    
    # Default to orchestrator for coordination
    return 'orchestrator'

def add_circle_owners(actions_path, mappings_path):
    """Add circle_owner fields to all actions"""
    
    # Load files
    actions_data = load_yaml(actions_path)
    mappings = load_yaml(mappings_path)
    
    # Track statistics
    total = 0
    updated = 0
    
    # Process each action
    for action in actions_data.get('items', []):
        total += 1
        
        # Skip if already has circle_owner
        if 'circle_owner' in action:
            continue
        
        # Determine circle
        circle = determine_circle(action, mappings)
        action['circle_owner'] = circle
        updated += 1
        
        print(f"  {action.get('id', 'unknown')}: {circle}")
    
    # Save updated actions
    save_yaml(actions_path, actions_data)
    
    print(f"\n✓ Updated {updated}/{total} actions with circle_owner fields")
    return updated

def main():
    actions_path = Path('.goalie/CONSOLIDATED_ACTIONS.yaml')
    mappings_path = Path('.goalie/CIRCLE_MAPPINGS.yaml')
    
    if not actions_path.exists():
        print(f"Error: {actions_path} not found", file=sys.stderr)
        sys.exit(1)
    
    if not mappings_path.exists():
        print(f"Error: {mappings_path} not found", file=sys.stderr)
        sys.exit(1)
    
    print("Adding circle_owner fields to CONSOLIDATED_ACTIONS.yaml...")
    print("")
    
    updated = add_circle_owners(actions_path, mappings_path)
    
    if updated > 0:
        print(f"\n✅ Success! {updated} actions now have circle_owner assignments")
    else:
        print("\n✅ All actions already have circle_owner fields")

if __name__ == '__main__':
    main()
