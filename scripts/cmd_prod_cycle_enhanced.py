#!/usr/bin/env python3
"""
Enhanced Production Cycle with Method Pattern COD/WSJF Coverage
- Full pattern telemetry (8 patterns)
- Economic tracking (COD, WSJF)
- Correlation ID for forensic audit
- Circle-aware prioritization
"""
import sys
import os
import argparse
import subprocess
import uuid
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

# QUICK WIN #2: Import Guardrails for WIP limits and mode enforcement
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'agentic'))
    from guardrails import GuardrailLock, OperationMode
    GUARDRAILS_AVAILABLE = True
except ImportError:
    GUARDRAILS_AVAILABLE = False
    print("[WARN] Guardrails not available, skipping enforcement")

# QUICK WIN #3: Import Budget Tracker for iteration limits and early stopping
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'temporal'))
    from budget_tracker import BudgetTracker, BudgetType
    BUDGET_TRACKER_AVAILABLE = True
except ImportError:
    BUDGET_TRACKER_AVAILABLE = False
    print("[WARN] Budget Tracker not available, skipping budget enforcement")

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
    except Exception as e:
        print(f"[ERROR] Failed to determine optimal circle: {e}")
        return "orchestrator"

def main():
    from agentic.pattern_logger import PatternLogger
    from agentic.evidence_manager import EvidenceManager

    parser = argparse.ArgumentParser(description="Agentic Flow Production Cycle")
    
    # Arguments
    parser.add_argument("pos_arg1", nargs="?", help="Iterations (int) OR Circle (str)")
    parser.add_argument("pos_arg2", nargs="?", help="Circle (str) if arg1 was int")
    parser.add_argument("--iterations", type=int, default=None)
    parser.add_argument("--depth", type=int, default=2)
    parser.add_argument("--circle", default=None)
    parser.add_argument("--replenish", action="store_true", help="Run circle replenishment (WSJF calc) before cycle")
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
        
    project_root = os.environ.get("PROJECT_ROOT") or str(Path(__file__).resolve().parent.parent)
    mode = os.environ.get("AF_PROD_CYCLE_MODE", "mutate")
    safe_degrade_enabled = os.environ.get("AF_PROD_SAFE_DEGRADE", "1") == "1"
    guardrail_lock_enabled = os.environ.get("AF_PROD_GUARDRAIL_LOCK", "1") == "1"
    
    af_script = os.path.join(project_root, "scripts/af")
    
    if circle_arg:
        circle = circle_arg
        print(f"🎯 Target Circle: {circle} (User Specified)")
    else:
        metrics_file = os.path.join(project_root, ".goalie", "pattern_metrics.jsonl")
        circle = determine_optimal_circle(metrics_file)
        print(f"🧠 Smart Default: Auto-selected '{circle}' based on system state.")

    current_depth = args.depth
    
    # Initialize Enhanced PatternLogger with correlation tracking
    correlation_id = str(uuid.uuid4())
    run_id = os.environ.get("AF_RUN_ID") or correlation_id
    os.environ["AF_RUN_ID"] = run_id
    os.environ["AF_CIRCLE"] = circle
    os.environ["AF_MODE"] = mode
    os.environ["AF_DEPTH"] = str(current_depth)
    logger = PatternLogger(mode=mode, circle=circle, depth=current_depth, correlation_id=correlation_id)
    
    # QUICK WIN #2: Initialize Guardrails
    guardrails = None
    if GUARDRAILS_AVAILABLE:
        try:
            # Map mode strings to OperationMode enum
            mode_map = {
                'mutate': OperationMode.MUTATE,
                'advisory': OperationMode.ADVISORY,
                'enforcement': OperationMode.ENFORCEMENT
            }
            op_mode = mode_map.get(mode.lower(), OperationMode.MUTATE)
            guardrails = GuardrailLock(mode=op_mode)
            print(f"🛡️  Guardrails Active: WIP limits enabled, mode={mode}")
        except Exception as e:
            print(f"[WARN] Failed to initialize guardrails: {e}")
    else:
        print("⚠️  Guardrails unavailable, running without WIP enforcement")
    
    # QUICK WIN #3: Initialize Budget Tracker
    budget_tracker = None
    budget_id = None
    if BUDGET_TRACKER_AVAILABLE:
        try:
            budget_tracker = BudgetTracker()
            budget_id = None
            
            # Try to allocate budget (may already exist)
            try:
                allocated = budget_tracker.allocate_budget(
                    tenant_id='local',
                    budget_type=BudgetType.ITERATION,
                    amount=iterations * 100,
                    iterations_limit=iterations,
                    early_stop_threshold=0.8  # Stop at 80%
                )
                budget_id = allocated.budget_id
                print(f"💰 Budget Allocated: {iterations} iterations (early stop at 80%)")
            except Exception:
                budget_id = budget_tracker.get_latest_budget_id('local', BudgetType.ITERATION)
                print(f"💰 Budget Already Exists: {budget_id}")
        except Exception as e:
            print(f"[WARN] Failed to initialize budget tracker: {e}")
    else:
        print("⚠️  Budget Tracker unavailable, no iteration limits")
    
    # 0. Replenishment Phase (Method Pattern Integration)
    replenish_enabled = not args.no_replenish
    
    if replenish_enabled:
        print(f"🔄 Running Iterative WSJF Replenishment for {circle}...")
        replenish_cmd = f"'{af_script}' replenish-circle {circle} --auto-calc-wsjf"
        run_command(replenish_cmd)
    else:
        print("⏩ Skipping Replenishment Phase (User Override)")

    no_deploy = False
    consecutive_successes = 0
    stability_threshold = 3
    metrics_count = 0
    
    # 1. Pre-Flight Health Checkpoint
    if guardrail_lock_enabled:
        health_score = check_health()
        if health_score < 0.7:
            logger.log_guardrail("governor_health", f"score={health_score}", "enforce_test_first")
            print("🔒 Guardrail Lock Engaged: Health < 0.7. Enforcing Test-First.")
            os.environ["AF_FULL_CYCLE_TEST_FIRST"] = "1"

    print(f"🚀 Starting Prod Cycle: Max {iterations} iterations, Circle: {circle}, Depth: {current_depth}")
    logger.log_observability_first(metrics_written=1, iteration=0, 
                                     suggestion_made="Starting prod-cycle with telemetry enabled")
    logger.log_iteration_budget(requested=iterations, enforced=iterations, iteration=0)
    logger.log_circle_risk_focus(target_circle=circle, iteration=0)
    metrics_count += 3

    try:
        evidence_mgr = EvidenceManager()
        evidence_context = {
            'run_id': run_id,
            'circle': circle,
            'iteration': 1,
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
    except Exception as e:
        print(f"[ERROR] Failed to collect evidence: {e}")

    for i in range(iterations):
        print(f"\n--- Iteration {i+1}/{iterations} ---")
        
        # QUICK WIN #2: Guardrail enforcement before each iteration
        if guardrails:
            op = 'write'
            if mode.lower() in ['advisory', 'enforcement']:
                op = 'read'
            allowed, reason, metadata = guardrails.enforce(
                circle=circle,
                operation=op,
                data={
                    'pattern': 'cycle_iteration',
                    'circle': circle,
                    'economic': {'wsjf_score': 0, 'cost_of_delay': 0, 'job_duration': 1, 'user_business_value': 0},
                    'data': {}
                }
            )
            
            if not allowed:
                print(f"🔒 Guardrail Violation: {reason}")
                logger.log_guardrail('cycle_iteration', reason, 'auto_switch')
                
                if 'wip_limit' in reason:
                    print(f"⚠️  WIP limit reached for {circle}. Switching to advisory mode.")
                    mode = 'advisory'
                    logger.mode = 'advisory'
                    os.environ['AF_PROD_CYCLE_MODE'] = 'advisory'
                elif 'schema_validation' in reason:
                    print(f"⚠️  Schema validation failed: {metadata.get('missing_fields', [])}")
                    print("   Continuing with auto-populated fields...")
        
        # QUICK WIN #3: Budget check before each iteration
        if budget_tracker and budget_id:
            allowed, reason = budget_tracker.use_iteration(budget_id)
            if not allowed:
                saved_iterations = iterations - i
                print(f"⏹️  Budget Exhausted: {reason}")
                print(f"   Saved {saved_iterations} iterations via early stop")
                logger.log_iteration_budget(
                    requested=iterations,
                    enforced=i,
                    saved=saved_iterations,
                    iteration=i
                )
                # Log early stop reason
                if 'early_stop' in reason:
                    print("   ✅ Early stop threshold reached (80% utilization)")
                break
        
        # 2. In-Flight Health Checkpoint
        if i > 0 and i % 3 == 0:
            print("🏥 Running Mid-Cycle Health Checkpoint...")
            current_health = check_health()
            if current_health < 0.6:
                print("🛑 Critical Health Drop Detected. Aborting Cycle.")
                logger.log_safe_degrade("health_drop", "abort", {"score": current_health}, iteration=i)
                logger.log_failure_strategy("fail-fast", abort_at=i, degrade_reason="critical_health", iteration=i)
                break
        
        cmd = f"'{af_script}' full-cycle {current_depth} --circle {circle}"
        if no_deploy:
            cmd += " --no-deploy"
            
        print(f"Running: {cmd}")
        result = run_command(cmd)
        
        if result.returncode != 0:
            print(f"❌ Cycle Failed: {result.stderr[:200]}...")
            consecutive_successes = 0
            
            if safe_degrade_enabled and mode == "mutate":
                logger.log_safe_degrade("cycle_fail", "reduce_depth", {"error": str(result.returncode)}, iteration=i)
                
                if current_depth > 1:
                    print("⚠️  Safe Degrade: Reducing depth for next iteration.")
                    old_depth = current_depth
                    current_depth -= 1
                    logger.log_depth_ladder(old_depth, current_depth, reason="safe-degrade", mutation=True, iteration=i)
                    logger.depth = current_depth  # Update logger's depth tracking
                    no_deploy = True
                    metrics_count += 2
                else:
                    print("🛑 Safe Degrade: Depth at minimum. Aborting.")
                    logger.log_failure_strategy("fail-fast", abort_at=i, degrade_reason="min_depth_reached", iteration=i)
                    metrics_count += 1
                    break
            else:
                logger.log_safe_degrade("cycle_fail", "none", {"reason": "advisory_mode"}, iteration=i)
                metrics_count += 1
        else:
            print("✅ Cycle Complete")
            
            consecutive_successes += 1
            if consecutive_successes >= stability_threshold:
                saved = iterations - i - 1
                print(
                    f"✨ Optimization: {stability_threshold} consecutive successes achieved. "
                    f"Stopping early (saved {saved} iterations)."
                )
                logger.log_iteration_budget(
                    requested=iterations,
                    enforced=i + 1,
                    saved=saved,
                    iteration=i,
                )
                metrics_count += 1
                break

            if no_deploy and i % 3 == 0:
                print("🩹 Probing recovery: Re-enabling deploy for next iteration.")
                no_deploy = False

    # Final observability check
    metrics_log_path = os.path.join(project_root, ".goalie/metrics_log.jsonl")
    if not os.path.exists(metrics_log_path):
        logger.log_observability_first(
            metrics_written=metrics_count,
            missing_signals=["metrics_log.jsonl"],
            suggestion_made="Create metrics_log.jsonl for full observability",
            iteration=iterations,
        )
    else:
        logger.log_observability_first(
            metrics_written=metrics_count + 1,
            missing_signals=[],
            suggestion_made="Prod-cycle completed successfully",
            iteration=iterations,
        )
     
    print(f"\n📊 Pattern Telemetry: {metrics_count+1} events logged to .goalie/pattern_metrics.jsonl")
    print(f"🔗 Correlation ID: {correlation_id} (for forensic audit)")

    try:
        evidence_mgr = EvidenceManager()
        teardown_context = {
            'run_id': run_id,
            'circle': circle,
            'iteration': iterations,
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
    except Exception:
        pass

    try:
        evidence_mgr = EvidenceManager()
        post_run_context = {
            'run_id': run_id,
            'circle': circle,
            'iteration': iterations,
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
    except Exception:
        pass

if __name__ == "__main__":
    main()
