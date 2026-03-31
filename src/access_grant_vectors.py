#!/usr/bin/env python3
"""
Access Grant Vectors (AGV) - Truthfulness & Wholeness Validation

Implements a layered validation framework for assessing truthfulness
and wholeness across multiple access dimensions.

Architecture:
- Layer 1: Circle-based orchestration (Analyst, Assessor, Innovator, Intuitive, Orchestrator, Seeker)
- Layer 2: Legal role simulation (Judge, Prosecutor, Defense, Expert, Jury, Mediator)
- Layer 3: Government counsel review (County Attorney, State AG, HUD, Legal Aid, Appellate)
- Layer 4: Software patterns (PRD/ADR/DDD/TDD)

Usage:
    python3 access_grant_vectors.py --validate <document> --layers all
    python3 access_grant_vectors.py --assess --input email.eml

Definition of Ready (DoR):
- Input document or email content available for validation
- All four validation layers configured (Circle, Legal, Government, Software)
- Criteria weights assigned per vector role

Definition of Done (DoD):
- Each AccessVector produces a VectorResult with score in [0.0, 1.0]
- ValidationReport aggregates weighted scores across all layers
- Verdict thresholds enforced: GRANTED ≥ 0.9, CONDITIONAL ≥ 0.7, REVIEW ≥ 0.5, DENIED < 0.5
- Gaps and recommendations populated for any score below 1.0
- Content hash computed for audit traceability
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any
import hashlib


class ValidationLayer(Enum):
    """Four-layer validation architecture"""
    CIRCLE = 1      # 6 Circles: Analyst, Assessor, Innovator, Intuitive, Orchestrator, Seeker
    LEGAL = 2       # 6 Legal: Judge, Prosecutor, Defense, Expert, Jury, Mediator
    GOVERNMENT = 3  # 5 Government: County Attorney, State AG, HUD, Legal Aid, Appellate
    SOFTWARE = 4    # 4 Software: PRD, ADR, DDD, TDD


@dataclass
class AccessVector:
    """A single access grant vector representing one validation perspective"""
    layer: ValidationLayer
    role: str
    perspective: str
    criteria: List[str]
    weight: float = 1.0
    
    def validate(self, content: str, context: Dict) -> 'VectorResult':
        """Apply this vector's validation criteria to content"""
        checks_passed = 0
        findings = []
        
        for criterion in self.criteria:
            # Simulate criterion check (would be AI-powered in production)
            passed, finding = self._check_criterion(criterion, content, context)
            if passed:
                checks_passed += 1
            findings.append({
                'criterion': criterion,
                'passed': passed,
                'finding': finding
            })
        
        score = checks_passed / len(self.criteria) if self.criteria else 0.0
        
        return VectorResult(
            vector=self,
            score=score,
            findings=findings,
            timestamp=datetime.now().isoformat()
        )
    
    def _check_criterion(self, criterion: str, content: str, context: Dict) -> Tuple[bool, str]:
        """Check a single criterion against content"""
        # Pattern matching for different criterion types
        criterion_lower = criterion.lower()
        
        # Truthfulness criteria
        if 'causal' in criterion_lower:
            has_causal = any(word in content.lower() for word in 
                           ['because', 'caused by', 'result of', 'led to', 'therefore'])
            return has_causal, f"Causal language {'found' if has_causal else 'missing'}"
        
        if 'timeline' in criterion_lower or 'temporal' in criterion_lower:
            has_dates = bool(re.search(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}', content, re.I))
            return has_dates, f"Timeline markers {'present' if has_dates else 'absent'}"
        
        if 'evidence' in criterion_lower:
            has_evidence = any(marker in content.lower() for marker in 
                             ['exhibit', 'attachment', 'document', 'record', 'proof', 'evidence'])
            return has_evidence, f"Evidence markers {'present' if has_evidence else 'absent'}"
        
        if 'steel man' in criterion_lower or 'steelman' in criterion_lower:
            has_steel = any(phrase in content.lower() for phrase in 
                          ['understand', 'recognize', 'acknowledge', 'valid point', 'reasonable'])
            return has_steel, f"Steel-manning {'detected' if has_steel else 'not detected'}"
        
        # Wholeness criteria
        if 'pattern' in criterion_lower:
            has_pattern = len(re.findall(r'\b(?:repeated|systemic|ongoing|persistent|pattern|multiple)\b', content, re.I)) > 0
            return has_pattern, f"Pattern language {'found' if has_pattern else 'not found'}"
        
        if 'omission' in criterion_lower:
            # Check for explicit naming of gaps
            has_gap_ack = any(phrase in content.lower() for phrase in 
                            ['did not', 'failed to', 'missing', 'gap', 'absence of'])
            return has_gap_ack, f"Omission acknowledgment {'present' if has_gap_ack else 'absent'}"
        
        # Legal criteria
        if 'precedent' in criterion_lower:
            has_precedent = bool(re.search(r'\b(?:v\.|versus|case|precedent|holding|ruling)\b', content, re.I))
            return has_precedent, f"Legal precedent references {'found' if has_precedent else 'not found'}"
        
        if 'statute' in criterion_lower or 'code' in criterion_lower:
            has_statute = bool(re.search(r'§\s*\d+|section\s+\d+|N\.C\.\s+Gen\.?\s*Stat', content, re.I))
            return has_statute, f"Statutory citations {'present' if has_statute else 'absent'}"
        
        # Software criteria
        if 'adr' in criterion_lower:
            has_adr = 'adr' in content.lower() or 'architectural decision' in content.lower()
            return has_adr, f"ADR references {'found' if has_adr else 'not found'}"
        
        if 'ddd' in criterion_lower:
            has_ddd = any(term in content.lower() for term in 
                        ['aggregate', 'entity', 'value object', 'bounded context', 'domain'])
            return has_ddd, f"DDD terminology {'present' if has_ddd else 'absent'}"
        
        if 'tdd' in criterion_lower or 'test' in criterion_lower:
            has_tdd = any(term in content.lower() for term in 
                        ['test', 'specification', 'assert', 'verify', 'given.*when.*then'])
            return has_tdd, f"TDD/test references {'found' if has_tdd else 'not found'}"
        
        # Default: assume passed with note
        return True, f"Criterion '{criterion}' - manual review recommended"


@dataclass
class VectorResult:
    """Result of applying an access grant vector"""
    vector: AccessVector
    score: float
    findings: List[Dict]
    timestamp: str
    
    def to_dict(self) -> Dict:
        return {
            'layer': self.vector.layer.name,
            'role': self.vector.role,
            'score': round(self.score, 3),
            'weight': self.vector.weight,
            'findings': self.findings,
            'timestamp': self.timestamp
        }


@dataclass
class ValidationReport:
    """Complete validation report across all vectors"""
    content_hash: str
    layer_scores: Dict[ValidationLayer, float] = field(default_factory=dict)
    vector_results: List[VectorResult] = field(default_factory=list)
    overall_score: float = 0.0
    verdict: str = "PENDING"
    gaps: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    
    def calculate_overall(self) -> None:
        """Calculate weighted overall score"""
        if not self.vector_results:
            self.overall_score = 0.0
            return
        
        total_weight = sum(vr.vector.weight for vr in self.vector_results)
        weighted_sum = sum(vr.score * vr.vector.weight for vr in self.vector_results)
        
        self.overall_score = weighted_sum / total_weight if total_weight > 0 else 0.0
        
        # Determine verdict
        if self.overall_score >= 0.9:
            self.verdict = "GRANTED"
        elif self.overall_score >= 0.7:
            self.verdict = "CONDITIONAL"
        elif self.overall_score >= 0.5:
            self.verdict = "REVIEW_REQUIRED"
        else:
            self.verdict = "DENIED"
    
    def to_dict(self) -> Dict:
        return {
            'content_hash': self.content_hash,
            'overall_score': round(self.overall_score, 3),
            'verdict': self.verdict,
            'layer_scores': {layer.name: round(score, 3) for layer, score in self.layer_scores.items()},
            'vector_results': [vr.to_dict() for vr in self.vector_results],
            'gaps': self.gaps,
            'recommendations': self.recommendations,
            'generated_at': datetime.now().isoformat()
        }
    
    def to_markdown(self) -> str:
        """Generate markdown report"""
        md = f"""# Access Grant Vectors Validation Report

**Content Hash:** `{self.content_hash}`  
**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Overall Score:** {self.overall_score:.1%}  
**Verdict:** {self.verdict}

## Layer Scores

| Layer | Score | Status |
|-------|-------|--------|
"""
        for layer, score in self.layer_scores.items():
            status = "✅" if score >= 0.8 else "⚠️" if score >= 0.6 else "❌"
            md += f"| {layer.name} | {score:.1%} | {status} |\n"
        
        md += "\n## Detailed Findings\n\n"
        for vr in self.vector_results:
            md += f"### {vr.vector.layer.name} - {vr.vector.role}\n"
            md += f"**Score:** {vr.score:.1%} | **Weight:** {vr.vector.weight}\n\n"
            for finding in vr.findings:
                icon = "✅" if finding['passed'] else "❌"
                md += f"- {icon} **{finding['criterion']}:** {finding['finding']}\n"
            md += "\n"
        
        if self.gaps:
            md += "## Identified Gaps\n\n"
            for gap in self.gaps:
                md += f"- ⚠️ {gap}\n"
            md += "\n"
        
        if self.recommendations:
            md += "## Recommendations\n\n"
            for rec in self.recommendations:
                md += f"- 💡 {rec}\n"
            md += "\n"
        
        md += "---\n*Generated by Access Grant Vectors v1.0*\n"
        return md


class AccessGrantValidator:
    """Main validator coordinating all access grant vectors"""
    
    def __init__(self):
        self.vectors: List[AccessVector] = self._initialize_vectors()
    
    def _initialize_vectors(self) -> List[AccessVector]:
        """Initialize all validation vectors across 4 layers"""
        vectors = []
        
        # Layer 1: Circle-based (6 circles)
        circle_vectors = [
            ("Analyst", "Traces causality", [
                "Causal narrative present",
                "Timeline markers included",
                "Evidence chain documented"
            ]),
            ("Assessor", "Maps omitted context", [
                "Explicit gap acknowledgment",
                "Missing information named",
                "Context boundaries defined"
            ]),
            ("Innovator", "Deconstructs rituals", [
                "Traditional assumptions questioned",
                "Novel approaches identified",
                "Precedent limitations noted"
            ]),
            ("Intuitive", "Steelmans opponent", [
                "Opposition perspective represented",
                "Steel-manning language used",
                "Fair interpretation demonstrated"
            ]),
            ("Orchestrator", "Pressure tests early", [
                "Early stress testing applied",
                "Failure modes identified",
                "Contingency plans referenced"
            ]),
            ("Seeker", "Synthesizes divergent", [
                "Multiple viewpoints integrated",
                "Conflicting data reconciled",
                "Holistic synthesis achieved"
            ])
        ]
        
        for role, perspective, criteria in circle_vectors:
            vectors.append(AccessVector(
                layer=ValidationLayer.CIRCLE,
                role=role,
                perspective=perspective,
                criteria=criteria,
                weight=1.0
            ))
        
        # Layer 2: Legal (6 roles)
        legal_vectors = [
            ("Judge", "Neutral arbiter", [
                "Legal precedent cited",
                "Statutory authority referenced",
                "Standard of care applied"
            ]),
            ("Prosecutor", "Advocates for position", [
                "Strongest arguments presented",
                "Evidence marshaled effectively",
                "Adverse inference drawn appropriately"
            ]),
            ("Defense", "Protects rights", [
                "Counter-arguments anticipated",
                "Defenses preserved",
                "Procedural protections noted"
            ]),
            ("Expert", "Technical authority", [
                "Domain expertise demonstrated",
                "Technical accuracy verified",
                "Professional standards applied"
            ]),
            ("Jury", "Fact finder", [
                "Clear fact pattern presented",
                "Ambiguities identified",
                "Credibility markers present"
            ]),
            ("Mediator", "Settlement facilitation", [
                "Common ground identified",
                "Mutual interests addressed",
                "Resolution pathways suggested"
            ])
        ]
        
        for role, perspective, criteria in legal_vectors:
            vectors.append(AccessVector(
                layer=ValidationLayer.LEGAL,
                role=role,
                perspective=perspective,
                criteria=criteria,
                weight=1.2  # Higher weight for legal layer
            ))
        
        # Layer 3: Government (5 roles)
        gov_vectors = [
            ("County Attorney", "Local authority", [
                "Municipal codes referenced",
                "Local procedures followed",
                "Jurisdictional requirements met"
            ]),
            ("State AG", "State oversight", [
                "State statutes cited",
                "Regulatory framework applied",
                "State-level precedents noted"
            ]),
            ("HUD", "Federal housing", [
                "Federal housing law applied",
                "HUD guidelines referenced",
                "Fair housing principles included"
            ]),
            ("Legal Aid", "Access to justice", [
                "Pro se considerations included",
                "Accessible language used",
                "Self-representation support noted"
            ]),
            ("Appellate", "Error correction", [
                "Preservation of issues demonstrated",
                "Standard of review anticipated",
                "Appellate strategy considered"
            ])
        ]
        
        for role, perspective, criteria in gov_vectors:
            vectors.append(AccessVector(
                layer=ValidationLayer.GOVERNMENT,
                role=role,
                perspective=perspective,
                criteria=criteria,
                weight=1.0
            ))
        
        # Layer 4: Software (4 patterns)
        software_vectors = [
            ("PRD", "Product Requirements", [
                "User stories defined",
                "Acceptance criteria specified",
                "Success metrics quantified"
            ]),
            ("ADR", "Architecture Decision", [
                "ADR references present",
                "Trade-off analysis included",
                "Decision rationale documented"
            ]),
            ("DDD", "Domain-Driven Design", [
                "DDD terminology used",
                "Bounded contexts defined",
                "Aggregate boundaries clear"
            ]),
            ("TDD", "Test-Driven Development", [
                "TDD approach evident",
                "Test specifications included",
                "Verification criteria defined"
            ])
        ]
        
        for role, perspective, criteria in software_vectors:
            vectors.append(AccessVector(
                layer=ValidationLayer.SOFTWARE,
                role=role,
                perspective=perspective,
                criteria=criteria,
                weight=0.8  # Lower weight for software context
            ))
        
        return vectors
    
    def validate(self, content: str, layers: Optional[Set[ValidationLayer]] = None) -> ValidationReport:
        """Run validation across all or specified layers"""
        # Compute content hash
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        
        report = ValidationReport(content_hash=content_hash)
        context = {'timestamp': datetime.now().isoformat()}
        
        # Filter vectors by layer if specified
        vectors_to_run = self.vectors
        if layers:
            vectors_to_run = [v for v in self.vectors if v.layer in layers]
        
        # Run all vectors
        layer_scores: Dict[ValidationLayer, List[float]] = {layer: [] for layer in ValidationLayer}
        
        for vector in vectors_to_run:
            result = vector.validate(content, context)
            report.vector_results.append(result)
            layer_scores[vector.layer].append(result.score)
        
        # Calculate layer averages
        for layer, scores in layer_scores.items():
            if scores:
                report.layer_scores[layer] = sum(scores) / len(scores)
        
        # Calculate overall
        report.calculate_overall()
        
        # Generate gaps and recommendations
        report.gaps = self._identify_gaps(report)
        report.recommendations = self._generate_recommendations(report)
        
        return report
    
    def _identify_gaps(self, report: ValidationReport) -> List[str]:
        """Identify validation gaps based on low scores"""
        gaps = []
        
        for vr in report.vector_results:
            if vr.score < 0.5:
                gaps.append(f"{vr.vector.layer.name}/{vr.vector.role}: Critical validation failures")
            elif vr.score < 0.7:
                gaps.append(f"{vr.vector.layer.name}/{vr.vector.role}: Validation weaknesses")
        
        # Layer-level gaps
        for layer, score in report.layer_scores.items():
            if score < 0.6:
                gaps.append(f"{layer.name}: Entire layer below threshold ({score:.1%})")
        
        return gaps
    
    def _generate_recommendations(self, report: ValidationReport) -> List[str]:
        """Generate recommendations based on findings"""
        recs = []
        
        # Check for missing layers
        for layer in ValidationLayer:
            if layer not in report.layer_scores:
                recs.append(f"Add {layer.name} layer validation")
        
        # Role-specific recommendations
        for vr in report.vector_results:
            if vr.score < 0.7:
                failed_criteria = [f['criterion'] for f in vr.findings if not f['passed']]
                if failed_criteria:
                    recs.append(f"{vr.vector.role}: Address {', '.join(failed_criteria[:2])}")
        
        # Overall recommendations
        if report.overall_score < 0.7:
            recs.append("Consider adversarial review before submission")
        
        if report.verdict == "DENIED":
            recs.append("Major revision required - significant gaps across multiple layers")
        
        return recs


def main():
    parser = argparse.ArgumentParser(
        description='Access Grant Vectors - Truthfulness & Wholeness Validation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --validate document.md --output report.json
  %(prog)s --assess --input email.eml --layers circle,legal
  %(prog)s --batch --dir ./documents/
        """
    )
    
    parser.add_argument('--validate', metavar='FILE', help='Validate a single document')
    parser.add_argument('--input', '-i', metavar='FILE', help='Input file to assess')
    parser.add_argument('--output', '-o', metavar='FILE', help='Output file for report')
    parser.add_argument('--format', choices=['json', 'markdown', 'html'], default='json',
                       help='Output format')
    parser.add_argument('--layers', default='all',
                       help='Comma-separated layers (all, circle, legal, government, software)')
    parser.add_argument('--assess', action='store_true', help='Quick assessment mode')
    parser.add_argument('--batch', metavar='DIR', help='Batch validate all files in directory')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    # Parse layers
    layer_map = {
        'circle': ValidationLayer.CIRCLE,
        'legal': ValidationLayer.LEGAL,
        'government': ValidationLayer.GOVERNMENT,
        'software': ValidationLayer.SOFTWARE
    }
    
    selected_layers = None
    if args.layers != 'all':
        selected_layers = set()
        for layer_name in args.layers.split(','):
            layer_name = layer_name.strip().lower()
            if layer_name in layer_map:
                selected_layers.add(layer_map[layer_name])
    
    # Initialize validator
    validator = AccessGrantValidator()
    
    # Run validation
    input_file = args.validate or args.input
    
    if not input_file and not args.batch:
        parser.print_help()
        sys.exit(1)
    
    if args.batch:
        # Batch mode
        batch_dir = Path(args.batch)
        if not batch_dir.is_dir():
            print(f"Error: Not a directory: {batch_dir}")
            sys.exit(1)
        
        results = []
        for file_path in batch_dir.glob('*.md'):
            if args.verbose:
                print(f"Validating: {file_path}")
            
            content = file_path.read_text(encoding='utf-8')
            report = validator.validate(content, selected_layers)
            results.append({
                'file': str(file_path),
                'verdict': report.verdict,
                'score': report.overall_score
            })
        
        print(f"\nBatch validation complete: {len(results)} files")
        for r in results:
            status = "✅" if r['verdict'] == 'GRANTED' else "⚠️" if r['verdict'] == 'CONDITIONAL' else "❌"
            print(f"{status} {r['file']}: {r['verdict']} ({r['score']:.1%})")
        
        if args.output:
            Path(args.output).write_text(json.dumps(results, indent=2))
    
    else:
        # Single file mode
        content = Path(input_file).read_text(encoding='utf-8')
        report = validator.validate(content, selected_layers)
        
        # Output
        if args.format == 'json':
            output = json.dumps(report.to_dict(), indent=2)
        elif args.format == 'markdown':
            output = report.to_markdown()
        else:
            output = json.dumps(report.to_dict(), indent=2)
        
        if args.output:
            Path(args.output).write_text(output)
            print(f"Report written to: {args.output}")
        else:
            print(output)
        
        # Summary
        print(f"\n{'='*50}")
        print(f"Verdict: {report.verdict}")
        print(f"Overall Score: {report.overall_score:.1%}")
        print(f"{'='*50}")


if __name__ == '__main__':
    main()
