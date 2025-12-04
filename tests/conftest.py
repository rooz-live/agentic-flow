"""
Pytest configuration for pattern telemetry tests
"""
import pytest
from pathlib import Path

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
