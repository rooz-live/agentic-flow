#!/usr/bin/env python3
"""
Continuous Improvement Orchestrator for Agentic Flow

Automates:
1. Script integration selection (3-5 per iteration)
2. Economic field enhancement (CapEx/OpEx tracking)
3. Observability-first pattern verification
4. Revenue concentration monitoring
5. Preflight dashboard generation

Usage:
    python3 orchestrate_continuous_improvement.py [--dry-run] [--integrate-scripts]
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime, timezone
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parents[1]
GOALIE_DIR = PROJECT_ROOT / ".goalie"
METRICS_FILE = GOALIE_DIR / "pattern_metrics.jsonl"


class ContinuousImprovementOrchestrator:
    """Orchestrate continuous improvements to prod-cycle"""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.results = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks_performed": [],
            "improvements_suggested": [],
            "scripts_integrated": []
        }
        self._allocation_cache = None  # Cache to avoid duplicate analysis
    
    def run_all_checks(self) -> Dict:
        """Execute all improvement checks"""
        print("\n" + "="*70)
        print("🔄 CONTINUOUS IMPROVEMENT ORCHESTRATOR")
        print("="*70 + "\n")
        
        # 1. Allocation Efficiency Analysis
        print("📊 1. Analyzing Allocation Efficiency...")
        allocation_results = self.check_allocation_efficiency()
        self.results["checks_performed"].append("allocation_efficiency")
        print(f"   → {allocation_results['summary']}\n")
        
        # 2. Revenue Concentration Risk
        print("💰 2. Checking Revenue Concentration Risk...")
        concentration_results = self.check_revenue_concentration()
        self.results["checks_performed"].append("revenue_concentration")
        print(f"   → {concentration_results['summary']}\n")
        
        # 3. Underutilized Circles
        print("📉 3. Identifying Underutilized Circles...")
        underutilized_results = self.check_underutilized_circles()
        self.results["checks_performed"].append("underutilized_circles")
        print(f"   → {underutilized_results['summary']}\n")
        
        # 4. Observability Coverage
        print("👁️  4. Verifying Observability Coverage...")
        observability_results = self.check_observability_coverage()
        self.results["checks_performed"].append("observability_coverage")
        print(f"   → {observability_results['summary']}\n")
        
        # 5. Economic Fields Enhancement
        print("💵 5. Analyzing Economic Field Completeness...")
        economic_results = self.check_economic_fields()
        self.results["checks_performed"].append("economic_fields")
        print(f"   → {economic_results['summary']}\n")
        
        # 6. Script Integration Opportunities
        print("🔌 6. Identifying Script Integration Candidates...")
        integration_results = self.select_scripts_for_integration()
        self.results["checks_performed"].append("script_integration")
        print(f"   → {integration_results['summary']}\n")
        
        # 7. Generate Preflight Dashboard
        print("📋 7. Generating Preflight Dashboard...")
        dashboard_results = self.generate_preflight_dashboard()
        self.results["checks_performed"].append("preflight_dashboard")
        print(f"   → {dashboard_results['summary']}\n")
        
        # Compile final report
        return self.compile_final_report()
    
    def check_allocation_efficiency(self, add_to_suggestions: bool = True) -> Dict:
        """Analyze circle allocation efficiency"""
        # Return cached result if available
        if self._allocation_cache is not None:
            return self._allocation_cache
        
        if not METRICS_FILE.exists():
            result = {"summary": "⚠️  No metrics file found", "efficiency": 0}
            self._allocation_cache = result
            return result
        
        # Count actions per circle
        circle_actions = defaultdict(int)
        total_actions = 0
        
        with open(METRICS_FILE, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    circle = entry.get('circle', 'unknown')
                    circle_actions[circle] += 1
                    total_actions += 1
                except:
                    continue
        
        # Calculate efficiency (evenness of distribution)
        if total_actions == 0:
            return {"summary": "⚠️  No actions found", "efficiency": 0}
        
        num_circles = len(circle_actions)
        expected_per_circle = total_actions / num_circles if num_circles > 0 else 0
        
        # Calculate variance from expected
        variance = sum((count - expected_per_circle) ** 2 
                      for count in circle_actions.values()) / num_circles
        
        # Efficiency score (lower variance = higher efficiency)
        efficiency_score = max(0, 100 - (variance / expected_per_circle * 10))
        
        summary = f"Efficiency: {efficiency_score:.1f}% ({num_circles} circles, {total_actions} actions)"
        
        result = {"summary": summary, "efficiency": efficiency_score, "circles": circle_actions}
        
        # Only add to suggestions if requested (first call)
        if add_to_suggestions:
            self.results["improvements_suggested"].append({
                "category": "allocation_efficiency",
                "score": efficiency_score,
                "circles": dict(circle_actions),
                "recommendation": "Focus on balancing workload" if efficiency_score < 70 else "Allocation healthy"
            })
        
        # Cache the result
        self._allocation_cache = result
        return result
    
    def check_revenue_concentration(self) -> Dict:
        """Check if revenue is too concentrated in single circle"""
        # Simplified: use action count as proxy for revenue
        # Use cached allocation (don't add duplicate suggestions)
        allocation = self.check_allocation_efficiency(add_to_suggestions=False)
        circles = allocation.get("circles", {})
        
        if not circles:
            return {"summary": "⚠️  No data available", "risk": "unknown"}
        
        total = sum(circles.values())
        max_circle = max(circles, key=circles.get)
        max_pct = (circles[max_circle] / total * 100) if total > 0 else 0
        
        if max_pct > 50:
            risk_level = "🔴 HIGH"
            recommendation = f"Reduce {max_circle} concentration from {max_pct:.1f}% to <40%"
        elif max_pct > 40:
            risk_level = "🟡 MEDIUM"
            recommendation = f"Monitor {max_circle} concentration at {max_pct:.1f}%"
        else:
            risk_level = "🟢 LOW"
            recommendation = "Concentration healthy"
        
        summary = f"Risk: {risk_level} ({max_circle}: {max_pct:.1f}%)"
        
        self.results["improvements_suggested"].append({
            "category": "revenue_concentration",
            "risk_level": risk_level,
            "max_circle": max_circle,
            "max_percentage": max_pct,
            "recommendation": recommendation
        })
        
        return {"summary": summary, "risk": risk_level, "max_circle": max_circle}
    
    def check_underutilized_circles(self) -> Dict:
        """Identify circles with low utilization"""
        # Use cached allocation (don't add duplicate suggestions)
        allocation = self.check_allocation_efficiency(add_to_suggestions=False)
        circles = allocation.get("circles", {})
        
        if not circles:
            return {"summary": "⚠️  No data available", "underutilized": []}
        
        total = sum(circles.values())
        avg = total / len(circles) if circles else 0
        
        # Circles below 50% of average are underutilized
        underutilized = []
        for circle, count in circles.items():
            if count < avg * 0.5:
                underutilized.append({
                    "circle": circle,
                    "actions": count,
                    "vs_avg": f"-{(1 - count/avg)*100:.1f}%"
                })
        
        summary = f"Found {len(underutilized)} underutilized circles"
        if underutilized:
            circles_list = ", ".join([u["circle"] for u in underutilized])
            summary += f": {circles_list}"
        
        self.results["improvements_suggested"].append({
            "category": "underutilized_circles",
            "count": len(underutilized),
            "circles": underutilized,
            "recommendation": "Run advisory cycles" if underutilized else "Utilization healthy"
        })
        
        return {"summary": summary, "underutilized": underutilized}
    
    def check_observability_coverage(self) -> Dict:
        """Verify observability-first pattern coverage"""
        if not METRICS_FILE.exists():
            return {"summary": "⚠️  No metrics file found", "coverage": 0}
        
        total_patterns = 0
        observable_patterns = 0
        non_observable = []
        
        with open(METRICS_FILE, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    total_patterns += 1
                    
                    # Check if pattern has observability markers
                    has_economic = 'economic' in entry and entry['economic']
                    has_tags = 'tags' in entry and entry['tags']
                    has_behavioral = 'behavioral_type' in entry
                    
                    if has_economic or has_tags or has_behavioral:
                        observable_patterns += 1
                    else:
                        pattern_name = entry.get('pattern', 'unknown')
                        if pattern_name not in non_observable:
                            non_observable.append(pattern_name)
                except:
                    continue
        
        coverage_pct = (observable_patterns / total_patterns * 100) if total_patterns > 0 else 0
        
        summary = f"Coverage: {coverage_pct:.1f}% ({observable_patterns}/{total_patterns} patterns)"
        
        self.results["improvements_suggested"].append({
            "category": "observability_coverage",
            "coverage_pct": coverage_pct,
            "non_observable_patterns": non_observable[:10],  # First 10
            "recommendation": "Add economic/tags to patterns" if coverage_pct < 90 else "Coverage excellent"
        })
        
        return {"summary": summary, "coverage": coverage_pct, "non_observable": non_observable}
    
    def check_economic_fields(self) -> Dict:
        """Check for CapEx/OpEx and infrastructure fields"""
        if not METRICS_FILE.exists():
            return {"summary": "⚠️  No metrics file found", "completeness": 0}
        
        total_events = 0
        with_capex_opex = 0
        with_infrastructure = 0
        with_roi = 0
        
        with open(METRICS_FILE, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    total_events += 1
                    
                    economic = entry.get('economic', {})
                    if 'capex_opex_ratio' in economic:
                        with_capex_opex += 1
                    if 'infrastructure_utilization' in economic:
                        with_infrastructure += 1
                    if 'roi_multiplier' in economic:
                        with_roi += 1
                except:
                    continue
        
        completeness = ((with_capex_opex + with_infrastructure + with_roi) / 
                       (total_events * 3) * 100) if total_events > 0 else 0
        
        summary = f"Completeness: {completeness:.1f}% (CapEx: {with_capex_opex}, Infra: {with_infrastructure}, ROI: {with_roi})"
        
        self.results["improvements_suggested"].append({
            "category": "economic_fields",
            "completeness_pct": completeness,
            "missing_fields": {
                "capex_opex_ratio": total_events - with_capex_opex,
                "infrastructure_utilization": total_events - with_infrastructure,
                "roi_multiplier": total_events - with_roi
            },
            "recommendation": "Enhance PatternLogger with economic fields" if completeness < 50 else "Fields complete"
        })
        
        return {"summary": summary, "completeness": completeness}
    
    def select_scripts_for_integration(self, count: int = 5) -> Dict:
        """Intelligently select 3-5 scripts for next integration"""
        # Read integration plan
        plan_file = GOALIE_DIR / "integration_plan.md"
        if not plan_file.exists():
            return {"summary": "⚠️  No integration plan found", "selected": []}
        
        # Parse priorities from plan
        preflight_scripts = []
        monitoring_scripts = []
        teardown_scripts = []
        
        with open(plan_file, 'r') as f:
            section = None
            for line in f:
                if "## Priority 1: Preflight" in line:
                    section = "preflight"
                elif "## Priority 2: Monitoring" in line:
                    section = "monitoring"
                elif "## Priority 3: Teardown" in line:
                    section = "teardown"
                elif line.startswith("- [ ] **"):
                    script = line.split("**")[1] if "**" in line else None
                    if script and section == "preflight":
                        preflight_scripts.append(script)
                    elif script and section == "monitoring":
                        monitoring_scripts.append(script)
                    elif script and section == "teardown":
                        teardown_scripts.append(script)
        
        # Intelligent selection based on current needs
        selected = []
        
        # 1. Always include 2-3 preflight checks for quality
        selected.extend(preflight_scripts[:3])
        
        # 2. Add 1 monitoring script for observability
        if monitoring_scripts:
            selected.append(monitoring_scripts[0])
        
        # 3. Add 1 teardown script for completeness
        if teardown_scripts and len(selected) < count:
            selected.append(teardown_scripts[0])
        
        selected = selected[:count]  # Limit to count
        
        summary = f"Selected {len(selected)} scripts for integration"
        
        self.results["scripts_integrated"] = selected
        self.results["improvements_suggested"].append({
            "category": "script_integration",
            "selected_count": len(selected),
            "scripts": selected,
            "recommendation": f"Integrate {len(selected)} scripts in next prod-cycle iteration"
        })
        
        return {"summary": summary, "selected": selected}
    
    def generate_preflight_dashboard(self) -> Dict:
        """Generate comprehensive preflight summary dashboard"""
        dashboard = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "sections": []
        }
        
        # Compile all checks into dashboard
        for improvement in self.results["improvements_suggested"]:
            dashboard["sections"].append({
                "category": improvement["category"],
                "status": improvement.get("score", improvement.get("coverage_pct", 0)),
                "recommendation": improvement["recommendation"]
            })
        
        # Save dashboard
        dashboard_file = GOALIE_DIR / "preflight_dashboard.json"
        with open(dashboard_file, 'w') as f:
            json.dump(dashboard, f, indent=2)
        
        summary = f"Dashboard saved to {dashboard_file.name}"
        
        return {"summary": summary, "dashboard": dashboard}
    
    def compile_final_report(self) -> Dict:
        """Compile and display final report"""
        print("\n" + "="*70)
        print("📊 IMPROVEMENT REPORT")
        print("="*70 + "\n")
        
        print(f"✅ Checks Performed: {len(self.results['checks_performed'])}")
        print(f"💡 Improvements Suggested: {len(self.results['improvements_suggested'])}")
        print(f"🔌 Scripts for Integration: {len(self.results['scripts_integrated'])}\n")
        
        print("🎯 TOP RECOMMENDATIONS:\n")
        for i, improvement in enumerate(self.results["improvements_suggested"][:5], 1):
            print(f"{i}. [{improvement['category'].upper()}]")
            print(f"   {improvement['recommendation']}\n")
        
        if self.results["scripts_integrated"]:
            print("📝 SCRIPTS TO INTEGRATE NEXT:\n")
            for i, script in enumerate(self.results["scripts_integrated"], 1):
                print(f"   {i}. {script}")
        
        print("\n" + "="*70)
        print("✅ ORCHESTRATION COMPLETE")
        print("="*70 + "\n")
        
        # Save report
        report_file = GOALIE_DIR / f"improvement_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"📄 Full report saved: {report_file}\n")
        
        return self.results


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Orchestrate continuous improvements for prod-cycle"
    )
    parser.add_argument("--dry-run", action="store_true",
                       help="Preview recommendations without applying changes")
    parser.add_argument("--integrate-scripts", action="store_true",
                       help="Automatically integrate selected scripts")
    parser.add_argument("--json", action="store_true",
                       help="Output JSON report")
    args = parser.parse_args()
    
    # Run orchestrator
    orchestrator = ContinuousImprovementOrchestrator(dry_run=args.dry_run)
    results = orchestrator.run_all_checks()
    
    # Optionally integrate scripts
    if args.integrate_scripts and not args.dry_run:
        print("\n🔄 Integrating selected scripts...")
        # TODO: Implement auto-integration
        print("   ⚠️  Auto-integration not yet implemented")
        print("   💡 Manually integrate scripts listed above\n")
    
    if args.json:
        print(json.dumps(results, indent=2))
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
