import pytest
from scripts.daemons import mcp_scheduler_daemon as msd

class MockMCPSensor:
    def __init__(self, archive_returns: bool = True, csqbm_returns: bool = True, pulse_returns: bool = True):
        self._archive_returns = archive_returns
        self._csqbm_returns = csqbm_returns
        self._pulse_returns = pulse_returns
        
        self.call_log = {
            "archive": 0,
            "prune": [],
            "csqbm": 0,
            "pulse": 0,
            "emit": []
        }
        
    def archive_cold_storage(self) -> bool:
        self.call_log["archive"] += 1
        return self._archive_returns
        
    def prune_connectome_files(self, ext: str, max_age_minutes: int) -> int:
        self.call_log["prune"].append((ext, max_age_minutes))
        return 0
        
    def check_csqbm_truth_gate(self) -> bool:
        self.call_log["csqbm"] += 1
        return self._csqbm_returns
        
    def pulse_router(self) -> bool:
        self.call_log["pulse"] += 1
        return self._pulse_returns
        
    def emit_metric(self, target: str) -> None:
        self.call_log["emit"].append(target)


@pytest.mark.parametrize("max_tokens, jsonl_min, md_min, csqbm_hours, error_expected", [
    (4000, 120, 240, 96, None),        # Standard Good Bounds
    (1, 1, 1, 1, None),                # Minimum Possible Valid Set
    (-4000, 120, 240, 96, ValueError), # Negative Token Capacity
    (4000, -120, 240, 96, ValueError), # Negative Prune logic
    (4000, 120, 240, 0, ValueError),   # Csqbm window too strict
    (16000, 120, 240, 96, None),       # High Token valid array
])
def test_orchestrator_config_bounds(max_tokens, jsonl_min, md_min, csqbm_hours, error_expected):
    """Ensure ADR-005 configuration rules are strictly checked upon init."""
    if error_expected:
        with pytest.raises(error_expected):
            msd.OrchestratorConfig(
                max_pydantic_tokens=max_tokens,
                jsonl_prune_minutes=jsonl_min,
                md_prune_minutes=md_min,
                csqbm_agentdb_staleness_hours=csqbm_hours
            )
    else:
        config = msd.OrchestratorConfig(max_tokens, jsonl_min, md_min, csqbm_hours)
        assert config.max_pydantic_tokens == max_tokens


@pytest.mark.parametrize("archive_ret, csqbm_ret, pulse_ret, exp_rc, exp_emits", [
    (True, True, True, 0, ["pulse_nominal"]),     # Perfect Run
    (False, True, True, 0, ["pulse_nominal"]),    # Archive failing isn't fatal
    (True, False, True, 150, ["csqbm_halt"]),     # CSQBM Governance explicitly halts (ADR-005)
    (True, True, False, 0, ["pulse_nominal"]),    # Router pulsing fails, nominal continues natively
])
def test_daemon_execution_matrix(archive_ret, csqbm_ret, pulse_ret, exp_rc, exp_emits):
    """Test all interaction execution paths mapped against DBOS topology logic natively."""
    config = msd.OrchestratorConfig()
    sensor = MockMCPSensor(archive_ret, csqbm_ret, pulse_ret)
    daemon = msd.MCPSchedulerDaemon(config, sensor)
    
    rc = daemon.execute_cycle()
    
    assert rc == exp_rc
    assert sensor.call_log["emit"] == exp_emits
    
    # Pruning always executes before CSQBM check
    assert len(sensor.call_log["prune"]) == 2
    assert sensor.call_log["prune"][0] == ("jsonl", config.jsonl_prune_minutes)
    assert sensor.call_log["prune"][1] == ("md", config.md_prune_minutes)
    
    if not csqbm_ret:
        # If CSQBM halted, pulse should never be called
        assert sensor.call_log["pulse"] == 0
    else:
        assert sensor.call_log["pulse"] == 1
