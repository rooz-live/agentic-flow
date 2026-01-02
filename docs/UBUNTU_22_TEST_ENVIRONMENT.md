# Ubuntu 22.04 Test Environment Setup Guide

## Quick Start: Spin Up Ubuntu 22.04

### Option 1: Local VM (Fastest)
```bash
# Using Multipass (Ubuntu's lightweight VM tool)
brew install multipass  # macOS
multipass launch --name ubuntu-test --cpus 2 --mem 4G --disk 20G 22.04
multipass shell ubuntu-test

# Inside VM:
sudo apt update
sudo apt install -y containerd.io
containerd --version
# Expected: containerd github.com/containerd/containerd v1.7.x
```

### Option 2: Docker (Quick Test)
```bash
# Run Ubuntu 22.04 container
docker run -it --name ubuntu-containerd-test ubuntu:22.04

# Inside container:
apt update && apt install -y containerd.io
containerd --version
```

### Option 3: Cloud VM (Production-like)
```bash
# AWS CLI example
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d3165 \
  --instance-type t3.medium \
  --key-pair your-key \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ubuntu-containerd-test}]'
```

## Verify Containerd 1.7.x

```bash
# Check version
containerd --version | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+'

# Check service status
systemctl status containerd

# Verify CRI support
crictl version
crictl info
```

## Test Kubernetes Compatibility

```bash
# Install kubeadm, kubelet, kubectl
sudo apt-get install -y apt-transport-https ca-certificates curl gpg
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl

# Initialize test cluster (optional)
sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --ignore-preflight-errors=all
```

## Performance Benchmarks

```bash
# Containerd performance test
sudo ctr images pull docker.io/library/nginx:alpine
sudo ctr run --rm docker.io/library/nginx:alpine nginx-test
time sudo ctr run --rm docker.io/library/nginx:alpine nginx-perf-test

# Network performance
ping -c 4 8.8.8.8
iperf3 -c iperf.he.net
```

## Integration Test Matrix

| Component | Test Command | Expected Result |
|-----------|--------------|-----------------|
| containerd | `containerd --version` | v1.7.x |
| CRI | `crictl version` | Runtime v1.7.x |
| Kubernetes | `kubeadm version` | v1.29.x |
| Networking | `ping k8s-api` | < 1ms latency |
| Storage | `sudo ctr snapshots list` | Empty list ready |

## Document Results

```bash
# Create test report
cat > containerd-test-results.md << EOF
# Ubuntu 22.04 Containerd 1.7.x Test Results

## System Info
- OS: $(lsb_release -d)
- Kernel: $(uname -r)
- containerd: $(containerd --version)
- crictl: $(crictl version)

## Performance
- Container start time: $(time sudo ctr run --rm docker.io/library/alpine:latest test true)
- Memory usage: $(free -h)
- Disk usage: $(df -h)

## Kubernetes Ready
- kubeadm: $(kubeadm version -o short)
- kubelet: $(kubelet --version)
EOF
```

## Cleanup

```bash
# Multipass cleanup
multipass delete ubuntu-test
multipass purge

# Docker cleanup
docker rm -f ubuntu-containerd-test
```
