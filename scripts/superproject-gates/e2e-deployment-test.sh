#!/bin/bash

# End-to-End Deployment Test Suite for Governance Agents
# This script validates the complete deployment including all components

set -euo pipefail

# Configuration
NAMESPACE="governance-system"
DOMAIN="goalie.example.com"
TEST_TIMEOUT=300
HEALTH_CHECK_INTERVAL=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((TESTS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((TESTS_FAILED++))
}

log_test_start() {
    echo -e "${BLUE}[TEST]${NC} Starting: $1"
}

log_test_result() {
    local test_name=$1
    local result=$2
    local details=$3
    
    TEST_RESULTS+=("$test_name:$result:$details")
    
    if [[ "$result" == "PASS" ]]; then
        log_success "$test_name - $details"
    else
        log_error "$test_name - $details"
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local namespace=$2
    local timeout=$3
    
    log_info "Waiting for service $service_name to be ready..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local ready=$(kubectl get deployment $service_name -n $namespace -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local replicas=$(kubectl get deployment $service_name -n $namespace -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        
        if [[ "$ready" == "$replicas" && "$replicas" -gt 0 ]]; then
            log_success "Service $service_name is ready"
            return 0
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    log_error "Service $service_name failed to become ready within ${timeout}s"
    return 1
}

# Function to test HTTP endpoint
test_http_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local timeout=${3:-30}
    
    log_info "Testing HTTP endpoint: $url"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        
        if [[ "$status" == "$expected_status" ]]; then
            log_success "HTTP endpoint $url returned status $status"
            return 0
        fi
        
        sleep 2
    done
    
    log_error "HTTP endpoint $url failed to return status $expected_status within ${timeout}s"
    return 1
}

# Function to test WebSocket connection
test_websocket() {
    local url=$1
    local timeout=${2:-30}
    
    log_info "Testing WebSocket connection: $url"
    
    # Use a simple WebSocket test with timeout
    if timeout $timeout curl -i -N \
         -H "Connection: Upgrade" \
         -H "Upgrade: websocket" \
         -H "Sec-WebSocket-Key: test-key" \
         -H "Sec-WebSocket-Version: 13" \
         "$url" >/dev/null 2>&1; then
        log_success "WebSocket connection to $url successful"
        return 0
    else
        log_warning "WebSocket connection to $url failed (may be expected in some environments)"
        return 1
    fi
}

# Function to test database connectivity
test_database() {
    local host=$1
    local port=$2
    local database=$3
    local username=$4
    local timeout=${5:-30}
    
    log_info "Testing database connectivity: $username@$host:$port/$database"
    
    # Test with kubectl exec
    local pod_name=$(kubectl get pods -n governance-system -l app=postgresql -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [[ -z "$pod_name" ]]; then
        log_error "PostgreSQL pod not found"
        return 1
    fi
    
    # Test connectivity
    if kubectl exec -n governance-system $pod_name -- \
        psql -h $host -p $port -U $username -d $database -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "Database connectivity successful"
        return 0
    else
        log_error "Database connectivity failed"
        return 1
    fi
}

# Function to test Redis connectivity
test_redis() {
    local host=$1
    local port=$2
    local timeout=${3:-30}
    
    log_info "Testing Redis connectivity: $host:$port"
    
    # Test with kubectl exec
    local pod_name=$(kubectl get pods -n governance-system -l app=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [[ -z "$pod_name" ]]; then
        log_error "Redis pod not found"
        return 1
    fi
    
    # Test connectivity
    if kubectl exec -n governance-system $pod_name -- \
        redis-cli -h $host -p $port ping >/dev/null 2>&1; then
        log_success "Redis connectivity successful"
        return 0
    else
        log_error "Redis connectivity failed"
        return 1
    fi
}

# Function to test governance agent functionality
test_governance_agent() {
    log_test_start "Governance Agent Functionality"
    
    local base_url="http://governance-agent-service.$NAMESPACE.svc.cluster.local:8080"
    
    # Test health endpoint
    if ! test_http_endpoint "$base_url/health"; then
        log_test_result "Governance Agent Health" "FAIL" "Health endpoint not responding"
        return 1
    fi
    
    # Test readiness endpoint
    if ! test_http_endpoint "$base_url/ready"; then
        log_test_result "Governance Agent Readiness" "FAIL" "Readiness endpoint not responding"
        return 1
    fi
    
    # Test metrics endpoint
    if ! test_http_endpoint "$base_url/metrics"; then
        log_test_result "Governance Agent Metrics" "FAIL" "Metrics endpoint not responding"
        return 1
    fi
    
    # Test governance API
    local test_payload='{"pattern":"test-pattern","severity":"medium","description":"Test governance issue"}'
    if ! curl -X POST -H "Content-Type: application/json" -d "$test_payload" "$base_url/api/v1/governance/analyze" >/dev/null 2>&1; then
        log_test_result "Governance Agent API" "FAIL" "Governance API not responding"
        return 1
    fi
    
    log_test_result "Governance Agent Functionality" "PASS" "All endpoints responding correctly"
    return 0
}

# Function to test retro coach functionality
test_retro_coach() {
    log_test_start "Retro Coach Functionality"
    
    local base_url="http://retro-coach-service.$NAMESPACE.svc.cluster.local:8082"
    
    # Test health endpoint
    if ! test_http_endpoint "$base_url/health"; then
        log_test_result "Retro Coach Health" "FAIL" "Health endpoint not responding"
        return 1
    fi
    
    # Test retro API
    local test_payload='{"timeframe":"sprint","participants":["test-user"],"focus":["process","technical"]}'
    if ! curl -X POST -H "Content-Type: application/json" -d "$test_payload" "$base_url/api/v1/retro/conduct" >/dev/null 2>&1; then
        log_test_result "Retro Coach API" "FAIL" "Retro API not responding"
        return 1
    fi
    
    log_test_result "Retro Coach Functionality" "PASS" "All endpoints responding correctly"
    return 0
}

# Function to test WSJF calculator functionality
test_wsjf_calculator() {
    log_test_start "WSJF Calculator Functionality"
    
    local base_url="http://wsjf-calculator-service.$NAMESPACE.svc.cluster.local:8084"
    
    # Test health endpoint
    if ! test_http_endpoint "$base_url/health"; then
        log_test_result "WSJF Calculator Health" "FAIL" "Health endpoint not responding"
        return 1
    fi
    
    # Test WSJF calculation API
    local test_payload='{"userBusinessValue":10,"timeCriticality":8,"riskReduction":6,"jobDuration":3}'
    if ! curl -X POST -H "Content-Type: application/json" -d "$test_payload" "$base_url/api/v1/wsjf/calculate" >/dev/null 2>&1; then
        log_test_result "WSJF Calculator API" "FAIL" "WSJF API not responding"
        return 1
    fi
    
    log_test_result "WSJF Calculator Functionality" "PASS" "All endpoints responding correctly"
    return 0
}

# Function to test batching service functionality
test_batching_service() {
    log_test_start "Batching Service Functionality"
    
    local base_url="http://batching-service.$NAMESPACE.svc.cluster.local:8086"
    
    # Test health endpoint
    if ! test_http_endpoint "$base_url/health"; then
        log_test_result "Batching Service Health" "FAIL" "Health endpoint not responding"
        return 1
    fi
    
    # Test batch creation API
    local test_payload='{"items":[{"id":"test-1","riskLevel":3}],"policy":"conservative"}'
    if ! curl -X POST -H "Content-Type: application/json" -d "$test_payload" "$base_url/api/v1/batching/create-plan" >/dev/null 2>&1; then
        log_test_result "Batching Service API" "FAIL" "Batching API not responding"
        return 1
    fi
    
    log_test_result "Batching Service Functionality" "PASS" "All endpoints responding correctly"
    return 0
}

# Function to test analytics service functionality
test_analytics_service() {
    log_test_start "Analytics Service Functionality"
    
    local base_url="http://analytics-service.$NAMESPACE.svc.cluster.local:8088"
    
    # Test health endpoint
    if ! test_http_endpoint "$base_url/health"; then
        log_test_result "Analytics Service Health" "FAIL" "Health endpoint not responding"
        return 1
    fi
    
    # Test analytics generation API
    local test_payload='{"patterns":[],"insights":[],"timeWindow":30}'
    if ! curl -X POST -H "Content-Type: application/json" -d "$test_payload" "$base_url/api/v1/analytics/generate" >/dev/null 2>&1; then
        log_test_result "Analytics Service API" "FAIL" "Analytics API not responding"
        return 1
    fi
    
    log_test_result "Analytics Service Functionality" "PASS" "All endpoints responding correctly"
    return 0
}

# Function to test integration manager functionality
test_integration_manager() {
    log_test_start "Integration Manager Functionality"
    
    local base_url="http://integration-manager-service.$NAMESPACE.svc.cluster.local:8090"
    
    # Test health endpoint
    if ! test_http_endpoint "$base_url/health"; then
        log_test_result "Integration Manager Health" "FAIL" "Health endpoint not responding"
        return 1
    fi
    
    # Test WebSocket endpoint
    if ! test_websocket "ws://$base_url:8091"; then
        log_test_result "Integration Manager WebSocket" "WARN" "WebSocket not responding (may be expected)"
    else
        log_test_result "Integration Manager WebSocket" "PASS" "WebSocket responding correctly"
    fi
    
    log_test_result "Integration Manager Functionality" "PASS" "Core functionality working"
    return 0
}

# Function to test external integrations
test_external_integrations() {
    log_test_start "External Integrations"
    
    # Test GitLab integration (if configured)
    if [[ -n "${GITLAB_URL:-}" ]]; then
        if curl -f -s "$GITLAB_URL/api/v4/version" >/dev/null 2>&1; then
            log_test_result "GitLab Integration" "PASS" "GitLab API accessible"
        else
            log_test_result "GitLab Integration" "FAIL" "GitLab API not accessible"
        fi
    else
        log_test_result "GitLab Integration" "SKIP" "GitLab URL not configured"
    fi
    
    # Test Leantime integration (if configured)
    if [[ -n "${LEANTIME_URL:-}" ]]; then
        if curl -f -s "$LEANTIME_URL/api/v1/status" >/dev/null 2>&1; then
            log_test_result "Leantime Integration" "PASS" "Leantime API accessible"
        else
            log_test_result "Leantime Integration" "FAIL" "Leantime API not accessible"
        fi
    else
        log_test_result "Leantime Integration" "SKIP" "Leantime URL not configured"
    fi
    
    # Test Plane.so integration (if configured)
    if [[ -n "${PLANE_SO_URL:-}" ]]; then
        if curl -f -s "$PLANE_SO_URL/api/v1/workspace" >/dev/null 2>&1; then
            log_test_result "Plane.so Integration" "PASS" "Plane.so API accessible"
        else
            log_test_result "Plane.so Integration" "FAIL" "Plane.so API not accessible"
        fi
    else
        log_test_result "Plane.so Integration" "SKIP" "Plane.so URL not configured"
    fi
    
    return 0
}

# Function to test monitoring stack
test_monitoring_stack() {
    log_test_start "Monitoring Stack"
    
    # Test Prometheus
    if curl -f -s "http://prometheus.monitoring.svc.cluster.local:9090/-/healthy" >/dev/null 2>&1; then
        log_test_result "Prometheus Monitoring" "PASS" "Prometheus is healthy"
    else
        log_test_result "Prometheus Monitoring" "FAIL" "Prometheus not responding"
    fi
    
    # Test Grafana
    if curl -f -s "http://grafana.monitoring.svc.cluster.local:3000/api/health" >/dev/null 2>&1; then
        log_test_result "Grafana Monitoring" "PASS" "Grafana is healthy"
    else
        log_test_result "Grafana Monitoring" "FAIL" "Grafana not responding"
    fi
    
    return 0
}

# Function to test blue-green deployment
test_blue_green_deployment() {
    log_test_start "Blue-Green Deployment"
    
    # Check if both deployments exist
    local blue_exists=$(kubectl get deployment governance-agent-blue -n $NAMESPACE --no-headers 2>/dev/null || echo "not-found")
    local green_exists=$(kubectl get deployment governance-agent-green -n $NAMESPACE --no-headers 2>/dev/null || echo "not-found")
    
    if [[ "$blue_exists" == "not-found" && "$green_exists" == "not-found" ]]; then
        log_test_result "Blue-Green Deployment" "FAIL" "Neither blue nor green deployment found"
        return 1
    fi
    
    # Check service selector
    local active_color=$(kubectl get service governance-agent-service -n $NAMESPACE -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "unknown")
    
    if [[ "$active_color" != "blue" && "$active_color" != "green" ]]; then
        log_test_result "Blue-Green Deployment" "FAIL" "Service selector not pointing to blue or green"
        return 1
    fi
    
    log_test_result "Blue-Green Deployment" "PASS" "Blue-green deployment configured correctly"
    return 0
}

# Function to test security configurations
test_security_configurations() {
    log_test_start "Security Configurations"
    
    # Check for secrets in environment variables
    local secrets_in_env=$(env | grep -E "(PASSWORD|TOKEN|KEY|SECRET)" | wc -l)
    
    if [[ $secrets_in_env -gt 0 ]]; then
        log_test_result "Security Configurations" "FAIL" "Secrets found in environment variables"
        return 1
    fi
    
    # Check for non-root containers
    local non_root_containers=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].spec.securityContext.runAsNonRoot}' 2>/dev/null | grep -c "true" | wc -l)
    local total_containers=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].spec.containers[*].name}' 2>/dev/null | wc -l)
    
    if [[ $non_root_containers -lt $total_containers ]]; then
        log_test_result "Security Configurations" "FAIL" "Some containers running as root"
        return 1
    fi
    
    # Check for read-only root filesystem
    local readonly_rootfs=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].spec.securityContext.readOnlyRootFilesystem}' 2>/dev/null | grep -c "true" | wc -l)
    
    if [[ $readonly_rootfs -lt $total_containers ]]; then
        log_test_result "Security Configurations" "FAIL" "Some containers with writable root filesystem"
        return 1
    fi
    
    log_test_result "Security Configurations" "PASS" "Security configurations are correct"
    return 0
}

# Function to generate test report
generate_test_report() {
    local report_file="e2e-test-report-$(date +%Y%m%d-%H%M%S).json"
    
    log_info "Generating test report: $report_file"
    
    cat > "$report_file" << EOF
{
  "testSuite": "Governance Agents E2E Deployment Tests",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "namespace": "$NAMESPACE",
  "domain": "$DOMAIN",
  "summary": {
    "totalTests": $((TESTS_PASSED + TESTS_FAILED)),
    "passed": $TESTS_PASSED,
    "failed": $TESTS_FAILED,
    "successRate": $(echo "scale=2; $TESTS_PASSED * 100 / ($TESTS_PASSED + TESTS_FAILED)" | bc -l)
  },
  "results": [
EOF
    
    # Add test results
    for result in "${TEST_RESULTS[@]}"; do
        IFS=':' read -r -a parts <<< "$result"
        local test_name="${parts[0]}"
        local test_result="${parts[1]}"
        local test_details="${parts[2]}"
        
        cat >> "$report_file" << EOF
    {
      "testName": "$test_name",
      "result": "$test_result",
      "details": "$test_details",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    },
EOF
    done
    
    # Close JSON arrays
    cat >> "$report_file" << EOF
  ]
}
EOF
    
    log_success "Test report generated: $report_file"
    
    # Print summary
    echo ""
    echo "=== Test Summary ==="
    echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    echo "Success Rate: $(echo "scale=2; $TESTS_PASSED * 100 / ($TESTS_PASSED + TESTS_FAILED)" | bc -l)%"
    echo ""
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_success "All tests passed!"
        return 0
    else
        log_error "Some tests failed!"
        return 1
    fi
}

# Main test execution
main() {
    echo "========================================"
    echo "Governance Agents E2E Deployment Tests"
    echo "========================================"
    echo ""
    
    # Check dependencies
    for cmd in kubectl curl jq; do
        if ! command -v $cmd >/dev/null 2>&1; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Set environment from command line or default
    local environment=${1:-staging}
    export ENVIRONMENT=$environment
    
    log_info "Running tests against environment: $environment"
    
    # Run all tests
    test_governance_agent
    test_retro_coach
    test_wsjf_calculator
    test_batching_service
    test_analytics_service
    test_integration_manager
    test_external_integrations
    test_monitoring_stack
    test_blue_green_deployment
    test_security_configurations
    
    # Generate report
    generate_test_report
}

# Execute main function with all arguments
main "$@"