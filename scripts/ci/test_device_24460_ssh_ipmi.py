#!/usr/bin/env python3
"""IPMI via SSH Workaround for Device #24460"""
import subprocess
import sys
import json
from datetime import datetime

def test_ssh_connectivity():
    """Test SSH connectivity to device"""
    try:
        cmd = ['ssh', '-i', '/Users/shahroozbhopti/pem/rooz.pem', '-o', 'ConnectTimeout=10', 
               'ubuntu@23.92.79.2', 'echo "SSH_OK"']
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return result.returncode == 0 and "SSH_OK" in result.stdout
    except Exception as e:
        print(f"SSH connectivity test failed: {e}")
        return False

def get_device_state_via_ssh():
    """Get device state through SSH tunnel"""
    try:
        # Mock IPMI data via SSH
        cmd = ['ssh', '-i', '/Users/shahroozbhopti/pem/rooz.pem', 
               'ubuntu@23.92.79.2', 'uname -a && uptime && df -h']
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        
        if result.returncode == 0:
            return {
                'status': 'operational',
                'connectivity': 'ssh_tunnel',
                'timestamp': datetime.now().isoformat(),
                'system_info': result.stdout.strip()
            }
        else:
            return {'status': 'unreachable', 'error': result.stderr}
    except Exception as e:
        return {'status': 'error', 'error': str(e)}

if __name__ == "__main__":
    print("Testing Device #24460 connectivity via SSH...")
    
    if test_ssh_connectivity():
        print("✅ SSH connectivity: OK")
        state = get_device_state_via_ssh()
        print(f"Device state: {state['status']}")
        
        # Save state for monitoring integration
        with open(f'/tmp/device_24460_state_{int(datetime.now().timestamp())}.json', 'w') as f:
            json.dump(state, f, indent=2)
        
        sys.exit(0)
    else:
        print("❌ SSH connectivity: FAILED")
        sys.exit(1)
