# STX12 Migration Guide: STX11 (AlmaLinux 8) → STX12 (Ubuntu 22.04) - Q4 Execution

## Executive Summary

This guide outlines the migration from STX11 (running on AlmaLinux 8) to STX12 (Ubuntu 22.04 LTS) in Q4. Focus: zero-downtime where possible, compatibility validation, baseline metrics capture.

**Timeline (Q4):**
- **Week 1-2:** Planning & Baselines
- **Week 3:** Dry-run & Compatibility Tests
- **Week 4:** Cutover & Validation
- **Week 5+:** Optimization & Hypercare

**Key References:**
- Baseline Script: [`scripts/baseline-metrics.sh`](scripts/baseline-metrics.sh)
- Migration Script: [`scripts/migrate-stx12.sh`](scripts/migrate-stx12.sh)
- Prep Config: [`prep.json`](prep.json)
- Logs: [`logs/migration-*.log`](logs/)

**Risks:** OS upgrade compatibility, K8s version skew, app binary deps.

## 1. Baseline Metrics (Current STX11 / AlmaLinux 8)

Capture pre-migration state using `./scripts/baseline-metrics.sh --export json > baselines-stx11.json`

| Category       | Metric                  | STX11 Value (Observed) | STX12 Target | Tool/Command |
|----------------|-------------------------|------------------------|--------------|--------------|
| **Performance**| CPU Avg/Max            | 45% / 78%             | <60%     | Prometheus  |
|                | Memory Avg/Max         | 12GB / 28GB           | <20GB    | Node Exporter |
|                | Disk I/O (P99)         | 5ms                   | <10ms    | Loki Traces |
| **Availability**| Uptime (30d)          | 99.72%                | 99.95%      | Uptime calc |
|                | Pod Restart Rate       | 0.8/hr                | <0.1/hr  | Kube-state  |
| **App-Specific**| Agentic-Flow Latency P95| 180ms                 | <120ms   | App metrics |
|                | Req/s Throughput       | 2500                  | >3500    | Ingress NGINX |
| **Cluster**    | Nodes Healthy          | 5/5                   | 6/6 (scale) | `kubectl get nodes` |

**Validation:** Compare post-migration `diff baselines-stx11.json baselines-stx12.json | jq`.

## 2. Compatibility Matrix

| Component          | STX11 (Alma8) Version | STX12 (Ubuntu22) Version | Compatibility | Migration Action                  | Risks/Notes |
|--------------------|-----------------------|--------------------------|---------------|-----------------------------------|-------------|
| **OS/Base**       | AlmaLinux 8.10       | Ubuntu 22.04 LTS        | Partial      | Rebuild VMs (preferred) or in-place | Package mgr diff (dnf→apt) |
| **Kubernetes**    | v1.25.10             | v1.28.5                 | Yes          | kubeadm upgrade plan/apply       | CRI-O→containerd |
| **Container Runtime** | CRI-O 1.25        | containerd 1.7+         | Yes          | Helm uninstall/reinstall         | Image pull policy |
| **CNI (Calico)**  | v3.25                | v3.27                   | Yes          | Calicoctl upgrade                | BGP peer downtime |
| **Loki Stack**    | 2.9                  | 3.1                     | Yes          | Helm upgrade                     | Schema migration |
| **Agentic-Flow**  | v2.1.3 (Alma RPM)    | v2.5.0 (Ubuntu deb)     | Yes (shim)   | Docker images, Helm values override | libc6 deps |
| **Monitoring**    | Prometheus 2.45      | 2.50                    | Yes          | Operator upgrade                 | Retention policy |
| **Storage**       | EBS gp3              | EBS gp3 (io2 opt)       | Yes          | Volume resize if needed          | CSI driver |

**Test Matrix:** Run `scripts/compat-test.sh --dry-run` pre-migration.

## 3. Detailed Upgrade Steps

### Pre-Migration (Week 1-2)
1. **Backup Everything:**
   ```
   scripts/backup-full.sh --target s3://stx-backups/q4-migration
   kubectl get all -A -o yaml > manifests-pre.yaml
   ```
2. **Baseline Capture:** `./scripts/baseline-metrics.sh`
3. **Dry-Run:** `./scripts/migrate-stx12.sh --dry-run --simulate-os-upgrade`
4. **Staging Replica:** Spin up parallel Ubuntu22 cluster, mirror traffic 10%.

### Migration Execution (Week 4 Cutover - Blue/Green)
1. **Phase 1: OS/Base Upgrade (Node-by-Node Rolling)**
   - Drain node: `kubectl drain <node> --ignore-daemonsets`
   - Live migrate VMs to Ubuntu22 template (via cloud console/script)
   - Update apt sources, `do-release-upgrade -d` (test in staging first)
   - Re-join cluster: `kubeadm join --token ...`
   - Uncordon: `kubectl uncordon <node>`

2. **Phase 2: K8s & Components Upgrade**
   ```
   kubeadm upgrade plan v1.28.5
   kubeadm upgrade apply v1.28.5
   kubectl apply -k overlays/stx12/
   helm upgrade loki-stack grafana/loki --values values-stx12.yaml
   ```

3. **Phase 3: App Deployment**
   - `helm upgrade agentic-flow ./charts/agentic-flow --set image.tag=2.5.0`
   - Smoke tests: `scripts/validate-apps.sh`
   - Traffic shift: Update ALB target group to new pool

4. **Phase 4: Validation**
   - Metrics diff: `scripts/compare-baselines.py`
   - Load test: `scripts/load-test-q4.py --duration 2h`
   - Cert rotation if needed

### Post-Migration (Week 5 Hypercare)
1. Monitor for 72h: Custom Grafana dashboard `migration-health`
2. Decommission old Alma8 artifacts
3. Update DNS/Certs to STX12
4. Lessons Learned: `echo "Migration notes" >> logs/migration-lessons.log`

## 4. Rollback Plan
- **Fast Rollback (<1h):** Traffic shift back to STX11 ALB
- **Full Rollback:** Restore from S3 backups, `terraform apply -target=module.stx11`
- **Detection:** Alert on regression metrics >10%

## 5. Q4 Success Criteria
- All baselines met or improved
- Zero P0 incidents during cutover
- 100% compatibility test pass
- Migration script idempotent for re-runs