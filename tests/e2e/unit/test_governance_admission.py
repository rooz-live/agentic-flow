import pytest
import time
from scripts.policy.governance import AdmissionController, AdmissionConfig

class MockSensor:
    def __init__(self, load: float, idle: float):
        self.load = load
        self.idle = idle
    def get_load_percentages(self):
        return self.load, self.idle

# 1. Numeric and Data Boundaries Matrix (Valid and Invalid)
@pytest.mark.parametrize("threshold, backoff, expected_exception", [
    (100.01, 30, ValueError),   # Off-by-one: Over 100%
    (-0.01, 30, ValueError),    # Off-by-one: Under 0%
    (80.0, -1, ValueError),     # Negative temporal logic
    (0.0, 0, None),             # Absolute Zero Boundary
    (100.0, 0, None),           # Absolute Max Boundary
    (33.33333333, 30, None),    # Floating Point Precision
])
def test_admission_config_boundaries(threshold, backoff, expected_exception):
    """Formal Verification of internal state transitions and guards."""
    if expected_exception:
        with pytest.raises(expected_exception):
            AdmissionConfig(threshold_pct=threshold, backoff_sec=backoff)
    else:
        config = AdmissionConfig(threshold_pct=threshold, backoff_sec=backoff)
        assert config.threshold_pct == threshold

# 4. Environmental and Infrastructure Edges (Resource Exhaustion)
@pytest.mark.parametrize("simulated_load, simulated_idle, expected_clamped_load", [
    (99.99, 0.01, 99.99),         # 99% CPU Usage Exhaustion
    (-50.0, 150.0, 0.0),          # Sensor Hardware Failure / Underflow
    (150.0, -50.0, 100.0),        # Infinite Loop / Overflow Spike
])
def test_update_load_history_clamping(simulated_load, simulated_idle, expected_clamped_load):
    """Adversarial Verification: Ensures messy/malformed sensor data cannot corrupt the history."""
    config = AdmissionConfig()
    sensor = MockSensor(simulated_load, simulated_idle)
    controller = AdmissionController(config, sensor)
    
    controller._update_load_history()
    
    assert len(controller.load_history) == 1
    assert controller.load_history[0]["cpu_load"] == expected_clamped_load
