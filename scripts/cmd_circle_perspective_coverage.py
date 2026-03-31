#!/usr/bin/env python3
"""
Circle Perspective Coverage

Measures decision lens telemetry across 6 circles to understand
how different perspectives contribute to system decisions.

Circles and their decision lenses:
- Analyst: Data quality judgments, lineage verification
- Assessor: Performance assurance, zero-insight verification  
- Innovator: Investment decisions, federation wiring
- Intuitive: Sensemaking, observability gap detection
- Orchestrator: Cadence & ceremony, BML cycle health
- Seeker: Exploration, dependency automation

Usage:
    ./scripts/af circle-perspective [--json]
    python3 cmd_circle_perspective_coverage.py [--json]
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List
from collections import defaultdict

# Circle definitions with their focus areas
CIRCLES = {
    "analyst": {
        "tier": 9,
        "role": "Standards Steward",
        "focus": "data_quality",
        "decision_types": ["data_quality", "lineage", "standards", "validation"]
    },
    "assessor": {
        "tier": 8,
        "role": "Performance Assurance",
        "focus": "verify_insights",
        "decision_types": ["performance", "verification", "quality_gates", "zero_insights"]
    },
    "innovator": {
        "tier": 11,
        "role": "Investment Council",
        "focus": "federation",
        "decision_types": ["investment", "federation", "innovation", "experiments"]
    },
    "intuitive": {
        "tier": 10,
        "role": "Sensemaking",
        "focus": "gaps",
        "decision_types": ["sensemaking", "observability", "gaps", "patterns"]
    },
    "orchestrator": {
        "tier": 10,
        "role": "Cadence & Ceremony",
        "focus": "bml_cycle",
        "decision_types": ["cadence", "ceremony", "coordination", "bml_health"]
    },
    "seeker": {
        "tier": 11,
        "role": "Exploration",
        "focus": "dependency_auto",
        "decision_types": ["exploration", "dependencies", "automation", "discovery"]
    }
}


def load_learning_evidence() -> List[Dict]:
    """Load learning evidence from .goalie/prod_learning_evidence.jsonl"""
    evidence_path = Path(".goalie/prod_learning_evidence.jsonl")
    if not evidence_path.exists():
        return []
    
    evidence = []
    with open(evidence_path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    evidence.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return evidence


def load_pattern_metrics() -> List[Dict]:
    """Load pattern metrics from .goalie/pattern_metrics.jsonl"""
    metrics_path = Path(".goalie/pattern_metrics.jsonl")
    if not metrics_path.exists():
        return []
    
    metrics = []
    with open(metrics_path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    metrics.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return metrics


def analyze_circle_decisions(evidence: List[Dict], metrics: List[Dict]) -> Dict:
    """Analyze decisions made by each circle."""
    circle_data = {}
    
    for circle_name, circle_info in CIRCLES.items():
        decisions = 0
        decision_types_seen = set()
        patterns = []
        
        # Check evidence
        for entry in evidence:
            if entry.get("circle") == circle_name:
                decisions += 1
                # Track decision types based on tags or patterns
                tags = entry.get("tags", [])
                for tag in tags:
                    for decision_type in circle_info["decision_types"]:
                        if decision_type in str(tag).lower():
                            decision_types_seen.add(decision_type)
        
        # Check metrics
        for entry in metrics:
            if entry.get("circle") == circle_name:
                decisions += 1
                pattern = entry.get("pattern", "")
                if pattern:
                    patterns.append(pattern)
                
                # Infer decision types from patterns
                pattern_lower = pattern.lower()
                for decision_type in circle_info["decision_types"]:
                    if decision_type in pattern_lower:
                        decision_types_seen.add(decision_type)
        
        # Calculate coverage
        expected_decision_types = len(circle_info["decision_types"])
        actual_decision_types = len(decision_types_seen)
        decision_type_coverage = (actual_decision_types / expected_decision_types * 100) if expected_decision_types > 0 else 0
        
        circle_data[circle_name] = {
            "decisions": decisions,
            "tier": circle_info["tier"],
            "role": circle_info["role"],
            "focus": circle_info["focus"],
            "decision_types_expected": expected_decision_types,
            "decision_types_seen": actual_decision_types,
            "decision_type_coverage": round(decision_type_coverage, 1),
            "patterns": list(set(patterns))[:5]  # Top 5 unique patterns
        }
    
    return circle_data


def calculate_overall_coverage(circle_data: Dict) -> Dict:
    """Calculate overall coverage metrics."""
    total_decisions = sum(c["decisions"] for c in circle_data.values())
    active_circles = sum(1 for c in circle_data.values() if c["decisions"] > 0)
    
    # Overall coverage percentage
    coverage_pct = (active_circles / len(CIRCLES)) * 100
    
    # Identify gaps
    missing_perspectives = [
        name for name, data in circle_data.items() 
        if data["decisions"] == 0
    ]
    
    # Identify underrepresented circles (< 10% of average)
    avg_decisions = total_decisions / len(CIRCLES) if len(CIRCLES) > 0 else 0
    underrepresented = [
        name for name, data in circle_data.items()
        if data["decisions"] < avg_decisions * 0.1 and data["decisions"] > 0
    ]
    
    return {
        "total_decisions": total_decisions,
        "active_circles": active_circles,
        "total_circles": len(CIRCLES),
        "coverage_pct": round(coverage_pct, 1),
        "missing_perspectives": missing_perspectives,
        "underrepresented": underrepresented
    }


def format_output(circle_data: Dict, overall: Dict, json_mode: bool = False) -> str:
    """Format circle perspective coverage output."""
    if json_mode:
        return json.dumps({
            "circle_coverage": circle_data,
            "overall": overall,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, indent=2)
    
    # Text output
    lines = []
    lines.append("")
    lines.append("🎯 CIRCLE PERSPECTIVE COVERAGE")
    lines.append("=" * 70)
    
    # Overall metrics
    lines.append(f"Total Decisions: {overall['total_decisions']}")
    lines.append(f"Active Circles: {overall['active_circles']}/{overall['total_circles']}")
    lines.append(f"Coverage: {overall['coverage_pct']}%")
    lines.append("")
    
    # Per-circle breakdown
    lines.append("Circle Breakdown:")
    lines.append("")
    
    for circle_name in sorted(CIRCLES.keys()):
        data = circle_data[circle_name]
        status_emoji = "✅" if data["decisions"] > 0 else "❌"
        
        lines.append(f"{status_emoji} {circle_name.upper()} (Tier {data['tier']})")
        lines.append(f"   Role: {data['role']}")
        lines.append(f"   Focus: {data['focus']}")
        lines.append(f"   Decisions: {data['decisions']}")
        lines.append(f"   Decision Type Coverage: {data['decision_type_coverage']}% " +
                    f"({data['decision_types_seen']}/{data['decision_types_expected']})")
        
        if data["patterns"]:
            lines.append(f"   Top Patterns: {', '.join(data['patterns'][:3])}")
        
        lines.append("")
    
    # Gaps
    if overall["missing_perspectives"]:
        lines.append("⚠️  Missing Perspectives:")
        for circle in overall["missing_perspectives"]:
            lines.append(f"   • {circle}: No decisions tracked")
        lines.append("")
    
    if overall["underrepresented"]:
        lines.append("⚠️  Underrepresented Circles:")
        for circle in overall["underrepresented"]:
            decisions = circle_data[circle]["decisions"]
            lines.append(f"   • {circle}: Only {decisions} decisions (<10% of average)")
        lines.append("")
    
    # Recommendations
    lines.append("💡 Recommendations:")
    if overall["missing_perspectives"]:
        lines.append("   1. Add telemetry for missing circles to capture decision lens data")
    if overall["underrepresented"]:
        lines.append("   2. Increase coverage for underrepresented circles")
    if overall["coverage_pct"] >= 80:
        lines.append("   ✅ Good coverage - continue monitoring")
    else:
        lines.append("   ⚠️  Coverage below 80% - focus on adding telemetry")
    
    lines.append("")
    lines.append("=" * 70)
    
    return "\n".join(lines)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Measure circle perspective coverage")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    
    args = parser.parse_args()
    
    # Load data
    evidence = load_learning_evidence()
    metrics = load_pattern_metrics()
    
    if not evidence and not metrics:
        if args.json:
            print(json.dumps({
                "error": "No data found",
                "message": "No learning evidence or pattern metrics found in .goalie/"
            }))
        else:
            print("❌ No data found. Run production cycles first.", file=sys.stderr)
        return 1
    
    # Analyze circles
    circle_data = analyze_circle_decisions(evidence, metrics)
    overall = calculate_overall_coverage(circle_data)
    
    # Output results
    output = format_output(circle_data, overall, args.json)
    print(output)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
