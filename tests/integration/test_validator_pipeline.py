"""Integration tests: Full validator pipeline end-to-end."""
import subprocess
import pytest
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent


def test_validation_runner_exists():
    """Verify validation-runner.sh exists and is executable."""
    runner = PROJECT_ROOT / "scripts" / "validation-runner.sh"
    assert runner.exists(), "validation-runner.sh not found"
    assert runner.stat().st_mode & 0o111, "validation-runner.sh not executable"


def test_coherence_validator_all_layers():
    """Verify coherence checks PRD → ADR → DDD → TDD."""
    result = subprocess.run(
        ["python3", str(PROJECT_ROOT / "scripts" / "validators" / "validate_coherence.py"), "--all-layers"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT)
    )
    assert "PRD:" in result.stdout, "PRD layer not checked"
    assert "ADR:" in result.stdout, "ADR layer not checked"
    assert "DDD:" in result.stdout, "DDD layer not checked"
    assert "TDD:" in result.stdout, "TDD layer not checked"
    assert "DPC_R:" in result.stdout, "DPC_R metric not calculated"
