#!/usr/bin/env bash
# _SYSTEM/_AUTOMATION/audit-untracked-gates.sh
# Identifies and migrates untracked gate scripts from the corrupted superproject root
# into the strictly governed investing/agentic-flow/scripts/superproject-gates folder.

set -e

SUPERPROJECT_ROOT="/Users/shahroozbhopti/Documents/code"
SUBMODULE_ROOT="${SUPERPROJECT_ROOT}/projects/investing/agentic-flow"
TARGET_DIR="${SUBMODULE_ROOT}/scripts/superproject-gates"

mkdir -p "$TARGET_DIR"

echo "[Phase 1] Auditing Superproject for untracked gate scripts..."

cd "$SUPERPROJECT_ROOT"

# Extract only .sh, .py, and .ts files from the untracked lists
# excluding node_modules and similar junk
git ls-files --others --exclude-standard | grep -E '\.(sh|py|ts)$' | grep -v 'node_modules' | grep -v '\.test\.' > "${SUBMODULE_ROOT}/reports/untracked-candidates.txt" || true

TOTAL_CANDIDATES=$(wc -l < "${SUBMODULE_ROOT}/reports/untracked-candidates.txt" | tr -d ' ')
echo "[Phase 1] Found $TOTAL_CANDIDATES candidate scripts."

if [ "$TOTAL_CANDIDATES" -eq 0 ]; then
    echo "No untracked scripts to migrate."
    exit 0
fi

# We will migrate these candidates
touch "${SUBMODULE_ROOT}/reports/MIGRATED_SCRIPTS.log"

while IFS= read -r file; do
    # check if file still exists (could be in a deleted nested module)
    if [ -f "$file" ]; then
        BASE_NAME=$(basename "$file")
        # Ensure we do not overwrite existing scripts in the target directory
        if [ ! -f "${TARGET_DIR}/${BASE_NAME}" ]; then
            echo "Migrating: $file -> ${TARGET_DIR}/${BASE_NAME}"
            cp "$file" "${TARGET_DIR}/${BASE_NAME}"
            echo "Migrated $file on $(date)" >> "${SUBMODULE_ROOT}/reports/MIGRATED_SCRIPTS.log"
        fi
    fi
done < "${SUBMODULE_ROOT}/reports/untracked-candidates.txt"

echo "[Phase 1] Superproject Substitution Isolation complete."
