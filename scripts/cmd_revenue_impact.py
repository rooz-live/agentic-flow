#!/usr/bin/env python3
"""
Revenue Impact Analyzer

Shows revenue attribution by circle with:
- Total revenue per circle
- Revenue trends over time
- ROI calculations
- CapEx/OpEx efficiency metrics
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any
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


def analyze_revenue_impact(events: List[Dict[str, Any]], days_back: int = 30) -> Dict[str, Any]:
    """Analyze revenue impact by circle"""
    
    # Initialize tracking
    circle_revenue = defaultdict(lambda: {
        'total_revenue': 0.0,
        'total_cod': 0.0,
        'total_capex_opex': 0.0,
        'total_infrastructure_util': 0.0,
        'event_count': 0,
        'daily_revenue': defaultdict(float),
        'patterns': defaultdict(float)
    })
    
    total_revenue = 0.0
    
    # Aggregate by circle
    for event in events:
        circle = event.get('circle', 'unknown')
        economic = event.get('economic', {})
        
        revenue = economic.get('revenue_impact', 0.0)
        cod = economic.get('cod', 0.0)
        capex_opex = economic.get('capex_opex_ratio', 0.0)
        infra_util = economic.get('infrastructure_utilization', 0.0)
        
        circle_revenue[circle]['total_revenue'] += revenue
        circle_revenue[circle]['total_cod'] += cod
        circle_revenue[circle]['total_capex_opex'] += capex_opex
        circle_revenue[circle]['total_infrastructure_util'] += infra_util
        circle_revenue[circle]['event_count'] += 1
        
        total_revenue += revenue
        
        # Track daily revenue for trends
        timestamp_str = event.get("timestamp", event.get("ts", ""))
        if timestamp_str:
            try:
                event_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                date_key = event_time.strftime('%Y-%m-%d')
                circle_revenue[circle]['daily_revenue'][date_key] += revenue
            except:
                pass
        
        # Track revenue by pattern
        pattern = event.get('pattern', 'unknown')
        circle_revenue[circle]['patterns'][pattern] += revenue
    
    # Calculate derived metrics
    results = {
        'period_days': days_back,
        'total_revenue': round(total_revenue, 2),
        'total_events': len(events),
        'circles': {}
    }
    
    for circle, data in circle_revenue.items():
        count = data['event_count']
        
        # Calculate averages
        avg_capex_opex = data['total_capex_opex'] / count if count > 0 else 0.0
        avg_infra_util = data['total_infrastructure_util'] / count if count > 0 else 0.0
        
        # Calculate ROI
        roi = data['total_revenue'] / data['total_cod'] if data['total_cod'] > 0 else 0.0
        
        # Calculate revenue percentage
        revenue_pct = (data['total_revenue'] / total_revenue * 100) if total_revenue > 0 else 0.0
        
        # Calculate trend (compare first half vs second half)
        daily_revenues = sorted(data['daily_revenue'].items())
        if len(daily_revenues) >= 2:
            midpoint = len(daily_revenues) // 2
            first_half = sum(rev for _, rev in daily_revenues[:midpoint])
            second_half = sum(rev for _, rev in daily_revenues[midpoint:])
            
            if first_half > 0:
                trend_pct = ((second_half - first_half) / first_half) * 100
            else:
                trend_pct = 100.0 if second_half > 0 else 0.0
        else:
            trend_pct = 0.0
        
        # Top revenue-generating patterns
        top_patterns = sorted(
            data['patterns'].items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        results['circles'][circle] = {
            'total_revenue': round(data['total_revenue'], 2),
            'revenue_percentage': round(revenue_pct, 2),
            'total_cod': round(data['total_cod'], 2),
            'roi': round(roi, 4),
            'avg_capex_opex_ratio': round(avg_capex_opex, 4),
            'avg_infrastructure_util': round(avg_infra_util, 2),
            'event_count': count,
            'trend_percentage': round(trend_pct, 2),
            'top_patterns': [
                {'pattern': p, 'revenue': round(r, 2)}
                for p, r in top_patterns
            ]
        }
    
    return results


def print_analysis(analysis: Dict[str, Any], json_output: bool = False):
    """Print revenue impact analysis"""
    if json_output:
        print(json.dumps(analysis, indent=2, default=str))
        return
    
    print("=" * 80)
    print("REVENUE IMPACT ANALYSIS")
    print("=" * 80)
    
    print(f"\n📅 Period: Last {analysis['period_days']} days")
    print(f"💰 Total Revenue: ${analysis['total_revenue']:,.2f}")
    print(f"📝 Total Events: {analysis['total_events']}")
    
    # Sort circles by revenue
    circles = sorted(
        analysis['circles'].items(),
        key=lambda x: x[1]['total_revenue'],
        reverse=True
    )
    
    print(f"\n🎯 Revenue by Circle:")
    print(f"{'Circle':<15} {'Revenue':>12} {'% Total':>8} {'ROI':>8} {'Trend':>8} {'Events':>8}")
    print("-" * 80)
    
    for circle, metrics in circles:
        trend_symbol = "📈" if metrics['trend_percentage'] > 0 else "📉" if metrics['trend_percentage'] < 0 else "➡️"
        print(f"{circle:<15} ${metrics['total_revenue']:>10,.2f} "
              f"{metrics['revenue_percentage']:>7.1f}% "
              f"{metrics['roi']:>7.2f}x "
              f"{trend_symbol}{abs(metrics['trend_percentage']):>6.1f}% "
              f"{metrics['event_count']:>7}")
    
    # Detailed circle breakdown
    print(f"\n📊 Detailed Circle Breakdown:")
    for circle, metrics in circles:
        print(f"\n{'=' * 60}")
        print(f"Circle: {circle.upper()}")
        print(f"{'=' * 60}")
        print(f"  Total Revenue: ${metrics['total_revenue']:,.2f} ({metrics['revenue_percentage']:.1f}% of total)")
        print(f"  ROI: {metrics['roi']:.2f}x (revenue/CoD)")
        print(f"  Trend: {metrics['trend_percentage']:+.1f}% (first half vs second half)")
        print(f"  Avg CapEx/OpEx Ratio: {metrics['avg_capex_opex_ratio']:.4f}")
        print(f"  Avg Infrastructure Utilization: {metrics['avg_infrastructure_util']:.2f}%")
        print(f"  Events: {metrics['event_count']}")
        
        if metrics['top_patterns']:
            print(f"\n  Top Revenue-Generating Patterns:")
            for i, pattern_data in enumerate(metrics['top_patterns'], 1):
                print(f"    {i}. {pattern_data['pattern']}: ${pattern_data['revenue']:,.2f}")
    
    # Summary insights
    print(f"\n\n💡 Key Insights:")
    
    if circles:
        top_circle, top_metrics = circles[0]
        print(f"   • Highest revenue: {top_circle} (${top_metrics['total_revenue']:,.2f})")
        
        # Find circle with best ROI
        best_roi_circle = max(circles, key=lambda x: x[1]['roi'])
        print(f"   • Best ROI: {best_roi_circle[0]} ({best_roi_circle[1]['roi']:.2f}x)")
        
        # Find fastest growing
        growing = [c for c in circles if c[1]['trend_percentage'] > 10]
        if growing:
            fastest = max(growing, key=lambda x: x[1]['trend_percentage'])
            print(f"   • Fastest growing: {fastest[0]} (+{fastest[1]['trend_percentage']:.1f}%)")
        
        # Infrastructure efficiency
        most_efficient = max(circles, key=lambda x: x[1]['avg_infrastructure_util'])
        print(f"   • Most efficient infrastructure: {most_efficient[0]} ({most_efficient[1]['avg_infrastructure_util']:.1f}% util)")


def main():
    parser = argparse.ArgumentParser(description="Revenue Impact Analyzer")
    parser.add_argument("--days", type=int, default=30, help="Days of history to analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--circle", help="Filter by specific circle")
    
    args = parser.parse_args()
    
    events = load_pattern_events(days_back=args.days)
    
    if not events:
        print(f"No pattern events found in last {args.days} days", file=sys.stderr)
        sys.exit(1)
    
    # Filter by circle if specified
    if args.circle:
        events = [e for e in events if e.get('circle') == args.circle]
        if not events:
            print(f"No events found for circle '{args.circle}'", file=sys.stderr)
            sys.exit(1)
    
    analysis = analyze_revenue_impact(events, days_back=args.days)
    print_analysis(analysis, json_output=args.json)


if __name__ == "__main__":
    main()
