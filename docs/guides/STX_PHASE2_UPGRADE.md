# StarlingX Phase 2 Containerd Upgrade Guide

## Overview

The Phase 2 upgrade upgrades containerd to version 1.7.x and disables Docker on a StarlingX single-node control plane. This process is integrated into the `af` CLI with proper governance and break-glass procedures.

## Repository Configuration

If containerd 1.7.x is not available in standard repositories, you have several options:

### Option 1: Check Alternative Repositories

The plan command automatically checks:
- Docker CE Test repository
- Docker CE Nightly repository  
- EPEL Testing repository

```bash
./scripts/af stx phase2 plan
```

### Option 2: Manual RPM Installation (Drift Risk)

If repositories don't have 1.7.x, use the manual RPM installer with proper approvals:

```bash
# Dry run to see steps
./scripts/stx_phase2_manual_rpm.sh --dry-run

# Install from whitelisted RPM (default containerd 1.7.30)
./scripts/stx_phase2_manual_rpm.sh

# Install from specific RPM (must be whitelisted or approved)
./scripts/stx_phase2_manual_rpm.sh --rpm-url https://github.com/containerd/containerd/releases/download/v1.7.30/containerd-1.7.30-1.el8.x86_64.rpm
```

#### Approval Requirements:

1. **URL Whitelist**: RPM must be in `config/approved_containerd_rpms.yaml`
2. **Manager Approval** (if not whitelisted):
   ```bash
   AF_APPROVE_MANUAL_RPM=1 AF_APPROVER="manager-name" ./scripts/stx_phase2_manual_rpm.sh
   ```
3. **Ticket Reference** (recommended):
   ```bash
   AF_MANUAL_RPM_TICKET=INFRA-456 ./scripts/stx_phase2_manual_rpm.sh
   ```
4. **Break-glass** (for prod/stg):
   ```bash
   AF_BREAK_GLASS=1 AF_BREAK_GLASS_REASON="Security patches" \
   AF_CHANGE_TICKET=INFRA-123 AF_APPROVE_MANUAL_RPM=1 \
   AF_APPROVER="manager-name" ./scripts/stx_phase2_manual_rpm.sh
   ```

⚠️ **Warning**: Manual RPM installation increases drift risk against STX expectations and requires explicit acceptance. All approvals are logged to `.goalie/stx_audit.jsonl`.

### Option 3: Enable Additional Repositories

```bash
# On the StarlingX host, enable Docker Nightly
dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce-nightly.repo

# Check for containerd 1.7.x
dnf --enablerepo=docker-ce-nightly list containerd.io
```

## Prerequisites

1. SSH access to the StarlingX controller
2. Proper SSH key configuration (`STX_SSH_KEY` environment variable)
3. Containerd 1.7.x available or manual RPM installation approved
4. Maintenance window scheduled (workloads will be affected)

## Commands

### Plan Phase (Read-only)

```bash
# Check current state and availability
./scripts/af stx phase2 plan
```

The plan command:
- Captures current containerd and runtime state
- Checks Kubernetes node and pod status
- Verifies containerd 1.7.x availability in repositories
- Shows detailed execution steps
- Displays break-glass requirements
- Outlines rollback procedures

### Apply Phase (Disruptive)

```bash
# Production/Staging (requires break-glass)
AF_BREAK_GLASS=1 \
AF_BREAK_GLASS_REASON="Upgrade to containerd 1.7.x for security patches" \
AF_CHANGE_TICKET=INFRA-123 \
./scripts/af stx phase2 apply

# Development (no break-glass required)
./scripts/af stx phase2 apply
```

The apply command:
1. **Maintenance**: Cordons the node to stop new scheduling
2. **Backup**: Saves `/etc/containerd/config.toml` with timestamp
3. **Upgrade**: Installs and pins containerd.io-1.7.x from repos
4. **Restart**: Restarts containerd, then kubelet
5. **Validation**: Verifies services and Kubernetes health
6. **Docker Disablement**: Disables Docker service

## Break-glass Requirements

For production and staging environments, the apply command requires:

```bash
AF_BREAK_GLASS=1
AF_BREAK_GLASS_REASON="<justification>"
AF_CHANGE_TICKET="<ticket-id>" OR AF_CAB_APPROVAL_ID="<cab-id>"
AF_BREAK_GLASS_INTERACTIVE_CONFIRM=0  # For CI (optional)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STX_HOST` | 23.92.79.2 | StarlingX host IP |
| `STX_PORT` | 2222 | SSH port |
| `STX_USER` | root | SSH username |
| `STX_SSH_KEY` | $HOME/pem/stx-aio-0.pem | Path to SSH private key |
| `AF_ENV` | local | Environment (local/dev/stg/prod) |

## Rollback

### Automated Rollback

Use the provided rollback script:

```bash
# Dry run to see rollback steps
./scripts/stx_phase2_rollback.sh --dry-run

# Perform actual rollback
./scripts/stx_phase2_rollback.sh
```

### Manual Rollback

1. Restore previous containerd version:
   ```bash
   dnf downgrade -y containerd.io-<previous-version>
   dnf versionlock delete containerd.io
   ```

2. Restore configuration:
   ```bash
   cp /etc/containerd/config.toml.phase2-backup-* /etc/containerd/config.toml
   ```

3. Restart services:
   ```bash
   systemctl restart containerd
   sleep 5
   systemctl restart kubelet
   ```

4. Re-enable Docker:
   ```bash
   systemctl enable --now docker
   ```

5. Validate:
   ```bash
   ./scripts/af stx health
   ```

## Validation Checks

After upgrade, verify:

1. Containerd version:
   ```bash
   containerd --version  # Should show 1.7.x
   ```

2. Runtime functionality:
   ```bash
   crictl info
   ```

3. Kubernetes health:
   ```bash
   kubectl get nodes -o wide
   kubectl get pods -A -o wide
   ```

4. CNI functionality:
   ```bash
   ./scripts/af stx health
   ```

## Troubleshooting

### Common Issues

1. **Node NotReady after upgrade**
   - Check kubelet logs: `journalctl -u kubelet -f`
   - Verify containerd is running: `systemctl status containerd`
   - Check CNI: `ls -la /run/flannel/subnet.env`

2. **crictl fails to connect**
   - Verify containerd socket: `ls -la /run/containerd/containerd.sock`
   - Check containerd service: `systemctl status containerd`

3. **Pods stuck in ContainerCreating**
   - Check events: `kubectl get events --sort-by=.lastTimestamp`
   - Verify CNI plugin is working

### Rollback Triggers

Initiate rollback if:
- kubelet can't start pods / node NotReady
- crictl cannot talk to containerd
- Widespread CNI regression after upgrade

## Audit Trail

All operations are logged to `.goalie/stx_audit.jsonl` with:
- Timestamp
- Action performed
- Environment
- User and host
- Git SHA
- Containerd version (for apply)

## Security Considerations

1. Break-glass ensures explicit accountability
2. All changes are audited
3. Configuration is backed up before changes
4. Rollback capability is maintained
5. Remote confirmation required for production read-only operations

## Integration with CI/CD

For CI/CD pipelines:

```bash
# Set non-interactive mode
export AF_BREAK_GLASS_INTERACTIVE_CONFIRM=0

# Run with service account or CI credentials
AF_BREAK_GLASS=1 \
AF_BREAK_GLASS_REASON="Automated upgrade pipeline" \
AF_CHANGE_TICKET=$CI_TICKET_ID \
./scripts/af stx phase2 apply
```
