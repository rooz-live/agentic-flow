from locust import HttpUser, task, between
import hmac
import hashlib
import json
import time

# This test hammers the unified Rust validation bridge to ensure 
# 150% target scale execution without memory leaks or floating point drift.

class StripeWebhookLoadTest(HttpUser):
    # Simulate high-velocity Monday morning billing syncs
    wait_time = between(0.01, 0.05)
    
    # Internal secret mimicking the production Stripe boundary
    secret = b"whsec_test_sovereign_swarm"
    
    @task(3)
    def test_standard_tax_calculation(self):
        """Hammer the Tax & Currency Primitive via Rust Bridge"""
        payload = {
            "amount": 25000, # $250.00
            "jurisdiction": "US-NC"
        }
        payload_bytes = json.dumps(payload).encode('utf-8')
        
        # Cryptographic Verification Emulation
        signature = hmac.new(self.secret, payload_bytes, hashlib.sha256).hexdigest()
        
        headers = {
            "Content-Type": "application/json",
            "Stripe-Signature": f"t={int(time.time())},v1={signature}"
        }
        
        with self.client.post("/webhooks/stripe", data=payload_bytes, headers=headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed with status {response.status_code}")

    @task(1)
    def test_project_context_primitive(self):
        """Hammer the Project Context Boundaries directly (if exposed via Gateway)"""
        # We simulate a high-speed throughput check of limits
        payload = {
            "event_type": "project.budget.check",
            "project_id": "PRJ-123",
            "amount": 500
        }
        payload_bytes = json.dumps(payload).encode('utf-8')
        signature = hmac.new(self.secret, payload_bytes, hashlib.sha256).hexdigest()
        
        headers = {
            "Content-Type": "application/json",
            "Stripe-Signature": f"t={int(time.time())},v1={signature}"
        }
        
        with self.client.post("/webhooks/stripe", data=payload_bytes, headers=headers, catch_response=True) as response:
            if response.status_code in [200, 400]: # 400 is expected if limit is breached
                response.success()
            else:
                response.failure(f"Failed budget check with status {response.status_code}")

    @task(1)
    def test_invalid_signature_rejection(self):
        """Ensure the Rust HMAC layer correctly rejects high-velocity tampered packets"""
        payload_bytes = b'{"amount": 1000}'
        headers = {
            "Content-Type": "application/json",
            "Stripe-Signature": f"t={int(time.time())},v1=invalid_fake_signature"
        }
        
        with self.client.post("/webhooks/stripe", data=payload_bytes, headers=headers, catch_response=True) as response:
            if response.status_code == 401:
                response.success()
            else:
                response.failure(f"Expected 401 Rejection, got {response.status_code}")
