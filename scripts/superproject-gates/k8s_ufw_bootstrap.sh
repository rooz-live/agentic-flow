#!/usr/bin/env bash
#
# Kubernetes UFW Firewall Bootstrap Script
# 
# Configures comprehensive firewall rules for Kubernetes nodes with:
# - Control plane ports (API server, etcd, scheduler, controller-manager)
# - Worker node ports (kubelet, NodePort range)
# - CNI overlay network ports (Flannel, Calico, Cilium)
# - DNS and monitoring ports
# - Pod and Service network CIDR access
#
# Usage: ./k8s_ufw_bootstrap.sh [--role control-plane|worker|all] [--dry-run] [--verify]
#
# Environment Variables:
#   K8S_POD_CIDR         - Pod network CIDR (default: 10.244.0.0/16)
#   K8S_SERVICE_CIDR     - Service network CIDR (default: 10.96.0.0/12)
#   K8S_NODE_IP          - Node IP for source restrictions (optional)
#   K8S_CNI_TYPE         - CNI type: flannel, calico, cilium (default: flannel)
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${LOG_FILE:-/var/log/k8s-ufw-bootstrap.log}"

# Network CIDRs
K8S_POD_CIDR="${K8S_POD_CIDR:-10.244.0.0/16}"
K8S_SERVICE_CIDR="${K8S_SERVICE_CIDR:-10.96.0.0/12}"
K8S_NODE_IP="${K8S_NODE_IP:-}"
K8S_CNI_TYPE="${K8S_CNI_TYPE:-flannel}"

# Node role (control-plane, worker, all)
NODE_ROLE="${1:-all}"
DRY_RUN=false
VERIFY_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --role)
            NODE_ROLE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verify)
            VERIFY_ONLY=true
            shift
            ;;
        --pod-cidr)
            K8S_POD_CIDR="$2"
            shift 2
            ;;
        --service-cidr)
            K8S_SERVICE_CIDR="$2"
            shift 2
            ;;
        --cni)
            K8S_CNI_TYPE="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --role ROLE      Node role: control-plane, worker, all (default: all)"
            echo "  --dry-run        Show commands without executing"
            echo "  --verify         Only verify existing rules"
            echo "  --pod-cidr CIDR  Pod network CIDR (default: 10.244.0.0/16)"
            echo "  --service-cidr CIDR  Service network CIDR (default: 10.96.0.0/12)"
            echo "  --cni TYPE       CNI type: flannel, calico, cilium (default: flannel)"
            echo ""
            echo "Environment Variables:"
            echo "  K8S_POD_CIDR, K8S_SERVICE_CIDR, K8S_NODE_IP, K8S_CNI_TYPE"
            exit 0
            ;;
        *)
            NODE_ROLE="$1"
            shift
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "${timestamp} [${level}] ${message}"
}

info() { log "INFO" "${GREEN}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
debug() { [[ "${VERBOSE:-false}" == "true" ]] && log "DEBUG" "${BLUE}$*${NC}"; }

# Execute UFW command (respects dry-run)
ufw_cmd() {
    local cmd="sudo ufw $*"
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY-RUN] $cmd"
        return 0
    fi
    debug "Executing: $cmd"
    eval "$cmd" 2>/dev/null || true
}

# Check if rule already exists
rule_exists() {
    local rule="$*"
    sudo ufw status | grep -qF "$rule" 2>/dev/null
}

# Add rule if not exists (idempotent)
add_rule() {
    local rule="$*"
    local comment="${K8S_RULE_COMMENT:-}"
    
    # Check if similar rule exists
    if sudo ufw status verbose | grep -qE "$rule" 2>/dev/null; then
        debug "Rule already exists: $rule"
        return 0
    fi
    
    info "Adding rule: $rule"
    if [[ -n "$comment" ]]; then
        ufw_cmd allow "$rule" comment "\"$comment\""
    else
        ufw_cmd allow "$rule"
    fi
}

# Add from-CIDR rule
add_from_cidr() {
    local cidr="$1"
    local comment="$2"
    
    if sudo ufw status | grep -qF "$cidr" 2>/dev/null; then
        debug "CIDR rule already exists: $cidr"
        return 0
    fi
    
    info "Adding CIDR rule: from $cidr to any ($comment)"
    ufw_cmd allow from "$cidr" to any comment "\"$comment\""
}

# Add port rule with optional source restriction
add_port_rule() {
    local port="$1"
    local proto="${2:-tcp}"
    local comment="${3:-}"
    local source="${4:-}"
    
    if [[ -n "$source" ]]; then
        info "Adding port rule: $port/$proto from $source ($comment)"
        ufw_cmd allow from "$source" to any port "$port" proto "$proto" comment "\"$comment\""
    else
        info "Adding port rule: $port/$proto ($comment)"
        ufw_cmd allow "$port/$proto" comment "\"$comment\""
    fi
}

# Verify UFW is installed and available
check_ufw() {
    if ! command -v ufw &>/dev/null; then
        error "UFW is not installed. Install with: apt install ufw"
        exit 1
    fi
    
    if ! sudo ufw status &>/dev/null; then
        error "Cannot access UFW. Ensure you have sudo privileges."
        exit 1
    fi
}

# Enable UFW if not already enabled
enable_ufw() {
    local status
    status=$(sudo ufw status | head -1)
    
    if [[ "$status" == "Status: inactive" ]]; then
        warn "UFW is currently inactive"
        if [[ "$DRY_RUN" == "false" ]]; then
            info "Enabling UFW..."
            echo "y" | sudo ufw enable
        else
            echo "[DRY-RUN] Would enable UFW"
        fi
    else
        info "UFW is already active"
    fi
}

# Configure control plane ports
configure_control_plane() {
    info "=== Configuring Control Plane Ports ==="
    
    # Kubernetes API Server
    add_port_rule 6443 tcp "K8s API Server"
    
    # etcd client and peer ports
    add_port_rule 2379 tcp "etcd client"
    add_port_rule 2380 tcp "etcd peer"
    
    # kube-scheduler
    add_port_rule 10259 tcp "kube-scheduler"
    
    # kube-controller-manager
    add_port_rule 10257 tcp "kube-controller-manager"
}

# Configure worker node ports
configure_worker() {
    info "=== Configuring Worker Node Ports ==="
    
    # Kubelet API
    add_port_rule 10250 tcp "Kubelet API"
    
    # Kubelet healthz (read-only)
    add_port_rule 10248 tcp "Kubelet healthz"
    
    # NodePort services range
    add_port_rule "30000:32767" tcp "K8s NodePort TCP"
    add_port_rule "30000:32767" udp "K8s NodePort UDP"
}

# Configure CNI-specific ports
configure_cni() {
    local cni_type="$1"
    info "=== Configuring CNI Ports ($cni_type) ==="
    
    case "$cni_type" in
        flannel)
            # VXLAN encapsulation
            add_port_rule 8472 udp "Flannel VXLAN"
            ;;
        calico)
            # BGP for routing
            add_port_rule 179 tcp "Calico BGP"
            # VXLAN
            add_port_rule 4789 udp "Calico VXLAN"
            # Typha
            add_port_rule 5473 tcp "Calico Typha"
            # Wireguard (if used)
            add_port_rule 51820 udp "Calico Wireguard"
            add_port_rule 51821 udp "Calico Wireguard v6"
            ;;
        cilium)
            # VXLAN
            add_port_rule 8472 udp "Cilium VXLAN"
            # Health checks
            add_port_rule 4240 tcp "Cilium health"
            # Hubble
            add_port_rule 4244 tcp "Cilium Hubble"
            # Wireguard
            add_port_rule 51871 udp "Cilium Wireguard"
            ;;
        weave)
            add_port_rule 6783 tcp "Weave control"
            add_port_rule 6783 udp "Weave data"
            add_port_rule 6784 udp "Weave data"
            ;;
        *)
            warn "Unknown CNI type: $cni_type. Skipping CNI-specific ports."
            ;;
    esac
}

# Configure DNS ports
configure_dns() {
    info "=== Configuring DNS Ports ==="
    
    # CoreDNS
    add_port_rule 53 tcp "CoreDNS TCP"
    add_port_rule 53 udp "CoreDNS UDP"
    
    # DNS metrics
    add_port_rule 9153 tcp "CoreDNS metrics"
}

# Configure pod and service network access
configure_cluster_networks() {
    info "=== Configuring Cluster Network Access ==="
    
    # Pod network CIDR
    add_from_cidr "$K8S_POD_CIDR" "K8s pod network"
    
    # Service network CIDR
    add_from_cidr "$K8S_SERVICE_CIDR" "K8s service network"
}

# Configure monitoring ports
configure_monitoring() {
    info "=== Configuring Monitoring Ports ==="
    
    # Prometheus metrics (common ports)
    add_port_rule 9090 tcp "Prometheus server"
    add_port_rule 9093 tcp "Alertmanager"
    add_port_rule 9094 tcp "Alertmanager cluster"
    
    # Node exporter
    add_port_rule 9100 tcp "Node exporter"
    
    # kube-state-metrics
    add_port_rule 8080 tcp "kube-state-metrics HTTP"
    add_port_rule 8081 tcp "kube-state-metrics telemetry"
    
    # Grafana
    add_port_rule 3000 tcp "Grafana"
}

# Verify all K8s-related rules are in place
verify_rules() {
    info "=== Verifying UFW Rules ==="
    
    local required_rules=(
        "6443/tcp"      # API Server
        "10250/tcp"     # Kubelet
        "53/tcp"        # CoreDNS
        "53/udp"        # CoreDNS
        "$K8S_POD_CIDR" # Pod network
        "$K8S_SERVICE_CIDR" # Service network
    )
    
    local missing=0
    local found=0
    
    for rule in "${required_rules[@]}"; do
        if sudo ufw status | grep -qF "$rule"; then
            echo -e "  ${GREEN}✓${NC} $rule"
            ((found++))
        else
            echo -e "  ${RED}✗${NC} $rule (MISSING)"
            ((missing++))
        fi
    done
    
    echo ""
    echo "Summary: $found found, $missing missing"
    
    if [[ $missing -gt 0 ]]; then
        warn "Some required rules are missing. Run without --verify to add them."
        return 1
    else
        info "All required K8s rules are in place."
        return 0
    fi
}

# Test cluster connectivity after rule changes
test_connectivity() {
    info "=== Testing Cluster Connectivity ==="
    
    # Test kubectl access
    if command -v kubectl &>/dev/null; then
        if kubectl cluster-info &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} kubectl cluster-info: OK"
        else
            echo -e "  ${RED}✗${NC} kubectl cluster-info: FAILED"
        fi
        
        # Test DNS resolution
        if kubectl run dns-test --image=busybox:1.28 --rm -it --restart=Never \
            --command -- nslookup kubernetes.default &>/dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} DNS resolution: OK"
        else
            echo -e "  ${YELLOW}!${NC} DNS resolution: Could not verify (may need manual check)"
        fi
    else
        warn "kubectl not available, skipping connectivity tests"
    fi
}

# Generate rollback script
generate_rollback() {
    local rollback_file="/tmp/k8s-ufw-rollback-$(date +%Y%m%d-%H%M%S).sh"
    
    info "Generating rollback script: $rollback_file"
    
    cat > "$rollback_file" << 'ROLLBACK_EOF'
#!/bin/bash
# K8s UFW Rollback Script
# Generated by k8s_ufw_bootstrap.sh

set -e

echo "Removing K8s UFW rules..."

# Remove port rules
for port in 6443 2379 2380 10250 10257 10259 10248 53 9090 9093 9094 9100 3000 8080 8081 8472 179 4789; do
    sudo ufw delete allow ${port}/tcp 2>/dev/null || true
    sudo ufw delete allow ${port}/udp 2>/dev/null || true
done

# Remove NodePort range
sudo ufw delete allow 30000:32767/tcp 2>/dev/null || true
sudo ufw delete allow 30000:32767/udp 2>/dev/null || true

# Remove network CIDRs
ROLLBACK_EOF

    echo "sudo ufw delete allow from $K8S_POD_CIDR to any 2>/dev/null || true" >> "$rollback_file"
    echo "sudo ufw delete allow from $K8S_SERVICE_CIDR to any 2>/dev/null || true" >> "$rollback_file"
    
    echo "" >> "$rollback_file"
    echo "echo 'K8s UFW rules removed. Verify with: sudo ufw status'" >> "$rollback_file"
    
    chmod +x "$rollback_file"
    echo "Rollback script saved to: $rollback_file"
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "  Kubernetes UFW Firewall Bootstrap"
    echo "=========================================="
    echo ""
    echo "Configuration:"
    echo "  Node Role:     $NODE_ROLE"
    echo "  Pod CIDR:      $K8S_POD_CIDR"
    echo "  Service CIDR:  $K8S_SERVICE_CIDR"
    echo "  CNI Type:      $K8S_CNI_TYPE"
    echo "  Dry Run:       $DRY_RUN"
    echo ""
    
    check_ufw
    
    if [[ "$VERIFY_ONLY" == "true" ]]; then
        verify_rules
        exit $?
    fi
    
    # Generate rollback script first
    generate_rollback
    
    # Enable UFW if needed
    enable_ufw
    
    # Configure based on role
    case "$NODE_ROLE" in
        control-plane|master)
            configure_control_plane
            configure_worker  # Control plane also runs kubelet
            configure_cni "$K8S_CNI_TYPE"
            configure_dns
            configure_cluster_networks
            configure_monitoring
            ;;
        worker|node)
            configure_worker
            configure_cni "$K8S_CNI_TYPE"
            configure_cluster_networks
            ;;
        all|*)
            configure_control_plane
            configure_worker
            configure_cni "$K8S_CNI_TYPE"
            configure_dns
            configure_cluster_networks
            configure_monitoring
            ;;
    esac
    
    echo ""
    info "=== UFW Configuration Complete ==="
    echo ""
    
    # Show current status
    sudo ufw status numbered | head -30
    
    # Verify rules
    echo ""
    verify_rules
    
    # Test connectivity if not dry-run
    if [[ "$DRY_RUN" == "false" ]]; then
        echo ""
        test_connectivity
    fi
    
    echo ""
    info "Bootstrap complete! Review rules with: sudo ufw status verbose"
}

# Execute
main "$@"
