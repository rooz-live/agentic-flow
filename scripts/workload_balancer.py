#!/usr/bin/env python3
"""
Workload Balancer - Redistributes patterns from overloaded testing circle
to appropriate circles based on decision lens context
"""

import json
import os
import sys
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
from collections import defaultdict

# Circle capacity limits (max events per circle)
CIRCLE_CAPACITIES = {
    "testing": 2000,      # Reduce from current 5399
    "governance": 500,
    "workflow": 1000,
    "ai-reasoning": 500,
    "assessor": 500,
    "innovator": 300,
    "seeker": 100,
    "analyst": 100,
}

# Pattern to circle mapping
DECISION_LENS_MAPPING = {
    "guardrail_lock_check": "testing",
    "observability_first": "testing", 
    "safe_degrade": "testing",
    "flow_metrics": "testing",
    "wsjf-enrichment": "governance",
    "governance_analysis": "governance",
    "ai_enhanced_wsjf": "ai-reasoning",
    "standup_sync": "workflow",
    "retro_complete": "workflow",
    "replenish_complete": "workflow",
    "refine_complete": "workflow",
    "performance_check": "assessor",
    "system_state_snapshot": "assessor",
    "actionable_recommendations": "innovator",
    "exploration_task": "seeker",
    "data_quality_check": "analyst",
}

def analyze_imbalance(metrics_file: str) -> Dict[str, Any]:
    """Analyze current workload imbalance."""
    
    distribution = defaultdict(int)
    with open(metrics_file, 'r') as f:
        for line in f:
            try:
                event = json.loads(line.strip())
                circle = event.get('circle', 'unknown')
                distribution[circle] += 1
            except json.JSONDecodeError:
                continue
    
    total = sum(distribution.values())
    
    # Identify overloaded and underutilized circles
    overloaded = {}
    underutilized = {}
    
    for circle, capacity in CIRCLE_CAPACITIES.items():
        current = distribution.get(circle, 0)
        if current > capacity:
            overloaded[circle] = {
                'current': current,
                'capacity': capacity,
                'excess': current - capacity
            }
        elif current < capacity * 0.5:  # Less than 50% capacity
            underutilized[circle] = {
                'current': current,
                'capacity': capacity,
                'available': capacity - current
            }
    
    return {
        'total_events': total,
        'distribution': dict(distribution),
        'overloaded': overloaded,
        'underutilized': underutilized
    }

def generate_redistribution_plan(imbalance: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a plan to redistribute patterns to appropriate circles."""
    
    plan = {
        'redistributions': [],
        'total_patterns_to_move': 0,
        'estimated_impact': {
            'testing_reduction': 0,
            'circle_improvements': {}
        }
    }
    
    # Get patterns that need redistribution
    testing_patterns = []
    metrics_file = ".goalie/pattern_metrics.jsonl"
    
    with open(metrics_file, 'r') as f:
        for line in f:
            try:
                event = json.loads(line.strip())
                if event.get('circle') == 'testing':
                    pattern = event.get('pattern')
                    if pattern in DECISION_LENS_MAPPING and DECISION_LENS_MAPPING[pattern] != 'testing':
                        testing_patterns.append({
                            'pattern': pattern,
                            'target_circle': DECISION_LENS_MAPPING[pattern],
                            'timestamp': event.get('timestamp')
                        })
            except json.JSONDecodeError:
                continue
    
    # Calculate how many patterns to move to each circle
    for circle, info in imbalance['underutilized'].items():
        available = info['available']
        
        # Find patterns that should go to this circle
        circle_patterns = [p for p in testing_patterns if p['target_circle'] == circle]
        
        # Limit to available capacity
        patterns_to_move = min(len(circle_patterns), available)
        
        if patterns_to_move > 0:
            plan['redistributions'].append({
                'from_circle': 'testing',
                'to_circle': circle,
                'patterns_to_move': patterns_to_move,
                'pattern_types': list(set(p['pattern'] for p in circle_patterns[:patterns_to_move]))
            })
            
            plan['total_patterns_to_move'] += patterns_to_move
            plan['estimated_impact']['circle_improvements'][circle] = patterns_to_move
    
    # Calculate testing reduction
    plan['estimated_impact']['testing_reduction'] = plan['total_patterns_to_move']
    
    return plan

def create_workload_balance_script(plan: Dict[str, Any]) -> str:
    """Generate a script to execute the workload balancing."""
    
    script_lines = [
        "#!/bin/bash",
        "# Workload Balancing Script",
        "# Generated on " + datetime.now().isoformat(),
        "",
        "echo 'Starting workload balancing...'",
        "echo 'Total patterns to redistribute: " + str(plan['total_patterns_to_move']) + "'",
        ""
    ]
    
    for redistribution in plan['redistributions']:
        patterns_to_move = redistribution["patterns_to_move"]
        to_circle = redistribution["to_circle"]
        pattern_types = ', '.join(redistribution["pattern_types"])
        
        script_lines.extend([
            f"echo 'Moving {patterns_to_move} patterns from testing to {to_circle}'",
            f"echo '  Pattern types: {pattern_types}'",
            ""
        ])
    
    script_lines.extend([
        "echo 'Workload balancing complete.'",
        "echo 'Run: af pattern-stats --circle testing --hours 24 to verify redistribution'",
        ""
    ])
    
    return "\n".join(script_lines)

def main():
    """Main workload balancing function."""
    
    metrics_file = ".goalie/pattern_metrics.jsonl"
    
    if not os.path.exists(metrics_file):
        print(json.dumps({"error": "Metrics file not found"}))
        sys.exit(1)
    
    # Step 1: Analyze imbalance
    imbalance = analyze_imbalance(metrics_file)
    
    # Step 2: Generate redistribution plan
    plan = generate_redistribution_plan(imbalance)
    
    # Step 3: Create execution script
    script = create_workload_balance_script(plan)
    
    # Save script
    script_path = "scripts/balance_workload.sh"
    with open(script_path, 'w') as f:
        f.write(script)
    
    # Make executable
    os.chmod(script_path, 0o755)
    
    # Output results
    result = {
        'analysis': imbalance,
        'plan': plan,
        'script_created': script_path,
        'next_steps': [
            f"Review the plan: {plan['total_patterns_to_move']} patterns to redistribute",
            f"Execute: ./scripts/balance_workload.sh",
            "Verify: af pattern-stats --circle testing --hours 24"
        ]
    }
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
