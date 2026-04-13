# StarlingX OpenStack Upgrade Runbook

## Context
Upgrading `stx-openstack` mutates critical K8s infrastructure and OpenStack telemetry. 
To ensure deterministic safety, this runbook dictates a strict 4-part pre-flight gate.

## Pre-Flight Gates
1. **Passbolt Extraction Verified:** `scripts/security/passbolt-export-workflow.ts` successfully retrieves the rotation key.
2. **Telemetry Validation:** `api-cost-analyzer.py` confirms recent OpenStack Neutron telemetry is successfully bridged.
3. **Passive Ansible Health Check:** `scripts/infra/run-health.sh stx` reports 100% green against local/remote configuration states.
4. **Operator Sign-off (Mutating Check):** Executing the bash command requires `--confirm` flag context to explicitly acknowledge mutation.

## Upgrade Execution (Single-Threaded)
This must be the ONLY script executed in the current Git integration cycle. No parallel graph writes or dashboard modifications should happen in the same PR.

```bash
# 1. Source credentials safely
source credentials/.env.cpanel

# 2. Run passive checks
./scripts/infra/run-health.sh stx

# 3. Apply the upgrade
./scripts/infra/stx/stx-upgrade.sh latest
```
