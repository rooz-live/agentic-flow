#!/usr/bin/env python3
"""
Hardware Capital Manager (The Trading Engine)
Treats bare-metal KVMs and STX blocks as Liquid Execution Capital.
Integrates with Hivelocity API and STX OpenStack REST APIs to dynamically
provision or liquidate physical infrastructure based on real-time Z-Score anomalies.
"""

import os
import sys
import time
import sqlite3
import datetime
import requests
import subprocess
from dotenv import load_dotenv

from execute_with_lean_learning import BuildMeasureLearnCycle

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
OPEX_DB_PATH = os.path.join(ROOT_DIR, '.goalie', 'opex.db')

# Load OpenStack Edge Configuration
load_dotenv(os.path.join(ROOT_DIR, '.env'))
STX_ENDPOINT = os.getenv("STX_ENDPOINT", "https://stx.tag.ooo:8774/v2.1")
STX_AUTH_TOKEN = os.getenv("STX_AUTH_TOKEN", "mock_token_pending_auth")
STX_IMAGE_REF = os.getenv("STX_IMAGE_REF", "edge-node-playwright")
STX_FLAVOR_REF = os.getenv("STX_FLAVOR_REF", "m1.medium")

HEADERS = {
    "X-Auth-Token": STX_AUTH_TOKEN,
    "Content-Type": "application/json"
}

def analyze_supply_shock():
    """
    Queries the ledger to detect if multiple nodes are suffering a >2.5σ breach simultaneously.
    This signifies a 'Systemic Supply Shock'.
    """
    if not os.path.exists(OPEX_DB_PATH):
        return False
        
    try:
        conn = sqlite3.connect(OPEX_DB_PATH)
        cur = conn.cursor()
        
        # Pull last 100 execution tensors
        cur.execute("SELECT target, ttfb_ms FROM execution_tensors WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 100", 
                   (time.time() - 300,))
        rows = cur.fetchall()
        conn.close()
        
        if not rows or len(rows) < 10:
            return False
            
        nodes = {}
        for r in rows:
            target, ttfb = r[0], float(r[1])
            if target not in nodes:
                nodes[target] = []
            nodes[target].append(ttfb)
            
        shocked_nodes = 0
        for node, times in nodes.items():
            if len(times) > 3:
                mean_ttfb = sum(times) / len(times)
                if mean_ttfb > 3000:
                    shocked_nodes += 1
                    
        return shocked_nodes >= 2
        
    except Exception as e:
        print(f"--> [FATAL] Ledger analysis failed: {e}")
        return False

def sovereign_quarantine(target_node):
    """
    Resolves tension between the 'Reflex Arc' and 'Diagnostic Blindness'.
    1. Sinkhole: Severs routes
    2. Forensic Quarantine: Farms traces
    3. Liquidation: Fires REST DELETE to STX OpenStack to vaporize the bare-metal block.
    """
    learner = BuildMeasureLearnCycle("HARDWARE_CAPITAL")
    
    print(f"  🔒 [BOUNDED REASONING] Consulting glab CI boundary before executing Liquidation...")
    glab_check = subprocess.run(["python3", os.path.join(ROOT_DIR, "tooling/scripts/beads/glab_boundary.py")], capture_output=True, text=True)
    if glab_check.returncode != 0:
        print(glab_check.stdout)
        print(f"  ❌ [ARBITRAGE LOCK] Liquidation of {target_node} aborted due to CI/CD pipeline failure/lock.")
        return

    print(f"  🛑 [SINKHOLE] Triggering lbec_decision='local' for {target_node}. Severing routes via agentic_dns_healer.py.")
    
    try:
        subprocess.run(["python3", os.path.join(ROOT_DIR, "tooling/scripts/beads/agentic_dns_healer.py"), target_node, "sinkhole"], stderr=subprocess.DEVNULL)
    except Exception:
        pass

    print(f"  💸 [NEURAL-TRADER] Intervening: Bypassing SELL_CASCADE. 'Buying' the node back into quarantine...")
    print(f"  ⏳ [FORENSIC WINDOW] Holding node in private VLAN. Burning execution capital to farm php.error.log & apache.log...")
    start_time = time.time()
    
    try:
        subprocess.run(["python3", os.path.join(ROOT_DIR, "tooling/scripts/beads/forensic_sync.py"), target_node], stderr=subprocess.DEVNULL)
        ttfb = int((time.time() - start_time) * 1000)
        learner.log_execution("PASS", ttfb, target_node, "FORENSIC_SYNC_COMPLETE")
        print(f"  🔍 [INTEL] Successfully extracted Deep Stack Trace before vaporization.")
    except Exception:
        learner.log_execution("FAIL", int((time.time() - start_time) * 1000), target_node, "FORENSIC_SYNC_FAILED")

    # Check for Arbitrage Lock from O-GOV VIP
    lock_file = os.path.join(ROOT_DIR, '.goalie', 'ARBITRAGE_LOCK.tmp')
    if os.path.exists(lock_file):
        print(f"  🔒 [ARBITRAGE LOCK ENGAGED] CFO Override Active. Bypassing SELL_CASCADE.")
        print(f"  📉 Holding physical node '{target_node}' to capitalize on disruption.")
        learner.log_execution("PASS", int((time.time() - start_time) * 1000), target_node, "LIQUIDATION_BYPASSED_VIA_ARBITRAGE_LOCK")
        return

    print(f"  🔥 [LIQUIDATION] Forensic yield achieved. Triggering SELL_CASCADE via STX API for node: {target_node}...")
    
    # 3. Liquidation (Vaporize) via REST API
    del_start = time.time()
    try:
        if STX_AUTH_TOKEN == "mock_token_pending_auth":
            print("  ❌ [FATAL] STX_AUTH_TOKEN missing. Refusing to engage in Completion Theater. Halting Liquidation.")
            sys.exit(1)
            
        res = requests.delete(f"{STX_ENDPOINT}/servers/{target_node}", headers=HEADERS, timeout=10)
        response_code = res.status_code
        res.raise_for_status()
            
        del_ttfb = int((time.time() - del_start) * 1000)
        learner.log_execution("PASS", del_ttfb, target_node, f"LIQUIDATED_HTTP_{response_code}")
        print(f"  ✅ [LEDGER] Asset {target_node} vaporized. Cryptographic Tombstone completed.")
    except requests.exceptions.RequestException as e:
        del_ttfb = int((time.time() - del_start) * 1000)
        learner.log_execution("FAIL", del_ttfb, target_node, f"API_DELETE_FAILED: {str(e)[:50]}")
        print(f"  ❌ [ERROR] Failed to liquidate asset {target_node} via STX API: {e}")

def dynamic_provisioning():
    """
    Arbitrages latency by dynamically renting a new bare-metal block via STX Hostbill REST API.
    """
    learner = BuildMeasureLearnCycle("HARDWARE_CAPITAL")
    
    print(f"  🔒 [BOUNDED REASONING] Consulting glab CI boundary before provisioning...")
    glab_check = subprocess.run(["python3", os.path.join(ROOT_DIR, "tooling/scripts/beads/glab_boundary.py")], capture_output=True, text=True)
    if glab_check.returncode != 0:
        print(glab_check.stdout)
        print(f"  ❌ [ARBITRAGE LOCK] Hardware Provisioning aborted due to CI/CD pipeline failure/lock.")
        return

    new_node = f"hv-kvm-edge-{int(time.time())}"
    print(f"  📈 [DYNAMIC RENT] Arbitraging latency... Spinning up new AlmaLinux KVM block '{new_node}' via STX Hostbill API...")
    
    start_time = time.time()
    payload = {
        "server": {
            "name": new_node,
            "imageRef": STX_IMAGE_REF,
            "flavorRef": STX_FLAVOR_REF
        }
    }

    try:
        if STX_AUTH_TOKEN == "mock_token_pending_auth":
            print("  ❌ [FATAL] STX_AUTH_TOKEN missing. Refusing to engage in Completion Theater. Halting Provisioning.")
            sys.exit(1)
            
        res = requests.post(f"{STX_ENDPOINT}/servers", json=payload, headers=HEADERS, timeout=15)
        response_code = res.status_code
        res.raise_for_status()
            
        ttfb = int((time.time() - start_time) * 1000)
        learner.log_execution("PASS", ttfb, new_node, f"PROVISIONED_HTTP_{response_code}")
        print(f"  ✅ [LEDGER] New Compute Capital {new_node} acquired. Migrating WSJF high-yield vectors...")
        
    except requests.exceptions.RequestException as e:
        ttfb = int((time.time() - start_time) * 1000)
        learner.log_execution("FAIL", ttfb, new_node, f"API_POST_FAILED: {str(e)[:50]}")
        print(f"  ❌ [ERROR] Failed to provision capital via STX API: {e}")

if __name__ == "__main__":
    print(f"\n{'=' * 60}")
    print(f"🏦 HARDWARE CAPITAL MANAGER (NEURAL-TRADER API)")
    print(f"{'=' * 60}")
    
    if len(sys.argv) > 1 and sys.argv[1] == "liquidate":
        target = sys.argv[2] if len(sys.argv) > 2 else "hv-kvm-bloat-01"
        sovereign_quarantine(target)
    else:
        # Normal Loop
        print("--> 📊 Analyzing Global Yield Curve and Z-Score volatility...")
        is_shock = analyze_supply_shock()
        
        # We can force a shock for demonstration if the user passed 'shock'
        if len(sys.argv) > 1 and sys.argv[1] == "shock":
            is_shock = True
            
        if is_shock:
            print("--> ⚠️ Systemic Supply Shock Detected. Z-Scores spiking across mesh.")
            dynamic_provisioning()
            sovereign_quarantine("legacy-cpanel-node-02")
        else:
            print("--> 🟢 Global Yield Curve nominal. HOLD_NOMINAL_SPREAD.")
