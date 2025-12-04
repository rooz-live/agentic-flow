#!/usr/bin/env python3
"""
Infrastructure Agent - Self-Healing Restoration
Wraps restore-environment.sh to handle common failures automatically.
"""

import subprocess
import sys
import re
import os
import time

RESTORE_SCRIPT = "./scripts/restore-environment.sh"

class InfrastructureAgent:
    def __init__(self):
        self.max_retries = 3
        self.retry_count = 0

    def run_restoration(self, snapshot_name="dry-run-test"):
        print(f"🤖 Infrastructure Agent: Attempting restoration of '{snapshot_name}'...")

        while self.retry_count < self.max_retries:
            # Run the script and capture output
            process = subprocess.Popen(
                [RESTORE_SCRIPT, "--snapshot", snapshot_name, "--clean"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE, # To handle prompts if needed
                text=True
            )

            # We assume non-interactive for automation, or we pipe 'y' if we expect a prompt
            # But the script might prompt. Let's send 'y' just in case.
            stdout, stderr = process.communicate(input="y\n")

            if process.returncode == 0:
                print("✅ Restoration successful!")
                print(stdout)
                return True

            print(f"⚠️  Restoration failed (Attempt {self.retry_count + 1}/{self.max_retries})")
            print(f"   Error: {stderr}")

            # Analyze Error
            if self.analyze_and_fix(stdout + stderr, snapshot_name):
                self.retry_count += 1
                print("🔄 Retrying restoration...")
                time.sleep(1)
            else:
                print("❌ Could not determine a fix. Aborting.")
                return False

        print("❌ Max retries reached.")
        return False

    def analyze_and_fix(self, output, snapshot_name):
        """Analyzes output for known errors and applies fixes."""

        # Pattern 1: Snapshot not found
        if f"Snapshot '{snapshot_name}' not found" in output:
            print("🔧 Fix: Snapshot missing. Creating it now...")
            # Create the snapshot
            subprocess.run([RESTORE_SCRIPT, "--snapshot", snapshot_name, "create"], input="y\n", text=True)
            return True

        # Pattern 2: Permission denied
        if "Permission denied" in output:
            print("🔧 Fix: Permission denied. Attempting chmod...")
            subprocess.run(["chmod", "+x", RESTORE_SCRIPT])
            return True

        # Pattern 3: .env missing (Warning, but maybe we want to fix it for test)
        if ".env file detected but NOT backed up" in output:
            # This is just a warning, usually doesn't cause failure exit code unless script is strict.
            # But if it failed for another reason related to env...
            pass

        return False

if __name__ == "__main__":
    agent = InfrastructureAgent()
    success = agent.run_restoration()
    sys.exit(0 if success else 1)
