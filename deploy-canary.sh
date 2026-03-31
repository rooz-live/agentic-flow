#!/bin/bash
set -e

echo "🚀 Deploying Canary Infrastructure on Ubuntu 22.04..."

# 1. Install Dependencies
echo "📦 Installing Nginx and K8s tools..."
sudo apt-get update
sudo apt-get install -y nginx curl jq python3-pip

# Install kubeadm/kubectl/kubelet (if not present)
if ! command -v kubeadm &> /dev/null; then
    sudo apt-get install -y apt-transport-https ca-certificates curl gpg
    # Clean up old/broken repo file
    sudo rm -f /etc/apt/sources.list.d/kubernetes.list
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
    echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
    sudo apt-get update
    sudo apt-get install -y kubelet kubeadm kubectl
    sudo apt-mark hold kubelet kubeadm kubectl
fi

# PyYAML for compliance scanner
pip3 install pyyaml

# 2. Configure Traffic Splitting (Nginx)
echo "🔀 Configuring Nginx Traffic Splitting..."
# Move transferred config to sites-available
if [ -f "nginx-canary.conf" ]; then
    sudo cp nginx-canary.conf /etc/nginx/sites-available/canary-split
    sudo ln -sf /etc/nginx/sites-available/canary-split /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
else
    echo "⚠️ nginx-canary.conf not found in current dir"
fi

# Start Mock Backends (for demo purposes)
# Installing simple Python servers to listen on 8081 (Stable) and 8082 (Canary)
nohup python3 -m http.server 8081 --bind 127.0.0.1 > /dev/null 2>&1 &
nohup python3 -m http.server 8082 --bind 127.0.0.1 > /dev/null 2>&1 &
echo "✅ Mock backends started on 8081, 8082"

# Restart Nginx
sudo systemctl restart nginx
echo "✅ Nginx restarted"

# 3. Compliance Check
echo "🛡️ Running Compliance Scanner..."
chmod +x compliance-scanner.py
sudo python3 compliance-scanner.py ubuntu-22.04-policy.yaml

echo "✅ Deployment Complete!"
