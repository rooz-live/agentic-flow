# Rollback and Recovery Procedures (Ubuntu Reprovision + OpenStack)

## 1. Golden rule
If you lose network access mid-flight, recovery depends on **console/KVM/IPMI access**.

## 2. Backup artifact
- Backup: `~/stx-backup-20251231/pre-reprovision-backup.tar.gz`
- SHA256: stored alongside `.sha256`

## 3. Network recovery procedure (console)
### 3.1 Validate link state
```bash
ip link
ip -br link
```

### 3.2 Validate bond0 config
```bash
ip -d link show bond0 || true
cat /proc/net/bonding/bond0 || true
```

### 3.3 Validate netplan
```bash
sudo -i
ls -l /etc/netplan
cat /etc/netplan/*.yaml
netplan generate
netplan try
```

If bond is broken, temporarily configure a single NIC (eno1 or eno2) with static IP to regain SSH, then restore bonding.

## 4. SSH recovery procedure
If SSH on 2222 is not reachable:
- From console:
  - verify `ss -lntp | grep ssh`
  - check `/etc/ssh/sshd_config` has `Port 2222`
  - restart ssh: `systemctl restart ssh`

## 5. Reinstall rollback
If Ubuntu install fails or you cannot recover remote access:
- Re-run provider reinstall (Ubuntu) with corrected autoinstall.
- If you must revert to the previous platform, reinstall the previous OS image, then restore from backup.

## 6. OpenStack rollback
If OpenStack deployment fails:
- Stop deployment
- Purge Kolla containers/services per Kolla rollback docs
- Restore only the base OS + monitoring first, then retry OpenStack.
