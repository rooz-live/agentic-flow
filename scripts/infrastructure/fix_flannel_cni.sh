#!/bin/bash
#
# Fix Flannel CNI CrashLoopBackOff
# 
# This script fixes the common issue where Flannel fails to start because
# /run/flannel/subnet.env is missing. This typically happens when:
# - Flannel was not properly initialized
# - The node was rebooted and /run (tmpfs) was cleared
# - Network configuration mismatch
#
# Usage: ./fix_flannel_cni.sh [--dry-run]
#
# This script should be run on the StarlingX node via SSH.

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    log_warn "DRY RUN MODE - No changes will be made"
fi

# Get the pod CIDR from kubeadm config or kube-controller-manager
get_pod_cidr() {
    # Try to get from kube-controller-manager args
    local cidr
    cidr=$(ps aux | grep kube-controller-manager | grep -oP 'cluster-cidr=\K[0-9./]+' | head -1 || echo "")
    
    if [[ -z "$cidr" ]]; then
        # Try from kubeadm config
        cidr=$(grep -r "podSubnet" /etc/kubernetes/ 2>/dev/null | grep -oP '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+' | head -1 || echo "")
    fi
    
    if [[ -z "$cidr" ]]; then
        # Default Flannel CIDR
        cidr="10.244.0.0/16"
    fi
    
    echo "$cidr"
}

# Get the node's subnet from the pod CIDR
get_node_subnet() {
    local pod_cidr="$1"
    # For a single-node cluster, use the first /24 subnet
    # e.g., 10.244.0.0/16 -> 10.244.0.0/24
    local base
    base=$(echo "$pod_cidr" | cut -d'/' -f1 | cut -d'.' -f1-3)
    echo "${base}.0/24"
}

main() {
    log "Flannel CNI Fix Script"
    log "======================"
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
    
    # Check current state
    log "Checking current Flannel state..."
    
    if [[ -f /run/flannel/subnet.env ]]; then
        log_success "subnet.env already exists:"
        cat /run/flannel/subnet.env
        log_warn "If Flannel is still failing, the file may have incorrect values"
    else
        log_warn "subnet.env is missing - this is the root cause"
    fi
    
    # Get pod CIDR
    POD_CIDR=$(get_pod_cidr)
    log "Detected Pod CIDR: $POD_CIDR"
    
    # Calculate node subnet
    NODE_SUBNET=$(get_node_subnet "$POD_CIDR")
    log "Node Subnet: $NODE_SUBNET"
    
    # Create the subnet.env file
    log "Creating /run/flannel/subnet.env..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "Would create:"
        echo "FLANNEL_NETWORK=$POD_CIDR"
        echo "FLANNEL_SUBNET=$NODE_SUBNET"
        echo "FLANNEL_MTU=1450"
        echo "FLANNEL_IPMASQ=true"
    else
        mkdir -p /run/flannel
        cat > /run/flannel/subnet.env << EOF
FLANNEL_NETWORK=$POD_CIDR
FLANNEL_SUBNET=$NODE_SUBNET
FLANNEL_MTU=1450
FLANNEL_IPMASQ=true
EOF
        chmod 644 /run/flannel/subnet.env
        log_success "Created /run/flannel/subnet.env"
        cat /run/flannel/subnet.env
    fi
    
    # Delete the failing Flannel pod to trigger restart
    log "Restarting Flannel pods..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "Would delete Flannel pods in kube-flannel namespace"
    else
        export KUBECONFIG=/etc/kubernetes/admin.conf
        kubectl -n kube-flannel delete pods -l app=flannel --force --grace-period=0 2>/dev/null || true
        log_success "Flannel pods deleted - they will be recreated"
    fi
    
    # Wait for pods to restart
    if [[ "$DRY_RUN" == "false" ]]; then
        log "Waiting for Flannel to restart (30s)..."
        sleep 30
        
        log "Checking Flannel pod status..."
        kubectl -n kube-flannel get pods -l app=flannel -o wide
        
        log "Checking all pods..."
        kubectl get pods -A | head -20
    fi
    
    log_success "Flannel fix complete!"
    log "If pods are still failing, check: kubectl -n kube-flannel logs -l app=flannel"
}

main "$@"

