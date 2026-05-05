#!/usr/bin/env python3
"""
Sovereign Inference Execution Bead: Execute With Lean Learning
This script acts as a wrapper around subprocess execution, injecting 
a physical Execution Tensor into `opex.db` to document the TTFB 
(Time to First Byte) and status of the executed command.
"""
import sys
import subprocess
import time
import sqlite3
import os

OPEX_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../.goalie/opex.db'))

class BuildMeasureLearnCycle:
    def __init__(self, domain="SOVEREIGNTY_EVAL"):
        self.domain = domain

    def log_execution(self, status, ttfb, target, reason=""):
        try:
            conn = sqlite3.connect(OPEX_DB_PATH)
            cur = conn.cursor()
            cur.execute("CREATE TABLE IF NOT EXISTS execution_tensors (id INTEGER PRIMARY KEY, domain TEXT, action TEXT, target TEXT, status TEXT, ttfb_ms INTEGER, timestamp REAL, reason TEXT)")
            cur.execute(
                "INSERT INTO execution_tensors (domain, action, target, status, ttfb_ms, timestamp, reason) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (self.domain, "LEAN_LEARNING_EXECUTE", target, status, ttfb, time.time(), reason)
            )
            conn.commit()
            conn.close()
            print(f"  ✅ [OPEX LEDGER] Logged '{target}' execution. Status: {status}. Burn: {ttfb}ms.")
        except Exception as db_err:
            print(f"  ❌ DBOS Ledger Sync Failed: {db_err}")

def execute_and_log(command):
    start_time = time.time()
    
    print(f"--> [LEARNING_BEAD] Executing: {' '.join(command)}")
    
    try:
        # Run the command
        result = subprocess.run(command, capture_output=True, text=True)
        status = "PASS" if result.returncode == 0 else "FAIL"
        
        # Calculate capital burn (Time elapsed in ms)
        ttfb = int((time.time() - start_time) * 1000)
        
        learner = BuildMeasureLearnCycle()
        learner.log_execution(status, ttfb, command[0])
        
        if status == "FAIL":
            print(f"  [ERROR] {result.stderr}")
            sys.exit(result.returncode)
            
        return result.stdout
        
    except Exception as e:
        print(f"  ❌ Execution Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: execute_with_lean_learning.py <command>")
        sys.exit(1)
        
    execute_and_log(sys.argv[1:])
