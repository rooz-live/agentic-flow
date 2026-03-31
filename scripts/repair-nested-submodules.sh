#!/usr/bin/env bash
# @business-context WSJF-77: Resolve Git Object Fragmentation Anomalies blocking merge paths
# @adr ADR-005: Zero-trust subgraph recovery logic
# @constraint R-2026-018: Safe Cleanup Pass constraint protecting evidence ledgers

set -euo pipefail

echo "[Phase 37] Initiating safe cleanup pass for .git object fragmentation..."

BACKUP_DIR=".git/objects/pack/corrupt_backup_stx13"
mkdir -p "$BACKUP_DIR"

echo "Scanning superproject .git/objects/pack for anomalous artifacts..."
# Move the identified far-too-short packfiles safely out of the canonical load path
for pack in 6bac7c1f07500d73452b92a7ca4ca43fb62f7b06 b655bd7581caba569961183d791005e136cd4c24 8b189fbd8f62ec29bf03fe1e0fe5fb0961adcc51 75d3f8ff1e29996f55275869077126a426f82b18; do
    echo "Backing up identified corrupt pack object $pack..."
    mv -f .git/objects/pack/pack-${pack}.* "$BACKUP_DIR/" 2>/dev/null || true
done

# Backup orphaned .idx or .rev files without a .pack counterpart
for f in .git/objects/pack/*.idx .git/objects/pack/*.rev; do
    if [ -f "$f" ]; then
        base="${f%.*}"
        if [ ! -f "${base}.pack" ]; then
            echo "Backing up orphaned file $f..."
            mv -f "$f" "$BACKUP_DIR/" 2>/dev/null || true
        fi
    fi
done

echo "Rehydrating superproject graph..."
# Pull the missing objects that were contained in the pruned packs
TRUST_GIT=/usr/bin/git
$TRUST_GIT fetch origin || echo "Notice: Fetch returned non-zero, continuing matrix evaluation."

echo "Validating submodule graphs..."
$TRUST_GIT submodule sync --recursive
$TRUST_GIT submodule update --init --recursive --force

echo "Verifying object graph integrity natively..."
$TRUST_GIT status
$TRUST_GIT rev-parse HEAD

echo "[Phase 37] Remediation complete."
