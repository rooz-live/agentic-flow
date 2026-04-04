#!/bin/bash
# Integrate Alignment Sentinel with Monitoring Stack
#
# This script integrates the Alignment Sentinel System with the existing
# monitoring stack to provide independent health validation and
# automatic escalation for critical drift detection.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CORE_DIR="${PROJECT_ROOT}/agentic-flow-core"
CONFIG_FILE="${CORE_DIR}/config/alignment-sentinel.config.json"
LOG_FILE="${PROJECT_ROOT}/logs/alignment-sentinel-integration.log"
METRICS_DIR="${PROJECT_ROOT}/metrics/alignment-sentinel"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo -e "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Create necessary directories
setup_directories() {
    log "INFO" "Setting up directories..."
    mkdir -p "${METRICS_DIR}"
    mkdir -p "$(dirname "${LOG_FILE}")"
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed"
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error_exit "npm is not installed"
    fi

    # Check if TypeScript is installed
    if ! command -v tsc &> /dev/null; then
        log "WARNING" "TypeScript compiler not found in PATH, attempting to use local version"
        if [[ ! -f "${CORE_DIR}/node_modules/.bin/tsc" ]]; then
            error_exit "TypeScript not found locally, run 'npm install' in ${CORE_DIR}"
        fi
    fi

    # Check if config file exists
    if [[ ! -f "${CONFIG_FILE}" ]]; then
        error_exit "Configuration file not found: ${CONFIG_FILE}"
    fi

    log "INFO" "${GREEN}All prerequisites met${NC}"
}

# Build TypeScript code
build_typescript() {
    log "INFO" "Building TypeScript code..."

    cd "${CORE_DIR}"

    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log "INFO" "Installing dependencies..."
        npm install || error_exit "Failed to install dependencies"
    fi

    # Build TypeScript
    npm run build || error_exit "Failed to build TypeScript code"

    log "INFO" "${GREEN}TypeScript build successful${NC}"
}

# Run Alignment Sentinel tests
run_tests() {
    log "INFO" "Running Alignment Sentinel tests..."

    cd "${CORE_DIR}"

    npm test -- alignment-sentinel.test.ts || error_exit "Tests failed"

    log "INFO" "${GREEN}All tests passed${NC}"
}

# Create integration test script
create_integration_test() {
    log "INFO" "Creating integration test..."

    local test_script="${PROJECT_ROOT}/scripts/monitoring/test-alignment-sentinel.js"

    cat > "${test_script}" << 'EOF'
const { AlignmentSentinel, createDefaultAlignmentSentinel } = require('../agentic-flow-core/dist/monitoring/alignment-sentinel');
const { AlertRouter } = require('../agentic-flow-core/dist/monitoring/alert-router');

async function runIntegrationTest() {
    console.log('[Integration Test] Starting Alignment Sentinel integration test...');

    // Create Alignment Sentinel
    const sentinel = createDefaultAlignmentSentinel();

    // Create mock AlertRouter
    const alertRouter = new AlertRouter({
        environment: 'test',
        region: 'us-east-1',
        suppressDuplicates: true,
        suppressionWindowMs: 300000,
        retryAttempts: 3,
        retryDelayMs: 1000,
        severityRouting: {
            critical: { sns: false, webhook: false, slack: false, syslog: true },
            warning: { sns: false, webhook: false, slack: false, syslog: true },
            info: { sns: false, webhook: false, slack: false, syslog: true },
        },
    });

    // Set AlertRouter
    sentinel.setAlertRouter(alertRouter);

    // Test health check
    console.log('[Integration Test] Performing health check...');
    const healthStatus = await sentinel.performHealthCheck();
    console.log('[Integration Test] Health status:', healthStatus);

    // Test score updates
    console.log('[Integration Test] Testing score updates...');
    sentinel.updateCurrentScore('provider-health-monitor', 0.85);
    sentinel.updateCurrentScore('alert-router', 0.90);
    sentinel.updateCurrentScore('syslog-health-monitor', 0.80);

    const updatedHealthStatus = await sentinel.performHealthCheck();
    console.log('[Integration Test] Updated health status:', updatedHealthStatus);

    // Test drift detection
    console.log('[Integration Test] Testing drift detection...');
    const drifts = sentinel.getDriftHistory();
    console.log('[Integration Test] Detected drifts:', drifts);

    // Test reset
    console.log('[Integration Test] Testing reset...');
    sentinel.reset();
    const resetHealthStatus = sentinel.getHealthStatus();
    console.log('[Integration Test] Reset health status:', resetHealthStatus);

    console.log('[Integration Test] Integration test completed successfully');
}

runIntegrationTest().catch(error => {
    console.error('[Integration Test] Error:', error);
    process.exit(1);
});
EOF

    log "INFO" "${GREEN}Integration test script created${NC}"
}

# Run integration test
run_integration_test() {
    log "INFO" "Running integration test..."

    local test_script="${PROJECT_ROOT}/scripts/monitoring/test-alignment-sentinel.js"

    if [[ ! -f "${test_script}" ]]; then
        create_integration_test
    fi

    node "${test_script}" || error_exit "Integration test failed"

    log "INFO" "${GREEN}Integration test passed${NC}"
}

# Generate integration report
generate_report() {
    log "INFO" "Generating integration report..."

    local report_file="${METRICS_DIR}/integration-report-$(date -u +"%Y%m%dT%H%M%SZ").json"

    cat > "${report_file}" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "integration_status": "success",
  "components": {
    "alignment-sentinel": {
      "status": "integrated",
      "config_file": "${CONFIG_FILE}",
      "tests": "passed",
      "health_checks": "enabled"
    },
    "monitoring-stack": {
      "status": "operational",
      "components": [
        "provider-health-monitor",
        "alert-router",
        "syslog-health-monitor",
        "monitoring-dashboard"
      ]
    }
  },
  "next_steps": [
    "Configure AlertRouter with production endpoints",
    "Set up environment variables for production deployment",
    "Enable periodic health checks in production",
    "Monitor alignment scores and drift detection"
  ]
}
EOF

    log "INFO" "${GREEN}Integration report generated: ${report_file}${NC}"
}

# Main integration function
run_integration() {
    log "INFO" "Starting Alignment Sentinel integration..."
    log "INFO" "Project root: ${PROJECT_ROOT}"
    log "INFO" "Core directory: ${CORE_DIR}"

    setup_directories
    check_prerequisites
    build_typescript
    run_tests
    create_integration_test
    run_integration_test
    generate_report

    log "INFO" "${GREEN}Alignment Sentinel integration completed successfully${NC}"
    log "INFO" "Next steps:"
    log "INFO" "  1. Configure AlertRouter with production endpoints (SNS, Slack, etc.)"
    log "INFO" "  2. Set up environment variables for production deployment"
    log "INFO" "  3. Enable periodic health checks in production"
    log "INFO" "  4. Monitor alignment scores and drift detection"
}

# Test mode
test_mode() {
    log "INFO" "Running in test mode..."
    setup_directories
    check_prerequisites
    build_typescript
    run_tests
    run_integration_test
}

# Main function
main() {
    local mode="${1:-run}"

    case "${mode}" in
        --test|-t)
            test_mode
            ;;
        --help|-h)
            echo "Usage: $0 [--test|--help]"
            echo "  --test, -t   Run integration in test mode"
            echo "  --help, -h    Show this help message"
            exit 0
            ;;
        *)
            run_integration
            ;;
    esac
}

# Run main function
main "$@"
