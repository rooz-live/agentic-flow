"""Unit tests for upstream error taxonomy expansion."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "cicd"))
import upstream_reporter


def test_classify_failure_maps_http_status_codes():
    """_classify_failure must map HTTP status codes to failure categories."""
    assert upstream_reporter._classify_failure("HTTP 404 Not Found", "FAIL") == "not_found"
    assert upstream_reporter._classify_failure("HTTP 403 Forbidden", "FAIL") == "forbidden"
    assert upstream_reporter._classify_failure("HTTP 500 Internal Server Error", "FAIL") == "server_error"
    assert upstream_reporter._classify_failure("HTTP 502 Bad Gateway", "FAIL") == "bad_gateway"
    assert upstream_reporter._classify_failure("HTTP 503 Service Unavailable", "FAIL") == "service_unavailable"
    assert upstream_reporter._classify_failure("HTTP 504 Gateway Timeout", "FAIL") == "gateway_timeout"
