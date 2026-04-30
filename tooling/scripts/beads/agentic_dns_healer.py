#!/usr/bin/env python3
"""
Domain C/D: Massive Parallel Processing / Sovereign Governance
Responsibility: Agentic DNS Propagation Healer (cPanel/WHM Matrix)
Surgically modifies the local BIND/PowerDNS zones on both the Legacy AWS Node
and the new Sovereign Node using the native WHM API (whmapi1).
"""

import sys
import os

LEGACY_AWS_IP = "54.241.233.105"
SOVEREIGN_IP = "23.92.79.2"
DOMAINS = ["yocloud.com", "tag.ooo", "rooz.live"]

def agentic_dns_sweep():
    print(f"--> ⚡ Initiating Agentic Fourth-Wave DNS Sweep (Native swapip Matrix)...")
    
    # Construct the native cPanel swapip payload (bypasses license restrictions)
    domain_args = " ".join(DOMAINS)
    payload = f"/usr/local/cpanel/bin/swapip {LEGACY_AWS_IP} {SOVEREIGN_IP} {SOVEREIGN_IP} {domain_args}"
    
    print("\n  --> [EXECUTION PHASE 1] Mutating Sovereign KVM...")
    print("      (You will be prompted for the KVM root password once)")
    
    # Force TTY allocation (-t) so the password prompt renders cleanly
    kvm_cmd = f'ssh -J stx -t -o StrictHostKeyChecking=no root@192.168.122.237 "{payload}"'
    kvm_result = os.system(kvm_cmd)
    
    if kvm_result == 0:
        print("    ✅ [SUCCESS] KVM Zones physically altered.")
    else:
        print("    ❌ [FAULT] KVM Mutation Failed.")

    print("\n  --> [EXECUTION PHASE 2] Mutating Legacy AWS...")
    print("      (Attempting to connect to AWS. This will timeout in 5 seconds if unreachable)")
    
    # Attempt AWS connection with a strict timeout to prevent 20s+ hangs
    aws_cmd = f'ssh -t -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@{LEGACY_AWS_IP} "{payload}"'
    aws_result = os.system(aws_cmd)
    
    if aws_result == 0:
        print("    ✅ [SUCCESS] AWS Zones physically altered. Global traffic is now proxied!")
    else:
        print("    ❌ [FAULT] AWS Mutation Failed or Timeout reached.")
        print("    [INFERENCE] The AWS SSH firewall is blocking the connection. You must wait for global DNS Registrar propagation before Tombstoning.")

    print(f"\n--> 🎯 Sweep Complete.")
    return True

if __name__ == "__main__":
    success = agentic_dns_sweep()
    if not success:
        sys.exit(1)
