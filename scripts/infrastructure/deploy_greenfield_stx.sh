#!/bin/bash
# =============================================================================
# GREENFIELD INFRASTRUCTURE DEPLOYMENT ON STARLINGX
# =============================================================================
# Deploys complete hybrid infrastructure: Ubuntu 22.04 VMs on StarlingX 11
# Platforms: LOKI, K8s, HostBill, WordPress, Flarum, Affiliate, Trading
# SLA: 99.9% availability, MTTR <15min, >1000 RPS, <200ms P95
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GOALIE_DIR="$PROJECT_ROOT/.goalie"
DEPLOY_LOG="$GOALIE_DIR/infrastructure/deploy_$(date +%Y%m%d_%H%M%S).log"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

# StarlingX Configuration
STX_HOST="${STX_HOST:-23.92.79.2}"
STX_HOSTNAME="${STX_HOSTNAME:-stx-aio-0.corp.interface.tag.ooo}"
STX_SSH_PORT="${STX_SSH_PORT:-2222}"
STX_SSH_USER="${STX_SSH_USER:-root}"
STX_SSH_KEY="${STX_SSH_KEY:-$HOME/.ssh/starlingx_key}"

# Network Configuration
UBUNTU_NETWORK="loki-net,k8s-net,app-net,data-net"
UBUNTU_SUBNET="10.20.0.0/24,10.21.0.0/24,10.22.0.0/24,10.23.0.0/24"
UBUNTU_GATEWAY="10.20.0.1,10.21.0.1,10.22.0.1,10.23.0.1"
UBUNTU_DNS="8.8.8.8"

# VM Configuration
declare -A VM_SPECS=(
    ["loki-1"]="4,8192,100,10.20.0.10,monitoring"
    ["k8s-control"]="8,16384,200,10.21.0.10,k8s-control"
    ["k8s-worker-1"]="4,8192,100,10.21.0.11,k8s"
    ["k8s-worker-2"]="4,8192,100,10.21.0.12,k8s"
    ["hostbill"]="4,8192,100,10.22.0.10,hostbill"
    ["wordpress"]="2,4096,50,10.22.0.11,cms"
    ["flarum"]="2,4096,50,10.22.0.12,cms"
    ["affiliate"]="2,4096,50,10.22.0.13,affiliate"
    ["trading"]="4,8192,100,10.22.0.14,trading"
)

# SLA Targets
SLA_AVAILABILITY_TARGET=99.9
SLA_MTTR_TARGET_SEC=900  # 15 minutes
SLA_THROUGHPUT_TARGET=1000  # RPS
SLA_P95_LATENCY_TARGET=200  # ms

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1" | tee -a "$DEPLOY_LOG"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1" | tee -a "$DEPLOY_LOG"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1" | tee -a "$DEPLOY_LOG"; }
log_error() { echo -e "${RED}[✗]${NC} $1" | tee -a "$DEPLOY_LOG"; }

ssh_stx() {
    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 \
        -i "$STX_SSH_KEY" -p "$STX_SSH_PORT" "$STX_SSH_USER@$STX_HOST" "$@"
}

scp_to_stx() {
    scp -o StrictHostKeyChecking=no -i "$STX_SSH_KEY" -P "$STX_SSH_PORT" "$1" "$STX_SSH_USER@$STX_HOST:$2"
}

# Initialize deployment
init_deployment() {
    mkdir -p "$GOALIE_DIR/infrastructure"
    mkdir -p "$GOALIE_DIR/infrastructure/configs"
    mkdir -p "$GOALIE_DIR/infrastructure/manifests"
    
    cat > "$GOALIE_DIR/infrastructure/deployment_manifest.yaml" << EOF
# Greenfield Infrastructure Deployment Manifest
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
deployment:
  name: greenfield-stx-hybrid
  version: 1.0.0
  target: StarlingX 11 (AlmaLinux 8) + Ubuntu 22.04 VMs
  migration_target: StarlingX 12 (Ubuntu 22.04) Q4 2025

infrastructure:
  hypervisor: StarlingX OpenStack
  host: $STX_HOST ($STX_HOSTNAME)
  network: $UBUNTU_NETWORK ($UBUNTU_SUBNET)
  
vms:
$(for vm in "${!VM_SPECS[@]}"; do
    IFS=',' read -r cpu ram disk ip role <<< "${VM_SPECS[$vm]}"
    echo "  - name: $vm"
    echo "    cpu: $cpu"
    echo "    ram_mb: $ram"
    echo "    disk_gb: $disk"
    echo "    ip: $ip"
    echo "    role: $role"
done)

platforms:
  - name: LOKI Monitoring Stack
    components: [loki, grafana, prometheus, alertmanager]
  - name: Kubernetes Cluster
    version: 1.29
    runtime: containerd 2.2.1
  - name: HostBill
    type: billing-platform
  - name: WordPress
    type: cms
  - name: Flarum
    type: forum
  - name: Affiliate Platform
    type: affiliate-marketing
  - name: Trading Platform
    type: financial-trading

sla_targets:
  availability: ${SLA_AVAILABILITY_TARGET}%
  mttr_seconds: $SLA_MTTR_TARGET_SEC
  throughput_rps: $SLA_THROUGHPUT_TARGET
  p95_latency_ms: $SLA_P95_LATENCY_TARGET
EOF
    
    log_success "Deployment manifest created"
}

# Check StarlingX connectivity
check_stx_connectivity() {
    log "Checking StarlingX connectivity..."
    if ssh_stx "echo 'SSH OK' && (system show 2>/dev/null | head -3 || echo 'System info not available')"; then
        log_success "StarlingX connection verified"
        return 0
    else
        log_warn "StarlingX SSH connection requires authentication"
        log "  Host: $STX_HOST:$STX_SSH_PORT"
        log "  User: $STX_SSH_USER"
        log "  Key:  $STX_SSH_KEY"
        return 1
    fi
}

# Display deployment summary
show_summary() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════════╗"
    echo "║         GREENFIELD STARLINGX INFRASTRUCTURE DEPLOYMENT                   ║"
    echo "╚══════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Target: $STX_HOSTNAME ($STX_HOST)"
    echo "Architecture: Hybrid StarlingX 11 + Ubuntu 22.04 VMs"
    echo ""
    echo "VMs to Deploy:"
    printf "  %-15s %-6s %-8s %-8s %-15s %-12s\n" "NAME" "vCPU" "RAM" "DISK" "IP" "ROLE"
    printf "  %-15s %-6s %-8s %-8s %-15s %-12s\n" "────────────" "────" "──────" "──────" "─────────────" "──────────"
    for vm in "${!VM_SPECS[@]}"; do
        IFS=',' read -r cpu ram disk ip role <<< "${VM_SPECS[$vm]}"
        printf "  %-15s %-6s %-8s %-8s %-15s %-12s\n" "$vm" "$cpu" "${ram}MB" "${disk}GB" "$ip" "$role"
    done
    echo ""
    echo "SLA Targets:"
    echo "  - Availability: ${SLA_AVAILABILITY_TARGET}%"
    echo "  - MTTR: <$((SLA_MTTR_TARGET_SEC/60)) minutes"
    echo "  - Throughput: >${SLA_THROUGHPUT_TARGET} RPS"
    echo "  - P95 Latency: <${SLA_P95_LATENCY_TARGET}ms"
    echo ""
}

main() {
    local execute="false"
    local allow_firewall_fix="false"
    if [[ "${1:-}" == "--execute" ]]; then
        execute="true"
        shift
    fi

    if [[ "${1:-}" == "--allow-firewall-fix" ]]; then
        allow_firewall_fix="true"
        shift
    fi

    echo ""
    log "Starting Greenfield Infrastructure Deployment..."
    init_deployment
    show_summary
    check_stx_connectivity || log_warn "Continuing in planning mode..."
    log_success "Phase 0: Pre-deployment validation complete"
    log "Deployment manifest: $GOALIE_DIR/infrastructure/deployment_manifest.yaml"

    if [[ "$execute" == "true" ]]; then
        local run_log
        run_log="/tmp/stx-greenfield-deploy-$(date +%Y%m%d_%H%M%S).log"
        log "Running mandatory preflight via scripts/deploy_stx_loki_greenfield.sh --preflight"
        if [[ "$allow_firewall_fix" == "true" ]]; then
            ALLOW_FIREWALL_FIX=true bash "$PROJECT_ROOT/scripts/deploy_stx_loki_greenfield.sh" --preflight |& tee -a "$run_log"
        else
            bash "$PROJECT_ROOT/scripts/deploy_stx_loki_greenfield.sh" --preflight |& tee -a "$run_log"
        fi
        log_success "Preflight passed"

        log "Executing deployment via scripts/deploy_stx_loki_greenfield.sh"
        if [[ "$allow_firewall_fix" == "true" ]]; then
            ALLOW_FIREWALL_FIX=true bash "$PROJECT_ROOT/scripts/deploy_stx_loki_greenfield.sh" --execute |& tee -a "$run_log"
        else
            bash "$PROJECT_ROOT/scripts/deploy_stx_loki_greenfield.sh" --execute |& tee -a "$run_log"
        fi
        log_success "Execution complete. Log: $run_log"
    else
        log "Run with --execute to perform actual deployment"
    fi
}

main "$@"

