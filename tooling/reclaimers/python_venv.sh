#!/bin/bash
set -euo pipefail
TARGET_PATH="/Volumes/cPanelBackups/execution_bounds/mac_studio"
if [ -d ".venv" ] && [ ! -L ".venv" ]; then
    echo "--> [WSJF 9.0] Offloading Python .venv..."
    mkdir -p "$TARGET_PATH"
    VENV_TARGET="$TARGET_PATH/.venv_$(date +%s)"
    mv .venv "$VENV_TARGET" 2>/dev/null || true
    ln -s "$VENV_TARGET" .venv
    echo "✅ Reclaimed .venv. Capabilities restored via Symlink."
fi
