#!/usr/bin/env python3
"""
Test script for IPMI credential refactoring
"""

import os
import sys
sys.path.append('.')

# Set environment variables for testing
os.environ['IPMI_USER_SECRET_KEY'] = 'device_24460_ipmi_username'
os.environ['IPMI_PASSWORD_SECRET_KEY'] = 'device_24460_ipmi_password'

try:
    from device_state_tracker import DeviceStateTracker
    print("✓ Import successful")

    # Test instantiation
    tracker = DeviceStateTracker()
    print("✓ DeviceStateTracker instantiation successful")

    # Test methods exist
    assert hasattr(tracker, 'get_secret_value'), "get_secret_value method missing"
    print("✓ get_secret_value method exists")

    assert hasattr(tracker, 'get_ipmi_credentials'), "get_ipmi_credentials method missing"
    print("✓ get_ipmi_credentials method exists")

    assert hasattr(tracker, 'check_ipmi_health'), "check_ipmi_health method missing"
    print("✓ check_ipmi_health method exists")

    # Test method signatures
    import inspect

    sig = inspect.signature(tracker.get_secret_value)
    assert len(sig.parameters) == 1, f"get_secret_value should have 1 parameter, got {len(sig.parameters)}"
    print("✓ get_secret_value signature correct")

    sig = inspect.signature(tracker.get_ipmi_credentials)
    assert len(sig.parameters) == 1, f"get_ipmi_credentials should have 1 parameter (self), got {len(sig.parameters)}"
    print("✓ get_ipmi_credentials signature correct")

    sig = inspect.signature(tracker.check_ipmi_health)
    assert len(sig.parameters) == 3, f"check_ipmi_health should have 3 parameters, got {len(sig.parameters)}"
    print("✓ check_ipmi_health signature correct")

    print("\n🎉 All IPMI refactoring tests passed!")

except Exception as e:
    print(f"❌ Test failed: {e}")
    sys.exit(1)
