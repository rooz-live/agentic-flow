#!/usr/bin/env python3
"""
Extract Purpose/Domains/Accountability from Holacracy circle structures.
Maps operational roles to YAML schema for WSJF/COD integration.

Usage:
    python3 tools/federation/extract_pda.py --circle analyst --output .goalie/circles/analyst_pda.yaml
    python3 tools/federation/extract_pda.py --all --output-dir .goalie/circles/
"""

import os
import sys
import glob
import json
import yaml
import argparse
from pathlib import Path
from typing import Dict, List, Optional

PROJECT_ROOT = Path(__file__).parent.parent.parent
CIRCLES_ROOT = PROJECT_ROOT / "circles"


def extract_role_pda(role_path: Path) -> Dict[str, any]:
    """Extract P/D/A from a single role directory"""
    pda = {
        "role_name": role_path.name,
        "purpose": "",
        "domains": [],
        "accountabilities": [],
        "mandate": "",
        "metrics": {},
        "replenishment_trigger": "",
        "forensic_verification": ""
    }
    
    # Extract Purpose
    purpose_file = role_path / "purpose.md"
    if purpose_file.exists():
        content = purpose_file.read_text()
        # Parse structured purpose (Mandate, Metrics, etc.)
        if "## Mandate" in content:
            pda["mandate"] = content.split("## Mandate")[1].split("##")[0].strip()
        if "## Metric Ownership" in content:
            metrics_section = content.split("## Metric Ownership")[1].split("##")[0].strip()
            # Parse metrics like "- **Experiments/Sprint**: > 3"
            for line in metrics_section.split("\n"):
                if "**" in line:
                    metric_name = line.split("**")[1].split("**")[0]
                    metric_value = line.split(":")[-1].strip()
                    pda["metrics"][metric_name] = metric_value
        if "## Replenishment Trigger" in content:
            pda["replenishment_trigger"] = content.split("## Replenishment Trigger")[1].split("##")[0].strip()
        if "## Forensic Verification" in content or "DoD" in content:
            pda["forensic_verification"] = content.split("## Forensic Verification")[1].split("##")[0].strip() if "## Forensic Verification" in content else ""
        
        # Fallback: first paragraph as purpose
        if not pda["mandate"]:
            pda["purpose"] = content.split("\n\n")[1] if len(content.split("\n\n")) > 1 else content
    
    # Extract Domains
    domains_file = role_path / "domains.md"
    if domains_file.exists():
        content = domains_file.read_text()
        # Extract bullet points
        for line in content.split("\n"):
            if line.strip().startswith("-"):
                domain = line.strip().lstrip("-").strip()
                if domain and domain != "[List domains]":
                    pda["domains"].append(domain)
    
    # Extract Accountabilities
    accountabilities_file = role_path / "accountabilities.md"
    if accountabilities_file.exists():
        content = accountabilities_file.read_text()
        for line in content.split("\n"):
            if line.strip().startswith("-"):
                accountability = line.strip().lstrip("-").strip()
                if accountability and accountability != "[List accountabilities]":
                    pda["accountabilities"].append(accountability)
    
    return pda


def extract_circle_pda(circle_name: str) -> Dict[str, any]:
    """Extract P/D/A for entire circle"""
    circle_path = CIRCLES_ROOT / circle_name
    operational_dirs = list(circle_path.glob("operational-*-roles"))
    
    if not operational_dirs:
        return {"error": f"No operational roles found for {circle_name}"}
    
    operational_dir = operational_dirs[0]
    
    circle_pda = {
        "circle": circle_name.capitalize(),
        "operational_roles": {},
        "role_families": []
    }
    
    # Get all role family directories (Analyst, Owner, Synthesizer, etc.)
    role_families = [d for d in operational_dir.iterdir() if d.is_dir()]
    
    for family_dir in role_families:
        family_name = family_dir.name
        circle_pda["role_families"].append(family_name)
        
        # Check if family has a generic purpose.md (e.g., Analyst/purpose.md)
        if (family_dir / "purpose.md").exists():
            family_pda = extract_role_pda(family_dir)
            circle_pda["operational_roles"][family_name] = family_pda
        
        # Check for specialized roles (e.g., Analyst/Risk & Compliance Analyst)
        specialized_roles = [d for d in family_dir.iterdir() if d.is_dir()]
        for role_dir in specialized_roles:
            if (role_dir / "purpose.md").exists():
                role_pda = extract_role_pda(role_dir)
                circle_pda["operational_roles"][f"{family_name}/{role_dir.name}"] = role_pda
    
    return circle_pda


def main():
    parser = argparse.ArgumentParser(description="Extract Holacracy P/D/A to YAML")
    parser.add_argument("--circle", help="Circle name (analyst, assessor, etc.)")
    parser.add_argument("--all", action="store_true", help="Extract all circles")
    parser.add_argument("--output", help="Output YAML file")
    parser.add_argument("--output-dir", help="Output directory for --all mode")
    parser.add_argument("--json", action="store_true", help="Output as JSON instead of YAML")
    
    args = parser.parse_args()
    
    if not args.circle and not args.all:
        parser.error("Either --circle or --all is required")
    
    if args.all:
        output_dir = Path(args.output_dir) if args.output_dir else PROJECT_ROOT / ".goalie" / "circles"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        circle_names = ["analyst", "assessor", "innovator", "intuitive", "orchestrator", "seeker"]
        
        for circle_name in circle_names:
            print(f"Extracting {circle_name}...")
            circle_pda = extract_circle_pda(circle_name)
            
            ext = ".json" if args.json else ".yaml"
            output_file = output_dir / f"{circle_name}_pda{ext}"
            
            with open(output_file, "w") as f:
                if args.json:
                    json.dump(circle_pda, f, indent=2)
                else:
                    yaml.safe_dump(circle_pda, f, default_flow_style=False, sort_keys=False)
            
            print(f"✅ Written: {output_file}")
    
    else:
        circle_pda = extract_circle_pda(args.circle)
        
        if args.output:
            output_file = Path(args.output)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, "w") as f:
                if args.json:
                    json.dump(circle_pda, f, indent=2)
                else:
                    yaml.safe_dump(circle_pda, f, default_flow_style=False, sort_keys=False)
            
            print(f"✅ Written: {output_file}")
        else:
            # Print to stdout
            if args.json:
                print(json.dumps(circle_pda, indent=2))
            else:
                print(yaml.safe_dump(circle_pda, default_flow_style=False, sort_keys=False))


if __name__ == "__main__":
    main()
