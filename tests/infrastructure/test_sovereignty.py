#!/usr/bin/env python3
"""
TDD: OMNIBUS SOVEREIGNTY ASSERTION (NATIVE PYTHON)
Inverted Thinking: Outputs human contrastive intel AND an MCP/MPP compliant
JSON manifest for Agentic/Embedding consumption. Natively integrated to eliminate Bash Subprocess Tax.
"""
import os
import json
import time
import datetime
import subprocess

BACKUP_ROOT = "/Volumes/cPanelBackups"
CPANEL_DIR = os.path.join(BACKUP_ROOT, "incremental")
HIVELOCITY_DIR = os.path.join(BACKUP_ROOT, "hivelocity_baremetal")
GITLAB_DIR = os.path.join(BACKUP_ROOT, "gitlab_aws")
MANIFEST_OUT = os.path.join(BACKUP_ROOT, "sovereignty_mcp_manifest.json")

def get_age_minutes(path):
    try:
        mod_time = os.path.getmtime(path)
        return int((time.time() - mod_time) / 60)
    except Exception:
        return 9999

def get_size(path):
    try:
        return f"{os.path.getsize(path) / (1024 * 1024):.1f}M"
    except Exception:
        return "0M"

def check_mount():
    try:
        output = subprocess.check_output(["mount"]).decode()
        return f"on {BACKUP_ROOT}" in output
    except Exception:
        return False

def assert_sovereignty():
    print("=====================================================================")
    print("⚡ TEMPORAL SOVEREIGNTY INTEL (MCP/MPP PROTOCOL)")
    print("=====================================================================")
    
    systemic_state = "GREEN"
    factors = {}
    
    # 1. CPANEL ORCHESTRATOR STATUS
    print("[ORCHESTRATOR 1] cPanel Application Layer")
    cp_path = os.path.join(CPANEL_DIR, "system/var_cpanel")
    cp_db = os.path.join(CPANEL_DIR, "system/all_dbs.sql")
    if not os.path.exists(cp_path):
        print("  ❌ RED: cPanel Application state missing.")
        systemic_state = "RED"
        factors["cpanel"] = {"status": "RED", "temporal_age_minutes": 9999, "mysql_size": "0M"}
    else:
        age = get_age_minutes(cp_path)
        size = get_size(cp_db) if os.path.exists(cp_db) else "0M"
        if age > 1440:
            print(f"  ⚠️ YELLOW: Extracted but STALE. (Temporal Agility: {age}m > 1440m limit)")
            if systemic_state != "RED": systemic_state = "YELLOW"
            factors["cpanel"] = {"status": "YELLOW", "temporal_age_minutes": age, "mysql_size": size}
        else:
            print(f"  ✅ GREEN: Extracted. (Temporal Agility: {age}m)")
            factors["cpanel"] = {"status": "GREEN", "temporal_age_minutes": age, "mysql_size": size}
            
    # 2. HIVELOCITY ORCHESTRATOR STATUS
    print("[ORCHESTRATOR 2] Hivelocity Bare-Metal Layer")
    hive_path = os.path.join(HIVELOCITY_DIR, "extraction_manifest.json")
    if not os.path.exists(hive_path):
        print("  ❌ RED: Hivelocity Bare-Metal manifest missing.")
        systemic_state = "RED"
        factors["hivelocity"] = {"status": "RED", "temporal_age_minutes": 9999, "kvm_disks_secured": 0}
    else:
        age = get_age_minutes(hive_path)
        vm_count = len([f for f in os.listdir(HIVELOCITY_DIR) if f.endswith(".qcow2")]) if os.path.exists(HIVELOCITY_DIR) else 0
        if age > 1440:
            print(f"  ⚠️ YELLOW: Extracted but STALE. (Temporal Agility: {age}m > 1440m limit)")
            if systemic_state != "RED": systemic_state = "YELLOW"
            factors["hivelocity"] = {"status": "YELLOW", "temporal_age_minutes": age, "kvm_disks_secured": vm_count}
        else:
            print(f"  ✅ GREEN: Extracted. (Temporal Agility: {age}m)")
            factors["hivelocity"] = {"status": "GREEN", "temporal_age_minutes": age, "kvm_disks_secured": vm_count}
            
    # 3. AWS ORCHESTRATOR STATUS
    print("[ORCHESTRATOR 3] AWS Gitlab Layer")
    tar_files = []
    if os.path.exists(GITLAB_DIR):
        tar_files = [os.path.join(GITLAB_DIR, f) for f in os.listdir(GITLAB_DIR) if f.endswith(".tar")]
    if not tar_files:
        print("  ❌ RED: Gitlab AWS backup empty or missing.")
        systemic_state = "RED"
        factors["gitlab"] = {"status": "RED", "temporal_age_minutes": 9999}
    else:
        latest_tar = max(tar_files, key=os.path.getmtime)
        age = get_age_minutes(latest_tar)
        if age > 1440:
            print(f"  ⚠️ YELLOW: Extracted but STALE. (Temporal Agility: {age}m > 1440m limit)")
            if systemic_state != "RED": systemic_state = "YELLOW"
            factors["gitlab"] = {"status": "YELLOW", "temporal_age_minutes": age}
        else:
            print(f"  ✅ GREEN: Extracted. (Temporal Agility: {age}m)")
            factors["gitlab"] = {"status": "GREEN", "temporal_age_minutes": age}
            
    # 4. OPEX / PHYSICAL GRAVITY WELL STATUS
    print("[ORCHESTRATOR 4] Physical OPEX Boundary")
    try:
        disk_stat = os.statvfs('/')
        disk_usage = int(100 - (disk_stat.f_bavail * 100 / disk_stat.f_blocks))
    except Exception:
        disk_usage = 0
        
    opex_state = "GREEN"
    if disk_usage > 90:
        print(f"  ❌ RED: Gravity Well Breach. Internal SSD usage at {disk_usage}%.")
        opex_state = "RED"
        systemic_state = "RED"
    else:
        print(f"  ✅ GREEN: Physical OPEX under constraints ({disk_usage}%).")
        
    ghost_mount = False
    if os.path.exists(BACKUP_ROOT) and not check_mount():
        ghost_mount = True
        print(f"  ❌ RED: Ghost Mount detected at {BACKUP_ROOT} eating internal SSD space.")
        opex_state = "RED"
        systemic_state = "RED"
        
    factors["opex"] = {
        "status": opex_state,
        "temporal_age_minutes": 0,
        "disk_usage_percent": disk_usage,
        "ghost_mount_detected": ghost_mount
    }
    
    # Generate Manifest
    manifest = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
        "systemic_state": systemic_state,
        "factors": factors
    }
    
    try:
        with open(MANIFEST_OUT, "w") as f:
            json.dump(manifest, f, indent=2)
        print("=====================================================================")
        print(f"💾 MCP MANIFEST GENERATED: {MANIFEST_OUT}")
        print("=====================================================================")
    except Exception as e:
        print(f"❌ FATAL: Could not write sovereignty manifest to {MANIFEST_OUT}: {e}")
        systemic_state = "RED"
        
    if systemic_state == "RED":
        print("🚨 TDD STATE: RED")
        print("Action Required: Orchestrators out of sync. Execute omnibus pipeline.")
        raise RuntimeError("Sovereignty test failed. TDD State is RED.")
    else:
        print("🟢 TDD STATE: GREEN")
        print("Action Required: Total Infrastructure Sovereignty Achieved.")
        
    return manifest

if __name__ == "__main__":
    assert_sovereignty()
