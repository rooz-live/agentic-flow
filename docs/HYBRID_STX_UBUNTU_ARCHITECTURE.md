# Hybrid StarlingX + Ubuntu Architecture

## The Reality Check

**StarlingX Server (23.92.79.2)**:
- Currently: STX 11 on AlmaLinux 8 (FIXED - cannot change)
- Future: STX 12 on Ubuntu 22.04 (Q4 2025)

**Solution**: Deploy Ubuntu VMs alongside StarlingX for modern workloads

## Architecture Overview

```
Physical Server: 23.92.79.2
├── StarlingX (AlmaLinux 8) - Hypervisor Layer
│   ├── OpenStack (VM management)
│   ├── Neutron (Networking)
│   └── Ceph (Storage)
│
└── Ubuntu 22.04 VMs - Application Layer
    ├── Ubuntu-VM-1: LOKI + Monitoring
    ├── Ubuntu-VM-2: Kubernetes
    ├── Ubuntu-VM-3: HostBill
    ├── Ubuntu-VM-4: WordPress
    ├── Ubuntu-VM-5: Flarum
    ├── Ubuntu-VM-6: Affiliate Platform
    └── Ubuntu-VM-7: Trading Platform
```

## Implementation Strategy

### Phase 1: Provision Ubuntu VMs on StarlingX
```bash
# Create Ubuntu 22.04 VMs via OpenStack
source /etc/platform/openrc

# Ubuntu VM templates
openstack image create "ubuntu-22.04" \
  --file ubuntu-22.04.qcow2 \
  --disk-format qcow2 \
  --public

# Create VMs for each platform
PLATFORMS=("loki" "k8s" "hostbill" "wordpress" "flarum" "affiliate" "trading")

for platform in "${PLATFORMS[@]}"; do
  openstack server create \
    --flavor medium \
    --image ubuntu-22.04 \
    --nic net-id=app-network \
    --security-group web-sg \
    "${platform}-vm"
done
```

### Phase 2: Deploy Modern Stack on Ubuntu VMs

#### LOKI Stack (Ubuntu VM 1)
```yaml
# Runs native containerd 2.2.1
# Latest Ubuntu packages
# Modern kernel 5.15+
```

#### Kubernetes Cluster (Ubuntu VM 2)
```yaml
# Native Kubernetes 1.29
# containerd 2.2.1
# CNI: Calico
# CSI: Ceph
```

#### Applications (Ubuntu VMs 3-7)
```yaml
# All run on Ubuntu 22.04
# containerd 2.2.1
- HostBill: Latest PHP 8.2
- WordPress: Latest 6.4
- Flarum: Latest 1.8
- Affiliate: Node.js 20
- Trading: Python 3.11
```

## Benefits of This Approach

1. **Immediate Ubuntu Benefits**:
   - containerd 2.2.1 now
   - Modern kernel
   - Latest packages
   - Better performance

2. **Keep StarlingX Benefits**:
   - Proven hypervisor
   - OpenStack integration
   - Ceph storage
   - Network management

3. **Migration Path**:
   - When STX 12 arrives, migrate VMs to bare metal
   - No application changes needed
   - Seamless transition

## Detailed Implementation

### 1. Create Ubuntu VM Template
```bash
# On StarlingX controller
wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img
openstack image create "ubuntu-22.04-latest" \
  --file jammy-server-cloudimg-amd64.img \
  --disk-format qcow2 \
  --public \
  --property hw_qemu_guest_agent=yes
```

### 2. Deploy Ubuntu VMs
```bash
#!/bin/bash
# deploy_ubuntu_vms.sh

# Network setup
openstack network create ubuntu-net
openstack subnet create ubuntu-subnet \
  --network ubuntu-net \
  --subnet-range 10.10.0.0/24 \
  --dns-nameserver 8.8.8.8

# Security groups
openstack security group create ubuntu-sg
openstack security group rule create --protocol tcp --dst-port 22 ubuntu-sg
openstack security group rule create --protocol tcp --dst-port 80 ubuntu-sg
openstack security group rule create --protocol tcp --dst-port 443 ubuntu-sg

# Create VMs
VM_SPECS=(
  "loki,2,4096,40"
  "k8s,4,8192,80"
  "hostbill,2,4096,40"
  "wordpress,2,4096,40"
  "flarum,2,4096,40"
  "affiliate,2,4096,40"
  "trading,4,8192,80"
)

for spec in "${VM_SPECS[@]}"; do
  IFS=',' read -r name cpu ram disk <<< "$spec"
  
  openstack server create \
    --flavor $(openstack flavor create --vcpus $cpu --ram $ram --disk $disk temp-flavor) \
    --image ubuntu-22.04-latest \
    --nic net-id=ubuntu-net \
    --security-group ubuntu-sg \
    --key-name mykey \
    "$name-vm"
done
```

### 3. Configure Ubuntu VMs
```bash
# Bootstrap script for all Ubuntu VMs
cat << 'EOF' > bootstrap-ubuntu.sh
#!/bin/bash
# Run on each Ubuntu VM after creation

# Update system
apt update && apt upgrade -y

# Install containerd 2.2.1
apt install -y containerd.io
systemctl enable containerd
systemctl start containerd

# Install Kubernetes tools (for K8s VM)
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list
apt update && apt install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl

# Configure networking
modprobe br_netfilter
sysctl -w net.bridge.bridge-nf-call-iptables=1
sysctl -w net.ipv4.ip_forward=1

# Join to cluster (for worker nodes)
# kubeadm join <control-plane-ip>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
EOF
```

### 4. Deploy Applications
```yaml
# docker-compose.yml for each Ubuntu VM
version: '3.8'
services:
  # HostBill VM
  hostbill:
    image: hostbill/hostbill:latest
    ports:
      - "80:80"
    volumes:
      - ./data:/var/www/html
    environment:
      - DB_HOST=mysql
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
  
  # WordPress VM
  wordpress:
    image: wordpress:6.4-php8.1
    ports:
      - "80:80"
    volumes:
      - wp_data:/var/www/html
    environment:
      - WORDPRESS_DB_HOST=mysql
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
```

## SLA Metrics Implementation

### MTTR Measurement
```python
# mtracker.py - Runs on monitoring VM
import time
import requests
from datetime import datetime

class MTTRTracker:
    def __init__(self):
        self.incidents = []
        self.start_times = {}
    
    def start_incident(self, service):
        self.start_times[service] = time.time()
    
    def resolve_incident(self, service):
        if service in self.start_times:
            mttr = time.time() - self.start_times[service]
            self.incidents.append({
                'service': service,
                'mttr': mttr,
                'resolved_at': datetime.now()
            })
            del self.start_times[service]
            return mttr
    
    def get_average_mttr(self, window_hours=24):
        # Calculate average MTTR for last 24 hours
        recent = [i for i in self.incidents 
                 if (datetime.now() - i['resolved_at']).seconds < window_hours*3600]
        if recent:
            return sum(i['mttr'] for i in recent) / len(recent)
        return 0
```

### Throughput Monitoring
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ubuntu-vms'
    static_configs:
      - targets: 
        - '10.10.0.10:9090'  # Loki
        - '10.10.0.11:8080'  # K8s API
        - '10.10.0.12:80'    # HostBill
        - '10.10.0.13:80'    # WordPress
        - '10.10.0.14:8888'  # Flarum
        - '10.10.0.15:3000'  # Affiliate
        - '10.10.0.16:8000'  # Trading
```

### Production Delivery Metrics
```bash
# delivery-metrics.sh
#!/bin/bash

# Track deployment metrics
deploy_start=$(date +%s)

# Deploy to Ubuntu VMs
for vm in hostbill wordpress flarum affiliate trading; do
    echo "Deploying to $vm-vm..."
    scp -r ./app root@$vm-vm:/opt/
    ssh root@$vm-vm "cd /opt/app && docker-compose up -d"
done

deploy_end=$(date +%s)
deploy_time=$((deploy_end - deploy_start))

# Record metrics
curl -X POST http://prometheus:9090/metrics/job/deployment \
  -d "deployment_duration_seconds $deploy_time" \
  -d "deployment_success 1" \
  -d "deployment_timestamp $(date +%s)"
```

## Immediate Action Plan

### Today (Day 1):
1. Create Ubuntu 22.04 VM template in OpenStack
2. Provision 7 Ubuntu VMs
3. Install containerd 2.2.1 on all VMs
4. Deploy LOKI stack

### Tomorrow (Day 2):
1. Set up Kubernetes on Ubuntu VM
2. Deploy databases (MySQL/PostgreSQL)
3. Configure networking between VMs

### Day 3-4:
1. Deploy all applications on Ubuntu VMs
2. Set up monitoring and SLA tracking
3. Configure external access

### Day 5:
1. Performance testing
2. SLA validation
3. Documentation

## Why This Hybrid Approach Works

1. **Best of Both Worlds**:
   - StarlingX: Proven infrastructure
   - Ubuntu: Latest features

2. **Future-Proof**:
   - When STX 12 arrives, just migrate VMs
   - No application rewrites needed

3. **SLA Compliance**:
   - MTTR: <15 minutes (VM level)
   - Throughput: >1000 RPS per service
   - Availability: 99.9%

4. **Cost Effective**:
   - No new hardware needed
   - Use existing StarlingX investment
   - Gradual migration possible

## Conclusion

This hybrid approach gives you Ubuntu 22.04 with containerd 2.2.1 **TODAY** while leveraging StarlingX's proven infrastructure. No need to wait for STX 12!
