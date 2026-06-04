# Off-Host Syslog - Ansible Playbooks

## Overview

This directory contains Ansible playbooks and roles for configuring the off-host syslog "Black Box Recorder" infrastructure.

## Directory Structure

```
ansible/
├── playbook.yml           # Main playbook
├── inventory.yml          # Host inventory
├── README.md              # This file
└── roles/
    ├── base/              # OS hardening and prerequisites
    │   ├── tasks/main.yml
    │   └── handlers/main.yml
    ├── rsyslog/           # rsyslog TLS configuration
    │   ├── tasks/main.yml
    │   ├── handlers/main.yml
    │   └── templates/
    │       ├── rsyslog-tls-server.conf.j2
    │       └── rsyslog-filters.conf.j2
    └── logrotate/         # Log retention policies
        ├── tasks/main.yml
        └── templates/
            └── logrotate-syslog-sink.j2
```

## Prerequisites

1. **Ansible installed** (2.12+)
2. **SSH access** to VPS with sudo privileges
3. **TLS certificates** generated and ready for deployment
4. **VPS provisioned** via Terraform

## Quick Start

### 1. Set VPS IP

```bash
export VPS_IP="<your-vps-ip>"
```

### 2. Deploy TLS Certificates

Before running Ansible, deploy certificates to VPS:

```bash
# Copy certificates to VPS
scp ../certs/generated/ca.crt admin@$VPS_IP:/tmp/
scp ../certs/generated/server.crt admin@$VPS_IP:/tmp/
scp ../certs/generated/server.key admin@$VPS_IP:/tmp/
scp ../certs/generated/client.crt admin@$VPS_IP:/tmp/

# Install on VPS
ssh admin@$VPS_IP <<'EOF'
sudo mkdir -p /etc/ssl/private
sudo cp /tmp/ca.crt /etc/ssl/certs/observability-ca.crt
sudo cp /tmp/server.crt /etc/ssl/certs/syslog-sink.crt
sudo cp /tmp/server.key /etc/ssl/private/syslog-sink.key
sudo cp /tmp/client.crt /etc/ssl/certs/stx-aio-0.crt
sudo chmod 644 /etc/ssl/certs/observability-ca.crt
sudo chmod 644 /etc/ssl/certs/syslog-sink.crt
sudo chmod 644 /etc/ssl/certs/stx-aio-0.crt
sudo chmod 600 /etc/ssl/private/syslog-sink.key
sudo chown root:root /etc/ssl/certs/observability-ca.crt
sudo chown root:root /etc/ssl/certs/syslog-sink.crt
sudo chown root:root /etc/ssl/private/syslog-sink.key
rm -f /tmp/*.crt /tmp/*.key
EOF
```

### 3. Run Ansible Playbook

```bash
# Full deployment
VPS_IP=$VPS_IP ansible-playbook -i inventory.yml playbook.yml

# Dry run
VPS_IP=$VPS_IP ansible-playbook -i inventory.yml playbook.yml --check

# Only specific roles
VPS_IP=$VPS_IP ansible-playbook -i inventory.yml playbook.yml --tags rsyslog
VPS_IP=$VPS_IP ansible-playbook -i inventory.yml playbook.yml --tags logrotate
```

## Roles

### Base Role

Configures system security and prerequisites:

- Installs required packages (rsyslog, rsyslog-gnutls, ufw)
- Configures UFW firewall:
  - SSH from 173.94.53.113/32 only
  - Syslog from 23.92.79.2/32 only (port 6514)
  - All other inbound denied
- Creates log directory `/var/log/remote/`
- Hardens SSH (disable password auth, disable root login)
- Configures fail2ban
- Enables automatic security updates

### rsyslog Role

Configures TLS syslog server:

- Deploys TLS server configuration
- Listens on TCP/6514 with mutual TLS authentication
- Routes messages to appropriate log files:
  - `authpriv.*` → `/var/log/remote/auth.log`
  - `*.warn` → `/var/log/remote/system.log`
- Validates configuration before restart

### Logrotate Role

Configures log retention:

- Auth logs: 30-day retention, daily rotation
- System logs: 7-day retention, daily rotation
- Compression enabled (gzip with delayed compress)
- Reloads rsyslog after rotation

## Configuration Variables

Key variables (defined in `playbook.yml` and `inventory.yml`):

| Variable | Default | Description |
|----------|---------|-------------|
| `syslog_port` | 6514 | TLS syslog listen port |
| `admin_ssh_ip` | 173.94.53.113 | SSH allowlist IP |
| `syslog_source_ip` | 23.92.79.2 | Syslog allowlist IP |
| `auth_log_retention_days` | 30 | Auth log retention |
| `system_log_retention_days` | 7 | System log retention |
| `log_base_dir` | /var/log/remote | Remote log directory |

## Security Controls

### Firewall Rules (Non-negotiable)

```
# Default policies
ufw default deny incoming
ufw default allow outgoing

# Explicit allows
ufw allow from 173.94.53.113/32 to any port 22 proto tcp    # Admin SSH
ufw allow from 23.92.79.2/32 to any port 6514 proto tcp     # Syslog TLS
```

### TLS Configuration

- TLS 1.2+ only (enforced by GnuTLS)
- Mutual authentication required
- Client CN: `stx-aio-0.corp.interface.tag.ooo`
- Server CN: `syslog-sink.internal`

### Key Permissions

```
/etc/ssl/private/syslog-sink.key  0600 root:root
/etc/ssl/certs/syslog-sink.crt    0644 root:root
/etc/ssl/certs/observability-ca.crt 0644 root:root
```

## Verification

After deployment:

```bash
# Check rsyslog status
ssh admin@$VPS_IP 'systemctl status rsyslog'

# Verify TLS listener
ssh admin@$VPS_IP 'ss -tlnp | grep 6514'

# Check firewall
ssh admin@$VPS_IP 'sudo ufw status verbose'

# View logs
ssh admin@$VPS_IP 'sudo tail /var/log/remote/auth.log'
ssh admin@$VPS_IP 'sudo tail /var/log/remote/system.log'
```

## Troubleshooting

### rsyslog won't start

```bash
# Check configuration
ssh admin@$VPS_IP 'sudo rsyslogd -N1'

# View logs
ssh admin@$VPS_IP 'sudo journalctl -u rsyslog -n 50'
```

### No logs received

```bash
# Check TLS listener is up
ssh admin@$VPS_IP 'ss -tlnp | grep 6514'

# Test TLS from source
openssl s_client -connect $VPS_IP:6514 \
    -cert /etc/ssl/certs/stx-aio-0.crt \
    -key /etc/ssl/private/stx-aio-0.key \
    -CAfile /etc/ssl/certs/observability-ca.crt
```

### Permission denied errors

```bash
# Check certificate permissions
ssh admin@$VPS_IP 'ls -la /etc/ssl/certs/syslog* /etc/ssl/private/syslog*'

# Ensure rsyslog can read them
ssh admin@$VPS_IP 'sudo -u syslog cat /etc/ssl/certs/syslog-sink.crt | head -1'
```

## Rollback

To undo deployment:

```bash
# Disable rsyslog TLS config
ssh admin@$VPS_IP 'sudo rm /etc/rsyslog.d/99-tls-server.conf /etc/rsyslog.d/98-filters.conf'
ssh admin@$VPS_IP 'sudo systemctl restart rsyslog'

# Disable logrotate config
ssh admin@$VPS_IP 'sudo rm /etc/logrotate.d/syslog-sink'

# Reset firewall to default
ssh admin@$VPS_IP 'sudo ufw reset && sudo ufw default deny incoming && sudo ufw default allow outgoing && sudo ufw allow 22 && sudo ufw enable'
```
