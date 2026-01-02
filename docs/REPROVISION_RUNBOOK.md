# StarlingX Bare Metal Re-provisioning Runbook (Ubuntu 22.04 LTS)

**Target Server**: 23.92.79.2 (`stx-aio-0`)
**Objective**: Clean install of Ubuntu 22.04 LTS Server to enable upstream OpenStack 2025/2026 series via Kolla-Ansible.

> [!CAUTION]
> **PHYSICAL ACCESS REQUIRED**: This procedure wipes the OS. You will lose remote connectivity until Step 4 is verified. Ensure you have KVM/IPMI access to the server console.

## Prerequisites
1.  **Ubuntu 22.04 LTS Server ISO**: Download from [releases.ubuntu.com](https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso).
2.  **Bootable Media**: Create a USB stick or map the ISO via IPMI Virtual Media.
3.  **Backups**: `~/stx-backup-20251231/pre-reprovision-backup.tar.gz`.
4.  **Autoinstall**: `config/infrastructure/ubuntu22-autoinstall.yaml` (update password hash before use).

## Step 1: Clean Installation
1.  Boot the server from the Ubuntu 22.04 ISO.
2.  Select **"Install Ubuntu Server"**.
3.  **Language/Keyboard**: English/US.
4.  **Network Connections**:
    - Target config (from verified backup):
      - Bond: `bond0` (mode `802.3ad`, slaves `eno1` + `eno2`)
      - Address: `23.92.79.2/30`
      - Gateway: `23.92.79.1`
      - DNS: `8.8.8.8, 1.1.1.1`
5.  **Proxy**: Leave blank unless required.
6.  **Mirror**: Default.
7.  **Storage Configuration**:
    - Select **"Custom storage layout"**.
    - **Target Drive**: Select the primary boot drive.
    - **Partitioning**:
        - `/boot`: 1GB (ext4)
        - `/`: 50GB (ext4)
        - `swap`: 8GB (optional)
        - `/var/lib/docker`: Remaining space (ext4) - *Critical for containers*.
8.  **Profile Setup**:
    - **Your name**: `Sysadmin`
    - **Server name**: `stx-aio-0`
    - **Username**: `sysadmin`
    - **Password**: (Set a strong temporary password).
9.  **SSH Setup**: Check **"Install OpenSSH server"**. Import keys if possible (Github: `starlingx`).
10. **Featured Server Snaps**: Select **None** (We will install specific versions manually).

## Step 2: First Boot Configuration
1.  Login as `sysadmin` on the console.
2.  Switch to root: `sudo -i`.
3.  **Enable Root SSH (Temporary for recovery)**:
    ```bash
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
    passwd root  # Set root password
    systemctl restart ssh
    ```
4.  **Restore SSH Keys**:
    - On your local machine, run the **Bootstrap Script** provided by the Agent.
    - *Or manually*: Copy `authorized_keys` from backup to `/root/.ssh/`.

## Step 3: Run Bootstrap
Once SSH is accessible:
1.  Execute: `scripts/bootstrap_ubuntu_flamingo.sh` (from your local machine targeting the remote).
    - This script will install Python 3.11, containerd, and OpenStack prerequisites.

## Validation
- Network validation checklist: `docs/NETWORK_VALIDATION_CHECKLIST.md`
- Rollback/recovery: `docs/ROLLBACK_AND_RECOVERY.md`
- OpenStack readiness: `docs/OPENSTACK_RELEASE_READINESS_ASSESSMENT.md`

## Troubleshooting
- **No Network**: Check `ip addr` and `/etc/netplan/00-installer-config.yaml`.
- **SSH Fail**: Check `ufw status` (Ubuntu firewall). Disable it temporarily: `ufw disable`.
