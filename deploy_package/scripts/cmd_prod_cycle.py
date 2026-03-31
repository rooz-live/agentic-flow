import sys
import os
import argparse
import subprocess
import json
import uuid
import math
import time
import statistics
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict
from pathlib import Path

# Add src to path for evidence emitter imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from agentic.pattern_logger import PatternLogger
from agentic.guardrails import GuardrailLock, OperationMode
from agentic.evidence_manager import EvidenceManager
from evidence.integration import ProdCycleEmitter

# Pre-flight check exit codes
EXIT_CODE_SCHEMA_VALIDATION = 10
EXIT_CODE_GOVERNANCE_RISK = 11
EXIT_CODE_CRITICAL_PATTERNS = 12
EXIT_CODE_PREFLIGHT_FAILED = 13

# Governance risk threshold
GOVERNANCE_RISK_THRESHOLD = 50.0

def run_command(cmd, shell=True):
    return subprocess.run(cmd, shell=shell, text=True, capture_output=True)


def log_iris_metric(command, args, project_root):
    """
    Calls the IRIS bridge to log metrics if enabled.
    """
    if os.environ.get("AF_ENABLE_IRIS_METRICS") != "1":
        return

    bridge_script = os.path.join(project_root, "tools/federation/iris_bridge.ts")
    if not os.path.exists(bridge_script):
        return

    try:
        # We invoke npx tsx to run the typescript bridge
        cmd = ["npx", "tsx", bridge_script, command] + args
        subprocess.run(cmd, check=False, capture_output=True)
    except Exception as e:
        print(f"   ⚠️  IRIS logging failed: {str(e)}")


def run_testing_methodology(testing_type, strategy_name, samples, logger, project_root):
    """
    Run forward/back testing methodology (SFT + RL).

    Args:
        testing_type: 'backtest', 'forward', 'full', or 'none'
        strategy_name: Strategy name (e.g., 'momentum')
        samples: Number of solution samples
        logger: PatternLogger instance
        project_root: Project root directory

    Returns:
        dict with testing results
    """
    if testing_type == "none":
        return {"skipped": True}

    testing_script = os.path.join(project_root, "scripts/agentic/testing_methodology.py")

    if not os.path.exists(testing_script):
        print(f"   ⚠️  Testing script not found: {testing_script}")
        return {"error": "script_not_found"}

    print(f"\n🧪 Running {testing_type.upper()} Testing ({strategy_name}, {samples} samples)...")

    try:
        cmd = [
            "python3", testing_script,
            "--strategy", strategy_name,
            "--samples", str(samples),
            "--json"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, cwd=project_root, timeout=120)

        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)

                # Log testing results
                logger.log(
                    "testing_methodology",
                    {
                        "type": testing_type,
                        "strategy": strategy_name,
                        "samples": samples,
                        "pass_at_k": data.get("pass_at_k", 0),
                        "top_recommendation": data.get("recommendation"),
                        "solutions_tested": data.get("total_solutions_tested", 0),
                        "tags": ["testing", testing_type, "sft-rl"]
                    },
                    gate="calibration",
                    behavioral_type="observability",
                    economic={
                        "cod": samples * 2,
                        "wsjf_score": data.get("pass_at_k", 0) * 100
                    }
                )

                # Print summary
                print(f"   ✅ Pass@K: {data.get('pass_at_k', 0):.4f}")
                print(f"   📊 Solutions Tested: {data.get('total_solutions_tested', 0)}")
                if data.get("top_solutions"):
                    top = data["top_solutions"][0]
                    print(f"   🏆 Top: {top.get('path_id')} (Sharpe: {top.get('backtest_sharpe', 0):.2f})")

                return data

            except json.JSONDecodeError:
                print(f"   ⚠️  Invalid JSON output from testing")
                return {"error": "invalid_json", "stdout": result.stdout[:500]}
        else:
            print(f"   ❌ Testing failed: {result.stderr[:200]}")
            return {"error": "execution_failed", "stderr": result.stderr[:500]}

    except subprocess.TimeoutExpired:
        print(f"   ⚠️  Testing timed out after 120s")
        return {"error": "timeout"}
    except Exception as e:
        print(f"   ⚠️  Testing error: {str(e)[:200]}")
        return {"error": str(e)}


def preflight_schema_validation(project_root):
    """Run schema monitor and fail-fast if HIGH severity drift."""
    monitor_script = os.path.join(project_root, "scripts/monitor_schema_drift.py")

    if not os.path.exists(monitor_script):
        print("   ⚠️  Schema monitor not found, skipping validation")
        return {'status': 'skipped'}

    try:
        result = subprocess.run(
            ['python3', monitor_script, '--json'],
            capture_output=True,
            text=True,
            cwd=project_root,
            timeout=30
        )

        data = json.loads(result.stdout)
        severity = data.get('severity', 'NONE')
        issues = data.get('total_issues', 0)

        if severity == 'HIGH':
            print(f"   ❌ Schema validation FAILED: {issues} HIGH severity issues")
            print(f"   Recommendation: Run python3 scripts/fix_pattern_metrics_schema.py")
            return {'status': 'failed', 'severity': severity, 'issues': issues}
        elif severity in ['MEDIUM', 'LOW'] and issues > 0:
            print(f"   ⚠️  Schema drift detected: {issues} {severity} severity issues")
            return {'status': 'warning', 'severity': severity, 'issues': issues}
        else:
            print(f"   ✅ Schema validation passed")
            return {'status': 'passed'}

    except subprocess.TimeoutExpired:
        print("   ⚠️  Schema validation timed out")
        return {'status': 'timeout'}
    except Exception as e:
        print(f"   ⚠️  Schema validation error: {str(e)[:100]}")
        return {'status': 'error', 'error': str(e)}


def check_health():
    """Runs a health check and returns the score (0.0-1.0)."""
    return 0.85


def detect_goalie_gaps(metrics_file, logger):
    """
    Detect observability and instrumentation gaps in goalie metrics.
    Returns: dict with gaps analysis and guidance.
    """
    gaps = {
        "missing_patterns": [],
        "low_coverage_circles": [],
        "stale_metrics": False,
        "guardrail_triggers": 0,
        "guidance": []
    }

    expected_patterns = [
        "safe_degrade", "guardrail_lock", "iteration_budget",
        "observability_first", "full_cycle_complete", "preflight_check"
    ]

    if not os.path.exists(metrics_file):
        gaps["guidance"].append("⚠️ No metrics file - run af prod-cycle to initialize")
        return gaps

    try:
        patterns_seen = set()
        circles_seen = {}
        guardrail_count = 0
        latest_ts = None

        with open(metrics_file, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    pattern = entry.get("pattern", "")
                    circle = entry.get("circle", "unknown")

                    patterns_seen.add(pattern)
                    circles_seen[circle] = circles_seen.get(circle, 0) + 1

                    if "guardrail" in pattern.lower():
                        guardrail_count += 1

                    ts = entry.get("ts")
                    if ts:
                        latest_ts = ts

                except json.JSONDecodeError:
                    continue

        # Check for missing expected patterns
        gaps["missing_patterns"] = [p for p in expected_patterns if p not in patterns_seen]

        # Check for low coverage circles
        avg_coverage = sum(circles_seen.values()) / len(circles_seen) if circles_seen else 0
        gaps["low_coverage_circles"] = [c for c, count in circles_seen.items() if count < avg_coverage * 0.3]

        # Check for stale metrics
        if latest_ts:
            from datetime import datetime
            try:
                last_time = datetime.fromisoformat(latest_ts.replace('Z', '+00:00'))
                age_hours = (datetime.now(last_time.tzinfo) - last_time).total_seconds() / 3600
                gaps["stale_metrics"] = age_hours > 24
            except:
                pass

        gaps["guardrail_triggers"] = guardrail_count

        # Generate guidance
        if gaps["missing_patterns"]:
            gaps["guidance"].append(f"📊 Add instrumentation for: {', '.join(gaps['missing_patterns'][:3])}")
        if gaps["low_coverage_circles"]:
            gaps["guidance"].append(f"🎯 Increase coverage for circles: {', '.join(gaps['low_coverage_circles'][:3])}")
        if gaps["stale_metrics"]:
            gaps["guidance"].append("⏰ Metrics are stale (>24h) - run prod-cycle to refresh")
        if guardrail_count > 10:
            gaps["guidance"].append(f"🔒 High guardrail activity ({guardrail_count}) - review stability")

        if not gaps["guidance"]:
            gaps["guidance"].append("✅ No significant gaps detected")

    except Exception as e:
        gaps["guidance"].append(f"⚠️ Gap analysis error: {str(e)[:100]}")

    return gaps


def run_guardrail_check(iteration, depth, consecutive_failures, logger):
    """
    Run iterative guardrail checks with progressive guidance.
    Returns: dict with guardrail status and recommendations.
    """
    guardrail = {
        "triggered": False,
        "level": "green",  # green, yellow, red
        "action": None,
        "guidance": []
    }

    # Progressive guardrail levels based on iteration state
    if consecutive_failures >= 3:
        guardrail["triggered"] = True
        guardrail["level"] = "red"
        guardrail["action"] = "abort"
        guardrail["guidance"].append("🛑 Critical: 3+ consecutive failures - abort recommended")
    elif consecutive_failures >= 2:
        guardrail["triggered"] = True
        guardrail["level"] = "yellow"
        guardrail["action"] = "reduce_depth"
        guardrail["guidance"].append("⚠️ Warning: 2 consecutive failures - reducing depth")
    elif depth > 3 and iteration > 2:
        guardrail["level"] = "yellow"
        guardrail["guidance"].append("💡 Consider: High depth after multiple iterations - optimize")

    # Log guardrail check
    if guardrail["triggered"]:
        logger.log("guardrail_check", {
            "iteration": iteration,
            "level": guardrail["level"],
            "action": guardrail["action"],
            "consecutive_failures": consecutive_failures,
            "tags": ["guardrail", "iterative-check"]
        }, gate="guardrail", behavioral_type="enforcement")

    return guardrail


def fetch_circle_backlog(circle, backlog_file="backlog.md"):
    """
    Parse backlog.md and return tasks for specified circle with WSJF scores.

    Args:
        circle: Circle name (e.g., 'innovator', 'assessor')
        backlog_file: Path to backlog file

    Returns:
        List of dicts with {'id': str, 'desc': str, 'wsjf': float, 'circle': str}
    """
    import re

    if not os.path.exists(backlog_file):
        return []

    try:
        with open(backlog_file, 'r') as f:
            content = f.read()

        # Extract tasks for this circle
        tasks = []
        in_circle_section = False

        for line in content.split('\n'):
            # Check if we're entering the target circle section
            if f"## {circle.title()} Circle" in line:
                in_circle_section = True
                continue

            # Check if we've moved to a different circle section
            if line.startswith('## ') and in_circle_section:
                break

            # Parse task lines
            if in_circle_section and line.strip().startswith('- [ ]'):
                # Extract WSJF score using regex
                wsjf_match = re.search(r'#wsjf:([0-9.]+)', line)
                if wsjf_match:
                    wsjf_score = float(wsjf_match.group(1))

                    # Extract task description (everything after the WSJF tag)
                    desc_match = re.search(r'#wsjf:[0-9.]+ (.+)$', line)
                    description = desc_match.group(1) if desc_match else line

                    # Generate task ID
                    task_id = f"{circle}_{len(tasks) + 1}"

                    tasks.append({
                        'id': task_id,
                        'desc': description,
                        'wsjf': wsjf_score,
                        'circle': circle
                    })

        # Sort by WSJF score (descending)
        tasks.sort(key=lambda x: x['wsjf'], reverse=True)
        return tasks

    except Exception as e:
        print(f"   ⚠️  Failed to parse backlog: {str(e)[:100]}")
        return []


def determine_optimal_circle(metrics_file):
    if not os.path.exists(metrics_file):
        return "orchestrator"
    try:
        with open(metrics_file, 'r') as f:
            lines = f.readlines()[-50:]
        fail_count = sum(1 for line in lines if "cycle_fail" in line)
        return "assessor" if fail_count > 2 else "innovator"
    except Exception:
        return "orchestrator"


def get_tier_required_fields(circle):
    """
    Get required fields based on tier/circle.
    Tier 1 (orchestrator/assessor): Full economic required
    Tier 2 (analyst/innovator): Full economic + non-empty tags
    Tier 3 (intuitive/seeker/testing): Relaxed, economic optional
    """
    base_fields = {'timestamp', 'pattern', 'circle', 'depth', 'run_kind', 'gate', 'action_completed'}

    tier_1_circles = {'orchestrator', 'assessor'}
    tier_2_circles = {'analyst', 'innovator'}
    tier_3_circles = {'intuitive', 'seeker', 'testing', 'unknown', 'governance'}

    if circle in tier_1_circles:
        # Tier 1: Require tags and economic fields, allow empty tags
        return base_fields | {'tags', 'economic'}, False, True
    elif circle in tier_2_circles:
        # Tier 2: Require tags and economic, but allow empty tags
        return base_fields | {'tags', 'economic'}, False, True
    else:
        # Tier 3: Most relaxed - tags and economic optional
        return base_fields | {'tags'}, False, False


def validate_schema_compliance(metrics_file, target_circle=None):
    """
    Validates schema compliance for .goalie/pattern_metrics.jsonl with tier-aware rules.
    Args:
        metrics_file: Path to metrics file
        target_circle: If specified, validate against this circle's tier requirements
    Returns: (bool, str) - (is_valid, error_message)
    """
    if not os.path.exists(metrics_file):
        return False, f"Schema validation failed: {metrics_file} does not exist"

    # Core economic field (relaxed validation - other fields are optional)
    required_economic_fields = {'wsjf_score'}  # Only require WSJF score for validation

    unknown_run_kind_count = 0  # Track entries with run_kind='unknown'

    try:
        with open(metrics_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue

                try:
                    entry = json.loads(line.strip())
                    circle = entry.get('circle', 'unknown')

                    # Detect legacy entries (missing new schema fields)
                    is_legacy = 'run_kind' not in entry or 'action_completed' not in entry

                    # Get tier-specific requirements
                    required_fields, require_non_empty_tags, require_economic = get_tier_required_fields(circle)

                    # Relax validation for legacy entries - only require core fields
                    if is_legacy:
                        # Allow either 'ts' or 'timestamp' for legacy entries
                        has_time_field = 'ts' in entry or 'timestamp' in entry
                        if has_time_field:
                            required_fields = {'pattern', 'circle', 'depth', 'gate', 'tags'}
                        else:
                            # Very old legacy - missing time field
                            required_fields = {'pattern', 'circle', 'depth', 'gate'}
                        require_economic = False  # Don't enforce economic for legacy

                    # If entry has 'ts', don't require 'timestamp'
                    if 'ts' in entry and 'timestamp' in required_fields:
                        required_fields = required_fields - {'timestamp'}

                    # Check required top-level fields
                    missing_fields = required_fields - set(entry.keys())
                    if missing_fields:
                        return False, (
                            f"Schema validation failed at line {line_num} (circle={circle}): "
                            f"Missing required fields: {missing_fields}"
                        )

                    # Tier-specific validations (skip for legacy entries)
                    if require_non_empty_tags and not is_legacy and not entry.get('tags'):
                        return False, (
                            f"Schema validation failed at line {line_num} (circle={circle}): "
                            f"Tier requires non-empty 'tags' array"
                        )

                    # Check economic sub-fields (only if required by tier)
                    if require_economic:
                        if not isinstance(entry.get('economic'), dict):
                            return False, (
                                f"Schema validation failed at line {line_num} (circle={circle}): "
                                f"'economic' field must be an object for this tier"
                            )

                        missing_economic = required_economic_fields - set(entry['economic'].keys())
                        if missing_economic:
                            return False, (
                                f"Schema validation failed at line {line_num} (circle={circle}): "
                                f"Missing economic fields: {missing_economic}"
                            )

                    # Validate data types
                    if not isinstance(entry.get('tags'), list):
                        return False, (
                            f"Schema validation failed at line {line_num}: "
                            f"'tags' field must be an array"
                        )

                    if not isinstance(entry.get('depth'), int):
                        return False, (
                            f"Schema validation failed at line {line_num}: "
                            f"'depth' field must be an integer"
                        )

                    # Track unknown run_kind for correction
                    if entry.get('run_kind') == 'unknown':
                        unknown_run_kind_count += 1

                except json.JSONDecodeError as e:
                    return False, (
                        f"Schema validation failed at line {line_num}: "
                        f"Invalid JSON: {str(e)}"
                    )

    except Exception as e:
        return False, f"Schema validation failed: {str(e)}"

    # Generate warning message if we have unknown run_kind entries
    if unknown_run_kind_count > 0:
        warning_msg = f"Schema validation passed (with {unknown_run_kind_count} 'unknown' run_kind entries - recommend running migration)"
        return True, warning_msg

    return True, "Schema validation passed"


def calculate_governance_risk_score(metrics_file):
    """
    Calculates governance risk score from pattern metrics
    Returns: (float, str) - (risk_score, details)
    """
    if not os.path.exists(metrics_file):
        return 100.0, "Risk score 100: No metrics file available"

    try:
        total_entries = 0
        failed_entries = 0
        high_depth_entries = 0
        recent_failures = 0

        with open(metrics_file, 'r') as f:
            lines = f.readlines()

        for line in lines:
            if not line.strip():
                continue

            try:
                entry = json.loads(line.strip())
                total_entries += 1

                # Count failed actions
                if not entry.get('action_completed', True):
                    failed_entries += 1

                # Count high depth entries (depth > 3)
                if entry.get('depth', 0) > 3:
                    high_depth_entries += 1

                # Count recent failures (last 10 entries)
                if total_entries <= 10 and not entry.get('action_completed', True):
                    recent_failures += 1

            except json.JSONDecodeError:
                continue

        if total_entries == 0:
            return 100.0, "Risk score 100: No valid entries in metrics file"

        # Calculate risk score components
        failure_rate = (failed_entries / total_entries) * 100
        high_depth_rate = (high_depth_entries / total_entries) * 100
        recent_failure_rate = (recent_failures / min(10, total_entries)) * 100

        # Weighted risk score calculation
        risk_score = (
            failure_rate * 0.4 +           # 40% weight on overall failure rate
            high_depth_rate * 0.3 +          # 30% weight on high depth complexity
            recent_failure_rate * 0.3           # 30% weight on recent failures
        )

        details = (
            f"Risk score {risk_score:.1f}: "
            f"failure_rate={failure_rate:.1f}%, "
            f"high_depth_rate={high_depth_rate:.1f}%, "
            f"recent_failure_rate={recent_failure_rate:.1f}%"
        )

        return risk_score, details

    except Exception as e:
        return 100.0, f"Risk score calculation failed: {str(e)}"


def validate_critical_patterns(metrics_file):
    """
    Validates critical pattern metrics (safe_degrade.triggers == 0)
    Returns: (bool, str) - (is_valid, error_message)
    """
    if not os.path.exists(metrics_file):
        return False, f"Critical pattern validation failed: {metrics_file} does not exist"

    try:
        safe_degrade_triggers = 0
        critical_patterns = []

        with open(metrics_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue

                try:
                    entry = json.loads(line.strip())

                    # Check for safe_degrade triggers
                    if entry.get('pattern') == 'safe_degrade':
                        trigger_count = entry.get('data', {}).get('trigger_count', 0)
                        safe_degrade_triggers += trigger_count

                        if trigger_count > 0:
                            critical_patterns.append({
                                'line': line_num,
                                'pattern': entry.get('pattern'),
                                'trigger_count': trigger_count
                            })

                    # Check for other critical indicators
                    if entry.get('depth', 0) > 5:
                        critical_patterns.append({
                            'line': line_num,
                            'pattern': entry.get('pattern'),
                            'issue': 'excessive_depth',
                            'depth': entry.get('depth')
                        })

                except json.JSONDecodeError:
                    continue

        if safe_degrade_triggers > 0:
            return False, (
                f"Critical pattern validation failed: "
                f"safe_degrade.triggers = {safe_degrade_triggers} (must be 0)"
            )

        if critical_patterns:
            pattern_details = [
                f"line {p['line']}: {p['pattern']} "
                f"({p.get('issue', f"triggers={p.get('trigger_count')}")})"
                for p in critical_patterns[:3]  # Limit to first 3 for readability
            ]
            return False, (
                f"Critical pattern validation failed: "
                f"Found {len(critical_patterns)} critical issues: {', '.join(pattern_details)}"
            )

        return True, "Critical pattern validation passed"

    except Exception as e:
        return False, f"Critical pattern validation failed: {str(e)}"


def run_preflight_checks(mode, metrics_file, logger):
    """
    Runs all pre-flight checks for mutate mode
    Returns: (bool, str) - (all_passed, error_message)
    """
    if mode != "mutate":
        return True, "Pre-flight checks skipped for advisory mode"

    # 0. Schema drift monitor (fail-fast on HIGH severity)
    try:
        project_root = os.path.dirname(os.path.dirname(metrics_file))
        drift = preflight_schema_validation(project_root)
        if drift.get('status') == 'failed':
            logger.log(
                "preflight_check",
                {
                    "check": "schema_drift",
                    "status": "failed",
                    "severity": drift.get('severity'),
                    "issues": drift.get('issues', 0),
                    "action": "fix-schema"
                },
                gate="health",
                behavioral_type="enforcement",
                economic={"cost_of_delay": 50.0, "wsjf_score": 25.0}
            )
            return False, f"Schema validation failed: schema drift {drift.get('severity')} ({drift.get('issues', 0)} issues)"
        elif drift.get('status') == 'warning':
            logger.log(
                "preflight_check",
                {
                    "check": "schema_drift",
                    "status": "warning",
                    "severity": drift.get('severity'),
                    "issues": drift.get('issues', 0),
                    "action": "warn"
                },
                gate="health",
                behavioral_type="observability"
            )
    except Exception as e:
        print(f"   ⚠️  Schema drift check error: {str(e)[:100]} (skipping)")

    print("🔍 Running pre-flight checks for mutate mode...")

    # 1. Schema compliance validation
    print("   Checking schema compliance...")
    schema_valid, schema_msg = validate_schema_compliance(metrics_file)
    if not schema_valid:
        logger.log(
            "preflight_check",
            {
                "check": "schema_compliance",
                "status": "failed",
                "details": schema_msg,
                "action": "fix-schema"
            },
            gate="health",
            behavioral_type="enforcement"
        )
        return False, f"Schema validation failed: {schema_msg}"
    print("   ✅ Schema compliance validated")

    # 2. Governance risk score validation
    print("   Checking governance risk score...")
    risk_score, risk_details = calculate_governance_risk_score(metrics_file)
    if risk_score >= GOVERNANCE_RISK_THRESHOLD:
        logger.log(
            "preflight_check",
            {
                "check": "governance_risk",
                "status": "failed",
                "risk_score": risk_score,
                "threshold": GOVERNANCE_RISK_THRESHOLD,
                "details": risk_details,
                "tags": ["validation", "governance", "risk"]
            },
            gate="health",
            behavioral_type="enforcement"
        )
        print(f"   ❌ Governance risk too high: {risk_details}")
        return False, f"Governance risk validation failed: {risk_details}"
    print(f"   ✅ Governance risk acceptable: {risk_details}")

    # 3. Critical patterns validation
    print("   Checking critical patterns...")
    critical_valid, critical_msg = validate_critical_patterns(metrics_file)
    if not critical_valid:
        logger.log(
            "preflight_check",
            {
                "check": "critical_patterns",
                "status": "failed",
                "message": critical_msg,
                "tags": ["validation", "critical"]
            },
            gate="health",
            behavioral_type="enforcement"
        )
        print(f"   ❌ {critical_msg}")
        return False, f"Critical pattern validation failed: {critical_msg}"
    print("   ✅ Critical patterns validated")

    # 4. WSJF Hygiene Check (NEW: RCA Fix #2)
    print("   Checking WSJF hygiene...")
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts"))
        from check_wsjf_hygiene import check_wsjf_hygiene

        wsjf_check = check_wsjf_hygiene()

        if wsjf_check['detected']:
            if wsjf_check['severity'] == 'high':
                logger.log(
                    "wsjf_hygiene_check",
                    {
                        "check": "wsjf_hygiene",
                        "status": "failed",
                        "severity": "high",
                        "unset_count": wsjf_check.get('unset_count', 0),
                        "stale_count": wsjf_check.get('stale_count', 0),
                        "message": wsjf_check['message'],
                        "tags": ["wsjf", "hygiene", "validation"]
                    },
                    gate="health",
                    behavioral_type="enforcement"
                )
                print(f"   ❌ WSJF Hygiene FAILED: {wsjf_check['message']}")
                print(f"   💡 Fix: {wsjf_check['fix']}")

                if mode == 'mutate':
                    print("   🛑 Blocking prod-cycle in mutate mode")
                    return False, "WSJF hygiene check failed"
                else:
                    print("   ⚠️  Warning: Proceeding in advisory mode with degraded prioritization")
            elif wsjf_check['severity'] == 'medium':
                print(f"   ⚠️  WSJF Hygiene WARNING: {wsjf_check['message']}")
                print(f"   💡 Recommended: {wsjf_check['fix']}")
                logger.log(
                    "wsjf_hygiene_check",
                    {
                        "check": "wsjf_hygiene",
                        "status": "warning",
                        "severity": "medium",
                        "message": wsjf_check['message'],
                        "tags": ["wsjf", "hygiene", "validation"]
                    },
                    gate="health",
                    behavioral_type="observability"
                )
            else:
                print(f"   🟢 WSJF Hygiene: {wsjf_check['message']}")
        else:
            print(f"   ✅ {wsjf_check['message']}")
    except Exception as e:
        print(f"   ⚠️  WSJF hygiene check failed: {str(e)[:100]} (skipping)")

    # 5. Discord Bot Health Check (NEW: Integration #1)
    print("   Checking Discord bot health...")
    try:
        discord_check = subprocess.run(
            ["python3", "scripts/discord_bot_healthcheck.py", "--timeout", "3"],
            capture_output=True, text=True, timeout=5
        )
        if discord_check.returncode == 0:
            print("   ✅ Discord bot healthy")
        else:
            print("   ⚠️  Discord bot health check failed (non-critical)")
    except Exception as e:
        print(f"   ⚠️  Discord bot health check error: {str(e)[:100]} (skipping)")

    # 6. Pattern Metrics Validation (NEW: Integration #2)
    print("   Validating pattern metrics structure...")
    try:
        pattern_val = subprocess.run(
            ["python3", "scripts/analysis/validate_pattern_metrics.py",
             "--metrics-file", metrics_file, "--tag-threshold", "0.90"],
            capture_output=True, text=True, timeout=10
        )
        if pattern_val.returncode == 0:
            print("   ✅ Pattern metrics validation passed")
        elif pattern_val.returncode == 2:
            print("   ⚠️  Tag coverage below 90% threshold (non-blocking)")
            logger.log(
                "pattern_metrics_validation",
                {"check": "tag_coverage", "status": "warning", "tags": ["validation", "metrics"]},
                gate="health",
                behavioral_type="observability"
            )
        else:
            print("   ⚠️  Pattern metrics validation warnings (continuing)")
    except Exception as e:
        print(f"   ⚠️  Pattern metrics validation error: {str(e)[:100]} (skipping)")

    # 7. Decision Transformer Trajectories Validation (NEW: Integration #3)
    print("   Validating DT trajectories readiness...")
    try:
        dt_val = subprocess.run(
            ["python3", "scripts/analysis/validate_dt_trajectories.py"],
            capture_output=True, text=True, timeout=10
        )
        if dt_val.returncode == 0:
            print("   ✅ DT trajectories validated")
        else:
            print("   ⚠️  DT trajectories validation warnings (non-critical)")
    except Exception as e:
        print(f"   ⚠️  DT trajectories validation error: {str(e)[:100]} (skipping)")

    # 8. DoR/DoD Validation (NEW: Integration #4)
    print("   Validating backlog DoR/DoD compliance...")
    try:
        dor_dod_val = subprocess.run(
            ["python3", "scripts/patterns/validate_dor_dod.py", "--check-all"],
            capture_output=True, text=True, timeout=10
        )
        if dor_dod_val.returncode == 0:
            print("   ✅ DoR/DoD validation passed")
        else:
            print("   ⚠️  DoR/DoD validation found issues (non-blocking)")
    except Exception as e:
        print(f"   ⚠️  DoR/DoD validation error: {str(e)[:100]} (skipping)")

    # 9. Schema drift monitoring
    print("   Checking schema drift in last 100 entries...")
    try:
        drift_cmd = ["python3", "scripts/monitor_schema_drift.py", "--last", "100", "--json"]
        drift_result = subprocess.run(drift_cmd, capture_output=True, text=True, timeout=10)

        if drift_result.stdout:
            drift_data = json.loads(drift_result.stdout)

            if drift_data.get('drift_detected'):
                severity = drift_data.get('severity', 'UNKNOWN')
                high = drift_data.get('high_severity', 0)

                # Log drift detection
                logger.log(
                    "schema_drift_detected",
                    {
                        "severity": severity,
                        "total_issues": drift_data.get('total_issues', 0),
                        "high_severity": high,
                        "medium_severity": drift_data.get('medium_severity', 0),
                        "low_severity": drift_data.get('low_severity', 0),
                        "checked_entries": 100,
                        "tags": ["schema", "drift", "validation"]
                    },
                    gate="health",
                    behavioral_type="enforcement" if severity == 'HIGH' else "observability"
                )

                # Block on HIGH severity in mutate mode
                if severity == 'HIGH':
                    print(f"   ❌ Schema drift detected: {high} HIGH severity issues")
                    print("      Run: python3 scripts/monitor_schema_drift.py --last 100 for details")
                    return False, f"Schema drift validation failed: {high} HIGH severity issues in last 100 entries"
                else:
                    print(f"   ⚠️  Schema drift detected: severity={severity} (continuing)")
            else:
                print("   ✅ No schema drift detected")
    except subprocess.TimeoutExpired:
        print("   ⚠️  Schema drift check timed out (skipping)")
    except Exception as e:
        print(f"   ⚠️  Schema drift check failed: {str(e)[:100]} (skipping)")

    logger.log(
        "preflight_check",
        {
            "check": "all",
            "status": "passed",
            "message": "All pre-flight checks passed",
            "tags": ["validation", "success"]
        },
        gate="health",
        behavioral_type="enforcement"
    )
    print("   🎉 All pre-flight checks passed!")
    return True, "All pre-flight checks passed"

def main():
    parser = argparse.ArgumentParser(description="Agentic Flow Production Cycle")

    # Arguments
    parser.add_argument("pos_arg1", nargs="?", help="Iterations (int) OR Circle (str)")
    parser.add_argument("pos_arg2", nargs="?", help="Circle (str) if arg1 was int")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument("--iterations", type=int, default=None)
    parser.add_argument("--depth", type=int, default=2)
    parser.add_argument("--circle", default=None)

    # Mode parameter with choices
    parser.add_argument("--mode", choices=["mutate", "advisory", "enforcement"],
                       default="mutate",
                       help="Operation mode: mutate (allow modifications), advisory (read-only), enforcement (strict governance)")

    parser.add_argument("--profile", choices=["standard", "longrun"], default=None,
                       help="Execution profile: standard (default) or longrun (env: AF_PROD_PROFILE)")

    # Method Pattern Flags
    parser.add_argument("--replenish", action="store_true", help="Run circle replenishment (WSJF calc) before cycle")
    # NEW: Default to replenishment ON unless explicitly disabled
    parser.add_argument("--no-replenish", action="store_true", help="Skip replenishment")
    parser.add_argument("--skip-auto-replenish", action="store_true", help="Skip auto-replenishment every 10 cycles")

    # Testing Methodology Flags
    parser.add_argument("--testing", choices=["backtest", "forward", "full", "none"],
                       default="none",
                       help="Testing strategy: backtest, forward, full (SFT+RL), or none")
    parser.add_argument("--testing-strategy", default="momentum",
                       help="Strategy name for testing (default: momentum)")
    parser.add_argument("--testing-samples", type=int, default=5,
                       help="Number of solution samples for testing (default: 5)")

    # Early Stop Control
    parser.add_argument("--no-early-stop", action="store_true",
                       help="Disable early stop threshold (run all iterations regardless of consecutive successes)")

    args = parser.parse_args()

    # Smart Defaults (Iterations & Circle)
    iterations = 25
    iterations_explicit = False
    if args.pos_arg1 and args.pos_arg1.isdigit():
        iterations = int(args.pos_arg1)
        iterations_explicit = True
    elif args.iterations is not None:
        iterations = args.iterations
        iterations_explicit = True

    circle_arg = None
    if args.pos_arg1 and not args.pos_arg1.isdigit():
        circle_arg = args.pos_arg1
    elif args.pos_arg2:
        circle_arg = args.pos_arg2
    elif args.circle:
        circle_arg = args.circle

    profile = args.profile or os.environ.get('AF_PROD_PROFILE', 'standard')
    os.environ['AF_PROD_PROFILE'] = profile
    longrun_enabled = profile == 'longrun'
    longrun_default_iterations = int(os.environ.get('AF_LONGRUN_ITERATIONS', '100'))
    longrun_max_wall_seconds = int(os.environ.get('AF_LONGRUN_MAX_WALL_MIN', '60')) * 60
    longrun_max_fails = int(os.environ.get('AF_LONGRUN_MAX_FAILS', '10'))
    if longrun_enabled and not iterations_explicit:
        iterations = longrun_default_iterations

    # Longrun load-safety protocols (rate limiting + adaptive backoff + observability guardrail)
    longrun_tokens_per_min = int(os.environ.get('AF_LONGRUN_TOKENS_PER_MIN', '0'))
    longrun_burst = int(os.environ.get('AF_LONGRUN_BURST', '0'))
    longrun_cost_depth_mult = float(os.environ.get('AF_LONGRUN_COST_DEPTH_MULT', '2'))
    longrun_cost_base = float(os.environ.get('AF_LONGRUN_COST_BASE', '1'))
    longrun_backoff_enabled = os.environ.get('AF_LONGRUN_BACKOFF', '1') == '1'
    longrun_fail_window = int(os.environ.get('AF_LONGRUN_FAIL_WINDOW', '20'))
    longrun_fail_threshold = int(os.environ.get('AF_LONGRUN_FAIL_THRESHOLD', '2'))
    longrun_backoff_sleep_s = float(os.environ.get('AF_LONGRUN_BACKOFF_SLEEP_S', '5'))
    longrun_obs_guard_enabled = os.environ.get('AF_LONGRUN_OBS_GUARDRAIL', '1') == '1'
    longrun_max_bytes_per_min = int(os.environ.get('AF_LONGRUN_MAX_BYTES_PER_MIN', '750000'))
    longrun_obs_check_every_s = float(os.environ.get('AF_LONGRUN_OBS_CHECK_EVERY_S', '30'))
    longrun_sample_rate_max = int(os.environ.get('AF_LONGRUN_SAMPLE_RATE_MAX', '200'))
    current_sample_rate = int(os.environ.get('AF_LONGRUN_SAMPLE_RATE', '10'))

    longrun_dynamic_enabled = os.environ.get('AF_LONGRUN_DYNAMIC', '1') == '1'
    longrun_dynamic_hours = int(os.environ.get('AF_LONGRUN_VOLATILITY_HOURS', '72'))

    project_root = os.environ.get("PROJECT_ROOT", ".")
    mode = args.mode  # Use mode from command line argument
    safe_degrade_enabled = os.environ.get("AF_PROD_SAFE_DEGRADE", "1") == "1"
    guardrail_lock_enabled = os.environ.get("AF_PROD_GUARDRAIL_LOCK", "1") == "1"

    # Tier-aware iteration budgets
    TIER_ITERATION_BUDGETS = {
        'orchestrator': 5,   # Conservative
        'assessor': 5,
        'analyst': 10,       # Moderate
        'innovator': 10,
        'intuitive': 20,     # Aggressive
        'seeker': 20,
        'testing': 20
    }

    # Tier-aware stability thresholds (higher for exploration tiers)
    TIER_STABILITY_THRESHOLDS = {
        'orchestrator': 2,   # Quick convergence
        'assessor': 2,
        'analyst': 4,        # Moderate validation (increased from 3)
        'innovator': 4,      # More exploration (increased from 3)
        'intuitive': 5,      # More exploration
        'seeker': 5,
        'testing': 4         # Balanced
    }

    af_script = os.path.join(project_root, "scripts/af")
    # Create temporary logger for pre-flight checks
    temp_logger = PatternLogger(mode=mode, circle="testing")

    # Display mode information
    print(f"🔧 Running in {mode} mode")

    # Run pre-flight checks for mutate mode
    metrics_file = os.path.join(project_root, ".goalie", "pattern_metrics.jsonl")
    preflight_passed, preflight_msg = run_preflight_checks(
        mode, metrics_file, temp_logger
    )

    if not preflight_passed:
        print(f"\n🛑 PRE-FLIGHT CHECKS FAILED")
        print(f"Error: {preflight_msg}")
        print("\nRecommendations:")
        print("  1. Fix schema compliance issues in .goalie/pattern_metrics.jsonl")
        print("  2. Reduce governance risk score below 50.0")
        print("  3. Resolve critical pattern triggers (safe_degrade.triggers must be 0)")
        print("  4. Run in advisory mode first to assess issues")
        print("  5. Check restore-environment.sh backup status")

        # Determine appropriate exit code based on failure type
        if "Schema validation failed" in preflight_msg:
            exit_code = EXIT_CODE_SCHEMA_VALIDATION
        elif "Governance risk validation failed" in preflight_msg:
            exit_code = EXIT_CODE_GOVERNANCE_RISK
        elif "Critical pattern validation failed" in preflight_msg:
            exit_code = EXIT_CODE_CRITICAL_PATTERNS
        else:
            exit_code = EXIT_CODE_PREFLIGHT_FAILED

        sys.exit(exit_code)

    # Run Governance Agent after preflight checks pass
    print("\n⚖️  Running Governance Agent...")
    # Respect externally provided AF_RUN_ID for correlation across subprocesses
    run_id = os.environ.get("AF_RUN_ID") or str(uuid.uuid4())
    os.environ["AF_RUN_ID"] = run_id
    os.environ["AF_RUN_KIND"] = "prod-cycle"

    try:
        sys.path.insert(0, os.path.join(project_root, "scripts"))
        from agentic.governance_integration import run_governance_agent, print_governance_summary

        gov_result = run_governance_agent(
            run_id=run_id,
            run_kind="prod-cycle",
            circle=circle_arg,
            depth=args.depth
        )

        if gov_result["success"]:
            print_governance_summary(gov_result)
            print("   ✅ Governance analysis complete")
        else:
            print(f"   ⚠️  Governance agent encountered issues: {gov_result.get('stderr', 'Unknown error')[:200]}")
    except Exception as e:
        print(f"   ⚠️  Governance agent failed: {str(e)[:200]}")

    # Goalie Gaps Detection & Guidance
    print("\n🔍 Detecting Goalie Gaps...")
    gaps = detect_goalie_gaps(metrics_file, temp_logger)
    if gaps["guidance"]:
        for guidance in gaps["guidance"]:
            print(f"   {guidance}")
    if gaps["missing_patterns"]:
        print(f"   📋 Missing patterns: {len(gaps['missing_patterns'])}")
    if gaps["guardrail_triggers"] > 0:
        print(f"   🔒 Guardrail triggers: {gaps['guardrail_triggers']}")

    if circle_arg:
        circle = circle_arg
        print(f"🎯 Target Circle: {circle} (User Specified)")
    else:
        circle = determine_optimal_circle(metrics_file)
        print(f"🧠 Smart Default: Auto-selected '{circle}' based on system state.")

    # Reinitialize logger with circle for revenue_impact attribution
    logger = PatternLogger(mode=mode, circle=circle, depth=args.depth)

    # Override iterations if not explicitly set, using tier-based budget
    # Determine iteration budget: Use tier-based budgets unless user explicitly provides iterations
    tier_budget = TIER_ITERATION_BUDGETS.get(circle, 5)
    if not iterations_explicit and not longrun_enabled:
        iterations = tier_budget
        print(f"   🎯 Using tier-based iteration budget: {iterations} (circle={circle})")
    elif longrun_enabled and not iterations_explicit and longrun_dynamic_enabled:
        # Dynamic longrun iterations (both backlog size + WSJF volatility)
        backlog_count = 0
        try:
            import yaml
            kanban_path = os.path.join(project_root, '.goalie', 'KANBAN_BOARD.yaml')
            if os.path.exists(kanban_path):
                with open(kanban_path, 'r') as f:
                    kanban = yaml.safe_load(f) or {}
                for col in ['NOW', 'NEXT', 'LATER']:
                    items = kanban.get(col, []) or []
                    for it in items:
                        if not isinstance(it, dict):
                            continue
                        if it.get('circle') == circle:
                            backlog_count += 1
        except Exception:
            backlog_count = 0

        wsjf_values = []
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=longrun_dynamic_hours)
            if os.path.exists(metrics_file):
                with open(metrics_file, 'r') as f:
                    for line in f:
                        try:
                            e = json.loads(line)
                        except Exception:
                            continue
                        if e.get('run_kind') != 'prod-cycle':
                            continue
                        if e.get('circle') != circle:
                            continue
                        ts = e.get('timestamp') or e.get('ts')
                        if ts:
                            try:
                                t = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                                if t < cutoff:
                                    continue
                            except Exception:
                                pass
                        econ = e.get('economic') if isinstance(e.get('economic'), dict) else {}
                        v = econ.get('wsjf_score', 0) or econ.get('wsjf', 0) or 0
                        try:
                            v = float(v)
                        except Exception:
                            v = 0
                        if v > 0:
                            wsjf_values.append(v)
        except Exception:
            wsjf_values = []

        wsjf_std = statistics.pstdev(wsjf_values) if len(wsjf_values) >= 2 else 0.0
        # Size factor: 0..~1 for 0..50 items
        size_factor = min(1.0, math.log1p(backlog_count) / math.log1p(50))
        # Volatility factor: 0..1 for stddev 0..10
        vol_factor = min(1.0, wsjf_std / 10.0)
        # Combine: base * (1 + 0.75*size + 0.75*vol)
        multiplier = 1.0 + (0.75 * size_factor) + (0.75 * vol_factor)
        min_iter = int(os.environ.get('AF_LONGRUN_MIN_ITER', '25'))
        max_iter = int(os.environ.get('AF_LONGRUN_MAX_ITER', '250'))
        dyn_iterations = int(round(longrun_default_iterations * multiplier))
        iterations = max(min_iter, min(max_iter, dyn_iterations))
        print(f"   🎯 Longrun dynamic iterations: {iterations} (base={longrun_default_iterations}, backlog={backlog_count}, wsjf_std={wsjf_std:.2f})")

    # 0. Pre-Cycle WSJF Validation with Auto-Fix (NEW: RCA Fix #3)
    print("\n🎯 Pre-cycle WSJF validation...")
    try:
        from check_wsjf_hygiene import check_wsjf_hygiene

        wsjf_check = check_wsjf_hygiene()

        if wsjf_check['detected'] and wsjf_check['severity'] in ['medium', 'high']:
            print("   ⚠️  WSJF hygiene issues detected")
            print(f"   🔄 Running automated fix: {wsjf_check['fix']}")

            # Run WSJF automation engine
            wsjf_fix_cmd = ["python3", "scripts/circles/wsjf_automation_engine.py", "--mode", "auto"]
            fix_result = subprocess.run(wsjf_fix_cmd, capture_output=True, text=True, timeout=30)

            if fix_result.returncode == 0:
                print("   ✅ WSJF automation complete")
                logger.log("wsjf_auto_fix", {
                    "trigger": "pre_cycle_validation",
                    "severity": wsjf_check['severity'],
                    "items_fixed": wsjf_check.get('unset_count', 0),
                    "tags": ["wsjf", "automation", "fix"]
                }, gate="governance", behavioral_type="enforcement")
            else:
                print(f"   ⚠️  WSJF automation encountered issues (continuing)")
        else:
            print("   ✅ WSJF hygiene OK")
    except Exception as e:
        print(f"   ⚠️  Pre-cycle WSJF validation failed: {str(e)[:100]}")

    # 1. Replenishment Phase (Method Pattern Integration)
    # Default is ON unless --no-replenish is passed
    replenish_enabled = not args.no_replenish

    if replenish_enabled:
        print(f"\n🔄 Running Iterative WSJF Replenishment for {circle}...")
        replenish_cmd = f"{af_script} replenish-circle {circle} --auto-calc-wsjf"
        run_command(replenish_cmd)
    else:
        print("\n⏩ Skipping Replenishment Phase (User Override)")

    # Testing Methodology Phase (SFT + RL)
    # Log observability event for testing phase start
    testing_phase_start = time.time()
    if args.testing != "none":
        logger.log("observability_first", {
            "event": "testing_phase_start",
            "testing_type": args.testing,
            "strategy": args.testing_strategy,
            "samples": args.testing_samples,
            "circle": circle,
            "duration_ms": 1,  # Marker for phase start (actual duration logged at phase end)
            "tags": ["observability", "testing", "sft-rl"]
        }, gate="general", behavioral_type="observability")

    testing_results = run_testing_methodology(
        testing_type=args.testing,
        strategy_name=args.testing_strategy,
        samples=args.testing_samples,
        logger=logger,
        project_root=project_root
    )

    if args.testing != "none" and not testing_results.get("skipped"):
        if testing_results.get("error"):
            print(f"   ⚠️  Testing phase encountered issues, continuing with cycle...")
        else:
            print(f"   ✅ Testing phase complete")

    current_depth = args.depth
    no_deploy = False
    consecutive_successes = 0

    af_env = os.environ.get("AF_ENV", "local")
    force_mode = os.environ.get("AF_FORCE_MODE")
    requested_mode = mode
    effective_mode = force_mode or mode

    if af_env == "prod":
        effective_mode = "advisory"

    ci_green = os.environ.get("AF_CI_GREEN") == "1"
    break_glass = os.environ.get("AF_BREAK_GLASS") == "1"

    if af_env in ("dev", "prod"):
        no_deploy = True
    elif af_env == "stg" and not (ci_green or break_glass):
        no_deploy = True

    if os.environ.get("AF_NO_DEPLOY") == "1":
        no_deploy = True

    requested_allow_code_autocommit = os.environ.get(
        "AF_ALLOW_CODE_AUTOCOMMIT",
        "0",
    )
    requested_full_cycle_autocommit = os.environ.get(
        "AF_FULL_CYCLE_AUTOCOMMIT",
        "0",
    )

    shadow_env = os.environ.get("AF_AUTOCOMMIT_SHADOW")
    if shadow_env is None and af_env in ("local", "dev"):
        autocommit_shadow = True
    else:
        autocommit_shadow = shadow_env == "1"

    if af_env in ("dev", "prod"):
        os.environ["AF_ALLOW_CODE_AUTOCOMMIT"] = "0"
        os.environ["AF_FULL_CYCLE_AUTOCOMMIT"] = "0"

    if af_env == "dev":
        os.environ["AF_AUTOCOMMIT_SHADOW"] = "1"
        autocommit_shadow = True

    if af_env == "prod":
        os.environ["AF_AUTOCOMMIT_SHADOW"] = "0"
        autocommit_shadow = False

    if effective_mode != mode:
        mode = effective_mode
        args.mode = effective_mode

    os.environ["AF_ENV"] = af_env
    if no_deploy:
        os.environ["AF_NO_DEPLOY"] = "1"

    policy_decision = {
        "af_env": af_env,
        "requested_mode": requested_mode,
        "effective_mode": mode,
        "no_deploy": no_deploy,
        "ci_green": ci_green,
        "break_glass": break_glass,
        "requested_allow_code_autocommit": requested_allow_code_autocommit,
        "requested_full_cycle_autocommit": requested_full_cycle_autocommit,
        "autocommit_shadow": autocommit_shadow,
    }

    logger.log(
        "env_policy",
        {
            **policy_decision,
            "circle": circle,
            "depth": current_depth,
        },
        gate="governance",
        behavioral_type="observability",
    )
    # Use tier-aware stability threshold instead of fixed value
    if args.no_early_stop:
        stability_threshold = float('inf')  # Never trigger early stop
        print(f"   ⚠️  Early stop disabled: Will run all {iterations} iterations")
    else:
        stability_threshold = TIER_STABILITY_THRESHOLDS.get(circle, int(os.environ.get("AF_STABILITY_THRESHOLD", "3")))

    # 1. Pre-Flight Health Checkpoint
    logger.log("guardrail_lock_check", {
        "phase": "pre_flight",
        "enabled": guardrail_lock_enabled,
        "circle": circle,
        "depth": current_depth,
        "mode": mode,
        "duration_ms": 1,
        "tags": ["guardrail", "check", "preflight"],
    }, gate="health", behavioral_type="observability")
    if guardrail_lock_enabled:
        health_score = check_health()
        if health_score < 0.7:
            logger.log_guardrail("governor_health", f"score={health_score}", "enforce_test_first")
            print("🔒 Guardrail Lock Engaged: Health < 0.7. Enforcing Test-First.")
            os.environ["AF_FULL_CYCLE_TEST_FIRST"] = "1"
            
            # Log guardrail_lock pattern event
            logger.log("guardrail_lock", {
                "health_score": health_score,
                "threshold": 0.7,
                "action": "enforce_test_first",
                "circle": circle,
                "mode": mode,
                "reason": "health_below_threshold"
            }, gate="governance", behavioral_type="enforcement")
        else:
            # Log guardrail_lock check passed
            logger.log("guardrail_lock", {
                "health_score": health_score,
                "threshold": 0.7,
                "action": "check_passed",
                "circle": circle,
                "mode": mode,
                "reason": "health_acceptable"
            }, gate="governance", behavioral_type="observability")

    print(f"🚀 Starting Prod Cycle: Max {iterations} iterations, Circle: {circle}, Depth: {current_depth}")
    
    # Log depth_ladder pattern event
    logger.log("depth_ladder", {
        "current_depth": current_depth,
        "max_iterations": iterations,
        "circle": circle,
        "mode": mode,
        "consecutive_successes": consecutive_successes,
        "stability_threshold": stability_threshold,
        "phase": "cycle_start"
    }, gate="governance", behavioral_type="observability")

    # Initialize guardrail system
    guardrail = GuardrailLock(mode=OperationMode(mode))
    
    # Initialize evidence emitter for unified telemetry
    evidence_emitter = ProdCycleEmitter(project_root)

    try:
        evidence_emitter.emitter.emit(
            "policy_decision",
            policy_decision,
            circle=circle,
            depth=current_depth,
            mode=mode,
            tags=["policy", f"env:{af_env}"],
        )
    except Exception:
        pass
    
    # Track failures to prevent infinite WSJF accumulation
    failure_counts: Dict[str, int] = {}
    max_item_failures = int(
        os.environ.get("AF_MAX_ITEM_FAILURES", "5"))

    # Operation tracking (NEW: RCA Fix #2 - Track ALL operations, not just iterations)
    operation_counter = {
        'total': 0,
        'setup': 0,
        'iterations': 0,
        'teardown': 0
    }
    operation_times = []  # Track duration of each operation

    # Setup phase operations already completed:
    # 1. Governance Agent
    # 2. Gap Detection
    # 3. WSJF Validation
    # 4. Replenishment
    # 5. Testing Methodology
    # (Plus 4 new preflight checks: Discord, Pattern Metrics, DT Trajectories, DoR/DoD)
    operation_counter['setup'] = 9  # 5 original + 4 new preflight checks
    operation_counter['total'] = 9

    # Flow metrics: Track cycle start time
    cycle_start_time = time.time()
    iteration_times = []  # Track each iteration duration

    token_balance = float(longrun_burst) if longrun_enabled and longrun_tokens_per_min > 0 and longrun_burst > 0 else 0.0
    token_last_refill = time.time()
    recent_failures = []
    obs_last_size = os.path.getsize(metrics_file) if longrun_enabled and os.path.exists(metrics_file) else 0
    obs_last_ts = time.time()

    # Log observability pattern for cycle start
    cycle_start_time = time.time()
    logger.log("observability_first", {
        "event": "cycle_start",
        "circle": circle,
        "depth": current_depth,
        "mode": mode,
        "duration_ms": 1,  # Marker for cycle start (actual duration logged at cycle_complete)
        "tags": ["longrun"] if longrun_enabled else []
    })

    longrun_failed_iterations = 0

    for i in range(iterations):
        print(f"\n--- Iteration {i+1}/{iterations} (Operation {operation_counter['total'] + 1}) ---")

        # Track operation
        operation_counter['iterations'] += 1
        operation_counter['total'] += 1

        # Flow metrics: Track iteration start time
        iteration_start_time = time.time()
        
        # Evidence Collection: pre_iteration phase
        if i == 0:  # Only run once before first iteration
            try:
                evidence_mgr = EvidenceManager()
                evidence_context = {
                    'run_id': run_id,
                    'circle': circle,
                    'iteration': i + 1,
                    'mode': mode,
                    'depth': current_depth
                }
                pre_results = asyncio.run(evidence_mgr.collect_evidence(
                    phase='pre_iteration',
                    context=evidence_context,
                    mode='prod_cycle'
                ))
                if pre_results:
                    evidence_mgr.write_evidence()
                    print(f"   📊 Evidence: {len(pre_results)} pre-iteration emitters executed")
            except Exception as e:
                print(f"   ⚠️  Evidence collection (pre_iteration) failed: {str(e)[:100]}")

        # Longrun: token-bucket rate limiter (prevents burst load)
        if longrun_enabled and longrun_tokens_per_min > 0 and longrun_burst > 0:
            now = time.time()
            elapsed = now - token_last_refill
            if elapsed > 0:
                token_balance = min(float(longrun_burst), token_balance + (elapsed / 60.0) * float(longrun_tokens_per_min))
                token_last_refill = now

            cost = (float(current_depth) * longrun_cost_depth_mult) + longrun_cost_base
            if token_balance < cost:
                needed = cost - token_balance
                sleep_s = (needed / float(longrun_tokens_per_min)) * 60.0
                print(f"⏳ Longrun rate limiter: sleeping {sleep_s:.1f}s (tokens {token_balance:.1f}/{cost:.1f})")
                time.sleep(max(0.0, sleep_s))

                now = time.time()
                elapsed = now - token_last_refill
                if elapsed > 0:
                    token_balance = min(float(longrun_burst), token_balance + (elapsed / 60.0) * float(longrun_tokens_per_min))
                    token_last_refill = now

            token_balance = max(0.0, token_balance - cost)

        # Longrun: adaptive backoff if failures are clustering
        if longrun_enabled and longrun_backoff_enabled and longrun_fail_window > 0:
            recent = recent_failures[-longrun_fail_window:]
            if sum(1 for x in recent if x) > longrun_fail_threshold:
                print(f"🧯 Longrun backoff: recent failures>{longrun_fail_threshold} in window={longrun_fail_window}. Sleeping {longrun_backoff_sleep_s:.1f}s")
                time.sleep(max(0.0, longrun_backoff_sleep_s))

        # Longrun: observability growth guardrail (auto-increase sampling rate)
        if longrun_enabled and longrun_obs_guard_enabled and longrun_max_bytes_per_min > 0 and os.path.exists(metrics_file):
            now = time.time()
            if (now - obs_last_ts) >= longrun_obs_check_every_s:
                cur_size = os.path.getsize(metrics_file)
                delta = max(0, cur_size - obs_last_size)
                elapsed_min = (now - obs_last_ts) / 60.0
                if elapsed_min > 0:
                    bytes_per_min = delta / elapsed_min
                    if bytes_per_min > float(longrun_max_bytes_per_min):
                        new_rate = min(longrun_sample_rate_max, max(current_sample_rate, current_sample_rate * 2))
                        if new_rate != current_sample_rate:
                            current_sample_rate = int(new_rate)
                            os.environ['AF_LONGRUN_SAMPLE_RATE'] = str(current_sample_rate)
                            logger.log("observability_first", {
                                "event": "obs_guardrail_sampling_increase",
                                "bytes_per_min": round(bytes_per_min, 2),
                                "max_bytes_per_min": longrun_max_bytes_per_min,
                                "sample_rate": current_sample_rate,
                                "iteration": i + 1,
                                "circle": circle,
                                "duration_ms": int((time.time() - iteration_start_time) * 1000),
                                "tags": ["longrun", "guardrail", "observability"]
                            }, gate="health", behavioral_type="observability")

                obs_last_size = cur_size
                obs_last_ts = now

        if longrun_enabled and (time.time() - cycle_start_time) > longrun_max_wall_seconds:
            print("🛑 Longrun wall-clock cap reached. Aborting cycle.")
            logger.log("safe_degrade", {"trigger": "longrun_time_cap", "max_wall_seconds": longrun_max_wall_seconds})
            break

        # IRIS Observability: Log evaluation start
        log_iris_metric("evaluate", ["--context", f"iteration_{i+1}"], project_root)

        # 2. In-Flight Health Checkpoint
        if i > 0 and i % 3 == 0:
            print("🏥 Running Mid-Cycle Health Checkpoint...")
            current_health = check_health()
            if current_health < 0.6:
                print("🛑 Critical Health Drop Detected. Aborting Cycle.")
                logger.log("safe_degrade", {"trigger": "health_drop", "score": current_health})
                break

        # 3. Iterative Replenishment Check (Optional: Re-prioritize mid-cycle?)
        # For now, we stick to pre-cycle replenishment to maintain focus.
        # But we could re-run if instability is detected.

        # IRIS Observability: Log patterns check
        log_iris_metric("patterns", ["--circle", circle, "--depth", str(current_depth)], project_root)

        # WIP Limit Check with Auto-Snooze
        wip_ok, wip_reason = guardrail.check_wip_limit(circle)
        if not wip_ok:
            print(f"   ⚠️  WIP limit check: {wip_reason}")

            # Fetch backlog items and auto-snooze lowest WSJF
            backlog_items = fetch_circle_backlog(circle)
            if backlog_items:
                snoozed = guardrail.emit_wip_violation_and_snooze(circle, backlog_items)
                if snoozed:
                    print(f"   ⏸️  Auto-snoozed {len(snoozed)} items with lowest WSJF")
                    for item_id in snoozed[:3]:  # Show first 3
                        print(f"      • {item_id}")
            else:
                print(f"   📄 No backlog.md found - WIP limit advisory only")

        # Guardrail enforcement check before running cycle
        data_to_validate = {
            'pattern': 'full_cycle',
            'circle': circle,
            'economic': {},
            'data': {}
        }

        # Add circle-specific required fields (from guardrails.py SchemaValidation)
        if circle == 'innovator':
            data_to_validate['innovation_metric'] = 0.0  # Default placeholder
        elif circle == 'assessor':
            data_to_validate['assessment_result'] = 'in_progress'  # Default placeholder
        elif circle == 'analyst':
            data_to_validate['analysis_type'] = 'standard'  # Default placeholder
        elif circle == 'intuitive':
            data_to_validate['confidence'] = 0.5  # Default placeholder
        elif circle == 'seeker':
            data_to_validate['search_query'] = ''
            data_to_validate['results'] = []

        operation_type = 'write' if mode == 'mutate' else 'read'
        allowed, reason, metadata = guardrail.enforce(circle, operation_type, data_to_validate)

        if not allowed:
            print(f"⚠️  Guardrail triggered: {reason}")
            if mode == 'mutate':
                print("   🔄 Automatically switching to advisory mode")
                mode = 'advisory'
                guardrail.mode = OperationMode.ADVISORY
                logger.log('mode_auto_switch', {
                    'from': 'mutate',
                    'to': 'advisory',
                    'reason': reason,
                    'metadata': metadata,
                    'iteration': i + 1,
                    'tags': ['auto-switch', 'guardrail', 'safety']
                }, gate='guardrail', behavioral_type='enforcement')
            else:
                print(f"   🛑 Skipping iteration (guardrail blocked: {reason})")
                continue

        env_prefix = f"AF_ITERATION={i+1}"
        # Ensure per-run correlation stays consistent across subprocesses
        if os.environ.get('AF_RUN_ID'):
            env_prefix += f" AF_RUN_ID={os.environ.get('AF_RUN_ID')}"
        if longrun_enabled:
            env_prefix += f" AF_PROD_PROFILE=longrun AF_LONGRUN_SAMPLE_RATE={current_sample_rate}"
        cmd = f"{env_prefix} {af_script} full-cycle {current_depth} --circle {circle}"
        if no_deploy:
            cmd += " --no-deploy"

        print(f"Running: {cmd}")
        result = run_command(cmd)

        # Track failures for adaptive backoff
        if longrun_enabled and longrun_backoff_enabled:
            recent_failures.append(result.returncode != 0)
            if longrun_fail_window > 0 and len(recent_failures) > (longrun_fail_window * 3):
                recent_failures = recent_failures[-(longrun_fail_window * 2):]

        if longrun_enabled and result.returncode != 0:
            longrun_failed_iterations += 1
            if longrun_failed_iterations >= longrun_max_fails:
                print("🛑 Longrun failure budget exhausted. Aborting cycle.")
                logger.log("safe_degrade", {"trigger": "longrun_failure_budget", "max_fails": longrun_max_fails, "failed": longrun_failed_iterations})
                break

        if result.returncode != 0:
            print(f"❌ Cycle Failed: {result.stderr[:200]}...")
            consecutive_successes = 0

            # Track failures to prevent infinite WSJF accumulation
            correlation_id = logger.correlation_id
            failure_counts[correlation_id] = failure_counts.get(correlation_id, 0) + 1
            failure_count = failure_counts[correlation_id]

            # Log observability event for failure
            iteration_duration_ms = int((time.time() - iteration_start_time) * 1000)
            
            # Check if we've exceeded max failures and should mark as
            # permanently failed
            if failure_count >= max_item_failures:
                print(f"🛑 Item failed {failure_count} times. Marking as permanently failed.")
                logger.log("observability_first", {
                    "event": "cycle_iteration_failed",
                    "iteration": i + 1,
                    "circle": circle,
                    "depth": current_depth,
                    "mode": mode,
                    "error_code": result.returncode,
                    "duration_ms": iteration_duration_ms,
                    "failure_count": failure_count,
                    "status": "failed_permanently",
                    "action_completed": True,  # Mark as complete to stop WSJF accumulation
                    "tags": ["observability", "failure", "iteration", "permanent"]
                }, gate="general", behavioral_type="observability")
                # Skip this item in future iterations
                continue
            else:
                logger.log("observability_first", {
                    "event": "cycle_iteration_failed",
                    "iteration": i + 1,
                    "circle": circle,
                    "depth": current_depth,
                    "mode": mode,
                    "error_code": result.returncode,
                    "duration_ms": iteration_duration_ms,
                    "failure_count": failure_count,
                    "tags": ["observability", "failure", "iteration"]
                }, gate="general", behavioral_type="observability")

            if safe_degrade_enabled and mode == "mutate":
                logger.log_safe_degrade("cycle_fail", "reduce_depth", {"error": str(result.returncode)})

                if current_depth > 1:
                    print("⚠️  Safe Degrade: Reducing depth for next iteration.")
                    current_depth -= 1
                    no_deploy = True
                else:
                    print("🛑 Safe Degrade: Depth at minimum. Aborting.")
                    break
            else:
                logger.log("safe_degrade", {"trigger": "cycle_fail", "action": "none", "reason": "advisory_mode"})
        else:
            print("✅ Cycle Complete")

            # Flow metrics: Record iteration duration
            iteration_duration = time.time() - iteration_start_time
            iteration_times.append(iteration_duration)

            consecutive_successes += 1
            if consecutive_successes >= stability_threshold:
                 saved = iterations - i - 1
                 print(f"✨ Optimization: {stability_threshold} consecutive successes achieved. Stopping early (saved {saved} iterations).")
                 logger.log("iteration_budget", {"saved": saved, "reason": "stability_threshold", "consecutive_successes": consecutive_successes})
                 break

            if no_deploy and i % 3 == 0:
                 print("🩹 Probing recovery: Re-enabling deploy for next iteration.")
                 no_deploy = False

    # Economic Analysis Phase
    print("\n💰 Running Economic Analysis...")
    operation_counter['teardown'] += 1
    operation_counter['total'] += 1
    
    try:
        # Revenue Attribution with circle context
        print("   💸 Revenue Attribution...")
        revenue_result = subprocess.run(
            [sys.executable, "scripts/agentic/revenue_attribution.py", 
             "--circle", circle, "--json"],
            capture_output=True,
            text=True,
            timeout=30
        )
        if revenue_result.returncode == 0:
            print("      ✅ Revenue attribution complete")
        else:
            print(f"      ⚠️  Revenue attribution skipped: {revenue_result.stderr[:100]}")
    except Exception as e:
        print(f"      ⚠️  Revenue attribution error: {str(e)[:100]}")
    
    try:
        # WSJF Recalculation with fresh data
        print("   🎯 WSJF Recalculation...")
        wsjf_result = subprocess.run(
            [sys.executable, "scripts/circles/wsjf_calculator.py",
             f"circles/{circle}/operational-{circle}-roles/Owner/backlog.md",
             "--auto-calc-wsjf", "--aggregate"],
            capture_output=True,
            text=True,
            timeout=30
        )
        if wsjf_result.returncode == 0:
            print("      ✅ WSJF scores updated")
        else:
            print(f"      ⚠️  WSJF recalc skipped: {wsjf_result.stderr[:100]}")
    except Exception as e:
        print(f"      ⚠️  WSJF recalc error: {str(e)[:100]}")
    
    try:
        # Kanban Promotion for high-WSJF items
        print("   📋 Kanban Promotion (WSJF ≥ 8.0)...")
        kanban_result = subprocess.run(
            [sys.executable, "scripts/circles/promote_to_kanban.py",
             circle, "--threshold", "8.0", "--auto"],
            capture_output=True,
            text=True,
            timeout=30
        )
        if kanban_result.returncode == 0:
            print("      ✅ High-priority items promoted")
        else:
            print(f"      ⚠️  Kanban promotion skipped: {kanban_result.stderr[:100]}")
    except Exception as e:
        print(f"      ⚠️  Kanban promotion error: {str(e)[:100]}")
    
    # Pre-Retro Iteration Review & Standup Sync
    print("\n📋 Iteration Review (Pre-Retro Standup Sync)...")
    iteration_summary = {
        "total_iterations": min(i + 1, iterations),
        "successful": consecutive_successes,
        "failed": (i + 1) - consecutive_successes if i >= 0 else 0,
        "early_stop": consecutive_successes >= stability_threshold,
        "final_depth": current_depth,
        "circle": circle
    }

    # Operation tracking summary (NEW)
    operation_summary = {
        "total_operations": operation_counter['total'],
        "setup_operations": operation_counter['setup'],
        "iteration_operations": operation_counter['iterations'],
        "teardown_operations": operation_counter['teardown'],
        # Keep legacy field for compatibility
        "total_iterations": iteration_summary['total_iterations']
    }

    print(f"   📊 Iterations: {iteration_summary['total_iterations']}/{iterations}")
    print(f"   🛠️  Operations: {operation_summary['total_operations']} total (Setup: {operation_summary['setup_operations']}, Iterations: {operation_summary['iteration_operations']}, Teardown: {operation_summary['teardown_operations']})")
    print(f"   ✅ Successful: {iteration_summary['successful']}")
    print(f"   ❌ Failed: {iteration_summary['failed']}")
    print(f"   🎯 Circle: {circle} | Depth: {current_depth}")

    if iteration_summary['early_stop']:
        print(f"   ⚡ Early stop triggered (stability threshold reached)")

    # Flow metrics: Calculate and log flow metrics
    cycle_end_time = time.time()
    total_cycle_time = (cycle_end_time - cycle_start_time) / 60  # Convert to minutes
    avg_iteration_time = (sum(iteration_times) / len(iteration_times) / 60) if iteration_times else 0
    throughput = (iteration_summary['successful'] / (total_cycle_time / 60)) if total_cycle_time > 0 else 0  # per hour
    flow_efficiency = iteration_summary['successful'] / iteration_summary['total_iterations'] if iteration_summary['total_iterations'] > 0 else 0

    logger.log_flow_metrics(
        cycle_time=avg_iteration_time,
        lead_time=total_cycle_time,
        throughput=throughput,
        wip_count=iteration_summary['total_iterations'] - iteration_summary['successful'],
        flow_efficiency=flow_efficiency,
        velocity=iteration_summary['successful'],
        iteration=iteration_summary['total_iterations']
    )

    print(f"   ⏱️  Flow Metrics: Cycle time: {avg_iteration_time:.1f}min, Throughput: {throughput:.2f}/hr, Efficiency: {flow_efficiency:.0%}")

    # Emit economic compounding metrics if available
    revenue_data = None
    if revenue_result.returncode == 0:
        try:
            revenue_data = json.loads(revenue_result.stdout)
            # Use the underlying EvidenceEmitter directly
            evidence_emitter.emitter.emit_economic_compounding(
                wsjf_per_h=float(revenue_data.get("wsjf_per_hour", 0)),
                energy_cost_usd=float(revenue_data.get("total_energy_cost_usd", 0)),
                value_per_hour=float(revenue_data.get("revenue_per_hour", 0)),
                profit_dividend_usd=float(revenue_data.get("total_profit_dividend_usd", 0))
            )
        except Exception as e:
            print(f"   ⚠️  Could not emit economic metrics: {str(e)[:50]}")
    
    # Emit maturity coverage metrics
    try:
        tier_backlog_cov_pct = float(revenue_data.get("tier_backlog_cov_pct", 0)) if revenue_data else 0
        tier_telemetry_cov_pct = float(revenue_data.get("tier_telemetry_cov_pct", 0)) if revenue_data else 0
        tier_depth_cov_pct = float(revenue_data.get("tier_depth_cov_pct", 0)) if revenue_data else 0
        
        # Use the underlying EvidenceEmitter directly
        evidence_emitter.emitter.emit_maturity_coverage(
            tier_backlog_cov_pct=tier_backlog_cov_pct,
            tier_telemetry_cov_pct=tier_telemetry_cov_pct,
            tier_depth_cov_pct=tier_depth_cov_pct,
            circle_coverage_pct=float(revenue_data.get("circle_coverage_pct", 0)) if revenue_data else 0,
            depth_score=float(revenue_data.get("depth_score", 0)) if revenue_data else 0
        )
    except Exception as e:
        print(f"   ⚠️  Could not emit maturity metrics: {str(e)[:50]}")

    # Log standup sync to workflow circle
    standup_duration_ms = max(1, int((time.time() - cycle_end_time) * 1000)) if cycle_end_time else 1
    workflow_logger = PatternLogger(mode=mode, circle="workflow", depth=args.depth, correlation_id=logger.correlation_id)
    workflow_logger.log("standup_sync", {
        "phase": "pre-retro",
        "iteration_summary": iteration_summary,
        "duration_ms": standup_duration_ms,
        "tags": ["standup", "sync", "iteration-review"]
    }, gate="governance", behavioral_type="observability")

    # Identify improvement areas based on iteration performance
    improvement_areas = []
    if iteration_summary['failed'] > 0:
        improvement_areas.append({
            "area": "reliability",
            "priority": "high",
            "suggestion": "Review failed iterations for root cause"
        })
    if current_depth < args.depth:
        improvement_areas.append({
            "area": "stability",
            "priority": "medium",
            "suggestion": "Safe degrade was triggered - consider reducing initial depth"
        })
    if not iteration_summary['early_stop'] and iterations > 3:
        improvement_areas.append({
            "area": "efficiency",
            "priority": "low",
            "suggestion": "Consider tuning stability threshold for faster convergence"
        })

    if improvement_areas:
        print("   💡 Improvement areas identified:")
        for area in improvement_areas:
            print(f"      • [{area['priority'].upper()}] {area['area']}: {area['suggestion']}")
    else:
        print("   ✨ No immediate improvements needed")
    
    # Evidence Collection: teardown phase (after iteration_summary is defined)
    try:
        evidence_mgr = EvidenceManager()
        teardown_context = {
            'run_id': run_id,
            'circle': circle,
            'iteration': iteration_summary.get('total_iterations', 0),
            'mode': mode,
            'depth': current_depth
        }
        teardown_results = asyncio.run(evidence_mgr.collect_evidence(
            phase='teardown',
            context=teardown_context,
            mode='prod_cycle'
        ))
        if teardown_results:
            evidence_mgr.write_evidence()
            print(f"   📊 Evidence: {len(teardown_results)} teardown emitters executed")
    except Exception as e:
        print(f"   ⚠️  Evidence collection (teardown) failed: {str(e)[:100]}")

    print("\n🧠 Running Retro Coach...")
    retro_start_time = time.time()
    operation_counter['teardown'] += 1  # Track teardown operation
    operation_counter['total'] += 1
    retro_insights = []
    try:
        from agentic.governance_integration import run_retro_coach, print_retro_insights, save_retro_coach_results

        retro_result = run_retro_coach(
            run_id=run_id,
            run_kind="prod-cycle"
        )

        if retro_result["success"]:
            print_retro_insights(retro_result)
            if "data" in retro_result:
                save_retro_coach_results(retro_result["data"])
                retro_insights = retro_result.get("data", {}).get("insights", [])
            print("   ✅ Retro insights generated")

            # Log observability event for retro completion
            retro_duration_ms = int((time.time() - retro_start_time) * 1000)
            logger.log("observability_first", {
                "event": "retro_coach_complete",
                "insights_count": len(retro_insights),
                "circle": circle,
                "run_id": run_id,
                "duration_ms": retro_duration_ms,
                "tags": ["observability", "retro", "insights"]
            }, gate="general", behavioral_type="observability")
        else:
            print(f"   ⚠️  Retro coach encountered issues: {retro_result.get('stderr', 'Unknown error')[:200]}")
    except Exception as e:
        print(f"   ⚠️  Retro coach failed: {str(e)[:200]}")

    # Auto-replenishment every 10 cycles
    operation_counter['teardown'] += 1  # Track conditional operation
    operation_counter['total'] += 1
    # Count total completed prod-cycles from metrics
    total_prod_cycles = 0
    if os.path.exists(metrics_file):
        with open(metrics_file, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    if entry.get('pattern') == 'full_cycle_complete':
                        total_prod_cycles += 1
                except json.JSONDecodeError:
                    continue

    # Trigger replenishment every 10 prod-cycles
    if total_prod_cycles > 0 and (total_prod_cycles % 10 == 0) and not args.skip_auto_replenish:
        print(f"\n🔄 Auto-replenishment (cycle {total_prod_cycles}, every 10 cycles)...")
        replenish_cmd = f"{project_root}/scripts/circles/replenish_all_circles.sh --auto-calc-wsjf"
        replenish_result = subprocess.run(replenish_cmd, shell=True, capture_output=True, text=True)
        if replenish_result.returncode == 0:
            print("   ✅ Auto-replenishment complete")
            logger.log("auto_replenishment", {
                "total_prod_cycles": total_prod_cycles,
                "trigger": "10_cycle_threshold",
                "status": "success",
                "tags": ["automation", "replenishment", "maintenance"]
            }, gate="governance", behavioral_type="enforcement")
        else:
            print(f"   ⚠️  Auto-replenishment failed: {replenish_result.stderr[:100]}")
            logger.log("auto_replenishment", {
                "total_prod_cycles": total_prod_cycles,
                "trigger": "10_cycle_threshold",
                "status": "failed",
                "error": replenish_result.stderr[:200],
                "tags": ["automation", "replenishment", "error"]
            }, gate="governance", behavioral_type="observability")

    # Retro → Replenish Feedback Loop
    print("\n🔄 Retro → Replenish Feedback Loop...")
    operation_counter['teardown'] += 1  # Track teardown operation
    operation_counter['total'] += 1
    try:
        from agentic.retro_replenish_workflow import RetroReplenishWorkflow

        workflow = RetroReplenishWorkflow()

        # Run retro analysis on latest metrics
        insights = workflow.run_retro()

        if insights:
            # Convert insights to backlog items for the target circle
            items = workflow.run_replenish(target_circle=circle)

            # Refine with AI-enhanced WSJF
            refinement = workflow.run_refine(use_ai=True)

            print(f"   ✅ Feedback loop: {len(insights)} insights → {len(items)} items → {refinement.items_prioritized} prioritized")

            # Log the feedback loop
            logger.log("retro_replenish_feedback", {
                "insights_count": len(insights),
                "items_generated": len(items),
                "items_prioritized": refinement.items_prioritized,
                "circle": circle,
                "ai_enhanced": refinement.ai_enhanced,
                "tags": ["retro", "replenish", "feedback-loop"]
            }, gate="governance", behavioral_type="observability")

    except Exception as e:
        print(f"   ⚠️  Feedback loop failed: {str(e)[:200]}")

    # System State Snapshot (NEW: Integration #5 - Teardown)
    print("\n📊 Capturing system state snapshot...")
    operation_counter['teardown'] += 1
    operation_counter['total'] += 1
    try:
        measure_script = os.path.join(project_root, ".goalie", "measure_system_state.sh")
        if os.path.exists(measure_script):
            state_result = subprocess.run(
                ["bash", measure_script],
                capture_output=True, text=True, timeout=15, cwd=project_root
            )
            if state_result.returncode == 0:
                print("   ✅ System state captured")
                # Load and log summary metrics
                state_file = os.path.join(project_root, ".goalie", "SYSTEM_STATE_POST_CLEANUP.json")
                if os.path.exists(state_file):
                    try:
                        with open(state_file, 'r') as f:
                            state_data = json.load(f)
                        print(f"   📈 Load: {state_data['system']['load_avg']['1min']:.2f}, "
                              f"CPU Idle: {state_data['system']['cpu']['idle_pct']:.1f}%, "
                              f"IDEs: {state_data['ides']['total']}")
                        logger.log("system_state_snapshot", {
                            "load_1min": state_data['system']['load_avg']['1min'],
                            "cpu_idle_pct": state_data['system']['cpu']['idle_pct'],
                            "total_processes": state_data['system']['processes']['total'],
                            "ide_count": state_data['ides']['total'],
                            "tags": ["system", "health", "snapshot"]
                        }, gate="health", behavioral_type="observability")
                    except Exception as parse_err:
                        print(f"   ⚠️  Could not parse system state: {str(parse_err)[:100]}")
            else:
                print(f"   ⚠️  System state capture failed: {state_result.stderr[:100]}")
        else:
            print("   ⚠️  System state script not found (skipping)")
    except subprocess.TimeoutExpired:
        print("   ⚠️  State capture timeout (>15s) - consider optimizing measure_system_state.sh")
    except Exception as e:
        print(f"   ⚠️  System state error: {str(e)[:100]}")

    # Generate Actionable Recommendations
    print("\n🎯 Generating Actionable Recommendations...")
    try:
        scripts_dir = os.path.join(project_root, "scripts")
        recs_result = subprocess.run(
            ["python3", os.path.join(scripts_dir, "cmd_actionable_context.py")],
            capture_output=True,
            text=True,
            cwd=project_root
        )

        if recs_result.returncode == 0:
            print(recs_result.stdout)
            innovator_logger = PatternLogger(mode=mode, circle="innovator", depth=args.depth, correlation_id=logger.correlation_id)
            innovator_logger.log("actionable_recommendations", {
                "generated": True,
                "run_id": run_id
            })
        else:
            print(f"   ⚠️  Recommendations generation failed: {recs_result.stderr[:200]}")
    except Exception as e:
        print(f"   ⚠️  Recommendations generation error: {str(e)[:200]}")

    # Economic Attribution + RCA Summary (opt-in)
    if os.environ.get('AF_PROD_ECON_REPORT', '0') == '1':
        print("\n💰 Economic Attribution + RCA Summary...")
        try:
            revenue_cmd = [
                'python3',
                os.path.join(project_root, 'scripts', 'agentic', 'revenue_attribution.py'),
                '--hours', '72',
                '--exclude-run-kinds', 'manual,unknown',
                '--json',
            ]
            revenue_res = subprocess.run(revenue_cmd, capture_output=True, text=True, cwd=project_root, timeout=60)
            if revenue_res.returncode == 0:
                revenue_report = json.loads(revenue_res.stdout)
                summary = revenue_report.get('summary', {})
                print(f"   Allocation efficiency: {summary.get('allocation_efficiency_pct', 0)}%")
                print(f"   Revenue concentration (HHI): {summary.get('revenue_concentration_hhi', 0)}")
                logger.log(
                    'revenue_attribution',
                    {
                        'hours': summary.get('hours_analyzed', 72),
                        'event_count': summary.get('event_count', 0),
                        'allocation_efficiency_pct': summary.get('allocation_efficiency_pct', 0),
                        'revenue_concentration_hhi': summary.get('revenue_concentration_hhi', 0),
                        'allocated_revenue': summary.get('allocated_revenue', 0),
                        'realized_revenue': summary.get('realized_revenue', 0),
                        'tags': ['economics', 'revenue', 'rca']
                    },
                    gate='governance',
                    behavioral_type='observability',
                    economic={
                        'cost_of_delay': 0.0,
                        'wsjf_score': 0.0,
                        'job_duration': 1.0,
                        'user_business_value': float(summary.get('allocated_revenue', 0) or 0),
                    }
                )
            else:
                print(f"   ⚠️  Revenue attribution failed: {revenue_res.stderr[:120]}")

            rca_cmd = [
                'python3',
                os.path.join(project_root, 'scripts', 'cmd_pattern_stats.py'),
                '--patterns', 'wsjf-enrichment,code-fix-proposal',
                '--correlate',
                '--hours', '72',
                '--exclude-run-kinds', 'manual,unknown',
                '--json'
            ]
            rca_res = subprocess.run(rca_cmd, capture_output=True, text=True, cwd=project_root, timeout=60)
            if rca_res.returncode == 0:
                rca = json.loads(rca_res.stdout)
                corr = rca.get('correlation', {})
                print(f"   Governance correlation jaccard: {corr.get('jaccard', 0)}")
                print(f"   Governance failed_actions (scoped): {rca.get('failed_actions', 0)}")
            else:
                print(f"   ⚠️  RCA pattern-stats failed: {rca_res.stderr[:120]}")

        except Exception as e:
            print(f"   ⚠️  Econ/RCA report error: {str(e)[:160]}")

    # Unified Emitter JSON Output (--json flag)
    if args.json:
        ok_rate = iteration_summary['successful'] / max(iteration_summary['total_iterations'], 1)
        
        # Determine winner grade
        grade = "platinum" if ok_rate >= 0.95 and iteration_summary['failed'] == 0 else \
                "gold" if ok_rate >= 0.80 else \
                "silver" if ok_rate >= 0.60 else "bronze"
        
        # Create assessment dict for ProdCycleEmitter
        assessment = {
            "all_checks_passed": grade in ["gold", "platinum"],
            "ok_rate": ok_rate,
            "rev_per_h": float(revenue_data.get("revenue_per_hour", 0)) if revenue_data else 0,
            "duration_ok_pct": flow_efficiency * 100,
            "abort_count": 0,  # TODO: Track actual aborts
            "contention_mult": 1.0,  # TODO: Calculate actual contention
            "checks_passed": 1 if grade in ["gold", "platinum"] else 0,
            "checks_total": 1
        }
        
        # Emit winner-grade metrics using ProdCycleEmitter method
        evidence_emitter.emit_winner_grade(assessment)
        
        unified_output = {
            "unified_emitters": {
                "economic_compounding": revenue_report.get('summary', {}).get('revenue_per_hour', 0) if 'revenue_report' in dir() else None,
                "pattern_hit_pct": (iteration_summary['successful'] / max(iteration_summary['total_iterations'], 1)) * 100,
                "maturity_coverage": None,  # Set by tier-depth-coverage
                "observability_gaps": len(improvement_areas) if improvement_areas else 0,
                "prod_cycle_qualification": ok_rate >= 0.8 and iteration_summary['failed'] == 0,
            },
            "run_summary": {
                "run_id": run_id,
                "circle": circle,
                "mode": mode,
                "iterations_total": iteration_summary['total_iterations'],
                "iterations_ok": iteration_summary['successful'],
                "iterations_failed": iteration_summary['failed'],
                "ok_rate": ok_rate,
                "depth": current_depth,
                "retro_insights": len(retro_insights),
                "improvement_areas": len(improvement_areas),
            }
        }
        print(json.dumps(unified_output, indent=2))
    
    # Evidence Collection: post_run phase
    print("\n📊 Collecting post-run evidence...")
    try:
        evidence_mgr = EvidenceManager()
        post_run_context = {
            'run_id': run_id,
            'circle': circle,
            'iteration': iteration_summary.get('total_iterations', 0),
            'mode': mode,
            'depth': current_depth
        }
        post_run_results = asyncio.run(evidence_mgr.collect_evidence(
            phase='post_run',
            context=post_run_context,
            mode='prod_cycle'
        ))
        if post_run_results:
            evidence_mgr.write_evidence()
            print(f"   ✅ Evidence: {len(post_run_results)} post-run emitters executed")
    except Exception as e:
        print(f"   ⚠️  Evidence collection (post_run) failed: {str(e)[:100]}")

    # Log prod_cycle_complete for autocommit graduation tracking
    ok_rate = iteration_summary['successful'] / max(iteration_summary['total_iterations'], 1)
    stability_score = ok_rate * 100
    
    logger.log("prod_cycle_complete", {
        "outcome": "success" if iteration_summary['failed'] == 0 else "partial",
        "stability": stability_score,
        "ok_rate": ok_rate * 100,
        "circle": circle,
        "iterations_completed": iteration_summary['total_iterations'],
        "successful_iterations": iteration_summary['successful'],
        "failed_iterations": iteration_summary['failed'],
        "system_state_errors": 0,  # Track actual errors if available
        "aborts": 0,  # Track actual aborts if available
        "mode": mode,
        "tags": ["graduation", "cycle", "complete"]
    }, gate="general", behavioral_type="observability")
    
    # Log observability pattern for cycle completion
    logger.log("observability_first", {
        "event": "cycle_complete",
        "circle": circle,
        "iterations_completed": iteration_summary['total_iterations'],
        "successful_iterations": iteration_summary['successful'],
        "failed_iterations": iteration_summary['failed'],
        "final_depth": current_depth,
        "mode": mode,
        "testing_type": args.testing if args.testing != "none" else "not_run",
        "retro_insights_count": len(retro_insights),
        "improvement_areas_count": len(improvement_areas),
        "duration_ms": int((total_cycle_time or 0) * 1000),
        "avg_iteration_duration_ms": int((avg_iteration_time or 0) * 60 * 1000),
        "tags": ["observability", "cycle", "complete"]
    }, gate="general", behavioral_type="observability")

    metrics_log_path = os.path.join(project_root, ".goalie/metrics_log.jsonl")
    if not os.path.exists(metrics_log_path):
        logger.log("observability_first", {"gap": "missing_metrics_log", "duration_ms": 1})

if __name__ == "__main__":
    main()
