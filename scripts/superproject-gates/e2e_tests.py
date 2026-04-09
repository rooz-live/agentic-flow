#!/usr/bin/env python3
"""
End-to-End Tests

Tests complete workflows from start to finish.
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

def test_full_prod_cycle():
    """Test full production cycle workflow"""
    print("Testing full production cycle workflow...")

    try:
        # Simulate running a full prod cycle
        af_script = Path(__file__).parent.parent / 'af_cli'
        if af_script.exists():
            import subprocess

            # Run prod-cycle command
            result = subprocess.run(
                [str(af_script), 'prod-cycle', '--dry-run', '--json'],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                print("✓ Full production cycle test passed")
                return True
            else:
                print(f"✗ Production cycle test failed: {result.stderr}")
                return False
        else:
            print("✗ AF CLI script not found")
            return False

    except Exception as e:
        print(f"✗ Full production cycle test failed: {e}")
        return False

def test_evidence_trail_completeness():
    """Test evidence trail completeness"""
    print("Testing evidence trail completeness...")

    try:
        # Check that evidence files are being written
        goalie_path = Path(__file__).parent.parent.parent / '.goalie'

        evidence_files = [
            'unified_evidence.jsonl',
            'economic_compounding.jsonl',
            'observability_gaps.jsonl'
        ]

        missing_files = []
        for evidence_file in evidence_files:
            if not (goalie_path / evidence_file).exists():
                missing_files.append(evidence_file)

        if missing_files:
            print(f"✗ Missing evidence files: {missing_files}")
            return False

        # Check that files have recent content
        recent_content = False
        for evidence_file in evidence_files:
            file_path = goalie_path / evidence_file
            if file_path.exists():
                mtime = file_path.stat().st_mtime
                # Check if modified in last 24 hours
                if time.time() - mtime < 86400:
                    recent_content = True
                    break

        if recent_content:
            print("✓ Evidence trail completeness test passed")
            return True
        else:
            print("✗ No recent evidence activity found")
            return False

    except Exception as e:
        print(f"✗ Evidence trail test failed: {e}")
        return False

def test_system_health_monitoring():
    """Test system health monitoring"""
    print("Testing system health monitoring...")

    try:
        # Check system health file
        health_file = Path(__file__).parent.parent.parent / '.goalie' / 'system_health.json'
        if health_file.exists():
            with open(health_file, 'r') as f:
                health_data = json.load(f)

            required_keys = ['timestamp', 'components']
            for key in required_keys:
                if key not in health_data:
                    print(f"✗ Missing health data key: {key}")
                    return False

            print("✓ System health monitoring test passed")
            return True
        else:
            print("✗ System health file not found")
            return False

    except Exception as e:
        print(f"✗ System health monitoring test failed: {e}")
        return False

def test_governance_workflow():
    """Test governance workflow end-to-end"""
    print("Testing governance workflow...")

    try:
        # Check governance config and recent activity
        config_file = Path(__file__).parent.parent.parent / '.goalie' / 'governance_config.json'
        if config_file.exists():
            with open(config_file, 'r') as f:
                config = json.load(f)

            # Check for required governance structure
            if 'purposes' in config and 'domains' in config:
                print("✓ Governance workflow test passed")
                return True
            else:
                print("✗ Incomplete governance configuration")
                return False
        else:
            print("✗ Governance config not found")
            return False

    except Exception as e:
        print(f"✗ Governance workflow test failed: {e}")
        return False

def test_observability_pipeline():
    """Test observability pipeline end-to-end"""
    print("Testing observability pipeline...")

    try:
        # Check observability config and data
        config_file = Path(__file__).parent.parent.parent / '.goalie' / 'observability_config.json'
        if config_file.exists():
            with open(config_file, 'r') as f:
                config = json.load(f)

            # Check pattern metrics
            pattern_file = Path(__file__).parent.parent.parent / '.goalie' / 'pattern_metrics.jsonl'
            if pattern_file.exists():
                print("✓ Observability pipeline test passed")
                return True
            else:
                print("✗ Pattern metrics not found")
                return False
        else:
            print("✗ Observability config not found")
            return False

    except Exception as e:
        print(f"✗ Observability pipeline test failed: {e}")
        return False

def main():
    """Run all E2E tests"""
    print("Running End-to-End Tests")
    print("=" * 50)

    tests = [
        test_full_prod_cycle,
        test_evidence_trail_completeness,
        test_system_health_monitoring,
        test_governance_workflow,
        test_observability_pipeline
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
    print(f"E2E Tests Results: {passed}/{total} passed")

    if passed == total:
        print("✓ All E2E tests passed")
        return 0
    else:
        print("✗ Some E2E tests failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())