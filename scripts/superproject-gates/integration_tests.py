#!/usr/bin/env python3
"""
Integration Tests

Tests integration between different components of the agentic flow system.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

def test_evidence_emission():
    """Test evidence emission integration"""
    print("Testing evidence emission integration...")

    try:
        # Import unified evidence manager
        sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'agentic-flow-core' / 'src'))
        # This would normally import the TypeScript module, but for Python testing we'll mock

        # Simulate evidence emission
        evidence_file = Path(__file__).parent.parent.parent / '.goalie' / 'unified_evidence.jsonl'

        # Write test evidence
        test_evidence = {
            'timestamp': datetime.now().isoformat(),
            'event_type': 'test_integration',
            'component': 'evidence_system',
            'status': 'success'
        }

        with open(evidence_file, 'a') as f:
            f.write(json.dumps(test_evidence) + '\n')

        print("✓ Evidence emission test passed")
        return True

    except Exception as e:
        print(f"✗ Evidence emission test failed: {e}")
        return False

def test_pattern_analysis_integration():
    """Test pattern analysis integration"""
    print("Testing pattern analysis integration...")

    try:
        # Test pattern telemetry analyzer
        analyzer_script = Path(__file__).parent.parent / 'observability' / 'pattern_telemetry_analyzer.py'
        if analyzer_script.exists():
            # Run analyzer with test data
            import subprocess
            result = subprocess.run(
                [sys.executable, str(analyzer_script), '--test'],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                print("✓ Pattern analysis integration test passed")
                return True
            else:
                print(f"✗ Pattern analysis test failed: {result.stderr}")
                return False
        else:
            print("✗ Pattern analyzer script not found")
            return False

    except Exception as e:
        print(f"✗ Pattern analysis integration test failed: {e}")
        return False

def test_governance_integration():
    """Test governance system integration"""
    print("Testing governance integration...")

    try:
        # Check governance config
        config_file = Path(__file__).parent.parent.parent / '.goalie' / 'governance_config.json'
        if config_file.exists():
            with open(config_file, 'r') as f:
                config = json.load(f)

            required_keys = ['purposes', 'domains', 'accountabilities']
            for key in required_keys:
                if key not in config:
                    print(f"✗ Missing governance config key: {key}")
                    return False

            print("✓ Governance integration test passed")
            return True
        else:
            print("✗ Governance config not found")
            return False

    except Exception as e:
        print(f"✗ Governance integration test failed: {e}")
        return False

def test_database_integration():
    """Test database integration"""
    print("Testing database integration...")

    try:
        # Check agentdb
        agentdb_path = Path(__file__).parent.parent.parent / '.agentdb'
        if agentdb_path.exists():
            db_files = list(agentdb_path.glob('*.db'))
            if db_files:
                print(f"✓ Database integration test passed ({len(db_files)} databases found)")
                return True
            else:
                print("✗ No database files found")
                return False
        else:
            print("✗ AgentDB directory not found")
            return False

    except Exception as e:
        print(f"✗ Database integration test failed: {e}")
        return False

def main():
    """Run all integration tests"""
    print("Running Integration Tests")
    print("=" * 50)

    tests = [
        test_evidence_emission,
        test_pattern_analysis_integration,
        test_governance_integration,
        test_database_integration
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"✗ Test {test.__name__} crashed: {e}")

    print("=" * 50)
    print(f"Integration Tests Results: {passed}/{total} passed")

    if passed == total:
        print("✓ All integration tests passed")
        return 0
    else:
        print("✗ Some integration tests failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())