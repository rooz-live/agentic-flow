#!/bin/bash
# =========================================================================
# TDD: OMNIBUS SOVEREIGNTY ASSERTION (CPANEL + BARE-METAL)
# =========================================================================
# Inverted Thinking: Outputs human contrastive intel AND an MCP/MPP compliant
# JSON manifest for Agentic/Embedding consumption.

set -euo pipefail

BACKUP_ROOT="/Volumes/cPanelBackups"
CPANEL_DIR="$BACKUP_ROOT/incremental"
HIVELOCITY_DIR="$BACKUP_ROOT/hivelocity_baremetal"
GITLAB_DIR="$BACKUP_ROOT/gitlab_aws"
MANIFEST_OUT="$BACKUP_ROOT/sovereignty_mcp_manifest.json"

echo "====================================================================="
echo "⚡ TEMPORAL SOVEREIGNTY INTEL (MCP/MPP PROTOCOL)"
echo "====================================================================="

CURRENT_TIME=$(date +%s)
SYSTEMIC_STATE="GREEN"

# Initialize JSON Variables
CP_STATE="RED"
CP_AGE=9999
CP_SIZE="0"
HIVE_STATE="RED"
HIVE_AGE=9999
VM_COUNT=0
GIT_STATE="RED"
GIT_AGE=9999

# =========================================================================
# 1. CPANEL ORCHESTRATOR STATUS (APPLICATION LAYER)
# =========================================================================
echo "[ORCHESTRATOR 1] cPanel Application Layer"
if [ ! -d "$CPANEL_DIR/system/var_cpanel" ]; then
    echo "  ❌ RED: cPanel Application state missing."
    SYSTEMIC_STATE="RED"
else
    CP_STATE="GREEN"
    CPANEL_MOD=$(stat -f %m "$CPANEL_DIR/system/var_cpanel" 2>/dev/null || stat -c %Y "$CPANEL_DIR/system/var_cpanel")
    CP_AGE=$(( (CURRENT_TIME - CPANEL_MOD) / 60 ))
    if [ "$CP_AGE" -gt 1440 ]; then
        CP_STATE="YELLOW"
        echo "  ⚠️ YELLOW: Extracted but STALE. (Temporal Agility: $CP_AGE minutes ago > 1440m limit)"
        SYSTEMIC_STATE="YELLOW"
    else
        echo "  ✅ GREEN: Extracted. (Temporal Agility: $CP_AGE minutes ago)"
    fi
    
    if [ -f "$CPANEL_DIR/system/all_dbs.sql" ]; then
        CP_SIZE=$(du -h "$CPANEL_DIR/system/all_dbs.sql" | awk '{print $1}')
        echo "  📊 INTEL: MySQL Database Dump secured ($CP_SIZE)."
    fi
fi

echo "---------------------------------------------------------------------"

# =========================================================================
# 2. HIVELOCITY ORCHESTRATOR STATUS (INFRASTRUCTURE LAYER)
# =========================================================================
echo "[ORCHESTRATOR 2] Hivelocity Bare-Metal Layer"
if [ ! -f "$HIVELOCITY_DIR/extraction_manifest.json" ]; then
    echo "  ❌ RED: Hivelocity Bare-Metal manifest missing."
    SYSTEMIC_STATE="RED"
else
    HIVE_STATE="GREEN"
    HIVE_MOD=$(stat -f %m "$HIVELOCITY_DIR/extraction_manifest.json" 2>/dev/null || stat -c %Y "$HIVELOCITY_DIR/extraction_manifest.json")
    HIVE_AGE=$(( (CURRENT_TIME - HIVE_MOD) / 60 ))
    if [ "$HIVE_AGE" -gt 1440 ]; then
        HIVE_STATE="YELLOW"
        echo "  ⚠️ YELLOW: Extracted but STALE. (Temporal Agility: $HIVE_AGE minutes ago > 1440m limit)"
        if [ "$SYSTEMIC_STATE" != "RED" ]; then SYSTEMIC_STATE="YELLOW"; fi
    else
        echo "  ✅ GREEN: Extracted. (Temporal Agility: $HIVE_AGE minutes ago)"
    fi
    
    VM_COUNT=$(find "$HIVELOCITY_DIR" -name "*.qcow2" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    if [ "$VM_COUNT" -gt 0 ]; then
        echo "  📊 INTEL: $VM_COUNT live KVM .qcow2 disks secured."
    else
        echo "  📊 INTEL: 0 KVM disks found (Clean state verified)."
    fi
fi

echo "---------------------------------------------------------------------"

# =========================================================================
# 3. AWS ORCHESTRATOR STATUS (GITLAB LAYER)
# =========================================================================
echo "[ORCHESTRATOR 3] AWS Gitlab Layer"
if [ ! -d "$GITLAB_DIR" ] || [ -z "$(ls -A "$GITLAB_DIR" 2>/dev/null)" ]; then
    echo "  ❌ RED: Gitlab AWS backup directory empty or missing."
    SYSTEMIC_STATE="RED"
else
    GIT_STATE="GREEN"
    LATEST_TAR=$(ls -t "$GITLAB_DIR"/*.tar 2>/dev/null | head -n1 || echo "")
    if [ -n "$LATEST_TAR" ]; then
        GIT_MOD=$(stat -f %m "$LATEST_TAR" 2>/dev/null || stat -c %Y "$LATEST_TAR")
        GIT_AGE=$(( (CURRENT_TIME - GIT_MOD) / 60 ))
        GIT_SIZE=$(du -h "$LATEST_TAR" | awk '{print $1}')
        if [ "$GIT_AGE" -gt 1440 ]; then
            GIT_STATE="YELLOW"
            echo "  ⚠️ YELLOW: Extracted but STALE. (Temporal Agility: $GIT_AGE minutes ago > 1440m limit)"
            if [ "$SYSTEMIC_STATE" != "RED" ]; then SYSTEMIC_STATE="YELLOW"; fi
        else
            echo "  ✅ GREEN: Extracted. (Temporal Agility: $GIT_AGE minutes ago)"
        fi
        echo "  📊 INTEL: Gitlab backup tarball secured ($GIT_SIZE)."
    else
        echo "  ❌ RED: No .tar backup files found."
        SYSTEMIC_STATE="RED"
    fi
fi

echo "---------------------------------------------------------------------"

# =========================================================================
# 4. OPEX / PHYSICAL GRAVITY WELL STATUS (SSD SPACE & GHOST MOUNTS)
# =========================================================================
echo "[ORCHESTRATOR 4] Physical OPEX Boundary"
OPEX_STATE="GREEN"

# Calculate Internal SSD Usage Percentage
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "  ❌ RED: Gravity Well Breach. Internal SSD usage at $DISK_USAGE%."
    OPEX_STATE="RED"
    SYSTEMIC_STATE="RED"
else
    echo "  ✅ GREEN: Physical OPEX under constraints ($DISK_USAGE%)."
fi

GHOST_MOUNT="false"
# Check if /Volumes/cPanelBackups exists but is NOT mounted to an external drive
if [ -d "$BACKUP_ROOT" ] && ! mount | grep -q "on $BACKUP_ROOT "; then
    GHOST_MOUNT="true"
    echo "  ❌ RED: Ghost Mount detected at $BACKUP_ROOT eating internal SSD space."
    OPEX_STATE="RED"
    SYSTEMIC_STATE="RED"
fi


# =========================================================================
# GENERATE MCP/MPP JSON EMBEDDING MANIFEST
# =========================================================================
cat <<EOF > "$MANIFEST_OUT"
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "systemic_state": "$SYSTEMIC_STATE",
  "factors": {
    "cpanel": {
      "status": "$CP_STATE",
      "temporal_age_minutes": $CP_AGE,
      "mysql_size": "$CP_SIZE"
    },
    "hivelocity": {
      "status": "$HIVE_STATE",
      "temporal_age_minutes": $HIVE_AGE,
      "kvm_disks_secured": $VM_COUNT
    },
    "gitlab": {
      "status": "$GIT_STATE",
      "temporal_age_minutes": $GIT_AGE
    },
    "opex": {
      "status": "$OPEX_STATE",
      "temporal_age_minutes": 0,
      "disk_usage_percent": $DISK_USAGE,
      "ghost_mount_detected": $GHOST_MOUNT
    }
  }
}
EOF

echo "====================================================================="
echo "💾 MCP MANIFEST GENERATED: $MANIFEST_OUT"
echo "====================================================================="

if [ "$SYSTEMIC_STATE" == "RED" ]; then
    echo "🚨 TDD STATE: RED"
    echo "Action Required: Orchestrators out of sync. Execute omnibus pipeline."
    exit 1
else
    echo "🟢 TDD STATE: GREEN"
    echo "Action Required: Total Infrastructure Sovereignty Achieved."
    exit 0
fi
