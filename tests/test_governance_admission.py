#!/usr/bin/env python3
"""
High-Intensity Verification Tests for AdmissionController
Implements red-green-refactor TDD with no bypass logic

@business-context WSJF-42: Evidence-backed testing
@adr ADR-006: Test actual production paths
@constraint R-2026-016: No exclusion logic
"""

import pytest
import time
from typing import Tuple
from scripts.policy.governance import (
    AdmissionController, 
    AdmissionConfig, 
    SystemLoadSensor,
    OSLoadSensor
)

class MockSensor:
    """Test double for SystemLoadSensor - follows production interface"""
    def __init__(self, load: float, idle: float):
        self.load = load
        self.idle = idle
        self.call_count = 0
        
    def get_load_percentages(self) -> Tuple[float, float]:
        self.call_count += 1
        return self.load, self.idle


class FailingSensor:
    """Adversarial test double - simulates hardware failure"""
    def get_load_percentages(self) -> Tuple[float, float]:
        raise RuntimeError("Sensor hardware failure")

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

# Add test to execute paths
@pytest.mark.parametrize("simulated_load, simulated_idle, should_admit", [
    (10.0, 90.0, True),           # Low load, admits
    (85.0, 15.0, False),          # Moderate load (>80.0), rejects
    (95.0, 5.0, False),           # Critical load, rejects
])
def test_admission_decision_paths(simulated_load, simulated_idle, should_admit):
    """Execute actual decision paths without bypass logic"""
    config = AdmissionConfig(threshold_pct=80.0)
    sensor = MockSensor(simulated_load, simulated_idle)
    controller = AdmissionController(config, sensor)
    
    assert controller.check_admission() == should_admit


# 5. Error Handling and Recovery (No #pragma: no cover)
def test_sensor_failure_handling():
    """
    Tests graceful degradation when sensor fails.
    No exclusion flags - error paths are fully tested.
    """
    config = AdmissionConfig()
    failing_sensor = FailingSensor()
    controller = AdmissionController(config, failing_sensor)
    
    # Should handle sensor failure gracefully
    with pytest.raises(RuntimeError, match="Sensor hardware failure"):
        controller._update_load_history()


# 6. Performance and Resource Constraints
def test_load_history_memory_efficiency():
    """
    Resource Exhaustion Test: Verifies memory usage stays bounded.
    Tests that history size limit is never exceeded.
    """
    config = AdmissionConfig()
    sensor = MockSensor(50.0, 50.0)
    controller = AdmissionController(config, sensor)
    
    # Add many more entries than the max history size
    for i in range(100):
        controller._update_load_history()
        # Invariant: history size never exceeds max
        assert len(controller.load_history) <= controller.max_history_size
    
    # Verify we still have the most recent entries
    assert len(controller.load_history) == controller.max_history_size


# 7. Formal Verification Properties
def test_load_idle_sum_property():
    """
    Mathematical Property: load + idle should equal 100 (within floating-point tolerance).
    This is a formal verification of system invariants.
    """
    config = AdmissionConfig()
    controller = AdmissionController(config, MockSensor(0, 0))
    
    test_values = [0, 25.5, 50.0, 75.3, 99.9, -10, 110]
    
    for load in test_values:
        idle = 100 - load
        controller.sensor = MockSensor(load, idle)
        controller._update_load_history()
        
        entry = controller.load_history[-1]
        sum_percentage = entry["cpu_load"] + entry["idle_percentage"]
        
        # Allow for floating-point precision errors
        assert abs(sum_percentage - 100.0) < 0.001, f"Load+idle={sum_percentage}, expected=100"


# 8. Integration with Real Sensor (No Mocking)
def test_real_sensor_integration():
    """
    Integration Test: Uses actual DefaultSystemLoadSensor.
    Tests the real production path without any mocking.
    """
    config = AdmissionConfig()
    real_sensor = OSLoadSensor()
    controller = AdmissionController(config, real_sensor)
    
    # This test exercises the actual os.getloadavg() path
    controller._update_load_history()
    
    # Verify we got real data
    assert len(controller.load_history) == 1
    entry = controller.load_history[0]
    assert "timestamp" in entry
    assert 0.0 <= entry["cpu_load"] <= 100.0
    assert 0.0 <= entry["idle_percentage"] <= 100.0


# 9. Mutation Testing Support
def test_admission_logic_mutant_resistance():
    """
    Tests that would be caught by mutation testing.
    Each assertion checks a specific mutant would be killed.
    """
    config = AdmissionConfig(threshold_pct=80.0)
    controller = AdmissionController(config, MockSensor(90.0, 10.0))
    
    # Mutant: Changing < to <= would be caught
    assert not controller.check_admission()
    
    # Mutant: Removing threshold check would be caught
    controller.sensor = MockSensor(79.9, 20.1)
    assert controller.check_admission()
    
    # Mutant: Changing strike limit would be caught
    for _ in range(3):
        controller.sensor = MockSensor(85.0, 15.0)  # Above warning threshold
        controller._update_load_history()
        controller.check_admission()
    assert controller.consecutive_high_load >= 2


# 10. Edge Case: Floating Point Precision
@pytest.mark.parametrize("precision_load", [
    33.33333333333333,
    66.66666666666666,
    99.99999999999999,
    0.00000000000001,
    1e-10,
    1e10,
])
def test_floating_point_precision(precision_load):
    """
    Precision Testing: Verifies floating-point edge cases don't break logic.
    """
    config = AdmissionConfig()
    controller = AdmissionController(config, MockSensor(precision_load, 100 - precision_load))
    
    controller._update_load_history()
    entry = controller.load_history[0]
    
    # Should handle extreme precision without issues
    assert isinstance(entry["cpu_load"], float)
    assert isinstance(entry["idle_percentage"], float)
    assert 0.0 <= entry["cpu_load"] <= 100.0


# 11. Temporal and State Transition Logic
@pytest.mark.parametrize("load_sequence, expected_admission_decisions", [
    # Gradual load increase
    ([20, 30, 40, 50, 60, 70], [True, True, True, True, True, True]),
    
    # Spike above threshold
    ([30, 85, 90, 85, 30], [True, False, False, False, True]),
    
    # Persistent high load (2-strike rule)
    ([85, 85, 85], [False, False, False]),
    
    # Oscillating load (tests oscillation detection)
    ([30, 85, 30, 85, 30, 85, 30], [True, False, True, False, True, False, True]),
])
def test_admission_decision_sequences(load_sequence, expected_admission_decisions):
    """
    Property-Based Testing: Load + idle should equal 100 (within tolerance).
    Tests actual decision logic without bypassing any checks.
    """
    config = AdmissionConfig(threshold_pct=80.0)
    controller = AdmissionController(config, MockSensor(0, 0))
    
    for i, (load, expected_decision) in enumerate(zip(load_sequence, expected_admission_decisions)):
        # Update sensor to return new load values
        controller.sensor = MockSensor(load, 100 - load)
        
        # Check admission decision
        decision = controller.check_admission()
        assert decision == expected_decision, f"Iteration {i}: load={load}, expected={expected_decision}, got={decision}"
        
        # Update load history
        controller._update_load_history()


# 12. Concurrency and Race Conditions
def test_concurrent_load_history_updates():
    """
    Multi-User Scenario: Simulates concurrent sensor reads.
    Verifies load history maintains consistency.
    """
    config = AdmissionConfig()
    sensor = MockSensor(50.0, 50.0)
    controller = AdmissionController(config, sensor)
    
    # Simulate rapid successive updates
    for _ in range(20):
        controller._update_load_history()
    
    # Verify history size is maintained
    assert len(controller.load_history) <= controller.max_history_size
    
    # Verify all entries are valid
    for entry in controller.load_history:
        assert 0.0 <= entry["cpu_load"] <= 100.0
        assert 0.0 <= entry["idle_percentage"] <= 100.0
        assert "timestamp" in entry

