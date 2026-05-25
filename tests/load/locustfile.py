"""
Locust load test for the billing pipeline.
Scale target: DoR: 500 req/s at p99 < 200ms
"""

import os
import uuid
from datetime import datetime, timezone

try:
    from locust import HttpUser, task, between
except ImportError:
    raise ImportError(
        "Locust is not installed. Install it with:\n"
        "  pip install locust\n"
        "or:\n"
        "  pip install -r requirements-load-test.txt"
    )


class BillingAPIUser(HttpUser):
    # DoR: 500 req/s at p99 < 200ms
    wait_time = between(0.5, 2)
    host = os.environ.get("BILLING_API_HOST", "http://localhost:8000")

    def on_start(self):
        """Mock auth: obtain token before running tasks."""
        response = self.client.post(
            "/api/v1/auth/token",
            json={
                "client_id": "load-test-client",
                "client_secret": "load-test-secret",
                "grant_type": "client_credentials",
            },
            name="/api/v1/auth/token (on_start)",
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token", "")
            self.client.headers.update({"Authorization": f"Bearer {token}"})

    @task(3)
    def get_health(self):
        """Health check endpoint — weight 3."""
        self.client.get("/health", name="/health")

    @task(5)
    def get_rate(self):
        """Fetch rate for a random technician — weight 5."""
        technician_id = str(uuid.uuid4())
        self.client.get(
            f"/api/v1/rates/{technician_id}",
            name="/api/v1/rates/{technician_id}",
        )

    @task(3)
    def post_event(self):
        """Clock-in event — weight 3."""
        self.client.post(
            "/api/v1/events",
            json={
                "event_type": "clock_in",
                "entity_uuid": str(uuid.uuid4()),
                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "location": "36.1234,-78.5678",
                },
            },
            name="/api/v1/events",
        )

    @task(1)
    def generate_invoice(self):
        """Generate invoice for a project — weight 1."""
        self.client.post(
            "/api/v1/invoices/generate",
            json={
                "project_id": str(uuid.uuid4()),
                "technician_id": str(uuid.uuid4()),
                "line_items": [
                    {
                        "description": "Field service — standard rate",
                        "quantity": 8.0,
                        "unit": "hours",
                        "unit_price_cents": 12500,
                    },
                    {
                        "description": "Travel allowance",
                        "quantity": 1,
                        "unit": "flat",
                        "unit_price_cents": 5000,
                    },
                ],
            },
            name="/api/v1/invoices/generate",
        )
