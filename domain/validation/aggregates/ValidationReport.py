#!/usr/bin/env python3
"""
ValidationReport Aggregate Root
Domain-Driven Design: Validation bounded context
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID, uuid4


class ValidationStatus(Enum):
    """Validation verdict status."""
    PASS = "PASS"
    FAIL = "FAIL"
    BLOCKED = "BLOCKED"
    SKIPPED = "SKIPPED"


@dataclass
class ValidationReport:
    """
    Aggregate Root: ValidationReport
    
    Represents the complete validation result for a document/email/code artifact.
    Guards invariants: total_checks = pass_count + fail_count + skip_count
    
    DoR: Input artifact exists and is readable
    DoD: All validators executed, DPC metrics calculated, verdict determined
    """
    
    # Identity
    id: UUID = field(default_factory=uuid4)
    artifact_path: str = ""
    artifact_type: str = "email"  # email|code|document|config
    
    # Validation results
    checks: List['ValidationCheck'] = field(default_factory=list)
    pass_count: int = 0
    fail_count: int = 0
    skip_count: int = 0
    verdict: ValidationStatus = ValidationStatus.PASS
    
    # DPC metrics (Data-Performance-Confidence)
    coverage: float = 0.0      # % of checks that passed
    robustness: float = 0.90   # Weight factor (0-1)
    urgency_factor: float = 1.0  # Time decay (deadline pressure)
    dpc_score: float = 0.0
    dpc_enhanced: float = 0.0  # Time-weighted DPC_R(t)
    
    # Metadata
    created_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    validator_version: str = "1.0.0"
    
    def __post_init__(self):
        """Enforce aggregate invariants after initialization."""
        self._validate_invariants()
    
    def _validate_invariants(self):
        """
        Aggregate invariant enforcement.
        Raises ValueError if invariants violated.
        """
        total = self.pass_count + self.fail_count + self.skip_count
        if len(self.checks) > 0 and total != len(self.checks):
            raise ValueError(
                f"Invariant violated: total checks ({total}) != "
                f"checks list length ({len(self.checks)})"
            )
    
    def add_check(self, check: 'ValidationCheck') -> None:
        """
        Add a validation check to the report.
        Updates counts and recalculates metrics.
        """
        self.checks.append(check)
        
        if check.status == ValidationStatus.PASS:
            self.pass_count += 1
        elif check.status == ValidationStatus.FAIL:
            self.fail_count += 1
        elif check.status == ValidationStatus.SKIPPED:
            self.skip_count += 1
        
        self._recalculate_metrics()
        self._validate_invariants()
    
    def _recalculate_metrics(self) -> None:
        """Recalculate DPC metrics after check addition."""
        total_checks = self.pass_count + self.fail_count + self.skip_count
        if total_checks > 0:
            self.coverage = (self.pass_count / total_checks) * 100.0
        else:
            self.coverage = 0.0
        
        # DPC score: Coverage × Robustness
        self.dpc_score = (self.coverage / 100.0) * self.robustness * 100.0
        
        # DPC_R(t): Time-weighted enhancement
        self.dpc_enhanced = (self.coverage / 100.0) * self.urgency_factor * self.robustness
    
    def finalize(self) -> None:
        """
        Complete the validation report.
        Sets verdict based on check results and marks completion time.
        """
        self.completed_at = datetime.utcnow()
        
        # Determine verdict
        if any(check.status == ValidationStatus.BLOCKED for check in self.checks):
            self.verdict = ValidationStatus.BLOCKED
        elif self.fail_count > 0:
            self.verdict = ValidationStatus.FAIL
        else:
            self.verdict = ValidationStatus.PASS
        
        self._validate_invariants()
    
    def to_dict(self) -> dict:
        """Export report to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "artifact_path": self.artifact_path,
            "artifact_type": self.artifact_type,
            "verdict": self.verdict.value,
            "metrics": {
                "pass_count": self.pass_count,
                "fail_count": self.fail_count,
                "skip_count": self.skip_count,
                "coverage": round(self.coverage, 2),
                "robustness": self.robustness,
                "urgency_factor": self.urgency_factor,
                "dpc_score": round(self.dpc_score, 2),
                "dpc_enhanced": round(self.dpc_enhanced, 4)
            },
            "checks": [check.to_dict() for check in self.checks],
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "validator_version": self.validator_version
        }


# Import here to avoid circular dependency
from ..value_objects.ValidationCheck import ValidationCheck
