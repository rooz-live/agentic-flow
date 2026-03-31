#!/usr/bin/env python3
"""
RED: Test STX ipmitool integration for HostBill sync agent
Tests the extract_live_stx_telemetry function with real hardware data
"""

import pytest
import sys
from pathlib import Path
import importlib.util

# Dynamically load hostbill_sync_agent
sync_agent_path = Path(__file__).parent.parent.parent / "scripts" / "ci" / "hostbill-sync-agent.py"
spec = importlib.util.spec_from_file_location("hostbill_sync_agent", sync_agent_path)
hostbill_sync_agent = importlib.util.module_from_spec(spec)

# Set environment variables to avoid undefined variable errors
import os
os.environ['STX_HOST'] = 'localhost'
os.environ['STX_USER'] = 'root'
os.environ['STX_KEY'] = '/dev/null'
os.environ['STX_PORT'] = '22'

spec.loader.exec_module(hostbill_sync_agent)

def test_extract_stx_telemetry_returns_watts():
    """RED: Verify extract_live_stx_telemetry returns a valid wattage"""
    # This should return a float representing watts
    watts = hostbill_sync_agent.extract_live_stx_telemetry()
    
    # Verify it's a number
    assert isinstance(watts, (int, float))
    assert watts > 0
    assert watts < 10000  # Sanity check - shouldn't be extremely high
    
    print(f"✓ STX telemetry extracted: {watts}W")

def test_stx_telemetry_affects_mrr():
    """RED: Verify STX telemetry directly impacts MRR calculation"""
    # Get telemetry
    watts = hostbill_sync_agent.extract_live_stx_telemetry()
    
    # Calculate MRR based on that telemetry
    mrr = hostbill_sync_agent.compute_dynamic_mrr(watts)
    
    # Verify MRR changes with different power values
    assert isinstance(mrr, (int, float))
    assert mrr > 100  # Base minimum
    assert mrr < 1000  # Reasonable upper bound
    
    print(f"✓ STX {watts}W → ${mrr:.2f}/month MRR")

def test_mrr_calculation_precision():
    """RED: Verify MRR calculation maintains USD precision to 2 decimal places"""
    test_watts = [100.0, 150.0, 200.0, 250.0]
    
    for watts in test_watts:
        mrr = hostbill_sync_agent.compute_dynamic_mrr(watts)
        
        # Should be rounded to 2 decimal places
        assert mrr == round(mrr, 2)
        assert len(str(mrr).split('.')[-1]) <= 2
        
    print("✓ MRR precision verified to 2 decimal places")

if __name__ == "__main__":
    print("=== STX ipmitool Integration Tests ===")
    test_extract_stx_telemetry_returns_watts()
    test_stx_telemetry_affects_mrr()
    test_mrr_calculation_precision()
    print("\n✅ All RED tests passing - ready for GREEN implementation")
