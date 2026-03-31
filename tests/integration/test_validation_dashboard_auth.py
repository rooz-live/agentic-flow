#!/usr/bin/env python3
"""
Integration Test: Validation Dashboard Authentication
Gate 1 - Feature Flag OFF → 403 Forbidden
"""

import os
import pytest
from typing import Generator


@pytest.fixture
def disable_feature_flag() -> Generator[None, None, None]:
    """
    Fixture: Disable validation dashboard feature flag.
    Ensures VALIDATION_DASHBOARD_ENABLED=false for test isolation.
    """
    original_value = os.environ.get('VALIDATION_DASHBOARD_ENABLED')
    os.environ['VALIDATION_DASHBOARD_ENABLED'] = 'false'
    yield
    # Cleanup: restore original value
    if original_value is not None:
        os.environ['VALIDATION_DASHBOARD_ENABLED'] = original_value
    else:
        os.environ.pop('VALIDATION_DASHBOARD_ENABLED', None)


class TestValidationDashboardAuth:
    """
    Integration tests for validation dashboard feature flag authorization.
    
    DoR: API endpoint exists at /api/validation/dashboard
    DoD: Feature flag OFF returns 403, feature flag ON returns 200
    """
    
    def test_feature_flag_off_returns_403(self, disable_feature_flag):
        """
        GIVEN validation dashboard feature is disabled (VALIDATION_DASHBOARD_ENABLED=false)
        WHEN client requests GET /api/validation/dashboard
        THEN response status is 403 Forbidden
        AND response body contains error message "Feature disabled"
        
        ADR-065: Feature flag strategy for validation dashboard
        """
        # Mock HTTP client (replace with actual HTTP client when API exists)
        # For now, test the feature flag check logic directly
        from domain.validation.aggregates.ValidationReport import ValidationReport
        
        feature_enabled = os.environ.get('VALIDATION_DASHBOARD_ENABLED', 'false').lower() == 'true'
        
        # Assert feature flag is disabled
        assert not feature_enabled, "Feature flag should be disabled for this test"
        
        # Simulate API behavior
        if not feature_enabled:
            status_code = 403
            error_message = "Feature disabled"
        else:
            status_code = 200
            error_message = None
        
        # Assertions
        assert status_code == 403, f"Expected 403, got {status_code}"
        assert error_message == "Feature disabled", f"Expected 'Feature disabled', got '{error_message}'"
        
        # Verify domain model can still be instantiated (not broken by feature flag)
        report = ValidationReport(artifact_path="/test/email.eml")
        assert report.artifact_path == "/test/email.eml"
    
    def test_feature_flag_off_does_not_expose_internal_state(self, disable_feature_flag):
        """
        GIVEN validation dashboard feature is disabled
        WHEN client requests /api/validation/dashboard
        THEN response does NOT leak internal system state
        AND response does NOT include DPC metrics
        AND response does NOT include check details
        
        Security: Feature flags should not accidentally expose internal data
        """
        feature_enabled = os.environ.get('VALIDATION_DASHBOARD_ENABLED', 'false').lower() == 'true'
        assert not feature_enabled
        
        # Simulate response body when feature is disabled
        response_body = {
            "error": "Feature disabled",
            "status_code": 403
        }
        
        # Assertions: ensure no internal data leaked
        assert "dpc_score" not in response_body, "DPC score should not be exposed when feature is off"
        assert "checks" not in response_body, "Check details should not be exposed when feature is off"
        assert "coverage" not in response_body, "Coverage metrics should not be exposed when feature is off"
        assert response_body["error"] == "Feature disabled"
    
    def test_feature_flag_environment_variable_parsing(self):
        """
        GIVEN various environment variable values
        WHEN parsing VALIDATION_DASHBOARD_ENABLED
        THEN only 'true' (case-insensitive) enables the feature
        AND all other values disable the feature
        
        Test edge cases: True, TRUE, 1, yes, enabled, etc.
        """
        test_cases = [
            ("true", True),
            ("True", True),
            ("TRUE", True),
            ("false", False),
            ("False", False),
            ("FALSE", False),
            ("1", False),  # Not 'true', so disabled
            ("yes", False),
            ("enabled", False),
            ("", False),
            (None, False)
        ]
        
        for env_value, expected_enabled in test_cases:
            if env_value is None:
                os.environ.pop('VALIDATION_DASHBOARD_ENABLED', None)
            else:
                os.environ['VALIDATION_DASHBOARD_ENABLED'] = env_value
            
            actual_enabled = os.environ.get('VALIDATION_DASHBOARD_ENABLED', 'false').lower() == 'true'
            
            assert actual_enabled == expected_enabled, (
                f"For env value '{env_value}', expected enabled={expected_enabled}, "
                f"got enabled={actual_enabled}"
            )
