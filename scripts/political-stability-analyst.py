#!/usr/bin/env python3
"""
Political Stability & Elite Overproduction Analysis System
For 720.chat / TAG.VOTE consulting framework
Maps Turchin's cliodynamics to technical/economic domains
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional

class CliodynamicAnalyzer:
    """
    Analyzes elite overproduction and societal stability through
    Turchin's structural-demographic theory
    """
    
    def __init__(self):
        self.metrics = {}
        self.indicators = {}
    
    def compute_elite_overproduction_ratio(self, 
                                           elites: int, 
                                           elite_positions: int) -> float:
        """
        Compute elite overproduction ratio
        EOR = elites / elite_positions
        
        Thresholds:
        - < 1.0: Normal (elite aspirants can find positions)
        - 1.0-2.0: Mild overproduction (credentialism emerges)
        - 2.0-5.0: Severe overproduction (counter-elites form)
        - > 5.0: Critical (revolutionary conditions)
        """
        if elite_positions == 0:
            return float('inf')
        return elites / elite_positions
    
    def analyze_dashboard_sprawl(self, dashboard_count: int, 
                                functional_dashboards: int) -> Dict:
        """
        Analyze technical elite overproduction through dashboard sprawl
        
        97 dashboards = elite overproduction (credentials without function)
        266/266 coherence = credentialist ritual performance
        0 swarm persistence = actual capability gap
        """
        eor = self.compute_elite_overproduction_ratio(
            dashboard_count, functional_dashboards
        )
        
        return {
            "metric": "Dashboard Sprawl",
            "total_elites": dashboard_count,
            "elite_positions": functional_dashboards,
            "eor": round(eor, 2),
            "status": self._interpret_eor(eor),
            "cliodynamic_phase": self._map_to_phase(eor),
            "pressure": self._compute_pressure(eor)
        }
    
    def analyze_employment_credentialism(self,
                                         applications: int,
                                         interviews: int,
                                         offers: int,
                                         pitt_wwphs_creds: bool) -> Dict:
        """
        Analyze employment credentialism blocking
        
        PITT/WWPHS credentials ignored = credentialism failure
        Apex employment blocked = elite aspirant immiseration
        """
        interview_rate = interviews / applications if applications > 0 else 0
        offer_rate = offers / applications if applications > 0 else 0
        
        # Credential discount factor
        cred_discount = 0.0 if pitt_wwphs_creds else 1.0
        
        return {
            "metric": "Employment Credentialism",
            "applications": applications,
            "interviews": interviews,
            "offers": offers,
            "interview_rate": round(interview_rate * 100, 1),
            "offer_rate": round(offer_rate * 100, 1),
            "credentials": "PITT/WWPHS" if pitt_wwphs_creds else "None",
            "credential_discount": cred_discount,
            "blocking": "Severe" if pitt_wwphs_creds and offers == 0 else "Moderate",
            "counter_elite_path": "Pro se / Consulting / 720.chat" if offers == 0 else "Traditional employment"
        }
    
    def analyze_income_pipeline_diversity(self,
                                          sources: List[str],
                                          monthly_revenue: Dict[str, float]) -> Dict:
        """
        Analyze economic safety valve through income pipeline diversity
        
        720.chat + TAG.VOTE + consulting = safety valve preventing
        single-point-of-failure from apex employment blocking
        """
        total_monthly = sum(monthly_revenue.values())
        source_count = len(sources)
        
        # Herfindahl index for concentration
        if total_monthly > 0:
            shares = [rev/total_monthly for rev in monthly_revenue.values()]
            hhi = sum(s**2 for s in shares)
        else:
            hhi = 1.0
        
        return {
            "metric": "Income Pipeline Diversity",
            "sources": sources,
            "source_count": source_count,
            "total_monthly": round(total_monthly, 2),
            "concentration_hhi": round(hhi, 3),
            "diversity_status": "High" if hhi < 0.3 else "Moderate" if hhi < 0.6 else "Low",
            "safety_valve": "Active" if source_count >= 3 else "Weak",
            "counter_elite_resilience": "High" if source_count >= 3 else "Low"
        }
    
    def analyze_arbitration_pressure_valve(self,
                                          days_to_hearing: int,
                                          settlement_probability: float,
                                          exposure_range: Tuple[float, float]) -> Dict:
        """
        Analyze whether arbitration functions as pressure valve
        or forever war
        
        Pressure Valve characteristics:
        - Hard deadline (39 days)
        - Neutral arbiter (Mike Chaney)
        - Binding resolution
        
        Forever War characteristics:
        - No resolution (trial de novo)
        - Prolonged duration
        - Energy dissipation
        """
        min_exp, max_exp = exposure_range
        
        # Pressure metrics
        urgency = max(0, 1 - (days_to_hearing / 365))
        resolution_likelihood = settlement_probability
        
        # Pressure valve effectiveness
        if settlement_probability > 0.7:
            valve_status = "Effective"
            cliodynamic_risk = "Low"
        elif settlement_probability > 0.4:
            valve_status = "Uncertain"
            cliodynamic_risk = "Moderate"
        else:
            valve_status = "Failed"
            cliodynamic_risk = "High (trial de novo)"
        
        return {
            "metric": "Arbitration Pressure Valve",
            "days_to_hearing": days_to_hearing,
            "settlement_probability": round(settlement_probability * 100, 1),
            "exposure_min": min_exp,
            "exposure_max": max_exp,
            "urgency": round(urgency * 100, 1),
            "valve_status": valve_status,
            "cliodynamic_risk": cliodynamic_risk,
            "resolution_type": "Pressure Release" if valve_status == "Effective" else "Forever War"
        }
    
    def analyze_multi_tenancy_stability(self,
                                        domains: List[Dict]) -> Dict:
        """
        Analyze stability across multiple tenancies (Legal, Technical, Economic)
        
        Each domain has:
        - Tenants (competing actors)
        - Pressure (stress factors)
        - Inflection (decision points)
        """
        domain_analyses = []
        total_pressure = 0
        
        for domain in domains:
            analysis = {
                "domain": domain["name"],
                "tenants": domain["tenants"],
                "pressure": domain["pressure"],
                "inflection": domain["inflection"],
                "stability": self._compute_domain_stability(domain)
            }
            domain_analyses.append(analysis)
            total_pressure += domain["pressure"]
        
        avg_pressure = total_pressure / len(domains) if domains else 0
        
        return {
            "metric": "Multi-Tenancy Stability",
            "domains": domain_analyses,
            "average_pressure": round(avg_pressure, 2),
            "system_stability": self._interpret_system_stability(domain_analyses),
            "weakest_domain": min(domain_analyses, key=lambda x: x["stability"])["domain"]
        }
    
    def _interpret_eor(self, eor: float) -> str:
        if eor < 1.0:
            return "Normal"
        elif eor < 2.0:
            return "Mild Overproduction"
        elif eor < 5.0:
            return "Severe Overproduction"
        else:
            return "Critical (Revolutionary Conditions)"
    
    def _map_to_phase(self, eor: float) -> str:
        """Map EOR to cliodynamic phase"""
        if eor < 1.0:
            return "Integration (T0)"
        elif eor < 2.0:
            return "Stagflation (T1)"
        elif eor < 5.0:
            return "Crisis (T2)"
        else:
            return "Disintegration/Revolution (T3)"
    
    def _compute_pressure(self, eor: float) -> float:
        """Compute pressure score 0-100"""
        return min(100, eor * 20)
    
    def _compute_domain_stability(self, domain: Dict) -> float:
        """Compute domain stability score 0-100"""
        base = 100
        base -= domain["pressure"] * 10
        if "resolution" in domain["inflection"].lower():
            base += 10
        return max(0, min(100, base))
    
    def _interpret_system_stability(self, analyses: List[Dict]) -> str:
        avg_stability = sum(a["stability"] for a in analyses) / len(analyses)
        if avg_stability > 70:
            return "Stable"
        elif avg_stability > 40:
            return "Stressed"
        else:
            return "Critical"
    
    def generate_stability_report(self) -> Dict:
        """Generate comprehensive political stability report"""
        
        # Dashboard sprawl analysis
        dashboard_analysis = self.analyze_dashboard_sprawl(
            dashboard_count=97,
            functional_dashboards=5
        )
        
        # Employment credentialism
        employment_analysis = self.analyze_employment_credentialism(
            applications=22,
            interviews=0,
            offers=0,
            pitt_wwphs_creds=True
        )
        
        # Income pipeline
        income_analysis = self.analyze_income_pipeline_diversity(
            sources=["720.chat", "TAG.VOTE", "consulting"],
            monthly_revenue={
                "720.chat": 0,
                "TAG.VOTE": 0,
                "consulting": 0
            }
        )
        
        # Arbitration pressure valve
        arbitration_analysis = self.analyze_arbitration_pressure_valve(
            days_to_hearing=39,
            settlement_probability=0.6,
            exposure_range=(99000, 297000)
        )
        
        # Multi-tenancy
        multi_tenancy = self.analyze_multi_tenancy_stability([
            {
                "name": "Legal (MAA Arbitration)",
                "tenants": ["SB (pro se)", "MAA (institutional)"],
                "pressure": 8.5,
                "inflection": "April 16 settlement vs trial de novo"
            },
            {
                "name": "Technical (Agentic-Flow)",
                "tenants": ["SA mode", "FA mode", "M mode"],
                "pressure": 6.0,
                "inflection": "TCC fix (exit-126 → exit-0)"
            },
            {
                "name": "Economic (Income)",
                "tenants": ["720.chat", "TAG.VOTE", "consulting", "apex employment"],
                "pressure": 7.0,
                "inflection": "April 2 arbitration form deadline"
            }
        ])
        
        return {
            "generated": datetime.now().isoformat(),
            "cliodynamic_framework": "Turchin Structural-Demographic Theory",
            "analyses": [
                dashboard_analysis,
                employment_analysis,
                income_analysis,
                arbitration_analysis,
                multi_tenancy
            ],
            "summary": {
                "elite_overproduction": dashboard_analysis["eor"],
                "credentialism_blocking": employment_analysis["blocking"],
                "income_diversity": income_analysis["diversity_status"],
                "pressure_valve_status": arbitration_analysis["valve_status"],
                "system_stability": multi_tenancy["system_stability"]
            }
        }


def main():
    analyzer = CliodynamicAnalyzer()
    
    print("=" * 60)
    print("POLITICAL STABILITY & ELITE OVERPRODUCTION ANALYSIS")
    print("720.chat / TAG.VOTE Consulting Framework")
    print("=" * 60)
    print()
    
    report = analyzer.generate_stability_report()
    
    # Print summary
    print("📊 SUMMARY INDICATORS")
    print("-" * 40)
    for key, value in report["summary"].items():
        print(f"  {key.replace('_', ' ').title()}: {value}")
    
    print()
    print("🔍 DETAILED ANALYSES")
    print("-" * 40)
    for analysis in report["analyses"]:
        print(f"\n{analysis['metric']}:")
        for key, value in analysis.items():
            if key != "metric":
                print(f"  {key}: {value}")
    
    print()
    print("=" * 60)
    print("Framework: Turchin's Ages of Discord (2016)")
    print("Integration: Multi-tenancy cliodynamic mapping")
    print("=" * 60)


if __name__ == "__main__":
    main()
