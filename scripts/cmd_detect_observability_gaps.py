#!/usr/bin/env python3
"""
Detect Observability Gaps
Identifies missing telemetry, logging, and monitoring coverage

Usage:
    af detect-observability-gaps [--json]
"""

import sys
import json
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict
import re
import os
import argparse
import time
from datetime import datetime

# Robust path resolution relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
# Assuming script is in /scripts/, project root is one level up
PROJECT_ROOT = SCRIPT_DIR.parent
if (PROJECT_ROOT / "investing").exists():
     # If we are in a monorepo structure like /code/investing/agentic-flow/scripts/
     # and PROJECT_ROOT is /code/investing/agentic-flow, this is correct.
     pass
elif (PROJECT_ROOT / "agentic-flow").exists():
     # Fallback if structure is different
     pass

# Allow overriding via env var for complex setups
if "PROJECT_ROOT" in os.environ:
    PROJECT_ROOT = Path(os.environ["PROJECT_ROOT"])

METRICS_FILE = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
ACTIONS_FILE = PROJECT_ROOT / ".goalie" / "CONSOLIDATED_ACTIONS.yaml"

# Expected telemetry patterns based on orchestrator priorities
REQUIRED_PATTERNS = [
    "observability_first",
    "safe_degrade", 
    "guardrail_lock_check"
]

# Pattern thresholds per cycle (from requirements)
PATTERN_THRESHOLDS = {
    "observability_first": 10,  # ≥10 per cycle
    "safe_degrade": 5,          # ≥5 per cycle
    "guardrail_lock_check": 1,  # ≥1 per cycle (benign check)
    "autocommit": 0              # Must be 0 (enforced)
}


def _scale_threshold(threshold: int, total_events: int, normalize_by_events: bool, reference_events: int) -> int:
    if not normalize_by_events:
        return threshold
    if threshold <= 0:
        return 0
    if total_events <= 0:
        return threshold
    if reference_events <= 0:
        return threshold

    scale = float(total_events) / float(reference_events)
    scaled = int(round(float(threshold) * scale))
    return max(1, scaled)


def _extract_event_ts_seconds(event: Dict[str, Any]) -> float:
    v = event.get("timestamp")
    if v is None:
        v = event.get("ts")
    if v is None:
        v = event.get("time")
    if v is None:
        v = event.get("created_at")

    if v is None:
        return 0.0

    if isinstance(v, (int, float)):
        fv = float(v)
        if fv > 1e12:
            return fv / 1000.0
        return fv

    if isinstance(v, str):
        s = v.strip()
        try:
            return float(s)
        except Exception:
            pass
        try:
            return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
        except Exception:
            return 0.0

    return 0.0


def _event_matches_filters(event: Dict[str, Any], correlation_id: str | None, since_ts: float | None) -> bool:
    if correlation_id:
        cid = (
            event.get("correlation_id")
            or event.get("run_id")
            or event.get("AF_RUN_ID")
            or (event.get("data") or {}).get("run_id")
            or (event.get("metrics") or {}).get("run_id")
        )
        if cid != correlation_id:
            return False

    if since_ts is not None:
        ev_ts = _extract_event_ts_seconds(event)
        if ev_ts <= 0 or ev_ts < since_ts:
            return False

    return True


def load_telemetry(correlation_id: str | None = None, since_ts: float | None = None) -> Dict[str, Any]:
    """Load telemetry events from pattern_metrics.jsonl"""
    if not METRICS_FILE.exists():
        return {"events": [], "patterns": {}, "total_events": 0, "filtered_out_events": 0, "duration_event_count": 0}
    
    events = []
    pattern_counts = defaultdict(int)
    filtered_out = 0
    duration_event_count = 0
    
    with open(METRICS_FILE, 'r') as f:
        for line in f:
            if line.strip():
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue

                if not _event_matches_filters(event, correlation_id=correlation_id, since_ts=since_ts):
                    filtered_out += 1
                    continue

                events.append(event)
                pattern = event.get('pattern', 'unknown')
                pattern_counts[pattern] += 1
                
                # Track events with measurable duration (for normalization denominator)
                # Only count events where duration exists and is meaningful (not sentinel)
                if 'duration_ms' in event or 'duration_ms' in event.get('metrics', {}) or 'duration_ms' in event.get('data', {}):
                    duration_event_count += 1
    
    return {
        "events": events,
        "patterns": dict(pattern_counts),
        "total_events": len(events),
        "filtered_out_events": filtered_out,
        "duration_event_count": duration_event_count,
    }


def check_pattern_coverage(
    telemetry: Dict[str, Any],
    *,
    safe_degrade_conditional: bool,
    normalize_by_events: bool,
    reference_events: int,
) -> Dict[str, Any]:
    """Check if pattern coverage meets thresholds"""
    patterns = telemetry.get("patterns", {})
    total_events = int(telemetry.get("total_events", 0) or 0)
    gaps = []
    warnings = []
    violations = []
    not_applicable = []
    used_thresholds: Dict[str, int] = {}
    
    for pattern, threshold in PATTERN_THRESHOLDS.items():
        count = patterns.get(pattern, 0)
        scaled_threshold = _scale_threshold(threshold, total_events, normalize_by_events, reference_events)
        used_thresholds[pattern] = scaled_threshold
        
        if pattern == "autocommit":
            if count > threshold:
                violations.append({
                    "pattern": pattern,
                    "threshold": threshold,
                    "actual": count,
                    "severity": "CRITICAL",
                    "message": f"autocommit detected {count} times (must be 0)"
                })
        else:
            if pattern == "safe_degrade" and safe_degrade_conditional and count == 0:
                not_applicable.append({
                    "pattern": pattern,
                    "threshold": scaled_threshold,
                    "actual": count,
                    "reason": "conditional_no_degradation_detected"
                })
                continue

            if count < scaled_threshold:
                gaps.append({
                    "pattern": pattern,
                    "threshold": scaled_threshold,
                    "actual": count,
                    "deficit": scaled_threshold - count,
                    "severity": "HIGH" if pattern in REQUIRED_PATTERNS else "MEDIUM"
                })
            elif scaled_threshold > 0 and count < scaled_threshold * 1.5:
                warnings.append({
                    "pattern": pattern,
                    "threshold": scaled_threshold,
                    "actual": count,
                    "message": f"Pattern usage below optimal (< 150% of threshold)"
                })
    
    return {
        "gaps": gaps,
        "warnings": warnings,
        "violations": violations,
        "not_applicable": not_applicable,
        "used_thresholds": used_thresholds,
        "normalize_by_events": normalize_by_events,
        "reference_events": reference_events,
        "safe_degrade_conditional": safe_degrade_conditional,
        "meets_thresholds": len(gaps) == 0 and len(violations) == 0
    }


def scan_code_for_logging() -> Dict[str, Any]:
    """Scan code for logging/telemetry instrumentation"""
    # Check if pattern_logger is imported in key scripts
    scripts_to_check = [
        "cmd_prod_cycle.py",
        "circles/replenish_circle.sh",
    ]
    
    logging_coverage = {
        "instrumented": [],
        "missing": []
    }
    
    for script_name in scripts_to_check:
        script_path = PROJECT_ROOT / "scripts" / script_name
        if script_path.exists():
            content = script_path.read_text()
            has_logger = ("PatternLogger" in content or 
                         "log_pattern_event" in content or 
                         "pattern_logger.py" in content)
            
            if has_logger:
                logging_coverage["instrumented"].append(script_name)
            else:
                logging_coverage["missing"].append(script_name)
        else:
            logging_coverage["missing"].append(f"{script_name} (not found)")
    
    return logging_coverage


def identify_missing_telemetry() -> List[Dict[str, Any]]:
    """Identify components missing telemetry integration"""
    gaps = []
    
    # Check for metrics file
    if not METRICS_FILE.exists():
        gaps.append({
            "component": "pattern_metrics.jsonl",
            "type": "missing_file",
            "severity": "CRITICAL",
            "recommendation": "Create .goalie/pattern_metrics.jsonl and start logging patterns"
        })
    
    # Check for hooks directory
    hooks_dir = PROJECT_ROOT / ".goalie" / "hooks"
    if not hooks_dir.exists():
        gaps.append({
            "component": ".goalie/hooks",
            "type": "missing_directory",
            "severity": "HIGH",
            "recommendation": "Create .goalie/hooks directory for git/pre-commit hooks"
        })
    
    # Check for pattern logger module
    pattern_logger = PROJECT_ROOT / "scripts" / "agentic" / "pattern_logger.py"
    if not pattern_logger.exists():
        gaps.append({
            "component": "agentic/pattern_logger.py",
            "type": "missing_module",
            "severity": "CRITICAL",
            "recommendation": "Create PatternLogger module for centralized telemetry"
        })
    
    return gaps


def format_gaps_report(telemetry: Dict, coverage: Dict, logging_coverage: Dict, missing: List):
    """Format observability gaps report for terminal output"""
    print("\n" + "="*80)
    print("🔍 Observability Gap Detection Report")
    print("="*80)
    
    # Overall status
    if coverage["meets_thresholds"] and not missing:
        print("\n✅ Overall Status: HEALTHY")
        print("   All pattern thresholds met and telemetry infrastructure in place")
    else:
        print("\n⚠️  Overall Status: GAPS DETECTED")
        print("   Action required to meet observability requirements")
    
    # Pattern coverage
    print(f"\n📊 Pattern Coverage:")
    print(f"  Total telemetry events: {telemetry['total_events']}")
    print(f"  Unique patterns logged: {len(telemetry['patterns'])}")

    if coverage.get("normalize_by_events"):
        ref = coverage.get("reference_events")
        print(f"  Threshold scaling: enabled (reference_events={ref})")
    if coverage.get("safe_degrade_conditional"):
        print("  safe_degrade: conditional (required only when degradation detected)")
    
    if coverage["gaps"]:
        print(f"\n  ❌ Coverage Gaps ({len(coverage['gaps'])} patterns below threshold):")
        for gap in coverage["gaps"]:
            print(f"    • {gap['pattern']}: {gap['actual']}/{gap['threshold']} ({gap['severity']}) - deficit: {gap['deficit']}")

    if coverage.get("not_applicable"):
        print(f"\n  ℹ️  Not Applicable ({len(coverage['not_applicable'])}):")
        for na in coverage["not_applicable"]:
            print(f"    • {na['pattern']}: {na['actual']}/{na['threshold']} - {na['reason']}")
    
    if coverage["violations"]:
        print(f"\n  🚨 VIOLATIONS ({len(coverage['violations'])} critical issues):")
        for violation in coverage["violations"]:
            print(f"    • {violation['message']} ({violation['severity']})")
    
    if coverage["warnings"]:
        print(f"\n  ⚠️  Warnings ({len(coverage['warnings'])}):")
        for warning in coverage["warnings"]:
            print(f"    • {warning['pattern']}: {warning['actual']}/{warning['threshold']} - {warning['message']}")
    
    # Logging instrumentation
    print(f"\n🔧 Logging Instrumentation:")
    if logging_coverage["instrumented"]:
        print(f"  ✅ Instrumented scripts ({len(logging_coverage['instrumented'])}):")
        for script in logging_coverage["instrumented"]:
            print(f"    • {script}")
    
    if logging_coverage["missing"]:
        print(f"  ❌ Missing instrumentation ({len(logging_coverage['missing'])}):")
        for script in logging_coverage["missing"]:
            print(f"    • {script}")
    
    # Infrastructure gaps
    if missing:
        print(f"\n🏗️  Infrastructure Gaps ({len(missing)}):")
        for gap in missing:
            print(f"  • {gap['component']} ({gap['type']}) - {gap['severity']}")
            print(f"    Recommendation: {gap['recommendation']}")
    
    # Recommendations
    print(f"\n💡 Recommendations:")
    
    priority_actions = []
    if coverage["violations"]:
        priority_actions.append("CRITICAL: Disable autocommit immediately (AF_AUTOCOMMIT=0)")
    
    for gap in coverage["gaps"]:
        if gap["severity"] == "HIGH":
            priority_actions.append(f"HIGH: Increase {gap['pattern']} telemetry by {gap['deficit']} events")
    
    if missing:
        for item in missing:
            if item["severity"] == "CRITICAL":
                priority_actions.append(f"CRITICAL: {item['recommendation']}")
    
    if priority_actions:
        for i, action in enumerate(priority_actions[:5], 1):
            print(f"  {i}. {action}")
    else:
        print("  ✅ No immediate actions required - continue monitoring")
    
    print("\n" + "="*80)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--filter", choices=[
        "autocommit-readiness", "security-audit", "pattern-coverage",
        "circle-perspective", "all"
    ], help="Filter gaps by type")
    parser.add_argument("--correlation-id", dest="correlation_id")
    parser.add_argument("--since-minutes", dest="since_minutes", type=int)
    parser.add_argument("--since-ts", dest="since_ts")
    parser.add_argument("--normalize-by-events", action="store_true")
    parser.add_argument("--reference-events", type=int, default=1000)
    parser.add_argument("--safe-degrade-conditional", action="store_true")
    parsed = parser.parse_args(sys.argv[1:])

    output_json = parsed.json
    correlation_id = parsed.correlation_id
    since_ts: float | None = None

    if parsed.since_minutes is not None:
        since_ts = time.time() - (float(parsed.since_minutes) * 60.0)
    elif parsed.since_ts is not None:
        try:
            raw = float(parsed.since_ts)
            since_ts = (raw / 1000.0) if raw > 1e12 else raw
        except Exception:
            since_ts = None
    
    # Analyze observability state
    telemetry = load_telemetry(correlation_id=correlation_id, since_ts=since_ts)
    coverage = check_pattern_coverage(
        telemetry,
        safe_degrade_conditional=bool(parsed.safe_degrade_conditional),
        normalize_by_events=bool(parsed.normalize_by_events),
        reference_events=int(parsed.reference_events),
    )
    logging_coverage = scan_code_for_logging()
    missing = identify_missing_telemetry()
    
    if output_json:
        result = {
            "filters": {
                "correlation_id": correlation_id,
                "since_ts": since_ts,
                "since_minutes": parsed.since_minutes,
                "normalize_by_events": bool(parsed.normalize_by_events),
                "reference_events": int(parsed.reference_events),
                "safe_degrade_conditional": bool(parsed.safe_degrade_conditional),
            },
            "telemetry": telemetry,
            "coverage": coverage,
            "logging_coverage": logging_coverage,
            "infrastructure_gaps": missing,
            "overall_status": "healthy" if coverage["meets_thresholds"] and not missing else "gaps_detected"
        }
        print(json.dumps(result, indent=2))
    else:
        format_gaps_report(telemetry, coverage, logging_coverage, missing)


if __name__ == '__main__':
    main()
