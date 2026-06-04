# Off-Host Syslog Verification Tests

## Overview

This directory contains verification scripts for the off-host syslog "Black Box Recorder" infrastructure. These tests validate connectivity, TLS configuration, log delivery, and retention policies.

## Test Scripts

| Script | Purpose | Run From |
|--------|---------|----------|
| [`test-connectivity.sh`](test-connectivity.sh) | TCP/6514 and TLS handshake verification | stx-aio-0 or client |
| [`test-synthetic-log.sh`](test-synthetic-log.sh) | Send test messages via logger | stx-aio-0 |
| [`test-ssh-login.sh`](test-ssh-login.sh) | Verify real SSH login events | Any SSH client |
| [`verify-retention.sh`](verify-retention.sh) | Check logrotate configuration | Any system |

## Quick Start

```bash
# Set VPS IP
export VPS_IP="<your-vps-ip>"

# Run all tests in sequence
./test-connectivity.sh $VPS_IP
./test-synthetic-log.sh $VPS_IP
./test-ssh-login.sh $VPS_IP
./verify-retention.sh $VPS_IP
```

## Test Details

### 1. Connectivity Test (`test-connectivity.sh`)

Tests TCP and TLS connectivity from source to VPS.

**Prerequisites:**
- Certificates deployed on source system
- VPS rsyslog running on port 6514
- Firewall allows source IP

**What it tests:**
- TCP port 6514 reachability
- Local certificate files exist
- TLS handshake with mutual authentication
- Certificate chain validation
- TLS 1.2+ protocol support

**Usage:**
```bash
./test-connectivity.sh <VPS_IP>

# With custom certificate paths
CA_CERT=/path/to/ca.crt \
CLIENT_CERT=/path/to/client.crt \
CLIENT_KEY=/path/to/client.key \
./test-connectivity.sh <VPS_IP>
```

### 2. Synthetic Log Test (`test-synthetic-log.sh`)

Sends test log messages and verifies they arrive at VPS.

**Prerequisites:**
- SSH access to VPS for verification
- rsyslog configured on source

**What it tests:**
- authpriv.info messages → `/var/log/remote/auth.log`
- local0.warning messages → `/var/log/remote/system.log`
- sudo simulation → `/var/log/remote/auth.log`
- Batch delivery timing

**Usage:**
```bash
./test-synthetic-log.sh <VPS_IP>

# With custom VPS user
VPS_USER=admin ./test-synthetic-log.sh <VPS_IP>
```

### 3. SSH Login Test (`test-ssh-login.sh`)

Performs real SSH login to stx-aio-0 and verifies the authentication event is captured.

**Prerequisites:**
- SSH key access to stx-aio-0
- SSH key access to VPS

**What it tests:**
- Real sshd authentication events
- User login entries
- sudo events (if any)
- Log propagation timing

**Usage:**
```bash
./test-ssh-login.sh <VPS_IP>

# With custom source host
STX_HOST=stx-aio-0 STX_USER=sysadmin ./test-ssh-login.sh <VPS_IP>
```

### 4. Retention Verification (`verify-retention.sh`)

Checks logrotate configuration matches requirements.

**Prerequisites:**
- SSH access to VPS

**What it tests:**
- Logrotate configuration exists
- Auth log retention = 30 days
- System log retention = 7 days
- Compression enabled
- Log directory and files exist
- Daily rotation schedule
- Disk space availability

**Usage:**
```bash
./verify-retention.sh <VPS_IP>
```

## Expected Results

### Successful Deployment

After a complete deployment, all tests should pass:

```
============================================
Test Summary
============================================
Passed: 12
Failed: 0

All tests PASSED
```

### Common Failure Patterns

#### TCP Connection Failed
```
[FAIL] Cannot establish TCP connection to VPS:6514
```
**Causes:**
- VPS not running
- Firewall blocking port 6514
- rsyslog not listening

**Fix:**
- Check VPS status: `ssh admin@VPS 'systemctl status rsyslog'`
- Verify firewall: `ssh admin@VPS 'sudo ufw status'`

#### TLS Handshake Failed
```
[FAIL] TLS handshake failed
```
**Causes:**
- Certificate mismatch
- CA not trusted
- Wrong CN in certificate

**Fix:**
- Verify certificates: `openssl verify -CAfile ca.crt server.crt`
- Check CN matches expected hostname

#### No Logs Received
```
[FAIL] authpriv message NOT found on VPS
```
**Causes:**
- rsyslog forwarding not configured
- Queue backlog
- TLS connection issues

**Fix:**
- Check rsyslog status: `systemctl status rsyslog`
- View rsyslog errors: `journalctl -u rsyslog`
- Check queue: `ls /var/spool/rsyslog/`

## Manual Verification

### View Live Logs on VPS
```bash
ssh admin@VPS_IP 'sudo tail -f /var/log/remote/auth.log'
```

### Send Test Message from Source
```bash
logger -p authpriv.info "Manual test $(date)"
```

### Check rsyslog Queue
```bash
# On source
ls -la /var/spool/rsyslog/

# On VPS
sudo rsyslogd -N1  # Validate config
```

### Test TLS Connection Manually
```bash
openssl s_client \
    -connect VPS_IP:6514 \
    -cert /etc/ssl/certs/stx-aio-0.crt \
    -key /etc/ssl/private/stx-aio-0.key \
    -CAfile /etc/ssl/certs/observability-ca.crt \
    -verify 3
```

## CI/CD Integration

These scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
verify-syslog:
  runs-on: ubuntu-latest
  steps:
    - name: Run connectivity test
      run: ./tests/test-connectivity.sh ${{ secrets.VPS_IP }}
      env:
        CA_CERT: ${{ secrets.CA_CERT_PATH }}
        CLIENT_CERT: ${{ secrets.CLIENT_CERT_PATH }}
        CLIENT_KEY: ${{ secrets.CLIENT_KEY_PATH }}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | One or more tests failed |
| 2 | Prerequisites not met |

## Security Notes

- Test scripts may contain sensitive connection details in output
- Avoid running in untrusted environments
- Log output may contain IP addresses and hostnames
- Clean up test logs if running in production
