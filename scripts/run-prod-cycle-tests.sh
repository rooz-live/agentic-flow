#!/bin/bash

# Production Cycle Test Execution Script
# Runs comprehensive test suite for all prod-cycle improvements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
COVERAGE_DIR="$PROJECT_ROOT/coverage"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="$TEST_RESULTS_DIR/reports_$TIMESTAMP"

# Create necessary directories
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$COVERAGE_DIR"
mkdir -p "$REPORT_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to run test suite
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    local output_file="$REPORT_DIR/${suite_name}_output.log"
    local results_file="$REPORT_DIR/${suite_name}_results.json"
    
    log "Running $suite_name test suite..."
    
    # Set environment variables for testing
    export NODE_ENV=test
    export AF_TEST_MODE=true
    export AF_CPU_HEADROOM_TARGET=0.40
    export AF_BATCH_SIZE=3
    export AF_MAX_WIP=6
    export AF_RATE_LIMIT_ENABLED=true
    export AF_CIRCUIT_BREAKER_ENABLED=true
    
    # Run tests with timeout and error handling
    if timeout 300 bash -c "$test_command" > "$output_file" 2>&1; then
        log_success "$suite_name tests completed successfully"
        echo '{"status": "passed", "timestamp": "'$(date -Iseconds)'"}' > "$results_file"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            log_error "$suite_name tests timed out after 5 minutes"
        else
            log_error "$suite_name tests failed with exit code $exit_code"
        fi
        echo '{"status": "failed", "timestamp": "'$(date -Iseconds)'", "exit_code": '$exit_code'}' > "$results_file"
        return 1
    fi
}

# Function to generate test report
generate_report() {
    log "Generating comprehensive test report..."
    
    local report_file="$REPORT_DIR/comprehensive_report.html"
    local summary_file="$REPORT_DIR/test_summary.json"
    
    # Count test results
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    for results_file in "$REPORT_DIR"/*_results.json; do
        if [ -f "$results_file" ]; then
            total_tests=$((total_tests + 1))
            if grep -q '"status": "passed"' "$results_file"; then
                passed_tests=$((passed_tests + 1))
            else
                failed_tests=$((failed_tests + 1))
            fi
        fi
    done
    
    # Generate JSON summary
    cat > "$summary_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "total_test_suites": $total_tests,
    "passed_suites": $passed_tests,
    "failed_suites": $failed_tests,
    "success_rate": $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l),
    "test_environment": {
        "node_version": "$(node --version)",
        "npm_version": "$(npm --version)",
        "platform": "$(uname -s)",
        "architecture": "$(uname -m)"
    },
    "configuration": {
        "af_cpu_headroom_target": "$AF_CPU_HEADROOM_TARGET",
        "af_batch_size": "$AF_BATCH_SIZE",
        "af_max_wip": "$AF_MAX_WIP",
        "af_rate_limit_enabled": "$AF_RATE_LIMIT_ENABLED",
        "af_circuit_breaker_enabled": "$AF_CIRCUIT_BREAKER_ENABLED"
    }
}
EOF
    
    # Generate HTML report
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Production Cycle Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .test-suite { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
        .passed { border-left-color: #4CAF50; }
        .failed { border-left-color: #f44336; }
        .metrics { display: flex; gap: 20px; margin: 20px 0; }
        .metric { text-align: center; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Production Cycle Test Report</h1>
        <p>Generated: $(date)</p>
        <p>Test Environment: $(uname -s) $(uname -m)</p>
    </div>
    
    <div class="metrics">
        <div class="metric">
            <div class="metric-value">$total_tests</div>
            <div class="metric-label">Total Test Suites</div>
        </div>
        <div class="metric">
            <div class="metric-value">$passed_tests</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value">$failed_tests</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value">$(echo "scale=1; $passed_tests * 100 / $total_tests" | bc -l)%</div>
            <div class="metric-label">Success Rate</div>
        </div>
    </div>
    
    <div class="summary">
        <h2>Test Suite Results</h2>
EOF

    # Add individual test results to HTML
    for results_file in "$REPORT_DIR"/*_results.json; do
        if [ -f "$results_file" ]; then
            suite_name=$(basename "$results_file" _results.json)
            status=$(grep -o '"status": "[^"]*"' "$results_file" | cut -d'"' -f4)
            css_class="$status"
            
            cat >> "$report_file" << EOF
        <div class="test-suite $css_class">
            <h3>$suite_name</h3>
            <p>Status: $status</p>
            <p><a href="${suite_name}_output.log">View Output</a></p>
        </div>
EOF
        fi
    done

    cat >> "$report_file" << EOF
    </div>
</body>
</html>
EOF

    log_success "Test report generated: $report_file"
    log "Test summary: $summary_file"
}

# Function to run coverage analysis
run_coverage_analysis() {
    log "Running coverage analysis..."
    
    local coverage_file="$COVERAGE_DIR/coverage_summary.json"
    
    # Run coverage collection
    cd "$PROJECT_ROOT"
    
    # TypeScript/JavaScript coverage
    if command -v npx &> /dev/null; then
        log "Running JavaScript/TypeScript coverage..."
        npx jest --coverage --coverageReporters=json --coverageDirectory="$COVERAGE_DIR" \
            --testPathPattern="tests/(unit|integration|performance)" \
            --passWithNoTests > "$REPORT_DIR/coverage_js.log" 2>&1 || true
    fi
    
    # Python coverage
    if command -v python3 &> /dev/null; then
        log "Running Python coverage..."
        python3 -m pytest tests/ --cov=scripts --cov-report=json --cov-report=html \
            --cov-report=term --junitxml="$REPORT_DIR/python_junit.xml" \
            > "$REPORT_DIR/coverage_py.log" 2>&1 || true
    fi
    
    # Generate coverage summary
    if [ -f "$COVERAGE_DIR/coverage-final.json" ]; then
        local lines_coverage=$(grep '"lines"' "$COVERAGE_DIR/coverage-final.json" | grep -o '"covered":[0-9]*' | cut -d':' -f2)
        local functions_coverage=$(grep '"functions"' "$COVERAGE_DIR/coverage-final.json" | grep -o '"covered":[0-9]*' | cut -d':' -f2)
        local branches_coverage=$(grep '"branches"' "$COVERAGE_DIR/coverage-final.json" | grep -o '"covered":[0-9]*' | cut -d':' -f2)
        local statements_coverage=$(grep '"statements"' "$COVERAGE_DIR/coverage-final.json" | grep -o '"covered":[0-9]*' | cut -d':' -f2)
        
        cat > "$coverage_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "coverage": {
        "lines": $lines_coverage,
        "functions": $functions_coverage,
        "branches": $branches_coverage,
        "statements": $statements_coverage
    },
    "thresholds_met": {
        "lines": $([ "$lines_coverage" -ge 90 ] && echo true || echo false),
        "functions": $([ "$functions_coverage" -ge 90 ] && echo true || echo false),
        "branches": $([ "$branches_coverage" -ge 90 ] && echo true || echo false),
        "statements": $([ "$statements_coverage" -ge 90 ] && echo true || echo false)
    }
}
EOF
        log_success "Coverage analysis completed"
    else
        log_warning "Coverage data not found"
    fi
}

# Function to run performance benchmarks
run_performance_benchmarks() {
    log "Running performance benchmarks..."
    
    local benchmark_file="$REPORT_DIR/performance_benchmarks.json"
    
    # Run Node.js performance tests
    cd "$PROJECT_ROOT"
    if command -v node &> /dev/null; then
        log "Running Node.js performance benchmarks..."
        timeout 300 node --expose-gc tests/performance/performance-runner.js \
            > "$REPORT_DIR/benchmark_js.log" 2>&1 || true
    fi
    
    # Run Python performance tests
    if command -v python3 &> /dev/null; then
        log "Running Python performance benchmarks..."
        timeout 300 python3 -m pytest tests/performance/ -v \
            --benchmark-json="$benchmark_file" \
            > "$REPORT_DIR/benchmark_py.log" 2>&1 || true
    fi
    
    # Generate performance summary
    if [ -f "$benchmark_file" ]; then
        log_success "Performance benchmarks completed"
    else
        log_warning "Performance benchmark data not found"
    fi
}

# Main execution
main() {
    log "Starting Production Cycle Test Execution"
    log "Project root: $PROJECT_ROOT"
    log "Report directory: $REPORT_DIR"
    
    # Check prerequisites
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is required but not installed"
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        log "Installing dependencies..."
        cd "$PROJECT_ROOT"
        npm install > "$REPORT_DIR/npm_install.log" 2>&1 || {
            log_error "Failed to install dependencies"
            exit 1
        }
    fi
    
    # Run test suites
    local test_suites=(
        "process-governor:cd '$PROJECT_ROOT' && npm run test:unit -- tests/unit/process-governor.test.ts"
        "pattern-metrics:cd '$PROJECT_ROOT' && npm run test:unit -- tests/pattern-metrics/pattern-metrics-logging.test.ts"
        "federation:cd '$PROJECT_ROOT' && npm run test:unit -- tests/federation/agentic-flow-federation.test.ts"
        "vscode-extension:cd '$PROJECT_ROOT' && npm run test:unit -- tests/vscode-extension/vscode-extension-mocks.test.ts"
        "performance:cd '$PROJECT_ROOT' && npm run test:performance -- tests/performance/high-load-benchmarks.test.ts"
        "integration:cd '$PROJECT_ROOT' && npm run test:integration -- tests/integration/end-to-end-workflows.test.ts"
        "python-tests:cd '$PROJECT_ROOT' && python3 -m pytest tests/test_code_search_doc_query.py -v"
    )
    
    local failed_suites=0
    
    for suite_config in "${test_suites[@]}"; do
        IFS=':' read -r suite_name test_command <<< "$suite_config"
        if ! run_test_suite "$suite_name" "$test_command"; then
            failed_suites=$((failed_suites + 1))
        fi
    done
    
    # Run additional analyses
    run_coverage_analysis
    run_performance_benchmarks
    
    # Generate final report
    generate_report
    
    # Final status
    log "Production Cycle Test Execution completed"
    log "Total test suites: ${#test_suites[@]}"
    log "Failed suites: $failed_suites"
    
    if [ $failed_suites -eq 0 ]; then
        log_success "All test suites passed successfully!"
        log "Report available at: $REPORT_DIR/comprehensive_report.html"
        exit 0
    else
        log_error "$failed_suites test suite(s) failed"
        log "Check logs in: $REPORT_DIR"
        log "Report available at: $REPORT_DIR/comprehensive_report.html"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --clean         Clean previous test results before running"
        echo "  --coverage-only  Run only coverage analysis"
        echo "  --performance-only Run only performance benchmarks"
        exit 0
        ;;
    --clean)
        log "Cleaning previous test results..."
        rm -rf "$TEST_RESULTS_DIR"
        rm -rf "$COVERAGE_DIR"
        log "Previous results cleaned"
        exit 0
        ;;
    --coverage-only)
        log "Running coverage analysis only..."
        run_coverage_analysis
        exit 0
        ;;
    --performance-only)
        log "Running performance benchmarks only..."
        run_performance_benchmarks
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac