#!/usr/bin/env bats
# =============================================================================
# BATS Unit Tests for roam-staleness-watchdog.sh
# =============================================================================
# 
# Tests the ROAM staleness monitoring and escalation system
# Run with: bats tests/bash/test-roam-staleness-watchdog.bats
# =============================================================================

setup() {
    # Create temporary test directory
    TEST_TEMP_DIR="$(mktemp -d)"
    export TEST_TEMP_DIR
    
    # Create mock ROAM_TRACKER.yaml for testing
    MOCK_ROAM_FILE="$TEST_TEMP_DIR/ROAM_TRACKER.yaml"
    export MOCK_ROAM_FILE
    
    cat > "$MOCK_ROAM_FILE" << 'EOF'
# Mock ROAM Tracker for Testing
roam_items:
  - id: R001
    description: "Test risk item"
    status: "active"
    last_updated: "2026-03-07"
EOF
    
    # Create mock log directory
    MOCK_LOG_DIR="$TEST_TEMP_DIR/logs"
    mkdir -p "$MOCK_LOG_DIR"
    export MOCK_LOG_DIR
}

teardown() {
    # Clean up temporary files
    if [[ -n "$TEST_TEMP_DIR" && -d "$TEST_TEMP_DIR" ]]; then
        rm -rf "$TEST_TEMP_DIR"
    fi
}

@test "roam-staleness-watchdog.sh has correct syntax" {
    # Test that the script passes bash syntax check
    run bash -n scripts/validators/roam-staleness-watchdog.sh
    [[ "$status" -eq 0 ]]
}

@test "watchdog detects fresh ROAM tracker" {
    # Create a fresh ROAM file (modified within last hour)
    touch "$MOCK_ROAM_FILE"
    
    # Mock the script to use our test file
    run bash -c "
        export PROJECT_ROOT='$TEST_TEMP_DIR'
        export ROAM_FILE='$MOCK_ROAM_FILE'
        export LOG_FILE='$MOCK_LOG_DIR/test.log'
        
        # Source the functions from the watchdog script
        source scripts/validators/roam-staleness-watchdog.sh
        
        # Override the main function to just run the check
        check_roam_staleness
    "
    
    # Should return EXIT_SUCCESS (0) for fresh file
    [[ "$status" -eq 0 ]]
}

@test "watchdog detects stale ROAM tracker" {
    # Create a stale ROAM file (modified 5 days ago)
    touch -t $(date -v-5d '+%Y%m%d%H%M') "$MOCK_ROAM_FILE" 2>/dev/null || \
    touch -d '5 days ago' "$MOCK_ROAM_FILE" 2>/dev/null || \
    touch "$MOCK_ROAM_FILE"  # Fallback for systems without date manipulation
    
    # Mock the script to use our test file
    run bash -c "
        export PROJECT_ROOT='$TEST_TEMP_DIR'
        export ROAM_FILE='$MOCK_ROAM_FILE'
        export LOG_FILE='$MOCK_LOG_DIR/test.log'
        
        # Source the functions from the watchdog script
        source scripts/validators/roam-staleness-watchdog.sh
        
        # Override thresholds for testing
        STALENESS_THRESHOLD_HOURS=24  # 1 day
        CRITICAL_THRESHOLD_HOURS=72   # 3 days
        
        check_roam_staleness
    "
    
    # Should return non-zero exit code for stale file
    [[ "$status" -ne 0 ]]
}

@test "watchdog handles missing ROAM tracker" {
    # Remove the ROAM file
    rm -f "$MOCK_ROAM_FILE"
    
    # Mock the script to use our test file
    run bash -c "
        export PROJECT_ROOT='$TEST_TEMP_DIR'
        export ROAM_FILE='$MOCK_ROAM_FILE'
        export LOG_FILE='$MOCK_LOG_DIR/test.log'
        
        # Source the functions from the watchdog script
        source scripts/validators/roam-staleness-watchdog.sh
        
        check_roam_staleness
    "
    
    # Should return EXIT_FILE_NOT_FOUND (11)
    [[ "$status" -eq 11 ]]
}

@test "watchdog creates log entries" {
    # Create a fresh ROAM file
    touch "$MOCK_ROAM_FILE"
    
    # Mock the script to use our test file
    run bash -c "
        export PROJECT_ROOT='$TEST_TEMP_DIR'
        export ROAM_FILE='$MOCK_ROAM_FILE'
        export LOG_FILE='$MOCK_LOG_DIR/test.log'
        
        # Source the functions from the watchdog script
        source scripts/validators/roam-staleness-watchdog.sh
        
        check_roam_staleness
    "
    
    # Check that log file was created
    [[ -f "$MOCK_LOG_DIR/test.log" ]]
    
    # Check that log contains expected entries
    grep -q "ROAM staleness check" "$MOCK_LOG_DIR/test.log"
    grep -q "ROAM tracker status" "$MOCK_LOG_DIR/test.log"
}

@test "watchdog uses robust exit codes" {
    # Test that the script sources validation-core.sh and uses robust exit codes
    run bash -c "
        # Source the watchdog script
        source scripts/validators/roam-staleness-watchdog.sh
        
        # Check that robust exit codes are defined
        echo \"EXIT_SUCCESS=\$EXIT_SUCCESS\"
        echo \"EXIT_FILE_NOT_FOUND=\$EXIT_FILE_NOT_FOUND\"
        echo \"EXIT_DATE_PAST=\$EXIT_DATE_PAST\"
        echo \"EXIT_ADR_MISSING=\$EXIT_ADR_MISSING\"
        echo \"EXIT_DATA_CORRUPTION=\$EXIT_DATA_CORRUPTION\"
    "
    
    [[ "$status" -eq 0 ]]
    [[ "$output" =~ "EXIT_SUCCESS=0" ]]
    [[ "$output" =~ "EXIT_FILE_NOT_FOUND=11" ]]
}
