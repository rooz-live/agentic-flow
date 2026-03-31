"""Test configuration and shared fixtures."""

import pytest


@pytest.fixture
def sample_content():
    """Sample legal document content for testing."""
    return "Settlement proposal for Case 26CV005596-590..."
