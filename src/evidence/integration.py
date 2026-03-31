#!/usr/bin/env python3
"""Integration of evidence emitter with existing CLI commands.

Provides adapters and helpers to integrate the unified evidence emitter
with prod-cycle, prod-swarm, pattern-coverage, and goalie-gaps commands.
"""

import os
import sys
from typing import Dict, Any, Optional, List
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from evidence.emitter import EvidenceEmitter, get_emitter, VariantInfo


class ProdCycleEmitter:
    """Evidence emitter adapter for prod-cycle command."""
    
    def __init__(self, project_root: Optional[str] = None):
        self.emitter = get_emitter(project_root)
        self.run_id = os.environ.get("AF_RUN_ID", "unknown")
        self.circle = os.environ.get("AF_CIRCLE", "unknown")
        self.mode = os.environ.get("AF_MODE", "advisory")
        self.depth = int(os.environ.get("AF_DEPTH", "1"))
        
    def emit_economic_metrics(self, summary: Dict[str, Any]) -> None:
        """Emit economic compounding metrics."""
        self.emitter.emit_economic_compounding(
            wsjf_per_h=float(summary.get("wsjf_per_hour", 0)),
            energy_cost_usd=float(summary.get("total_energy_cost_usd", 0)),
            value_per_hour=float(summary.get("revenue_per_hour", 0)),
            profit_dividend_usd=float(summary.get("total_profit_dividend_usd", 0)),
            revenue_per_hour=float(summary.get("revenue_per_hour", 0)),
            run_id=self.run_id,
            circle=self.circle,
            depth=self.depth,
            mode=self.mode
        )
    
    def emit_maturity_metrics(self, summary: Dict[str, Any]) -> None:
        """Emit maturity coverage metrics."""
        self.emitter.emit_maturity_coverage(
            tier_backlog_cov_pct=float(summary.get("tier_backlog_cov_pct", 0)),
            tier_telemetry_cov_pct=float(summary.get("tier_telemetry_cov_pct", 0)),
            tier_depth_cov_pct=float(summary.get("tier_depth_cov_pct", 0)),
            circle_coverage_pct=float(summary.get("circle_coverage_pct", 0)),
            run_id=self.run_id,
            circle=self.circle,
            depth=self.depth
        )
    
    def emit_winner_grade(self, assessment: Dict[str, Any]) -> None:
        """Emit winner-grade qualification."""
        grade = "platinum" if assessment.get("all_checks_passed") else \
                "gold" if assessment.get("ok_rate", 0) >= 0.95 else \
                "silver" if assessment.get("ok_rate", 0) >= 0.80 else "bronze"
        
        self.emitter.emit_winner_grade(
            grade=grade,
            ok_rate=float(assessment.get("ok_rate", 0)),
            rev_per_h=float(assessment.get("rev_per_h", 0)),
            duration_ok_pct=float(assessment.get("duration_ok_pct", 0)),
            abort_count=int(assessment.get("abort_count", 0)),
            contention_mult=float(assessment.get("contention_mult", 0)),
            checks_passed=int(assessment.get("checks_passed", 0)),
            checks_total=int(assessment.get("checks_total", 0)),
            run_id=self.run_id,
            circle=self.circle,
            depth=self.depth
        )


class SwarmEmitter:
    """Evidence emitter adapter for prod-swarm command."""
    
    def __init__(self, project_root: Optional[str] = None):
        self.emitter = get_emitter(project_root)
        self.run_id = os.environ.get("AF_RUN_ID", "swarm-" + str(int(os.path.getpid())))
        
    def emit_variant_results(self, 
                            variant_label: str,
                            results: List[Dict[str, Any]],
                            baseline: bool = False) -> None:
        """Emit variant analysis results."""
        if not results:
            return
            
        # Calculate aggregate metrics
        avg_revenue = sum(r.get("revenue_per_hour", 0) for r in results) / len(results)
        avg_duration = sum(r.get("duration_h", 0) for r in results) / len(results)
        
        self.emitter.emit("variant-analysis", {
            "variant_analysis": {
                "variant_label": variant_label,
                "iterations": len(results),
                "reps": 1,
                "avg_revenue_per_h": avg_revenue,
                "avg_duration_h": avg_duration,
                "statistical_significance": len(results) > 1,
                "effect_size": 0.0,  # Would need baseline to calculate
                "confidence_interval": [0.0, 0.0],
            }
        }, run_id=self.run_id, variant=VariantInfo(
            label=variant_label,
            iters=len(results),
            reps=1,
            baseline=baseline
        ))
    
    def emit_contention_analysis(self, 
                                baseline_duration: float,
                                concurrent_duration: float,
                                max_concurrency: int) -> None:
        """Emit contention analysis metrics."""
        duration_mult = concurrent_duration / baseline_duration if baseline_duration > 0 else 0
        efficiency_mult = 1.0 / duration_mult if duration_mult > 0 else 0
        
        self.emitter.emit("contention-analysis", {
            "contention_analysis": {
                "duration_multiplier": duration_mult,
                "efficiency_multiplier": efficiency_mult,
                "max_concurrency": max_concurrency,
                "recommended_concurrency": 1 if duration_mult > 2.0 else max_concurrency,
                "contention_score": min(1.0, duration_mult / 3.0),
            }
        }, run_id=self.run_id)


class PatternCoverageEmitter:
    """Evidence emitter adapter for pattern-coverage command."""
    
    def __init__(self, project_root: Optional[str] = None):
        self.emitter = get_emitter(project_root)
        self.run_id = os.environ.get("AF_RUN_ID", "pattern-coverage")
        
    def emit_coverage_results(self, 
                             hit_pct: float,
                             patterns_hit: int,
                             patterns_total: int,
                             required_patterns: List[str],
                             pattern_hits: Dict[str, int]) -> None:
        """Emit pattern coverage results."""
        self.emitter.emit_pattern_hit_pct(
            hit_pct=hit_pct,
            patterns_hit=patterns_hit,
            patterns_total=patterns_total,
            required_patterns=required_patterns,
            pattern_hits=pattern_hits,
            run_id=self.run_id
        )


class GoalieGapsEmitter:
    """Evidence emitter adapter for goalie-gaps command."""
    
    def __init__(self, project_root: Optional[str] = None):
        self.emitter = get_emitter(project_root)
        self.run_id = os.environ.get("AF_RUN_ID", "goalie-gaps")
        
    def emit_gap_analysis(self, 
                          gaps: List[Dict[str, Any]],
                          not_applicable: List[str]) -> None:
        """Emit gap analysis results."""
        # Add severity to gaps if not present
        for gap in gaps:
            if "severity" not in gap:
                deficit = int(gap.get("deficit", 0))
                if deficit >= 10:
                    gap["severity"] = "critical"
                elif deficit >= 5:
                    gap["severity"] = "high"
                elif deficit >= 2:
                    gap["severity"] = "medium"
                else:
                    gap["severity"] = "low"
        
        self.emitter.emit_observability_gaps(
            gaps=gaps,
            gap_count=len(gaps),
            not_applicable=not_applicable,
            run_id=self.run_id
        )
    
    def emit_security_audit(self, 
                            sec_audit_issues: List[Dict[str, Any]],
                            cve_list: List[Dict[str, Any]]) -> None:
        """Emit security audit results."""
        self.emitter.emit("security-audit", {
            "security_audit_gaps": {
                "sec_audit_issues": sec_audit_issues,
                "cve_count": len(cve_list),
                "cve_list": cve_list,
            }
        }, run_id=self.run_id)
    
    def emit_circle_perspectives(self, 
                                 coverage_data: Dict[str, Any]) -> None:
        """Emit circle perspective telemetry."""
        perspectives = []
        for circle, data in coverage_data.get("circles", {}).items():
            perspectives.append({
                "circle": circle,
                "backlog": data.get("has_backlog", False),
                "events": data.get("event_count", 0),
                "depth_pct": data.get("depth_score", 0),
                "target": data.get("depth_target", 0),
                "lens": data.get("lens", ""),
            })
        
        self.emitter.emit("decision-lens", {
            "decision_lens_telemetry": {
                "backlog_coverage_pct": coverage_data.get("backlog_coverage_pct", 0),
                "telemetry_coverage_pct": coverage_data.get("telemetry_coverage_pct", 0),
                "circle_perspectives": perspectives,
            }
        }, run_id=self.run_id)


# Factory function to get the right emitter
def get_emitter_adapter(command: str, project_root: Optional[str] = None):
    """Get the appropriate emitter adapter for a CLI command."""
    adapters = {
        "prod-cycle": ProdCycleEmitter,
        "prod-swarm": SwarmEmitter,
        "pattern-coverage": PatternCoverageEmitter,
        "goalie-gaps": GoalieGapsEmitter,
    }
    
    adapter_class = adapters.get(command)
    if not adapter_class:
        raise ValueError(f"No emitter adapter found for command: {command}")
    
    return adapter_class(project_root)
