#!/usr/bin/env python3
"""
Production Learning Collector
Aggregates evidence from run_production_cycle.sh monitoring to improve af prod decisions
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime, timedelta, timezone

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class ProdLearningCollector:
    """Collect and analyze monitoring data to improve af prod adaptive decisions"""
    
    def __init__(self):
        self.goalie_path = PROJECT_ROOT / ".goalie"
        self.logs_path = PROJECT_ROOT / "logs"
        self.evidence_paths = [
            self.goalie_path / "prod_learning_evidence.jsonl",
            self.goalie_path / "learning_evidence.jsonl",
        ]
        
    def collect_monitoring_evidence(self) -> Dict[str, Any]:
        """Aggregate evidence from all monitoring scripts"""
        evidence = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "sources": {}
        }
        
        # 1. WIP Monitor: Circle capacity utilization
        wip_data = self._parse_wip_monitor()
        if wip_data:
            evidence["sources"]["wip_monitor"] = wip_data
            evidence["circle_utilization_pct"] = wip_data.get("avg_utilization", 0)
        
        # 2. Site Health: Deployment health signals
        site_health = self._parse_site_health()
        if site_health:
            evidence["sources"]["site_health"] = site_health
            evidence["deployment_health_score"] = site_health.get("health_pct", 0)
        
        # 3. Heartbeat Monitor: Infrastructure stability
        heartbeat = self._parse_heartbeat()
        if heartbeat:
            evidence["sources"]["heartbeat"] = heartbeat
            evidence["infrastructure_stability"] = heartbeat.get("uptime_pct", 0)
        
        # 4. Continuous Improvement: Strategic recommendations
        ci_report = self._parse_ci_report()
        if ci_report:
            evidence["sources"]["continuous_improvement"] = ci_report
            evidence["revenue_concentration_risk"] = ci_report.get("revenue_risk_level", "unknown")
            evidence["allocation_efficiency"] = ci_report.get("allocation_efficiency_pct", 0)
        
        # 5. Budget Tracker: Economic signals
        budget = self._parse_budget_tracker()
        if budget:
            evidence["sources"]["budget_tracker"] = budget
            evidence["budget_burn_rate"] = budget.get("burn_rate_pct", 0)
        
        return evidence
    
    def _parse_wip_monitor(self) -> Dict[str, Any]:
        """Parse WIP monitor output for circle utilization"""
        # WIP monitor outputs to stdout, but we can infer from pattern metrics
        metrics_file = self.goalie_path / "pattern_metrics.jsonl"
        if not metrics_file.exists():
            return {}
        
        # Count recent WIP by circle
        circle_wip = {}
        with open(metrics_file) as f:
            for line in f.readlines()[-100:]:  # Last 100 entries
                try:
                    entry = json.loads(line)
                    circle = entry.get("circle", "unknown")
                    if "wip" in entry.get("pattern_name", "").lower():
                        circle_wip[circle] = circle_wip.get(circle, 0) + 1
                except:
                    continue
        
        total_wip = sum(circle_wip.values())
        
        # CRITICAL BUSINESS LOGIC: Total WIP limit
        # Default: 27 = sum of all circle WIP limits from .goalie/wip_limits.jsonl
        # Orchestrator(3) + Assessor(5) + Analyst(5) + Innovator(4) + Seeker(4) + Intuitive(6) = 27
        # Configurable via AF_TOTAL_WIP_LIMIT env var
        TOTAL_WIP_LIMIT = int(os.getenv("AF_TOTAL_WIP_LIMIT", "27"))
        
        return {
            "total_wip": total_wip,
            "total_wip_limit": TOTAL_WIP_LIMIT,  # Include in output for transparency
            "circle_distribution": circle_wip,
            "avg_utilization": min(100, (total_wip / TOTAL_WIP_LIMIT) * 100)
        }
    
    def _parse_site_health(self) -> Dict[str, Any]:
        """Parse site health monitor for deployment health"""
        # Site health logs critical/healthy status
        # Infer from recent pattern metrics with 'deploy' or 'health' keywords
        metrics_file = self.goalie_path / "pattern_metrics.jsonl"
        if not metrics_file.exists():
            return {}
        
        healthy_count = 0
        total_count = 0
        
        with open(metrics_file) as f:
            for line in f.readlines()[-200:]:
                try:
                    entry = json.loads(line)
                    pattern = entry.get("pattern_name", "")
                    if any(kw in pattern.lower() for kw in ["deploy", "health", "site"]):
                        total_count += 1
                        if "fail" not in pattern.lower() and "error" not in pattern.lower():
                            healthy_count += 1
                except:
                    continue
        
        health_pct = (healthy_count / total_count * 100) if total_count > 0 else 50
        return {
            "healthy_sites": healthy_count,
            "total_sites": total_count,
            "health_pct": health_pct,
            "status": "HEALTHY" if health_pct > 80 else "DEGRADED" if health_pct > 50 else "CRITICAL"
        }
    
    def _parse_heartbeat(self) -> Dict[str, Any]:
        """Parse heartbeat monitor for infrastructure stability"""
        heartbeat_log = self.logs_path / "heartbeats.jsonl"
        if not heartbeat_log.exists():
            return {}
        
        # Analyze last 24h of heartbeats
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        up_count = 0
        total_count = 0
        
        with open(heartbeat_log) as f:
            for line in f.readlines()[-1000:]:  # Last 1000 heartbeats
                try:
                    entry = json.loads(line)
                    timestamp = datetime.fromisoformat(entry["timestamp"].replace("Z", ""))
                    if timestamp < cutoff:
                        continue
                    
                    total_count += 1
                    if entry.get("overall_status") == "UP":
                        up_count += 1
                except:
                    continue
        
        uptime_pct = (up_count / total_count * 100) if total_count > 0 else 0
        return {
            "uptime_pct": uptime_pct,
            "total_checks": total_count,
            "stability_status": "STABLE" if uptime_pct > 95 else "UNSTABLE"
        }
    
    def _parse_ci_report(self) -> Dict[str, Any]:
        """Parse continuous improvement orchestrator report"""
        # Look for latest improvement report
        import glob
        reports = sorted(glob.glob(str(self.goalie_path / "improvement_report_*.json")))
        if not reports:
            return {}
        
        try:
            with open(reports[-1]) as f:
                report = json.load(f)
                return {
                    "revenue_risk_level": report.get("revenue_concentration", {}).get("risk_level", "unknown"),
                    "allocation_efficiency_pct": report.get("allocation_efficiency", {}).get("efficiency_pct", 0),
                    "underutilized_circles": report.get("underutilized_circles", []),
                    "top_recommendations": report.get("top_recommendations", [])[:3]
                }
        except:
            return {}
    
    def _parse_budget_tracker(self) -> Dict[str, Any]:
        """Parse budget tracker for economic signals"""
        # Budget tracker would write to .goalie or logs
        # For now, infer from economic metrics in pattern_metrics
        metrics_file = self.goalie_path / "pattern_metrics.jsonl"
        if not metrics_file.exists():
            return {}
        
        budget_events = []
        with open(metrics_file) as f:
            for line in f.readlines()[-100:]:
                try:
                    entry = json.loads(line)
                    if "budget" in entry.get("pattern_name", "").lower():
                        budget_events.append(entry)
                except:
                    continue
        
        return {
            "budget_event_count": len(budget_events),
            "burn_rate_pct": 0  # Placeholder - would calculate from actual budget data
        }
    
    def calculate_prod_maturity_score(self, evidence: Dict[str, Any]) -> float:
        """
        Calculate composite production maturity score (0-100)
        
        Factors:
        - Circle utilization (balanced > concentrated)
        - Deployment health (high uptime)
        - Infrastructure stability (low failure rate)
        - Revenue diversification (low concentration)
        - Budget efficiency (controlled burn)
        """
        scores = []
        weights = []
        
        # Circle utilization (higher is better, but over-utilization is bad)
        util = evidence.get("circle_utilization_pct", 0)
        util_score = 100 - abs(util - 60)  # Optimal at 60% utilization
        scores.append(util_score)
        weights.append(0.20)
        
        # Deployment health
        deploy_health = evidence.get("deployment_health_score", 50)
        scores.append(deploy_health)
        weights.append(0.25)
        
        # Infrastructure stability
        infra_stability = evidence.get("infrastructure_stability", 50)
        scores.append(infra_stability)
        weights.append(0.20)
        
        # Revenue diversification (inverse of concentration risk)
        risk_level = evidence.get("revenue_concentration_risk", "unknown")
        risk_score = {"LOW": 100, "MEDIUM": 60, "HIGH": 20, "unknown": 50}.get(risk_level, 50)
        scores.append(risk_score)
        weights.append(0.20)
        
        # Allocation efficiency
        alloc_eff = evidence.get("allocation_efficiency", 0)
        scores.append(alloc_eff)
        weights.append(0.15)
        
        # Weighted average
        weighted_score = sum(s * w for s, w in zip(scores, weights))
        return round(weighted_score, 2)
    
    def generate_adaptive_recommendations(self, evidence: Dict[str, Any]) -> List[str]:
        """Generate recommendations for af prod based on evidence"""
        recommendations = []
        
        # Check circle utilization
        util = evidence.get("circle_utilization_pct", 0)
        if util < 30:
            recommendations.append("INCREASE_CYCLE_ITERS: Low circle utilization suggests system can handle more load")
        elif util > 80:
            recommendations.append("DECREASE_CYCLE_ITERS: High utilization, risk of overload")
        
        # Check deployment health
        deploy_health = evidence.get("deployment_health_score", 50)
        if deploy_health < 50:
            recommendations.append("INCREASE_SWARM_ITERS: Poor deployment health needs more exploration/comparison")
        
        # Check revenue concentration
        risk = evidence.get("revenue_concentration_risk", "unknown")
        if risk == "HIGH":
            recommendations.append("FOCUS_UNDERUTILIZED_CIRCLES: Diversify revenue sources")
        
        # Check infrastructure
        infra = evidence.get("infrastructure_stability", 50)
        if infra < 80:
            recommendations.append("REDUCE_MUTATION_RATE: Unstable infrastructure, use advisory mode")
        
        return recommendations
    
    def save_evidence(self, evidence: Dict[str, Any]):
        """Save evidence to JSONL for historical analysis"""
        self.goalie_path.mkdir(parents=True, exist_ok=True)
        for path in self.evidence_paths:
            with open(path, "a") as f:
                f.write(json.dumps(evidence) + "\n")
    
    def run(self):
        """Main execution: collect, analyze, recommend"""
        print("🧠 Collecting Production Learning Evidence...")
        print("=" * 70)
        
        evidence = self.collect_monitoring_evidence()
        maturity_score = self.calculate_prod_maturity_score(evidence)
        recommendations = self.generate_adaptive_recommendations(evidence)
        
        # Add analysis to evidence
        evidence["maturity_score"] = maturity_score
        evidence["recommendations"] = recommendations
        
        # Save for af prod to consume
        self.save_evidence(evidence)
        
        # Print summary
        print(f"\n📊 Production Maturity Score: {maturity_score}/100")
        print(f"\n📈 Evidence Summary:")
        print(f"   Circle Utilization: {evidence.get('circle_utilization_pct', 0):.1f}%")
        print(f"   Deployment Health: {evidence.get('deployment_health_score', 0):.1f}%")
        print(f"   Infrastructure Stability: {evidence.get('infrastructure_stability', 0):.1f}%")
        print(f"   Revenue Risk: {evidence.get('revenue_concentration_risk', 'unknown')}")
        
        if recommendations:
            print(f"\n💡 Adaptive Recommendations for af prod:")
            for rec in recommendations:
                print(f"   • {rec}")
        
        print(f"\n✅ Evidence saved to {self.evidence_path}")
        
        return evidence


if __name__ == "__main__":
    collector = ProdLearningCollector()
    collector.run()
