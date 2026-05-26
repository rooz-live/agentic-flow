#!/usr/bin/env python3
"""
Test script for swarm-compare integration with prod-swarm
"""

import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

def generate_test_swarm_data(output_dir: Path) -> dict:
    """Generate test swarm data for integration testing"""
    print("🔄 Generating test swarm data...")
    
    test_files = {}
    
    # Generate three test tables with different timestamps
    for i, label in enumerate(["prior", "auto_ref", "current"]):
        timestamp = int(time.time()) - (2 - i) * 3600  # Stagger by hours
        filename = f"swarm_table_{label}_{timestamp}.tsv"
        filepath = output_dir / filename
        
        with open(filepath, 'w') as f:
            # Header with extended metrics
            header = (
                "phase\tprofile\tconcurrency\tok\thealth_ckpt\tabort\t"
                "sys_state_err\tautofix_adv\tautofix_applied\tduration_h\t"
                "total_actions\tactions_per_h\talloc_rev\trev_per_h\t"
                "rev_per_action\tallocation_efficiency_pct\tevent_count\tmiss\t"
                "inv\tsentinel\tzero\tduration_ok_pct\tdur_mult\teff_mult\t"
                "tier_backlog_cov_pct\ttier_telemetry_cov_pct\ttier_depth_cov_pct\t"
                "safety_mult\tcontention_multiplier\tlongrun_stability_score\t"
                "maturity_delta_score\tgaps_analysis_score\n"
            )
            f.write(header)
            
            # Generate test data with varying performance
            for j in range(5):
                profile = ["conservative", "balanced", "aggressive"][j % 3]
                concurrency = [1, 2, 4][j % 3]
                ok = 1 if j % 4 != 0 else 0
                
                # Vary metrics based on label to show trends
                base_multiplier = 1.0
                if label == "prior":
                    base_multiplier = 0.8  # Lower performance
                elif label == "current":
                    base_multiplier = 1.0  # Baseline
                else:  # auto_ref
                    base_multiplier = 1.2  # Better performance
                
                health_ckpt = 0.8 + (j * 0.02) * base_multiplier
                abort = 1 if ok == 0 else 0
                sys_state_err = 0 if j % 5 != 0 else 1
                autofix_adv = 2 + j
                autofix_applied = 1 + (j % 2)
                duration_h = (0.5 + (j * 0.1)) / base_multiplier
                total_actions = int((50 + (j * 10)) * base_multiplier)
                actions_per_h = total_actions / duration_h
                alloc_rev = int((100 + (j * 20)) * base_multiplier)
                rev_per_h = alloc_rev / duration_h
                rev_per_action = rev_per_h / total_actions
                allocation_efficiency_pct = min(95, (70 + (j * 2)) * base_multiplier)
                event_count = int((100 + (j * 15)) * base_multiplier)
                miss = 5 + (j % 3)
                inv = 2 + (j % 2)
                sentinel = 1 if j % 3 == 0 else 0
                zero = 0 if j % 4 != 0 else 1
                duration_ok_pct = 85 + (j % 10)
                dur_mult = (0.9 + (j * 0.05)) / base_multiplier
                eff_mult = (1.1 + (j * 0.03)) * base_multiplier
                tier_backlog_cov_pct = min(90, (60 + (j * 3)) * base_multiplier)
                tier_telemetry_cov_pct = min(95, (75 + (j % 15)) * base_multiplier)
                tier_depth_cov_pct = min(85, (50 + (j * 5)) * base_multiplier)
                safety_mult = min(1.0, 0.7 + (0.2 * base_multiplier))
                contention_multiplier = max(0.1, 1.0 - (0.1 * base_multiplier))
                longrun_stability_score = min(100, (60 + (j * 5)) * base_multiplier)
                maturity_delta_score = min(100, (50 + (j * 8)) * base_multiplier)
                gaps_analysis_score = min(100, (40 + (j * 10)) * base_multiplier)
                
                row_data = (
                    f"test_phase\t{profile}\t{concurrency}\t{ok}\t{health_ckpt}\t"
                    f"{abort}\t{sys_state_err}\t{autofix_adv}\t{autofix_applied}\t"
                    f"{duration_h}\t{total_actions}\t{actions_per_h}\t{alloc_rev}\t"
                    f"{rev_per_h}\t{rev_per_action}\t{allocation_efficiency_pct}\t"
                    f"{event_count}\t{miss}\t{inv}\t{sentinel}\t{zero}\t"
                    f"{duration_ok_pct}\t{dur_mult}\t{eff_mult}\t"
                    f"{tier_backlog_cov_pct}\t{tier_telemetry_cov_pct}\t"
                    f"{tier_depth_cov_pct}\t{safety_mult}\t{contention_multiplier}\t"
                    f"{longrun_stability_score}\t{maturity_delta_score}\t{gaps_analysis_score}\n"
                )
                f.write(row_data)
        
        test_files[label] = str(filepath)
        print(f"   ✅ Generated {label}: {filepath}")
    
    return test_files

def test_auto_discovery(project_root: Path):
    """Test auto-discovery functionality"""
    print("\n🔍 Testing auto-discovery functionality...")
    
    try:
        cmd = [
            sys.executable, 
            str(project_root / "scripts" / "af" / "af_prod_swarm.py"),
            "--discover",
            "--json"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=project_root)
        
        if result.returncode == 0:
            discovery_result = json.loads(result.stdout)
            print("   ✅ Auto-discovery test passed")
            print(f"   📊 Found {discovery_result.get('validation_summary', {}).get('total_tables', 0)} tables")
            return True
        else:
            print(f"   ❌ Auto-discovery test failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"   ❌ Auto-discovery test error: {e}")
        return False

def test_auto_save_and_compare(project_root: Path, test_files: dict):
    """Test auto-save and auto-compare functionality"""
    print("\n🔄 Testing auto-save and auto-compare functionality...")
    
    try:
        cmd = [
            sys.executable,
            str(project_root / "scripts" / "af" / "af_prod_swarm.py"),
            "--current", test_files["current"],
            "--auto-save-table",
            "--auto-compare",
            "--include-extended-metrics",
            "--json"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=project_root)
        
        if result.returncode == 0:
            print("   ✅ Auto-save and auto-compare test passed")
            
            # Parse output to check for key features
            output_lines = result.stdout.strip().split('\n')
            for line in output_lines:
                if "Auto-saving current swarm table" in line:
                    print("   ✅ Auto-save functionality working")
                elif "Auto-comparison completed" in line:
                    print("   ✅ Auto-compare functionality working")
                elif "Revenue trend:" in line:
                    print("   ✅ Extended metrics analysis working")
            
            return True
        else:
            print(f"   ❌ Auto-save and auto-compare test failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"   ❌ Auto-save and auto-compare test error: {e}")
        return False

def test_three_way_comparison(project_root: Path, test_files: dict):
    """Test three-way comparison with explicit files"""
    print("\n📊 Testing three-way comparison...")
    
    try:
        cmd = [
            sys.executable,
            str(project_root / "scripts" / "af" / "af_prod_swarm.py"),
            "--prior", test_files["prior"],
            "--current", test_files["current"],
            "--auto-ref", test_files["auto_ref"],
            "--compare",
            "--include-extended-metrics",
            "--json"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=project_root)
        
        if result.returncode == 0:
            print("   ✅ Three-way comparison test passed")
            
            # Check for comparison results
            if "success" in result.stdout or "completed" in result.stdout.lower():
                print("   ✅ Comparison analysis completed successfully")
            
            return True
        else:
            print(f"   ❌ Three-way comparison test failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"   ❌ Three-way comparison test error: {e}")
        return False

def test_evidence_logging(project_root: Path):
    """Test evidence logging functionality"""
    print("\n📝 Testing evidence logging functionality...")
    
    try:
        # Check if evidence log is created
        goalie_dir = project_root / ".goalie"
        evidence_log = goalie_dir / "unified_evidence.jsonl"
        
        if evidence_log.exists():
            print("   ✅ Evidence logging file created")
            
            # Check log content
            with open(evidence_log, 'r') as f:
                lines = f.readlines()
            
            if lines:
                print(f"   ✅ Evidence log contains {len(lines)} entries")
                
                # Check for expected event types
                log_content = ''.join(lines)
                if "prod_swarm_started" in log_content:
                    print("   ✅ Prod-swarm start event logged")
                if "table_saved" in log_content:
                    print("   ✅ Table save event logged")
                if "comparison_completed" in log_content:
                    print("   ✅ Comparison completion event logged")
                
                return True
            else:
                print("   ⚠️  Evidence log exists but is empty")
                return False
        else:
            print("   ❌ Evidence logging file not found")
            return False
            
    except Exception as e:
        print(f"   ❌ Evidence logging test error: {e}")
        return False

def main():
    """Main test runner"""
    print("🧪 Testing Swarm-Compare Integration with Prod-Swarm")
    print("=" * 60)
    
    # Determine project root
    project_root = Path(__file__).parent.parent.parent
    
    # Create temporary test directory
    with tempfile.TemporaryDirectory() as temp_dir:
        test_dir = Path(temp_dir)
        goalie_dir = project_root / ".goalie"
        goalie_dir.mkdir(exist_ok=True)
        
        print(f"📁 Project root: {project_root}")
        print(f"📁 Test directory: {test_dir}")
        
        # Generate test data
        test_files = generate_test_swarm_data(goalie_dir)
        
        # Run tests
        test_results = []
        
        # Test 1: Auto-discovery
        test_results.append(("Auto-discovery", test_auto_discovery(project_root)))
        
        # Test 2: Auto-save and auto-compare
        test_results.append(("Auto-save & Auto-compare", test_auto_save_and_compare(project_root, test_files)))
        
        # Test 3: Three-way comparison
        test_results.append(("Three-way Comparison", test_three_way_comparison(project_root, test_files)))
        
        # Test 4: Evidence logging
        test_results.append(("Evidence Logging", test_evidence_logging(project_root)))
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_name:.<30} {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Integration is working correctly.")
            return 0
        else:
            print("⚠️  Some tests failed. Check the implementation.")
            return 1

if __name__ == "__main__":
    sys.exit(main())