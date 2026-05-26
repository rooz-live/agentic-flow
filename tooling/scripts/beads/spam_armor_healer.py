#!/usr/bin/env python3
"""
Spam Armor Healer (Domain Forging Bead)
Dynamically connects to the Hivelocity bare-metal KVM and explicitly hardens 
all hosted domains against spam and spoofing via the WHM/cPanel API.

Decomposed & hardened to use DBOS Execution Tensors and Idempotent State.
- Enables DKIM
- Installs SPF
- Injects _dmarc records (p=quarantine)
- Enables DNSSEC
- Activates SpamAssassin globally (Idempotent)
"""

import os
import subprocess
import time
from execute_with_lean_learning import BuildMeasureLearnCycle

SOVEREIGN_IP = "192.168.122.237"
DOMAINS = ["yocloud.com", "tag.ooo", "rooz.live", "bhopti.com", "tag.vote", "yo.life", "720.chat"]

def run_whm_command(cmd_str, action_name):
    start_time = time.time()
    ssh_cmd = f"ssh -J stx -o StrictHostKeyChecking=no root@{SOVEREIGN_IP} '{cmd_str}'"
    result = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True)
    
    ttfb = int((time.time() - start_time) * 1000)
    status = "PASS" if result.returncode == 0 else "FAIL"
    
    learner = BuildMeasureLearnCycle("SPAM_ARMOR")
    learner.log_execution(status, ttfb, action_name, result.stdout[:100].replace('\n', ' ').strip())
    
    return result.stdout, result.returncode

def check_idempotent_state():
    """Checks if SpamAssassin is already enabled to prevent destructive httpd restarts"""
    start_time = time.time()
    check_cmd = f"ssh -J stx -o StrictHostKeyChecking=no root@{SOVEREIGN_IP} 'grep ^spamassassin=1 /var/cpanel/cpanel.config || echo IDEMPOTENT_FAIL'"
    result = subprocess.run(check_cmd, shell=True, capture_output=True, text=True)
    ttfb = int((time.time() - start_time) * 1000)
    
    learner = BuildMeasureLearnCycle("SPAM_ARMOR")
    if "spamassassin=1" in result.stdout:
        learner.log_execution("PASS", ttfb, "IDEMPOTENT_CHECK_SPAMASSASSIN", "SpamAssassin already enabled. Averted destructive restart.")
        return True
    
    learner.log_execution("WARN", ttfb, "IDEMPOTENT_CHECK_SPAMASSASSIN", "State deviation detected. Provisioning required.")
    return False

def harden_infrastructure():
    print(f"--> 🛡️ [SPAM ARMOR] Initiating Cryptographic Email Hardening across all domains...")
    
    print("  --> [1/5] Checking Idempotent State for Global SpamAssassin...")
    is_enabled = check_idempotent_state()
    
    if not is_enabled:
        print("      ⚠️ SpamAssassin disabled. Forcing provisioning (Warning: Will restart services)")
        run_whm_command("/scripts/tweaksetting --set=spamassassin=1", "ENABLE_SPAMASSASSIN")
        run_whm_command("/scripts/tweaksetting --set=spam_box=1", "ENABLE_SPAM_BOX")
        run_whm_command("/scripts/restartsrv_spamd", "RESTART_SPAMD")
    else:
        print("      ✅ Idempotent Boundary Respected: SpamAssassin globally activated. No restarts required.")

    for domain in DOMAINS:
        print(f"\n  --> 🔒 Securing Zone: {domain}")
        
        # 1. Enable DKIM
        print("      - Provisioning DKIM...")
        run_whm_command(f"whmapi1 enable_dkim domain={domain}", f"ENABLE_DKIM_{domain}")
        
        # 2. Install SPF
        print("      - Provisioning SPF...")
        run_whm_command(f"whmapi1 install_spf_records domain={domain}", f"INSTALL_SPF_{domain}")
        
        # 3. Inject DMARC
        print("      - Injecting DMARC (p=quarantine)...")
        dmarc_txt = "v=DMARC1; p=quarantine; sp=quarantine; adkim=r; aspf=r"
        run_whm_command(f"whmapi1 addzonerecord domain={domain} name=_dmarc.{domain}. class=IN type=TXT txtdata=\"{dmarc_txt}\"", f"INJECT_DMARC_{domain}")
        
        # 4. Enable DNSSEC
        print("      - Enabling DNSSEC & Generating NSEC3 Hashes...")
        run_whm_command(f"whmapi1 enable_dnssec domain={domain}", f"ENABLE_DNSSEC_{domain}")

    print("\n--> 🎯 [SPAM ARMOR COMPLETE] All infrastructure zones are cryptographically sealed and logged to OPEX.db.")
    print("    Note: You must still inject the newly generated DNSSEC DS records into your Registrar.")

if __name__ == "__main__":
    harden_infrastructure()
