"""ROAM Risk Management Aggregate Root

Domain-Driven Design aggregate for ROAM risk lifecycle management.
Ensures invariants across risk classification, mitigation, and escalation.

## Aggregate Boundary
This aggregate controls:
- Risk classification (SITUATIONAL/STRATEGIC/SYSTEMIC)
- Risk category transitions (RESOLVED/OWNED/ACCEPTED/MITIGATED)
- Escalation level changes
- Domain events for state transitions

## Invariants Enforced
1. Escalation level must match risk type (SYSTEMIC → critical, STRATEGIC → high/medium)
2. RESOLVED risks cannot escalate
3. Risk type changes must be justified
4. Confidence must be 0.0-1.0 range
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from uuid import UUID, uuid4

from .aggregate_root import AggregateRoot, DomainEvent


class RoamRiskType(Enum):
    """ROAM Risk Types for Settlement Strategy"""
    SITUATIONAL = "situational"  # 60% - Good faith, needs time
    STRATEGIC = "strategic"      # 30% - Deliberate delay
    SYSTEMIC = "systemic"        # 10% - Organizational policy


class RoamCategory(Enum):
    """ROAM Risk Management Categories"""
    RESOLVED = "resolved"    # Risk eliminated
    OWNED = "owned"          # Accepted, monitored
    ACCEPTED = "accepted"    # Documented for litigation
    MITIGATED = "mitigated"  # Reduced through action


@dataclass
class RoamRiskAggregate(AggregateRoot):
    """DDD Aggregate Root for ROAM risk management
    
    Represents a single identifiable risk in the ROAM framework with
    full lifecycle tracking, domain event emission, and invariant enforcement.
    
    Attributes:
        id: Unique identifier for this risk (inherited from AggregateRoot)
        risk_id: Business identifier (e.g., "R-2026-001")
        title: Brief description of the risk
        risk_type: Classification (SITUATIONAL/STRATEGIC/SYSTEMIC)
        category: Management category (RESOLVED/OWNED/ACCEPTED/MITIGATED)
        confidence: Confidence in classification (0.0-1.0)
        likelihood: Likelihood of occurrence (0.0-1.0)
        reasoning: Detailed reasoning for classification
        indicators: List of detected risk indicators
        recommended_action: Next action to take
        escalation_level: 0=low, 1=medium, 2=high, 3=critical
        opportunity: Inverted thinking - opportunity created by this risk
        created_at: Risk creation timestamp
        updated_at: Last update timestamp
    """
    risk_id: str
    title: str
    risk_type: RoamRiskType
    category: RoamCategory
    confidence: float
    likelihood: float
    reasoning: str
    indicators: List[str] = field(default_factory=list)
    recommended_action: str = ""
    escalation_level: int = 0
    opportunity: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def __post_init__(self):
        """Validate invariants after initialization"""
        self._validate_confidence()
        self._validate_likelihood()
        self._validate_escalation_level()
    
    def _validate_confidence(self) -> None:
        """Ensure confidence is in valid range [0.0, 1.0]"""
        if not (0.0 <= self.confidence <= 1.0):
            raise ValueError(f"Confidence must be 0.0-1.0, got {self.confidence}")
    
    def _validate_likelihood(self) -> None:
        """Ensure likelihood is in valid range [0.0, 1.0]"""
        if not (0.0 <= self.likelihood <= 1.0):
            raise ValueError(f"Likelihood must be 0.0-1.0, got {self.likelihood}")
    
    def _validate_escalation_level(self) -> None:
        """Validate escalation level matches risk type"""
        if self.risk_type == RoamRiskType.SYSTEMIC and self.escalation_level < 2:
            raise ValueError(f"SYSTEMIC risks must have escalation_level >= 2, got {self.escalation_level}")
    
    def classify_as(
        self,
        new_risk_type: RoamRiskType,
        confidence: float,
        reasoning: str,
        indicators: List[str]
    ) -> None:
        """Change risk classification with validation
        
        Args:
            new_risk_type: New risk type to classify as
            confidence: Confidence in new classification
            reasoning: Justification for reclassification
            indicators: Supporting indicators
            
        Raises:
            ValueError: If confidence invalid or reasoning empty
        """
        if not (0.0 <= confidence <= 1.0):
            raise ValueError(f"Confidence must be 0.0-1.0, got {confidence}")
        if not reasoning:
            raise ValueError("Reasoning required for risk classification change")
        
        old_type = self.risk_type
        self.risk_type = new_risk_type
        self.confidence = confidence
        self.reasoning = reasoning
        self.indicators = indicators
        self.updated_at = datetime.now(timezone.utc)
        
        # Emit domain event
        self.apply_event(DomainEvent(
            aggregate_id=self.id,
            event_type="RiskReclassified",
            payload={
                "risk_id": self.risk_id,
                "old_type": old_type.value,
                "new_type": new_risk_type.value,
                "confidence": confidence,
                "reasoning": reasoning,
                "indicators": indicators,
            }
        ))
    
    def change_category(self, new_category: RoamCategory, reason: str) -> None:
        """Transition risk category with audit trail
        
        Args:
            new_category: Target ROAM category
            reason: Justification for category change
            
        Raises:
            ValueError: If RESOLVED risk is modified or reason empty
        """
        if self.category == RoamCategory.RESOLVED:
            raise ValueError("Cannot change category of RESOLVED risk")
        if not reason:
            raise ValueError("Reason required for category change")
        
        old_category = self.category
        self.category = new_category
        self.updated_at = datetime.now(timezone.utc)
        
        # Emit domain event
        self.apply_event(DomainEvent(
            aggregate_id=self.id,
            event_type="RiskCategoryChanged",
            payload={
                "risk_id": self.risk_id,
                "old_category": old_category.value,
                "new_category": new_category.value,
                "reason": reason,
            }
        ))
    
    def escalate(self, new_level: int, justification: str) -> None:
        """Escalate risk severity level
        
        Args:
            new_level: New escalation level (0-3)
            justification: Reason for escalation
            
        Raises:
            ValueError: If level invalid, downgrading, or RESOLVED risk
        """
        if not (0 <= new_level <= 3):
            raise ValueError(f"Escalation level must be 0-3, got {new_level}")
        if new_level <= self.escalation_level:
            raise ValueError(f"Cannot downgrade escalation from {self.escalation_level} to {new_level}")
        if self.category == RoamCategory.RESOLVED:
            raise ValueError("Cannot escalate RESOLVED risk")
        if not justification:
            raise ValueError("Justification required for escalation")
        
        old_level = self.escalation_level
        self.escalation_level = new_level
        self.updated_at = datetime.now(timezone.utc)
        
        # Emit domain event
        self.apply_event(DomainEvent(
            aggregate_id=self.id,
            event_type="RiskEscalated",
            payload={
                "risk_id": self.risk_id,
                "old_level": old_level,
                "new_level": new_level,
                "justification": justification,
            }
        ))
    
    def resolve(self, resolution_notes: str) -> None:
        """Mark risk as resolved
        
        Args:
            resolution_notes: How the risk was resolved
            
        Raises:
            ValueError: If resolution notes empty
        """
        if not resolution_notes:
            raise ValueError("Resolution notes required")
        
        self.category = RoamCategory.RESOLVED
        self.updated_at = datetime.now(timezone.utc)
        
        # Emit domain event
        self.apply_event(DomainEvent(
            aggregate_id=self.id,
            event_type="RiskResolved",
            payload={
                "risk_id": self.risk_id,
                "resolution_notes": resolution_notes,
            }
        ))
    
    def add_indicator(self, indicator: str) -> None:
        """Add a new risk indicator
        
        Args:
            indicator: Risk indicator to add
        """
        if indicator not in self.indicators:
            self.indicators.append(indicator)
            self.updated_at = datetime.now(timezone.utc)
            
            self.apply_event(DomainEvent(
                aggregate_id=self.id,
                event_type="RiskIndicatorAdded",
                payload={
                    "risk_id": self.risk_id,
                    "indicator": indicator,
                }
            ))
    
    def to_dict(self) -> dict:
        """Convert aggregate to dictionary for serialization"""
        return {
            "id": str(self.id),
            "risk_id": self.risk_id,
            "title": self.title,
            "risk_type": self.risk_type.value,
            "category": self.category.value,
            "confidence": self.confidence,
            "likelihood": self.likelihood,
            "reasoning": self.reasoning,
            "indicators": self.indicators,
            "recommended_action": self.recommended_action,
            "escalation_level": self.escalation_level,
            "opportunity": self.opportunity,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "version": self.version,
            "uncommitted_events": len(self._events),
        }
