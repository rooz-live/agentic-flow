#!/usr/bin/env python3
"""
Test script for write-status-file functionality in cmd_prod.py
"""

import sys
import os
import json
from pathlib import Path

# Add the investing/agentic-flow/scripts to path
sys.path.insert(0, 'investing/agentic-flow/scripts')

try:
    from cmd_prod import ProdOrchestrator
    print("✅ Successfully imported ProdOrchestrator")
except ImportError as e:
    print(f"❌ Failed to import ProdOrchestrator: {e}")
    sys.exit(1)

def test_write_status_file():
    """Test the write-status-file functionality"""
    # Use a path within the project root for security
    status_file = Path('investing/agentic-flow/test_status.json')

    print(f"Testing write to: {status_file}")

    try:
        # Clean up any existing file
        if status_file.exists():
            status_file.unlink()

        # Create orchestrator with write-status-file mode
        orch = ProdOrchestrator(
            progress_tooltip='write-status-file',
            progress_status_file=str(status_file)
        )
        print("✅ ProdOrchestrator created successfully")
        print(f"Status path set to: {orch._status_path}")

        # Test progress event
        test_payload = {'test_key': 'test_value', 'custom_data': [1, 2, 3]}
        orch.progress_event('test_phase', test_payload)
        print("✅ Progress event called")

        # Check if file was created and contains valid JSON
        if status_file.exists():
            print("✅ Status file was created")

            with open(status_file) as f:
                data = json.load(f)

            print("✅ File contains valid JSON")
            print(f"Phase: {data.get('phase')}")
            print(f"Has test_key: {'test_key' in data}")
            print(f"Has ts: {'ts' in data}")
            print(f"Has run_id: {'run_id' in data}")

            # Check custom data
            if 'extra' in data and 'test_key' in data['extra']:
                print("✅ Custom payload data preserved")
            else:
                print("⚠️  Custom payload data might not be preserved correctly")

            # Clean up test file
            try:
                status_file.unlink()
            except:
                pass

            return True
        else:
            print("❌ Status file was not created")
            return False

    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        # Clean up on failure
        try:
            status_file.unlink()
        except:
            pass
        return False

def test_path_validation():
    """Test path validation prevents directory traversal"""
    print("\nTesting path validation...")

    # Test with safe path
    try:
        orch = ProdOrchestrator(
            progress_tooltip='write-status-file',
            progress_status_file='.goalie/safe_test.json'
        )
        print("✅ Safe path accepted")
    except Exception as e:
        print(f"❌ Safe path rejected: {e}")

    # Test with dangerous path (should be caught)
    try:
        orch = ProdOrchestrator(
            progress_tooltip='write-status-file',
            progress_status_file='../../../etc/passwd'
        )
        print("⚠️  Dangerous path was not rejected - security issue!")
        return False
    except ValueError as e:
        print(f"✅ Dangerous path correctly rejected: {e}")
        return True
    except Exception as e:
        print(f"❌ Unexpected error with dangerous path: {e}")
        return False

if __name__ == '__main__':
    print("Testing write-status-file mode integrity...")

    success1 = test_write_status_file()
    success2 = test_path_validation()

    if success1 and success2:
        print("\n✅ All tests passed - write-status-file mode appears functional")
    else:
        print("\n❌ Some tests failed - issues detected")
        sys.exit(1)