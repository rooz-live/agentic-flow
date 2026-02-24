#!/usr/bin/env python3
"""Tests for src/resilience.py — Circuit Breaker, Retry, Cache, Schema Validation."""

import sys
import os
import time

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.resilience import (
    CircuitBreaker,
    CircuitOpenError,
    CircuitState,
    ValidationCache,
    SchemaError,
    retry_with_backoff,
    validate_document_schema,
    resilient_call,
)


# ============================================================
# Circuit Breaker Tests
# ============================================================

def test_circuit_breaker_starts_closed():
    cb = CircuitBreaker(failure_threshold=3, name="test")
    assert cb.state == CircuitState.CLOSED


def test_circuit_breaker_stays_closed_on_success():
    cb = CircuitBreaker(failure_threshold=3, name="test")
    result = cb.call(lambda: 42)
    assert result == 42
    assert cb.state == CircuitState.CLOSED
    assert cb.stats.success_count == 1


def test_circuit_breaker_opens_after_threshold():
    cb = CircuitBreaker(failure_threshold=3, name="test")

    def fail():
        raise ConnectionError("boom")

    for _ in range(3):
        try:
            cb.call(fail)
        except ConnectionError:
            pass

    assert cb.state == CircuitState.OPEN
    assert cb.stats.failure_count == 3


def test_circuit_breaker_rejects_when_open():
    cb = CircuitBreaker(failure_threshold=2, name="test")

    def fail():
        raise ConnectionError("boom")

    for _ in range(2):
        try:
            cb.call(fail)
        except ConnectionError:
            pass

    try:
        cb.call(lambda: 42)
        assert False, "Should have raised CircuitOpenError"
    except CircuitOpenError:
        pass

    assert cb.stats.rejected_count == 1


def test_circuit_breaker_half_open_after_timeout():
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=1, name="test")

    def fail():
        raise ConnectionError("boom")

    for _ in range(2):
        try:
            cb.call(fail)
        except ConnectionError:
            pass

    assert cb.state == CircuitState.OPEN

    # Wait for recovery timeout
    time.sleep(1.1)
    assert cb.state == CircuitState.HALF_OPEN


def test_circuit_breaker_closes_from_half_open():
    cb = CircuitBreaker(
        failure_threshold=2, recovery_timeout=1,
        success_threshold=1, name="test",
    )

    def fail():
        raise ConnectionError("boom")

    for _ in range(2):
        try:
            cb.call(fail)
        except ConnectionError:
            pass

    time.sleep(1.1)  # Enter HALF_OPEN
    assert cb.state == CircuitState.HALF_OPEN

    # Success in half-open → closes
    result = cb.call(lambda: "ok")
    assert result == "ok"
    assert cb.state == CircuitState.CLOSED


def test_circuit_breaker_decorator():
    cb = CircuitBreaker(failure_threshold=3, name="test-deco")

    @cb.protect
    def add(a, b):
        return a + b

    assert add(2, 3) == 5
    assert cb.stats.success_count == 1


def test_circuit_breaker_reset():
    cb = CircuitBreaker(failure_threshold=2, name="test-reset")

    def fail():
        raise ConnectionError("boom")

    for _ in range(2):
        try:
            cb.call(fail)
        except ConnectionError:
            pass

    assert cb.state == CircuitState.OPEN
    cb.reset()
    assert cb.state == CircuitState.CLOSED
    assert cb._failure_count == 0


def test_circuit_breaker_to_dict():
    cb = CircuitBreaker(failure_threshold=5, name="test-dict")
    cb.call(lambda: True)
    d = cb.to_dict()
    assert d["name"] == "test-dict"
    assert d["state"] == "closed"
    assert d["stats"]["success_count"] == 1


# ============================================================
# Retry with Backoff Tests
# ============================================================

def test_retry_succeeds_first_attempt():
    call_count = 0

    @retry_with_backoff(max_attempts=3, base_delay=0.01)
    def succeed():
        nonlocal call_count
        call_count += 1
        return "ok"

    assert succeed() == "ok"
    assert call_count == 1


def test_retry_succeeds_after_failures():
    call_count = 0

    @retry_with_backoff(
        max_attempts=3, base_delay=0.01,
        retryable_exceptions=(ConnectionError,),
    )
    def fail_twice():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise ConnectionError("transient")
        return "recovered"

    assert fail_twice() == "recovered"
    assert call_count == 3


def test_retry_raises_after_max_attempts():
    @retry_with_backoff(
        max_attempts=2, base_delay=0.01,
        retryable_exceptions=(ValueError,),
    )
    def always_fail():
        raise ValueError("permanent")

    try:
        always_fail()
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "permanent" in str(e)


def test_retry_does_not_catch_non_retryable():
    @retry_with_backoff(
        max_attempts=3, base_delay=0.01,
        retryable_exceptions=(ConnectionError,),
    )
    def raise_type_error():
        raise TypeError("wrong type")

    try:
        raise_type_error()
        assert False, "Should have raised TypeError"
    except TypeError:
        pass  # Expected — not in retryable_exceptions


def test_retry_on_retry_callback():
    retries_seen = []

    def on_retry(attempt, exc):
        retries_seen.append(attempt)

    @retry_with_backoff(
        max_attempts=3, base_delay=0.01,
        retryable_exceptions=(RuntimeError,),
        on_retry=on_retry,
    )
    def fail_then_succeed():
        if len(retries_seen) < 2:
            raise RuntimeError("retry me")
        return "done"

    assert fail_then_succeed() == "done"
    assert retries_seen == [1, 2]


# ============================================================
# Validation Cache Tests
# ============================================================

def test_cache_miss_then_hit():
    cache = ValidationCache(max_size=10, ttl_seconds=60)
    assert cache.get("hello", "test") is None  # miss
    cache.set("hello", "test", {"score": 95})
    assert cache.get("hello", "test") == {"score": 95}  # hit
    assert cache._hits == 1
    assert cache._misses == 1


def test_cache_ttl_expiry():
    cache = ValidationCache(max_size=10, ttl_seconds=1)
    cache.set("content", "type", {"result": True})
    assert cache.get("content", "type") is not None
    time.sleep(1.1)
    assert cache.get("content", "type") is None  # expired


def test_cache_eviction():
    cache = ValidationCache(max_size=2, ttl_seconds=60)
    cache.set("a", "t", 1)
    time.sleep(0.01)
    cache.set("b", "t", 2)
    time.sleep(0.01)
    cache.set("c", "t", 3)  # Should evict "a"
    assert cache.get("a", "t") is None
    assert cache.get("b", "t") == 2
    assert cache.get("c", "t") == 3


def test_cache_invalidate():
    cache = ValidationCache(max_size=10, ttl_seconds=60)
    cache.set("x", "y", "value")
    cache.invalidate("x", "y")
    assert cache.get("x", "y") is None


def test_cache_hit_rate():
    cache = ValidationCache(max_size=10, ttl_seconds=60)
    cache.set("a", "t", 1)
    cache.get("a", "t")  # hit
    cache.get("b", "t")  # miss
    assert cache.hit_rate == 0.5


def test_cache_to_dict():
    cache = ValidationCache(max_size=50, ttl_seconds=120)
    cache.set("a", "t", 1)
    d = cache.to_dict()
    assert d["size"] == 1
    assert d["max_size"] == 50
    assert d["ttl_seconds"] == 120.0


# ============================================================
# Document Schema Validation Tests
# ============================================================

def test_schema_wsjf_item_valid():
    doc = {
        "id": "WSJF-001",
        "title": "Test Item",
        "business_value": 5.0,
        "time_criticality": 7.0,
        "risk_reduction": 3.0,
        "job_size": 4.0,
    }
    errors = validate_document_schema(doc, "wsjf_item")
    assert len(errors) == 0


def test_schema_wsjf_item_out_of_bounds():
    doc = {
        "id": "WSJF-001",
        "title": "Test",
        "business_value": 15.0,  # over 10
        "time_criticality": 7.0,
        "risk_reduction": 0.0,   # under 1
        "job_size": 4.0,
    }
    errors = validate_document_schema(doc, "wsjf_item")
    error_fields = [e.field for e in errors]
    assert "business_value" in error_fields
    assert "risk_reduction" in error_fields


def test_schema_wsjf_item_missing_fields():
    doc = {"id": "WSJF-001"}
    errors = validate_document_schema(doc, "wsjf_item")
    error_fields = [e.field for e in errors]
    assert "title" in error_fields
    assert "business_value" in error_fields


def test_schema_wsjf_extreme_without_justification():
    doc = {
        "id": "X",
        "title": "Extreme",
        "business_value": 10.0,
        "time_criticality": 10.0,
        "risk_reduction": 5.0,
        "job_size": 2.0,
    }
    errors = validate_document_schema(doc, "wsjf_item")
    warnings = [e for e in errors if e.severity == "WARNING"]
    assert any("justification" in w.field for w in warnings)


def test_schema_wsjf_extreme_with_justification():
    doc = {
        "id": "X",
        "title": "Extreme",
        "business_value": 10.0,
        "time_criticality": 10.0,
        "risk_reduction": 5.0,
        "job_size": 2.0,
        "justification": "Court deadline in 24h",
    }
    errors = validate_document_schema(doc, "wsjf_item")
    assert len(errors) == 0


def test_schema_settlement_valid():
    doc = {
        "content": "Settlement proposal for case 26CV005596-590 between parties..." * 5,
        "parties": ["Bhopti", "MAA"],
        "case_number": "26CV005596-590",
        "deadline": "2026-03-03",
    }
    errors = validate_document_schema(doc, "settlement")
    assert len(errors) == 0


def test_schema_settlement_missing_parties():
    doc = {
        "content": "Settlement text..." * 10,
        "parties": ["Bhopti"],  # Only 1
    }
    errors = validate_document_schema(doc, "settlement")
    error_fields = [e.field for e in errors]
    assert "parties" in error_fields


def test_schema_court_valid_case_number():
    doc = {
        "content": "Answer to Summary Ejectment..." * 5,
        "case_number": "26CV007491-590",
        "filing_type": "answer",
    }
    errors = validate_document_schema(doc, "court")
    assert len(errors) == 0


def test_schema_court_invalid_case_number():
    doc = {
        "content": "Filing content..." * 5,
        "case_number": "BADFORMAT",
        "filing_type": "motion",
    }
    errors = validate_document_schema(doc, "court")
    assert any("case_number" in e.field for e in errors)


def test_schema_generic_missing_content():
    errors = validate_document_schema({}, "generic")
    assert any(e.field == "content" for e in errors)


# ============================================================
# Resilient Call Tests
# ============================================================

def test_resilient_call_simple():
    result = resilient_call(lambda: 42, max_retries=1)
    assert result == 42


def test_resilient_call_with_cache():
    cache = ValidationCache(max_size=10, ttl_seconds=60)
    call_count = 0

    def expensive():
        nonlocal call_count
        call_count += 1
        return "computed"

    # First call computes
    r1 = resilient_call(expensive, cache=cache, cache_key=("k", "t"), max_retries=1)
    assert r1 == "computed"
    assert call_count == 1

    # Second call uses cache
    r2 = resilient_call(expensive, cache=cache, cache_key=("k", "t"), max_retries=1)
    assert r2 == "computed"
    assert call_count == 1  # Not called again


def test_resilient_call_with_circuit_breaker():
    cb = CircuitBreaker(failure_threshold=2, name="resilient-test")
    result = resilient_call(lambda: "ok", circuit_breaker=cb, max_retries=1)
    assert result == "ok"
    assert cb.stats.success_count == 1


# ============================================================
# Run all tests
# ============================================================

if __name__ == "__main__":
    test_funcs = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = 0
    failed = 0

    for test in test_funcs:
        try:
            test()
            passed += 1
            print(f"  ✓ {test.__name__}")
        except Exception as e:
            failed += 1
            print(f"  ✗ {test.__name__}: {e}")

    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")

    if failed > 0:
        sys.exit(1)
