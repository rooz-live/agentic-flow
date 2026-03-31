#!/usr/bin/env python3
"""
Wholeness Validation Framework
Integrates circle-based orchestration with multi-role legal simulation

Architecture:
1. Circle-Based Orchestration: analyst/assessor/innovator/intuitive/orchestrator/seeker
2. Multi-Role Legal Simulation: judge/prosecutor/defense/expert witness/jury
3. Government Counsel Review: jurisdiction-specific validation (5+ perspectives)
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime
import json


# ═════════════════════════════════════════════════════════════════
# SECTION 1: CIRCLE DEFINITIONS (Holacracy Integration)
# ═════════════════════════════════════════════════════════════════

class Circle(Enum):
    """6 circles from CIRCLE_MAPPINGS.yaml"""
    ANALYST = "analyst"           # Data quality, risk analytics baseline
    ASSESSOR = "assessor"         # BLOCKER remediation, dependency validation
    INNOVATOR = "innovator"       # Federation agents, governance automation
    INTUITIVE = "intuitive"       # Observability-first pattern implementation
    ORCHESTRATOR = "orchestrator" # Pattern metrics instrumentation, BML cycles
    SEEKER = "seeker"            # Dependency automation, codebase health


class LegalRole(Enum):
    """Multi-role legal simulation personas"""
    JUDGE = "judge"                    # Legal procedure, precedent, fairness
    PROSECUTOR = "prosecutor"          # Arguments for plaintiff claims
    DEFENSE = "defense"                # Arguments for defendant
    EXPERT_WITNESS = "expert_witness"  # Domain expertise (habitability, real estate)
    JURY = "jury"                      # Common sense, reasonableness
    MEDIATOR = "mediator"              # Settlement facilitation


class GovernmentCounsel(Enum):
    """Multi-jurisdiction government counsel perspectives"""
    COUNTY_ATTORNEY = "county_attorney"           # Local landlord-tenant law
    STATE_AG_CONSUMER = "state_ag_consumer"       # Consumer protection (UDTP)
    HUD_REGIONAL = "hud_regional"                 # Federal housing standards
    LEGAL_AID = "legal_aid"                       # Pro se tenant outcomes
    APPELLATE_SPECIALIST = "appellate_specialist" # Precedent/case law


# ═════════════════════════════════════════════════════════════════
# SECTION 2: VALIDATION CHECK STRUCTURES
# ═════════════════════════════════════════════════════════════════

@dataclass
class ValidationCheck:
    """Individual validation check"""
    id: str
    description: str
    category: str
    severity: str  # critical, warning, info
    passed: bool
    message: Optional[str] = None
    evidence: Optional[Dict] = None
    remediation: Optional[str] = None


@dataclass
class CirclePerspective:
    """Validation from a specific circle's perspective"""
    circle: Circle
    purpose: str
    accountability: str
    checks: List[ValidationCheck] = field(default_factory=list)
    pass_rate: float = 0.0
    recommendation: Optional[str] = None

    def calculate_pass_rate(self):
        if not self.checks:
            self.pass_rate = 0.0
            return
        passed = sum(1 for c in self.checks if c.passed)
        self.pass_rate = (passed / len(self.checks)) * 100


@dataclass
class RolePerspective:
    """Validation from a legal role's perspective"""
    role: LegalRole
    focus_area: str
    checks: List[ValidationCheck] = field(default_factory=list)
    verdict: str = "PENDING"  # APPROVE, REJECT, NEEDS_REVISION
    reasoning: Optional[str] = None

    def calculate_verdict(self):
        if not self.checks:
            self.verdict = "PENDING"
            return

        critical_failures = [c for c in self.checks if not c.passed and c.severity == "critical"]
        warnings = [c for c in self.checks if not c.passed and c.severity == "warning"]

        if critical_failures:
            self.verdict = "REJECT"
            self.reasoning = f"{len(critical_failures)} critical failures"
        elif len(warnings) > 3:
            self.verdict = "NEEDS_REVISION"
            self.reasoning = f"{len(warnings)} warnings require attention"
        else:
            self.verdict = "APPROVE"
            self.reasoning = "All critical checks passed"


@dataclass
class CounselPerspective:
    """Validation from government counsel perspective"""
    counsel: GovernmentCounsel
    jurisdiction: str
    focus_area: str
    assessment: str = "PENDING"  # LEGALLY_SOUND, WEAK, INAPPROPRIATE
    checks: List[ValidationCheck] = field(default_factory=list)
    rating: float = 0.0  # 0.0 - 5.0

    def calculate_rating(self):
        if not self.checks:
            self.rating = 0.0
            return

        passed = sum(1 for c in self.checks if c.passed)
        critical_failures = sum(1 for c in self.checks if not c.passed and c.severity == "critical")

        if critical_failures > 2:
            self.rating = 1.0
            self.assessment = "INAPPROPRIATE"
        elif critical_failures > 0:
            self.rating = 2.5
            self.assessment = "WEAK"
        else:
            self.rating = 3.0 + (passed / len(self.checks)) * 2.0
            self.assessment = "LEGALLY_SOUND" if self.rating >= 4.0 else "WEAK"


# ═════════════════════════════════════════════════════════════════
# SECTION 3: WHOLENESS VALIDATOR
# ═════════════════════════════════════════════════════════════════

class WholenessValidator:
    """
    Unified wholeness validation framework
    Combines circle-based orchestration + multi-role simulation + government counsel review
    """

    def __init__(self, document_type: str, document_path: str):
        self.document_type = document_type  # email, legal_brief, settlement_proposal
        self.document_path = document_path
        self.timestamp = datetime.utcnow()

        # Validation results
        self.circle_perspectives: Dict[Circle, CirclePerspective] = {}
        self.role_perspectives: Dict[LegalRole, RolePerspective] = {}
        self.counsel_perspectives: Dict[GovernmentCounsel, CounselPerspective] = {}

        # Overall scores
        self.wholeness_score: float = 0.0
        self.consensus_rating: float = 0.0
        self.recommendation: str = "PENDING"

    # ═══════════════════════════════════════════════════════════
    # CIRCLE-BASED VALIDATION (Holacracy Integration)
    # ═══════════════════════════════════════════════════════════

    def validate_analyst_circle(self, content: str) -> CirclePerspective:
        """Analyst: Data quality foundation and risk analytics baseline"""
        perspective = CirclePerspective(
            circle=Circle.ANALYST,
            purpose="Data quality foundation and risk analytics baseline",
            accountability="Ensure metrics exist before WSJF/ROAM decisions"
        )

        # Check 1: Quantitative evidence present
        has_numbers = any(char.isdigit() for char in content)
        perspective.checks.append(ValidationCheck(
            id="ANALYST-001",
            description="Contains quantitative evidence (dates, amounts, counts)",
            category="data_quality",
            severity="critical",
            passed=has_numbers,
            message="Document includes measurable data" if has_numbers else "Missing quantitative metrics"
        ))

        # Check 2: Timeline accuracy
        has_timeline = any(keyword in content.lower() for keyword in ["date:", "timeline", "since", "from"])
        perspective.checks.append(ValidationCheck(
            id="ANALYST-002",
            description="Timeline/dates are present and trackable",
            category="data_quality",
            severity="critical",
            passed=has_timeline,
            message="Timeline present" if has_timeline else "Missing temporal tracking"
        ))

        # Check 3: Evidence references
        has_evidence = any(keyword in content.lower() for keyword in ["exhibit", "attachment", "evidence", "screenshot"])
        perspective.checks.append(ValidationCheck(
            id="ANALYST-003",
            description="References to supporting evidence/documentation",
            category="observability",
            severity="warning",
            passed=has_evidence,
            message="Evidence cited" if has_evidence else "No supporting documentation referenced"
        ))

        perspective.calculate_pass_rate()
        return perspective

    def validate_assessor_circle(self, content: str, blockers: List[str] = None) -> CirclePerspective:
        """Assessor: BLOCKER remediation and dependency validation"""
        perspective = CirclePerspective(
            circle=Circle.ASSESSOR,
            purpose="BLOCKER remediation and dependency validation",
            accountability="Unblock PHASE-B deliverables"
        )

        blockers = blockers or []

        # Check 1: Known blockers addressed
        blockers_addressed = all(blocker.lower() in content.lower() for blocker in blockers)
        perspective.checks.append(ValidationCheck(
            id="ASSESSOR-001",
            description="All known blockers are addressed",
            category="blocker_resolution",
            severity="critical",
            passed=blockers_addressed or not blockers,
            message=f"All {len(blockers)} blockers addressed" if blockers_addressed else f"{len(blockers)} blockers not mentioned"
        ))

        # Check 2: Dependencies identified
        has_dependencies = any(keyword in content.lower() for keyword in ["depend", "require", "need", "contingent"])
        perspective.checks.append(ValidationCheck(
            id="ASSESSOR-002",
            description="Dependencies are clearly identified",
            category="dependency_validation",
            severity="warning",
            passed=has_dependencies,
            message="Dependencies mapped" if has_dependencies else "Dependencies not explicit"
        ))

        # Check 3: Remediation path clear
        has_next_steps = any(keyword in content.lower() for keyword in ["next steps", "action items", "will", "shall"])
        perspective.checks.append(ValidationCheck(
            id="ASSESSOR-003",
            description="Clear remediation/next steps provided",
            category="blocker_resolution",
            severity="critical",
            passed=has_next_steps,
            message="Remediation path clear" if has_next_steps else "No clear next steps"
        ))

        perspective.calculate_pass_rate()
        return perspective

    def validate_orchestrator_circle(self, content: str) -> CirclePerspective:
        """Orchestrator: Pattern metrics instrumentation and BML cycle health"""
        perspective = CirclePerspective(
            circle=Circle.ORCHESTRATOR,
            purpose="Pattern metrics instrumentation and BML cycle health",
            accountability="Close Build-Measure-Learn feedback loops"
        )

        # Check 1: Strategic alignment
        has_strategy = any(keyword in content.lower() for keyword in ["strategy", "approach", "goal", "objective"])
        perspective.checks.append(ValidationCheck(
            id="ORCHESTRATOR-001",
            description="Strategic alignment is clear",
            category="coordination",
            severity="warning",
            passed=has_strategy,
            message="Strategy articulated" if has_strategy else "Strategic context missing"
        ))

        # Check 2: Multi-circle coordination
        circles_mentioned = sum(1 for circle in Circle if circle.value in content.lower())
        perspective.checks.append(ValidationCheck(
            id="ORCHESTRATOR-002",
            description="Cross-circle coordination considered",
            category="coordination",
            severity="info",
            passed=circles_mentioned > 1,
            message=f"{circles_mentioned} circles referenced" if circles_mentioned > 1 else "Single circle focus"
        ))

        # Check 3: Feedback loop closure
        has_feedback = any(keyword in content.lower() for keyword in ["feedback", "response", "follow-up", "monitor"])
        perspective.checks.append(ValidationCheck(
            id="ORCHESTRATOR-003",
            description="Feedback/measurement mechanism present",
            category="bml_cycles",
            severity="warning",
            passed=has_feedback,
            message="Feedback loop closed" if has_feedback else "No measurement/response mechanism"
        ))

        perspective.calculate_pass_rate()
        return perspective

    # ═══════════════════════════════════════════════════════════
    # LEGAL ROLE SIMULATION
    # ═══════════════════════════════════════════════════════════

    def validate_judge_perspective(self, content: str) -> RolePerspective:
        """Judge: Legal procedure, precedent, fairness"""
        perspective = RolePerspective(
            role=LegalRole.JUDGE,
            focus_area="Legal procedure, precedent, judicial economy"
        )

        # Check 1: Cites legal authority
        has_citations = any(keyword in content for keyword in ["§", "v.", "N.C.", "Gen. Stat."])
        perspective.checks.append(ValidationCheck(
            id="JUDGE-001",
            description="Legal authority/precedent cited",
            category="legal_procedure",
            severity="critical",
            passed=has_citations,
            message="Case law/statutes referenced" if has_citations else "No legal citations"
        ))

        # Check 2: Professional tone
        has_respect = not any(keyword in content.lower() for keyword in ["stupid", "ridiculous", "absurd", "idiotic"])
        perspective.checks.append(ValidationCheck(
            id="JUDGE-002",
            description="Professional and respectful tone",
            category="professionalism",
            severity="critical",
            passed=has_respect,
            message="Tone appropriate for court" if has_respect else "Unprofessional language detected"
        ))

        # Check 3: Judicial economy (not wasting court time)
        word_count = len(content.split())
        is_concise = word_count < 2000  # Reasonable length
        perspective.checks.append(ValidationCheck(
            id="JUDGE-003",
            description="Document length respects judicial economy",
            category="judicial_economy",
            severity="warning",
            passed=is_concise,
            message=f"{word_count} words (reasonable)" if is_concise else f"{word_count} words (too long)"
        ))

        perspective.calculate_verdict()
        return perspective

    def validate_expert_witness_perspective(self, content: str, domain: str = "habitability") -> RolePerspective:
        """Expert Witness: Domain-specific technical accuracy"""
        perspective = RolePerspective(
            role=LegalRole.EXPERT_WITNESS,
            focus_area=f"Technical accuracy in {domain}"
        )

        # Domain-specific keywords
        domain_keywords = {
            "habitability": ["mold", "hvac", "moisture", "leak", "water", "ventilation"],
            "real_estate": ["lease", "rent", "tenant", "landlord", "eviction", "possession"],
            "damages": ["compensation", "cost", "expense", "loss", "harm", "injury"]
        }

        keywords = domain_keywords.get(domain, [])

        # Check 1: Domain terminology used correctly
        keyword_count = sum(1 for keyword in keywords if keyword in content.lower())
        perspective.checks.append(ValidationCheck(
            id="EXPERT-001",
            description=f"Uses {domain} terminology appropriately",
            category="technical_accuracy",
            severity="warning",
            passed=keyword_count >= 3,
            message=f"{keyword_count}/{len(keywords)} domain terms present"
        ))

        # Check 2: Specific facts vs. generalizations
        has_specifics = any(char.isdigit() for char in content)
        perspective.checks.append(ValidationCheck(
            id="EXPERT-002",
            description="Specific facts/measurements provided (not generalizations)",
            category="technical_accuracy",
            severity="critical",
            passed=has_specifics,
            message="Specific data present" if has_specifics else "Only generalizations"
        ))

        perspective.calculate_verdict()
        return perspective

    def validate_jury_perspective(self, content: str) -> RolePerspective:
        """Jury: Common sense, reasonableness, fairness"""
        perspective = RolePerspective(
            role=LegalRole.JURY,
            focus_area="Common sense and reasonableness"
        )

        # Check 1: Story is coherent
        has_narrative = any(keyword in content.lower() for keyword in ["since", "after", "then", "subsequently", "resulting"])
        perspective.checks.append(ValidationCheck(
            id="JURY-001",
            description="Narrative is coherent and followable",
            category="clarity",
            severity="critical",
            passed=has_narrative,
            message="Story flows logically" if has_narrative else "Disjointed narrative"
        ))

        # Check 2: Not overly technical
        legal_jargon_count = sum(1 for word in ["tort", "statutory", "precedent", "jurisdiction", "prima facie"]
                                  if word in content.lower())
        not_jargon_heavy = legal_jargon_count < 10
        perspective.checks.append(ValidationCheck(
            id="JURY-002",
            description="Accessible language (not overly technical)",
            category="clarity",
            severity="warning",
            passed=not_jargon_heavy,
            message=f"{legal_jargon_count} technical terms (understandable)" if not_jargon_heavy
                    else f"{legal_jargon_count} technical terms (too complex)"
        ))

        # Check 3: Reasonable expectations
        has_reason = not any(keyword in content.lower() for keyword in ["million", "$1,000,000", "punitive damages exceeding"])
        perspective.checks.append(ValidationCheck(
            id="JURY-003",
            description="Claims are reasonable and proportionate",
            category="reasonableness",
            severity="critical",
            passed=has_reason,
            message="Claims appear reasonable" if has_reason else "Unrealistic claims detected"
        ))

        perspective.calculate_verdict()
        return perspective

    # ═══════════════════════════════════════════════════════════
    # GOVERNMENT COUNSEL REVIEW
    # ═══════════════════════════════════════════════════════════

    def validate_county_attorney(self, content: str, jurisdiction: str = "Mecklenburg County") -> CounselPerspective:
        """County Attorney: Local landlord-tenant law compliance"""
        perspective = CounselPerspective(
            counsel=GovernmentCounsel.COUNTY_ATTORNEY,
            jurisdiction=jurisdiction,
            focus_area="Local landlord-tenant law"
        )

        # Check 1: Local statutes cited
        has_local_law = "N.C." in content or "Gen. Stat." in content
        perspective.checks.append(ValidationCheck(
            id="COUNTY-001",
            description=f"{jurisdiction} or NC statutes referenced",
            category="legal_compliance",
            severity="critical",
            passed=has_local_law,
            message="Local law cited" if has_local_law else "No local statute references"
        ))

        # Check 2: Court procedures followed
        has_procedure = any(keyword in content.lower() for keyword in ["hearing", "deadline", "filing", "motion"])
        perspective.checks.append(ValidationCheck(
            id="COUNTY-002",
            description="Court procedures properly followed",
            category="procedural_compliance",
            severity="critical",
            passed=has_procedure,
            message="Procedures referenced" if has_procedure else "No procedural context"
        ))

        # Check 3: Settlement norms aligned
        has_settlement = "settlement" in content.lower() or "negotiate" in content.lower()
        perspective.checks.append(ValidationCheck(
            id="COUNTY-003",
            description="Aligned with local settlement norms",
            category="settlement_practice",
            severity="warning",
            passed=has_settlement,
            message="Settlement-focused" if has_settlement else "Litigation-focused only"
        ))

        perspective.calculate_rating()
        return perspective

    def validate_state_ag_consumer(self, content: str) -> CounselPerspective:
        """State AG Consumer Protection: UDTP compliance"""
        perspective = CounselPerspective(
            counsel=GovernmentCounsel.STATE_AG_CONSUMER,
            jurisdiction="North Carolina",
            focus_area="Consumer protection (UDTP)"
        )

        # Check 1: UDTP elements present
        has_udtp = "75-1.1" in content or "unfair" in content.lower() or "deceptive" in content.lower()
        perspective.checks.append(ValidationCheck(
            id="AG-001",
            description="UDTP statute or elements referenced",
            category="consumer_protection",
            severity="warning",
            passed=has_udtp,
            message="UDTP cited" if has_udtp else "No consumer protection angle"
        ))

        # Check 2: Pattern vs. single incident
        has_pattern = "pattern" in content.lower() or "repeatedly" in content.lower() or "multiple" in content.lower()
        perspective.checks.append(ValidationCheck(
            id="AG-002",
            description="Pattern of conduct (vs. single incident)",
            category="consumer_protection",
            severity="critical",
            passed=has_pattern,
            message="Pattern established" if has_pattern else "Single incident only"
        ))

        perspective.calculate_rating()
        return perspective

    def validate_hud_regional(self, content: str) -> CounselPerspective:
        """HUD Regional Counsel: Federal housing standards"""
        perspective = CounselPerspective(
            counsel=GovernmentCounsel.HUD_REGIONAL,
            jurisdiction="Southeast Region",
            focus_area="Federal housing standards"
        )

        # Check 1: Habitability standards
        habitability_terms = sum(1 for term in ["habitability", "mold", "moisture", "ventilation", "health hazard"]
                                  if term in content.lower())
        perspective.checks.append(ValidationCheck(
            id="HUD-001",
            description="Habitability/health hazard standards referenced",
            category="housing_standards",
            severity="critical",
            passed=habitability_terms >= 2,
            message=f"{habitability_terms} habitability terms present"
        ))

        # Check 2: Landlord notice provided
        has_notice = any(keyword in content.lower() for keyword in ["notice", "notified", "request", "complaint"])
        perspective.checks.append(ValidationCheck(
            id="HUD-002",
            description="Tenant provided landlord with notice",
            category="notice_requirement",
            severity="critical",
            passed=has_notice,
            message="Notice documented" if has_notice else "No evidence of notice"
        ))

        perspective.calculate_rating()
        return perspective

    def validate_legal_aid(self, content: str) -> CounselPerspective:
        """Legal Aid: Pro se tenant outcomes"""
        perspective = CounselPerspective(
            counsel=GovernmentCounsel.LEGAL_AID,
            jurisdiction="North Carolina",
            focus_area="Pro se tenant success factors"
        )

        # Check 1: Realistic expectations
        has_realism = not any(keyword in content.lower() for keyword in ["$100,000", "$50,000", "million"])
        perspective.checks.append(ValidationCheck(
            id="LEGAL_AID-001",
            description="Damages expectations are realistic for pro se",
            category="pro_se_viability",
            severity="critical",
            passed=has_realism,
            message="Realistic claims" if has_realism else "Unrealistic damages for pro se"
        ))

        # Check 2: Evidence is accessible
        has_evidence = any(keyword in content.lower() for keyword in ["photo", "screenshot", "document", "record"])
        perspective.checks.append(ValidationCheck(
            id="LEGAL_AID-002",
            description="Evidence is documented and producible",
            category="pro_se_viability",
            severity="critical",
            passed=has_evidence,
            message="Evidence ready" if has_evidence else "Evidence not documented"
        ))

        # Check 3: Seeks guidance vs. going alone
        seeks_help = any(keyword in content.lower() for keyword in ["attorney", "consult", "advice", "guidance"])
        perspective.checks.append(ValidationCheck(
            id="LEGAL_AID-003",
            description="Seeks attorney guidance (not DIY)",
            category="pro_se_viability",
            severity="warning",
            passed=seeks_help,
            message="Seeks professional help" if seeks_help else "Going alone"
        ))

        perspective.calculate_rating()
        return perspective

    # ═══════════════════════════════════════════════════════════
    # UNIFIED WHOLENESS VALIDATION
    # ═══════════════════════════════════════════════════════════

    def run_full_validation(self, content: str,
                           circles: List[Circle] = None,
                           roles: List[LegalRole] = None,
                           counsels: List[GovernmentCounsel] = None,
                           blockers: List[str] = None) -> Dict:
        """
        Run complete wholeness validation across all perspectives

        Args:
            content: Document content to validate
            circles: Which circles to validate (default: all)
            roles: Which legal roles to simulate (default: all)
            counsels: Which government counsels to consult (default: all)
            blockers: Known blockers to check for (assessor circle)

        Returns:
            Complete validation report
        """
        circles = circles or list(Circle)
        roles = roles or list(LegalRole)
        counsels = counsels or list(GovernmentCounsel)

        # Run circle validations
        if Circle.ANALYST in circles:
            self.circle_perspectives[Circle.ANALYST] = self.validate_analyst_circle(content)
        if Circle.ASSESSOR in circles:
            self.circle_perspectives[Circle.ASSESSOR] = self.validate_assessor_circle(content, blockers)
        if Circle.ORCHESTRATOR in circles:
            self.circle_perspectives[Circle.ORCHESTRATOR] = self.validate_orchestrator_circle(content)

        # Run legal role validations
        if LegalRole.JUDGE in roles:
            self.role_perspectives[LegalRole.JUDGE] = self.validate_judge_perspective(content)
        if LegalRole.EXPERT_WITNESS in roles:
            self.role_perspectives[LegalRole.EXPERT_WITNESS] = self.validate_expert_witness_perspective(content)
        if LegalRole.JURY in roles:
            self.role_perspectives[LegalRole.JURY] = self.validate_jury_perspective(content)

        # Run government counsel validations
        if GovernmentCounsel.COUNTY_ATTORNEY in counsels:
            self.counsel_perspectives[GovernmentCounsel.COUNTY_ATTORNEY] = self.validate_county_attorney(content)
        if GovernmentCounsel.STATE_AG_CONSUMER in counsels:
            self.counsel_perspectives[GovernmentCounsel.STATE_AG_CONSUMER] = self.validate_state_ag_consumer(content)
        if GovernmentCounsel.HUD_REGIONAL in counsels:
            self.counsel_perspectives[GovernmentCounsel.HUD_REGIONAL] = self.validate_hud_regional(content)
        if GovernmentCounsel.LEGAL_AID in counsels:
            self.counsel_perspectives[GovernmentCounsel.LEGAL_AID] = self.validate_legal_aid(content)

        # Calculate overall scores
        self._calculate_overall_scores()

        return self.generate_report()

    def _calculate_overall_scores(self):
        """Calculate overall wholeness score and consensus rating"""
        all_checks = []

        # Collect all checks
        for perspective in self.circle_perspectives.values():
            all_checks.extend(perspective.checks)
        for perspective in self.role_perspectives.values():
            all_checks.extend(perspective.checks)
        for perspective in self.counsel_perspectives.values():
            all_checks.extend(perspective.checks)

        if not all_checks:
            self.wholeness_score = 0.0
            self.consensus_rating = 0.0
            self.recommendation = "NO_CHECKS_RUN"
            return

        # Wholeness score: % of checks passed
        passed = sum(1 for c in all_checks if c.passed)
        self.wholeness_score = (passed / len(all_checks)) * 100

        # Consensus rating: average of counsel ratings
        if self.counsel_perspectives:
            ratings = [p.rating for p in self.counsel_perspectives.values()]
            self.consensus_rating = sum(ratings) / len(ratings)
        else:
            self.consensus_rating = 0.0

        # Overall recommendation
        critical_failures = sum(1 for c in all_checks if not c.passed and c.severity == "critical")

        if critical_failures > 3:
            self.recommendation = "REJECT - Multiple critical failures"
        elif self.wholeness_score >= 90 and self.consensus_rating >= 4.0:
            self.recommendation = "APPROVE - Ready to send"
        elif self.wholeness_score >= 80:
            self.recommendation = "NEEDS_REVISION - Address warnings"
        else:
            self.recommendation = "NEEDS_MAJOR_REVISION - Significant issues"

    def generate_report(self) -> Dict:
        """Generate comprehensive validation report"""
        return {
            "metadata": {
                "document_type": self.document_type,
                "document_path": self.document_path,
                "timestamp": self.timestamp.isoformat(),
            },
            "overall": {
                "wholeness_score": round(self.wholeness_score, 1),
                "consensus_rating": round(self.consensus_rating, 1),
                "recommendation": self.recommendation,
            },
            "circle_perspectives": {
                circle.value: {
                    "purpose": p.purpose,
                    "accountability": p.accountability,
                    "pass_rate": round(p.pass_rate, 1),
                    "checks_passed": sum(1 for c in p.checks if c.passed),
                    "checks_total": len(p.checks),
                    "recommendation": p.recommendation,
                    "checks": [
                        {
                            "id": c.id,
                            "description": c.description,
                            "passed": c.passed,
                            "severity": c.severity,
                            "message": c.message
                        } for c in p.checks
                    ]
                } for circle, p in self.circle_perspectives.items()
            },
            "role_perspectives": {
                role.value: {
                    "focus_area": p.focus_area,
                    "verdict": p.verdict,
                    "reasoning": p.reasoning,
                    "checks_passed": sum(1 for c in p.checks if c.passed),
                    "checks_total": len(p.checks),
                    "checks": [
                        {
                            "id": c.id,
                            "description": c.description,
                            "passed": c.passed,
                            "severity": c.severity,
                            "message": c.message
                        } for c in p.checks
                    ]
                } for role, p in self.role_perspectives.items()
            },
            "counsel_perspectives": {
                counsel.value: {
                    "jurisdiction": p.jurisdiction,
                    "focus_area": p.focus_area,
                    "assessment": p.assessment,
                    "rating": round(p.rating, 1),
                    "checks_passed": sum(1 for c in p.checks if c.passed),
                    "checks_total": len(p.checks),
                    "checks": [
                        {
                            "id": c.id,
                            "description": c.description,
                            "passed": c.passed,
                            "severity": c.severity,
                            "message": c.message
                        } for c in p.checks
                    ]
                } for counsel, p in self.counsel_perspectives.items()
            },
        }

    def print_report(self):
        """Print human-readable report to console"""
        print("=" * 80)
        print("WHOLENESS VALIDATION REPORT")
        print("=" * 80)
        print(f"Document: {self.document_type}")
        print(f"Timestamp: {self.timestamp.isoformat()}")
        print()

        print("OVERALL ASSESSMENT")
        print("-" * 80)
        print(f"Wholeness Score: {self.wholeness_score:.1f}%")
        print(f"Consensus Rating: {self.consensus_rating:.1f}/5.0")
        print(f"Recommendation: {self.recommendation}")
        print()

        if self.circle_perspectives:
            print("CIRCLE PERSPECTIVES")
            print("-" * 80)
            for circle, perspective in self.circle_perspectives.items():
                print(f"\n{circle.value.upper()}: {perspective.pass_rate:.1f}% pass rate")
                print(f"  Purpose: {perspective.purpose}")
                for check in perspective.checks:
                    status = "✅" if check.passed else "❌"
                    print(f"  {status} [{check.severity.upper()}] {check.description}")
                    if check.message:
                        print(f"     → {check.message}")

        if self.role_perspectives:
            print("\n" + "=" * 80)
            print("LEGAL ROLE PERSPECTIVES")
            print("-" * 80)
            for role, perspective in self.role_perspectives.items():
                print(f"\n{role.value.upper()}: {perspective.verdict}")
                print(f"  Focus: {perspective.focus_area}")
                print(f"  Reasoning: {perspective.reasoning}")
                for check in perspective.checks:
                    status = "✅" if check.passed else "❌"
                    print(f"  {status} [{check.severity.upper()}] {check.description}")

        if self.counsel_perspectives:
            print("\n" + "=" * 80)
            print("GOVERNMENT COUNSEL PERSPECTIVES")
            print("-" * 80)
            for counsel, perspective in self.counsel_perspectives.items():
                print(f"\n{counsel.value.upper()}: {perspective.assessment} ({perspective.rating:.1f}/5.0)")
                print(f"  Jurisdiction: {perspective.jurisdiction}")
                print(f"  Focus: {perspective.focus_area}")
                for check in perspective.checks:
                    status = "✅" if check.passed else "❌"
                    print(f"  {status} [{check.severity.upper()}] {check.description}")

        print("\n" + "=" * 80)


# ═════════════════════════════════════════════════════════════════
# EXAMPLE USAGE
# ═════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Example: Validate a settlement email
    sample_email = """
Dear Attorney Grimes,

I am writing regarding case 26CV005596-590 (Bhopti v. MAA). Pursuant to N.C. Gen. Stat. § 42-42,
I documented 40+ maintenance requests over 20 months for HVAC, moisture, and water intrusion issues
starting May 24, 2024.

Settlement Proposal: $15,000 + 60 days to relocate

This reflects:
- Habitability violations per Von Pettis Realty v. McKoy (30% rent reduction × $40K total rent)
- Avoidance of litigation costs for both parties
- Good faith resolution before March 3 hearing

I have photographs, portal screenshots, and timeline documentation available.

Please respond by Feb 12, 2026 @ 5:00 PM.

Respectfully,
Shahrooz Bhopti
Pro Se / BSBA Finance/MIS
    """

    validator = WholenessValidator(
        document_type="settlement_email",
        document_path="SETTLEMENT-PROPOSAL.eml"
    )

    # Run validation across all perspectives
    report = validator.run_full_validation(
        content=sample_email,
        circles=[Circle.ANALYST, Circle.ASSESSOR, Circle.ORCHESTRATOR],
        roles=[LegalRole.JUDGE, LegalRole.JURY],
        counsels=[GovernmentCounsel.COUNTY_ATTORNEY, GovernmentCounsel.LEGAL_AID],
        blockers=["lease verification"]
    )

    # Print report
    validator.print_report()

    # Export to JSON
    with open("wholeness_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print(f"\nReport exported to wholeness_report.json")
