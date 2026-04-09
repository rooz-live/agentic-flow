#!/usr/bin/env bats
# tests/bats/test_sync_universal_models.bats

setup() {
    export TEST_TMPDIR="$(mktemp -d)"
    export LM_STUDIO_DIR="$TEST_TMPDIR/lm-studio-cache"
    export CENTRAL_MODELS_DIR="$TEST_TMPDIR/universal-models"
    export _TEST_DRY_RUN="true"
    
    export SCRIPT_UNDER_TEST="${BATS_TEST_DIRNAME}/../../scripts/system/sync-universal-models.sh"
}

teardown() {
    rm -rf "$TEST_TMPDIR"
    unset LM_STUDIO_DIR
    unset CENTRAL_MODELS_DIR
    unset _TEST_DRY_RUN
}

@test "Graceful degradation when LM Studio cache is entirely absent" {
    run bash "$SCRIPT_UNDER_TEST"
    
    [ "$status" -eq 0 ]
    [[ "$output" == *"LM Studio cache not found, establishing Greenfield Universal structure"* ]]
}

@test "Successfully maps existing LM Studio structural binds natively" {
    mkdir -p "$LM_STUDIO_DIR"
    
    run bash "$SCRIPT_UNDER_TEST"
    
    [ "$status" -eq 0 ]
    [ -d "$CENTRAL_MODELS_DIR" ]
    [ -L "$CENTRAL_MODELS_DIR/lm-studio-cache" ]
    [[ "$output" == *"LM Studio model cache found at"* ]]
}

@test "Translates complex GGUF files dynamically into Ollama valid names" {
    mkdir -p "$LM_STUDIO_DIR"
    mkdir -p "$CENTRAL_MODELS_DIR"
    
    # Simulate an actual gemma 4 model locally downloaded
    touch "$CENTRAL_MODELS_DIR/gemma-4-26b-it-Q4_K_M.gguf"
    
    run bash "$SCRIPT_UNDER_TEST"
    
    [ "$status" -eq 0 ]
    [[ "$output" == *"Mapping model:"*"gemma-4-26b-it-q4-k-m"* ]]
    [[ "$output" == *"(DRY RUN) Successfully validated Modelfile payload targeting: gemma-4-26b-it-q4-k-m"* ]]
}

@test "Ignores random non-gguf files safely" {
    mkdir -p "$LM_STUDIO_DIR"
    touch "$LM_STUDIO_DIR/corrupt_cache.bin"
    
    run bash "$SCRIPT_UNDER_TEST"
    
    [ "$status" -eq 0 ]
    [[ ! "$output" == *"Mapping model"* ]]
}
