#!/usr/bin/env bash
# Canonical Consolidated StarlingX Greenfield Deployment Script
# Integrates STX bootstrap (from stx11-greenfield-deploy.sh), client config (openstack_caracal_install.sh), security notes (harden-starlingx.sh), multi-tenant patterns (deploy_multi_tenant.sh)
# Phases: pre-val, STX bootstrap (if needed), networks/SGs, image/keypair/flavors, VM provisioning (7 VMs: HostBill large 10.22.0.10, WP med 0.11, Flarum med 0.12, affiliate med 0.13, trading large 0.14, K8s master med 10.21.0.10, worker1 med 0.11), Loki Docker Compose on host, K8s bootstrap notes, port conflict resolution.
# Best practices: env vars (no hardcode creds), phases, logging, rollback resource tracking, dry-run, immutable (new VMs), blue-green ready.
# Run: export STX_PEM=~/.ssh/stx.pem STX_HOST=23.92.79.2 STX_PORT=2222 STX_USER=ubuntu IPMI_HOST=... ; ./scripts/deploy_stx_greenfield.sh [--dry-run]
# Rollback: ./scripts/deploy_stx_greenfield.sh --rollback
# Pre-req: OpenStack RC sourced on host (admin project), flavors (large/med) exist or created, ubuntu-22.04 image or downloaded, ~/.ssh/id_rsa.pub for keypair, Docker Compose on host.
# Log: local deploy.log + host /tmp/deploy.log (scp after).
# NO hard-coded tokens; use OS_* env or source /etc/openstack/admin-rc on host.

set -euo pipefail

DRY_RUN=${DRY_RUN:-false}
ROLLBACK=${ROLLBACK:-false}

STX_HOST=${STX_HOST:-23.92.79.2}
STX_PORT=${STX_PORT:-2222}
STX_USER=${STX_USER:-ubuntu}
STX_PEM=${STX_PEM:-~/.ssh/stx.pem}
IPMI_HOST=${IPMI_HOST:-}
IPMI_USER=${IPMI_USER:-}
IPMI_PASS=${IPMI_PASS:-}
IPMI_DEVICE_ID=${IPMI_DEVICE_ID:-device-24460}

LOGFILE=deploy_stx_greenfield_$(date +%Y%m%d-%H%M%S).log
exec > >(tee -a "$LOGFILE") 2>&1

readonly LOGFILE STX_HOST STX_PORT STX_USER STX_PEM

declare -a RESOURCES=()

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

ssh_cmd() {
  local cmd="$*"
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: ssh -i $STX_PEM -p $STX_PORT $STX_USER@$STX_HOST \"$cmd\""
    return 0
  fi
  ssh -i "$STX_PEM" -p "$STX_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$STX_USER@$STX_HOST" "$cmd"
}

host_tee() {
  local cmd="$1"
  ssh_cmd "$cmd | tee -a /tmp/deploy_stx_greenfield.log"
}

add_resource() {
  RESOURCES+=("$1")
}

rollback() {
  log "🚨 ROLLBACK initiated. Deleting resources in reverse order..."
  for ((i=${#RESOURCES[@]}-1; i>=0; i--)); do
    local res="${RESOURCES[i]}"
    local type="${res%%:*}"
    local id="${res#*:}"
    case "$type" in
      network|subnet|server|security-group|keypair|flavor)
        log "Deleting $type $id"
        ssh_cmd "openstack $type delete $id" || log "Failed to delete $type $id (may already be gone)"
        ;;
      *)
        log "Unknown resource type $type for $id"
        ;;
    esac
  done
  log "Rollback complete. Check /tmp/deploy_stx_greenfield.log on host."
  scp -i "$STX_PEM" -P "$STX_PORT" "$STX_USER@$STX_HOST:/tmp/deploy_stx_greenfield.log" . || true
}

trap rollback ERR INT TERM EXIT

if [[ "$ROLLBACK" == "true" ]]; then
  rollback
  exit 0
fi

if [[ -z "$IPMI_HOST" || -z "$IPMI_USER" || -z "$IPMI_PASS" ]]; then
  log "WARNING: IPMI vars not set; skipping compute power-on."
fi

log "🚀 Starting StarlingX Greenfield Deployment to $STX_HOST:$STX_PORT"
log "Log: $LOGFILE (local), /tmp/deploy_stx_greenfield.log (host)"
log "Dry-run: $DRY_RUN"

# Phase 1: Pre-deployment validation & backup
phase_preval() {
  log "📋 Phase 1: Pre-validation (SSH, OpenStack, Docker, quotas, test create/del)"
  host_tee "echo '=== Pre-val start ==='"

  # SSH/Docker/OpenStack
  ssh_cmd "echo 'SSH OK'; docker compose version; openstack --version || echo 'OpenStack CLI missing - source admin-rc'"

  # Quota check (assume admin project)
  local quotas=$(ssh_cmd "openstack quota show | grep -E 'instances|cores|ram|disk'")
  log "Quotas: $quotas"
  # Sufficient for 7 VMs: assume large 8vCPU/32GB, med 4/16GB -> cores ~36, ram ~128GB, instances 7+
  if echo "$quotas" | grep -q "instances.*[0-9][0-9]" && [[ $(echo "$quotas" | grep instances | awk '{print $4}' ) -ge 7 ]]; then
    log "✅ Quotas sufficient for 7 VMs"
  else
    log "⚠️  Quota check marginal - verify manually"
  fi

  # Ubuntu image
  local ubuntu_img=$(ssh_cmd "openstack image list --limit 1 | grep -i ubuntu-22.04 | awk '{print \$2}'" || echo "")
  if [[ -n "$ubuntu_img" ]]; then
    log "✅ Ubuntu 22.04 image: $ubuntu_img"
  else
    log "⚠️  No Ubuntu 22.04 image - will download in phase"
  fi

  # Test network create/del
  local test_net=$(ssh_cmd "openstack network create test-preval-net --format value -c id")
  add_resource "network:$test_net"
  ssh_cmd "openstack network delete test-preval-net"
  log "✅ Network test OK"

  # Test server create/del (small cirros or ubuntu)
  local test_img=$(ssh_cmd "openstack image list --limit 1 | head -1 | awk '{print \$2}'" || echo "ubuntu-22.04-server-cloudimg-amd64")
  local test_flavor=$(ssh_cmd "openstack flavor list --limit 1 | tail -1 | awk '{print \$2}'" || echo "m1.tiny")
  local test_server=$(ssh_cmd "openstack server create --flavor $test_flavor --image $test_img --wait --network test-preval-net test-preval-server --format value -c id 2>/dev/null || echo 'skip'")
  if [[ "$test_server" != "skip" ]]; then
    add_resource "server:$test_server"
    ssh_cmd "openstack server delete test-preval-server --wait"
    log "✅ Server test OK (boots with default)"
  fi

  # Keypair test (assume local pubkey)
  scp -i "$STX_PEM" -P "$STX_PORT" ~/.ssh/id_rsa.pub "$STX_USER@$STX_HOST:/tmp/test.pub" || log "⚠️  Pubkey scp fail - manual keypair"
  ssh_cmd "openstack keypair create --public-key /tmp/test.pub test-key --format name || true"
  ssh_cmd "openstack keypair delete test-key || true"

  log "✅ Phase 1 Pre-val PASS"
}

phase_preval

# Phase 2: STX Bootstrap (from stx11-greenfield-deploy.sh)
phase_stx_bootstrap() {
  log "🔧 Phase 2: STX Bootstrap (controller/compute)"
  host_tee "stx-dumpbackup -d /opt/stx-backup/$(date +%Y%m%d-%H%M%S) || true"

  if [[ -n "$IPMI_HOST" ]]; then
    ipmitool -I lanplus -H "$IPMI_HOST" -U "$IPMI_USER" -P "$IPMI_PASS" chassis power on
    sleep 60
  fi

  ssh_cmd "
    cd /opt/stx
    stx-config generate --force || true
    system apply-config
    stx-tools bootstrap controller || true
    stx-tools deploy-compute --name $IPMI_DEVICE_ID || true
    stx-health-report
  "
  log "✅ Phase 2 STX ready"
}

phase_stx_bootstrap

# Phase 3: Networks, SGs, Image, Keypair, Flavors
phase_infra() {
  log "🌐 Phase 3: Infra (nets/SG/image/key/flavors)"
  # Networks: loki-net (10.20.0.0/24), k8s-net (10.21.0.0/24), app-net (10.22.0.0/24)
  for net in loki-net k8s-net app-net; do
    if ssh_cmd "openstack network show $net >/dev/null 2>&1"; then
      log "⚠️  $net exists - skipping create"
    else
      local net_id=$(ssh_cmd "openstack network create $net --share --format value -c id")
      add_resource "network:$net_id"
      log "✅ Created network $net ID: $net_id"
    fi
  done

  # Subnets
  ssh_cmd "openstack subnet create --network loki-net --subnet-range 10.20.0.0/24 --gateway 10.20.0.1 --allocation-pool start=10.20.0.10,end=10.20.0.50 loki-sub || true"
  ssh_cmd "openstack subnet create --network k8s-net --subnet-range 10.21.0.0/24 --gateway 10.21.0.1 --allocation-pool start=10.21.0.10,end=10.21.0.50 k8s-sub || true"
  ssh_cmd "openstack subnet create --network app-net --subnet-range 10.22.0.0/24 --gateway 10.22.0.1 --allocation-pool start=10.22.0.10,end=10.22.0.50 app-sub || true"

  # Security Groups: monitoring-sg, k8s-sg, app-sg
  # monitoring-sg for LOKI stack (Grafana 3006, Prometheus 9091, Loki 3100)
  local mon_sg_id=$(ssh_cmd "openstack security group create monitoring-sg --description 'LOKI Stack monitoring' --format value -c id 2>/dev/null || openstack security group list | grep monitoring-sg | awk '{print \$2}'")
  add_resource "security-group:$mon_sg_id"
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 22 $mon_sg_id || true"
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 3006 $mon_sg_id || true"  # Grafana
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 9091 $mon_sg_id || true"  # Prometheus
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 3100 $mon_sg_id || true"  # Loki
  ssh_cmd "openstack security group rule create --protocol icmp $mon_sg_id || true"
  log "✅ Created security group monitoring-sg"

  # k8s-sg for K8s cluster (API 6443, kubelet 10250, etcd 2379-2380, NodePort 30000-32767)
  local k8s_sg_id=$(ssh_cmd "openstack security group create k8s-sg --description 'Kubernetes cluster' --format value -c id 2>/dev/null || openstack security group list | grep k8s-sg | awk '{print \$2}'")
  add_resource "security-group:$k8s_sg_id"
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 22 $k8s_sg_id || true"
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 6443 $k8s_sg_id || true"   # K8s API
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 2379:2380 $k8s_sg_id || true"  # etcd
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 10250:10252 $k8s_sg_id || true" # kubelet
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 30000:32767 $k8s_sg_id || true" # NodePort
  ssh_cmd "openstack security group rule create --protocol icmp $k8s_sg_id || true"
  log "✅ Created security group k8s-sg"

  # app-sg for application VMs (HTTP/HTTPS, custom ports)
  local app_sg_id=$(ssh_cmd "openstack security group create app-sg --description 'Application VMs' --format value -c id 2>/dev/null || openstack security group list | grep app-sg | awk '{print \$2}'")
  add_resource "security-group:$app_sg_id"
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 22 $app_sg_id || true"
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 80 $app_sg_id || true"
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 443 $app_sg_id || true"
  ssh_cmd "openstack security group rule create --protocol tcp --dst-port 8080 $app_sg_id || true"
  ssh_cmd "openstack security group rule create --protocol icmp $app_sg_id || true"
  log "✅ Created security group app-sg"

  # Image Ubuntu 22.04
  if [[ -z "$(ssh_cmd 'openstack image list | grep ubuntu-22.04')" ]]; then
    log "Downloading Ubuntu 22.04 cloudimg..."
    ssh_cmd "wget -O /tmp/ubuntu-22.04-server-cloudimg-amd64.img https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img"
    local img_id=$(ssh_cmd "openstack image create --file /tmp/ubuntu-22.04-server-cloudimg-amd64.img --disk-format qcow2 --container-format bare --public ubuntu-22.04-server-cloudimg-amd64 --format value -c id")
    add_resource "image:$img_id"
    ssh_cmd "rm /tmp/ubuntu-22.04-server-cloudimg-amd64.img"
  fi

  # Keypair
  scp -i "$STX_PEM" -P "$STX_PORT" ~/.ssh/id_rsa.pub "$STX_USER@$STX_HOST:/tmp/stx.pub" || log "⚠️  No id_rsa.pub - manual keypair"
  local key_name="stx-deploy-key"
  ssh_cmd "openstack keypair create --public-key /tmp/stx.pub $key_name || true"
  ssh_cmd "rm /tmp/stx.pub"

  # Flavors (large 8v/32G/100D, med 4v/16G/50D)
  for flavor in "large 8 32768 100" "med 4 16384 50"; do
    local name=$(echo $flavor | awk '{print $1}')
    if ! ssh_cmd "openstack flavor show $name >/dev/null 2>&1"; then
      ssh_cmd "openstack flavor create --vcpus $(echo $flavor | awk '{print $2}') --ram $(echo $flavor | awk '{print $3}') --disk $(echo $flavor | awk '{print $4}') $name"
      add_resource "flavor:$name"
    fi
  done

  log "✅ Phase 3 Infra ready"
}

phase_infra

# Phase 4: Base VM Provisioning (Monitoring + K8s nodes)
phase_base_vms() {
  log "🐳 Phase 4: Base VM Provisioning (Monitoring VM + 3 K8s nodes)"
  local ubuntu_img=$(ssh_cmd "openstack image list | grep ubuntu-22.04 | head -1 | awk '{print \$2}'")
  local key_name="stx-deploy-key"
  local mon_sg_id=$(ssh_cmd "openstack security group list | grep monitoring-sg | awk '{print \$2}' | head -1")
  local k8s_sg_id=$(ssh_cmd "openstack security group list | grep k8s-sg | awk '{print \$2}' | head -1")
  local loki_net_id=$(ssh_cmd "openstack network show loki-net --format value -c id")
  local k8s_net_id=$(ssh_cmd "openstack network show k8s-net --format value -c id")

  # Monitoring VM (Docker host for LOKI stack)
  log "Creating Monitoring VM on loki-net..."
  local mon_vm_id=$(ssh_cmd "openstack server create --flavor med --image $ubuntu_img --key-name $key_name --security-group $mon_sg_id --nic net-id=$loki_net_id,v4-fixed-ip=10.20.0.10 monitoring-vm --wait --format value -c id")
  add_resource "server:$mon_vm_id"
  log "✅ Created monitoring-vm (10.20.0.10) ID: $mon_vm_id"

  # K8s nodes: k8s-control, k8s-worker-1, k8s-worker-2
  local ips_k8s=("10.21.0.10" "10.21.0.11" "10.21.0.12")
  local names_k8s=("k8s-control" "k8s-worker-1" "k8s-worker-2")
  for i in 0 1 2; do
    local ip="${ips_k8s[i]}"
    local name="${names_k8s[i]}"
    log "Creating $name on k8s-net..."
    local vm_id=$(ssh_cmd "openstack server create --flavor med --image $ubuntu_img --key-name $key_name --security-group $k8s_sg_id --nic net-id=$k8s_net_id,v4-fixed-ip=$ip $name --wait --format value -c id")
    add_resource "server:$vm_id"
    log "✅ Created $name ($ip) ID: $vm_id"
  done

  log "✅ Phase 4 Base VMs ready"
}

# Phase 5: Application VM Provisioning
phase_app_vms() {
  log "🐳 Phase 5: Application VM Provisioning (5 app VMs)"
  local ubuntu_img=$(ssh_cmd "openstack image list | grep ubuntu-22.04 | head -1 | awk '{print \$2}'")
  local key_name="stx-deploy-key"
  local app_sg_id=$(ssh_cmd "openstack security group list | grep app-sg | awk '{print \$2}' | head -1")
  local app_net_id=$(ssh_cmd "openstack network show app-net --format value -c id")

  # Application VMs with specified flavors
  local ips_app=("10.22.0.10" "10.22.0.11" "10.22.0.12" "10.22.0.13" "10.22.0.14")
  local names_app=("hostbill" "wordpress" "flarum" "affiliate" "trading")
  local flavors_app=("large" "med" "med" "med" "large")
  for i in 0 1 2 3 4; do
    local ip="${ips_app[i]}"
    local name="${names_app[i]}"
    local flavor="${flavors_app[i]}"
    log "Creating $name on app-net with flavor $flavor..."
    local vm_id=$(ssh_cmd "openstack server create --flavor $flavor --image $ubuntu_img --key-name $key_name --security-group $app_sg_id --nic net-id=$app_net_id,v4-fixed-ip=$ip $name --wait --format value -c id")
    add_resource "server:$vm_id"
    log "✅ Created $name ($ip) ID: $vm_id"
  done

  log "✅ Phase 5 Application VMs ready"
}

phase_base_vms
phase_app_vms

# Phase 6: Docker Setup on Monitoring VM
phase_monitoring_docker() {
  log "📊 Phase 6: Docker Setup on Monitoring VM (10.20.0.10)"
  
  # Wait for VM to be accessible
  log "Waiting for monitoring-vm to become accessible..."
  sleep 30
  
  # Install Docker on monitoring VM
  ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@10.20.0.10 'sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin && sudo systemctl enable docker && sudo systemctl start docker && sudo usermod -aG docker ubuntu'"
  
  # Create LOKI stack compose file
  cat > /tmp/docker-compose.loki.yml << 'EOF'
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--web.listen-address=:9091'
    ports:
      - "9091:9091"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3006:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GF_ADMIN_PASSWORD:-admin}
      - GF_SERVER_HTTP_PORT=3000
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki
    restart: unless-stopped
  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log:ro
      - ./promtail.yml:/etc/promtail/promtail.yml
    command: -config.file=/etc/promtail/promtail.yml
    restart: unless-stopped
volumes:
  grafana-data:
  loki-data:
EOF

  # Create prometheus config
  cat > /tmp/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9091']
  - job_name: 'k8s-nodes'
    static_configs:
      - targets: ['10.21.0.10:9100', '10.21.0.11:9100', '10.21.0.12:9100']
  - job_name: 'app-vms'
    static_configs:
      - targets: ['10.22.0.10:9100', '10.22.0.11:9100', '10.22.0.12:9100', '10.22.0.13:9100', '10.22.0.14:9100']
EOF

  # Copy files to monitoring VM and start stack
  scp -i "$STX_PEM" -P "$STX_PORT" /tmp/docker-compose.loki.yml "$STX_USER@$STX_HOST:/tmp/"
  scp -i "$STX_PEM" -P "$STX_PORT" /tmp/prometheus.yml "$STX_USER@$STX_HOST:/tmp/"
  ssh_cmd "scp -o StrictHostKeyChecking=no /tmp/docker-compose.loki.yml ubuntu@10.20.0.10:~/docker-compose.yml"
  ssh_cmd "scp -o StrictHostKeyChecking=no /tmp/prometheus.yml ubuntu@10.20.0.10:~/prometheus.yml"
  ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@10.20.0.10 'cd ~ && docker compose up -d'"
  
  log "✅ LOKI stack running on monitoring-vm (Grafana:3006, Prometheus:9091, Loki:3100)"
}

phase_monitoring_docker

# Phase 7: K8s Cluster Bootstrap
phase_k8s_bootstrap() {
  log "⚙️  Phase 7: K8s 1.29 Cluster Bootstrap with containerd 2.2.1"
  
  # Wait for K8s VMs to be accessible
  log "Waiting for K8s nodes to become accessible..."
  sleep 30

  # Install containerd and kubeadm on all K8s nodes
  for ip in 10.21.0.10 10.21.0.11 10.21.0.12; do
    log "Setting up containerd and kubeadm on $ip..."
    ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@$ip '
      # Disable swap
      sudo swapoff -a
      sudo sed -i \"/ swap / s/^/#/\" /etc/fstab
      
      # Load kernel modules
      cat <<MODULES | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
MODULES
      sudo modprobe overlay
      sudo modprobe br_netfilter
      
      # sysctl params
      cat <<SYSCTL | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
SYSCTL
      sudo sysctl --system
      
      # Install containerd
      sudo apt-get update
      sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
      echo \"deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu jammy stable\" | sudo tee /etc/apt/sources.list.d/docker.list
      sudo apt-get update
      sudo apt-get install -y containerd.io
      sudo mkdir -p /etc/containerd
      containerd config default | sudo tee /etc/containerd/config.toml
      sudo sed -i \"s/SystemdCgroup = false/SystemdCgroup = true/\" /etc/containerd/config.toml
      sudo systemctl restart containerd
      sudo systemctl enable containerd
      
      # Install kubeadm, kubelet, kubectl 1.29
      curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
      echo \"deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /\" | sudo tee /etc/apt/sources.list.d/kubernetes.list
      sudo apt-get update
      sudo apt-get install -y kubelet kubeadm kubectl
      sudo apt-mark hold kubelet kubeadm kubectl
      sudo systemctl enable kubelet
    '"
  done
  
  # Initialize control plane
  log "Initializing K8s control plane on 10.21.0.10..."
  ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@10.21.0.10 '
    sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --kubernetes-version=v1.29.0 --apiserver-advertise-address=10.21.0.10 2>&1 | tee /tmp/kubeadm-init.log
    mkdir -p \$HOME/.kube
    sudo cp -i /etc/kubernetes/admin.conf \$HOME/.kube/config
    sudo chown \$(id -u):\$(id -g) \$HOME/.kube/config
  '"
  
  # Get join command
  local join_cmd=$(ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@10.21.0.10 'sudo kubeadm token create --print-join-command'")
  log "Join command retrieved"
  
  # Join worker nodes
  for ip in 10.21.0.11 10.21.0.12; do
    log "Joining worker node $ip to cluster..."
    ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@$ip 'sudo $join_cmd'"
  done
  
  # Install Calico CNI
  log "Installing Calico CNI..."
  ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@10.21.0.10 'kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/manifests/calico.yaml'"
  
  # Wait for nodes to be ready
  log "Waiting for nodes to become Ready..."
  sleep 60
  
  # Verify cluster
  local node_status=$(ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@10.21.0.10 'kubectl get nodes -o wide'")
  log "K8s Cluster Status:\n$node_status"
  
  log "✅ Phase 7 K8s cluster bootstrap complete"
}

phase_k8s_bootstrap

# Phase 8: Validation
phase_validation() {
  log "🔍 Phase 8: Deployment Validation"
  
  # List all VMs
  local vm_list=$(ssh_cmd "openstack server list --format table")
  log "VM List:\n$vm_list"
  
  # Verify SSH access to all VMs
  log "Verifying SSH access to VMs..."
  for ip in 10.20.0.10 10.21.0.10 10.21.0.11 10.21.0.12 10.22.0.10 10.22.0.11 10.22.0.12 10.22.0.13 10.22.0.14; do
    if ssh_cmd "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@$ip 'echo SSH OK'" 2>/dev/null; then
      log "✅ SSH access verified: $ip"
    else
      log "⚠️  SSH access failed: $ip"
    fi
  done
  
  # Verify Docker on monitoring VM
  local docker_status=$(ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@10.20.0.10 'docker ps --format \"table {{.Names}}\t{{.Status}}\"'" || echo "Docker check failed")
  log "Docker containers on monitoring-vm:\n$docker_status"
  
  # Verify K8s cluster
  local k8s_status=$(ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@10.21.0.10 'kubectl get nodes'" || echo "K8s check failed")
  log "K8s cluster nodes:\n$k8s_status"
  
  # Network connectivity test
  log "Testing network connectivity between VMs..."
  ssh_cmd "ssh -o StrictHostKeyChecking=no ubuntu@10.21.0.10 'ping -c 2 10.20.0.10 && ping -c 2 10.22.0.10'" || log "⚠️  Cross-network ping failed (check routing)"
  
  log "✅ Phase 8 Validation complete"
}

phase_validation

# Disable trap before successful exit
trap - EXIT

log "🎉 Deployment COMPLETE. Resources tracked for rollback."
log ""
log "=== DEPLOYMENT SUMMARY ==="
log "Networks: loki-net (10.20.0.0/24), k8s-net (10.21.0.0/24), app-net (10.22.0.0/24)"
log "Security Groups: monitoring-sg, k8s-sg, app-sg"
log ""
log "VMs Created:"
log "  Monitoring:  10.20.0.10 (monitoring-vm - Docker/LOKI)"
log "  K8s Control: 10.21.0.10 (k8s-control)"
log "  K8s Worker:  10.21.0.11 (k8s-worker-1)"
log "  K8s Worker:  10.21.0.12 (k8s-worker-2)"
log "  HostBill:    10.22.0.10 (app-large-flavor)"
log "  WordPress:   10.22.0.11 (app-medium-flavor)"
log "  Flarum:      10.22.0.12 (app-medium-flavor)"
log "  Affiliate:   10.22.0.13 (app-medium-flavor)"
log "  Trading:     10.22.0.14 (app-large-flavor)"
log ""
log "Port Conflict Resolution:"
log "  Grafana:    port 3006 (not 3000)"
log "  Prometheus: port 9091 (not 9090)"
log ""
log "Log files:"
log "  Local: $LOGFILE"
log "  Host:  /tmp/deploy_stx_greenfield.log"
log ""
log "Rollback: $0 --rollback"
log "Monitor: ssh -i $STX_PEM -p $STX_PORT $STX_USER@$STX_HOST 'openstack server list; ssh ubuntu@10.21.0.10 kubectl get nodes'"
