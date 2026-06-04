import os
import subprocess
import json
import pytest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

def test_perceive_reader():
    script_path = PROJECT_ROOT / "scripts/cicd/perceive_reader.sh"
    assert script_path.exists(), f"perceive_reader.sh does not exist at {script_path}"
    
    # Run perceive_reader.sh and check output format
    res = subprocess.run(["bash", str(script_path)], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
    assert res.returncode == 0
    
    # It should write to .goalie/evidence/learning/perceive_state.json
    state_file = PROJECT_ROOT / ".goalie/evidence/learning/perceive_state.json"
    assert state_file.exists()
    
    with open(state_file) as f:
        data = json.load(f)
    assert "timestamp" in data
    assert "exit_code" in data
    assert "git_head" in data


def test_index_tick_split_metrics():
    script_path = PROJECT_ROOT / "scripts/cicd/index_tick.sh"
    assert script_path.exists(), f"index_tick.sh does not exist at {script_path}"
    
    res = subprocess.run(["bash", str(script_path)], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
    # It might return non-zero if there are untracked critical files, but the JSON should be written
    
    tick_file = PROJECT_ROOT / ".goalie/evidence/learning/index_tick.json"
    assert tick_file.exists()
    
    with open(tick_file) as f:
        data = json.load(f)
    assert "untracked_critical" in data
    assert "untracked_substrate_total" in data
    assert isinstance(data["untracked_critical"], int)
    assert isinstance(data["untracked_substrate_total"], int)


def test_edge_writer():
    script_path = PROJECT_ROOT / "scripts/cicd/edge_writer.sh"
    assert script_path.exists(), f"edge_writer.sh does not exist at {script_path}"
    
    # Running edge_writer.sh locally (which checks billing.bhopti.com)
    res = subprocess.run(["bash", str(script_path)], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
    assert res.returncode == 0
    
    # Check that a synthetic check result file is referenced or created
    latest_synthetic = PROJECT_ROOT / ".goalie/evidence/synthetic-checks"
    assert latest_synthetic.exists()


def test_policy_compliance():
    script_path = PROJECT_ROOT / "scripts/cicd/policy_compliance.sh"
    assert script_path.exists(), f"policy_compliance.sh does not exist at {script_path}"
    
    res = subprocess.run(["bash", str(script_path)], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
    # Returns 0 or 1/2 depending on compliance state
    
    compliance_latest = PROJECT_ROOT / ".goalie/evidence/compliance/latest_full.json"
    assert compliance_latest.exists()


def test_wave_autopilot():
    script_path = PROJECT_ROOT / "scripts/cicd/wave_autopilot.sh"
    assert script_path.exists(), f"wave_autopilot.sh does not exist at {script_path}"
    
    # Should run with a dry-run flag or exit code check
    res = subprocess.run(["bash", str(script_path), "--dry-run"], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
    assert res.returncode == 0
