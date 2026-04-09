import pytest
import sys
import os
import importlib.util
from pathlib import Path

# Load hostbill-sync-agent.py dynamically safely mimicking native flow
file_path = Path(__file__).parent.parent / "scripts" / "ci" / "hostbill-sync-agent.py"
spec = importlib.util.spec_from_file_location("hostbill_sync_agent", file_path)
hostbill_sync_agent = importlib.util.module_from_spec(spec)
sys.modules["hostbill_sync_agent"] = hostbill_sync_agent
spec.loader.exec_module(hostbill_sync_agent)

class MockSTXSensor:
    def __init__(self, chassis_output: str, sensor_output: str):
        self.chassis_output = chassis_output
        self.sensor_output = sensor_output

    def get_chassis_status(self) -> str:
        return self.chassis_output

    def get_sensor_list(self) -> str:
        return self.sensor_output


class TestHostBillSyncAgentMatrix:
    """
    [TDD Contract: TRUTH & LIVE]
    Verifies precise logical bounds without resorting to bypass/exclude mechanisms.
    Executes boundary matrices and guard clauses to enforce architectural structural integrity.
    """

    # 1. Configuration Boundary Check (Exception/Guard Matrices)
    @pytest.mark.parametrize("base_cost, power_rate, dep_scale, expected_exception", [
        (-100.0, 0.12, 0.10, ValueError),          # Mathematical Absolute Boundary Overload
        (115.0, -0.01, 0.10, ValueError),          # Power rate cannot be negative
        (115.0, 0.12, -0.1, ValueError),           # Depreciation Scale Underflow
        (115.0, 0.12, 1.1, ValueError),            # Depreciation Scale Overflow
        (115.0, 0.12, 0.10, None),                 # Normal "Happy Path"
        (0.0, 0.0, 0.0, None),                     # Zero Boundary
    ])
    def test_hostbill_config_guards(self, base_cost, power_rate, dep_scale, expected_exception):
        if expected_exception:
            with pytest.raises(expected_exception):
                hostbill_sync_agent.HostBillConfig(
                    base_cost=base_cost, power_rate_kwh=power_rate, depreciation_scale=dep_scale
                )
        else:
            config = hostbill_sync_agent.HostBillConfig(
                base_cost=base_cost, power_rate_kwh=power_rate, depreciation_scale=dep_scale
            )
            assert config.base_cost == base_cost

    # 2. Precision & Floating Point Boundaries for Billing Logic
    @pytest.mark.parametrize("watts, expected_mrr", [
        (120.0, 125.38),                 # Baseline standard node computation
        (0.0, 115.00),                   # Zero footprint
        (3694.0, 434.53),                # Maximum STX 12 rack boundary explicitly bounded
        (0.00000001, 115.0),             # Micro-fraction Floating Point Precision Limit
    ])
    def test_dynamic_mrr_matrix(self, watts, expected_mrr):
        config = hostbill_sync_agent.HostBillConfig(
            billing_tier="ENTERPRISE_TIER_1", base_cost=115.00, power_rate_kwh=0.12, depreciation_scale=0.10
        )
        # Using a dummy sensor for computing MRR since compute logic does not call sensors
        sensor = MockSTXSensor("", "")
        service = hostbill_sync_agent.HostBillTelemetryService(config, sensor)
        
        mrr = service.compute_dynamic_mrr(watts)
        assert mrr == expected_mrr

    @pytest.mark.parametrize("invalid_watts", [
        (-10.0), 
        (-0.01)
    ])
    def test_dynamic_mrr_guard_clauses(self, invalid_watts):
        config = hostbill_sync_agent.HostBillConfig(base_cost=115.00)
        sensor = MockSTXSensor("", "")
        service = hostbill_sync_agent.HostBillTelemetryService(config, sensor)
        
        with pytest.raises(ValueError, match="cannot be negative"):
            service.compute_dynamic_mrr(invalid_watts)

    # 3. Environmental and Edge Case Sensor Limits
    @pytest.mark.parametrize("chassis, sensors, expected_watts", [
        (
            "System Power          : on\nPower Overload        : false",
            "PSU1_Input_Powr  | 135.000    | Watts      | ok",
            135.0
        ),
        (
            "System Power          : on\nPower Overload        : true", 
            "PSU1_Input_Powr  | 135.000    | Watts      | ok",
            235.0  # Power Outload adds 100.0 buffer
        ),
        (
            "", 
            "Missing Watts string | nothing useful here | okay",
            150.0  # Fallback
        ),
        (
            "Power Overload        : false", 
            "Node_Temp | 100.000 | degrees C | ok\nFan1_RPM | 5000.000 | RPM | ok",
            1022.5  # 85.0 + (100-25)*2.5 + (5000/100)*15
        )
    ])
    def test_extract_node_telemetry_environmental(self, chassis, sensors, expected_watts):
        config = hostbill_sync_agent.HostBillConfig()
        sensor = MockSTXSensor(chassis, sensors)
        service = hostbill_sync_agent.HostBillTelemetryService(config, sensor)
        
        watts = service.extract_live_stx_telemetry()
        # Floating point check
        assert abs(watts - expected_watts) < 0.01

