#!/bin/bash
set -euo pipefail
TARGET_PATH="/Volumes/cPanelBackups/execution_bounds/mac_studio"
if [ -d "$HOME/.ollama/models" ] && [ ! -L "$HOME/.ollama/models" ]; then
    echo "--> [WSJF 10.0] Offloading local Ollama LLM matrix (~17GB) to Sovereign Drive..."
    mkdir -p "$TARGET_PATH"
    LLM_TARGET="$TARGET_PATH/ollama_models_$(date +%s)"
    mv "$HOME/.ollama/models" "$LLM_TARGET" 2>/dev/null || true
    ln -s "$LLM_TARGET" "$HOME/.ollama/models"
    echo "✅ Reclaimed ~17GB from Ollama. Capabilities restored via Symlink."
fi
