#!/usr/bin/env python3
"""
Batch Apply Pattern Templates to Backlogs

Automatically applies appropriate pattern templates to backlog items
based on keywords and context.

Usage:
    python3 batch_apply_templates.py --dry-run  # Preview changes
    python3 batch_apply_templates.py --apply    # Apply templates
"""

import sys
import re
import yaml
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

# Pattern matching rules for automatic template selection
PATTERN_RULES = {
    'TDD': {
        'keywords': ['test', 'testing', 'unit test', 'coverage', 'tdd'],
        'priority': 8
    },
    'Circuit-Breaker': {
        'keywords': ['circuit', 'breaker', 'fault', 'fallback', 'resilience'],
        'priority': 9
    },
    'Feature-Toggle': {
        'keywords': ['toggle', 'flag', 'rollout', 'canary', 'experiment'],
        'priority': 9
    },
    'Safe-Degrade': {
        'keywords': ['degrade', 'graceful', 'fallback', 'degradation'],
        'priority': 8
    },
    'Observability-First': {
        'keywords': ['monitor', 'metric', 'telemetry', 'observability', 'log'],
        'priority': 7
    },
    'CQRS': {
        'keywords': ['cqrs', 'command', 'query', 'read model', 'write model'],
        'priority': 7
    },
    'Event-Sourcing': {
        'keywords': ['event sourcing', 'event store', 'audit', 'replay'],
        'priority': 7
    },
    'API-Gateway': {
        'keywords': ['gateway', 'api gateway', 'routing', 'auth', 'rate limit'],
        'priority': 8
    },
    'Cache-Aside': {
        'keywords': ['cache', 'caching', 'redis', 'memcached'],
        'priority': 6
    },
    'Guardrail-Lock': {
        'keywords': ['guardrail', 'lock', 'wip', 'limit', 'threshold'],
        'priority': 7
    },
    'Saga': {
        'keywords': ['saga', 'distributed transaction', 'compensation'],
        'priority': 7
    },
    'BFF': {
        'keywords': ['bff', 'backend for frontend', 'mobile api'],
        'priority': 6
    },
    'Bulkhead': {
        'keywords': ['bulkhead', 'isolation', 'pool', 'partition'],
        'priority': 7
    },
    'Kanban-WIP': {
        'keywords': ['kanban', 'wip', 'flow', 'throughput'],
        'priority': 6
    },
    'Strangler-Fig': {
        'keywords': ['strangler', 'migration', 'legacy', 'modernize'],
        'priority': 7
    },
    'Depth-Ladder': {
        'keywords': ['incremental', 'depth', 'complexity', 'progressive'],
        'priority': 5
    }
}

def load_backlog_file(filepath: Path) -> Optional[List[Dict]]:
    """Load backlog markdown file and parse items"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Parse markdown items (basic parsing)
        items = []
        current_item = None
        
        for line in content.split('\n'):
            # Look for markdown list items (- [ ] or - [x])
            if re.match(r'^[-*]\s+\[([ xX])\]\s+', line):
                if current_item:
                    items.append(current_item)
                
                # Extract title
                title = re.sub(r'^[-*]\s+\[([ xX])\]\s+', '', line).strip()
                current_item = {
                    'title': title,
                    'description': '',
                    'status': 'DONE' if re.search(r'\[x\]', line, re.I) else 'PENDING',
                    'file': str(filepath),
                    'has_dor_dod': False
                }
            elif current_item and line.strip():
                # Continuation of description
                current_item['description'] += ' ' + line.strip()
        
        if current_item:
            items.append(current_item)
        
        return items
    except Exception as e:
        print(f"Error loading {filepath}: {e}", file=sys.stderr)
        return None

def suggest_pattern(item: Dict) -> Tuple[str, float]:
    """Suggest best pattern template for an item"""
    text = (item.get('title', '') + ' ' + item.get('description', '')).lower()
    
    scores = {}
    for pattern, rules in PATTERN_RULES.items():
        score = 0.0
        for keyword in rules['keywords']:
            if keyword.lower() in text:
                score += rules['priority']
        scores[pattern] = score
    
    # Return pattern with highest score, or default to TDD
    if max(scores.values()) > 0:
        best_pattern = max(scores, key=scores.get)
        return best_pattern, scores[best_pattern]
    else:
        return 'TDD', 1.0  # Default to TDD for generic tasks

def generate_dor_dod_yaml(item: Dict, pattern: str, template_path: Path) -> str:
    """Generate DoR/DoD YAML for an item using template"""
    try:
        with open(template_path, 'r') as f:
            template = yaml.safe_load(f)
        
        dor = template.get('definition_of_ready', [])
        dod = template.get('definition_of_done', [])
        
        output = f"# DoR/DoD for: {item['title']}\n"
        output += f"# Pattern: {pattern}\n"
        output += f"# Auto-generated from template\n\n"
        
        output += "definition_of_ready:\n"
        for criterion in dor:
            output += f"  - criterion: {criterion.get('criterion', 'TBD')}\n"
            output += f"    description: {criterion.get('description', 'TBD')}\n"
            output += f"    validation: {criterion.get('validation', 'TBD')}\n"
        
        output += "\ndefinition_of_done:\n"
        for criterion in dod:
            output += f"  - criterion: {criterion.get('criterion', 'TBD')}\n"
            output += f"    description: {criterion.get('description', 'TBD')}\n"
            output += f"    validation: {criterion.get('validation', 'TBD')}\n"
            if 'command' in criterion:
                output += f"    command: \"{criterion['command']}\"\n"
            output += f"    blocking: {criterion.get('blocking', False)}\n"
        
        return output
    except Exception as e:
        print(f"Error generating DoR/DoD: {e}", file=sys.stderr)
        return ""

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Batch apply pattern templates to backlogs"
    )
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview changes without applying')
    parser.add_argument('--apply', action='store_true',
                        help='Apply templates to backlogs')
    parser.add_argument('--output-dir', default='generated_dor_dod',
                        help='Output directory for generated DoR/DoD files')
    parser.add_argument('--min-score', type=float, default=5.0,
                        help='Minimum pattern match score to apply')
    
    args = parser.parse_args()
    
    if not args.dry_run and not args.apply:
        args.dry_run = True  # Default to dry-run
    
    # Find all backlog files
    backlog_files = []
    for search_dir in ['.goalie', 'circles']:
        if Path(search_dir).exists():
            backlog_files.extend(Path(search_dir).rglob('**/backlog.md'))
    print(f"Found {len(backlog_files)} backlog files")
    print()
    
    # Load template paths
    template_dir = Path('scripts/patterns/templates')
    templates = {p.stem: p for p in template_dir.glob('*.yaml')}
    print(f"Available templates: {len(templates)}")
    print()
    
    # Process all backlogs
    all_items = []
    pattern_counts = defaultdict(int)
    items_with_suggestions = []
    
    for backlog_file in backlog_files:
        items = load_backlog_file(backlog_file)
        if items:
            for item in items:
                pattern, score = suggest_pattern(item)
                if score >= args.min_score:
                    item['suggested_pattern'] = pattern
                    item['pattern_score'] = score
                    pattern_counts[pattern] += 1
                    items_with_suggestions.append(item)
                all_items.append(item)
    
    print("=" * 70)
    print("Batch Template Application Summary")
    print("=" * 70)
    print(f"Total items found: {len(all_items)}")
    print(f"Items with pattern suggestions: {len(items_with_suggestions)}")
    print()
    
    print("Pattern Distribution:")
    for pattern, count in sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {pattern:25s}: {count:3d} items")
    print()
    
    if args.dry_run:
        print("🔍 DRY RUN MODE - No files will be modified")
        print()
        print("Sample suggestions:")
        for item in items_with_suggestions[:10]:
            print(f"  '{item['title'][:50]}...'")
            print(f"    → {item['suggested_pattern']} (score: {item['pattern_score']})")
            print()
    
    if args.apply:
        print("✍️  APPLYING TEMPLATES...")
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        applied_count = 0
        for item in items_with_suggestions:
            pattern = item['suggested_pattern']
            template_path = templates.get(pattern)
            
            if not template_path:
                continue
            
            # Generate DoR/DoD
            dor_dod_yaml = generate_dor_dod_yaml(item, pattern, template_path)
            
            if dor_dod_yaml:
                # Create safe filename
                safe_title = re.sub(r'[^\w\s-]', '', item['title'])[:50]
                safe_title = re.sub(r'[-\s]+', '-', safe_title)
                output_file = output_dir / f"{safe_title}_{pattern}.yaml"
                
                with open(output_file, 'w') as f:
                    f.write(dor_dod_yaml)
                
                applied_count += 1
        
        print(f"✅ Applied templates to {applied_count} items")
        print(f"   Output directory: {output_dir}")
    
    print()
    print("=" * 70)
    
    # Next steps
    if args.dry_run:
        print("Next steps:")
        print("  1. Review suggestions above")
        print("  2. Run with --apply to generate DoR/DoD files")
        print(f"  3. Manually review generated files in {args.output_dir}/")

if __name__ == '__main__':
    main()
