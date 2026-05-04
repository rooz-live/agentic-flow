#!/usr/bin/env python3
"""
Physical CI/CD Telemetry Boundary (The glab Arbitrage Lock)
Enforces Sovereign Quarantine by physically executing the authenticated glab CLI
to read the actual pipeline state from the bare-metal GitLab engine.
Prevents "Completion Theater" by blocking node liquidation or Vibecast arbitrage
if the pipeline is currently broken or unauthenticated.
"""

import os
import sys
import time
import subprocess
from execute_with_lean_learning import BuildMeasureLearnCycle

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))

def verify_glab_pipeline_status() -> bool:
    """
    Physically executes `glab ci status` to ensure the repository is not in a failing state.
    Returns True if the pipeline is passing or running (safe to proceed).
    Returns False if the pipeline is failing, blocked, or glab is unauthenticated (Arbitrage Lock engaged).
    """
    learner = BuildMeasureLearnCycle("GLAB_BOUNDARY")
    start_time = time.time()
    
    print("  🛡️ [GLAB BOUNDARY] Verifying physical CI/CD pipeline state...")
    
    # 1. Check if glab is installed
    if subprocess.run(["command", "-v", "glab"], shell=True, capture_output=True).returncode != 0:
        ttfb = int((time.time() - start_time) * 1000)
        learner.log_execution("FAIL", ttfb, "glab_cli", "GLAB_NOT_INSTALLED")
        print("  ❌ [GLAB BOUNDARY] Bypassed! glab CLI is not installed on this node. Arbitrage Lock ENGAGED.")
        return False
        
    # 2. Check authentication and fetch CI status
    try:
        # We assume `rooz-live/agentic-flow` is the target repo
        result = subprocess.run(
            ["glab", "ci", "status", "--repo", "rooz-live/agentic-flow"],
            capture_output=True, text=True, timeout=10
        )
        
        ttfb = int((time.time() - start_time) * 1000)
        
        if result.returncode != 0:
            # Command failed (likely unauthenticated or network error)
            learner.log_execution("FAIL", ttfb, "glab_ci_status", "GLAB_AUTH_OR_NETWORK_ERROR")
            print(f"  ❌ [GLAB BOUNDARY] Failed to retrieve CI status. Arbitrage Lock ENGAGED.\n  {result.stderr.strip()}")
            return False
            
        output = result.stdout.lower()
        
        # Check for failing pipeline states
        if "failed" in output or "canceled" in output or "blocked" in output:
            learner.log_execution("FAIL", ttfb, "glab_ci_status", "PIPELINE_FAILED")
            print("  ❌ [GLAB BOUNDARY] Physical pipeline failure detected! Arbitrage Lock ENGAGED.")
            return False
            
        # Pipeline is either passing, running, or pending
        learner.log_execution("PASS", ttfb, "glab_ci_status", "PIPELINE_VERIFIED")
        print("  ✅ [GLAB BOUNDARY] Physical pipeline is healthy. Arbitrage Lock DISENGAGED.")
        return True
        
    except subprocess.TimeoutExpired:
        ttfb = int((time.time() - start_time) * 1000)
        learner.log_execution("FAIL", ttfb, "glab_ci_status", "GLAB_TIMEOUT")
        print("  ❌ [GLAB BOUNDARY] glab CLI timed out. Arbitrage Lock ENGAGED.")
        return False
    except Exception as e:
        ttfb = int((time.time() - start_time) * 1000)
        learner.log_execution("FAIL", ttfb, "glab_ci_status", f"GLAB_EXCEPTION_{str(e)[:20]}")
        print(f"  ❌ [GLAB BOUNDARY] Unexpected error: {e}. Arbitrage Lock ENGAGED.")
        return False

if __name__ == "__main__":
    is_safe = verify_glab_pipeline_status()
    if not is_safe:
        sys.exit(1)
    sys.exit(0)
