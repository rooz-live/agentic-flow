"""Isolate gate unit tests from the GitHub Actions runner environment."""
import pytest


@pytest.fixture(autouse=True)
def _clear_ci_runner_env(monkeypatch):
    if not __import__("os").environ.get("GITHUB_ACTIONS"):
        return
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    monkeypatch.delenv("CI", raising=False)
    monkeypatch.delenv("AF_CI_PROVENANCE_SIGNATURE", raising=False)
    monkeypatch.delenv("AF_CI_PROVENANCE_PRINCIPAL", raising=False)
    monkeypatch.delenv("AF_CI_SIGNING_KEY", raising=False)
