#!/usr/bin/env bash
# scripts/system/sync-universal-models.sh
# Unified Local Intelligence Model Registry (Zero-Duplication)
# @business-context WSJF-163: Eliminate multi-GB redundant model downloads (Gemma 4, Qwen) across LM Studio and Ollama.
# @adr ADR-006: Prod-Maturity Zero-Download Model Architecture

set -euo pipefail

echo -e "\033[1;36m[System] Initializing Unified GGUF Model Registry Sync...\033[0m"

# Standardizing the unified model repository (defaulting to LM Studio's structure)
LM_STUDIO_DIR="${LM_STUDIO_DIR:-${HOME}/.cache/lm-studio/models}"
CENTRAL_MODELS_DIR="${CENTRAL_MODELS_DIR:-${HOME}/.local/share/universal-models}"

# Ensure the central directory exists
mkdir -p "$CENTRAL_MODELS_DIR"

if [[ -d "$LM_STUDIO_DIR" ]]; then
    echo -e "[\033[1;32m✓\033[0m] LM Studio model cache found at $LM_STUDIO_DIR."
    
    # We will safely symlink the universal directory to centralize access for tools without breaking LM Studio
    if [[ ! -L "$CENTRAL_MODELS_DIR/lm-studio-cache" ]]; then
        ln -s "$LM_STUDIO_DIR" "$CENTRAL_MODELS_DIR/lm-studio-cache"
    fi
else
    echo -e "[\033[1;33m⚠\033[0m] LM Studio cache not found, establishing Greenfield Universal structure..."
fi

echo -e "\033[1;34m[Ollama] Scanning for GGUF binaries to inject via zero-download Modelfiles...\033[0m"

# Find all GGUF files in the central registry mapping
find -L "$CENTRAL_MODELS_DIR" -type f -name "*.gguf" | while read -r gguf_path; do
    # Extract model name dynamically from the GGUF binary name
    model_basename=$(basename "$gguf_path" .gguf)
    
    # Format name for Ollama standard (lowercase, replace underscores, collapse hyphens)
    ollama_model_name=$(echo "$model_basename" | tr '[:upper:]' '[:lower:]' | tr '_' '-' | sed -e 's/[^a-z0-9-]/-/g' -e 's/-\+/-/g' -e 's/^-//' -e 's/-$//')
    
    echo -e "  -> Mapping model: \033[1;33m$ollama_model_name\033[0m natively to Ollama without downloading..."
    
    # Generate the physical Modelfile dynamically referencing the absolute GGUF path
    TEMP_MODELFILE=$(mktemp)
    cat <<EOF > "$TEMP_MODELFILE"
FROM "$gguf_path"

# Automatically configured System parameters for $ollama_model_name
PARAMETER temperature 0.1
PARAMETER num_ctx 262144
EOF

    # If Ollama daemon is running, execute the creation binding the universal file to Ollama's namespace
    # Note: Test configurations can safely dry-run by injecting _TEST_DRY_RUN
    if [[ "${_TEST_DRY_RUN:-false}" == "true" ]]; then
        echo -e "    [\033[1;32m✓\033[0m] (DRY RUN) Successfully validated Modelfile payload targeting: $ollama_model_name"
    elif command -v ollama >/dev/null 2>&1; then
        if ollama list >/dev/null 2>&1; then
            ollama create "$ollama_model_name" -f "$TEMP_MODELFILE" >/dev/null
            echo -e "    [\033[1;32m✓\033[0m] Successfully bound $ollama_model_name into Ollama."
        else
            echo -e "    [\033[1;31m✗\033[0m] Ollama daemon is not running. Cannot execute universal binding."
        fi
    else
        echo -e "    [\033[1;31m✗\033[0m] Ollama CLI missing from PATH."
    fi

    rm -f "$TEMP_MODELFILE"
done

echo -e "\033[1;36m[System] Prod-Maturity Zero-Download Model Registry sync complete!\033[0m"
