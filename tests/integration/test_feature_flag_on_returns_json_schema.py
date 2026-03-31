"""
Integration Test: Feature Flag ON Returns JSON Schema
Tests boundary behavior when feature flag is enabled - verifies JSON schema includes score + MCP/MPP fields.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


def test_validation_dashboard_feature_flag_on_returns_json_schema():
    """
    GIVEN feature flag 'validation_dashboard' is ON
    WHEN authenticated user requests /api/validation/dashboard
    THEN response returns JSON with required schema fields (score, mcp, mpp)
    """
    from main import app
    
    client = TestClient(app)
    
    # Mock authentication + feature flag
    with patch('app.feature_flags.is_enabled', return_value=True), \
         patch('app.auth.verify_token', return_value={'user_id': 'test-user'}):
        
        response = client.get(
            '/api/validation/dashboard',
            headers={'Authorization': 'Bearer test-token'}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required schema fields exist
        assert 'score' in data, "Missing 'score' field in response"
        assert 'mcp' in data, "Missing 'mcp' (Method/Context/Pattern) field"
        assert 'mpp' in data, "Missing 'mpp' (Method/Pattern/Protocol) field"
        
        # Verify field types
        assert isinstance(data['score'], (int, float)), "score must be numeric"
        assert isinstance(data['mcp'], dict), "mcp must be an object"
        assert isinstance(data['mpp'], dict), "mpp must be an object"
        
        # Verify score range (0-100)
        assert 0 <= data['score'] <= 100, "score must be between 0 and 100"


def test_validation_endpoint_returns_detailed_report():
    """
    GIVEN feature flag is ON
    WHEN validation is requested for a trial exhibit
    THEN response includes ValidationReport with completeness score
    """
    from main import app
    
    client = TestClient(app)
    
    test_payload = {
        'file_path': '/test/TRIAL-EXHIBIT-A.pdf',
        'validation_type': 'completeness'
    }
    
    with patch('app.feature_flags.is_enabled', return_value=True), \
         patch('app.auth.verify_token', return_value={'user_id': 'test-user'}), \
         patch('domain.validation.aggregates.ValidationReport.validate') as mock_validate:
        
        # Mock ValidationReport response
        mock_report = MagicMock()
        mock_report.to_dict.return_value = {
            'file_path': '/test/TRIAL-EXHIBIT-A.pdf',
            'score': 85.5,
            'checks': [
                {'type': 'signature', 'status': 'passed'},
                {'type': 'dates', 'status': 'passed'},
                {'type': 'calculations', 'status': 'warning'}
            ],
            'mcp': {
                'method': 'document_completeness',
                'context': 'trial_exhibit',
                'pattern': 'validation_pipeline'
            },
            'mpp': {
                'method': 'pdf_analysis',
                'pattern': 'signature_detection',
                'protocol': 'validation_v1'
            }
        }
        mock_validate.return_value = mock_report
        
        response = client.post(
            '/api/validation/validate',
            json=test_payload,
            headers={'Authorization': 'Bearer test-token'}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify ValidationReport structure
        assert data['score'] == 85.5
        assert len(data['checks']) == 3
        assert data['mcp']['method'] == 'document_completeness'
        assert data['mpp']['protocol'] == 'validation_v1'


def test_json_schema_includes_trial_critical_fields():
    """
    GIVEN feature flag is ON
    WHEN validation dashboard is accessed
    THEN response includes trial-critical metadata (case_id, exhibit_list, completeness_percentage)
    """
    from main import app
    
    client = TestClient(app)
    
    with patch('app.feature_flags.is_enabled', return_value=True), \
         patch('app.auth.verify_token', return_value={'user_id': 'test-user'}):
        
        response = client.get(
            '/api/validation/dashboard?case_id=26CV005596',
            headers={'Authorization': 'Bearer test-token'}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Trial-critical fields
        assert 'case_id' in data
        assert 'exhibit_list' in data
        assert 'completeness_percentage' in data
        
        # Validate exhibit structure
        if data['exhibit_list']:
            exhibit = data['exhibit_list'][0]
            assert 'exhibit_id' in exhibit
            assert 'validation_status' in exhibit
            assert 'last_validated' in exhibit


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
