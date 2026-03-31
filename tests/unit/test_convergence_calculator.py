#!/usr/bin/env python3
"""Unit tests for convergence score calculator."""

import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "scripts" / "lib"))

import pytest


def calculate_convergence(metrics: dict) -> float:
    """
    Calculate convergence score from metrics.
    
    Formula: (equity*0.25 + success*0.35 + prof*0.20 + wsjf*0.20)
    
    TODO: Move to scripts/lib/convergence.py once implemented
    """
    return (
        metrics["circle_equity"] * 0.25 +
        metrics["success_rate"] * 0.35 +
        metrics["proficiency"] * 0.20 +
        metrics["wsjf_stability"] * 0.20
    )


def is_production_ready(score: float) -> bool:
    """Check if convergence score indicates production readiness."""
    return score >= 0.85


def is_optimal(score: float) -> bool:
    """Check if convergence score is optimal."""
    return score >= 0.90


class TestConvergenceCalculator:
    """Test suite for convergence score calculation."""
    
    def test_convergence_score_calculation(self):
        """Test basic convergence score calculation."""
        metrics = {
            "circle_equity": 0.85,
            "success_rate": 0.90,
            "proficiency": 0.75,
            "wsjf_stability": 0.80
        }
        score = calculate_convergence(metrics)
        
        # Expected: 0.85*0.25 + 0.90*0.35 + 0.75*0.20 + 0.80*0.20 = 0.8275
        assert 0.82 <= score <= 0.84
    
    def test_perfect_score(self):
        """Test convergence with perfect metrics."""
        metrics = {
            "circle_equity": 1.0,
            "success_rate": 1.0,
            "proficiency": 1.0,
            "wsjf_stability": 1.0
        }
        score = calculate_convergence(metrics)
        assert score == 1.0
    
    def test_zero_score(self):
        """Test convergence with zero metrics."""
        metrics = {
            "circle_equity": 0.0,
            "success_rate": 0.0,
            "proficiency": 0.0,
            "wsjf_stability": 0.0
        }
        score = calculate_convergence(metrics)
        assert score == 0.0
    
    def test_production_ready_threshold(self):
        """Test production readiness threshold (0.85)."""
        assert is_production_ready(0.85) == True
        assert is_production_ready(0.84) == False
        assert is_production_ready(0.90) == True
    
    def test_optimal_threshold(self):
        """Test optimal threshold (0.90)."""
        assert is_optimal(0.90) == True
        assert is_optimal(0.89) == False
        assert is_optimal(1.0) == True
    
    def test_weighted_components(self):
        """Test that weights are correctly applied."""
        # Test with only success_rate high (35% weight)
        metrics = {
            "circle_equity": 0.0,
            "success_rate": 1.0,
            "proficiency": 0.0,
            "wsjf_stability": 0.0
        }
        score = calculate_convergence(metrics)
        assert score == pytest.approx(0.35)
        
        # Test with only circle_equity high (25% weight)
        metrics = {
            "circle_equity": 1.0,
            "success_rate": 0.0,
            "proficiency": 0.0,
            "wsjf_stability": 0.0
        }
        score = calculate_convergence(metrics)
        assert score == pytest.approx(0.25)
    
    def test_boundary_values(self):
        """Test convergence with boundary values."""
        # Just below production ready
        metrics = {
            "circle_equity": 0.84,
            "success_rate": 0.84,
            "proficiency": 0.84,
            "wsjf_stability": 0.84
        }
        score = calculate_convergence(metrics)
        assert not is_production_ready(score)
        
        # Just at production ready
        metrics = {
            "circle_equity": 0.85,
            "success_rate": 0.85,
            "proficiency": 0.85,
            "wsjf_stability": 0.85
        }
        score = calculate_convergence(metrics)
        assert is_production_ready(score)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
