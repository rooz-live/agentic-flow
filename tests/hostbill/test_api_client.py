#!/usr/bin/env python3
"""
Test suite for HostBill API client integration.
Follows red-green TDD approach: tests fail first, then implementation.
"""

import pytest
import json
from pathlib import Path
from unittest.mock import Mock, patch
import sys
import os

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts" / "ci"))

# Import with correct module name (dashes become underscores)
import importlib.util
spec = importlib.util.spec_from_file_location(
    "hostbill_sync_agent", 
    Path(__file__).parent.parent.parent / "scripts" / "ci" / "hostbill-sync-agent.py"
)
hostbill_sync_agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hostbill_sync_agent)

# Get classes from the loaded module
HostBillTelemetry = hostbill_sync_agent.HostBillTelemetry
NodeConsumption = hostbill_sync_agent.NodeConsumption
PriorityTLD = hostbill_sync_agent.PriorityTLD
SyntheticBilling = hostbill_sync_agent.SyntheticBilling
compute_dynamic_mrr = hostbill_sync_agent.compute_dynamic_mrr
extract_live_stx_telemetry = hostbill_sync_agent.extract_live_stx_telemetry

# Import the mock client
spec2 = importlib.util.spec_from_file_location(
    "hostbill_api_client",
    Path(__file__).parent.parent.parent / "scripts" / "ci" / "hostbill_api_client.py"
)
hostbill_api_client = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(hostbill_api_client)

MockHostBillAPIClient = hostbill_api_client.MockHostBillAPIClient
get_mock_client = hostbill_api_client.get_mock_client


class TestHostBillAPIClient:
    """Test suite for HostBill API client functionality."""
    
    def test_get_billing_info_should_return_client_data(self):
        """GREEN: Test that API client can retrieve billing information."""
        api_client = MockHostBillAPIClient()
        
        result = api_client.get_billing_info("ENTERPRISE_TIER_1")
        
        assert result["tier"] == "ENTERPRISE_TIER_1"
        assert result["client_id"] == "YO-LIFE-001"
        assert result["mrr"] == 127.97
        assert "billing_cycle" in result
    
    def test_create_invoice_should_generate_invoice_id(self):
        """GREEN: Test that API client can create invoices."""
        api_client = MockHostBillAPIClient()
        
        invoice_data = {
            "client_id": "test-client-123",
            "amount": 127.97,
            "description": "STX Enterprise Hosting - Tier 1"
        }
        
        result = api_client.create_invoice(invoice_data)
        
        assert "invoice_id" in result
        assert result["status"] == "paid"
        assert result["amount"] == 127.97
        assert result["currency"] == "USD"
    
    def test_update_telemetry_should_post_consumption_data(self):
        """GREEN: Test that API client can post telemetry updates."""
        api_client = MockHostBillAPIClient()
        
        telemetry = HostBillTelemetry(
            timestamp_utc="2026-03-31T02:00:00Z",
            active_nodes=[
                NodeConsumption(
                    node_id="stx-aio-0",
                    power_watts=150.0,
                    compute_utilization=45.2,
                    memory_utilization=62.8
                )
            ],
            synthetic_billing=SyntheticBilling(
                billing_tier="ENTERPRISE_TIER_1",
                synthetic_mrr_usd=127.97
            )
        )
        
        result = api_client.update_telemetry(telemetry)
        
        assert result["status"] == "success"
        assert result["node_id"] == "stx-aio-0"
        assert result["metrics"]["power_watts"] == 150.0
    
    def test_authenticate_should_return_valid_token(self):
        """GREEN: Test that API client authentication works."""
        api_client = MockHostBillAPIClient()
        
        token = api_client.authenticate()
        
        assert token is not None
        assert len(token) > 10
        assert token.startswith("mock-token-")
    
    def test_request_history_tracking(self):
        """GREEN: Test that API client tracks request history."""
        api_client = MockHostBillAPIClient()
        
        # Make some requests
        api_client.authenticate()
        api_client.get_billing_info("ENTERPRISE_TIER_1")
        api_client.create_invoice({"amount": 100.0})
        
        history = api_client.get_request_history()
        
        assert len(history) == 3
        assert history[0]["endpoint"] == "/auth/token"
        assert history[1]["endpoint"] == "/billing/info"
        assert history[2]["endpoint"] == "/invoices"
    
    def test_tier_2_billing_info(self):
        """GREEN: Test TIER_2 billing configuration."""
        api_client = MockHostBillAPIClient()
        
        result = api_client.get_billing_info("ENTERPRISE_TIER_2")
        
        assert result["tier"] == "ENTERPRISE_TIER_2"
        assert result["client_id"] == "ROOZ-LIVE-001"
        assert result["mrr"] == 195.00
    
    def test_tier_3_billing_info(self):
        """GREEN: Test TIER_3 billing configuration."""
        api_client = MockHostBillAPIClient()
        
        result = api_client.get_billing_info("ENTERPRISE_TIER_3")
        
        assert result["tier"] == "ENTERPRISE_TIER_3"
        assert result["client_id"] == "TAG-OOO-001"
        assert result["mrr"] == 295.00
    
    def test_reset_functionality(self):
        """GREEN: Test mock client reset functionality."""
        api_client = MockHostBillAPIClient()
        
        # Make requests
        api_client.authenticate()
        assert len(api_client.get_request_history()) == 1
        
        # Reset
        api_client.reset()
        assert len(api_client.get_request_history()) == 0
        assert api_client._auth_token is None


class TestHostBillDataMapping:
    """Test suite for data mapping between STX telemetry and HostBill format."""
    
    def test_map_stx_power_to_mrr(self):
        """GREEN: Test mapping STX power readings to MRR calculations."""
        # Test the existing compute_dynamic_mrr function
        mrr = compute_dynamic_mrr(150.0)
        
        assert mrr > 115.00  # Base tier
        assert mrr < 200.00  # Should be reasonable
        assert isinstance(mrr, float)
        
        # Test with different power values
        mrr_low = compute_dynamic_mrr(100.0)
        mrr_high = compute_dynamic_mrr(200.0)
        
        assert mrr_high > mrr_low
    
    def test_enterprise_tier_pricing_structure(self):
        """GREEN: Test enterprise tier pricing calculations."""
        base_costs = {
            "ENTERPRISE_TIER_1": 115.00,
            "ENTERPRISE_TIER_2": 195.00,
            "ENTERPRISE_TIER_3": 295.00
        }
        
        # Verify tier progression
        assert base_costs["ENTERPRISE_TIER_2"] > base_costs["ENTERPRISE_TIER_1"]
        assert base_costs["ENTERPRISE_TIER_3"] > base_costs["ENTERPRISE_TIER_2"]


class TestHostBillIntegration:
    """Integration tests for HostBill sync with STX telemetry."""
    
    def test_sync_telemetry_to_hostbill_with_mock(self):
        """GREEN: Test end-to-end telemetry sync using mock API."""
        # Import dynamically using importlib
        import importlib.util
        from pathlib import Path
        
        # Load hostbill_sync_agent module
        sync_agent_path = Path(__file__).parent.parent.parent / "scripts" / "ci" / "hostbill-sync-agent.py"
        spec = importlib.util.spec_from_file_location("hostbill_sync_agent", sync_agent_path)
        hostbill_sync_agent = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(hostbill_sync_agent)
        
        # Mock STX telemetry using the actual function
        original_extract = hostbill_sync_agent.extract_live_stx_telemetry
        hostbill_sync_agent.extract_live_stx_telemetry = lambda: 150.0
        
        # Create mock client
        api_client = MockHostBillAPIClient()
        
        # Simulate sync process
        watts = hostbill_sync_agent.extract_live_stx_telemetry()
        mrr = hostbill_sync_agent.compute_dynamic_mrr(watts)
        
        billing_info = api_client.get_billing_info("ENTERPRISE_TIER_1")
        
        # Verify telemetry was processed
        assert watts == 150.0
        assert mrr > 100.0
        assert billing_info["tier"] == "ENTERPRISE_TIER_1"
        assert billing_info["mrr"] > 0
        
        # Restore original function
        hostbill_sync_agent.extract_live_stx_telemetry = original_extract
    
    def test_error_handling_with_invalid_tier(self):
        """GREEN: Test error handling for invalid tier."""
        api_client = MockHostBillAPIClient()
        
        # Should default to TIER_1 for invalid tier
        result = api_client.get_billing_info("INVALID_TIER")
        
        assert result["tier"] == "ENTERPRISE_TIER_1"
        assert result["mrr"] == 127.97


class TestGlobalMockClient:
    """Test global mock client instance management."""
    
    def test_get_mock_client_singleton(self):
        """GREEN: Test that global mock client is a singleton."""
        client1 = get_mock_client()
        client2 = get_mock_client()
        
        assert client1 is client2
    
    def test_reset_global_client(self):
        """GREEN: Test resetting global mock client."""
        # Get client and make request
        client = get_mock_client()
        client.authenticate()
        
        # Reset
        hostbill_api_client.reset_mock_client()
        
        # Get fresh client
        fresh_client = get_mock_client()
        assert len(fresh_client.get_request_history()) == 0


if __name__ == "__main__":
    # Run in GREEN phase - all tests should pass
    pytest.main([__file__, "-v", "--tb=short"])
