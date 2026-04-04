#!/usr/bin/env python3
"""
AF Production Cycle Command
Integrates with existing cmd_prod_cycle.py and provides WSJF integration
"""

import sys
import os
import argparse
import subprocess
import json
import uuid
import time
from pathlib import Path
from typing import Dict, Any, Optional

# Add investing/agentic-flow/scripts directory to Python path
script_dir = Path(__file__).parent
investing_scripts_dir = script_dir.parent.parent / "investing" / "agentic-flow" / "scripts"
sys.path.insert(0, str(investing_scripts_dir))

# Try to import existing prod cycle module
try:
    from cmd_prod_cycle import (
        preflight_schema_validation,
        detect_goalie_gaps,
        run_guardrail_check,
        fetch_circle_backlog,
        determine_optimal_circle,
        log_iris_metric
    )
    EXISTING_PROD_CYCLE_AVAILABLE = False
except ImportError:
    EXISTING_PROD_CYCLE_AVAILABLE = False

# Try to import pattern logger
try:
    from agentic.pattern_logger import PatternLogger
    PATTERN_LOGGER_AVAILABLE = True
except ImportError:
    PATTERN_LOGGER_AVAILABLE = False


def get_project_root() -> Path:
    """Get the project root directory"""
    return Path(os.environ.get("PROJECT_ROOT", Path.cwd()))


def ensure_goalie_dirs(project_root: Path):
    """Ensure .goalie directory structure exists"""
    goalie_dir = project_root / ".goalie"
    goalie_dir.mkdir(exist_ok=True)
    (goalie_dir / "hooks").mkdir(exist_ok=True)
    return goalie_dir


def setup_pattern_logger(project_root: Path) -> Optional[Any]:
    """Setup pattern logger if available"""
    if not PATTERN_LOGGER_AVAILABLE:
        return None
    
    try:
        logger = PatternLogger(project_root)
        return logger
    except Exception as e:
        print(f"Warning: Could not setup pattern logger: {e}")
        return None


def run_existing_prod_cycle(args: argparse.Namespace, project_root: Path) -> Dict[str, Any]:
    """Run existing prod cycle script if available"""
    if not EXISTING_PROD_CYCLE_AVAILABLE:
        return {"error": "Existing prod cycle script not available"}
    
    script_path = investing_scripts_dir / "cmd_prod_cycle.py"
    cmd = ["python3", str(script_path)]
    
    # Build command arguments
    if args.mode:
        cmd.extend(["--mode", args.mode])
    if args.circle:
        cmd.extend(["--circle", args.circle])
    if args.testing:
        cmd.extend(["--testing", args.testing])
    if hasattr(args, 'testing_strategy') and args.testing_strategy:
        cmd.extend(["--testing-strategy", args.testing_strategy])
    if hasattr(args, 'testing_samples') and args.testing_samples:
        cmd.extend(["--testing-samples", str(args.testing_samples)])
    if args.json:
        cmd.append("--json")
    
    # Variant iteration controls
    if hasattr(args, 'variant_a_iters') and args.variant_a_iters:
        cmd.extend(["--variant-a-iters", str(args.variant_a_iters)])
    if hasattr(args, 'variant_b_iters') and args.variant_b_iters:
        cmd.extend(["--variant-b-iters", str(args.variant_b_iters)])
    if hasattr(args, 'variant_c_iters') and args.variant_c_iters:
        cmd.extend(["--variant-c-iters", str(args.variant_c_iters)])
    if hasattr(args, 'variant_d_iters') and args.variant_d_iters:
        cmd.extend(["--variant-d-iters", str(args.variant_d_iters)])
    if hasattr(args, 'variant_e_iters') and args.variant_e_iters:
        cmd.extend(["--variant-e-iters", str(args.variant_e_iters)])
    
    # Variant label controls
    if hasattr(args, 'variant_a_label') and args.variant_a_label:
        cmd.extend(["--variant-a-label", args.variant_a_label])
    if hasattr(args, 'variant_b_label') and args.variant_b_label:
        cmd.extend(["--variant-b-label", args.variant_b_label])
    if hasattr(args, 'variant_c_label') and args.variant_c_label:
        cmd.extend(["--variant-c-label", args.variant_c_label])
    if hasattr(args, 'variant_d_label') and args.variant_d_label:
        cmd.extend(["--variant-d-label", args.variant_d_label])
    if hasattr(args, 'variant_e_label') and args.variant_e_label:
        cmd.extend(["--variant-e-label", args.variant_e_label])
    
    # AB testing controls
    if hasattr(args, 'ab_reps') and args.ab_reps:
        cmd.extend(["--ab-reps", str(args.ab_reps)])
    
    # Production cycle controls
    if hasattr(args, 'safeguards') and args.safeguards:
        cmd.append("--safeguards")
    if hasattr(args, 'rollout_strategy') and args.rollout_strategy:
        cmd.extend(["--rollout-strategy", args.rollout_strategy])
    if hasattr(args, 'validation') and args.validation:
        cmd.append("--validation")
    if hasattr(args, 'pattern_metrics') and args.pattern_metrics:
        cmd.append("--pattern-metrics")
    if hasattr(args, 'compliance_checks') and args.compliance_checks:
        cmd.append("--compliance-checks")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=project_root)
        
        if result.returncode == 0:
            if args.json:
                try:
                    return json.loads(result.stdout)
                except json.JSONDecodeError:
                    return {"output": result.stdout, "success": True}
            else:
                print(result.stdout)
                return {"success": True, "output": result.stdout}
        else:
            error_msg = result.stderr if result.stderr else "Unknown error"
            return {"error": error_msg, "returncode": result.returncode}
    
    except Exception as e:
        return {"error": str(e)}


def run_minimal_prod_cycle(args: argparse.Namespace, project_root: Path) -> Dict[str, Any]:
    """Run a minimal prod cycle implementation when existing script is not available"""
    goalie_dir = ensure_goalie_dirs(project_root)
    logger = setup_pattern_logger(project_root)
    
    result = {
        "run_id": os.environ.get("AF_RUN_ID", str(uuid.uuid4())),
        "mode": args.mode or "mutate",
        "circle": args.circle or "orchestrator",
        "testing": args.testing or "none",
        "start_time": time.time(),
        "steps": []
    }
    
    # Step 1: Preflight schema validation
    if EXISTING_PROD_CYCLE_AVAILABLE:
        schema_result = preflight_schema_validation(str(project_root))
        result["steps"].append({"step": "schema_validation", "result": schema_result})
        
        if schema_result.get("status") == "failed":
            result["error"] = "Schema validation failed"
            return result
    else:
        result["steps"].append({"step": "schema_validation", "result": "skipped"})
    
    # Step 2: Detect goalie gaps
    if EXISTING_PROD_CYCLE_AVAILABLE and logger:
        metrics_file = goalie_dir / "pattern_metrics.jsonl"
        gaps = detect_goalie_gaps(str(metrics_file), logger)
        result["steps"].append({"step": "goalie_gaps", "result": gaps})
    else:
        result["steps"].append({"step": "goalie_gaps", "result": "skipped"})
    
    # Step 3: Fetch circle backlog
    if args.circle:
        backlog_file = project_root / "backlog.md"
        if EXISTING_PROD_CYCLE_AVAILABLE:
            tasks = fetch_circle_backlog(args.circle, str(backlog_file))
            result["steps"].append({"step": "backlog_fetch", "result": {"tasks": tasks}})
        else:
            result["steps"].append({"step": "backlog_fetch", "result": "skipped"})
    
    # Step 4: Determine optimal circle
    if not args.circle and EXISTING_PROD_CYCLE_AVAILABLE:
        metrics_file = goalie_dir / "pattern_metrics.jsonl"
        optimal_circle = determine_optimal_circle(str(metrics_file))
        result["optimal_circle"] = optimal_circle
        result["steps"].append({"step": "optimal_circle", "result": optimal_circle})
    
    # Step 5: Log completion
    result["end_time"] = time.time()
    result["duration"] = result["end_time"] - result["start_time"]
    result["success"] = True
    
    if logger:
        logger.log(
            "prod_cycle_complete",
            {
                "run_id": result["run_id"],
                "mode": result["mode"],
                "circle": result["circle"],
                "testing": result["testing"],
                "duration": result["duration"],
                "steps_completed": len(result["steps"]),
                "action_completed": True
            },
            gate="completion",
            behavioral_type="execution"
        )
    
    return result


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="AF Production Cycle with WSJF Integration")
    parser.add_argument("--mode", choices=["mutate", "advisory", "enforcement"],
                       default="mutate", help="Execution mode")
    parser.add_argument("--circle", help="Circle to run for")
    parser.add_argument("--testing", choices=["backtest", "forward", "full", "none"],
                       default="none", help="Testing methodology")
    parser.add_argument("--testing-strategy", help="Testing strategy")
    parser.add_argument("--testing-samples", type=int, help="Number of testing samples")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--log-goalie", action="store_true", help="Enable IRIS metrics logging")
    parser.add_argument("--tier-depth-coverage", action="store_true", help="Run tier-depth coverage analysis")
    parser.add_argument("--no-tier-depth-coverage", action="store_true", help="Skip tier-depth coverage analysis")
    
    # Variant iteration controls
    parser.add_argument("--variant-a-iters", type=int, default=1,
                       help="Iterations for variant A (0 = skip, default: 1)")
    parser.add_argument("--variant-b-iters", type=int, default=0,
                       help="Iterations for variant B (0 = skip, default: 0)")
    parser.add_argument("--variant-c-iters", type=int, default=0,
                       help="Iterations for variant C (0 = skip, default: 0)")
    parser.add_argument("--variant-d-iters", type=int, default=0,
                       help="Iterations for variant D (0 = skip, default: 0)")
    parser.add_argument("--variant-e-iters", type=int, default=0,
                       help="Iterations for variant E (0 = skip, default: 0)")
    
    # Variant label controls
    parser.add_argument("--variant-a-label", default='A',
                       help='Custom label for variant A (default: A)')
    parser.add_argument("--variant-b-label", default='B',
                       help='Custom label for variant B (default: B)')
    parser.add_argument("--variant-c-label", default='C',
                       help='Custom label for variant C (default: C)')
    parser.add_argument("--variant-d-label", default='D',
                       help='Custom label for variant D (default: D)')
    parser.add_argument("--variant-e-label", default='E',
                       help='Custom label for variant E (default: E)')
    
    # AB testing controls
    parser.add_argument("--ab-reps", type=int, default=5,
                       help='Repetitions per variant for AB testing (default: 5)')
    
    # Production cycle controls
    parser.add_argument("--safeguards", action="store_true",
                       help='Enable enhanced safeguards for production operations')
    parser.add_argument("--rollout-strategy", choices=['gradual', 'big-bang', 'canary'],
                       default='gradual', help='Rollout strategy for changes')
    parser.add_argument("--validation", action="store_true",
                       help='Enable comprehensive validation of production changes')
    parser.add_argument("--pattern-metrics", action="store_true",
                       help='Collect and analyze pattern execution metrics')
    parser.add_argument("--compliance-checks", action="store_true",
                       help='Run compliance checks during production cycle')
    
    args = parser.parse_args()
    
    # Set environment variables
    if args.log_goalie:
        os.environ["AF_ENABLE_IRIS_METRICS"] = "1"
    
    project_root = get_project_root()
    
    # Log IRIS metric if enabled
    if EXISTING_PROD_CYCLE_AVAILABLE and os.environ.get("AF_ENABLE_IRIS_METRICS") == "1":
        log_iris_metric("prod-cycle", sys.argv[1:], str(project_root))
    
    # Run tier-depth coverage analysis if requested
    tier_depth_result = None
    if getattr(args, 'tier_depth_coverage', False) and not getattr(args, 'no_tier_depth_coverage', False):
        try:
            # Import tier-depth coverage CLI
            sys.path.insert(0, str(script_dir))
            from tier_depth_coverage import TierDepthCoverageCLI
            
            tier_cli = TierDepthCoverageCLI(project_root)
            
            # Convert args to namespace for tier-depth analysis
            class TierDepthArgs:
                def __init__(self):
                    self.mode = args.mode or "normal"
                    self.circle = args.circle
                    self.testing = args.testing or "none"
                    self.validation_mode = "normal"
                    self.output_format = "summary"
                    self.save = None
            
            tier_args = TierDepthArgs()
            tier_depth_result = tier_cli.analyze_prod_cycle_coverage(tier_args)
            
            if not tier_depth_result.get("error"):
                print("✅ Tier-depth coverage analysis completed")
                if "metrics" in tier_depth_result:
                    metrics = tier_depth_result["metrics"]
                    print(f"   Backlog Schema Coverage: {metrics.get('tier_backlog_schema_coverage_pct', 0):.1f}%")
                    print(f"   Telemetry Pattern Coverage: {metrics.get('tier_telemetry_pattern_coverage_pct', 0):.1f}%")
                    print(f"   Depth Coverage: {metrics.get('tier_depth_coverage_pct', 0):.1f}%")
            else:
                print(f"⚠ Tier-depth coverage analysis failed: {tier_depth_result.get('error')}")
                
        except Exception as e:
            print(f"⚠ Tier-depth coverage analysis error: {e}")
    
    # Run production cycle
    if EXISTING_PROD_CYCLE_AVAILABLE:
        result = run_existing_prod_cycle(args, project_root)
    else:
        result = run_minimal_prod_cycle(args, project_root)
    
    # Merge tier-depth results if available
    if tier_depth_result and not tier_depth_result.get("error"):
        if "result" not in result:
            result["tier_depth_coverage"] = tier_depth_result
        else:
            result["tier_depth_coverage"] = tier_depth_result
    
    # Output results
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        if result.get("error"):
            print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)
        elif result.get("success"):
            print("✅ Production cycle completed successfully")
        else:
            print("✅ Production cycle completed")
            if "steps" in result:
                print(f"   Steps completed: {len(result['steps'])}")
            if "duration" in result:
                print(f"   Duration: {result['duration']:.2f}s")
            
        # Display tier-depth coverage summary if available
        if tier_depth_result and not tier_depth_result.get("error") and "metrics" in tier_depth_result:
            metrics = tier_depth_result["metrics"]
            print("")
            print("📊 Tier-Depth Coverage Summary:")
            print(f"   📋 Backlog Schema Coverage: {metrics.get('tier_backlog_schema_coverage_pct', 0):.1f}%")
            print(f"   📈 Telemetry Pattern Coverage: {metrics.get('tier_telemetry_pattern_coverage_pct', 0):.1f}%")
            print(f"   🏊 Depth Coverage: {metrics.get('tier_depth_coverage_pct', 0):.1f}%")


if __name__ == "__main__":
    main()