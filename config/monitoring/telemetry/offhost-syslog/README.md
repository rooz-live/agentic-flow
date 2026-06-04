# Off-Host Syslog Infrastructure

**Purpose**: Centralized "black box recorder" for stx-aio-0 authentication and system logs, stored off-host for forensic analysis and audit compliance.

## Architecture Overview

```
┌─────────────────────┐     TLS/6514      ┌──────────────────────┐
│     stx-aio-0       │ ─────────────────▶│    syslog-sink       │
│   23.92.79.2:2222   │   (mTLS Auth)     │   77.42.28.179       │
│                     │                    │                      │
│ - journald          │                    │ - rsyslog-gnutls     │
│ - rsyslog forwarder │                    │ - Log separation     │
│ - Client cert       │                    │ - Logrotate          │
└─────────────────────┘                    └──────────────────────┘
```

## Security Model

### Network Security
- **Firewall (UFW)**: Default deny inbound
- **SSH (22)**: Only from admin IP `173.94.53.113/32`
- **Syslog TLS (6514)**: Only from stx-aio-0 `23.92.79.2/32`

### Transport Layer Security
- **Protocol**: TLS 1.2+ on TCP/6514
- **Authentication**: Mutual TLS (x509/certvalid)
- **CA**: Self-managed internal CA (10-year validity)
- **Certificates**: 1-year validity, auto-renewal recommended

### File Permissions
- **Private Keys**: `root:root 0600`
- **Certificates**: `root:root 0644`
- **TLS Directory**: `root:root 0700`

## Log Streams

| Stream | Facility/Severity | Retention | File |
|--------|------------------|-----------|------|
| Auth/Sudo | `authpriv.*` + `sudo` program | 30 days | `/var/log/remote/auth.log` |
| System | `*.warn` (excluding authpriv) | 7 days | `/var/log/remote/system.log` |

## Quick Start

### 1. Generate Certificates (Already Complete)
```bash
cd config/telemetry/offhost-syslog/pki
./generate-all-certs.sh
```

### 2. Deploy Syslog Sink (Phase 4)
```bash
cd config/telemetry/offhost-syslog/ansible

# Test connectivity first
ansible -i inventory.yml syslog_sinks -m ping

# Deploy sink configuration
ansible-playbook -i inventory.yml deploy-sink.yml
```

### 3. Deploy Log Forwarder (Phase 5)
```bash
# Deploy forwarder on stx-aio-0
ansible-playbook -i inventory.yml deploy-forwarder.yml
```

### 4. Verify Log Flow (Phase 6)
```bash
# Run verification playbook
ansible-playbook -i inventory.yml verify-log-flow.yml

# Manual verification on sink
ssh root@77.42.28.179 "tail -f /var/log/remote/auth.log"
```

## Directory Structure

```
config/telemetry/offhost-syslog/
├── README.md                 # This file
├── pki/                      # Certificate infrastructure
│   ├── generate-ca.sh        # CA generation script
│   ├── generate-server-cert.sh   # Server cert script
│   ├── generate-client-cert.sh   # Client cert script
│   ├── generate-all-certs.sh     # Master script
│   └── ca/                   # Generated certificates
│       ├── certs/            # Public certificates
│       │   ├── ca.crt
│       │   ├── syslog-sink.crt
│       │   └── stx-aio-0-client.crt
│       └── private/          # Private keys (PROTECT)
│           ├── ca.key
│           ├── syslog-sink.key
│           └── stx-aio-0-client.key
├── ansible/                  # Deployment automation
│   ├── inventory.yml         # Host definitions
│   ├── deploy-sink.yml       # Sink deployment
│   ├── deploy-forwarder.yml  # Forwarder deployment
│   ├── verify-log-flow.yml   # Verification playbook
│   └── templates/
│       ├── rsyslog-sink.conf.j2      # Sink rsyslog config
│       ├── rsyslog-forwarder.conf.j2 # Forwarder rsyslog config
│       └── logrotate-remote.j2       # Log rotation config
└── terraform-hetzner/        # Infrastructure as Code
    ├── main.tf               # VPS provisioning
    ├── variables.tf          # Configuration variables
    └── terraform.tfstate     # State (DO NOT COMMIT)
```

## Certificate Details

### CA Certificate
- **CN**: Offhost-Syslog-CA
- **Validity**: 10 years (3650 days)
- **Key Size**: 4096 bits RSA
- **Fingerprint**: `ED:B1:54:D4:F9:D6:1A:A0:60:18:61:67:EF:EE:84:8C:C1:F1:B4:E2:85:75:5F:FB:BC:30:AA:3B:C9:74:E9:67`

### Server Certificate (syslog-sink)
- **CN**: syslog-sink
- **SAN**: DNS:syslog-sink, IP:77.42.28.179
- **Validity**: 365 days
- **Key Size**: 2048 bits RSA
- **Usage**: serverAuth

### Client Certificate (stx-aio-0)
- **CN**: stx-aio-0
- **SAN**: DNS:stx-aio-0, DNS:stx-aio-0.corp.interface.tag.ooo, IP:23.92.79.2
- **Validity**: 365 days
- **Key Size**: 2048 bits RSA
- **Usage**: clientAuth

## Troubleshooting

### Connection Refused on Port 6514
```bash
# Check rsyslog status on sink
ssh root@77.42.28.179 "systemctl status rsyslog"

# Check if port is listening
ssh root@77.42.28.179 "ss -tlnp | grep 6514"

# Check firewall rules
ssh root@77.42.28.179 "ufw status verbose"
```

### TLS Handshake Failure
```bash
# Test TLS connection manually
openssl s_client -connect 77.42.28.179:6514 \
  -CAfile pki/ca/certs/ca.crt \
  -cert pki/ca/certs/stx-aio-0-client.crt \
  -key pki/ca/private/stx-aio-0-client.key

# Check certificate validity
openssl x509 -in pki/ca/certs/syslog-sink.crt -noout -dates
```

### Logs Not Appearing
```bash
# Check rsyslog errors on forwarder
ssh sysadmin@23.92.79.2 -p 2222 "sudo journalctl -u rsyslog -n 50"

# Check queue status
ssh sysadmin@23.92.79.2 -p 2222 "ls -la /var/spool/rsyslog/"

# Send test message
ssh sysadmin@23.92.79.2 -p 2222 "logger -p authpriv.info -t test 'Manual test message'"
```

## Certificate Renewal

Certificates expire after 365 days. To renew:

```bash
cd config/telemetry/offhost-syslog/pki

# Remove old certificates
rm -f ca/certs/syslog-sink.crt ca/private/syslog-sink.key
rm -f ca/certs/stx-aio-0-client.crt ca/private/stx-aio-0-client.key

# Regenerate (CA remains valid)
./generate-server-cert.sh syslog-sink 77.42.28.179
./generate-client-cert.sh stx-aio-0 23.92.79.2

# Redeploy
cd ../ansible
ansible-playbook -i inventory.yml deploy-sink.yml
ansible-playbook -i inventory.yml deploy-forwarder.yml
```

## Cost

| Component | Provider | Spec | Monthly Cost |
|-----------|----------|------|--------------|
| syslog-sink VPS | Hetzner Cloud | CAX11 (2 vCPU ARM, 4GB RAM, 40GB SSD) | €3.99 |

**Total**: €3.99/month (~$4.30 USD) - Well under $10/month budget

## Incident Response

### Log Retention
- **Auth logs**: 30 days (covers most security investigations)
- **System warnings**: 7 days (reduces storage, most issues surface quickly)

### Accessing Logs
```bash
# SSH to sink
ssh root@77.42.28.179

# View auth logs (SSH, sudo, PAM)
tail -f /var/log/remote/auth.log

# View system warnings
tail -f /var/log/remote/system.log

# Search for specific events
grep "sudo" /var/log/remote/auth.log
grep "error" /var/log/remote/system.log
```

### Log Format
```
TIMESTAMP HOSTNAME PROGRAM[PID]: MESSAGE
```

Example:
```
Jan  5 10:31:51 stx-aio-0 sshd[12345]: Accepted publickey for sysadmin from 173.94.53.113 port 54321 ssh2
Jan  5 10:32:00 stx-aio-0 sudo[12346]: sysadmin : TTY=pts/0 ; PWD=/home/sysadmin ; USER=root ; COMMAND=/usr/bin/apt update
```

## References

- [rsyslog TLS Documentation](https://www.rsyslog.com/doc/v8-stable/tutorials/tls.html)
- [Hetzner Cloud API](https://docs.hetzner.cloud/)
- [OpenSSL Certificate Guide](https://www.openssl.org/docs/man1.1.1/man1/openssl-x509.html)
