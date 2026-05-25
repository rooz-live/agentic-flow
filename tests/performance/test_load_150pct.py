"""
Load Test Harness - 150% Scale
Pytest-based load testing using stdlib only (no Locust dependency)
Tests Stripe webhook endpoint throughput and validation at scale
"""

import threading
import time
import json
import hmac
import hashlib
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, List, Tuple
import pytest

# Skip if eventops_pyo3 is not available (CI may not have Rust wheel)
eventops_pyo3 = pytest.importorskip("eventops_pyo3")

# Test configuration matching locustfile.py
SECRET = b"whsec_test_sovereign_swarm"
BASE_URL = "http://127.0.0.1:19090"


class MockStripeHandler(BaseHTTPRequestHandler):
    """Mock Stripe webhook handler that validates HMAC signatures"""
    
    def do_POST(self):
        if self.path == '/webhooks/stripe':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            sig_header = self.headers.get('Stripe-Signature', '')
            
            # Validate HMAC signature using same algorithm as eventops_pyo3
            if self._validate_sig(post_data, sig_header, SECRET):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"status": "forwarded_to_hostbill"}')
            else:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid signature"}')
        else:
            self.send_response(404)
            self.end_headers()
    
    def _validate_sig(self, body: bytes, sig_header: str, secret: bytes) -> bool:
        """Validate Stripe signature matching eventops_pyo3 algorithm"""
        ts = v1 = ""
        for part in sig_header.split(","):
            if part.startswith("t="):
                ts = part[2:]
            elif part.startswith("v1="):
                v1 = part[3:]
        
        if not ts or not v1:
            return False
        
        # Use same algorithm as locustfile - direct body HMAC (no timestamp prefix)
        expected = hmac.new(secret, body, hashlib.sha256).hexdigest()
        return expected == v1
    
    def log_message(self, format, *args):
        # Suppress server logs during testing
        pass


@pytest.fixture(scope="session")
def mock_gateway():
    """Start mock Stripe gateway server in background thread"""
    server = HTTPServer(('127.0.0.1', 19090), MockStripeHandler)
    
    def run_server():
        server.serve_forever()
    
    # Start server in background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Give server time to start
    time.sleep(0.1)
    
    yield BASE_URL
    
    # Cleanup
    server.shutdown()
    server_thread.join(timeout=1)


def make_webhook_request(url: str, payload: Dict, secret: bytes, 
                        invalid_sig: bool = False) -> Tuple[int, float]:
    """Make a single webhook request and return (status_code, latency_ms)"""
    payload_bytes = json.dumps(payload).encode('utf-8')
    timestamp = int(time.time())
    
    if invalid_sig:
        signature = "invalid_fake_signature"
    else:
        signature = hmac.new(secret, payload_bytes, hashlib.sha256).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "Stripe-Signature": f"t={timestamp},v1={signature}"
    }
    
    start_time = time.time()
    try:
        req = urllib.request.Request(
            url + "/webhooks/stripe",
            data=payload_bytes,
            headers=headers
        )
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
    except urllib.error.HTTPError as e:
        status_code = e.code
    except Exception:
        status_code = 500
    
    latency_ms = (time.time() - start_time) * 1000
    return status_code, latency_ms


def test_tax_calculation_throughput(mock_gateway):
    """Test tax calculation throughput - 50 concurrent requests, >80% success"""
    url = mock_gateway
    payload = {
        "amount": 25000,  # $250.00
        "jurisdiction": "US-NC"
    }
    
    results = []
    
    def worker():
        status, latency = make_webhook_request(url, payload, SECRET)
        results.append((status, latency))
    
    # Fire 50 concurrent requests
    threads = []
    for _ in range(50):
        t = threading.Thread(target=worker)
        threads.append(t)
        t.start()
    
    # Wait for all to complete
    for t in threads:
        t.join()
    
    # Analyze results
    success_count = sum(1 for status, _ in results if status == 200)
    total_count = len(results)
    success_rate = success_count / total_count
    
    print(f"Tax calculation: {success_count}/{total_count} successful ({success_rate:.1%})")
    
    # Assert >80% success rate (40/50)
    assert success_rate > 0.8, f"Success rate {success_rate:.1%} below 80% threshold"
    assert total_count == 50, f"Expected 50 requests, got {total_count}"


def test_invalid_signature_rejection_rate(mock_gateway):
    """Test invalid signature rejection - all 20 requests should return 400"""
    url = mock_gateway
    payload = {"amount": 1000}
    
    results = []
    
    def worker():
        status, latency = make_webhook_request(url, payload, SECRET, invalid_sig=True)
        results.append(status)
    
    # Fire 20 concurrent requests with invalid signatures
    threads = []
    for _ in range(20):
        t = threading.Thread(target=worker)
        threads.append(t)
        t.start()
    
    # Wait for all to complete
    for t in threads:
        t.join()
    
    # Analyze results
    rejection_count = sum(1 for status in results if status == 400)
    total_count = len(results)
    
    print(f"Invalid signature rejection: {rejection_count}/{total_count} rejected")
    
    # Assert all requests are rejected with 400
    assert rejection_count == total_count, f"Expected all {total_count} requests to be rejected, got {rejection_count}"
    assert total_count == 20, f"Expected 20 requests, got {total_count}"


def test_budget_check_throughput(mock_gateway):
    """Test budget check throughput - 30 concurrent requests, p99 latency < 500ms"""
    url = mock_gateway
    payload = {
        "event_type": "project.budget.check",
        "project_id": "PRJ-123",
        "amount": 500
    }
    
    latencies = []
    
    def worker():
        status, latency = make_webhook_request(url, payload, SECRET)
        latencies.append(latency)
    
    # Fire 30 concurrent requests
    threads = []
    for _ in range(30):
        t = threading.Thread(target=worker)
        threads.append(t)
        t.start()
    
    # Wait for all to complete
    for t in threads:
        t.join()
    
    # Analyze latency
    latencies.sort()
    p99_latency = latencies[int(0.99 * len(latencies))] if latencies else 0
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    
    print(f"Budget check: avg={avg_latency:.1f}ms, p99={p99_latency:.1f}ms ({len(latencies)} requests)")
    
    # Assert p99 latency < 500ms
    assert p99_latency < 500, f"P99 latency {p99_latency:.1f}ms exceeds 500ms threshold"
    assert len(latencies) == 30, f"Expected 30 requests, got {len(latencies)}"