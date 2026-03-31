#!/usr/bin/env python3
"""
Allocation Efficiency Analyzer

Calculates allocation efficiency metrics including:
- Revenue concentration (Gini coefficient)
- Underutilized circles (below 10% of avg iterations)
- Circle-level ROI and recommendations
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Tuple
import argparse


def get_goalie_dir() -> Path:
    """Get .goalie directory path"""
    project_root = os.environ.get("PROJECT_ROOT", ".")
    return Path(project_root) / ".goalie"


def load_pattern_events(days_back: int = 30) -> List[Dict[str, Any]]:
    """Load pattern events from the last N days"""
    metrics_file = get_goalie_dir() / "pattern_metrics.jsonl"
    
    if not metrics_file.exists():
        return []
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_back)
    events = []
    
    with open(metrics_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
                
                # Parse timestamp
                timestamp_str = event.get("timestamp", event.get("ts", ""))
                if timestamp_str:
                    try:
                        event_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        if event_time >= cutoff_date:
                            events.append(event)
                    except:
                        pass
                        
            except json.JSONDecodeError:
                continue
    
    return events


def calculate_gini_coefficient(values: List[float]) -> float:
    """
    Calculate Gini coefficient for revenue distribution.
    
    Returns value between 0 (perfect equality) and 1 (perfect inequality).
    """
    if not values or len(values) == 0:
        return 0.0
    
    sorted_values = sorted(values)
    n = len(sorted_values)
    
    # Calculate Gini coefficient using the formula:
    # G = (2 * sum(i * x_i)) / (n * sum(x_i)) - (n + 1) / n
    
    total = sum(sorted_values)
    if total == 0:
        return 0.0
    
    weighted_sum = sum((i + 1) * val for i, val in enumerate(sorted_values))
    gini = (2 * weighted_sum) / (n * total) - (n + 1) / n
    
    return round(gini, 4)


def analyze_allocation_efficiency(events: List[Dict[str, Any]], days_back: int = 30) -> Dict[str, Any]:
    """Analyze allocation efficiency across circles"""
    
    # Initialize tracking structures
    circle_metrics = defaultdict(lambda: {
        'iterations': 0,
        'total_revenue': 0.0,
        'total_cod': 0.0,
        'total_wsjf': 0.0,
        'completed_actions': 0,
        'failed_actions': 0,
        'patterns': set()
    })
    
    total_iterations = 0
    
    # Aggregate metrics by circle
    for event in events:
        circle = event.get('circle', 'unknown')
        economic = event.get('economic', {})
        
        # Track iterations (run_kind == 'prod-cycle' counts as an iteration)
        if event.get('run_kind') == 'prod-cycle':
            circle_metrics[circle]['iterations'] += 1
            total_iterations += 1
        
        # Track revenue impact
        revenue_impact = economic.get('revenue_impact', 0.0)
        circle_metrics[circle]['total_revenue'] += revenue_impact
        
        # Track economic metrics
        circle_metrics[circle]['total_cod'] += economic.get('cod', 0.0)
        circle_metrics[circle]['total_wsjf'] += economic.get('wsjf_score', 0.0)
        
        # Track action completion
        if event.get('action_completed', True):
            circle_metrics[circle]['completed_actions'] += 1
        else:
            circle_metrics[circle]['failed_actions'] += 1
        
        # Track patterns
        pattern = event.get('pattern', '')
        if pattern:
            circle_metrics[circle]['patterns'].add(pattern)
    
    # Calculate derived metrics
    results = {
        'period_days': days_back,
        'total_iterations': total_iterations,
        'total_events': len(events),
        'circles': {}
    }
    
    revenues = []
    for circle, metrics in circle_metrics.items():
        total_actions = metrics['completed_actions'] + metrics['failed_actions']
        success_rate = (metrics['completed_actions'] / total_actions) if total_actions > 0 else 0.0
        
        avg_cod = metrics['total_cod'] / total_actions if total_actions > 0 else 0.0
        avg_wsjf = metrics['total_wsjf'] / total_actions if total_actions > 0 else 0.0
        
        # Calculate ROI (revenue / cost of delay)
        roi = (metrics['total_revenue'] / metrics['total_cod']) if metrics['total_cod'] > 0 else 0.0
        
        results['circles'][circle] = {
            'iterations': metrics['iterations'],
            'total_revenue': round(metrics['total_revenue'], 2),
            'total_cod': round(metrics['total_cod'], 2),
            'avg_cod': round(avg_cod, 2),
            'avg_wsjf': round(avg_wsjf, 2),
            'success_rate': round(success_rate, 4),
            'roi': round(roi, 4),
            'completed_actions': metrics['completed_actions'],
            'failed_actions': metrics['failed_actions'],
            'pattern_count': len(metrics['patterns'])
        }
        
        revenues.append(metrics['total_revenue'])
    
    # Calculate Gini coefficient for revenue concentration
    results['revenue_concentration'] = {
        'gini_coefficient': calculate_gini_coefficient(revenues),
        'interpretation': ''
    }
    
    gini = results['revenue_concentration']['gini_coefficient']
    if gini < 0.3:
        results['revenue_concentration']['interpretation'] = 'Low inequality - revenue well distributed'
    elif gini < 0.5:
        results['revenue_concentration']['interpretation'] = 'Moderate inequality - some concentration'
    elif gini < 0.7:
        results['revenue_concentration']['interpretation'] = 'High inequality - significant concentration'
    else:
        results['revenue_concentration']['interpretation'] = 'Very high inequality - extreme concentration'
    
    # Identify underutilized circles
    if total_iterations > 0:
        avg_iterations = total_iterations / len(circle_metrics)
        threshold = avg_iterations * 0.1  # 10% of average
        
        underutilized = []
        for circle, metrics in results['circles'].items():
            if metrics['iterations'] < threshold and metrics['iterations'] > 0:
                underutilized.append({
                    'circle': circle,
                    'iterations': metrics['iterations'],
                    'avg_iterations': round(avg_iterations, 2),
                    'utilization_pct': round((metrics['iterations'] / avg_iterations) * 100, 2)
                })
        
        results['underutilized_circles'] = sorted(underutilized, key=lambda x: x['utilization_pct'])
    else:
        results['underutilized_circles'] = []
    
    # Generate recommendations
    results['recommendations'] = generate_recommendations(results)
    
    return results


def generate_recommendations(analysis: Dict[str, Any]) -> List[str]:
    """Generate actionable recommendations based on analysis"""
    recommendations = []
    
    # Revenue concentration recommendations
    gini = analysis['revenue_concentration']['gini_coefficient']
    if gini > 0.6:
        recommendations.append(
            f"⚠️  HIGH revenue concentration (Gini={gini:.3f}): "
            "Consider diversifying work across more circles to reduce risk"
        )
    
    # Underutilized circles
    if analysis['underutilized_circles']:
        circles_list = ', '.join([u['circle'] for u in analysis['underutilized_circles'][:3]])
        recommendations.append(
            f"📊 Underutilized circles detected: {circles_list}. "
            "Run backlog replenishment to increase engagement"
        )
    
    # Low ROI circles
    low_roi_circles = [
        (circle, data['roi']) 
        for circle, data in analysis['circles'].items() 
        if data['roi'] < 1.0 and data['total_revenue'] > 0
    ]
    
    if low_roi_circles:
        low_roi_circles.sort(key=lambda x: x[1])
        circle, roi = low_roi_circles[0]
        recommendations.append(
            f"💰 Circle '{circle}' has low ROI ({roi:.2f}): "
            "Review CoD attribution or optimize work selection"
        )
    
    # Low success rate circles
    low_success = [
        (circle, data['success_rate'])
        for circle, data in analysis['circles'].items()
        if data['success_rate'] < 0.7 and data['completed_actions'] + data['failed_actions'] > 5
    ]
    
    if low_success:
        low_success.sort(key=lambda x: x[1])
        circle, rate = low_success[0]
        recommendations.append(
            f"❌ Circle '{circle}' has low success rate ({rate:.1%}): "
            "Investigate failure patterns and add guardrails"
        )
    
    if not recommendations:
        recommendations.append("✅ No critical allocation issues detected")
    
    return recommendations


def print_analysis(analysis: Dict[str, Any], json_output: bool = False):
    """Print allocation efficiency analysis"""
    if json_output:
        print(json.dumps(analysis, indent=2, default=str))
        return
    
    print("=" * 80)
    print("ALLOCATION EFFICIENCY ANALYSIS")
    print("=" * 80)
    
    print(f"\n📅 Period: Last {analysis['period_days']} days")
    print(f"📊 Total Iterations: {analysis['total_iterations']}")
    print(f"📝 Total Events: {analysis['total_events']}")
    
    # Revenue Concentration
    print(f"\n💰 Revenue Concentration:")
    gini = analysis['revenue_concentration']['gini_coefficient']
    interpretation = analysis['revenue_concentration']['interpretation']
    print(f"   Gini Coefficient: {gini:.4f}")
    print(f"   Interpretation: {interpretation}")
    
    # Circle Metrics
    print(f"\n🎯 Circle Metrics:")
    circles = sorted(
        analysis['circles'].items(), 
        key=lambda x: x[1]['total_revenue'], 
        reverse=True
    )
    
    for circle, metrics in circles:
        print(f"\n   {circle.upper()}:")
        print(f"      Iterations: {metrics['iterations']}")
        print(f"      Revenue: ${metrics['total_revenue']:,.2f}")
        print(f"      ROI: {metrics['roi']:.2f}x")
        print(f"      Success Rate: {metrics['success_rate']:.1%}")
        print(f"      Avg CoD: {metrics['avg_cod']:.2f}")
        print(f"      Avg WSJF: {metrics['avg_wsjf']:.2f}")
        print(f"      Patterns: {metrics['pattern_count']}")
    
    # Underutilized Circles
    if analysis['underutilized_circles']:
        print(f"\n⚠️  Underutilized Circles (<10% of avg):")
        for underutil in analysis['underutilized_circles']:
            print(f"   • {underutil['circle']}: {underutil['iterations']} iterations "
                  f"({underutil['utilization_pct']:.1f}% of avg)")
    
    # Recommendations
    print(f"\n💡 Recommendations:")
    for rec in analysis['recommendations']:
        print(f"   {rec}")


def main():
    parser = argparse.ArgumentParser(description="Allocation Efficiency Analyzer")
    parser.add_argument("--days", type=int, default=30, help="Days of history to analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    events = load_pattern_events(days_back=args.days)
    
    if not events:
        print(f"No pattern events found in last {args.days} days", file=sys.stderr)
        sys.exit(1)
    
    analysis = analyze_allocation_efficiency(events, days_back=args.days)
    print_analysis(analysis, json_output=args.json)


if __name__ == "__main__":
    main()
