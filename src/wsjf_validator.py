#!/usr/bin/env python3
"""
Robust WSJF Calculator
Anti-pattern detection and bias mitigation

DoR (Definition of Ready):
    - Portfolio items have value_source, criticality_rationale, risk_evidence
    - Job size breakdown provided per item
    - Validation rules configured (max_critical_items, wsjf_cap)
DoD (Definition of Done):
    - Anti-patterns detected: value_inflation, criticality_gaming,
      risk_underestimation, job_size_splitting
    - Portfolio-level systemic bias checks pass
    - Validation report exportable as JSON
"""

import json
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List


@dataclass
class WSJFItem:
    """WSJF prioritization item with validation"""
    id: str
    name: str
    business_value: float  # 1-20
    time_criticality: float  # 1-20
    risk_opportunity: float  # 1-20
    job_size: float  # 1-5 (small) to 20 (large)
    
    # Validation fields
    value_source: str
    criticality_rationale: str
    risk_evidence: List[str]
    size_breakdown: Dict[str, float]
    
    # Calculated
    wsjf_score: float = 0.0
    validation_status: str = "pending"
    anti_patterns: List[str] = None
    
    def __post_init__(self):
        if self.anti_patterns is None:
            self.anti_patterns = []
        self.wsjf_score = self.calculate_wsjf()
        self.validate()
    
    def calculate_wsjf(self) -> float:
        """Calculate WSJF score: (BV + TC + RO) / Job Size"""
        if self.job_size <= 0:
            return 0.0
        return (self.business_value + self.time_criticality + self.risk_opportunity) / self.job_size
    
    def validate(self):
        """Detect anti-patterns and biases"""
        self.anti_patterns = []
        
        # Anti-pattern 1: Value inflation
        if self.business_value > 15:
            if (not self.value_source or
                    "benchmark" not in self.value_source.lower()):
                self.anti_patterns.append("value_inflation")
        
        # Anti-pattern 2: Criticality gaming
        if self.time_criticality >= 18:
            if "deadline" not in self.criticality_rationale.lower():
                self.anti_patterns.append("criticality_gaming")
        
        # Anti-pattern 3: Risk underestimation
        if self.risk_opportunity < 5 and len(self.risk_evidence) == 0:
            self.anti_patterns.append("risk_underestimation")
        
        # Anti-pattern 4: Job size manipulation
        if (self.job_size < 3 and
                sum(self.size_breakdown.values()) > 5):
            self.anti_patterns.append("job_size_splitting")
        
        # Set validation status
        if len(self.anti_patterns) > 0:
            self.validation_status = "flagged"
        elif self.wsjf_score > 40:  # Cap at reasonable maximum
            self.validation_status = "suspicious"
        else:
            self.validation_status = "valid"


class WSJFValidator:
    """Robust WSJF validation and bias detection"""
    
    def __init__(self):
        self.items: Dict[str, WSJFItem] = {}
        self.validation_rules = {
            "max_critical_items": 0.2,  # 20% can be critical
            "value_benchmark_required": True,
            "risk_evidence_min": 1,
            "job_size_min": 1.0,
            "wsjf_cap": 50.0
        }
    
    def add_item(self, item: WSJFItem):
        """Add item for validation"""
        self.items[item.id] = item
    
    def validate_portfolio(self) -> Dict:
        """Validate entire portfolio for systemic biases"""
        
        # Portfolio-level checks
        total_items = len(self.items)
        critical_items = sum(1 for item in self.items.values() if item.time_criticality >= 15)
        
        portfolio_issues = []
        
        # Check critical item concentration
        if critical_items / total_items > self.validation_rules["max_critical_items"]:
            portfolio_issues.append("critical_concentration")
        
        # Check value distribution
        values = [item.business_value for item in self.items.values()]
        avg_value = sum(values) / len(values) if values else 0
        
        if avg_value > 12:
            portfolio_issues.append("value_inflation_portfolio")
        
        # Generate report
        return {
            "timestamp": datetime.now().isoformat(),
            "total_items": total_items,
            "critical_items": critical_items,
            "critical_percentage": critical_items / total_items if total_items > 0 else 0,
            "portfolio_issues": portfolio_issues,
            "items": {id: asdict(item) for id, item in self.items.items()},
            "recommendations": self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate portfolio-level recommendations"""
        recs = []
        
        # Count anti-patterns
        anti_pattern_counts = {}
        for item in self.items.values():
            for pattern in item.anti_patterns:
                anti_pattern_counts[pattern] = anti_pattern_counts.get(pattern, 0) + 1
        
        # Generate recommendations based on patterns
        if anti_pattern_counts.get("value_inflation", 0) > 0:
            recs.append("Require external benchmarks for high-value items")
        
        if anti_pattern_counts.get("criticality_gaming", 0) > 0:
            recs.append("Implement deadline-based criticality validation")
        
        if anti_pattern_counts.get("risk_underestimation", 0) > 0:
            recs.append("Mandate risk evidence for all items")
        
        if anti_pattern_counts.get("job_size_splitting", 0) > 0:
            recs.append("Review job size breakdowns for manipulation")
        
        return recs
    
    def export_validation_report(self, filepath: str):
        """Export detailed validation report"""
        report = self.validate_portfolio()
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2, default=str)


def main():
    """CLI for WSJF validation"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Robust WSJF Calculator")
    parser.add_argument("--validate", action="store_true", help="Validate portfolio")
    parser.add_argument("--export", help="Export report to file")
    parser.add_argument("--sample", action="store_true", help="Generate sample data")
    
    args = parser.parse_args()
    
    validator = WSJFValidator()
    
    if args.sample:
        # Generate sample items demonstrating anti-patterns
        items = [
            WSJFItem(
                id="wsjf-001",
                name="Budget Dashboard MVP",
                business_value=18.0,  # High value
                time_criticality=15.0,  # Critical
                risk_opportunity=12.0,
                job_size=8.0,
                value_source="Internal estimate",
                criticality_rationale="Executive priority",
                risk_evidence=["Reduces financial risk"],
                size_breakdown={"frontend": 3, "backend": 3, "testing": 2}
            ),
            WSJFItem(
                id="wsjf-002",
                name="API Integration",
                business_value=8.0,
                time_criticality=10.0,
                risk_opportunity=6.0,
                job_size=4.0,
                value_source="Customer feedback",
                criticality_rationale="Q2 deadline",
                risk_evidence=["Technical debt reduction"],
                size_breakdown={"development": 2, "testing": 1, "deployment": 1}
            )
        ]
        
        for item in items:
            validator.add_item(item)
    
    if args.validate:
        report = validator.validate_portfolio()
        print(json.dumps(report, indent=2, default=str))
        
        if args.export:
            validator.export_validation_report(args.export)
            print(f"Report exported: {args.export}")


if __name__ == "__main__":
    main()
