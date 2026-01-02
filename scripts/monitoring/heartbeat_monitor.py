#!/usr/bin/env python3
"""
Heartbeat Monitor for Device #24460
Monitors SSH and IPMI status. Reports UP if SSH is accessible.
Implements 'Hardware Monitoring Remediation' objective.

Environment Variables:
  - AF_HEARTBEAT_SIMULATE: Set to "1" to simulate UP status (for testing)
  - AF_SSH_KEY_PATH: Override default SSH key path
"""

import sys
import time
import subprocess
import json
import datetime
import os
from pathlib import Path

class HeartbeatMonitor:
    def __init__(self, device_ip="23.92.79.2", ssh_key_path=None):
        self.device_ip = device_ip
        # Allow SSH key path override via environment
        self.ssh_key_path = ssh_key_path or os.environ.get(
            "AF_SSH_KEY_PATH",
            "/Users/shahroozbhopti/pem/rooz.pem"
        )
        # Simulation mode for testing/CI environments
        self.simulate = os.environ.get("AF_HEARTBEAT_SIMULATE", "0") == "1"

        # Determine paths relative to script location
        # Script: investing/agentic-flow/scripts/monitoring/heartbeat_monitor.py
        self.script_dir = Path(__file__).resolve().parent
        self.agentic_flow_dir = self.script_dir.parent.parent
        self.logs_dir = self.agentic_flow_dir / "logs"
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.heartbeat_file = self.logs_dir / "heartbeats.jsonl"

    def check_ssh(self):
        """Check SSH connectivity"""
        # Simulation mode for testing
        if self.simulate:
            print("Info: Simulation mode - returning UP")
            return True

        if not os.path.exists(self.ssh_key_path):
            print(f"Warning: SSH key not found at {self.ssh_key_path}")
            print("Hint: Set AF_HEARTBEAT_SIMULATE=1 for testing without SSH access")
            return False

        cmd = [
            "ssh",
            "-i", self.ssh_key_path,
            "-o", "ConnectTimeout=5",
            "-o", "BatchMode=yes",
            "-o", "StrictHostKeyChecking=no",
            f"root@{self.device_ip}",
            "echo 'UP'"
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            return result.returncode == 0 and "UP" in result.stdout.strip()
        except Exception as e:
            print(f"SSH Check Error: {e}")
            return False

    def check_ipmi(self):
        """Check IPMI connectivity (via SSH)"""
        # Simulation mode for testing
        if self.simulate:
            return True

        if not os.path.exists(self.ssh_key_path):
            return False

        cmd = [
            "ssh",
            "-i", self.ssh_key_path,
            "-o", "ConnectTimeout=5",
            "-o", "BatchMode=yes",
            "-o", "StrictHostKeyChecking=no",
            f"root@{self.device_ip}",
            "ipmitool sensor list | head -1"
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            return result.returncode == 0
        except Exception:
            return False

    def run(self):
        print(f"💓 Starting Heartbeat Monitor for {self.device_ip}...")
        if self.simulate:
            print("   (Running in SIMULATION mode)")
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

        ssh_status = self.check_ssh()
        ipmi_status = self.check_ipmi()

        # Workaround: Report UP if SSH succeeds, even if IPMI fails
        # This satisfies "Ensure it reports 'UP' if the SSH check succeeds"
        overall_status = "UP" if ssh_status else "DOWN"

        log_entry = {
            "timestamp": timestamp,
            "device_id": "24460",
            "overall_status": overall_status,
            "components": {
                "ssh": "UP" if ssh_status else "DOWN",
                "ipmi": "UP" if ipmi_status else "DOWN"
            },
            "remediation_mode": "simulation" if self.simulate else "ssh_workaround_active"
        }

        # Output to console
        print(json.dumps(log_entry, indent=2))

        # Append to log file
        with open(self.heartbeat_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
        print(f"📝 Logged to {self.heartbeat_file}")

if __name__ == "__main__":
    monitor = HeartbeatMonitor()
    monitor.run()
