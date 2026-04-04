#!/usr/bin/env python3
"""
Test script for variant iteration controls in prod-cycle and prod-swarm
"""

import subprocess
import sys
import json
import os
from pathlib import Path

def run_command(cmd, description):
    """Run a command and return the result"""
    print(f"\n🧪 Testing: {description}")
    print(f"   Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print(f"   ✅ Success (exit code: {result.returncode})")
            if result.stdout:
                print(f"   Output: {result.stdout[:200]}...")
        else:
            print(f"   ❌ Failed (exit code: {result.returncode})")
            if result.stderr:
                print(f"   Error: {result.stderr[:200]}...")
        
        return result.returncode == 0, result.stdout, result.stderr
        
    except subprocess.TimeoutExpired:
        print(f"   ⏰ Timeout after 30 seconds")
        return False, "", "Timeout"
    except Exception as e:
        print(f"   💥 Exception: {e}")
        return False, "", str(e)

def test_prod_cycle_variant_controls():
    """Test prod-cycle variant controls"""
    print("\n🔍 Testing prod-cycle variant controls...")
    
    # Test 1: Help with variant options
    success, stdout, stderr = run_command(
        ["python3", "cmd_prod_cycle.py", "--help"],
        "Help shows variant options"
    )
    
    if "--variant-a-iters" in stdout:
        print("   ✅ Variant options documented in help")
    else:
        print("   ❌ Variant options missing from help")
    
    # Test 2: Dry run with variant A and B
    success, stdout, stderr = run_command(
        ["python3", "cmd_prod_cycle.py", "--mode", "mutate", "--dry-run", 
         "--variant-a-iters", "3", "--variant-b-iters", "2", "--ab-reps", "5"],
        "Dry run with variant A (3 iters) and B (2 iters)"
    )
    
    # Test 3: Custom labels
    success, stdout, stderr = run_command(
        ["python3", "cmd_prod_cycle.py", "--mode", "mutate", "--dry-run",
         "--variant-a-iters", "1", "--variant-a-label", "Control",
         "--variant-b-iters", "1", "--variant-b-label", "Treatment"],
        "Custom variant labels"
    )
    
    # Test 4: Skip variants (0 iterations)
    success, stdout, stderr = run_command(
        ["python3", "cmd_prod_cycle.py", "--mode", "mutate", "--dry-run",
         "--variant-a-iters", "1", "--variant-b-iters", "0", "--variant-c-iters", "0"],
        "Skip variants B and C (0 iterations)"
    )

def test_prod_swarm_variant_controls():
    """Test prod-swarm variant controls"""
    print("\n🔍 Testing prod-swarm variant controls...")
    
    swarm_script = Path("investing/agentic-flow/src/prod_cycle_swarm_runner.py")
    
    if not swarm_script.exists():
        print(f"   ⚠️  Swarm script not found at {swarm_script}")
        return
    
    # Test 1: Help with variant options
    success, stdout, stderr = run_command(
        ["python3", str(swarm_script), "--help"],
        "Help shows variant options"
    )
    
    if "--variant-a-iters" in stdout:
        print("   ✅ Variant options documented in help")
    else:
        print("   ❌ Variant options missing from help")
    
    # Test 2: Dry run with variant configuration
    success, stdout, stderr = run_command(
        ["python3", str(swarm_script), "--dry-run",
         "--variant-a-iters", "10", "--variant-b-iters", "20", "--ab-reps", "5"],
        "Dry run with variant A (10 iters) and B (20 iters)"
    )

def test_af_script_variant_controls():
    """Test af script variant controls"""
    print("\n🔍 Testing af script variant controls...")
    
    # Test 1: Help shows variant options
    success, stdout, stderr = run_command(
        ["./af", "--help"],
        "Help shows variant options"
    )
    
    if "--variant-a-iters" in stdout:
        print("   ✅ Variant options documented in help")
    else:
        print("   ❌ Variant options missing from help")
    
    # Test 2: prod-cycle with variants
    success, stdout, stderr = run_command(
        ["./af", "prod-cycle", "--dry-run", "--mode", "mutate",
         "--variant-a-iters", "3", "--variant-b-iters", "2"],
        "af prod-cycle with variant A (3 iters) and B (2 iters)"
    )
    
    # Test 3: prod-swarm with variants
    success, stdout, stderr = run_command(
        ["./af", "prod-swarm", "--dry-run",
         "--variant-a-iters", "5", "--variant-b-iters", "10", "--ab-reps", "3"],
        "af prod-swarm with variant A (5 iters) and B (10 iters)"
    )

def test_evidence_emitter_integration():
    """Test evidence emitter integration"""
    print("\n🔍 Testing evidence emitter integration...")
    
    # Create .goalie directory if it doesn't exist
    goalie_dir = Path(".goalie")
    goalie_dir.mkdir(exist_ok=True)
    
    # Run a short variant test to generate evidence
    success, stdout, stderr = run_command(
        ["python3", "cmd_prod_cycle.py", "--mode", "mutate", "--dry-run",
         "--variant-a-iters", "1", "--variant-b-iters", "1", "--ab-reps", "1"],
        "Generate evidence for variant testing"
    )
    
    # Check if evidence directory was created
    evidence_dir = goalie_dir / "evidence"
    if evidence_dir.exists():
        print("   ✅ Evidence directory created")
        
        # List evidence files
        evidence_files = list(evidence_dir.glob("variant_results_*.json"))
        if evidence_files:
            print(f"   ✅ Variant evidence files found: {len(evidence_files)}")
            
            # Check content of latest evidence file
            latest_file = max(evidence_files, key=os.path.getctime)
            try:
                with open(latest_file, 'r') as f:
                    evidence_data = json.load(f)
                
                if 'variant_config' in evidence_data:
                    print("   ✅ Variant configuration logged")
                if 'results' in evidence_data:
                    print("   ✅ Variant results logged")
                if 'summary' in evidence_data:
                    print("   ✅ Variant summary logged")
                    
            except Exception as e:
                print(f"   ❌ Error reading evidence file: {e}")
        else:
            print("   ⚠️  No variant evidence files found")
    else:
        print("   ⚠️  Evidence directory not created")

def main():
    """Main test function"""
    print("🧪 Testing Variant Iteration Controls")
    print("=" * 50)
    
    # Change to script directory if needed
    if Path("cmd_prod_cycle.py").exists():
        os.chdir(Path.cwd())
    elif Path("../cmd_prod_cycle.py").exists():
        os.chdir("..")
    else:
        print("❌ Cannot find cmd_prod_cycle.py")
        sys.exit(1)
    
    # Run all tests
    test_prod_cycle_variant_controls()
    test_prod_swarm_variant_controls()
    test_af_script_variant_controls()
    test_evidence_emitter_integration()
    
    print("\n" + "=" * 50)
    print("🏁 Variant iteration controls testing completed")

if __name__ == "__main__":
    main()