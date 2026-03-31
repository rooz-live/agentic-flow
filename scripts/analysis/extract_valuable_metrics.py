#!/usr/bin/env python3
"""
Extract Valuable Pattern Metrics

Intelligently extracts recent and valuable events from pattern_metrics.jsonl,
enriching them to conform to the new schema.

Strategy:
- Preserve recent events (last 7 days)
- Preserve events with rich data (pattern_state, metadata, metrics)
- Enrich missing required fields with intelligent defaults
- Validate against schema
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
from collections import defaultdict

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("ERROR: jsonschema not installed")
    sys.exit(1)


def load_schema(schema_path: Path):
    """Load JSON Schema."""
    with open(schema_path) as f:
        return json.load(f)


def parse_timestamp(ts_str: str) -> datetime:
    """Parse various timestamp formats."""
    try:
        # Try ISO format with Z
        return datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
    except:
        try:
            # Try without timezone
            return datetime.fromisoformat(ts_str).replace(tzinfo=timezone.utc)
        except:
            return None


def is_recent(event: dict, days: int = 7) -> bool:
    """Check if event is recent."""
    ts = event.get('ts') or event.get('timestamp')
    if not ts:
        return False
    
    dt = parse_timestamp(ts)
    if not dt:
        return False
    
    age = datetime.now(timezone.utc) - dt
    return age.days <= days


def has_rich_data(event: dict) -> bool:
    """Check if event has rich data worth preserving."""
    # Has pattern state
    if 'pattern_state' in event and event['pattern_state']:
        return True
    
    # Has metadata
    if 'metadata' in event and event['metadata']:
        return True
    
    # Has observability context
    if 'observability' in event and event['observability']:
        return True
    
    # Has specific pattern data
    pattern_fields = {
        'safe_degrade': ['recent_incidents', 'incident_tail', 'average_score'],
        'observability_first': ['metrics_written', 'missing_signals'],
        'guardrail_lock': ['enforced', 'health_state', 'lock_reason'],
        'iteration_budget': ['requested', 'enforced', 'remaining'],
        'autocommit_shadow': ['candidates', 'manual_override'],
    }
    
    pattern = event.get('pattern', '')
    if pattern in pattern_fields:
        for field in pattern_fields[pattern]:
            if field in event:
                return True
    
    return False


def enrich_event(event: dict) -> dict:
    """Enrich event with missing required fields."""
    enriched = event.copy()
    
    # Move pattern-specific top-level fields into metrics object
    pattern_specific_fields = {
        'safe_degrade': ['recent_incidents', 'incident_tail', 'average_score', 'incident_threshold', 'score_threshold', 'triggers', 'actions', 'recovery_cycles'],
        'observability_first': ['metrics_written', 'missing_signals', 'suggestion_made', 'coverage_pct'],
        'guardrail_lock': ['enforced', 'health_state', 'lock_reason', 'user_requests'],
        'iteration_budget': ['requested', 'enforced', 'remaining', 'consumed', 'autocommit_runs'],
        'autocommit_shadow': ['candidates', 'manual_override', 'cycles_before_confidence'],
        'circle_risk_focus': ['top_owner', 'extra_iterations', 'roam_reduction'],
    }
    
    # Initialize metrics object if needed
    if 'metrics' not in enriched:
        enriched['metrics'] = {}
    
    # Move pattern-specific fields from top-level to metrics
    pattern = enriched.get('pattern', '')
    if pattern in pattern_specific_fields:
        for field in pattern_specific_fields[pattern]:
            if field in enriched:
                enriched['metrics'][field] = enriched.pop(field)
    
    # Add run_id if missing
    if 'run_id' not in enriched or not enriched['run_id']:
        run = enriched.get('run', 'prod-cycle')
        iteration = enriched.get('iteration', 0)
        enriched['run_id'] = f"{run}-{datetime.now().strftime('%Y%m%d')}-{iteration}"
    
    # Ensure timestamp
    if 'ts' not in enriched:
        if 'timestamp' in enriched:
            enriched['ts'] = enriched['timestamp']
        else:
            enriched['ts'] = datetime.now(timezone.utc).isoformat()
    
    # Normalize timestamp
    if enriched['ts'] and not enriched['ts'].endswith('Z'):
        enriched['ts'] = enriched['ts'] + 'Z'
    
    # Default required fields
    defaults = {
        'run': 'prod-cycle',
        'iteration': 0,
        'circle': 'orchestrator',
        'depth': 3,
        'pattern': 'observability_first',
        'mode': 'advisory',
        'mutation': False,
        'gate': 'health',
        'framework': '',
        'scheduler': '',
        'tags': [],
        'economic': {'cod': 0.0, 'wsjf_score': 0.0},
        'reason': 'legacy-migration',
        'action': 'enriched',
        'prod_mode': 'advisory'
    }
    
    for key, default_value in defaults.items():
        if key not in enriched:
            enriched[key] = default_value
    
    # Normalize circle names
    circle_mapping = {
        'pre-flight': 'orchestrator',
        'governance': 'orchestrator',
        'architect': 'intuitive',
    }
    circle = enriched['circle'].lower()
    enriched['circle'] = circle_mapping.get(circle, circle)
    
    # Normalize pattern names (kebab to snake)
    pattern = enriched['pattern']
    pattern_mapping = {
        'observability-first': 'observability_first',
        'safe-degrade': 'safe_degrade',
        'circle-risk-focus': 'circle_risk_focus',
        'autocommit-shadow': 'autocommit_shadow',
        'guardrail-lock': 'guardrail_lock',
        'iteration-budget': 'iteration_budget',
        'depth-ladder': 'depth_ladder',
        'failure-strategy': 'failure_strategy',
    }
    enriched['pattern'] = pattern_mapping.get(pattern, pattern)
    
    # Generate kebab-case version for schema
    snake_to_kebab = {
        'observability_first': 'observability-first',
        'safe_degrade': 'safe-degrade',
        'circle_risk_focus': 'circle-risk-focus',
        'autocommit_shadow': 'autocommit-shadow',
        'guardrail_lock': 'guardrail-lock',
        'iteration_budget': 'iteration-budget',
        'depth_ladder': 'depth-ladder',
        'failure_strategy': 'failure-strategy',
        'iterative_rca': 'iterative-rca',
    }
    enriched['pattern:kebab-name'] = snake_to_kebab.get(enriched['pattern'], enriched['pattern'].replace('_', '-'))
    
    # Ensure economic object structure
    if not isinstance(enriched.get('economic'), dict):
        enriched['economic'] = {'cod': 0.0, 'wsjf_score': 0.0}
    if 'cod' not in enriched['economic']:
        enriched['economic']['cod'] = 0.0
    if 'wsjf_score' not in enriched['economic']:
        enriched['economic']['wsjf_score'] = 0.0
    
    # Infer tags from pattern if missing
    if not enriched['tags']:
        pattern_tags = {
            'safe_degrade': ['HPC'],
            'guardrail_lock': ['HPC'],
            'observability_first': ['Federation'],
            'autocommit_shadow': ['Federation'],
        }
        enriched['tags'] = pattern_tags.get(enriched['pattern'], [])
    
    return enriched


def main():
    """Main extraction process."""
    project_root = Path(__file__).parent.parent.parent
    schema_path = project_root / 'docs' / 'PATTERN_EVENT_SCHEMA.json'
    input_path = project_root / '.goalie' / 'pattern_metrics.jsonl'
    output_path = project_root / '.goalie' / 'pattern_metrics_valuable.jsonl'
    
    # Load schema
    schema = load_schema(schema_path)
    validator = Draft202012Validator(schema)
    
    # Stats
    stats = defaultdict(int)
    extracted = []
    
    print(f"🔍 Extracting valuable events from {input_path.name}")
    print(f"📋 Schema: {schema_path.name}")
    print()
    
    # Process events
    with open(input_path) as f:
        for line_num, line in enumerate(f, 1):
            stats['total'] += 1
            
            try:
                event = json.loads(line.strip())
            except json.JSONDecodeError:
                stats['parse_error'] += 1
                continue
            
            stats['parsed'] += 1
            
            # Check if valuable
            recent = is_recent(event, days=7)
            rich = has_rich_data(event)
            
            if not (recent or rich):
                stats['skipped_old_simple'] += 1
                continue
            
            if recent:
                stats['recent_kept'] += 1
            if rich:
                stats['rich_data_kept'] += 1
            
            # Enrich
            enriched = enrich_event(event)
            
            # Validate
            errors = list(validator.iter_errors(enriched))
            
            if not errors:
                extracted.append(enriched)
                stats['valid'] += 1
            else:
                stats['invalid'] += 1
                if stats['invalid'] <= 3:
                    print(f"⚠️  Line {line_num}: {errors[0].message}")
    
    # Write extracted events
    with open(output_path, 'w') as f:
        for event in extracted:
            f.write(json.dumps(event) + '\n')
    
    # Report
    print()
    print("="*60)
    print("📊 EXTRACTION REPORT")
    print("="*60)
    print(f"\n📥 Input: {stats['total']:,} lines")
    print(f"   Parsed: {stats['parsed']:,}")
    print(f"   Parse errors: {stats['parse_error']:,}")
    
    print(f"\n🔍 Filtering:")
    print(f"   Recent events (≤7 days): {stats['recent_kept']:,}")
    print(f"   Rich data events: {stats['rich_data_kept']:,}")
    print(f"   Skipped (old/simple): {stats['skipped_old_simple']:,}")
    
    print(f"\n✅ Validation:")
    print(f"   Valid events: {stats['valid']:,}")
    print(f"   Invalid events: {stats['invalid']:,}")
    print(f"   Success rate: {(stats['valid']/max(stats['parsed'],1)*100):.1f}%")
    
    print(f"\n💾 Output: {output_path.name}")
    print(f"   Extracted: {len(extracted):,} events")
    
    if len(extracted) > 0:
        print(f"\n✨ Next Steps:")
        print(f"   1. Review: tail -20 {output_path} | jq .")
        print(f"   2. Validate: .venv/bin/python3 scripts/analysis/validate_pattern_metrics.py {output_path}")
        print(f"   3. Backup: mv {input_path} {input_path}.legacy")
        print(f"   4. Replace: mv {output_path} {input_path}")
    
    print("\n" + "="*60)
    
    sys.exit(0 if stats['valid'] > 0 else 1)


if __name__ == '__main__':
    main()
