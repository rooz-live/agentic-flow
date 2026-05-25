#!/usr/bin/env python3
"""
HostBill Mock API Client — CI stub
Provides MockHostBillAPIClient, get_mock_client, and reset_mock_client.

Used by tests/hostbill/test_api_client.py for unit/integration tests
without making live HTTP calls to the HostBill instance.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
import uuid
import os


# ── Billing tier configuration ─────────────────────────────────────────────

_TIER_CONFIG: Dict[str, Dict[str, Any]] = {
    "ENTERPRISE_TIER_1": {
        "client_id": "YO-LIFE-001",
        "mrr": 127.97,
        "billing_cycle": "monthly",
    },
    "ENTERPRISE_TIER_2": {
        "client_id": "ROOZ-LIVE-001",
        "mrr": 195.00,
        "billing_cycle": "monthly",
    },
    "ENTERPRISE_TIER_3": {
        "client_id": "TAG-OOO-001",
        "mrr": 295.00,
        "billing_cycle": "monthly",
    },
}

_DEFAULT_TIER = "ENTERPRISE_TIER_1"


# ── Mock client ────────────────────────────────────────────────────────────

class MockHostBillAPIClient:
    """
    In-memory mock of the HostBill API client.
    Records request history; no real HTTP calls.
    """

    def __init__(self):
        self._request_history: List[Dict[str, Any]] = []
        self._auth_token: Optional[str] = None

    # ── Auth ────────────────────────────────────────────────────────────────

    def authenticate(self) -> str:
        """Return a deterministic mock auth token."""
        token = f"mock-token-{uuid.uuid4().hex[:12]}"
        self._auth_token = token
        self._record("/auth/token", {"method": "POST"})
        return token

    # ── Billing info ────────────────────────────────────────────────────────

    def get_billing_info(self, tier: str) -> Dict[str, Any]:
        """Return mock billing info for the requested tier (defaults to TIER_1)."""
        cfg = _TIER_CONFIG.get(tier, _TIER_CONFIG[_DEFAULT_TIER])
        self._record("/billing/info", {"tier": tier})
        return {
            "tier": tier if tier in _TIER_CONFIG else _DEFAULT_TIER,
            "client_id": cfg["client_id"],
            "mrr": cfg["mrr"],
            "billing_cycle": cfg["billing_cycle"],
        }

    # ── Invoice creation ────────────────────────────────────────────────────

    def create_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a mock invoice and return a response envelope."""
        self._record("/invoices", invoice_data)
        return {
            "invoice_id": f"INV-{uuid.uuid4().hex[:8].upper()}",
            "status": "paid",
            "amount": invoice_data.get("amount", 0.0),
            "currency": "USD",
            "description": invoice_data.get("description", ""),
        }

    # ── Telemetry update ────────────────────────────────────────────────────

    def update_telemetry(self, telemetry: Any) -> Dict[str, Any]:
        """Accept a HostBillTelemetry object and return a mock success response."""
        node_id = "unknown"
        power_watts = 0.0

        if hasattr(telemetry, "active_nodes") and telemetry.active_nodes:
            first_node = telemetry.active_nodes[0]
            node_id = getattr(first_node, "node_id", "unknown")
            power_watts = getattr(first_node, "power_watts", 0.0)

        self._record("/telemetry", {"node_id": node_id})
        return {
            "status": "success",
            "node_id": node_id,
            "metrics": {
                "power_watts": power_watts,
            },
        }

    # ── History ─────────────────────────────────────────────────────────────

    def get_request_history(self) -> List[Dict[str, Any]]:
        """Return a copy of the recorded request history."""
        return list(self._request_history)

    def reset(self) -> None:
        """Clear all recorded requests and auth state."""
        self._request_history.clear()
        self._auth_token = None

    # ── Internal ────────────────────────────────────────────────────────────

    def _record(self, endpoint: str, data: Any) -> None:
        self._request_history.append({"endpoint": endpoint, "data": data})


# ── Global singleton ───────────────────────────────────────────────────────

_GLOBAL_CLIENT: Optional[MockHostBillAPIClient] = None


def get_mock_client() -> MockHostBillAPIClient:
    """Return (or lazily create) the global MockHostBillAPIClient singleton."""
    global _GLOBAL_CLIENT
    if _GLOBAL_CLIENT is None:
        _GLOBAL_CLIENT = MockHostBillAPIClient()
    return _GLOBAL_CLIENT


def reset_mock_client() -> None:
    """Destroy the global singleton so the next call to get_mock_client() returns fresh."""
    global _GLOBAL_CLIENT
    _GLOBAL_CLIENT = None


if __name__ == "__main__":
    client = get_mock_client()
    token = client.authenticate()
    print(f"Auth token: {token}")
    info = client.get_billing_info("ENTERPRISE_TIER_1")
    print(f"Billing info: {info}")
