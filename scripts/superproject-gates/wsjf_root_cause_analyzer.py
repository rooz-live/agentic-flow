#!/usr/bin/env python3
"""
WSJF Root Cause Analyzer Tool
Implements 5 Whys and Fishbone analysis for wsjf-enrichment failures
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

def wsjf_five_whys_analysis(failure_event: Dict[str, Any]) -> Dict[str, Any]:
    """Perform 5 Whys analysis on a wsjf-enrichment failure event"""
    # Extract key information from failure event
    pattern = failure_event.get("pattern", "unknown")
    circle = failure_event.get("circle", "unknown")
    depth = failure_event.get("depth", 0)
    tags = failure_event.get("tags", [])
    economic = failure_event.get("economic", {})
    wsjf_score = economic.get("wsjf_score", 0)
    cod = economic.get("cost_of_delay", 0)
    
    # Start with problem statement
    problem = f"WSJF-enrichment '{pattern}' failed in circle '{circle}'"
    
    # Perform 5 Whys
    whys = []
    
    # Why 1: Why did WSJF-enrichment fail?
    why1 = {
        "question": "Why did WSJF-enrichment fail?",
        "answer": _analyze_wsjf_immediate_failure_cause(failure_event),
        "category": "immediate_cause"
    }
    whys.append(why1)
    
    # Why 2: Why did the immediate cause occur?
    why2 = {
        "question": "Why did the immediate cause occur?",
        "answer": _analyze_wsjf_underlying_cause(why1["answer"], failure_event),
        "category": "underlying_cause"
    }
    whys.append(why2)
    
    # Why 3: Why did the underlying cause exist?
    why3 = {
        "question": "Why did the underlying cause exist?",
        "answer": _analyze_wsjf_systemic_issue(why2["answer"], failure_event),
        "category": "systemic_issue"
    }
    whys.append(why3)
    
    # Why 4: Why did the systemic issue persist?
    why4 = {
        "question": "Why did the systemic issue persist?",
        "answer": _analyze_wsjf_process_failure(why3["answer"], failure_event),
        "category": "process_failure"
    }
    whys.append(why4)
    
    # Why 5: Why did the process failure exist?
    why5 = {
        "question": "Why did the process failure exist?",
        "answer": _analyze_wsjf_root_cause(why4["answer"], failure_event),
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
        "corrective_actions": _generate_wsjf_corrective_actions(why5["answer"]),
        "preventive_actions": _generate_wsjf_preventive_actions(why5["answer"])
    }

def _analyze_wsjf_immediate_failure_cause(event: Dict[str, Any]) -> str:
    """Analyze immediate WSJF-enrichment failure cause"""
    status = event.get("status", "unknown")
    error_message = event.get("error_message", "")
    tags = event.get("tags", [])
    
    if "timeout" in error_message.lower():
        return "The WSJF-enrichment process timed out during execution"
    elif "permission" in error_message.lower():
        return "Insufficient permissions were encountered during enrichment"
    elif "calculation" in error_message.lower():
        return "WSJF score calculation encountered an error"
    elif "validation" in error_message.lower():
        return "WSJF value validation failed during enrichment"
    elif any("data" in tag.lower() for tag in tags):
        return "Data quality issues prevented proper enrichment"
    elif status == "failed":
        return "The WSJF-enrichment encountered an execution error"
    else:
        return "The WSJF-enrichment did not complete successfully"

def _analyze_wsjf_underlying_cause(immediate_cause: str, event: Dict[str, Any]) -> str:
    """Analyze underlying cause of WSJF-enrichment failure"""
    depth = event.get("depth", 0)
    tags = event.get("tags", [])
    economic = event.get("economic", {})
    wsjf_score = economic.get("wsjf_score", 0)
    
    if "timeout" in immediate_cause.lower():
        if depth > 3:
            return "The enrichment process was too complex for allocated time"
        else:
            return "Insufficient time was allocated for enrichment"
    
    if "permission" in immediate_cause.lower():
        return "Access controls were not properly configured for enrichment"
    
    if "calculation" in immediate_cause.lower():
        if wsjf_score > 15:
            return "Complex WSJF calculations exceeded system capacity"
        else:
            return "WSJF calculation algorithm has implementation issues"
    
    if "validation" in immediate_cause.lower():
        return "WSJF validation rules are too restrictive or incorrect"
    
    if "data" in immediate_cause.lower():
        return "Data quality and validation processes are inadequate"
    
    return "WSJF-enrichment technical implementation has gaps"

def _analyze_wsjf_systemic_issue(underlying_cause: str, event: Dict[str, Any]) -> str:
    """Analyze systemic issues in WSJF-enrichment"""
    circle = event.get("circle", "unknown")
    economic = event.get("economic", {})
    wsjf_score = economic.get("wsjf_score", 0)
    cod = economic.get("cost_of_delay", 0)
    
    if "complex" in underlying_cause.lower() or "time" in underlying_cause.lower():
        return "WSJF-enrichment complexity estimation processes are flawed"
    
    if "permission" in underlying_cause.lower():
        return "Security and access control processes are misaligned for enrichment"
    
    if "calculation" in underlying_cause.lower():
        return "WSJF calculation algorithms and validation processes are weak"
    
    if "validation" in underlying_cause.lower():
        return "WSJF validation and quality assurance processes are insufficient"
    
    if "data" in underlying_cause.lower():
        return "Data management and quality control processes are inadequate"
    
    if wsjf_score > 20 or cod > 40:
        return f"High-pressure enrichment environment in circle '{circle}' affects quality"
    
    return "WSJF-enrichment development and deployment processes lack proper safeguards"

def _analyze_wsjf_process_failure(systemic_issue: str, event: Dict[str, Any]) -> str:
    """Analyze process failures in WSJF-enrichment"""
    tags = event.get("tags", [])
    
    if "complexity" in systemic_issue.lower():
        return "WSJF-enrichment planning and estimation processes are inadequate"
    
    if "security" in systemic_issue.lower():
        return "WSJF-enrichment security review and compliance processes are insufficient"
    
    if "calculation" in systemic_issue.lower():
        return "WSJF calculation and algorithm validation processes are not integrated"
    
    if "validation" in systemic_issue.lower():
        return "WSJF quality assurance processes are not integrated early enough"
    
    if "data" in systemic_issue.lower():
        return "Data governance and quality processes are not properly established"
    
    if any("urgent" in tag.lower() for tag in tags):
        return "Urgency management processes override enrichment quality controls"
    
    return "WSJF-enrichment process governance and oversight mechanisms are weak"

def _analyze_wsjf_root_cause(process_failure: str, event: Dict[str, Any]) -> str:
    """Analyze root cause of WSJF-enrichment failure"""
    circle = event.get("circle", "unknown")
    
    if "planning" in process_failure.lower():
        return "Lack of standardized WSJF-enrichment planning methodologies"
    
    if "governance" in process_failure.lower():
        return "Insufficient governance framework for WSJF-enrichment"
    
    if "quality" in process_failure.lower():
        return "WSJF-enrichment quality assurance is treated as afterthought"
    
    if "calculation" in process_failure.lower():
        return "WSJF calculation algorithms lack proper validation and testing"
    
    if "data" in process_failure.lower():
        return "Data quality and governance processes are not properly established"
    
    if "urgency" in process_failure.lower():
        return "Culture of urgency prioritizes speed over enrichment quality"
    
    return f"Circle '{circle}' lacks mature WSJF-enrichment processes"

def _generate_wsjf_corrective_actions(root_cause: str) -> List[str]:
    """Generate corrective actions based on WSJF root cause"""
    actions = []
    
    if "planning" in root_cause.lower():
        actions.extend([
            "Implement standardized WSJF-enrichment planning templates",
            "Require peer review of enrichment complexity estimates",
            "Add time buffer for complex enrichments"
        ])
    
    if "governance" in root_cause.lower():
        actions.extend([
            "Establish clear governance framework for WSJF enrichments",
            "Define approval workflows based on enrichment risk level",
            "Implement automated enrichment compliance checks"
        ])
    
    if "quality" in root_cause.lower():
        actions.extend([
            "Integrate QA early in WSJF-enrichment process",
            "Implement automated enrichment testing pipelines",
            "Require enrichment quality thresholds"
        ])
    
    if "calculation" in root_cause.lower():
        actions.extend([
            "Review and validate WSJF calculation algorithms",
            "Implement comprehensive calculation testing",
            "Add calculation accuracy monitoring"
        ])
    
    if "data" in root_cause.lower():
        actions.extend([
            "Implement data quality validation processes",
            "Establish data governance framework",
            "Add automated data quality monitoring"
        ])
    
    if "urgency" in root_cause.lower():
        actions.extend([
            "Implement enrichment urgency classification system",
            "Protect enrichment quality gates from urgency overrides",
            "Balance speed and quality metrics for enrichments"
        ])
    
    if not actions:
        actions.extend([
            "Conduct comprehensive WSJF-enrichment process review",
            "Implement standardized enrichment operating procedures",
            "Add enrichment monitoring and alerting"
        ])
    
    return actions

def _generate_wsjf_preventive_actions(root_cause: str) -> List[str]:
    """Generate preventive actions based on WSJF root cause"""
    actions = []
    
    if "planning" in root_cause.lower():
        actions.extend([
            "Regular WSJF-enrichment planning process training",
            "Maintain and update enrichment planning templates",
            "Track enrichment planning accuracy metrics"
        ])
    
    if "governance" in root_cause.lower():
        actions.extend([
            "Regular WSJF-enrichment governance framework reviews",
            "Continuous enrichment process improvement program",
            "Stakeholder feedback loops for enrichment"
        ])
    
    if "quality" in root_cause.lower():
        actions.extend([
            "Invest in WSJF-enrichment testing infrastructure",
            "Continuous enrichment integration improvements",
            "Enrichment quality metrics dashboard"
        ])
    
    if "calculation" in root_cause.lower():
        actions.extend([
            "Regular WSJF calculation algorithm reviews",
            "Establish calculation validation standards",
            "Implement calculation accuracy tracking"
        ])
    
    if "data" in root_cause.lower():
        actions.extend([
            "Regular data quality training and audits",
            "Implement data quality improvement programs",
            "Establish data quality metrics and monitoring"
        ])
    
    if "urgency" in root_cause.lower():
        actions.extend([
            "Culture change initiatives for enrichment quality",
            "Leadership training on quality vs speed for enrichments",
            "Incentive alignment with enrichment quality outcomes"
        ])
    
    if not actions:
        actions.extend([
            "Establish continuous WSJF-enrichment improvement program",
            "Regular enrichment process audits",
            "Knowledge sharing and documentation for enrichments"
        ])
    
    return actions

def wsjf_fishbone_analysis(failure_events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Perform fishbone analysis on WSJF-enrichment failure events"""
    if not failure_events:
        return {"error": "No failure events provided for fishbone analysis"}
    
    # Fishbone categories for WSJF-enrichment
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
        if not is_wsjf_enrichment_event(event):
            continue
        
        if event.get("status") != "failed":
            continue
        
        tags = event.get("tags", [])
        error_msg = event.get("error_message", "").lower()
        circle = event.get("circle", "unknown")
        economic = event.get("economic", {})
        wsjf_score = economic.get("wsjf_score", 0)
        
        # Categorize potential causes
        if any("calculation" in tag.lower() for tag in tags) or "calculation" in error_msg:
            categories["methods"].append({
                "cause": "WSJF calculation method issues",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, Error: {error_msg}"
            })
        
        if any("algorithm" in tag.lower() for tag in tags) or "algorithm" in error_msg:
            categories["machines"].append({
                "cause": "WSJF algorithm or tool issues",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, Error: {error_msg}"
            })
        
        if any("data" in tag.lower() for tag in tags) or "data" in error_msg:
            categories["materials"].append({
                "cause": "Data quality or input issues",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, WSJF: {wsjf_score}"
            })
        
        if any("validation" in tag.lower() for tag in tags) or "validation" in error_msg:
            categories["measurements"].append({
                "cause": "WSJF validation or measurement issues",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, Error: {error_msg}"
            })
        
        if any("env" in tag.lower() for tag in tags) or "environment" in error_msg:
            categories["environment"].append({
                "cause": "WSJF-enrichment environment issues",
                "event_id": event.get("run_id", "unknown"),
                "evidence": f"Tags: {tags}, Circle: {circle}"
            })
        
        if any("review" in tag.lower() for tag in tags) or "human" in error_msg:
            categories["people"].append({
                "cause": "Human factors or review issues in enrichment",
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
        "total_failures_analyzed": len([e for e in failure_events if is_wsjf_enrichment_event(e) and e.get("status") == "failed"]),
        "categories": insights,
        "recommendations": _generate_wsjf_fishbone_recommendations(insights)
    }

def _generate_wsjf_fishbone_recommendations(insights: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations based on WSJF fishbone analysis"""
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
                    "issue": f"WSJF calculation method issues ({frequency} occurrences)",
                    "recommendation": "Standardize WSJF calculation methods and algorithms",
                    "actions": ["Create WSJF calculation standards", "Implement peer review for calculations"]
                })
            
            elif category == "machines":
                recommendations.append({
                    "category": "Machines/Tools",
                    "priority": "high",
                    "issue": f"WSJF algorithm or tool issues ({frequency} occurrences)",
                    "recommendation": "Improve WSJF calculation tools and infrastructure",
                    "actions": ["Upgrade WSJF calculation tools", "Implement automated tool validation"]
                })
            
            elif category == "materials":
                recommendations.append({
                    "category": "Materials/Data",
                    "priority": "high",
                    "issue": f"Data quality or input issues ({frequency} occurrences)",
                    "recommendation": "Strengthen data quality and input validation processes",
                    "actions": ["Implement data quality standards", "Add automated data validation"]
                })
            
            elif category == "measurements":
                recommendations.append({
                    "category": "Measurements",
                    "priority": "medium",
                    "issue": f"WSJF validation or measurement issues ({frequency} occurrences)",
                    "recommendation": "Enhance WSJF validation and measurement systems",
                    "actions": ["Implement comprehensive validation", "Add automated measurement collection"]
                })
            
            elif category == "environment":
                recommendations.append({
                    "category": "Environment",
                    "priority": "high",
                    "issue": f"WSJF-enrichment environment issues ({frequency} occurrences)",
                    "recommendation": "Improve enrichment environment management and testing",
                    "actions": ["Implement environment parity", "Add environment-specific testing"]
                })
            
            elif category == "people":
                recommendations.append({
                    "category": "People",
                    "priority": "medium",
                    "issue": f"Human factors or review issues ({frequency} occurrences)",
                    "recommendation": "Enhance training and review processes for enrichments",
                    "actions": ["Implement enrichment training programs", "Standardize review checklists"]
                })
    
    return recommendations

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="WSJF Root Cause Analyzer Tool")
    parser.add_argument("--input-file", help="Input pattern metrics file")
    parser.add_argument("--pattern", default="wsjf-enrichment", help="Pattern to analyze")
    parser.add_argument("--method", choices=["5whys", "fishbone", "both"], default="both", help="Analysis method")
    parser.add_argument("--event-id", help="Specific event ID for 5 Whys analysis")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--limit", type=int, default=10, help="Limit number of events to analyze")
    
    args = parser.parse_args()
    
    events = load_pattern_events(args.input_file)
    
    # Filter by pattern
    wsjf_events = [e for e in events if is_wsjf_enrichment_event(e)]
    
    # Filter by specific event ID if provided
    if args.event_id:
        wsjf_events = [e for e in wsjf_events if e.get("run_id") == args.event_id or e.get("correlation_id") == args.event_id]
    
    # Limit events if specified
    if args.limit:
        wsjf_events = wsjf_events[:args.limit]
    
    if not wsjf_events:
        print("No wsjf-enrichment events found", file=sys.stderr)
        sys.exit(1)
    
    result = {
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "method": args.method,
        "pattern_analyzed": args.pattern,
        "total_events_analyzed": len(wsjf_events)
    }
    
    if args.method in ["5whys", "both"]:
        # Perform 5 Whys on recent failures
        failed_events = [e for e in wsjf_events if e.get("status") == "failed"]
        
        if failed_events:
            if args.event_id:
                # Analyze specific event
                five_whys_result = wsjf_five_whys_analysis(failed_events[0])
                result["five_whys_analysis"] = five_whys_result
            else:
                # Analyze multiple events
                five_whys_results = []
                for event in failed_events[:3]:  # Limit to 3 for readability
                    five_whys_result = wsjf_five_whys_analysis(event)
                    five_whys_results.append(five_whys_result)
                result["five_whys_analysis"] = five_whys_results
    
    if args.method in ["fishbone", "both"]:
        fishbone_result = wsjf_fishbone_analysis(wsjf_events)
        result["fishbone_analysis"] = fishbone_result
    
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 70)
        print("WSJF ROOT CAUSE ANALYSIS REPORT")
        print("=" * 70)
        print(f"Analysis Method: {args.method}")
        print(f"Pattern Analyzed: {args.pattern}")
        print(f"Events Analyzed: {len(wsjf_events)}")
        
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