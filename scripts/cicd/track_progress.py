#!/usr/bin/env python3
import os
import json
import yaml
from pathlib import Path

def calculate_metrics(root_path=None):
    # Detect project root
    if root_path is None:
        script_dir = Path(__file__).resolve().parent
        root = script_dir.parent.parent
    else:
        root = Path(root_path)
    
    # 1. Domains completed (out of 5)
    domains = [
        "src/billing",
        "src/identity",
        "src/jobs",
        "src/calculation",
        "src/rust/eventops_pyo3"
    ]
    domains_completed = 0
    for d in domains:
        d_path = root / d
        if d_path.exists():
            domains_completed += 1
            
    # Calculate DDD progress percentage (decimal %.1f precision)
    ddd_progress = float(domains_completed) * 100.0 / 5.0
    
    # 2. Active Agents (from .claude-flow/agents/store.json)
    store_path = root / ".claude-flow/agents/store.json"
    active_agents = 0
    if store_path.exists():
        try:
            with open(store_path, "r") as f:
                store_data = json.load(f)
            active_agents = len(store_data.get("agents", {}))
        except Exception:
            active_agents = 0
            
    # 3. CVE fixes (from ROAM_TRACKER_COG.yaml)
    roam_path = root / ".goalie/ROAM_TRACKER_COG.yaml"
    cves_fixed = 0
    cve_risk_ids = {"R01", "R04", "R13"}
    if roam_path.exists():
        try:
            with open(roam_path, "r") as f:
                roam_data = yaml.safe_load(f)
            risks = roam_data.get("risks", [])
            for r in risks:
                if r.get("id") in cve_risk_ids and r.get("status") == "mitigated":
                    cves_fixed += 1
        except Exception:
            cves_fixed = 0
            
    status = "CLEAN" if cves_fixed == 3 else "PENDING"
    
    # 4. Inbox Zero (from INBOX_ZERO_SAFLA_BOARD.yaml)
    inbox_path = root / ".goalie/INBOX_ZERO_SAFLA_BOARD.yaml"
    inbox_completed = 0
    inbox_total = 0
    inbox_progress = 0.0
    if inbox_path.exists():
        try:
            with open(inbox_path, "r") as f:
                inbox_data = yaml.safe_load(f)
            if isinstance(inbox_data, dict):
                items = []
                retros = inbox_data.get("retrospective_insights")
                if isinstance(retros, list):
                    items.extend(retros)
                refinement = inbox_data.get("refinement_queue")
                if isinstance(refinement, list):
                    items.extend(refinement)
                backlog = inbox_data.get("backlog")
                if isinstance(backlog, dict):
                    for key in ["now", "next", "later"]:
                        lst = backlog.get(key)
                        if isinstance(lst, list):
                            items.extend(lst)
                in_progress_list = inbox_data.get("in_progress")
                if isinstance(in_progress_list, list):
                    items.extend(in_progress_list)
                
                inbox_total = len(items)
                done_statuses = {"done", "completed", "closed", "mitigated"}
                for item in items:
                    if isinstance(item, dict):
                        status_val = str(item.get("status", "")).lower()
                        if status_val in done_statuses:
                            inbox_completed += 1
                if inbox_total > 0:
                    inbox_progress = float(inbox_completed) * 100.0 / float(inbox_total)
        except Exception:
            inbox_completed = 0
            inbox_total = 0
            inbox_progress = 0.0

    # Ensure directories exist
    metrics_dir = root / ".claude-flow/metrics"
    security_dir = root / ".claude-flow/security"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    security_dir.mkdir(parents=True, exist_ok=True)
    
    # Write v3-progress.json
    progress_data = {
        "domains": {
            "completed": domains_completed,
            "total": 5
        },
        "ddd": {
            "progress": ddd_progress
        },
        "swarm": {
            "activeAgents": active_agents,
            "maxAgents": 15
        },
        "inbox": {
            "completed": inbox_completed,
            "total": inbox_total
        },
        "zero": {
            "progress": inbox_progress
        }
    }
    with open(metrics_dir / "v3-progress.json", "w") as f:
        json.dump(progress_data, f, indent=2)
        f.write("\n")
        
    # Write audit-status.json
    security_data = {
        "status": status,
        "cvesFixed": cves_fixed,
        "totalCves": 3
    }
    with open(security_dir / "audit-status.json", "w") as f:
        json.dump(security_data, f, indent=2)
        f.write("\n")
        
    print(f"Metrics successfully updated:")
    print(f"  DDD Domains: {ddd_progress:.1f}% ({domains_completed}/5)")
    print(f"  Swarm Agents: {active_agents}/15")
    print(f"  CVE Fixes: {cves_fixed}/3 (Status: {status})")
    print(f"  Inbox Zero: {inbox_progress:.1f}% ({inbox_completed}/{inbox_total})")

if __name__ == "__main__":
    calculate_metrics()
