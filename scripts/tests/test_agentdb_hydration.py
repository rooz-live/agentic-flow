import pytest
import sqlite3
import os
import time
from pathlib import Path
import sys

# Agentic QA Integration mapping R-2026-021 Evidence Validation parameters
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from scripts.validators.project import agentdb_hydrate

def test_incremental_hydration_updates_os_mtime(tmp_path):
    # Agentic QA Matrix Array: Red/Green Validation
    # Ensure executing hydration securely tracks mtime logic preventing CSQBM loops
    
    mock_root = tmp_path / "mock_project_root"
    db_dir = mock_root / ".agentdb"
    db_path = db_dir / "agentdb.sqlite"
    
    # Run hydration purely natively
    result = agentdb_hydrate.hydrate_schema(mock_root)
    assert result is True
    assert db_path.exists()
    
    # Track original timeframe
    original_mtime = db_path.stat().st_mtime
    time.sleep(0.1) # Simulate logic clock execution tick safely
    
    # Run again simulating the incremental pulse override mapping native loop avoidance
    agentdb_hydrate.hydrate_schema(mock_root)
    new_mtime = db_path.stat().st_mtime
    
    # Prove the script prevents staleness (Agentic QA validation natively)
    assert new_mtime > original_mtime
    
def test_schema_preservation_bounds(tmp_path):
    mock_root = tmp_path / "mock_project_root"
    db_dir = mock_root / ".agentdb"
    db_path = db_dir / "agentdb.sqlite"
    
    agentdb_hydrate.hydrate_schema(mock_root)
    
    # Ensure Tables exist preventing CSQBM script array validation crash
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='execution_contexts'")
    assert cursor.fetchone() is not None
    conn.close()
