#!/usr/bin/env python3
"""
Pre-Cycle Script Review & Integration Tool

Discovers executable scripts not yet integrated into prod-cycle workflow
and provides recommendations for integration.

Usage: python3 pre_cycle_script_review.py [--suggest-integration] [--json]
"""

import os
import sys
import json
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple
from collections import defaultdict


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
GOALIE_DIR = PROJECT_ROOT / ".goalie"


# Known scripts already integrated into prod-cycle
INTEGRATED_SCRIPTS = {
    "cmd_prod_cycle.py",
    "cmd_full_cycle.py",
    "policy/governance.py",  # run_governance_agent, run_retro_coach
    "circles/replenish_circle.sh",
    "circles/replenish_manager.py",
    "agentic/retro_replenish_workflow.py",
    "cmd_actionable_context.py",
    "circles/wsjf_automation_engine.py",
    "check_wsjf_hygiene.py",
    "agentic/testing_methodology.py",
    "cmd_detect_observability_gaps.py",
    ".goalie/QUICK_ACTIONS.sh",
}


# Script categories for integration recommendations
INTEGRATION_CATEGORIES = {
    "preflight": ["health_check", "validate", "verify", "audit", "check"],
    "setup": ["init", "bootstrap", "setup", "install", "migrate"],
    "iteration": ["execute", "run", "process", "analyze"],
    "teardown": ["cleanup", "finalize", "report", "summarize"],
    "monitoring": ["monitor", "track", "watch", "observe"],
    "maintenance": ["fix", "repair", "update", "sync"],
}


def find_executable_scripts() -> Dict[str, List[Path]]:
    """Find all executable Python and shell scripts."""
    scripts = defaultdict(list)
    
    # Search scripts directory
    for ext in ["*.py", "*.sh"]:
        for script in SCRIPTS_DIR.rglob(ext):
            if script.is_file():
                rel_path = script.relative_to(PROJECT_ROOT)
                scripts["scripts"].append(rel_path)
    
    # Search .goalie directory
    for ext in ["*.py", "*.sh"]:
        for script in GOALIE_DIR.glob(ext):
            if script.is_file():
                rel_path = script.relative_to(PROJECT_ROOT)
                scripts["goalie"].append(rel_path)
    
    return scripts


def has_main_function(script_path: Path) -> bool:
    """Check if script has main entry point."""
    if not script_path.exists():
        return False
    
    try:
        content = script_path.read_text()
        return (
            'if __name__ == "__main__"' in content or
            'if __name__ == \'__main__\'' in content or
            'def main(' in content
        )
    except:
        return False


def extract_docstring(script_path: Path) -> str:
    """Extract first docstring from script."""
    if not script_path.exists():
        return "No description available"
    
    try:
        content = script_path.read_text()
        
        # Match triple-quote docstrings
        match = re.search(r'"""(.*?)"""', content, re.DOTALL)
        if match:
            return match.group(1).strip().split('\n')[0][:100]
        
        match = re.search(r"'''(.*?)'''", content, re.DOTALL)
        if match:
            return match.group(1).strip().split('\n')[0][:100]
        
        # Match shell comments
        if script_path.suffix == '.sh':
            for line in content.split('\n'):
                if line.startswith('# ') and len(line) > 2:
                    return line[2:].strip()[:100]
        
        return "No description available"
    except:
        return "Error reading file"


def categorize_script(script_path: Path) -> str:
    """Categorize script based on name and content."""
    name = script_path.name.lower()
    
    for category, keywords in INTEGRATION_CATEGORIES.items():
        if any(kw in name for kw in keywords):
            return category
    
    return "uncategorized"


def check_if_integrated(script_path: Path) -> bool:
    """Check if script is already integrated into prod-cycle."""
    rel_path = str(script_path.relative_to(PROJECT_ROOT))
    
    # Direct match
    if rel_path in INTEGRATED_SCRIPTS:
        return True
    
    # Check just filename
    if script_path.name in INTEGRATED_SCRIPTS:
        return True
    
    # Check if in prod-cycle code
    prod_cycle = PROJECT_ROOT / "scripts" / "cmd_prod_cycle.py"
    if prod_cycle.exists():
        try:
            content = prod_cycle.read_text()
            if script_path.name in content or rel_path in content:
                return True
        except:
            pass
    
    return False


def analyze_dependencies(script_path: Path) -> List[str]:
    """Extract dependencies from script."""
    deps = []
    
    if not script_path.exists():
        return deps
    
    try:
        content = script_path.read_text()
        
        # Python imports
        for line in content.split('\n'):
            if line.strip().startswith('import ') or line.strip().startswith('from '):
                # Extract first word after import/from
                parts = line.split()
                if len(parts) >= 2:
                    deps.append(parts[1].split('.')[0])
        
    except:
        pass
    
    return list(set(deps))[:10]  # Limit to 10 unique deps


def suggest_integration_point(category: str, script_name: str) -> Tuple[str, str]:
    """Suggest where to integrate script in prod-cycle."""
    suggestions = {
        "preflight": (
            "preflight_checks",
            "Add to preflight_checks_pass() function before iteration loop"
        ),
        "setup": (
            "setup_phase",
            "Run before iteration loop starts, after governance agent"
        ),
        "iteration": (
            "iteration_loop",
            "Run inside iteration loop if needed per cycle"
        ),
        "teardown": (
            "teardown_phase",
            "Run after iteration loop completes, before retro coach"
        ),
        "monitoring": (
            "monitoring",
            "Run as parallel monitoring task or in teardown"
        ),
        "maintenance": (
            "maintenance",
            "Run conditionally (e.g. every 10th cycle) or on-demand"
        ),
    }
    
    return suggestions.get(category, ("uncategorized", "Manual review required"))


def review_scripts() -> Dict:
    """Main review function."""
    print("\n" + "="*70)
    print("🔍 PRE-CYCLE SCRIPT REVIEW")
    print("="*70 + "\n")
    
    all_scripts = find_executable_scripts()
    
    unintegrated = []
    integrated = []
    
    total_scripts = len(all_scripts["scripts"]) + len(all_scripts["goalie"])
    
    print(f"📊 Found {total_scripts} executable scripts\n")
    
    # Process all scripts
    for location, scripts in all_scripts.items():
        for script in scripts:
            full_path = PROJECT_ROOT / script
            
            # Skip if not executable entry point
            if not has_main_function(full_path):
                continue
            
            is_integrated = check_if_integrated(full_path)
            category = categorize_script(full_path)
            description = extract_docstring(full_path)
            deps = analyze_dependencies(full_path)
            
            script_info = {
                "path": str(script),
                "location": location,
                "category": category,
                "description": description,
                "dependencies": deps,
                "integrated": is_integrated
            }
            
            if is_integrated:
                integrated.append(script_info)
            else:
                integration_point, recommendation = suggest_integration_point(
                    category, script.name
                )
                script_info["integration_point"] = integration_point
                script_info["recommendation"] = recommendation
                unintegrated.append(script_info)
    
    # Summary
    print("📈 SUMMARY")
    print(f"   Integrated:     {len(integrated)}")
    print(f"   Unintegrated:   {len(unintegrated)}")
    print(f"   Total analyzed: {len(integrated) + len(unintegrated)}")
    print()
    
    # Group unintegrated by category
    by_category = defaultdict(list)
    for script in unintegrated:
        by_category[script["category"]].append(script)
    
    # Display unintegrated scripts
    if unintegrated:
        print("🔴 UNINTEGRATED SCRIPTS\n")
        
        for category in sorted(by_category.keys()):
            scripts = by_category[category]
            print(f"  [{category.upper()}] ({len(scripts)} scripts)")
            
            for script in scripts[:5]:  # Show first 5 per category
                print(f"    • {script['path']}")
                print(f"      → {script['description']}")
                print(f"      ℹ️  {script['recommendation']}")
                print()
            
            if len(scripts) > 5:
                print(f"    ... and {len(scripts) - 5} more\n")
        
        print()
    
    # High-value integration candidates
    high_value = [
        s for s in unintegrated 
        if s["category"] in ["preflight", "monitoring", "teardown"]
        and "health" in s["path"].lower() or "validate" in s["path"].lower()
    ]
    
    if high_value:
        print("⭐ HIGH-VALUE INTEGRATION CANDIDATES\n")
        for script in high_value[:5]:
            print(f"  🎯 {script['path']}")
            print(f"     Category: {script['category']}")
            print(f"     Integration: {script['integration_point']}")
            print()
    
    return {
        "total_scripts": len(integrated) + len(unintegrated),
        "integrated": len(integrated),
        "unintegrated": len(unintegrated),
        "scripts": {
            "integrated": integrated,
            "unintegrated": unintegrated
        },
        "by_category": {cat: len(scripts) for cat, scripts in by_category.items()}
    }


def generate_integration_plan(unintegrated: List[Dict]) -> str:
    """Generate markdown integration plan."""
    plan = "# Script Integration Plan\n\n"
    plan += "## Priority 1: Preflight Checks\n\n"
    
    preflight = [s for s in unintegrated if s["category"] == "preflight"]
    for script in preflight[:5]:
        plan += f"- [ ] **{script['path']}**\n"
        plan += f"  - {script['description']}\n"
        plan += f"  - Add to: `cmd_prod_cycle.py::preflight_checks_pass()`\n\n"
    
    plan += "## Priority 2: Monitoring\n\n"
    monitoring = [s for s in unintegrated if s["category"] == "monitoring"]
    for script in monitoring[:5]:
        plan += f"- [ ] **{script['path']}**\n"
        plan += f"  - {script['description']}\n"
        plan += f"  - Add to: Post-cycle monitoring or parallel task\n\n"
    
    plan += "## Priority 3: Teardown\n\n"
    teardown = [s for s in unintegrated if s["category"] == "teardown"]
    for script in teardown[:5]:
        plan += f"- [ ] **{script['path']}**\n"
        plan += f"  - {script['description']}\n"
        plan += f"  - Add to: After iteration loop completes\n\n"
    
    return plan


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Review and suggest integration for unexecuted scripts"
    )
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument("--suggest-integration", action="store_true",
                       help="Generate integration plan")
    parser.add_argument("--save-plan", help="Save integration plan to file")
    args = parser.parse_args()
    
    result = review_scripts()
    
    if args.json:
        print(json.dumps(result, indent=2))
        return 0
    
    if args.suggest_integration:
        plan = generate_integration_plan(result["scripts"]["unintegrated"])
        
        if args.save_plan:
            plan_file = PROJECT_ROOT / args.save_plan
            plan_file.write_text(plan)
            print(f"\n💾 Integration plan saved to: {plan_file}\n")
        else:
            print("\n" + "="*70)
            print("📋 INTEGRATION PLAN")
            print("="*70 + "\n")
            print(plan)
    
    print("="*70)
    print("✅ REVIEW COMPLETE")
    print("="*70 + "\n")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
