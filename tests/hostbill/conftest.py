#!/usr/bin/env python3
"""
Pytest configuration and fixtures for HostBill API testing.
Provides mock data and test infrastructure.
"""

import pytest
import json
from pathlib import Path
from unittest.mock import Mock
import sys
import os

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts" / "ci"))


@pytest.fixture
def mock_hostbill_responses():
    """Mock HostBill API responses for testing."""
    return {
        "auth": {
            "status": "success",
            "token": "mock-api-token-12345",
            "expires_in": 3600
        },
        "billing_info": {
            "client_id": "test-client-123",
            "tier": "ENTERPRISE_TIER_1",
            "mrr": 127.97,
            "billing_cycle": "monthly",
            "next_invoice_date": "2026-04-30"
        },
        "create_invoice": {
            "invoice_id": "INV-2026-03-12345",
            "status": "paid",
            "amount": 127.97,
            "currency": "USD",
            "created_at": "2026-03-31T02:00:00Z"
        },
        "telemetry_update": {
            "status": "success",
            "updated_fields": ["power_consumption", "compute_utilization"],
            "timestamp": "2026-03-31T02:00:00Z"
        },
        "error_response": {
            "error": "API_RATE_LIMIT",
            "message": "Rate limit exceeded. Please try again later.",
            "retry_after": 60
        }
    }


@pytest.fixture
def sample_stx_telemetry():
    """Sample STX telemetry data for testing."""
    return {
        "node_id": "stx-aio-0",
        "timestamp": "2026-03-31T02:00:00Z",
        "power_watts": 150.0,
        "cpu_temp": 45.0,
        "fan_rpm": 1200.0,
        "compute_utilization": 45.2,
        "memory_utilization": 62.8,
        "network_io": {
            "bytes_in": 1024000,
            "bytes_out": 2048000
        }
    }


@pytest.fixture
def enterprise_tier_configs():
    """Enterprise tier configuration data."""
    return {
        "ENTERPRISE_TIER_1": {
            "base_mrr": 115.00,
            "power_rate": 0.12,
            "deprecation_rate": 0.08,
            "max_nodes": 1,
            "support_level": "standard"
        },
        "ENTERPRISE_TIER_2": {
            "base_mrr": 195.00,
            "power_rate": 0.11,
            "deprecation_rate": 0.07,
            "max_nodes": 2,
            "support_level": "priority"
        },
        "ENTERPRISE_TIER_3": {
            "base_mrr": 295.00,
            "power_rate": 0.10,
            "deprecation_rate": 0.06,
            "max_nodes": 4,
            "support_level": "premium"
        }
    }


@pytest.fixture
def mock_api_client():
    """Mock HostBill API client."""
    client = Mock()
    client.base_url = "https://api.hostbill.example.com"
    client.api_key = "test-api-key"
    client.timeout = 30
    return client


@pytest.fixture(autouse=True)
def setup_test_environment(tmp_path):
    """Setup test environment with necessary directories and files."""
    # Create test directories
    test_dirs = [
        tmp_path / ".goalie",
        tmp_path / "tests" / "hostbill" / "fixtures"
    ]
    
    for dir_path in test_dirs:
        dir_path.mkdir(parents=True, exist_ok=True)
    
    # Create test metrics log
    metrics_file = tmp_path / ".goalie" / "metrics_log.jsonl"
    metrics_file.write_text(json.dumps({
        "timestamp": "2026-03-31T02:00:00Z",
        "node_id": "test-node",
        "power": 150.0,
        "cpu_usage": 45.2,
        "memory_usage": 62.8
    }))
    
    # Change to test directory
    original_cwd = os.getcwd()
    os.chdir(tmp_path)
    
    yield
    
    # Cleanup
    os.chdir(original_cwd)


@pytest.fixture
def hostbill_api_endpoints():
    """HostBill API endpoint configurations."""
    return {
        "base_url": "https://api.hostbill.example.com/v1",
        "auth": "/auth/token",
        "billing": "/billing/info",
        "invoices": "/invoices",
        "telemetry": "/telemetry/update",
        "clients": "/clients"
    }


# Test markers for different test categories
def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "unit: Unit tests for individual components"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests for API interactions"
    )
    config.addinivalue_line(
        "markers", "red: Tests that should fail in RED phase"
    )
    config.addinivalue_line(
        "markers", "green: Tests that should pass in GREEN phase"
    )
