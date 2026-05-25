"""Smoke tests for eventops_pyo3 Rust PyO3 extension module.

Tests validate that the maturin-built wheel is importable and all
core billing functions operate correctly from Python.
"""
import hashlib
import hmac
import pytest

eventops_pyo3 = pytest.importorskip("eventops_pyo3")


class TestValidateStripeSignature:
    """Tests for validate_stripe_signature (HMAC-SHA256 webhook verification)."""

    def test_valid_signature_returns_true(self):
        payload = '{"id": "evt_123", "type": "invoice.paid"}'
        secret = "whsec_test_secret"
        timestamp = "1234567890"
        signed = f"{timestamp}.{payload}"
        expected_sig = hmac.new(
            secret.encode(), signed.encode(), hashlib.sha256
        ).hexdigest()
        sig_header = f"t={timestamp},v1={expected_sig}"

        result = eventops_pyo3.validate_stripe_signature(payload, sig_header, secret)
        assert result is True

    def test_invalid_signature_raises(self):
        payload = '{"id": "evt_456"}'
        sig_header = "t=12345,v1=deadbeefdeadbeefdeadbeefdeadbeef"
        with pytest.raises(ValueError, match="ERR_SECURITY_THREAT"):
            eventops_pyo3.validate_stripe_signature(payload, sig_header, "secret")

    def test_missing_components_raises(self):
        with pytest.raises(ValueError, match="ERR_INVALID_CONTRACT_FORMAT"):
            eventops_pyo3.validate_stripe_signature("body", "garbage", "secret")


class TestGenerateUuidV7:
    """Tests for generate_uuid_v7 (timestamp-ordered UUID)."""

    def test_returns_valid_uuid_string(self):
        result = eventops_pyo3.generate_uuid_v7()
        # UUID v7 format: 8-4-4-4-12 hex chars
        parts = result.split("-")
        assert len(parts) == 5
        assert len(result) == 36

    def test_monotonically_increasing(self):
        a = eventops_pyo3.generate_uuid_v7()
        b = eventops_pyo3.generate_uuid_v7()
        # v7 UUIDs are time-ordered, so b >= a lexicographically
        assert b >= a


class TestVerifyImmutability:
    """Tests for verify_immutability (SHA-256 content hash check)."""

    def test_matching_hash_returns_true(self):
        payload = "immutable event data"
        expected_hash = hashlib.sha256(payload.encode()).hexdigest()
        assert eventops_pyo3.verify_immutability(payload, expected_hash) is True

    def test_mismatched_hash_raises(self):
        with pytest.raises(ValueError, match="ERR_INTEGRITY_VIOLATION"):
            eventops_pyo3.verify_immutability("data", "0000" * 16)


class TestCalculateDistance:
    """Tests for calculate_distance (Haversine geo distance in meters)."""

    def test_known_distance(self):
        # Vancouver (49.2827, -123.1207) to Seattle (47.6062, -122.3321)
        distance = eventops_pyo3.calculate_distance(
            49.2827, -123.1207, 47.6062, -122.3321
        )
        assert isinstance(distance, float)
        # Approximately 200 km = 200,000 m (±20 km tolerance)
        assert 180_000 < distance < 220_000

    def test_same_point_returns_zero(self):
        distance = eventops_pyo3.calculate_distance(0.0, 0.0, 0.0, 0.0)
        assert distance == 0.0
