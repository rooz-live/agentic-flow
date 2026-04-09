#!/usr/bin/env bats
# tests/bats/test_gemma4_ollama_connections.bats
# TDD Red/Green BATS Suite for Zero-Download Local Model Mapping (LM Studio <-> Ollama)
# @business-context WSJF-163

setup() {
    export TEST_TEMP_DIR="$(mktemp -d)"
    export LM_STUDIO_DIR="${TEST_TEMP_DIR}/lm-studio-models"
    export CENTRAL_MODELS_DIR="${TEST_TEMP_DIR}/central-universal-registry"
    export _TEST_DRY_RUN="true"
    
    mkdir -p "$LM_STUDIO_DIR/google/gemma-4-26b-it-GGUF"
    mkdir -p "$LM_STUDIO_DIR/qwen"
    # Create fake GGUF binary mappings mimicking LM Studio footprint
    touch "$LM_STUDIO_DIR/google/gemma-4-26b-it-GGUF/gemma4-26b-q4_k_m.gguf"
    touch "$LM_STUDIO_DIR/qwen/qwen-3.5-plus.gguf"
    
    export SCRIPT_PATH="./scripts/system/sync-universal-models.sh"
    chmod +x "$SCRIPT_PATH"
}

teardown() {
    rm -rf "$TEST_TEMP_DIR"
}

@test "Creates Central Models Directory if Missing" {
    run bash "$SCRIPT_PATH"
    
    [ "$status" -eq 0 ]
    [ -d "$CENTRAL_MODELS_DIR" ]
}

@test "Establishes Symlink Bridge Natively to LM Studio Cache" {
    run bash "$SCRIPT_PATH"
    
    [ "$status" -eq 0 ]
    [ -L "$CENTRAL_MODELS_DIR/lm-studio-cache" ]
    
    local link_target=$(readlink "$CENTRAL_MODELS_DIR/lm-studio-cache")
    [ "$link_target" = "$LM_STUDIO_DIR" ]
}

@test "Generates the Correct Ollama Model String Structurally Collapsing Underscores" {
    run bash "$SCRIPT_PATH"
    
    [ "$status" -eq 0 ]
    # The sync model script outputs the dry run text for mapped models
    # "gemma4-26b-q4_k_m.gguf" should become "gemma4-26b-q4-k-m" naturally mapping missing characters
    echo "$output" | grep -q "gemma4-26b-q4-k-m"
    echo "$output" | grep -q "qwen-3-5-plus"
}

@test "Gracefully Handles Missing LM Studio Directories without Crashing" {
    export LM_STUDIO_DIR="${TEST_TEMP_DIR}/does-not-exist"
    run bash "$SCRIPT_PATH"
    
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "LM Studio cache not found"
}

@test "Dry Run Successfully Evaluates Bounds Without Altering Ollama Natively" {
    run bash "$SCRIPT_PATH"
    
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "(DRY RUN) Successfully validated Modelfile payload"
}

@test "Asserts Discord Node Targets Ollama Rest Port 11434" {
    # Validates that the endpoint constraints perfectly hit port 11434 inside the python proxy
    run grep -q "11434" "./scripts/interfaces/discord_bot_proxy.py"
    
    [ "$status" -eq 0 ]
}
