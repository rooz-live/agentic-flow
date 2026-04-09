#!/bin/bash

# Blue-Green Deployment Script for Governance Agents
# This script implements blue-green deployment strategy with automatic rollback capabilities

set -euo pipefail

# Configuration
NAMESPACE="governance-system"
SERVICE_NAME="governance-agent-service"
BLUE_DEPLOYMENT="governance-agent-blue"
GREEN_DEPLOYMENT="governance-agent-green"
HEALTH_CHECK_TIMEOUT=300
SMOKE_TEST_TIMEOUT=60
ROLLBACK_TIMEOUT=180

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for deployment rollout
wait_for_rollout() {
    local deployment_name=$1
    local timeout=$2
    
    log_info "Waiting for deployment $deployment_name to rollout..."
    
    if ! kubectl rollout status deployment/$deployment_name -n $NAMESPACE --timeout=${timeout}s; then
        log_error "Deployment $deployment_name failed to rollout within ${timeout}s"
        return 1
    fi
    
    # Check if deployment is successful
    local replicas=$(kubectl get deployment $deployment_name -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    local ready_replicas=$(kubectl get deployment $deployment_name -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    
    if [[ "$replicas" == "$ready_replicas" && "$replicas" -gt 0 ]]; then
        log_success "Deployment $deployment_name is ready with $replicas replicas"
        return 0
    else
        log_error "Deployment $deployment_name is not ready. Replicas: $replicas, Ready: $ready_replicas"
        return 1
    fi
}

# Function to perform health check
health_check() {
    local service_url=$1
    local timeout=$2
    
    log_info "Performing health check on $service_url..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        if curl -f -s "$service_url/health" >/dev/null 2>&1; then
            log_success "Health check passed for $service_url"
            return 0
        fi
        
        sleep 5
    done
    
    log_error "Health check failed for $service_url within ${timeout}s"
    return 1
}

# Function to run smoke tests
run_smoke_tests() {
    local service_url=$1
    
    log_info "Running smoke tests on $service_url..."
    
    # Test basic endpoints
    local endpoints=("/health" "/ready" "/metrics" "/api/v1/status")
    
    for endpoint in "${endpoints[@]}"; do
        if ! curl -f -s "$service_url$endpoint" >/dev/null 2>&1; then
            log_error "Smoke test failed for endpoint: $endpoint"
            return 1
        fi
    done
    
    # Test WebSocket connection
    if ! curl -i -N -H "Connection: Upgrade" \
         -H "Upgrade: websocket" \
         -H "Sec-WebSocket-Key: test" \
         -H "Sec-WebSocket-Version: 13" \
         "$service_url/ws" >/dev/null 2>&1; then
        log_warning "WebSocket test failed (this may be expected in some environments)"
    fi
    
    log_success "Smoke tests passed for $service_url"
    return 0
}

# Function to switch traffic
switch_traffic() {
    local target_color=$1
    
    log_info "Switching traffic to $target_color deployment..."
    
    # Update service selector to point to target color
    kubectl patch service $SERVICE_NAME -n $NAMESPACE \
        -p '{"spec":{"selector":{"version":"'$target_color'"}}}'
    
    log_success "Traffic switched to $target_color deployment"
}

# Function to verify traffic switch
verify_traffic_switch() {
    local service_url=$1
    local expected_version=$2
    
    log_info "Verifying traffic switch to $expected_version..."
    
    # Wait a bit for DNS/load balancer to update
    sleep 10
    
    # Check version endpoint to confirm traffic routing
    local version=$(curl -s "$service_url/api/v1/version" | jq -r '.version // empty')
    
    if [[ "$version" == *"$expected_version"* ]]; then
        log_success "Traffic verification passed. Serving version: $version"
        return 0
    else
        log_error "Traffic verification failed. Expected: $expected_version, Got: $version"
        return 1
    fi
}

# Function to rollback deployment
rollback_deployment() {
    local failed_color=$1
    local success_color=$2
    
    log_warning "Initiating rollback from $failed_color to $success_color..."
    
    # Switch traffic back to successful deployment
    switch_traffic $success_color
    
    # Wait for traffic switch to take effect
    sleep 10
    
    # Verify rollback
    if verify_traffic_switch "http://$SERVICE_NAME" $success_color; then
        log_success "Rollback completed successfully"
        return 0
    else
        log_error "Rollback verification failed"
        return 1
    fi
}

# Function to cleanup old deployment
cleanup_deployment() {
    local old_color=$1
    
    log_info "Cleaning up old $old_color deployment..."
    
    # Scale down old deployment
    kubectl scale deployment $SERVICE_NAME-$old_color -n $NAMESPACE --replicas=0
    
    # Wait for pods to terminate
    kubectl wait --for=delete pod -l app=$SERVICE_NAME-$old_color -n $NAMESPACE --timeout=60s
    
    # Delete old deployment
    kubectl delete deployment $SERVICE_NAME-$old_color -n $NAMESPACE --ignore-not-found=true
    
    log_success "Cleanup completed for $old_color deployment"
}

# Main deployment function
deploy_blue_green() {
    local image_tag=$1
    local environment=${2:-staging}
    
    log_info "Starting blue-green deployment for image: $image_tag"
    
    # Determine active and inactive colors
    local current_color=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}' || echo "blue")
    local new_color="green"
    
    if [[ "$current_color" == "green" ]]; then
        new_color="blue"
    fi
    
    local inactive_color="green"
    if [[ "$new_color" == "green" ]]; then
        inactive_color="blue"
    fi
    
    log_info "Current active color: $current_color"
    log_info "Deploying new version to: $new_color"
    log_info "Inactive color for cleanup: $inactive_color"
    
    # Deploy new version to inactive color
    log_info "Deploying image $image_tag to $SERVICE_NAME-$new_color..."
    
    helm upgrade --install $SERVICE_NAME-$new_color ./deployment/helm/governance-agents \
        --namespace $NAMESPACE \
        --set image.tag=$image_tag \
        --set environment=$environment \
        --set deployment.color=$new_color \
        --set governanceAgent.enabled=true \
        --set retroCoach.enabled=true \
        --set wsjfCalculator.enabled=true \
        --set batchingService.enabled=true \
        --set analyticsService.enabled=true \
        --set integrationManager.enabled=true \
        --wait \
        --timeout=$HEALTH_CHECK_TIMEOUT
    
    # Wait for new deployment to be ready
    if ! wait_for_rollout $SERVICE_NAME-$new_color $HEALTH_CHECK_TIMEOUT; then
        log_error "New deployment failed to become ready"
        return 1
    fi
    
    # Get service URL for health checks
    local service_url="http://$SERVICE_NAME-$new_color"
    
    # Perform health checks on new deployment
    if ! health_check "$service_url" $HEALTH_CHECK_TIMEOUT; then
        log_error "Health checks failed for new deployment"
        return 1
    fi
    
    # Run smoke tests on new deployment
    if ! run_smoke_tests "$service_url"; then
        log_error "Smoke tests failed for new deployment"
        return 1
    fi
    
    # Switch traffic to new deployment
    switch_traffic $new_color
    
    # Verify traffic switch
    if ! verify_traffic_switch "http://$SERVICE_NAME" $new_color; then
        log_error "Traffic switch verification failed"
        
        # Attempt rollback
        if rollback_deployment $new_color $current_color; then
            log_success "Rollback completed successfully"
        else
            log_error "Rollback also failed - MANUAL INTERVENTION REQUIRED"
        fi
        
        return 1
    fi
    
    # Final smoke tests after traffic switch
    if ! run_smoke_tests "http://$SERVICE_NAME"; then
        log_error "Post-switch smoke tests failed"
        
        # Attempt rollback
        if rollback_deployment $new_color $current_color; then
            log_success "Rollback completed successfully"
        else
            log_error "Rollback also failed - MANUAL INTERVENTION REQUIRED"
        fi
        
        return 1
    fi
    
    # Cleanup old deployment if everything is successful
    cleanup_deployment $inactive_color
    
    log_success "Blue-green deployment completed successfully"
    log_info "Active deployment: $new_color"
    log_info "Service URL: http://$SERVICE_NAME"
    
    return 0
}

# Function to handle deployment status
get_deployment_status() {
    local color=$1
    
    kubectl get deployment $SERVICE_NAME-$color -n $NAMESPACE \
        -o jsonpath='{.status.conditions[?(@.type=="Progressing")].status}' 2>/dev/null || echo "Unknown"
}

# Function to show deployment status
show_status() {
    echo ""
    echo "=== Blue-Green Deployment Status ==="
    echo ""
    
    # Show service selector
    local current_color=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}' || echo "Unknown")
    echo "Current Active Color: $current_color"
    
    # Show deployment statuses
    for color in blue green; do
        local status=$(get_deployment_status $color)
        local replicas=$(kubectl get deployment $SERVICE_NAME-$color -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        local ready=$(kubectl get deployment $SERVICE_NAME-$color -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        
        echo "$color Deployment: $status ($ready/$replicas replicas ready)"
    done
    
    echo ""
    echo "=== Endpoints ==="
    echo "Service: http://$SERVICE_NAME"
    echo "Blue: http://$SERVICE_NAME-blue"
    echo "Green: http://$SERVICE_NAME-green"
    echo ""
}

# Function to handle rollback
perform_rollback() {
    local target_color=${1:-}
    
    if [[ -z "$target_color" ]]; then
        # Auto-detect which color to rollback to
        local current_color=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}' || echo "Unknown")
        
        if [[ "$current_color" == "blue" ]]; then
            target_color="green"
        else
            target_color="blue"
        fi
    fi
    
    log_info "Rolling back to $target_color deployment..."
    
    local current_color=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}' || echo "Unknown")
    
    if rollback_deployment $current_color $target_color; then
        log_success "Rollback completed successfully"
        return 0
    else
        log_error "Rollback failed"
        return 1
    fi
}

# Main script logic
main() {
    # Check dependencies
    for cmd in kubectl curl jq helm; do
        if ! command_exists $cmd; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Parse command line arguments
    case "${1:-}" in
        "deploy")
            if [[ $# -lt 2 ]]; then
                log_error "Usage: $0 deploy <image_tag> [environment]"
                exit 1
            fi
            deploy_blue_green "$2" "${3:-staging}"
            ;;
        "status")
            show_status
            ;;
        "rollback")
            perform_rollback "$2"
            ;;
        "health")
            local color=${2:-$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}' || echo "blue")}
            health_check "http://$SERVICE_NAME-$color" $HEALTH_CHECK_TIMEOUT
            ;;
        *)
            echo "Usage: $0 {deploy|status|rollback|health} [options]"
            echo ""
            echo "Commands:"
            echo "  deploy <image_tag> [environment]  - Deploy new version using blue-green strategy"
            echo "  status                              - Show current deployment status"
            echo "  rollback [color]                     - Rollback to specified color (auto-detect if not specified)"
            echo "  health [color]                       - Perform health check on specified color"
            echo ""
            echo "Examples:"
            echo "  $0 deploy v2.1.0 production"
            echo "  $0 status"
            echo "  $0 rollback blue"
            echo "  $0 health green"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"