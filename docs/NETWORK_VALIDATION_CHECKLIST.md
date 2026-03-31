# Network Configuration Validation Checklist (Ubuntu 22.04 Reprovision)

**Target**: `23.92.79.2` (`stx-aio-0.corp.interface.tag.ooo`)

## 0. Console safety checks
- **Confirm** you have console/KVM access before rebooting.
- **Confirm** the NIC MAC addresses match the saved baseline:
  - `eno1`: `3c:ec:ef:76:e5:4a`
  - `eno2`: `3c:ec:ef:76:e5:4b`

## 1. Bonding (LACP 802.3ad)
Run:

```bash
ip -d link show bond0
cat /proc/net/bonding/bond0
```

Expected:
- `mode: 802.3ad`
- `lacp_rate: fast`
- `xmit_hash_policy: layer2+3`
- Both slaves present: `eno1`, `eno2`
- Slave state `up`, aggregator selected

## 2. IP / routing
Run:

```bash
ip -br addr show bond0
ip route
```

Expected:
- `bond0` has `23.92.79.2/30`
- Default route: `default via 23.92.79.1 dev bond0`

## 3. DNS
Run:

```bash
cat /etc/resolv.conf
getent hosts releases.ubuntu.com
```

Expected:
- resolvers include `8.8.8.8` and/or `1.1.1.1`
- DNS resolution works

## 4. SSH access (critical)
Run locally:

```bash
ssh -i ~/pem/stx-aio-0.pem -p 2222 root@23.92.79.2 'echo SSH_OK'
```

Expected:
- Connect succeeds and prints `SSH_OK`

## 5. Network recovery (if SSH fails)
From console:

```bash
sudo -i
ls -l /etc/netplan
cat /etc/netplan/*.yaml
netplan generate
netplan try
```

If needed, temporarily set a single-interface static config to regain access, then restore bonding.
