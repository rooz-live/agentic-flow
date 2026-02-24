"""
VibeThinker - Legal Case Validation and Strategy Framework
==========================================================

A comprehensive framework for legal document validation using a 21-role
governance council and AI-powered strategy generation.

Modules:
    governance_council: 21-role validation framework
    advocate_cli: Command-line interface for validation
    vibesthinker_ai: Strategic diversity reasoning engine

Usage:
    from vibesthinker import GovernanceCouncil, VibeThinker, CaseContext

    # Validate a document
    council = GovernanceCouncil("/path/to/document.eml")
    content = open("/path/to/document.eml").read()
    report = council.run_full_validation(content)

    # Generate strategies
    context = CaseContext(
        case_number="26CV005596-590",
        plaintiff="Bhopti",
        defendant="MAA",
        claim_type="Habitability",
        damages_claimed=50000,
        evidence_strength=0.85,
        timeline_months=22,
        systemic_score=40
    )
    vt = VibeThinker(context)
    strategies = vt.generate_strategies(n=10)
    result = vt.mgpo_select(top_k=3)
"""

__version__ = "2.0.0"
__author__ = "VibeThinker Team"

# Governance Council exports
# Document extraction (PDF, Word, .eml, .txt)
from .document_extractor import extract_document_text, supported_formats
from .governance_council import (
    AdversarialReview,
    # Enums
    Circle,
    CirclePerspective,
    CounselPerspective,
    # Main classes
    GovernanceCouncil,
    GovernmentCounsel,
    LayerValidation,
    LegalRole,
    ROAMCategory,
    RolePerspective,
    Severity,
    SoftwarePattern,
    TemporalValidation,
    # Data classes
    ValidationCheck,
    Verdict,
    WsjfScore,
)

# 33-Role Extended Governance Council
from .governance_council_33_roles import (
    CognitiveBiasResult,
    FeedbackLoopResult,
    # Main class
    GovernanceCouncil33,
    NarrativeArcResult,
    NashEquilibriumResult,
    # Data classes
    StrategicDiversityResult,
    # Enums
    StrategicRole,
    StrategicRoleResult,
    SystemicIndifferenceResult,
    TemporalValidationResult,
    validate_behavioral_economics,
    validate_emotional_intelligence,
    # Individual role validators
    validate_game_theory,
    validate_information_theory,
    validate_mgpo_optimizer,
    validate_narrative_design,
    validate_patent_examiner,
    validate_portfolio_strategist,
    validate_strategic_diversity,
    validate_systemic_indifference,
    validate_systems_thinking,
    validate_temporal_accuracy,
)

# VibeThinker AI exports
from .vibesthinker_ai import (
    # Constants
    TEMPERATURE_PRESETS,
    # Data classes
    CaseContext,
    MGPOResult,
    RiskLevel,
    Strategy,
    # Enums
    StrategyType,
    # Main classes
    VibeThinker,
)

__all__ = [
    # Version
    "__version__",
    # Governance Council (21-role base)
    "GovernanceCouncil",
    "AdversarialReview",
    "Circle",
    "LegalRole",
    "GovernmentCounsel",
    "SoftwarePattern",
    "ROAMCategory",
    "Verdict",
    "Severity",
    "ValidationCheck",
    "CirclePerspective",
    "RolePerspective",
    "CounselPerspective",
    "LayerValidation",
    "TemporalValidation",
    "WsjfScore",
    # Governance Council (33-role extended)
    "GovernanceCouncil33",
    "StrategicRole",
    "StrategicDiversityResult",
    "TemporalValidationResult",
    "SystemicIndifferenceResult",
    "NashEquilibriumResult",
    "CognitiveBiasResult",
    "FeedbackLoopResult",
    "NarrativeArcResult",
    "StrategicRoleResult",
    # Strategic role validators
    "validate_game_theory",
    "validate_behavioral_economics",
    "validate_systems_thinking",
    "validate_narrative_design",
    "validate_emotional_intelligence",
    "validate_information_theory",
    "validate_patent_examiner",
    "validate_portfolio_strategist",
    "validate_temporal_accuracy",
    "validate_systemic_indifference",
    "validate_strategic_diversity",
    "validate_mgpo_optimizer",
    # VibeThinker AI
    "VibeThinker",
    "StrategyType",
    "RiskLevel",
    "CaseContext",
    "Strategy",
    "MGPOResult",
    "TEMPERATURE_PRESETS",
    # Document extraction
    "extract_document_text",
    "supported_formats",
]
