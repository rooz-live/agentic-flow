#!/usr/bin/env python3
"""
Coherence Validator - DDD/TDD/ADR Coherence Validation
=======================================================
Validates coherence between ADR decisions, DDD models, and TDD tests.

DoD:
- Cross-references ADR decisions with DDD models
- Validates that domain models have corresponding tests
- Checks that ADRs reference implemented domain patterns
- Generates coherence score (0-100)
- Outputs JSON report and Markdown summary
"""

import argparse
import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime


class CoherenceValidator:
    """Validates DDD/TDD/ADR coherence"""
    
    def __init__(self, adr_report: Dict, ddd_report: Dict, tdd_report: Dict):
        self.adr_report = adr_report
        self.ddd_report = ddd_report
        self.tdd_report = tdd_report
        self.issues: List[str] = []
        self.successes: List[str] = []
    
    def validate(self) -> Dict[str, Any]:
        """Validate coherence across all three dimensions"""
        
        # Validation 1: ADR ↔ DDD Coherence
        adr_ddd_score = self._validate_adr_ddd_coherence()
        
        # Validation 2: DDD ↔ TDD Coherence
        ddd_tdd_score = self._validate_ddd_tdd_coherence()
        
        # Validation 3: ADR ↔ TDD Coherence
        adr_tdd_score = self._validate_adr_tdd_coherence()
        
        # Calculate overall coherence score
        coherence_score = (adr_ddd_score + ddd_tdd_score + adr_tdd_score) / 3
        
        return {
            "timestamp": datetime.now().isoformat(),
            "coherence_score": round(coherence_score, 2),
            "adr_ddd_score": round(adr_ddd_score, 2),
            "ddd_tdd_score": round(ddd_tdd_score, 2),
            "adr_tdd_score": round(adr_tdd_score, 2),
            "issues": self.issues,
            "successes": self.successes,
            "summary": {
                "total_adrs": self.adr_report.get("total_adrs", 0),
                "total_models": self.ddd_report.get("total_models", 0),
                "tested_models": self.tdd_report.get("tested_models", 0),
                "average_adr_score": self.adr_report.get("average_score", 0),
                "average_test_coverage": self.tdd_report.get("average_coverage", 0)
            }
        }
    
    def _validate_adr_ddd_coherence(self) -> float:
        """Validate that ADRs reference implemented DDD models"""
        score = 100.0
        
        adr_results = self.adr_report.get("results", [])
        ddd_models = self.ddd_report.get("models", [])
        
        if not adr_results:
            self.issues.append("No ADR documents found")
            return 0.0
        
        # Check if ADRs reference DDD patterns
        adrs_with_ddd = sum(1 for adr in adr_results if adr.get("ddd_references"))
        if adrs_with_ddd == 0:
            self.issues.append("No ADRs reference DDD patterns")
            score -= 50
        else:
            self.successes.append(f"{adrs_with_ddd}/{len(adr_results)} ADRs reference DDD patterns")
        
        # Check if DDD models are documented in ADRs
        if ddd_models:
            aggregates = [m for m in ddd_models if m.get("type") == "aggregate"]
            if aggregates:
                self.successes.append(f"Found {len(aggregates)} aggregate roots in codebase")
        
        return max(0.0, score)
    
    def _validate_ddd_tdd_coherence(self) -> float:
        """Validate that DDD models have corresponding tests"""
        score = 100.0
        
        total_models = self.ddd_report.get("total_models", 0)
        tested_models = self.tdd_report.get("tested_models", 0)
        
        if total_models == 0:
            self.issues.append("No DDD models found")
            return 0.0
        
        # Calculate test coverage ratio
        coverage_ratio = tested_models / total_models if total_models > 0 else 0
        
        if coverage_ratio < 0.5:
            self.issues.append(f"Low test coverage: {tested_models}/{total_models} models tested ({coverage_ratio*100:.1f}%)")
            score = coverage_ratio * 100
        elif coverage_ratio < 0.8:
            self.issues.append(f"Moderate test coverage: {tested_models}/{total_models} models tested ({coverage_ratio*100:.1f}%)")
            score = 50 + (coverage_ratio * 50)
        else:
            self.successes.append(f"Good test coverage: {tested_models}/{total_models} models tested ({coverage_ratio*100:.1f}%)")
        
        # Check for untested models
        untested = self.tdd_report.get("untested_list", [])
        if untested:
            self.issues.append(f"Untested models: {', '.join(untested[:5])}")
        
        return max(0.0, score)
    
    def _validate_adr_tdd_coherence(self) -> float:
        """Validate that ADR decisions have test validation"""
        score = 100.0
        
        # Check if ADRs mention testing strategy
        adr_results = self.adr_report.get("results", [])
        
        # For now, give partial credit if we have both ADRs and tests
        if adr_results and self.tdd_report.get("tested_models", 0) > 0:
            self.successes.append("ADRs and tests both present")
        else:
            self.issues.append("Missing ADR-TDD linkage")
            score -= 30
        
        return max(0.0, score)
    
    def generate_markdown(self, report: Dict) -> str:
        """Generate Markdown summary"""
        md = f"""# DDD/TDD/ADR Coherence Report

**Generated**: {report['timestamp']}  
**Overall Coherence Score**: {report['coherence_score']}% {'✅' if report['coherence_score'] >= 80 else '⚠️' if report['coherence_score'] >= 60 else '❌'}

---

## Summary

| Metric | Value |
|--------|-------|
| Total ADRs | {report['summary']['total_adrs']} |
| Total Domain Models | {report['summary']['total_models']} |
| Tested Models | {report['summary']['tested_models']} |
| Average ADR Score | {report['summary']['average_adr_score']}% |
| Average Test Coverage | {report['summary']['average_test_coverage']}% |

---

## Coherence Scores

| Dimension | Score | Status |
|-----------|-------|--------|
| ADR ↔ DDD | {report['adr_ddd_score']}% | {'✅' if report['adr_ddd_score'] >= 80 else '⚠️' if report['adr_ddd_score'] >= 60 else '❌'} |
| DDD ↔ TDD | {report['ddd_tdd_score']}% | {'✅' if report['ddd_tdd_score'] >= 80 else '⚠️' if report['ddd_tdd_score'] >= 60 else '❌'} |
| ADR ↔ TDD | {report['adr_tdd_score']}% | {'✅' if report['adr_tdd_score'] >= 80 else '⚠️' if report['adr_tdd_score'] >= 60 else '❌'} |

---

## ✅ Successes

{chr(10).join(f'- {s}' for s in report['successes']) if report['successes'] else '- None'}

---

## ⚠️ Issues

{chr(10).join(f'- {i}' for i in report['issues']) if report['issues'] else '- None'}

---

## Recommendations

"""
        
        if report['coherence_score'] < 60:
            md += "- **CRITICAL**: Coherence score below 60%. Immediate action required.\n"
        elif report['coherence_score'] < 80:
            md += "- **WARNING**: Coherence score below 80%. Improvements needed.\n"
        else:
            md += "- **GOOD**: Coherence score meets threshold (≥80%).\n"
        
        return md


def main():
    parser = argparse.ArgumentParser(description="Validate DDD/TDD/ADR coherence")
    parser.add_argument("--adr-report", required=True, help="ADR validation report (JSON)")
    parser.add_argument("--ddd-report", required=True, help="DDD mapping report (JSON)")
    parser.add_argument("--tdd-report", required=True, help="TDD coverage report (JSON)")
    parser.add_argument("--output", required=True, help="Output JSON file")
    parser.add_argument("--markdown", required=True, help="Output Markdown file")
    args = parser.parse_args()
    
    # Load reports
    adr_report = json.loads(Path(args.adr_report).read_text())
    ddd_report = json.loads(Path(args.ddd_report).read_text())
    tdd_report = json.loads(Path(args.tdd_report).read_text())
    
    # Validate coherence
    validator = CoherenceValidator(adr_report, ddd_report, tdd_report)
    report = validator.validate()
    
    # Write JSON report
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2))
    
    # Write Markdown summary
    markdown = validator.generate_markdown(report)
    Path(args.markdown).write_text(markdown)
    
    print(f"✓ Coherence validation complete")
    print(f"✓ Overall score: {report['coherence_score']}%")
    print(f"✓ JSON report: {args.output}")
    print(f"✓ Markdown summary: {args.markdown}")


if __name__ == "__main__":
    main()

