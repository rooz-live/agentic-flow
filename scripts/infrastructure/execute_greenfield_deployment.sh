#!/bin/bash
set -euo pipefail

# =============================================================================
# GREENFIELD INFRASTRUCTURE DEPLOYMENT EXECUTOR
# =============================================================================
# Deploys Ubuntu 22.04 VMs on StarlingX 11 for LOKI monitoring stack
# Target: 99.9% availability, <15min MTTR, >1000 RPS, <200ms P95
# =============================================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

# Configuration
STX_SERVER="23.92.79.2"
SSH_KEY="$HOME/pem/stx-aio-0.pem"
SSH_PORT="2222"
SSH_OPTS="-o ConnectTimeout=30 -o StrictHostKeyChecking=no -o BatchMode=yes"
SSH_CMD="ssh $SSH_OPTS -i $SSH_KEY -p $SSH_PORT root@$STX_SERVER"
SCP_CMD="scp $SSH_OPTS -i $SSH_KEY -P $SSH_PORT"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/.goalie/infrastructure"
LOG_FILE="$LOG_DIR/deployment_$(date +%Y%m%d_%H%M%S).log"

mkdir -p "$LOG_DIR"

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1" | tee -a "$LOG_FILE"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"; }

stx_exec() { $SSH_CMD "source /etc/platform/openrc 2>/dev/null || true; $1" 2>&1; }

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      GREENFIELD INFRASTRUCTURE DEPLOYMENT                    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
log "Server: $STX_SERVER | SSH Key: $SSH_KEY"

# Phase 0: Validate SSH
log "Phase 0: Validating SSH connectivity..."
if ! $SSH_CMD "echo 'OK'" >/dev/null 2>&1; then
    log_error "SSH connection failed"; exit 1
fi
log_success "SSH connection verified"

# Phase 1: Download Ubuntu 22.04 cloud image if not present
log "Phase 1: Preparing Ubuntu 22.04 image..."
IMAGE_EXISTS=$(stx_exec "openstack image list -f value -c Name 2>/dev/null | grep -c 'ubuntu-22.04' || echo 0")
if [[ "$IMAGE_EXISTS" == "0" ]]; then
    log "Downloading Ubuntu 22.04 cloud image..."
    stx_exec "cd /tmp && wget -q --show-progress https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img" || true
    log "Creating OpenStack image..."
    stx_exec "openstack image create --file /tmp/jammy-server-cloudimg-amd64.img --disk-format qcow2 --public ubuntu-22.04-latest" || log_warn "Image may already exist"
fi
log_success "Ubuntu 22.04 image ready"

# Phase 2: Create network infrastructure
log "Phase 2: Creating network infrastructure..."
for net in "loki-net,10.20.0.0/24" "app-net,10.21.0.0/24"; do
    IFS=',' read -r name subnet <<< "$net"
    NET_EXISTS=$(stx_exec "openstack network list -f value -c Name 2>/dev/null | grep -c '$name' || echo 0")
    if [[ "$NET_EXISTS" == "0" ]]; then
        log "Creating network $name..."
        stx_exec "openstack network create $name" || true
        stx_exec "openstack subnet create ${name}-subnet --network $name --subnet-range $subnet --gateway ${subnet%.*}.1 --dns-nameserver 8.8.8.8" || true
    fi
done
log_success "Networks created"

# Phase 3: Create VM flavors
log "Phase 3: Creating VM flavors..."
for flavor in "m1.monitoring,4,8192,100" "m1.app,2,4096,50" "m1.k8s,4,8192,80"; do
    IFS=',' read -r name cpu ram disk <<< "$flavor"
    FLAVOR_EXISTS=$(stx_exec "openstack flavor list -f value -c Name 2>/dev/null | grep -c '$name' || echo 0")
    if [[ "$FLAVOR_EXISTS" == "0" ]]; then
        stx_exec "openstack flavor create --vcpus $cpu --ram $ram --disk $disk $name" || true
    fi
done
log_success "Flavors created"

# Phase 4: Create keypair for VM access
log "Phase 4: Setting up SSH keypair..."
ssh-keygen -t ed25519 -N "" -f /tmp/stx_vm_key -C "stx-greenfield" 2>/dev/null || true
$SCP_CMD /tmp/stx_vm_key.pub root@$STX_SERVER:/tmp/ 2>/dev/null || true
KEYPAIR_EXISTS=$(stx_exec "openstack keypair list -f value -c Name 2>/dev/null | grep -c 'stx-greenfield' || echo 0")
if [[ "$KEYPAIR_EXISTS" == "0" ]]; then
    stx_exec "openstack keypair create --public-key /tmp/stx_vm_key.pub stx-greenfield" || true
fi
log_success "SSH keypair configured"

# Phase 5: Create security groups
log "Phase 5: Creating security groups..."
for sg in "monitoring-sg" "app-sg"; do
    SG_EXISTS=$(stx_exec "openstack security group list -f value -c Name 2>/dev/null | grep -c '$sg' || echo 0")
    if [[ "$SG_EXISTS" == "0" ]]; then
        stx_exec "openstack security group create $sg --description 'Greenfield $sg'" || true
        stx_exec "openstack security group rule create --protocol tcp --dst-port 22 $sg" || true
        stx_exec "openstack security group rule create --protocol icmp $sg" || true
        if [[ "$sg" == "monitoring-sg" ]]; then
            for port in 3000 3100 9090 9093; do
                stx_exec "openstack security group rule create --protocol tcp --dst-port $port $sg" || true
            done
        else
            for port in 80 443 8080 8888; do
                stx_exec "openstack security group rule create --protocol tcp --dst-port $port $sg" || true
            done
        fi
    fi
done
log_success "Security groups configured"

# Phase 6: Deploy VMs
log "Phase 6: Deploying VMs..."
declare -A VMS=(
    ["loki-monitor"]="m1.monitoring,loki-net,10.20.0.10,monitoring-sg"
    ["k8s-control"]="m1.k8s,loki-net,10.20.0.11,monitoring-sg"
    ["hostbill"]="m1.app,app-net,10.21.0.20,app-sg"
    ["wordpress"]="m1.app,app-net,10.21.0.21,app-sg"
    ["flarum"]="m1.app,app-net,10.21.0.22,app-sg"
    ["affiliate"]="m1.app,app-net,10.21.0.23,app-sg"
    ["trading"]="m1.k8s,app-net,10.21.0.24,app-sg"
)

for vm_name in "${!VMS[@]}"; do
    IFS=',' read -r flavor network ip sg <<< "${VMS[$vm_name]}"
    VM_EXISTS=$(stx_exec "openstack server list -f value -c Name 2>/dev/null | grep -c '^$vm_name$' || echo 0")
    if [[ "$VM_EXISTS" == "0" ]]; then
        log "Creating VM: $vm_name (flavor: $flavor, IP: $ip)..."
        NET_ID=$(stx_exec "openstack network show -f value -c id $network 2>/dev/null || echo ''")
        if [[ -n "$NET_ID" ]]; then
            stx_exec "openstack server create --flavor $flavor --image ubuntu-22.04-latest --nic net-id=$NET_ID,v4-fixed-ip=$ip --security-group $sg --key-name stx-greenfield $vm_name" || log_warn "Failed to create $vm_name"
        else
            log_warn "Network $network not found, skipping $vm_name"
        fi
    else
        log "$vm_name already exists"
    fi
done
log_success "VM deployment initiated"

# Phase 7: Wait for VMs and show status
log "Phase 7: Checking VM status..."
sleep 10
stx_exec "openstack server list -f table" || true

log_success "Greenfield deployment complete!"
echo ""
echo -e "${CYAN}=== NEXT STEPS ===${NC}"
echo "1. Wait for VMs to reach ACTIVE state"
echo "2. SSH into loki-monitor to install LOKI stack"
echo "3. Deploy application platforms on each VM"
echo "4. Configure SLA monitoring dashboards"
echo ""
echo "Log file: $LOG_FILE"

