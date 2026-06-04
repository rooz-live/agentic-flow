import os
import sys

sys.path.insert(0, os.path.abspath("."))
from risk_analytics.risk_scoring import compute_risk_score


def test_p0_critical_threshold():
    """P0 (critical): score >= 75"""
    metrics = {"severity": 3, "blast": 3, "urgency": 3, "confidence": 1.0, "stability_debt": 0.0}
    score = compute_risk_score(metrics)
    assert score >= 75, f"Expected P0 score >= 75, got {score}"


def test_p1_high_threshold():
    """P1 (high): score 50-74"""
    metrics = {"severity": 1.5, "blast": 1.5, "urgency": 1.5, "confidence": 0.8, "stability_debt": 0.1}
    score = compute_risk_score(metrics)
    assert 50 <= score < 75, f"Expected P1 score 50-74, got {score}"


def test_p2_medium_threshold():
    """P2 (medium): score 25-49"""
    metrics = {"severity": 1, "blast": 1, "urgency": 1, "confidence": 0.8, "stability_debt": 0.2}
    score = compute_risk_score(metrics)
    assert 25 <= score < 50, f"Expected P2 score 25-49, got {score}"


def test_p3_low_threshold():
    """P3 (low): score < 25"""
    metrics = {"severity": 0, "blast": 0, "urgency": 0, "confidence": 1.0, "stability_debt": 0.0}
    score = compute_risk_score(metrics)
    assert score < 25, f"Expected P3 score < 25, got {score}"
