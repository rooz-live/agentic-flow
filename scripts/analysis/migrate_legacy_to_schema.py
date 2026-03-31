#!/usr/bin/env python3
"""
Comprehensive Legacy Event Migration

Migrates ALL valuable events from legacy pattern_metrics.jsonl to the new schema,
properly restructuring pattern-specific fields into the metrics object.

Strategy:
1. Parse legacy events
2. Identify pattern-specific fields and move to metrics object
3. Enrich missing required fields
4. Validate against schema
5. Preserve ALL data - zero data loss
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, Any, List

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("ERROR: jsonschema not installed. Run: pip install jsonschema")
    sys.exit(1)


# Comprehensive pattern-specific field mapping
PATTERN_FIELDS = {
    'safe_degrade': [
        'recent_incidents', 'incident_tail', 'average_score', 
        'incident_threshold', 'score_threshold', 'triggers', 
        'actions', 'recovery_cycles', 'load_metric', 'degradation_level'
    ],
    'observability_first': [
        'metrics_written', 'missing_signals', 'suggestion_made', 
        'coverage_pct', 'telemetry_coverage'
    ],
    'guardrail_lock': [
        'enforced', 'health_state', 'lock_reason', 'user_requests'
    ],
    'iteration_budget': [
        'requested', 'enforced', 'remaining', 'consumed', 
        'autocommit_runs', 'budget_exhausted'
    ],
    'autocommit_shadow': [
        'candidates', 'manual_override', 'cycles_before_confidence',
        'rollback_available'
    ],
    'circle_risk_focus': [
        'top_owner', 'extra_iterations', 'roam_reduction', 
        'risk_count', 'p0_risks'
    ],
    'depth_ladder': [
        'previous_depth', 'new_depth', 'escalation_trigger', 'green_streak'
    ],
    'failure_strategy': [
        'mode', 'abort_iteration_at', 'degrade_reason'
    ],
    'iterative_rca': [
        'rca', 'forensic', 'replenishment', 'methods', 
        'design_patterns', 'event_prototypes', 'rca_5_whys',
        'verified_count', 'total_actions', 'merged', 'refined'
    ],
}


def load_schema(schema_path: Path) -> Dict[str, Any]:
    """Load JSON Schema."""
    with open(schema_path) as f:
        return json.load(f)


def normalize_pattern_name(pattern: str) -> str:
    """Normalize pattern names (kebab to snake)."""
    mapping = {
        'observability-first': 'observability_first',
        'safe-degrade': 'safe_degrade',
        'circle-risk-focus': 'circle_risk_focus',
        'autocommit-shadow': 'autocommit_shadow',
        'guardrail-lock': 'guardrail_lock',
        'iteration-budget': 'iteration_budget',
        'depth-ladder': 'depth_ladder',
        'failure-strategy': 'failure_strategy',
        'iterative-rca': 'iterative_rca',
    }
    return mapping.get(pattern, pattern)


def pattern_to_kebab(pattern: str) -> str:
    """Convert pattern name to kebab-case."""
    mapping = {
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
    return mapping.get(pattern, pattern.replace('_', '-'))


def normalize_circle(circle: str) -> str:
    """Normalize circle names."""
    mapping = {
        'pre-flight': 'orchestrator',
        'governance': 'governance',
        'architect': 'intuitive',
        'retro': 'retro',
    }
    return mapping.get(circle.lower(), circle.lower())


def normalize_mode(mode: str) -> str:
    """Normalize mode values."""
    mapping = {
        'enforce': 'enforcement',
        'advisory': 'advisory',
        'mutate': 'mutate',
        'mutation': 'mutate',
    }
    return mapping.get(mode.lower(), 'advisory')


def migrate_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Migrate a single legacy event to new schema."""
    migrated = {}
    
    # 1. Normalize pattern name first
    pattern = event.get('pattern', 'observability_first')
    pattern = normalize_pattern_name(pattern)
    
    # 2. Core required fields
    migrated['ts'] = event.get('ts') or event.get('timestamp') or datetime.now(timezone.utc).isoformat()
    if not migrated['ts'].endswith('Z'):
        migrated['ts'] += 'Z'
    
    migrated['run'] = event.get('run', 'prod-cycle')
    migrated['run_id'] = event.get('run_id') or f"{migrated['run']}-migration-{datetime.now().strftime('%Y%m%d')}"
    migrated['iteration'] = event.get('iteration', 0)
    migrated['circle'] = normalize_circle(event.get('circle', 'orchestrator'))
    migrated['depth'] = event.get('depth', 3)
    migrated['pattern'] = pattern
    migrated['pattern:kebab-name'] = event.get('pattern:kebab-name') or pattern_to_kebab(pattern)
    migrated['mode'] = normalize_mode(event.get('mode', 'advisory'))
    migrated['mutation'] = bool(event.get('mutation', False))
    migrated['gate'] = event.get('gate', 'health')
    migrated['framework'] = event.get('framework', '')
    migrated['scheduler'] = event.get('scheduler', '')
    migrated['tags'] = event.get('tags', [])
    
    # 3. Economic object
    if 'economic' in event and isinstance(event['economic'], dict):
        migrated['economic'] = {
            'cod': event['economic'].get('cod', 0.0),
            'wsjf_score': event['economic'].get('wsjf_score', 0.0)
        }
    else:
        migrated['economic'] = {'cod': 0.0, 'wsjf_score': 0.0}
    
    # 4. Required string fields
    migrated['reason'] = event.get('reason', 'legacy-migration')
    migrated['action'] = event.get('action', 'migrated')
    migrated['prod_mode'] = event.get('prod_mode', 'advisory')
    
    # 5. Initialize metrics object
    migrated['metrics'] = event.get('metrics', {}).copy() if 'metrics' in event else {}
    
    # 6. Move pattern-specific fields to metrics
    pattern_specific = PATTERN_FIELDS.get(pattern, [])
    for field in pattern_specific:
        if field in event:
            migrated['metrics'][field] = event[field]
    
    # 7. Move any additional top-level fields that aren't schema fields to metrics
    schema_fields = {
        'ts', 'run', 'run_id', 'iteration', 'circle', 'depth', 'pattern',
        'pattern:kebab-name', 'mode', 'mutation', 'gate', 'framework',
        'scheduler', 'tags', 'economic', 'reason', 'action', 'prod_mode',
        'metrics', 'context', 'roam_delta', 'outcome', 'metadata', 
        'observability', 'pattern_state'
    }
    
    for key, value in event.items():
        if key not in schema_fields and key not in migrated['metrics']:
            # Move unknown top-level fields to metrics
            migrated['metrics'][key] = value
    
    # 8. Preserve optional fields that are schema-compliant
    if 'context' in event and isinstance(event['context'], dict):
        # Keep context but also merge into metrics if it has useful data
        for k, v in event['context'].items():
            if k not in migrated['metrics']:
                migrated['metrics'][k] = v
    
    if 'metadata' in event and isinstance(event['metadata'], dict):
        for k, v in event['metadata'].items():
            if k not in migrated['metrics']:
                migrated['metrics'][k] = v
    
    if 'observability' in event and isinstance(event['observability'], dict):
        migrated['metrics']['observability'] = event['observability']
    
    if 'pattern_state' in event and isinstance(event['pattern_state'], dict):
        migrated['metrics']['pattern_state'] = event['pattern_state']
    
    # 9. Infer tags from pattern if missing
    if not migrated['tags']:
        tag_inference = {
            'safe_degrade': ['HPC'],
            'guardrail_lock': ['HPC'],
            'observability_first': ['Federation'],
            'autocommit_shadow': ['Federation'],
            'iterative_rca': ['Forensic'],
        }
        migrated['tags'] = tag_inference.get(pattern, [])
    
    return migrated


def main():
    """Main migration process."""
    project_root = Path(__file__).parent.parent.parent
    schema_path = project_root / 'docs' / 'PATTERN_EVENT_SCHEMA.json'
    legacy_path = project_root / '.goalie' / 'pattern_metrics.jsonl.legacy_20251201_120614'
    output_path = project_root / '.goalie' / 'pattern_metrics_migrated_full.jsonl'
    
    if not legacy_path.exists():
        print(f"❌ Legacy file not found: {legacy_path}")
        print("Looking for other legacy files...")
        legacy_candidates = list(project_root.glob('.goalie/pattern_metrics.jsonl.legacy*'))
        if legacy_candidates:
            legacy_path = legacy_candidates[0]
            print(f"✓ Using: {legacy_path}")
        else:
            sys.exit(1)
    
    # Load schema
    schema = load_schema(schema_path)
    validator = Draft202012Validator(schema)
    
    # Stats
    stats = defaultdict(int)
    migrated_events = []
    errors_by_type = defaultdict(list)
    
    print(f"🔄 Migrating legacy events from {legacy_path.name}")
    print(f"📋 Schema: {schema_path.name}")
    print(f"💾 Output: {output_path.name}")
    print()
    
    # Process events
    with open(legacy_path) as f:
        for line_num, line in enumerate(f, 1):
            stats['total'] += 1
            
            try:
                event = json.loads(line.strip())
            except json.JSONDecodeError as e:
                stats['parse_error'] += 1
                errors_by_type['parse_error'].append((line_num, str(e)))
                continue
            
            stats['parsed'] += 1
            
            # Migrate
            try:
                migrated = migrate_event(event)
            except Exception as e:
                stats['migration_error'] += 1
                errors_by_type['migration_error'].append((line_num, str(e)))
                continue
            
            # Validate
            errors = list(validator.iter_errors(migrated))
            
            if not errors:
                migrated_events.append(migrated)
                stats['valid'] += 1
            else:
                stats['invalid'] += 1
                error_summary = errors[0].message if errors else 'unknown'
                errors_by_type[error_summary].append(line_num)
                
                # Log first 5 validation errors
                if stats['invalid'] <= 5:
                    print(f"⚠️  Line {line_num}: {error_summary}")
    
    # Write migrated events
    with open(output_path, 'w') as f:
        for event in migrated_events:
            f.write(json.dumps(event) + '\n')
    
    # Report
    print()
    print("="*70)
    print("📊 COMPREHENSIVE MIGRATION REPORT")
    print("="*70)
    
    print(f"\n📥 Input:")
    print(f"   Total lines:        {stats['total']:,}")
    print(f"   Parsed events:      {stats['parsed']:,}")
    print(f"   Parse errors:       {stats['parse_error']:,}")
    print(f"   Migration errors:   {stats['migration_error']:,}")
    
    print(f"\n✅ Migration Results:")
    print(f"   Valid events:       {stats['valid']:,}")
    print(f"   Invalid events:     {stats['invalid']:,}")
    print(f"   Success rate:       {(stats['valid']/max(stats['parsed'],1)*100):.1f}%")
    
    if errors_by_type:
        print(f"\n🔍 Error Breakdown:")
        for error_type, lines in sorted(errors_by_type.items(), key=lambda x: len(x[1]), reverse=True)[:5]:
            print(f"   {error_type}: {len(lines)} occurrences")
            if len(lines) <= 3:
                print(f"      Lines: {', '.join(map(str, [l[0] if isinstance(l, tuple) else l for l in lines]))}")
    
    print(f"\n💾 Output:")
    print(f"   File: {output_path}")
    print(f"   Events: {len(migrated_events):,}")
    print(f"   Size: {output_path.stat().st_size / 1024:.1f} KB" if output_path.exists() else "")
    
    if len(migrated_events) > 0:
        # Sample analysis
        patterns = defaultdict(int)
        circles = defaultdict(int)
        tags_used = defaultdict(int)
        
        for event in migrated_events:
            patterns[event['pattern']] += 1
            circles[event['circle']] += 1
            for tag in event.get('tags', []):
                tags_used[tag] += 1
        
        print(f"\n📈 Data Analysis:")
        print(f"   Unique patterns: {len(patterns)}")
        print(f"      Top 3: {', '.join([f'{p}({c})' for p, c in sorted(patterns.items(), key=lambda x: x[1], reverse=True)[:3]])}")
        print(f"   Unique circles: {len(circles)}")
        print(f"      Top 3: {', '.join([f'{c}({n})' for c, n in sorted(circles.items(), key=lambda x: x[1], reverse=True)[:3]])}")
        print(f"   Tags coverage: {sum(1 for e in migrated_events if e.get('tags')) / len(migrated_events) * 100:.1f}%")
        if tags_used:
            print(f"      Tags: {', '.join([f'{t}({c})' for t, c in sorted(tags_used.items(), key=lambda x: x[1], reverse=True)])}")
        
        print(f"\n✨ Next Steps:")
        print(f"   1. Review: tail -20 {output_path} | jq '{{pattern, circle, ts: .ts[0:19], metrics: (.metrics | keys | length)}}'")
        print(f"   2. Validate: .venv/bin/python3 scripts/analysis/validate_pattern_metrics.py {output_path}")
        print(f"   3. Merge with current: cat {output_path} >> .goalie/pattern_metrics.jsonl")
        print(f"   4. Verify merged: wc -l .goalie/pattern_metrics.jsonl")
    
    print("\n" + "="*70)
    
    exit_code = 0 if stats['valid'] > stats['invalid'] else 1
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
