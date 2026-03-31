# Rollback and Recovery Procedures

## 1. Checkpoint Validation Criteria
- **Boot Success**: Server responds to Ping at `23.92.79.2`.
- **SSH Access**: Server accepts key-based SSH on port 22 (initially) and 2222 (post-bootstrap).
- **Network Bond**: `cat /proc/net/bonding/bond0` shows `Bonding Mode: IEEE 802.3ad Dynamic link aggregation`.
- **Internet**: `curl google.com` succeeds.

## 2. Installation Failure (Rollback)
> [!CRITICAL]
> **Constraint**: Once the disk is wiped by autoinstall, there is **no software rollback** to the old AlmaLinux OS. Rollback implies **re-installing the previous OS** from scratch.

- **Trigger**: Autoinstall fails or creates unbootable system.
- **Recovery Procedure**:
    1.  Boot from **Rescue ISO** (Ubuntu Live or SystemRescueCd).
    2.  Inspect logs: `/var/log/installer/`.
    3.  **Retry**: Fix `autoinstall.yaml` config (e.g., storage layout) and retry install.
    4.  **Fallback**: Install standard Ubuntu 22.04 manually via interactive console if Cloud-Init fails.

## 3. Network Recovery (Remote Access Loss)
- **Scenario**: Bonding fails, server is unreachable via SSH.
- **Recovery**:
    1.  Access **IPMI/KVM Console**.
    2.  Log in as `sysadmin` / `root`.
    3.  Check links: `ip link show`.
    4.  Break Bond (Emergency):
        - `ip link set bond0 down`
        - `ip addr add 23.92.79.2/30 dev eno1`
        - `ip link set eno1 up`
        - `ip route add default via 23.92.79.1`
    5.  Debug Netplan: `netplan try` / `netplan apply`.

## 4. Success Metrics
- **OS**: Ubuntu 22.04 LTS.
- **Python**: 3.11 Default.
- **Containerd**: 2.x Active.
- **SSH**: Port 2222 Open, Root login prohibited (password).
