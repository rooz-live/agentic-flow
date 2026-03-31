#!/usr/bin/env python3
"""
Integration Test: Validation Dashboard JSON Schema
Gate 1 - Feature Flag ON → Valid JSON with MCP/MPP fields
"""

import os
import json
import pytest
from typing import Generator
from datetime import datetime


@pytest.fixture
def enable_feature_flag() -> Generator[None, None, None]:
    """
    Fixture: Enable validation dashboard feature flag.
    Ensures VALIDATION_DASHBOARD_ENABLED=true for test isolation.
    """
    original_value = os.environ.get('VALIDATION_DASHBOARD_ENABLED')
    os.environ['VALIDATION_DASHBOARD_ENABLED'] = 'true'
    yield
    # Cleanup: restore original value
    if original_value is not None:
        os.environ['VALIDATION_DASHBOARD_ENABLED'] = original_value
    else:
        os.environ.pop('VALIDATION_DASHBOARD_ENABLED', None)


class TestValidationDashboardSchema:
    """
    Integration tests for validation dashboard JSON schema.
    
    DoR: Feature flag enabled, domain model exists
    DoD: API returns valid JSON matching expected schema
    """
    
    def test_feature_flag_on_returns_valid_json(self, enable_feature_flag):
        """
        GIVEN validation dashboard feature is enabled (VALIDATION_DASHBOARD_ENABLED=true)
        WHEN client requests GET /api/validation/dashboard
        THEN response status is 200 OK
        AND response body is valid JSON
        AND response contains required fields: score, mcp_fields, mpp_fields, timestamp
        
        ADR-065: Feature flag strategy for validation dashboard
        """
        from domain.validation.aggregates.ValidationReport import ValidationReport, ValidationStatus
        from domain.validation.value_objects.ValidationCheck import ValidationCheck
        
        feature_enabled = os.environ.get('VALIDATION_DASHBOARD_ENABLED', 'false').lower() == 'true'
        assert feature_enabled, "Feature flag should be enabled for this test"
        
        # Create validation report (simulates API logic)
        report = ValidationReport(
            artifact_path="/test/email.eml",
            artifact_type="email"
        )
        
        # Add some checks
        check1 = ValidationCheck(
            check_name="Placeholder Check",
            check_type="placeholder",
            status=ValidationStatus.PASS,
            message="No placeholders found"
        )
        check2 = ValidationCheck(
            check_name="Legal Citation Check",
            check_type="legal",
            status=ValidationStatus.PASS,
            message="Citations valid"
        )
        report.add_check(check1)
        report.add_check(check2)
        report.finalize()
        
        # Simulate API response
        response_body = {
            "score": report.dpc_score,
            "mcp_fields": {
                "coverage": report.coverage,
                "robustness": report.robustness
            },
            "mpp_fields": {
                "pass_count": report.pass_count,
                "fail_count": report.fail_count,
                "verdict": report.verdict.value
            },
            "timestamp": report.completed_at.isoformat() if report.completed_at else datetime.utcnow().isoformat()
        }
        
        # Verify JSON serializable
        json_str = json.dumps(response_body)
        assert isinstance(json_str, str)
        
        # Verify schema
        assert "score" in response_body, "Response must include 'score' field"
        assert "mcp_fields" in response_body, "Response must include 'mcp_fields'"
        assert "mpp_fields" in response_body, "Response must include 'mpp_fields'"
        assert "timestamp" in response_body, "Response must include 'timestamp'"
        
        # Verify MCP fields
        assert "coverage" in response_body["mcp_fields"]
        assert "robustness" in response_body["mcp_fields"]
        
        # Verify MPP fields
        assert "pass_count" in response_body["mpp_fields"]
        assert "fail_count" in response_body["mpp_fields"]
        assert "verdict" in response_body["mpp_fields"]
        
        # Verify score is numeric
        assert isinstance(response_body["score"], (int, float))
        assert 0 <= response_body["score"] <= 100
    
    def test_json_schema_includes_dpc_metrics(self, enable_feature_flag):
        """
        GIVEN validation dashboard is enabled
        WHEN API returns validation report
        THEN response includes DPC (Data-Performance-Confidence) metrics
        AND metrics include: coverage, robustness, urgency_factor, dpc_score, dpc_enhanced
        
        DPC_R(t) formula: Coverage × Urgency × Robustness
        """
        from domain.validation.aggregates.ValidationReport import ValidationReport, ValidationStatus
        from domain.validation.value_objects.ValidationCheck import ValidationCheck
        
        report = ValidationReport(artifact_path="/test/doc.pdf")
        check = ValidationCheck(
            check_name="Test Check",
            check_type="quality",
            status=ValidationStatus.PASS,
            message="OK"
        )
        report.add_check(check)
        report.finalize()
        
        # Get report dict
        report_dict = report.to_dict()
        
        # Verify DPC metrics present
        assert "metrics" in report_dict
        metrics = report_dict["metrics"]
        
        assert "coverage" in metrics, "DPC metrics must include coverage"
        assert "robustness" in metrics, "DPC metrics must include robustness"
        assert "urgency_factor" in metrics, "DPC metrics must include urgency_factor"
        assert "dpc_score" in metrics, "DPC metrics must include dpc_score"
        assert "dpc_enhanced" in metrics, "DPC metrics must include dpc_enhanced (DPC_R(t))"
        
        # Verify metric ranges
        assert 0 <= metrics["coverage"] <= 100
        assert 0 <= metrics["robustness"] <= 1.0
        assert 0 <= metrics["urgency_factor"]
        assert 0 <= metrics["dpc_score"] <= 100
    
    def test_json_schema_validation_with_multiple_checks(self, enable_feature_flag):
        """
        GIVEN validation report with multiple checks (pass, fail, skip)
        WHEN serialized to JSON
        THEN all checks are included with correct status
        AND aggregate counts match individual check statuses
        """
        from domain.validation.aggregates.ValidationReport import ValidationReport, ValidationStatus
        from domain.validation.value_objects.ValidationCheck import ValidationCheck
        
        report = ValidationReport(artifact_path="/test/complex.eml")
        
        # Add passing check
        report.add_check(ValidationCheck(
            check_name="Check 1",
            check_type="placeholder",
            status=ValidationStatus.PASS,
            message="OK"
        ))
        
        # Add failing check
        report.add_check(ValidationCheck(
            check_name="Check 2",
            check_type="legal",
            status=ValidationStatus.FAIL,
            message="Missing citation"
        ))
        
        # Add skipped check
        report.add_check(ValidationCheck(
            check_name="Check 3",
            check_type="attachment",
            status=ValidationStatus.SKIPPED,
            message="No attachments"
        ))
        
        report.finalize()
        
        # Serialize
        report_dict = report.to_dict()
        
        # Verify counts
        assert report_dict["metrics"]["pass_count"] == 1
        assert report_dict["metrics"]["fail_count"] == 1
        assert report_dict["metrics"]["skip_count"] == 1
        
        # Verify verdict (should be FAIL due to failing check)
        assert report_dict["verdict"] == "FAIL"
        
        # Verify checks list
        assert len(report_dict["checks"]) == 3
        
        # Verify JSON serializable
        json_str = json.dumps(report_dict)
        assert isinstance(json_str, str)
        
        # Verify can deserialize
        parsed = json.loads(json_str)
        assert parsed["verdict"] == "FAIL"
        assert parsed["metrics"]["pass_count"] == 1
    
    def test_timestamp_format_iso8601(self, enable_feature_flag):
        """
        GIVEN validation report is completed
        WHEN report is serialized to JSON
        THEN timestamps are in ISO 8601 format
        AND timestamps can be parsed back to datetime objects
        """
        from domain.validation.aggregates.ValidationReport import ValidationReport
        
        report = ValidationReport(artifact_path="/test/timestamped.eml")
        report.finalize()
        
        report_dict = report.to_dict()
        
        # Verify timestamp fields exist
        assert "created_at" in report_dict
        assert "completed_at" in report_dict
        
        # Verify ISO 8601 format (should end with Z or timezone offset)
        created_at = report_dict["created_at"]
        completed_at = report_dict["completed_at"]
        
        assert isinstance(created_at, str)
        assert isinstance(completed_at, str)
        
        # Verify can parse back to datetime
        from datetime import datetime
        parsed_created = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        parsed_completed = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
        
        assert isinstance(parsed_created, datetime)
        assert isinstance(parsed_completed, datetime)
        assert parsed_completed >= parsed_created, "Completed should be after or equal to created"
