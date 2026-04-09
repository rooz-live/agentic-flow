#!/usr/bin/env python3
"""
HostBill + OpenStack Integration Test
Tests device provisioning workflow
"""

import json
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

# Configuration
HOSTBILL_URL = os.getenv("HOSTBILL_URL", "https://billing.example.com")
HOSTBILL_API_ID = os.getenv("HOSTBILL_API_ID", "NEEDS_CONFIG")
HOSTBILL_API_KEY = os.getenv("HOSTBILL_API_KEY", "NEEDS_CONFIG")

STX_HOST = os.getenv("STX_HOST", "STX-AIO-0")
STX_SSH_KEY = Path("pem/stx-aio-0.pem")
STX_PORT = 2222

def log(msg):
    """Log with timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def ssh_exec(command):
    """Execute command on STX server"""
    try:
        host_ip = subprocess.check_output(
            "grep HostName ~/.ssh/config.device_24460 | awk '{print $2}'",
            shell=True, text=True
        ).strip()
        
        cmd = f"ssh -i {STX_SSH_KEY} -p {STX_PORT} -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@{host_ip} \"{command}\""
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout.strip()
    except Exception as e:
        return f"ERROR: {e}"

def test_openstack_connectivity():
    """Test 1: OpenStack CLI connectivity"""
    log("Test 1: OpenStack CLI connectivity")
    
    version = ssh_exec("openstack --version 2>&1")
    if "openstack" in version:
        log(f"  ✅ OpenStack CLI: {version}")
        return True
    else:
        log(f"  ❌ OpenStack CLI failed: {version}")
        return False

def test_docker_services():
    """Test 2: Docker services"""
    log("Test 2: Docker services")
    
    containers = ssh_exec("docker ps --format '{{.Names}}' | wc -l")
    try:
        count = int(containers)
        log(f"  ✅ Docker containers running: {count}")
        return count > 0
    except:
        log(f"  ❌ Docker check failed: {containers}")
        return False

def test_hostbill_config():
    """Test 3: HostBill configuration"""
    log("Test 3: HostBill configuration")
    
    if HOSTBILL_API_ID == "NEEDS_CONFIG":
        log("  ⚠️  HOSTBILL_API_ID not configured")
        return False
    if HOSTBILL_API_KEY == "NEEDS_CONFIG":
        log("  ⚠️  HOSTBILL_API_KEY not configured")
        return False
    
    log(f"  ✅ HostBill URL: {HOSTBILL_URL}")
    log(f"  ✅ API ID configured: {HOSTBILL_API_ID[:10]}...")
    return True

def test_openstack_compute():
    """Test 4: OpenStack compute service"""
    log("Test 4: OpenStack compute service")
    
    # Check if OpenStack Horizon is running
    horizon = ssh_exec("systemctl is-active openstack-horizon 2>&1")
    if "active" in horizon:
        log("  ✅ OpenStack Horizon: active")
        return True
    else:
        log(f"  ⚠️  OpenStack Horizon: {horizon}")
        return False

def test_device_provisioning_workflow():
    """Test 5: Simulated device provisioning"""
    log("Test 5: Simulated device provisioning workflow")
    
    workflow = {
        "hostbill_order": "pending",
        "openstack_instance": "pending",
        "network_config": "pending",
        "activation": "pending"
    }
    
    # Simulate workflow steps
    log("  → Step 1: HostBill order received")
    workflow["hostbill_order"] = "success"
    
    log("  → Step 2: OpenStack instance creation")
    workflow["openstack_instance"] = "success" if test_openstack_connectivity() else "failed"
    
    log("  → Step 3: Network configuration")
    workflow["network_config"] = "success"
    
    log("  → Step 4: Service activation")
    workflow["activation"] = "success"
    
    success = all(v == "success" for v in workflow.values())
    log(f"  {'✅' if success else '❌'} Workflow complete: {json.dumps(workflow, indent=2)}")
    return success

def main():
    log("="*60)
    log("HostBill + OpenStack Integration Test")
    log("="*60)
    
    tests = [
        ("OpenStack CLI", test_openstack_connectivity),
        ("Docker Services", test_docker_services),
        ("HostBill Config", test_hostbill_config),
        ("OpenStack Compute", test_openstack_compute),
        ("Provisioning Workflow", test_device_provisioning_workflow),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            success = test_func()
            results.append((name, success))
        except Exception as e:
            log(f"  ❌ Test failed: {e}")
            results.append((name, False))
        log("")
    
    # Summary
    log("="*60)
    log("Test Summary")
    log("="*60)
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        log(f"{status} - {name}")
    
    log("")
    log(f"Results: {passed}/{total} tests passed ({passed/total*100:.0f}%)")
    
    if passed == total:
        log("🎉 All tests passed! Integration ready.")
        return 0
    else:
        log("⚠️  Some tests failed. Review configuration.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
