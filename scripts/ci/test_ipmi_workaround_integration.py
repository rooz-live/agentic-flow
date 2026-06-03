#!/usr/bin/env python3
"""
Integration test for IPMI workaround functionality
Validates that enhanced IPMI testing integrates properly with existing systems
"""

import json
import sys
import time
from pathlib import Path
from datetime import datetime

def test_device_states_integration():
    """Test integration with device_states.json"""
    print("Testing device_states.json integration...")

    state_file = Path("device_states.json")
    if not state_file.exists():
        print("❌ device_states.json not found")
        return False

    try:
        with open(state_file, 'r') as f:
            states = json.load(f)

        if "24460" not in states:
            print("❌ Device 24460 not found in device_states.json")
            return False

        device_state = states["24460"]
        required_fields = ["state", "timestamp", "ipmi_status"]

        for field in required_fields:
            if field not in device_state:
                print(f"❌ Missing field '{field}' in device state")
                return False

        print(f"✅ Device state integration working: {device_state['state']}")
        return True

    except Exception as e:
        print(f"❌ Error reading device_states.json: {e}")
        return False

def test_heartbeat_integration():
    """Test heartbeat file creation and schema compliance"""
    print("Testing heartbeat integration...")

    heartbeat_patterns = [
        "logs/heartbeats/device_24460*.jsonl",
        "logs/heartbeats/device_24460*.json"
    ]

    heartbeat_files = []
    for pattern in heartbeat_patterns:
        files = list(Path(".").glob(pattern))
        heartbeat_files.extend(files)

    if not heartbeat_files:
        print("❌ No heartbeat files found")
        return False

    # Check most recent heartbeat file
    latest_file = max(heartbeat_files, key=lambda p: p.stat().st_mtime)

    try:
        with open(latest_file, 'r') as f:
            if latest_file.suffix == '.jsonl':
                # JSONL format - read last line
                lines = f.readlines()
                if not lines:
                    print("❌ Empty heartbeat file")
                    return False
                heartbeat_data = json.loads(lines[-1].strip())
            else:
                # JSON format
                heartbeat_data = json.load(f)

        # Validate against expected schema
        required_fields = ["device_id", "timestamp", "type", "status", "metrics"]

        for field in required_fields:
            if field not in heartbeat_data:
                print(f"❌ Missing field '{field}' in heartbeat data")
                return False

        if heartbeat_data["device_id"] != "24460":
            print(f"❌ Wrong device_id in heartbeat: {heartbeat_data['device_id']}")
            return False

        if heartbeat_data["type"] != "ipmi_health_check":
            print(f"❌ Wrong type in heartbeat: {heartbeat_data['type']}")
            return False

        print(f"✅ Heartbeat integration working: {heartbeat_data['status']}")
        return True

    except Exception as e:
        print(f"❌ Error reading heartbeat file: {e}")
        return False

def test_log_file_creation():
    """Test that log files are created properly"""
    print("Testing log file creation...")

    log_pattern = "device_24460_ipmi_test.log"
    log_file = Path(log_pattern)

    if not log_file.exists():
        print("❌ Log file not found")
        return False

    # Check if log file has recent content
    try:
        stat = log_file.stat()
        age_seconds = time.time() - stat.st_mtime

        if age_seconds > 300:  # 5 minutes
            print("❌ Log file is too old (>5 minutes)")
            return False

        # Check if file has content
        if stat.st_size == 0:
            print("❌ Log file is empty")
            return False

        print(f"✅ Log file created successfully ({stat.st_size} bytes)")
        return True

    except Exception as e:
        print(f"❌ Error checking log file: {e}")
        return False

def test_enhanced_script_structure():
    """Test that the enhanced script has the required structure"""
    print("Testing enhanced script structure...")

    script_file = Path("scripts/ci/test_device_24460_ssh_ipmi.py")
    if not script_file.exists():
        print("❌ Enhanced script not found")
        return False

    try:
        content = script_file.read_text()

        # Check for enhanced features
        required_features = [
            "TestConfig",
            "TestResult",
            "EnhancedSSHIPMITester",
            "resolve_hostname",
            "check_ssh_key",
            "update_device_state",
            "generate_heartbeat_data",
            "run_comprehensive_test"
        ]

        for feature in required_features:
            if feature not in content:
                print(f"❌ Missing feature: {feature}")
                return False

        print("✅ Enhanced script structure validated")
        return True

    except Exception as e:
        print(f"❌ Error reading enhanced script: {e}")
        return False

def test_mock_script_functionality():
    """Test that the mock script works correctly"""
    print("Testing mock script functionality...")

    mock_file = Path("scripts/ci/test_device_24460_ssh_ipmi_mock.py")
    if not mock_file.exists():
        print("❌ Mock script not found")
        return False

    # Check if mock test results exist
    mock_results = Path("device_24460_mock_ipmi_test.json")
    if not mock_results.exists():
        print("❌ Mock test results not found - run mock test first")
        return False

    try:
        with open(mock_results, 'r') as f:
            results = json.load(f)

        if results.get("overall_status") != "operational":
            print(f"❌ Mock test did not pass: {results.get('overall_status')}")
            return False

        if results["summary"]["passed"] != results["summary"]["total_tests"]:
            print(f"❌ Not all mock tests passed: {results['summary']['passed']}/{results['summary']['total_tests']}")
            return False

        print("✅ Mock script functionality validated")
        return True

    except Exception as e:
        print(f"❌ Error reading mock results: {e}")
        return False

def main():
    """Run all integration tests"""
    print("=" * 70)
    print("IPMI WORKAROUND INTEGRATION TEST")
    print("=" * 70)
    print()

    tests = [
        ("Enhanced Script Structure", test_enhanced_script_structure),
        ("Mock Script Functionality", test_mock_script_functionality),
        ("Device States Integration", test_device_states_integration),
        ("Heartbeat Integration", test_heartbeat_integration),
        ("Log File Creation", test_log_file_creation)
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")

    print(f"\n{'='*70}")
    print(f"INTEGRATION TEST RESULTS: {passed}/{total} passed")

    if passed == total:
        print("🎉 All integration tests passed!")
        return 0
    else:
        print("❌ Some integration tests failed")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)