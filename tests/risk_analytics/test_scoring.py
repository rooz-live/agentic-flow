import os
import sys

sys.path.insert(0, os.path.abspath("."))
from risk_analytics.risk_scoring import compute_risk_score, prioritize_items

cfg = None  # use defaults

def test_compute_risk_score_weights():
    score_lo = compute_risk_score({"severity": 0, "blast": 0, "urgency": 0, "confidence": 1, "stability_debt": 0}, cfg)
    score_hi = compute_risk_score({"severity": 3, "blast": 3, "urgency": 3, "confidence": 1, "stability_debt": 0}, cfg)
    assert 0 <= score_lo <= 10
    assert score_hi > score_lo
    assert score_hi <= 100

def test_prioritize_items_sorts_descending():
    items = [
        {"id": "A", "metrics": {"severity": 1, "blast": 1, "urgency": 1, "confidence": 0.5}},
        {"id": "B", "metrics": {"severity": 3, "blast": 2, "urgency": 2, "confidence": 1.0}},
    ]
    out = prioritize_items(items)
    assert out[0]["id"] == "B"
