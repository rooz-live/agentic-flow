import pytest
import os
import sys

# Ensure we can import from domain
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from domain.validation.aggregates.ValidationReport import ValidationReport, ValidationStatus
from domain.validation.value_objects.ValidationCheck import ValidationCheck, ValidationStatus as CheckStatus

def run_validation(file_path: str, feature_flag: bool):
    """Simulates the application layer using the domain."""
    if not feature_flag:
        # Simulate feature flag OFF blocking
        return {"error": "Feature flag OFF", "code": 1}

    report = ValidationReport(artifact_path=file_path)

    check1 = ValidationCheck(
        check_name="syntax",
        check_type="placeholder",
        status=CheckStatus.PASS,
        message="Syntax OK"
    )
    report.add_check(check1)

    check2 = ValidationCheck(
        check_name="legal_citations",
        check_type="legal",
        status=CheckStatus.PASS,
        message="Citations OK"
    )
    report.add_check(check2)

    report.finalize()
    return report.to_dict()

def test_feature_flag_off():
    res = run_validation("dummy.eml", feature_flag=False)
    assert res.get("code") == 1
    assert "error" in res

def test_feature_flag_on():
    res = run_validation("dummy.eml", feature_flag=True)
    assert res.get("verdict") == ValidationStatus.PASS.value
    assert "metrics" in res
    assert "dpc_score" in res["metrics"]
    assert "checks" in res
    assert len(res["checks"]) == 2
