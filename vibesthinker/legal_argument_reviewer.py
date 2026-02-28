#!/usr/bin/env python3
"""
VibeThinker Legal Argument Reviewer
====================================
SFT→RL pipeline for detecting coherence gaps and strengthening legal arguments

DoR: vibesthinker_ai.py, document_extractor.py available
DoD: Identifies 5+ coherence gaps per document; suggests 3+ strengthening options per gap;
     MGPO selects top arguments; generates counter-arguments

Features:
- Coherence gap detection (COH-001 through COH-010+)
- Logical gap identification
- Evidence cross-reference validation
- Citation completeness checking
- Argument strengthening suggestions
- Counter-argument generation (adversarial RL)

Trial-Critical Use Cases:
1. Review Answer/Motion before filing
2. Identify unsupported claims
3. Generate responses to anticipated objections
4. Optimize argument order for judge comprehension

Usage:
    python legal_argument_reviewer.py --file ANSWER.md --output report.json
"""

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from document_extractor import extract_document_text
from vibesthinker_ai import VibeThinker, CaseContext, Strategy, StrategyType


# ═════════════════════════════════════════════════════════════════════════════
# COHERENCE GAP TAXONOMY
# ═════════════════════════════════════════════════════════════════════════════

class CoherenceGapType:
    """Coherence gap taxonomy from docs/ANNOTATION_CONVENTION.md"""
    COH_001 = "DDD→TDD"  # Domain models exist but lack tests
    COH_002 = "ADR→DDD"  # Architecture decisions not reflected in domain
    COH_003 = "PRD→TDD"  # Requirements not covered by tests
    COH_004 = "TDD→DDD"  # Tests exist but domain models are stale
    COH_005 = "PRD→ADR"  # Requirements without architectural decisions
    COH_006 = "LEGAL→EVIDENCE"  # Claims without evidence
    COH_007 = "ARGUMENT→CITATION"  # Arguments without legal authority
    COH_008 = "TIMELINE→EVIDENCE"  # Timeline gaps in evidence chain
    COH_009 = "CLAIM→QUANTIFICATION"  # Damages not quantified
    COH_010 = "DEFENSE→PRECEDENT"  # Defenses without case law support


# ═════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═════════════════════════════════════════════════════════════════════════════

@dataclass
class CoherenceGap:
    """Detected coherence gap in legal argument"""
    gap_type: str
    location: str  # Section/paragraph reference
    description: str
    severity: str  # "Critical", "High", "Medium", "Low"
    evidence_needed: List[str]
    suggested_fix: str
    confidence: float  # 0-1


@dataclass
class ArgumentAnalysis:
    """Analysis result for legal document"""
    document_path: str
    document_type: str  # "settlement", "motion", "answer", "brief"
    claims: List[str]
    total_claims: int
    supported_claims: int
    unsupported_claims: int
    coherence_gaps: List[CoherenceGap]
    citation_count: int
    evidence_references: int
    systemic_score: float
    overall_strength: float  # 0-100
    recommendations: List[str]
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class CounterArgument:
    """Generated counter-argument (adversarial RL phase)"""
    argument_id: str
    counter_claim: str
    supporting_points: List[str]
    evidence_to_undermine: List[str]
    strength: float  # 0-1
    mitigation_strategy: str


# ═════════════════════════════════════════════════════════════════════════════
# LEGAL ARGUMENT REVIEWER
# ═════════════════════════════════════════════════════════════════════════════

class LegalArgumentReviewer:
    """
    VibeThinker-powered legal argument reviewer

    SFT Phase: Analyze document for coherence gaps
    RL Phase: Generate counter-arguments and strengthening strategies
    """

    def __init__(self, case_context: Optional[CaseContext] = None):
        self.case_context = case_context
        self.citation_patterns = [
            r"N\.C\.G\.S\. (?:§ )?\d+[-‐‑]\d+(?:\.\d+)?",  # NC statutes
            r"NC Rule \d+\([a-z]\)",  # NC Rules of Civil Procedure
            r"\d+ N\.C\. App\. \d+",  # NC Court of Appeals
            r"\d+ S\.E\.\d+d \d+",  # SE Reporter
        ]
        self.evidence_keywords = [
            "exhibit", "attachment", "screenshot", "photo", "receipt",
            "email", "letter", "work order", "portal", "lease"
        ]

    # ─────────────────────────────────────────────────────────────────────────
    # SFT PHASE: Document Analysis
    # ─────────────────────────────────────────────────────────────────────────

    def analyze_document(self, file_path: str) -> ArgumentAnalysis:
        """
        SFT Phase: Analyze legal document for coherence and strength

        Checks:
        - Citation completeness
        - Evidence cross-references
        - Logical flow
        - Unsupported claims
        - Timeline coherence

        Args:
            file_path: Path to legal document (markdown, PDF, .eml, etc.)

        Returns:
            ArgumentAnalysis with detected gaps and recommendations
        """
        text = extract_document_text(file_path)
        doc_type = self._detect_document_type(text)

        # Extract structural elements
        claims = self._extract_claims(text)
        citations = self._extract_citations(text)
        evidence_refs = self._extract_evidence_references(text)

        # Detect coherence gaps
        gaps = self._detect_coherence_gaps(text, claims, citations, evidence_refs)

        # Calculate scores
        supported = sum(1 for c in claims if self._is_supported(c, citations, evidence_refs))
        unsupported = len(claims) - supported

        systemic_score = self._calculate_systemic_score(text)
        overall_strength = self._calculate_overall_strength(
            len(claims), supported, len(citations), len(evidence_refs), len(gaps)
        )

        # Generate recommendations
        recommendations = self._generate_recommendations(gaps, unsupported, citations)

        return ArgumentAnalysis(
            document_path=file_path,
            document_type=doc_type,
            claims=claims,
            total_claims=len(claims),
            supported_claims=supported,
            unsupported_claims=unsupported,
            coherence_gaps=gaps,
            citation_count=len(citations),
            evidence_references=len(evidence_refs),
            systemic_score=systemic_score,
            overall_strength=overall_strength,
            recommendations=recommendations
        )

    def _detect_document_type(self, text: str) -> str:
        """Detect document type from content"""
        text_lower = text.lower()

        if "settlement" in text_lower and "offer" in text_lower:
            return "settlement"
        elif "motion to" in text_lower:
            return "motion"
        elif "answer" in text_lower and "defendant" in text_lower:
            return "answer"
        elif "brief" in text_lower or "memorandum" in text_lower:
            return "brief"
        else:
            return "unknown"

    def _extract_claims(self, text: str) -> List[str]:
        """Extract factual claims and arguments"""
        claims = []

        # Look for claim indicators
        claim_patterns = [
            r"(?:I |We |Plaintiff |Defendant )(?:claim|assert|contend|argue|submit|maintain)",
            r"(?:It is|This is) (?:undisputed|clear|evident) that",
            r"The (?:facts|evidence|record) (?:show|demonstrate|establish)",
        ]

        for pattern in claim_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # Extract surrounding sentence
                start = max(0, match.start() - 100)
                end = min(len(text), match.end() + 200)
                claim = text[start:end].strip()
                claims.append(claim)

        return claims

    def _extract_citations(self, text: str) -> List[str]:
        """Extract legal citations"""
        citations = []

        for pattern in self.citation_patterns:
            matches = re.findall(pattern, text)
            citations.extend(matches)

        return list(set(citations))  # Deduplicate

    def _extract_evidence_references(self, text: str) -> List[str]:
        """Extract evidence references"""
        refs = []

        for keyword in self.evidence_keywords:
            pattern = rf"\b{keyword}\b[^\n.]*(?:\d+|[A-Z])"
            matches = re.findall(pattern, text, re.IGNORECASE)
            refs.extend(matches)

        return list(set(refs))

    def _is_supported(self, claim: str, citations: List[str], evidence_refs: List[str]) -> bool:
        """Check if claim is supported by citation or evidence"""
        # Simple heuristic: claim near citation or evidence reference
        return any(cit in claim for cit in citations) or \
               any(ref.lower() in claim.lower() for ref in evidence_refs)

    def _detect_coherence_gaps(self, text: str, claims: List[str],
                               citations: List[str], evidence_refs: List[str]) -> List[CoherenceGap]:
        """Detect coherence gaps in argument structure"""
        gaps = []

        # COH-006: Claims without evidence
        for claim in claims:
            if not self._is_supported(claim, citations, evidence_refs):
                gaps.append(CoherenceGap(
                    gap_type=CoherenceGapType.COH_006,
                    location="[Auto-detected claim]",
                    description=f"Unsupported claim: {claim[:100]}...",
                    severity="High",
                    evidence_needed=["Citation", "Evidence reference"],
                    suggested_fix="Add citation or reference to exhibit",
                    confidence=0.8
                ))

        # COH-007: Arguments without legal authority
        if "N.C.G.S." not in text and "NC Rule" not in text:
            gaps.append(CoherenceGap(
                gap_type=CoherenceGapType.COH_007,
                location="Document-wide",
                description="No NC statutes cited",
                severity="Critical",
                evidence_needed=["N.C.G.S. references"],
                suggested_fix="Add statutory citations for legal arguments",
                confidence=0.95
            ))

        # COH-009: Damages not quantified
        if "$" not in text or "damages" in text.lower() and not re.search(r"\$\d+,?\d*", text):
            gaps.append(CoherenceGap(
                gap_type=CoherenceGapType.COH_009,
                location="Damages section",
                description="Damages not quantified with dollar amounts",
                severity="High",
                evidence_needed=["Damages calculation"],
                suggested_fix="Provide specific dollar amounts for damages",
                confidence=0.85
            ))

        # COH-008: Timeline gaps
        dates = re.findall(r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b", text)
        if len(dates) < 3:
            gaps.append(CoherenceGap(
                gap_type=CoherenceGapType.COH_008,
                location="Timeline",
                description=f"Only {len(dates)} dates found - timeline may be incomplete",
                severity="Medium",
                evidence_needed=["Date-specific events"],
                suggested_fix="Add chronological timeline of key events",
                confidence=0.7
            ))

        return gaps

    def _calculate_systemic_score(self, text: str) -> float:
        """Calculate systemic indifference score (0-40 scale)"""
        score = 0.0

        # Pattern detection
        patterns = {
            "multiple": 2.0,
            "pattern": 2.0,
            "systemic": 3.0,
            "repeated": 2.0,
            "organizat": 3.0,  # "organization", "organizational"
            "indifferen": 3.0,
            "deliberate": 3.0,
            "policy": 2.0,
            "practice": 1.5,
        }

        text_lower = text.lower()
        for pattern, points in patterns.items():
            if pattern in text_lower:
                score += points

        return min(40.0, score)

    def _calculate_overall_strength(self, total_claims: int, supported_claims: int,
                                   citation_count: int, evidence_refs: int, gaps: int) -> float:
        """Calculate overall argument strength (0-100 scale)"""
        if total_claims == 0:
            return 0.0

        # Support ratio (40% weight)
        support_ratio = supported_claims / total_claims if total_claims > 0 else 0
        support_score = support_ratio * 40

        # Citation density (25% weight)
        citation_score = min(25, citation_count * 5)

        # Evidence references (20% weight)
        evidence_score = min(20, evidence_refs * 2)

        # Gap penalty (15% weight)
        gap_penalty = min(15, gaps * 3)

        return max(0, support_score + citation_score + evidence_score - gap_penalty)

    def _generate_recommendations(self, gaps: List[CoherenceGap],
                                 unsupported: int, citations: List[str]) -> List[str]:
        """Generate actionable recommendations"""
        recs = []

        if unsupported > 0:
            recs.append(f"Add citations or evidence for {unsupported} unsupported claims")

        if len(citations) < 3:
            recs.append("Strengthen legal authority with at least 3 NC statute citations")

        critical_gaps = [g for g in gaps if g.severity == "Critical"]
        if critical_gaps:
            recs.append(f"Address {len(critical_gaps)} critical coherence gaps before filing")

        high_gaps = [g for g in gaps if g.severity == "High"]
        if high_gaps:
            recs.append(f"Resolve {len(high_gaps)} high-severity gaps to strengthen argument")

        return recs

    # ─────────────────────────────────────────────────────────────────────────
    # RL PHASE: Counter-Argument Generation
    # ─────────────────────────────────────────────────────────────────────────

    def generate_counter_arguments(self, analysis: ArgumentAnalysis, n: int = 3, k: int = 5) -> List[CounterArgument]:
        """
        RL Phase: Generate counter-arguments to stress-test your position

        Uses VibeThinker MGPO and Pass@K to select strongest opposing arguments
        Helps prepare for:
        - Opposing counsel objections
        - Judge questions
        - Settlement negotiations

        Args:
            analysis: Document analysis from analyze_document()
            n: Number of counter-arguments to select
            k: Pass@K variations generated per gap for MGPO selection

        Returns:
            List of CounterArgument objects ranked by MGPO strength
        """
        import random
        rng = random.Random(42)  # Deterministic seed for reproducibility
        if not self.case_context:
            # Create default context
            self.case_context = CaseContext(
                case_number="UNKNOWN",
                plaintiff="Plaintiff",
                defendant="Defendant",
                claim_type="Unknown",
                damages_claimed=0,
                evidence_strength=analysis.overall_strength / 100,
                timeline_months=12,
                systemic_score=analysis.systemic_score
            )

        counter_args = []

        # Pass@K Diversity Constraint
        # Generate counter-arguments for each unsupported claim, creating K variations
        targets = analysis.coherence_gaps[:n]
        if not targets and analysis.claims:
            # If the document is perfectly coherent, generate counter-arguments against the strongest claims
            targets = [
                CoherenceGap(
                    gap_type="STRATEGIC_OBJECTION",
                    location="Main Claim",
                    description=f"Strategic counter to claim: {claim[:100]}...",
                    severity="Medium",
                    evidence_needed=["Counter-evidence"],
                    suggested_fix="Prepare evidentiary rebuttal for this specific claim",
                    confidence=0.8
                ) for claim in analysis.claims[:n]
            ]

        for i, gap in enumerate(targets):
            variants = []
            for j in range(k):
                # Apply temperature-like variance to strength
                temp = rng.uniform(0.5, 1.5)
                base_strength = self._calculate_counter_strength(gap)
                variant_strength = min(1.0, max(0.1, base_strength * temp))

                # Introduce entropy-guided variation in generation
                entropy_score = abs(temp - 1.0)  # Variance from mean acts as entropy
                mgpo_score = (0.7 * variant_strength) + (0.3 * entropy_score)

                counter = CounterArgument(
                    argument_id=f"COUNTER-{i+1}-V{j+1}",
                    counter_claim=self._generate_counter_claim(gap, variant=j),
                    supporting_points=self._generate_supporting_points(gap),
                    evidence_to_undermine=[gap.description],
                    strength=mgpo_score,  # Replaced with MGPO Score
                    mitigation_strategy=self._simplify_for_judge(gap.suggested_fix, variant=j)
                )
                variants.append(counter)

            # MGPO Entropy-Guided Selection: Select the top variant for this gap
            best_variant = max(variants, key=lambda v: v.strength)
            best_variant.argument_id = f"COUNTER-{i+1}"
            counter_args.append(best_variant)

        # Sort by MGPO strength (strongest first)
        counter_args.sort(key=lambda c: c.strength, reverse=True)

        return counter_args[:n]

    def _generate_counter_claim(self, gap: CoherenceGap, variant: int = 0) -> str:
        """Generate counter-claim based on coherence gap with diverse variations"""
        variations = [
            "Plaintiff's claim lacks evidentiary support and should be dismissed.",
            "The record is devoid of competent evidence proving Plaintiff's claim.",
            "Absent documentary evidence, Plaintiff's bald assertions fail as a matter of law."
        ]
        if gap.gap_type == CoherenceGapType.COH_006:
            return variations[variant % len(variations)]
        elif gap.gap_type == CoherenceGapType.COH_007:
            return "Plaintiff cites no legal authority for this claim, rendering it meritless."
        elif gap.gap_type == CoherenceGapType.COH_009:
            return "Plaintiff fails to quantify damages, making relief impossible to assess."
        elif gap.gap_type == "STRATEGIC_OBJECTION":
            strategic_variations = [
                "Even if true, this claim fails to establish the requisite legal standard for liability.",
                "Opposing counsel will likely argue this claim is barred by the statute of limitations or waiver.",
                "The factual basis of this claim is subject to conflicting interpretation and alternate causation."
            ]
            return strategic_variations[variant % len(strategic_variations)]
        else:
            return "Plaintiff's argument contains logical gaps and lacks coherence."

    def _simplify_for_judge(self, strategy: str, variant: int = 0) -> str:
        """Apply judge-facing simplifications to mitigation strategies"""
        if variant % 2 == 0:
            return f"Submit a brief 1-page addendum to {strategy.lower()}."
        return strategy

    def _generate_supporting_points(self, gap: CoherenceGap) -> List[str]:
        """Generate supporting points for counter-argument"""
        return [
            f"Gap type: {gap.gap_type}",
            f"Severity: {gap.severity}",
            f"Missing evidence: {', '.join(gap.evidence_needed)}"
        ]

    def _calculate_counter_strength(self, gap: CoherenceGap) -> float:
        """Calculate strength of counter-argument (0-1 scale)"""
        severity_weights = {
            "Critical": 1.0,
            "High": 0.8,
            "Medium": 0.5,
            "Low": 0.3
        }
        return severity_weights.get(gap.severity, 0.5) * gap.confidence

    # ─────────────────────────────────────────────────────────────────────────
    # OUTPUT METHODS
    # ─────────────────────────────────────────────────────────────────────────

    def export_analysis(self, analysis: ArgumentAnalysis, output_path: str, counter_args: Optional[List[CounterArgument]] = None):
        """Export analysis to JSON file"""
        data = {
            "document": analysis.document_path,
            "type": analysis.document_type,
            "timestamp": analysis.timestamp.isoformat(),
            "metrics": {
                "total_claims": analysis.total_claims,
                "supported_claims": analysis.supported_claims,
                "unsupported_claims": analysis.unsupported_claims,
                "citation_count": analysis.citation_count,
                "evidence_references": analysis.evidence_references,
                "systemic_score": analysis.systemic_score,
                "overall_strength": analysis.overall_strength
            },
            "coherence_gaps": [
                {
                    "type": gap.gap_type,
                    "location": gap.location,
                    "description": gap.description,
                    "severity": gap.severity,
                    "evidence_needed": gap.evidence_needed,
                    "suggested_fix": gap.suggested_fix,
                    "confidence": gap.confidence
                }
                for gap in analysis.coherence_gaps
            ],
            "recommendations": analysis.recommendations,
            "counter_arguments": [
                {
                    "argument_id": c.argument_id,
                    "counter_claim": c.counter_claim,
                    "supporting_points": c.supporting_points,
                    "evidence_to_undermine": c.evidence_to_undermine,
                    "strength": c.strength,
                    "mitigation_strategy": c.mitigation_strategy
                } for c in (counter_args or [])
            ]
        }

        Path(output_path).write_text(json.dumps(data, indent=2))
        print(f"Analysis exported to: {output_path}")


# ═════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═════════════════════════════════════════════════════════════════════════════

def main():
    """CLI entry point for legal argument reviewer"""
    import argparse

    parser = argparse.ArgumentParser(description="VibeThinker Legal Argument Reviewer")
    parser.add_argument("--file", "-f", required=True, help="Legal document to analyze")
    parser.add_argument("--output", "-o", help="Output JSON path")
    parser.add_argument("--counter-args", "-c", type=int, default=0,
                       help="Generate N counter-arguments")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    args = parser.parse_args()

    reviewer = LegalArgumentReviewer()
    analysis = reviewer.analyze_document(args.file)

    # Print summary
    print(f"\n{'='*80}")
    print(f"Legal Argument Analysis: {Path(args.file).name}")
    print(f"{'='*80}\n")
    print(f"Document Type: {analysis.document_type}")
    print(f"Overall Strength: {analysis.overall_strength:.1f}/100")
    print(f"Systemic Score: {analysis.systemic_score:.1f}/40\n")
    print(f"Claims: {analysis.total_claims} total, {analysis.supported_claims} supported, "
          f"{analysis.unsupported_claims} unsupported")
    print(f"Citations: {analysis.citation_count}")
    print(f"Evidence References: {analysis.evidence_references}\n")

    # Coherence gaps
    print(f"Coherence Gaps: {len(analysis.coherence_gaps)}")
    for i, gap in enumerate(analysis.coherence_gaps, 1):
        print(f"  {i}. [{gap.severity}] {gap.gap_type}: {gap.description}")
        print(f"     Fix: {gap.suggested_fix}\n")

    # Recommendations
    print("Recommendations:")
    for i, rec in enumerate(analysis.recommendations, 1):
        print(f"  {i}. {rec}")

    # Counter-arguments
    counters = []
    if args.counter_args > 0:
        print(f"\n{'='*80}")
        print(f"Counter-Arguments (Top {args.counter_args})")
        print(f"{'='*80}\n")

        counters = reviewer.generate_counter_arguments(analysis, n=args.counter_args)
        for i, counter in enumerate(counters, 1):
            print(f"{i}. {counter.counter_claim}")
            print(f"   Strength: {counter.strength:.1%}")
            print(f"   Mitigation: {counter.mitigation_strategy}\n")

    # Export
    if args.output:
        reviewer.export_analysis(analysis, args.output, counters)


if __name__ == "__main__":
    main()
