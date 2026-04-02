import pytest
import argparse
from pathlib import Path
import json
import time
from scripts.policy.governance import GovernanceMiddleware

@pytest.fixture
def middleware_args():
    return argparse.Namespace(
        iterations=5,
        circle="test-circle",
        depth=2,
        environment="test"
    )

def test_governance_middleware_init(tmp_path, middleware_args):
    mw = GovernanceMiddleware(middleware_args, tmp_path)
    assert mw.active_circle == "test-circle"
    assert mw.current_depth == 2

def test_governance_middleware_log_progress(tmp_path, middleware_args):
    mw = GovernanceMiddleware(middleware_args, tmp_path)
    # Shouldn't throw even if it fails, but here we expect success
    mw.log_progress()
    
    log_file = tmp_path / ".goalie" / "prod_cycle_progress.log"
    assert log_file.exists()
    content = log_file.read_text()
    assert "[prod-cycle] run" in content
    assert "circle=test-circle" in content

def test_governance_middleware_update_rca_counters_failure(tmp_path, middleware_args):
    mw = GovernanceMiddleware(middleware_args, tmp_path)
    
    mw.update_rca_counters(status="failure")
    assert mw.dt_consecutive_failures == 1
    assert mw.iterations_without_progress == 1
    
    # Trigger safe degrade loop logic
    mw.safe_degrade_triggers = 1
    mw.update_rca_counters(status="failure")
    assert mw.safe_degrade_error_count == 1
    assert mw.dt_consecutive_failures == 2

def test_governance_middleware_update_rca_counters_success(tmp_path, middleware_args):
    mw = GovernanceMiddleware(middleware_args, tmp_path)
    mw.update_rca_counters(status="failure")
    assert mw.dt_consecutive_failures == 1
    
    mw.update_rca_counters(status="success")
    assert mw.dt_consecutive_failures == 0 # Should reset
    assert mw.iterations_without_progress == 0

def test_trigger_rca_thresholds(tmp_path, middleware_args):
    mw = GovernanceMiddleware(middleware_args, tmp_path)
    
    # Below threshold
    mw.dt_consecutive_failures = 2
    mw.trigger_rca_if_needed(exit_code=1, status="failure")
    
    # Wait, the method doesn't return anything but we can just test execution path
    # Above threshold
    mw.dt_consecutive_failures = 3
    # Check execution without exceptions
    mw.trigger_rca_if_needed(exit_code=1, status="failure")

def test_vsix_telemetry_gap(tmp_path, middleware_args):
    mw = GovernanceMiddleware(middleware_args, tmp_path)
    # File doesn't exist -> gap
    mw.update_rca_counters(status="success")
    assert mw.vsix_telemetry_gap_count == 1
    
    # File exists and is fresh
    goalie_dir = tmp_path / ".goalie"
    goalie_dir.mkdir(exist_ok=True)
    pattern_log = goalie_dir / "pattern_metrics.jsonl"
    pattern_log.touch()
    
    mw.update_rca_counters(status="success")
    assert mw.vsix_telemetry_gap_count == 0 # Reset because it's fresh
