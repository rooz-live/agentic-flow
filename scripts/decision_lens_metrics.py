#!/usr/bin/env python3
"""
Decision Lens Metrics - Traceable metrics for circle workload distribution
Maps patterns to appropriate circles based on decision lens context
"""

import json
import os
from typing import Dict, List, Any
from collections import defaultdict

# Decision lens mapping - patterns to circles
DECISION_LENS_MAPPING = {
    # Testing circle - Quality Assurance & Validation
    "guardrail_lock_check": "testing",
    "observability_first": "testing", 
    "safe_degrade": "testing",
    "flow_metrics": "testing",
    
    # Governance circle - Policy & Compliance
    "wsjf-enrichment": "governance",
    "governance_analysis": "governance",
    "policy_check": "governance",
    
    # AI-Reasoning circle - Cognitive Processing
    "ai_enhanced_wsjf": "ai-reasoning",
    "cognitive_processing": "ai-reasoning",
    "pattern_recognition": "ai-reasoning",
    
    # Workflow circle - Process Orchestration
    "standup_sync": "workflow",
    "retro_complete": "workflow",
    "replenish_complete": "workflow",
    "refine_complete": "workflow",
    
    # Assessor circle - Performance Assurance
    "performance_check": "assessor",
    "system_state_snapshot": "assessor",
    "capacity_planning": "assessor",
    
    # Innovator circle - Investment Council
    "actionable_recommendations": "innovator",
    "innovation_proposal": "innovator",
    "investment_analysis": "innovator",
    
    # Seeker circle - Exploration
    "exploration_task": "seeker",
    "research_discovery": "seeker",
    "experiment_result": "seeker",
}

def analyze_workload_distribution(metrics_file: str) -> Dict[str, Any]:
    """Analyze current workload distribution and suggest rebalancing."""
    
    if not os.path.exists(metrics_file):
        return {"error": "Metrics file not found"}
    
    # Count patterns by intended circle
    intended_distribution = defaultdict(int)
    actual_distribution = defaultdict(int)
    misclassified = []
    
    with open(metrics_file, 'r') as f:
        for line in f:
            try:
                event = json.loads(line.strip())
                pattern = event.get('pattern', 'unknown')
                actual_circle = event.get('circle', 'unknown')
                
                # Determine intended circle
                intended_circle = DECISION_LENS_MAPPING.get(pattern, 'testing')
                
                intended_distribution[intended_circle] += 1
                actual_distribution[actual_circle] += 1
                
                # Track misclassification
                if actual_circle != intended_circle:
                    misclassified.append({
                        'pattern': pattern,
                        'actual': actual_circle,
                        'intended': intended_circle,
                        'timestamp': event.get('timestamp', 'unknown')
                    })
            except json.JSONDecodeError:
                continue
    
    total_events = sum(actual_distribution.values())
    
    # Calculate percentages
    intended_pct = {k: (v/total_events)*100 for k, v in intended_distribution.items()}
    actual_pct = {k: (v/total_events)*100 for k, v in actual_distribution.items()}
    
    # Generate recommendations
    recommendations = []
    
    # Check for workload imbalance
    for circle, pct in actual_pct.items():
        if pct > 40:  # More than 40% in one circle
            recommendations.append({
                'type': 'workload_imbalance',
                'circle': circle,
                'current_pct': round(pct, 1),
                'action': f'Redistribute work from {circle} to underutilized circles'
            })
    
    # Check for misclassification rate
    misclassification_rate = (len(misclassified) / total_events) * 100 if total_events > 0 else 0
    if misclassification_rate > 10:
        recommendations.append({
            'type': 'high_misclassification',
            'rate': round(misclassification_rate, 1),
            'action': 'Fix circle assignment in pattern logging'
        })
    
    return {
        'total_events': total_events,
        'intended_distribution': dict(intended_distribution),
        'actual_distribution': dict(actual_distribution),
        'intended_percentages': intended_pct,
        'actual_percentages': actual_pct,
        'misclassified_count': len(misclassified),
        'misclassification_rate': round(misclassification_rate, 1),
        'misclassified_examples': misclassified[:5],  # First 5 examples
        'recommendations': recommendations
    }

if __name__ == "__main__":
    import sys
    metrics_file = sys.argv[1] if len(sys.argv) > 1 else ".goalie/pattern_metrics.jsonl"
    result = analyze_workload_distribution(metrics_file)
    print(json.dumps(result, indent=2))
