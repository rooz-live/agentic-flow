#!/usr/bin/env python3
"""
WSJF Hygiene Health Check
Validates that backlog items have properly set WSJF scores
Part of prod-cycle preflight validation
"""

import sys
import yaml
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List


def check_wsjf_hygiene(kanban_file: str = ".goalie/KANBAN_BOARD.yaml") -> Dict:
    """
    Check for unset or stale WSJF values in backlog
    
    Returns:
        Dict with:
        - detected: bool
        - severity: str ('low', 'medium', 'high')
        - unset_count: int
        - stale_count: int
        - message: str
        - fix: str (command to fix)
        - items: list of problematic items
    """
    kanban_path = Path(kanban_file)
    
    if not kanban_path.exists():
        return {
            'detected': True,
            'severity': 'high',
            'message': f"KANBAN_BOARD.yaml not found at {kanban_file}",
            'fix': None
        }
    
    with open(kanban_path, 'r') as f:
        kanban = yaml.safe_load(f)
    
    unset_items = []
    stale_items = []
    total_items = 0
    
    # Check items in prioritized columns
    for column in ['NEXT', 'LATER', 'NOW']:
        items = kanban.get(column, [])
        total_items += len(items)
        
        for item in items:
            item_id = item.get('id', 'unknown')
            wsjf = item.get('wsjf', 0)
            created_at = item.get('created_at')
            
            # Check if WSJF is unset (0 or None)
            if wsjf == 0 or wsjf is None:
                unset_items.append({
                    'id': item_id,
                    'title': item.get('title', 'No title')[:50],
                    'circle': item.get('circle', 'unknown'),
                    'column': column
                })
            
            # Check if WSJF is stale (>7 days old and unchanged)
            elif created_at:
                try:
                    if isinstance(created_at, str):
                        created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        created_date = created_at
                    
                    days_old = (datetime.now(timezone.utc) - created_date).days
                    
                    # Flag as stale if >21 days old with original WSJF=1 (default)
                    if days_old > 21 and abs(wsjf - 1.0) < 0.1:
                        stale_items.append({
                            'id': item_id,
                            'title': item.get('title', 'No title')[:50],
                            'circle': item.get('circle', 'unknown'),
                            'days_old': days_old,
                            'wsjf': wsjf
                        })
                except:
                    pass
    
    # Determine severity
    unset_count = len(unset_items)
    stale_count = len(stale_items)
    
    if unset_count == 0 and stale_count == 0:
        return {
            'detected': False,
            'severity': 'none',
            'unset_count': 0,
            'stale_count': 0,
            'total_items': total_items,
            'message': f"✅ WSJF hygiene: All {total_items} items have valid WSJF scores"
        }
    
    # Calculate severity
    unset_pct = (unset_count / total_items * 100) if total_items > 0 else 0
    stale_pct = (stale_count / total_items * 100) if total_items > 0 else 0
    
    if unset_pct > 20:
        severity = 'high'
    elif unset_pct > 5 or stale_pct > 30:
        severity = 'medium'
    else:
        severity = 'low'
    
    # Build message
    messages = []
    if unset_count > 0:
        messages.append(f"{unset_count} items ({unset_pct:.1f}%) with unset WSJF scores")
    if stale_count > 0:
        messages.append(f"{stale_count} items ({stale_pct:.1f}%) with stale WSJF (>21 days)")
    
    message = "; ".join(messages)
    
    return {
        'detected': True,
        'severity': severity,
        'unset_count': unset_count,
        'stale_count': stale_count,
        'total_items': total_items,
        'message': message,
        'fix': 'python3 scripts/circles/wsjf_automation_engine.py --mode auto',
        'unset_items': unset_items[:5],  # First 5 for display
        'stale_items': stale_items[:5]
    }


def main():
    """CLI entry point"""
    result = check_wsjf_hygiene()
    
    if not result['detected']:
        print(result['message'])
        return 0
    
    # Display results
    severity_emoji = {'low': '🟢', 'medium': '🟡', 'high': '🔴'}
    emoji = severity_emoji.get(result['severity'], '⚪')
    
    print(f"\n{emoji} WSJF Hygiene Check [{result['severity'].upper()}]")
    print("=" * 60)
    print(f"📊 {result['message']}")
    print(f"   Total items: {result['total_items']}")
    
    if result.get('unset_items'):
        print(f"\n🔴 Unset WSJF ({result['unset_count']} items):")
        for item in result['unset_items']:
            print(f"   • {item['id']} ({item['circle']}): {item['title']}")
        if result['unset_count'] > 5:
            print(f"   ... and {result['unset_count'] - 5} more")
    
    if result.get('stale_items'):
        print(f"\n⚠️  Stale WSJF ({result['stale_count']} items):")
        for item in result['stale_items']:
            print(f"   • {item['id']}: {item['days_old']} days old (WSJF={item['wsjf']})")
        if result['stale_count'] > 5:
            print(f"   ... and {result['stale_count'] - 5} more")
    
    if result.get('fix'):
        print(f"\n💡 Fix:")
        print(f"   {result['fix']}")
    
    # Exit code based on severity
    if result['severity'] == 'high':
        return 2
    elif result['severity'] == 'medium':
        return 1
    else:
        return 0


if __name__ == '__main__':
    sys.exit(main())
