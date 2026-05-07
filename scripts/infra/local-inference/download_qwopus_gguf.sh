#!/usr/bin/env bash
# download_qwopus_gguf.sh
# Downloads the Qwopus-GLM-18B-Merged-GGUF model to the local .goalie models directory.

set -euo pipefail

MODEL_DIR=".goalie/models"
MODEL_REPO="KyleHessling1/Qwopus-GLM-18B-Merged-GGUF"
MODEL_FILENAME="Qwopus-GLM-18B-Merged.q4_k_m.gguf" # Targeting a 4-bit quantization for optimal RAM/speed balance

echo "========================================================="
echo "🧠 Fetching Qwopus-GLM-18B-Merged GGUF"
echo "========================================================="

mkdir -p "$MODEL_DIR"

if ! command -v huggingface-cli &> /dev/null; then
    echo "⚠️ huggingface-cli not found. Installing via pip..."
    pip install -U "huggingface_hub[cli]"
fi

echo "📥 Downloading model to $MODEL_DIR..."
huggingface-cli download "$MODEL_REPO" "$MODEL_FILENAME" --local-dir "$MODEL_DIR" --local-dir-use-symlinks False

echo "✅ Download complete: $MODEL_DIR/$MODEL_FILENAME"
