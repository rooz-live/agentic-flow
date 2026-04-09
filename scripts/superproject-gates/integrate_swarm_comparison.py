#!/usr/bin/env python3
"""
Swarm Comparison Integration Helper
Integrates swarm comparison automation with existing af prod-swarm and af prod-cycle workflows
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

# Import automation components
try:
    from swarm_compare_automation import SwarmCompareAutomation, UnifiedEvidenceEmitter
    AUTOMATION_AVAILABLE = True
except ImportError:
    AUTOMATION_AVAILABLE = False
    print("Warning: swarm_compare_automation.py not available")

# Import existing prod-swarm functionality
try:
    from af_prod_swarm import (
        get_project_root,
        run_existing_swarm_compare,
        run_minimal_swarm_analysis,
        save_current_table,
        run_post_comparison
    )
    PROD_SWARM_AVAILABLE = True
except ImportError:
    PROD_SWARM_AVAILABLE = False
    print("Warning: af_prod_swarm.py not available")


class SwarmIntegrationManager:
    """Manages integration of swarm comparison with existing workflows"""
    
    def __init__(self, project_root: str, mode: str = "normal"):
        self.project_root = Path(project_root)
        self.mode = mode
        self.goalie_dir = self.project_root / ".goalie"
        
        # Initialize components if available
        if AUTOMATION_AVAILABLE:
            self.automation = SwarmCompareAutomation(str(project_root), mode)
            self.evidence_emitter = self.automation.evidence_emitter
        else:
            self.automation = None
            self.evidence_emitter = None
    
    def integrate_with_prod_swarm(
        self,
        prior: Optional[str] = None,
        current: Optional[str] = None,
        auto_ref: Optional[str] = None,
        auto_discover: bool = True,
        save_table: bool = False,
        table_label: str = "current",
        auto_compare: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """Integrate swarm comparison with prod-swarm workflow"""
        
        integration_result = {
            "integration_type": "prod-swarm",
            "start_time": time.time(),
            "steps": [],
            "final_result": {},
            "errors": [],
            "warnings": []
        }
        
        try:
            # Step 1: Save current table if requested
            if save_table and PROD_SWARM_AVAILABLE:
                integration_result["steps"].append({
                    "step": "save_current_table",
                    "status": "running"
                })
                
                saved_table_path = save_current_table(self.project_root, table_label)
                if saved_table_path:
                    integration_result["steps"][-1]["status"] = "completed"
                    integration_result["steps"][-1]["result"] = {"saved_path": saved_table_path}
                    
                    # Use saved table as current if not specified
                    if not current:
                        current = saved_table_path
                else:
                    integration_result["steps"][-1]["status"] = "failed"
                    integration_result["errors"].append("Failed to save current table")
            else:
                integration_result["steps"].append({
                    "step": "save_current_table",
                    "status": "skipped",
                    "reason": "not requested or prod-swarm not available"
                })
            
            # Step 2: Auto-discover tables if needed
            if auto_discover and (not prior or not current or not auto_ref):
                integration_result["steps"].append({
                    "step": "auto_discovery",
                    "status": "running"
                })
                
                if self.automation:
                    discovery_result = self.automation.auto_discover_tables()
                    integration_result["steps"][-1]["status"] = "completed"
                    integration_result["steps"][-1]["result"] = discovery_result
                    
                    # Auto-assign tables if not specified
                    if not (prior and current and auto_ref):
                        swarm_tables = self.automation._fallback_discover_tables("swarm_table_*.tsv")
                        if len(swarm_tables) >= 3:
                            prior = prior or swarm_tables[-1].path  # Oldest
                            current = current or swarm_tables[0].path  # Newest
                            auto_ref = auto_ref or swarm_tables[1].path  # Middle
                            
                            integration_result["steps"][-1]["auto_assignment"] = {
                                "prior": prior,
                                "current": current,
                                "auto_ref": auto_ref
                            }
                        else:
                            integration_result["warnings"].append(
                                f"Insufficient tables for auto-discovery: found {len(swarm_tables)}, need 3"
                            )
                else:
                    integration_result["steps"][-1]["status"] = "failed"
                    integration_result["errors"].append("Automation not available for discovery")
            else:
                integration_result["steps"].append({
                    "step": "auto_discovery",
                    "status": "skipped",
                    "reason": "not needed or disabled"
                })
            
            # Step 3: Run existing swarm comparison if available
            if PROD_SWARM_AVAILABLE and (prior and current and auto_ref):
                integration_result["steps"].append({
                    "step": "existing_swarm_comparison",
                    "status": "running"
                })
                
                # Create args namespace for existing function
                class Args:
                    def __init__(self):
                        self.prior = prior
                        self.current = current
                        self.auto_ref = auto_ref
                        self.out = kwargs.get("out", "json")
                        self.save = kwargs.get("save")
                        self.json = kwargs.get("json", True)
                
                args = Args()
                
                if run_existing_swarm_compare(args, self.project_root).get("success"):
                    integration_result["steps"][-1]["status"] = "completed"
                else:
                    integration_result["steps"][-1]["status"] = "failed"
                    integration_result["errors"].append("Existing swarm comparison failed")
            else:
                integration_result["steps"].append({
                    "step": "existing_swarm_comparison",
                    "status": "skipped",
                    "reason": "not available or missing inputs"
                })
            
            # Step 4: Run enhanced comparison if automation available
            if self.automation and auto_compare:
                integration_result["steps"].append({
                    "step": "enhanced_comparison",
                    "status": "running"
                })
                
                comparison_result = self.automation.run_three_way_comparison(
                    prior_table=prior,
                    current_table=current,
                    auto_ref_table=auto_ref,
                    auto_discover=False  # Already done above
                )
                
                if not comparison_result.get("errors"):
                    integration_result["steps"][-1]["status"] = "completed"
                    integration_result["steps"][-1]["result"] = comparison_result
                    
                    # Save comparison results
                    if kwargs.get("save"):
                        output_path = self.automation.save_comparison_results(
                            comparison_result,
                            kwargs.get("out", "json"),
                            kwargs.get("save")
                        )
                        integration_result["steps"][-1]["output_path"] = output_path
                else:
                    integration_result["steps"][-1]["status"] = "failed"
                    integration_result["errors"].extend(comparison_result["errors"])
            else:
                integration_result["steps"].append({
                    "step": "enhanced_comparison",
                    "status": "skipped",
                    "reason": "not requested or automation not available"
                })
            
            # Step 5: Generate integration summary
            integration_result["final_result"] = {
                "integration_successful": len(integration_result["errors"]) == 0,
                "steps_completed": len([s for s in integration_result["steps"] if s["status"] == "completed"]),
                "steps_failed": len([s for s in integration_result["steps"] if s["status"] == "failed"]),
                "tables_used": {
                    "prior": prior,
                    "current": current,
                    "auto_ref": auto_ref
                }
            }
            
        except Exception as e:
            integration_result["errors"].append(f"Integration failed: {str(e)}")
        
        finally:
            integration_result["end_time"] = time.time()
            integration_result["duration"] = integration_result["end_time"] - integration_result["start_time"]
        
        return integration_result
    
    def integrate_with_prod_cycle(
        self,
        swarm_after_cycle: bool = True,
        swarm_comparison_args: Dict[str, Any] = None,
        **cycle_kwargs
    ) -> Dict[str, Any]:
        """Integrate swarm comparison with prod-cycle workflow"""
        
        integration_result = {
            "integration_type": "prod-cycle",
            "start_time": time.time(),
            "steps": [],
            "final_result": {},
            "errors": [],
            "warnings": []
        }
        
        try:
            # Step 1: Run production cycle
            integration_result["steps"].append({
                "step": "prod_cycle_execution",
                "status": "running"
            })
            
            # Import and run prod-cycle
            try:
                from af_prod_cycle import main as prod_cycle_main
                
                # Save original sys.argv
                original_argv = sys.argv
                
                # Build prod-cycle arguments
                cycle_args = ["af_prod_cycle.py"]
                if cycle_kwargs.get("mode"):
                    cycle_args.extend(["--mode", cycle_kwargs["mode"]])
                if cycle_kwargs.get("circle"):
                    cycle_args.extend(["--circle", cycle_kwargs["circle"]])
                if cycle_kwargs.get("testing"):
                    cycle_args.extend(["--testing", cycle_kwargs["testing"]])
                if cycle_kwargs.get("json"):
                    cycle_args.append("--json")
                
                # Temporarily replace sys.argv
                sys.argv = cycle_args
                
                # Run prod-cycle
                try:
                    prod_cycle_main()
                    integration_result["steps"][-1]["status"] = "completed"
                except SystemExit as e:
                    if e.code == 0:
                        integration_result["steps"][-1]["status"] = "completed"
                    else:
                        integration_result["steps"][-1]["status"] = "failed"
                        integration_result["errors"].append(f"Prod-cycle failed with exit code {e.code}")
                finally:
                    # Restore original sys.argv
                    sys.argv = original_argv
                    
            except ImportError:
                integration_result["steps"][-1]["status"] = "failed"
                integration_result["errors"].append("af_prod_cycle.py not available")
            
            # Step 2: Run swarm comparison after cycle if requested
            if swarm_after_cycle and self.automation:
                integration_result["steps"].append({
                    "step": "post_cycle_swarm_comparison",
                    "status": "running"
                })
                
                # Auto-discover and compare
                comparison_result = self.automation.run_three_way_comparison(
                    prior_table=None,
                    current_table=None,
                    auto_ref_table=None,
                    auto_discover=True
                )
                
                if not comparison_result.get("errors"):
                    integration_result["steps"][-1]["status"] = "completed"
                    integration_result["steps"][-1]["result"] = comparison_result
                    
                    # Save comparison results
                    output_path = self.automation.save_comparison_results(
                        comparison_result,
                        swarm_comparison_args.get("out", "json") if swarm_comparison_args else "json",
                        swarm_comparison_args.get("save") if swarm_comparison_args else None
                    )
                    integration_result["steps"][-1]["output_path"] = output_path
                else:
                    integration_result["steps"][-1]["status"] = "failed"
                    integration_result["errors"].extend(comparison_result["errors"])
            else:
                integration_result["steps"].append({
                    "step": "post_cycle_swarm_comparison",
                    "status": "skipped",
                    "reason": "not requested or automation not available"
                })
            
            # Step 3: Generate integration summary
            integration_result["final_result"] = {
                "integration_successful": len(integration_result["errors"]) == 0,
                "steps_completed": len([s for s in integration_result["steps"] if s["status"] == "completed"]),
                "steps_failed": len([s for s in integration_result["steps"] if s["status"] == "failed"]),
                "swarm_comparison_triggered": swarm_after_cycle
            }
            
        except Exception as e:
            integration_result["errors"].append(f"Integration failed: {str(e)}")
        
        finally:
            integration_result["end_time"] = time.time()
            integration_result["duration"] = integration_result["end_time"] - integration_result["start_time"]
        
        return integration_result
    
    def run_integrated_workflow(
        self,
        workflow_type: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Run integrated workflow based on type"""
        
        if workflow_type == "prod-swarm":
            return self.integrate_with_prod_swarm(**kwargs)
        elif workflow_type == "prod-cycle":
            return self.integrate_with_prod_cycle(**kwargs)
        else:
            return {
                "integration_type": workflow_type,
                "errors": [f"Unknown workflow type: {workflow_type}"],
                "integration_successful": False
            }
    
    def validate_integration_environment(self) -> Dict[str, Any]:
        """Validate the integration environment"""
        
        validation_result = {
            "project_root": str(self.project_root),
            "goalie_dir_exists": self.goalie_dir.exists(),
            "automation_available": AUTOMATION_AVAILABLE,
            "prod_swarm_available": PROD_SWARM_AVAILABLE,
            "prod_cycle_available": False,  # Will check below
            "swarm_tables_found": 0,
            "issues": [],
            "recommendations": []
        }
        
        # Check prod-cycle availability
        try:
            from af_prod_cycle import main as prod_cycle_main
            validation_result["prod_cycle_available"] = True
        except ImportError:
            validation_result["prod_cycle_available"] = False
            validation_result["issues"].append("af_prod_cycle.py not available")
        
        # Check for swarm tables
        if self.goalie_dir.exists():
            swarm_tables = list(self.goalie_dir.glob("swarm_table_*.tsv"))
            validation_result["swarm_tables_found"] = len(swarm_tables)
            
            if len(swarm_tables) < 3:
                validation_result["recommendations"].append(
                    f"Generate more swarm tables for comparison (found {len(swarm_tables)}, need at least 3)"
                )
        
        # Check directory structure
        if not self.goalie_dir.exists():
            validation_result["issues"].append(".goalie directory not found")
            validation_result["recommendations"].append("Create .goalie directory structure")
        
        # Generate overall assessment
        validation_result["ready_for_integration"] = (
            validation_result["goalie_dir_exists"] and
            validation_result["automation_available"] and
            len(validation_result["issues"]) == 0
        )
        
        return validation_result


def main():
    """Main entry point for swarm comparison integration"""
    parser = argparse.ArgumentParser(
        description="Swarm Comparison Integration Helper"
    )
    
    # Core arguments
    parser.add_argument("--project-root", help="Project root directory")
    parser.add_argument("--mode", choices=["mutate", "normal", "advisory", "enforcement"],
                       default="normal", help="Execution mode")
    parser.add_argument("--workflow", choices=["prod-swarm", "prod-cycle", "validate"],
                       default="prod-swarm", help="Integration workflow type")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    
    # Prod-swarm integration arguments
    parser.add_argument("--prior", help="Prior swarm TSV file")
    parser.add_argument("--current", help="Current swarm TSV file")
    parser.add_argument("--auto-ref", help="Auto-reference swarm TSV file")
    parser.add_argument("--auto-discover", action="store_true", default=True,
                       help="Auto-discover swarm tables")
    parser.add_argument("--save-table", action="store_true", help="Save current swarm table")
    parser.add_argument("--table-label", default="current", help="Label for saved table")
    parser.add_argument("--auto-compare", action="store_true", help="Trigger automated comparison")
    
    # Prod-cycle integration arguments
    parser.add_argument("--swarm-after-cycle", action="store_true",
                       help="Run swarm comparison after prod-cycle")
    parser.add_argument("--cycle-mode", help="Mode for prod-cycle execution")
    parser.add_argument("--cycle-circle", help="Circle for prod-cycle execution")
    parser.add_argument("--cycle-testing", help="Testing strategy for prod-cycle")
    
    # Output arguments
    parser.add_argument("--out", choices=["json", "tsv"], default="json",
                       help="Output format")
    parser.add_argument("--save", help="Save output to file")
    
    args = parser.parse_args()
    
    # Determine project root
    if args.project_root:
        project_root = args.project_root
    else:
        project_root = os.environ.get("PROJECT_ROOT", str(Path.cwd()))
    
    # Initialize integration manager
    manager = SwarmIntegrationManager(project_root, args.mode)
    
    # Run validation if requested
    if args.workflow == "validate":
        validation_result = manager.validate_integration_environment()
        
        if args.json:
            print(json.dumps(validation_result, indent=2, default=str))
        else:
            print("Integration Environment Validation:")
            print(f"  Project Root: {validation_result['project_root']}")
            print(f"  Goalie Directory: {'✅' if validation_result['goalie_dir_exists'] else '❌'}")
            print(f"  Automation Available: {'✅' if validation_result['automation_available'] else '❌'}")
            print(f"  Prod-Swarm Available: {'✅' if validation_result['prod_swarm_available'] else '❌'}")
            print(f"  Prod-Cycle Available: {'✅' if validation_result['prod_cycle_available'] else '❌'}")
            print(f"  Swarm Tables Found: {validation_result['swarm_tables_found']}")
            print(f"  Ready for Integration: {'✅' if validation_result['ready_for_integration'] else '❌'}")
            
            if validation_result["issues"]:
                print("\nIssues:")
                for issue in validation_result["issues"]:
                    print(f"  - {issue}")
            
            if validation_result["recommendations"]:
                print("\nRecommendations:")
                for rec in validation_result["recommendations"]:
                    print(f"  - {rec}")
        
        return 0 if validation_result["ready_for_integration"] else 1
    
    # Run integrated workflow
    if args.workflow == "prod-swarm":
        integration_result = manager.integrate_with_prod_swarm(
            prior=args.prior,
            current=args.current,
            auto_ref=args.auto_ref,
            auto_discover=args.auto_discover,
            save_table=args.save_table,
            table_label=args.table_label,
            auto_compare=args.auto_compare,
            out=args.out,
            save=args.save,
            json=args.json
        )
    elif args.workflow == "prod-cycle":
        integration_result = manager.integrate_with_prod_cycle(
            swarm_after_cycle=args.swarm_after_cycle,
            swarm_comparison_args={
                "out": args.out,
                "save": args.save
            },
            mode=args.cycle_mode or args.mode,
            circle=args.cycle_circle,
            testing=args.cycle_testing,
            json=args.json
        )
    else:
        integration_result = {
            "integration_type": args.workflow,
            "errors": [f"Unknown workflow type: {args.workflow}"],
            "integration_successful": False
        }
    
    # Handle output
    if args.json:
        print(json.dumps(integration_result, indent=2, default=str))
    else:
        if integration_result.get("errors"):
            print("Integration completed with errors:")
            for error in integration_result["errors"]:
                print(f"  - {error}")
        else:
            print("✅ Integration completed successfully")
        
        if integration_result.get("warnings"):
            print("\nWarnings:")
            for warning in integration_result["warnings"]:
                print(f"  - {warning}")
        
        print(f"\nSteps completed: {integration_result.get('steps_completed', 0)}")
        print(f"Steps failed: {integration_result.get('steps_failed', 0)}")
        
        if args.verbose:
            print("\nStep details:")
            for step in integration_result.get("steps", []):
                status_icon = "✅" if step["status"] == "completed" else "❌" if step["status"] == "failed" else "⏭️"
                print(f"  {status_icon} {step['step']}: {step['status']}")
                if step.get("reason"):
                    print(f"    Reason: {step['reason']}")
    
    # Exit with error code if integration failed
    if integration_result.get("errors"):
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())