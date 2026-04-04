#!/usr/bin/env python3
"""
AF Production Swarm Command
Integrates with existing cmd_swarm_compare.py and provides swarm comparison capabilities
Enhanced with auto-run swarm-compare functionality
"""

import csv
import sys
import os
import argparse
import subprocess
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add investing/agentic-flow/scripts directory to Python path
script_dir = Path(__file__).parent
investing_scripts_dir = (
    script_dir.parent.parent / "investing" / "agentic-flow" / "scripts"
)
sys.path.insert(0, str(investing_scripts_dir))

# Import swarm compare automation
try:
    from swarm_compare_automation import SwarmCompareAutomation, UnifiedEvidenceEmitter
    from swarm_compare import (
        discover_swarm_tables,
        save_swarm_table,
        calculate_extended_metrics,
        trigger_automated_comparison,
        EXTENDED_METRICS,
        read_tsv
    )
    SWARM_COMPARE_AVAILABLE = True
except ImportError:
    SWARM_COMPARE_AVAILABLE = False
    print("Warning: swarm_compare modules not available, using fallback implementation")

# Try to import existing swarm compare module
try:
    from cmd_swarm_compare import _project_root
    EXISTING_SWARM_AVAILABLE = True
except ImportError:
    EXISTING_SWARM_AVAILABLE = False


def get_project_root() -> Path:
    """Get the project root directory"""
    return Path(os.environ.get("PROJECT_ROOT", Path.cwd()))


def run_existing_swarm_compare(
    args: argparse.Namespace, project_root: Path
) -> Dict[str, Any]:
    """Run existing swarm compare script if available"""
    if not EXISTING_SWARM_AVAILABLE:
        return {"error": "Existing swarm compare script not available"}
    
    script_path = investing_scripts_dir / "cmd_swarm_compare.py"
    cmd = ["python3", str(script_path)]
    
    # Build command arguments
    if args.prior:
        cmd.extend(["--prior", args.prior])
    if args.current:
        cmd.extend(["--current", args.current])
    if args.auto_ref:
        cmd.extend(["--auto-ref", args.auto_ref])
    if args.out:
        cmd.extend(["--out", args.out])
    if args.save:
        cmd.extend(["--save", args.save])
    
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, cwd=project_root
        )
        
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


def run_minimal_swarm_analysis(
    args: argparse.Namespace, project_root: Path
) -> Dict[str, Any]:
    """Run a minimal swarm analysis when existing script is not available"""
    result = {
        "run_id": os.environ.get("AF_RUN_ID", str(int(time.time()))),
        "start_time": time.time(),
        "analysis_type": "swarm_comparison",
        "input_files": {
            "prior": args.prior,
            "current": args.current,
            "auto_ref": args.auto_ref
        },
        "steps": []
    }
    
    # Step 1: Validate input files
    input_files = [args.prior, args.current, args.auto_ref]
    missing_files = []
    
    for file_path in input_files:
        if file_path and not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        result["error"] = f"Missing input files: {', '.join(missing_files)}"
        return result
    
    result["steps"] = result.get("steps", [])
    result["steps"].append({"step": "file_validation", "result": "passed"})
    
    # Step 2: Basic file analysis (if TSV files)
    file_pairs = [
        ("prior", args.prior),
        ("current", args.current),
        ("auto_ref", args.auto_ref)
    ]
    for file_type, file_path in file_pairs:
        if file_path and file_path.endswith('.tsv'):
            try:
                with open(file_path, 'r') as f:
                    lines = f.readlines()
                    result["steps"] = result.get("steps", [])
                    result["steps"].append({
                        "step": f"{file_type}_analysis",
                        "result": {
                            "file": file_path,
                            "lines": len(lines),
                            "size_bytes": Path(file_path).stat().st_size
                        }
                    })
            except Exception as e:
                result["steps"] = result.get("steps", [])
                result["steps"].append({
                    "step": f"{file_type}_analysis",
                    "result": {"error": str(e)}
                })
    
    # Step 3: Generate comparison summary
    result["steps"].append({
        "step": "comparison_summary",
        "result": {
            "files_compared": len([f for f in input_files if f]),
            "analysis_complete": True
        }
    })
    
    # Step 4: Log completion
    result["end_time"] = time.time()
    start_time = result.get("start_time", 0)
    end_time = result.get("end_time", 0)
    result["duration"] = end_time - start_time
    result["success"] = True
    
    return result


def generate_mock_swarm_data(
    project_root: Path, output_dir: str = "swarm_data"
) -> Dict[str, str]:
    """Generate mock swarm data for testing purposes"""
    output_path = project_root / output_dir
    output_path.mkdir(exist_ok=True)
    
    # Generate mock TSV files with realistic data
    mock_files = {}
    
    for phase in ["baseline", "current", "optimized"]:
        filename = f"{phase}_swarm.tsv"
        filepath = output_path / filename
        
        # Generate mock data
        with open(filepath, 'w') as f:
            # Header
            header = (
                "phase\tprofile\tconcurrency\tok\thealth_ckpt\tabort\t"
                "sys_state_err\tautofix_adv\tautofix_applied\tduration_h\t"
                "total_actions\tactions_per_h\talloc_rev\trev_per_h\t"
                "rev_per_action\tallocation_efficiency_pct\tevent_count\tmiss\t"
                "inv\tsentinel\tzero\tduration_ok_pct\tdur_mult\teff_mult\t"
                "tier_backlog_cov_pct\ttier_telemetry_cov_pct\ttier_depth_cov_pct\n"
            )
            f.write(header)
            
            # Generate 10 rows of mock data
            for i in range(10):
                profile = ["conservative", "balanced", "aggressive"][i % 3]
                concurrency = [1, 2, 4][i % 3]
                ok = 1 if i % 4 != 0 else 0
                
                # Generate realistic-looking metrics
                health_ckpt = 0.8 + (i * 0.02)
                abort = 1 if ok == 0 else 0
                sys_state_err = 0 if i % 5 != 0 else 1
                autofix_adv = 2 + i
                autofix_applied = 1 + (i % 2)
                duration_h = 0.5 + (i * 0.1)
                total_actions = 50 + (i * 10)
                actions_per_h = total_actions / duration_h
                alloc_rev = 100 + (i * 20)
                rev_per_h = alloc_rev / duration_h
                rev_per_action = rev_per_h / total_actions
                allocation_efficiency_pct = 70 + (i * 2)
                event_count = 100 + (i * 15)
                miss = 5 + (i % 3)
                inv = 2 + (i % 2)
                sentinel = 1 if i % 3 == 0 else 0
                zero = 0 if i % 4 != 0 else 1
                duration_ok_pct = 85 + (i % 10)
                dur_mult = 0.9 + (i * 0.05)
                eff_mult = 1.1 + (i * 0.03)
                tier_backlog_cov_pct = 60 + (i * 3)
                tier_telemetry_cov_pct = 75 + (i % 15)
                tier_depth_cov_pct = 50 + (i * 5)
                
                row_data = (
                    f"{phase}\t{profile}\t{concurrency}\t{ok}\t{health_ckpt}\t"
                    f"{abort}\t{sys_state_err}\t{autofix_adv}\t{autofix_applied}\t"
                    f"{duration_h}\t{total_actions}\t{actions_per_h}\t{alloc_rev}\t"
                    f"{rev_per_h}\t{rev_per_action}\t{allocation_efficiency_pct}\t"
                    f"{event_count}\t{miss}\t{inv}\t{sentinel}\t{zero}\t"
                    f"{duration_ok_pct}\t{dur_mult}\t{eff_mult}\t"
                    f"{tier_backlog_cov_pct}\t{tier_telemetry_cov_pct}\t"
                    f"{tier_depth_cov_pct}\n"
                )
                f.write(row_data)
        
        mock_files[phase] = str(filepath)
    
    return mock_files


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="AF Production Swarm Comparison and Analysis with Auto-Run Integration"
    )
    parser.add_argument("--prior", help="Prior swarm TSV file")
    parser.add_argument("--current", help="Current swarm TSV file")
    parser.add_argument("--auto-ref", help="Auto-reference swarm TSV file")
    parser.add_argument(
        "--out", choices=["json", "tsv"], default="json",
        help="Output format"
    )
    parser.add_argument("--save", help="Save output to file")
    parser.add_argument(
        "--json", action="store_true", help="Output JSON format"
    )
    parser.add_argument(
        "--generate-mock", action="store_true",
        help="Generate mock swarm data for testing"
    )
    parser.add_argument(
        "--mock-output-dir", default="swarm_data",
        help="Output directory for mock data"
    )
    
    # New three-way comparison options
    parser.add_argument("--discover", action="store_true",
                       help="Auto-discover swarm tables in .goalie directory")
    parser.add_argument("--compare", action="store_true",
                       help="Run three-way comparison after swarm execution")
    parser.add_argument("--save-table", action="store_true",
                       help="Save current swarm table to .goalie directory")
    parser.add_argument("--table-label", default="current",
                       help="Label for saved swarm table")
    parser.add_argument("--compare-out", choices=["json", "tsv"], default="json",
                       help="Comparison output format")
    parser.add_argument("--compare-save", help="Save comparison results to file")
    parser.add_argument("--tier-depth-coverage", action="store_true", help="Run tier-depth coverage analysis")
    parser.add_argument("--no-tier-depth-coverage", action="store_true", help="Skip tier-depth coverage analysis")
    
    # Auto-run swarm-compare integration options
    parser.add_argument("--auto-compare", action="store_true", default=True,
                       help="Automatically run swarm comparison after prod-swarm execution")
    parser.add_argument("--no-auto-compare", action="store_true",
                       help="Disable automatic swarm comparison")
    parser.add_argument("--auto-save-table", action="store_true", default=True,
                       help="Automatically save current swarm table for comparison")
    parser.add_argument("--auto-discover-paths", action="store_true", default=True,
                       help="Automatically generate paths for swarm comparisons")
    parser.add_argument("--comparison-mode", choices=["basic", "enhanced", "comprehensive"], 
                       default="enhanced", help="Level of comparison analysis")
    parser.add_argument("--include-extended-metrics", action="store_true", default=True,
                       help="Include extended metrics in comparison (multipliers, safety, gaps, maturity)")
    parser.add_argument("--evidence-logging", action="store_true", default=True,
                       help="Enable unified evidence logging for comparison operations")
    
    args = parser.parse_args()
    
    # Handle conflicting auto-compare flags
    if args.no_auto_compare:
        args.auto_compare = False
    if args.auto_compare and args.no_auto_compare:
        print("Warning: --auto-compare and --no-auto-compare conflict, disabling auto-compare")
        args.auto_compare = False
    
    project_root = get_project_root()
    
    # Initialize evidence emitter if available and enabled
    evidence_emitter = None
    if SWARM_COMPARE_AVAILABLE and args.evidence_logging:
        try:
            evidence_emitter = UnifiedEvidenceEmitter(
                project_root / ".goalie", 
                command="prod-swarm", 
                mode="normal"
            )
            evidence_emitter.emit("prod_swarm_started", {
                "auto_compare_enabled": args.auto_compare,
                "auto_save_table_enabled": args.auto_save_table,
                "comparison_mode": args.comparison_mode,
                "extended_metrics_enabled": args.include_extended_metrics
            })
        except Exception as e:
            print(f"Warning: Could not initialize evidence emitter: {e}")
    
    # Handle mock data generation
    if args.generate_mock:
        mock_files = generate_mock_swarm_data(project_root, args.mock_output_dir)
        
        if args.json:
            print(json.dumps({
                "mock_data_generated": True,
                "files": mock_files,
                "message": "Mock swarm data generated successfully"
            }, indent=2))
        else:
            print("✅ Mock swarm data generated:")
            for phase, filepath in mock_files.items():
                print(f"   {phase}: {filepath}")
        return
    
    # Handle auto-discovery mode
    if args.discover:
        return run_auto_discovery(args, project_root)
    
    # Validate required arguments for comparison
    if not args.discover and not args.current and not args.auto_save_table:
        error_msg = "Error: --prior, --current, and --auto-ref are all required for comparison (or use --discover)"
        if args.json:
            print(json.dumps({"error": error_msg}, indent=2))
        else:
            print(error_msg)
        sys.exit(1)
    
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
                    self.mode = "normal"
                    self.prior = getattr(args, 'prior', None)
                    self.current = getattr(args, 'current', None)
                    self.auto_ref = getattr(args, 'auto_ref', None)
                    self.include_comparison = getattr(args, 'include_comparison', False)
                    self.include_trends = getattr(args, 'include_trends', False)
                    self.benchmark = getattr(args, 'benchmark', False)
                    self.output_format = "summary"
                    self.save = None
            
            tier_args = TierDepthArgs()
            tier_depth_result = tier_cli.analyze_prod_swarm_coverage(tier_args)
            
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
    
    # Auto-save current table if enabled and current table is provided
    saved_table_path = None
    if args.auto_save_table and args.current and SWARM_COMPARE_AVAILABLE:
        try:
            print("🔄 Auto-saving current swarm table for comparison...")
            rows = read_tsv(args.current)
            enhanced_rows = calculate_extended_metrics(rows) if args.include_extended_metrics else rows
            
            # Generate enhanced table path
            timestamp = int(time.time())
            table_label = args.table_label or "current"
            saved_table_path = save_swarm_table(
                str(project_root), 
                enhanced_rows, 
                table_label, 
                timestamp,
                enhance_metrics=False  # Already enhanced if requested
            )
            
            print(f"✅ Current swarm table saved: {saved_table_path}")
            
            if evidence_emitter:
                evidence_emitter.emit("table_saved", {
                    "table_path": saved_table_path,
                    "table_label": table_label,
                    "enhanced_metrics": args.include_extended_metrics
                })
                
        except Exception as e:
            print(f"⚠️  Warning: Failed to auto-save current table: {e}")
            if evidence_emitter:
                evidence_emitter.emit_error("Auto-save table failed", {"error": str(e)})
    
    # Run swarm comparison
    if EXISTING_SWARM_AVAILABLE:
        result = run_existing_swarm_compare(args, project_root)
    else:
        result = run_minimal_swarm_analysis(args, project_root)
    
    # Merge tier-depth results if available
    if tier_depth_result and not tier_depth_result.get("error"):
        if "result" not in result:
            result["tier_depth_coverage"] = tier_depth_result
        else:
            result["tier_depth_coverage"] = tier_depth_result
    
    # Handle output
    if args.json:
        output = json.dumps(result, indent=2)
    else:
        if result.get("error"):
            output = f"Error: {result['error']}"
        elif result.get("success"):
            output = "✅ Swarm comparison completed successfully"
        else:
            output = "✅ Swarm analysis completed"
    
    print(output)
    
    # Display tier-depth coverage summary if available
    if tier_depth_result and not tier_depth_result.get("error") and "metrics" in tier_depth_result:
        metrics = tier_depth_result["metrics"]
        print("")
        print("📊 Tier-Depth Coverage Summary:")
        print(f"   📋 Backlog Schema Coverage: {metrics.get('tier_backlog_schema_coverage_pct', 0):.1f}%")
        print(f"   📈 Telemetry Pattern Coverage: {metrics.get('tier_telemetry_pattern_coverage_pct', 0):.1f}%")
        print(f"   🏊 Depth Coverage: {metrics.get('tier_depth_coverage_pct', 0):.1f}%")
    
    # Save to file if requested
    if args.save and result.get("success"):
        save_path = project_root / args.save
        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, 'w') as f:
            f.write(output)
        print(f"Results saved to: {save_path}")
    
    # Auto-run swarm comparison if enabled and available
    if args.auto_compare and SWARM_COMPARE_AVAILABLE and saved_table_path:
        try:
            print("\n🔄 Auto-running swarm comparison...")
            
            # Initialize automation
            automation = SwarmCompareAutomation(str(project_root), "normal")
            
            # Run comparison with auto-discovery
            comparison_result = automation.run_three_way_comparison(
                prior_table=None,  # Auto-discover
                current_table=saved_table_path,
                auto_ref_table=None,  # Auto-discover
                auto_discover=args.auto_discover_paths
            )
            
            if not comparison_result.get("errors"):
                print("✅ Auto-comparison completed successfully")
                
                # Display key metrics
                if "metrics" in comparison_result:
                    metrics = comparison_result["metrics"]
                    if "revenue_trend" in metrics:
                        rev_trend = metrics["revenue_trend"]
                        print(f"   💰 Revenue trend: {rev_trend.get('trend', 'unknown')} ({rev_trend.get('current_vs_prior', 0):.1f}% vs prior)")
                    
                    if "efficiency_trend" in metrics:
                        eff_trend = metrics["efficiency_trend"]
                        print(f"   ⚡ Efficiency trend: {eff_trend.get('trend', 'unknown')} ({eff_trend.get('current_vs_prior', 0):.1f}% vs prior)")
                    
                    if "duration_trend" in metrics:
                        dur_trend = metrics["duration_trend"]
                        print(f"   ⏱️  Duration trend: {dur_trend.get('trend', 'unknown')} ({dur_trend.get('current_vs_prior', 0):.1f}% vs prior)")
                
                # Display recommendations
                if comparison_result.get("recommendations"):
                    print("\n📋 Auto-comparison recommendations:")
                    for i, rec in enumerate(comparison_result["recommendations"][:5], 1):
                        print(f"   {i}. {rec}")
                
                # Save comparison results
                comparison_save_path = automation.save_comparison_results(
                    comparison_result,
                    args.compare_out,
                    args.compare_save
                )
                print(f"📊 Comparison results saved: {comparison_save_path}")
                
                if evidence_emitter:
                    evidence_emitter.emit_comparison_completed(comparison_result)
                    
            else:
                print(f"❌ Auto-comparison failed: {', '.join(comparison_result['errors'])}")
                if evidence_emitter:
                    evidence_emitter.emit_error("Auto-comparison failed", comparison_result["errors"])
                    
        except Exception as e:
            print(f"❌ Auto-comparison error: {e}")
            if evidence_emitter:
                evidence_emitter.emit_error("Auto-comparison exception", {"error": str(e)})
    
    # Exit with error code if failed
    if result.get("error"):
        sys.exit(1)


def run_auto_discovery(args: argparse.Namespace, project_root: Path) -> int:
    """Run auto-discovery and three-way comparison"""
    try:
        # Import our new comparison script
        compare_script = project_root / "scripts" / "af" / "swarm_compare.py"
        if not compare_script.exists():
            print("Error: swarm_compare.py not found")
            return 1
        
        # Run comparison with discovery
        cmd = ["python3", str(compare_script), "--discover"]
        
        if args.compare_out:
            cmd.extend(["--out", args.compare_out])
        if args.compare_save:
            cmd.extend(["--save", args.compare_save])
        cmd.extend(["--project-root", str(project_root)])  # Fixed: always include project-root
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=project_root)
        
        if result.returncode == 0:
            print(result.stdout)
            return 0
        else:
            print(f"Error: {result.stderr}")
            return 1
            
    except Exception as e:
        print(f"Error during auto-discovery: {e}")
        return 1


def save_current_table(project_root: Path, table_label: str = "current") -> Optional[str]:
    """Save current swarm table with enhanced metrics"""
    try:
        from scripts.af.swarm_compare import (
            discover_swarm_tables,
            calculate_extended_metrics,
            save_comparison_results
        )
        
        # Find most recent current table
        swarm_files = discover_swarm_tables(str(project_root))
        current_table = None
        
        for swarm_file in swarm_files:
            if "current" in swarm_file.label.lower():
                current_table = swarm_file
                break
        
        if not current_table:
            print("No current swarm table found to save")
            return None
        
        # Enhance with extended metrics
        enhanced_rows = calculate_extended_metrics(current_table.rows)
        
        # Create enhanced TSV with new columns
        from scripts.af.swarm_compare import EXTENDED_METRICS
        headers = list(current_table.rows[0].keys()) if current_table.rows else []
        
        # Add new extended metrics columns
        for metric in EXTENDED_METRICS:
            if metric not in headers:
                headers.append(metric)
        
        # Save enhanced table
        timestamp = int(time.time())
        enhanced_path = project_root / ".goalie" / f"swarm_table_{table_label}_{timestamp}.tsv"
        
        with open(enhanced_path, "w", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=headers, delimiter="\t", extrasaction="ignore")
            writer.writeheader()
            writer.writerows(enhanced_rows)
        
        print(f"Enhanced swarm table saved: {enhanced_path}")
        return str(enhanced_path)
        
    except ImportError:
        print("Warning: Could not import swarm_compare.py for table enhancement")
        return None
    except Exception as e:
        print(f"Error saving enhanced table: {e}")
        return None


def run_post_comparison(args: argparse.Namespace, project_root: Path, table_path: str) -> int:
    """Run post-execution three-way comparison"""
    try:
        # Import our comparison script
        compare_script = project_root / "scripts" / "af" / "swarm_compare.py"
        if not compare_script.exists():
            print("Error: swarm_compare.py not found for comparison")
            return 1
        
        # Build comparison command
        cmd = ["python3", str(compare_script)]
        
        # Try to find prior and auto-ref tables automatically
        from scripts.af.swarm_compare import discover_swarm_tables
        swarm_files = discover_swarm_tables(str(project_root))
        
        prior_table = None
        auto_ref_table = None
        
        # Find prior (oldest) and auto-ref (middle) tables
        if len(swarm_files) >= 3:
            prior_table = swarm_files[-1]  # Oldest
            auto_ref_table = swarm_files[1]  # Second most recent
        
        if prior_table and auto_ref_table:
            cmd.extend([
                "--prior", prior_table.path,
                "--current", table_path,
                "--auto-ref", auto_ref_table.path
            ])
        else:
            print("Warning: Could not find prior and auto-ref tables automatically")
            return 1
        
        if args.compare_out:
            cmd.extend(["--out", args.compare_out])
        if args.compare_save:
            cmd.extend(["--save", args.compare_save])
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=project_root)
        
        if result.returncode == 0:
            print(result.stdout)
            return 0
        else:
            print(f"Comparison error: {result.stderr}")
            return 1
            
    except Exception as e:
        print(f"Error during post-comparison: {e}")
        return 1


if __name__ == "__main__":
    main()