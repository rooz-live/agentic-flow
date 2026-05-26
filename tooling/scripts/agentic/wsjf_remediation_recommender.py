#!/usr/bin/env python3
"""
WSJF Remediation Recommender Tool
Generates actionable remediation recommendations for wsjf-enrichment failures
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

def get_goalie_dir() -> Path:
    """Get .goalie directory path"""
    project_root = os.environ.get("PROJECT_ROOT", ".")
    return Path(project_root) / ".goalie"

def load_pattern_events(input_file: Optional[str] = None) -> List[Dict[str, Any]]:
    """Load all pattern events from pattern_metrics.jsonl or specified file"""
    if input_file:
        metrics_file = Path(input_file)
    else:
        metrics_file = get_goalie_dir() / "pattern_metrics.jsonl"
    
    if not metrics_file.exists():
        return []
    
    events = []
    with open(metrics_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    
    return events

def parse_event_time(event: Dict[str, Any]) -> Optional[datetime]:
    """Parse event timestamp"""
    ts = event.get("timestamp") or event.get("ts")
    if not ts:
        return None
    
    try:
        if 'T' in ts:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        else:
            dt = datetime.fromisoformat(ts)
        
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None

def is_wsjf_enrichment_event(event: Dict[str, Any]) -> bool:
    """Check if event is a wsjf-enrichment pattern"""
    pattern = event.get("pattern", "").lower()
    tags = [tag.lower() for tag in event.get("tags", [])]
    
    return (
        "wsjf-enrichment" in pattern or
        "wsjf_enrichment" in pattern or
        "wsjf-enrich" in pattern or
        "wsjf_enrich" in pattern or
        "enrichment" in pattern and "wsjf" in pattern or
        any("wsjf-enrichment" in tag for tag in tags) or
        any("wsjf_enrichment" in tag for tag in tags) or
        any("wsjf-enrich" in tag for tag in tags) or
        any("wsjf_enrich" in tag for tag in tags)
    )

def analyze_wsjf_failure_patterns(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze WSJF-enrichment failure patterns for remediation"""
    wsjf_events = [e for e in events if is_wsjf_enrichment_event(e)]
    failed_events = [e for e in wsjf_events if e.get("status") == "failed"]
    
    if not failed_events:
        return {"error": "No failed wsjf-enrichment events found"}
    
    # Analyze failure patterns by category
    failure_categories = {
        "calculation_failures": [],
        "validation_failures": [],
        "data_quality_failures": [],
        "timeout_failures": [],
        "permission_failures": [],
        "environment_failures": []
    }
    
    for event in failed_events:
        error_msg = event.get("error_message", "").lower()
        tags = [tag.lower() for tag in event.get("tags", [])]
        circle = event.get("circle", "unknown")
        economic = event.get("economic", {})
        wsjf_score = economic.get("wsjf_score", 0)
        cod = economic.get("cost_of_delay", 0)
        
        failure_info = {
            "event_id": event.get("run_id", "unknown"),
            "circle": circle,
            "wsjf_score": wsjf_score,
            "cost_of_delay": cod,
            "error_message": error_msg,
            "tags": tags
        }
        
        # Categorize failures
        if "calculation" in error_msg or any("calculation" in tag for tag in tags):
            failure_categories["calculation_failures"].append(failure_info)
        elif "validation" in error_msg or any("validation" in tag for tag in tags):
            failure_categories["validation_failures"].append(failure_info)
        elif "data" in error_msg or any("data" in tag for tag in tags):
            failure_categories["data_quality_failures"].append(failure_info)
        elif "timeout" in error_msg:
            failure_categories["timeout_failures"].append(failure_info)
        elif "permission" in error_msg:
            failure_categories["permission_failures"].append(failure_info)
        elif "environment" in error_msg or any("env" in tag for tag in tags):
            failure_categories["environment_failures"].append(failure_info)
        else:
            # Default to calculation if no specific pattern
            failure_categories["calculation_failures"].append(failure_info)
    
    return failure_categories

def generate_wsjf_remediation_recommendations(failure_patterns: Dict[str, Any]) -> Dict[str, Any]:
    """Generate remediation recommendations based on failure patterns"""
    recommendations = {
        "immediate_actions": [],
        "short_term_improvements": [],
        "long_term_strategic_changes": [],
        "process_improvements": [],
        "tool_improvements": [],
        "monitoring_improvements": []
    }
    
    # Analyze each failure category
    for category, failures in failure_patterns.items():
        if not failures:
            continue
        
        # Calculate impact metrics
        high_wsjf_failures = [f for f in failures if f.get("wsjf_score", 0) > 15]
        high_cod_failures = [f for f in failures if f.get("cost_of_delay", 0) > 25]
        circle_failure_counts = defaultdict(int)
        
        for failure in failures:
            circle_failure_counts[failure.get("circle", "unknown")] += 1
        
        most_problematic_circle = max(circle_failure_counts.items(), key=lambda x: x[1]) if circle_failure_counts else ("unknown", 0)
        
        if category == "calculation_failures":
            recommendations["immediate_actions"].extend([
                {
                    "priority": "critical",
                    "action": "implement_wsjf_calculation_safeguards",
                    "description": "Add validation checks before WSJF calculation execution",
                    "expected_impact": "Reduce calculation errors by 60-70%",
                    "implementation": "Pre-calculation validation with boundary checks"
                }
            ])
            
            recommendations["short_term_improvements"].extend([
                {
                    "priority": "high",
                    "action": "standardize_wsjf_calculation_algorithms",
                    "description": "Create standardized WSJF calculation templates and algorithms",
                    "expected_impact": "Reduce calculation inconsistencies by 40-50%",
                    "implementation": "Algorithm standardization with peer review"
                }
            ])
            
            recommendations["tool_improvements"].extend([
                {
                    "priority": "high",
                    "action": "enhance_wsjf_calculation_tools",
                    "description": "Improve WSJF calculation tools with better error handling",
                    "expected_impact": "Reduce tool-related failures by 30-40%",
                    "implementation": "Tool upgrades and automated testing"
                }
            ])
        
        elif category == "validation_failures":
            recommendations["immediate_actions"].extend([
                {
                    "priority": "critical",
                    "action": "implement_wsjf_validation_prechecks",
                    "description": "Add comprehensive validation before WSJF enrichment",
                    "expected_impact": "Reduce validation failures by 50-60%",
                    "implementation": "Pre-enrichment validation suite"
                }
            ])
            
            recommendations["process_improvements"].extend([
                {
                    "priority": "high",
                    "action": "establish_wsjf_validation_standards",
                    "description": "Create clear WSJF validation standards and criteria",
                    "expected_impact": "Reduce validation ambiguity by 35-45%",
                    "implementation": "Validation standards documentation"
                }
            ])
        
        elif category == "data_quality_failures":
            recommendations["immediate_actions"].extend([
                {
                    "priority": "high",
                    "action": "implement_data_quality_checks",
                    "description": "Add data quality validation before WSJF enrichment",
                    "expected_impact": "Reduce data-related failures by 45-55%",
                    "implementation": "Data quality validation pipeline"
                }
            ])
            
            recommendations["short_term_improvements"].extend([
                {
                    "priority": "high",
                    "action": "establish_data_governance",
                    "description": "Create data governance framework for WSJF inputs",
                    "expected_impact": "Reduce data quality issues by 40-50%",
                    "implementation": "Data governance policies and procedures"
                }
            ])
        
        elif category == "timeout_failures":
            recommendations["immediate_actions"].extend([
                {
                    "priority": "medium",
                    "action": "optimize_wsjf_enrichment_performance",
                    "description": "Optimize WSJF enrichment process for better performance",
                    "expected_impact": "Reduce timeout failures by 25-35%",
                    "implementation": "Performance optimization and timeout adjustments"
                }
            ])
            
            recommendations["tool_improvements"].extend([
                {
                    "priority": "medium",
                    "action": "implement_timeout_handling",
                    "description": "Add better timeout handling and retry mechanisms",
                    "expected_impact": "Reduce timeout-related issues by 20-30%",
                    "implementation": "Timeout handling with exponential backoff"
                }
            ])
        
        elif category == "permission_failures":
            recommendations["immediate_actions"].extend([
                {
                    "priority": "high",
                    "action": "fix_wsjf_permission_issues",
                    "description": "Resolve permission and access control issues for WSJF enrichment",
                    "expected_impact": "Reduce permission failures by 70-80%",
                    "implementation": "Access control audit and fixes"
                }
            ])
            
            recommendations["process_improvements"].extend([
                {
                    "priority": "high",
                    "action": "establish_wsjf_access_policies",
                    "description": "Create clear access control policies for WSJF processes",
                    "expected_impact": "Reduce access issues by 50-60%",
                    "implementation": "Access control policy documentation"
                }
            ])
        
        elif category == "environment_failures":
            recommendations["immediate_actions"].extend([
                {
                    "priority": "medium",
                    "action": "stabilize_wsjf_enrichment_environment",
                    "description": "Stabilize WSJF enrichment environment and dependencies",
                    "expected_impact": "Reduce environment-related failures by 30-40%",
                    "implementation": "Environment stability improvements"
                }
            ])
            
            recommendations["tool_improvements"].extend([
                {
                    "priority": "medium",
                    "action": "implement_environment_parity",
                    "description": "Ensure consistent environments across WSJF enrichment stages",
                    "expected_impact": "Reduce environment inconsistencies by 25-35%",
                    "implementation": "Environment parity testing and validation"
                }
            ])
    
    # Add strategic recommendations
    recommendations["long_term_strategic_changes"].extend([
        {
            "priority": "medium",
            "action": "implement_wsjf_enrichment_orchestration",
            "description": "Implement comprehensive WSJF enrichment orchestration framework",
            "expected_impact": "Reduce overall failures by 40-50%",
            "implementation": "Orchestration platform with automated workflows"
        }
    ])
    
    recommendations["monitoring_improvements"].extend([
        {
            "priority": "high",
            "action": "establish_wsjf_enrichment_monitoring",
            "description": "Create comprehensive monitoring for WSJF enrichment processes",
            "expected_impact": "Enable early detection and faster resolution",
            "implementation": "Real-time monitoring with alerting"
        }
    ])
    
    return recommendations

def prioritize_wsjf_remediation_actions(recommendations: Dict[str, Any]) -> Dict[str, Any]:
    """Prioritize remediation actions based on impact and effort"""
    all_actions = []
    
    # Collect all actions with their priorities
    for category, actions in recommendations.items():
        for action_info in actions:
            for action in action_info if isinstance(action_info, list) else [action_info]:
                all_actions.append({
                    "category": category,
                    "priority": action.get("priority", "medium"),
                    "action": action.get("action", "unknown"),
                    "description": action.get("description", ""),
                    "expected_impact": action.get("expected_impact", ""),
                    "implementation": action.get("implementation", ""),
                    "effort_estimate": _estimate_implementation_effort(action.get("action", ""))
                })
    
    # Sort by priority (critical > high > medium > low) and impact
    priority_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    
    prioritized_actions = sorted(all_actions, key=lambda x: (
        priority_order.get(x["priority"], 2) * 100 + 
        (x.get("expected_impact", "").count("Reduce") * 10)  # Higher impact gets priority
    ), reverse=True)
    
    return {
        "prioritized_actions": prioritized_actions,
        "immediate_actions": [a for a in prioritized_actions if a["priority"] in ["critical", "high"]],
        "short_term_actions": [a for a in prioritized_actions if a["priority"] == "medium"],
        "long_term_actions": [a for a in prioritized_actions if a["priority"] == "low"]
    }

def _estimate_implementation_effort(action: str) -> str:
    """Estimate implementation effort for an action"""
    effort_mapping = {
        "implement_wsjf_calculation_safeguards": "high",
        "implement_wsjf_validation_prechecks": "high",
        "implement_data_quality_checks": "medium",
        "optimize_wsjf_enrichment_performance": "medium",
        "fix_wsjf_permission_issues": "high",
        "standardize_wsjf_calculation_algorithms": "high",
        "establish_wsjf_validation_standards": "medium",
        "establish_data_governance": "high",
        "implement_wsjf_enrichment_orchestration": "high",
        "establish_wsjf_access_policies": "medium",
        "stabilize_wsjf_enrichment_environment": "medium",
        "enhance_wsjf_calculation_tools": "medium",
        "implement_timeout_handling": "low",
        "implement_environment_parity": "medium",
        "establish_wsjf_enrichment_monitoring": "high"
    }
    
    return effort_mapping.get(action, "medium")

def generate_wsjf_implementation_plan(recommendations: Dict[str, Any]) -> Dict[str, Any]:
    """Generate implementation plan for WSJF remediation"""
    prioritized = prioritize_wsjf_remediation_actions(recommendations)
    
    # Create implementation phases
    phases = {
        "phase_1_immediate": {
            "title": "Immediate Critical Fixes (Week 1-2)",
            "actions": [a for a in prioritized["immediate_actions"] if a["effort_estimate"] == "high"],
            "estimated_duration": "1-2 weeks",
            "success_criteria": "Critical failure rate reduction > 50%"
        },
        "phase_2_quick_wins": {
            "title": "Quick Wins (Week 3-4)",
            "actions": [a for a in prioritized["immediate_actions"] if a["effort_estimate"] == "medium"],
            "estimated_duration": "2 weeks",
            "success_criteria": "Failure rate reduction > 25%"
        },
        "phase_3_foundation": {
            "title": "Foundation Improvements (Month 2)",
            "actions": prioritized["short_term_actions"],
            "estimated_duration": "4-6 weeks",
            "success_criteria": "Stable failure rate < 15%"
        },
        "phase_4_strategic": {
            "title": "Strategic Changes (Month 3-6)",
            "actions": prioritized["long_term_actions"],
            "estimated_duration": "8-12 weeks",
            "success_criteria": "Failure rate < 10% with monitoring"
        }
    }
    
    return {
        "implementation_plan": phases,
        "total_estimated_duration": "16-24 weeks",
        "expected_outcomes": {
            "failure_rate_reduction": "60-80%",
            "economic_impact_reduction": "Significant reduction in Cost of Delay",
            "process_maturity_improvement": "Mature WSJF enrichment processes"
        }
    }

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="WSJF Remediation Recommender Tool")
    parser.add_argument("--input-file", help="Input pattern metrics file")
    parser.add_argument("--pattern", default="wsjf-enrichment", help="Pattern to analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--hours", type=int, help="Limit to events in last N hours")
    parser.add_argument("--circle", help="Filter by specific circle")
    parser.add_argument("--detailed", action="store_true", help="Show detailed recommendations")
    parser.add_argument("--implementation-plan", action="store_true", help="Generate implementation plan")
    
    args = parser.parse_args()
    
    events = load_pattern_events(args.input_file)
    
    # Apply time filter
    if args.hours:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=args.hours)
        events = [e for e in events if parse_event_time(e) and parse_event_time(e) >= cutoff]
    
    # Filter by circle if specified
    if args.circle:
        events = [e for e in events if e.get("circle", "").lower() == args.circle.lower()]
    
    # Filter by pattern if specified
    if args.pattern:
        events = [e for e in events if args.pattern.lower() in e.get("pattern", "").lower()]
    
    if not events:
        print("No events found matching criteria", file=sys.stderr)
        sys.exit(1)
    
    # Analyze failure patterns
    failure_patterns = analyze_wsjf_failure_patterns(events)
    
    if "error" in failure_patterns:
        print("No failed wsjf-enrichment events found for analysis", file=sys.stderr)
        sys.exit(1)
    
    # Generate recommendations
    recommendations = generate_wsjf_remediation_recommendations(failure_patterns)
    prioritized_actions = prioritize_wsjf_remediation_actions(recommendations)
    
    result = {
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "pattern_analyzed": args.pattern,
        "total_events_analyzed": len(events),
        "failure_analysis": {
            "total_failures": sum(len(failures) for failures in failure_patterns.values()),
            "failure_categories": {k: len(v) for k, v in failure_patterns.items()},
            "most_problematic_circle": _get_most_problematic_circle(failure_patterns)
        },
        "remediation_recommendations": recommendations,
        "prioritized_actions": prioritized_actions
    }
    
    if args.implementation_plan:
        implementation_plan = generate_wsjf_implementation_plan(recommendations)
        result["implementation_plan"] = implementation_plan
    
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 70)
        print("WSJF REMEDIATION RECOMMENDER REPORT")
        print("=" * 70)
        print(f"Pattern Analyzed: {args.pattern}")
        print(f"Events Analyzed: {len(events)}")
        print(f"Analysis Time: {result['analysis_timestamp']}")
        
        failure_analysis = result.get("failure_analysis", {})
        if failure_analysis:
            print(f"\n📊 Failure Analysis:")
            print(f"   Total Failures: {failure_analysis.get('total_failures', 0)}")
            
            failure_categories = failure_analysis.get("failure_categories", {})
            if failure_categories:
                print(f"\n🔍 Failure Categories:")
                for category, count in failure_categories.items():
                    print(f"   {category}: {count}")
            
            most_problematic = failure_analysis.get("most_problematic_circle", ("unknown", 0))
            print(f"   Most Problematic Circle: {most_problematic[0]} ({most_problematic[1]} failures)")
        
        print(f"\n🎯 Prioritized Actions:")
        immediate_actions = prioritized_actions.get("immediate_actions", [])
        if immediate_actions:
            print(f"\n   🚨 Immediate Actions (Critical/High Priority):")
            for i, action in enumerate(immediate_actions[:5], 1):  # Show top 5
                print(f"   {i}. {action['description']} (Priority: {action['priority']}, Impact: {action['expected_impact']})")
        
        short_term_actions = prioritized_actions.get("short_term_actions", [])
        if short_term_actions:
            print(f"\n   ⏱️  Short-term Actions (Medium Priority):")
            for i, action in enumerate(short_term_actions[:5], 1):  # Show top 5
                print(f"   {i}. {action['description']} (Priority: {action['priority']}, Impact: {action['expected_impact']})")
        
        if args.detailed:
            long_term_actions = prioritized_actions.get("long_term_actions", [])
            if long_term_actions:
                print(f"\n   🎯 Long-term Actions (Low Priority):")
                for i, action in enumerate(long_term_actions[:5], 1):  # Show top 5
                    print(f"   {i}. {action['description']} (Priority: {action['priority']}, Impact: {action['expected_impact']})")
        
        if args.implementation_plan and "implementation_plan" in result:
            plan = result["implementation_plan"]
            print(f"\n📋 Implementation Plan:")
            for phase_key, phase in plan.get("implementation_plan", {}).items():
                print(f"\n   {phase['title']}:")
                print(f"   Duration: {phase['estimated_duration']}")
                print(f"   Success Criteria: {phase['success_criteria']}")
                
                if args.detailed and phase.get("actions"):
                    print(f"   Actions:")
                    for i, action in enumerate(phase["actions"][:3], 1):  # Show top 3
                        print(f"     {i+1}. {action['description']}")

def _get_most_problematic_circle(failure_patterns: Dict[str, Any]) -> tuple:
    """Find the most problematic circle from failure patterns"""
    circle_counts = defaultdict(int)
    
    for failures in failure_patterns.values():
        for failure in failures:
            circle = failure.get("circle", "unknown")
            circle_counts[circle] += 1
    
    if circle_counts:
        return max(circle_counts.items(), key=lambda x: x[1])
    else:
        return ("unknown", 0)

if __name__ == "__main__":
    main()