# OpenStack 2025/2026 Readiness Assessment (Ubuntu 22.04 + Kolla-Ansible)

## Scope
This document assesses readiness to deploy a **real upstream OpenStack** release from the 2025/2026 series using **Kolla-Ansible** on Ubuntu 22.04.

Note: OpenStack release naming is authoritative at https://releases.openstack.org/.

## 1. Host baseline requirements
- **OS**: Ubuntu 22.04 LTS (fresh reprovision)
- **CPU/RAM/Disk**: validate against your target control+compute footprint
- **Networking**:
  - LACP bond (`bond0`) stable
  - predictable interface naming pinned by MAC
  - time sync (chrony)

## 2. Container runtime requirements
- **containerd**:
  - target: `2.x` if available via supported packaging
  - minimum acceptable: `>= 1.7` (if release/tooling supports)
- **Cgroups**:
  - `SystemdCgroup = true` in `/etc/containerd/config.toml`

## 3. Python requirements
- Ubuntu 22.04 defaults to Python 3.10.
- Install **Python 3.11** for OpenStack tooling environments and keep system Python intact.
- Use a dedicated virtualenv for Kolla-Ansible.

## 4. Kolla-Ansible readiness checklist
### Packages
- `python3-pip`, `python3-venv`, `libffi-dev`, `libssl-dev`, `gcc`, `make`
- `ansible-core` version aligned to Kolla-Ansible branch

### Preflight gating (must pass)
- `containerd --version` meets requirement
- `crictl info` works (if installed)
- `kolla-ansible --version` resolves
- `ansible --version` matches required range

## 5. No-mock validation gates (post-deploy)
After deploying OpenStack:
- **Keystone**:
  - `openstack token issue`
  - `openstack endpoint list`
- **Nova/Neutron**:
  - boot a tiny test instance
  - wait for `ACTIVE`
  - validate console log reachable
  - delete instance
- **Cinder** (if enabled):
  - create 1Gi volume
  - attach to instance
  - detach + delete

## 6. Observability restoration
Reintegrate (or redeploy) monitoring:
- Prometheus scrape targets for OpenStack APIs (Keystone/Nova/Neutron)
- Loki log ingestion for container logs
- Alert rules for API availability + latency

## 7. STX12 migration note
Reprovisioning to Ubuntu replaces StarlingX. If you later want StarlingX 12, treat it as a separate platform installation/rollback track.
