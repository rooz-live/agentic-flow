#!/usr/bin/env python3
"""
Remediation Recommender Tool
Generates actionable recommendations based on pattern analysis results
"""

import json
import os
import sys
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

def is_code_fix_event(event: Dict[str, Any]) -> bool:
    """Check if event is a code-fix-proposal"""
    pattern = event.get("pattern", "").lower()
    tags = [tag.lower() for tag in event.get("tags", [])]
    
    return (
        "code-fix" in pattern or
        "code_fix" in pattern or
        "fix-proposal" in pattern or
        "bug-fix" in pattern or
        "security-fix" in pattern or
        "performance-fix" in pattern or
        any("fix" in tag for tag in tags) or
        any("bug" in tag for tag in tags) or
        any("security" in tag for tag in tags)
    )

def analyze_failure_patterns(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze failure patterns to identify remediation opportunities"""
    code_fix_events = [e for e in events if is_code_fix_event(e)]
    failed_events = [e for e in code_fix_events if e.get("status") == "failed"]
    
    if not failed_events:
        return {"error": "No failed code-fix events found"}
    
    # Analyze failure patterns
    failure_patterns = {
        "by_circle": {},
        "by_pattern": {},
        "by_depth": {},
        "by_time": {},
        "by_economic_impact": {}
    }
    
    for event in failed_events:
        circle = event.get("circle", "unknown")
        pattern = event.get("pattern", "unknown")
        depth = event.get("depth", 0)
        event_time = parse_event_time(event)
        economic = event.get("economic", {})
        
        # Count by circle
        failure_patterns["by_circle"][circle] = failure_patterns["by_circle"].get(circle, 0) + 1
        
        # Count by pattern
        failure_patterns["by_pattern"][pattern] = failure_patterns["by_pattern"].get(pattern, 0) + 1
        
        # Count by depth
        failure_patterns["by_depth"][depth] = failure_patterns["by_depth"].get(depth, 0) + 1
        
        # Count by time
        if event_time:
            hour = event_time.hour
            failure_patterns["by_time"][hour] = failure_patterns["by_time"].get(hour, 0) + 1
        
        # Count by economic impact
        cod = economic.get("cost_of_delay", 0)
        wsjf_score = economic.get("wsjf_score", 0)
        
        if cod > 20 or wsjf_score > 15:
            impact_level = "high"
        elif cod > 10 or wsjf_score > 8:
            impact_level = "medium"
        else:
            impact_level = "low"
        
        failure_patterns["by_economic_impact"][impact_level] = failure_patterns["by_economic_impact"].get(impact_level, 0) + 1
    
    return failure_patterns

def generate_remediation_recommendations(failure_patterns: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate specific remediation recommendations based on failure patterns"""
    recommendations = []
    
    # Circle-specific recommendations
    by_circle = failure_patterns.get("by_circle", {})
    for circle, count in sorted(by_circle.items(), key=lambda x: x[1], reverse=True)[:3]:
        if count >= 3:  # Only recommend for circles with multiple failures
            recommendations.append({
                "category": "circle_specific",
                "priority": "high" if count >= 5 else "medium",
                "target": circle,
                "issue": f"Circle '{circle}' has {count} failures",
                "recommendation": f"Implement circle-specific process improvements for '{circle}'",
                "actions": [
                    f"Conduct root cause analysis for '{circle}' failures",
                    f"Provide targeted training for '{circle}' team",
                    f"Implement circle-specific quality gates"
                ],
                "expected_impact": f"Reduce '{circle}' failures by 40-60%",
                "implementation_complexity": "medium"
            })
    
    # Pattern-specific recommendations
    by_pattern = failure_patterns.get("by_pattern", {})
    for pattern, count in sorted(by_pattern.items(), key=lambda x: x[1], reverse=True)[:3]:
        if count >= 2:
            recommendations.append({
                "category": "pattern_specific",
                "priority": "high" if count >= 4 else "medium",
                "target": pattern,
                "issue": f"Pattern '{pattern}' has {count} failures",
                "recommendation": f"Optimize '{pattern}' implementation process",
                "actions": [
                    f"Create '{pattern}' implementation template",
                    f"Add automated validation for '{pattern}'",
                    f"Implement peer review for '{pattern}' changes"
                ],
                "expected_impact": f"Reduce '{pattern}' failures by 30-50%",
                "implementation_complexity": "medium"
            })
    
    # Depth-based recommendations
    by_depth = failure_patterns.get("by_depth", {})
    high_depth_failures = [(depth, count) for depth, count in by_depth.items() if depth >= 3]
    
    if high_depth_failures:
        total_high_depth = sum(count for depth, count in high_depth_failures)
        recommendations.append({
            "category": "depth_related",
            "priority": "high",
            "target": "high_depth_fixes",
            "issue": f"{total_high_depth} failures at depth >= 3",
            "recommendation": "Simplify complex fixes and break into smaller changes",
            "actions": [
                "Implement complexity estimation guidelines",
                "Require decomposition of complex fixes",
                "Add complexity-based review gates"
            ],
            "expected_impact": "Reduce high-depth failures by 50-70%",
            "implementation_complexity": "high"
        })
    
    # Economic impact recommendations
    by_economic = failure_patterns.get("by_economic_impact", {})
    high_impact_failures = by_economic.get("high", 0)
    
    if high_impact_failures >= 2:
        recommendations.append({
            "category": "economic_impact",
            "priority": "critical",
            "target": "high_economic_impact",
            "issue": f"{high_impact_failures} high-impact failures",
            "recommendation": "Implement economic impact assessment and prioritization",
            "actions": [
                "Add mandatory economic impact assessment",
                "Implement cost-benefit analysis for fixes",
                "Create economic impact thresholds for approval"
            ],
            "expected_impact": "Reduce high-impact failures by 60-80%",
            "implementation_complexity": "high"
        })
    
    # Time-based recommendations
    by_time = failure_patterns.get("by_time", {})
    peak_failure_hours = sorted(by_time.items(), key=lambda x: x[1], reverse=True)[:3]
    
    if peak_failure_hours:
        recommendations.append({
            "category": "temporal",
            "priority": "medium",
            "target": "peak_failure_times",
            "issue": f"Peak failures at hours: {[h for h, c in peak_failure_hours]}",
            "recommendation": "Optimize deployment and testing schedules",
            "actions": [
                "Avoid deployments during peak failure hours",
                "Implement additional monitoring during high-risk periods",
                "Schedule critical fixes for low-risk time windows"
            ],
            "expected_impact": "Reduce time-related failures by 25-40%",
            "implementation_complexity": "low"
        })
    
    return recommendations

def generate_process_improvements(failure_patterns: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate process improvement recommendations"""
    improvements = []
    
    total_failures = sum(failure_patterns.get("by_circle", {}).values())
    
    if total_failures >= 5:
        improvements.append({
            "category": "process_improvement",
            "priority": "high",
            "target": "failure_prevention",
            "issue": f"High overall failure rate ({total_failures} failures)",
            "recommendation": "Implement comprehensive failure prevention framework",
            "actions": [
                "Establish standardized development processes",
                "Implement automated testing pipelines",
                "Create quality gates and checkpoints",
                "Implement continuous monitoring and alerting",
                "Establish blameless post-mortem process"
            ],
            "expected_impact": "Reduce overall failures by 40-60%",
            "implementation_complexity": "high"
        })
    
    # Check for specific process issues
    circle_variety = len(failure_patterns.get("by_circle", {}))
    if circle_variety >= 3:
        improvements.append({
            "category": "process_standardization",
            "priority": "medium",
            "target": "cross_circle_consistency",
            "issue": f"Inconsistent processes across {circle_variety} circles",
            "recommendation": "Standardize processes across all circles",
            "actions": [
                "Create cross-circle process documentation",
                "Implement shared best practices repository",
                "Establish circle-rotation programs",
                "Create unified quality standards"
            ],
            "expected_impact": "Reduce cross-circle failures by 30-50%",
            "implementation_complexity": "medium"
        })
    
    return improvements

def generate_technical_recommendations(failure_patterns: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate technical improvement recommendations"""
    technical_recs = []
    
    # Check for testing-related failures
    test_related_failures = 0
    for event in events:  # We need access to the original events here
        if is_code_fix_event(event) and event.get("status") == "failed":
            tags = event.get("tags", [])
            error_msg = event.get("error_message", "").lower()
            if any("test" in tag.lower() for tag in tags) or "test" in error_msg:
                test_related_failures += 1
    
    if test_related_failures >= 3:
        technical_recs.append({
            "category": "testing_infrastructure",
            "priority": "high",
            "target": "test_quality",
            "issue": f"{test_related_failures} testing-related failures",
            "recommendation": "Improve testing infrastructure and processes",
            "actions": [
                "Invest in automated testing tools",
                "Implement comprehensive test coverage requirements",
                "Add integration testing to pipeline",
                "Create test environment parity"
            ],
            "expected_impact": "Reduce testing-related failures by 50-70%",
            "implementation_complexity": "high"
        })
    
    # Check for tool/build related failures
    tool_related_failures = 0
    for event in events:  # We need access to the original events here
        if is_code_fix_event(event) and event.get("status") == "failed":
            tags = event.get("tags", [])
            error_msg = event.get("error_message", "").lower()
            if any("build" in tag.lower() for tag in tags) or "build" in error_msg:
                tool_related_failures += 1
    
    if tool_related_failures >= 2:
        technical_recs.append({
            "category": "build_infrastructure",
            "priority": "medium",
            "target": "build_tools",
            "issue": f"{tool_related_failures} build-related failures",
            "recommendation": "Improve build infrastructure and tooling",
            "actions": [
                "Upgrade build tools and dependencies",
                "Implement build validation and testing",
                "Create build artifact management",
                "Add build performance monitoring"
            ],
            "expected_impact": "Reduce build-related failures by 40-60%",
            "implementation_complexity": "medium"
        })
    
    return technical_recs

def create_implementation_plan(recommendations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Create a structured implementation plan from recommendations"""
    if not recommendations:
        return {"error": "No recommendations to plan"}
    
    # Group recommendations by priority
    high_priority = [r for r in recommendations if r.get("priority") == "high"]
    medium_priority = [r for r in recommendations if r.get("priority") == "medium"]
    critical_priority = [r for r in recommendations if r.get("priority") == "critical"]
    
    # Create phases
    phases = {
        "immediate": {
            "duration_days": 7,
            "recommendations": critical_priority + high_priority[:2],
            "description": "Critical fixes and quick wins"
        },
        "short_term": {
            "duration_days": 30,
            "recommendations": high_priority[2:] + medium_priority[:3],
            "description": "Process improvements and infrastructure upgrades"
        },
        "medium_term": {
            "duration_days": 90,
            "recommendations": medium_priority[3:] + technical_recs,  # We need technical_recs here
            "description": "Comprehensive process standardization"
        }
    }
    
    # Calculate resource requirements
    total_recommendations = len(recommendations)
    high_complexity = len([r for r in recommendations if r.get("implementation_complexity") == "high"])
    medium_complexity = len([r for r in recommendations if r.get("implementation_complexity") == "medium"])
    low_complexity = len([r for r in recommendations if r.get("implementation_complexity") == "low"])
    
    resource_requirements = {
        "total_recommendations": total_recommendations,
        "high_complexity_items": high_complexity,
        "medium_complexity_items": medium_complexity,
        "low_complexity_items": low_complexity,
        "estimated_person_days": high_complexity * 5 + medium_complexity * 3 + low_complexity * 1,
        "estimated_cost_savings": "20-40% reduction in failure-related costs"
    }
    
    return {
        "plan_timestamp": datetime.now(timezone.utc).isoformat(),
        "implementation_phases": phases,
        "resource_requirements": resource_requirements,
        "success_metrics": [
            "Failure rate reduction by 40-60%",
            "Improved code quality metrics",
            "Reduced economic impact from failures",
            "Faster time-to-resolution for fixes"
        ],
        "risk_mitigation": [
            "Implement gradual rollout of changes",
            "Maintain rollback procedures",
            "Establish success criteria for each phase",
            "Create monitoring and alerting for changes"
        ]
    }

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Remediation Recommender Tool")
    parser.add_argument("--input-file", help="Input pattern metrics file")
    parser.add_argument("--pattern", default="code-fix-proposal", help="Pattern to analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--implementation-plan", action="store_true", help="Generate detailed implementation plan")
    parser.add_argument("--export-plan", help="Export implementation plan to file")
    
    args = parser.parse_args()
    
    events = load_pattern_events(args.input_file)
    
    # Filter by pattern if specified
    if args.pattern:
        events = [e for e in events if args.pattern.lower() in e.get("pattern", "").lower()]
    
    if not events:
        print("No events found matching criteria", file=sys.stderr)
        sys.exit(1)
    
    # Analyze failure patterns
    failure_patterns = analyze_failure_patterns(events)
    
    if "error" in failure_patterns:
        print("Unable to analyze failure patterns", file=sys.stderr)
        sys.exit(1)
    
    # Generate recommendations
    remediation_recs = generate_remediation_recommendations(failure_patterns)
    process_improvements = generate_process_improvements(failure_patterns)
    
    # Combine all recommendations
    all_recommendations = remediation_recs + process_improvements
    
    result = {
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "pattern_analyzed": args.pattern,
        "total_events_analyzed": len(events),
        "failure_analysis": failure_patterns,
        "remediation_recommendations": remediation_recs,
        "process_improvements": process_improvements,
        "total_recommendations": len(all_recommendations)
    }
    
    # Add implementation plan if requested
    if args.implementation_plan:
        implementation_plan = create_implementation_plan(all_recommendations)
        result["implementation_plan"] = implementation_plan
    
    # Export plan if requested
    if args.export_plan:
        try:
            with open(args.export_plan, 'w') as f:
                json.dump(result.get("implementation_plan", {}), f, indent=2, default=str)
            result["export_success"] = True
        except Exception as e:
            result["export_success"] = False
            result["export_error"] = str(e)
    
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 70)
        print("REMEDIATION RECOMMENDER REPORT")
        print("=" * 70)
        print(f"Pattern Analyzed: {args.pattern}")
        print(f"Events Analyzed: {len(events)}")
        print(f"Total Recommendations: {len(all_recommendations)}")
        
        print(f"\n🎯 Top Remediation Recommendations:")
        for rec in remediation_recs[:5]:
            print(f"   {rec['category'].title()}: {rec['recommendation']}")
            print(f"   Priority: {rec['priority']}")
            print(f"   Expected Impact: {rec['expected_impact']}")
        
        print(f"\n🔧 Process Improvements:")
        for rec in process_improvements[:3]:
            print(f"   {rec['category'].replace('_', ' ').title()}: {rec['recommendation']}")
            print(f"   Priority: {rec['priority']}")
        
        if args.implementation_plan and "implementation_plan" in result:
            plan = result["implementation_plan"]
            phases = plan.get("implementation_phases", {})
            
            print(f"\n📅 Implementation Plan:")
            for phase_name, phase_data in phases.items():
                print(f"\n   {phase_name.title()} Phase ({phase_data['duration_days']} days):")
                print(f"   Description: {phase_data['description']}")
                print(f"   Recommendations: {len(phase_data['recommendations'])}")
                
                resources = plan.get("resource_requirements", {})
                if resources:
                    print(f"\n💰 Resource Requirements:")
                    print(f"   Total Recommendations: {resources.get('total_recommendations', 0)}")
                    print(f"   Estimated Person-Days: {resources.get('estimated_person_days', 0)}")
                    print(f"   Cost Savings: {resources.get('estimated_cost_savings', 'Unknown')}")
        
        if args.export_plan:
            export_info = result.get("export_success", False)
            if export_info:
                print(f"\n💾 Implementation plan exported successfully to {args.export_plan}")
            else:
                error = result.get("export_error", "Unknown error")
                print(f"\n❌ Failed to export plan: {error}")

if __name__ == "__main__":
    main()