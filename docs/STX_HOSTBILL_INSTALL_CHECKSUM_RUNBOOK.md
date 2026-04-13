# HostBill Installer Integrity Runbook

## Context
Running `wget http://install.hostbillapp.com/install/install.sh` and piping directly to `bash` creates a supply-chain risk.

## Pre-Flight Gates
Before mutating the infrastructure via `hostbill-deploy.sh`, you must manually or programmatically verify the checksum.

1. **Download & Checksum**
   ```bash
   wget -q http://install.hostbillapp.com/install/install.sh -O install.sh
   sha256sum install.sh
   # Verify the checksum matches the known safe hash locally documented.
   ```

2. **Rollback Matrix**
   If the installer corrupts the environment, run:
   ```bash
   ansible-playbook -i inventory/hosts.yml playbooks/hostbill-rollback.yml
   ```
