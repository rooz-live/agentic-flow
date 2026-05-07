#!/usr/bin/env bash
# deploy_llama_cpp.sh
# Deploys llama.cpp locally, compiled with Metal acceleration for Apple Silicon macOS.

set -euo pipefail

LLAMA_DIR=".goalie/llama.cpp"

echo "========================================================="
echo "🦙 Deploying llama.cpp (Metal Accelerated) for Local LLM"
echo "========================================================="

if [ -d "$LLAMA_DIR" ]; then
    echo "✅ llama.cpp already cloned in $LLAMA_DIR. Pulling latest..."
    cd "$LLAMA_DIR"
    git pull
else
    echo "📥 Cloning ggerganov/llama.cpp..."
    mkdir -p .goalie
    git clone https://github.com/ggerganov/llama.cpp.git "$LLAMA_DIR"
    cd "$LLAMA_DIR"
fi

echo "🔨 Compiling llama.cpp with LLAMA_METAL=1..."
# Ensures it uses macOS GPU memory unified structure
make clean
make LLAMA_METAL=1 -j$(sysctl -n hw.ncpu)

echo "✅ Compilation Complete. Binary is available at: $LLAMA_DIR/llama-server"
