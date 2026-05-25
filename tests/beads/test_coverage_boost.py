import os
import sys
import pytest
import sqlite3
import subprocess

# Sovereign TDD: No false mock logic. We test the actual physical execution tensors.
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
OPEX_DB_PATH = os.path.join(ROOT_DIR, '.goalie', 'opex.db')
BEADS_DIR = os.path.join(ROOT_DIR, 'tooling/scripts/beads')

def test_vulnerability_tracer_structural_invocation():
    """
    Validates that the vulnerability tracer executes correctly without bypass logic
    and adheres to the strictly bound Remit & Constraints.
    """
    tracer_path = os.path.join(BEADS_DIR, 'vulnerability_tracer.py')
    assert os.path.exists(tracer_path), "vulnerability_tracer.py missing"
    
    # Run the tracer natively
    result = subprocess.run([sys.executable, tracer_path], capture_output=True, text=True)
    assert result.returncode == 0
    
    # We should see the structural scan initiated
    assert "Initiating Component Mesh Vulnerability Tracer" in result.stdout

def test_hardware_capital_manager_shock():
    """
    Physical Test: Force a supply shock in the Hardware Capital Manager to hit
    the dynamic provisioning and sovereign quarantine branches.
    When glab CI boundary is unavailable (no GitLab token), the script
    engages ARBITRAGE LOCK — this is valid bounded-reasoning behavior.
    """
    script_path = os.path.join(BEADS_DIR, 'hardware_capital_manager.py')
    if not os.path.exists(script_path):
        pytest.skip("Hardware Capital Manager bead missing.")
        
    result = subprocess.run([sys.executable, script_path, "shock"], capture_output=True, text=True)
    assert result.returncode == 0
    assert "Systemic Supply Shock Detected" in result.stdout
    # When CI boundary succeeds: provisioning path
    # When CI boundary fails (no GitLab token): arbitrage lock path
    has_provisioning_path = "Arbitraging latency" in result.stdout
    has_arbitrage_lock_path = "ARBITRAGE LOCK" in result.stdout
    assert has_provisioning_path or has_arbitrage_lock_path, (
        "Expected either provisioning path or arbitrage lock engagement"
    )

def test_scd_browser_subagent_multi_agent():
    """
    Physical Test: Instantiate the Multi-Agent Clean Room.
    """
    script_path = os.path.join(BEADS_DIR, 'scd_browser_subagent.py')
    if not os.path.exists(script_path):
        pytest.skip("SCD Browser Subagent missing.")
        
    result = subprocess.run([sys.executable, script_path, "mecklenburg_bar_referrals"], capture_output=True, text=True)
    assert result.returncode == 0
    assert "AGENT A" in result.stdout
    assert "AGENT B" in result.stdout
    assert "AGENT C" in result.stdout

def test_opex_db_structural_integrity():
    """
    Ensures the .goalie/opex.db is a valid SQLite ledger that can accept 
    Execution Tensors from the swarm beads.
    """
    assert os.path.exists(OPEX_DB_PATH), "OPEX Ledger missing"
    
    conn = sqlite3.connect(OPEX_DB_PATH)
    cur = conn.cursor()
    
    # Check if execution_tensors exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='execution_tensors'")
    table_exists = cur.fetchone()
    assert table_exists is not None, "execution_tensors table is missing from the ledger"
    
    conn.close()
