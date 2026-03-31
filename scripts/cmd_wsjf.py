#!/usr/bin/env python3
"""
WSJF Command - Query and analyze WSJF prioritization
Usage:
    af wsjf [--json]               # Show all items with WSJF scores
    af wsjf-top [n]                # Show top N items by WSJF (default: 10)
    af wsjf-by-circle <circle>     # Show WSJF items for specific circle
"""

import sys
import yaml
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from collections import defaultdict

PROJECT_ROOT = Path.cwd()
ACTIONS_FILE = PROJECT_ROOT / ".goalie" / "CONSOLIDATED_ACTIONS.yaml"


def load_actions() -> Dict[str, Any]:
    """Load CONSOLIDATED_ACTIONS.yaml"""
    if not ACTIONS_FILE.exists():
        print(f"❌ Actions file not found: {ACTIONS_FILE}", file=sys.stderr)
        sys.exit(1)
    
    with open(ACTIONS_FILE, 'r') as f:
        return yaml.safe_load(f)


def parse_wsjf_item(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Parse a WSJF item from action data"""
    wsjf = item.get('wsjf_score')
    if wsjf is None:
        return None
    
    return {
        'id': item.get('id', 'unknown'),
        'title': item.get('title', 'No title'),
        'wsjf_score': float(wsjf) if wsjf else 0.0,
        'cost_of_delay': item.get('cost_of_delay', 0),
        'job_size': item.get('job_size', 0),
        'user_value': item.get('user_value', 0),
        'time_criticality': item.get('time_criticality', 0),
        'risk_reduction': item.get('risk_reduction', 0),
        'status': item.get('status', 'UNKNOWN'),
        'circle_owner': item.get('circle_owner', 'unknown'),
        'priority': item.get('priority', 'normal'),
        'pattern': item.get('pattern', '')
    }


def format_wsjf_table(items: List[Dict[str, Any]], max_title_width: int = 60):
    """Format WSJF items as a terminal table"""
    if not items:
        print("No items with WSJF scores found.")
        return
    
    # Header
    print(f"\n{'Rank':<5} {'ID':<25} {'Title':<{max_title_width}} {'WSJF':<8} {'CoD':<6} {'Size':<5} {'Circle':<12} {'Status':<12}")
    print("=" * (5 + 25 + max_title_width + 8 + 6 + 5 + 12 + 12 + 7))
    
    # Sort by WSJF descending
    sorted_items = sorted(items, key=lambda x: x['wsjf_score'], reverse=True)
    
    for rank, item in enumerate(sorted_items, start=1):
        title = item['title'][:max_title_width-3] + "..." if len(item['title']) > max_title_width else item['title']
        
        # Color coding based on status
        status = item['status']
        if status in ['DONE', 'COMPLETE', 'VALIDATED']:
            status_colored = f"\033[32m{status}\033[0m"  # Green
        elif status in ['IN_PROGRESS', 'PENDING']:
            status_colored = f"\033[33m{status}\033[0m"  # Yellow
        else:
            status_colored = status
        
        print(f"{rank:<5} {item['id']:<25} {title:<{max_title_width}} {item['wsjf_score']:<8.1f} {item['cost_of_delay']:<6} {item['job_size']:<5} {item['circle_owner']:<12} {status_colored:<12}")


def cmd_wsjf_all(output_json: bool = False):
    """Show all items with WSJF scores"""
    data = load_actions()
    items = data.get('items', [])
    
    wsjf_items = [parse_wsjf_item(item) for item in items]
    wsjf_items = [item for item in wsjf_items if item is not None]
    
    if output_json:
        print(json.dumps({'items': wsjf_items, 'count': len(wsjf_items)}, indent=2))
    else:
        print(f"\n🎯 WSJF Priority Queue ({len(wsjf_items)} items)")
        format_wsjf_table(wsjf_items)
        
        # Summary statistics
        if wsjf_items:
            avg_wsjf = sum(item['wsjf_score'] for item in wsjf_items) / len(wsjf_items)
            total_cod = sum(item['cost_of_delay'] for item in wsjf_items)
            print(f"\n📊 Summary:")
            print(f"  Average WSJF: {avg_wsjf:.2f}")
            print(f"  Total Cost of Delay: {total_cod}")


def cmd_wsjf_top(n: int = 10, output_json: bool = False):
    """Show top N items by WSJF score"""
    data = load_actions()
    items = data.get('items', [])
    
    wsjf_items = [parse_wsjf_item(item) for item in items]
    wsjf_items = [item for item in wsjf_items if item is not None]
    wsjf_items = sorted(wsjf_items, key=lambda x: x['wsjf_score'], reverse=True)[:n]
    
    if output_json:
        print(json.dumps({'items': wsjf_items, 'count': len(wsjf_items)}, indent=2))
    else:
        print(f"\n🏆 Top {n} Items by WSJF")
        format_wsjf_table(wsjf_items)
        
        if wsjf_items:
            print(f"\n💡 Recommendation: Start with {wsjf_items[0]['id']} - {wsjf_items[0]['title']}")


def cmd_wsjf_by_circle(circle: str, output_json: bool = False):
    """Show WSJF items for a specific circle"""
    data = load_actions()
    items = data.get('items', [])
    
    wsjf_items = [parse_wsjf_item(item) for item in items]
    wsjf_items = [item for item in wsjf_items if item is not None and item['circle_owner'].lower() == circle.lower()]
    
    if output_json:
        print(json.dumps({'circle': circle, 'items': wsjf_items, 'count': len(wsjf_items)}, indent=2))
    else:
        print(f"\n🎯 WSJF Items for {circle.capitalize()} Circle ({len(wsjf_items)} items)")
        format_wsjf_table(wsjf_items)
        
        if wsjf_items:
            # Circle-specific statistics
            avg_wsjf = sum(item['wsjf_score'] for item in wsjf_items) / len(wsjf_items)
            total_cod = sum(item['cost_of_delay'] for item in wsjf_items)
            completed = sum(1 for item in wsjf_items if item['status'] in ['DONE', 'COMPLETE', 'VALIDATED'])
            
            print(f"\n📊 {circle.capitalize()} Circle Summary:")
            print(f"  Average WSJF: {avg_wsjf:.2f}")
            print(f"  Total Cost of Delay: {total_cod}")
            print(f"  Completion Rate: {completed}/{len(wsjf_items)} ({completed/len(wsjf_items)*100:.1f}%)")


def cmd_wsjf_patterns(output_json: bool = False):
    """Analyze WSJF distribution by pattern"""
    data = load_actions()
    items = data.get('items', [])
    
    wsjf_items = [parse_wsjf_item(item) for item in items]
    wsjf_items = [item for item in wsjf_items if item is not None]
    
    # Group by pattern
    by_pattern = defaultdict(list)
    for item in wsjf_items:
        pattern = item.get('pattern', 'no-pattern')
        by_pattern[pattern].append(item)
    
    if output_json:
        result = {}
        for pattern, items in by_pattern.items():
            result[pattern] = {
                'count': len(items),
                'avg_wsjf': sum(i['wsjf_score'] for i in items) / len(items) if items else 0,
                'total_cod': sum(i['cost_of_delay'] for i in items)
            }
        print(json.dumps(result, indent=2))
    else:
        print(f"\n🔍 WSJF by Method Pattern")
        print(f"{'Pattern':<30} {'Count':<8} {'Avg WSJF':<10} {'Total CoD':<12}")
        print("=" * 62)
        
        for pattern in sorted(by_pattern.keys()):
            items = by_pattern[pattern]
            avg_wsjf = sum(i['wsjf_score'] for i in items) / len(items)
            total_cod = sum(i['cost_of_delay'] for i in items)
            print(f"{pattern:<30} {len(items):<8} {avg_wsjf:<10.2f} {total_cod:<12}")


def main():
    """Main entry point"""
    args = sys.argv[1:]
    
    # Check for --json flag
    output_json = '--json' in args
    if output_json:
        args.remove('--json')
    
    # Parse command
    if not args:
        cmd_wsjf_all(output_json)
    elif args[0] == '--top':
        n = int(args[1]) if len(args) > 1 else 10
        cmd_wsjf_top(n, output_json)
    elif args[0] == '--circle':
        if len(args) < 2:
            print("❌ Usage: af wsjf-by-circle <circle>", file=sys.stderr)
            sys.exit(1)
        cmd_wsjf_by_circle(args[1], output_json)
    elif args[0] == '--patterns':
        cmd_wsjf_patterns(output_json)
    else:
        print(f"❌ Unknown option: {args[0]}", file=sys.stderr)
        print("\nUsage:")
        print("  af wsjf [--json]                  # All items")
        print("  af wsjf-top [n]                   # Top N items (default: 10)")
        print("  af wsjf-by-circle <circle>        # Circle-specific items")
        print("  af wsjf --patterns                # Pattern analysis")
        sys.exit(1)


if __name__ == '__main__':
    main()
