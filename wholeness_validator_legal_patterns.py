#!/usr/bin/env python3
"""
Legal Pattern Validators - Enhanced
Specialized validators for:
- Systemic Indifference Analysis
- ROAM Risk Assessment
- SoR (System of Record / Statement of Reasons) Quality Analysis
- Cross-Organizational Pattern Detection
- Signature Block Validation (Settlement vs. Court)
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
from enum import Enum

from wholeness_validator_extended import ExtendedValidator, ValidationCheck, CirclePerspective
from wholeness_validation_framework import Circle, LegalRole, GovernmentCounsel


# ═════════════════════════════════════════════════════════════════
# ENHANCED VALIDATORS FOR LEGAL PATTERNS
# ═════════════════════════════════════════════════════════════════

class SystemicPattern(Enum):
    """Systemic indifference pattern types"""
    TEMPORAL = "temporal"            # 22+ months duration
    HIERARCHICAL = "hierarchical"    # Multiple organizational levels
    RECURRING = "recurring"          # Same issues repeatedly
    DELIBERATE = "deliberate"        # Work order cancellations (policy)


class ROAMCategory(Enum):
    """ROAM risk categories"""
    RESOLVED = "resolved"
    OWNED = "owned"
    ACCEPTED = "accepted"
    MITIGATED = "mitigated"


class SoRType(Enum):
    """System of Record / Statement of Reasons types"""
    TIMELINE_ANALYSIS = "timeline_analysis"
    ORGANIZATIONAL_PATTERN = "organizational_pattern"
    CROSS_ORG_COMPARISON = "cross_org_comparison"
    EVIDENCE_CHAIN = "evidence_chain"


class LegalPatternValidator(ExtendedValidator):
    """Extended validator with legal-specific pattern detection"""

    def __init__(self, document_type: str, document_path: str):
        """Initialize with error handling"""
        super().__init__(document_type, document_path)
        self.validation_errors = []

    def _safe_validate(self, validator_func, *args, **kwargs):
        """Wrapper for safe validation with error handling"""
        try:
            return validator_func(*args, **kwargs)
        except Exception as e:
            error_msg = f"Validation error in {validator_func.__name__}: {str(e)}"
            self.validation_errors.append(error_msg)
            return None

    # ═════════════════════════════════════════════════════════════
    # SYSTEMIC INDIFFERENCE ANALYSIS
    # ═════════════════════════════════════════════════════════════

    def validate_systemic_indifference(self, content: str, cross_org_context: bool = False) -> Dict[str, ValidationCheck]:
        """
        Validates systemic indifference pattern (4 factors + cross-org awareness)

        Scoring System (40 points max - MAA case specific):
        - Temporal: 0-10 points (22+ months = 10, 18+ months = 8, <6 months = 0)
        - Hierarchical: 0-10 points (4+ levels = 10, 3 levels = 7, 1 level = 0)
        - Recurring: 0-10 points (4+ issue types = 10, 2-3 types = 7, once = 0)
        - Deliberate: 0-10 points (40+ cancellations = 10, 20+ = 7, none = 0)

        Perfect Score: 40/40 = Systemic indifference PROVEN (litigation-ready)
        Strong Score: 28-39 = Pattern established (settlement leverage)

        Cross-Organizational Patterns (optional enhancement):
        - MAA: Active landlord-tenant case (26CV005596-590)
        - Apex/BofA, US Bank, T-Mobile, Credit Bureaus, IRS: Separate disputes
        - Shows institutional pattern recognition capability (litigation context)
        - WARNING: May confuse settlement focus - use judiciously
        """
        if not content or not isinstance(content, str):
            return {"error": ValidationCheck(
                id="SYSTEMIC-ERROR",
                description="Invalid content for systemic indifference analysis",
                category="systemic_indifference",
                severity="critical",
                passed=False,
                message="Content is empty or invalid"
            )}

        checks = {}
        content_lower = content.lower()

        # Factor 1: Temporal Duration (Enhanced with regex support)
        import re
        temporal_score = 0
        temporal_evidence = []

        # Extract explicit duration mentions
        duration_pattern = re.compile(r'(\d+)\s*(month|year)s?', re.IGNORECASE)
        durations = duration_pattern.findall(content)

        if durations:
            months_total = 0
            for num, unit in durations:
                num_val = int(num)
                if 'year' in unit.lower():
                    months_total += num_val * 12
                else:
                    months_total += num_val

            temporal_evidence.append(f"{months_total} months documented")

            # Scoring based on duration
            if months_total >= 22:
                temporal_score = 10
            elif months_total >= 18:
                temporal_score = 8
            elif months_total >= 12:
                temporal_score = 6
            elif months_total >= 6:
                temporal_score = 3

        # Check for qualitative temporal indicators
        temporal_indicators = [
            "22 month", "prolonged", "extended period", "ongoing",
            "persistent", "continuous", "systematic", "chronological"
        ]
        qualitative_matches = [ind for ind in temporal_indicators if ind in content_lower]
        if qualitative_matches:
            temporal_evidence.extend(qualitative_matches)
            temporal_score = max(temporal_score, len(qualitative_matches) * 2)
            temporal_score = min(10, temporal_score)

        checks["systemic_temporal"] = ValidationCheck(
            id="SYSTEMIC-TEMPORAL",
            description=f"Temporal Pattern: Duration indicates systemic issue",
            category="systemic_indifference",
            severity="critical",
            passed=temporal_score >= 7,
            message=f"Temporal score: {temporal_score}/10 - {'STRONG' if temporal_score >= 9 else 'MODERATE' if temporal_score >= 7 else 'WEAK'} temporal pattern",
            evidence={
                "score": temporal_score,
                "evidence": temporal_evidence,
                "threshold": "22+ months = litigation-ready, 18+ months = strong"
            },
            remediation="Add explicit duration ('22 months') and timeline analysis for stronger pattern" if temporal_score < 7 else None
        )

        # Factor 2: Hierarchical (Multiple Organizational Levels)
        hierarchical_score = 0
        hierarchical_evidence = []

        # MAA-specific organizational hierarchy
        org_levels = {
            "maintenance": "Level 1 - Front-line maintenance staff",
            "property manager": "Level 2 - On-site property management",
            "regional": "Level 3 - Regional/district management",
            "corporate": "Level 4 - Corporate headquarters"
        }

        levels_found = []
        for level, description in org_levels.items():
            if level in content_lower:
                levels_found.append(level)
                hierarchical_evidence.append(description)

        # Scoring: 10 pts for 4+ levels, 7 pts for 3, 5 pts for 2, 2 pts for 1
        num_levels = len(levels_found)
        if num_levels >= 4:
            hierarchical_score = 10
        elif num_levels == 3:
            hierarchical_score = 7
        elif num_levels == 2:
            hierarchical_score = 5
        elif num_levels == 1:
            hierarchical_score = 2

        # Bonus: Check for explicit organizational structure mentions
        if "organizational" in content_lower or "hierarchy" in content_lower:
            hierarchical_score = min(10, hierarchical_score + 2)
            hierarchical_evidence.append("Explicit organizational structure mentioned")

        checks["systemic_hierarchical"] = ValidationCheck(
            id="SYSTEMIC-HIERARCHICAL",
            description="Hierarchical Pattern: Multiple org levels involved",
            category="systemic_indifference",
            severity="critical",
            passed=hierarchical_score >= 7,
            message=f"Hierarchical score: {hierarchical_score}/10 - {num_levels} organizational level(s) documented",
            evidence={
                "score": hierarchical_score,
                "levels_found": levels_found,
                "evidence": hierarchical_evidence,
                "threshold": "4+ levels = systemic, 3 levels = strong, 2 levels = moderate"
            },
            remediation="Document all organizational levels (maintenance → property manager → regional → corporate)" if hierarchical_score < 7 else None
        )

        # Factor 3: Recurring Issues (MAA-specific issue types)
        recurring_score = 0
        recurring_evidence = []

        # MAA case-specific recurring issue types
        issue_types = {
            "mold": "Mold/moisture issues",
            "hvac": "HVAC system failures",
            "water": "Water intrusion/plumbing",
            "pest": "Pest control issues",
            "structural": "Structural damage"
        }

        issues_found = []
        for issue_key, issue_desc in issue_types.items():
            if issue_key in content_lower:
                issues_found.append(issue_key)
                recurring_evidence.append(issue_desc)

        # Scoring: 10 pts for 4+ types, 7 pts for 2-3, 3 pts for 1
        num_issues = len(issues_found)
        if num_issues >= 4:
            recurring_score = 10
        elif num_issues >= 2:
            recurring_score = 7
        elif num_issues == 1:
            recurring_score = 3

        # Bonus: Check for explicit pattern language
        pattern_words = ["recurring", "repeated", "same issue", "multiple times", "pattern"]
        pattern_matches = [word for word in pattern_words if word in content_lower]
        if pattern_matches:
            recurring_score = min(10, recurring_score + len(pattern_matches))
            recurring_evidence.append(f"Explicit pattern language: {', '.join(pattern_matches)}")

        checks["systemic_recurring"] = ValidationCheck(
            id="SYSTEMIC-RECURRING",
            description="Recurring Pattern: Same issues repeatedly",
            category="systemic_indifference",
            severity="critical",
            passed=recurring_score >= 7,
            message=f"Recurring score: {recurring_score}/10 - {num_issues} distinct issue type(s) identified",
            evidence={
                "score": recurring_score,
                "issues_found": issues_found,
                "evidence": recurring_evidence,
                "threshold": "4+ types = systemic, 2-3 types = strong pattern"
            },
            remediation="Document multiple issue types (mold, HVAC, water intrusion) to strengthen pattern" if recurring_score < 7 else None
        )

        # Factor 4: Deliberate Policy (Work Order Cancellations - MAA specific)
        deliberate_score = 0
        deliberate_evidence = []

        # Extract work order cancellation numbers (MAA: 40+ cancellations)
        cancellation_pattern = re.compile(r'(\d+)\+?\s*(cancellation|work order|request)', re.IGNORECASE)
        cancellations = cancellation_pattern.findall(content)

        if cancellations:
            for num, context in cancellations:
                num_val = int(num)
                deliberate_evidence.append(f"{num_val}+ {context}s documented")

                # Scoring based on cancellation count
                if num_val >= 40:
                    deliberate_score = 10
                elif num_val >= 20:
                    deliberate_score = 7
                elif num_val >= 10:
                    deliberate_score = 5
                elif num_val >= 5:
                    deliberate_score = 3

        # Check for policy/deliberate intent keywords
        deliberate_keywords = {
            "cancelled": "Work orders cancelled",
            "canceled": "Work orders canceled",
            "without resolution": "Issues left unresolved",
            "deliberate": "Deliberate inaction",
            "policy": "Organizational policy",
            "cost-saving": "Cost-saving tactic",
            "ignored": "Requests ignored"
        }

        for keyword, description in deliberate_keywords.items():
            if keyword in content_lower:
                deliberate_evidence.append(description)
                deliberate_score = min(10, deliberate_score + 1)

        # Special case: MAA's 40+ cancellations should score 10/10
        if "40" in content and ("cancellation" in content_lower or "work order" in content_lower):
            deliberate_score = 10
            deliberate_evidence.append("MAA: 40+ work order cancellations (proves deliberate policy)")

        checks["systemic_deliberate"] = ValidationCheck(
            id="SYSTEMIC-DELIBERATE",
            description="Deliberate Pattern: Work order cancellations = policy",
            category="systemic_indifference",
            severity="critical",
            passed=deliberate_score >= 7,
            message=f"Deliberate score: {deliberate_score}/10 - {'PROVEN' if deliberate_score >= 9 else 'STRONG' if deliberate_score >= 7 else 'WEAK'} policy pattern",
            evidence={
                "score": deliberate_score,
                "evidence": deliberate_evidence,
                "threshold": "40+ cancellations = deliberate policy, 20+ = strong pattern"
            },
            remediation="Document specific cancellation count (e.g., '40+ work orders cancelled') to prove deliberate policy" if deliberate_score < 7 else None
        )

        # Overall Systemic Score (Enhanced with interpretation)
        total_score = temporal_score + hierarchical_score + recurring_score + deliberate_score

        # Interpretation based on NC case law thresholds
        if total_score >= 35:
            status = "PROVEN - Litigation-ready"
            interpretation = "Systemic indifference clearly proven. Strong foundation for punitive damages under NC Gen. Stat. § 1D-15."
        elif total_score >= 28:
            status = "STRONG - Settlement leverage"
            interpretation = "Pattern well-established. Credible systemic claim provides strong settlement negotiating position."
        elif total_score >= 20:
            status = "MODERATE - Needs more evidence"
            interpretation = "Pattern suggested but not proven. Gather additional documentation to strengthen systemic claim."
        else:
            status = "WEAK - Insufficient evidence"
            interpretation = "Insufficient evidence of systemic pattern. Focus on documenting timeline, organizational levels, and recurring issues."

        checks["systemic_overall"] = ValidationCheck(
            id="SYSTEMIC-OVERALL",
            description=f"Overall Systemic Indifference Score: {total_score}/40",
            category="systemic_indifference",
            severity="critical",
            passed=total_score >= 28,  # 70% threshold for settlement leverage
            message=f"{status} ({total_score}/40 points)",
            evidence={
                "temporal": temporal_score,
                "hierarchical": hierarchical_score,
                "recurring": recurring_score,
                "deliberate": deliberate_score,
                "total": total_score,
                "interpretation": interpretation,
                "breakdown": f"Temporal: {temporal_score}/10, Hierarchical: {hierarchical_score}/10, Recurring: {recurring_score}/10, Deliberate: {deliberate_score}/10"
            },
            remediation=interpretation if total_score < 28 else None
        )

        # Cross-Organizational Pattern Analysis (Optional Enhancement)
        if cross_org_context:
            cross_org_entities = {
                "maa": "MAA Uptown Charlotte (Landlord-Tenant - Case 26CV005596-590)",
                "apex": "Apex/Bank of America (Separate dispute)",
                "bank of america": "Apex/Bank of America (Separate dispute)",
                "us bank": "US Bank (Separate dispute)",
                "t-mobile": "T-Mobile (Separate dispute)",
                "credit bureau": "Credit Bureaus (Credit reporting issues)",
                "irs": "IRS (Appointment cancellation pattern)"
            }

            orgs_detected = []
            for org_key, org_desc in cross_org_entities.items():
                if org_key in content_lower:
                    orgs_detected.append(org_desc)

            cross_org_score = len(orgs_detected)

            # Guidance based on document context
            if cross_org_score > 1:
                if "settlement" in content_lower:
                    warning = "WARNING: Multiple organizations detected. For settlement emails, focus ONLY on MAA to avoid confusion."
                else:
                    info = "Multiple organizations show pattern recognition capability - appropriate for litigation materials."
                guidance = warning if "settlement" in content_lower else info
            else:
                guidance = "Single organization focus - appropriate for settlement context."

            checks["systemic_cross_org"] = ValidationCheck(
                id="SYSTEMIC-CROSS-ORG",
                description="Cross-Organizational Pattern Analysis",
                category="systemic_indifference",
                severity="info",
                passed=True,  # Informational only
                message=f"{cross_org_score} organization(s) mentioned: {guidance}",
                evidence={
                    "organizations": orgs_detected,
                    "count": cross_org_score,
                    "guidance": guidance
                },
                remediation="For settlement: Keep cross-org analysis separate. For litigation: Include to demonstrate analytical competency."
            )

        return checks

    # ═════════════════════════════════════════════════════════════
    # ROAM RISK ASSESSMENT
    # ═════════════════════════════════════════════════════════════

    def validate_roam_risks(self, content: str) -> Dict[str, ValidationCheck]:
        """
        Validates ROAM risk identification and mitigation

        ROAM Categories:
        - Resolved: Past risks that have been addressed
        - Owned: Current risks being actively managed
        - Accepted: Known risks with no mitigation planned
        - Mitigated: Risks with mitigation strategies in place
        """
        checks = {}

        # Check for ROAM keywords
        roam_keywords = {
            "resolved": ["resolved", "addressed", "completed", "fixed"],
            "owned": ["owned", "managing", "handling", "addressing"],
            "accepted": ["accepted", "acknowledged", "aware", "understand"],
            "mitigated": ["mitigated", "mitigation", "reduced", "minimized"]
        }

        for category, keywords in roam_keywords.items():
            found = any(kw in content.lower() for kw in keywords)
            checks[f"roam_{category}"] = ValidationCheck(
                id=f"ROAM-{category.upper()}",
                description=f"ROAM {category.capitalize()} risks identified",
                category="roam_assessment",
                severity="warning",
                passed=found,
                message=f"{category.capitalize()} risks {'present' if found else 'not addressed'}",
                evidence={"keywords": keywords, "found": found}
            )

        # Check for risk categories specific to legal case
        legal_risks = [
            "discovery deadline", "settlement deadline", "strategic delay",
            "credibility", "good faith", "litigation exposure", "punitive damages"
        ]
        risks_mentioned = sum(1 for risk in legal_risks if risk in content.lower())

        checks["roam_coverage"] = ValidationCheck(
            id="ROAM-COVERAGE",
            description="Legal risk landscape covered",
            category="roam_assessment",
            severity="critical",
            passed=risks_mentioned >= 3,
            message=f"{risks_mentioned}/{len(legal_risks)} risk types addressed",
            evidence={"risks": legal_risks, "count": risks_mentioned}
        )

        return checks

    # ═════════════════════════════════════════════════════════════
    # SoR (SYSTEM OF RECORD / STATEMENT OF REASONS)
    # ═════════════════════════════════════════════════════════════

    def validate_sor_quality(self, content: str) -> Dict[str, ValidationCheck]:
        """
        Validates SoR (System of Record / Statement of Reasons) methodology

        SoR Elements:
        1. Timeline Analysis (chronological documentation)
        2. Organizational Pattern (multiple entities/levels)
        3. Cross-Org Comparison (patterns across MAA, Apex, US Bank, etc.)
        4. Evidence Chain (documentation trail)
        """
        checks = {}

        # SoR Element 1: Timeline Analysis
        timeline_elements = [
            "timeline", "chronological", "date", "month", "year",
            "started", "duration", "period", "from", "to"
        ]
        timeline_score = sum(1 for elem in timeline_elements if elem in content.lower())

        checks["sor_timeline"] = ValidationCheck(
            id="SOR-TIMELINE",
            description="SoR: Timeline analysis present",
            category="sor_quality",
            severity="critical",
            passed=timeline_score >= 4,
            message=f"Timeline elements: {timeline_score}/{len(timeline_elements)}",
            evidence={"elements": timeline_elements, "score": timeline_score}
        )

        # SoR Element 2: Organizational Pattern
        org_levels = [
            "maintenance", "property manager", "regional", "corporate",
            "staff", "management", "organization"
        ]
        org_score = sum(1 for level in org_levels if level in content.lower())

        checks["sor_organizational"] = ValidationCheck(
            id="SOR-ORGANIZATIONAL",
            description="SoR: Organizational pattern documented",
            category="sor_quality",
            severity="critical",
            passed=org_score >= 3,
            message=f"Organizational levels: {org_score}/{len(org_levels)}",
            evidence={"levels": org_levels, "score": org_score}
        )

        # SoR Element 3: Cross-Organizational Pattern
        cross_org_entities = [
            "maa", "apex", "bank of america", "us bank", "t-mobile",
            "credit bureau", "irs", "multiple", "across", "pattern"
        ]
        cross_org_score = sum(1 for entity in cross_org_entities if entity in content.lower())

        checks["sor_cross_org"] = ValidationCheck(
            id="SOR-CROSS-ORG",
            description="SoR: Cross-organizational patterns identified",
            category="sor_quality",
            severity="info",  # Optional for settlement, critical for litigation
            passed=cross_org_score >= 2,
            message=f"Cross-org patterns: {cross_org_score}/{len(cross_org_entities)}",
            evidence={"entities": cross_org_entities, "score": cross_org_score},
            remediation="Cross-org patterns strengthen litigation but may confuse settlement (keep separate)"
        )

        # SoR Element 4: Evidence Chain
        evidence_types = [
            "document", "photo", "screenshot", "record", "exhibit",
            "portal", "work order", "medical", "email", "correspondence"
        ]
        evidence_score = sum(1 for etype in evidence_types if etype in content.lower())

        checks["sor_evidence"] = ValidationCheck(
            id="SOR-EVIDENCE",
            description="SoR: Evidence chain established",
            category="sor_quality",
            severity="critical",
            passed=evidence_score >= 4,
            message=f"Evidence types: {evidence_score}/{len(evidence_types)}",
            evidence={"types": evidence_types, "score": evidence_score}
        )

        # Overall SoR Quality Score
        total_sor = timeline_score + org_score + cross_org_score + evidence_score

        checks["sor_overall"] = ValidationCheck(
            id="SOR-OVERALL",
            description=f"Overall SoR Quality Score",
            category="sor_quality",
            severity="critical",
            passed=total_sor >= 10,
            message=f"SoR methodology {'STRONG' if total_sor >= 10 else 'WEAK'} ({total_sor} elements)",
            evidence={
                "timeline": timeline_score,
                "organizational": org_score,
                "cross_org": cross_org_score,
                "evidence": evidence_score,
                "total": total_sor
            }
        )

        return checks

    # ═════════════════════════════════════════════════════════════
    # SIGNATURE BLOCK VALIDATION
    # ═════════════════════════════════════════════════════════════

    def validate_signature_block(self, content: str, document_type: str = "settlement") -> ValidationCheck:
        """
        Validates signature block format

        Settlement Context:
        - Pro Se (Evidence-Based Systemic Analysis)
        - BSBA Finance/MIS (Managing Information Systems)

        Court Context:
        - Pro Se
        - BSBA Finance/MIS (Managing Information Systems)
        """
        # Expected signature patterns
        settlement_pattern = "Pro Se (Evidence-Based Systemic Analysis)"
        court_pattern = "Pro Se"
        credential_pattern = "BSBA Finance/MIS"
        credential_expanded = "Managing Information Systems"

        # Check for required elements
        has_pro_se = "pro se" in content.lower()
        has_credential = "bsba" in content.lower() and "mis" in content.lower()
        has_expansion = "managing information systems" in content.lower()

        # Check for context-specific format
        if document_type == "settlement":
            has_methodology = "evidence-based systemic analysis" in content.lower()
            correct_format = has_pro_se and has_methodology and has_credential
            expected = settlement_pattern
        else:  # court filing
            correct_format = has_pro_se and has_credential and not ("evidence-based" in content.lower())
            expected = court_pattern

        # Check for contact info
        has_phone = "(412)" in content or "412" in content
        has_email = "shahrooz@bhopti.com" in content.lower()
        has_alt_email = "s@rooz.live" in content.lower()
        has_case_number = "26cv005596-590" in content.lower()

        contact_complete = has_phone and has_email and has_case_number

        return ValidationCheck(
            id="SIGNATURE-BLOCK",
            description=f"Signature block format ({document_type} context)",
            category="signature_validation",
            severity="critical",
            passed=correct_format and contact_complete,
            message=f"Format: {'✓' if correct_format else '✗'} | Contact: {'✓' if contact_complete else '✗'}",
            evidence={
                "document_type": document_type,
                "expected_format": expected,
                "has_pro_se": has_pro_se,
                "has_credential": has_credential,
                "has_expansion": has_expansion,
                "has_methodology": has_methodology if document_type == "settlement" else None,
                "contact_complete": contact_complete,
                "has_phone": has_phone,
                "has_email": has_email,
                "has_alt_email": has_alt_email,
                "has_case_number": has_case_number
            },
            remediation=f"Settlement: Use 'Pro Se (Evidence-Based Systemic Analysis)' | Court: Use 'Pro Se' only"
        )

    # ═════════════════════════════════════════════════════════════
    # CROSS-ORGANIZATIONAL PATTERN VALIDATION
    # ═════════════════════════════════════════════════════════════

    def validate_cross_org_patterns(self, content: str) -> ValidationCheck:
        """
        Validates cross-organizational systemic pattern references

        Warning: Cross-org patterns strengthen litigation but may confuse settlement
        - FOR LITIGATION: Show competency in quality analysis methodology
        - FOR SETTLEMENT: May appear off-topic (focus on MAA only)
        """
        # Organizations mentioned
        orgs = {
            "MAA": "maa" in content.lower(),
            "Apex/BofA": any(x in content.lower() for x in ["apex", "bank of america", "bofa"]),
            "US Bank": "us bank" in content.lower(),
            "T-Mobile": "t-mobile" in content.lower(),
            "Credit Bureaus": "credit bureau" in content.lower(),
            "IRS": "irs" in content.lower()
        }

        org_count = sum(1 for v in orgs.values() if v)

        # Pattern indicators
        pattern_keywords = [
            "systemic", "pattern", "organizational", "indifference",
            "across", "multiple", "similar", "recurring"
        ]
        pattern_count = sum(1 for kw in pattern_keywords if kw in content.lower())

        # Context detection
        is_settlement = "settlement" in content.lower()
        is_litigation = "litigation" in content.lower() or "hearing" in content.lower()

        # Recommendation based on context
        if is_settlement and org_count > 2:
            recommendation = "WARNING: Multiple org references may confuse settlement (focus on MAA)"
        elif is_litigation and org_count >= 2:
            recommendation = "GOOD: Cross-org patterns show analytical competency for litigation"
        else:
            recommendation = "OK: Single-org focus appropriate"

        return ValidationCheck(
            id="CROSS-ORG-PATTERNS",
            description="Cross-organizational pattern analysis",
            category="cross_org_validation",
            severity="warning",
            passed=(org_count == 1 and is_settlement) or (org_count >= 2 and is_litigation),
            message=f"{org_count} orgs mentioned | Context: {'settlement' if is_settlement else 'litigation'}",
            evidence={
                "organizations": orgs,
                "org_count": org_count,
                "pattern_keywords": pattern_count,
                "is_settlement": is_settlement,
                "is_litigation": is_litigation
            },
            remediation=recommendation
        )

    # ═════════════════════════════════════════════════════════════
    # RISK CLASSIFICATION & STRATEGY
    # ═════════════════════════════════════════════════════════════

    def validate_risk_classification(self, content: str) -> Dict[str, ValidationCheck]:
        """
        Validates risk classification: Situational vs. Strategic vs. Systemic
        """
        checks = {}
        content_lower = content.lower()

        # Situational Risk (Transient, Operational)
        situational_keywords = ["busy", "schedule", "conflict", "travel", "reviewing", "workload"]
        situational_score = sum(1 for kw in situational_keywords if kw in content_lower)

        checks["risk_situational"] = ValidationCheck(
            id="RISK-SITUATIONAL",
            description="Situational Risk: Operational constraints",
            category="risk_classification",
            severity="info",
            passed=situational_score > 0,
            message=f"Situational factors: {situational_score} mentions",
            evidence={"keywords": situational_keywords, "count": situational_score}
        )

        # Strategic Risk (Tactical, Negotiating)
        strategic_keywords = ["delay", "leverage", "negotiation", "tactic", "pressure", "deadline"]
        strategic_score = sum(1 for kw in strategic_keywords if kw in content_lower)

        checks["risk_strategic"] = ValidationCheck(
            id="RISK-STRATEGIC",
            description="Strategic Risk: Negotiation/Tactical moves",
            category="risk_classification",
            severity="warning",
            passed=strategic_score > 0,
            message=f"Strategic factors: {strategic_score} mentions",
            evidence={"keywords": strategic_keywords, "count": strategic_score}
        )

        # Systemic Risk (Institutional, Policy)
        systemic_keywords = ["policy", "corporate", "pattern", "recurring", "standard procedure", "automated"]
        systemic_score = sum(1 for kw in systemic_keywords if kw in content_lower)

        checks["risk_systemic"] = ValidationCheck(
            id="RISK-SYSTEMIC",
            description="Systemic Risk: Institutional patterns",
            category="risk_classification",
            severity="critical",
            passed=systemic_score > 0,
            message=f"Systemic factors: {systemic_score} mentions",
            evidence={"keywords": systemic_keywords, "count": systemic_score}
        )

        return checks

    def validate_wsjf_prioritization(self, content: str) -> ValidationCheck:
        """
        Validates WSJF (Weighted Shortest Job First) prioritization principles

        Logic:
        - Cost of Delay (CoD): Deadlines, severe consequences (eviction)
        - Job Size: "Quick follow-up", "brief", "immediate"
        """
        content_lower = content.lower()

        # CoD Indicators
        cod_indicators = ["deadline", "expire", "urgent", "immediate", "critical", "eviction", "judgment"]
        cod_score = sum(1 for ind in cod_indicators if ind in content_lower)

        # Job Size Indicators (Small is better for WSJF)
        size_indicators = ["quick", "brief", "simple", "clarify", "confirm", "short"]
        size_score = sum(1 for ind in size_indicators if ind in content_lower)

        # WSJF Proxy Calculation (CoD / Size) - Conceptual
        # If High CoD and Small Size -> High Priority
        is_high_cod = cod_score >= 2
        is_small_size = size_score >= 1

        return ValidationCheck(
            id="WSJF-PRIORITY",
            description="WSJF Prioritization Alignment",
            category="strategic_alignment",
            severity="info",
            passed=is_high_cod and is_small_size,
            message=f"WSJF Alignment: {'HIGH' if is_high_cod and is_small_size else 'MODERATE'}",
            evidence={
                "cod_score": cod_score,
                "size_score": size_score,
                "high_priority": is_high_cod and is_small_size
            },
            remediation="Highlight urgency (CoD) and brevity (Job Size) to increase priority"
        )

    def validate_delay_tactics(self, content: str) -> ValidationCheck:
        """
        Detects potential delay tactics patterns
        """
        content_lower = content.lower()

        delay_indicators = [
            "need more time", "reviewing", "corporate approval", "pending",
            "consulting", "waiting", "extension", "grace period"
        ]
        delay_score = sum(1 for ind in delay_indicators if ind in content_lower)

        # In a follow-up email, detecting delay tactics references is GOOD (shows awareness)
        # In an inbound email, it might be BAD (actual delay)
        # Context assumed: Outbound (Pro Se -> Attorney)

        return ValidationCheck(
            id="DELAY-TACTICS",
            description="Delay Tactics Recognition",
            category="strategic_awareness",
            severity="warning",
            passed=delay_score >= 1,
            message=f"Delay tactics addressed: {delay_score} references",
            evidence={"indicators": delay_indicators, "count": delay_score},
            remediation="Explicitly mention potential delays to show you are monitoring them"
        )

    def validate_punitive_damages_foundation(self, content: str) -> Dict[str, ValidationCheck]:
        """
        Validates foundation for punitive damages claim

        NC Gen. Stat. § 1D-15 Requirements:
        1. Fraud (deliberate misrepresentation)
        2. Malice (deliberate indifference)
        3. Willful/Wanton conduct (conscious disregard)
        """
        checks = {}

        # Element 1: Fraud
        fraud_indicators = [
            "misrepresent", "advertised", "luxury", "condition",
            "disclosure", "false", "fraudulent"
        ]
        fraud_count = sum(1 for ind in fraud_indicators if ind in content.lower())

        checks["punitive_fraud"] = ValidationCheck(
            id="PUNITIVE-FRAUD",
            description="Punitive Damages: Fraud element (misrepresentation)",
            category="punitive_damages",
            severity="warning",
            passed=fraud_count >= 2,
            message=f"Fraud indicators: {fraud_count}/{len(fraud_indicators)}",
            evidence={"indicators": fraud_indicators, "count": fraud_count}
        )

        # Element 2: Malice (Deliberate Indifference)
        malice_indicators = [
            "indifference", "deliberate", "ignored", "refused",
            "health", "safety", "conscious disregard", "malice"
        ]
        malice_count = sum(1 for ind in malice_indicators if ind in content.lower())

        checks["punitive_malice"] = ValidationCheck(
            id="PUNITIVE-MALICE",
            description="Punitive Damages: Malice element (deliberate indifference)",
            category="punitive_damages",
            severity="critical",
            passed=malice_count >= 3,
            message=f"Malice indicators: {malice_count}/{len(malice_indicators)}",
            evidence={"indicators": malice_indicators, "count": malice_count}
        )

        # Element 3: Willful/Wanton Conduct
        willful_indicators = [
            "willful", "wanton", "reckless", "conscious",
            "disregard", "cancelled", "policy", "deliberate"
        ]
        willful_count = sum(1 for ind in willful_indicators if ind in content.lower())

        checks["punitive_willful"] = ValidationCheck(
            id="PUNITIVE-WILLFUL",
            description="Punitive Damages: Willful/wanton element (conscious disregard)",
            category="punitive_damages",
            severity="critical",
            passed=willful_count >= 3,
            message=f"Willful/wanton indicators: {willful_count}/{len(willful_indicators)}",
            evidence={"indicators": willful_indicators, "count": willful_count}
        )

        # NC Statute Citation
        has_statute = "1d-15" in content.lower() or "1d15" in content.lower()

        checks["punitive_statute"] = ValidationCheck(
            id="PUNITIVE-STATUTE",
            description="Punitive Damages: NC Gen. Stat. § 1D-15 cited",
            category="punitive_damages",
            severity="warning",
            passed=has_statute,
            message=f"Statute {'cited' if has_statute else 'not cited'}",
            evidence={"has_citation": has_statute}
        )

        # Overall Foundation
        total_foundation = fraud_count + malice_count + willful_count

        checks["punitive_overall"] = ValidationCheck(
            id="PUNITIVE-OVERALL",
            description="Punitive Damages: Overall foundation strength",
            category="punitive_damages",
            severity="critical",
            passed=total_foundation >= 8 and has_statute,
            message=f"Foundation {'STRONG' if total_foundation >= 8 else 'WEAK'} ({total_foundation} indicators)",
            evidence={
                "fraud": fraud_count,
                "malice": malice_count,
                "willful": willful_count,
                "statute": has_statute,
                "total": total_foundation
            }
        )

        return checks

    # ═════════════════════════════════════════════════════════════
    # UNIFIED LEGAL PATTERN VALIDATION
    # ═════════════════════════════════════════════════════════════

    def run_legal_pattern_validation(self, content: str, document_type: str = "settlement") -> Dict:
        """
        Run all legal pattern validations

        Args:
            content: Document content
            document_type: "settlement" or "court" (affects signature block)

        Returns:
            Complete legal pattern validation report
        """
        # Run base validation first
        base_report = self.run_full_validation(
            content=content,
            circles=list(Circle),
            roles=list(LegalRole),
            counsels=list(GovernmentCounsel)
        )

        # Add legal-specific validations
        legal_checks = {
            "systemic_indifference": self.validate_systemic_indifference(content),
            "roam_risks": self.validate_roam_risks(content),
            "sor_quality": self.validate_sor_quality(content),
            "signature_block": self.validate_signature_block(content, document_type),
            "cross_org_patterns": self.validate_cross_org_patterns(content),
            "risk_classification": self.validate_risk_classification(content),
            "wsjf_prioritization": self.validate_wsjf_prioritization(content),
            "delay_tactics": self.validate_delay_tactics(content),
            "punitive_damages": self.validate_punitive_damages_foundation(content)
        }

        # Add to base report
        base_report["legal_patterns"] = {
            category: {
                check_id: {
                    "id": check.id,
                    "description": check.description,
                    "passed": check.passed,
                    "message": check.message,
                    "severity": check.severity,
                    "evidence": check.evidence,
                    "remediation": check.remediation
                } for check_id, check in (checks.items() if isinstance(checks, dict) else {"single": checks}.items())
            } for category, checks in legal_checks.items()
        }

        return base_report


# ═════════════════════════════════════════════════════════════════
# EXAMPLE USAGE
# ═════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Example: Validate settlement proposal with systemic indifference
    from pathlib import Path

    sample_path = Path("/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/SETTLEMENT-PROPOSAL-SCENARIO-C.eml")

    if sample_path.exists():
        validator = LegalPatternValidator(
            document_type="settlement_email",
            document_path=str(sample_path)
        )

        content = sample_path.read_text(encoding='utf-8')

        # Run legal pattern validation
        report = validator.run_legal_pattern_validation(
            content=content,
            document_type="settlement"
        )

        # Print systemic indifference score
        systemic_checks = report["legal_patterns"]["systemic_indifference"]
        print("\n=== SYSTEMIC INDIFFERENCE ANALYSIS ===")
        for check_id, check in systemic_checks.items():
            status = "✅" if check["passed"] else "❌"
            print(f"{status} {check['description']}: {check['message']}")

        # Print SoR quality
        sor_checks = report["legal_patterns"]["sor_quality"]
        print("\n=== SoR QUALITY ANALYSIS ===")
        for check_id, check in sor_checks.items():
            status = "✅" if check["passed"] else "❌"
            print(f"{status} {check['description']}: {check['message']}")

        # Print overall scores
        print(f"\nWholeness Score: {report['overall']['wholeness_score']}%")
        print(f"Consensus Rating: {report['overall']['consensus_rating']}/5.0")
        print(f"Recommendation: {report['overall']['recommendation']}")
    else:
        print(f"Sample file not found: {sample_path}")
