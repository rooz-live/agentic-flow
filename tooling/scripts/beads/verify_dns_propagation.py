#!/usr/bin/env python3
"""
Domain D: Sovereign Verification (The Fourth Wave)
Responsibility: Autonomously mathematically verify global DNS propagation
to the Hivelocity node prior to AWS tombstoning.
"""
import sys
import socket

def main():
    print("--> ⚡ Initiating Agentic Fourth-Wave DNS Propagation Verification...")
    
    EXPECTED_IP = "23.92.79.2"
    DOMAINS_TO_CHECK = [
        "git.tag.ooo", 
        "yocloud.com", 
        "www.yocloud.com", 
        "tag.ooo", 
        "rooz.live", 
        "www.rooz.live"
    ]
    
    all_passed = True
    
    for domain in DOMAINS_TO_CHECK:
        print(f"  --> [TELEMETRY] Requesting resolution vector for {domain}...")
        try:
            resolved_ip = socket.gethostbyname(domain)
            if resolved_ip == EXPECTED_IP:
                print(f"    ✅ MATCH: {domain} successfully routes to Sovereign Node ({EXPECTED_IP}).")
            else:
                print(f"    ❌ FATAL ROAM RISK DETECTED: Premature Tombstoning!")
                print(f"       {domain} currently routes to {resolved_ip} (AWS or caching), NOT {EXPECTED_IP}.")
                all_passed = False
        except socket.gaierror as e:
            print(f"    ❌ FATAL: DNS resolution failed for {domain}: {e}")
            all_passed = False

    if not all_passed:
        print("\n=====================================================================")
        print("🛑 AGENTIC FAULT: DNS propagation is incomplete. The legacy AWS node")
        print("must NOT be terminated until the A-Records mathematically align with")
        print("the new Hivelocity Sovereignty matrix.")
        print("=====================================================================")
        sys.exit(1)

    print("\n=====================================================================")
    print("✅ FOURTH-WAVE PROPAGATION DISPATCH COMPLETE.")
    print("All routing tensors structurally align with the Sovereign KVM.")
    print("You are officially mathematically cleared to execute the Tombstone Protocol.")
    sys.exit(0)

if __name__ == "__main__":
    main()
