import pytest
import os
import sys

# Append the rust bridge library to path for testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src/rust/eventops_pyo3/target/release/')))

# Pytest configuration harness
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "schema: mark test as schema validation test"
    )
