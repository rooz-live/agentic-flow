import json
import pytest
from pathlib import Path
from scripts.cicd.track_progress import calculate_metrics

def test_calculate_metrics_success(tmp_path):
    # 1. Create domain directories under tmp_path
    domains = [
        "src/billing",
        "src/identity",
        "src/jobs",
        "src/calculation",
        "src/rust/eventops_pyo3"
    ]
    for d in domains:
        (tmp_path / d).mkdir(parents=True, exist_ok=True)

    # 2. Create store.json under tmp_path
    store_dir = tmp_path / ".claude-flow/agents"
    store_dir.mkdir(parents=True, exist_ok=True)
    store_data = {
        "agents": {
            "agent-1": {},
            "agent-2": {}
        }
    }
    with open(store_dir / "store.json", "w") as f:
        json.dump(store_data, f)

    # 3. Create ROAM_TRACKER_COG.yaml under tmp_path
    roam_dir = tmp_path / ".goalie"
    roam_dir.mkdir(parents=True, exist_ok=True)
    roam_content = """
risks:
  - id: R01
    status: mitigated
  - id: R04
    status: mitigated
  - id: R13
    status: mitigated
"""
    with open(roam_dir / "ROAM_TRACKER_COG.yaml", "w") as f:
        f.write(roam_content)

    # 4. Run calculation with tmp_path root
    calculate_metrics(tmp_path)

    # 5. Verify generated v3-progress.json
    progress_file = tmp_path / ".claude-flow/metrics/v3-progress.json"
    assert progress_file.exists()
    with open(progress_file, "r") as f:
        progress_data = json.load(f)
    assert progress_data["domains"]["completed"] == 5
    assert progress_data["ddd"]["progress"] == 100.0
    assert progress_data["swarm"]["activeAgents"] == 2

    # 6. Verify generated audit-status.json
    audit_file = tmp_path / ".claude-flow/security/audit-status.json"
    assert audit_file.exists()
    with open(audit_file, "r") as f:
        audit_data = json.load(f)
    assert audit_data["status"] == "CLEAN"
    assert audit_data["cvesFixed"] == 3
