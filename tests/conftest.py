"""
Pytest configuration with environment-aware test markers.

Environment markers allow tests to be filtered based on the target environment:
- @pytest.mark.env_local: Tests that only run in local environment
- @pytest.mark.env_dev: Tests that require dev environment
- @pytest.mark.env_stg: Tests that require staging environment
- @pytest.mark.env_prod: Tests that require production environment (use sparingly!)
- @pytest.mark.env_ci: Tests that run in CI environment

Integration markers for external service dependencies:
- @pytest.mark.integration_hostbill: Requires HostBill API access
- @pytest.mark.integration_stripe: Requires Stripe API access
- @pytest.mark.integration_paypal: Requires PayPal API access
- @pytest.mark.integration_starlingx: Requires StarlingX SSH access
- @pytest.mark.integration_openstack: Requires OpenStack API access

Usage:
    # Run only local-safe tests
    pytest -m "not (env_stg or env_prod or integration_hostbill)"

    # Run integration tests for dev environment
    AF_ENV=dev pytest -m "env_dev or env_local"
"""
import importlib
import os
import sys
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ── Capability-gated collection guard (anti-CVT: RETAIN, don't delete) ──────
#
# Tests below require either missing system binaries, optional packages, or
# external scripts not yet committed to this repo.  We exclude them from
# collection rather than deleting them so capabilities survive across IDE
# sessions.  Each entry has a comment explaining what it needs and how to
# re-enable it.
#
# To run a guarded test manually once the dependency is satisfied:
#   pip install numpy   && pytest tests/analysis/
#   pip install fastapi && pytest tests/integration/
#   pip install python-dotenv && pytest tests/integrations/
#   pip install jsonschema && pytest tests/test_pattern_schema.py
#   Provide scripts/ci/hostbill-sync-agent.py to enable hostbill/stx tests.

def _has_module(name: str) -> bool:
    return importlib.util.find_spec(name) is not None

def _has_file(rel: str) -> bool:
    return (PROJECT_ROOT / rel).exists()


collect_ignore_glob: list[str] = []
collect_ignore: list[str] = []

_GUARDED: list[tuple[bool, str, str]] = [
    # (condition_met, relative_path, reason_if_skipped)
    (_has_module("numpy"),
     "tests/analysis",
     "numpy not installed — `pip install numpy` to enable"),

    (_has_module("fastapi"),
     "tests/integration/test_feature_flag_off_returns_403.py",
     "fastapi not installed — `pip install fastapi httpx` to enable"),

    (_has_module("fastapi"),
     "tests/integration/test_feature_flag_on_returns_json_schema.py",
     "fastapi not installed — `pip install fastapi httpx` to enable"),

    (_has_module("dotenv"),
     "tests/integrations/test_notifiers.py",
     "python-dotenv not installed — `pip install python-dotenv` to enable"),

    (_has_module("jsonschema"),
     "tests/test_pattern_schema.py",
     "jsonschema not installed — `pip install jsonschema` to enable"),

    (_has_file("scripts/ci/hostbill-sync-agent.py"),
     "tests/hostbill/test_api_client.py",
     "scripts/ci/hostbill-sync-agent.py missing — commit agent script to re-enable"),

    (_has_file("scripts/ci/hostbill-sync-agent.py"),
     "tests/test_hostbill_sync.py",
     "scripts/ci/hostbill-sync-agent.py missing — commit agent script to re-enable"),

    (_has_file("scripts/ci/hostbill-sync-agent.py"),
     "tests/stx/test_ipmitool_integration.py",
     "scripts/ci/hostbill-sync-agent.py missing — commit agent script to re-enable"),

    (_has_module("scripts.monitoring_dashboard") or _has_file("scripts/monitoring_dashboard.py"),
     "tests/test_monitoring_dashboard.py",
     "scripts.monitoring_dashboard module missing — ensure scripts/monitoring_dashboard.py exists"),

    (_has_module("scripts.policy.governance"),
     "tests/test_governance_admission.py",
     "scripts.policy.governance missing"),

    (_has_module("scipy") and _has_module("sklearn"),
     "tests/coherence/test_pipeline.py",
     "scipy/sklearn not installed — `pip install scipy scikit-learn` to enable"),
]

for available, path, reason in _GUARDED:
    if not available:
        abs_path = str(PROJECT_ROOT / path)
        collect_ignore.append(abs_path)


def pytest_configure(config):
    """Register custom markers for environment-aware testing."""
    # Environment markers
    config.addinivalue_line("markers", "env_local: Tests safe for local development")
    config.addinivalue_line("markers", "env_dev: Tests requiring dev environment")
    config.addinivalue_line("markers", "env_stg: Tests requiring staging environment")
    config.addinivalue_line("markers", "env_prod: Tests requiring production (DANGEROUS)")
    config.addinivalue_line("markers", "env_ci: Tests designed for CI environment")

    # Integration markers
    config.addinivalue_line("markers", "integration_hostbill: Requires HostBill API")
    config.addinivalue_line("markers", "integration_stripe: Requires Stripe API")
    config.addinivalue_line("markers", "integration_paypal: Requires PayPal API")
    config.addinivalue_line("markers", "integration_starlingx: Requires StarlingX SSH")
    config.addinivalue_line("markers", "integration_openstack: Requires OpenStack API")

    # Risk level markers
    config.addinivalue_line("markers", "risk_low: Low risk test (no external effects)")
    config.addinivalue_line("markers", "risk_medium: Medium risk (may create test data)")
    config.addinivalue_line("markers", "risk_high: High risk (modifies external state)")
    config.addinivalue_line("markers", "risk_critical: Critical risk (payment/billing)")


def detect_environment() -> str:
    """Detect current environment from multiple sources."""
    env = os.environ.get("AF_ENV")
    if env:
        return env
    ci_indicators = ["CI", "GITHUB_ACTIONS", "GITLAB_CI", "JENKINS_URL"]
    for indicator in ci_indicators:
        if os.environ.get(indicator):
            return "ci"
    return "local"


@pytest.fixture(scope="session")
def current_environment():
    """Fixture providing the current environment name."""
    return detect_environment()


@pytest.fixture
def project_root():
    """Return path to project root directory"""
    return Path(__file__).parent.parent


@pytest.fixture
def goalie_dir(project_root):
    """Return path to .goalie directory"""
    return project_root / ".goalie"


@pytest.fixture
def schema_file(project_root):
    """Return path to JSON Schema file"""
    return project_root / "docs" / "PATTERN_EVENT_SCHEMA.json"


@pytest.fixture
def metrics_file(goalie_dir):
    """Return path to pattern metrics file"""
    return goalie_dir / "pattern_metrics.jsonl"


def pytest_collection_modifyitems(config, items):
    """Auto-skip tests based on environment markers."""
    current_env = detect_environment()
    env_compatibility = {
        'local': {'env_local', 'env_ci'},
        'dev': {'env_local', 'env_dev', 'env_ci'},
        'stg': {'env_local', 'env_dev', 'env_stg', 'env_ci'},
        'prod': {'env_local', 'env_dev', 'env_stg', 'env_prod', 'env_ci'},
        'ci': {'env_local', 'env_ci'}
    }
    allowed_markers = env_compatibility.get(current_env, {'env_local'})

    integration_checks = {
        'integration_hostbill': ['HOSTBILL_API_KEY', 'HOSTBILL_API_URL'],
        'integration_stripe': ['STRIPE_SECRET_KEY'],
        'integration_paypal': ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
        'integration_starlingx': ['STARLINGX_SSH_KEY_PATH'],
        'integration_openstack': ['OS_AUTH_URL', 'OS_USERNAME']
    }

    for item in items:
        # Check environment markers
        env_markers = [m for m in item.iter_markers() if m.name.startswith('env_')]
        if env_markers:
            marker_names = {m.name for m in env_markers}
            if not marker_names.intersection(allowed_markers):
                item.add_marker(pytest.mark.skip(
                    reason=f"Test requires {marker_names}, current env is '{current_env}'"
                ))

        # Check integration markers
        for marker_name, required_vars in integration_checks.items():
            if item.get_closest_marker(marker_name):
                missing = [v for v in required_vars if not os.environ.get(v)]
                if missing:
                    item.add_marker(pytest.mark.skip(
                        reason=f"Missing env vars for {marker_name}: {missing}"
                    ))
