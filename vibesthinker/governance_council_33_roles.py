#!/usr/bin/env python3
"""
Governance Council - 33-Role Extended Validation System
========================================================
Extends the 21-role system with 12 additional strategic roles.

Original 21 Roles:
- 6 Circles (Analyst, Assessor, Innovator, Intuitive, Orchestrator, Seeker)
- 6 Legal (Judge, Prosecutor, Defense, Expert Witness, Jury, Mediator)
- 5 Government (County Attorney, State AG, HUD Regional, Legal Aid, CFPB)
- 4 Software (PRD, ADR, DDD, TDD)

New 12 Roles (Strategic Diversity):
- ROLE 22: Game Theorist (Nash Equilibrium Analysis)
- ROLE 23: Behavioral Economist (Cognitive Bias Exploitation)
- ROLE 24: Systems Thinker (Feedback Loops)
- ROLE 25: Narrative Designer (Story Arc)
- ROLE 26: Emotional Intelligence (Empathy Mapping)
- ROLE 27: Information Theorist (Signal-to-Noise Ratio)
- ROLE 28: Patent Examiner (Prior Art, Novelty, Obviousness)
- ROLE 29: Portfolio Strategist (Asset Allocation, Risk/Return)
- ROLE 30: Temporal Validator (Date Arithmetic, Calendar Verification)
- ROLE 31: Systemic Indifference Analyzer (Organizational Patterns)
- ROLE 32: Strategic Diversity Generator (Pass@K Optimization)
- ROLE 33: MGPO Optimizer (Entropy-Guided Selection)

DoR: governance_council.py operational, all enums importable
DoD: All 12 strategic roles return real validation results (no TODOs)
"""

import calendar
import hashlib
import math
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from enum import Enum, auto
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from vibesthinker.governance_council import (
    Circle,
    GovernanceCouncil,
    GovernmentCounsel,
    LegalRole,
    ROAMCategory,
    Severity,
    SoftwarePattern,
    ValidationCheck,
    Verdict,
    WsjfScore,
)

# ═════════════════════════════════════════════════════════════════════════════
# NEW STRATEGIC ROLES (22-33)
# ═════════════════════════════════════════════════════════════════════════════


class StrategicRole(Enum):
    """12 Strategic roles for advanced validation"""

    GAME_THEORIST = auto()
    BEHAVIORAL_ECONOMIST = auto()
    SYSTEMS_THINKER = auto()
    NARRATIVE_DESIGNER = auto()
    EMOTIONAL_INTELLIGENCE = auto()
    INFORMATION_THEORIST = auto()
    PATENT_EXAMINER = auto()
    PORTFOLIO_STRATEGIST = auto()
    TEMPORAL_VALIDATOR = auto()
    SYSTEMIC_INDIFFERENCE = auto()
    STRATEGIC_DIVERSITY = auto()
    MGPO_OPTIMIZER = auto()


# ═════════════════════════════════════════════════════════════════════════════
# RESULT DATA CLASSES
# ═════════════════════════════════════════════════════════════════════════════


@dataclass
class StrategicDiversityResult:
    """Result from strategic diversity analysis (Pass@K)"""

    alternatives: List[Dict[str, Any]] = field(default_factory=list)
    entropy_scores: List[float] = field(default_factory=list)
    pass_k_score: float = 0.0
    recommended_approach: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0
    diversity_index: float = 0.0
    coverage_gaps: List[str] = field(default_factory=list)


@dataclass
class TemporalValidationResult:
    """Result from temporal accuracy validation"""

    date_arithmetic_errors: List[str] = field(default_factory=list)
    calendar_mismatches: List[str] = field(default_factory=list)
    deadline_calculations: Dict[str, Any] = field(default_factory=dict)
    business_days: int = 0
    total_days: float = 0.0
    timestamps_found: List[Dict[str, Any]] = field(default_factory=list)
    is_valid: bool = True


@dataclass
class SystemicIndifferenceResult:
    """Result from systemic indifference analysis"""

    pattern_count: int = 0
    organizations: List[str] = field(default_factory=list)
    systemic_score: float = 0.0
    evidence_strength: str = "WEAK"
    litigation_readiness: str = "DEFER"
    org_details: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    cross_org_patterns: List[str] = field(default_factory=list)
    delay_tactics_detected: List[str] = field(default_factory=list)


@dataclass
class NashEquilibriumResult:
    """Game theory analysis output"""

    game_type: str = "sequential"
    player_strategies: Dict[str, List[str]] = field(default_factory=dict)
    equilibrium_outcome: str = ""
    first_mover_advantage: bool = False
    dominant_strategy: str = ""
    payoff_matrix: Dict[str, Dict[str, float]] = field(default_factory=dict)


@dataclass
class CognitiveBiasResult:
    """Behavioral economics analysis output"""

    biases_triggered: List[Dict[str, Any]] = field(default_factory=list)
    framing_score: float = 0.0
    anchoring_strength: float = 0.0
    loss_aversion_index: float = 0.0
    scarcity_pressure: float = 0.0
    reciprocity_hooks: int = 0


@dataclass
class FeedbackLoopResult:
    """Systems thinking analysis output"""

    positive_loops: List[Dict[str, str]] = field(default_factory=list)
    negative_loops: List[Dict[str, str]] = field(default_factory=list)
    leverage_points: List[str] = field(default_factory=list)
    system_archetype: str = ""
    reinforcing_dynamics: int = 0
    balancing_dynamics: int = 0


@dataclass
class NarrativeArcResult:
    """Story arc analysis output"""

    arc_type: str = ""
    tension_curve: List[float] = field(default_factory=list)
    climax_position: float = 0.0
    resolution_strength: float = 0.0
    emotional_beats: List[Dict[str, str]] = field(default_factory=list)
    snr_ratio: float = 0.0


@dataclass
class StrategicRoleResult:
    """Generic result for a strategic role check"""

    role: StrategicRole
    checks: List[ValidationCheck] = field(default_factory=list)
    verdict: Verdict = Verdict.NEEDS_REVISION
    confidence: float = 0.0
    analysis: Dict[str, Any] = field(default_factory=dict)


# ═════════════════════════════════════════════════════════════════════════════
# HELPER: ENTROPY / DIVERSITY MATH
# ═════════════════════════════════════════════════════════════════════════════


def _shannon_entropy(probabilities: List[float]) -> float:
    """Calculate Shannon entropy from a probability distribution."""
    total = sum(probabilities) or 1.0
    normed = [p / total for p in probabilities if p > 0]
    return -sum(p * math.log2(p) for p in normed) if normed else 0.0


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Cosine similarity between two equal-length numeric vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a)) or 1.0
    mag_b = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (mag_a * mag_b)


def _text_fingerprint(text: str, n: int = 3) -> List[float]:
    """Produce a lightweight character-trigram frequency vector for diversity measurement."""
    trigrams: Dict[str, int] = {}
    normed = text.lower().strip()
    for i in range(len(normed) - n + 1):
        tri = normed[i : i + n]
        trigrams[tri] = trigrams.get(tri, 0) + 1
    # collapse into a fixed 64-dim hash-bucket vector
    vec = [0.0] * 64
    for tri, count in trigrams.items():
        bucket = int(hashlib.md5(tri.encode()).hexdigest(), 16) % 64
        vec[bucket] += count
    return vec


# ═════════════════════════════════════════════════════════════════════════════
# TEMPORAL HELPERS
# ═════════════════════════════════════════════════════════════════════════════

_MONTH_NAMES = {m.lower(): i for i, m in enumerate(calendar.month_name) if m}
_MONTH_ABBR = {m.lower(): i for i, m in enumerate(calendar.month_abbr) if m}

_DATE_PATTERNS = [
    # ISO 2026-02-12
    (
        r"(\d{4})-(\d{1,2})-(\d{1,2})",
        lambda m: date(int(m.group(1)), int(m.group(2)), int(m.group(3))),
    ),
    # US style 02/12/2026 or 2/12/26
    (r"(\d{1,2})/(\d{1,2})/(\d{2,4})", lambda m: _parse_us_date(m)),
    # "February 12, 2026" or "Feb 12, 2026"
    (r"([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})", lambda m: _parse_named_date(m)),
    # "12 February 2026"
    (r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", lambda m: _parse_euro_date(m)),
]

_TIME_PATTERN = re.compile(
    r"(\d{1,2}):(\d{2})\s*(AM|PM|am|pm|EST|CST|PST|EDT|CDT|PDT)?"
)

_DAYOFWEEK_PATTERN = re.compile(
    r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})",
    re.IGNORECASE,
)

_HOURS_FROM_PATTERN = re.compile(
    r"(\d+)\s*hours?\s*(from|after|before)\s+(\w+)",
    re.IGNORECASE,
)


def _parse_us_date(m) -> Optional[date]:
    try:
        month, day, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if year < 100:
            year += 2000
        return date(year, month, day)
    except (ValueError, OverflowError):
        return None


def _parse_named_date(m) -> Optional[date]:
    try:
        month_str = m.group(1).lower()
        month = _MONTH_NAMES.get(month_str) or _MONTH_ABBR.get(month_str[:3])
        if not month:
            return None
        return date(int(m.group(3)), month, int(m.group(2)))
    except (ValueError, OverflowError):
        return None


def _parse_euro_date(m) -> Optional[date]:
    try:
        month_str = m.group(2).lower()
        month = _MONTH_NAMES.get(month_str) or _MONTH_ABBR.get(month_str[:3])
        if not month:
            return None
        return date(int(m.group(3)), month, int(m.group(1)))
    except (ValueError, OverflowError):
        return None


def _extract_dates(text: str) -> List[Tuple[date, str, int]]:
    """Extract all recognisable dates from text, returning (date, original_str, char_pos)."""
    results: List[Tuple[date, str, int]] = []
    for pattern_str, parser in _DATE_PATTERNS:
        for m in re.finditer(pattern_str, text):
            parsed = parser(m)
            if parsed and isinstance(parsed, date):
                results.append((parsed, m.group(0), m.start()))
    # deduplicate by position
    seen_pos = set()
    unique = []
    for d, s, p in sorted(results, key=lambda x: x[2]):
        if p not in seen_pos:
            seen_pos.add(p)
            unique.append((d, s, p))
    return unique


def _business_days_between(start: date, end: date) -> int:
    """Count business days (Mon-Fri) between two dates, inclusive of end."""
    if end < start:
        return 0
    count = 0
    current = start
    while current <= end:
        if current.weekday() < 5:
            count += 1
        current += timedelta(days=1)
    return count


# ═════════════════════════════════════════════════════════════════════════════
# SYSTEMIC PATTERN HELPERS
# ═════════════════════════════════════════════════════════════════════════════

# Keywords that suggest organisational levels of failure
_ORG_LEVEL_KEYWORDS = {
    "frontline": [
        "maintenance",
        "repair",
        "technician",
        "support agent",
        "customer service",
    ],
    "property_mgmt": ["property manager", "management office", "leasing", "front desk"],
    "regional": ["regional", "district", "area manager", "division"],
    "corporate": [
        "corporate",
        "headquarters",
        "executive",
        "vp",
        "ceo",
        "general counsel",
        "legal department",
    ],
}

_DELAY_TACTIC_PATTERNS = [
    (
        r"cancel(?:l?ed|ation)\s+(?:work\s*order|request|appointment)",
        "Work order / request cancellation",
    ),
    (r"no\s+respon(?:se|d)", "Non-response to communications"),
    (r"fail(?:ed|ure)?\s+to\s+(?:respond|reply|address|fix|repair)", "Failure to act"),
    (r"delay(?:ed|ing)?\s+(?:repair|response|maintenance|action)", "Deliberate delay"),
    (r"pass(?:ed|ing)?\s+(?:deadline|due\s*date)", "Deadline violation"),
    (r"ignor(?:ed?|ing)\s+(?:request|complaint|notice)", "Ignoring requests"),
    (r"rescheduled?\s+(?:multiple|again|repeat)", "Repeated rescheduling"),
    (r"temporary\s+fix", "Band-aid / temporary fix pattern"),
]

_SYSTEMIC_ISSUE_TYPES = [
    "mold",
    "hvac",
    "water intrusion",
    "leak",
    "pest",
    "electrical",
    "plumbing",
    "structural",
    "fire safety",
    "health hazard",
    "habitability",
    "noise",
]

# Mapping of known orgs to expected hierarchy depth
_KNOWN_ORGS = {
    "MAA": {"levels": 4, "type": "property_management"},
    "Apex": {"levels": 3, "type": "financial_services"},
    "BofA": {"levels": 4, "type": "banking"},
    "Bank of America": {"levels": 4, "type": "banking"},
    "US Bank": {"levels": 4, "type": "banking"},
    "T-Mobile": {"levels": 3, "type": "telecommunications"},
    "Equifax": {"levels": 2, "type": "credit_reporting"},
    "Experian": {"levels": 2, "type": "credit_reporting"},
    "TransUnion": {"levels": 2, "type": "credit_reporting"},
    "IRS": {"levels": 5, "type": "government"},
}


# ═════════════════════════════════════════════════════════════════════════════
# SETTLEMENT STRATEGY TEMPLATES  (for Pass@K diversity generation)
# ═════════════════════════════════════════════════════════════════════════════

_STRATEGY_TEMPLATES = [
    {
        "id": "high_anchor",
        "label": "High Anchor ($150K+)",
        "description": "Anchor high with maximum statutory damages + treble + punitive",
        "risk": "HIGH",
        "time_sensitivity": 3,
        "litigation_value": 9,
    },
    {
        "id": "calculated_mid",
        "label": "Calculated Mid ($50K-$75K)",
        "description": "Von Pettis formula + rent abatement + moving costs",
        "risk": "MEDIUM",
        "time_sensitivity": 5,
        "litigation_value": 7,
    },
    {
        "id": "pragmatic_floor",
        "label": "Pragmatic Floor ($13K-$22K)",
        "description": "Realistic settlement range based on NC habitability precedent",
        "risk": "LOW",
        "time_sensitivity": 8,
        "litigation_value": 5,
    },
    {
        "id": "relocation_focus",
        "label": "Relocation-Centred",
        "description": "Prioritise relocation assistance + moving costs over lump sum",
        "risk": "LOW",
        "time_sensitivity": 9,
        "litigation_value": 4,
    },
    {
        "id": "creative_lease_release",
        "label": "Creative Lease Release",
        "description": "MAA releases another tenant to prove financial capacity",
        "risk": "MEDIUM",
        "time_sensitivity": 6,
        "litigation_value": 6,
    },
    {
        "id": "treble_damages_threat",
        "label": "UDTP Treble Damages",
        "description": "Frame as N.C. § 75-16 UDTP to unlock 3x multiplier",
        "risk": "HIGH",
        "time_sensitivity": 4,
        "litigation_value": 10,
    },
    {
        "id": "holdover_leverage",
        "label": "Holdover Status Leverage",
        "description": "Use Dunn v. Combs holdover rule to extend occupancy value",
        "risk": "MEDIUM",
        "time_sensitivity": 7,
        "litigation_value": 6,
    },
    {
        "id": "health_safety_angle",
        "label": "Health & Safety Focus",
        "description": "Lead with medical records + mold documentation for emotional impact",
        "risk": "LOW",
        "time_sensitivity": 7,
        "litigation_value": 8,
    },
    {
        "id": "litigation_cost_comparison",
        "label": "Litigation Cost Comparison",
        "description": "Show MAA's litigation costs exceed settlement amount",
        "risk": "LOW",
        "time_sensitivity": 8,
        "litigation_value": 3,
    },
    {
        "id": "staged_escalation",
        "label": "Staged Escalation (5:30→8:00→9AM)",
        "description": "Friendly follow-up → deadline extension → final offer",
        "risk": "LOW",
        "time_sensitivity": 10,
        "litigation_value": 5,
    },
    {
        "id": "nda_as_leverage",
        "label": "NDA as Bargaining Chip",
        "description": "Offer NDA re: mold issues in exchange for higher settlement",
        "risk": "MEDIUM",
        "time_sensitivity": 5,
        "litigation_value": 7,
    },
    {
        "id": "multi_claim_bundle",
        "label": "Multi-Claim Bundle",
        "description": "Bundle habitability + UDTP + constructive eviction + fraud",
        "risk": "HIGH",
        "time_sensitivity": 3,
        "litigation_value": 10,
    },
]


# ═════════════════════════════════════════════════════════════════════════════
# ROLE VALIDATORS — REAL IMPLEMENTATIONS
# ═════════════════════════════════════════════════════════════════════════════


def validate_game_theory(content: str) -> StrategicRoleResult:
    """ROLE 22: Nash Equilibrium Analysis — evaluate strategic positioning."""
    checks: List[ValidationCheck] = []

    # Detect first-mover signals
    first_mover_kw = [
        "i propose",
        "i offer",
        "i am willing",
        "i suggest",
        "my offer",
        "settlement offer",
        "i have prepared",
    ]
    first_mover_count = sum(1 for kw in first_mover_kw if kw in content.lower())
    has_first_mover = first_mover_count >= 2
    checks.append(
        ValidationCheck(
            id="GAME-001",
            description="Establishes first-mover advantage (proactive framing)",
            category="game_theory",
            severity=Severity.WARNING,
            passed=has_first_mover,
            message=f"First-mover signals: {first_mover_count} ({'>= 2 required' if not has_first_mover else 'strong'})",
            layer=5,
        )
    )

    # Detect credible threat (BATNA)
    threat_kw = [
        "litigation",
        "trial",
        "court hearing",
        "punitive",
        "treble",
        "damages",
        "jury",
        "appeal",
        "filing",
    ]
    threat_count = sum(1 for kw in threat_kw if kw in content.lower())
    has_credible_threat = threat_count >= 3
    checks.append(
        ValidationCheck(
            id="GAME-002",
            description="Establishes credible BATNA / threat of litigation",
            category="game_theory",
            severity=Severity.CRITICAL,
            passed=has_credible_threat,
            message=f"BATNA signals: {threat_count}/9 (need >=3)",
            layer=5,
        )
    )

    # Detect cooperative framing (mixed strategy)
    coop_kw = [
        "mutual",
        "both parties",
        "avoid",
        "resolution",
        "benefit",
        "accommodate",
        "willing to",
    ]
    coop_count = sum(1 for kw in coop_kw if kw in content.lower())
    has_cooperation = coop_count >= 2
    checks.append(
        ValidationCheck(
            id="GAME-003",
            description="Includes cooperative framing (mixed strategy equilibrium)",
            category="game_theory",
            severity=Severity.WARNING,
            passed=has_cooperation,
            message=f"Cooperative signals: {coop_count}/7",
            layer=5,
        )
    )

    # Payoff asymmetry detection
    dollar_amounts = re.findall(r"\$[\d,]+(?:\.\d{2})?", content)
    has_payoff = len(dollar_amounts) >= 1
    checks.append(
        ValidationCheck(
            id="GAME-004",
            description="Quantifies payoff / cost comparison for opponent",
            category="game_theory",
            severity=Severity.INFO,
            passed=has_payoff,
            message=f"Dollar amounts found: {len(dollar_amounts)}",
            evidence={"amounts": dollar_amounts[:5]},
            layer=5,
        )
    )

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    equilibrium = NashEquilibriumResult(
        game_type="sequential" if has_first_mover else "simultaneous",
        player_strategies={
            "plaintiff": ["settle_high", "litigate", "escalate", "cooperate"],
            "defendant": ["accept", "counter", "delay", "ignore"],
        },
        equilibrium_outcome="Plaintiff settles mid-range; Defendant counters"
        if has_credible_threat
        else "Stalemate risk",
        first_mover_advantage=has_first_mover,
        dominant_strategy="credible_threat_with_cooperation"
        if (has_credible_threat and has_cooperation)
        else "needs_balance",
        payoff_matrix={
            "settle": {"plaintiff": 7.0, "defendant": 5.0},
            "litigate": {
                "plaintiff": 9.0 if has_credible_threat else 3.0,
                "defendant": 2.0,
            },
            "ignore": {"plaintiff": 6.0, "defendant": 1.0},
        },
    )

    verdict = (
        Verdict.APPROVE
        if passed_count >= 3
        else (
            Verdict.CONDITIONAL_APPROVE if passed_count >= 2 else Verdict.NEEDS_REVISION
        )
    )

    return StrategicRoleResult(
        role=StrategicRole.GAME_THEORIST,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={"nash_equilibrium": equilibrium.__dict__},
    )


def validate_behavioral_economics(content: str) -> StrategicRoleResult:
    """ROLE 23: Cognitive Bias Exploitation — detect framing effects."""
    checks: List[ValidationCheck] = []
    biases: List[Dict[str, Any]] = []

    # 1. Anchoring bias
    dollar_amounts = re.findall(r"\$([\d,]+)", content)
    parsed_amounts = []
    for amt in dollar_amounts:
        try:
            parsed_amounts.append(int(amt.replace(",", "")))
        except ValueError:
            pass
    has_anchor = len(parsed_amounts) >= 1
    anchor_strength = 0.0
    if parsed_amounts:
        anchor_strength = (
            min(parsed_amounts[-1] / max(parsed_amounts[0], 1), 1.0)
            if len(parsed_amounts) > 1
            else 0.5
        )
    biases.append(
        {
            "name": "Anchoring",
            "triggered": has_anchor,
            "strength": round(anchor_strength, 2),
        }
    )
    checks.append(
        ValidationCheck(
            id="BIAS-001",
            description="Anchoring bias: sets initial dollar reference point",
            category="cognitive_bias",
            severity=Severity.INFO,
            passed=has_anchor,
            message=f"Anchor: {'$' + str(max(parsed_amounts)) if parsed_amounts else 'none'} (strength {anchor_strength:.0%})",
            layer=5,
        )
    )

    # 2. Loss aversion
    loss_kw = [
        "lose",
        "loss",
        "cost of",
        "risk of",
        "exposure",
        "penalty",
        "damages",
        "forfeit",
        "liable",
    ]
    loss_count = sum(1 for kw in loss_kw if kw in content.lower())
    has_loss = loss_count >= 2
    biases.append(
        {
            "name": "Loss Aversion",
            "triggered": has_loss,
            "strength": min(loss_count / 5, 1.0),
        }
    )
    checks.append(
        ValidationCheck(
            id="BIAS-002",
            description="Loss aversion: frames opponent's downside",
            category="cognitive_bias",
            severity=Severity.WARNING,
            passed=has_loss,
            message=f"Loss-frame words: {loss_count}/9",
            layer=5,
        )
    )

    # 3. Scarcity / urgency
    scarcity_kw = [
        "deadline",
        "expires",
        "limited time",
        "final",
        "last opportunity",
        "before",
        "by",
        "running out",
    ]
    scarcity_count = sum(1 for kw in scarcity_kw if kw in content.lower())
    has_scarcity = scarcity_count >= 2
    biases.append(
        {
            "name": "Scarcity",
            "triggered": has_scarcity,
            "strength": min(scarcity_count / 4, 1.0),
        }
    )
    checks.append(
        ValidationCheck(
            id="BIAS-003",
            description="Scarcity bias: creates urgency / time pressure",
            category="cognitive_bias",
            severity=Severity.WARNING,
            passed=has_scarcity,
            message=f"Scarcity signals: {scarcity_count}/8",
            layer=5,
        )
    )

    # 4. Framing effect (gain vs loss framing)
    gain_kw = ["save", "benefit", "avoid", "preserve", "opportunity", "efficient"]
    gain_count = sum(1 for kw in gain_kw if kw in content.lower())
    has_framing = gain_count >= 1 and loss_count >= 1
    biases.append(
        {
            "name": "Framing Effect",
            "triggered": has_framing,
            "strength": 0.7 if has_framing else 0.2,
        }
    )
    checks.append(
        ValidationCheck(
            id="BIAS-004",
            description="Framing effect: balances gain-frame and loss-frame language",
            category="cognitive_bias",
            severity=Severity.INFO,
            passed=has_framing,
            message=f"Gain words: {gain_count}, Loss words: {loss_count}",
            layer=5,
        )
    )

    # 5. Reciprocity
    reciprocity_kw = [
        "in return",
        "in exchange",
        "i am willing",
        "i can accommodate",
        "if MAA",
        "if you",
        "good faith",
        "demonstrate",
        "show",
    ]
    reciprocity_count = sum(1 for kw in reciprocity_kw if kw in content.lower())
    has_reciprocity = reciprocity_count >= 2
    biases.append(
        {
            "name": "Reciprocity",
            "triggered": has_reciprocity,
            "strength": min(reciprocity_count / 4, 1.0),
        }
    )
    checks.append(
        ValidationCheck(
            id="BIAS-005",
            description="Reciprocity: triggers obligation response",
            category="cognitive_bias",
            severity=Severity.INFO,
            passed=has_reciprocity,
            message=f"Reciprocity hooks: {reciprocity_count}",
            layer=5,
        )
    )

    triggered = [b for b in biases if b["triggered"]]
    total_strength = sum(b["strength"] for b in triggered) / max(len(biases), 1)
    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    verdict = (
        Verdict.APPROVE
        if len(triggered) >= 4
        else (
            Verdict.CONDITIONAL_APPROVE
            if len(triggered) >= 3
            else Verdict.NEEDS_REVISION
        )
    )

    return StrategicRoleResult(
        role=StrategicRole.BEHAVIORAL_ECONOMIST,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={
            "biases": biases,
            "triggered_count": len(triggered),
            "total_bias_strength": round(total_strength, 3),
            "framing_score": round(total_strength * 100, 1),
        },
    )


def validate_systems_thinking(content: str) -> StrategicRoleResult:
    """ROLE 24: Systems Thinker — detect feedback loops, leverage points."""
    checks: List[ValidationCheck] = []

    # Positive feedback loops (reinforcing)
    reinforcing_kw = [
        "pattern",
        "recurring",
        "repeated",
        "escalat",
        "compound",
        "growing",
        "increasing",
        "worsening",
    ]
    reinforcing_count = sum(1 for kw in reinforcing_kw if kw in content.lower())
    has_reinforcing = reinforcing_count >= 2
    checks.append(
        ValidationCheck(
            id="SYSTEMS-001",
            description="Identifies reinforcing feedback loops (patterns that compound)",
            category="systems_thinking",
            severity=Severity.WARNING,
            passed=has_reinforcing,
            message=f"Reinforcing signals: {reinforcing_count}/8",
            layer=5,
        )
    )

    # Negative / balancing loops
    balancing_kw = [
        "corrective",
        "address",
        "resolve",
        "fix",
        "prevent",
        "stop",
        "break the cycle",
        "remedy",
    ]
    balancing_count = sum(1 for kw in balancing_kw if kw in content.lower())
    has_balancing = balancing_count >= 1
    checks.append(
        ValidationCheck(
            id="SYSTEMS-002",
            description="Proposes balancing feedback loops (corrective actions)",
            category="systems_thinking",
            severity=Severity.INFO,
            passed=has_balancing,
            message=f"Balancing signals: {balancing_count}/8",
            layer=5,
        )
    )

    # Leverage points
    leverage_kw = [
        "systemic",
        "organizational",
        "policy",
        "corporate",
        "structural",
        "root cause",
        "culture",
        "institutional",
    ]
    leverage_count = sum(1 for kw in leverage_kw if kw in content.lower())
    has_leverage = leverage_count >= 2
    checks.append(
        ValidationCheck(
            id="SYSTEMS-003",
            description="Targets high-leverage intervention points",
            category="systems_thinking",
            severity=Severity.CRITICAL,
            passed=has_leverage,
            message=f"Leverage-point keywords: {leverage_count}/8",
            layer=5,
        )
    )

    # Causal chain length
    causal_kw = [
        "because",
        "therefore",
        "consequently",
        "resulting in",
        "led to",
        "caused",
    ]
    causal_count = sum(1 for kw in causal_kw if kw in content.lower())
    has_causality = causal_count >= 2
    checks.append(
        ValidationCheck(
            id="SYSTEMS-004",
            description="Traces causal chains (not just symptoms)",
            category="systems_thinking",
            severity=Severity.WARNING,
            passed=has_causality,
            message=f"Causal connectors: {causal_count}",
            layer=5,
        )
    )

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    archetype = (
        "Fixes that Fail"
        if reinforcing_count > balancing_count
        else ("Shifting the Burden" if leverage_count < 2 else "Limits to Growth")
    )

    result = FeedbackLoopResult(
        positive_loops=[{"trigger": "neglect", "effect": "damage compounds"}]
        if has_reinforcing
        else [],
        negative_loops=[{"trigger": "settlement", "effect": "stops escalation"}]
        if has_balancing
        else [],
        leverage_points=[kw for kw in leverage_kw if kw in content.lower()],
        system_archetype=archetype,
        reinforcing_dynamics=reinforcing_count,
        balancing_dynamics=balancing_count,
    )

    verdict = (
        Verdict.APPROVE
        if passed_count >= 3
        else (
            Verdict.CONDITIONAL_APPROVE if passed_count >= 2 else Verdict.NEEDS_REVISION
        )
    )

    return StrategicRoleResult(
        role=StrategicRole.SYSTEMS_THINKER,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={"feedback_loops": result.__dict__},
    )


def validate_narrative_design(content: str) -> StrategicRoleResult:
    """ROLE 25: Narrative Designer — evaluate story arc and emotional beats."""
    checks: List[ValidationCheck] = []

    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    total_paras = max(len(paragraphs), 1)

    # Tension curve: estimate tension per paragraph
    tension_kw_sets = [
        (
            [
                "violation",
                "breach",
                "failed",
                "negligent",
                "unlawful",
                "fraud",
                "damages",
            ],
            0.9,
        ),
        (["deadline", "urgent", "critical", "immediately", "final"], 0.8),
        (["health", "mold", "danger", "hazard", "medical", "suffered"], 0.7),
        (["respectfully", "understand", "willing", "good faith", "accommodate"], 0.3),
        (["propose", "offer", "settlement", "resolution", "agree"], 0.4),
    ]

    tension_curve: List[float] = []
    for para in paragraphs:
        para_lower = para.lower()
        tension = 0.0
        for kw_set, weight in tension_kw_sets:
            hits = sum(1 for kw in kw_set if kw in para_lower)
            tension += hits * weight
        tension_curve.append(min(tension / 5.0, 1.0))

    # Climax detection: where is maximum tension?
    climax_pos = (
        tension_curve.index(max(tension_curve)) / total_paras if tension_curve else 0.5
    )
    # Ideal climax is around 60-80% through the document
    climax_well_placed = 0.5 <= climax_pos <= 0.85
    checks.append(
        ValidationCheck(
            id="NARRATIVE-001",
            description="Climax positioned in latter half (builds tension correctly)",
            category="narrative",
            severity=Severity.WARNING,
            passed=climax_well_placed,
            message=f"Climax at {climax_pos:.0%} through document ({'ideal' if climax_well_placed else 'too early/late'})",
            layer=5,
        )
    )

    # Resolution strength
    last_quarter = (
        paragraphs[int(total_paras * 0.75) :] if total_paras > 3 else paragraphs[-1:]
    )
    resolution_kw = [
        "resolution",
        "settle",
        "agree",
        "propose",
        "offer",
        "move forward",
    ]
    resolution_hits = sum(
        1 for p in last_quarter for kw in resolution_kw if kw in p.lower()
    )
    has_resolution = resolution_hits >= 2
    checks.append(
        ValidationCheck(
            id="NARRATIVE-002",
            description="Document resolves with clear call to action",
            category="narrative",
            severity=Severity.CRITICAL,
            passed=has_resolution,
            message=f"Resolution signals in final quarter: {resolution_hits}",
            layer=5,
        )
    )

    # Emotional beats
    emotional_map = {
        "empathy": ["understand", "appreciate", "recognize", "acknowledge"],
        "urgency": ["deadline", "immediately", "critical", "urgent"],
        "authority": ["court", "statute", "pursuant", "judgment"],
        "vulnerability": ["suffered", "hardship", "health", "harm"],
        "confidence": ["documented", "evidence", "proven", "demonstrated"],
    }
    beats_found = {}
    for beat, keywords in emotional_map.items():
        hits = sum(1 for kw in keywords if kw in content.lower())
        if hits > 0:
            beats_found[beat] = hits
    has_diverse_beats = len(beats_found) >= 3
    checks.append(
        ValidationCheck(
            id="NARRATIVE-003",
            description="Contains diverse emotional beats (empathy + authority + urgency)",
            category="narrative",
            severity=Severity.WARNING,
            passed=has_diverse_beats,
            message=f"Emotional beats: {list(beats_found.keys())} ({len(beats_found)}/5)",
            layer=5,
        )
    )

    # Signal-to-noise ratio
    words = content.split()
    word_count = len(words)
    filler_words = [
        "very",
        "really",
        "quite",
        "just",
        "basically",
        "actually",
        "literally",
        "obviously",
    ]
    filler_count = sum(1 for w in words if w.lower().strip(".,;:!?") in filler_words)
    snr = 1.0 - (filler_count / max(word_count, 1))
    high_snr = snr >= 0.97
    checks.append(
        ValidationCheck(
            id="NARRATIVE-004",
            description="High signal-to-noise ratio (minimal filler words)",
            category="narrative",
            severity=Severity.INFO,
            passed=high_snr,
            message=f"SNR: {snr:.1%} (filler: {filler_count}/{word_count})",
            layer=5,
        )
    )

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    verdict = (
        Verdict.APPROVE
        if passed_count >= 3
        else (
            Verdict.CONDITIONAL_APPROVE if passed_count >= 2 else Verdict.NEEDS_REVISION
        )
    )

    return StrategicRoleResult(
        role=StrategicRole.NARRATIVE_DESIGNER,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={
            "narrative_arc": {
                "tension_curve": [round(t, 2) for t in tension_curve[:20]],
                "climax_position": round(climax_pos, 2),
                "resolution_strength": resolution_hits,
                "emotional_beats": beats_found,
                "snr_ratio": round(snr, 4),
            }
        },
    )


def validate_emotional_intelligence(content: str) -> StrategicRoleResult:
    """ROLE 26: Emotional Intelligence — empathy mapping and emotional journey."""
    checks: List[ValidationCheck] = []

    # Empathy demonstration
    empathy_kw = [
        "i understand",
        "i recognize",
        "i appreciate",
        "i acknowledge",
        "from your perspective",
        "business interests",
        "financial constraints",
    ]
    empathy_count = sum(1 for kw in empathy_kw if kw in content.lower())
    has_empathy = empathy_count >= 2
    checks.append(
        ValidationCheck(
            id="EI-001",
            description="Demonstrates empathy for opposing party's position",
            category="emotional_intelligence",
            severity=Severity.WARNING,
            passed=has_empathy,
            message=f"Empathy expressions: {empathy_count}/7",
            layer=5,
        )
    )

    # Professional composure (no emotional volatility)
    volatile_kw = [
        "outrageous",
        "unacceptable",
        "disgusting",
        "furious",
        "enraged",
        "appalled",
        "ridiculous",
    ]
    volatile_count = sum(1 for kw in volatile_kw if kw in content.lower())
    has_composure = volatile_count == 0
    checks.append(
        ValidationCheck(
            id="EI-002",
            description="Maintains professional composure (no emotional volatility)",
            category="emotional_intelligence",
            severity=Severity.CRITICAL,
            passed=has_composure,
            message="Composed"
            if has_composure
            else f"Volatile language detected: {volatile_count} instances",
            layer=5,
        )
    )

    # Firm but respectful tone
    firm_kw = [
        "respectfully",
        "pursuant to",
        "documented",
        "i maintain",
        "evidence shows",
    ]
    firm_count = sum(1 for kw in firm_kw if kw in content.lower())
    respect_kw = ["respectfully", "sincerely", "please", "thank", "appreciate"]
    respect_count = sum(1 for kw in respect_kw if kw in content.lower())
    balanced = firm_count >= 1 and respect_count >= 1
    checks.append(
        ValidationCheck(
            id="EI-003",
            description="Balances firmness with respect",
            category="emotional_intelligence",
            severity=Severity.WARNING,
            passed=balanced,
            message=f"Firm: {firm_count}, Respectful: {respect_count}",
            layer=5,
        )
    )

    # Steelmanning (acknowledging opponent's strongest argument)
    steelman_kw = [
        "even if",
        "acknowledging",
        "regardless of",
        "while I understand",
        "despite",
        "notwithstanding",
        "irrespective",
    ]
    steelman_count = sum(1 for kw in steelman_kw if kw in content.lower())
    has_steelman = steelman_count >= 1
    checks.append(
        ValidationCheck(
            id="EI-004",
            description="Steelmans opponent's position (preempts counterarguments)",
            category="emotional_intelligence",
            severity=Severity.INFO,
            passed=has_steelman,
            message=f"Steelman signals: {steelman_count}",
            layer=5,
        )
    )

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    verdict = (
        Verdict.APPROVE
        if passed_count >= 3
        else (
            Verdict.CONDITIONAL_APPROVE if passed_count >= 2 else Verdict.NEEDS_REVISION
        )
    )

    return StrategicRoleResult(
        role=StrategicRole.EMOTIONAL_INTELLIGENCE,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={
            "empathy_score": empathy_count,
            "composure_score": 10 - volatile_count,
            "firmness": firm_count,
            "respect": respect_count,
            "steelman_count": steelman_count,
        },
    )


def validate_information_theory(content: str) -> StrategicRoleResult:
    """ROLE 27: Information Theorist — signal-to-noise, entropy, information density."""
    checks: List[ValidationCheck] = []

    words = content.split()
    word_count = max(len(words), 1)
    char_count = max(len(content), 1)

    # 1. Information density (unique words / total words)
    unique_words = len(set(w.lower().strip(".,;:!?\"'()[]") for w in words))
    info_density = unique_words / word_count
    high_density = info_density >= 0.35
    checks.append(
        ValidationCheck(
            id="INFO-001",
            description="Information density (vocabulary richness)",
            category="information_theory",
            severity=Severity.INFO,
            passed=high_density,
            message=f"Density: {info_density:.2%} ({unique_words} unique / {word_count} total)",
            layer=5,
        )
    )

    # 2. Redundancy rate (repeated phrases)
    bigrams = [
        f"{words[i].lower()} {words[i + 1].lower()}" for i in range(len(words) - 1)
    ]
    bigram_counts: Dict[str, int] = {}
    for bg in bigrams:
        bigram_counts[bg] = bigram_counts.get(bg, 0) + 1
    repeated_bigrams = sum(1 for count in bigram_counts.values() if count > 2)
    low_redundancy = repeated_bigrams < (word_count * 0.02)
    checks.append(
        ValidationCheck(
            id="INFO-002",
            description="Low redundancy (minimal repetitive phrases)",
            category="information_theory",
            severity=Severity.WARNING,
            passed=low_redundancy,
            message=f"Repeated bigrams (>2x): {repeated_bigrams}",
            layer=5,
        )
    )

    # 3. Structure entropy (section distribution)
    sections = re.split(r"\n#{1,3}\s", content)
    section_lengths = [len(s.split()) for s in sections if s.strip()]
    if section_lengths:
        section_probs = [l / sum(section_lengths) for l in section_lengths]
        structure_entropy = _shannon_entropy(section_probs)
        max_entropy = (
            math.log2(max(len(section_probs), 1)) if len(section_probs) > 1 else 1.0
        )
        normalised = structure_entropy / max_entropy if max_entropy > 0 else 0
    else:
        normalised = 0.0
    balanced_structure = normalised >= 0.6
    checks.append(
        ValidationCheck(
            id="INFO-003",
            description="Balanced section distribution (even information spread)",
            category="information_theory",
            severity=Severity.INFO,
            passed=balanced_structure,
            message=f"Structure entropy: {normalised:.2f} (1.0 = perfectly balanced, ≥0.6 target)",
            layer=5,
        )
    )

    # 4. Key information presence (case-critical data points)
    critical_data = [
        (r"26CV005596-590", "Case number"),
        (r"\$[\d,]+", "Dollar amount"),
        (r"(?:deadline|hearing|trial)\s*:?\s*\w+", "Deadline/hearing date"),
        (r"N\.C\.G\.S\.\s*§|N\.C\.\s*Gen\.\s*Stat", "Statute citation"),
    ]
    critical_found = []
    for pattern, label in critical_data:
        if re.search(pattern, content, re.IGNORECASE):
            critical_found.append(label)
    has_critical = len(critical_found) >= 2
    checks.append(
        ValidationCheck(
            id="INFO-004",
            description="Contains critical data points (case#, amounts, dates, statutes)",
            category="information_theory",
            severity=Severity.CRITICAL,
            passed=has_critical,
            message=f"Critical data: {critical_found} ({len(critical_found)}/4)",
            layer=5,
        )
    )

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    verdict = (
        Verdict.APPROVE
        if passed_count >= 3
        else (
            Verdict.CONDITIONAL_APPROVE if passed_count >= 2 else Verdict.NEEDS_REVISION
        )
    )

    return StrategicRoleResult(
        role=StrategicRole.INFORMATION_THEORIST,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={
            "info_density": round(info_density, 4),
            "redundancy_rate": repeated_bigrams,
            "structure_entropy": round(normalised, 4),
            "critical_data_points": critical_found,
            "snr_ratio": round(
                info_density * (1 - repeated_bigrams / max(word_count, 1)), 4
            ),
        },
    )


def validate_patent_examiner(content: str) -> StrategicRoleResult:
    """ROLE 28: Patent Examiner — prior art, novelty, non-obviousness of legal approach."""
    checks: List[ValidationCheck] = []

    # Prior art: case law citations
    case_citations = re.findall(
        r"[A-Z][a-z]+\s+v\.?\s+[A-Z][a-z]+|"
        r"\d+\s+N\.C\.\s+(?:App\.\s+)?\d+|"
        r"\d+\s+S\.E\.(?:2d)?\s+\d+",
        content,
    )
    has_prior_art = len(case_citations) >= 2
    checks.append(
        ValidationCheck(
            id="PATENT-001",
            description="Prior art (case law citations) sufficient",
            category="patent_examination",
            severity=Severity.WARNING,
            passed=has_prior_art,
            message=f"Case citations found: {len(case_citations)}",
            evidence={"citations": case_citations[:10]},
            layer=5,
        )
    )

    # Novelty: unique arguments not in standard templates
    novel_kw = [
        "creative",
        "novel",
        "unique approach",
        "innovative",
        "unconventional",
        "new perspective",
        "first impression",
        "systemic analysis",
        "evidence-based",
        "pro se",
    ]
    novel_count = sum(1 for kw in novel_kw if kw in content.lower())
    has_novelty = novel_count >= 2
    checks.append(
        ValidationCheck(
            id="PATENT-002",
            description="Novelty of legal approach (beyond boilerplate)",
            category="patent_examination",
            severity=Severity.INFO,
            passed=has_novelty,
            message=f"Novel approach indicators: {novel_count}/10",
            layer=5,
        )
    )

    # Non-obviousness: multi-theory approach
    theories = [
        "habitability",
        "constructive eviction",
        "udap",
        "udtp",
        "fraud",
        "breach of contract",
        "negligence",
        "punitive",
        "treble",
        "retaliation",
    ]
    theory_count = sum(1 for t in theories if t in content.lower())
    has_multi_theory = theory_count >= 3
    checks.append(
        ValidationCheck(
            id="PATENT-003",
            description="Non-obvious (multi-theory legal approach)",
            category="patent_examination",
            severity=Severity.WARNING,
            passed=has_multi_theory,
            message=f"Legal theories invoked: {theory_count}/10",
            layer=5,
        )
    )

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    verdict = Verdict.APPROVE if passed_count >= 2 else Verdict.CONDITIONAL_APPROVE

    return StrategicRoleResult(
        role=StrategicRole.PATENT_EXAMINER,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={
            "prior_art_citations": case_citations[:10],
            "novelty_score": novel_count,
            "theory_count": theory_count,
        },
    )


def validate_portfolio_strategist(
    content: str, context: Optional[Dict[str, Any]] = None
) -> StrategicRoleResult:
    """ROLE 29: Portfolio Strategist — risk/return across settlement options."""
    checks: List[ValidationCheck] = []
    ctx = context or {}

    # Multiple settlement options presented
    option_kw = [
        "option",
        "alternative",
        "scenario",
        "approach",
        "plan a",
        "plan b",
        "if.*then",
        "contingency",
    ]
    option_count = sum(1 for kw in option_kw if re.search(kw, content.lower()))
    has_options = option_count >= 2
    checks.append(
        ValidationCheck(
            id="PORTFOLIO-001",
            description="Presents multiple settlement options (diversified portfolio)",
            category="portfolio_strategy",
            severity=Severity.WARNING,
            passed=has_options,
            message=f"Option indicators: {option_count}",
            layer=5,
        )
    )

    # Risk-adjusted return framing
    risk_return_kw = [
        "risk",
        "return",
        "cost",
        "benefit",
        "upside",
        "downside",
        "exposure",
        "worst case",
        "best case",
    ]
    rr_count = sum(1 for kw in risk_return_kw if kw in content.lower())
    has_risk_return = rr_count >= 3
    checks.append(
        ValidationCheck(
            id="PORTFOLIO-002",
            description="Risk-adjusted return framing present",
            category="portfolio_strategy",
            severity=Severity.WARNING,
            passed=has_risk_return,
            message=f"Risk/return language: {rr_count}/9",
            layer=5,
        )
    )

    # Escalation path (fallback strategy)
    escalation_kw = [
        "if no response",
        "failing settlement",
        "proceed to",
        "escalate",
        "litigation",
        "court hearing",
        "trial",
        "appeal",
        "next step",
    ]
    esc_count = sum(1 for kw in escalation_kw if kw in content.lower())
    has_escalation = esc_count >= 2
    checks.append(
        ValidationCheck(
            id="PORTFOLIO-003",
            description="Escalation path defined (fallback if settlement fails)",
            category="portfolio_strategy",
            severity=Severity.CRITICAL,
            passed=has_escalation,
            message=f"Escalation signals: {esc_count}/9",
            layer=5,
        )
    )

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    verdict = Verdict.APPROVE if passed_count >= 2 else Verdict.CONDITIONAL_APPROVE

    return StrategicRoleResult(
        role=StrategicRole.PORTFOLIO_STRATEGIST,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={
            "options_presented": option_count,
            "risk_return_signals": rr_count,
            "escalation_strength": esc_count,
        },
    )


def validate_temporal_accuracy(
    content: str, reference_time: Optional[datetime] = None
) -> StrategicRoleResult:
    """ROLE 30: Temporal Validator — date arithmetic, calendar verification, deadlines."""
    checks: List[ValidationCheck] = []
    ref = reference_time or datetime.now()
    errors: List[str] = []
    calendar_mismatches: List[str] = []
    deadline_calcs: Dict[str, Any] = {}

    # Extract all dates
    dates_in_doc = _extract_dates(content)
    checks.append(
        ValidationCheck(
            id="TEMPORAL-001",
            description="Date references found and parseable",
            category="temporal",
            severity=Severity.INFO,
            passed=len(dates_in_doc) >= 1,
            message=f"Dates found: {len(dates_in_doc)}",
            evidence={"dates": [(str(d), s) for d, s, _ in dates_in_doc[:10]]},
            layer=5,
        )
    )

    # Day-of-week verification
    dow_matches = _DAYOFWEEK_PATTERN.findall(content)
    for claimed_day, date_str in dow_matches:
        parsed_dates = _extract_dates(date_str)
        if parsed_dates:
            actual_date = parsed_dates[0][0]
            actual_day = calendar.day_name[actual_date.weekday()]
            if claimed_day.lower() != actual_day.lower():
                mismatch = f"'{claimed_day}, {date_str}' — actual day is {actual_day}"
                calendar_mismatches.append(mismatch)

    no_cal_errors = len(calendar_mismatches) == 0
    checks.append(
        ValidationCheck(
            id="TEMPORAL-002",
            description="Day-of-week matches actual calendar",
            category="temporal",
            severity=Severity.CRITICAL,
            passed=no_cal_errors,
            message="All days correct"
            if no_cal_errors
            else f"Mismatches: {calendar_mismatches}",
            layer=5,
        )
    )

    # Hours-from arithmetic
    hours_matches = _HOURS_FROM_PATTERN.findall(content)
    for hours_str, direction, anchor in hours_matches:
        try:
            hours = int(hours_str)
            if hours > 0:
                # Flag suspicious "48 hours" claims near weekends
                if hours in (24, 48, 72):
                    note = f"{hours} hours {direction} {anchor} — verify this doesn't land on a weekend"
                    errors.append(note)
        except ValueError:
            pass

    no_arith_errors = len(errors) == 0
    checks.append(
        ValidationCheck(
            id="TEMPORAL-003",
            description="Hour-based arithmetic is plausible",
            category="temporal",
            severity=Severity.WARNING,
            passed=no_arith_errors,
            message="No arithmetic concerns"
            if no_arith_errors
            else f"Warnings: {errors}",
            layer=5,
        )
    )

    # Deadline proximity check
    known_deadlines = {
        "settlement": re.search(
            r"[Ss]ettlement\s+[Dd]eadline[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})",
            content,
        ),
        "hearing": re.search(
            r"[Cc]ourt\s+[Hh]earing[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})",
            content,
        ),
    }

    for deadline_name, match in known_deadlines.items():
        if match:
            deadline_dates = _extract_dates(match.group(1))
            if deadline_dates:
                d = deadline_dates[0][0]
                delta = (d - ref.date()).days
                bdays = _business_days_between(ref.date(), d)
                deadline_calcs[deadline_name] = {
                    "date": str(d),
                    "days_remaining": delta,
                    "business_days": bdays,
                    "is_past": delta < 0,
                }
                if delta < 0:
                    errors.append(
                        f"{deadline_name} deadline ({d}) has PASSED ({abs(delta)} days ago)"
                    )

    has_deadline_info = len(deadline_calcs) >= 1
    past_deadlines = [v for v in deadline_calcs.values() if v.get("is_past")]
    checks.append(
        ValidationCheck(
            id="TEMPORAL-004",
            description="Deadline calculations accurate and not expired",
            category="temporal",
            severity=Severity.CRITICAL,
            passed=has_deadline_info and len(past_deadlines) == 0,
            message=f"Deadlines: {list(deadline_calcs.keys())}; Past: {len(past_deadlines)}",
            evidence={"deadlines": deadline_calcs},
            layer=5,
        )
    )

    # Chronological ordering
    if len(dates_in_doc) >= 2:
        sorted_dates = sorted(dates_in_doc, key=lambda x: x[2])  # by position
        out_of_order = 0
        for i in range(1, len(sorted_dates)):
            if sorted_dates[i][0] < sorted_dates[i - 1][0]:
                out_of_order += 1
        chronological = out_of_order <= 1  # allow 1 (flashback / reference)
    else:
        chronological = True

    checks.append(
        ValidationCheck(
            id="TEMPORAL-005",
            description="Dates appear in roughly chronological order",
            category="temporal",
            severity=Severity.INFO,
            passed=chronological,
            message="Chronological"
            if chronological
            else f"Out-of-order dates: {out_of_order}",
            layer=5,
        )
    )

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    total_days = 0.0
    bdays = 0
    if deadline_calcs:
        first_deadline = list(deadline_calcs.values())[0]
        total_days = first_deadline.get("days_remaining", 0)
        bdays = first_deadline.get("business_days", 0)

    temporal_result = TemporalValidationResult(
        date_arithmetic_errors=errors,
        calendar_mismatches=calendar_mismatches,
        deadline_calculations=deadline_calcs,
        business_days=bdays,
        total_days=total_days,
        timestamps_found=[{"date": str(d), "original": s} for d, s, _ in dates_in_doc],
        is_valid=passed_count >= 4,
    )

    verdict = (
        Verdict.APPROVE
        if passed_count >= 4
        else (
            Verdict.CONDITIONAL_APPROVE if passed_count >= 3 else Verdict.NEEDS_REVISION
        )
    )

    return StrategicRoleResult(
        role=StrategicRole.TEMPORAL_VALIDATOR,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={"temporal": temporal_result.__dict__},
    )


def validate_systemic_indifference(
    content: str,
    case_history: Optional[List[Dict[str, Any]]] = None,
) -> StrategicRoleResult:
    """ROLE 31: Systemic Indifference Analyzer — multi-org pattern matching."""
    checks: List[ValidationCheck] = []
    history = case_history or []
    content_lower = content.lower()

    # 1. Detect organisations mentioned
    orgs_found: Dict[str, int] = {}
    for org_name in _KNOWN_ORGS:
        count = content_lower.count(org_name.lower())
        if count > 0:
            orgs_found[org_name] = count
    checks.append(
        ValidationCheck(
            id="SYSTEMIC-001",
            description="Organisations identified in document",
            category="systemic_indifference",
            severity=Severity.INFO,
            passed=len(orgs_found) >= 1,
            message=f"Orgs found: {list(orgs_found.keys())} ({len(orgs_found)})",
            layer=5,
        )
    )

    # 2. Organisational depth (levels of failure)
    levels_found: Dict[str, List[str]] = {}
    for level, keywords in _ORG_LEVEL_KEYWORDS.items():
        for kw in keywords:
            if kw in content_lower:
                levels_found.setdefault(level, []).append(kw)
    org_depth = len(levels_found)
    has_depth = org_depth >= 2
    checks.append(
        ValidationCheck(
            id="SYSTEMIC-002",
            description="Multiple organisational levels implicated (≥2)",
            category="systemic_indifference",
            severity=Severity.CRITICAL,
            passed=has_depth,
            message=f"Org levels: {list(levels_found.keys())} ({org_depth}/4)",
            evidence={"levels": {k: v for k, v in levels_found.items()}},
            layer=5,
        )
    )

    # 3. Recurring issue types
    issues_found: List[str] = []
    for issue in _SYSTEMIC_ISSUE_TYPES:
        if issue in content_lower:
            issues_found.append(issue)
    has_recurring = len(issues_found) >= 2
    checks.append(
        ValidationCheck(
            id="SYSTEMIC-003",
            description="Recurring issue types detected (≥2 categories)",
            category="systemic_indifference",
            severity=Severity.CRITICAL,
            passed=has_recurring,
            message=f"Issue types: {issues_found} ({len(issues_found)})",
            layer=5,
        )
    )

    # 4. Delay tactics
    delay_tactics_found: List[str] = []
    for pattern, label in _DELAY_TACTIC_PATTERNS:
        if re.search(pattern, content_lower):
            delay_tactics_found.append(label)
    has_delay = len(delay_tactics_found) >= 1
    checks.append(
        ValidationCheck(
            id="SYSTEMIC-004",
            description="Delay tactics or pattern-of-neglect indicators",
            category="systemic_indifference",
            severity=Severity.WARNING,
            passed=has_delay,
            message=f"Delay tactics: {delay_tactics_found}"
            if has_delay
            else "No explicit delay patterns",
            layer=5,
        )
    )

    # 5. Quantified pattern strength
    number_matches = re.findall(
        r"(\d+)\+?\s+(?:request|work\s*order|complaint|incident|report)", content_lower
    )
    pattern_counts = [int(n) for n in number_matches if int(n) > 1]
    max_count = max(pattern_counts) if pattern_counts else 0
    high_volume = max_count >= 10
    checks.append(
        ValidationCheck(
            id="SYSTEMIC-005",
            description="Quantified pattern volume (≥10 incidents documented)",
            category="systemic_indifference",
            severity=Severity.CRITICAL,
            passed=high_volume,
            message=f"Max documented incidents: {max_count}",
            layer=5,
        )
    )

    # 6. Timeline span
    dates_in_doc = _extract_dates(content)
    timeline_months = 0
    if len(dates_in_doc) >= 2:
        earliest = min(d for d, _, _ in dates_in_doc)
        latest = max(d for d, _, _ in dates_in_doc)
        timeline_months = (latest.year - earliest.year) * 12 + (
            latest.month - earliest.month
        )
    long_timeline = timeline_months >= 6
    checks.append(
        ValidationCheck(
            id="SYSTEMIC-006",
            description="Timeline span ≥ 6 months (establishes pattern, not isolated event)",
            category="systemic_indifference",
            severity=Severity.CRITICAL,
            passed=long_timeline,
            message=f"Timeline: {timeline_months} months",
            layer=5,
        )
    )

    # Calculate systemic score (0-40 scale)
    score_components = {
        "org_depth": min(org_depth * 5, 10),
        "issue_types": min(len(issues_found) * 3, 10),
        "volume": min(max_count, 10),
        "timeline": min(timeline_months, 10),
    }
    systemic_score = sum(score_components.values())

    # Determine evidence strength and litigation readiness
    if systemic_score >= 35:
        evidence_strength = "OVERWHELMING"
        litigation_readiness = "LITIGATION-READY"
    elif systemic_score >= 25:
        evidence_strength = "STRONG"
        litigation_readiness = "LITIGATION-READY"
    elif systemic_score >= 15:
        evidence_strength = "MODERATE"
        litigation_readiness = "SETTLEMENT-ONLY"
    elif systemic_score >= 8:
        evidence_strength = "WEAK"
        litigation_readiness = "DEFER"
    else:
        evidence_strength = "INSUFFICIENT"
        litigation_readiness = "NOT SYSTEMIC"

    # Build org details from case_history if available
    org_details: Dict[str, Dict[str, Any]] = {}
    for entry in history:
        org = entry.get("organization", "Unknown")
        org_details[org] = {
            "score": entry.get("score", 0),
            "max_score": entry.get("max_score", 40),
            "evidence_count": entry.get("evidence_count", 0),
            "timeline_months": entry.get("timeline_months", 0),
            "status": entry.get("status", "UNKNOWN"),
        }

    # If no history provided, build from content analysis
    if not org_details and orgs_found:
        for org in orgs_found:
            org_info = _KNOWN_ORGS.get(org, {"levels": 1})
            org_details[org] = {
                "mentions": orgs_found[org],
                "expected_levels": org_info.get("levels", 1),
                "detected_levels": org_depth,
                "systemic_score": systemic_score
                if org == list(orgs_found.keys())[0]
                else 0,
            }

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    systemic_result = SystemicIndifferenceResult(
        pattern_count=max_count,
        organizations=list(orgs_found.keys()),
        systemic_score=systemic_score,
        evidence_strength=evidence_strength,
        litigation_readiness=litigation_readiness,
        org_details=org_details,
        cross_org_patterns=issues_found,
        delay_tactics_detected=delay_tactics_found,
    )

    verdict = (
        Verdict.APPROVE
        if systemic_score >= 25
        else (
            Verdict.CONDITIONAL_APPROVE
            if systemic_score >= 15
            else Verdict.NEEDS_REVISION
        )
    )

    return StrategicRoleResult(
        role=StrategicRole.SYSTEMIC_INDIFFERENCE,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={
            "systemic": systemic_result.__dict__,
            "score_components": score_components,
        },
    )


def validate_strategic_diversity(
    content: str,
    context: Optional[Dict[str, Any]] = None,
) -> StrategicRoleResult:
    """ROLE 32: Strategic Diversity Generator — Pass@K optimisation."""
    checks: List[ValidationCheck] = []
    ctx = context or {}

    # Generate strategy evaluations against the content
    evaluated_strategies: List[Dict[str, Any]] = []
    content_lower = content.lower()

    for template in _STRATEGY_TEMPLATES:
        # Score how well the content already addresses this strategy
        relevance_kw = template["description"].lower().split()
        hits = sum(
            1 for word in relevance_kw if len(word) > 4 and word in content_lower
        )
        coverage = min(hits / max(len(relevance_kw), 1), 1.0)

        # Calculate WSJF for this strategy
        time_crit = template.get("time_sensitivity", 5)
        lit_val = template.get("litigation_value", 5)
        risk_factor = {"LOW": 3, "MEDIUM": 5, "HIGH": 8}.get(
            template.get("risk", "MEDIUM"), 5
        )
        cost_of_delay = time_crit + lit_val + risk_factor
        job_size = max(2, 10 - coverage * 8)  # already-covered = small job
        wsjf = cost_of_delay / job_size

        evaluated_strategies.append(
            {
                **template,
                "coverage": round(coverage, 3),
                "wsjf": round(wsjf, 2),
                "cost_of_delay": cost_of_delay,
            }
        )

    # Sort by WSJF
    evaluated_strategies.sort(key=lambda s: s["wsjf"], reverse=True)

    # Entropy calculation across strategies
    coverages = [s["coverage"] for s in evaluated_strategies]
    entropy_scores = []
    for cov in coverages:
        # Entropy is highest when coverage is uncertain (near 0.5)
        ent = -cov * math.log2(max(cov, 0.01)) - (1 - cov) * math.log2(
            max(1 - cov, 0.01)
        )
        entropy_scores.append(round(ent, 4))

    # Pass@K: what fraction of top-K strategies are well-covered?
    k = min(5, len(evaluated_strategies))
    top_k = evaluated_strategies[:k]
    pass_at_k = sum(1 for s in top_k if s["coverage"] >= 0.3) / max(k, 1)

    # Diversity index: pairwise dissimilarity of strategy descriptions
    fingerprints = [_text_fingerprint(s["description"]) for s in evaluated_strategies]
    if len(fingerprints) >= 2:
        similarities = []
        for i in range(len(fingerprints)):
            for j in range(i + 1, len(fingerprints)):
                similarities.append(
                    _cosine_similarity(fingerprints[i], fingerprints[j])
                )
        avg_sim = sum(similarities) / max(len(similarities), 1)
        diversity_index = 1.0 - avg_sim
    else:
        diversity_index = 0.0

    # Coverage gaps: strategies with low coverage
    coverage_gaps = [s["label"] for s in evaluated_strategies if s["coverage"] < 0.15]

    # Checks
    checks.append(
        ValidationCheck(
            id="DIVERSITY-001",
            description=f"Strategic diversity: {len(evaluated_strategies)} alternatives generated",
            category="strategic_diversity",
            severity=Severity.WARNING,
            passed=len(evaluated_strategies) >= 10,
            message=f"{len(evaluated_strategies)} strategies evaluated",
            layer=5,
        )
    )

    checks.append(
        ValidationCheck(
            id="DIVERSITY-002",
            description=f"Pass@{k} score ≥ 0.5 (top strategies have coverage)",
            category="strategic_diversity",
            severity=Severity.WARNING,
            passed=pass_at_k >= 0.5,
            message=f"Pass@{k}: {pass_at_k:.1%}",
            layer=5,
        )
    )

    checks.append(
        ValidationCheck(
            id="DIVERSITY-003",
            description="Diversity index ≥ 0.3 (strategies are meaningfully different)",
            category="strategic_diversity",
            severity=Severity.INFO,
            passed=diversity_index >= 0.3,
            message=f"Diversity index: {diversity_index:.2f}",
            layer=5,
        )
    )

    checks.append(
        ValidationCheck(
            id="DIVERSITY-004",
            description="Coverage gaps < 50% of strategies",
            category="strategic_diversity",
            severity=Severity.WARNING,
            passed=len(coverage_gaps) < len(evaluated_strategies) / 2,
            message=f"Under-covered strategies: {coverage_gaps[:5]}",
            layer=5,
        )
    )

    # Recommended approach = top WSJF
    recommended = evaluated_strategies[0] if evaluated_strategies else {}

    diversity_result = StrategicDiversityResult(
        alternatives=evaluated_strategies,
        entropy_scores=entropy_scores,
        pass_k_score=round(pass_at_k, 4),
        recommended_approach=recommended,
        confidence=round(pass_at_k * 100, 1),
        diversity_index=round(diversity_index, 4),
        coverage_gaps=coverage_gaps,
    )

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    verdict = (
        Verdict.APPROVE
        if passed_count >= 3
        else (
            Verdict.CONDITIONAL_APPROVE if passed_count >= 2 else Verdict.NEEDS_REVISION
        )
    )

    return StrategicRoleResult(
        role=StrategicRole.STRATEGIC_DIVERSITY,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={"diversity": diversity_result.__dict__},
    )


def validate_mgpo_optimizer(
    content: str,
    strategies: Optional[List[Dict[str, Any]]] = None,
    entropy_weight: float = 0.7,
) -> StrategicRoleResult:
    """ROLE 33: MGPO Optimizer — entropy-guided reinforcement learning selection."""
    checks: List[ValidationCheck] = []

    # If no strategies provided, generate them from the diversity validator
    if not strategies:
        diversity_result = validate_strategic_diversity(content)
        diversity_data = diversity_result.analysis.get("diversity", {})
        strategies = diversity_data.get("alternatives", _STRATEGY_TEMPLATES)

    # MGPO scoring: combine WSJF with entropy weighting
    scored: List[Dict[str, Any]] = []
    for strategy in strategies:
        wsjf = strategy.get("wsjf", 0)
        coverage = strategy.get("coverage", 0.5)

        # Entropy: highest value where coverage is most uncertain
        if 0 < coverage < 1:
            entropy = -coverage * math.log2(coverage) - (1 - coverage) * math.log2(
                1 - coverage
            )
        else:
            entropy = 0.0

        # MGPO score = (1 - entropy_weight) * wsjf_normalised + entropy_weight * entropy
        wsjf_norm = min(wsjf / 10.0, 1.0) if wsjf > 0 else 0
        mgpo_score = (1 - entropy_weight) * wsjf_norm + entropy_weight * entropy

        scored.append(
            {
                **strategy,
                "entropy": round(entropy, 4),
                "mgpo_score": round(mgpo_score, 4),
            }
        )

    scored.sort(key=lambda s: s["mgpo_score"], reverse=True)

    # Top pick
    optimal = scored[0] if scored else {}
    runner_up = scored[1] if len(scored) > 1 else {}

    # Gap between top two (confidence in selection)
    selection_gap = abs(optimal.get("mgpo_score", 0) - runner_up.get("mgpo_score", 0))
    confident_selection = selection_gap > 0.05

    checks.append(
        ValidationCheck(
            id="MGPO-001",
            description="MGPO selection has clear winner (gap > 0.05)",
            category="mgpo_optimization",
            severity=Severity.WARNING,
            passed=confident_selection,
            message=f"Selection gap: {selection_gap:.4f} ({'decisive' if confident_selection else 'close call'})",
            layer=5,
        )
    )

    # Entropy-focused: is MGPO prioritising uncertain regions?
    top_3_entropy = [s.get("entropy", 0) for s in scored[:3]]
    avg_top_entropy = sum(top_3_entropy) / max(len(top_3_entropy), 1)
    entropy_focused = avg_top_entropy >= 0.4
    checks.append(
        ValidationCheck(
            id="MGPO-002",
            description="MGPO focuses on uncertain regions (avg entropy ≥ 0.4)",
            category="mgpo_optimization",
            severity=Severity.INFO,
            passed=entropy_focused,
            message=f"Avg top-3 entropy: {avg_top_entropy:.3f}",
            layer=5,
        )
    )

    # Strategy is actionable
    optimal_label = optimal.get("label", "")
    optimal_desc = optimal.get("description", "")
    actionable = len(optimal_desc) > 20 and optimal.get("mgpo_score", 0) > 0
    checks.append(
        ValidationCheck(
            id="MGPO-003",
            description="Selected strategy is actionable (has description + positive score)",
            category="mgpo_optimization",
            severity=Severity.CRITICAL,
            passed=actionable,
            message=f"Optimal: {optimal_label} (score {optimal.get('mgpo_score', 0):.3f})",
            layer=5,
        )
    )

    passed_count = sum(1 for c in checks if c.passed)
    confidence = (passed_count / len(checks)) * 100 if checks else 0

    verdict = Verdict.APPROVE if passed_count >= 2 else Verdict.CONDITIONAL_APPROVE

    return StrategicRoleResult(
        role=StrategicRole.MGPO_OPTIMIZER,
        checks=checks,
        verdict=verdict,
        confidence=confidence,
        analysis={
            "optimal_strategy": optimal,
            "runner_up": runner_up,
            "selection_gap": round(selection_gap, 4),
            "entropy_weight": entropy_weight,
            "all_scored": scored[:5],  # top 5
        },
    )


# ═════════════════════════════════════════════════════════════════════════════
# DISPATCHER: role enum → validator function
# ═════════════════════════════════════════════════════════════════════════════

_ROLE_VALIDATORS = {
    StrategicRole.GAME_THEORIST: validate_game_theory,
    StrategicRole.BEHAVIORAL_ECONOMIST: validate_behavioral_economics,
    StrategicRole.SYSTEMS_THINKER: validate_systems_thinking,
    StrategicRole.NARRATIVE_DESIGNER: validate_narrative_design,
    StrategicRole.EMOTIONAL_INTELLIGENCE: validate_emotional_intelligence,
    StrategicRole.INFORMATION_THEORIST: validate_information_theory,
    StrategicRole.PATENT_EXAMINER: validate_patent_examiner,
    StrategicRole.PORTFOLIO_STRATEGIST: lambda c: validate_portfolio_strategist(c),
    StrategicRole.TEMPORAL_VALIDATOR: lambda c: validate_temporal_accuracy(c),
    StrategicRole.SYSTEMIC_INDIFFERENCE: lambda c: validate_systemic_indifference(c),
    StrategicRole.STRATEGIC_DIVERSITY: lambda c: validate_strategic_diversity(c),
    StrategicRole.MGPO_OPTIMIZER: lambda c: validate_mgpo_optimizer(c),
}


# ═════════════════════════════════════════════════════════════════════════════
# EXTENDED GOVERNANCE COUNCIL (33 ROLES)
# ═════════════════════════════════════════════════════════════════════════════


class GovernanceCouncil33:
    """
    Extended 33-role governance council with strategic validation.

    Layers:
        Layer 1: Circle Orchestration (6 roles)
        Layer 2: Legal Role Simulation (6 roles)
        Layer 3: Government Counsel (5 roles)
        Layer 4: Software Patterns (4 roles)
        Layer 5: Strategic Diversity (12 roles)

    Usage:
        council = GovernanceCouncil33()
        report = council.validate_document(email_content, doc_type="settlement")
        print(f"Consensus: {report['consensus_percentage']:.1f}%")
        print(f"Strategic Diversity Pass@K: {report['strategic_diversity']['pass_k_score']}")
        print(f"Temporal Valid: {report['temporal']['is_valid']}")
        print(f"Systemic Score: {report['systemic']['systemic_score']}/40")
    """

    def __init__(self):
        self.roles = {
            "circles": list(Circle),
            "legal": list(LegalRole),
            "government": list(GovernmentCounsel),
            "software": list(SoftwarePattern),
            "strategic": list(StrategicRole),
        }
        self.total_roles = 33
        self._base_council = GovernanceCouncil()
        self._strategic_results: Dict[StrategicRole, StrategicRoleResult] = {}

    # ─────────────────────────────────────────────────────────────────────────
    # PUBLIC API
    # ─────────────────────────────────────────────────────────────────────────

    def validate_document(
        self,
        content: str,
        doc_type: str = "settlement",
        reference_time: Optional[datetime] = None,
        case_history: Optional[List[Dict[str, Any]]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Run all 33 roles against the document.

        Args:
            content: Full text of the document
            doc_type: "settlement", "court", or "discovery"
            reference_time: For temporal validation (defaults to now)
            case_history: List of org dicts for systemic analysis
            context: Additional context for strategic roles

        Returns:
            Full report dict with all layer results, consensus, and recommendations
        """
        ref_time = reference_time or datetime.now()
        ctx = context or {}

        # ── Layers 1-4: delegate to base council ──
        self._base_council = GovernanceCouncil()
        base_report = self._base_council.run_full_validation(content, doc_type=doc_type)

        # ── Layer 5: Strategic roles (22-33) ──
        strategic_checks: List[ValidationCheck] = []
        self._strategic_results = {}

        for role in StrategicRole:
            if role == StrategicRole.TEMPORAL_VALIDATOR:
                result = validate_temporal_accuracy(content, ref_time)
            elif role == StrategicRole.SYSTEMIC_INDIFFERENCE:
                result = validate_systemic_indifference(content, case_history)
            elif role == StrategicRole.PORTFOLIO_STRATEGIST:
                result = validate_portfolio_strategist(content, ctx)
            elif role == StrategicRole.STRATEGIC_DIVERSITY:
                result = validate_strategic_diversity(content, ctx)
            elif role == StrategicRole.MGPO_OPTIMIZER:
                # Pass strategies from diversity if available
                div_result = self._strategic_results.get(
                    StrategicRole.STRATEGIC_DIVERSITY
                )
                strats = None
                if div_result:
                    strats = div_result.analysis.get("diversity", {}).get(
                        "alternatives"
                    )
                result = validate_mgpo_optimizer(content, strats)
            else:
                validator = _ROLE_VALIDATORS.get(role)
                result = (
                    validator(content) if validator else StrategicRoleResult(role=role)
                )

            self._strategic_results[role] = result
            strategic_checks.extend(result.checks)

        # ── Consensus calculation ──
        all_checks = base_report.get("all_checks", []) + strategic_checks
        total = max(len(all_checks), 1)
        passed = sum(1 for c in all_checks if c.passed)
        consensus_pct = (passed / total) * 100

        # ── Aggregate verdicts ──
        all_verdicts = []
        for role_result in self._strategic_results.values():
            all_verdicts.append(role_result.verdict)
        base_verdicts = base_report.get("verdicts", [])
        if isinstance(base_verdicts, list):
            all_verdicts.extend(base_verdicts)

        approve_count = sum(
            1
            for v in all_verdicts
            if v in (Verdict.APPROVE, Verdict.CONDITIONAL_APPROVE)
        )
        reject_count = sum(1 for v in all_verdicts if v == Verdict.REJECT)

        if reject_count > 0:
            overall_verdict = Verdict.REJECT
        elif consensus_pct >= 90:
            overall_verdict = Verdict.APPROVE
        elif consensus_pct >= 75:
            overall_verdict = Verdict.CONDITIONAL_APPROVE
        else:
            overall_verdict = Verdict.NEEDS_REVISION

        # ── Build report ──
        strategic_summary = {}
        for role, result in self._strategic_results.items():
            strategic_summary[role.name] = {
                "verdict": result.verdict.value,
                "confidence": result.confidence,
                "checks_passed": sum(1 for c in result.checks if c.passed),
                "checks_total": len(result.checks),
                "analysis": result.analysis,
            }

        # Extract key sub-reports
        temporal_data = self._strategic_results.get(
            StrategicRole.TEMPORAL_VALIDATOR,
            StrategicRoleResult(role=StrategicRole.TEMPORAL_VALIDATOR),
        ).analysis.get("temporal", {})
        systemic_data = self._strategic_results.get(
            StrategicRole.SYSTEMIC_INDIFFERENCE,
            StrategicRoleResult(role=StrategicRole.SYSTEMIC_INDIFFERENCE),
        ).analysis.get("systemic", {})
        diversity_data = self._strategic_results.get(
            StrategicRole.STRATEGIC_DIVERSITY,
            StrategicRoleResult(role=StrategicRole.STRATEGIC_DIVERSITY),
        ).analysis.get("diversity", {})
        mgpo_data = self._strategic_results.get(
            StrategicRole.MGPO_OPTIMIZER,
            StrategicRoleResult(role=StrategicRole.MGPO_OPTIMIZER),
        ).analysis

        return {
            "total_roles": self.total_roles,
            "consensus_percentage": round(consensus_pct, 1),
            "overall_verdict": overall_verdict.value,
            "checks_passed": passed,
            "checks_total": total,
            "base_report": base_report,
            "strategic_roles": strategic_summary,
            "temporal": temporal_data,
            "systemic": systemic_data,
            "strategic_diversity": diversity_data,
            "mgpo": mgpo_data,
            "all_checks": all_checks,
            "verdicts": all_verdicts,
            "recommendations": self._generate_recommendations(
                strategic_summary, consensus_pct
            ),
        }

    def validate_strategic_diversity(
        self,
        content: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> StrategicDiversityResult:
        """Public convenience: run only the diversity analysis."""
        result = validate_strategic_diversity(content, context)
        return StrategicDiversityResult(**result.analysis.get("diversity", {}))

    def validate_temporal_accuracy(
        self,
        content: str,
        current_datetime: Optional[str] = None,
    ) -> TemporalValidationResult:
        """Public convenience: run only temporal validation."""
        ref = (
            datetime.fromisoformat(current_datetime)
            if current_datetime
            else datetime.now()
        )
        result = validate_temporal_accuracy(content, ref)
        return TemporalValidationResult(**result.analysis.get("temporal", {}))

    def validate_systemic_indifference(
        self,
        content: str,
        case_history: Optional[List[Dict[str, Any]]] = None,
    ) -> SystemicIndifferenceResult:
        """Public convenience: run only systemic indifference analysis."""
        result = validate_systemic_indifference(content, case_history)
        return SystemicIndifferenceResult(**result.analysis.get("systemic", {}))

    def get_strategic_result(
        self, role: StrategicRole
    ) -> Optional[StrategicRoleResult]:
        """Get result for a specific strategic role after validation."""
        return self._strategic_results.get(role)

    def get_all_strategic_checks(self) -> List[ValidationCheck]:
        """Get all checks from strategic roles."""
        checks = []
        for result in self._strategic_results.values():
            checks.extend(result.checks)
        return checks

    # ─────────────────────────────────────────────────────────────────────────
    # PRIVATE
    # ─────────────────────────────────────────────────────────────────────────

    def _generate_recommendations(
        self,
        strategic_summary: Dict[str, Any],
        consensus_pct: float,
    ) -> List[str]:
        """Generate actionable recommendations from all role analyses."""
        recs: List[str] = []

        if consensus_pct < 80:
            recs.append(
                f"⚠️ Consensus at {consensus_pct:.1f}% — review failing checks before sending"
            )

        for role_name, data in strategic_summary.items():
            verdict = data.get("verdict", "")
            if verdict in ("REJECT", "NEEDS_REVISION"):
                role_label = role_name.replace("_", " ").title()
                recs.append(
                    f"❌ {role_label}: needs attention (confidence {data.get('confidence', 0):.0f}%)"
                )

        # Specific recommendations from key analyses
        temporal = (
            strategic_summary.get("TEMPORAL_VALIDATOR", {})
            .get("analysis", {})
            .get("temporal", {})
        )
        if temporal.get("calendar_mismatches"):
            recs.append(f"🕐 Fix day-of-week errors: {temporal['calendar_mismatches']}")
        if temporal.get("date_arithmetic_errors"):
            recs.append(
                f"🕐 Review date arithmetic: {temporal['date_arithmetic_errors'][:3]}"
            )

        systemic = (
            strategic_summary.get("SYSTEMIC_INDIFFERENCE", {})
            .get("analysis", {})
            .get("systemic", {})
        )
        score = systemic.get("systemic_score", 0)
        if 0 < score < 25:
            recs.append(
                f"📊 Systemic score {score}/40 — add more evidence to strengthen case"
            )

        diversity = (
            strategic_summary.get("STRATEGIC_DIVERSITY", {})
            .get("analysis", {})
            .get("diversity", {})
        )
        gaps = diversity.get("coverage_gaps", [])
        if gaps:
            recs.append(f"🎯 Under-explored strategies: {', '.join(gaps[:3])}")

        if not recs:
            recs.append("✅ All 33 roles approve — document ready for send")

        return recs


# ═════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Enums
    "StrategicRole",
    # Data classes
    "StrategicDiversityResult",
    "TemporalValidationResult",
    "SystemicIndifferenceResult",
    "NashEquilibriumResult",
    "CognitiveBiasResult",
    "FeedbackLoopResult",
    "NarrativeArcResult",
    "StrategicRoleResult",
    # Council
    "GovernanceCouncil33",
    # Individual validators
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
]
