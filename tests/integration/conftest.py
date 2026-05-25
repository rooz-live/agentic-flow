"""
tests/integration/conftest.py — Fixtures for HostBill live integration tests.

Provides:
  - hostbill_client : requests.Session pre-configured with HostBill base URL and
                      API auth params sourced from env vars.
  - billing_api     : requests.Session pointed at the local FastAPI billing server
                      (src/billing/api_server.py, default port 8000).

Both fixtures are session-scoped to avoid re-creating connections on every test.
Neither fixture enforces env-var presence itself — individual tests or the
module-level skip guard in test_hostbill_integration.py own that responsibility.
"""

from __future__ import annotations

import os

import pytest

requests = pytest.importorskip(
    "requests",
    reason="'requests' package not installed — pip install requests",
)


# ---------------------------------------------------------------------------
# HostBill live-API session
# ---------------------------------------------------------------------------

class _HostBillSession(requests.Session):
    """
    A requests.Session subclass that:
      - Stores base_url so callers can build URLs with session.build_url(path).
      - Injects api_id / api_key into every outgoing request via a prepared-
        request hook so tests don't have to repeat auth boilerplate.

    Auth params are NOT added automatically to the query string here because
    HostBill's api.php endpoint expects them inside the POST body *or* as query
    params depending on the call — tests pass them explicitly to keep intent
    visible and assertions unambiguous.
    """

    def __init__(self, base_url: str, api_id: str, api_key: str) -> None:
        super().__init__()
        # Strip trailing slash for predictable URL construction.
        self.base_url: str = base_url.rstrip("/")
        self.api_id: str = api_id
        self.api_key: str = api_key
        # Default timeout applied to all requests made through this session.
        self._default_timeout: int = 15

    # Convenience builder so tests can write:
    #   session.build_url("/api.php")  →  "https://billing.bhopti.com/api.php"
    def build_url(self, path: str = "") -> str:
        return f"{self.base_url}/{path.lstrip('/')}" if path else self.base_url

    # Override request() to inject a default timeout if none is provided.
    def request(self, method, url, **kwargs):  # type: ignore[override]
        kwargs.setdefault("timeout", self._default_timeout)
        return super().request(method, url, **kwargs)


@pytest.fixture(scope="session")
def hostbill_client() -> _HostBillSession:
    """
    Return a _HostBillSession configured from env vars:

      HOSTBILL_API_URL  — e.g. https://billing.bhopti.com
      HOSTBILL_API_ID   — HostBill admin API ID  (optional, falls back to "")
      HOSTBILL_API_KEY  — HostBill admin API key

    Callers that need auth params inline can access session.api_id /
    session.api_key directly.  The fixture itself does NOT skip when env vars
    are absent — the test module's pytestmark does that via pytest_configure
    in tests/conftest.py.
    """
    base_url = os.environ.get("HOSTBILL_API_URL", "http://localhost")
    api_id   = os.environ.get("HOSTBILL_API_ID",  "")
    api_key  = os.environ.get("HOSTBILL_API_KEY",  "")

    session = _HostBillSession(
        base_url=base_url,
        api_id=api_id,
        api_key=api_key,
    )
    session.headers.update({
        "Accept":       "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":   "EventOps-BillingPipeline/1.0 pytest-integration",
    })
    yield session
    session.close()


# ---------------------------------------------------------------------------
# Local FastAPI billing server session
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def billing_api() -> requests.Session:
    """
    Return a requests.Session pointed at the local FastAPI billing server
    (src/billing/api_server.py, listening on http://localhost:8000).

    The session base URL is stored as billing_api.base_url for convenience.
    Tests that need the server running should start it independently (e.g.
    via a subprocess fixture or docker-compose) before exercising this fixture.
    """
    billing_base = os.environ.get("BILLING_API_URL", "http://localhost:8000")

    session = requests.Session()
    session.base_url = billing_base.rstrip("/")  # type: ignore[attr-defined]
    session.headers.update({
        "Accept":       "application/json",
        "Content-Type": "application/json",
        "User-Agent":   "EventOps-BillingPipeline/1.0 pytest-integration",
    })

    def _build_url(path: str = "") -> str:
        return f"{session.base_url}/{path.lstrip('/')}" if path else session.base_url

    session.build_url = _build_url  # type: ignore[attr-defined]

    yield session
    session.close()
