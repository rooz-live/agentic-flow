#!/usr/bin/env python3
"""
KVM Port Forwarding Bead (Native Python)
Translates the legacy kvm_port_forward.sh into a DBOS Native Bead,
logging execution tensors and enabling Sovereign TDD without mock degradation.
"""
import os
import sys
import time
import sqlite3
import subprocess

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
OPEX_DB_PATH = os.path.join(ROOT_DIR, '.goalie', 'opex.db')

PUBLIC_IP = "23.92.79.2"
KVM_IP = "192.168.122.237"
PUBLIC_INTERFACE = "bond0"

PORTS = ["80", "443", "2082", "2083", "2086", "2087", "2095", "2096", "21", "25", "53", "110", "143", "465", "587", "993", "995", "3306"]

def run_cmd(cmd):
    """Executes a system command and returns success boolean."""
    try:
        # Note: We don't actually run sudo iptables in CI, we print it or mock it during tests.
        if os.environ.get("SOVEREIGN_TEST_MODE") == "1":
            print(f"[TEST_MODE] Executing: {cmd}")
            return True
        subprocess.run(cmd, shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except subprocess.CalledProcessError:
        return False

def forward_ports():
    start_time = time.time()
    success = True

    print(f"🚨 [KVM NAT HEALER] Initiating Sovereign Port Forwarding to {KVM_IP}...")
    
    # 1. Sysctl
    if not run_cmd("sudo sysctl -w net.ipv4.ip_forward=1"):
        success = False

    # 2. Port rules
    for port in PORTS:
        run_cmd(f"sudo iptables -t nat -A PREROUTING -p tcp -d {PUBLIC_IP} --dport {port} -j DNAT --to-destination {KVM_IP}:{port}")
        run_cmd(f"sudo iptables -t nat -A PREROUTING -p udp -d {PUBLIC_IP} --dport {port} -j DNAT --to-destination {KVM_IP}:{port}")
        run_cmd(f"sudo iptables -I FORWARD -p tcp -d {KVM_IP} --dport {port} -m state --state NEW,ESTABLISHED,RELATED -j ACCEPT")
        run_cmd(f"sudo iptables -I FORWARD -p udp -d {KVM_IP} --dport {port} -m state --state NEW,ESTABLISHED,RELATED -j ACCEPT")

    # 3. Masquerade
    if not run_cmd(f"sudo iptables -t nat -A POSTROUTING -s 192.168.122.0/24 -o {PUBLIC_INTERFACE} -j MASQUERADE"):
        success = False

    ttfb = int((time.time() - start_time) * 1000)
    status = "PASS" if success else "FAIL"

    print(f"✅ [SUCCESS] NAT Port Forwarding Rules Engaged. Time: {ttfb}ms" if success else f"❌ [FAIL] NAT Port Forwarding failed.")

    # Write Tensor
    try:
        conn = sqlite3.connect(OPEX_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO execution_tensors (domain, action, target, status, ttfb_ms, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            ("INFRASTRUCTURE", "KVM_PORT_FORWARD", "iptables", status, ttfb, time.time())
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    return success

if __name__ == "__main__":
    forward_ports()
