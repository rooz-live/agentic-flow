"""
WSJF — Weighted Shortest Job First
Canonical implementation with anti-pattern detection and defensible scoring.

@business-context WSJF is the primary prioritization engine for all work items.
    It drives critical path delivery for legal deadlines (3/3, 3/10 trials),
    settlement negotiation timing, and development task ordering.
    Highest BV item: Evidence bundle generation for MAA litigation.
@adr ADR-001: Consolidated 5 prior WSJF implementations into one canonical
    package to eliminate divergent scoring logic and ensure auditability.
@constraint DDD-WSJF: This module must remain self-contained. Do NOT import
    from legal/, vibesthinker/, or validation_dashboard/ bounded contexts.
    External consumers import from this package, not the reverse.
@planned-change R005: ROAM staleness threshold (96h) may be tightened to 48h
    once automated ROAM refresh is wired into standup ceremonies.
"""

from .calculator import (
    WsjfCalculator,
    WsjfItem,
    WsjfOverride,
    WsjfError,
    InputValidationError,
    AntiPatternDetected,
    ImpactMetrics,
    RiskProfile,
    Horizon,
    RiskLevel,
    get_sample_items,
)

__all__ = [
    'WsjfCalculator',
    'WsjfItem',
    'WsjfOverride',
    'WsjfError',
    'InputValidationError',
    'AntiPatternDetected',
    'ImpactMetrics',
    'RiskProfile',
    'Horizon',
    'RiskLevel',
    'get_sample_items',
]
