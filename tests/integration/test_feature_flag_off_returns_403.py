"""
Integration Test: Feature Flag OFF Returns 403
Tests boundary behavior when feature flag is disabled.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


def test_validation_dashboard_feature_flag_off_returns_403():
    """
    GIVEN feature flag 'validation_dashboard' is OFF
    WHEN user requests /api/validation/dashboard
    THEN response returns 403 Forbidden
    """
    from main import app  # Assuming FastAPI app in main.py
    
    client = TestClient(app)
    
    # Mock feature flag to OFF
    with patch('app.feature_flags.is_enabled', return_value=False):
        response = client.get('/api/validation/dashboard')
        
        assert response.status_code == 403
        assert response.json() == {
            'error': 'Feature not enabled',
            'feature': 'validation_dashboard',
            'status': 'disabled'
        }


def test_validation_dashboard_auth_required():
    """
    GIVEN feature flag is ON
    WHEN unauthenticated user requests /api/validation/dashboard
    THEN response returns 401 Unauthorized
    """
    from main import app
    
    client = TestClient(app)
    
    with patch('app.feature_flags.is_enabled', return_value=True):
        response = client.get('/api/validation/dashboard')
        
        # Should fail authentication before feature flag check
        assert response.status_code in [401, 403]


def test_validation_endpoint_with_mock_data():
    """
    GIVEN feature flag is OFF
    WHEN validation endpoint is called with test data
    THEN no validation occurs (403 returned)
    """
    from main import app
    
    client = TestClient(app)
    
    test_payload = {
        'file_path': '/test/trial-exhibit.pdf',
        'validation_type': 'completeness'
    }
    
    with patch('app.feature_flags.is_enabled', return_value=False):
        response = client.post('/api/validation/validate', json=test_payload)
        
        assert response.status_code == 403
        assert 'Feature not enabled' in response.json().get('error', '')


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
