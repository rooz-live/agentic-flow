#!/usr/bin/env python3
"""
Test script for enhanced pattern-stats functionality
"""

import subprocess
import json
import sys
from pathlib import Path

def run_test(test_name, args, expected_success=True):
    """Run a test case and report results"""
    print(f"\n{'='*60}")
    print(f"TEST: {test_name}")
    print(f"ARGS: {args}")
    print('='*60)
    
    cmd = ["python", "cmd_pattern_stats_enhanced.py"] + args
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=Path(__file__).parent)
    
    if expected_success:
        if result.returncode == 0:
            print("✅ PASSED")
            if "--json" in args:
                try:
                    json_output = json.loads(result.stdout)
                    print(f"📊 JSON Output Valid: {len(json_output)} fields")
                except json.JSONDecodeError:
                    print("❌ JSON Output Invalid")
            else:
                print(f"📄 Output Length: {len(result.stdout)} characters")
        else:
            print("❌ FAILED")
            print(f"Error: {result.stderr}")
    else:
        if result.returncode != 0:
            print("✅ PASSED (Expected failure)")
        else:
            print("❌ FAILED (Should have failed)")
    
    return result.returncode == 0

def main():
    """Run comprehensive tests"""
    print("🧪 ENHANCED PATTERN-STATS COMPREHENSIVE TEST SUITE")
    
    test_cases = [
        ("Basic functionality", [], True),
        ("JSON output", ["--json"], True),
        ("Time filtering", ["--hours", "24", "--json"], True),
        ("Pattern filtering", ["--pattern", "preflight_check", "--json"], True),
        ("Multiple patterns", ["--patterns", "preflight_check,safe_degrade", "--json"], True),
        ("WSJF enrichment", ["--wsjf-enrich", "--json"], True),
        ("Code-fix detection", ["--detect-fixes", "--json"], True),
        ("72h correlation", ["--72h-correlation", "--json"], True),
        ("All enhancements", ["--wsjf-enrich", "--detect-fixes", "--72h-correlation", "--json"], True),
        ("Sorting", ["--sort-by", "pattern", "--json"], True),
        ("Help", ["--help"], True),
        ("Invalid filter", ["--wsjf-min", "999999"], False),
    ]
    
    passed = 0
    total = len(test_cases)
    
    for test_name, args, expected_success in test_cases:
        if run_test(test_name, args, expected_success):
            passed += 1
    
    print(f"\n{'='*60}")
    print(f"TEST SUMMARY: {passed}/{total} tests passed")
    if passed == total:
        print("🎉 ALL TESTS PASSED!")
    else:
        print(f"⚠️  {total - passed} tests failed")
    print('='*60)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)