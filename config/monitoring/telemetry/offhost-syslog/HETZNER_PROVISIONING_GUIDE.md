# Hetzner CX22 Syslog VPS Provisioning Guide

## Overview

**Selected Provider**: Hetzner Cloud CX22  
**Monthly Cost**: €4.49 (~$5)  
**Specs**: 2 vCPU, 4GB RAM, 40GB SSD  
**Selection Reason**: Best price-to-performance ratio, 4x the RAM of alternatives

## Prerequisites

1. Hetzner Cloud account (requires ID verification)
2. SSH public key ready
3. Admin IP for SSH allowlist: `173.94.53.113/32`
4. StarlingX IP for syslog allowlist: `23.92.79.2/32`

---

## Method 1: Web UI Provisioning (Recommended for First-Time Setup)

### Step 1: Create Hetzner Account
1. Go to [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Create account and complete ID verification (may take 24-48h)
3. Add payment method

### Step 2: Create Project
1. Click "New Project"
2. Name: `syslog-infrastructure`
3. Click "Create"

### Step 3: Add SSH Key
1. Go to "Security" → "SSH Keys"
2. Click "Add SSH Key"
3. Paste your public key (`~/.ssh/id_rsa.pub` or `~/.ssh/id_ed25519.pub`)
4. Name: `admin-key`
5. Click "Add"

### Step 4: Create Server
1. Go to "Servers" → "Add Server"
2. **Location**: `fsn1` (Falkenstein, Germany) - or `nbg1` (Nuremberg), `hel1` (Helsinki)
3. **Image**: Ubuntu 22.04
4. **Type**: CX22 (Shared vCPU, 2 vCPU, 4GB RAM, 40GB SSD)
5. **Networking**: 
   - ✅ Public IPv4
   - ✅ Public IPv6
6. **SSH Key**: Select `admin-key`
7. **Name**: `syslog-sink`
8. Click "Create & Buy Now"

### Step 5: Configure Firewall
1. Go to "Firewalls" → "Create Firewall"
2. Name: `syslog-sink-fw`
3. **Inbound Rules**:
   ```
   Rule 1: SSH (Admin only)
   - Protocol: TCP
   - Port: 22
   - Source: 173.94.53.113/32
   
   Rule 2: Syslog TLS (StarlingX only)
   - Protocol: TCP
   - Port: 6514
   - Source: 23.92.79.2/32
   
   Rule 3: ICMP (Diagnostics)
   - Protocol: ICMP
   - Source: 173.94.53.113/32, 23.92.79.2/32
   ```
4. **Outbound Rules**: Allow all (default)
5. Click "Create Firewall"
6. Apply to server `syslog-sink`

### Step 6: Record Server Details
After creation, note:
- **Public IPv4**: `xxx.xxx.xxx.xxx`
- **Public IPv6**: `xxxx:xxxx:xxxx:xxxx::1`
- **Hostname**: `syslog-sink`

---

## Method 2: Hetzner CLI Provisioning

### Install hcloud CLI

```bash
# macOS
brew install hcloud

# Linux
curl -sL https://github.com/hetznercloud/cli/releases/latest/download/hcloud-linux-amd64.tar.gz | tar -xz
sudo mv hcloud /usr/local/bin/

# Verify
hcloud version
```

### Configure API Token

```bash
# Create API token in Hetzner Console: Security → API tokens → Generate token
# Save the token securely (shown only once!)

# Configure hcloud
hcloud context create syslog-infrastructure
# Enter your API token when prompted
```

### Create Resources via CLI

```bash
#!/usr/bin/env bash
# Hetzner CX22 Syslog Sink Provisioning Script

set -euo pipefail

# Configuration
PROJECT_NAME="syslog-infrastructure"
SERVER_NAME="syslog-sink"
SERVER_TYPE="cx22"
IMAGE="ubuntu-22.04"
LOCATION="fsn1"
SSH_KEY_NAME="admin-key"
FIREWALL_NAME="syslog-sink-fw"

# Admin and source IPs
ADMIN_IP="173.94.53.113"
STARLINGX_IP="23.92.79.2"

echo "=== Hetzner CX22 Syslog Sink Provisioning ==="

# Step 1: Upload SSH Key (if not exists)
echo "[1/4] Checking SSH key..."
if ! hcloud ssh-key list | grep -q "$SSH_KEY_NAME"; then
    echo "Uploading SSH key..."
    hcloud ssh-key create \
        --name "$SSH_KEY_NAME" \
        --public-key-from-file ~/.ssh/id_rsa.pub
else
    echo "SSH key already exists"
fi

# Step 2: Create Firewall
echo "[2/4] Creating firewall..."
hcloud firewall delete "$FIREWALL_NAME" 2>/dev/null || true
hcloud firewall create --name "$FIREWALL_NAME"

# SSH from admin only
hcloud firewall add-rule "$FIREWALL_NAME" \
    --direction in \
    --protocol tcp \
    --port 22 \
    --source-ips "${ADMIN_IP}/32"

# Syslog TLS from StarlingX only
hcloud firewall add-rule "$FIREWALL_NAME" \
    --direction in \
    --protocol tcp \
    --port 6514 \
    --source-ips "${STARLINGX_IP}/32"

# ICMP for diagnostics
hcloud firewall add-rule "$FIREWALL_NAME" \
    --direction in \
    --protocol icmp \
    --source-ips "${ADMIN_IP}/32,${STARLINGX_IP}/32"

echo "Firewall created with rules"

# Step 3: Create Server
echo "[3/4] Creating server..."
hcloud server create \
    --name "$SERVER_NAME" \
    --type "$SERVER_TYPE" \
    --image "$IMAGE" \
    --location "$LOCATION" \
    --ssh-key "$SSH_KEY_NAME" \
    --firewall "$FIREWALL_NAME"

# Step 4: Get Server Details
echo "[4/4] Getting server details..."
SERVER_IP=$(hcloud server ip "$SERVER_NAME")
SERVER_IPV6=$(hcloud server describe "$SERVER_NAME" -o json | jq -r '.public_net.ipv6.ip')

echo ""
echo "=== PROVISIONING COMPLETE ==="
echo "Server Name: $SERVER_NAME"
echo "IPv4: $SERVER_IP"
echo "IPv6: $SERVER_IPV6"
echo "Location: $LOCATION"
echo "Type: $SERVER_TYPE"
echo "Monthly Cost: €4.49"
echo ""
echo "SSH Command: ssh root@$SERVER_IP"
echo ""
echo "Next Steps:"
echo "  1. Wait 30 seconds for server initialization"
echo "  2. Test SSH: ssh root@$SERVER_IP"
echo "  3. Run Phase 3: Generate TLS certificates"
echo "  4. Run Phase 4: Deploy rsyslog sink"
```

Save this as `config/telemetry/offhost-syslog/scripts/provision-hetzner.sh` and run:

```bash
chmod +x config/telemetry/offhost-syslog/scripts/provision-hetzner.sh
./config/telemetry/offhost-syslog/scripts/provision-hetzner.sh
```

---

## Method 3: Terraform Provisioning

### Install Hetzner Provider

Create `hetzner.tf`:

```hcl
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

variable "admin_ip" {
  description = "Admin IP for SSH access"
  default     = "173.94.53.113"
}

variable "starlingx_ip" {
  description = "StarlingX IP for syslog access"
  default     = "23.92.79.2"
}

# SSH Key
resource "hcloud_ssh_key" "admin" {
  name       = "admin-key"
  public_key = var.ssh_public_key
}

# Firewall
resource "hcloud_firewall" "syslog_sink" {
  name = "syslog-sink-fw"

  # SSH from admin only
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["${var.admin_ip}/32"]
  }

  # Syslog TLS from StarlingX only
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6514"
    source_ips = ["${var.starlingx_ip}/32"]
  }

  # ICMP for diagnostics
  rule {
    direction  = "in"
    protocol   = "icmp"
    source_ips = ["${var.admin_ip}/32", "${var.starlingx_ip}/32"]
  }
}

# Server
resource "hcloud_server" "syslog_sink" {
  name        = "syslog-sink"
  server_type = "cx22"
  image       = "ubuntu-22.04"
  location    = "fsn1"
  ssh_keys    = [hcloud_ssh_key.admin.id]
  firewall_ids = [hcloud_firewall.syslog_sink.id]

  labels = {
    purpose = "syslog-sink"
    managed = "terraform"
  }
}

output "server_ipv4" {
  value = hcloud_server.syslog_sink.ipv4_address
}

output "server_ipv6" {
  value = hcloud_server.syslog_sink.ipv6_address
}

output "ssh_command" {
  value = "ssh root@${hcloud_server.syslog_sink.ipv4_address}"
}
```

### Deploy with Terraform

```bash
cd config/telemetry/offhost-syslog/terraform

# Export variables
export TF_VAR_hcloud_token="your-hetzner-api-token"
export TF_VAR_ssh_public_key="$(cat ~/.ssh/id_rsa.pub)"

# Initialize and apply
terraform init
terraform plan
terraform apply
```

---

## Post-Provisioning Verification

### Test SSH Access

```bash
# Get server IP (from output or hcloud)
SERVER_IP=$(hcloud server ip syslog-sink)

# Test SSH from admin workstation (173.94.53.113)
ssh root@$SERVER_IP "hostname && uname -a"
```

### Verify Firewall Rules

```bash
# From admin IP - should work
ssh root@$SERVER_IP "echo 'SSH OK'"

# From StarlingX (23.92.79.2) - should fail SSH but allow 6514
# (will test after syslog is configured)
```

### Update Ansible Inventory

After provisioning, update `ansible/inventory/hosts.yml`:

```yaml
all:
  children:
    syslog_sinks:
      hosts:
        syslog-sink:
          ansible_host: "{{ SERVER_IP }}"  # Replace with actual IP
          ansible_user: root
          ansible_ssh_private_key_file: ~/.ssh/id_rsa

    syslog_clients:
      hosts:
        stx-aio-0:
          ansible_host: 23.92.79.2
          ansible_port: 2222
          ansible_user: sysadmin
          ansible_ssh_private_key_file: ~/.ssh/id_rsa
```

---

## Cost Summary

| Resource | Monthly Cost |
|----------|--------------|
| CX22 Server | €4.49 |
| Public IPv4 | Included |
| Public IPv6 | Included |
| Firewall | Free |
| **Total** | **€4.49 (~$5)** |

**Budget Savings**: €5.51 under $10/month limit (55% under budget!)

---

## Next Steps

1. ✅ VPS Provisioned
2. → **Phase 3**: Generate TLS certificates
3. → **Phase 4**: Deploy rsyslog-gnutls on VPS
4. → **Phase 5**: Configure stx-aio-0 log forwarding
5. → **Phase 6**: Verify end-to-end log flow

See [`docs/OFFHOST_SYSLOG_DEPLOYMENT_GUIDE.md`](../../docs/OFFHOST_SYSLOG_DEPLOYMENT_GUIDE.md) for detailed configuration steps.
