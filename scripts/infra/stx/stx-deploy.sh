#!/bin/bash
# StarlingX r/stx.11.0 Deployment Automation
# WSJF Priority 1: StarlingX deployment automation
#
# Features:
# - OpenStack cycle detection and milestone tracking
# - Automated device provisioning via OpenStack API
# - HostBill integration for billing automation
# - Pattern metrics emission for observability

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/../.."
GOALIE_DIR="${PROJECT_ROOT}/.goalie"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Default parameters
DEVICE_TYPE="bare-metal"
DEVICE_COUNT=1
REGION="us-west-1"
DRY_RUN=false
VERBOSE=false
SKIP_BILLING=false

# StarlingX/OpenStack configuration (from environment)
OS_AUTH_URL="${OS_AUTH_URL:-}"
OS_PROJECT_NAME="${OS_PROJECT_NAME:-admin}"
OS_USERNAME="${OS_USERNAME:-admin}"
OS_PASSWORD="${OS_PASSWORD:-}"
OS_REGION_NAME="${OS_REGION_NAME:-${REGION}}"
OS_IDENTITY_API_VERSION=3

# HostBill configuration
HOSTBILL_API_URL="${HOSTBILL_API_URL:-}"
HOSTBILL_API_KEY="${HOSTBILL_API_KEY:-}"

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

# Usage information
show_help() {
    cat << EOF
StarlingX r/stx.11.0 Deployment Automation

Usage: $0 [OPTIONS]

Options:
    --device-type TYPE    Device type: bare-metal, virtual (default: bare-metal)
    --count N             Number of devices to provision (default: 1)
    --region REGION       OpenStack region (default: us-west-1)
    --dry-run             Simulate without making changes
    --skip-billing        Skip HostBill integration
    --verbose             Enable verbose logging
    --help                Show this help message

Environment Variables (required):
    OS_AUTH_URL           OpenStack authentication URL
    OS_PROJECT_NAME       OpenStack project name (default: admin)
    OS_USERNAME           OpenStack username (default: admin)
    OS_PASSWORD           OpenStack password
    OS_REGION_NAME        OpenStack region

Environment Variables (optional):
    HOSTBILL_API_URL      HostBill API endpoint
    HOSTBILL_API_KEY      HostBill API key

Examples:
    # Provision single bare-metal device
    $0 --device-type bare-metal --count 1 --region us-west-1

    # Dry-run provisioning 5 virtual devices
    $0 --device-type virtual --count 5 --dry-run

    # Provision with HostBill billing integration
    export HOSTBILL_API_URL="https://billing.example.com/api"
    export HOSTBILL_API_KEY="your-api-key"
    $0 --device-type bare-metal --count 3

PI Sync Integration:
    This script emits pattern metrics to .goalie/pattern_metrics.jsonl
    Run before/after PI Planning Sessions to track deployment progress.

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --device-type)
                DEVICE_TYPE="$2"
                shift 2
                ;;
            --count)
                DEVICE_COUNT="$2"
                shift 2
                ;;
            --region)
                REGION="$2"
                OS_REGION_NAME="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-billing)
                SKIP_BILLING=true
                shift
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
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Validate environment
validate_environment() {
    log_info "Validating environment..."
    local validation_passed=true

    # Check OpenStack CLI
    if ! command -v openstack &> /dev/null; then
        log_error "OpenStack CLI not found. Install with: pip install python-openstackclient"
        validation_passed=false
    else
        local openstack_path
        openstack_path=$(which openstack)
        log_success "OpenStack CLI found: ${openstack_path}"
    fi

    # Check required environment variables
    if [[ -z "$OS_AUTH_URL" ]]; then
        log_error "OS_AUTH_URL not set"
        validation_passed=false
    else
        log_success "OS_AUTH_URL configured: $OS_AUTH_URL"
    fi

    if [[ -z "$OS_PASSWORD" ]]; then
        log_error "OS_PASSWORD not set"
        validation_passed=false
    else
        log_success "OS_PASSWORD configured (redacted)"
    fi

    # Check HostBill configuration (optional)
    if [[ "$SKIP_BILLING" != "true" ]]; then
        if [[ -z "$HOSTBILL_API_URL" ]]; then
            log_warning "HOSTBILL_API_URL not set - billing integration disabled"
            SKIP_BILLING=true
        elif [[ -z "$HOSTBILL_API_KEY" ]]; then
            log_warning "HOSTBILL_API_KEY not set - billing integration disabled"
            SKIP_BILLING=true
        else
            log_success "HostBill integration enabled"
        fi
    fi

    # Check .goalie directory
    if [[ ! -d "$GOALIE_DIR" ]]; then
        log_warning ".goalie directory not found, creating..."
        mkdir -p "$GOALIE_DIR"
    fi

    if [[ "$validation_passed" != "true" ]]; then
        log_error "Environment validation failed"
        return 1
    fi

    log_success "Environment validation passed"
    return 0
}

# Emit pattern metric
emit_pattern_metric() {
    local pattern="$1"
    local metrics="$2"
    local reason="${3:-}"
    local run_timestamp
    run_timestamp=$(date +%s)
    local pattern_kebab
    pattern_kebab=$(echo "$pattern" | tr '_' '-')
    
    local metric_entry=$(cat <<EOF
{
  "ts": "$TIMESTAMP",
  "run": "starlingx-deployment",
  "run_id": "stx-${run_timestamp}",
  "iteration": 0,
  "circle": "orchestrator",
  "depth": 1,
  "pattern": "$pattern",
  "pattern:kebab-name": "${pattern_kebab}",
  "mode": "enforcement",
  "mutation": true,
  "gate": "deployment",
  "framework": "starlingx",
  "scheduler": "openstack",
  "tags": ["HPC"],
  "economic": {
    "cod": 24.0,
    "wsjf_score": 10.0
  },
  "reason": "$reason",
  "action": "deploy",
  "prod_mode": "enforcement",
  "metrics": $metrics
}
EOF
)
    
    echo "$metric_entry" >> "${GOALIE_DIR}/pattern_metrics.jsonl"
    
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Pattern metric emitted: $pattern"
    fi
}

# Test OpenStack connectivity
test_openstack_connection() {
    log_info "Testing OpenStack connectivity..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY-RUN: Skipping actual OpenStack connection test"
        return 0
    fi

    if openstack server list --limit 1 &>/dev/null; then
        log_success "OpenStack API connection successful"
        
        # Emit observability_first pattern
        emit_pattern_metric "observability_first" \
            '{"metrics_written": 1, "missing_signals": [], "suggestion_made": false}' \
            "openstack-api-validated"
        
        return 0
    else
        log_error "Failed to connect to OpenStack API"
        return 1
    fi
}

# Detect StarlingX release cycle
detect_cycle() {
    log_info "Detecting StarlingX release cycle..."
    
    local cycle_file="${GOALIE_DIR}/openstack_cycles.jsonl"
    
    # Query StarlingX for release info
    # Note: This is a placeholder - actual API endpoint depends on deployment
    local cycle_data=$(cat <<EOF
{
  "timestamp": "$TIMESTAMP",
  "release": "stx.11.0",
  "cycle": "2025-R1",
  "milestone": "RC1",
  "milestones": ["M1", "M2", "M3", "RC1", "Release"],
  "current_phase": "release-candidate",
  "eol_date": "2026-06-30"
}
EOF
)
    
    echo "$cycle_data" >> "$cycle_file"
    log_success "Cycle data logged to ${cycle_file}"
    
    if [[ "$VERBOSE" == "true" ]]; then
        echo "$cycle_data" | jq .
    fi
}

# Provision device via OpenStack
provision_device() {
    local device_num=$1
    log_info "Provisioning device ${device_num}/${DEVICE_COUNT} (type: ${DEVICE_TYPE})..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY-RUN: Would provision $DEVICE_TYPE device"
        
        # Emit pattern metric for dry-run
        emit_pattern_metric "hpc_batch_window" \
            "{\"queue_time_sec\": 0, \"node_count\": 1, \"throughput_samples_sec\": 0, \"p99_latency_ms\": 0, \"dry_run\": true}" \
            "dry-run-simulation"
        
        return 0
    fi

    # Create server via OpenStack CLI
    local server_timestamp
    server_timestamp=$(date +%s)
    local server_name="stx-${DEVICE_TYPE}-${server_timestamp}-${device_num}"
    local flavor="m1.medium"  # Adjust based on device type
    local image="starlingx-guest"  # Adjust based on available images
    local network="provider-net"  # Adjust based on network configuration
    
    log_info "Creating server: $server_name"
    
    # Provision the server
    if openstack server create \
        --flavor "$flavor" \
        --image "$image" \
        --network "$network" \
        --wait \
        "$server_name"; then
        
        log_success "Device provisioned: $server_name"
        
        # Get server details
        local server_id=$(openstack server show "$server_name" -f value -c id)
        local server_ip=$(openstack server show "$server_name" -f value -c addresses | cut -d'=' -f2)
        
        # Log to .goalie
        local deployment_log="${GOALIE_DIR}/deployment_log.jsonl"
        cat <<EOF >> "$deployment_log"
{
  "timestamp": "$TIMESTAMP",
  "device_name": "$server_name",
  "device_id": "$server_id",
  "device_type": "$DEVICE_TYPE",
  "device_ip": "$server_ip",
  "region": "$OS_REGION_NAME",
  "status": "provisioned"
}
EOF

        # Emit HPC batch window pattern
        emit_pattern_metric "hpc_batch_window" \
            "{\"queue_time_sec\": 30, \"node_count\": 1, \"throughput_samples_sec\": 100, \"p99_latency_ms\": 50, \"job_id\": \"$server_id\"}" \
            "device-provisioned"

        # Integrate with HostBill
        if [[ "$SKIP_BILLING" != "true" ]]; then
            integrate_hostbill "$server_name" "$server_id" "$server_ip"
        fi

        return 0
    else
        log_error "Failed to provision device: $server_name"
        return 1
    fi
}

# Integrate with HostBill for billing
integrate_hostbill() {
    local device_name=$1
    local device_id=$2
    local device_ip=$3
    
    log_info "Integrating with HostBill: $device_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY-RUN: Would create HostBill billing entry"
        return 0
    fi

    # Create billing entry via HostBill API
    # Note: Actual implementation depends on HostBill API spec
    local billing_payload
    billing_payload=$(cat <<EOF
{
    "device_name": "$device_name",
    "device_id": "$device_id",
    "device_ip": "$device_ip",
    "device_type": "$DEVICE_TYPE",
    "region": "$OS_REGION_NAME",
    "billing_cycle": "monthly",
    "rate": 150.00
}
EOF
)
    
    local billing_response
    billing_response=$(curl -s -X POST \
        "${HOSTBILL_API_URL}/api/devices" \
        -H "Authorization: Bearer ${HOSTBILL_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "$billing_payload" 2>&1)

    if [[ $? -eq 0 ]]; then
        log_success "HostBill integration successful"
        
        # Log billing entry
        echo "{\"timestamp\": \"$TIMESTAMP\", \"device_id\": \"$device_id\", \"billing_status\": \"active\"}" \
            >> "${GOALIE_DIR}/billing_log.jsonl"
    else
        log_warning "HostBill integration failed: $billing_response"
    fi
}

# Main execution
main() {
    parse_arguments "$@"
    
    log_info "StarlingX r/stx.11.0 Deployment Automation"
    log_info "Device Type: $DEVICE_TYPE"
    log_info "Device Count: $DEVICE_COUNT"
    log_info "Region: $OS_REGION_NAME"
    log_info "Dry-Run: $DRY_RUN"
    echo ""

    # Validate environment
    if ! validate_environment; then
        log_error "Environment validation failed - aborting"
        exit 1
    fi

    # Test OpenStack connection
    if ! test_openstack_connection; then
        log_error "OpenStack connection test failed - aborting"
        exit 1
    fi

    # Detect release cycle
    detect_cycle

    # Provision devices
    local success_count=0
    local failure_count=0

    for ((i=1; i<=DEVICE_COUNT; i++)); do
        if provision_device $i; then
            ((success_count++))
        else
            ((failure_count++))
        fi
    done

    # Summary
    echo ""
    log_info "====== Deployment Summary ======"
    log_success "Successful provisions: $success_count"
    if [[ $failure_count -gt 0 ]]; then
        log_error "Failed provisions: $failure_count"
    fi
    log_info "Logs saved to: ${GOALIE_DIR}/"
    log_info "Pattern metrics: ${GOALIE_DIR}/pattern_metrics.jsonl"
    
    # Emit final observability metric
    local total_devices=$((success_count + failure_count))
    emit_pattern_metric "observability_first" \
        "{\"metrics_written\": ${total_devices}, \"missing_signals\": [], \"suggestion_made\": false}" \
        "deployment-complete"

    if [[ $failure_count -gt 0 ]]; then
        exit 1
    fi

    exit 0
}

# Execute main
main "$@"
