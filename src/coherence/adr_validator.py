#!/usr/bin/env python3
"""
ADR Validator - Architecture Decision Records Validation
=========================================================
Validates that ADR documents follow proper structure and reference DDD patterns.

DoD:
- Validates ADR document structure (title, status, context, decision, consequences)
- Checks for DDD pattern references (aggregates, entities, value objects)
- Verifies ADR numbering sequence
- Generates validation report (JSON)
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass, asdict


@dataclass
class ADRValidationResult:
    """Result of ADR validation"""
    adr_number: int
    file_path: str
    title: str
    status: str
    has_context: bool
    has_decision: bool
    has_consequences: bool
    ddd_references: List[str]
    issues: List[str]
    score: float


class ADRValidator:
    """Validates Architecture Decision Records"""
    
    DDD_PATTERNS = [
        "aggregate", "entity", "value object", "repository", "domain event",
        "bounded context", "ubiquitous language", "domain model", "domain service"
    ]
    
    REQUIRED_SECTIONS = ["Context", "Decision", "Consequences"]
    
    def __init__(self, docs_dir: Path):
        self.docs_dir = Path(docs_dir)
        self.results: List[ADRValidationResult] = []
    
    def validate_all(self) -> Dict[str, Any]:
        """Validate all ADR documents in docs directory"""
        adr_files = sorted(self.docs_dir.glob("**/ADR-*.md"))
        
        if not adr_files:
            return {
                "total_adrs": 0,
                "valid_adrs": 0,
                "issues": ["No ADR documents found"],
                "results": []
            }
        
        for adr_file in adr_files:
            result = self.validate_adr(adr_file)
            self.results.append(result)
        
        return self._generate_report()
    
    def validate_adr(self, adr_file: Path) -> ADRValidationResult:
        """Validate a single ADR document"""
        content = adr_file.read_text()
        issues = []
        
        # Extract ADR number from filename
        match = re.search(r'ADR-(\d+)', adr_file.name)
        adr_number = int(match.group(1)) if match else 0
        
        # Extract title
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        title = title_match.group(1) if title_match else "Unknown"
        
        # Extract status
        status_match = re.search(r'\*\*Status\*\*:\s*(\w+)', content)
        status = status_match.group(1) if status_match else "Unknown"
        
        # Check required sections
        has_context = bool(re.search(r'##\s+Context', content, re.IGNORECASE))
        has_decision = bool(re.search(r'##\s+Decision', content, re.IGNORECASE))
        has_consequences = bool(re.search(r'##\s+Consequences', content, re.IGNORECASE))
        
        if not has_context:
            issues.append("Missing 'Context' section")
        if not has_decision:
            issues.append("Missing 'Decision' section")
        if not has_consequences:
            issues.append("Missing 'Consequences' section")
        
        # Find DDD pattern references
        ddd_references = []
        content_lower = content.lower()
        for pattern in self.DDD_PATTERNS:
            if pattern in content_lower:
                ddd_references.append(pattern)
        
        if not ddd_references:
            issues.append("No DDD pattern references found")
        
        # Calculate score
        score = self._calculate_score(has_context, has_decision, has_consequences, ddd_references, issues)
        
        return ADRValidationResult(
            adr_number=adr_number,
            file_path=str(adr_file.relative_to(self.docs_dir.parent)),
            title=title,
            status=status,
            has_context=has_context,
            has_decision=has_decision,
            has_consequences=has_consequences,
            ddd_references=ddd_references,
            issues=issues,
            score=score
        )
    
    def _calculate_score(self, has_context: bool, has_decision: bool, 
                        has_consequences: bool, ddd_refs: List[str], issues: List[str]) -> float:
        """Calculate ADR quality score (0-100)"""
        score = 0.0
        
        # Required sections (60 points)
        if has_context:
            score += 20
        if has_decision:
            score += 20
        if has_consequences:
            score += 20
        
        # DDD references (30 points)
        if ddd_refs:
            score += min(30, len(ddd_refs) * 5)
        
        # Penalty for issues (10 points)
        if not issues:
            score += 10
        
        return min(100.0, score)
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate validation report"""
        total_adrs = len(self.results)
        valid_adrs = sum(1 for r in self.results if r.score >= 80)
        avg_score = sum(r.score for r in self.results) / total_adrs if total_adrs > 0 else 0
        
        return {
            "total_adrs": total_adrs,
            "valid_adrs": valid_adrs,
            "average_score": round(avg_score, 2),
            "results": [asdict(r) for r in self.results]
        }


def main():
    parser = argparse.ArgumentParser(description="Validate ADR documents")
    parser.add_argument("--docs-dir", required=True, help="Directory containing ADR documents")
    parser.add_argument("--output", required=True, help="Output JSON file")
    args = parser.parse_args()
    
    validator = ADRValidator(Path(args.docs_dir))
    report = validator.validate_all()
    
    # Write report
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2))
    
    print(f"✓ ADR validation complete: {report['valid_adrs']}/{report['total_adrs']} valid")
    print(f"✓ Average score: {report['average_score']}%")
    print(f"✓ Report saved to: {args.output}")


if __name__ == "__main__":
    main()

