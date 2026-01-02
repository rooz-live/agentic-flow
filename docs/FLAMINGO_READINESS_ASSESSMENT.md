# OpenStack Flamingo & StarlingX 12 Readiness Assessment

## 1. StarlingX 12 Migration Readiness
- **Target OS**: StarlingX 12 moves to a Debian-based platform (Ubuntu 22.04 base).
- **Alignment**:
    - **Current Action**: Installing Ubuntu 22.04 LTS aligns perfectly with the target OS family.
    - **Kernel Compatibility**: Ubuntu 22.04 uses Linux 5.15/6.5. STX 12 uses PREEMPT_RT kernel.
    - **Migration Path**: Workloads running on Ubuntu 22.04 OpenStack will be more portable to STX 12 than from CentOS 7/8.
- **Action Items**:
    - Ensure `containerd` config matches STX defaults (`SystemdCgroup = true`).
    - Use LVM layouts compatible with STX (ceph-osd preparation).

## 2. OpenStack 2025.2 (Flamingo) Requirements
- **Release Status**: 2025.2 is future-facing. Current stable is 2024.1 (Caracal) or 2024.2 (Dalmatian). "Flamingo" implies rolling/master or next-gen.
- **Python**: Requires Python 3.10+. Python 3.11 (installed via bootstrap) provides forward compatibility.
- **Ansible**: Kolla-Ansible requires Ansible-core >= 2.15.
- **Action Items**:
    - Bootstrap installs `ansible>=8` and `python3.11`.
    - Virtualenv usage recommended to isolated OpenStack python libs.

## 3. MCP & Toolchain Compatibility
- **Claude-Flow / Ruv-Swarm**: Node.js/Python based.
- **Compatibility**: Ubuntu 22.04 libraries (`glibc`, `libstdc++`) are standard.
- **Action Items**:
    - Verify Node.js version (recommend v20 LTS).
    - Re-install MCP servers post-bootstrap.

## 4. Container Runtime Optimization
- **Version**: Containerd 1.7.x / 2.0.
- **Config Strategy**:
    - `SystemdCgroup = true`: Mandatory for K8s 1.28+ and OpenStack Helm.
    - `registry.mirrors`: Configure internal proxy caches to speed up big image pulls.

## 5. Monitoring Restoration
- **Stack**: Prometheus/Grafana/Loki.
- **Strategy**:
    - Deploy via Helm charts on the new K8s cluster immediately after bootstrap.
    - Restore PVC data if it was backed up externally (Note: Re-provisioning wipes local disks, so old PVC data is lost unless offloaded).
