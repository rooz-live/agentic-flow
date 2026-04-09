#!/usr/bin/env python3
"""
Quick test for auto-CoD estimation logic
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))

from circles.replenish_manager import auto_estimate_cod

# Test cases
test_items = [
    "Integrate promote_to_kanban.py into scripts/af",
    "Automate CoD calculation in replenish script", 
    "Fix critical security vulnerability in authentication module",
    "Add user profile page with settings",
    "Refactor legacy payment processing system",
    "Update documentation for API endpoints",
    "Implement WSJF sorting for all circles",
]

print("=" * 80)
print("AUTO-COD ESTIMATION TEST")
print("=" * 80)

for desc in test_items:
    result = auto_estimate_cod(desc)
    print(f"\n📝 Task: {desc}")
    print(f"   UBV: {result['ubv']} | TC: {result['tc']} | RR: {result['rr']} | Size: {result['size']}")
    print(f"   CoD: {result['cod']} | WSJF: {result['wsjf']} | Confidence: {int(result['confidence']*100)}%")
    
print("\n" + "=" * 80)
print("✅ Test complete!")
