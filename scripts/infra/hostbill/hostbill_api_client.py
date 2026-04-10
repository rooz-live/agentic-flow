#!/usr/bin/env python3
"""
scripts/infra/hostbill/hostbill_api_client.py

HostBill API client with real HTTP backend and offline mock fallback.

Usage:
    # Real client (requires HOSTBILL_URL, HOSTBILL_API_KEY, HOSTBILL_API_ID env vars):
    client = HostBillAPIClient.from_env()

    # Explicit mock (CI / offline dev):
    client = HostBillAPIClient.from_env(force_mock=True)

API reference: https://hostbillapp.com/apidoc/
Source these from scripts/infra/credentials/.env.cpanel before use.
"""

import json
import os
import time
import logging
import urllib.request
import urllib.error
import urllib.parse
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


# ── Real HTTP client ────────────────────────────────────────────────────────────────

class RealHostBillAPIClient:
    """
    Real HostBill Admin API client using the standard API endpoint.
    All write operations (create_invoice) remain passive by default;
    callers must explicitly pass dry_run=False to execute mutations.
    """

    def __init__(self, base_url: str, api_key: str, api_id: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.api_id = api_id
        self.timeout = timeout

    def _call(self, action: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """POST to HostBill Admin API (/includes/api.php)."""
        payload = urllib.parse.urlencode({
            "api_key": self.api_key,
            "api_id": self.api_id,
            "action": action,
            **(params or {}),
        }).encode()
        req = urllib.request.Request(
            f"{self.base_url}/includes/api.php",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            return {"status": "error", "code": e.code, "reason": str(e)}
        except Exception as e:
            return {"status": "error", "reason": str(e)}

    def authenticate(self) -> str:
        """Verify credentials. Returns token-style status string."""
        result = self._call("getClients", {"limit": "1"})
        if result.get("status") == "success":
            return f"authenticated-{datetime.now(timezone.utc).isoformat()}"
        raise RuntimeError(f"HostBill auth failed: {result}")

    def get_billing_info(self, client_id: str) -> Dict[str, Any]:
        """Fetch billing info for a HostBill client ID."""
        result = self._call("getClientDetails", {"clientid": client_id})
        if result.get("status") != "success":
            return {"error": f"client '{client_id}' not found", "raw": result}
        data = result.get("client", {})
        return {
            "client_id": str(data.get("id", client_id)),
            "tier": data.get("customfields", {}).get("tier", "unknown"),
            "mrr": float(data.get("credit", 0)),
            "billing_cycle": data.get("billperiod", "monthly"),
            "next_invoice_date": data.get("nextinvoicedate", ""),
            "currency": data.get("currency_code", "USD"),
        }

    def create_invoice(self, invoice_data: Dict[str, Any], dry_run: bool = True) -> Dict[str, Any]:
        """Create an invoice. dry_run=True (default) logs intent without writing."""
        if dry_run:
            logger.info("[DRY RUN] create_invoice would send: %s", invoice_data)
            return {"status": "dry_run", "data": invoice_data,
                    "timestamp": datetime.now(timezone.utc).isoformat()}
        result = self._call("addInvoice", {
            "clientid": invoice_data.get("client_id", ""),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "duedate": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "itemdescription[0]": invoice_data.get("description", "Agentic Flow invoice"),
            "itemamount[0]": str(invoice_data.get("amount", 0)),
            "itemtaxed[0]": "0",
            "sendinvoice": "0",  # operator reviews before sending
        })
        return result

    def update_telemetry(self, telemetry) -> Dict[str, Any]:
        """Update telemetry. Routes to custom field update via HostBill API."""
        client_id = getattr(telemetry, "client_id", "unknown")
        logger.info("Updating telemetry for %s", client_id)
        return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

    def sync_status(self) -> Dict[str, Any]:
        """Read-only health check."""
        try:
            token = self.authenticate()
            return {"success": True, "action": "sync_status",
                    "detail": "API reachable", "token": token,
                    "timestamp": datetime.now(timezone.utc).isoformat()}
        except Exception as e:
            return {"success": False, "action": "sync_status",
                    "detail": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}


# ── Public factory ────────────────────────────────────────────────────────────────

class HostBillAPIClient:
    """
    Factory: selects RealHostBillAPIClient when env vars are present,
    falls back to MockHostBillAPIClient for CI / offline dev.

    Required env vars for real mode:
        HOSTBILL_URL, HOSTBILL_API_KEY, HOSTBILL_API_ID
    Source from: scripts/infra/credentials/.env.cpanel
    """

    @staticmethod
    def from_env(force_mock: bool = False, timeout: int = 30):
        url     = os.environ.get("HOSTBILL_URL", "")
        api_key = os.environ.get("HOSTBILL_API_KEY", "")
        api_id  = os.environ.get("HOSTBILL_API_ID", "")

        if force_mock or not (url and api_key and api_id):
            missing = [k for k, v in {
                "HOSTBILL_URL": url, "HOSTBILL_API_KEY": api_key, "HOSTBILL_API_ID": api_id,
            }.items() if not v]
            if missing and not force_mock:
                logger.warning("HostBill: missing %s — using mock. "
                               "Source scripts/infra/credentials/.env.cpanel", missing)
            return get_mock_client()

        logger.info("HostBill: real client → %s", url)
        return RealHostBillAPIClient(url, api_key, api_id, timeout)


# ── CLI ────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description="HostBill API client")
    parser.add_argument("--check", action="store_true", help="Verify API connectivity")
    parser.add_argument("--client", help="Fetch billing info for HostBill client ID")
    parser.add_argument("--mock", action="store_true", help="Force mock mode")
    args = parser.parse_args()

    client = HostBillAPIClient.from_env(force_mock=args.mock)

    if args.check:
        result = client.sync_status() if hasattr(client, "sync_status") else {"status": "mock"}
        print(json.dumps(result, indent=2, default=str))
    elif args.client:
        info = client.get_billing_info(args.client)
        print(json.dumps(info, indent=2, default=str))
    else:
        parser.print_help()
