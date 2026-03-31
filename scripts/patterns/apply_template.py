#!/usr/bin/env python3
"""
Apply Pattern Template - Auto-populate DoR/DoD from templates
Usage:
    python3 scripts/patterns/apply_template.py PATTERN --output-dor-dod
    python3 scripts/patterns/apply_template.py TDD --format markdown
"""

import argparse
import sys
import yaml
from pathlib import Path
from typing import Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = PROJECT_ROOT / "scripts" / "patterns" / "templates"


def load_template(pattern: str) -> Optional[Dict]:
    """Load pattern template YAML"""
    template_file = TEMPLATES_DIR / f"{pattern}.yaml"
    if not template_file.exists():
        print(f"❌ Template not found: {template_file}", file=sys.stderr)
        return None
    
    with open(template_file, 'r') as f:
        return yaml.safe_load(f)


def format_dor_markdown(template: Dict) -> str:
    """Format Definition of Ready as markdown"""
    dor_criteria = template.get('definition_of_ready', [])
    if not dor_criteria:
        return "None"
    
    lines = []
    for i, criterion in enumerate(dor_criteria, 1):
        name = criterion.get('criterion', 'Unknown')
        desc = criterion.get('description', '')
        lines.append(f"{i}. **{name}**: {desc}")
    
    return " | ".join(lines)


def format_dod_markdown(template: Dict) -> str:
    """Format Definition of Done as markdown"""
    dod_criteria = template.get('definition_of_done', [])
    if not dod_criteria:
        return "None"
    
    lines = []
    for i, criterion in enumerate(dod_criteria, 1):
        name = criterion.get('criterion', 'Unknown')
        desc = criterion.get('description', '')
        blocking = "🔴" if criterion.get('blocking') else "⚪"
        lines.append(f"{i}. {blocking} **{name}**: {desc}")
    
    return " | ".join(lines)


def format_dor_table(template: Dict) -> str:
    """Format DoR as table row content"""
    dor_criteria = template.get('definition_of_ready', [])
    if not dor_criteria:
        return "None"
    
    # Compact format for table cells
    summaries = [c.get('criterion', '') for c in dor_criteria]
    return ", ".join(summaries[:3])  # First 3 criteria


def format_dod_table(template: Dict) -> str:
    """Format DoD as table row content"""
    dod_criteria = template.get('definition_of_done', [])
    if not dod_criteria:
        return "None"
    
    # Show count and blocking criteria
    blocking_count = sum(1 for c in dod_criteria if c.get('blocking'))
    return f"{len(dod_criteria)} criteria ({blocking_count} blocking)"


def generate_wsjf_guidance(template: Dict) -> Dict:
    """Extract WSJF guidance from template"""
    guidance = template.get('wsjf_guidance', {})
    
    # Parse guidance into numeric suggestions
    defaults = {
        'user_value': 2,
        'time_criticality': 2,
        'risk_reduction': 2,
        'job_size': 1
    }
    
    # Try to extract Fibonacci values from guidance text
    for key, text in guidance.items():
        if isinstance(text, str):
            text_lower = text.lower()
            if 'very high' in text_lower or 'critical' in text_lower:
                defaults[key] = 5
            elif 'high' in text_lower:
                defaults[key] = 3
            elif 'medium' in text_lower:
                defaults[key] = 2
            elif 'low' in text_lower:
                defaults[key] = 1
    
    return defaults


def apply_template(pattern: str, format_type: str = 'markdown') -> Optional[Dict]:
    """Apply template and return formatted output"""
    template = load_template(pattern)
    if not template:
        return None
    
    result = {
        'pattern': pattern,
        'description': template.get('description', ''),
        'category': template.get('category', 'unknown'),
        'dor': None,
        'dod': None,
        'wsjf_defaults': generate_wsjf_guidance(template)
    }
    
    if format_type == 'markdown':
        result['dor'] = format_dor_markdown(template)
        result['dod'] = format_dod_markdown(template)
    elif format_type == 'table':
        result['dor'] = format_dor_table(template)
        result['dod'] = format_dod_table(template)
    elif format_type == 'json':
        result['dor'] = template.get('definition_of_ready', [])
        result['dod'] = template.get('definition_of_done', [])
    
    return result


def print_output(result: Dict, output_type: str):
    """Print formatted output"""
    if output_type == 'json':
        import json
        print(json.dumps(result, indent=2))
    elif output_type == 'dor-dod':
        print(f"DoR: {result['dor']}")
        print(f"DoD: {result['dod']}")
    elif output_type == 'wsjf':
        wsjf = result['wsjf_defaults']
        print(f"User Value: {wsjf['user_value']}")
        print(f"Time Criticality: {wsjf['time_criticality']}")
        print(f"Risk Reduction: {wsjf['risk_reduction']}")
        print(f"Job Size: {wsjf['job_size']}")
    else:
        print(f"Pattern: {result['pattern']}")
        print(f"Description: {result['description']}")
        print(f"Category: {result['category']}")
        print(f"\nDoR:\n{result['dor']}")
        print(f"\nDoD:\n{result['dod']}")
        print(f"\nWSJF Defaults: {result['wsjf_defaults']}")


def list_templates():
    """List all available templates"""
    templates = sorted(TEMPLATES_DIR.glob("*.yaml"))
    if not templates:
        print("❌ No templates found", file=sys.stderr)
        return
    
    print("📚 Available Pattern Templates:\n")
    for template_file in templates:
        pattern_name = template_file.stem
        template = load_template(pattern_name)
        if template:
            desc = template.get('description', 'No description')
            category = template.get('category', 'unknown')
            print(f"  • {pattern_name:<20} [{category}]")
            print(f"    {desc}")
            print()


def main():
    parser = argparse.ArgumentParser(description="Apply pattern template DoR/DoD")
    parser.add_argument('pattern', nargs='?', help='Pattern name (e.g., TDD, Safe-Degrade)')
    parser.add_argument('--format', choices=['markdown', 'table', 'json'], default='markdown',
                       help='Output format')
    parser.add_argument('--output-dor-dod', action='store_true', help='Output only DoR and DoD')
    parser.add_argument('--output-wsjf', action='store_true', help='Output only WSJF defaults')
    parser.add_argument('--list', action='store_true', help='List all available templates')
    parser.add_argument('--json', action='store_true', help='JSON output')
    
    args = parser.parse_args()
    
    if args.list:
        list_templates()
        return
    
    if not args.pattern:
        parser.print_help()
        print("\nUse --list to see available templates", file=sys.stderr)
        sys.exit(1)
    
    format_type = 'json' if args.json else args.format
    result = apply_template(args.pattern, format_type)
    
    if not result:
        sys.exit(1)
    
    if args.output_dor_dod:
        print_output(result, 'dor-dod')
    elif args.output_wsjf:
        print_output(result, 'wsjf')
    elif args.json:
        print_output(result, 'json')
    else:
        print_output(result, 'full')


if __name__ == '__main__':
    main()
