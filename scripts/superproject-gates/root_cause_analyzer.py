#!/usr/bin/env python3
"""
Root Cause Analyzer Tool
Implements 5 Whys and Fishbone analysis methods for code-fix-proposal failures
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

def five_whys_analysis(failure_event: Dict[str, Any]) -> Dict[str, Any]:
    """Perform 5 Whys analysis on a failure event"""
    # Extract key information from the failure event
    pattern = failure_event.get("pattern", "unknown")
    circle = failure_event.get("circle", "unknown")
    depth = failure_event.get("depth", 0)
    tags = failure_event.get("tags", [])
    economic = failure_event.get("economic", {})
    wsjf_score = economic.get("wsjf_score", 0)
    cod = economic.get("cost_of_delay", 0)
    
    # Start with the problem statement
    problem = f"Code-fix-proposal '{pattern}' failed in circle '{circle}'"
    
    # Perform 5 Whys
    whys = []
    
    # Why 1: Why did the code-fix-proposal fail?
    why1 = {
        "question": "Why did the code-fix-proposal fail?",
        "answer": _analyze_immediate_failure_cause(failure_event),
        "category": "immediate_cause"
    }
    whys.append(why1)
    
    # Why 2: Why did the immediate cause occur?
    why2 = {
        "question": "Why did the immediate cause occur?",
        "answer": _analyze_underlying_cause(why1["answer"], failure_event),
        "category": "underlying_cause"
    }
    whys.append(why2)
    
    # Why 3: Why did the underlying cause exist?
    why3 = {
        "question": "Why did the underlying cause exist?",
        "answer": _analyze_systemic_issue(why2["answer"], failure_event),
        "category": "systemic_issue"
    }
    whys.append(why3)
    
    # Why 4: Why did the systemic issue persist?
    why4 = {
        "question": "Why did the systemic issue persist?",
        "answer": _analyze_process_failure(why3["answer"], failure_event),
        "category": "process_failure"
    }
    whys.append(why4)
    
    # Why 5: Why did the process failure exist?
    why5 = {
        "question": "Why did the process failure exist?",
        "answer": _analyze_root_cause(why4["answer"], failure_event),
        "category": "root_cause"
    }
    whys.append(why5)
    
    return {
        "failure_event": {
            "pattern": pattern,
            "circle": circle,
            "depth": depth,
            "tags": tags,
            "wsjf_score": wsjf_score,
            "cost_of_delay": cod
        },
        "problem_statement": problem,
        "whys": whys,
        "root_cause": why5["answer"],
        "corrective_actions": _generate_corrective_actions(why5["answer"]),
        "preventive_actions": _generate_preventive_actions(why5["answer"])
    }

def _analyze_immediate_failure_cause(event: Dict[str, Any]) -> str:
    """Analyze immediate failure cause"""
    status = event.get("status", "unknown")
    error_message = event.get("error_message", "")
    
    if "timeout" in error_message.lower():
        return "The code-fix-proposal timed out during execution"
    elif "permission" in error_message.lower():
        return "Insufficient permissions were encountered during the fix"
    elif "dependency" in error_message.lower():
        return "A required dependency was missing or incompatible"
    elif "test" in error_message.lower() and "failed" in error_message.lower():
        return "One or more tests failed during validation"
    elif status == "failed":
        return "The code-fix-proposal encountered an execution error"
    else:
        return "The code-fix-proposal did not complete successfully"

def _analyze_underlying_cause(immediate_cause: str, event: Dict[str, Any]) -> str:
    """Analyze underlying cause of the immediate failure"""
    depth = event.get("depth", 0)
    tags = event.get("tags", [])
    
    if "timeout" in immediate_cause.lower():
        if depth > 3:
            return "The fix was too complex for the allocated time window"
        else:
            return "Insufficient time was allocated for the fix"
    
    if "permission" in immediate_cause.lower():
        return "Access controls were not properly configured"
    
    if "dependency" in immediate_cause.lower():
        return "Dependency management processes are inadequate"
    
    if "test" in immediate_cause.lower():
        if any("ui" in tag.lower() for tag in tags):
            return "UI testing infrastructure is insufficient"
        else:
            return "Test coverage is inadequate for the fix scope"
    
    return "Technical implementation processes have gaps"

def _analyze_systemic_issue(underlying_cause: str, event: Dict[str, Any]) -> str:
    """Analyze systemic issues"""
    circle = event.get("circle", "unknown")
    economic = event.get("economic", {})
    wsjf_score = economic.get("wsjf_score", 0)
    
    if "complex" in underlying_cause.lower() or "time" in underlying_cause.lower():
        return "Complexity estimation and time allocation processes are flawed"
    
    if "permission" in underlying_cause.lower():
        return "Security and access control processes are misaligned"
    
    if "dependency" in underlying_cause.lower():
        return "Dependency management and version control processes are weak"
    
    if "test" in underlying_cause.lower():
        return "Quality assurance and testing processes are insufficient"
    
    if wsjf_score > 15:
        return f"High-pressure work environment in circle '{circle}' affects quality"
    
    return "Development and deployment processes lack proper safeguards"

def _analyze_process_failure(systemic_issue: str, event: Dict[str, Any]) -> str:
    """Analyze process failures"""
    tags = event.get("tags", [])
    
    if "complexity" in systemic_issue.lower():
        return "Project planning and estimation processes are inadequate"
    
    if "security" in systemic_issue.lower():
        return "Security review and compliance processes are insufficient"
    
    if "testing" in systemic_issue.lower():
        return "Quality assurance processes are not integrated early enough"
    
    if any("urgent" in tag.lower() for tag in tags):
        return "Urgency management processes override quality controls"
    
    return "Process governance and oversight mechanisms are weak"

def _analyze_root_cause(process_failure: str, event: Dict[str, Any]) -> str:
    """Analyze the root cause"""
    circle = event.get("circle", "unknown")
    
    if "planning" in process_failure.lower():
        return "Lack of standardized planning methodologies and templates"
    
    if "governance" in process_failure.lower():
        return "Insufficient governance framework for code-fix proposals"
    
    if "quality" in process_failure.lower():
        return "Quality assurance is treated as afterthought rather than integral"
    
    if "urgency" in process_failure.lower():
        return "Culture of urgency prioritizes speed over quality"
    
    return f"Circle '{circle}' lacks mature development processes"

def _generate_corrective_actions(root_cause: str) -> List[str]:
    """Generate corrective actions based on root cause"""
    actions = []
    
    if "planning" in root_cause.lower():
        actions.extend([
            "Implement standardized planning templates",
            "Require peer review of fix complexity estimates",
            "Add time buffer for complex fixes"
        ])
    
    if "governance" in root_cause.lower():
        actions.extend([
            "Establish clear governance framework for fixes",
            "Define approval workflows based on risk level",
            "Implement automated compliance checks"
        ])
    
    if "quality" in root_cause.lower():
        actions.extend([
            "Integrate QA early in development process",
            "Implement automated testing pipelines",
            "Require test coverage thresholds"
        ])
    
    if "urgency" in root_cause.lower():
        actions.extend([
            "Implement urgency classification system",
            "Protect quality gates from urgency overrides",
            "Balance speed and quality metrics"
        ])
    
    if not actions:
        actions.extend([
            "Conduct comprehensive process review",
            "Implement standardized operating procedures",
            "Add monitoring and alerting"
        ])
    
    return actions

def _generate_preventive_actions(root_cause: str) -> List[str]:
    """Generate preventive actions based on root cause"""
    actions = []
    
    if "planning" in root_cause.lower():
        actions.extend([
            "Regular planning process training",
            "Maintain and update planning templates",
            "Track planning accuracy metrics"
        ])
    
    if "governance" in root_cause.lower():
        actions.extend([
            "Regular governance framework reviews",
            "Continuous process improvement program",
            "Stakeholder feedback loops"
        ])
    
    if "quality" in root_cause.lower():
        actions.extend([
            "Invest in testing infrastructure",
            "Continuous integration improvements",
            "Quality metrics dashboard"
        ])
    
    if "urgency" in root_cause.lower():
        actions.extend([
            "Culture change initiatives",
            "Leadership training on quality vs speed",
            "Incentive alignment with quality outcomes"
        ])
    
    if not actions:
        actions.extend([
            "Establish continuous improvement program",
            "Regular process audits",
            "Knowledge sharing and documentation"
        ])
    
    return actions

def fishbone_analysis(failure_events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Perform fishbone (Ishikawa) analysis on multiple failure events"""
    if not failure_events:
        return {"error": "No failure events provided for fishbone analysis"}
    
    # Fishbone categories
    categories = {
        "methods": [],
        "machines": [],
        "materials": [],
        "measurements": [],
        "environment": [],
        "people": []
    }
    
    # Analyze each failure event
    for event in failure_events:
        if event.get("status") != "failed":
            continue
        
        tags = event.get("tags", [])
        error_msg = event.get("error_message", "").lower()
        circle = event.get("circle", "unknown")
        depth = event.get("depth", 0)
        
        # Categorize potential causes
        if any("test" in tag.lower() for tag in tags) or "test" in error_msg:
            categories["methods"].append({
                "cause": "Inadequate testing methods",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, Error: {error_msg}"
            })
        
        if any("tool" in tag.lower() for tag in tags) or "build" in error_msg:
            categories["machines"].append({
                "cause": "Tool or build system issues",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, Error: {error_msg}"
            })
        
        if any("dependency" in tag.lower() for tag in tags) or "dependency" in error_msg:
            categories["materials"].append({
                "cause": "Dependency or library issues",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, Error: {error_msg}"
            })
        
        if any("metric" in tag.lower() for tag in tags) or "timeout" in error_msg:
            categories["measurements"].append({
                "cause": "Measurement or monitoring issues",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, Error: {error_msg}"
            })
        
        if any("prod" in tag.lower() for tag in tags) or "environment" in error_msg:
            categories["environment"].append({
                "cause": "Production environment issues",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, Circle: {circle}"
            })
        
        if any("review" in tag.lower() for tag in tags) or "human" in error_msg:
            categories["people"].append({
                "cause": "Human factors or review issues",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, Circle: {circle}"
            })
    
    # Generate insights for each category
    insights = {}
    for category, causes in categories.items():
        if causes:
            # Count frequency of specific causes
            cause_counts = {}
            for cause_info in causes:
                cause = cause_info["cause"]
                cause_counts[cause] = cause_counts.get(cause, 0) + 1
            
            insights[category] = {
                "total_causes": len(causes),
                "most_frequent": max(cause_counts.items(), key=lambda x: x[1]) if cause_counts else None,
                "causes": causes[:5]  # Top 5 causes
            }
    
    return {
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_failures_analyzed": len([e for e in failure_events if e.get("status") == "failed"]),
        "categories": insights,
        "recommendations": _generate_fishbone_recommendations(insights)
    }

def _generate_fishbone_recommendations(insights: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations based on fishbone analysis"""
    recommendations = []
    
    for category, data in insights.items():
        if not data or data["total_causes"] == 0:
            continue
        
        most_frequent = data.get("most_frequent")
        if most_frequent:
            cause, frequency = most_frequent
            
            if category == "methods":
                recommendations.append({
                    "category": "Methods",
                    "priority": "high",
                    "issue": f"Process method issues ({frequency} occurrences)",
                    "recommendation": "Standardize development and testing methods",
                    "actions": ["Create standard operating procedures", "Implement peer review requirements"]
                })
            
            elif category == "machines":
                recommendations.append({
                    "category": "Machines/Tools",
                    "priority": "high",
                    "issue": f"Tool or build system issues ({frequency} occurrences)",
                    "recommendation": "Improve tooling and build infrastructure",
                    "actions": ["Upgrade build tools", "Implement automated tool validation"]
                })
            
            elif category == "materials":
                recommendations.append({
                    "category": "Materials/Dependencies",
                    "priority": "high",
                    "issue": f"Dependency management issues ({frequency} occurrences)",
                    "recommendation": "Strengthen dependency management processes",
                    "actions": ["Implement dependency versioning", "Add automated dependency testing"]
                })
            
            elif category == "measurements":
                recommendations.append({
                    "category": "Measurements",
                    "priority": "medium",
                    "issue": f"Measurement or monitoring issues ({frequency} occurrences)",
                    "recommendation": "Enhance measurement and monitoring systems",
                    "actions": ["Implement comprehensive monitoring", "Add automated metrics collection"]
                })
            
            elif category == "environment":
                recommendations.append({
                    "category": "Environment",
                    "priority": "high",
                    "issue": f"Production environment issues ({frequency} occurrences)",
                    "recommendation": "Improve environment management and testing",
                    "actions": ["Implement environment parity", "Add environment-specific testing"]
                })
            
            elif category == "people":
                recommendations.append({
                    "category": "People",
                    "priority": "medium",
                    "issue": f"Human factors or review issues ({frequency} occurrences)",
                    "recommendation": "Enhance training and review processes",
                    "actions": ["Implement training programs", "Standardize review checklists"]
                })
    
    return recommendations

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Root Cause Analyzer Tool")
    parser.add_argument("--input-file", help="Input pattern metrics file")
    parser.add_argument("--pattern", default="code-fix-proposal", help="Pattern to analyze")
    parser.add_argument("--method", choices=["5whys", "fishbone", "both"], default="both", help="Analysis method")
    parser.add_argument("--event-id", help="Specific event ID for 5 Whys analysis")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--limit", type=int, default=10, help="Limit number of events to analyze")
    
    args = parser.parse_args()
    
    events = load_pattern_events(args.input_file)
    
    # Filter by pattern
    code_fix_events = [e for e in events if is_code_fix_event(e)]
    
    # Filter by specific event ID if provided
    if args.event_id:
        code_fix_events = [e for e in code_fix_events if e.get("run_id") == args.event_id or e.get("correlation_id") == args.event_id]
    
    # Limit events if specified
    if args.limit:
        code_fix_events = code_fix_events[:args.limit]
    
    if not code_fix_events:
        print("No code-fix-proposal events found", file=sys.stderr)
        sys.exit(1)
    
    result = {
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "method": args.method,
        "pattern_analyzed": args.pattern,
        "total_events_analyzed": len(code_fix_events)
    }
    
    if args.method in ["5whys", "both"]:
        # Perform 5 Whys on recent failures
        failed_events = [e for e in code_fix_events if e.get("status") == "failed"]
        
        if failed_events:
            if args.event_id:
                # Analyze specific event
                five_whys_result = five_whys_analysis(failed_events[0])
                result["five_whys_analysis"] = five_whys_result
            else:
                # Analyze multiple events
                five_whys_results = []
                for event in failed_events[:3]:  # Limit to 3 for readability
                    five_whys_result = five_whys_analysis(event)
                    five_whys_results.append(five_whys_result)
                result["five_whys_analysis"] = five_whys_results
    
    if args.method in ["fishbone", "both"]:
        fishbone_result = fishbone_analysis(code_fix_events)
        result["fishbone_analysis"] = fishbone_result
    
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 70)
        print("ROOT CAUSE ANALYSIS REPORT")
        print("=" * 70)
        print(f"Analysis Method: {args.method}")
        print(f"Pattern Analyzed: {args.pattern}")
        print(f"Events Analyzed: {len(code_fix_events)}")
        
        if "five_whys_analysis" in result:
            print(f"\n🔍 5 WHYS ANALYSIS:")
            if args.event_id:
                analysis = result["five_whys_analysis"]
                print(f"Problem: {analysis['problem_statement']}")
                print(f"Root Cause: {analysis['root_cause']}")
                
                print(f"\n📋 Why Sequence:")
                for i, why in enumerate(analysis['whys'], 1):
                    print(f"   Why {i}: {why['question']}")
                    print(f"   Answer: {why['answer']}")
                
                print(f"\n🔧 Corrective Actions:")
                for action in analysis['corrective_actions']:
                    print(f"   • {action}")
                
                print(f"\n🛡️  Preventive Actions:")
                for action in analysis['preventive_actions']:
                    print(f"   • {action}")
            else:
                for i, analysis in enumerate(result["five_whys_analysis"], 1):
                    print(f"\n--- Event {i} ---")
                    print(f"Problem: {analysis['problem_statement']}")
                    print(f"Root Cause: {analysis['root_cause']}")
        
        if "fishbone_analysis" in result:
            analysis = result["fishbone_analysis"]
            print(f"\n🐟 FISHBONE ANALYSIS:")
            print(f"Total Failures Analyzed: {analysis['total_failures_analyzed']}")
            
            categories = analysis.get("categories", {})
            for category, data in categories.items():
                if data and data["total_causes"] > 0:
                    print(f"\n📁 {category.title()}:")
                    print(f"   Total Causes: {data['total_causes']}")
                    if data.get("most_frequent"):
                        cause, freq = data["most_frequent"]
                        print(f"   Most Frequent: {cause} ({freq} times)")
            
            recommendations = analysis.get("recommendations", [])
            if recommendations:
                print(f"\n💡 RECOMMENDATIONS:")
                for rec in recommendations:
                    print(f"   {rec['category']}: {rec['recommendation']}")
                    print(f"   Priority: {rec['priority']}")
                    print(f"   Actions: {', '.join(rec['actions'])}")

if __name__ == "__main__":
    main()