#!/usr/bin/env bash
# start-inference-server.sh
# Boots the llama-server using the downloaded Qwopus model on port 8080.

set -euo pipefail

LLAMA_DIR=".goalie/llama.cpp"
MODEL_PATH=".goalie/models/Qwopus-GLM-18B-Merged.q4_k_m.gguf"
PORT=8080

echo "========================================================="
echo "🧠 Starting Local Inference Server (OpenAI API Compatible)"
echo "========================================================="

if [ ! -f "$LLAMA_DIR/llama-server" ]; then
    echo "❌ Error: llama-server binary not found. Please run deploy_llama_cpp.sh first."
    exit 1
fi

if [ ! -f "$MODEL_PATH" ]; then
    echo "❌ Error: Model not found at $MODEL_PATH. Please run download_qwopus_gguf.sh first."
    exit 1
fi

echo "🚀 Starting server on port $PORT with GPU layers enabled..."
# -ngl 99 offloads all layers to the Metal GPU
# -c 4096 sets the context window
"$LLAMA_DIR/llama-server" -m "$MODEL_PATH" -c 4096 -ngl 99 --port "$PORT" --host 127.0.0.1
