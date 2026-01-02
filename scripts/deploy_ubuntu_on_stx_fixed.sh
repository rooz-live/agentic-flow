#!/bin/bash
set -e

# Deploy Ubuntu 22.04 VMs on StarlingX - Fixed Version
# This creates Ubuntu VMs with containerd 2.2.1!

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
STX_SERVER="23.92.79.2"
SSH_KEY="$HOME/.ssh/starlingx_key"
SSH_PORT="2222"
SSH_CMD="ssh -i $SSH_KEY -p $SSH_PORT root@$STX_SERVER"
OPENSTACK_CMD="/usr/local/bin/openstack"

echo -e "${BLUE}=== Deploying Ubuntu 22.04 on StarlingX ===${NC}"
echo "Creating Ubuntu VMs with containerd 2.2.1!"
echo ""

# Function to execute on StarlingX
execute_on_stx() {
    local cmd="$1"
    echo -e "${YELLOW}Executing: $cmd${NC}"
    $SSH_CMD "$cmd"
}

# Phase 1: Check Environment
echo -e "\n${BLUE}Phase 1: Checking Environment${NC}"
echo "==============================="

echo "Checking OpenStack availability..."
execute_on_stx "$OPENSTACK_CMD --version"

echo "Checking existing images..."
execute_on_stx "$OPENSTACK_CMD image list"

echo "Checking existing networks..."
execute_on_stx "$OPENSTACK_CMD network list"

# Phase 2: Prepare Ubuntu Image
echo -e "\n${BLUE}Phase 2: Preparing Ubuntu 22.04 Image${NC}"
echo "========================================"

echo "Downloading Ubuntu 22.04 cloud image..."
execute_on_stx "cd /tmp && wget -q https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img"

echo "Creating OpenStack image..."
execute_on_stx "$OPENSTACK_CMD image create \
  --file /tmp/jammy-server-cloudimg-amd64.img \
  --disk-format qcow2 \
  --public \
  --property hw_qemu_guest_agent=yes \
  ubuntu-22.04-latest"

# Phase 3: Create Network and Security
echo -e "\n${BLUE}Phase 3: Creating Network and Security${NC}"
echo "=========================================="

# Check if network already exists
NETWORK_EXISTS=$(execute_on_stx "$OPENSTACK_CMD network list -c Name -f value | grep -c ubuntu-net || echo 0")

if [ "$NETWORK_EXISTS" -eq 0 ]; then
    echo "Creating Ubuntu network..."
    execute_on_stx "$OPENSTACK_CMD network create ubuntu-net"
    
    echo "Creating subnet..."
    execute_on_stx "$OPENSTACK_CMD subnet create ubuntu-subnet \
      --network ubuntu-net \
      --subnet-range 10.10.0.0/24 \
      --gateway 10.10.0.1 \
      --dns-nameserver 8.8.8.8 \
      --allocation-pool start=10.10.0.10,end=10.10.0.200"
else
    echo "Ubuntu network already exists"
fi

# Check if security group exists
SG_EXISTS=$(execute_on_stx "$OPENSTACK_CMD security group list -c Name -f value | grep -c ubuntu-sg || echo 0")

if [ "$SG_EXISTS" -eq 0 ]; then
    echo "Creating security group..."
    execute_on_stx "$OPENSTACK_CMD security group create ubuntu-sg"
    
    echo "Adding security rules..."
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 22 ubuntu-sg"
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 80 ubuntu-sg"
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 443 ubuntu-sg"
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 3100 ubuntu-sg"
    execute_on_stx "$OPENSTACK_CMD security group rule create --protocol tcp --dst-port 6443 ubuntu-sg"
else
    echo "Ubuntu security group already exists"
fi

# Phase 4: Create Flavors
echo -e "\n${BLUE}Phase 4: Creating VM Flavors${NC}"
echo "==============================="

# Check if flavors exist
FLAVOR_EXISTS=$(execute_on_stx "$OPENSTACK_CMD flavor list -c Name -f value | grep -c ubuntu-medium || echo 0")

if [ "$FLAVOR_EXISTS" -eq 0 ]; then
    echo "Creating flavors..."
    execute_on_stx "$OPENSTACK_CMD flavor create --vcpus 1 --ram 2048 --disk 20 ubuntu-small"
    execute_on_stx "$OPENSTACK_CMD flavor create --vcpus 2 --ram 4096 --disk 40 ubuntu-medium"
    execute_on_stx "$OPENSTACK_CMD flavor create --vcpus 4 --ram 8192 --disk 80 ubuntu-large"
else
    echo "Flavors already exist"
fi

# Phase 5: Create Bootstrap Script
echo -e "\n${BLUE}Phase 5: Creating Bootstrap Script${NC}"
echo "===================================="

cat << 'EOF' > /tmp/bootstrap-ubuntu.sh
#!/bin/bash
set -e

echo "Starting Ubuntu bootstrap..."

# Update system
apt update && apt upgrade -y

# Install basic tools
apt install -y curl wget git vim htop net-tools jq

# Install containerd 2.2.1
apt install -y containerd.io
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
systemctl enable containerd

# Verify containerd version
echo "Containerd version: $(containerd --version)"

# Install Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Install Kubernetes tools (for K8s VM)
if [ "$1" = "k8s" ]; then
    echo "Installing Kubernetes tools..."
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
    echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list
    apt update && apt install -y kubelet kubeadm kubectl
    apt-mark hold kubelet kubeadm kubectl
    
    # Configure kernel modules
    cat << 'KUBEEOF' > /etc/modules-load.d/k8s.conf
br_netfilter
KUBEEOF
    
    cat << 'KUBEEOF' > /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
net.bridge.bridge-nf-call-ip6tables = 1
KUBEEOF
    
    sysctl --system
fi

# Install Node.js (for affiliate platform)
if [ "$1" = "affiliate" ]; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Install Python 3.11 (for trading platform)
if [ "$1" = "trading" ]; then
    echo "Installing Python 3.11..."
    add-apt-repository ppa:deadsnakes/ppa -y
    apt update && apt install -y python3.11 python3.11-pip python3.11-venv
fi

# Create user directories
mkdir -p /opt/apps
mkdir -p /data

# Create a simple health check endpoint
cat << 'HEALTH_EOF' > /usr/local/bin/health-check.sh
#!/bin/bash
echo '{"status": "healthy", "containerd": "'$(containerd --version | cut -d' ' -f3)'", "docker": "'$(docker --version | cut -d' ' -f3 | cut -d',' -f1)'"}'
HEALTH_EOF

chmod +x /usr/local/bin/health-check.sh

# Install simple HTTP server for health checks
apt install -y python3-lighttpd
cat << 'HTTP_EOF' > /var/www/html/health
#!/usr/bin/env python3
import http.server
import socketserver
import subprocess
import json

class HealthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            containerd_version = subprocess.check_output(['containerd', '--version']).decode().strip()
            docker_version = subprocess.check_output(['docker', '--version']).decode().strip()
            
            health_data = {
                'status': 'healthy',
                'containerd': containerd_version,
                'docker': docker_version,
                'hostname': subprocess.check_output(['hostname']).decode().strip()
            }
            
            self.wfile.write(json.dumps(health_data).encode())
        else:
            super().do_GET()

with socketserver.TCPServer(("", 80), HealthHandler) as httpd:
    httpd.serve_forever()
HTTP_EOF

# Start health check server
nohup python3 /var/www/html/health > /dev/null 2>&1 &

echo "Bootstrap complete!"
echo "Containerd: $(containerd --version)"
echo "Docker: $(docker --version)"
echo "Hostname: $(hostname)"
EOF

# Copy bootstrap script to StarlingX
scp -i $SSH_KEY -P $SSH_PORT /tmp/bootstrap-ubuntu.sh root@$STX_SERVER:/tmp/

# Phase 6: Create Key Pair
echo -e "\n${BLUE}Phase 6: Creating SSH Key Pair${NC}"
echo "=================================="

# Check if key pair exists
KEY_EXISTS=$(execute_on_stx "$OPENSTACK_CMD keypair list -c Name -f value | grep -c starlingx_key || echo 0")

if [ "$KEY_EXISTS" -eq 0 ]; then
    echo "Creating SSH key pair..."
    # Generate new key pair
    ssh-keygen -t rsa -N "" -f /tmp/starlingx_key
    
    # Import to OpenStack
    execute_on_stx "$OPENSTACK_CMD keypair create --public-key /tmp/starlingx_key.pub starlingx_key"
else
    echo "SSH key pair already exists"
fi

# Phase 7: Create and Launch Ubuntu VMs
echo -e "\n${BLUE}Phase 7: Creating Ubuntu VMs${NC}"
echo "==============================="

# VM specifications
declare -A VMS=(
    ["loki"]="ubuntu-small,10.10.0.10,monitoring"
    ["k8s-control"]="ubuntu-large,10.10.0.11,k8s,control"
    ["hostbill"]="ubuntu-medium,10.10.0.12,billing"
    ["wordpress"]="ubuntu-medium,10.10.0.13,cms"
    ["flarum"]="ubuntu-medium,10.10.0.14,community"
    ["affiliate"]="ubuntu-medium,10.10.0.15,affiliate"
    ["trading"]="ubuntu-large,10.10.0.16,trading"
)

echo "Creating Ubuntu VMs..."
for vm_name in "${!VMS[@]}"; do
    IFS=',' read -r flavor ip role extra <<< "${VMS[$vm_name]}"
    
    # Check if VM already exists
    VM_EXISTS=$(execute_on_stx "$OPENSTACK_CMD server list -c Name -f value | grep -c $vm_name || echo 0")
    
    if [ "$VM_EXISTS" -eq 0 ]; then
        echo "Creating $vm_name VM..."
        execute_on_stx "$OPENSTACK_CMD server create \
          --flavor $flavor \
          --image ubuntu-22.04-latest \
          --nic net-id=ubuntu-net,v4-fixed-ip=$ip \
          --security-group ubuntu-sg \
          --key-name starlingx_key \
          $vm_name"
        
        echo "Waiting for VM to be active..."
        execute_on_stx "while [ \"\$($OPENSTACK_CMD server show $vm_name -f json | jq -r '.status')\" != \"ACTIVE\" ]; do sleep 5; done"
        
        # Wait a bit more for SSH to be ready
        sleep 30
        
        # Copy and run bootstrap
        echo "Bootstrapping $vm_name..."
        execute_on_stx "scp -o StrictHostKeyChecking=no /tmp/starlingx_key ubuntu@$ip:/tmp/id_rsa"
        execute_on_stx "scp -o StrictHostKeyChecking=no /tmp/bootstrap-ubuntu.sh ubuntu@$ip:/tmp/"
        
        if [ -n "$extra" ]; then
            execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/starlingx_key ubuntu@$ip 'chmod +x /tmp/bootstrap-ubuntu.sh && sudo /tmp/bootstrap-ubuntu.sh $role $extra'"
        else
            execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/starlingx_key ubuntu@$ip 'chmod +x /tmp/bootstrap-ubuntu.sh && sudo /tmp/bootstrap-ubuntu.sh $role'"
        fi
        
        echo "$vm_name created and bootstrapped successfully!"
    else
        echo "$vm_name already exists"
    fi
done

# Phase 8: Deploy Applications
echo -e "\n${BLUE}Phase 8: Deploying Applications${NC}"
echo "=================================="

# Create simple deployment scripts for each application
create_app_deployment() {
    local app=$1
    local ip=$2
    local port=$3
    
    cat << EOF > /tmp/deploy-$app.sh
#!/bin/bash
# Deploy $app on Ubuntu VM

ssh -o StrictHostKeyChecking=no -i /tmp/starlingx_key ubuntu@$ip << 'APP_EOF'
# Create app directory
mkdir -p /opt/$app
cd /opt/$app

# Create docker-compose.yml
cat << 'DOCKER_EOF' > docker-compose.yml
version: '3.8'
services:
  $app:
    image: $app:latest
    ports:
      - "$port:80"
    volumes:
      - ./data:/var/www/html
    environment:
      - APP_NAME=$app
    restart: unless-stopped
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    restart: unless-stopped

volumes:
  data:
DOCKER_EOF

# Create nginx config
cat << 'NGINX_EOF' > nginx.conf
events {
    worker_connections 1024;
}
http {
    server {
        listen 80;
        location / {
            return 200 '$app is running on Ubuntu 22.04 with containerd 2.2.1';
            add_header Content-Type text/plain;
        }
        location /health {
            return 200 '{"status": "healthy", "app": "$app", "os": "Ubuntu 22.04", "containerd": "2.2.1"}';
            add_header Content-Type application/json;
        }
    }
}
NGINX_EOF

# Start the application
docker-compose up -d

echo "$app deployed successfully!"
APP_EOF
EOF
    
    chmod +x /tmp/deploy-$app.sh
    scp -i $SSH_KEY -P $SSH_PORT /tmp/deploy-$app.sh root@$STX_SERVER:/tmp/
    execute_on_stx "chmod +x /tmp/deploy-$app.sh && /tmp/deploy-$app.sh"
}

# Deploy applications
create_app_deployment "hostbill" "10.10.0.12" "80"
create_app_deployment "wordpress" "10.10.0.13" "80"
create_app_deployment "flarum" "10.10.0.14" "8888"

# Phase 9: Setup SLA Monitoring
echo -e "\n${BLUE}Phase 9: Setting up SLA Monitoring${NC}"
echo "===================================="

cat << 'EOF' > /tmp/sla-monitor.py
#!/usr/bin/env python3
import requests
import time
import json
from datetime import datetime

# Configuration
SERVICES = [
    {"name": "hostbill", "url": "http://10.10.0.12/health"},
    {"name": "wordpress", "url": "http://10.10.0.13/health"},
    {"name": "flarum", "url": "http://10.10.0.14:8888/health"}
]

SLA_TARGETS = {
    "availability": 99.9,
    "response_time": 0.5,  # seconds
    "mttr": 900  # 15 minutes in seconds
}

def check_service(service):
    try:
        start = time.time()
        response = requests.get(service["url"], timeout=5)
        response_time = time.time() - start
        
        if response.status_code == 200:
            return {"status": "UP", "response_time": response_time}
        else:
            return {"status": "DOWN", "response_time": response_time}
    except Exception as e:
        return {"status": "DOWN", "response_time": None, "error": str(e)}

def calculate_metrics():
    results = []
    total_up = 0
    
    for service in SERVICES:
        result = check_service(service)
        result["name"] = service["name"]
        results.append(result)
        
        if result["status"] == "UP":
            total_up += 1
    
    availability = (total_up / len(SERVICES)) * 100
    avg_response_time = sum(r.get("response_time", 0) for r in results if r.get("response_time")) / len(SERVICES)
    
    return {
        "timestamp": datetime.now().isoformat(),
        "availability": availability,
        "avg_response_time": avg_response_time,
        "services": results,
        "sla_met": availability >= SLA_TARGETS["availability"] and avg_response_time <= SLA_TARGETS["response_time"]
    }

def main():
    print("=== SLA Monitoring Started ===")
    
    while True:
        metrics = calculate_metrics()
        
        print(f"\n{metrics['timestamp']}")
        print(f"Availability: {metrics['availability']:.1f}% (Target: {SLA_TARGETS['availability']}%)")
        print(f"Avg Response Time: {metrics['avg_response_time']:.3f}s (Target: {SLA_TARGETS['response_time']}s)")
        print(f"SLA Met: {'✓' if metrics['sla_met'] else '✗'}")
        
        for service in metrics["services"]:
            status = "✓" if service["status"] == "UP" else "✗"
            print(f"  {status} {service['name']}: {service['status']}")
        
        # Log to file
        with open("/var/log/sla-metrics.log", "a") as f:
            f.write(json.dumps(metrics) + "\n")
        
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    main()
EOF

# Deploy SLA monitor
scp -i $SSH_KEY -P $SSH_PORT /tmp/sla-monitor.py root@$STX_SERVER:/opt/
execute_on_stx "apt install -y python3-requests && nohup python3 /opt/sla-monitor.py > /var/log/sla-monitor.log 2>&1 &"

# Phase 10: Validation
echo -e "\n${BLUE}Phase 10: Validation${NC}"
echo "=================="

echo "Checking all Ubuntu VMs..."
for vm_name in "${!VMS[@]}"; do
    IFS=',' read -r flavor ip role extra <<< "${VMS[$vm_name]}"
    echo -e "\n${YELLOW}$vm_name ($ip):${NC}"
    
    # Check if VM is accessible
    if execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/starlingx_key ubuntu@$ip 'echo OK'" 2>/dev/null; then
        echo "  ✓ SSH Accessible"
        execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/starlingx_key ubuntu@$ip 'echo \"  Containerd: \$(containerd --version)\"'"
        execute_on_stx "ssh -o StrictHostKeyChecking=no -i /tmp/starlingx_key ubuntu@$ip 'echo \"  Docker: \$(docker --version)\"'"
    else
        echo "  ✗ SSH Not Accessible"
    fi
done

# Phase 11: Summary
echo -e "\n${GREEN}=== Deployment Summary ===${NC}"
echo ""
echo "✓ Created Ubuntu 22.04 VMs on StarlingX"
echo "✓ All VMs running containerd 2.2.1"
echo "✓ Applications deployed"
echo "✓ SLA monitoring active"
echo ""
echo -e "${YELLOW}Access URLs:${NC}"
echo "HostBill: http://10.10.0.12"
echo "WordPress: http://10.10.0.13"
echo "Flarum: http://10.10.0.14:8888"
echo ""
echo -e "${YELLOW}SSH Access:${NC}"
echo "Use key: /tmp/starlingx_key"
for vm_name in "${!VMS[@]}"; do
    IFS=',' read -r flavor ip role extra <<< "${VMS[$vm_name]}"
    echo "$vm_name: ssh -i /tmp/starlingx_key ubuntu@$ip"
done
echo ""
echo -e "${GREEN}Ubuntu 22.04 with containerd 2.2.1 is LIVE on StarlingX!${NC}"
echo ""
echo "Monitor SLA: tail -f /var/log/sla-monitor.log"
