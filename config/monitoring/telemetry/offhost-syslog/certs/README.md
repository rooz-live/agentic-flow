# TLS Certificate Management for Off-Host Syslog

## Overview

This directory contains scripts for generating and managing TLS certificates for secure syslog communication between the StarlingX server (stx-aio-0) and the VPS syslog sink.

## Architecture

```
┌─────────────────────┐         TLS/6514        ┌─────────────────────┐
│    stx-aio-0        │ ───────────────────────▶│    VPS Syslog Sink  │
│  (23.92.79.2)       │    Mutual TLS Auth      │  (AWS Lightsail)    │
│  Client Cert        │                         │  Server Cert        │
└─────────────────────┘                         └─────────────────────┘
                         ▲                   ▲
                         │                   │
                         └───── Signed by ───┘
                                  │
                        ┌─────────┴─────────┐
                        │   Internal CA     │
                        │  (10-year valid)  │
                        └───────────────────┘
```

## Certificate Files

| File | Purpose | Permissions | Location (VPS) | Location (stx-aio-0) |
|------|---------|-------------|----------------|----------------------|
| `ca.crt` | CA Certificate | 0644 | `/etc/ssl/certs/observability-ca.crt` | `/etc/ssl/certs/observability-ca.crt` |
| `ca.key` | CA Private Key | 0600 | Secure storage only | N/A |
| `server.crt` | VPS Server Cert | 0644 | `/etc/ssl/certs/syslog-sink.crt` | N/A |
| `server.key` | VPS Server Key | 0600 | `/etc/ssl/private/syslog-sink.key` | N/A |
| `client.crt` | stx-aio-0 Client Cert | 0644 | `/etc/ssl/certs/stx-aio-0.crt` | `/etc/ssl/certs/stx-aio-0.crt` |
| `client.key` | stx-aio-0 Client Key | 0600 | N/A | `/etc/ssl/private/stx-aio-0.key` |

## Certificate Generation Workflow

### Step 1: Generate Internal CA

```bash
# Set environment variables
export CA_ORG="YourOrganization"
export CA_UNIT="Infrastructure"

# Generate CA
./generate-ca.sh
```

This creates:
- `generated/ca.key` - CA private key (4096-bit RSA, 0600 permissions)
- `generated/ca.crt` - CA certificate (10-year validity)

### Step 2: Generate Server Certificate (VPS)

```bash
# Set VPS hostname and IP
export SYSLOG_SINK_HOSTNAME="syslog-sink.internal"
export SYSLOG_SINK_IP="<VPS_PUBLIC_IP>"

# Generate server certificate
./generate-server-cert.sh
```

This creates:
- `generated/server.key` - Server private key (0600 permissions)
- `generated/server.crt` - Server certificate (1-year validity)
- `generated/server.csr` - Certificate signing request

### Step 3: Generate Client Certificate (stx-aio-0)

```bash
# Client hostname is pre-configured for stx-aio-0
export CLIENT_HOSTNAME="stx-aio-0.corp.interface.tag.ooo"
export CLIENT_IP="23.92.79.2"

# Generate client certificate
./generate-client-cert.sh
```

This creates:
- `generated/client.key` - Client private key (0600 permissions)
- `generated/client.crt` - Client certificate (1-year validity)
- `generated/client.csr` - Certificate signing request

## Security Requirements (Non-Negotiable)

### Permission Standards
```bash
# Private keys - root:root 0600
chmod 600 *.key
chown root:root *.key

# Certificates - root:root 0644
chmod 644 *.crt
chown root:root *.crt
```

### TLS Configuration
- **Minimum TLS Version**: 1.2
- **Key Size**: 4096-bit RSA for CA, 2048-bit for server/client
- **Signature Algorithm**: SHA-256
- **Authentication**: Mutual TLS (client certificate required)

### Storage
- CA private key stored in secure location (not on VPS or client)
- All keys excluded from git via `.gitignore`
- Use secrets manager for production deployments

## Certificate Deployment

### Deploy to VPS (syslog sink)
```bash
# Copy CA certificate
scp generated/ca.crt admin@VPS_IP:/tmp/
ssh admin@VPS_IP "sudo cp /tmp/ca.crt /etc/ssl/certs/observability-ca.crt"

# Copy server certificate and key
scp generated/server.crt admin@VPS_IP:/tmp/
scp generated/server.key admin@VPS_IP:/tmp/
ssh admin@VPS_IP "sudo cp /tmp/server.crt /etc/ssl/certs/syslog-sink.crt"
ssh admin@VPS_IP "sudo cp /tmp/server.key /etc/ssl/private/syslog-sink.key"
ssh admin@VPS_IP "sudo chmod 600 /etc/ssl/private/syslog-sink.key"

# Copy client certificate (for verification)
scp generated/client.crt admin@VPS_IP:/tmp/
ssh admin@VPS_IP "sudo cp /tmp/client.crt /etc/ssl/certs/stx-aio-0.crt"
```

### Deploy to stx-aio-0
```bash
# Copy CA certificate
scp generated/ca.crt sysadmin@stx-aio-0:/tmp/
ssh sysadmin@stx-aio-0 "sudo cp /tmp/ca.crt /etc/ssl/certs/observability-ca.crt"

# Copy client certificate and key
scp generated/client.crt sysadmin@stx-aio-0:/tmp/
scp generated/client.key sysadmin@stx-aio-0:/tmp/
ssh sysadmin@stx-aio-0 "sudo cp /tmp/client.crt /etc/ssl/certs/stx-aio-0.crt"
ssh sysadmin@stx-aio-0 "sudo cp /tmp/client.key /etc/ssl/private/stx-aio-0.key"
ssh sysadmin@stx-aio-0 "sudo chmod 600 /etc/ssl/private/stx-aio-0.key"
```

## Verification

### Verify Certificate Chain
```bash
# Verify server certificate
openssl verify -CAfile generated/ca.crt generated/server.crt

# Verify client certificate
openssl verify -CAfile generated/ca.crt generated/client.crt
```

### View Certificate Details
```bash
# View CA certificate
openssl x509 -in generated/ca.crt -text -noout

# View server certificate
openssl x509 -in generated/server.crt -text -noout

# View client certificate
openssl x509 -in generated/client.crt -text -noout
```

### Test TLS Handshake
```bash
# From stx-aio-0, test connection to VPS
openssl s_client \
    -connect VPS_IP:6514 \
    -cert /etc/ssl/certs/stx-aio-0.crt \
    -key /etc/ssl/private/stx-aio-0.key \
    -CAfile /etc/ssl/certs/observability-ca.crt \
    -verify 3 \
    -verify_return_error
```

## Certificate Renewal

Certificates should be renewed before expiry:
- **CA Certificate**: 10 years (renew at year 9)
- **Server/Client Certificates**: 1 year (renew at month 11)

### Renewal Process
1. Generate new certificate using existing CA
2. Deploy new certificate to target system
3. Restart rsyslog service
4. Verify TLS connection
5. Archive old certificate

## Troubleshooting

### Common Issues

1. **TLS Handshake Failure**
   - Verify CA certificate is the same on both systems
   - Check certificate permissions (especially private keys)
   - Ensure system clocks are synchronized

2. **Certificate Verification Failed**
   - Run `openssl verify` to check certificate chain
   - Verify CN/SAN matches expected hostname

3. **Permission Denied**
   - Verify key files are 0600
   - Ensure rsyslog user can read certificates

## File Structure

```
certs/
├── README.md              # This file
├── generate-ca.sh         # CA generation script
├── generate-server-cert.sh # Server certificate script
├── generate-client-cert.sh # Client certificate script
├── openssl.cnf            # OpenSSL configuration
└── generated/             # Output directory (gitignored)
    ├── ca.key             # CA private key
    ├── ca.crt             # CA certificate
    ├── server.key         # Server private key
    ├── server.crt         # Server certificate
    ├── client.key         # Client private key
    └── client.crt         # Client certificate
```
