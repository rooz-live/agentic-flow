#!/usr/bin/env python3
"""
Pattern Metrics Validation Script

Validates .goalie/pattern_metrics.jsonl against JSON Schema definition,
checks tag coverage ≥90%, and verifies economic scoring presence.

Usage:
    python3 scripts/analysis/validate_pattern_metrics.py [--metrics-file PATH] [--schema-file PATH] [--tag-threshold 0.90]

Exit Codes:
    0: All validations passed
    1: Schema validation failures
    2: Tag coverage below threshold
    3: Economic scoring missing
    4: File not found or JSON parse errors
"""

import json
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any, Tuple
from collections import Counter
from datetime import datetime

try:
    from jsonschema import validate, ValidationError, Draft202012Validator
except ImportError:
    print("ERROR: jsonschema not installed. Run: pip install jsonschema", file=sys.stderr)
    sys.exit(4)


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color


def load_jsonl(file_path: Path) -> List[Dict[str, Any]]:
    """Load JSONL file and return list of JSON objects"""
    events = []
    with open(file_path, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"{Colors.YELLOW}[WARN] Line {line_num}: Invalid JSON - {e}{Colors.NC}", file=sys.stderr)
                continue
    return events


def load_schema(schema_path: Path) -> Dict[str, Any]:
    """Load JSON Schema definition"""
    with open(schema_path, 'r') as f:
        return json.load(f)


def validate_schema(events: List[Dict[str, Any]], schema: Dict[str, Any]) -> Tuple[int, List[str]]:
    """
    Validate events against JSON Schema
    
    Returns:
        (valid_count, error_messages)
    """
    validator = Draft202012Validator(schema)
    errors = []
    valid_count = 0
    
    for idx, event in enumerate(events, 1):
        try:
            validator.validate(event)
            valid_count += 1
        except ValidationError as e:
            # Format error message with event context
            pattern = event.get('pattern', 'unknown')
            ts = event.get('ts', 'unknown')
            error_msg = f"Event #{idx} (pattern={pattern}, ts={ts}): {e.message}"
            if e.path:
                error_msg += f" at path: {'.'.join(str(p) for p in e.path)}"
            errors.append(error_msg)
    
    return valid_count, errors


def check_tag_coverage(events: List[Dict[str, Any]], threshold: float = 0.90) -> Tuple[bool, float, Dict[str, int]]:
    """
    Check that ≥threshold% of events have at least one tag
    
    Returns:
        (passes_threshold, coverage_pct, tag_distribution)
    """
    total = len(events)
    if total == 0:
        return True, 100.0, {}
    
    tagged_count = 0
    tag_counter = Counter()
    
    for event in events:
        tags = event.get('tags', [])
        if tags and len(tags) > 0:
            tagged_count += 1
            for tag in tags:
                tag_counter[tag] += 1
    
    coverage_pct = (tagged_count / total) * 100
    passes = coverage_pct >= (threshold * 100)
    
    return passes, coverage_pct, dict(tag_counter)


def check_economic_scoring(events: List[Dict[str, Any]]) -> Tuple[int, int, List[str]]:
    """
    Check that all events have economic.cod and economic.wsjf_score
    
    Returns:
        (events_with_scoring, total_events, missing_events_summary)
    """
    total = len(events)
    with_scoring = 0
    missing_summary = []
    
    for idx, event in enumerate(events, 1):
        economic = event.get('economic', {})
        has_cod = 'cod' in economic
        has_wsjf = 'wsjf_score' in economic
        
        if has_cod and has_wsjf:
            with_scoring += 1
        else:
            pattern = event.get('pattern', 'unknown')
            ts = event.get('ts', 'unknown')
            missing_fields = []
            if not has_cod:
                missing_fields.append('cod')
            if not has_wsjf:
                missing_fields.append('wsjf_score')
            missing_summary.append(f"Event #{idx} (pattern={pattern}, ts={ts}): missing {', '.join(missing_fields)}")
    
    return with_scoring, total, missing_summary


def generate_report(
    total_events: int,
    schema_valid: int,
    schema_errors: List[str],
    tag_coverage_pct: float,
    tag_threshold: float,
    tag_distribution: Dict[str, int],
    econ_with_scoring: int,
    econ_missing: List[str]
) -> str:
    """Generate validation report"""
    report_lines = []
    
    # Header
    report_lines.append(f"\n{Colors.BLUE}{'='*70}{Colors.NC}")
    report_lines.append(f"{Colors.BLUE}Pattern Metrics Validation Report{Colors.NC}")
    report_lines.append(f"{Colors.BLUE}Generated: {datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}{Colors.NC}")
    report_lines.append(f"{Colors.BLUE}{'='*70}{Colors.NC}\n")
    
    # Summary
    report_lines.append(f"Total Events: {total_events}")
    report_lines.append("")
    
    # Schema Validation
    report_lines.append(f"{Colors.BLUE}1. JSON Schema Validation{Colors.NC}")
    if schema_valid == total_events:
        report_lines.append(f"  {Colors.GREEN}✓{Colors.NC} All {total_events} events passed schema validation")
    else:
        failed = total_events - schema_valid
        report_lines.append(f"  {Colors.RED}✗{Colors.NC} {failed}/{total_events} events failed schema validation")
        report_lines.append(f"    Valid: {schema_valid}")
        report_lines.append(f"    Invalid: {failed}")
        if schema_errors:
            report_lines.append(f"\n  {Colors.YELLOW}Schema Validation Errors:{Colors.NC}")
            for error in schema_errors[:10]:  # Show first 10 errors
                report_lines.append(f"    • {error}")
            if len(schema_errors) > 10:
                report_lines.append(f"    ... and {len(schema_errors) - 10} more errors")
    report_lines.append("")
    
    # Tag Coverage
    report_lines.append(f"{Colors.BLUE}2. Tag Coverage Analysis{Colors.NC}")
    threshold_pct = tag_threshold * 100
    if tag_coverage_pct >= threshold_pct:
        report_lines.append(f"  {Colors.GREEN}✓{Colors.NC} Tag coverage: {tag_coverage_pct:.1f}% (threshold: {threshold_pct:.1f}%)")
    else:
        report_lines.append(f"  {Colors.RED}✗{Colors.NC} Tag coverage: {tag_coverage_pct:.1f}% (threshold: {threshold_pct:.1f}%)")
    
    if tag_distribution:
        report_lines.append(f"\n  Tag Distribution:")
        for tag, count in sorted(tag_distribution.items(), key=lambda x: -x[1]):
            pct = (count / total_events) * 100
            report_lines.append(f"    • {tag}: {count} events ({pct:.1f}%)")
    report_lines.append("")
    
    # Economic Scoring
    report_lines.append(f"{Colors.BLUE}3. Economic Scoring Verification{Colors.NC}")
    if econ_with_scoring == total_events:
        report_lines.append(f"  {Colors.GREEN}✓{Colors.NC} All {total_events} events have economic scoring (cod, wsjf_score)")
    else:
        missing_count = total_events - econ_with_scoring
        report_lines.append(f"  {Colors.RED}✗{Colors.NC} {missing_count}/{total_events} events missing economic scoring")
        if econ_missing:
            report_lines.append(f"\n  {Colors.YELLOW}Events Missing Economic Scoring:{Colors.NC}")
            for msg in econ_missing[:10]:  # Show first 10
                report_lines.append(f"    • {msg}")
            if len(econ_missing) > 10:
                report_lines.append(f"    ... and {len(econ_missing) - 10} more events")
    report_lines.append("")
    
    # Overall Status
    all_passed = (
        schema_valid == total_events and
        tag_coverage_pct >= threshold_pct and
        econ_with_scoring == total_events
    )
    
    report_lines.append(f"{Colors.BLUE}{'='*70}{Colors.NC}")
    if all_passed:
        report_lines.append(f"{Colors.GREEN}✓ ALL VALIDATIONS PASSED{Colors.NC}")
    else:
        report_lines.append(f"{Colors.RED}✗ VALIDATION FAILURES DETECTED{Colors.NC}")
    report_lines.append(f"{Colors.BLUE}{'='*70}{Colors.NC}\n")
    
    return "\n".join(report_lines)


def main():
    parser = argparse.ArgumentParser(
        description='Validate pattern metrics against JSON Schema',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        '--metrics-file',
        type=Path,
        default=Path('.goalie/pattern_metrics.jsonl'),
        help='Path to pattern metrics JSONL file (default: .goalie/pattern_metrics.jsonl)'
    )
    parser.add_argument(
        '--schema-file',
        type=Path,
        default=Path('docs/PATTERN_EVENT_SCHEMA.json'),
        help='Path to JSON Schema file (default: docs/PATTERN_EVENT_SCHEMA.json)'
    )
    parser.add_argument(
        '--tag-threshold',
        type=float,
        default=0.90,
        help='Minimum tag coverage threshold (0.0-1.0, default: 0.90)'
    )
    parser.add_argument(
        '--json-output',
        type=Path,
        help='Optional: Write validation results to JSON file'
    )
    
    args = parser.parse_args()
    
    # Validate files exist
    if not args.metrics_file.exists():
        print(f"{Colors.RED}ERROR: Metrics file not found: {args.metrics_file}{Colors.NC}", file=sys.stderr)
        sys.exit(4)
    
    if not args.schema_file.exists():
        print(f"{Colors.RED}ERROR: Schema file not found: {args.schema_file}{Colors.NC}", file=sys.stderr)
        sys.exit(4)
    
    # Load data
    try:
        events = load_jsonl(args.metrics_file)
        schema = load_schema(args.schema_file)
    except Exception as e:
        print(f"{Colors.RED}ERROR: Failed to load files: {e}{Colors.NC}", file=sys.stderr)
        sys.exit(4)
    
    if not events:
        print(f"{Colors.YELLOW}WARNING: No events found in {args.metrics_file}{Colors.NC}", file=sys.stderr)
        print(f"{Colors.GREEN}✓ Validation passed (no events to validate){Colors.NC}")
        sys.exit(0)
    
    # Run validations
    schema_valid, schema_errors = validate_schema(events, schema)
    tag_passes, tag_coverage_pct, tag_distribution = check_tag_coverage(events, args.tag_threshold)
    econ_with_scoring, total_events, econ_missing = check_economic_scoring(events)
    
    # Generate and print report
    report = generate_report(
        total_events=len(events),
        schema_valid=schema_valid,
        schema_errors=schema_errors,
        tag_coverage_pct=tag_coverage_pct,
        tag_threshold=args.tag_threshold,
        tag_distribution=tag_distribution,
        econ_with_scoring=econ_with_scoring,
        econ_missing=econ_missing
    )
    print(report)
    
    # Write JSON output if requested
    if args.json_output:
        results = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "metrics_file": str(args.metrics_file),
            "schema_file": str(args.schema_file),
            "total_events": len(events),
            "schema_validation": {
                "valid": schema_valid,
                "invalid": len(events) - schema_valid,
                "errors": schema_errors
            },
            "tag_coverage": {
                "coverage_pct": tag_coverage_pct,
                "threshold_pct": args.tag_threshold * 100,
                "passed": tag_passes,
                "distribution": tag_distribution
            },
            "economic_scoring": {
                "with_scoring": econ_with_scoring,
                "without_scoring": len(events) - econ_with_scoring,
                "missing_events": econ_missing
            },
            "overall_status": "PASSED" if (
                schema_valid == len(events) and
                tag_passes and
                econ_with_scoring == len(events)
            ) else "FAILED"
        }
        with open(args.json_output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"{Colors.BLUE}Results written to: {args.json_output}{Colors.NC}")
    
    # Determine exit code
    if schema_valid != len(events):
        sys.exit(1)
    elif not tag_passes:
        sys.exit(2)
    elif econ_with_scoring != len(events):
        sys.exit(3)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
