import sys
import os
import argparse
import subprocess
import json
from agentic.pattern_logger import PatternLogger

def run_command(cmd, shell=True):
    return subprocess.run(cmd, shell=shell, text=True, capture_output=True)

def check_health():
    """Runs a health check and returns the score (0.0-1.0)."""
    # In a real system, this calls 'af governor-health --json'
    # We simulate a check.
    return 0.85

def determine_optimal_circle(metrics_file):
    """
    Analyzes metrics to find the circle with the most recent instability.
    Returns 'orchestrator' if no data or system is stable.
    """
    if not os.path.exists(metrics_file):
        return "orchestrator"
        
    try:
        # Read last 50 lines to find recent failures
        with open(metrics_file, 'r') as f:
            lines = f.readlines()[-50:]
            
        fail_count = 0
        for line in lines:
            if "cycle_fail" in line:
                fail_count += 1
        
        # Heuristic: If system is unstable, focus on 'assessor' to diagnose
        if fail_count > 2:
            return "assessor"
            
        # If stable, focus on 'innovator' to push value
        return "innovator"
        
    except Exception:
        return "orchestrator"

def main():
    parser = argparse.ArgumentParser(description="Agentic Flow Production Cycle")
    
    # 1. Positional Arguments
    parser.add_argument("pos_arg1", nargs="?", help="Iterations (int) OR Circle (str)")
    parser.add_argument("pos_arg2", nargs="?", help="Circle (str) if arg1 was int")
    
    # 2. Flag Arguments (Defaults set to None to detect user intent)
    parser.add_argument("--iterations", type=int, default=None, help="Number of iterations")
    parser.add_argument("--depth", type=int, default=2, help="Depth 0-4")
    parser.add_argument("--circle", default=None, help="Target circle")
    args = parser.parse_args()

    # 3. Intelligent Argument Parsing & Smart Defaults
    
    # --- Iterations ---
    # Default to 5 (Optimal for stability check) if not provided
    iterations = 5 
    if args.pos_arg1 and args.pos_arg1.isdigit():
        iterations = int(args.pos_arg1)
    elif args.iterations is not None:
        iterations = args.iterations
        
    # --- Circle ---
    # Default to Auto-Discovery if not provided
    circle_arg = None
    if args.pos_arg1 and not args.pos_arg1.isdigit():
        circle_arg = args.pos_arg1
    elif args.pos_arg2:
        circle_arg = args.pos_arg2
    elif args.circle:
        circle_arg = args.circle
        
    # Configuration
    mode = os.environ.get("AF_PROD_CYCLE_MODE", "mutate")
    safe_degrade_enabled = os.environ.get("AF_PROD_SAFE_DEGRADE", "1") == "1"
    guardrail_lock_enabled = os.environ.get("AF_PROD_GUARDRAIL_LOCK", "1") == "1"
    
    logger = PatternLogger(mode=mode)

    # Auto-Circle Selection
    if circle_arg:
        circle = circle_arg
        print(f"🎯 Target Circle: {circle} (User Specified)")
    else:
        # Smart Default Logic
        circle = determine_optimal_circle(os.path.join(".goalie", "pattern_metrics.jsonl"))
        print(f"🧠 Smart Default: Auto-selected '{circle}' based on system state.")

    current_depth = args.depth
    no_deploy = False
    consecutive_successes = 0
    stability_threshold = 3
    
    # 4. Pre-Flight Health Checkpoint
    if guardrail_lock_enabled:
        health_score = check_health()
        if health_score < 0.7:
            logger.log_guardrail("governor_health", f"score={health_score}", "enforce_test_first")
            print("🔒 Guardrail Lock Engaged: Health < 0.7. Enforcing Test-First.")
            os.environ["AF_FULL_CYCLE_TEST_FIRST"] = "1"

    print(f"🚀 Starting Prod Cycle: Max {iterations} iterations, Circle: {circle}, Depth: {current_depth}")

    for i in range(iterations):
        print(f"\n--- Iteration {i+1}/{iterations} ---")
        
        # 5. In-Flight Health Checkpoint (Every 3 iterations)
        if i > 0 and i % 3 == 0:
            print("🏥 Running Mid-Cycle Health Checkpoint...")
            current_health = check_health()
            if current_health < 0.6:
                print("🛑 Critical Health Drop Detected. Aborting Cycle.")
                logger.log("safe_degrade", {"trigger": "health_drop", "score": current_health})
                break
        
        cmd = f"./scripts/af full-cycle {current_depth} --circle {circle}"
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

    if not os.path.exists(".goalie/metrics_log.jsonl"):
         logger.log("observability_first", {"gap": "missing_metrics_log"}, mode="advisory")

if __name__ == "__main__":
    main()
