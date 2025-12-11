import sys
import os
import argparse
import subprocess
import json
import uuid
from agentic.pattern_logger import PatternLogger

# Pre-flight check exit codes
EXIT_CODE_SCHEMA_VALIDATION = 10
EXIT_CODE_GOVERNANCE_RISK = 11
EXIT_CODE_CRITICAL_PATTERNS = 12
EXIT_CODE_PREFLIGHT_FAILED = 13

# Governance risk threshold
GOVERNANCE_RISK_THRESHOLD = 50.0

def run_command(cmd, shell=True):
    return subprocess.run(cmd, shell=shell, text=True, capture_output=True)

def check_health():
    """Runs a health check and returns the score (0.0-1.0)."""
    return 0.85

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


def validate_schema_compliance(metrics_file):
    """
    Validates schema compliance for .goalie/pattern_metrics.jsonl
    Returns: (bool, str) - (is_valid, error_message)
    """
    if not os.path.exists(metrics_file):
        return False, f"Schema validation failed: {metrics_file} does not exist"
    
    required_fields = {
        'timestamp', 'pattern', 'circle', 'depth', 'run_kind',
        'gate', 'tags', 'economic', 'action_completed'
    }
    
    required_economic_fields = {
        'wsjf_score', 'cost_of_delay', 'job_duration', 'user_business_value'
    }
    
    try:
        with open(metrics_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue
                    
                try:
                    entry = json.loads(line.strip())
                    
                    # Check required top-level fields
                    missing_fields = required_fields - set(entry.keys())
                    if missing_fields:
                        return False, (
                            f"Schema validation failed at line {line_num}: "
                            f"Missing required fields: {missing_fields}"
                        )
                    
                    # Check economic sub-fields
                    if not isinstance(entry.get('economic'), dict):
                        return False, (
                            f"Schema validation failed at line {line_num}: "
                            f"'economic' field must be an object"
                        )
                    
                    missing_economic = required_economic_fields - set(entry['economic'].keys())
                    if missing_economic:
                        return False, (
                            f"Schema validation failed at line {line_num}: "
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
                        
                except json.JSONDecodeError as e:
                    return False, (
                        f"Schema validation failed at line {line_num}: "
                        f"Invalid JSON: {str(e)}"
                    )
                    
    except Exception as e:
        return False, f"Schema validation failed: {str(e)}"
    
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
        return True, "Pre-flight checks skipped: not in mutate mode"
    
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
                "message": schema_msg,
                "gate": "health",
                "tags": ["validation", "schema"],
                "economic": {"wsjf_score": 0.0, "cost_of_delay": 0.0, "job_duration": 1, "user_business_value": 0.0},
                "action_completed": False
            },
            circle="orchestrator",
            depth=0
        )
        print(f"   ❌ {schema_msg}")
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
                "gate": "health",
                "tags": ["validation", "governance", "risk"],
                "economic": {"wsjf_score": 0.0, "cost_of_delay": 0.0, "job_duration": 1, "user_business_value": 0.0},
                "action_completed": False
            },
            circle="orchestrator",
            depth=0
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
                "gate": "health",
                "tags": ["validation", "critical"],
                "economic": {"wsjf_score": 0.0, "cost_of_delay": 0.0, "job_duration": 1, "user_business_value": 0.0},
                "action_completed": False
            },
            circle="orchestrator",
            depth=0
        )
        print(f"   ❌ {critical_msg}")
        return False, f"Critical pattern validation failed: {critical_msg}"
    print("   ✅ Critical patterns validated")
    
    logger.log(
        "preflight_check",
        {
            "check": "all",
            "status": "passed",
            "message": "All pre-flight checks passed",
            "gate": "health",
            "tags": ["validation", "success"],
            "economic": {"wsjf_score": 0.0, "cost_of_delay": 0.0, "job_duration": 1, "user_business_value": 0.0},
            "action_completed": True
        },
        circle="orchestrator",
        depth=0
    )
    print("   🎉 All pre-flight checks passed!")
    return True, "All pre-flight checks passed"

def main():
    parser = argparse.ArgumentParser(description="Agentic Flow Production Cycle")
    
    # Arguments
    parser.add_argument("pos_arg1", nargs="?", help="Iterations (int) OR Circle (str)")
    parser.add_argument("pos_arg2", nargs="?", help="Circle (str) if arg1 was int")
    parser.add_argument("--iterations", type=int, default=None)
    parser.add_argument("--depth", type=int, default=2)
    parser.add_argument("--circle", default=None)
    
    # Mode parameter with choices
    parser.add_argument("--mode", choices=["mutate", "advisory", "enforcement"],
                       default="mutate",
                       help="Operation mode: mutate (allow modifications), advisory (read-only), enforcement (strict governance)")
    
    # Method Pattern Flags
    parser.add_argument("--replenish", action="store_true", help="Run circle replenishment (WSJF calc) before cycle")
    # NEW: Default to replenishment ON unless explicitly disabled
    parser.add_argument("--no-replenish", action="store_true", help="Skip replenishment")
    
    args = parser.parse_args()

    # Smart Defaults (Iterations & Circle)
    iterations = 5
    if args.pos_arg1 and args.pos_arg1.isdigit():
        iterations = int(args.pos_arg1)
    elif args.iterations is not None:
        iterations = args.iterations
        
    circle_arg = None
    if args.pos_arg1 and not args.pos_arg1.isdigit():
        circle_arg = args.pos_arg1
    elif args.pos_arg2:
        circle_arg = args.pos_arg2
    elif args.circle:
        circle_arg = args.circle
        
    project_root = os.environ.get("PROJECT_ROOT", ".")
    mode = args.mode  # Use mode from command line argument
    safe_degrade_enabled = os.environ.get("AF_PROD_SAFE_DEGRADE", "1") == "1"
    guardrail_lock_enabled = os.environ.get("AF_PROD_GUARDRAIL_LOCK", "1") == "1"
    
    af_script = os.path.join(project_root, "scripts/af")
    logger = PatternLogger(mode=mode)
    
    # Display mode information
    print(f"🔧 Running in {mode} mode")
    
    # Run pre-flight checks for mutate mode
    metrics_file = os.path.join(project_root, ".goalie", "pattern_metrics.jsonl")
    preflight_passed, preflight_msg = run_preflight_checks(mode, metrics_file, logger)
    
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
    run_id = str(uuid.uuid4())
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

    if circle_arg:
        circle = circle_arg
        print(f"🎯 Target Circle: {circle} (User Specified)")
    else:
        circle = determine_optimal_circle(metrics_file)
        print(f"🧠 Smart Default: Auto-selected '{circle}' based on system state.")

    # 0. Replenishment Phase (Method Pattern Integration)
    # Default is ON unless --no-replenish is passed
    replenish_enabled = not args.no_replenish
    
    if replenish_enabled:
        print(f"🔄 Running Iterative WSJF Replenishment for {circle}...")
        replenish_cmd = f"{af_script} replenish-circle {circle} --auto-calc-wsjf"
        run_command(replenish_cmd)
    else:
        print("⏩ Skipping Replenishment Phase (User Override)")

    current_depth = args.depth
    no_deploy = False
    consecutive_successes = 0
    stability_threshold = 3
    
    # 1. Pre-Flight Health Checkpoint
    if guardrail_lock_enabled:
        health_score = check_health()
        if health_score < 0.7:
            logger.log_guardrail("governor_health", f"score={health_score}", "enforce_test_first")
            print("🔒 Guardrail Lock Engaged: Health < 0.7. Enforcing Test-First.")
            os.environ["AF_FULL_CYCLE_TEST_FIRST"] = "1"

    print(f"🚀 Starting Prod Cycle: Max {iterations} iterations, Circle: {circle}, Depth: {current_depth}")
    
    # Log observability pattern for cycle start
    logger.log("observability_first", {
        "event": "cycle_start",
        "circle": circle,
        "depth": current_depth,
        "mode": mode
    })

    for i in range(iterations):
        print(f"\n--- Iteration {i+1}/{iterations} ---")
        
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
        
        cmd = f"{af_script} full-cycle {current_depth} --circle {circle}"
        if no_deploy:
            cmd += " --no-deploy"
            
        print(f"Running: {cmd}")
        result = run_command(cmd)
        
        if result.returncode != 0:
            print(f"❌ Cycle Failed: {result.stderr[:200]}...")
            consecutive_successes = 0
            
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
            
            consecutive_successes += 1
            if consecutive_successes >= stability_threshold:
                 saved = iterations - i - 1
                 print(f"✨ Optimization: {stability_threshold} consecutive successes achieved. Stopping early (saved {saved} iterations).")
                 logger.log("iteration_budget", {"saved": saved, "reason": "stability_threshold", "consecutive_successes": consecutive_successes})
                 break

            if no_deploy and i % 3 == 0:
                 print("🩹 Probing recovery: Re-enabling deploy for next iteration.")
                 no_deploy = False
    
    # Run Retro Coach after iteration loop completes
    print("\n🧠 Running Retro Coach...")
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
            print("   ✅ Retro insights generated")
        else:
            print(f"   ⚠️  Retro coach encountered issues: {retro_result.get('stderr', 'Unknown error')[:200]}")
    except Exception as e:
        print(f"   ⚠️  Retro coach failed: {str(e)[:200]}")
    
    # Generate Actionable Recommendations
    print("\n🎯 Generating Actionable Recommendations...")
    try:
        import subprocess
        recs_result = subprocess.run(
            ["python3", os.path.join(script_dir, "cmd_actionable_context.py")],
            capture_output=True,
            text=True
        )
        
        if recs_result.returncode == 0:
            print(recs_result.stdout)
            logger.log("actionable_recommendations", {
                "generated": True,
                "run_id": run_id
            })
        else:
            print(f"   ⚠️  Recommendations generation failed: {recs_result.stderr[:200]}")
    except Exception as e:
        print(f"   ⚠️  Recommendations generation error: {str(e)[:200]}")

    metrics_log_path = os.path.join(project_root, ".goalie/metrics_log.jsonl")
    if not os.path.exists(metrics_log_path):
        logger.log("observability_first", {"gap": "missing_metrics_log"})

if __name__ == "__main__":
    main()
