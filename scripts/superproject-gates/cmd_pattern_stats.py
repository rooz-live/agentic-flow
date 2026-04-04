#!/usr/bin/env python3
"""
Pattern Statistics Command
Enhanced with comprehensive pattern analysis tools for code-fix-proposal failure reduction
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

def get_goalie_dir() -> Path:
    """Get .goalie directory path"""
    project_root = os.environ.get("PROJECT_ROOT", ".")
    return Path(project_root) / ".goalie"

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Enhanced Pattern Statistics Command")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--pattern", default="code-fix-proposal", help="Pattern to analyze")
    parser.add_argument("--analysis-type", choices=["basic", "root-cause", "failure-tracking", "filtering", "remediation"], 
                       default="basic", help="Type of analysis to perform")
    parser.add_argument("--input-file", help="Input pattern metrics file")
    parser.add_argument("--hours", type=int, help="Limit to events in last N hours")
    
    # Analysis-specific arguments
    parser.add_argument("--method", choices=["5whys", "fishbone"], help="Root cause analysis method")
    parser.add_argument("--event-id", help="Specific event ID for analysis")
    parser.add_argument("--limit", type=int, help="Limit number of events to analyze")
    parser.add_argument("--export-plan", help="Export implementation plan to file")
    parser.add_argument("--alerts", action="store_true", help="Enable failure alerts")
    
    # Filtering arguments
    parser.add_argument("--patterns", help="Comma-separated list of patterns")
    parser.add_argument("--circles", help="Comma-separated list of circles")
    parser.add_argument("--min-wsjf", type=float, help="Minimum WSJF score")
    parser.add_argument("--max-wsjf", type=float, help="Maximum WSJF score")
    parser.add_argument("--status", help="Comma-separated list of status values")
    parser.add_argument("--include-tags", help="Comma-separated list of tags to include")
    parser.add_argument("--exclude-tags", help="Comma-separated list of tags to exclude")
    
    args = parser.parse_args()
    
    # Import and run the appropriate analysis tool
    script_dir = Path(__file__).parent
    
    if args.analysis_type == "basic":
        # Use existing enhanced pattern stats
        cmd_path = script_dir / "investing" / "agentic-flow" / "scripts" / "cmd_pattern_stats_enhanced.py"
        if cmd_path.exists():
            import subprocess
            cmd = ["python3", str(cmd_path)]
            
            # Add common arguments
            if args.json:
                cmd.append("--json")
            if args.pattern:
                cmd.extend(["--pattern", args.pattern])
            if args.hours:
                cmd.extend(["--hours", str(args.hours)])
            if args.input_file:
                cmd.extend(["--input-file", args.input_file])
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True)
                print(result.stdout)
                if result.stderr:
                    print(result.stderr, file=sys.stderr)
                    sys.exit(1)
            except Exception as e:
                print(f"Error running pattern analysis: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print("Enhanced pattern stats script not found", file=sys.stderr)
            sys.exit(1)
    
    elif args.analysis_type == "root-cause":
        # Use root cause analyzer
        cmd_path = script_dir / "agentic" / "root_cause_analyzer.py"
        if cmd_path.exists():
            import subprocess
            cmd = ["python3", str(cmd_path)]
            
            # Add arguments
            if args.json:
                cmd.append("--json")
            if args.pattern:
                cmd.extend(["--pattern", args.pattern])
            if args.input_file:
                cmd.extend(["--input-file", args.input_file])
            if args.method:
                cmd.extend(["--method", args.method])
            if args.event_id:
                cmd.extend(["--event-id", args.event_id])
            if args.limit:
                cmd.extend(["--limit", str(args.limit)])
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True)
                print(result.stdout)
                if result.stderr:
                    print(result.stderr, file=sys.stderr)
                    sys.exit(1)
            except Exception as e:
                print(f"Error running root cause analysis: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print("Root cause analyzer script not found", file=sys.stderr)
            sys.exit(1)
    
    elif args.analysis_type == "failure-tracking":
        # Use failure tracker
        cmd_path = script_dir / "agentic" / "failure_tracker.py"
        if cmd_path.exists():
            import subprocess
            cmd = ["python3", str(cmd_path)]
            
            # Add arguments
            if args.json:
                cmd.append("--json")
            if args.pattern:
                cmd.extend(["--pattern", args.pattern])
            if args.input_file:
                cmd.extend(["--input-file", args.input_file])
            if args.hours:
                cmd.extend(["--hours", str(args.hours)])
            if args.alerts:  # Add alerts flag
                cmd.append("--alerts")
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True)
                print(result.stdout)
                if result.stderr:
                    print(result.stderr, file=sys.stderr)
                    sys.exit(1)
            except Exception as e:
                print(f"Error running failure tracking: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print("Failure tracker script not found", file=sys.stderr)
            sys.exit(1)
    
    elif args.analysis_type == "filtering":
        # Use pattern metrics filter
        cmd_path = script_dir / "agentic" / "pattern_metrics_filter.py"
        if cmd_path.exists():
            import subprocess
            cmd = ["python3", str(cmd_path)]
            
            # Add arguments
            if args.json:
                cmd.append("--json")
            if args.pattern:
                cmd.extend(["--pattern", args.pattern])
            if args.input_file:
                cmd.extend(["--input-file", args.input_file])
            if args.hours:
                cmd.extend(["--hours", str(args.hours)])
            if args.patterns:
                cmd.extend(["--patterns", args.patterns])
            if args.circles:
                cmd.extend(["--circles", args.circles])
            if args.min_wsjf:
                cmd.extend(["--min-wsjf", str(args.min_wsjf)])
            if args.max_wsjf:
                cmd.extend(["--max-wsjf", str(args.max_wsjf)])
            if args.status:
                cmd.extend(["--status", args.status])
            if args.include_tags:
                cmd.extend(["--include-tags", args.include_tags])
            if args.exclude_tags:
                cmd.extend(["--exclude-tags", args.exclude_tags])
            if args.limit:
                cmd.extend(["--limit", str(args.limit)])
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True)
                print(result.stdout)
                if result.stderr:
                    print(result.stderr, file=sys.stderr)
                    sys.exit(1)
            except Exception as e:
                print(f"Error running pattern filtering: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print("Pattern metrics filter script not found", file=sys.stderr)
            sys.exit(1)
    
    elif args.analysis_type == "remediation":
        # Use remediation recommender
        cmd_path = script_dir / "agentic" / "remediation_recommender.py"
        if cmd_path.exists():
            import subprocess
            cmd = ["python3", str(cmd_path)]
            
            # Add arguments
            if args.json:
                cmd.append("--json")
            if args.pattern:
                cmd.extend(["--pattern", args.pattern])
            if args.input_file:
                cmd.extend(["--input-file", args.input_file])
            if args.export_plan:
                cmd.extend(["--export-plan", args.export_plan])
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True)
                print(result.stdout)
                if result.stderr:
                    print(result.stderr, file=sys.stderr)
                    sys.exit(1)
            except Exception as e:
                print(f"Error running remediation analysis: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print("Remediation recommender script not found", file=sys.stderr)
            sys.exit(1)
    
    else:
        # Default to basic analysis
        cmd_path = script_dir / "investing" / "agentic-flow" / "scripts" / "cmd_pattern_stats_enhanced.py"
        if cmd_path.exists():
            import subprocess
            cmd = ["python3", str(cmd_path)]
            
            # Add common arguments
            if args.json:
                cmd.append("--json")
            if args.pattern:
                cmd.extend(["--pattern", args.pattern])
            if args.hours:
                cmd.extend(["--hours", str(args.hours)])
            if args.input_file:
                cmd.extend(["--input-file", args.input_file])
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True)
                print(result.stdout)
                if result.stderr:
                    print(result.stderr, file=sys.stderr)
                    sys.exit(1)
            except Exception as e:
                print(f"Error running pattern analysis: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print("Enhanced pattern stats script not found", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()