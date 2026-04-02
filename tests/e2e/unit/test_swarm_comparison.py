#!/usr/bin/env python3
"""
Test script for three-way swarm comparison functionality
"""

import json
import os
import sys
import tempfile
from pathlib import Path

# Add scripts directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir.parent / "scripts" / "af"))

try:
    from swarm_compare import (
        SwarmTableInfo,
        calculate_extended_metrics,
        compare_three_way,
        discover_swarm_tables,
        EXTENDED_METRICS
    )
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)


def create_mock_swarm_table_data():
    """Create mock swarm table data for testing"""
    return [
        {
            "phase": "baseline",
            "profile": "golden",
            "concurrency": "sequential",
            "ok": "1",
            "health_ckpt": "5",
            "abort": "0",
            "sys_state_err": "0",
            "autofix_adv": "2",
            "autofix_applied": "1",
            "duration_h": "2.5",
            "total_actions": "150",
            "actions_per_h": "60.0",
            "alloc_rev": "250.0",
            "rev_per_h": "100.0",
            "rev_per_action": "1.67",
            "allocation_efficiency_pct": "85.0",
            "event_count": "200",
            "miss": "5",
            "inv": "2",
            "sentinel": "1",
            "zero": "0",
            "duration_ok_pct": "95.0",
            "dur_mult": "1.0",
            "eff_mult": "1.0",
            "tier_backlog_cov_pct": "75.0",
            "tier_telemetry_cov_pct": "80.0",
            "tier_depth_cov_pct": "70.0"
        },
        {
            "phase": "baseline", 
            "profile": "longrun",
            "concurrency": "sequential",
            "ok": "1",
            "health_ckpt": "8",
            "abort": "0",
            "sys_state_err": "1",
            "autofix_adv": "3",
            "autofix_applied": "2",
            "duration_h": "4.0",
            "total_actions": "200",
            "actions_per_h": "50.0",
            "alloc_rev": "300.0",
            "rev_per_h": "75.0",
            "rev_per_action": "1.5",
            "allocation_efficiency_pct": "75.0",
            "event_count": "250",
            "miss": "8",
            "inv": "3",
            "sentinel": "2",
            "zero": "1",
            "duration_ok_pct": "90.0",
            "dur_mult": "1.2",
            "eff_mult": "0.8",
            "tier_backlog_cov_pct": "70.0",
            "tier_telemetry_cov_pct": "75.0",
            "tier_depth_cov_pct": "65.0"
        }
    ]


def write_mock_tsv(file_path: Path, data: list, label: str):
    """Write mock data to TSV file"""
    if not data:
        return
    
    headers = list(data[0].keys())
    
    with open(file_path, "w", encoding="utf-8") as f:
        # Write header
        f.write("\t".join(headers) + "\n")
        
        # Write data rows
        for row in data:
            values = [str(row.get(header, "")) for header in headers]
            f.write("\t".join(values) + "\n")
    
    print(f"Created mock TSV: {file_path} with {len(data)} rows")


def test_extended_metrics():
    """Test extended metrics calculation"""
    print("Testing extended metrics calculation...")
    
    mock_data = create_mock_swarm_table_data()
    enhanced_data = calculate_extended_metrics(mock_data)
    
    # Verify new metrics are present
    for row in enhanced_data:
        for metric in ["throughput_actions_per_hour", "portal_pivot_efficiency", 
                      "dashboard_pivot_efficiency", "contention_multiplier",
                      "longrun_stability_score", "error_recovery_rate",
                      "resource_utilization_pct", "pipeline_efficiency_pct"]:
            if metric not in row:
                print(f"❌ Missing metric: {metric}")
                return False
    
    print("✅ Extended metrics calculation test passed")
    return True


def test_three_way_comparison():
    """Test three-way comparison functionality"""
    print("Testing three-way comparison...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Create three mock tables with different characteristics
        prior_data = create_mock_swarm_table_data()
        current_data = create_mock_swarm_table_data()
        auto_ref_data = create_mock_swarm_table_data()
        
        # Modify data to simulate different performance
        # Current: better performance
        for row in current_data:
            row["duration_h"] = str(float(row["duration_h"]) * 0.8)  # 20% faster
            row["rev_per_h"] = str(float(row["rev_per_h"]) * 1.2)  # 20% more revenue
            row["abort"] = "0"  # No aborts
        
        # Auto-ref: best performance
        for row in auto_ref_data:
            row["duration_h"] = str(float(row["duration_h"]) * 0.7)  # 30% faster
            row["rev_per_h"] = str(float(row["rev_per_h"]) * 1.4)  # 40% more revenue
            row["abort"] = "0"  # No aborts
        
        # Write mock files
        prior_file = temp_path / "swarm_table_prior_1000000000.tsv"
        current_file = temp_path / "swarm_table_current_1000000001.tsv"
        auto_ref_file = temp_path / "swarm_table_baseline_1000000002.tsv"
        
        write_mock_tsv(prior_file, prior_data, "prior")
        write_mock_tsv(current_file, current_data, "current")
        write_mock_tsv(auto_ref_file, auto_ref_data, "auto_ref")
        
        # Create SwarmTableInfo objects
        prior_table = SwarmTableInfo(
            path=str(prior_file),
            timestamp=1000000000,
            label="prior",
            rows=prior_data
        )
        current_table = SwarmTableInfo(
            path=str(current_file),
            timestamp=1000000001,
            label="current",
            rows=current_data
        )
        auto_ref_table = SwarmTableInfo(
            path=str(auto_ref_file),
            timestamp=1000000002,
            label="auto_ref",
            rows=auto_ref_data
        )
        
        # Run comparison
        try:
            comparison_result = compare_three_way(prior_table, current_table, auto_ref_table)
            
            # Verify structure
            required_keys = ["meta", "groups", "recommendations", "risk_assessment"]
            for key in required_keys:
                if key not in comparison_result:
                    print(f"❌ Missing comparison key: {key}")
                    return False
            
            # Verify recommendations exist
            recommendations = comparison_result.get("recommendations", [])
            if not recommendations:
                print("❌ No recommendations generated")
                return False
            
            # Verify risk assessment
            risk_levels = comparison_result.get("risk_assessment", {})
            if not risk_levels:
                print("❌ No risk assessment generated")
                return False
            
            print("✅ Three-way comparison test passed")
            print(f"Generated {len(recommendations)} recommendations")
            print(f"Risk levels: {set(risk_levels.values())}")
            
            # Save test results
            output_file = temp_path / "test_comparison.json"
            with open(output_file, "w") as f:
                json.dump(comparison_result, f, indent=2)
            
            print(f"Test comparison saved to: {output_file}")
            return True
            
        except Exception as e:
            print(f"❌ Comparison test failed: {e}")
            return False


def test_file_discovery():
    """Test file discovery functionality"""
    print("Testing file discovery...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        goalie_dir = temp_path / ".goalie"
        goalie_dir.mkdir()
        
        # Create mock swarm files
        files_created = []
        for i, label in enumerate(["prior", "current", "baseline", "auto_ref"]):
            timestamp = 1000000000 + i
            file_path = goalie_dir / f"swarm_table_{label}_{timestamp}.tsv"
            mock_data = create_mock_swarm_table_data()
            write_mock_tsv(file_path, mock_data, label)
            files_created.append(file_path)
        
        # Test discovery
        try:
            discovered = discover_swarm_tables(str(temp_path))
            
            if len(discovered) != len(files_created):
                print(f"❌ Expected {len(files_created)} files, found {len(discovered)}")
                return False
            
            # Check sorting (newest first)
            timestamps = [f.timestamp for f in discovered]
            if timestamps != sorted(timestamps, reverse=True):
                print("❌ Files not sorted correctly by timestamp")
                return False
            
            print(f"✅ File discovery test passed - found {len(discovered)} files")
            return True
            
        except Exception as e:
            print(f"❌ File discovery test failed: {e}")
            return False


def main():
    """Run all tests"""
    print("🧪 Running Three-Way Swarm Comparison Tests\n")
    
    tests = [
        ("Extended Metrics", test_extended_metrics),
        ("Three-Way Comparison", test_three_way_comparison),
        ("File Discovery", test_file_discovery),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        try:
            if test_func():
                passed += 1
            else:
                print(f"❌ {test_name} test failed")
        except Exception as e:
            print(f"❌ {test_name} test error: {e}")
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return 0
    else:
        print("💥 Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())