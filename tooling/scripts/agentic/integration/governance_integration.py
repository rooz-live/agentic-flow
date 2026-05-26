#!/usr/bin/env python3
"""
Governance Integration for Pattern Analysis
Integrates pattern analysis tools with existing governance systems
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


def load_pattern_events() -> List[Dict[str, Any]]:
    """Load pattern events from pattern_metrics.jsonl"""
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


def create_governance_recommendation(
    pattern_analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """Create governance recommendation based on pattern analysis"""
    failure_rate = pattern_analysis.get("failure_rate", 0)
    
    if failure_rate > 20:
        return {
            "type": "governance_action",
            "priority": "high",
            "title": "Critical Pattern Failure Rate Detected",
            "description": (
                f"Code-fix-proposal failure rate of {failure_rate:.1f}% "
                f"exceeds acceptable threshold"
            ),
            "recommendation": (
                "Initiate governance review and implement "
                "immediate corrective actions"
            ),
            "action_items": [
                "Schedule emergency governance meeting",
                "Implement temporary moratorium on high-risk pattern changes",
                "Require root cause analysis for all failures > 15%",
                "Assign accountability for pattern improvement initiatives"
            ],
            "economic_impact": {
                "current_cost": failure_rate * 10000,  # Estimated monthly cost
                "potential_savings": (
                    (failure_rate - 10) * 10000
                ),  # Potential savings with 10% target
                "roi_period_months": 6
            },
            "metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "pattern_type": "code-fix-proposal",
                "governance_domain": "technical_operations",
                "accountability": "system_architect"
            }
        }
    elif failure_rate > 10:
        return {
            "type": "governance_action",
            "priority": "medium",
            "title": "Elevated Pattern Failure Rate",
            "description": (
                f"Code-fix-proposal failure rate of {failure_rate:.1f}% "
                f"requires attention"
            ),
            "recommendation": (
                "Increase monitoring and implement process improvements"
            ),
            "action_items": [
                "Enhance failure tracking and alerting",
                "Conduct pattern-specific training",
                "Review and update pattern implementation guidelines"
            ],
            "economic_impact": {
                "current_cost": failure_rate * 5000,
                "potential_savings": (failure_rate - 5) * 5000,
                "roi_period_months": 3
            },
            "metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "pattern_type": "code-fix-proposal",
                "governance_domain": "technical_operations",
                "accountability": "system_architect"
            }
        }
    else:
        return {
            "type": "governance_info",
            "priority": "low",
            "title": "Pattern Failure Rate Within Acceptable Range",
            "description": (
                f"Code-fix-proposal failure rate of {failure_rate:.1f}% "
                f"is within acceptable range"
            ),
            "recommendation": (
                "Continue monitoring and maintain current processes"
            ),
            "action_items": [
                "Maintain regular pattern reviews",
                "Share best practices across circles",
                "Monitor for emerging failure patterns"
            ],
            "metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "pattern_type": "code-fix-proposal",
                "governance_domain": "technical_operations",
                "accountability": "system_architect"
            }
        }


def create_retrospective_insights(
    pattern_analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """Create retrospective insights for pattern analysis"""
    total_events = pattern_analysis.get("total_events_analyzed", 0)
    
    if total_events > 0:
        # Generate insights for retrospective
        insights = []
        
        # Top failure patterns
        failure_patterns = pattern_analysis.get("failure_patterns", {})
        if failure_patterns:
            top_failures = sorted(
                failure_patterns.items(), key=lambda x: x[1], reverse=True
            )[:3]
            for pattern, count in top_failures:
                insights.append({
                    "type": "failure_pattern",
                    "pattern": pattern,
                    "count": count,
                    "insight": (
                        f"Pattern '{pattern}' accounts for {count} failures"
                    )
                })
        
        # Success patterns
        success_patterns = pattern_analysis.get("success_patterns", {})
        if success_patterns:
            top_successes = sorted(
                success_patterns.items(), key=lambda x: x[1], reverse=True
            )[:3]
            for pattern, count in top_successes:
                insights.append({
                    "type": "success_pattern",
                    "pattern": pattern,
                    "count": count,
                    "insight": (
                        f"Pattern '{pattern}' has {count} successful implementations"
                    )
                })
        
        return {
            "type": "retrospective_insights",
            "total_patterns_analyzed": total_events,
            "insights": insights,
            "metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "pattern_type": "code-fix-proposal",
                "retrospective_period": "current_analysis"
            }
        }
    else:
        return {
            "type": "retrospective_insights",
            "total_patterns_analyzed": 0,
            "insights": [],
            "metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "pattern_type": "code-fix-proposal",
                "retrospective_period": "current_analysis",
                "error": "No events to analyze"
            }
        }


def integrate_with_governance_system(
    pattern_analysis: Dict[str, Any],
    root_cause_analysis: Optional[Dict[str, Any]] = None,
    failure_tracking: Optional[Dict[str, Any]] = None,
    remediation_recommendations: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Integrate pattern analysis with governance systems"""
    
    integration_result = {
        "integration_timestamp": datetime.now(timezone.utc).isoformat(),
        "pattern_type": "code-fix-proposal",
        "base_analysis": pattern_analysis,
        "governance_recommendations": []
    }
    
    # Create governance recommendation
    governance_rec = create_governance_recommendation(pattern_analysis)
    integration_result["governance_recommendations"].append(governance_rec)
    
    # Create retrospective insights
    retro_insights = create_retrospective_insights(pattern_analysis)
    integration_result["retrospective_insights"] = retro_insights
    
    # Add additional analysis if available
    if root_cause_analysis:
        integration_result["root_cause_analysis"] = root_cause_analysis
    
    if failure_tracking:
        integration_result["failure_tracking"] = failure_tracking
    
    if remediation_recommendations:
        integration_result["remediation_recommendations"] = (
            remediation_recommendations
        )
    
    return integration_result

def main():
    """Main integration function"""
    events = load_pattern_events()
    code_fix_events = [e for e in events if is_code_fix_event(e)]
    
    if not code_fix_events:
        print(
            "No code-fix events found for governance integration",
            file=sys.stderr
        )
        return
    
    # Perform basic pattern analysis
    # This would typically call pattern_analysis.main() but we'll simulate here
    pattern_analysis = {
        "total_events_analyzed": len(code_fix_events),
        "failure_rate": (len([e for e in code_fix_events if e.get("status") == "failed"]) / len(code_fix_events)) * 100,
        "top_failure_patterns": {},
        "success_patterns": {}
    }
    
    # Generate integration result
    result = integrate_with_governance_system(pattern_analysis)
    
    # Output integration result
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    main()