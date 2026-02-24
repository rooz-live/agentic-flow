#!/usr/bin/env python3
"""
Systemic Indifference Analyzer
Multi-organization pattern detection for litigation readiness

DoR (Definition of Ready):
    - Organization profiles populated (name, type, timeline, evidence)
    - Evidence chains verified (work orders, screenshots, medical records)
    - Scoring rubric agreed (timeline/evidence/levels/consistency → 0-40)
DoD (Definition of Done):
    - Systemic score calculated per organization (MAA: 40/40 target)
    - Verdict assigned (LITIGATION-READY / SETTLEMENT-ONLY / DEFER / NOT SYSTEMIC)
    - Cross-org comparison report generated
    - Evidence chain validation passes for verified items
"""

import re
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from pathlib import Path


@dataclass
class OrganizationProfile:
    """Profile for organization systemic analysis"""
    name: str
    org_type: str  # "property_management", "bank", "telecom", "government", "credit_bureau"
    timeline_months: float
    evidence_count: int
    org_levels: int
    pattern_consistency: float  # 0.0-1.0
    
    def calculate_systemic_score(self) -> int:
        """Calculate systemic indifference score 0-40"""
        score = 0
        
        # Timeline weight (max 10 points)
        if self.timeline_months >= 24:
            score += 10
        elif self.timeline_months >= 12:
            score += 7
        elif self.timeline_months >= 6:
            score += 4
        elif self.timeline_months >= 3:
            score += 2
        
        # Evidence weight (max 10 points)
        if self.evidence_count >= 40:
            score += 10
        elif self.evidence_count >= 20:
            score += 7
        elif self.evidence_count >= 10:
            score += 4
        elif self.evidence_count >= 5:
            score += 2
        
        # Organizational levels (max 10 points)
        if self.org_levels >= 4:
            score += 10
        elif self.org_levels >= 3:
            score += 7
        elif self.org_levels >= 2:
            score += 4
        else:
            score += 1
        
        # Pattern consistency (max 10 points)
        score += int(self.pattern_consistency * 10)
        
        return min(score, 40)
    
    def get_verdict(self) -> str:
        """Get litigation readiness verdict"""
        score = self.calculate_systemic_score()
        
        if score >= 35:
            return "LITIGATION-READY (complete SoR)"
        elif score >= 25:
            return "STRONG SETTLEMENT (substantial SoR)"
        elif score >= 15:
            return "SETTLEMENT-ONLY (insufficient evidence)"
        elif score >= 10:
            return "DEFER TO PHASE LATER"
        else:
            return "NOT SYSTEMIC (isolated event)"


@dataclass
class EvidenceChain:
    """Evidence chain for systemic analysis"""
    evidence_type: str
    date_acquired: datetime
    source: str
    verification_status: str  # "verified", "pending", "disputed"
    related_work_orders: List[str]
    
    def is_verified(self) -> bool:
        return self.verification_status == "verified"


class SystemicIndifferenceAnalyzer:
    """
    Analyzer for systemic indifference patterns across organizations
    """
    
    def __init__(self):
        self.organizations: Dict[str, OrganizationProfile] = {}
        self.evidence_chains: Dict[str, List[EvidenceChain]] = {}
        
        # Pre-populate known entities from user context
        self._initialize_entities()
    
    def _initialize_entities(self):
        """Initialize with known systemic entities"""
        
        # MAA - Primary litigation target
        self.organizations["MAA"] = OrganizationProfile(
            name="Mid-America Apartment Communities",
            org_type="property_management",
            timeline_months=22.0,  # June 2024 - March 2026
            evidence_count=40,  # 40+ work orders
            org_levels=4,  # Maintenance → Property → Regional → Corporate
            pattern_consistency=0.95
        )
        
        # Apex/BofA
        self.organizations["Apex_BofA"] = OrganizationProfile(
            name="Apex/Bank of America",
            org_type="bank",
            timeline_months=0.0,  # TBD - pending
            evidence_count=0,  # INCOMPLETE
            org_levels=3,  # Branch → Regional → Corporate
            pattern_consistency=0.0
        )
        
        # US Bank
        self.organizations["US_Bank"] = OrganizationProfile(
            name="US Bank",
            org_type="bank",
            timeline_months=0.0,  # TBD
            evidence_count=0,  # INCOMPLETE
            org_levels=2,
            pattern_consistency=0.0
        )
        
        # T-Mobile
        self.organizations["TMobile"] = OrganizationProfile(
            name="T-Mobile",
            org_type="telecom",
            timeline_months=0.0,  # TBD
            evidence_count=0,  # INCOMPLETE
            org_levels=2,
            pattern_consistency=0.0
        )
        
        # Credit Bureaus
        self.organizations["Credit_Bureaus"] = OrganizationProfile(
            name="Credit Bureaus",
            org_type="credit_bureau",
            timeline_months=0.0,  # TBD
            evidence_count=0,  # INCOMPLETE
            org_levels=1,
            pattern_consistency=0.0
        )
        
        # IRS
        self.organizations["IRS"] = OrganizationProfile(
            name="IRS",
            org_type="government",
            timeline_months=0.1,  # Single incident
            evidence_count=1,  # Appointment cancellation
            org_levels=1,
            pattern_consistency=0.1
        )
        
        # Initialize evidence chains
        self.evidence_chains["MAA"] = [
            EvidenceChain(
                evidence_type="work_orders",
                date_acquired=datetime(2024, 6, 1),
                source="resident_portal",
                verification_status="verified",
                related_work_orders=[f"WO-{i:04d}" for i in range(1, 41)]
            ),
            EvidenceChain(
                evidence_type="portal_screenshots",
                date_acquired=datetime(2025, 1, 15),
                source="personal_device",
                verification_status="verified",
                related_work_orders=[]
            ),
            EvidenceChain(
                evidence_type="medical_records",
                date_acquired=datetime(2025, 2, 1),
                source="healthcare_provider",
                verification_status="verified",
                related_work_orders=[]
            )
        ]
    
    def analyze_organization(self, org_name: str) -> Dict:
        """Analyze single organization for systemic indifference"""
        
        org = self.organizations.get(org_name)
        if not org:
            return {"error": f"Organization {org_name} not found"}
        
        score = org.calculate_systemic_score()
        verdict = org.get_verdict()
        evidence = self.evidence_chains.get(org_name, [])
        
        return {
            "organization": org_name,
            "profile": asdict(org),
            "systemic_score": score,
            "max_score": 40,
            "verdict": verdict,
            "evidence_count": len(evidence),
            "verified_evidence": sum(1 for e in evidence if e.is_verified()),
            "recommendation": self._generate_recommendation(org, score)
        }
    
    def analyze_all(self) -> Dict[str, Dict]:
        """Analyze all registered organizations"""
        results = {}
        
        for org_name in self.organizations:
            results[org_name] = self.analyze_organization(org_name)
        
        return results
    
    def _generate_recommendation(self, org: OrganizationProfile, score: int) -> str:
        """Generate strategic recommendation based on score"""
        
        if score >= 35:
            return (
                f"Proceed with litigation against {org.name}. "
                f"Complete SoR with {org.evidence_count} verified evidence items. "
                f"Target treble damages under N.C. § 75-16."
            )
        elif score >= 25:
            return (
                f"Strong settlement position against {org.name}. "
                f"Use systemic score of {score}/40 as leverage. "
                f"Request 2x base damages."
            )
        elif score >= 15:
            return (
                f"Settlement-only for {org.name}. "
                f"Insufficient evidence ({org.evidence_count} items) for litigation. "
                f"Document for future pattern establishment."
            )
        elif score >= 10:
            return (
                f"Defer {org.name} to Phase LATER. "
                f"Gather additional evidence to establish pattern. "
                f"Current score {score}/40 insufficient."
            )
        else:
            return (
                f"{org.name} incident is NOT SYSTEMIC. "
                f"Isolated event with insufficient pattern. "
                f"Handle as discrete complaint."
            )
    
    def compare_organizations(self) -> Dict:
        """Compare all organizations for pattern analysis"""
        
        results = self.analyze_all()
        
        # Sort by systemic score
        sorted_orgs = sorted(
            results.items(),
            key=lambda x: x[1]["systemic_score"],
            reverse=True
        )
        
        return {
            "rankings": [
                {
                    "rank": i + 1,
                    "organization": name,
                    "score": data["systemic_score"],
                    "verdict": data["verdict"]
                }
                for i, (name, data) in enumerate(sorted_orgs)
            ],
            "litigation_ready": [
                name for name, data in sorted_orgs
                if data["systemic_score"] >= 35
            ],
            "settlement_candidates": [
                name for name, data in sorted_orgs
                if 25 <= data["systemic_score"] < 35
            ],
            "deferred": [
                name for name, data in sorted_orgs
                if data["systemic_score"] < 15
            ]
        }
    
    def extract_cross_org_patterns(self) -> List[Dict]:
        """Extract patterns across multiple organizations"""
        
        patterns = []
        
        # Check for industry-wide patterns
        property_mgmts = [
            org for org in self.organizations.values()
            if org.org_type == "property_management"
        ]
        
        if len(property_mgmts) >= 2:
            patterns.append({
                "pattern_type": "industry_wide",
                "industry": "property_management",
                "organizations": [org.name for org in property_mgmts],
                "significance": "Class action potential"
            })
        
        # Check for financial services patterns
        banks = [
            org for org in self.organizations.values()
            if org.org_type == "bank"
        ]
        
        if len(banks) >= 2:
            patterns.append({
                "pattern_type": "financial_services",
                "organizations": [org.name for org in banks],
                "significance": "CFPB complaint potential"
            })
        
        return patterns
    
    def generate_report(self) -> str:
        """Generate comprehensive systemic indifference report"""
        
        analysis = self.analyze_all()
        comparison = self.compare_organizations()
        patterns = self.extract_cross_org_patterns()
        
        report = f"""# Systemic Indifference Analysis Report
Generated: {datetime.now().isoformat()}

## Executive Summary

| Organization | Score | Verdict |
|--------------|-------|---------|
"""
        
        for org_name, data in analysis.items():
            score = data["systemic_score"]
            verdict = data["verdict"]
            report += f"| {org_name} | {score}/40 | {verdict} |\n"
        
        report += f"""
## Litigation Readiness

**LITIGATION-READY ({len(comparison['litigation_ready'])}):**
{chr(10).join(f"- {org}" for org in comparison['litigation_ready'])}

**STRONG SETTLEMENT ({len(comparison['settlement_candidates'])}):**
{chr(10).join(f"- {org}" for org in comparison['settlement_candidates'])}

**DEFERRED ({len(comparison['deferred'])}):**
{chr(10).join(f"- {org}" for org in comparison['deferred'])}

## Detailed Analysis

"""
        
        for org_name, data in analysis.items():
            report += f"""### {org_name}
- **Timeline**: {data['profile']['timeline_months']:.1f} months
- **Evidence Items**: {data['verified_evidence']}/{data['evidence_count']} verified
- **Organizational Levels**: {data['profile']['org_levels']}
- **Pattern Consistency**: {data['profile']['pattern_consistency']:.0%}
- **Systemic Score**: {data['systemic_score']}/40
- **Recommendation**: {data['recommendation']}

"""
        
        if patterns:
            report += "## Cross-Organization Patterns\n\n"
            for pattern in patterns:
                report += f"""### {pattern['pattern_type']}
- **Industry**: {pattern.get('industry', 'N/A')}
- **Organizations**: {', '.join(pattern['organizations'])}
- **Significance**: {pattern['significance']}

"""
        
        report += """## Strategic Recommendations

1. **Immediate Action**: Focus litigation resources on LITIGATION-READY organizations
2. **Settlement Priority**: Negotiate with STRONG SETTLEMENT candidates first
3. **Evidence Gathering**: Continue documenting DEFERRED organizations
4. **Pattern Leverage**: Use cross-org patterns for class action consideration

## Legal Basis

Systemic indifference scoring based on:
- Duration of pattern (timeline months)
- Volume of evidence (evidence count)
- Organizational depth (levels involved)
- Pattern consistency (failure rate)

Reference: N.C. Gen. Stat. § 75-1.1 (UDTPA), § 75-16 (Treble Damages)
"""
        
        return report
    
    def export_json(self, filepath: str):
        """Export analysis to JSON"""
        
        data = {
            "generated_at": datetime.now().isoformat(),
            "organizations": {
                name: asdict(org) for name, org in self.organizations.items()
            },
            "analysis": self.analyze_all(),
            "comparison": self.compare_organizations(),
            "patterns": self.extract_cross_org_patterns()
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Systemic Indifference Analyzer"
    )
    parser.add_argument(
        "--org", "-o",
        help="Analyze specific organization"
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Analyze all organizations"
    )
    parser.add_argument(
        "--report", "-r",
        action="store_true",
        help="Generate full report"
    )
    parser.add_argument(
        "--export", "-e",
        help="Export to JSON file"
    )
    parser.add_argument(
        "--compare", "-c",
        action="store_true",
        help="Compare organizations"
    )
    
    args = parser.parse_args()
    
    analyzer = SystemicIndifferenceAnalyzer()
    
    if args.org:
        result = analyzer.analyze_organization(args.org)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.all:
        results = analyzer.analyze_all()
        print(json.dumps(results, indent=2, default=str))
    
    elif args.report:
        report = analyzer.generate_report()
        print(report)
        
        # Save to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"SYSTEMIC-INDIFFERENCE-REPORT-{timestamp}.md"
        with open(filename, 'w') as f:
            f.write(report)
        print(f"\nReport saved: {filename}")
    
    elif args.compare:
        comparison = analyzer.compare_organizations()
        print(json.dumps(comparison, indent=2, default=str))
    
    elif args.export:
        analyzer.export_json(args.export)
        print(f"Exported to: {args.export}")
    
    else:
        # Default: generate report
        report = analyzer.generate_report()
        print(report)


if __name__ == "__main__":
    main()
