#!/usr/bin/env python3
"""
Governance Integration Helper
Bridges Python (prod-cycle) with TypeScript governance tools (governance_agent.ts, retro_coach.ts)
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List


def get_project_root() -> Path:
    """Get the project root directory"""
    return Path(os.environ.get("PROJECT_ROOT", Path(__file__).parent.parent.parent))


def get_goalie_dir() -> Path:
    """Get the .goalie directory path"""
    return get_project_root() / ".goalie"


def run_typescript_tool(
    tool_path: str,
    args: List[str] = None,
    env_vars: Dict[str, str] = None,
    capture_json: bool = True
) -> Dict[str, Any]:
    """
    Execute a TypeScript tool via npx tsx and capture output
    
    Args:
        tool_path: Path to the TypeScript file
        args: Command line arguments
        env_vars: Additional environment variables
        capture_json: Whether to parse JSON output
        
    Returns:
        Dict containing stdout, stderr, exit_code, and parsed json (if capture_json=True)
    """
    project_root = get_project_root()
    goalie_dir = get_goalie_dir()
    
    # Build command
    cmd = ["npx", "tsx", tool_path]
    if args:
        cmd.extend(args)
    
    # Merge environment variables
    env = os.environ.copy()
    if env_vars:
        env.update(env_vars)
    
    # Ensure goalie dir is set
    env["GOALIE_DIR"] = str(goalie_dir)
    
    try:
        result = subprocess.run(
            cmd,
            cwd=str(project_root),
            env=env,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        output = {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
            "success": result.returncode == 0
        }
        
        # Parse JSON output if requested
        if capture_json and result.stdout.strip():
            try:
                output["data"] = json.loads(result.stdout)
            except json.JSONDecodeError as e:
                output["json_error"] = str(e)
                output["data"] = None
        
        return output
        
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "Tool execution timed out after 60 seconds",
            "exit_code": -1,
            "success": False,
            "error": "timeout"
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "exit_code": -1,
            "success": False,
            "error": str(e)
        }


def run_governance_agent(
    run_id: str,
    run_kind: str = "prod-cycle",
    circle: Optional[str] = None,
    depth: int = 0,
    json_output: bool = True
) -> Dict[str, Any]:
    """
    Run governance_agent.ts with appropriate environment
    
    Args:
        run_id: Unique run identifier
        run_kind: Type of run (prod-cycle, full-cycle, etc.)
        circle: Active circle
        depth: Current depth level
        json_output: Whether to request JSON output
        
    Returns:
        Dict containing governance analysis results
    """
    project_root = get_project_root()
    tool_path = str(project_root / "tools" / "federation" / "governance_agent.ts")
    
    args = ["--goalie-dir", str(get_goalie_dir())]
    if json_output:
        args.append("--json")
    
    env_vars = {
        "AF_RUN_ID": run_id,
        "AF_RUN_KIND": run_kind,
        "AF_CONTEXT": run_kind,
        "AF_DEPTH_LEVEL": str(depth),
    }
    
    if circle:
        env_vars["AF_CIRCLE"] = circle
    
    return run_typescript_tool(tool_path, args, env_vars, capture_json=json_output)


def run_retro_coach(
    run_id: str,
    run_kind: str = "prod-cycle",
    json_output: bool = True
) -> Dict[str, Any]:
    """
    Run retro_coach.ts to generate insights
    
    Args:
        run_id: Unique run identifier
        run_kind: Type of run
        json_output: Whether to request JSON output
        
    Returns:
        Dict containing retro insights
    """
    project_root = get_project_root()
    tool_path = str(project_root / "tools" / "federation" / "retro_coach.ts")
    
    args = ["--goalie-dir", str(get_goalie_dir())]
    if json_output:
        args.append("--json")
    
    env_vars = {
        "AF_RUN_ID": run_id,
        "AF_RUN_KIND": run_kind,
    }
    
    return run_typescript_tool(tool_path, args, env_vars, capture_json=json_output)


def save_retro_coach_results(insights: Dict[str, Any]) -> None:
    """Save retro coach insights to .goalie/retro_coach.json"""
    goalie_dir = get_goalie_dir()
    output_file = goalie_dir / "retro_coach.json"
    
    try:
        with open(output_file, 'w') as f:
            json.dump(insights, f, indent=2)
    except Exception as e:
        print(f"[WARN] Failed to save retro_coach.json: {e}", file=sys.stderr)


def print_governance_summary(governance_data: Dict[str, Any]) -> None:
    """Print governance summary to console"""
    if not governance_data or "data" not in governance_data:
        return
    
    data = governance_data.get("data")
    if data is None:
        return
    
    print("\n=== Governance Agent Summary ===")
    
    # Governance reviews
    if data.get("governanceSummary"):
        gov = data["governanceSummary"]
        if gov:
            print(f"Governance Reviews: {gov.get('ok', 0)}/{gov.get('total', 0)} passed")
    
    # Relentless execution
    if "relentlessExecution" in data:
        rel = data["relentlessExecution"]
        print(f"Actions Done: {rel.get('pctActionsDone', 0):.1f}%")
        print(f"Avg Cycle Time: {rel.get('avgCycleTimeSec', 0):.1f}s")
    
    # Top economic gaps
    if "topEconomicGaps" in data:
        gaps = data["topEconomicGaps"][:3]
        if gaps:
            print("\nTop Economic Gaps:")
            for gap in gaps:
                pattern = gap.get("pattern", "unknown")
                impact = gap.get("totalImpactAvg", 0)
                circle = gap.get("circle", "n/a")
                depth = gap.get("depth", 0)
                print(f"  • {pattern} (circle={circle}, depth={depth}): impact≈{impact:.2f}")
    
    # Code fix proposals
    if "codeFixProposals" in data:
        proposals = data["codeFixProposals"]
        if proposals:
            auto_apply = sum(1 for p in proposals if p.get("mode") == "apply")
            total = len(proposals)
            print(f"\nCode Fix Proposals: {total} total, {auto_apply} auto-apply eligible")


def print_retro_insights(retro_data: Dict[str, Any]) -> None:
    """Print retro coach insights to console"""
    if not retro_data or "data" not in retro_data:
        return
    
    data = retro_data["data"]
    
    print("\n=== Retro Coach Insights ===")
    print(f"Analyzed {data.get('total_events', 0)} pattern events")
    
    insights = data.get("insights", [])
    if insights:
        for insight in insights:
            insight_type = insight.get("type", "Unknown")
            message = insight.get("message", "")
            recommendation = insight.get("recommendation", "")
            print(f"[{insight_type}] {message}")
            print(f"  → {recommendation}")
    else:
        print("No insights generated")


if __name__ == "__main__":
    # Simple CLI for testing
    import argparse
    
    parser = argparse.ArgumentParser(description="Run governance tools")
    parser.add_argument("tool", choices=["governance", "retro", "both"])
    parser.add_argument("--run-id", default="test-run")
    parser.add_argument("--circle", default=None)
    parser.add_argument("--depth", type=int, default=0)
    
    args = parser.parse_args()
    
    if args.tool in ["governance", "both"]:
        print("Running governance agent...")
        result = run_governance_agent(
            run_id=args.run_id,
            circle=args.circle,
            depth=args.depth
        )
        
        if result["success"]:
            print_governance_summary(result)
        else:
            print(f"Governance agent failed: {result['stderr']}", file=sys.stderr)
    
    if args.tool in ["retro", "both"]:
        print("\nRunning retro coach...")
        result = run_retro_coach(run_id=args.run_id)
        
        if result["success"]:
            print_retro_insights(result)
            if "data" in result:
                save_retro_coach_results(result["data"])
        else:
            print(f"Retro coach failed: {result['stderr']}", file=sys.stderr)
