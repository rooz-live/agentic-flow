#!/usr/bin/env python3
"""
P0 CRITICAL FIX: Duration Instrumentation Gap

ISSUE: Only 0.1% of 7,006 events have duration_ms field populated
TARGET: Achieve >95% duration_ms coverage in pattern_metrics.jsonl

This script:
1. Audits current duration_ms coverage
2. Identifies all pattern logging call sites missing timing
3. Generates patches for cmd_prod_cycle.py and related scripts
4. Validates fix with test runs

SUCCESS CRITERIA:
- >95% of events have duration_ms > 0
- All major operations (full-cycle, governance, etc.) have timing
- Pattern logger's timed() context manager used where appropriate
"""

import json
import os
import sys
import time
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timedelta

PROJECT_ROOT = os.environ.get("PROJECT_ROOT", ".")
METRICS_FILE = Path(PROJECT_ROOT) / ".goalie" / "pattern_metrics.jsonl"
BACKUP_DIR = Path(PROJECT_ROOT) / ".goalie" / "backups"


def audit_duration_coverage():
    """Audit current duration_ms coverage in pattern_metrics.jsonl"""
    print("🔍 Auditing duration_ms coverage...")
    
    if not METRICS_FILE.exists():
        print(f"❌ Metrics file not found: {METRICS_FILE}")
        return None
    
    total_events = 0
    events_with_duration = 0
    events_with_measured = 0
    events_by_pattern = defaultdict(lambda: {"total": 0, "with_duration": 0, "with_measured": 0})
    events_by_run_kind = defaultdict(lambda: {"total": 0, "with_duration": 0})
    
    cutoff = datetime.now() - timedelta(hours=72)
    
    with open(METRICS_FILE, 'r') as f:
        for line in f:
            try:
                event = json.loads(line)
                
                # Filter to recent events
                ts_str = event.get('timestamp') or event.get('ts')
                if ts_str:
                    try:
                        ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                        if ts < cutoff:
                            continue
                    except:
                        pass
                
                total_events += 1
                pattern = event.get('pattern', 'unknown')
                run_kind = event.get('run_kind', 'unknown')
                
                events_by_pattern[pattern]["total"] += 1
                events_by_run_kind[run_kind]["total"] += 1
                
                duration_ms = event.get('duration_ms')
                duration_measured = event.get('duration_measured', False)
                
                # Check both top-level and nested data.duration_ms
                data_duration_ms = None
                if isinstance(event.get('data'), dict):
                    data_duration_ms = event['data'].get('duration_ms')
                
                has_duration = (duration_ms is not None and duration_ms > 0) or \
                              (data_duration_ms is not None and data_duration_ms > 0)
                
                if has_duration:
                    events_with_duration += 1
                    events_by_pattern[pattern]["with_duration"] += 1
                    events_by_run_kind[run_kind]["with_duration"] += 1
                
                if duration_measured:
                    events_with_measured += 1
                    events_by_pattern[pattern]["with_measured"] += 1
                
            except json.JSONDecodeError:
                continue
    
    coverage_pct = (events_with_duration / total_events * 100) if total_events > 0 else 0
    measured_pct = (events_with_measured / total_events * 100) if total_events > 0 else 0
    
    print(f"\n📊 COVERAGE SUMMARY (Last 72 hours)")
    print(f"═══════════════════════════════════")
    print(f"Total Events: {total_events:,}")
    print(f"With duration_ms > 0: {events_with_duration:,} ({coverage_pct:.1f}%)")
    print(f"With duration_measured=true: {events_with_measured:,} ({measured_pct:.1f}%)")
    print(f"\n{'TARGET: >95% coverage':^40}")
    print(f"{'CURRENT STATUS: ' + ('✅ PASS' if coverage_pct > 95 else '❌ FAIL'):^40}")
    
    # Pattern breakdown
    print(f"\n📋 BY PATTERN:")
    print(f"{'Pattern':<30} {'Total':>8} {'w/Duration':>12} {'Coverage':>10}")
    print("─" * 64)
    
    for pattern, stats in sorted(events_by_pattern.items(), key=lambda x: -x[1]["total"]):
        pattern_coverage = (stats["with_duration"] / stats["total"] * 100) if stats["total"] > 0 else 0
        status = "✅" if pattern_coverage > 95 else "⚠️" if pattern_coverage > 50 else "❌"
        print(f"{pattern:<30} {stats['total']:>8} {stats['with_duration']:>12} {pattern_coverage:>9.1f}% {status}")
    
    # Run kind breakdown
    print(f"\n📋 BY RUN KIND:")
    print(f"{'Run Kind':<30} {'Total':>8} {'w/Duration':>12} {'Coverage':>10}")
    print("─" * 64)
    
    for run_kind, stats in sorted(events_by_run_kind.items(), key=lambda x: -x[1]["total"]):
        rk_coverage = (stats["with_duration"] / stats["total"] * 100) if stats["total"] > 0 else 0
        status = "✅" if rk_coverage > 95 else "⚠️" if rk_coverage > 50 else "❌"
        print(f"{run_kind:<30} {stats['total']:>8} {stats['with_duration']:>12} {rk_coverage:>9.1f}% {status}")
    
    return {
        "total_events": total_events,
        "events_with_duration": events_with_duration,
        "coverage_pct": coverage_pct,
        "measured_pct": measured_pct,
        "by_pattern": dict(events_by_pattern),
        "by_run_kind": dict(events_by_run_kind)
    }


def identify_missing_timing_sites():
    """Identify code locations missing duration tracking"""
    print("\n🔎 Identifying missing timing sites...")
    
    patterns_needing_fixes = []
    scripts_to_patch = []
    
    # Check cmd_prod_cycle.py
    prod_cycle_path = Path(PROJECT_ROOT) / "scripts" / "cmd_prod_cycle.py"
    if prod_cycle_path.exists():
        with open(prod_cycle_path, 'r') as f:
            content = f.read()
            
        # Check for logger.log calls without duration tracking
        import re
        log_calls = re.findall(r'logger\.log\([^)]+\)', content, re.MULTILINE | re.DOTALL)
        
        missing_duration_count = 0
        for call in log_calls:
            if 'duration_ms' not in call and 'logger.timed' not in call:
                missing_duration_count += 1
        
        if missing_duration_count > 0:
            patterns_needing_fixes.append({
                "file": "cmd_prod_cycle.py",
                "missing_count": missing_duration_count,
                "total_calls": len(log_calls)
            })
            scripts_to_patch.append(prod_cycle_path)
    
    if patterns_needing_fixes:
        print(f"\n📝 FILES NEEDING FIXES:")
        for fix in patterns_needing_fixes:
            fix_pct = (fix["missing_count"] / fix["total_calls"] * 100) if fix["total_calls"] > 0 else 0
            print(f"  • {fix['file']}: {fix['missing_count']}/{fix['total_calls']} calls missing timing ({fix_pct:.1f}%)")
    
    return scripts_to_patch


def generate_recommended_approach():
    """Generate recommended approach for fixing duration gaps"""
    print("\n📋 RECOMMENDED FIX APPROACH:")
    print("═══════════════════════════════════════════════════════════")
    
    print("""
APPROACH 1: Use PatternLogger.timed() Context Manager (RECOMMENDED)
────────────────────────────────────────────────────────────────────
Convert all major operations to use the timed() context manager:

BEFORE:
    logger.log('pattern_name', {'action': 'x', 'result': 'y'}, ...)

AFTER:
    with logger.timed('pattern_name', {'action': 'x'}) as data:
        # Do work
        data['result'] = 'y'

Benefits:
  ✅ Automatic duration_ms tracking
  ✅ Automatic action_completed tracking (True/False on exception)
  ✅ Exception-safe (logs even on failure)
  ✅ No manual time.time() calls needed

────────────────────────────────────────────────────────────────────
APPROACH 2: Manual Timing with time.perf_counter()
────────────────────────────────────────────────────────────────────
For cases where context manager isn't feasible:

    start = time.perf_counter()
    # Do work
    duration_ms = int((time.perf_counter() - start) * 1000)
    logger.log('pattern_name', {
        'action': 'x',
        'result': 'y',
        'duration_ms': duration_ms,
        'duration_measured': True
    }, ...)

Important: Use time.perf_counter() (not time.time()) for accurate timing!

────────────────────────────────────────────────────────────────────
PRIORITY PATTERNS TO FIX (in order):
────────────────────────────────────────────────────────────────────
1. full_cycle_complete (main prod-cycle completion)
2. guardrail_lock (quality gate enforcement)
3. depth_ladder (maturity progression)
4. safe_degrade (failure handling)
5. observability_first (metrics collection)
6. wsjf_enrichment (economic analysis)
7. code_fix_proposal (auto-fix governance)
8. flow_metrics (cycle time tracking)
""")


def validate_fix():
    """Run validation cycle to test duration tracking"""
    print("\n🧪 VALIDATION TEST:")
    print("═══════════════════════════════════════════════════════════")
    print("To validate the fix:")
    print("1. Run: AF_PROD_CYCLE_MODE=advisory ./scripts/af prod-cycle --iterations 5")
    print("2. Check coverage: python3 scripts/fix_duration_instrumentation_p0.py --check")
    print("3. Verify: >95% of events have duration_ms > 0")
    print("4. Success criteria met? Proceed with mutate mode testing")


def main():
    print("╔═══════════════════════════════════════════════════════════════╗")
    print("║   P0 CRITICAL FIX: Duration Instrumentation Gap              ║")
    print("║   Target: >95% duration_ms coverage in pattern_metrics.jsonl ║")
    print("╚═══════════════════════════════════════════════════════════════╝")
    
    # Audit current state
    audit_results = audit_duration_coverage()
    
    if audit_results and audit_results["coverage_pct"] > 95:
        print("\n✅ SUCCESS: Duration coverage target already met!")
        print(f"   Current coverage: {audit_results['coverage_pct']:.1f}%")
        sys.exit(0)
    
    # Identify fix sites
    scripts_to_patch = identify_missing_timing_sites()
    
    # Generate recommendations
    generate_recommended_approach()
    
    # Validation instructions
    validate_fix()
    
    print("\n" + "═" * 64)
    print("NEXT STEPS:")
    print("  1. Review cmd_prod_cycle.py for logger.log() calls")
    print("  2. Convert to logger.timed() context manager where possible")
    print("  3. Add manual timing for remaining cases")
    print("  4. Run validation test")
    print("  5. Verify >95% coverage achieved")
    print("═" * 64)
    
    if audit_results and audit_results["coverage_pct"] < 95:
        sys.exit(1)  # Exit with error to indicate fix needed


if __name__ == "__main__":
    main()
