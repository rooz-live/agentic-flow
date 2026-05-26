#!/usr/bin/env python3
"""
Tier-Depth Coverage CLI Integration
Provides tier-depth coverage analysis for both prod-cycle and prod-swarm commands
Integrates with the TypeScript tier-depth coverage analyzer
"""

import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add project root to Python path
script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
sys.path.insert(0, str(project_root))

try:
    # Try to import Node.js bridge for TypeScript integration
    import subprocess
    import threading
    import queue
    NODEJS_AVAILABLE = True
except ImportError:
    NODEJS_AVAILABLE = False


class TierDepthCoverageCLI:
    """CLI interface for tier-depth coverage analysis"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.goalie_dir = project_root / ".goalie"
        self.run_id = str(uuid.uuid4())
        
    def ensure_goalie_dirs(self):
        """Ensure .goalie directory structure exists"""
        self.goalie_dir.mkdir(exist_ok=True)
        (self.goalie_dir / "coverage").mkdir(exist_ok=True)
        (self.goalie_dir / "tier-depth").mkdir(exist_ok=True)
        
    def emit_evidence(self, event_type: str, data: Dict[str, Any]):
        """Emit evidence event to unified evidence log"""
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "command": data.get("command", "tier-depth"),
            "mode": data.get("mode", "normal"),
            "event_type": event_type,
            "run_id": self.run_id,
            "data": data
        }
        
        # Write to unified evidence log
        evidence_file = self.goalie_dir / "unified_evidence.jsonl"
        with open(evidence_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
            
    def call_typescript_analyzer(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call TypeScript tier-depth analyzer via Node.js"""
        if not NODEJS_AVAILABLE:
            return {"error": "Node.js integration not available"}
            
        try:
            # Create temporary input file
            input_file = self.goalie_dir / f"tier_depth_input_{int(time.time())}.json"
            with open(input_file, 'w') as f:
                json.dump({
                    "method": method,
                    "params": params,
                    "runId": self.run_id
                }, f)
            
            # Call Node.js script
            node_script = project_root / "agentic-flow-core" / "dist" / "tier-depth-bridge.js"
            if not node_script.exists():
                # Try to use TypeScript directly
                cmd = [
                    "npx", "ts-node",
                    str(project_root / "scripts" / "af" / "tier-depth-bridge.ts")
                ]
            else:
                cmd = ["node", str(node_script)]
            
            cmd.extend([str(input_file)])
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(project_root),
                timeout=300  # 5 minute timeout
            )
            
            # Clean up input file
            try:
                input_file.unlink()
            except:
                pass
            
            if result.returncode == 0:
                return json.loads(result.stdout)
            else:
                return {
                    "error": result.stderr,
                    "returncode": result.returncode
                }
                
        except subprocess.TimeoutExpired:
            return {"error": "Analysis timed out"}
        except Exception as e:
            return {"error": str(e)}
    
    def analyze_prod_cycle_coverage(self, args: argparse.Namespace) -> Dict[str, Any]:
        """Analyze tier-depth coverage for prod-cycle command"""
        print(f"[TIER-DEPTH] Analyzing prod-cycle coverage...")
        
        self.ensure_goalie_dirs()
        
        # Emit start event
        self.emit_evidence("tier_depth_prod_cycle_start", {
            "command": "prod-cycle",
            "mode": getattr(args, 'mode', 'normal'),
            "circle": getattr(args, 'circle', None),
            "testing": getattr(args, 'testing', 'none')
        })
        
        # Prepare analysis parameters
        params = {
            "command": "prod-cycle",
            "period": {
                "start": datetime.utcnow().isoformat(),
                "end": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
                "type": "daily"
            },
            "scope": {
                "circles": [args.circle] if args.circle else [],
                "domains": [],
                "tiers": ["high-structure", "medium-structure", "flexible"],
                "depthLevels": [1, 2, 3, 4, 5],
                "includeTelemetry": True,
                "includeEconomic": True,
                "includeWSJF": True
            },
            "options": {
                "includeBacklogAnalysis": True,
                "includeTelemetryAnalysis": True,
                "includeDepthAnalysis": True,
                "validationMode": getattr(args, 'validation_mode', 'normal')
            }
        }
        
        # Call TypeScript analyzer
        result = self.call_typescript_analyzer("analyzeProdCycleCoverage", params)
        
        if "error" in result:
            self.emit_evidence("tier_depth_prod_cycle_error", {
                "command": "prod-cycle",
                "error": result["error"]
            })
            return {"error": result["error"]}
        
        # Emit completion event
        self.emit_evidence("tier_depth_prod_cycle_complete", {
            "command": "prod-cycle",
            "metrics": result.get("metrics", {}),
            "success": True
        })
        
        return result
    
    def analyze_prod_swarm_coverage(self, args: argparse.Namespace) -> Dict[str, Any]:
        """Analyze tier-depth coverage for prod-swarm command"""
        print(f"[TIER-DEPTH] Analyzing prod-swarm coverage...")
        
        self.ensure_goalie_dirs()
        
        # Load swarm data
        swarm_data = self.load_swarm_data(args)
        
        if not swarm_data:
            return {"error": "No swarm data available for analysis"}
        
        # Emit start event
        self.emit_evidence("tier_depth_prod_swarm_start", {
            "command": "prod-swarm",
            "mode": getattr(args, 'mode', 'normal'),
            "swarm_data_points": len(swarm_data)
        })
        
        # Prepare analysis parameters
        params = {
            "command": "prod-swarm",
            "period": {
                "start": datetime.utcnow().isoformat(),
                "end": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
                "type": "daily"
            },
            "scope": {
                "circles": [],
                "domains": [],
                "tiers": ["high-structure", "medium-structure", "flexible"],
                "depthLevels": [1, 2, 3, 4, 5],
                "includeTelemetry": True,
                "includeEconomic": True,
                "includeWSJF": True
            },
            "swarmData": swarm_data,
            "options": {
                "includeComparison": getattr(args, 'include_comparison', False),
                "includeTrendAnalysis": getattr(args, 'include_trends', False),
                "benchmarkMode": getattr(args, 'benchmark', False)
            }
        }
        
        # Call TypeScript analyzer
        result = self.call_typescript_analyzer("analyzeProdSwarmCoverage", params)
        
        if "error" in result:
            self.emit_evidence("tier_depth_prod_swarm_error", {
                "command": "prod-swarm",
                "error": result["error"]
            })
            return {"error": result["error"]}
        
        # Emit completion event
        self.emit_evidence("tier_depth_prod_swarm_complete", {
            "command": "prod-swarm",
            "metrics": result.get("metrics", {}),
            "swarm_data_points": len(swarm_data),
            "success": True
        })
        
        return result
    
    def load_swarm_data(self, args: argparse.Namespace) -> List[Dict[str, Any]]:
        """Load swarm data from various sources"""
        swarm_data = []
        
        # Try to load from specified files
        if hasattr(args, 'prior') and args.prior:
            swarm_data.extend(self.load_swarm_file(args.prior, "prior"))
        
        if hasattr(args, 'current') and args.current:
            swarm_data.extend(self.load_swarm_file(args.current, "current"))
        
        if hasattr(args, 'auto_ref') and args.auto_ref:
            swarm_data.extend(self.load_swarm_file(args.auto_ref, "auto_ref"))
        
        # If no files specified, try to discover from .goalie directory
        if not swarm_data:
            swarm_data = self.discover_swarm_files()
        
        return swarm_data
    
    def load_swarm_file(self, file_path: str, label: str) -> List[Dict[str, Any]]:
        """Load swarm data from a specific file"""
        try:
            if file_path.endswith('.json'):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return [{"label": label, **item} for item in data]
                    else:
                        return [{"label": label, **data}]
            elif file_path.endswith('.tsv'):
                import csv
                with open(file_path, 'r') as f:
                    reader = csv.DictReader(f, delimiter='\t')
                    return [{"label": label, **row} for row in reader]
            else:
                print(f"Warning: Unsupported file format for {file_path}")
                return []
        except Exception as e:
            print(f"Error loading swarm file {file_path}: {e}")
            return []
    
    def discover_swarm_files(self) -> List[Dict[str, Any]]:
        """Discover swarm files in .goalie directory"""
        swarm_files = []
        
        # Look for swarm_table_*.tsv files
        for swarm_file in self.goalie_dir.glob("swarm_table_*.tsv"):
            try:
                import csv
                with open(swarm_file, 'r') as f:
                    reader = csv.DictReader(f, delimiter='\t')
                    for row in reader:
                        swarm_files.append(row)
            except Exception as e:
                print(f"Error reading swarm file {swarm_file}: {e}")
        
        return swarm_files
    
    def generate_report(self, analysis_result: Dict[str, Any], output_format: str = "json") -> str:
        """Generate formatted report from analysis results"""
        if output_format == "json":
            return json.dumps(analysis_result, indent=2)
        elif output_format == "summary":
            return self.generate_summary_report(analysis_result)
        else:
            return json.dumps(analysis_result, indent=2)
    
    def generate_summary_report(self, result: Dict[str, Any]) -> str:
        """Generate human-readable summary report"""
        if "error" in result:
            return f"Error: {result['error']}"
        
        metrics = result.get("metrics", {})
        summary = result.get("summary", {})
        
        report = []
        report.append("=== Tier-Depth Coverage Analysis Report ===")
        report.append(f"Generated: {result.get('generatedAt', 'Unknown')}")
        report.append(f"Run ID: {result.get('id', 'Unknown')}")
        report.append("")
        
        report.append("=== Key Metrics ===")
        report.append(f"Backlog Schema Coverage: {metrics.get('tier_backlog_schema_coverage_pct', 0):.1f}%")
        report.append(f"Telemetry Pattern Coverage: {metrics.get('tier_telemetry_pattern_coverage_pct', 0):.1f}%")
        report.append(f"Depth Coverage: {metrics.get('tier_depth_coverage_pct', 0):.1f}%")
        report.append(f"Overall Maturity Score: {metrics.get('overall_maturity_score', 0):.1f}%")
        report.append("")
        
        if summary.get("highlights"):
            report.append("=== Highlights ===")
            for highlight in summary["highlights"]:
                report.append(f"✓ {highlight}")
            report.append("")
        
        if summary.get("concerns"):
            report.append("=== Concerns ===")
            for concern in summary["concerns"]:
                report.append(f"⚠ {concern}")
            report.append("")
        
        if result.get("recommendations"):
            report.append("=== Recommendations ===")
            for i, rec in enumerate(result["recommendations"][:5], 1):
                report.append(f"{i}. {rec.get('title', 'Unknown')}")
                report.append(f"   {rec.get('description', 'No description')}")
                report.append(f"   Priority: {rec.get('priority', 'Unknown')}")
                report.append("")
        
        return "\n".join(report)


def main():
    """Main entry point for tier-depth coverage CLI"""
    parser = argparse.ArgumentParser(
        description="Tier-Depth Coverage Analysis for Agentic Flow"
    )
    
    # Global flags
    parser.add_argument("--json", action="store_true", help="Force JSON output")
    parser.add_argument("--correlation-id", help="Trace ID for logging")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # prod-cycle subcommand
    prod_cycle_parser = subparsers.add_parser("prod-cycle", help="Analyze prod-cycle coverage")
    prod_cycle_parser.add_argument("--mode", choices=["mutate", "normal", "advisory", "enforcement"],
                                default="normal", help="Execution mode")
    prod_cycle_parser.add_argument("--circle", help="Target circle")
    prod_cycle_parser.add_argument("--testing", choices=["backtest", "forward", "full", "none"],
                                default="none", help="Testing strategy")
    prod_cycle_parser.add_argument("--validation-mode", choices=["strict", "normal", "lenient"],
                                default="normal", help="Validation mode")
    prod_cycle_parser.add_argument("--output-format", choices=["json", "summary"],
                                default="summary", help="Output format")
    prod_cycle_parser.add_argument("--save", help="Save report to file")
    
    # prod-swarm subcommand
    prod_swarm_parser = subparsers.add_parser("prod-swarm", help="Analyze prod-swarm coverage")
    prod_swarm_parser.add_argument("--mode", choices=["mutate", "normal", "advisory", "enforcement"],
                                default="normal", help="Execution mode")
    prod_swarm_parser.add_argument("--prior", help="Prior swarm TSV file")
    prod_swarm_parser.add_argument("--current", help="Current swarm TSV file")
    prod_swarm_parser.add_argument("--auto-ref", help="Auto-reference TSV file")
    prod_swarm_parser.add_argument("--include-comparison", action="store_true",
                                help="Include comparison analysis")
    prod_swarm_parser.add_argument("--include-trends", action="store_true",
                                help="Include trend analysis")
    prod_swarm_parser.add_argument("--benchmark", action="store_true",
                                help="Run in benchmark mode")
    prod_swarm_parser.add_argument("--output-format", choices=["json", "summary"],
                                default="summary", help="Output format")
    prod_swarm_parser.add_argument("--save", help="Save report to file")
    
    # coverage subcommand (new default)
    coverage_parser = subparsers.add_parser("coverage", help="Analyze general coverage")
    coverage_parser.add_argument("--circle", help="Target circle")
    coverage_parser.add_argument("--output-format", choices=["json", "summary"],
                                default="summary", help="Output format")
    
    args = parser.parse_args()
    
    # Handle global flags
    if args.json:
        if hasattr(args, 'output_format'):
            args.output_format = 'json'
    
    # Default to coverage command if none specified but args present
    if not args.command:
        # If we have arguments but no command, assume coverage or help
        if len(sys.argv) > 1 and not sys.argv[1].startswith('-'):
             parser.print_help()
             return 1
        # Default behavior? For now print help
        parser.print_help()
        return 1
    
    # Initialize CLI
    cli = TierDepthCoverageCLI(project_root)
    
    # Run appropriate analysis
    if args.command == "prod-cycle":
        result = cli.analyze_prod_cycle_coverage(args)
    elif args.command == "prod-swarm":
        result = cli.analyze_prod_swarm_coverage(args)
    else:
        print(f"Unknown command: {args.command}")
        return 1
    
    # Generate and output report
    report = cli.generate_report(result, args.output_format)
    print(report)
    
    # Save to file if requested
    if args.save:
        save_path = project_root / args.save
        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, 'w') as f:
            f.write(report)
        print(f"Report saved to: {save_path}")
    
    return 0 if "error" not in result else 1


if __name__ == "__main__":
    sys.exit(main())