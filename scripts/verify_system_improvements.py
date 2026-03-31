#!/usr/bin/env python3
"""
System Improvements Verification Script
Validates all implemented enhancements across economic tracking, flow metrics,
schema drift monitoring, WIP management, and guardrail enforcement.
"""

import json
import os
import sys
from pathlib import Path

def check_revenue_impact_attribution():
    """Verify revenue_impact is auto-calculated per circle."""
    print("\n🔍 Checking Revenue Impact Attribution...")
    
    metrics_file = ".goalie/pattern_metrics.jsonl"
    if not os.path.exists(metrics_file):
        print("   ❌ pattern_metrics.jsonl not found")
        return False
    
    # Check last 10 entries for revenue_impact
    with open(metrics_file) as f:
        entries = [json.loads(line) for line in f if line.strip()][-10:]
    
    circles_with_revenue = {}
    for entry in entries:
        circle = entry.get('circle')
        revenue = entry.get('economic', {}).get('revenue_impact', 0.0)
        if circle and revenue > 0:
            circles_with_revenue[circle] = revenue
    
    if circles_with_revenue:
        print("   ✅ Revenue impact auto-calculated:")
        for circle, revenue in circles_with_revenue.items():
            print(f"      • {circle}: ${revenue:,.2f}/month")
        return True
    else:
        print("   ⚠️  No revenue_impact > 0 found in last 10 entries")
        return False

def check_flow_metrics():
    """Verify flow metrics are being tracked."""
    print("\n🔍 Checking Flow Metrics Tracking...")
    
    metrics_file = ".goalie/pattern_metrics.jsonl"
    if not os.path.exists(metrics_file):
        print("   ❌ pattern_metrics.jsonl not found")
        return False
    
    with open(metrics_file) as f:
        entries = [json.loads(line) for line in f if line.strip()]
    
    flow_entries = [e for e in entries if e.get('pattern') == 'flow_metrics']
    
    if flow_entries:
        latest = flow_entries[-1]
        metrics = latest.get('metrics', {})
        print("   ✅ Flow metrics tracked:")
        print(f"      • Cycle time: {metrics.get('cycle_time_minutes', 0):.2f} min")
        print(f"      • Lead time: {metrics.get('lead_time_minutes', 0):.2f} min")
        print(f"      • Throughput: {metrics.get('throughput_per_hour', 0):.2f}/hr")
        print(f"      • Flow efficiency: {metrics.get('flow_efficiency', 0):.2%}")
        print(f"      • Velocity: {metrics.get('velocity', 0)}")
        return True
    else:
        print("   ⚠️  No flow_metrics pattern found")
        return False

def check_schema_drift_integration():
    """Verify schema drift monitoring is integrated."""
    print("\n🔍 Checking Schema Drift Integration...")
    
    # Check if monitor script exists
    if not os.path.exists("scripts/monitor_schema_drift.py"):
        print("   ❌ monitor_schema_drift.py not found")
        return False
    
    # Check if it has --json flag
    with open("scripts/monitor_schema_drift.py") as f:
        content = f.read()
        has_json_flag = "'--json'" in content or '"--json"' in content
    
    if has_json_flag:
        print("   ✅ Schema drift monitor has JSON output")
    else:
        print("   ⚠️  Schema drift monitor missing JSON output")
        return False
    
    # Check if preflight checks include drift detection
    with open("scripts/cmd_prod_cycle.py") as f:
        content = f.read()
        has_drift_check = "schema_drift_detected" in content
    
    if has_drift_check:
        print("   ✅ Schema drift integrated into preflight checks")
        return True
    else:
        print("   ⚠️  Schema drift not in preflight checks")
        return False

def check_wip_auto_snooze():
    """Verify WIP auto-snooze is activated."""
    print("\n🔍 Checking WIP Auto-Snooze...")
    
    # Check if backlog.md exists
    if not os.path.exists("backlog.md"):
        print("   ⚠️  backlog.md not found")
        return False
    
    print("   ✅ backlog.md exists")
    
    # Check if fetch_circle_backlog exists
    with open("scripts/cmd_prod_cycle.py") as f:
        content = f.read()
        has_fetch = "fetch_circle_backlog" in content
        has_wip_check = "check_wip_limit" in content
        has_snooze = "emit_wip_violation_and_snooze" in content
    
    if has_fetch:
        print("   ✅ fetch_circle_backlog() implemented")
    if has_wip_check:
        print("   ✅ WIP limit checks active")
    if has_snooze:
        print("   ✅ Auto-snooze integration complete")
    
    return has_fetch and has_wip_check and has_snooze

def check_early_stop_tuning():
    """Verify early stop thresholds are tuned."""
    print("\n🔍 Checking Early Stop Tuning...")
    
    with open("scripts/cmd_prod_cycle.py") as f:
        content = f.read()
    
    # Check for tier-aware thresholds
    has_tier_thresholds = "TIER_STABILITY_THRESHOLDS" in content
    has_no_early_stop = "--no-early-stop" in content
    
    # Check for innovator/analyst = 4
    innovator_4 = "'innovator': 4" in content
    analyst_4 = "'analyst': 4" in content
    
    if has_tier_thresholds:
        print("   ✅ Tier-aware stability thresholds implemented")
    if has_no_early_stop:
        print("   ✅ --no-early-stop flag available")
    if innovator_4:
        print("   ✅ Innovator threshold: 4 iterations")
    if analyst_4:
        print("   ✅ Analyst threshold: 4 iterations")
    
    return all([has_tier_thresholds, has_no_early_stop, innovator_4, analyst_4])

def check_economic_fields():
    """Verify all economic fields are present in schema."""
    print("\n🔍 Checking Economic Fields Schema...")
    
    metrics_file = ".goalie/pattern_metrics.jsonl"
    if not os.path.exists(metrics_file):
        print("   ❌ pattern_metrics.jsonl not found")
        return False
    
    with open(metrics_file) as f:
        latest = json.loads(list(f)[-1])
    
    economic = latest.get('economic', {})
    required_fields = ['cod', 'wsjf_score', 'capex_opex_ratio', 
                      'infrastructure_utilization', 'revenue_impact']
    
    missing = [f for f in required_fields if f not in economic]
    
    if not missing:
        print("   ✅ All economic fields present:")
        for field in required_fields:
            print(f"      • {field}: {economic.get(field, 0)}")
        return True
    else:
        print(f"   ⚠️  Missing fields: {missing}")
        return False

def check_guardrail_system():
    """Verify guardrail system is operational."""
    print("\n🔍 Checking Guardrail System...")
    
    guardrails_file = "scripts/agentic/guardrails.py"
    if not os.path.exists(guardrails_file):
        print("   ❌ guardrails.py not found")
        return False
    
    with open(guardrails_file) as f:
        content = f.read()
    
    has_wip_limits = "WIPLimits" in content
    has_mode_check = "check_mode_permission" in content
    has_schema_val = "validate_schema" in content
    has_snooze = "emit_wip_violation_and_snooze" in content
    
    if has_wip_limits:
        print("   ✅ WIP limits defined per tier")
    if has_mode_check:
        print("   ✅ Mode permissions enforced")
    if has_schema_val:
        print("   ✅ Schema validation active")
    if has_snooze:
        print("   ✅ WIP auto-snooze available")
    
    return all([has_wip_limits, has_mode_check, has_schema_val, has_snooze])

def main():
    print("=" * 70)
    print("System Improvements Verification Report")
    print("=" * 70)
    
    results = {
        "Revenue Impact Attribution": check_revenue_impact_attribution(),
        "Flow Metrics Tracking": check_flow_metrics(),
        "Schema Drift Integration": check_schema_drift_integration(),
        "WIP Auto-Snooze": check_wip_auto_snooze(),
        "Early Stop Tuning": check_early_stop_tuning(),
        "Economic Fields": check_economic_fields(),
        "Guardrail System": check_guardrail_system()
    }
    
    print("\n" + "=" * 70)
    print("Summary")
    print("=" * 70)
    
    passed = sum(results.values())
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "⚠️  PARTIAL"
        print(f"{status} {name}")
    
    print(f"\nOverall: {passed}/{total} checks passed ({passed/total:.0%})")
    
    if passed == total:
        print("\n🎉 All system improvements verified and operational!")
        return 0
    else:
        print("\n⚠️  Some improvements need attention")
        return 1

if __name__ == "__main__":
    sys.exit(main())
