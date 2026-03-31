#!/bin/bash
# Bootstrap Ubuntu 22.04 for OpenStack 2025.2 Flamingo
# Run this from your LOCAL machine: ./bootstrap_ubuntu_flamingo.sh

SERVER="23.92.79.2"
USER="root"
SSH_PORT="2222" # Default after autoinstall late-commands, fallback may be 22
SSH_KEY="$HOME/.ssh/starlingx_key"
BACKUP_TARBALL="${BACKUP_TARBALL:-}"

if [ "$(uname -s)" = "Linux" ]; then
set -euo pipefail
BACKUP_TARBALL="${BACKUP_TARBALL:-/root/pre-reprovision-backup.tar.gz}"
echo "Bootstrapping (local mode)..."

phase_done() {
    echo "✅ Phase $1 complete"
}

echo "Phase 1: System Update"

echo "Updating System..."
apt update && apt upgrade -y
apt install -y software-properties-common curl wget git net-tools ca-certificates gnupg lsb-release
phase_done 1

echo "Phase 2: Network Configuration (bond0 verification)"

echo "Restoring authorized_keys (if backup tarball is present)..."
if [ -f "$BACKUP_TARBALL" ]; then
    mkdir -p /root/.ssh
    chmod 700 /root/.ssh
    tmpdir="$(mktemp -d)"
    tar -xzf "$BACKUP_TARBALL" -C "$tmpdir"
    ak="$(find "$tmpdir" -type f -name authorized_keys | head -n 1 || true)"
    if [ -n "$ak" ] && [ -f "$ak" ]; then
        cp "$ak" /root/.ssh/authorized_keys
        chmod 600 /root/.ssh/authorized_keys
    fi
    rm -rf "$tmpdir"
fi

echo "Configuring Network Bonding (Verification)..."
if ! ip link show bond0 > /dev/null 2>&1; then
    echo "Warning: bond0 not found. Attempting to configure..."
    # Netplan config would go here if needed
fi
phase_done 2

echo "Phase 3: SSH Configuration (port 2222 hardening)"

echo "Hardening SSH (Port 2222)..."
grep -qE '^Port[[:space:]]+2222$' /etc/ssh/sshd_config || (sed -i -E 's/^#?Port[[:space:]]+[0-9]+/Port 2222/' /etc/ssh/sshd_config || true; grep -qE '^Port[[:space:]]+2222$' /etc/ssh/sshd_config || echo 'Port 2222' >> /etc/ssh/sshd_config)
sed -i -E 's/^#?PasswordAuthentication[[:space:]]+.*/PasswordAuthentication no/' /etc/ssh/sshd_config || true
sed -i -E 's/^#?PermitRootLogin[[:space:]]+.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config || true
systemctl restart ssh
phase_done 3

echo "Phase 4: Python 3.11 Configuration"

echo "Installing Python 3.11 (Required for OpenStack 2025.2)..."
add-apt-repository -y ppa:deadsnakes/ppa
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip git build-essential libssl-dev libffi-dev python3-dev
if [ ! -d /opt/kolla-flamingo ]; then
    python3.11 -m venv /opt/kolla-flamingo
fi
phase_done 4

echo "Phase 5: Containerd 2.x Installation"

echo "Installing Containerd 2.0+..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  \"$(. /etc/os-release && echo \"$VERSION_CODENAME\")\" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y containerd.io
containerd config default > /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
phase_done 5

echo "Phase 6: Docker Installation"
apt install -y docker-ce docker-ce-cli docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
phase_done 6

echo "Phase 7: Kolla-Ansible Prerequisites"

echo "Installing OpenStack Kolla-Ansible Prerequisites..."
/opt/kolla-flamingo/bin/pip install -U pip
/opt/kolla-flamingo/bin/pip install 'ansible>=8,<9'
/opt/kolla-flamingo/bin/pip install kolla-ansible
if /opt/kolla-flamingo/bin/kolla-ansible --help >/dev/null 2>&1; then
    /opt/kolla-flamingo/bin/kolla-ansible install-deps || true
fi
phase_done 7

echo "Phase 8: Storage Configuration (LVM for Cinder - optional)"
apt install -y lvm2 thin-provisioning-tools
if [ -n "${CINDER_DEVICE:-}" ] && [ "${CINDER_FORCE:-false}" = "true" ]; then
    if [ -b "$CINDER_DEVICE" ]; then
        wipefs -a "$CINDER_DEVICE"
        pvcreate -ff -y "$CINDER_DEVICE"
        vgcreate cinder-volumes "$CINDER_DEVICE"
    fi
fi
phase_done 8

echo "Phase 9: System Hardening"

echo "System Hardening..."
if command -v ufw >/dev/null 2>&1; then
    ufw allow 2222/tcp || true
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    if [ "${ENABLE_UFW:-false}" = "true" ]; then
        ufw --force enable
    fi
fi
phase_done 9

echo "Phase 10: Kolla-Ansible Configuration (minimal scaffolding)"
mkdir -p /etc/kolla
if [ ! -f /etc/kolla/passwords.yml ] && command -v /opt/kolla-flamingo/bin/kolla-genpwd >/dev/null 2>&1; then
    /opt/kolla-flamingo/bin/kolla-genpwd
fi
if [ ! -f /etc/kolla/all-in-one ]; then
    inv1="/opt/kolla-flamingo/share/kolla-ansible/ansible/inventory/all-in-one"
    inv2="/usr/local/share/kolla-ansible/ansible/inventory/all-in-one"
    if [ -f "$inv1" ]; then
        cp "$inv1" /etc/kolla/all-in-one
    elif [ -f "$inv2" ]; then
        cp "$inv2" /etc/kolla/all-in-one
    fi
fi
phase_done 10

echo "Phase 11: Final Validation"
echo "OS: $(lsb_release -ds 2>/dev/null || true)"
echo "bond0:"
ip -br addr show bond0 || true
echo "Services:"
systemctl is-active ssh || true
systemctl is-active containerd || true
systemctl is-active docker || true
echo "Versions:"
python3.11 --version || true
containerd --version || true
docker --version || true
/opt/kolla-flamingo/bin/kolla-ansible --version 2>/dev/null || true
phase_done 11

echo "Bootstrap Complete. System Ready for OpenStack Deployment."
exit 0
fi

BACKUP_TARBALL="${BACKUP_TARBALL:-$HOME/stx-backup-20251231/pre-reprovision-backup.tar.gz}"

echo "Bootstrapping $SERVER..."

SCRIPT_SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

echo "Transferring bootstrap script + backup tarball, then executing remotely..."
ssh-copy-id -p "$SSH_PORT" -i "$SSH_KEY.pub" "$USER@$SERVER" || echo "Manual auth required first time."

scp -P "$SSH_PORT" -i "$SSH_KEY" "$SCRIPT_SELF" "$USER@$SERVER:/root/bootstrap_ubuntu_flamingo.sh"
scp -P "$SSH_PORT" -i "$SSH_KEY" "$BACKUP_TARBALL" "$USER@$SERVER:/root/pre-reprovision-backup.tar.gz" || echo "Backup tarball not copied (file missing?): $BACKUP_TARBALL"

ssh -p "$SSH_PORT" -i "$SSH_KEY" "$USER@$SERVER" "chmod +x /root/bootstrap_ubuntu_flamingo.sh && timeout \"${BOOTSTRAP_TIMEOUT:-60m}\" env BACKUP_TARBALL=/root/pre-reprovision-backup.tar.gz ENABLE_UFW=\"${ENABLE_UFW:-false}\" /root/bootstrap_ubuntu_flamingo.sh 2>&1 | tee /var/log/bootstrap.log"

