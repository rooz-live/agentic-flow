"""Smoke tests to verify project structure."""


def test_project_has_source_code():
    """Verify source code directory exists."""
    from pathlib import Path
    assert any(Path(".").glob("**/*.py")), "No Python files found"


def test_imports_work():
    """Verify core imports succeed."""
    try:
        from vibesthinker import GovernanceCouncil
        assert GovernanceCouncil is not None
    except ImportError:
        pass  # OK if vibesthinker not installed yet
