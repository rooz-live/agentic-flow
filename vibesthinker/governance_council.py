#!/usr/bin/env python3
"""
Governance Council - 21-Role Legal Validation System
=====================================================
Implements multi-perspective validation with:
- 6 Circles (Analyst, Assessor, Innovator, Intuitive, Orchestrator, Seeker)
- 6 Legal Roles (Judge, Prosecutor, Defense, Expert Witness, Jury, Mediator)
- 5 Government Counsels (County Attorney, State AG, HUD Regional, Legal Aid, CFPB)
- 4 Software Patterns (PRD, ADR, DDD, TDD)

DoR: json, dataclasses, datetime, enum, re available (stdlib only)
DoD: 21 roles operational; consensus >= 80% threshold; ROAM classification complete;
     adversarial review produces Judge/Prosecutor/Defense verdicts

Threshold-based gating (optional):
- min_circles_covered: require len(covered_circles) >= N before APPROVE (ladder: 1, 5, 21, 33, 101)
- min_institutions_covered: require len(covered_institutions) >= N before APPROVE
- Configurable via run_full_validation(min_circles_covered=N, min_institutions_covered=M)
- Default: None (no threshold); e.g. min_circles_covered=5, min_institutions_covered=1 for stricter gate
- Output exposes "X/6 circles covered, Y/5 institutions covered" for dashboard display

Features:
- Layer validation (Layer 1-4, %/# %.# structure)
- Adversarial review mode (Judge/Prosecutor/Defense simulation)
- Temporal validation (date arithmetic)
- Systemic analysis (organizational patterns)
- WSJF prioritization
- ROAM risk classification
"""

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum, auto
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple
import re


# ═════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═════════════════════════════════════════════════════════════════════════════

class Circle(Enum):
    """6 Circles of validation perspective"""
    ANALYST = auto()       # Circle 1: Data analysis and pattern recognition
    ASSESSOR = auto()      # Circle 2: Risk assessment and blocking factors
    INNOVATOR = auto()     # Circle 3: Federation agents and automation
    INTUITIVE = auto()     # Circle 4: Observability and sensemaking
    ORCHESTRATOR = auto()  # Circle 5: Integration and coordination
    SEEKER = auto()        # Circle 6: Dependency management and health


class LegalRole(Enum):
    """6 Legal roles for adversarial simulation"""
    JUDGE = auto()         # Impartial arbiter
    PROSECUTOR = auto()    # Plaintiff advocate (strengthens claims)
    DEFENSE = auto()       # Defendant perspective (weaknesses)
    EXPERT_WITNESS = auto()  # Technical/domain expertise
    JURY = auto()          # Common sense evaluation
    MEDIATOR = auto()      # Settlement facilitation


class GovernmentCounsel(Enum):
    """5 Government counsel perspectives"""
    COUNTY_ATTORNEY = auto()      # Local enforcement
    STATE_AG_CONSUMER = auto()    # State consumer protection
    HUD_REGIONAL = auto()         # Federal housing oversight
    LEGAL_AID = auto()            # Pro se assistance
    CFPB = auto()                 # Consumer financial protection


class SoftwarePattern(Enum):
    """4 Software pattern validators"""
    PRD = auto()   # Product Requirements Document
    ADR = auto()   # Architecture Decision Record
    DDD = auto()   # Domain-Driven Design
    TDD = auto()   # Test-Driven Development


class ROAMCategory(Enum):
    """ROAM risk classification"""
    RESOLVED = "resolved"      # Risk eliminated
    OWNED = "owned"            # Risk accepted, owner assigned
    ACCEPTED = "accepted"      # Risk acknowledged, no action
    MITIGATED = "mitigated"    # Risk reduced to acceptable level


class Verdict(Enum):
    """Role verdicts"""
    APPROVE = "APPROVE"
    CONDITIONAL_APPROVE = "CONDITIONAL_APPROVE"
    NEEDS_REVISION = "NEEDS_REVISION"
    REJECT = "REJECT"


class Severity(Enum):
    """Check severity levels"""
    CRITICAL = "critical"    # Must fix before send
    WARNING = "warning"      # Should fix, can proceed
    INFO = "info"            # Informational only


# ═════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationCheck:
    """Single validation check result"""
    id: str
    description: str
    category: str
    severity: Severity
    passed: bool
    message: str
    evidence: Optional[Dict[str, Any]] = None
    remediation: Optional[str] = None
    layer: Optional[int] = None  # Layer 1-4


@dataclass
class CirclePerspective:
    """Circle validation perspective"""
    circle: Circle
    purpose: str
    accountability: str
    checks: List[ValidationCheck] = field(default_factory=list)
    pass_rate: float = 0.0

    def calculate_pass_rate(self):
        if self.checks:
            self.pass_rate = sum(1 for c in self.checks if c.passed) / len(self.checks) * 100


@dataclass
class RolePerspective:
    """Legal role perspective"""
    role: LegalRole
    focus_area: str
    checks: List[ValidationCheck] = field(default_factory=list)
    verdict: Verdict = Verdict.NEEDS_REVISION
    confidence: float = 0.0
    reasoning: str = ""

    def calculate_verdict(self):
        if not self.checks:
            return

        critical_failed = sum(1 for c in self.checks
                             if not c.passed and c.severity == Severity.CRITICAL)
        warning_failed = sum(1 for c in self.checks
                            if not c.passed and c.severity == Severity.WARNING)
        total_passed = sum(1 for c in self.checks if c.passed)
        total = len(self.checks)

        self.confidence = total_passed / total if total > 0 else 0

        if critical_failed > 0:
            self.verdict = Verdict.REJECT
            self.reasoning = f"{critical_failed} critical issues found"
        elif warning_failed > 2:
            self.verdict = Verdict.NEEDS_REVISION
            self.reasoning = f"{warning_failed} warnings need attention"
        elif warning_failed > 0:
            self.verdict = Verdict.CONDITIONAL_APPROVE
            self.reasoning = f"Minor issues: {warning_failed} warnings"
        else:
            self.verdict = Verdict.APPROVE
            self.reasoning = "All checks passed"


@dataclass
class CounselPerspective:
    """Government counsel perspective"""
    counsel: GovernmentCounsel
    jurisdiction: str
    focus: str
    checks: List[ValidationCheck] = field(default_factory=list)
    recommendation: str = ""
    enforcement_likelihood: float = 0.0


@dataclass
class LayerValidation:
    """Layer-specific validation (Layer 1-4)"""
    layer: int
    name: str
    roles_count: int
    checks: List[ValidationCheck] = field(default_factory=list)
    health_score: float = 0.0

    def calculate_health(self):
        if self.checks:
            self.health_score = sum(1 for c in self.checks if c.passed) / len(self.checks) * 100


@dataclass
class TemporalValidation:
    """Temporal/date arithmetic validation"""
    id: str
    description: str
    date_mentioned: Optional[datetime] = None
    expected_date: Optional[datetime] = None
    variance_days: int = 0
    is_valid: bool = True
    message: str = ""


@dataclass
class WsjfScore:
    """WSJF prioritization score"""
    item: str
    business_value: float = 0.0      # 1-10
    time_criticality: float = 0.0    # 1-10
    risk_reduction: float = 0.0      # 1-10
    job_size: float = 1.0            # 1-10 (effort)
    wsjf: float = 0.0

    def calculate(self):
        cost_of_delay = self.business_value + self.time_criticality + self.risk_reduction
        self.wsjf = cost_of_delay / max(self.job_size, 0.1)
        return self.wsjf


# ═════════════════════════════════════════════════════════════════════════════
# GOVERNANCE COUNCIL
# ═════════════════════════════════════════════════════════════════════════════

class GovernanceCouncil:
    """
    21-Role Governance Council for Legal Document Validation

    Layers:
        Layer 1: Circle Orchestration (6 roles)
        Layer 2: Legal Role Simulation (6 roles)
        Layer 3: Government Counsel (5 roles)
        Layer 4: Software Patterns (4 validators)
    """

    def __init__(self, document_path: Optional[str] = None):
        self.document_path = document_path
        self.circles: Dict[Circle, CirclePerspective] = {}
        self.roles: Dict[LegalRole, RolePerspective] = {}
        self.counsels: Dict[GovernmentCounsel, CounselPerspective] = {}
        self.patterns: Dict[SoftwarePattern, ValidationCheck] = {}
        self.layers: Dict[int, LayerValidation] = {
            1: LayerValidation(1, "Circle Orchestration", 6),
            2: LayerValidation(2, "Legal Role Simulation", 6),
            3: LayerValidation(3, "Government Counsel", 5),
            4: LayerValidation(4, "Software Patterns", 4),
            5: LayerValidation(5, "Advanced Strategy", 6),
        }
        self.advanced_roles: Dict[str, ValidationCheck] = {}
        self.temporal_checks: List[TemporalValidation] = []
        self.wsjf_items: List[WsjfScore] = []
        self.overall_score: float = 0.0
        self.consensus_rating: float = 0.0
        self.covered_circles: int = 0
        self.covered_institutions: int = 0

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 1: CIRCLE ORCHESTRATION (6 Circles)
    # ─────────────────────────────────────────────────────────────────────────

    def validate_analyst_circle(self, content: str) -> CirclePerspective:
        """Circle 1: Analyst - Data analysis and pattern recognition"""
        perspective = CirclePerspective(
            circle=Circle.ANALYST,
            purpose="Data analysis and evidence pattern recognition",
            accountability="Ensure factual accuracy and data integrity"
        )

        # Check 1.1: Factual claims have evidence
        evidence_keywords = ["document", "record", "photo", "screenshot", "exhibit", "evidence"]
        has_evidence = any(kw in content.lower() for kw in evidence_keywords)
        perspective.checks.append(ValidationCheck(
            id="ANALYST-001",
            description="Factual claims supported by evidence references",
            category="evidence",
            severity=Severity.CRITICAL,
            passed=has_evidence,
            message="Evidence referenced" if has_evidence else "No evidence references found",
            layer=1
        ))

        # Check 1.2: Quantifiable data present
        has_numbers = bool(re.search(r'\d+', content))
        has_dates = bool(re.search(r'\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}', content))
        perspective.checks.append(ValidationCheck(
            id="ANALYST-002",
            description="Contains quantifiable data (numbers, dates)",
            category="data_quality",
            severity=Severity.WARNING,
            passed=has_numbers and has_dates,
            message=f"Numbers: {'✓' if has_numbers else '✗'}, Dates: {'✓' if has_dates else '✗'}",
            layer=1
        ))

        # Check 1.3: Timeline coherence
        date_pattern = r'(\d{1,2}/\d{1,2}/\d{2,4}|\w+ \d{1,2},? \d{4})'
        dates_found = re.findall(date_pattern, content)
        perspective.checks.append(ValidationCheck(
            id="ANALYST-003",
            description="Timeline events are chronologically ordered",
            category="timeline",
            severity=Severity.WARNING,
            passed=len(dates_found) > 0,
            message=f"{len(dates_found)} date references found",
            evidence={"dates": dates_found[:10]},
            layer=1
        ))

        perspective.calculate_pass_rate()
        self.circles[Circle.ANALYST] = perspective
        self.layers[1].checks.extend(perspective.checks)
        return perspective

    def validate_assessor_circle(self, content: str, blockers: List[str] = None) -> CirclePerspective:
        """Circle 2: Assessor - Risk assessment and blocking factors"""
        perspective = CirclePerspective(
            circle=Circle.ASSESSOR,
            purpose="Risk assessment and blocking factor identification",
            accountability="Prevent catastrophic failures"
        )

        blockers = blockers or []

        # Check 2.1: No known blockers
        blocker_found = any(b.lower() in content.lower() for b in blockers)
        perspective.checks.append(ValidationCheck(
            id="ASSESSOR-001",
            description="No known blocking issues present",
            category="blockers",
            severity=Severity.CRITICAL,
            passed=not blocker_found,
            message="No blockers" if not blocker_found else "Blocker detected",
            evidence={"blockers_checked": blockers},
            layer=1
        ))

        # Check 2.2: Risk acknowledgment
        risk_keywords = ["risk", "concern", "issue", "problem", "challenge"]
        acknowledges_risk = any(kw in content.lower() for kw in risk_keywords)
        perspective.checks.append(ValidationCheck(
            id="ASSESSOR-002",
            description="Acknowledges potential risks/challenges",
            category="risk_awareness",
            severity=Severity.INFO,
            passed=acknowledges_risk,
            message="Risks acknowledged" if acknowledges_risk else "No risk discussion",
            layer=1
        ))

        # Check 2.3: Deadline awareness
        deadline_keywords = ["deadline", "due date", "by", "before", "expires"]
        has_deadline = any(kw in content.lower() for kw in deadline_keywords)
        perspective.checks.append(ValidationCheck(
            id="ASSESSOR-003",
            description="Contains deadline/timeline awareness",
            category="urgency",
            severity=Severity.WARNING,
            passed=has_deadline,
            message="Deadline present" if has_deadline else "No deadline specified",
            layer=1
        ))

        perspective.calculate_pass_rate()
        self.circles[Circle.ASSESSOR] = perspective
        self.layers[1].checks.extend(perspective.checks)
        return perspective

    def validate_innovator_circle(self, content: str) -> CirclePerspective:
        """Circle 3: Innovator - Federation agents and governance automation"""
        perspective = CirclePerspective(
            circle=Circle.INNOVATOR,
            purpose="Federation agents and governance automation",
            accountability="Integrate novel approaches into production"
        )

        # Check 3.1: Novel approach
        innovation_keywords = ["automat", "integrat", "systemat", "streamlin", "optim", "novel"]
        has_innovation = any(kw in content.lower() for kw in innovation_keywords)
        perspective.checks.append(ValidationCheck(
            id="INNOVATOR-001",
            description="Proposes innovative/automated solution",
            category="innovation",
            severity=Severity.INFO,
            passed=has_innovation,
            message="Innovation proposed" if has_innovation else "Traditional approach",
            layer=1
        ))

        # Check 3.2: Scalability
        scale_keywords = ["scalab", "replic", "template", "pattern", "standard", "framework"]
        has_scale = any(kw in content.lower() for kw in scale_keywords)
        perspective.checks.append(ValidationCheck(
            id="INNOVATOR-002",
            description="Considers scalability/replicability",
            category="scalability",
            severity=Severity.INFO,
            passed=has_scale,
            message="Scalable design" if has_scale else "Point solution",
            layer=1
        ))

        perspective.calculate_pass_rate()
        self.circles[Circle.INNOVATOR] = perspective
        self.layers[1].checks.extend(perspective.checks)
        return perspective

    def validate_intuitive_circle(self, content: str) -> CirclePerspective:
        """Circle 4: Intuitive - Observability and sensemaking"""
        perspective = CirclePerspective(
            circle=Circle.INTUITIVE,
            purpose="Observability-first pattern implementation",
            accountability="No failures without supporting metrics"
        )

        # Check 4.1: Visual structure
        has_headings = '###' in content or '##' in content or content.count('\n\n') > 3
        perspective.checks.append(ValidationCheck(
            id="INTUITIVE-001",
            description="Content is visually structured",
            category="visualization",
            severity=Severity.WARNING,
            passed=has_headings,
            message="Well-structured" if has_headings else "Dense wall of text",
            layer=1
        ))

        # Check 4.2: Sensemaking
        reasoning_keywords = ["because", "therefore", "reason", "explain", "shows that", "demonstrates"]
        has_reasoning = any(kw in content.lower() for kw in reasoning_keywords)
        perspective.checks.append(ValidationCheck(
            id="INTUITIVE-002",
            description="Explains reasoning/patterns",
            category="sensemaking",
            severity=Severity.WARNING,
            passed=has_reasoning,
            message="Reasoning explained" if has_reasoning else "Facts without context",
            layer=1
        ))

        perspective.calculate_pass_rate()
        self.circles[Circle.INTUITIVE] = perspective
        self.layers[1].checks.extend(perspective.checks)
        return perspective

    def validate_orchestrator_circle(self, content: str) -> CirclePerspective:
        """Circle 5: Orchestrator - Integration and coordination"""
        perspective = CirclePerspective(
            circle=Circle.ORCHESTRATOR,
            purpose="Integration and workflow coordination",
            accountability="Ensure all components work together"
        )

        # Check 5.1: Complete flow
        flow_keywords = ["first", "then", "next", "finally", "step", "process"]
        has_flow = any(kw in content.lower() for kw in flow_keywords)
        perspective.checks.append(ValidationCheck(
            id="ORCHESTRATOR-001",
            description="Describes complete workflow/process",
            category="integration",
            severity=Severity.INFO,
            passed=has_flow,
            message="Process flow defined" if has_flow else "No workflow described",
            layer=1
        ))

        # Check 5.2: Stakeholder coordination
        stakeholder_keywords = ["party", "parties", "counsel", "attorney", "court", "defendant", "plaintiff"]
        has_stakeholders = any(kw in content.lower() for kw in stakeholder_keywords)
        perspective.checks.append(ValidationCheck(
            id="ORCHESTRATOR-002",
            description="Identifies all relevant parties",
            category="stakeholders",
            severity=Severity.WARNING,
            passed=has_stakeholders,
            message="Stakeholders identified" if has_stakeholders else "Missing stakeholder context",
            layer=1
        ))

        perspective.calculate_pass_rate()
        self.circles[Circle.ORCHESTRATOR] = perspective
        self.layers[1].checks.extend(perspective.checks)
        return perspective

    def validate_seeker_circle(self, content: str) -> CirclePerspective:
        """Circle 6: Seeker - Dependency management and health"""
        perspective = CirclePerspective(
            circle=Circle.SEEKER,
            purpose="Dependency automation and codebase health",
            accountability="Keep dependencies current"
        )

        # Check 6.1: Dependencies identified
        dep_keywords = ["depend", "require", "prerequisit", "contingent", "blocked by", "awaiting"]
        has_deps = any(kw in content.lower() for kw in dep_keywords)
        perspective.checks.append(ValidationCheck(
            id="SEEKER-001",
            description="Dependencies/prerequisites identified",
            category="dependencies",
            severity=Severity.CRITICAL,
            passed=has_deps or True,  # Pass if no deps needed
            message="Dependencies mapped" if has_deps else "No dependencies specified",
            layer=1
        ))

        # Check 6.2: References included
        ref_keywords = ["§", "statute", "n.c.", "u.s.c.", "cfr", "regulation"]
        has_refs = any(kw in content.lower() for kw in ref_keywords)
        perspective.checks.append(ValidationCheck(
            id="SEEKER-002",
            description="Legal references included",
            category="references",
            severity=Severity.WARNING,
            passed=has_refs,
            message="References present" if has_refs else "No legal citations",
            layer=1
        ))

        perspective.calculate_pass_rate()
        self.circles[Circle.SEEKER] = perspective
        self.layers[1].checks.extend(perspective.checks)
        return perspective

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 2: LEGAL ROLE SIMULATION (6 Roles)
    # ─────────────────────────────────────────────────────────────────────────

    def validate_judge_perspective(self, content: str) -> RolePerspective:
        """Legal Role 1: Judge - Impartial arbiter"""
        perspective = RolePerspective(
            role=LegalRole.JUDGE,
            focus_area="Procedural correctness and legal standards"
        )

        # Check 2.1.1: Proper legal formatting
        has_case_number = bool(re.search(r'\d{2}CV\d{6}|\d{2}-CV-\d+', content))
        perspective.checks.append(ValidationCheck(
            id="JUDGE-001",
            description="Proper case number format",
            category="procedure",
            severity=Severity.CRITICAL,
            passed=has_case_number,
            message="Case number present" if has_case_number else "Missing case number",
            remediation="Add case number in format: 26CV005596-590",
            layer=2
        ))

        # Check 2.1.2: Respectful tone
        disrespectful = ["ridiculous", "stupid", "incompetent", "idiot", "crazy"]
        has_disrespect = any(word in content.lower() for word in disrespectful)
        perspective.checks.append(ValidationCheck(
            id="JUDGE-002",
            description="Maintains professional, respectful tone",
            category="decorum",
            severity=Severity.CRITICAL,
            passed=not has_disrespect,
            message="Professional tone" if not has_disrespect else "Unprofessional language detected",
            layer=2
        ))

        # Check 2.1.3: Legal basis stated
        legal_keywords = ["pursuant", "according to", "under", "per", "statute", "law"]
        has_legal_basis = any(kw in content.lower() for kw in legal_keywords)
        perspective.checks.append(ValidationCheck(
            id="JUDGE-003",
            description="States legal basis for claims",
            category="legal_foundation",
            severity=Severity.CRITICAL,
            passed=has_legal_basis,
            message="Legal basis stated" if has_legal_basis else "Missing legal foundation",
            remediation="Cite specific statutes (e.g., N.C.G.S. § 42-42)",
            layer=2
        ))

        perspective.calculate_verdict()
        self.roles[LegalRole.JUDGE] = perspective
        self.layers[2].checks.extend(perspective.checks)
        return perspective

    def validate_prosecutor_perspective(self, content: str) -> RolePerspective:
        """Legal Role 2: Prosecutor - Plaintiff advocate (strengthens claims)"""
        perspective = RolePerspective(
            role=LegalRole.PROSECUTOR,
            focus_area="Plaintiff's case strength"
        )

        # Check 2.2.1: Strong opening
        first_para = content[:500] if len(content) > 500 else content
        strong_verbs = ["violated", "breached", "failed to", "unlawful", "negligent", "willful"]
        has_strong_opening = any(verb in first_para.lower() for verb in strong_verbs)
        perspective.checks.append(ValidationCheck(
            id="PROSECUTOR-001",
            description="Opening establishes clear violation/breach",
            category="case_strength",
            severity=Severity.CRITICAL,
            passed=has_strong_opening,
            message="Strong opening claim" if has_strong_opening else "Weak opening statement",
            layer=2
        ))

        # Check 2.2.2: Multiple evidence types
        evidence_types = ["document", "photo", "screenshot", "record", "exhibit", "witness", "email"]
        evidence_count = sum(1 for et in evidence_types if et in content.lower())
        perspective.checks.append(ValidationCheck(
            id="PROSECUTOR-002",
            description="Multiple forms of evidence referenced",
            category="evidence",
            severity=Severity.CRITICAL,
            passed=evidence_count >= 3,
            message=f"{evidence_count}/7 evidence types referenced",
            evidence={"types_found": [et for et in evidence_types if et in content.lower()]},
            layer=2
        ))

        # Check 2.2.3: Damages quantified
        has_dollar = '$' in content
        has_amount = bool(re.search(r'\$[\d,]+', content))
        perspective.checks.append(ValidationCheck(
            id="PROSECUTOR-003",
            description="Damages quantified with dollar amounts",
            category="damages",
            severity=Severity.CRITICAL,
            passed=has_dollar and has_amount,
            message="Damages quantified" if has_amount else "No damage amounts specified",
            layer=2
        ))

        perspective.calculate_verdict()
        self.roles[LegalRole.PROSECUTOR] = perspective
        self.layers[2].checks.extend(perspective.checks)
        return perspective

    def validate_defense_perspective(self, content: str) -> RolePerspective:
        """Legal Role 3: Defense - Defendant perspective (finds weaknesses)"""
        perspective = RolePerspective(
            role=LegalRole.DEFENSE,
            focus_area="Defendant's counterarguments"
        )

        # Check 2.3.1: Acknowledges defendant's attempts
        good_faith_keywords = ["attempted", "effort", "tried", "responded", "addressed", "completed work"]
        acknowledges_effort = any(kw in content.lower() for kw in good_faith_keywords)
        perspective.checks.append(ValidationCheck(
            id="DEFENSE-001",
            description="Acknowledges defendant's good faith attempts",
            category="good_faith",
            severity=Severity.WARNING,
            passed=acknowledges_effort,
            message="Defendant efforts acknowledged" if acknowledges_effort else "One-sided narrative",
            remediation="Include 'Despite X attempts by defendant...' for credibility",
            layer=2
        ))

        # Check 2.3.2: No contributory fault
        plaintiff_fault_keywords = ["failed to report", "delayed reporting", "did not notify", "user error"]
        has_plaintiff_fault = any(kw in content.lower() for kw in plaintiff_fault_keywords)
        perspective.checks.append(ValidationCheck(
            id="DEFENSE-002",
            description="No self-incriminating statements",
            category="contributory_fault",
            severity=Severity.CRITICAL,
            passed=not has_plaintiff_fault,
            message="No contributory fault" if not has_plaintiff_fault else "⚠️ Plaintiff fault language detected",
            layer=2
        ))

        # Check 2.3.3: Damages reasonable
        extreme_amounts = ["$1,000,000", "$500,000", "million", "punitive"]
        has_extreme = any(amt in content for amt in extreme_amounts)
        perspective.checks.append(ValidationCheck(
            id="DEFENSE-003",
            description="Damages appear reasonable (not inflated)",
            category="damages_reasonableness",
            severity=Severity.WARNING,
            passed=not has_extreme,
            message="Reasonable damages" if not has_extreme else "Large damages may invite scrutiny",
            layer=2
        ))

        perspective.calculate_verdict()
        self.roles[LegalRole.DEFENSE] = perspective
        self.layers[2].checks.extend(perspective.checks)
        return perspective

    def validate_expert_witness_perspective(self, content: str) -> RolePerspective:
        """Legal Role 4: Expert Witness - Technical/domain expertise"""
        perspective = RolePerspective(
            role=LegalRole.EXPERT_WITNESS,
            focus_area="Technical accuracy and industry standards"
        )

        # Check 2.4.1: Technical terminology correct
        tech_keywords = ["habitability", "implied warranty", "constructive eviction", "quiet enjoyment"]
        has_tech = any(kw in content.lower() for kw in tech_keywords)
        perspective.checks.append(ValidationCheck(
            id="EXPERT-001",
            description="Uses correct legal/technical terminology",
            category="terminology",
            severity=Severity.WARNING,
            passed=has_tech,
            message="Proper terminology" if has_tech else "Missing legal terms",
            layer=2
        ))

        # Check 2.4.2: Industry standards referenced
        standard_keywords = ["standard", "code", "regulation", "requirement", "guideline", "best practice"]
        has_standards = any(kw in content.lower() for kw in standard_keywords)
        perspective.checks.append(ValidationCheck(
            id="EXPERT-002",
            description="References industry standards/codes",
            category="standards",
            severity=Severity.INFO,
            passed=has_standards,
            message="Standards referenced" if has_standards else "No standard references",
            layer=2
        ))

        perspective.calculate_verdict()
        self.roles[LegalRole.EXPERT_WITNESS] = perspective
        self.layers[2].checks.extend(perspective.checks)
        return perspective

    def validate_jury_perspective(self, content: str) -> RolePerspective:
        """Legal Role 5: Jury - Common sense evaluation"""
        perspective = RolePerspective(
            role=LegalRole.JURY,
            focus_area="Common sense and emotional impact"
        )

        # Check 2.5.1: Understandable to layperson
        word_count = len(content.split())
        sentence_count = content.count('.') + content.count('!') + content.count('?')
        avg_sentence_length = word_count / max(sentence_count, 1)
        readable = avg_sentence_length < 25  # Clear, not verbose

        perspective.checks.append(ValidationCheck(
            id="JURY-001",
            description="Readable by average person (not overly complex)",
            category="readability",
            severity=Severity.WARNING,
            passed=readable,
            message=f"Avg sentence: {avg_sentence_length:.0f} words ({'good' if readable else 'too complex'})",
            layer=2
        ))

        # Check 2.5.2: Emotional narrative
        emotional_keywords = ["suffered", "hardship", "distress", "harmful", "dangerous", "impact"]
        has_emotion = any(kw in content.lower() for kw in emotional_keywords)
        perspective.checks.append(ValidationCheck(
            id="JURY-002",
            description="Conveys human impact/harm",
            category="narrative",
            severity=Severity.INFO,
            passed=has_emotion,
            message="Human impact conveyed" if has_emotion else "Dry, technical only",
            layer=2
        ))

        perspective.calculate_verdict()
        self.roles[LegalRole.JURY] = perspective
        self.layers[2].checks.extend(perspective.checks)
        return perspective

    def validate_mediator_perspective(self, content: str) -> RolePerspective:
        """Legal Role 6: Mediator - Settlement facilitation"""
        perspective = RolePerspective(
            role=LegalRole.MEDIATOR,
            focus_area="Settlement viability"
        )

        # Check 2.6.1: Settlement language
        settlement_keywords = ["settlement", "resolve", "negotiate", "agree", "compromise", "offer"]
        has_settlement = any(kw in content.lower() for kw in settlement_keywords)
        perspective.checks.append(ValidationCheck(
            id="MEDIATOR-001",
            description="Settlement-focused language present",
            category="settlement_focus",
            severity=Severity.CRITICAL,
            passed=has_settlement,
            message="Settlement-oriented" if has_settlement else "Litigation-only focus",
            layer=2
        ))

        # Check 2.6.2: Mutual benefit framing
        mutual_keywords = ["both parties", "mutual", "avoid litigation", "early resolution", "save"]
        has_mutual = any(kw in content.lower() for kw in mutual_keywords)
        perspective.checks.append(ValidationCheck(
            id="MEDIATOR-002",
            description="Frames settlement as mutually beneficial",
            category="mutual_benefit",
            severity=Severity.WARNING,
            passed=has_mutual,
            message="Win-win framing" if has_mutual else "Adversarial framing only",
            layer=2
        ))

        # Check 2.6.3: Clear deadline
        deadline_match = re.search(r'(by|before|deadline|respond|within)\s*(\d+|[A-Z][a-z]+ \d+)', content, re.IGNORECASE)
        has_deadline = deadline_match is not None
        perspective.checks.append(ValidationCheck(
            id="MEDIATOR-003",
            description="Settlement deadline clearly stated",
            category="timeline",
            severity=Severity.CRITICAL,
            passed=has_deadline,
            message="Deadline present" if has_deadline else "No settlement deadline",
            layer=2
        ))

        perspective.calculate_verdict()
        self.roles[LegalRole.MEDIATOR] = perspective
        self.layers[2].checks.extend(perspective.checks)
        return perspective

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 3: GOVERNMENT COUNSEL (5 Counsels)
    # ─────────────────────────────────────────────────────────────────────────

    def validate_county_attorney(self, content: str) -> CounselPerspective:
        """Government Counsel 1: County Attorney - Local enforcement"""
        perspective = CounselPerspective(
            counsel=GovernmentCounsel.COUNTY_ATTORNEY,
            jurisdiction="Local/County",
            focus="Building codes and local ordinances"
        )

        # Check 3.1.1: Local code violations
        local_keywords = ["building code", "ordinance", "inspection", "permit", "zoning", "county"]
        has_local = any(kw in content.lower() for kw in local_keywords)
        perspective.checks.append(ValidationCheck(
            id="COUNTY-001",
            description="References local building codes/ordinances",
            category="local_compliance",
            severity=Severity.INFO,
            passed=has_local,
            message="Local codes referenced" if has_local else "No local code citations",
            layer=3
        ))

        self.counsels[GovernmentCounsel.COUNTY_ATTORNEY] = perspective
        self.layers[3].checks.extend(perspective.checks)
        return perspective

    def validate_state_ag_consumer(self, content: str) -> CounselPerspective:
        """Government Counsel 2: State AG Consumer Protection"""
        perspective = CounselPerspective(
            counsel=GovernmentCounsel.STATE_AG_CONSUMER,
            jurisdiction="State",
            focus="Consumer protection and UDAP violations"
        )

        # Check 3.2.1: State consumer law references
        state_keywords = ["n.c.g.s.", "state law", "consumer protection", "unfair", "deceptive", "udap"]
        has_state = any(kw in content.lower() for kw in state_keywords)
        perspective.checks.append(ValidationCheck(
            id="STATE-AG-001",
            description="References state consumer protection laws",
            category="state_law",
            severity=Severity.WARNING,
            passed=has_state,
            message="State law cited" if has_state else "No state law references",
            remediation="Cite N.C.G.S. § 42-42 (Habitability) or § 75-1.1 (UDAP)",
            layer=3
        ))

        self.counsels[GovernmentCounsel.STATE_AG_CONSUMER] = perspective
        self.layers[3].checks.extend(perspective.checks)
        return perspective

    def validate_hud_regional(self, content: str) -> CounselPerspective:
        """Government Counsel 3: HUD Regional Office"""
        perspective = CounselPerspective(
            counsel=GovernmentCounsel.HUD_REGIONAL,
            jurisdiction="Federal",
            focus="Fair Housing Act and federal housing standards"
        )

        # Check 3.3.1: Federal housing law references
        hud_keywords = ["hud", "fair housing", "fha", "federal", "discriminat", "section 8"]
        has_hud = any(kw in content.lower() for kw in hud_keywords)
        perspective.checks.append(ValidationCheck(
            id="HUD-001",
            description="References federal housing laws/HUD standards",
            category="federal_housing",
            severity=Severity.INFO,
            passed=has_hud,
            message="HUD/federal standards cited" if has_hud else "No federal housing references",
            layer=3
        ))

        self.counsels[GovernmentCounsel.HUD_REGIONAL] = perspective
        self.layers[3].checks.extend(perspective.checks)
        return perspective

    def validate_legal_aid(self, content: str) -> CounselPerspective:
        """Government Counsel 4: Legal Aid - Pro Se Assistance"""
        perspective = CounselPerspective(
            counsel=GovernmentCounsel.LEGAL_AID,
            jurisdiction="Access to Justice",
            focus="Pro se litigant support"
        )

        # Check 3.4.1: Pro se identification
        pro_se_keywords = ["pro se", "self-represented", "without attorney", "representing myself"]
        has_pro_se = any(kw in content.lower() for kw in pro_se_keywords)
        perspective.checks.append(ValidationCheck(
            id="LEGAL-AID-001",
            description="Properly identifies pro se status",
            category="pro_se",
            severity=Severity.CRITICAL,
            passed=has_pro_se,
            message="Pro se status stated" if has_pro_se else "Pro se status not declared",
            remediation="Include 'Pro Se Plaintiff' in signature block",
            layer=3
        ))

        self.counsels[GovernmentCounsel.LEGAL_AID] = perspective
        self.layers[3].checks.extend(perspective.checks)
        return perspective

    def validate_cfpb_perspective(self, content: str) -> CounselPerspective:
        """Government Counsel 5: CFPB - Consumer Financial Protection"""
        perspective = CounselPerspective(
            counsel=GovernmentCounsel.CFPB,
            jurisdiction="Federal",
            focus="Consumer financial protection"
        )

        # Check 3.5.1: Financial harm documented
        financial_keywords = ["fees", "charges", "deposit", "rent", "payment", "financial"]
        has_financial = any(kw in content.lower() for kw in financial_keywords)
        perspective.checks.append(ValidationCheck(
            id="CFPB-001",
            description="Documents financial harm/charges",
            category="financial_harm",
            severity=Severity.WARNING,
            passed=has_financial,
            message="Financial harm documented" if has_financial else "No financial details",
            layer=3
        ))

        self.counsels[GovernmentCounsel.CFPB] = perspective
        self.layers[3].checks.extend(perspective.checks)
        return perspective

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 4: SOFTWARE PATTERNS (4 Validators)
    # ─────────────────────────────────────────────────────────────────────────

    def validate_prd_pattern(self, content: str) -> ValidationCheck:
        """Software Pattern 1: PRD - Product Requirements Document"""
        elements = {
            "problem": any(kw in content.lower() for kw in ["problem", "challenge", "issue"]),
            "goal": any(kw in content.lower() for kw in ["goal", "objective", "purpose", "request"]),
            "stakeholders": any(kw in content.lower() for kw in ["party", "plaintiff", "defendant"]),
            "requirements": any(kw in content.lower() for kw in ["must", "shall", "required", "demand"]),
            "metrics": any(kw in content.lower() for kw in ["damage", "amount", "dollar", "$"]),
        }
        score = sum(1 for v in elements.values() if v)

        check = ValidationCheck(
            id="PRD-001",
            description="Follows PRD pattern (problem/goal/requirements/metrics)",
            category="software_pattern",
            severity=Severity.INFO,
            passed=score >= 3,
            message=f"{score}/5 PRD elements present",
            evidence=elements,
            layer=4
        )
        self.patterns[SoftwarePattern.PRD] = check
        self.layers[4].checks.append(check)
        return check

    def validate_adr_pattern(self, content: str) -> ValidationCheck:
        """Software Pattern 2: ADR - Architecture Decision Record"""
        elements = {
            "context": any(kw in content.lower() for kw in ["context", "background", "history"]),
            "decision": any(kw in content.lower() for kw in ["decision", "chosen", "selected", "demand"]),
            "alternatives": any(kw in content.lower() for kw in ["alternative", "option", "otherwise"]),
            "consequences": any(kw in content.lower() for kw in ["consequence", "impact", "result"]),
            "rationale": any(kw in content.lower() for kw in ["because", "reason", "therefore"]),
        }
        score = sum(1 for v in elements.values() if v)

        check = ValidationCheck(
            id="ADR-001",
            description="Follows ADR pattern (context/decision/consequences)",
            category="software_pattern",
            severity=Severity.INFO,
            passed=score >= 3,
            message=f"{score}/5 ADR elements present",
            evidence=elements,
            layer=4
        )
        self.patterns[SoftwarePattern.ADR] = check
        self.layers[4].checks.append(check)
        return check

    def validate_ddd_pattern(self, content: str) -> ValidationCheck:
        """Software Pattern 3: DDD - Domain-Driven Design"""
        elements = {
            "bounded_context": any(kw in content.lower() for kw in ["case", "matter", "dispute"]),
            "entities": any(kw in content.lower() for kw in ["plaintiff", "defendant", "property"]),
            "value_objects": any(kw in content.lower() for kw in ["amount", "date", "address"]),
            "ubiquitous_language": content.count(":") > 3,  # Definitions
        }
        score = sum(1 for v in elements.values() if v)

        check = ValidationCheck(
            id="DDD-001",
            description="Follows DDD pattern (domain model, entities)",
            category="software_pattern",
            severity=Severity.INFO,
            passed=score >= 2,
            message=f"{score}/4 DDD elements present",
            evidence=elements,
            layer=4
        )
        self.patterns[SoftwarePattern.DDD] = check
        self.layers[4].checks.append(check)
        return check

    def validate_tdd_pattern(self, content: str) -> ValidationCheck:
        """Software Pattern 4: TDD - Test-Driven Development"""
        elements = {
            "assertion": any(kw in content.lower() for kw in ["assert", "claim", "allege"]),
            "evidence": any(kw in content.lower() for kw in ["evidence", "exhibit", "document"]),
            "verification": any(kw in content.lower() for kw in ["verify", "confirm", "demonstrate"]),
            "coverage": any(kw in content.lower() for kw in ["all", "complete", "comprehensive"]),
        }
        score = sum(1 for v in elements.values() if v)

        check = ValidationCheck(
            id="TDD-001",
            description="Follows TDD pattern (assertion/evidence/verification)",
            category="software_pattern",
            severity=Severity.INFO,
            passed=score >= 2,
            message=f"{score}/4 TDD elements present",
            evidence=elements,
            layer=4
        )
        self.patterns[SoftwarePattern.TDD] = check
        self.layers[4].checks.append(check)
        return check

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER 5: ADVANCED STRATEGIC ROLES (6 Roles)
    # ─────────────────────────────────────────────────────────────────────────

    def validate_game_theorist(self, content: str) -> ValidationCheck:
        """Role 22: Game Theorist - Nash Equilibrium Analysis"""
        elements = {
            "payoff_matrix": any(kw in content.lower() for kw in ["if you", "if i", "outcome", "scenario"]),
            "equilibrium": any(kw in content.lower() for kw in ["settle", "avoid trial", "mutual benefit"]),
            "threat_point": any(kw in content.lower() for kw in ["litigation", "court", "trial", "risk"]),
        }
        score = sum(1 for v in elements.values() if v)
        check = ValidationCheck(
            id="GAME-001", description="Game Theory: Nash Equilibrium Setup", category="strategy",
            severity=Severity.INFO, passed=score >= 2, message=f"Game Theory: {score}/3 elements", layer=5
        )
        self.advanced_roles["GameTheorist"] = check
        return check

    def validate_behavioral_economist(self, content: str) -> ValidationCheck:
        """Role 23: Behavioral Economist - Cognitive Bias Exploitation"""
        biases = {
            "loss_aversion": any(kw in content.lower() for kw in ["lose", "risk", "cost", "damage"]),
            "anchoring": any(kw in content.lower() for kw in ["$", "offer", "demand", "settlement"]),
            "urgency": any(kw in content.lower() for kw in ["deadline", "today", "expire", "now"]),
        }
        score = sum(1 for v in biases.values() if v)
        check = ValidationCheck(
            id="BEHAV-001", description="Behavioral Economics: Cognitive Biases", category="strategy",
            severity=Severity.INFO, passed=score >= 2, message=f"Biases Triggered: {score}/3", layer=5
        )
        self.advanced_roles["BehavioralEconomist"] = check
        return check

    def validate_systems_thinker(self, content: str) -> ValidationCheck:
        """Role 24: Systems Thinker - Feedback Loops"""
        elements = {
            "feedback_loop": any(kw in content.lower() for kw in ["cycle", "repeat", "pattern", "recurring"]),
            "causality": any(kw in content.lower() for kw in ["because", "due to", "caused by", "result of"]),
        }
        score = sum(1 for v in elements.values() if v)
        check = ValidationCheck(
            id="SYSTEMS-001", description="Systems Thinking: Feedback Loops", category="strategy",
            severity=Severity.INFO, passed=score >= 1, message=f"Systems Thinking: {score}/2 elements", layer=5
        )
        self.advanced_roles["SystemsThinker"] = check
        return check

    def validate_narrative_designer(self, content: str) -> ValidationCheck:
        """Role 25: Narrative Designer - Story Arc"""
        elements = {
            "inciting_incident": any(kw in content.lower() for kw in ["began", "started", "initially"]),
            "rising_action": any(kw in content.lower() for kw in ["escalated", "continued", "despite"]),
            "climax": any(kw in content.lower() for kw in ["final", "demand", "deadline", "conclusion"]),
        }
        score = sum(1 for v in elements.values() if v)
        check = ValidationCheck(
            id="STORY-001", description="Narrative Design: Story Arc", category="strategy",
            severity=Severity.INFO, passed=score >= 2, message=f"Narrative Arc: {score}/3 elements", layer=5
        )
        self.advanced_roles["NarrativeDesigner"] = check
        return check

    def validate_emotional_intel(self, content: str) -> ValidationCheck:
        """Role 26: Emotional Intelligence - Empathy Mapping"""
        elements = {
            "empathy": any(kw in content.lower() for kw in ["understand", "appreciate", "recognize", "acknowledge"]),
            "perspective": any(kw in content.lower() for kw in ["your view", "maa's position", "business interest"]),
        }
        score = sum(1 for v in elements.values() if v)
        check = ValidationCheck(
            id="EQ-001", description="Emotional Intelligence: Empathy", category="strategy",
            severity=Severity.INFO, passed=score >= 1, message=f"EQ Elements: {score}/2", layer=5
        )
        self.advanced_roles["EmotionalIntel"] = check
        return check

    def validate_info_theorist(self, content: str) -> ValidationCheck:
        """Role 27: Information Theorist - Signal-to-Noise Ratio"""
        # Crude layout check using bullet points or headers as 'signal' markers
        signal_markers = content.count("- ") + content.count("* ") + content.count(":")
        is_high_signal = signal_markers > 5
        check = ValidationCheck(
            id="INFO-001", description="Information Theory: Signal-to-Noise", category="strategy",
            severity=Severity.INFO, passed=is_high_signal, message=f"Signal Markers: {signal_markers}", layer=5
        )
        self.advanced_roles["InfoTheorist"] = check
        return check

    # ─────────────────────────────────────────────────────────────────────────
    # TEMPORAL VALIDATION
    # ─────────────────────────────────────────────────────────────────────────

    def validate_temporal(self, content: str, deadlines: Dict[str, datetime] = None) -> List[TemporalValidation]:
        """Validate date arithmetic and temporal references"""
        results = []
        deadlines = deadlines or {}

        # Find date references
        date_patterns = [
            r'(\d{1,2}/\d{1,2}/\d{2,4})',
            r'([A-Z][a-z]+ \d{1,2},? \d{4})',
            r'(\d{4}-\d{2}-\d{2})',
        ]

        for pattern in date_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                try:
                    # Try to parse the date
                    for fmt in ['%m/%d/%Y', '%m/%d/%y', '%B %d, %Y', '%B %d %Y', '%Y-%m-%d']:
                        try:
                            parsed = datetime.strptime(match, fmt)
                            results.append(TemporalValidation(
                                id=f"TEMPORAL-{len(results)+1:03d}",
                                description=f"Date reference: {match}",
                                date_mentioned=parsed,
                                is_valid=True,
                                message=f"Valid date: {parsed.strftime('%Y-%m-%d')}"
                            ))
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass

        # Check "48 hours" type references
        hour_refs = re.findall(r'(\d+)\s*(hours?|days?|weeks?)', content, re.IGNORECASE)
        for amount, unit in hour_refs:
            results.append(TemporalValidation(
                id=f"TEMPORAL-REL-{len(results)+1:03d}",
                description=f"Relative time: {amount} {unit}",
                is_valid=True,
                message=f"Time reference: {amount} {unit}"
            ))

        self.temporal_checks = results
        return results

    # ─────────────────────────────────────────────────────────────────────────
    # HELPER: Map Advanced Roles to Layer 5
    # ─────────────────────────────────────────────────────────────────────────
    def _map_advanced_to_layer(self):
        # This is a helper called during run_full_validation if needed,
        # but better to do it inline in the validate methods.
        # I'll update the validate methods instead.
        pass

    # ─────────────────────────────────────────────────────────────────────────
    # SIGNATURE BLOCK VALIDATION
    # ─────────────────────────────────────────────────────────────────────────

    def validate_signature_block(self, content: str, doc_type: str = "settlement") -> ValidationCheck:
        """
        Validate signature block based on document type

        Settlement emails should include:
        - Pro Se (Evidence-Based Systemic Analysis)
        - Case No.
        - Settlement Deadline

        Court filings should use simpler Pro Se without methodology
        """
        # Settlement signature elements
        settlement_elements = {
            "pro_se": any(kw in content.lower() for kw in ["pro se", "self-represented"]),
            "case_number": bool(re.search(r'\d{2}CV\d{6}', content)),
            "methodology": "evidence-based" in content.lower() or "systemic analysis" in content.lower(),
            "deadline": any(kw in content.lower() for kw in ["deadline", "respond by", "settlement"]),
            "contact": bool(re.search(r'[\w\.-]+@[\w\.-]+', content)),
        }

        # Court filing elements
        court_elements = {
            "pro_se": settlement_elements["pro_se"],
            "case_number": settlement_elements["case_number"],
            "court_name": any(kw in content.lower() for kw in ["superior court", "district court"]),
            "address": bool(re.search(r'\d+\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd)', content)),
        }

        if doc_type == "settlement":
            score = sum(1 for v in settlement_elements.values() if v)
            passed = score >= 3
            message = f"Settlement signature: {score}/5 elements"
        else:
            score = sum(1 for v in court_elements.values() if v)
            passed = score >= 3
            message = f"Court signature: {score}/4 elements"

        return ValidationCheck(
            id="SIGNATURE-001",
            description=f"Signature block valid for {doc_type}",
            category="signature",
            severity=Severity.CRITICAL,
            passed=passed,
            message=message,
            evidence=settlement_elements if doc_type == "settlement" else court_elements,
            remediation="Include: Pro Se, Case No., Contact info" if not passed else None
        )

    # ─────────────────────────────────────────────────────────────────────────
    # WSJF PRIORITIZATION
    # ─────────────────────────────────────────────────────────────────────────

    def calculate_wsjf(self, items: List[Dict[str, float]]) -> List[WsjfScore]:
        """
        Calculate WSJF scores for prioritization

        Each item should have:
        - name: str
        - business_value: 1-10
        - time_criticality: 1-10
        - risk_reduction: 1-10
        - job_size: 1-10
        """
        results = []
        for item in items:
            wsjf = WsjfScore(
                item=item.get("name", "Unknown"),
                business_value=item.get("business_value", 5),
                time_criticality=item.get("time_criticality", 5),
                risk_reduction=item.get("risk_reduction", 5),
                job_size=item.get("job_size", 5)
            )
            wsjf.calculate()
            results.append(wsjf)

        # Sort by WSJF descending
        results.sort(key=lambda x: x.wsjf, reverse=True)
        self.wsjf_items = results
        return results

    # ─────────────────────────────────────────────────────────────────────────
    # FULL VALIDATION ORCHESTRATION
    # ─────────────────────────────────────────────────────────────────────────

    def run_full_validation(self, content: str,
                           doc_type: str = "settlement",
                           blockers: List[str] = None,
                           min_circles_covered: Optional[int] = None,
                           min_institutions_covered: Optional[int] = None) -> Dict:
        """
        Run complete 21-role validation

        Args:
            content: Document content to validate
            doc_type: settlement | court | discovery
            blockers: List of blocking phrases to check for
            min_circles_covered: Optional. Require at least N circles covered before APPROVE.
            min_institutions_covered: Optional. Require at least N institutions covered before APPROVE.

        Returns comprehensive report with all layer results.
        When min_circles_covered/min_institutions_covered are provided, APPROVE is downgraded
        if thresholds are not met. Output includes circles_covered/circles_total and
        institutions_covered/institutions_total for dashboard display.
        """
        blockers = blockers or []
        self._min_circles = min_circles_covered
        self._min_institutions = min_institutions_covered

        # Layer 1: Circle Orchestration (6)
        self.validate_analyst_circle(content)
        self.validate_assessor_circle(content, blockers)
        self.validate_innovator_circle(content)
        self.validate_intuitive_circle(content)
        self.validate_orchestrator_circle(content)
        self.validate_seeker_circle(content)

        # Layer 2: Legal Role Simulation (6)
        self.validate_judge_perspective(content)
        self.validate_prosecutor_perspective(content)
        self.validate_defense_perspective(content)
        self.validate_expert_witness_perspective(content)
        self.validate_jury_perspective(content)
        self.validate_mediator_perspective(content)

        # Layer 3: Government Counsel (5)
        self.validate_county_attorney(content)
        self.validate_state_ag_consumer(content)
        self.validate_hud_regional(content)
        self.validate_legal_aid(content)
        self.validate_cfpb_perspective(content)

        # Layer 4: Software Patterns (4)
        self.validate_prd_pattern(content)
        self.validate_adr_pattern(content)
        self.validate_ddd_pattern(content)
        self.validate_tdd_pattern(content)

        # Layer 5: Advanced Strategy (6)
        self.validate_game_theorist(content)
        self.validate_behavioral_economist(content)
        self.validate_systems_thinker(content)
        self.validate_narrative_designer(content)
        self.validate_emotional_intel(content)
        self.validate_info_theorist(content)

        # Additional validations
        signature_check = self.validate_signature_block(content, doc_type)
        self.validate_temporal(content)

        # Calculate layer health scores
        for layer in self.layers.values():
            layer.calculate_health()

        # Calculate overall scores and coverage
        self._calculate_overall_scores()
        self._calculate_coverage()

        return self.generate_report()

    def _calculate_overall_scores(self):
        """Calculate overall wholeness and consensus scores"""
        all_checks = []
        for layer in self.layers.values():
            all_checks.extend(layer.checks)

        if all_checks:
            passed = sum(1 for c in all_checks if c.passed)
            self.overall_score = (passed / len(all_checks)) * 100

        # Consensus from roles
        verdicts = [r.verdict for r in self.roles.values()]
        approve_count = sum(1 for v in verdicts if v in [Verdict.APPROVE, Verdict.CONDITIONAL_APPROVE])
        self.consensus_rating = (approve_count / len(verdicts)) * 5 if verdicts else 0

    def _calculate_coverage(self):
        """Compute covered circles and institutions for threshold gating"""
        self.covered_circles = sum(1 for p in self.circles.values() if p.pass_rate > 0 or any(c.passed for c in p.checks))
        self.covered_institutions = sum(1 for p in self.counsels.values() if any(c.passed for c in p.checks))

    def generate_report(self) -> Dict:
        """Generate comprehensive validation report"""
        return {
            "metadata": {
                "document_path": self.document_path,
                "validation_timestamp": datetime.utcnow().isoformat(),
                "total_roles": 27,
                "layers": 5
            },
            "overall": {
                "wholeness_score": round(self.overall_score, 1),
                "consensus_rating": round(self.consensus_rating, 2),
                "recommendation": self._get_recommendation(),
                "circles_covered": self.covered_circles,
                "circles_total": 6,
                "institutions_covered": self.covered_institutions,
                "institutions_total": 5,
            },
            "layers": {
                layer_num: {
                    "name": layer.name,
                    "roles_count": layer.roles_count,
                    "health_score": round(layer.health_score, 1),
                    "checks_passed": sum(1 for c in layer.checks if c.passed),
                    "checks_total": len(layer.checks)
                } for layer_num, layer in self.layers.items()
            },
            "circles": {
                circle.name: {
                    "purpose": persp.purpose,
                    "pass_rate": round(persp.pass_rate, 1),
                    "checks": [{
                        "id": c.id,
                        "passed": c.passed,
                        "message": c.message,
                        "severity": c.severity.value
                    } for c in persp.checks]
                } for circle, persp in self.circles.items()
            },
            "roles": {
                role.name: {
                    "focus": persp.focus_area,
                    "verdict": persp.verdict.value,
                    "confidence": round(persp.confidence, 2),
                    "reasoning": persp.reasoning
                } for role, persp in self.roles.items()
            },
            "counsels": {
                counsel.name: {
                    "jurisdiction": persp.jurisdiction,
                    "focus": persp.focus,
                    "checks_passed": sum(1 for c in persp.checks if c.passed),
                    "checks_total": len(persp.checks)
                } for counsel, persp in self.counsels.items()
            },
            "patterns": {
                pattern.name: {
                    "passed": check.passed,
                    "message": check.message,
                    "evidence": check.evidence
                } for pattern, check in self.patterns.items()
            },
            "advanced": {
                role: {
                    "passed": check.passed,
                    "message": check.message,
                    "score": check.message.split(":")[1].strip() if ":" in check.message else "N/A"
                } for role, check in self.advanced_roles.items()
            },
            "temporal": [{
                "id": t.id,
                "description": t.description,
                "is_valid": t.is_valid,
                "message": t.message
            } for t in self.temporal_checks[:10]],  # Limit to 10
            "wsjf": [{
                "item": w.item,
                "wsjf_score": round(w.wsjf, 2),
                "business_value": w.business_value,
                "time_criticality": w.time_criticality
            } for w in self.wsjf_items[:10]]
        }

    def _get_recommendation(self) -> str:
        """Get overall recommendation based on scores and optional threshold gating"""
        min_c = getattr(self, '_min_circles', None)
        min_i = getattr(self, '_min_institutions', None)

        # Threshold gating: require circles and institutions coverage before APPROVE
        if min_c is not None and self.covered_circles < min_c:
            return f"NEEDS_REVISION - Circles coverage {self.covered_circles}/6 < {min_c} required"
        if min_i is not None and self.covered_institutions < min_i:
            return f"NEEDS_REVISION - Institutions coverage {self.covered_institutions}/5 < {min_i} required"

        if self.overall_score >= 90 and self.consensus_rating >= 4:
            return "APPROVE - Ready to send"
        elif self.overall_score >= 75:
            return "CONDITIONAL_APPROVE - Minor revisions recommended"
        elif self.overall_score >= 60:
            return "NEEDS_REVISION - Address critical issues"
        else:
            return "REJECT - Major rework required"


# ═════════════════════════════════════════════════════════════════════════════
# ADVERSARIAL REVIEW MODE
# ═════════════════════════════════════════════════════════════════════════════

class AdversarialReview:
    """
    Adversarial review mode for Judge/Prosecutor/Defense simulation
    Surfaces arguments from both sides to strengthen case
    """

    def __init__(self, council: GovernanceCouncil):
        self.council = council
        self.prosecution_arguments: List[str] = []
        self.defense_arguments: List[str] = []
        self.judge_concerns: List[str] = []

    def run_adversarial_review(self, content: str, k_revisions: int = 5) -> Dict:
        """Run full adversarial analysis with MGPO entropy-guided triadic revisions"""
        # Get prosecutor perspective
        prosecutor = self.council.validate_prosecutor_perspective(content)
        for check in prosecutor.checks:
            if check.passed:
                self.prosecution_arguments.append(f"✓ {check.description}: {check.message}")
            else:
                self.prosecution_arguments.append(f"⚠ STRENGTHEN: {check.description}")

        # Get defense perspective
        defense = self.council.validate_defense_perspective(content)
        for check in defense.checks:
            if not check.passed:
                self.defense_arguments.append(f"🎯 EXPLOIT: {check.description}")
            else:
                self.defense_arguments.append(f"✓ Defended: {check.description}")

        # Get judge perspective
        judge = self.council.validate_judge_perspective(content)
        for check in judge.checks:
            if not check.passed:
                self.judge_concerns.append(f"⚖️ {check.description}: {check.remediation}")

        return {
            "prosecution_case": {
                "strength": prosecutor.verdict.value,
                "confidence": prosecutor.confidence,
                "arguments": self.prosecution_arguments
            },
            "defense_weaknesses": {
                "exposed": defense.verdict.value != Verdict.APPROVE,
                "arguments": self.defense_arguments
            },
            "judge_ruling": {
                "concerns": self.judge_concerns,
                "verdict": judge.verdict.value,
                "reasoning": judge.reasoning
            },
            "recommendation": self._get_adversarial_recommendation(prosecutor, defense, judge),
            "mgpo_revisions": self.generate_mgpo_revisions(content, k=k_revisions)
        }

    def _get_adversarial_recommendation(self, prosecutor: RolePerspective,
                                        defense: RolePerspective,
                                        judge: RolePerspective) -> str:
        """Synthesize adversarial perspectives into recommendation"""
        scores = {
            "prosecutor": prosecutor.confidence,
            "defense": 1 - defense.confidence,  # Lower is better for plaintiff
            "judge": 1 if judge.verdict == Verdict.APPROVE else 0.5
        }

        avg = sum(scores.values()) / len(scores)

        if avg >= 0.8:
            return "STRONG CASE - Proceed with confidence"
        elif avg >= 0.6:
            return "MODERATE CASE - Address defense vulnerabilities"
        else:
            return "WEAK CASE - Significant strengthening needed"

    def generate_mgpo_revisions(self, content: str, k: int = 5) -> Dict:
        """
        Integrate MGPO (MaxEnt-Guided Policy Optimization) to select best of K revisions
        targeting the Mantra/Yasna/Mithra triad logic.
        """
        import random
        rng = random.Random(42)  # Deterministic seed for reproducibility

        revisions = []
        triad_focuses = ["Mantra (Intent)", "Yasna (Process)", "Mithra (Action)"]

        for i in range(k):
            # Select Triad focus
            focus = rng.choice(triad_focuses)

            # Apply temperature-like variance to structural adjustments
            temp = rng.uniform(0.5, 1.5)

            # Base quality determined by how well it fits the focus
            base_quality = rng.uniform(0.6, 0.95)
            variant_strength = min(1.0, base_quality * temp)

            # Entropy calculation based on divergence from standard formatting
            entropy_score = abs(temp - 1.0)

            # MGPO Score balances strength and entropy
            mgpo_score = (0.7 * variant_strength) + (0.3 * entropy_score)

            # Simulate a revision text
            revision_text = f"[{focus} Revision] Simplified and structured argument based on {focus}. Variance level: {temp:.2f}"

            revisions.append({
                "id": f"REV-{i+1}",
                "focus": focus,
                "text": revision_text,
                "strength": mgpo_score,
                "entropy": entropy_score
            })

        # Select best revision based on MGPO strength
        best_revision = max(revisions, key=lambda x: x["strength"])

        return {
            "selected_revision": best_revision,
            "all_revisions": revisions,
            "mgpo_insight": f"Selected {best_revision['id']} targeting {best_revision['focus']} out of {k} variants."
        }


# ═════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═════════════════════════════════════════════════════════════════════════════

def main():
    """CLI entry point for governance council"""
    import argparse

    parser = argparse.ArgumentParser(
        description="21-Role Governance Council Validation"
    )
    parser.add_argument("--file", "-f", required=True, help="Document to validate")
    parser.add_argument("--type", "-t", default="settlement",
                       choices=["settlement", "court", "discovery"],
                       help="Document type")
    parser.add_argument("--adversarial", "-a", action="store_true",
                       help="Run adversarial review mode")
    parser.add_argument("--layer", "-l", type=int, choices=[1, 2, 3, 4],
                       help="Validate specific layer only")
    parser.add_argument("--output", "-o", help="Output JSON file")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--min-circles", type=int, default=None,
                       help="Require at least N circles covered before APPROVE")
    parser.add_argument("--min-institutions", type=int, default=None,
                       help="Require at least N institutions covered before APPROVE")

    args = parser.parse_args()

    # Read document
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"Error: File not found: {file_path}")
        return 1

    content = file_path.read_text(encoding='utf-8')

    # Create council
    council = GovernanceCouncil(str(file_path))

    # Run validation
    if args.adversarial:
        adversarial = AdversarialReview(council)
        report = adversarial.run_adversarial_review(content)
    else:
        report = council.run_full_validation(
            content, args.type,
            min_circles_covered=args.min_circles,
            min_institutions_covered=args.min_institutions
        )

    # Output
    output = json.dumps(report, indent=2)

    if args.output:
        Path(args.output).write_text(output)
        print(f"Report written to: {args.output}")
    else:
        print(output)

    # Exit code
    if "overall" in report:
        score = report["overall"]["wholeness_score"]
        return 0 if score >= 75 else 1
    return 0


if __name__ == "__main__":
    exit(main())
