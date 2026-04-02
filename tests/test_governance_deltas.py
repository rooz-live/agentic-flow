import pytest
from scripts.policy.governance import calculate_delta_improvement, detect_depth_oscillation

# --- Delta Improvement Mathematical Paths ---
@pytest.mark.parametrize("current, previous, expected_delta", [
    # 1. Neutral (no changes anywhere)
    (
        {"reward": 10.0, "tokens_used": 100, "throughput": 50.0, "resource_used": 10, "divergence_score": 0.0, "new_capabilities": 1, "total_capabilities": 24},
        {"reward": 10.0, "throughput": 50.0},
        0.2 * 1.0 + 0.2 * (1/24)  # stability (1-0)*0.2 + capability (1/24)*0.2 = 0.2 + 0.00833 = 0.2083...
    ),
    # 2. High Performance Spike (reward increased significantly)
    (
        {"reward": 50.0, "tokens_used": 100, "throughput": 50.0, "resource_used": 10, "divergence_score": 0.0, "new_capabilities": 0, "total_capabilities": 24},
        {"reward": 10.0, "throughput": 50.0},
        0.3 * ((50-10)/100) + 0.2 * 1.0  # perf (0.12) + stability 0.2 = 0.32
    ),
    # 3. Stability Collapse (divergence = 1.0)
    (
        {"reward": 10.0, "tokens_used": 100, "throughput": 50.0, "resource_used": 10, "divergence_score": 1.0, "new_capabilities": 0, "total_capabilities": 24},
        {"reward": 10.0, "throughput": 50.0},
        0.0  # performance 0, efficiency 0, stability (1-1)*0.2 = 0, capability 0
    ),
    # 4. Deep Divergence Out of Bounds (score > 1.0 clamped)
    (
        {"reward": 10.0, "tokens_used": 100, "throughput": 50.0, "resource_used": 10, "divergence_score": 2.5, "new_capabilities": 0, "total_capabilities": 24},
        {"reward": 10.0, "throughput": 50.0},
        0.0  # Should be clamped to 1.0 internally, resulting in 0 stability score
    ),
    # 5. Negative Efficiency Spike (Massive resource usage, minimal throughput)
    (
        {"reward": 10.0, "tokens_used": 100, "throughput": 10.0, "resource_used": 100, "divergence_score": 0.0, "new_capabilities": 0, "total_capabilities": 24},
        {"reward": 10.0, "throughput": 50.0},
        0.3 * ((10-50)/100) + 0.2 * 1.0 # eff (0.3 * -0.4 = -0.12) + stab 0.2 = 0.08
    ),
])
def test_calculate_delta_improvement(current, previous, expected_delta):
    delta = calculate_delta_improvement(current, previous)
    assert pytest.approx(delta, 0.01) == expected_delta

def test_calculate_delta_improvement_clamps_to_range():
    # Force an overflow condition to test [-1, 1] clamping
    current = {"reward": 1000000.0, "tokens_used": 1}
    previous = {"reward": 0.0}
    
    delta = calculate_delta_improvement(current, previous)
    assert delta == 1.0 # Clamped maximum

# --- Depth Oscillation Formal Verification ---
@pytest.mark.parametrize("history, expected_oscillation, expected_changes, expected_pattern", [
    ([3, 3, 3, 3, 3, 3], False, 0, "stable"), # Completely stable
    ([3, 4, 3, 4, 3, 4], True, 4, "oscillation-4x-in-6"), # High frequency bouncing
    ([3, 4, 4, 4, 4, 4], False, 0, "stable"), # One direction change
    ([3, 4, 5, 6, 7, 8], False, 0, "stable"), # Linear growth
    ([8, 6, 8, 6, 8, 6], True, 4, "oscillation-4x-in-6"), # Oscillating between layers
    ([1, 2], False, 0, "insufficient-data"), # Short window
])
def test_detect_depth_oscillation_patterns(history, expected_oscillation, expected_changes, expected_pattern):
    result = detect_depth_oscillation(history)
    assert result["oscillating"] == expected_oscillation
    assert result["direction_changes"] == expected_changes
    assert result["pattern"] == expected_pattern
