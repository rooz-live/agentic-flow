#!/usr/bin/env python3
"""
ValidationCheck Value Object
Domain-Driven Design: Validation bounded context
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class ValidationStatus(Enum):
    """Validation check status."""
    PASS = "PASS"
    FAIL = "FAIL"
    BLOCKED = "BLOCKED"
    SKIPPED = "SKIPPED"


@dataclass(frozen=True)
class ValidationCheck:
    """
    Value Object: ValidationCheck
    
    Immutable representation of a single validation check result.
    Examples: placeholder check, legal citation check, signature check.
    
    Value objects have no identity - two checks with same values are equal.
    """
    
    # Check identity
    check_name: str
    check_type: str  # placeholder|legal|prose|attachment|security|quality
    
    # Result
    status: ValidationStatus
    message: str
    details: Optional[str] = None
    
    # Severity (for fail/blocked checks)
    severity: str = "medium"  # critical|high|medium|low|info
    
    # Context
    file_location: Optional[str] = None  # Line number or section
    
    def is_passing(self) -> bool:
        """Check if this validation passed."""
        return self.status == ValidationStatus.PASS
    
    def is_blocking(self) -> bool:
        """Check if this validation is a blocker."""
        return self.status == ValidationStatus.BLOCKED
    
    def to_dict(self) -> dict:
        """Export check to dictionary for JSON serialization."""
        return {
            "check_name": self.check_name,
            "check_type": self.check_type,
            "status": self.status.value,
            "message": self.message,
            "details": self.details,
            "severity": self.severity,
            "file_location": self.file_location
        }
    
    def __str__(self) -> str:
        """Human-readable representation."""
        status_emoji = {
            ValidationStatus.PASS: "✅",
            ValidationStatus.FAIL: "❌",
            ValidationStatus.BLOCKED: "🚫",
            ValidationStatus.SKIPPED: "⏭️"
        }
        emoji = status_emoji.get(self.status, "❓")
        return f"{emoji} [{self.check_type}] {self.check_name}: {self.message}"
