#!/usr/bin/env python3
"""
DoR/DoD Validation Utility
Validates backlog items against pattern-specific DoR/DoD templates

Usage:
    python scripts/patterns/validate_dor_dod.py <backlog_file> [--pattern PATTERN]
    python scripts/patterns/validate_dor_dod.py --check-all
"""

import argparse
import re
import sys
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = PROJECT_ROOT / "scripts" / "patterns" / "templates"


def load_pattern_template(pattern: str) -> Optional[Dict]:
    """Load DoR/DoD template for a pattern"""
    template_file = TEMPLATES_DIR / f"{pattern}.yaml"
    if not template_file.exists():
        return None
    
    with open(template_file, 'r') as f:
        return yaml.safe_load(f)


def parse_backlog_item(line: str) -> Optional[Dict]:
    """Parse a backlog item line into structured data"""
    # Format: | ID | Task | Status | Budget | Method Pattern | DoR | DoD | CoD | Size | WSJF |
    # Or: - [ ] #pattern:TDD #wsjf:11.0 Task description (CoD: X / Size: Y)
    
    # Try table format first
    if line.startswith('|'):
        parts = [p.strip() for p in line.split('|')[1:-1]]
        if len(parts) >= 10:
            return {
                'id': parts[0],
                'task': parts[1],
                'status': parts[2],
                'budget': parts[3],
                'pattern': parts[4],
                'dor': parts[5],
                'dod': parts[6],
                'cod': parts[7],
                'size': parts[8],
                'wsjf': parts[9]
            }
    
    # Try tag format
    pattern_match = re.search(r'#pattern:(\S+)', line)
    wsjf_match = re.search(r'#wsjf:([\d.]+)', line)
    desc_match = re.search(r'#wsjf:[\d.]+ (.+?) \(CoD:', line)
    
    if pattern_match and wsjf_match:
        return {
            'pattern': pattern_match.group(1),
            'wsjf': wsjf_match.group(1),
            'task': desc_match.group(1) if desc_match else 'Unknown',
            'dor': '',
            'dod': '',
            'status': 'PENDING'
        }
    
    return None


def validate_item(item: Dict, template: Dict) -> Tuple[bool, List[str]]:
    """Validate an item against DoR/DoD template"""
    issues = []
    
    # Check DoR
    dor = item.get('dor', '').strip()
    if not dor or dor in ['None', '-', '']:
        dor_criteria = template.get('definition_of_ready', [])
        if dor_criteria:
            issues.append(f"Missing DoR (expected {len(dor_criteria)} criteria)")
    
    # Check DoD
    dod = item.get('dod', '').strip()
    if not dod or dod in ['None', '-', '']:
        dod_criteria = template.get('definition_of_done', [])
        if dod_criteria:
            issues.append(f"Missing DoD (expected {len(dod_criteria)} criteria)")
    
    return len(issues) == 0, issues


def validate_backlog_file(backlog_path: Path, pattern: Optional[str] = None) -> Dict:
    """Validate all items in a backlog file"""
    if not backlog_path.exists():
        return {'error': f'File not found: {backlog_path}'}
    
    results = {
        'file': str(backlog_path),
        'total_items': 0,
        'valid_items': 0,
        'items_with_issues': []
    }
    
    with open(backlog_path, 'r') as f:
        for line_num, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            
            item = parse_backlog_item(line)
            if not item:
                continue
            
            results['total_items'] += 1
            
            # Get pattern from item or use override
            item_pattern = pattern or item.get('pattern', '')
            if not item_pattern or item_pattern in ['-', 'None']:
                results['items_with_issues'].append({
                    'line': line_num,
                    'task': item.get('task', 'Unknown'),
                    'issues': ['No pattern specified']
                })
                continue
            
            # Load template
            template = load_pattern_template(item_pattern)
            if not template:
                results['items_with_issues'].append({
                    'line': line_num,
                    'task': item.get('task', 'Unknown'),
                    'pattern': item_pattern,
                    'issues': [f'Template not found for pattern: {item_pattern}']
                })
                continue
            
            # Validate
            is_valid, issues = validate_item(item, template)
            if is_valid:
                results['valid_items'] += 1
            else:
                results['items_with_issues'].append({
                    'line': line_num,
                    'task': item.get('task', 'Unknown'),
                    'pattern': item_pattern,
                    'issues': issues
                })
    
    return results


def print_validation_report(results: Dict):
    """Print validation results in a readable format"""
    print(f"\n📋 Validation Report: {results['file']}")
    print("=" * 80)
    
    if 'error' in results:
        print(f"❌ {results['error']}")
        return
    
    total = results['total_items']
    valid = results['valid_items']
    invalid = len(results['items_with_issues'])
    
    print(f"Total Items: {total}")
    print(f"Valid Items: {valid} ({valid/total*100:.1f}%)" if total > 0 else "Valid Items: 0")
    print(f"Items with Issues: {invalid} ({invalid/total*100:.1f}%)" if total > 0 else "Items with Issues: 0")
    
    if results['items_with_issues']:
        print(f"\n⚠️  Issues Found:\n")
        for issue_item in results['items_with_issues'][:10]:  # Show first 10
            print(f"  Line {issue_item['line']}: {issue_item['task'][:60]}")
            if 'pattern' in issue_item:
                print(f"    Pattern: {issue_item['pattern']}")
            for issue in issue_item['issues']:
                print(f"    • {issue}")
            print()
        
        if len(results['items_with_issues']) > 10:
            print(f"  ... and {len(results['items_with_issues']) - 10} more issues")
    else:
        print("\n✅ All items have valid DoR/DoD!")


def check_all_backlogs():
    """Check all backlog files in circles/ directory"""
    circles_dir = PROJECT_ROOT / "circles"
    if not circles_dir.exists():
        print(f"❌ Circles directory not found: {circles_dir}")
        return
    
    backlog_files = list(circles_dir.rglob("backlog.md"))
    if not backlog_files:
        print("❌ No backlog.md files found")
        return
    
    print(f"\n🔍 Checking {len(backlog_files)} backlog files...\n")
    
    total_items = 0
    total_valid = 0
    total_issues = 0
    
    for backlog in backlog_files:
        results = validate_backlog_file(backlog)
        if 'error' not in results:
            total_items += results['total_items']
            total_valid += results['valid_items']
            total_issues += len(results['items_with_issues'])
            
            if results['items_with_issues']:
                print(f"⚠️  {backlog.relative_to(PROJECT_ROOT)}: {len(results['items_with_issues'])} issues")
    
    print(f"\n📊 Summary:")
    print(f"  Total Backlogs: {len(backlog_files)}")
    print(f"  Total Items: {total_items}")
    print(f"  Valid Items: {total_valid} ({total_valid/total_items*100:.1f}%)" if total_items > 0 else "Valid Items: 0")
    print(f"  Items with Issues: {total_issues} ({total_issues/total_items*100:.1f}%)" if total_items > 0 else "Items with Issues: 0")
    
    if total_issues > 0:
        print(f"\n💡 Run with specific backlog file to see detailed issues")
        sys.exit(1)
    else:
        print(f"\n✅ All backlog items have valid DoR/DoD!")


def main():
    parser = argparse.ArgumentParser(description="Validate backlog items against DoR/DoD templates")
    parser.add_argument('backlog_file', nargs='?', help='Path to backlog.md file')
    parser.add_argument('--pattern', help='Override pattern for validation')
    parser.add_argument('--check-all', action='store_true', help='Check all backlog files')
    parser.add_argument('--json', action='store_true', help='Output JSON')
    
    args = parser.parse_args()
    
    if args.check_all:
        check_all_backlogs()
        return
    
    if not args.backlog_file:
        parser.print_help()
        sys.exit(1)
    
    backlog_path = Path(args.backlog_file)
    results = validate_backlog_file(backlog_path, args.pattern)
    
    if args.json:
        import json
        print(json.dumps(results, indent=2))
    else:
        print_validation_report(results)
        
        # Exit code based on validation
        if results.get('items_with_issues'):
            sys.exit(1)


if __name__ == '__main__':
    main()
