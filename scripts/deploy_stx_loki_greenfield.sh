#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Greenfield STX LOKI Linux OpenStack Kubernetes Infrastructure
# Ubuntu 22.04 VMs on StarlingX with SLA monitoring
# Target: Latest Ubuntu supporting roadmap to STX 12

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
STX_SERVER="23.92.79.2"
SSH_KEY="$HOME/.ssh/starlingx_key"
SSH_PORT="2222"
SSH_CMD=(ssh -i "$SSH_KEY" -p "$SSH_PORT" "root@$STX_SERVER")
OPENSTACK_CMD="/usr/local/bin/openstack"
DOMAIN="interface.tag.ooo"
HOSTBILL_DOMAIN="hostbill.$DOMAIN"

MODE="execute"
ALLOW_FIREWALL_FIX="${ALLOW_FIREWALL_FIX:-false}"
STX11_TARGET_HOST_DEFAULT="${STX11_TARGET_HOST_DEFAULT:-127.0.0.1}"

if [[ "${1:-}" == "--preflight" ]]; then
    MODE="preflight"
    shift
fi
if [[ "${1:-}" == "--execute" ]]; then
    MODE="execute"
    shift
fi

gen_secret() {
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32
}

SECRETS_FILE="${SECRETS_FILE:-$HOME/.config/agentic-flow/stx-greenfield-secrets.env}"
mkdir -p "$(dirname "$SECRETS_FILE")"
if [ -f "$SECRETS_FILE" ]; then
    source "$SECRETS_FILE"
else
    umask 077
    cat > "$SECRETS_FILE" <<EOF
GRAFANA_ADMIN_PASSWORD=$(gen_secret)
HOSTBILL_MYSQL_ROOT_PASSWORD=$(gen_secret)
HOSTBILL_MYSQL_PASSWORD=$(gen_secret)
WORDPRESS_DB_PASSWORD=$(gen_secret)
FLARUM_DB_PASSWORD=$(gen_secret)
EOF
    source "$SECRETS_FILE"
fi

SLA_AVAILABILITY_TARGET="99.9"
SLA_MTTR_TARGET_SECONDS="900"
SLA_THROUGHPUT_TARGET_RPS="1000"
SLA_RESPONSE_TIME_TARGET_SECONDS="0.5"

# SLA Targets
SLA_TARGETS=(
    "availability:99.9"
    "mttr:900"  # 15 minutes
    "throughput:1000"  # RPS
    "response_time:0.5"  # seconds
)

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  STX LOKI GREENFIELD DEPLOYMENT      ${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "${BLUE}Server:${NC} $STX_SERVER (stx-aio-0.corp.interface.tag.ooo)"
echo -e "${BLUE}Infrastructure:${NC} StarlingX -> Ubuntu 22.04 VMs"
echo -e "${BLUE}Roadmap:${NC} STX 11 -> STX 12 (Ubuntu 22.04)"
echo -e "${BLUE}SLA:${NC} ${SLA_AVAILABILITY_TARGET}% availability, <${SLA_MTTR_TARGET_SECONDS}s MTTR"
echo ""

# Function to execute on StarlingX
execute_on_stx() {
    local cmd="$1"
    local desc="${2:-$1}"
    echo -e "${YELLOW}Executing: $desc${NC}" >&2
    "${SSH_CMD[@]}" "unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY; export no_proxy='*'; OPENRC_FILE=''; for f in /etc/platform/openrc /home/sysadmin/openrc /home/sysadmin/openrc.* /root/openrc /etc/openstack/openrc; do if [ -f \"\$f\" ]; then OPENRC_FILE=\"\$f\"; break; fi; done; if [ -n \"\$OPENRC_FILE\" ]; then . \"\$OPENRC_FILE\" >/dev/null 2>&1 || true; fi; if [ -z \"\${OS_AUTH_URL:-}\" ]; then STX11_TARGET_HOST=\"${STX11_TARGET_HOST_DEFAULT}\"; export STX11_TARGET_HOST; for ef in /home/rooz/iz_blue/iz/stx11-greenfield-deploy.sh /home/rooz/iz_blue/iz/stx11-greenfield-deploy*.sh; do if [ -f \"\$ef\" ]; then set -a; eval \"\$(grep -E '^(export[[:space:]]+)?OS_' \"\$ef\" || true)\"; set +a; break; fi; done; fi; $cmd"
}

stage_to_stx_tmp() {
    local src="$1"
    scp -i "$SSH_KEY" -P "$SSH_PORT" "$src" "root@$STX_SERVER:/tmp/" >/dev/null
}

# Function to measure execution time
measure_time() {
    local start_time=$(date +%s)
    "$@"
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    echo -e "${GREEN}✓ Completed in ${duration}s${NC}"
}

run_preflight() {
    echo -e "\n${BLUE}Phase 0.5: Preflight Validation (CRITICAL)${NC}"
    echo "============================================"

    if ! execute_on_stx "python3 - <<'PY'
import socket
s=socket.socket(); s.settimeout(2)
try:
  s.connect(('127.0.0.1', 5000))
  print('keystone_tcp_ok')
except Exception as e:
  raise SystemExit(f'keystone_tcp_fail: {e!r}')
finally:
  try: s.close()
  except: pass
PY" "Checking Keystone TCP (127.0.0.1:5000)"; then
        if [[ "$ALLOW_FIREWALL_FIX" == "true" ]]; then
            execute_on_stx "command -v nft >/dev/null 2>&1 && nft list chain ip filter INPUT >/dev/null 2>&1 && (nft list chain ip filter INPUT | grep -qE 'iif( |name )\\\"lo\\\".*tcp dport 5000.*accept' || nft insert rule ip filter INPUT iif \\\"lo\\\" tcp dport 5000 accept) || true" "Applying localhost-only firewall fix for tcp/5000"
            execute_on_stx "python3 - <<'PY'
import socket
s=socket.socket(); s.settimeout(2)
try:
  s.connect(('127.0.0.1', 5000))
  print('keystone_tcp_ok')
except Exception as e:
  raise SystemExit(f'keystone_tcp_fail: {e!r}')
finally:
  try: s.close()
  except: pass
PY" "Re-check Keystone TCP (127.0.0.1:5000)"
        else
            echo -e "${RED}Preflight FAILED:${NC} Keystone not reachable locally on STX." >&2
            echo "Re-run with ALLOW_FIREWALL_FIX=true to insert a localhost-only nft rule for tcp/5000." >&2
            return 1
        fi
    fi

    execute_on_stx "$OPENSTACK_CMD token issue -f value -c expires >/dev/null" "Validating OpenStack auth (token issue)"
    execute_on_stx "$OPENSTACK_CMD limits show --absolute | head -60" "Checking absolute limits"
    execute_on_stx "$OPENSTACK_CMD quota show | head -60" "Checking project quota"

    execute_on_stx "python3 - <<'PY'
import json
import subprocess
import sys

OPENSTACK = '$OPENSTACK_CMD'

required = {
  'instances': 9,
  'cores': 34,
  'ram': 69632,
  'gigabytes': 850,
}

def run(cmd):
  p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
  if p.returncode != 0:
    sys.stdout.write(p.stdout)
    raise SystemExit(p.returncode)
  return p.stdout

quota = json.loads(run([OPENSTACK, 'quota', 'show', '-f', 'json']))

def to_int(v):
  if v is None:
    return None
  if isinstance(v, int):
    return v
  if isinstance(v, float):
    return int(v)
  s = str(v).strip()
  if s.lower() in ('-1', 'unlimited', 'infinite', 'inf'):
    return -1
  try:
    return int(s)
  except Exception:
    return None

errors = []
for k, need in required.items():
  have = to_int(quota.get(k))
  if have is None:
    continue
  if have != -1 and have < need:
    errors.append(f'quota {k} insufficient: have={have} need={need}')

stats = json.loads(run([OPENSTACK, 'hypervisor', 'stats', 'show', '-f', 'json']))
avail_cores = int(stats.get('vcpus', 0)) - int(stats.get('vcpus_used', 0))
avail_ram = int(stats.get('memory_mb', 0)) - int(stats.get('memory_mb_used', 0))
avail_disk = int(stats.get('local_gb', 0)) - int(stats.get('local_gb_used', 0))

if avail_cores < required['cores']:
  errors.append(f'capacity cores insufficient: available={avail_cores} need={required["cores"]}')
if avail_ram < required['ram']:
  errors.append(f'capacity ram_mb insufficient: available={avail_ram} need={required["ram"]}')
if avail_disk < required['gigabytes']:
  errors.append(f'capacity local_gb insufficient: available={avail_disk} need={required["gigabytes"]}')

if errors:
  for e in errors:
    print('ERROR:', e)
  raise SystemExit(1)

print('quota_and_capacity_ok')
PY" "Validating quota/capacity vs planned VM footprint"

    measure_time execute_on_stx "test -f /tmp/jammy-server-cloudimg-amd64.img || (cd /tmp && wget -q https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img)" "Ensuring Ubuntu 22.04 image file is present"

    local img_exists
    img_exists=$(execute_on_stx "$OPENSTACK_CMD image list -c Name -f value | grep -c '^ubuntu-22.04-latest$' || true" "Checking OpenStack image" || true)
    img_exists="${img_exists:-0}"
    if [ "$img_exists" = "0" ]; then
        execute_on_stx "$OPENSTACK_CMD image create --file /tmp/jammy-server-cloudimg-amd64.img --disk-format qcow2 --public --property hw_qemu_guest_agent=yes --property hw_disk_bus=scsi --property hw_scsi_model=virtio-scsi ubuntu-22.04-latest" "Creating OpenStack image (preflight)"
    fi

    ssh-keygen -t rsa -N "" -f /tmp/stx_vm_key 2>/dev/null || true
    scp -i "$SSH_KEY" -P "$SSH_PORT" /tmp/stx_vm_key /tmp/stx_vm_key.pub root@$STX_SERVER:/tmp/

    local kp_exists
    kp_exists=$(execute_on_stx "$OPENSTACK_CMD keypair list -c Name -f value | grep -c '^stx_vm_key$' || true" "Checking OpenStack keypair" || true)
    kp_exists="${kp_exists:-0}"
    if [ "$kp_exists" = "0" ]; then
        execute_on_stx "$OPENSTACK_CMD keypair create --public-key /tmp/stx_vm_key.pub stx_vm_key >/dev/null" "Creating OpenStack keypair (preflight)"
    fi

    local pf_id pf_net pf_subnet pf_sg pf_vm pf_ip pf_flavor
    pf_id="$(date +%s)"
    pf_net="preflight-net-$pf_id"
    pf_subnet="${pf_net}-subnet"
    pf_sg="preflight-sg-$pf_id"
    pf_vm="preflight-ubuntu-$pf_id"
    pf_ip="10.250.0.10"
    pf_flavor=$(execute_on_stx "$OPENSTACK_CMD flavor list -f value -c Name | head -1" "Selecting preflight flavor" || true)
    pf_flavor="${pf_flavor:-m1.tiny}"

    execute_on_stx "$OPENSTACK_CMD network create $pf_net" "Creating preflight network"
    execute_on_stx "$OPENSTACK_CMD subnet create $pf_subnet --network $pf_net --subnet-range 10.250.0.0/24 --gateway 10.250.0.1 --dns-nameserver 8.8.8.8" "Creating preflight subnet"
    execute_on_stx "$OPENSTACK_CMD security group create $pf_sg >/dev/null" "Creating preflight security group" || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 22 $pf_sg >/dev/null" "Allow SSH (preflight SG)" || true

    local pf_net_id
    pf_net_id=$(execute_on_stx "$OPENSTACK_CMD network show -f value -c id $pf_net" "Resolving preflight network id")
    if [ -z "${pf_net_id:-}" ]; then
        echo -e "${RED}Preflight FAILED:${NC} could not resolve preflight net id" >&2
        return 1
    fi

    execute_on_stx "$OPENSTACK_CMD server create --flavor $pf_flavor --image ubuntu-22.04-latest --nic net-id=$pf_net_id,v4-fixed-ip=$pf_ip --security-group $pf_sg --key-name stx_vm_key $pf_vm >/dev/null" "Creating preflight VM"
    execute_on_stx "for i in \$(seq 1 80); do s=\$($OPENSTACK_CMD server show -f value -c status $pf_vm 2>/dev/null || true); [ \"\$s\" = \"ACTIVE\" ] && exit 0; sleep 5; done; echo TIMEOUT; exit 1" "Waiting for preflight VM ACTIVE"
    execute_on_stx "for i in \$(seq 1 80); do ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes -i /tmp/stx_vm_key ubuntu@$pf_ip 'echo OK' && exit 0; sleep 5; done; echo SSH_TIMEOUT; exit 1" "Validating ubuntu user + injected keypair (preflight)"

    execute_on_stx "$OPENSTACK_CMD server delete $pf_vm >/dev/null" "Cleaning preflight VM" || true
    execute_on_stx "$OPENSTACK_CMD security group delete $pf_sg >/dev/null" "Cleaning preflight SG" || true
    execute_on_stx "$OPENSTACK_CMD subnet delete $pf_subnet >/dev/null" "Cleaning preflight subnet" || true
    execute_on_stx "$OPENSTACK_CMD network delete $pf_net >/dev/null" "Cleaning preflight network" || true
}

# Phase 0: First Principles Assessment
echo -e "\n${BLUE}Phase 0: First Principles Assessment${NC}"
echo "====================================="

echo -e "${CYAN}Bounded Reasoning Analysis:${NC}"
echo "1. Current State: STX 11 on AlmaLinux 8 (fixed)"
echo "2. Constraint: Cannot change host OS"
echo "3. Solution: Deploy Ubuntu VMs as application layer"
echo "4. Benefit: Modern container runtime, latest packages"
echo "5. Migration Path: VMs migrate to STX 12 bare metal"
echo ""

execute_on_stx "system show 2>/dev/null | head -5 || echo 'System info not available'" "Checking StarlingX status"
execute_on_stx "cat /etc/os-release | grep PRETTY_NAME" "Checking host OS"
execute_on_stx "docker --version 2>/dev/null || containerd --version" "Checking container runtime"

run_preflight
if [[ "$MODE" == "preflight" ]]; then
    echo -e "\n${GREEN}✓ Preflight complete${NC}"
    exit 0
fi

# Phase 1: Prepare Ubuntu 22.04 Image with Latest Updates
echo -e "\n${BLUE}Phase 1: Preparing Ubuntu 22.04 Image${NC}"
echo "=========================================="

echo "Downloading Ubuntu 22.04 cloud image (if needed)..."
measure_time execute_on_stx "test -f /tmp/jammy-server-cloudimg-amd64.img || (cd /tmp && wget -q https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img)" "Ensuring Ubuntu 22.04 image is present"

IMAGE_EXISTS=$(execute_on_stx "$OPENSTACK_CMD image list -c Name -f value | grep -c '^ubuntu-22.04-latest$' || true" "Checking OpenStack image" || true)
if [ "${IMAGE_EXISTS:-0}" = "0" ]; then
  execute_on_stx "$OPENSTACK_CMD image create \
    --file /tmp/jammy-server-cloudimg-amd64.img \
    --disk-format qcow2 \
    --public \
    --property hw_qemu_guest_agent=yes \
    --property hw_disk_bus=scsi \
    --property hw_scsi_model=virtio-scsi \
    ubuntu-22.04-latest" "Creating OpenStack image"
else
  echo "OpenStack image ubuntu-22.04-latest already exists"
fi

# Phase 2: Create Advanced Network Infrastructure
echo -e "\n${BLUE}Phase 2: Creating Network Infrastructure${NC}"
echo "=========================================="

# Create networks for different tiers
NETWORKS=(
    "loki-net,10.20.0.0/24,monitoring"
    "k8s-net,10.21.0.0/24,kubernetes"
    "app-net,10.22.0.0/24,applications"
    "data-net,10.23.0.0/24,databases"
)

for net_info in "${NETWORKS[@]}"; do
    IFS=',' read -r net_name subnet purpose <<< "$net_info"

    NET_EXISTS=$(execute_on_stx "$OPENSTACK_CMD network list -c Name -f value | grep -c '^${net_name}$' || true" "Checking network $net_name" || true)
    NET_EXISTS="${NET_EXISTS:-0}"

    if [ "$NET_EXISTS" -eq 0 ]; then
        echo "Creating $net_name for $purpose..."
        execute_on_stx "$OPENSTACK_CMD network create $net_name"
        execute_on_stx "$OPENSTACK_CMD subnet create ${net_name}-subnet \
          --network $net_name \
          --subnet-range $subnet \
          --gateway ${subnet%.*}.1 \
          --dns-nameserver 8.8.8.8 \
          --dns-nameserver 1.1.1.1"
    fi
done

# Create advanced security groups
create_security_groups() {
    # Monitoring SG
    execute_on_stx "$OPENSTACK_CMD security group create monitoring-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 22 monitoring-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 3100 monitoring-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 3006 monitoring-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 9091 monitoring-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 9092 monitoring-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 9093 monitoring-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 9115 monitoring-sg" 2>/dev/null || true

    # Kubernetes SG
    execute_on_stx "$OPENSTACK_CMD security group create k8s-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 22 k8s-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 6443 k8s-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 30000:32767 k8s-sg" 2>/dev/null || true

    # Application SG
    execute_on_stx "$OPENSTACK_CMD security group create app-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 22 app-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 80 app-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 443 app-sg" 2>/dev/null || true
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 8080 app-sg" 2>/dev/null || true
}

create_security_groups

# Phase 3: Create Optimized Flavors
echo -e "\n${BLUE}Phase 3: Creating Optimized VM Flavors${NC}"
echo "======================================"

FLAVORS=(
    "monitoring,4,8192,100,loki-flavor"
    "k8s-control,8,16384,200,k8s-control-flavor"
    "k8s-worker,4,8192,100,k8s-worker-flavor"
    "app-medium,2,4096,50,app-medium-flavor"
    "app-large,4,8192,100,app-large-flavor"
)

for flavor_info in "${FLAVORS[@]}"; do
    IFS=',' read -r name cpu ram disk flavor_id <<< "$flavor_info"

    FLAVOR_EXISTS=$(execute_on_stx "$OPENSTACK_CMD flavor list -c Name -f value | grep -c $flavor_id || echo 0")

    if [ "$FLAVOR_EXISTS" -eq 0 ]; then
        execute_on_stx "$OPENSTACK_CMD flavor create --vcpus $cpu --ram $ram --disk $disk $flavor_id"
    fi
done

# Phase 4: Create Advanced Bootstrap Script
echo -e "\n${BLUE}Phase 4: Creating Advanced Bootstrap${NC}"
echo "====================================="

cat << 'EOF' > /tmp/bootstrap-ubuntu-advanced.sh
#!/bin/bash
set -e

# Ubuntu 22.04 Advanced Bootstrap for STX Greenfield
ROLE=${1:-"standard"}
METRICS_SERVER=${2:-"http://10.20.0.10:9091"}

echo "Starting Ubuntu bootstrap for role: $ROLE"

# Update system with latest packages
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git vim htop net-tools jq unzip \
    software-properties-common apt-transport-https ca-certificates \
    gnupg lsb-release

# Install Docker Engine (includes containerd)
echo "Installing Docker (includes containerd)..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose-plugin
systemctl enable --now docker
systemctl enable --now containerd

# Configure containerd for performance
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sed -i 's/snapshotter = "overlayfs"/snapshotter = "overlayfs"/' /etc/containerd/config.toml

# Add performance optimizations
cat << 'OPTS_EOF' >> /etc/containerd/config.toml

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
  SystemdCgroup = true
  CgroupPath = ""

[plugins."io.containerd.grpc.v1.cri"]
  max_concurrent_downloads = 10
  max_container_log_line_size = 16384
OPTS_EOF

systemctl restart containerd
systemctl enable containerd

# Verify containerd version
echo "Containerd version: $(containerd --version)"

# Install Python deps needed for monitoring scripts
apt install -y python3 python3-requests python3-psutil

# Install Kubernetes tools (for K8s roles)
if [[ "$ROLE" == *"k8s"* ]]; then
    echo "Installing Kubernetes 1.29..."
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
    echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list
    apt update && apt install -y kubelet kubeadm kubectl
    apt-mark hold kubelet kubeadm kubectl

    # Configure kernel modules for Kubernetes
    cat << 'KUBEEOF' > /etc/modules-load.d/k8s.conf
br_netfilter
overlay
KUBEEOF

    cat << 'KUBEEOF' > /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
fs.inotify.max_user_instances       = 8192
fs.inotify.max_user_watches         = 524288
KUBEEOF

    sysctl --system
    modprobe overlay
    modprobe br_netfilter
fi

# Install Node.js 20 (for affiliate platform)
if [[ "$ROLE" == *"affiliate"* ]] || [[ "$ROLE" == *"app"* ]]; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    npm install -g pm2
fi

# Install Python 3.11 (for trading platform)
if [[ "$ROLE" == *"trading"* ]]; then
    echo "Installing Python 3.11..."
    add-apt-repository ppa:deadsnakes/ppa -y
    apt update && apt install -y python3.11 python3.11-pip python3.11-venv python3.11-dev
    python3.11 -m pip install --upgrade pip
fi

# Install PHP 8.2 (for HostBill/WordPress)
if [[ "$ROLE" == *"cms"* ]] || [[ "$ROLE" == *"hostbill"* ]]; then
    echo "Installing PHP 8.2..."
    apt install -y php8.2 php8.2-fpm php8.2-mysql php8.2-xml php8.2-curl \
        php8.2-gd php8.2-mbstring php8.2-zip php8.2-intl php8.2-bcmath
fi

# Install Node Exporter for Prometheus scraping
apt install -y prometheus-node-exporter
systemctl enable --now prometheus-node-exporter

# Create application directories
mkdir -p /opt/apps/{data,config,logs,backups}
mkdir -p /data/{mysql,postgres,uploads}

# Configure optimized sysctl
cat << 'SYSCTL_EOF' >> /etc/sysctl.conf

# Network optimization
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.ipv4.tcp_congestion_control = bbr

# File system optimization
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288

# Virtual memory optimization
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
SYSCTL_EOF

sysctl -p

echo "Bootstrap complete for role: $ROLE"
echo "Containerd: $(containerd --version)"
echo "Docker: $(docker --version)"
echo "Hostname: $(hostname)"
EOF

# Copy bootstrap to StarlingX
scp -i $SSH_KEY -P $SSH_PORT /tmp/bootstrap-ubuntu-advanced.sh root@$STX_SERVER:/tmp/

# Phase 5: Deploy Ubuntu VMs for Each Platform
echo -e "\n${BLUE}Phase 5: Deploying Platform VMs${NC}"
echo "================================="

declare -A PLATFORM_VMS=(
    ["loki-1"]="loki-flavor,10.20.0.10,loki-net,monitoring-sg,monitoring"
    ["k8s-control"]="k8s-control-flavor,10.21.0.10,k8s-net,k8s-sg,k8s-control"
    ["k8s-worker-1"]="k8s-worker-flavor,10.21.0.11,k8s-net,k8s-sg,k8s"
    ["k8s-worker-2"]="k8s-worker-flavor,10.21.0.12,k8s-net,k8s-sg,k8s"
    ["hostbill"]="app-large-flavor,10.22.0.10,app-net,app-sg,hostbill"
    ["wordpress"]="app-medium-flavor,10.22.0.11,app-net,app-sg,cms"
    ["flarum"]="app-medium-flavor,10.22.0.12,app-net,app-sg,cms"
    ["affiliate"]="app-medium-flavor,10.22.0.13,app-net,app-sg,affiliate"
    ["trading"]="app-large-flavor,10.22.0.14,app-net,app-sg,trading"
)

# Create SSH key for VM access
ssh-keygen -t rsa -N "" -f /tmp/stx_vm_key 2>/dev/null || true

# Stage key onto STX so STX-side scp/ssh can use it
scp -i "$SSH_KEY" -P "$SSH_PORT" /tmp/stx_vm_key /tmp/stx_vm_key.pub root@$STX_SERVER:/tmp/

# Ensure OpenStack keypair exists
KEYPAIR_EXISTS=$(execute_on_stx "$OPENSTACK_CMD keypair list -c Name -f value | grep -c '^stx_vm_key$' || true" "Checking OpenStack keypair" || true)
KEYPAIR_EXISTS="${KEYPAIR_EXISTS:-0}"
if [ "${KEYPAIR_EXISTS:-0}" = "0" ]; then
    execute_on_stx "$OPENSTACK_CMD keypair create --public-key /tmp/stx_vm_key.pub stx_vm_key" "Creating OpenStack keypair" 2>/dev/null || true
fi

# Deploy VMs with parallel execution
for vm_name in "${!PLATFORM_VMS[@]}"; do
    IFS=',' read -r flavor ip network sg role <<< "${PLATFORM_VMS[$vm_name]}"

    NETWORK_ID=$(execute_on_stx "$OPENSTACK_CMD network show -f value -c id $network" "Resolving network id for $network" || true)
    if [ -z "${NETWORK_ID:-}" ]; then
        echo "Failed to resolve network id for $network" >&2
        exit 1
    fi

    VM_EXISTS=$(execute_on_stx "$OPENSTACK_CMD server list -c Name -f value | grep -c '^${vm_name}$' || true" "Checking if $vm_name exists" || true)
    VM_EXISTS="${VM_EXISTS:-0}"

    if [ "$VM_EXISTS" -eq 0 ]; then
        echo "Creating $vm_name ($role)..."
        execute_on_stx "$OPENSTACK_CMD server create \
          --flavor $flavor \
          --image ubuntu-22.04-latest \
          --nic net-id=$NETWORK_ID,v4-fixed-ip=$ip \
          --security-group $sg \
          --key-name stx_vm_key \
          --property hw_qemu_guest_agent=yes \
          $vm_name"
    else
        echo "$vm_name already exists"
    fi
done

# Wait for VMs to become active
echo "Waiting for VMs to become active..."
for vm_name in "${!PLATFORM_VMS[@]}"; do
    execute_on_stx "while [ \"\$($OPENSTACK_CMD server show -f value -c status $vm_name 2>/dev/null || true)\" != \"ACTIVE\" ]; do sleep 5; done" &
done
wait

# Bootstrap VMs
echo "Bootstrapping VMs..."
for vm_name in "${!PLATFORM_VMS[@]}"; do
    IFS=',' read -r flavor ip network sg role <<< "${PLATFORM_VMS[$vm_name]}"

    echo "Bootstrapping $vm_name..."
    execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/bootstrap-ubuntu-advanced.sh ubuntu@$ip:/tmp/"
    execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@$ip 'chmod +x /tmp/bootstrap-ubuntu-advanced.sh && sudo /tmp/bootstrap-ubuntu-advanced.sh $role'"
done

# Phase 6: Deploy LOKI Stack
echo -e "\n${BLUE}Phase 6: Deploying LOKI Stack${NC}"
echo "==============================="

cat << 'EOF' > /tmp/loki-stack.yaml
version: '3.8'

services:
  loki:
    image: grafana/loki:2.9.10
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config:/etc/loki
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - monitoring

  blackbox-exporter:
    image: prom/blackbox-exporter:v0.25.0
    ports:
      - "9115:9115"
    volumes:
      - ./blackbox-config:/etc/blackbox_exporter
    command: --config.file=/etc/blackbox_exporter/blackbox.yml
    networks:
      - monitoring

  pushgateway:
    image: prom/pushgateway:v1.8.0
    ports:
      - "9092:9091"
    networks:
      - monitoring

  promtail:
    image: grafana/promtail:2.9.10
    volumes:
      - ./promtail-config:/etc/promtail
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - monitoring

  prometheus:
    image: prom/prometheus:v2.40.7
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus-config:/etc/prometheus
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3006:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-config:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:v0.25.0
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager-config:/etc/alertmanager
      - alertmanager-data:/alertmanager
    networks:
      - monitoring

volumes:
  loki-data:
  prometheus-data:
  grafana-data:
  alertmanager-data:

networks:
  monitoring:
    driver: bridge
EOF

cat <<EOF > /tmp/monitoring.env
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
EOF

cat << 'EOF' > /tmp/loki-local-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://alertmanager:9093
EOF

cat << 'EOF' > /tmp/promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*log
EOF

cat << 'EOF' > /tmp/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: node
    static_configs:
      - targets:
          - "10.20.0.10:9100"
          - "10.21.0.10:9100"
          - "10.21.0.11:9100"
          - "10.21.0.12:9100"
          - "10.22.0.10:9100"
          - "10.22.0.11:9100"
          - "10.22.0.12:9100"
          - "10.22.0.13:9100"
          - "10.22.0.14:9100"

  - job_name: pushgateway
    static_configs:
      - targets: ["pushgateway:9091"]

  - job_name: blackbox-http
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - http://10.20.0.10:3006
          - http://10.20.0.10:9091
          - http://10.20.0.10:3100/ready
          - http://10.22.0.10
          - http://10.22.0.11
          - http://10.22.0.12:8888
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
EOF

cat << 'EOF' > /tmp/blackbox.yml
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      preferred_ip_protocol: "ip4"
EOF

cat << 'EOF' > /tmp/alertmanager.yml
route:
  receiver: default

receivers:
  - name: default
EOF

cat << 'EOF' > /tmp/grafana-datasources.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
EOF

# Deploy LOKI to monitoring VMs
execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.20.0.10 'mkdir -p /opt/monitoring'" "Preparing monitoring directory" 2>/dev/null || true

stage_to_stx_tmp /tmp/loki-stack.yaml
stage_to_stx_tmp /tmp/monitoring.env
stage_to_stx_tmp /tmp/loki-local-config.yaml
stage_to_stx_tmp /tmp/promtail-config.yml
stage_to_stx_tmp /tmp/prometheus.yml
stage_to_stx_tmp /tmp/alertmanager.yml
stage_to_stx_tmp /tmp/grafana-datasources.yml
stage_to_stx_tmp /tmp/blackbox.yml

execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.20.0.10 'mkdir -p /opt/monitoring/{loki-config,promtail-config,prometheus-config,alertmanager-config,grafana-config/datasources,blackbox-config}'" "Preparing monitoring config dirs" 2>/dev/null || true

execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/loki-stack.yaml ubuntu@10.20.0.10:/opt/monitoring/docker-compose.yml" "Copy monitoring compose" 2>/dev/null || true
execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/monitoring.env ubuntu@10.20.0.10:/opt/monitoring/.env" "Copy monitoring env" 2>/dev/null || true
execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/loki-local-config.yaml ubuntu@10.20.0.10:/opt/monitoring/loki-config/local-config.yaml" "Copy loki config" 2>/dev/null || true
execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/promtail-config.yml ubuntu@10.20.0.10:/opt/monitoring/promtail-config/config.yml" "Copy promtail config" 2>/dev/null || true
execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/prometheus.yml ubuntu@10.20.0.10:/opt/monitoring/prometheus-config/prometheus.yml" "Copy prometheus config" 2>/dev/null || true
execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/alertmanager.yml ubuntu@10.20.0.10:/opt/monitoring/alertmanager-config/alertmanager.yml" "Copy alertmanager config" 2>/dev/null || true
execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/grafana-datasources.yml ubuntu@10.20.0.10:/opt/monitoring/grafana-config/datasources/datasources.yml" "Copy grafana datasources" 2>/dev/null || true
execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/blackbox.yml ubuntu@10.20.0.10:/opt/monitoring/blackbox-config/blackbox.yml" "Copy blackbox config" 2>/dev/null || true

execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.20.0.10 'cd /opt/monitoring && docker compose up -d'" "Starting monitoring stack" 2>/dev/null || true

# Phase 7: Set up Kubernetes Cluster
echo -e "\n${BLUE}Phase 7: Setting up Kubernetes${NC}"
echo "================================="

# Initialize Kubernetes on control plane
execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.21.0.10 'sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=10.21.0.10'" 2>/dev/null || true

# Configure kubectl on control plane
execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.21.0.10 'mkdir -p \$HOME/.kube && sudo cp -i /etc/kubernetes/admin.conf \$HOME/.kube/config && sudo chown \$(id -u):\$(id -g) \$HOME/.kube/config'" 2>/dev/null || true

# Install Calico CNI
execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.21.0.10 'kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/manifests/calico.yaml'" 2>/dev/null || true

# Get join command for workers
JOIN_CMD=$(execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.21.0.10 'sudo kubeadm token create --print-join-command'" 2>/dev/null || echo "")

# Join worker nodes
execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.21.0.11 'sudo $JOIN_CMD'" 2>/dev/null || true
execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.21.0.12 'sudo $JOIN_CMD'" 2>/dev/null || true

# Phase 8: Deploy Applications
echo -e "\n${BLUE}Phase 8: Deploying Applications${NC}"
echo "================================="

# Deploy HostBill
deploy_hostbill() {
    cat <<EOF > /tmp/hostbill.env
HOSTBILL_MYSQL_ROOT_PASSWORD=$HOSTBILL_MYSQL_ROOT_PASSWORD
HOSTBILL_MYSQL_PASSWORD=$HOSTBILL_MYSQL_PASSWORD
EOF

    cat << 'EOF' > /tmp/hostbill-docker-compose.yaml
version: '3.8'
services:
  hostbill:
    image: php:8.2-apache
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./hostbill:/var/www/html
    environment:
      - PHP_MEMORY_LIMIT=512M
      - PHP_MAX_EXECUTION_TIME=300
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=${HOSTBILL_MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=hostbill
      - MYSQL_USER=hostbill
      - MYSQL_PASSWORD=${HOSTBILL_MYSQL_PASSWORD}
    restart: unless-stopped

volumes:
  mysql-data:
EOF

    execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.22.0.10 'mkdir -p /opt/hostbill'" 2>/dev/null || true
    execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/hostbill-docker-compose.yaml ubuntu@10.22.0.10:/opt/hostbill/docker-compose.yml" 2>/dev/null || true
    execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/hostbill.env ubuntu@10.22.0.10:/opt/hostbill/.env" 2>/dev/null || true
    execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.22.0.10 'cd /opt/hostbill && docker compose up -d'" 2>/dev/null || true
}

deploy_hostbill

# Deploy WordPress
deploy_wordpress() {
    cat <<EOF > /tmp/wordpress.env
WORDPRESS_DB_PASSWORD=$WORDPRESS_DB_PASSWORD
EOF

    cat << 'EOF' > /tmp/wordpress-docker-compose.yaml
version: '3.8'
services:
  db:
    image: mysql:8.0
    environment:
      - MYSQL_DATABASE=wordpress
      - MYSQL_USER=wpuser
      - MYSQL_PASSWORD=${WORDPRESS_DB_PASSWORD}
      - MYSQL_ROOT_PASSWORD=${WORDPRESS_DB_PASSWORD}
    volumes:
      - wp_db:/var/lib/mysql
    restart: unless-stopped

  wordpress:
    image: wordpress:6.4-php8.2
    ports:
      - "80:80"
    volumes:
      - wp-data:/var/www/html
    environment:
      - WORDPRESS_DB_HOST=db
      - WORDPRESS_DB_NAME=wordpress
      - WORDPRESS_DB_USER=wpuser
      - WORDPRESS_DB_PASSWORD=${WORDPRESS_DB_PASSWORD}
    restart: unless-stopped

volumes:
  wp-data:
  wp_db:
EOF

    execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.22.0.11 'mkdir -p /opt/wordpress'" 2>/dev/null || true
    execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/wordpress-docker-compose.yaml ubuntu@10.22.0.11:/opt/wordpress/docker-compose.yml" 2>/dev/null || true
    execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/wordpress.env ubuntu@10.22.0.11:/opt/wordpress/.env" 2>/dev/null || true
    execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.22.0.11 'cd /opt/wordpress && docker compose up -d'" 2>/dev/null || true
}

deploy_wordpress

# Deploy Flarum
deploy_flarum() {
    cat <<EOF > /tmp/flarum.env
FLARUM_DB_PASSWORD=$FLARUM_DB_PASSWORD
EOF

    cat << 'EOF' > /tmp/flarum-docker-compose.yaml
version: '3.8'
services:
  mariadb:
    image: mariadb:10.11
    environment:
      - MYSQL_DATABASE=flarum
      - MYSQL_USER=flarum
      - MYSQL_PASSWORD=${FLARUM_DB_PASSWORD}
      - MYSQL_ROOT_PASSWORD=${FLARUM_DB_PASSWORD}
    volumes:
      - flarum_db:/var/lib/mysql
    restart: unless-stopped

  flarum:
    image: mondedie/flarum:latest
    ports:
      - "8888:8888"
    volumes:
      - flarum-assets:/var/www/html/flarum/app/storage
      - flarum-extensions:/var/www/html/flarum/extensions
    environment:
      - DB_HOST=mariadb
      - DB_NAME=flarum
      - DB_USER=flarum
      - DB_PASS=${FLARUM_DB_PASSWORD}
    restart: unless-stopped

volumes:
  flarum-assets:
  flarum-extensions:
  flarum_db:
EOF

    execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.22.0.12 'mkdir -p /opt/flarum'" 2>/dev/null || true
    execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/flarum-docker-compose.yaml ubuntu@10.22.0.12:/opt/flarum/docker-compose.yml" 2>/dev/null || true
    execute_on_stx "scp -o StrictHostKeyChecking=no -i /tmp/stx_vm_key /tmp/flarum.env ubuntu@10.22.0.12:/opt/flarum/.env" 2>/dev/null || true
    execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/stx_vm_key ubuntu@10.22.0.12 'cd /opt/flarum && docker compose up -d'" 2>/dev/null || true
}

deploy_flarum

# Phase 9: Implement Comprehensive SLA Monitoring
echo -e "\n${BLUE}Phase 9: Implementing SLA Monitoring${NC}"
echo "====================================="

echo "SLA monitoring is provided by Prometheus + blackbox-exporter + Alertmanager. No synthetic SLA generator is deployed."
if false; then

cat << 'EOF' > /tmp/sla-monitoring-advanced.py
#!/usr/bin/env python3
import requests
import time
import json
import psutil
from datetime import datetime, timedelta
from collections import deque
import threading
import queue

class SLAMonitor:
    def __init__(self):
        self.metrics_queue = queue.Queue()
        self.incident_history = deque(maxlen=1000)
        self.mttr_window = deque(maxlen=100)
        self.throughput_samples = deque(maxlen=300)  # 5 minutes at 1s intervals

        # SLA Targets
        self.sla_targets = {
            'availability': 99.9,
            'mttr': 900,  # 15 minutes
            'throughput': 1000,  # RPS
            'response_time': 0.5  # seconds
        }

        # Services to monitor
        self.services = [
            {'name': 'loki', 'url': 'http://10.20.0.10:3100/ready'},
            {'name': 'prometheus', 'url': 'http://10.20.0.10:9090/-/healthy'},
            {'name': 'grafana', 'url': 'http://10.20.0.10:3000/api/health'},
            {'name': 'hostbill', 'url': 'http://10.22.0.10/health'},
            {'name': 'wordpress', 'url': 'http://10.22.0.11'},
            {'name': 'flarum', 'url': 'http://10.22.0.12:8888'},
            {'name': 'k8s-api', 'url': 'https://10.21.0.10:6443/healthz'},
        ]

    def check_service_health(self, service):
        try:
            start_time = time.time()
            response = requests.get(service['url'], timeout=5, verify=False)
            response_time = time.time() - start_time

            if response.status_code == 200:
                return {
                    'status': 'UP',
                    'response_time': response_time,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'DOWN',
                    'response_time': response_time,
                    'error': f'HTTP {response.status_code}',
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            return {
                'status': 'DOWN',
                'response_time': None,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def calculate_availability(self):
        up_count = sum(1 for s in self.services if s.get('last_check', {}).get('status') == 'UP')
        return (up_count / len(self.services)) * 100

    def calculate_mttr(self):
        if not self.mttr_window:
            return 0
        return sum(self.mttr_window) / len(self.mttr_window)

    def calculate_throughput(self):
        # Synthetic throughput: successful checks per minute (not true user traffic RPS)
        window = list(self.throughput_samples)
        if not window:
            return 0
        return sum(window) / len(window)

    def detect_incidents(self):
        incidents = []
        for service in self.services:
            last_check = service.get('last_check', {})
            if last_check.get('status') == 'DOWN':
                incidents.append({
                    'service': service['name'],
                    'detected_at': datetime.now(),
                    'error': last_check.get('error', 'Unknown')
                })
        return incidents

    def calculate_sla_compliance(self):
        availability = self.calculate_availability()
        mttr = self.calculate_mttr()
        throughput = self.calculate_throughput()

        return {
            'availability': {
                'current': availability,
                'target': self.sla_targets['availability'],
                'met': availability >= self.sla_targets['availability']
            },
            'mttr': {
                'current': mttr,
                'target': self.sla_targets['mttr'],
                'met': mttr <= self.sla_targets['mttr']
            },
            'throughput': {
                'current': throughput,
                'target': self.sla_targets['throughput'],
                'met': throughput >= self.sla_targets['throughput']
            }
        }

    def generate_report(self):
        compliance = self.calculate_sla_compliance()
        incidents = self.detect_incidents()

        report = {
            'timestamp': datetime.now().isoformat(),
            'sla_compliance': compliance,
            'active_incidents': len(incidents),
            'services': self.services,
            'system_metrics': {
                'cpu_percent': psutil.cpu_percent(),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_usage': psutil.disk_usage('/').percent
            }
        }

        return report

    def run_monitoring_loop(self):
        print("=== SLA Monitoring Started ===")

        while True:
            # Check all services
            successes = 0
            for service in self.services:
                service['last_check'] = self.check_service_health(service)
                if service['last_check'].get('status') == 'UP':
                    successes += 1

            # Update synthetic throughput sample
            self.throughput_samples.append(successes)

            # Generate and print report
            report = self.generate_report()

            print(f"\n{report['timestamp']}")
            print(f"Availability: {report['sla_compliance']['availability']['current']:.1f}% (Target: {report['sla_compliance']['availability']['target']}%) {'✓' if report['sla_compliance']['availability']['met'] else '✗'}")
            print(f"MTTR: {report['sla_compliance']['mttr']['current']:.0f}s (Target: {report['sla_compliance']['mttr']['target']}s) {'✓' if report['sla_compliance']['mttr']['met'] else '✗'}")
            print(f"Throughput: {report['sla_compliance']['throughput']['current']:.0f} RPS (Target: {report['sla_compliance']['throughput']['target']} RPS) {'✓' if report['sla_compliance']['throughput']['met'] else '✗'}")

            # Log to file
            with open("/var/log/sla-metrics-advanced.log", "a") as f:
                f.write(json.dumps(report) + "\n")

            # Send to Pushgateway (Prometheus scrapes pushgateway)
            try:
                metrics_data = {
                    'availability': report['sla_compliance']['availability']['current'],
                    'mttr': report['sla_compliance']['mttr']['current'],
                    'throughput': report['sla_compliance']['throughput']['current'],
                    'cpu_percent': report['system_metrics']['cpu_percent'],
                    'memory_percent': report['system_metrics']['memory_percent']
                }

                for metric, value in metrics_data.items():
                    requests.post(
                        f"http://10.20.0.10:9091/metrics/job/sla_monitoring",
                        data=f"{metric} {value}\n",
                        timeout=5,
                    )
            except:
                pass  # Ignore Prometheus errors

            time.sleep(60)  # Check every minute

def main():
    monitor = SLAMonitor()
    monitor.run_monitoring_loop()

if __name__ == "__main__":
    main()
EOF

fi

echo "Skipping python SLA pusher (use Prometheus + blackbox-exporter for real availability/latency)"

# Phase 10: Create Production Delivery Metrics
echo -e "\n${BLUE}Phase 10: Production Delivery Metrics${NC}"
echo "======================================"

if false; then

cat << 'EOF' > /tmp/delivery-metrics.sh
#!/bin/bash
# Production Delivery Metrics Tracker

METRICS_FILE="/var/log/delivery-metrics.log"
TIMESTAMP=$(date +%s)

record_metric() {
    local metric_name=$1
    local metric_value=$2
    local unit=$3

    echo "{\"timestamp\": $TIMESTAMP, \"metric\": \"$metric_name\", \"value\": $metric_value, \"unit\": \"$unit\"}" >> $METRICS_FILE
}

measure_deployment() {
    local app_name=$1
    local start_time=$(date +%s)

    echo "Deploying $app_name..."
    sleep $((RANDOM % 30 + 10))

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    record_metric "deployment_duration" $duration "seconds"
    record_metric "deployment_success" 1 "boolean"

    echo "$app_name deployed in ${duration}s"
}

calculate_delivery_metrics() {
    local total_deployments=$(grep -c "deployment_duration" $METRICS_FILE 2>/dev/null || echo 0)
    local successful_deployments=$(grep -c "deployment_success.*1" $METRICS_FILE 2>/dev/null || echo 0)

    if [ $total_deployments -gt 0 ]; then
        local success_rate=$((successful_deployments * 100 / total_deployments))
        local avg_time=$(grep "deployment_duration" $METRICS_FILE 2>/dev/null | jq -s 'map(.value) | add / length' 2>/dev/null || echo 0)

        echo "Production Delivery Metrics:"
        echo "- Total Deployments: $total_deployments"
        echo "- Success Rate: ${success_rate}%"
        echo "- Average Deployment Time: ${avg_time}s"

        record_metric "success_rate" $success_rate "percent"
        record_metric "avg_deployment_time" $avg_time "seconds"
    fi
}

echo "Starting production delivery metrics tracking..."

measure_deployment "hostbill"
measure_deployment "wordpress"
measure_deployment "flarum"
measure_deployment "affiliate"
measure_deployment "trading"

calculate_delivery_metrics

echo "Metrics saved to $METRICS_FILE"
EOF

fi

    echo "Skipping mock delivery metrics script"

    # Phase 11: Final Validation and Summary
    echo -e "\n${BLUE}Phase 11: Final Validation${NC}"
    echo "=========================="

    post_deploy_errors=0
    post_fail() { post_deploy_errors=$((post_deploy_errors + 1)); }

    http_check_from_stx() {
        local name="$1"
        local url="$2"
        if execute_on_stx "python3 - <<'PY'
import sys
import time
import urllib.request

url = \"$url\"

for _ in range(40):
  try:
    r = urllib.request.urlopen(url, timeout=5)
    code = getattr(r, 'status', 200)
    if 200 <= int(code) < 400:
      sys.exit(0)
  except Exception:
    pass
  time.sleep(5)

sys.exit(1)
PY" "HTTP check: $name ($url)" >/dev/null; then
            echo -e "  ✓ $name"
        else
            echo -e "  ✗ $name"
            post_fail
        fi
    }

    prom_query_check() {
        local name="$1"
        local query="$2"
        local min_value="$3"

        if execute_on_stx "python3 - <<'PY'
import json
import sys
import time
import urllib.parse
import urllib.request

query = '''$query'''
min_value = float('''$min_value''')

def fetch(q):
  url = 'http://10.20.0.10:9091/api/v1/query?query=' + urllib.parse.quote(q, safe='')
  with urllib.request.urlopen(url, timeout=5) as r:
    return json.loads(r.read().decode('utf-8', 'ignore'))

for _ in range(40):
  try:
    data = fetch(query)
    if data.get('status') != 'success':
      raise RuntimeError('non-success')
    result = (data.get('data') or {}).get('result') or []
    if not result:
      raise RuntimeError('empty')
    value = float(result[0]['value'][1])
    if value >= min_value:
      sys.exit(0)
  except Exception:
    pass
  time.sleep(5)

sys.exit(1)
PY" "Prometheus query: $name" >/dev/null; then
            echo -e "  ✓ $name"
        else
            echo -e "  ✗ $name"
            post_fail
        fi
    }

    echo "Validating OpenStack VM state + SSH reachability..."
    for vm_name in "${!PLATFORM_VMS[@]}"; do
        IFS=',' read -r flavor ip network sg role <<< "${PLATFORM_VMS[$vm_name]}"
        echo -e "\n${YELLOW}$vm_name ($ip):${NC}"

        if execute_on_stx "$OPENSTACK_CMD server show -f value -c status $vm_name | grep -q '^ACTIVE$'" "Checking OpenStack status for $vm_name" >/dev/null; then
            echo -e "  ✓ OpenStack status ACTIVE"
        else
            echo -e "  ✗ OpenStack status not ACTIVE"
            post_fail
        fi

        if execute_on_stx "for i in \$(seq 1 40); do ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 -o BatchMode=yes -i /tmp/stx_vm_key ubuntu@$ip 'echo OK' >/dev/null 2>&1 && exit 0; sleep 5; done; exit 1" "SSH check for $vm_name" >/dev/null; then
            echo -e "  ✓ SSH Accessible"
            HOSTNAME_OUT=$(execute_on_stx "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i /tmp/stx_vm_key ubuntu@$ip 'hostname'" "Hostname for $vm_name" 2>/dev/null || true)
            if [ -n "${HOSTNAME_OUT:-}" ]; then
                echo -e "  ✓ ${HOSTNAME_OUT}"
            fi
        else
            echo -e "  ✗ SSH Not Accessible"
            post_fail
        fi
    done

    echo -e "\nValidating monitoring endpoints..."
    http_check_from_stx "Loki ready" "http://10.20.0.10:3100/ready"
    http_check_from_stx "Prometheus ready" "http://10.20.0.10:9091/-/ready"
    http_check_from_stx "Grafana health" "http://10.20.0.10:3006/api/health"
    http_check_from_stx "Alertmanager ready" "http://10.20.0.10:9093/-/ready"
    http_check_from_stx "Blackbox exporter metrics" "http://10.20.0.10:9115/metrics"

    echo -e "\nValidating Prometheus scrape + blackbox signal..."
    prom_query_check "Node exporter targets up (expect 9)" "sum(up{job=\"node\"})" "9"
    prom_query_check "Blackbox probes successful (expect 6)" "sum(probe_success{job=\"blackbox-http\"})" "6"

    echo -e "\nValidating Kubernetes cluster..."
    if execute_on_stx "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i /tmp/stx_vm_key ubuntu@10.21.0.10 'kubectl get nodes --no-headers | wc -l | grep -qE \"^(3|[4-9][0-9]*)$\"'" "K8s: expected >=3 nodes" >/dev/null; then
        echo -e "  ✓ Nodes registered"
    else
        echo -e "  ✗ Nodes not registered"
        post_fail
    fi

    if execute_on_stx "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i /tmp/stx_vm_key ubuntu@10.21.0.10 'kubectl get nodes --no-headers | awk \"{if(\$2 !~ /^Ready/) bad=1} END{exit bad}\"'" "K8s: all nodes Ready" >/dev/null; then
        echo -e "  ✓ All nodes Ready"
    else
        echo -e "  ✗ One or more nodes not Ready"
        post_fail
    fi

    if execute_on_stx "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i /tmp/stx_vm_key ubuntu@10.21.0.10 'kubectl -n kube-system wait --for=condition=Ready pod -l k8s-app=calico-node --timeout=180s >/dev/null'" "K8s: Calico pods Running" >/dev/null; then
        echo -e "  ✓ Calico pods Running"
    else
        echo -e "  ✗ Calico pods not Running"
        post_fail
    fi

    if execute_on_stx "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i /tmp/stx_vm_key ubuntu@10.21.0.10 'kubectl delete ns stx-smoke --ignore-not-found >/dev/null 2>&1; kubectl create ns stx-smoke >/dev/null; kubectl -n stx-smoke create deployment nginx --image=nginx >/dev/null; kubectl -n stx-smoke rollout status deploy/nginx --timeout=180s; kubectl delete ns stx-smoke >/dev/null'" "K8s: smoke workload" >/dev/null; then
        echo -e "  ✓ Smoke workload OK"
    else
        echo -e "  ✗ Smoke workload failed"
        post_fail
    fi

    if [ "$post_deploy_errors" -ne 0 ]; then
        echo -e "\n${RED}Post-deploy validation FAILED:${NC} ${post_deploy_errors} checks failed" >&2
        exit 1
    fi

    echo -e "\n${GREEN}=== DEPLOYMENT COMPLETE ===${NC}"
    echo ""
    echo -e "${CYAN}Infrastructure Summary:${NC}"
    echo "- StarlingX Host: $STX_SERVER"
    echo "- Ubuntu 22.04 VMs: ${#PLATFORM_VMS[@]}"
    echo "- Container Runtime: containerd (via Docker Engine)"
    echo "- Kubernetes: v1.29 (3 nodes)"
    echo "- Monitoring: LOKI + Prometheus + Grafana + Alertmanager + blackbox-exporter"
    echo ""
    echo -e "${CYAN}Access URLs:${NC}"
    echo "- LOKI: http://10.20.0.10:3100"
    echo "- Prometheus: http://10.20.0.10:9091"
    echo "- Grafana: http://10.20.0.10:3006 (admin, password in secrets file)"
    echo "- Alertmanager: http://10.20.0.10:9093"
    echo "- HostBill: http://10.22.0.10"
    echo "- WordPress: http://10.22.0.11"
    echo "- Flarum: http://10.22.0.12:8888"
    echo ""
    echo -e "${CYAN}SLA Metrics:${NC}"
    echo "- Availability Target: ${SLA_AVAILABILITY_TARGET}%"
    echo "- MTTR Target: ${SLA_MTTR_TARGET_SECONDS}s"
    echo "- Throughput Target: ${SLA_THROUGHPUT_TARGET_RPS} RPS"
    echo ""
    echo -e "${CYAN}SSH Access:${NC}"
    echo "Key (local machine): /tmp/stx_vm_key"
    echo "(VM IPs are private; use STX as a jump host.)"
    echo ""
    echo -e "${GREEN}✓ STX LOKI Greenfield Infrastructure is LIVE!${NC}"
    echo -e "${GREEN}✓ Ready for STX 12 migration when available${NC}"
    echo ""
    echo -e "${YELLOW}Local secrets file: ${SECRETS_FILE}${NC}"
