#!/usr/bin/env python3
"""
Extended Wholeness Validation Framework
Adds: All 6 circles, adversarial roles, software patterns (PRD/ADR/DDD/TDD)

Usage:
    ./wholeness_validator_extended.py --file path/to/document.eml --circles all --roles adversarial
    ./wholeness_validator_extended.py --file LEASE-DISCOVERY-REQUEST.eml --pattern prd,adr
"""

import sys
import argparse
import json
from pathlib import Path
from typing import Dict, List, Optional

# Import base framework
from wholeness_validation_framework import (
    Circle, LegalRole, GovernmentCounsel,
    ValidationCheck, CirclePerspective, RolePerspective, CounselPerspective,
    WholenessValidator
)


# ═════════════════════════════════════════════════════════════════
# EXTENDED CIRCLES: Innovator, Intuitive, Seeker
# ═════════════════════════════════════════════════════════════════

class ExtendedValidator(WholenessValidator):
    """Extends base validator with all circles + adversarial roles + software patterns"""
    
    def validate_innovator_circle(self, content: str) -> CirclePerspective:
        """Innovator: Federation agents and governance automation"""
        perspective = CirclePerspective(
            circle=Circle.INNOVATOR,
            purpose="Federation agents and governance automation",
            accountability="Integrate retro coach + governance agent into production cycle"
        )
        
        # Check 1: Novel approach or automation
        has_innovation = any(keyword in content.lower() for keyword in [
            "automat", "integrat", "systemat", "streamlin", "optim"
        ])
        perspective.checks.append(ValidationCheck(
            id="INNOVATOR-001",
            description="Proposes innovative/automated solution",
            category="innovation",
            severity="info",
            passed=has_innovation,
            message="Innovation proposed" if has_innovation else "Traditional approach"
        ))
        
        # Check 2: Process improvement
        has_process = any(keyword in content.lower() for keyword in [
            "process", "workflow", "efficien", "improve", "enhance"
        ])
        perspective.checks.append(ValidationCheck(
            id="INNOVATOR-002",
            description="Includes process improvement consideration",
            category="governance",
            severity="info",
            passed=has_process,
            message="Process awareness" if has_process else "No process context"
        ))
        
        # Check 3: Scalability consideration
        has_scale = any(keyword in content.lower() for keyword in [
            "scalab", "replic", "template", "pattern", "standard"
        ])
        perspective.checks.append(ValidationCheck(
            id="INNOVATOR-003",
            description="Considers scalability/replicability",
            category="federation",
            severity="info",
            passed=has_scale,
            message="Scalable design" if has_scale else "Point solution"
        ))
        
        perspective.calculate_pass_rate()
        return perspective
    
    def validate_intuitive_circle(self, content: str) -> CirclePerspective:
        """Intuitive: Observability-first pattern implementation"""
        perspective = CirclePerspective(
            circle=Circle.INTUITIVE,
            purpose="Observability-first pattern implementation",
            accountability="No failures without supporting metrics"
        )
        
        # Check 1: Visual clarity
        word_count = len(content.split())
        has_structure = content.count('\n\n') > 3 or content.count('###') > 0
        perspective.checks.append(ValidationCheck(
            id="INTUITIVE-001",
            description="Content is visually structured (headings, paragraphs)",
            category="visualization",
            severity="warning",
            passed=has_structure,
            message="Well-structured" if has_structure else "Dense wall of text"
        ))
        
        # Check 2: Metrics/observability
        has_metrics = any(keyword in content.lower() for keyword in [
            "metric", "measure", "track", "monitor", "observ", "dashboard"
        ])
        perspective.checks.append(ValidationCheck(
            id="INTUITIVE-002",
            description="Includes observability/measurement",
            category="observability",
            severity="critical",
            passed=has_metrics,
            message="Metrics present" if has_metrics else "No observability"
        ))
        
        # Check 3: Sensemaking (patterns explained)
        has_explanation = any(keyword in content.lower() for keyword in [
            "because", "therefore", "reason", "explain", "shows that"
        ])
        perspective.checks.append(ValidationCheck(
            id="INTUITIVE-003",
            description="Explains reasoning/patterns (sensemaking)",
            category="sensemaking",
            severity="warning",
            passed=has_explanation,
            message="Reasoning explained" if has_explanation else "Facts without context"
        ))
        
        perspective.calculate_pass_rate()
        return perspective
    
    def validate_seeker_circle(self, content: str) -> CirclePerspective:
        """Seeker: Dependency automation and codebase health"""
        perspective = CirclePerspective(
            circle=Circle.SEEKER,
            purpose="Dependency automation and codebase health",
            accountability="Keep dependencies current without manual toil"
        )
        
        # Check 1: Dependency identification
        has_dependencies = any(keyword in content.lower() for keyword in [
            "depend", "require", "prerequisit", "contingent", "blocked by"
        ])
        perspective.checks.append(ValidationCheck(
            id="SEEKER-001",
            description="Dependencies/prerequisites clearly identified",
            category="dependencies",
            severity="critical",
            passed=has_dependencies,
            message="Dependencies mapped" if has_dependencies else "Dependencies unclear"
        ))
        
        # Check 2: Technical debt awareness
        has_debt = any(keyword in content.lower() for keyword in [
            "technical debt", "workaround", "temporary", "limitation", "constraint"
        ])
        perspective.checks.append(ValidationCheck(
            id="SEEKER-002",
            description="Technical debt/constraints acknowledged",
            category="codebase_health",
            severity="info",
            passed=has_debt,
            message="Constraints documented" if has_debt else "No debt acknowledgment"
        ))
        
        # Check 3: Maintenance path
        has_maintenance = any(keyword in content.lower() for keyword in [
            "maintain", "update", "refactor", "cleanup", "deprecate"
        ])
        perspective.checks.append(ValidationCheck(
            id="SEEKER-003",
            description="Ongoing maintenance considered",
            category="automation",
            severity="warning",
            passed=has_maintenance,
            message="Maintenance plan" if has_maintenance else "No maintenance strategy"
        ))
        
        perspective.calculate_pass_rate()
        return perspective


# ═════════════════════════════════════════════════════════════════
# ADVERSARIAL ROLES: Prosecutor, Defense, Mediator
# ═════════════════════════════════════════════════════════════════

    def validate_prosecutor_perspective(self, content: str) -> RolePerspective:
        """Prosecutor: Arguments strengthening plaintiff's claims"""
        perspective = RolePerspective(
            role=LegalRole.PROSECUTOR,
            focus_area="Plaintiff's case strength"
        )
        
        # Check 1: Strong opening claim
        first_para = content.split('\n\n')[0] if '\n\n' in content else content[:200]
        has_strong_opening = any(keyword in first_para.lower() for keyword in [
            "violated", "breached", "failed to", "unlawful", "negligent"
        ])
        perspective.checks.append(ValidationCheck(
            id="PROSECUTOR-001",
            description="Opening establishes clear violation/breach",
            category="case_strength",
            severity="critical",
            passed=has_strong_opening,
            message="Strong opening claim" if has_strong_opening else "Weak opening"
        ))
        
        # Check 2: Evidence abundance
        evidence_keywords = ["document", "photo", "screenshot", "record", "exhibit", "witness"]
        evidence_count = sum(1 for kw in evidence_keywords if kw in content.lower())
        perspective.checks.append(ValidationCheck(
            id="PROSECUTOR-002",
            description="Multiple forms of evidence referenced",
            category="evidence",
            severity="critical",
            passed=evidence_count >= 3,
            message=f"{evidence_count} evidence types" if evidence_count >= 3 else "Weak evidence"
        ))
        
        # Check 3: Damages quantified
        has_dollar = '$' in content or 'dollar' in content.lower()
        has_number = any(char.isdigit() for char in content)
        perspective.checks.append(ValidationCheck(
            id="PROSECUTOR-003",
            description="Damages are quantified with numbers",
            category="damages",
            severity="critical",
            passed=has_dollar and has_number,
            message="Damages quantified" if (has_dollar and has_number) else "No damage amount"
        ))
        
        perspective.calculate_verdict()
        return perspective
    
    def validate_defense_perspective(self, content: str) -> RolePerspective:
        """Defense: Arguments weakening plaintiff's claims"""
        perspective = RolePerspective(
            role=LegalRole.DEFENSE,
            focus_area="Defendant's counterarguments"
        )
        
        # Check 1: Defendant attempts documented
        has_good_faith = any(keyword in content.lower() for keyword in [
            "attempted", "effort", "tried", "responded", "addressed", "completed"
        ])
        perspective.checks.append(ValidationCheck(
            id="DEFENSE-001",
            description="Acknowledges defendant's good faith attempts",
            category="good_faith",
            severity="warning",
            passed=has_good_faith,
            message="Good faith documented" if has_good_faith else "No defendant efforts shown"
        ))
        
        # Check 2: Plaintiff delay/contribution
        has_plaintiff_fault = any(keyword in content.lower() for keyword in [
            "failed to report", "delayed", "did not notify", "user error", "misuse"
        ])
        perspective.checks.append(ValidationCheck(
            id="DEFENSE-002",
            description="Plaintiff's contributory actions addressed",
            category="contributory_fault",
            severity="info",
            passed=not has_plaintiff_fault,  # Absence is good for plaintiff
            message="No contributory fault" if not has_plaintiff_fault else "Plaintiff fault mentioned"
        ))
        
        # Check 3: Damages inflated
        large_amounts = any(keyword in content for keyword in [
            "$100,000", "$50,000", "$1,000,000", "million"
        ])
        perspective.checks.append(ValidationCheck(
            id="DEFENSE-003",
            description="Damages appear reasonable (not inflated)",
            category="damages_reasonableness",
            severity="critical",
            passed=not large_amounts,
            message="Reasonable damages" if not large_amounts else "Inflated damages claim"
        ))
        
        perspective.calculate_verdict()
        return perspective
    
    def validate_mediator_perspective(self, content: str) -> RolePerspective:
        """Mediator: Settlement facilitation focus"""
        perspective = RolePerspective(
            role=LegalRole.MEDIATOR,
            focus_area="Settlement viability"
        )
        
        # Check 1: Settlement language present
        has_settlement = any(keyword in content.lower() for keyword in [
            "settlement", "resolve", "negotiate", "agree", "compromise"
        ])
        perspective.checks.append(ValidationCheck(
            id="MEDIATOR-001",
            description="Settlement-focused language present",
            category="settlement_focus",
            severity="critical",
            passed=has_settlement,
            message="Settlement-oriented" if has_settlement else "Litigation-focused only"
        ))
        
        # Check 2: Win-win framing
        has_mutual_benefit = any(keyword in content.lower() for keyword in [
            "both parties", "mutual", "avoid litigation", "early resolution", "save costs"
        ])
        perspective.checks.append(ValidationCheck(
            id="MEDIATOR-002",
            description="Frames settlement as mutually beneficial",
            category="mutual_benefit",
            severity="warning",
            passed=has_mutual_benefit,
            message="Win-win framing" if has_mutual_benefit else "Adversarial framing"
        ))
        
        # Check 3: Reasonable timeline
        has_timeline = any(keyword in content.lower() for keyword in [
            "deadline", "by", "before", "within", "days", "date"
        ])
        perspective.checks.append(ValidationCheck(
            id="MEDIATOR-003",
            description="Provides clear settlement timeline",
            category="timeline",
            severity="warning",
            passed=has_timeline,
            message="Timeline present" if has_timeline else "No time pressure"
        ))
        
        perspective.calculate_verdict()
        return perspective


# ═════════════════════════════════════════════════════════════════
# SOFTWARE PATTERN VALIDATORS: PRD, ADR, DDD, TDD
# ═════════════════════════════════════════════════════════════════

    def validate_prd_pattern(self, content: str) -> ValidationCheck:
        """Product Requirements Document pattern validation"""
        prd_elements = {
            "problem": any(kw in content.lower() for kw in ["problem", "challenge", "issue"]),
            "goal": any(kw in content.lower() for kw in ["goal", "objective", "purpose"]),
            "stakeholders": any(kw in content.lower() for kw in ["user", "stakeholder", "customer"]),
            "requirements": any(kw in content.lower() for kw in ["must", "shall", "required"]),
            "success_metrics": any(kw in content.lower() for kw in ["metric", "measure", "kpi"]),
        }
        
        score = sum(1 for v in prd_elements.values() if v)
        passed = score >= 3
        
        return ValidationCheck(
            id="PRD-001",
            description="Follows PRD pattern (problem/goal/requirements/metrics)",
            category="software_pattern",
            severity="warning",
            passed=passed,
            message=f"{score}/5 PRD elements present",
            evidence=prd_elements
        )
    
    def validate_adr_pattern(self, content: str) -> ValidationCheck:
        """Architecture Decision Record pattern validation"""
        adr_elements = {
            "context": any(kw in content.lower() for kw in ["context", "background", "situation"]),
            "decision": any(kw in content.lower() for kw in ["decision", "chosen", "selected"]),
            "alternatives": any(kw in content.lower() for kw in ["alternative", "option", "considered"]),
            "consequences": any(kw in content.lower() for kw in ["consequence", "impact", "trade-off"]),
            "rationale": any(kw in content.lower() for kw in ["because", "reason", "why"]),
        }
        
        score = sum(1 for v in adr_elements.values() if v)
        passed = score >= 3
        
        return ValidationCheck(
            id="ADR-001",
            description="Follows ADR pattern (context/decision/alternatives/consequences)",
            category="software_pattern",
            severity="warning",
            passed=passed,
            message=f"{score}/5 ADR elements present",
            evidence=adr_elements
        )
    
    def validate_ddd_pattern(self, content: str) -> ValidationCheck:
        """Domain-Driven Design pattern validation"""
        ddd_elements = {
            "bounded_context": any(kw in content.lower() for kw in ["domain", "context", "boundary"]),
            "entities": any(kw in content.lower() for kw in ["entity", "object", "model"]),
            "value_objects": any(kw in content.lower() for kw in ["value", "immutable", "property"]),
            "aggregates": any(kw in content.lower() for kw in ["aggregate", "root", "cluster"]),
            "ubiquitous_language": content.count(":") > 5,  # Definitions present
        }
        
        score = sum(1 for v in ddd_elements.values() if v)
        passed = score >= 2
        
        return ValidationCheck(
            id="DDD-001",
            description="Follows DDD pattern (domain model, bounded context)",
            category="software_pattern",
            severity="info",
            passed=passed,
            message=f"{score}/5 DDD elements present",
            evidence=ddd_elements
        )
    
    def validate_tdd_pattern(self, content: str) -> ValidationCheck:
        """Test-Driven Development pattern validation"""
        tdd_elements = {
            "red": any(kw in content.lower() for kw in ["fail", "error", "broken", "red"]),
            "green": any(kw in content.lower() for kw in ["pass", "success", "works", "green"]),
            "refactor": any(kw in content.lower() for kw in ["refactor", "improve", "clean"]),
            "test_first": any(kw in content.lower() for kw in ["test", "verify", "validate"]),
            "coverage": any(kw in content.lower() for kw in ["coverage", "edge case", "scenario"]),
        }
        
        score = sum(1 for v in tdd_elements.values() if v)
        passed = score >= 3
        
        return ValidationCheck(
            id="TDD-001",
            description="Follows TDD pattern (test-first, red-green-refactor)",
            category="software_pattern",
            severity="info",
            passed=passed,
            message=f"{score}/5 TDD elements present",
            evidence=tdd_elements
        )
    
    def validate_software_patterns(self, content: str, patterns: List[str]) -> Dict[str, ValidationCheck]:
        """Run selected software pattern validations"""
        results = {}
        
        pattern_validators = {
            "prd": self.validate_prd_pattern,
            "adr": self.validate_adr_pattern,
            "ddd": self.validate_ddd_pattern,
            "tdd": self.validate_tdd_pattern,
        }
        
        for pattern in patterns:
            if pattern in pattern_validators:
                results[pattern] = pattern_validators[pattern](content)
        
        return results


# ═════════════════════════════════════════════════════════════════
# ENHANCED run_full_validation
# ═════════════════════════════════════════════════════════════════

    def run_full_validation(self, content: str,
                           circles: List[Circle] = None,
                           roles: List[LegalRole] = None,
                           counsels: List[GovernmentCounsel] = None,
                           blockers: List[str] = None,
                           patterns: List[str] = None) -> Dict:
        """
        Extended validation including all circles, adversarial roles, software patterns
        
        Args:
            content: Document content
            circles: Circles to validate (default: all 6)
            roles: Legal roles to simulate (default: all 6)
            counsels: Government counsels (default: all 5)
            blockers: Known blockers for assessor
            patterns: Software patterns to validate (prd, adr, ddd, tdd)
        """
        circles = circles or list(Circle)
        roles = roles or list(LegalRole)
        counsels = counsels or list(GovernmentCounsel)
        patterns = patterns or []
        
        # Run all circle validations (6 circles)
        if Circle.ANALYST in circles:
            self.circle_perspectives[Circle.ANALYST] = self.validate_analyst_circle(content)
        if Circle.ASSESSOR in circles:
            self.circle_perspectives[Circle.ASSESSOR] = self.validate_assessor_circle(content, blockers)
        if Circle.INNOVATOR in circles:
            self.circle_perspectives[Circle.INNOVATOR] = self.validate_innovator_circle(content)
        if Circle.INTUITIVE in circles:
            self.circle_perspectives[Circle.INTUITIVE] = self.validate_intuitive_circle(content)
        if Circle.ORCHESTRATOR in circles:
            self.circle_perspectives[Circle.ORCHESTRATOR] = self.validate_orchestrator_circle(content)
        if Circle.SEEKER in circles:
            self.circle_perspectives[Circle.SEEKER] = self.validate_seeker_circle(content)
        
        # Run all role validations (6 roles including adversarial)
        if LegalRole.JUDGE in roles:
            self.role_perspectives[LegalRole.JUDGE] = self.validate_judge_perspective(content)
        if LegalRole.PROSECUTOR in roles:
            self.role_perspectives[LegalRole.PROSECUTOR] = self.validate_prosecutor_perspective(content)
        if LegalRole.DEFENSE in roles:
            self.role_perspectives[LegalRole.DEFENSE] = self.validate_defense_perspective(content)
        if LegalRole.EXPERT_WITNESS in roles:
            self.role_perspectives[LegalRole.EXPERT_WITNESS] = self.validate_expert_witness_perspective(content)
        if LegalRole.JURY in roles:
            self.role_perspectives[LegalRole.JURY] = self.validate_jury_perspective(content)
        if LegalRole.MEDIATOR in roles:
            self.role_perspectives[LegalRole.MEDIATOR] = self.validate_mediator_perspective(content)
        
        # Run government counsel validations (5 counsels)
        if GovernmentCounsel.COUNTY_ATTORNEY in counsels:
            self.counsel_perspectives[GovernmentCounsel.COUNTY_ATTORNEY] = self.validate_county_attorney(content)
        if GovernmentCounsel.STATE_AG_CONSUMER in counsels:
            self.counsel_perspectives[GovernmentCounsel.STATE_AG_CONSUMER] = self.validate_state_ag_consumer(content)
        if GovernmentCounsel.HUD_REGIONAL in counsels:
            self.counsel_perspectives[GovernmentCounsel.HUD_REGIONAL] = self.validate_hud_regional(content)
        if GovernmentCounsel.LEGAL_AID in counsels:
            self.counsel_perspectives[GovernmentCounsel.LEGAL_AID] = self.validate_legal_aid(content)
        
        # Run software pattern validations
        pattern_checks = self.validate_software_patterns(content, patterns)
        
        # Calculate overall scores
        self._calculate_overall_scores()
        
        # Generate report with pattern checks
        report = self.generate_report()
        if pattern_checks:
            report["software_patterns"] = {
                pattern: {
                    "id": check.id,
                    "passed": check.passed,
                    "message": check.message,
                    "evidence": check.evidence,
                } for pattern, check in pattern_checks.items()
            }
        
        return report


# ═════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═════════════════════════════════════════════════════════════════

def parse_args():
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(
        description="Wholeness validation framework for legal/technical documents"
    )
    
    parser.add_argument(
        "--file", "-f",
        required=True,
        help="Path to document to validate (.eml, .txt, .md)"
    )
    
    parser.add_argument(
        "--circles",
        default="all",
        help="Circles to validate (comma-separated or 'all'): analyst,assessor,innovator,intuitive,orchestrator,seeker"
    )
    
    parser.add_argument(
        "--roles",
        default="all",
        help="Legal roles to simulate (comma-separated or 'all'): judge,prosecutor,defense,expert_witness,jury,mediator"
    )
    
    parser.add_argument(
        "--counsels",
        default="all",
        help="Government counsels (comma-separated or 'all'): county_attorney,state_ag_consumer,hud_regional,legal_aid"
    )
    
    parser.add_argument(
        "--patterns",
        default="",
        help="Software patterns to validate (comma-separated): prd,adr,ddd,tdd"
    )
    
    parser.add_argument(
        "--blockers",
        default="",
        help="Known blockers for assessor circle (comma-separated)"
    )
    
    parser.add_argument(
        "--output", "-o",
        help="Output JSON report path (default: stdout)"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print detailed report to console"
    )
    
    return parser.parse_args()


def parse_list_arg(arg: str, enum_class=None) -> List:
    """Parse comma-separated argument into list"""
    if not arg or arg.lower() == "all":
        return list(enum_class) if enum_class else []
    
    items = [item.strip().upper() for item in arg.split(",")]
    
    if enum_class:
        return [enum_class[item] for item in items if item in enum_class.__members__]
    else:
        return [item.lower() for item in items]


def main():
    """CLI entry point"""
    args = parse_args()
    
    # Read document
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
    
    content = file_path.read_text(encoding='utf-8')
    
    # Parse arguments
    circles = parse_list_arg(args.circles, Circle)
    roles = parse_list_arg(args.roles, LegalRole)
    counsels = parse_list_arg(args.counsels, GovernmentCounsel)
    patterns = parse_list_arg(args.patterns)
    blockers = parse_list_arg(args.blockers) if args.blockers else None
    
    # Create validator
    validator = ExtendedValidator(
        document_type=file_path.suffix[1:],  # Remove leading dot
        document_path=str(file_path)
    )
    
    # Run validation
    print(f"Validating: {file_path.name}", file=sys.stderr)
    print(f"Circles: {len(circles)}, Roles: {len(roles)}, Counsels: {len(counsels)}, Patterns: {len(patterns)}", file=sys.stderr)
    
    report = validator.run_full_validation(
        content=content,
        circles=circles,
        roles=roles,
        counsels=counsels,
        blockers=blockers,
        patterns=patterns
    )
    
    # Output results
    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json.dumps(report, indent=2))
        print(f"Report written to: {output_path}", file=sys.stderr)
    else:
        print(json.dumps(report, indent=2))
    
    # Verbose console output
    if args.verbose:
        print("\n" + "="*80, file=sys.stderr)
        validator.print_report()
    
    # Exit code based on recommendation
    recommendation = report["overall"]["recommendation"]
    if "APPROVE" in recommendation:
        sys.exit(0)
    elif "REVISION" in recommendation:
        sys.exit(1)
    else:
        sys.exit(2)


if __name__ == "__main__":
    main()
