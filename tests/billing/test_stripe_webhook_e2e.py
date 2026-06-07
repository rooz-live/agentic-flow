#!/usr/bin/env python3
"""
End-to-End integration tests for Stripe Webhook Gateway.
"""

import sys
import threading
import time
import hmac
import hashlib
import json
import urllib.request
import urllib.error
from http.server import HTTPServer
from pathlib import Path

# Add project root to path for local imports
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

import pytest
import eventops_pyo3
from src.gateways.stripe_gateway_service import StripeGatewayHandler, SECRET


def get_free_port():
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port


class TestStripeWebhookE2E:
    """End-to-end integration tests for Stripe webhook receiver service."""

    @classmethod
    def setup_class(cls):
        cls.port = get_free_port()
        cls.server = HTTPServer(('127.0.0.1', cls.port), StripeGatewayHandler)
        cls.thread = threading.Thread(
            target=cls.server.serve_forever, daemon=True
        )
        cls.thread.start()
        # Wait a short moment for the server to start
        time.sleep(0.5)

    @classmethod
    def teardown_class(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_valid_webhook_payment_succeeded(self):
        """Valid webhook signature should succeed and write to EventStore."""
        payload = {
            "id": "evt_test_12345",
            "object": "event",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_12345",
                    "amount": 10000,
                    "currency": "usd"
                }
            }
        }
        payload_str = json.dumps(payload)
        timestamp = str(int(time.time()))
        signed_payload = f"{timestamp}.{payload_str}"
        sig = hmac.new(
            SECRET.encode(), signed_payload.encode(), hashlib.sha256
        ).hexdigest()
        sig_header = f"t={timestamp},v1={sig}"

        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/webhooks/stripe",
            data=payload_str.encode('utf-8'),
            headers={
                "Stripe-Signature": sig_header,
                "Content-Type": "application/json",
            },
            method="POST"
        )

        with urllib.request.urlopen(req) as response:
            assert response.status == 200
            resp_body = json.loads(response.read().decode('utf-8'))
            assert resp_body["status"] == "forwarded_to_hostbill"

        # Verify EventStore logging (.goalie/event_store_payments.jsonl)
        event_store_path = Path(".goalie/event_store_payments.jsonl")
        assert event_store_path.exists()

        found = False
        with open(event_store_path, "r") as f:
            for line in f:
                if not line.strip():
                    continue
                record = json.loads(line)
                if record.get("payload", {}).get("id") == "evt_test_12345":
                    found = True
                    break
        assert found, "Test event was not written to the EventStore"

    def test_invalid_webhook_signature_rejected(self):
        """Invalid webhook signature should be rejected with 400 Bad Request."""
        payload = {
            "id": "evt_test_bad_sig",
            "type": "payment_intent.succeeded"
        }
        payload_str = json.dumps(payload)
        sig_header = "t=12345,v1=wrong_signature_value"

        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/webhooks/stripe",
            data=payload_str.encode('utf-8'),
            headers={
                "Stripe-Signature": sig_header,
                "Content-Type": "application/json",
            },
            method="POST"
        )

        with pytest.raises(urllib.error.HTTPError) as exc_info:
            urllib.request.urlopen(req)
        assert exc_info.value.code == 400

    def test_route_not_found(self):
        """Requests to unsupported paths should return 404."""
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/invalid_path",
            method="POST"
        )
        with pytest.raises(urllib.error.HTTPError) as exc_info:
            urllib.request.urlopen(req)
        assert exc_info.value.code == 404

    def test_method_not_allowed(self):
        """GET request to /webhooks/stripe should return 405."""
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/webhooks/stripe",
            method="GET"
        )
        with pytest.raises(urllib.error.HTTPError) as exc_info:
            urllib.request.urlopen(req)
        assert exc_info.value.code == 405
