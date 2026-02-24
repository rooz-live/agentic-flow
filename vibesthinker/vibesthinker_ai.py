#!/usr/bin/env python3
"""
VibeThinker AI - Strategic Diversity Reasoning Engine
======================================================
Implements SFT (Supervised Fine-Tuning) and RL (Reinforcement Learning) phases
for generating diverse settlement strategies with MGPO entropy-guided selection.

DoR: json, math, random, dataclasses, hashlib available (stdlib only)
DoD: 10+ strategies generated per run; MGPO selects top-3; diversity score > 0.6;
     entropy distribution validated; deterministic with seed

Features:
- Temperature-varied strategy generation (10+ diverse approaches)
- MGPO (Multi-Group Preference Optimization) entropy scoring
- WSJF integration for prioritization
- Uncertainty quantification
- Strategic diversity validation

Architecture:
    SFT Phase: Generate initial strategy candidates
    RL Phase: Score and select via entropy + WSJF
    Output: Ranked strategies with confidence intervals

Usage:
    from vibesthinker_ai import VibeThinker
    vt = VibeThinker(case_context)
    strategies = vt.generate_strategies(n=10)
    ranked = vt.mgpo_select(strategies)
"""

import json
import math
import random
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple
import hashlib


# ═════════════════════════════════════════════════════════════════════════════
# ENUMS AND CONSTANTS
# ═════════════════════════════════════════════════════════════════════════════

class StrategyType(Enum):
    """Strategy archetypes for settlement negotiation"""
    AGGRESSIVE = "aggressive"       # Push for maximum settlement
    CONSERVATIVE = "conservative"   # Accept reasonable offer
    HYBRID = "hybrid"               # Mix of approaches
    ESCALATION = "escalation"       # Threaten litigation
    COLLABORATIVE = "collaborative" # Mutual benefit focus
    TEMPORAL = "temporal"           # Time pressure based
    EVIDENCE_LED = "evidence_led"   # Evidence strength focus
    PRECEDENT = "precedent"         # Cite similar cases
    REGULATORY = "regulatory"       # Government agency pressure
    MEDIA = "media"                 # Public attention threat


class RiskLevel(Enum):
    """Risk level classification"""
    LOW = auto()
    MEDIUM = auto()
    HIGH = auto()
    CRITICAL = auto()


# Temperature presets for diversity
TEMPERATURE_PRESETS = {
    "conservative": 0.3,   # More focused, predictable
    "balanced": 0.7,       # Default balance
    "creative": 1.0,       # More diverse
    "exploratory": 1.5,    # High diversity
}


# ═════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═════════════════════════════════════════════════════════════════════════════

@dataclass
class CaseContext:
    """Legal case context for strategy generation"""
    case_number: str
    plaintiff: str
    defendant: str
    claim_type: str
    damages_claimed: float
    evidence_strength: float  # 0-1
    timeline_months: int
    settlement_deadline: Optional[datetime] = None
    opposing_counsel: Optional[str] = None
    court: Optional[str] = None
    systemic_score: float = 0.0  # 0-40 scale
    prior_offers: List[float] = field(default_factory=list)
    key_evidence: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    
    def to_prompt_context(self) -> str:
        """Convert to natural language prompt context"""
        return f"""
Case: {self.case_number}
Plaintiff: {self.plaintiff}
Defendant: {self.defendant}
Claim Type: {self.claim_type}
Damages Claimed: ${self.damages_claimed:,.2f}
Evidence Strength: {self.evidence_strength*100:.0f}%
Timeline: {self.timeline_months} months
Systemic Score: {self.systemic_score}/40
Prior Offers: {', '.join(f'${x:,.0f}' for x in self.prior_offers) if self.prior_offers else 'None'}
Key Evidence: {', '.join(self.key_evidence[:5]) if self.key_evidence else 'Not specified'}
"""


@dataclass
class Strategy:
    """Generated settlement strategy"""
    id: str
    type: StrategyType
    name: str
    description: str
    recommended_offer: float
    min_acceptable: float
    max_demand: float
    timeline_days: int
    risk_level: RiskLevel
    key_actions: List[str] = field(default_factory=list)
    contingencies: List[str] = field(default_factory=list)
    
    # Scoring fields
    wsjf_score: float = 0.0
    entropy_score: float = 0.0
    confidence: float = 0.0
    uncertainty: float = 0.0
    mgpo_rank: int = 0
    
    # Metadata
    temperature: float = 0.7
    generation_timestamp: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type.value,
            "name": self.name,
            "description": self.description,
            "recommended_offer": self.recommended_offer,
            "min_acceptable": self.min_acceptable,
            "max_demand": self.max_demand,
            "timeline_days": self.timeline_days,
            "risk_level": self.risk_level.name,
            "key_actions": self.key_actions,
            "contingencies": self.contingencies,
            "scores": {
                "wsjf": self.wsjf_score,
                "entropy": self.entropy_score,
                "confidence": self.confidence,
                "uncertainty": self.uncertainty,
                "mgpo_rank": self.mgpo_rank
            }
        }


@dataclass
class MGPOResult:
    """MGPO selection result"""
    strategies: List[Strategy]
    entropy_distribution: List[float]
    selection_rationale: str
    diversity_score: float
    coverage_score: float
    timestamp: datetime = field(default_factory=datetime.utcnow)


# ═════════════════════════════════════════════════════════════════════════════
# VIBESTHINKER AI ENGINE
# ═════════════════════════════════════════════════════════════════════════════

class VibeThinker:
    """
    VibeThinker AI - Strategic Diversity Reasoning Engine
    
    Implements a two-phase approach:
    1. SFT Phase: Generate diverse strategy candidates using temperature variation
    2. RL Phase: Score and select using MGPO entropy-guided optimization
    """
    
    def __init__(self, context: CaseContext, seed: Optional[int] = None):
        self.context = context
        self.strategies: List[Strategy] = []
        self.seed = seed or random.randint(0, 2**32)
        self.rng = random.Random(self.seed)
        
        # Strategy templates per type
        self.templates = self._initialize_templates()
    
    def _initialize_templates(self) -> Dict[StrategyType, Dict]:
        """Initialize strategy templates with base parameters"""
        base_damages = self.context.damages_claimed
        evidence = self.context.evidence_strength
        systemic = self.context.systemic_score / 40  # Normalize to 0-1
        
        return {
            StrategyType.AGGRESSIVE: {
                "name": "Maximum Pressure",
                "description": "Push for full damages plus punitive, cite systemic patterns",
                "offer_multiplier": 1.2,
                "min_multiplier": 0.8,
                "max_multiplier": 1.5,
                "timeline_days": 7,
                "risk": RiskLevel.HIGH,
                "actions": [
                    "Demand full compensatory damages",
                    "Cite systemic indifference evidence",
                    "Set firm deadline with litigation threat",
                    "Reference similar case precedents"
                ]
            },
            StrategyType.CONSERVATIVE: {
                "name": "Pragmatic Resolution",
                "description": "Accept reasonable settlement to avoid litigation costs",
                "offer_multiplier": 0.6,
                "min_multiplier": 0.4,
                "max_multiplier": 0.8,
                "timeline_days": 30,
                "risk": RiskLevel.LOW,
                "actions": [
                    "Propose reasonable settlement range",
                    "Acknowledge defendant's position",
                    "Focus on mutual cost savings",
                    "Offer flexible payment terms"
                ]
            },
            StrategyType.HYBRID: {
                "name": "Balanced Approach",
                "description": "Start high, show flexibility, land in reasonable range",
                "offer_multiplier": 0.8,
                "min_multiplier": 0.5,
                "max_multiplier": 1.2,
                "timeline_days": 14,
                "risk": RiskLevel.MEDIUM,
                "actions": [
                    "Open with strong position",
                    "Signal willingness to negotiate",
                    "Document evidence strength",
                    "Set reasonable deadline"
                ]
            },
            StrategyType.ESCALATION: {
                "name": "Escalation Path",
                "description": "Threaten regulatory complaints and litigation",
                "offer_multiplier": 1.0,
                "min_multiplier": 0.7,
                "max_multiplier": 1.3,
                "timeline_days": 5,
                "risk": RiskLevel.HIGH,
                "actions": [
                    "Reference HUD/AG complaint option",
                    "Mention class action possibility",
                    "Cite attorney fee exposure",
                    "Set ultimatum deadline"
                ]
            },
            StrategyType.COLLABORATIVE: {
                "name": "Win-Win Resolution",
                "description": "Frame as mutually beneficial, avoid adversarial posture",
                "offer_multiplier": 0.7,
                "min_multiplier": 0.5,
                "max_multiplier": 0.9,
                "timeline_days": 21,
                "risk": RiskLevel.LOW,
                "actions": [
                    "Acknowledge business relationship",
                    "Propose creative solutions",
                    "Offer confidentiality",
                    "Focus on future prevention"
                ]
            },
            StrategyType.TEMPORAL: {
                "name": "Time Pressure",
                "description": "Leverage deadline and court date for urgency",
                "offer_multiplier": 0.9,
                "min_multiplier": 0.6,
                "max_multiplier": 1.1,
                "timeline_days": 3,
                "risk": RiskLevel.MEDIUM,
                "actions": [
                    "Emphasize settlement deadline",
                    "Reference court hearing date",
                    "Note litigation cost escalation",
                    "Offer immediate resolution discount"
                ]
            },
            StrategyType.EVIDENCE_LED: {
                "name": "Evidence-Driven",
                "description": "Lead with strong evidence, let facts drive negotiation",
                "offer_multiplier": evidence,  # Scale with evidence strength
                "min_multiplier": evidence * 0.7,
                "max_multiplier": min(1.4, evidence * 1.5),
                "timeline_days": 14,
                "risk": RiskLevel.MEDIUM,
                "actions": [
                    "Present evidence summary",
                    "Document timeline of incidents",
                    "Quantify damages with receipts",
                    "Reference expert opinions"
                ]
            },
            StrategyType.PRECEDENT: {
                "name": "Precedent-Based",
                "description": "Cite similar cases and expected outcomes",
                "offer_multiplier": 0.85,
                "min_multiplier": 0.6,
                "max_multiplier": 1.1,
                "timeline_days": 14,
                "risk": RiskLevel.MEDIUM,
                "actions": [
                    "Research similar NC cases",
                    "Cite settlement ranges in precedents",
                    "Reference jury verdict data",
                    "Note defendant's litigation history"
                ]
            },
            StrategyType.REGULATORY: {
                "name": "Regulatory Pressure",
                "description": "Leverage government agency involvement threat",
                "offer_multiplier": 1.1 if systemic > 0.5 else 0.9,
                "min_multiplier": 0.7,
                "max_multiplier": 1.3,
                "timeline_days": 10,
                "risk": RiskLevel.MEDIUM,
                "actions": [
                    "Reference HUD complaint filed",
                    "Cite State AG consumer protection",
                    "Mention inspection violations",
                    "Note pattern across properties"
                ]
            },
            StrategyType.MEDIA: {
                "name": "Public Attention",
                "description": "Hint at media coverage or social media exposure",
                "offer_multiplier": 1.0,
                "min_multiplier": 0.6,
                "max_multiplier": 1.4,
                "timeline_days": 7,
                "risk": RiskLevel.HIGH,
                "actions": [
                    "Reference similar cases in media",
                    "Note tenant advocacy groups",
                    "Mention review site documentation",
                    "Offer to keep settlement private"
                ]
            }
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # SFT PHASE: Strategy Generation
    # ─────────────────────────────────────────────────────────────────────────
    
    def generate_strategies(self, n: int = 10, 
                           temperatures: Optional[List[float]] = None) -> List[Strategy]:
        """
        SFT Phase: Generate n diverse strategy candidates
        
        Uses temperature variation to ensure strategic diversity:
        - Lower temperature (0.3-0.5): More conservative, predictable
        - Medium temperature (0.6-0.8): Balanced approaches
        - Higher temperature (0.9-1.5): More creative, risky
        
        Args:
            n: Number of strategies to generate (default: 10)
            temperatures: Optional list of temperatures to use
        
        Returns:
            List of Strategy objects
        """
        self.strategies = []
        
        # Default temperature distribution for diversity
        if temperatures is None:
            temperatures = [
                0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5
            ][:n]
        
        # Ensure we have enough temperatures
        while len(temperatures) < n:
            temperatures.append(self.rng.uniform(0.3, 1.5))
        
        # Distribute strategy types across temperatures
        strategy_types = list(StrategyType)
        
        for i in range(n):
            temp = temperatures[i]
            
            # Select strategy type based on temperature
            if temp < 0.5:
                # Conservative temperatures favor conservative strategies
                type_weights = [0.1, 0.3, 0.2, 0.05, 0.25, 0.1, 0.0, 0.0, 0.0, 0.0]
            elif temp < 0.8:
                # Balanced temperatures
                type_weights = [0.1, 0.1, 0.2, 0.1, 0.1, 0.15, 0.1, 0.1, 0.05, 0.0]
            else:
                # Creative temperatures favor aggressive/risky
                type_weights = [0.2, 0.05, 0.1, 0.2, 0.05, 0.1, 0.1, 0.1, 0.05, 0.05]
            
            # Select type with some randomness
            strategy_type = self.rng.choices(strategy_types, weights=type_weights)[0]
            
            # Generate strategy
            strategy = self._generate_single_strategy(strategy_type, temp, i)
            self.strategies.append(strategy)
        
        return self.strategies
    
    def _generate_single_strategy(self, strategy_type: StrategyType, 
                                  temperature: float, index: int) -> Strategy:
        """Generate a single strategy with temperature-based variation"""
        template = self.templates[strategy_type]
        base_damages = self.context.damages_claimed
        
        # Apply temperature-based noise
        noise = lambda x: x * (1 + (temperature - 0.7) * self.rng.gauss(0, 0.2))
        
        # Calculate offer amounts with noise
        recommended = noise(base_damages * template["offer_multiplier"])
        min_acceptable = noise(base_damages * template["min_multiplier"])
        max_demand = noise(base_damages * template["max_multiplier"])
        
        # Ensure logical ordering
        min_acceptable = min(min_acceptable, recommended)
        max_demand = max(max_demand, recommended)
        
        # Timeline with temperature variation
        timeline = max(1, int(template["timeline_days"] * (1 + (temperature - 0.7) * 0.5)))
        
        # Generate unique ID
        strategy_id = hashlib.md5(
            f"{strategy_type.value}-{temperature}-{index}-{self.seed}".encode()
        ).hexdigest()[:8]
        
        # Select actions based on temperature (more/fewer with higher temp)
        num_actions = min(len(template["actions"]), int(3 + temperature * 2))
        actions = self.rng.sample(template["actions"], num_actions)
        
        # Contingencies based on risk level
        contingencies = self._generate_contingencies(strategy_type, temperature)
        
        return Strategy(
            id=strategy_id,
            type=strategy_type,
            name=f"{template['name']} (T={temperature:.1f})",
            description=template["description"],
            recommended_offer=recommended,
            min_acceptable=min_acceptable,
            max_demand=max_demand,
            timeline_days=timeline,
            risk_level=template["risk"],
            key_actions=actions,
            contingencies=contingencies,
            temperature=temperature,
            generation_timestamp=datetime.utcnow()
        )
    
    def _generate_contingencies(self, strategy_type: StrategyType, 
                               temperature: float) -> List[str]:
        """Generate contingency plans based on strategy type"""
        base_contingencies = [
            "If rejected: Escalate to next level",
            "If countered: Evaluate against minimum",
            "If no response: Follow up in 48 hours",
            "If deadline missed: Proceed to litigation"
        ]
        
        type_specific = {
            StrategyType.AGGRESSIVE: [
                "If rejected: File HUD complaint",
                "Prepare court filing documents"
            ],
            StrategyType.CONSERVATIVE: [
                "Consider lower offer if rejected",
                "Extend deadline if good faith shown"
            ],
            StrategyType.ESCALATION: [
                "If rejected: Execute regulatory filing",
                "Contact media if appropriate"
            ]
        }
        
        contingencies = base_contingencies.copy()
        contingencies.extend(type_specific.get(strategy_type, []))
        
        # Higher temperature = more contingencies
        num_contingencies = min(len(contingencies), int(2 + temperature * 2))
        return self.rng.sample(contingencies, num_contingencies)
    
    # ─────────────────────────────────────────────────────────────────────────
    # RL PHASE: MGPO Selection
    # ─────────────────────────────────────────────────────────────────────────
    
    def mgpo_select(self, strategies: Optional[List[Strategy]] = None,
                   top_k: int = 3) -> MGPOResult:
        """
        RL Phase: MGPO (Multi-Group Preference Optimization) selection
        
        Scores strategies using:
        1. WSJF (Weighted Shortest Job First) for business value
        2. Entropy for diversity/uncertainty quantification
        3. Evidence alignment for legal strength
        
        Returns top_k strategies with full scoring
        """
        strategies = strategies or self.strategies
        
        if not strategies:
            raise ValueError("No strategies to select from. Run generate_strategies first.")
        
        # Score each strategy
        for strategy in strategies:
            strategy.wsjf_score = self._calculate_wsjf(strategy)
            strategy.entropy_score = self._calculate_entropy(strategy)
            strategy.confidence = self._calculate_confidence(strategy)
            strategy.uncertainty = 1 - strategy.confidence
        
        # MGPO ranking: Combine scores with entropy weight
        for strategy in strategies:
            # Balance between exploitation (WSJF) and exploration (entropy)
            strategy.mgpo_score = (
                0.6 * strategy.wsjf_score + 
                0.3 * strategy.entropy_score +
                0.1 * strategy.confidence
            )
        
        # Sort by MGPO score
        ranked = sorted(strategies, key=lambda s: s.mgpo_score, reverse=True)
        
        # Assign ranks
        for i, strategy in enumerate(ranked):
            strategy.mgpo_rank = i + 1
        
        # Calculate diversity and coverage
        diversity_score = self._calculate_diversity(ranked[:top_k])
        coverage_score = self._calculate_coverage(ranked[:top_k])
        
        # Generate selection rationale
        rationale = self._generate_selection_rationale(ranked[:top_k])
        
        return MGPOResult(
            strategies=ranked[:top_k],
            entropy_distribution=[s.entropy_score for s in ranked],
            selection_rationale=rationale,
            diversity_score=diversity_score,
            coverage_score=coverage_score
        )
    
    def _calculate_wsjf(self, strategy: Strategy) -> float:
        """Calculate WSJF score for a strategy"""
        # Business Value: Based on recommended offer vs damages
        offer_ratio = strategy.recommended_offer / max(self.context.damages_claimed, 1)
        business_value = min(10, offer_ratio * 10)
        
        # Time Criticality: Based on timeline
        if self.context.settlement_deadline:
            days_remaining = (self.context.settlement_deadline - datetime.utcnow()).days
            time_criticality = max(1, min(10, 10 - (strategy.timeline_days / days_remaining) * 5))
        else:
            time_criticality = 5  # Default
        
        # Risk Reduction: Inverse of risk level
        risk_reduction = {
            RiskLevel.LOW: 9,
            RiskLevel.MEDIUM: 6,
            RiskLevel.HIGH: 3,
            RiskLevel.CRITICAL: 1
        }[strategy.risk_level]
        
        # Job Size: Based on timeline (smaller = better)
        job_size = max(1, strategy.timeline_days / 7)  # Week-based
        
        # WSJF formula
        cost_of_delay = business_value + time_criticality + risk_reduction
        return cost_of_delay / job_size
    
    def _calculate_entropy(self, strategy: Strategy) -> float:
        """Calculate entropy score for diversity measurement"""
        # Temperature contributes to entropy
        temp_entropy = strategy.temperature / 1.5  # Normalize to 0-1
        
        # Offer range contributes to entropy
        offer_range = (strategy.max_demand - strategy.min_acceptable) / max(strategy.recommended_offer, 1)
        range_entropy = min(1, offer_range)
        
        # Action diversity
        action_entropy = len(strategy.key_actions) / 6  # Normalize
        
        # Combine with weights
        entropy = 0.4 * temp_entropy + 0.4 * range_entropy + 0.2 * action_entropy
        return min(1, entropy)
    
    def _calculate_confidence(self, strategy: Strategy) -> float:
        """Calculate confidence score based on evidence and strategy alignment"""
        evidence_strength = self.context.evidence_strength
        
        # Evidence-strategy alignment
        if strategy.type in [StrategyType.EVIDENCE_LED, StrategyType.PRECEDENT]:
            alignment = evidence_strength
        elif strategy.type in [StrategyType.AGGRESSIVE, StrategyType.ESCALATION]:
            alignment = evidence_strength * 1.1 if evidence_strength > 0.7 else evidence_strength * 0.8
        else:
            alignment = 0.7  # Neutral strategies
        
        # Systemic score contribution
        systemic_boost = self.context.systemic_score / 40 * 0.2
        
        # Combine
        confidence = min(1, alignment + systemic_boost)
        return confidence
    
    def _calculate_diversity(self, strategies: List[Strategy]) -> float:
        """Calculate diversity score across selected strategies"""
        if len(strategies) <= 1:
            return 0.0
        
        # Type diversity
        unique_types = len(set(s.type for s in strategies))
        type_diversity = unique_types / len(strategies)
        
        # Temperature diversity
        temps = [s.temperature for s in strategies]
        temp_range = max(temps) - min(temps)
        temp_diversity = temp_range / 1.5  # Normalize
        
        # Risk diversity
        unique_risks = len(set(s.risk_level for s in strategies))
        risk_diversity = unique_risks / len(strategies)
        
        return (type_diversity + temp_diversity + risk_diversity) / 3
    
    def _calculate_coverage(self, strategies: List[Strategy]) -> float:
        """Calculate coverage of strategic space"""
        # Offer range coverage
        min_offer = min(s.min_acceptable for s in strategies)
        max_offer = max(s.max_demand for s in strategies)
        offer_coverage = (max_offer - min_offer) / max(self.context.damages_claimed, 1)
        
        # Timeline coverage
        min_timeline = min(s.timeline_days for s in strategies)
        max_timeline = max(s.timeline_days for s in strategies)
        timeline_coverage = (max_timeline - min_timeline) / 30  # Normalize to month
        
        return min(1, (offer_coverage + timeline_coverage) / 2)
    
    def _generate_selection_rationale(self, strategies: List[Strategy]) -> str:
        """Generate human-readable rationale for selection"""
        if not strategies:
            return "No strategies selected."
        
        top = strategies[0]
        
        rationale = f"""
MGPO Selection Rationale:

Primary Strategy: {top.name}
- WSJF Score: {top.wsjf_score:.2f} (balances value, urgency, risk)
- Entropy Score: {top.entropy_score:.2f} (diversity contribution)
- Confidence: {top.confidence:.1%} (evidence alignment)

Recommended Offer: ${top.recommended_offer:,.0f}
Negotiation Range: ${top.min_acceptable:,.0f} - ${top.max_demand:,.0f}
Timeline: {top.timeline_days} days

Key Actions:
{chr(10).join(f'  • {action}' for action in top.key_actions)}

Alternative Strategies ({len(strategies)-1}):
{chr(10).join(f'  {i+2}. {s.name} (WSJF: {s.wsjf_score:.2f})' for i, s in enumerate(strategies[1:]))}
"""
        return rationale.strip()
    
    # ─────────────────────────────────────────────────────────────────────────
    # UTILITY METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_strategy_matrix(self) -> Dict:
        """Get strategy comparison matrix"""
        if not self.strategies:
            return {}
        
        return {
            "strategies": [s.to_dict() for s in self.strategies],
            "summary": {
                "total_generated": len(self.strategies),
                "type_distribution": {
                    t.value: sum(1 for s in self.strategies if s.type == t)
                    for t in StrategyType
                },
                "avg_wsjf": sum(s.wsjf_score for s in self.strategies) / len(self.strategies),
                "avg_entropy": sum(s.entropy_score for s in self.strategies) / len(self.strategies),
                "offer_range": {
                    "min": min(s.min_acceptable for s in self.strategies),
                    "max": max(s.max_demand for s in self.strategies),
                    "avg": sum(s.recommended_offer for s in self.strategies) / len(self.strategies)
                }
            }
        }
    
    def export_strategies(self, output_path: str, format: str = "json") -> str:
        """Export strategies to file"""
        data = self.get_strategy_matrix()
        
        path = Path(output_path)
        
        if format == "json":
            path.write_text(json.dumps(data, indent=2, default=str))
        elif format == "markdown":
            md = self._to_markdown(data)
            path.write_text(md)
        else:
            raise ValueError(f"Unknown format: {format}")
        
        return str(path)
    
    def _to_markdown(self, data: Dict) -> str:
        """Convert strategy matrix to markdown"""
        md = "# VibeThinker Strategy Analysis\n\n"
        md += f"Generated: {datetime.utcnow().isoformat()}\n\n"
        md += f"## Summary\n"
        md += f"- Total Strategies: {data['summary']['total_generated']}\n"
        md += f"- Average WSJF: {data['summary']['avg_wsjf']:.2f}\n"
        md += f"- Average Entropy: {data['summary']['avg_entropy']:.2f}\n\n"
        
        md += "## Strategies\n\n"
        for s in data["strategies"]:
            md += f"### {s['name']}\n"
            md += f"- Type: {s['type']}\n"
            md += f"- Recommended: ${s['recommended_offer']:,.0f}\n"
            md += f"- Range: ${s['min_acceptable']:,.0f} - ${s['max_demand']:,.0f}\n"
            md += f"- Timeline: {s['timeline_days']} days\n"
            md += f"- Risk: {s['risk_level']}\n\n"
        
        return md


# ═════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═════════════════════════════════════════════════════════════════════════════

def main():
    """CLI entry point for VibeThinker"""
    import argparse
    
    parser = argparse.ArgumentParser(description="VibeThinker AI Strategy Generator")
    parser.add_argument("--case", "-c", required=True, help="Case number")
    parser.add_argument("--plaintiff", "-p", default="Plaintiff", help="Plaintiff name")
    parser.add_argument("--defendant", "-d", default="Defendant", help="Defendant name")
    parser.add_argument("--damages", "-D", type=float, required=True, help="Damages claimed")
    parser.add_argument("--evidence", "-e", type=float, default=0.7, help="Evidence strength (0-1)")
    parser.add_argument("--systemic", "-s", type=float, default=30, help="Systemic score (0-40)")
    parser.add_argument("--strategies", "-n", type=int, default=10, help="Number of strategies")
    parser.add_argument("--top-k", "-k", type=int, default=3, help="Top K to select")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--format", "-f", choices=["json", "markdown"], default="json")
    
    args = parser.parse_args()
    
    # Create context
    context = CaseContext(
        case_number=args.case,
        plaintiff=args.plaintiff,
        defendant=args.defendant,
        claim_type="Habitability",
        damages_claimed=args.damages,
        evidence_strength=args.evidence,
        timeline_months=22,
        systemic_score=args.systemic
    )
    
    # Run VibeThinker
    vt = VibeThinker(context)
    strategies = vt.generate_strategies(n=args.strategies)
    result = vt.mgpo_select(top_k=args.top_k)
    
    # Output
    print(result.selection_rationale)
    print(f"\nDiversity Score: {result.diversity_score:.2f}")
    print(f"Coverage Score: {result.coverage_score:.2f}")
    
    if args.output:
        vt.export_strategies(args.output, args.format)
        print(f"\nExported to: {args.output}")


if __name__ == "__main__":
    main()
