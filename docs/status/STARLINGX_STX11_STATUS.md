# StarlingX STX 11 Readiness Status (INFRA-1)

## Snapshot

- **Target:** `stx-aio-0` (`23.92.79.2:2222`, `root`)
- **Probe mode:** read-only SSH commands
- **Evidence:** `.goalie/stx_health_probe_*.log` and `.goalie/stx_health_probe_latest.log`

## Observed State (from probe)

### Access

- **SSH:** success
- **Remote hostname:** `stx-aio-0.corp.interface.tag.ooo`

### OS

- **Distro:** AlmaLinux 8.10
- **Kernel:** `4.18.0-553.58.1.el8_10.x86_64`

### Container Runtime

- **containerd:** `1.6.32` (running)
- **docker:** `26.1.3` (running)
- **crictl:** `v1.28.0`

### Kubernetes / kubectl

- **kubectl client:** `v1.28.15` (meets the `1.28+` requirement)
- **kubelet service:** active (but emitting networking errors)
- **kubeconfig:** `/etc/kubernetes/admin.conf` present
- **cluster access:** `KUBECONFIG=/etc/kubernetes/admin.conf kubectl get nodes -o wide` succeeds
- **node status:** `Ready` / role `control-plane`
- **cni status:** flannel is running and `/run/flannel/subnet.env` is present; CoreDNS pods and a sample workload pod are running.

## Gap Analysis vs INFRA-1 Success Criteria

### 1) STX 11 ready Kubernetes client

**Requirement:** kubectl client `1.28+` available where we run validations.

**Current:** remote kubectl client is `v1.28.15`.

**Action:** None (remote kubectl client meets the requirement).

### 2) Control plane readiness / kubeconfig

**Requirement:** cluster operational (able to run `kubectl get nodes -o wide`).

**Current:** kubeconfig exists and `kubectl get nodes` works; basic networking is functioning (flannel + CoreDNS + sample workload running).

**Action:**

- Confirm continued stability (`kube-system`, `kube-flannel`) before any disruptive runtime migration.

### 3) Container runtime migration: Docker → containerd 1.7+

**Requirement:** container runtime migration verified, containerd `1.7+`.

**Current:** containerd is present but is `1.6.32` and docker is still active.

**Action:**

- Plan upgrade to containerd `1.7+` and confirm docker services are disabled where required
- Confirm runtime used by Kubernetes (after kubeconfig is working):
  - inspect kubelet config / CRI socket

### 4) `crictl` runtime tooling

**Requirement:** runtime checks available via `crictl`.

**Current:** `crictl` is present (`cri-tools` installed).

**Action:** None.

## Immediate Next Commands (read-only)

Run from repo (reproducible probe):

```bash
./scripts/af stx health
```

Notes:

- In `AF_ENV=prod`, `af stx health` is gated by `AF_CONFIRM_REMOTE=1` (explicit remote confirmation). Break-glass is reserved for disruptive operations.
- The probe collects additional remediation facts (read-only):
  - package manager and repos (`dnf repolist`)
  - package presence (`rpm -q` for `cri-tools`, `kubelet`, `kubeadm`, `kubectl`, `containerd.io`, `docker-ce`)
  - control plane process scan (`kube-apiserver`, `kube-controller`, `kube-scheduler`, `etcd`)

If kubectl exists on the controller and kubeconfig exists:

```bash
KUBECONFIG=/etc/kubernetes/admin.conf kubectl get nodes -o wide
```

## Audit / Evidence

- Latest probe output: `.goalie/stx_health_probe_latest.log`
- Timestamped probe transcript: `.goalie/stx_health_probe_*.log`
- CLI audit trail (after scaffold is used): `.goalie/stx_audit.jsonl`

## Status

- **SSH access:** ✅
- **K8s readiness:** ✅ (cluster reachable; flannel subnet env present; CoreDNS and sample workload running)
- **Runtime migration:** ⚠️ (containerd present but <1.7, docker still active)
- **Tooling:** ✅ (`crictl` present)
