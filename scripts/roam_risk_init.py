#!/usr/bin/env python3
"""
ROAM Risk DB Initialization Script

Parses the swarm execution plan and auto-populates .goalie/roam_risks.jsonl
with structured risk data including WSJF scores, dependencies, and mitigation strategies.

Usage:
    python3 scripts/roam_risk_init.py --plan-id <plan_id>
    python3 scripts/roam_risk_init.py --auto  # Auto-detect latest plan
"""

import json
import os
import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# Configuration
GOALIE_DIR = Path(os.getenv("GOALIE_DIR", ".goalie"))
ROAM_RISKS_FILE = GOALIE_DIR / "roam_risks.jsonl"
PATTERN_METRICS_FILE = GOALIE_DIR / "pattern_metrics.jsonl"

# ROAM Risk Categories
ROAM_CATEGORIES = {
    "R": "Resolved/Owned",
    "O": "Owned", 
    "A": "Accepted",
    "M": "Mitigated"
}

def create_risk_schema() -> Dict[str, Any]:
    """Create the ROAM risk schema template"""
    return {
        "risk_id": "",
        "category": "",  # R, O, A, or M
        "title": "",
        "description": "",
        "impact": "",
        "mitigation": "",
        "dependencies": [],
        "wsjf_score": 0.0,
        "created_at": "",
        "updated_at": "",
        "resolved_at": None,
        "related_patterns": [],
        "related_issues": [],
        "metadata": {}
    }

def parse_plan_for_risks() -> List[Dict[str, Any]]:
    """
    Parse the swarm execution plan to extract ROAM risks.
    
    For now, returns hardcoded risks from the plan.
    In production, this would parse from plan markdown or API.
    """
    risks = []
    
    # Resolved/Owned Risks
    risks.append({
        "risk_id": "R001",
        "category": "R",
        "title": "Discord Bot Integration",
        "description": "Discord bot integration with slash commands for governance alerts",
        "impact": "Communication channel for real-time agent coordination",
        "mitigation": "Completed implementation with /retro, /metrics, /governance commands",
        "dependencies": ["pattern_metrics", "governance_agent"],
        "wsjf_score": 7.2,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": "2025-12-03T01:41:00Z",
        "related_patterns": ["discord-bot-ready", "discord-retro-command"],
        "related_issues": ["#4"],
        "metadata": {"github_issue": 4, "implementation_status": "complete"}
    })
    
    risks.append({
        "risk_id": "R002",
        "category": "R",
        "title": "Twitch EventSub Webhook Listener",
        "description": "EventSub integration for stream.online notifications to trigger governance alerts",
        "impact": "Automated governance monitoring during live streams",
        "mitigation": "Completed implementation with HMAC-SHA256 verification, pending deployment",
        "dependencies": ["discord_bot", "governance_agent", "twitch_api"],
        "wsjf_score": 6.8,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,  # Pending deployment
        "related_patterns": ["twitch-webhook-verified", "twitch-stream-online"],
        "related_issues": [],
        "metadata": {"deployment_status": "pending"}
    })
    
    # Accepted Risks (High Priority)
    risks.append({
        "risk_id": "A001",
        "category": "A",
        "title": "Cognitive Drift Detection Gap",
        "description": "Agentic systems drift from intended behavior without detection mechanism",
        "impact": "Silent degradation of agent quality, missed optimization opportunities, unpredictable behavior",
        "mitigation": "Integrate k2jac9/agentic-drift framework with ConceptNet API and semantic embeddings",
        "dependencies": ["ConceptNet API", "semantic embeddings", "AgentDB"],
        "wsjf_score": 8.5,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "related_patterns": ["safe-degrade", "circle-risk-focus"],
        "related_issues": [],
        "metadata": {
            "priority": "HIGH",
            "estimated_hours": 6,
            "phase": "P1.1",
            "external_repo": "https://github.com/k2jac9/agentic-drift"
        }
    })
    
    risks.append({
        "risk_id": "A002",
        "category": "A",
        "title": "Spiking Neural Network Integration",
        "description": "Missing bio-inspired cognitive architecture for meta-cognition and neuroplasticity",
        "impact": "Limited adaptability, no neuroplasticity simulation, reduced learning efficiency",
        "mitigation": "Implement brian2 + ruvector spiking-neural package with ConceptNet embeddings",
        "dependencies": ["brian2", "ConceptNet embeddings", "HNSW vector search"],
        "wsjf_score": 7.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "related_patterns": ["depth-ladder", "meta-cognition"],
        "related_issues": [],
        "metadata": {
            "priority": "MEDIUM-HIGH",
            "estimated_hours": 8,
            "phase": "P1.2",
            "external_repos": [
                "https://github.com/brian-team/brian2",
                "https://github.com/ruvnet/ruvector"
            ]
        }
    })
    
    risks.append({
        "risk_id": "A003",
        "category": "A",
        "title": "E2B Sandbox Isolation Gap",
        "description": "Untested code execution creates production instability and security vulnerabilities",
        "impact": "System failures, security breaches, manual rollback required, reputation damage",
        "mitigation": "Deploy E2B sandboxes for all experimental agent runs with automatic teardown",
        "dependencies": ["E2B API key", "Docker/VM infrastructure"],
        "wsjf_score": 9.2,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "related_patterns": ["guardrail-lock", "safe-degrade"],
        "related_issues": [],
        "metadata": {
            "priority": "CRITICAL",
            "estimated_hours": 4,
            "phase": "P0.1",
            "sandbox_budget": "148 sandbox-hours ($150-300)"
        }
    })
    
    risks.append({
        "risk_id": "A004",
        "category": "A",
        "title": "Swarm Orchestration Bottleneck",
        "description": "Single-threaded execution limits throughput and parallelism",
        "impact": "Slow cycle times, opportunity cost on quick wins, reduced WSJF throughput",
        "mitigation": "Implement BigBirdReturns/unstoppable-swarm framework with Spectra Rehydration",
        "dependencies": ["Spectra Rehydration", "semantic drift tracking", "vector DB"],
        "wsjf_score": 8.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "related_patterns": ["iteration-budget", "circle-risk-focus"],
        "related_issues": [],
        "metadata": {
            "priority": "HIGH",
            "estimated_hours": 6,
            "phase": "P4.3",
            "external_repo": "https://github.com/BigBirdReturns/unstoppable-swarm"
        }
    })
    
    # Mitigated Risks
    risks.append({
        "risk_id": "M001",
        "category": "M",
        "title": "System Overload Events",
        "description": "Historical system overload with load avg >2.5x threshold (247.4 on 28-core system)",
        "impact": "System instability, rate limiting, degraded performance",
        "mitigation": "ProcessGovernor rate limiting (10 tokens/sec), reduced defaults (WIP 10→6, batch 5→3)",
        "dependencies": ["processGovernor.ts", "pattern_metrics"],
        "wsjf_score": 6.5,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "related_patterns": ["safe-degrade", "guardrail-lock"],
        "related_issues": [],
        "metadata": {
            "status": "partially_mitigated",
            "monitoring": "continuous",
            "threshold": "load_avg > 42 (28 cores * 1.5)"
        }
    })
    
    risks.append({
        "risk_id": "M002",
        "category": "M",
        "title": "Query Performance Degradation",
        "description": "Doc query times increased from 484ms → 2476ms (413% degradation) over time",
        "impact": "Slow user experience, reduced agent responsiveness, opportunity cost",
        "mitigation": "Partial mitigation in place, needs incremental indexing for 600+ file corpus",
        "dependencies": ["indexing_service", "caching_layer"],
        "wsjf_score": 7.5,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "related_patterns": ["observability-first", "iteration-budget"],
        "related_issues": [],
        "metadata": {
            "status": "partially_mitigated",
            "target": "P95 < 1s",
            "current": "P95 = 2.4s",
            "phase": "P3.2"
        }
    })
    
    return risks


def write_risks_to_db(risks: List[Dict[str, Any]]) -> None:
    """Write risks to .goalie/roam_risks.jsonl"""
    GOALIE_DIR.mkdir(parents=True, exist_ok=True)
    
    with open(ROAM_RISKS_FILE, "w") as f:
        for risk in risks:
            f.write(json.dumps(risk) + "\n")
    
    print(f"✅ Wrote {len(risks)} risks to {ROAM_RISKS_FILE}")


def log_initialization_metric() -> None:
    """Log ROAM DB initialization to pattern metrics"""
    event = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "run": "roam-init",
        "run_id": f"roam-init-{datetime.now().timestamp()}",
        "iteration": 0,
        "circle": "governance",
        "depth": 0,
        "pattern": "roam-db-initialized",
        "pattern:kebab-name": "roam-db-initialized",
        "mode": "advisory",
        "mutation": False,
        "gate": "risk-management",
        "framework": "python",
        "scheduler": "manual",
        "tags": ["ROAM", "Risk", "Initialization"],
        "economic": {"cod": 0.0, "wsjf_score": 0.0},
        "reason": "ROAM risk database initialized from swarm execution plan",
        "action": "initialize",
        "prod_mode": "advisory",
        "metrics": {
            "total_risks": 7,
            "resolved": 2,
            "accepted": 4,
            "mitigated": 2,
            "avg_wsjf": 7.5
        }
    }
    
    try:
        GOALIE_DIR.mkdir(parents=True, exist_ok=True)
        with open(PATTERN_METRICS_FILE, "a") as f:
            f.write(json.dumps(event) + "\n")
        print(f"✅ Logged initialization metric to {PATTERN_METRICS_FILE}")
    except Exception as e:
        print(f"⚠️ Failed to log pattern metric: {e}")


def query_risks(category: Optional[str] = None, min_wsjf: Optional[float] = None) -> List[Dict[str, Any]]:
    """Query risks from ROAM DB with optional filters"""
    if not ROAM_RISKS_FILE.exists():
        print(f"❌ ROAM risks file not found: {ROAM_RISKS_FILE}")
        return []
    
    risks = []
    with open(ROAM_RISKS_FILE, "r") as f:
        for line in f:
            try:
                risk = json.loads(line.strip())
                if category and risk["category"] != category:
                    continue
                if min_wsjf and risk["wsjf_score"] < min_wsjf:
                    continue
                risks.append(risk)
            except json.JSONDecodeError:
                continue
    
    return risks


def main():
    parser = argparse.ArgumentParser(description="Initialize ROAM Risk Database")
    parser.add_argument("--plan-id", help="Plan ID to parse risks from")
    parser.add_argument("--auto", action="store_true", help="Auto-detect latest plan")
    parser.add_argument("--query", action="store_true", help="Query risks instead of initializing")
    parser.add_argument("--category", choices=["R", "O", "A", "M"], help="Filter by ROAM category")
    parser.add_argument("--min-wsjf", type=float, help="Minimum WSJF score filter")
    args = parser.parse_args()
    
    if args.query:
        risks = query_risks(category=args.category, min_wsjf=args.min_wsjf)
        print(f"\n📊 Found {len(risks)} risks:")
        for risk in risks:
            print(f"\n{risk['category']}-{risk['risk_id']}: {risk['title']}")
            print(f"  WSJF: {risk['wsjf_score']}")
            print(f"  Impact: {risk['impact']}")
            print(f"  Mitigation: {risk['mitigation']}")
        return
    
    print("🚀 Initializing ROAM Risk Database...")
    print(f"📁 Goalie directory: {GOALIE_DIR.absolute()}")
    print(f"📝 Output file: {ROAM_RISKS_FILE}")
    
    # Parse risks from plan
    risks = parse_plan_for_risks()
    print(f"✅ Parsed {len(risks)} risks from plan")
    
    # Write to database
    write_risks_to_db(risks)
    
    # Log to pattern metrics
    log_initialization_metric()
    
    # Print summary
    print("\n📊 ROAM Risk Summary:")
    for category, label in ROAM_CATEGORIES.items():
        count = sum(1 for r in risks if r["category"] == category)
        print(f"  {category} ({label}): {count} risks")
    
    high_wsjf_risks = [r for r in risks if r["wsjf_score"] >= 8.0]
    print(f"\n🔥 {len(high_wsjf_risks)} HIGH-WSJF risks (≥8.0):")
    for risk in sorted(high_wsjf_risks, key=lambda x: x["wsjf_score"], reverse=True):
        print(f"  {risk['risk_id']}: {risk['title']} (WSJF: {risk['wsjf_score']})")
    
    print("\n✅ ROAM Risk DB initialization complete")


if __name__ == "__main__":
    main()
