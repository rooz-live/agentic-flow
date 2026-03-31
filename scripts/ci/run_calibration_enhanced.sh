#!/bin/bash
# Enhanced Calibration Wrapper
# Supports validation-mode, auto-approve, and dry-run flags
# Wraps the core run_calibration.sh with additional safety and validation features

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/../.."
CORRELATION_ID="consciousness-1758658960"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Default parameters
COUNT=10
VALIDATION_MODE=false
AUTO_APPROVE=false
DRY_RUN=false
NEURAL_ENABLED=false
CLAUDE_ENABLED=false
OUTPUT_FORMAT="json"
VERBOSE=false

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --count)
                COUNT="$2"
                shift 2
                ;;
            --validation-mode)
                VALIDATION_MODE=true
                shift
                ;;
            --auto-approve)
                AUTO_APPROVE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --neural)
                NEURAL_ENABLED=true
                shift
                ;;
            --claude)
                CLAUDE_ENABLED=true
                shift
                ;;
            --output)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1" >&2
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help information
show_help() {
    cat << EOF
Enhanced Risk Analytics Calibration Wrapper

Usage: $0 [OPTIONS]

Options:
    --count N             Number of commits to analyze (default: 10)
    --validation-mode     Run in validation mode (pre-flight checks)
    --auto-approve        Skip manual confirmation prompts
    --dry-run             Simulate without making changes
    --neural              Enable neural network enhancement
    --claude              Enable Claude AI integration
    --output FORMAT       Output format: json, markdown, csv (default: json)
    --verbose             Enable verbose logging
    --help                Show this help message

Modes:
    Validation Mode: Performs environment checks before running calibration
    Auto-Approve:    Automatically proceeds without user confirmation
    Dry-Run:         Simulates the calibration without creating output files

Examples:
    $0 --count 100 --validation-mode --auto-approve --dry-run
    $0 --count 50 --neural --claude --output markdown
    $0 --count 20 --validation-mode --verbose

Features:
    - Pre-flight environment validation
    - Safe execution with dry-run mode
    - Enhanced analytics with neural and Claude integration
    - Multi-format output support
    - Correlation ID tracking for CLAUDE ecosystem
EOF
}

# Validation mode checks
run_validation() {
    echo "Running validation checks..."
    local validation_passed=true
    
    # Check git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "❌ Not in a git repository"
        validation_passed=false
    else
        echo "✓ Git repository validated"
    fi
    
    # Check for required directories
    local required_dirs=("${PROJECT_ROOT}/logs" "${PROJECT_ROOT}/reports/calibration" "${PROJECT_ROOT}/data/calibration")
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            echo "⚠ Warning: Directory missing: $dir"
            echo "  Run: ./scripts/ci/setup_calibration.sh"
            validation_passed=false
        else
            echo "✓ Directory exists: $dir"
        fi
    done
    
    # Check for calibration script
    if [ ! -f "${SCRIPT_DIR}/run_calibration.sh" ]; then
        echo "❌ Core calibration script not found: ${SCRIPT_DIR}/run_calibration.sh"
        validation_passed=false
    else
        echo "✓ Core calibration script found"
    fi
    
    # Check commit count
    local commit_count=$(git log --oneline --no-merges | wc -l | tr -d ' ')
    if [ "${commit_count}" -lt "${COUNT}" ]; then
        echo "⚠ Warning: Only ${commit_count} commits available, requested ${COUNT}"
        echo "  Will analyze ${commit_count} commits"
    else
        echo "✓ Sufficient commits available: ${commit_count} >= ${COUNT}"
    fi
    
    # Check disk space
    local available_space=$(df -k "${PROJECT_ROOT}" | tail -1 | awk '{print $4}')
    if [ "${available_space}" -lt 102400 ]; then
        echo "⚠ Warning: Low disk space: $(( available_space / 1024 ))MB available"
    else
        echo "✓ Sufficient disk space: $(( available_space / 1024 ))MB available"
    fi
    
    if [ "${validation_passed}" = true ]; then
        echo "✓ All validation checks passed"
        return 0
    else
        echo "❌ Validation failed"
        return 1
    fi
}

# Request approval from user
request_approval() {
    if [ "${AUTO_APPROVE}" = true ]; then
        echo "Auto-approve enabled, proceeding..."
        return 0
    fi
    
    echo ""
    echo "Ready to run calibration with the following settings:"
    echo "  - Commits to analyze: ${COUNT}"
    echo "  - Neural enabled: ${NEURAL_ENABLED}"
    echo "  - Claude enabled: ${CLAUDE_ENABLED}"
    echo "  - Output format: ${OUTPUT_FORMAT}"
    echo "  - Dry-run mode: ${DRY_RUN}"
    echo ""
    
    read -p "Proceed with calibration? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Calibration cancelled by user"
        exit 0
    fi
}

# Run calibration in dry-run mode
run_dry_run() {
    echo "Running in DRY-RUN mode (no files will be created)..."
    
    # Simulate the command
    local cmd="${SCRIPT_DIR}/run_calibration.sh --count ${COUNT} --output ${OUTPUT_FORMAT}"
    
    if [ "${NEURAL_ENABLED}" = true ]; then
        cmd="${cmd} --neural"
    fi
    
    if [ "${CLAUDE_ENABLED}" = true ]; then
        cmd="${cmd} --claude"
    fi
    
    if [ "${VERBOSE}" = true ]; then
        cmd="${cmd} --verbose"
    fi
    
    echo "Would execute: ${cmd}"
    echo ""
    echo "Expected output:"
    echo "  - File: ${PROJECT_ROOT}/reports/calibration/enhanced_calibration_${TIMESTAMP}.${OUTPUT_FORMAT}"
    echo "  - Commits analyzed: ${COUNT}"
    echo "  - Neural analysis: ${NEURAL_ENABLED}"
    echo "  - Claude analysis: ${CLAUDE_ENABLED}"
    echo ""
    echo "Dry-run complete (no actual execution)"
    
    # Emit dry-run heartbeat
    echo "${TIMESTAMP}|run_calibration_enhanced|dry_run_complete|SUCCESS|0|${CORRELATION_ID}|{\"count\":${COUNT},\"neural\":${NEURAL_ENABLED},\"claude\":${CLAUDE_ENABLED}}" >> "${PROJECT_ROOT}/logs/heartbeats.log"
}

# Run actual calibration
run_calibration() {
    echo "Running calibration analysis..."
    
    local start_epoch=$(date +%s)
    
    # Build command
    local cmd="${SCRIPT_DIR}/run_calibration.sh --count ${COUNT} --output ${OUTPUT_FORMAT}"
    
    if [ "${NEURAL_ENABLED}" = true ]; then
        cmd="${cmd} --neural"
    fi
    
    if [ "${CLAUDE_ENABLED}" = true ]; then
        cmd="${cmd} --claude"
    fi
    
    if [ "${VERBOSE}" = true ]; then
        cmd="${cmd} --verbose"
    fi
    
    echo "Executing: ${cmd}"
    echo ""
    
    # Execute calibration
    if ${cmd}; then
        local end_epoch=$(date +%s)
        local elapsed_ms=$(( ( end_epoch - start_epoch ) * 1000 ))
        
        echo ""
        echo "✓ Calibration completed successfully"
        echo "  Duration: $(( elapsed_ms / 1000 ))s"
        
        # Emit success heartbeat
        echo "${TIMESTAMP}|run_calibration_enhanced|calibration_complete|SUCCESS|${elapsed_ms}|${CORRELATION_ID}|{\"count\":${COUNT},\"neural\":${NEURAL_ENABLED},\"claude\":${CLAUDE_ENABLED}}" >> "${PROJECT_ROOT}/logs/heartbeats.log"
        
        return 0
    else
        local end_epoch=$(date +%s)
        local elapsed_ms=$(( ( end_epoch - start_epoch ) * 1000 ))
        
        echo ""
        echo "❌ Calibration failed"
        
        # Emit failure heartbeat
        echo "${TIMESTAMP}|run_calibration_enhanced|calibration_failed|FAILURE|${elapsed_ms}|${CORRELATION_ID}|{\"count\":${COUNT},\"error\":\"execution_failed\"}" >> "${PROJECT_ROOT}/logs/heartbeats.log"
        
        return 1
    fi
}

# Update metadata after successful run
update_metadata() {
    local metadata_file="${PROJECT_ROOT}/data/calibration/metadata.json"
    if [ -f "${metadata_file}" ]; then
        # Read current total_runs
        local total_runs=$(grep -o '"total_runs": [0-9]*' "${metadata_file}" | awk '{print $2}')
        local new_total=$((total_runs + 1))
        
        # Update metadata (simple sed replacement)
        sed -i.bak "s/\"last_calibration\": null/\"last_calibration\": \"${TIMESTAMP}\"/" "${metadata_file}"
        sed -i.bak "s/\"total_runs\": ${total_runs}/\"total_runs\": ${new_total}/" "${metadata_file}"
        rm -f "${metadata_file}.bak"
        
        echo "✓ Metadata updated (run #${new_total})"
    fi
}

# Main execution
main() {
    parse_arguments "$@"
    
    echo "Enhanced Risk Analytics Calibration"
    echo "Correlation ID: ${CORRELATION_ID}"
    echo "Timestamp: ${TIMESTAMP}"
    echo ""
    
    # Run validation if requested
    if [ "${VALIDATION_MODE}" = true ]; then
        if ! run_validation; then
            echo ""
            echo "Validation failed. Please run setup first:"
            echo "  ./scripts/ci/setup_calibration.sh"
            exit 1
        fi
        echo ""
    fi
    
    # Request approval unless auto-approve or dry-run
    if [ "${DRY_RUN}" = false ]; then
        request_approval
    fi
    
    # Execute based on mode
    if [ "${DRY_RUN}" = true ]; then
        run_dry_run
    else
        if run_calibration; then
            update_metadata
        else
            exit 1
        fi
    fi
    
    echo ""
    echo "Enhanced calibration complete"
}

# Execute main function
main "$@"
