#!/usr/bin/env python3
"""
Configuration Parity Check Script

Detects configuration drift between environments by comparing:
- MCP config files (mcp-config-{local,dev,stg,prod}.json)
- Environment variables
- Integration settings
- Tool restrictions

Usage:
    python config_parity_check.py [--source ENV] [--target ENV] [--json]
    python config_parity_check.py --all  # Compare all environment pairs
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Set

# Project paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
CLAUDE_DIR = PROJECT_ROOT / ".claude"


def load_mcp_config(env: str) -> Optional[Dict]:
    """Load MCP config for a specific environment."""
    config_file = CLAUDE_DIR / f"mcp-config-{env}.json"
    if not config_file.exists():
        return None
    with open(config_file, 'r') as f:
        return json.load(f)


def get_nested_keys(d: Dict, prefix: str = "") -> Set[str]:
    """Get all nested keys from a dictionary."""
    keys = set()
    for k, v in d.items():
        full_key = f"{prefix}.{k}" if prefix else k
        keys.add(full_key)
        if isinstance(v, dict):
            keys.update(get_nested_keys(v, full_key))
    return keys


def get_nested_value(d: Dict, key_path: str) -> Any:
    """Get value from nested dict using dot notation."""
    keys = key_path.split(".")
    value = d
    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            return None
    return value


def compare_configs(source: Dict, target: Dict, source_env: str, target_env: str) -> Dict:
    """Compare two configuration dictionaries."""
    source_keys = get_nested_keys(source)
    target_keys = get_nested_keys(target)
    
    only_in_source = source_keys - target_keys
    only_in_target = target_keys - source_keys
    common_keys = source_keys & target_keys
    
    value_diffs = []
    for key in common_keys:
        source_val = get_nested_value(source, key)
        target_val = get_nested_value(target, key)
        if source_val != target_val:
            value_diffs.append({
                "key": key,
                f"{source_env}_value": source_val,
                f"{target_env}_value": target_val
            })
    
    return {
        "source_env": source_env,
        "target_env": target_env,
        "only_in_source": sorted(list(only_in_source)),
        "only_in_target": sorted(list(only_in_target)),
        "value_differences": value_diffs,
        "total_keys_source": len(source_keys),
        "total_keys_target": len(target_keys),
        "parity_score": 1.0 - (len(value_diffs) / max(len(common_keys), 1))
    }


def check_critical_parity(comparison: Dict) -> List[Dict]:
    """Check for critical parity issues that could cause production problems."""
    issues = []
    critical_keys = [
        "integrations.stripe.mode",
        "integrations.paypal.mode",
        "integrations.hostbill.mode",
        "environment.restrictions.allow_payment_processing",
        "environment.restrictions.allow_production_tools",
        "tool_restrictions.blocked_tools"
    ]
    
    for diff in comparison.get("value_differences", []):
        if diff["key"] in critical_keys:
            issues.append({
                "severity": "CRITICAL",
                "key": diff["key"],
                "issue": f"Critical config differs between {comparison['source_env']} and {comparison['target_env']}",
                "details": diff
            })
    
    # Check for missing critical keys
    for key in critical_keys:
        if key in comparison.get("only_in_source", []):
            issues.append({
                "severity": "HIGH",
                "key": key,
                "issue": f"Critical key missing in {comparison['target_env']}",
                "details": {"missing_in": comparison["target_env"]}
            })
        if key in comparison.get("only_in_target", []):
            issues.append({
                "severity": "HIGH",
                "key": key,
                "issue": f"Critical key missing in {comparison['source_env']}",
                "details": {"missing_in": comparison["source_env"]}
            })
    
    return issues


def main():
    parser = argparse.ArgumentParser(description="Check configuration parity between environments")
    parser.add_argument("--source", "-s", help="Source environment", default="stg")
    parser.add_argument("--target", "-t", help="Target environment", default="prod")
    parser.add_argument("--all", action="store_true", help="Compare all environment pairs")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()
    
    environments = ["local", "dev", "stg", "prod"]
    results = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "comparisons": [],
        "critical_issues": [],
        "overall_status": "PASS"
    }
    
    if args.all:
        pairs = [(environments[i], environments[i+1]) for i in range(len(environments)-1)]
    else:
        pairs = [(args.source, args.target)]
    
    for source_env, target_env in pairs:
        source_config = load_mcp_config(source_env)
        target_config = load_mcp_config(target_env)
        
        if not source_config:
            results["critical_issues"].append({"severity": "ERROR", "issue": f"Missing config for {source_env}"})
            continue
        if not target_config:
            results["critical_issues"].append({"severity": "ERROR", "issue": f"Missing config for {target_env}"})
            continue
        
        comparison = compare_configs(source_config, target_config, source_env, target_env)
        results["comparisons"].append(comparison)
        
        critical = check_critical_parity(comparison)
        results["critical_issues"].extend(critical)
    
    if results["critical_issues"]:
        results["overall_status"] = "FAIL" if any(i["severity"] == "CRITICAL" for i in results["critical_issues"]) else "WARN"
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"Configuration Parity Check - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        for comp in results["comparisons"]:
            print(f"\n{comp['source_env']} → {comp['target_env']}:")
            print(f"  Parity Score: {comp['parity_score']:.1%}")
            print(f"  Value Differences: {len(comp['value_differences'])}")
            if comp['only_in_source']:
                print(f"  Only in {comp['source_env']}: {len(comp['only_in_source'])} keys")
            if comp['only_in_target']:
                print(f"  Only in {comp['target_env']}: {len(comp['only_in_target'])} keys")
        if results["critical_issues"]:
            print("\n⚠ Critical Issues:")
            for issue in results["critical_issues"]:
                print(f"  [{issue['severity']}] {issue['issue']}")
        print(f"\nOverall Status: {results['overall_status']}")
    
    return 0 if results["overall_status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())

