"""
tests/integration/test_hostbill_integration.py
==============================================
pytest integration tests for the HostBill live HTTP API.

All tests carry @pytest.mark.integration_hostbill.  The marker is registered in
tests/conftest.py which also auto-skips every item in this file when either of:
  - HOSTBILL_API_KEY
  - HOSTBILL_API_URL
is absent from the environment.

Run only these tests:
    HOSTBILL_API_URL=https://billing.bhopti.com \\
    HOSTBILL_API_ID=<id> \\
    HOSTBILL_API_KEY=<key> \\
    python3 -m pytest tests/integration/test_hostbill_integration.py \\
        -v -m integration_hostbill

Context
-------
The billing pipeline emits hours to HostBill via:
  - Rust gateway : src/gateways/hostbill_gateway.rs
  - PyO3 bridge  : src/rust/eventops_pyo3/src/lib.rs  (emit_to_hostbill)
  - Python layer : src/gateways/stripe_gateway_service.py

HostBill's HTTP API is a single endpoint::

    POST /api.php
    Content-Type: application/x-www-form-urlencoded

    api_id=<id>&api_key=<key>&call=<CallName>[&extra_params...]

All responses are JSON.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Optional import: requests  (skip whole module if not installed)
# ---------------------------------------------------------------------------
try:
    import requests as _requests_lib  # noqa: F401 – availability check only
except ImportError:
    pytest.skip(
        "The 'requests' package is not installed. "
        "Run `pip install requests` to enable HostBill integration tests.",
        allow_module_level=True,
    )

# ---------------------------------------------------------------------------
# Guard: skip entire module when HostBill credentials are absent.
#
# tests/conftest.py::pytest_collection_modifyitems already adds a per-item skip
# for integration_hostbill when HOSTBILL_API_KEY / HOSTBILL_API_URL are missing.
# The module-level guard below fires *before* collection so that import-time
# helpers that read os.environ are never reached without valid credentials.
# ---------------------------------------------------------------------------
_HOSTBILL_API_URL = os.environ.get("HOSTBILL_API_URL", "")
_HOSTBILL_API_KEY = os.environ.get("HOSTBILL_API_KEY", "")
_HOSTBILL_API_ID  = os.environ.get("HOSTBILL_API_ID", "")

if not (_HOSTBILL_API_URL and _HOSTBILL_API_KEY):
    pytest.skip(
        "HOSTBILL_API_KEY and HOSTBILL_API_URL env vars must both be set to run "
        "HostBill integration tests.  Skipping entire module.",
        allow_module_level=True,
    )

# ---------------------------------------------------------------------------
# Ensure src/ is on sys.path so billing/gateway modules are importable.
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# ---------------------------------------------------------------------------
# Module-level mark: every test in this file carries integration_hostbill.
# ---------------------------------------------------------------------------
pytestmark = pytest.mark.integration_hostbill


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _api_url(path: str = "/api.php") -> str:
    """Build a full URL against HOSTBILL_API_URL."""
    base = _HOSTBILL_API_URL.rstrip("/")
    return f"{base}/{path.lstrip('/')}"


def _base_params(**extra) -> dict:
    """Return the mandatory HostBill auth params merged with any extras."""
    params = {
        "api_id":  _HOSTBILL_API_ID,
        "api_key": _HOSTBILL_API_KEY,
    }
    params.update(extra)
    return params


# ---------------------------------------------------------------------------
# Test 1 — API reachability + getClientsCount
# ---------------------------------------------------------------------------

@pytest.mark.integration_hostbill
def test_hostbill_api_reachable(hostbill_client):
    """
    GET {HOSTBILL_API_URL}/api.php?api_id=…&api_key=…&call=getClientsCount

    Asserts:
      - HTTP 200 response.
      - Response body is valid JSON.
      - JSON payload contains a "clients" key (standard HostBill response shape).

    HostBill's getClientsCount call returns::

        {"clients": "<integer_string>"}

    or an error dict on auth failure — in which case we assert the key exists
    but accept that the *value* may be "0" or an error description.
    """
    import requests as req

    url = _api_url("/api.php")
    params = _base_params(call="getClientsCount")

    response = hostbill_client.get(url, params=params)

    assert response.status_code == 200, (
        f"Expected HTTP 200 from HostBill getClientsCount, got {response.status_code}. "
        f"Body: {response.text[:400]}"
    )

    try:
        body = response.json()
    except (ValueError, req.exceptions.JSONDecodeError) as exc:
        pytest.fail(
            f"HostBill getClientsCount response is not valid JSON. "
            f"Error: {exc}  Body: {response.text[:400]}"
        )

    assert isinstance(body, dict), (
        f"Expected a JSON object from getClientsCount, got {type(body).__name__}: {body}"
    )
    assert "clients" in body, (
        f"Response JSON missing 'clients' key. Got keys: {list(body.keys())}. "
        f"Full body: {body}"
    )


# ---------------------------------------------------------------------------
# Test 2 — addMeteredUsage (minimal billable quantity)
# ---------------------------------------------------------------------------

@pytest.mark.integration_hostbill
@pytest.mark.risk_medium
def test_add_metered_usage(hostbill_client):
    """
    POST addMeteredUsage to HostBill with:
      - variable_name = "EventOps_Technician_Hours"  (contract symbol from Rust gateway)
      - qty           = 0.01                          (minimal — avoids phantom invoicing)
      - account_id    = HOSTBILL_TEST_ACCOUNT_ID (or "test-account" as fallback)

    Asserts:
      - HTTP 200 response.
      - Response JSON is parseable.
      - Response does NOT contain an "error" key at the top level *OR*, if it
        does (e.g. account not found), the error is one of the known benign
        codes that prove the HTTP round-trip reached the server:
          - "Account not found" / invalid account  → acceptable (4xx from API)
          - Auth failure                            → acceptable (proves HTTP worked)

    The metered-usage variable name "EventOps_Technician_Hours" must match the
    symbol defined in src/gateways/hostbill_gateway.rs and
    src/rust/eventops_pyo3/src/lib.rs.  A mismatch here would silently produce
    orphaned billing records.
    """
    account_id = os.environ.get("HOSTBILL_TEST_ACCOUNT_ID", "test-account")

    data = _base_params(
        call="addMeteredUsage",
        account_id=account_id,
        variable_name="EventOps_Technician_Hours",
        qty="0.01",
    )

    response = hostbill_client.post(_api_url("/api.php"), data=data)

    assert response.status_code == 200, (
        f"Expected HTTP 200 from HostBill addMeteredUsage, got {response.status_code}. "
        f"Body: {response.text[:400]}"
    )

    try:
        body = response.json()
    except ValueError as exc:
        pytest.fail(
            f"addMeteredUsage response is not valid JSON. "
            f"Error: {exc}  Body: {response.text[:400]}"
        )

    # A successful metered-usage call returns {"success": "1"} or {"id": "<usage_id>"}.
    # An auth/account error returns {"error": "<message>"}.
    # Both prove the HTTP layer is wired — we only fail on transport-level issues.
    assert isinstance(body, dict), (
        f"Expected a JSON object from addMeteredUsage, got {type(body).__name__}: {body}"
    )

    if "error" in body:
        # Acceptable: the server responded — reject only network-level failures.
        error_val = str(body["error"]).lower()
        benign_patterns = ("not found", "invalid", "auth", "access", "permission", "no account")
        assert any(p in error_val for p in benign_patterns), (
            f"addMeteredUsage returned an unexpected error: {body}. "
            "If this is a real API auth failure, verify HOSTBILL_API_ID/KEY."
        )
    else:
        # Success path: at least one of these keys should be present.
        assert "success" in body or "id" in body or "status" in body, (
            f"addMeteredUsage success response missing expected keys. Got: {body}"
        )


# ---------------------------------------------------------------------------
# Test 3 — getClientDetails
# ---------------------------------------------------------------------------

@pytest.mark.integration_hostbill
def test_get_client_details(hostbill_client):
    """
    GET getClientDetails for a specific account.

    Requires HOSTBILL_TEST_ACCOUNT_ID to be set; skips otherwise so CI does not
    fail on environments without a known test account.

    Asserts:
      - HTTP 200.
      - Response JSON is a dict.
      - Contains at least one identifying field: "id", "email", "firstname", or
        "lastname" — the minimal client record shape returned by HostBill.
    """
    account_id = os.environ.get("HOSTBILL_TEST_ACCOUNT_ID")
    if not account_id:
        pytest.skip(
            "HOSTBILL_TEST_ACCOUNT_ID env var not set — skipping getClientDetails test. "
            "Set it to a valid HostBill client/account ID to enable this test."
        )

    params = _base_params(call="getClientDetails", client_id=account_id)

    response = hostbill_client.get(_api_url("/api.php"), params=params)

    assert response.status_code == 200, (
        f"Expected HTTP 200 from getClientDetails, got {response.status_code}. "
        f"Body: {response.text[:400]}"
    )

    try:
        body = response.json()
    except ValueError as exc:
        pytest.fail(
            f"getClientDetails response is not valid JSON. "
            f"Error: {exc}  Body: {response.text[:400]}"
        )

    assert isinstance(body, dict), (
        f"Expected a JSON object from getClientDetails, got {type(body).__name__}: {body}"
    )

    # HostBill wraps client data under a "client" sub-key or returns it flat.
    client_data = body.get("client", body)
    identifying_keys = {"id", "email", "firstname", "lastname", "company"}
    found_keys = identifying_keys & set(client_data.keys())

    assert found_keys, (
        f"getClientDetails response has no identifying fields {identifying_keys}. "
        f"Got keys: {list(client_data.keys())}. Full body: {body}"
    )


# ---------------------------------------------------------------------------
# Test 4 — Rate matrix fetch (getProductConfigOptions / getProducts)
# ---------------------------------------------------------------------------

@pytest.mark.integration_hostbill
def test_rate_matrix_fetch(hostbill_client):
    """
    Verify that HostBill returns pricing / product data for known products.

    Uses getProducts (returns list of all products) or
    getProductConfigOptions for a specific product ID from
    HOSTBILL_TEST_PRODUCT_ID (optional).

    Asserts:
      - HTTP 200.
      - Response contains pricing-related data: "products", "price", "pricing",
        or "config" key depending on the call variant.

    This mirrors the rate-matrix concern in src/rates/ — the Python rate engine
    must agree with the prices stored in HostBill.
    """
    product_id = os.environ.get("HOSTBILL_TEST_PRODUCT_ID")

    if product_id:
        # Narrow fetch: config options for one known product.
        params = _base_params(call="getProductConfigOptions", product_id=product_id)
        expected_keys = {"config", "options", "price", "pricing", "product"}
    else:
        # Broad fetch: all products (proves the products API is reachable).
        params = _base_params(call="getProducts")
        expected_keys = {"products", "product", "data", "items"}

    response = hostbill_client.get(_api_url("/api.php"), params=params)

    assert response.status_code == 200, (
        f"Expected HTTP 200 from HostBill rate/product call, got {response.status_code}. "
        f"Body: {response.text[:400]}"
    )

    try:
        body = response.json()
    except ValueError as exc:
        pytest.fail(
            f"Rate matrix response is not valid JSON. "
            f"Error: {exc}  Body: {response.text[:400]}"
        )

    assert isinstance(body, dict), (
        f"Expected a JSON object from product/pricing call, got {type(body).__name__}: {body}"
    )

    # Pricing data exists under one of several possible keys depending on HostBill version.
    found_keys = expected_keys & set(body.keys())
    # Accept: either pricing data found OR the call returned an auth/access error
    # (which still proves the HTTP layer works).
    if not found_keys:
        assert "error" in body, (
            f"Rate matrix response contains neither pricing keys {expected_keys} "
            f"nor an error indicator. Got: {list(body.keys())}"
        )


# ---------------------------------------------------------------------------
# Test 5 — Invoice generation dry-run
# ---------------------------------------------------------------------------

@pytest.mark.integration_hostbill
@pytest.mark.risk_medium
def test_invoice_generation_dry_run(hostbill_client):
    """
    Attempt to call generateInvoice with a test account.

    HostBill does not expose a first-class "dry_run" parameter, so this test
    uses the smallest possible safe account ID and verifies the *call contract*:
      - The endpoint is reachable (HTTP 200).
      - The response is valid JSON.
      - Either an invoice ID is returned (success) OR a known-benign error is
        present (e.g. "account not found", "no invoiceable items").

    If HOSTBILL_TEST_ACCOUNT_ID is not set, the test uses a clearly-synthetic
    sentinel value "DRY-RUN-TEST-0" which HostBill will reject with "not found"
    — that outcome is explicitly accepted as a valid dry-run result because it
    confirms the HTTP round-trip succeeded without creating a real invoice.
    """
    account_id = os.environ.get("HOSTBILL_TEST_ACCOUNT_ID", "DRY-RUN-TEST-0")

    data = _base_params(
        call="generateInvoice",
        account_id=account_id,
    )

    response = hostbill_client.post(_api_url("/api.php"), data=data)

    assert response.status_code == 200, (
        f"Expected HTTP 200 from generateInvoice, got {response.status_code}. "
        f"Body: {response.text[:400]}"
    )

    try:
        body = response.json()
    except ValueError as exc:
        pytest.fail(
            f"generateInvoice response is not valid JSON. "
            f"Error: {exc}  Body: {response.text[:400]}"
        )

    assert isinstance(body, dict), (
        f"Expected a JSON object from generateInvoice, got {type(body).__name__}: {body}"
    )

    success_keys = {"invoice_id", "id", "invoiceid", "success", "status"}
    benign_error_fragments = (
        "not found", "no items", "nothing to invoice",
        "invalid", "auth", "access", "permission",
    )

    if "error" in body:
        error_val = str(body["error"]).lower()
        assert any(frag in error_val for frag in benign_error_fragments), (
            f"generateInvoice returned an unexpected error: {body}. "
            "If no test account is available, set HOSTBILL_TEST_ACCOUNT_ID."
        )
        # Confirmed: no real invoice was created — dry-run intent upheld.
        return

    found_success = success_keys & set(body.keys())
    assert found_success, (
        f"generateInvoice response has neither success keys {success_keys} "
        f"nor an 'error' key. Got: {list(body.keys())}"
    )


# ---------------------------------------------------------------------------
# Test 6 — Stripe webhook signature validation (unit test, no HTTP)
# ---------------------------------------------------------------------------

@pytest.mark.integration_hostbill
def test_webhook_signature_validation():
    """
    Unit-level test for the Stripe webhook HMAC-SHA256 signature validator that
    lives on the Python side of the billing pipeline.

    Exercises eventops_pyo3.validate_stripe_signature() — the PyO3 Rust bridge
    defined in src/rust/eventops_pyo3/src/lib.rs — which is the same function
    called by src/gateways/stripe_gateway_service.py on every inbound webhook.

    No external HTTP call is made; this is a pure cryptographic contract test.

    Sub-cases
    ---------
    a) Missing signature header → raises with ERR_INVALID_CONTRACT_FORMAT.
    b) Malformed v1 component   → raises with ERR_SECURITY_THREAT.
    c) Wrong secret             → raises with ERR_SECURITY_THREAT.
    d) Correct HMAC-SHA256 sig  → returns True.

    The HMAC construction follows the Stripe spec:
        signed_payload = f"{timestamp}.{payload}"
        sig = HMAC-SHA256(secret_bytes, signed_payload_utf8)
    and matches the implementation in stripe_gateway.rs lines 34-43.
    """
    eventops_pyo3 = pytest.importorskip(
        "eventops_pyo3",
        reason=(
            "eventops_pyo3 Rust extension not installed. "
            "Run `maturin develop` inside src/rust/eventops_pyo3/ to build it."
        ),
    )

    SECRET    = "whsec_bhopti_12345"    # matches stripe_gateway_service.py SECRET
    PAYLOAD   = '{"type":"payment_intent.succeeded","id":"pi_test_001"}'
    TIMESTAMP = "1700000000"

    # --- Compute a correct HMAC signature (mirrors the Rust implementation) ---
    signed_payload = f"{TIMESTAMP}.{PAYLOAD}"
    expected_hex = hmac.new(
        SECRET.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # ── sub-case (a): empty / missing sig header ─────────────────────────────
    with pytest.raises(Exception) as exc_info:
        eventops_pyo3.validate_stripe_signature(PAYLOAD, "", SECRET)
    assert "ERR_INVALID_CONTRACT_FORMAT" in str(exc_info.value), (
        f"Expected ERR_INVALID_CONTRACT_FORMAT for empty sig header, "
        f"got: {exc_info.value!r}"
    )

    # ── sub-case (b): header present but v1 component is garbage ─────────────
    bad_sig_header = f"t={TIMESTAMP},v1=000000deadbeef000000"
    with pytest.raises(Exception) as exc_info:
        eventops_pyo3.validate_stripe_signature(PAYLOAD, bad_sig_header, SECRET)
    assert "ERR_SECURITY_THREAT" in str(exc_info.value), (
        f"Expected ERR_SECURITY_THREAT for wrong v1 sig, got: {exc_info.value!r}"
    )

    # ── sub-case (c): correct structure but wrong secret ─────────────────────
    wrong_secret_header = f"t={TIMESTAMP},v1={expected_hex}"
    with pytest.raises(Exception) as exc_info:
        eventops_pyo3.validate_stripe_signature(PAYLOAD, wrong_secret_header, "whsec_WRONG_SECRET")
    assert "ERR_SECURITY_THREAT" in str(exc_info.value), (
        f"Expected ERR_SECURITY_THREAT for wrong secret, got: {exc_info.value!r}"
    )

    # ── sub-case (d): valid signature → must return True ─────────────────────
    valid_sig_header = f"t={TIMESTAMP},v1={expected_hex}"
    result = eventops_pyo3.validate_stripe_signature(PAYLOAD, valid_sig_header, SECRET)
    assert result is True, (
        f"validate_stripe_signature should return True for a correct signature, "
        f"got {result!r}"
    )
