#!/usr/bin/env python3
"""
Mock HostBill API client for testing purposes.
Implements the interface that will be used for real API integration.
"""

import json
import time
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from datetime import datetime, timezone

logger = logging.getLogger("hostbill-api")


class MockHostBillAPIClient:
    """Mock implementation of HostBill API client for testing."""
    
    def __init__(self, base_url: str = None, api_key: str = None, timeout: int = 30):
        self.base_url = base_url or "https://api.hostbill.example.com/v1"
        self.api_key = api_key or "mock-api-key"
        self.timeout = timeout
        self._auth_token = None
        self._requests_made = []
        
    def authenticate(self) -> str:
        """Mock authentication - returns a fake token."""
        logger.info("Mock: Authenticating with HostBill API")
        self._auth_token = f"mock-token-{int(time.time())}"
        self._requests_made.append({
            "endpoint": "/auth/token",
            "method": "POST",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        return self._auth_token
    
    def get_billing_info(self, tier: str = "ENTERPRISE_TIER_1") -> Dict[str, Any]:
        """Mock retrieving billing information."""
        logger.info(f"Mock: Getting billing info for tier {tier}")
        
        billing_configs = {
            "ENTERPRISE_TIER_1": {
                "client_id": "YO-LIFE-001",
                "tier": "ENTERPRISE_TIER_1",
                "mrr": 127.97,
                "billing_cycle": "monthly",
                "next_invoice_date": "2026-04-30"
            },
            "ENTERPRISE_TIER_2": {
                "client_id": "ROOZ-LIVE-001", 
                "tier": "ENTERPRISE_TIER_2",
                "mrr": 195.00,
                "billing_cycle": "monthly",
                "next_invoice_date": "2026-04-30"
            },
            "ENTERPRISE_TIER_3": {
                "client_id": "TAG-OOO-001",
                "tier": "ENTERPRISE_TIER_3", 
                "mrr": 295.00,
                "billing_cycle": "monthly",
                "next_invoice_date": "2026-04-30"
            }
        }
        
        result = billing_configs.get(tier, billing_configs["ENTERPRISE_TIER_1"])
        self._requests_made.append({
            "endpoint": "/billing/info",
            "method": "GET",
            "params": {"tier": tier},
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return result
    
    def create_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Mock creating an invoice."""
        logger.info(f"Mock: Creating invoice for ${invoice_data.get('amount', 0)}")
        
        invoice_id = f"INV-{datetime.now().strftime('%Y-%m')}-{len(self._requests_made):05d}"
        
        result = {
            "invoice_id": invoice_id,
            "status": "paid",
            "amount": invoice_data.get("amount", 0),
            "currency": "USD",
            "description": invoice_data.get("description", "Mock invoice"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "paid_at": datetime.now(timezone.utc).isoformat()
        }
        
        self._requests_made.append({
            "endpoint": "/invoices",
            "method": "POST",
            "data": invoice_data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return result
    
    def update_telemetry(self, telemetry) -> Dict[str, Any]:
        """Mock updating telemetry data."""
        logger.info("Mock: Updating telemetry data")
        
        result = {
            "status": "success",
            "updated_fields": ["power_consumption", "compute_utilization", "memory_utilization"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "node_id": telemetry.active_nodes[0].node_id if telemetry.active_nodes else "unknown",
            "metrics": {
                "power_watts": telemetry.active_nodes[0].power_watts if telemetry.active_nodes else 0,
                "compute_utilization": telemetry.active_nodes[0].compute_utilization if telemetry.active_nodes else 0,
                "memory_utilization": telemetry.active_nodes[0].memory_utilization if telemetry.active_nodes else 0
            }
        }
        
        self._requests_made.append({
            "endpoint": "/telemetry/update",
            "method": "POST",
            "data": telemetry.model_dump() if hasattr(telemetry, 'model_dump') else str(telemetry),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return result
    
    def get_request_history(self) -> list:
        """Get history of mock requests made."""
        return self._requests_made.copy()
    
    def reset(self):
        """Reset mock state."""
        self._auth_token = None
        self._requests_made.clear()


# Global mock client instance for testing
_mock_client = None

def get_mock_client() -> MockHostBillAPIClient:
    """Get or create the global mock client instance."""
    global _mock_client
    if _mock_client is None:
        _mock_client = MockHostBillAPIClient()
    return _mock_client


def reset_mock_client():
    """Reset the global mock client."""
    global _mock_client
    if _mock_client:
        _mock_client.reset()
