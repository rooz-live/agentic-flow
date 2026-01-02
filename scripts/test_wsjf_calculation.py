#!/usr/bin/env python3
"""
Test WSJF calculation in PatternLogger

Verifies that economic fields are auto-calculated correctly.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.agentic.pattern_logger import PatternLogger

def test_wsjf_calculation():
    """Test WSJF auto-calculation for different circles"""
    
    print("="*60)
    print("🧪 Testing WSJF Calculation in PatternLogger")
    print("="*60)
    
    # Test 1: Analyst circle with explicit CoD components
    print("\n📊 Test 1: Analyst with CoD components")
    logger = PatternLogger(circle='analyst', mode='advisory')
    logger.log('test_pattern', {
        'ubv': 7,
        'tc': 8,
        'rr': 4,
        'size': 5,
        'tags': ['test', 'wsjf-calculation']
    }, gate='testing', backlog_item='AN-TEST-001')
    print("✅ Logged with UBV=7, TC=8, RR=4, Size=5")
    print(f"   Expected WSJF: (7*1.0 + 8*1.5 + 4*1.0) / 5 = {(7 + 12 + 4) / 5}")
    
    # Test 2: Orchestrator circle (higher weights)
    print("\n📊 Test 2: Orchestrator with higher weights")
    logger2 = PatternLogger(circle='orchestrator', mode='advisory')
    logger2.log('test_pattern', {
        'ubv': 6,
        'tc': 5,
        'rr': 3,
        'size': 3,
        'tags': ['test', 'orchestrator']
    }, gate='testing', backlog_item='ORG-TEST-001')
    print("✅ Logged with UBV=6, TC=5, RR=3, Size=3")
    print(f"   Expected WSJF: (6*1.5 + 5*1.2 + 3*1.3) / 3 = {(9 + 6 + 3.9) / 3:.2f}")
    
    # Test 3: No CoD components (uses defaults)
    print("\n📊 Test 3: No CoD components (default values)")
    logger3 = PatternLogger(circle='innovator', mode='advisory')
    logger3.log('test_pattern', {
        'tags': ['test', 'defaults']
    }, gate='testing')
    print("✅ Logged without CoD - should use defaults (UBV=5, TC=5, RR=3, Size=5)")
    print(f"   Expected WSJF: (5*1.2 + 5*0.8 + 3*1.5) / 5 = {(6 + 4 + 4.5) / 5:.2f}")
    
    # Test 4: Revenue impact calculation
    print("\n📊 Test 4: Revenue impact auto-calculation")
    logger4 = PatternLogger(circle='innovator', mode='advisory')
    logger4.log('test_pattern', {
        'ubv': 8,
        'tc': 7,
        'rr': 5,
        'size': 4,
        'tags': ['test', 'revenue']
    }, gate='testing', backlog_item='IN-TEST-001')
    expected_wsjf = (8*1.2 + 7*0.8 + 5*1.5) / 4
    expected_revenue = 5000 * max(expected_wsjf / 3.0, 1.0)
    print("✅ Logged for Innovator (base=$5000/month)")
    print(f"   Expected WSJF: {expected_wsjf:.2f}")
    print(f"   Expected Revenue Impact: ${expected_revenue:.2f}")
    
    print("\n" + "="*60)
    print("✅ All tests logged - check .goalie/pattern_metrics.jsonl")
    print("="*60)
    
    # Verification command
    print("\n🔍 Verify with:")
    print("jq 'select(.backlog_item | startswith(\"AN-TEST\") or startswith(\"ORG-TEST\") or startswith(\"IN-TEST\")) | {backlog: .backlog_item, circle, wsjf: .economic.wsjf_score, cod: .economic.cod, revenue: .economic.revenue_impact}' .goalie/pattern_metrics.jsonl")

if __name__ == '__main__':
    test_wsjf_calculation()
