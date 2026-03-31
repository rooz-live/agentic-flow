#!/bin/bash
set -e

# Ubuntu 22.04 Test Environment Setup Script
# Usage: ./scripts/start_ubuntu_test_env.sh

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Ubuntu 22.04 Test Environment Setup ===${NC}"

# Configuration
VM_NAME="ubuntu-test"
CPUS="2"
MEMORY="4G"
DISK="20G"
SSH_KEY="$HOME/.ssh/id_rsa.pub"

# Check if Multipass is installed
if ! command -v multipass &> /dev/null; then
    echo -e "${YELLOW}Installing Multipass...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install --cask multipass
    else
        curl -L -O https://github.com/canonical/multipass/releases/latest/download/multipass_1.12.2_linux_amd64.deb
        sudo dpkg -i multipass_1.12.2_linux_amd64.deb
    fi
fi

# Clean up existing VM if exists
if multipass list | grep -q "$VM_NAME"; then
    echo -e "${YELLOW}Removing existing VM...${NC}"
    multipass delete "$VM_NAME"
    multipass purge
fi

# Create new Ubuntu 22.04 VM
echo -e "${BLUE}Creating Ubuntu 22.04 VM...${NC}"
multipass launch --name "$VM_NAME" --cpus "$CPUS" --mem "$MEMORY" --disk "$DISK" 22.04

# Wait for VM to be ready
echo -e "${BLUE}Waiting for VM to be ready...${NC}"
sleep 10

# Install containerd and test tools
echo -e "${BLUE}Installing containerd and testing tools...${NC}"
multipass exec "$VM_NAME" -- bash -c "
sudo apt update
sudo apt install -y containerd.io curl wget git vim htop
sudo systemctl enable containerd
sudo systemctl start containerd
"

# Verify containerd version
echo -e "${GREEN}=== Containerd Version Check ===${NC}"
multipass exec "$VM_NAME" -- containerd --version

# Install Kubernetes tools
echo -e "${BLUE}Installing Kubernetes tools...${NC}"
multipass exec "$VM_NAME" -- bash -c "
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
"

# Install Snyk MCP
echo -e "${BLUE}Installing Snyk MCP...${NC}"
multipass exec "$VM_NAME" -- bash -c "
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g @snyk/mcp-server
"

# Create test script
echo -e "${BLUE}Creating test script...${NC}"
multipass exec "$VM_NAME" -- bash -c "
cat > /home/ubuntu/test_containerd.sh << 'EOF'
#!/bin/bash
echo '=== Containerd Test Results ==='
echo 'Version:' \$(containerd --version)
echo 'Service Status:' \$(systemctl is-active containerd)
echo 'CRI Plugin:' \$(sudo ctr plugins ls | grep cri)
echo ''
echo '=== Kubernetes Tools ==='
echo 'kubeadm:' \$(kubeadm version -o short)
echo 'kubelet:' \$(kubelet --version)
echo 'kubectl:' \$(kubectl version --client --short)
echo ''
echo '=== Snyk MCP ==='
echo 'Snyk version:' \$(snyk --version)
EOF
chmod +x /home/ubuntu/test_containerd.sh
"

# Run tests
echo -e "${GREEN}=== Running Tests ===${NC}"
multipass exec "$VM_NAME" -- /home/ubuntu/test_containerd.sh

# Create performance test
echo -e "${BLUE}Creating performance test...${NC}"
multipass exec "$VM_NAME" -- bash -c "
cat > /home/ubuntu/perf_test.sh << 'EOF'
#!/bin/bash
echo '=== Performance Test ==='
echo 'Pulling nginx image...'
time sudo ctr images pull docker.io/library/nginx:alpine
echo ''
echo 'Starting container...'
time sudo ctr run --rm docker.io/library/nginx:alpine nginx-test echo 'Container running successfully'
echo ''
echo 'System Resources:'
free -h
df -h
EOF
chmod +x /home/ubuntu/perf_test.sh
"

# Run performance test
echo -e "${GREEN}=== Performance Test ===${NC}"
multipass exec "$VM_NAME" -- /home/ubuntu/perf_test.sh

# Connection info
echo -e "${BLUE}=== Connection Information ===${NC}"
echo "VM Name: $VM_NAME"
echo "SSH into VM: multipass shell $VM_NAME"
echo "Copy files: multipass copy <local-path> $VM_NAME:/home/ubuntu/"
echo "Get files: multipass copy $VM_NAME:/home/ubuntu/<file> <local-path>"

# Next steps
echo -e "${YELLOW}=== Next Steps ===${NC}"
echo "1. SSH into the VM: multipass shell $VM_NAME"
echo "2. Test StarlingX connectivity:"
echo "   ping 23.92.79.2"
echo "3. Test AWS connectivity:"
echo "   ping 54.241.233.105"
echo "4. Install additional tools as needed"
echo ""
echo -e "${GREEN}✅ Ubuntu 22.04 test environment ready!${NC}"
