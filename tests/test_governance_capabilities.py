import pytest
import json
from pathlib import Path
from scripts.policy.governance import count_observed_capabilities, BASELINE_TOTAL_CAPABILITIES

def test_count_observed_capabilities_no_file(tmp_path):
    """Tests baseline returns correctly when files map incorrectly."""
    state = {"depth_ladder": {"assessor": 5}, "circle_rotation": {"negative_delta_counts": {"innovator": 1}}}
    res = count_observed_capabilities(tmp_path, state)
    
    assert "innovator" in res["observed"]["circles"]
    # Total caps defaults to baseline because observed is small
    assert res["total_capabilities"] == BASELINE_TOTAL_CAPABILITIES

def test_count_observed_capabilities_from_file(tmp_path):
    """Adversarial verification testing json.loads resiliency in log reading."""
    goalie_dir = tmp_path / ".goalie"
    goalie_dir.mkdir()
    metric_file = goalie_dir / "pattern_metrics.jsonl"
    
    # Intentionally corrupt json + valid json
    valid_event = json.dumps({"circle": "orchestrator", "pattern": "safe-degrade", "event_type": "circuit_breaker", "adjustment": "cooldown=200"})
    corrupt_event = '{"pattern": "broken", ' # Syntax Error
    
    with metric_file.open("w") as f:
        f.write(valid_event + "\n")
        f.write(corrupt_event + "\n")
        
    state = {}
    res = count_observed_capabilities(tmp_path, state)
    
    assert "orchestrator" in res["observed"]["circles"]
    assert "safe-degrade" in res["observed"]["patterns"]
    assert "circuit_breaker" in res["observed"]["telemetry_events"]
    assert "cooldown=200" in res["observed"]["adjustments"]
    assert "broken" not in res["observed"]["patterns"] # Proves exceptions were swallowed cleanly
    assert res["new_capabilities"] >= 4
