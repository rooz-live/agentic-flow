#!/usr/bin/env python3
"""
Unified Consolidated Interface
Single interface for all tools, methods, patterns, protocols, and prototypes.
Manages POC branches with robust CI/CD pipeline integration.
"""

import os
import sys
import json
import subprocess
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger

GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")
CONFIG_DIR = os.path.join(PROJECT_ROOT, "config")

@dataclass
class Tool:
    name: str
    path: str
    description: str
    category: str
    commands: List[str] = field(default_factory=list)

@dataclass  
class MethodPattern:
    name: str
    tier: int
    circles: List[str]
    schema: str
    wsjf_weights: Dict[str, float] = field(default_factory=dict)

@dataclass
class Protocol:
    name: str
    type: str  # governance, testing, deployment
    description: str
    steps: List[str] = field(default_factory=list)

class UnifiedInterface:
    """Consolidated interface for all agentic-flow components."""
    
    def __init__(self, tenant_id: str = "default"):
        self.logger = PatternLogger(
            mode="advisory", circle="unified",
            run_id=f"unified-{int(datetime.now().timestamp())}",
            tenant_id=tenant_id, tenant_platform="agentic-flow-core"
        )
        self.tools = self._load_tools()
        self.patterns = self._load_patterns()
        self.protocols = self._load_protocols()
        self.config = self._load_domain_config()
    
    def _load_tools(self) -> Dict[str, Tool]:
        return {
            # Federation Tools
            "governance-agent": Tool("Governance Agent", "tools/federation/governance_agent.ts",
                "Automated governance with WSJF analysis", "federation",
                ["--json", "--wsjf", "--batch", "--auto"]),
            "retro-coach": Tool("Retro Coach", "tools/federation/retro_coach.ts",
                "Retrospective insights and recommendations", "federation",
                ["--json", "--goalie-dir"]),
            # Circle Scripts
            "wsjf-calculator": Tool("WSJF Calculator", "scripts/circles/wsjf_calculator.py",
                "Calculate and prioritize by WSJF", "circles",
                ["--circle", "--auto-calc-wsjf", "--aggregate", "--apply-weights"]),
            "replenish-manager": Tool("Replenish Manager", "scripts/circles/replenish_manager.py",
                "Replenish circle backlogs from sources", "circles",
                ["--circle", "--source", "--auto-calc-wsjf"]),
            "promote-to-kanban": Tool("Promote to Kanban", "scripts/circles/promote_to_kanban.py",
                "Promote backlog items to Kanban board", "circles",
                ["--dry-run", "--tenant-id"]),
            # Agentic Tools
            "testing-methodology": Tool("Testing Methodology", "scripts/agentic/testing_methodology.py",
                "SFT + RL testing with MGPO", "agentic",
                ["--strategy", "--samples", "--json"]),
            "risk-analytics": Tool("Risk Analytics", "scripts/agentic/risk_analytics.py",
                "Real-time risk monitoring", "agentic", []),
            "inbox-zero": Tool("Inbox Zero", "scripts/agentic/inbox_zero.py",
                "Automated inbox processing", "agentic",
                ["--add", "--stats", "--queue", "--process", "--bulk", "--simulate"]),
            "goap-planner": Tool("GOAP Planner", "scripts/agentic/goap_planner.py",
                "Goal-Oriented Action Planning with dream engine", "agentic",
                ["--plan", "--actions", "--simulate", "--json"]),
            "affiliate-platform": Tool("Affiliate Platform", "scripts/agentic/affiliate_platform.py",
                "Multi-tenant affiliate with Symfony/Oro integration", "agentic",
                ["routes", "tenants", "affiliates", "--json"]),
            "financial-services": Tool("Financial Services", "scripts/agentic/financial_services.py",
                "TradingView/Finviz/IBKR integration", "agentic",
                ["signals", "screener", "quote", "--symbol"]),
            "ai-reasoning": Tool("AI Reasoning", "scripts/agentic/ai_reasoning.py",
                "VibeThinker/Harbor enhanced WSJF", "agentic",
                ["dashboard", "enhance", "budget", "matrix", "prioritize", "--mode"]),
            "retro-replenish": Tool("Retro-Replenish Workflow", "scripts/agentic/retro_replenish_workflow.py",
                "Unified retro → replenish → refine workflow", "agentic",
                ["full", "retro", "replenish", "refine", "--circle", "--json"]),
        }
    
    def _load_patterns(self) -> Dict[str, MethodPattern]:
        return {
            "tier1": MethodPattern("Tier 1 (High Structure)", 1, 
                ["orchestrator", "assessor"],
                "ID | Task | Status | Budget | Pattern | DoR | DoD | CoD | Size | WSJF",
                {"ubv": 1.5, "tc": 1.2, "rr": 1.3}),
            "tier2": MethodPattern("Tier 2 (Medium Structure)", 2,
                ["analyst", "innovator", "seeker"],
                "ID | Task | Status | DoR | DoD | WSJF",
                {"ubv": 1.0, "tc": 1.5, "rr": 1.0}),
            "tier3": MethodPattern("Tier 3 (Flexible)", 3,
                ["intuitive", "facilitator", "scout", "synthesizer"],
                "- [ ] #pattern:X #wsjf:Y Task",
                {"ubv": 1.8, "tc": 1.0, "rr": 1.1}),
        }
    
    def _load_protocols(self) -> Dict[str, Protocol]:
        return {
            "wsjf": Protocol("WSJF Prioritization", "governance",
                "Cost of Delay / Job Duration prioritization",
                ["Calculate CoD (UBV + TC + RR)", "Estimate Job Size", "Compute WSJF", "Rank items"]),
            "sft-rl": Protocol("SFT + RL Testing", "testing",
                "Spectrum Phase (diversity) + Signal Phase (amplification)",
                ["Generate diverse solutions", "Backtest all paths", "Apply MGPO ranking", "Forward test top N"]),
            "ci-cd": Protocol("CI/CD Pipeline", "deployment",
                "Continuous integration and deployment",
                ["Lint/Test", "Build", "Deploy to staging", "Validate", "Deploy to prod"]),
            "inbox-zero": Protocol("Inbox Zero", "workflow",
                "Systematic inbox processing",
                ["Triage by WSJF", "Apply rules", "Process high-priority", "Archive/defer rest"]),
            "goap": Protocol("GOAP Planning", "execution",
                "Goal-Oriented Action Planning with 5 phases",
                ["Define goal state", "Plan actions via A*", "Execute with dream consolidation", "Transfer knowledge"]),
        }
    
    def _load_domain_config(self) -> Dict[str, Any]:
        config_path = os.path.join(CONFIG_DIR, "domain_routing.yaml")
        if os.path.exists(config_path):
            import yaml
            with open(config_path) as f:
                return yaml.safe_load(f) or {}
        return {}
    
    def run_tool(self, tool_name: str, args: List[str] = None) -> Dict[str, Any]:
        """Run a tool with given arguments."""
        tool = self.tools.get(tool_name)
        if not tool:
            return {"error": f"Tool '{tool_name}' not found"}
        
        full_path = os.path.join(PROJECT_ROOT, tool.path)
        if not os.path.exists(full_path):
            return {"error": f"Tool path not found: {full_path}"}
        
        # Determine runner
        if tool.path.endswith('.py'):
            cmd = ["python3", full_path] + (args or [])
        elif tool.path.endswith('.ts'):
            cmd = ["npx", "ts-node", full_path] + (args or [])
        else:
            cmd = [full_path] + (args or [])
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=PROJECT_ROOT, timeout=120)
            self.logger.log("tool_execution", {
                "tool": tool_name, "args": args or [], "exit_code": result.returncode,
                "action": "execute", "tags": ["unified", tool.category]
            }, gate="general")
            return {
                "tool": tool_name, "exit_code": result.returncode,
                "stdout": result.stdout, "stderr": result.stderr
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_status(self) -> Dict[str, Any]:
        """Get unified system status."""
        goalie_exists = os.path.exists(GOALIE_DIR)
        metrics_path = os.path.join(GOALIE_DIR, "pattern_metrics.jsonl")
        metrics_count = 0
        if os.path.exists(metrics_path):
            with open(metrics_path) as f:
                metrics_count = sum(1 for _ in f)
        
        return {
            "goalie_dir": goalie_exists,
            "pattern_metrics_count": metrics_count,
            "tools_available": list(self.tools.keys()),
            "patterns_available": list(self.patterns.keys()),
            "protocols_available": list(self.protocols.keys()),
            "domains_configured": len(self.config.get("platforms", {})),
            "tenants_configured": len(self.config.get("tenants", {})),
            "generated_at": datetime.now().isoformat()
        }
    
    def get_dashboard(self) -> Dict[str, Any]:
        """Get unified dashboard data."""
        status = self.get_status()
        return {
            "status": status,
            "tools": {k: {"name": v.name, "category": v.category, "desc": v.description} 
                     for k, v in self.tools.items()},
            "patterns": {k: {"name": v.name, "tier": v.tier, "circles": v.circles}
                        for k, v in self.patterns.items()},
            "protocols": {k: {"name": v.name, "type": v.type, "steps": len(v.steps)}
                         for k, v in self.protocols.items()},
            "infrastructure": {
                "stx_aio_0": self.config.get("infrastructure", {}).get("stx_aio_0", {}),
                "aws_primary": self.config.get("infrastructure", {}).get("aws_primary", {})
            },
            "ai_services": self.config.get("ai_services", {}),
            "generated_at": datetime.now().isoformat()
        }
    
    def list_poc_branches(self) -> List[Dict[str, str]]:
        """List POC branches from config."""
        github = self.config.get("github", {})
        branches = []
        for name, data in github.get("poc_branches", {}).items():
            branches.append({
                "name": name, "repo": data.get("repo", ""),
                "issues": data.get("issues", []), "prs": data.get("prs", []),
                "releases": data.get("releases", [])
            })
        return branches


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Unified Agentic Flow Interface")
    parser.add_argument("command", nargs="?", default="status",
        choices=["status", "dashboard", "tools", "patterns", "protocols", "branches", "run"])
    parser.add_argument("--tool", help="Tool to run (with 'run' command)")
    parser.add_argument("--args", nargs="*", help="Arguments for tool")
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--tenant-id", default="default")
    args = parser.parse_args()
    
    ui = UnifiedInterface(tenant_id=args.tenant_id)
    
    if args.command == "status":
        result = ui.get_status()
    elif args.command == "dashboard":
        result = ui.get_dashboard()
    elif args.command == "tools":
        result = {k: {"name": v.name, "desc": v.description, "commands": v.commands}
                 for k, v in ui.tools.items()}
    elif args.command == "patterns":
        result = {k: {"name": v.name, "tier": v.tier, "schema": v.schema}
                 for k, v in ui.patterns.items()}
    elif args.command == "protocols":
        result = {k: {"name": v.name, "type": v.type, "steps": v.steps}
                 for k, v in ui.protocols.items()}
    elif args.command == "branches":
        result = ui.list_poc_branches()
    elif args.command == "run" and args.tool:
        result = ui.run_tool(args.tool, args.args)
    else:
        result = {"error": "Invalid command"}
    
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        if args.command == "status":
            print("\n=== Unified Interface Status ===")
            print(f"Goalie Dir: {'✅' if result['goalie_dir'] else '❌'}")
            print(f"Pattern Metrics: {result['pattern_metrics_count']}")
            print(f"Tools: {len(result['tools_available'])}")
            print(f"Patterns: {len(result['patterns_available'])}")
            print(f"Protocols: {len(result['protocols_available'])}")
            print(f"Domains: {result['domains_configured']}")
            print(f"Tenants: {result['tenants_configured']}")
        elif args.command == "tools":
            print("\n=== Available Tools ===")
            for k, v in result.items():
                print(f"  {k}: {v['desc']}")
        elif args.command == "run":
            print(f"\n=== Tool Output: {args.tool} ===")
            if "error" in result:
                print(f"Error: {result['error']}")
            else:
                print(result.get("stdout", ""))
                if result.get("stderr"):
                    print(f"Stderr: {result['stderr']}")
        else:
            print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
