#!/usr/bin/env python3
"""
Domain D: Sovereign Healing (The Immune System)
Responsibility: Executing physical mutations on the local hardware 
(Docker pruning, ZMQ/SQLite compaction). Subscribes to 
InfrastructureBloatEvent from the Event Bus.
"""
import time
import subprocess
import ddd_event_bus

def execute_healing(targets):
    print(f"--> ⚡ Triggering Autonomous Healing Beads for targets: {targets}")
    
    try:
        if "cpanel" in targets:
            print("  --> Triggering cPanel Application Sync...")
            subprocess.run(["bash", "tooling/scripts/cpanel_incremental_sync.sh"], check=True, timeout=120)
            
        if "hivelocity" in targets:
            print("  --> Triggering Hivelocity Bare-Metal Sync...")
            subprocess.run(["bash", "tooling/scripts/hivelocity_incremental_sync.sh"], check=True, timeout=120)
            
        if "gitlab" in targets:
            print("  --> Triggering AWS Gitlab Application Sync...")
            subprocess.run(["bash", "tooling/scripts/gitlab_incremental_sync.sh"], check=True, timeout=120)
            
        if "ghost_space" in targets:
            print("  --> [WSJF] Native APFS Time Machine Ghost Block Consolidation...")
            subprocess.run(["sudo", "tmutil", "thinlocalsnapshots", "/", "100000000000", "4"], check=True)
            
        if "opex_reclaimer" in targets:
            print("  --> [WSJF] Executing Native OPEX Reclaimers...")
            
            # 1. Native Spatial Offload (ADR-023)
            import os, shutil
            offload_dir = "/Volumes/cPanelBackups/spatial_offload/agentic_flow"
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            
            if os.path.ismount("/Volumes/cPanelBackups"):
                os.makedirs(offload_dir, exist_ok=True)
                nm_path = os.path.join(root_dir, "node_modules")
                if os.path.isdir(nm_path) and not os.path.islink(nm_path):
                    print("  --> [WSJF] Native Spatial Offload: Teleporting node_modules...")
                    shutil.move(nm_path, os.path.join(offload_dir, "node_modules"))
                    os.symlink(os.path.join(offload_dir, "node_modules"), nm_path)
            else:
                print("  --> [WSJF] Native Spatial Offload: Bypassed (Umbilical Unmounted)")

            # 2. Docker Pruning
            print("  --> [WSJF] Native Prune: Docker Boundaries")
            subprocess.run(["docker", "system", "prune", "-a", "-f", "--volumes"], check=True)
            
            # 3. NPM Cache
            print("  --> [WSJF] Native Prune: NPM Cache")
            subprocess.run(["npm", "cache", "clean", "--force"], check=True)
            shutil.rmtree(os.path.expanduser("~/.npm/_cacache"))
            
        # Re-Asserting TDD Sovereignty Gate
        print("  --> Re-Asserting TDD Sovereignty Gate...")
        subprocess.run(["bash", "tests/infrastructure/test_sovereignty.sh"], check=True, timeout=120)
        print("--> ✅ Healing sequence complete.")
        
    except Exception as e:
        print(f"--> 🚨 Healing Sequence Failed: {e}")
        print(f"--> 🛑 FATAL BLOCK: Physical Execution Deadlock on {targets}.")
        print("--> ⚠️  TDD FIRST PRINCIPLES: No bypass logic permitted. System remains RED until manually resolved.")

def start_immune_system():
    print("--> 🛡️  DOMAIN D: Sovereign Healing (Immune System) Online.")
    print("--> 📡 Listening for InfrastructureBloatEvents...")
    
    last_processed_id = None
    
    try:
        while True:
            event = ddd_event_bus.get_latest_event("InfrastructureBloatEvent")
            
            if event and event.get("action_id") != last_processed_id:
                targets = event.get("targets", [])
                action_id = event.get("action_id")
                
                print(f"[IMMUNE] Pathogen Detected. Action ID: {action_id}")
                execute_healing(targets)
                
                last_processed_id = action_id
                
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n--> 🛡️  Sovereign Immune System halted.")

if __name__ == "__main__":
    start_immune_system()
