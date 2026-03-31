# STX Operational Runbook

## Overview

Comprehensive guide for monitoring, troubleshooting, SLA adherence, MTTR targets, and phase-by-phase rollback for the Stacks (STX) greenfield deployment.

**Key References:**
- Deployment Script: [`scripts/deploy-consolidated.sh](scripts/deploy-consolidated.sh)
- Prep Config: [`prep.json`](prep.json)
- Logs Directory: [`logs/`](logs/)
- Monitoring Endpoints: Defined in [`prep.json`](prep.json) under `monitoring.endpoints`

**Assumptions:** Deployment via consolidated script. K8s + Loki + Prometheus + Grafana + agentic-flow apps.

## 1. Monitoring

### Core Tools & Dashboards
| Tool          | Endpoint/Access                  | Purpose                     | Alerts Config |
|---------------|----------------------------------|-----------------------------|---------------|
| Prometheus   | http://stx-prom:9090            | Metrics collection         | Alertmanager |
| Grafana      | https://grafana.stx.example.com:3000 | Visualization             | DS Prometheus/Loki |
| Loki         | http://loki.stx.example.com:3100 | Centralized logging        | Promtail agents |
| Node Exporter| :9100 (per node)                | Host metrics               | scrape_configs |

### Key Queries & Commands
- Cluster Health: `kubectl get nodes`, `kubectl top nodes`
- Pods: `kubectl get pods -A --sort-by=.status.startTime`
- Logs: `kubectl logs <pod> -c <container> | grep ERROR`
- Grafana Queries: `up{job=\"kube-state-metrics\"}`, `container_cpu_usage_seconds_total`

**Alerting:** Slack/Email on P0 (critical), PagerDuty integration pending.

## 2. Troubleshooting

### Common Issues & Resolutions
| Issue Category | Symptoms                          | Diagnostic Commands                          | Resolution Steps |
|----------------|-----------------------------------|----------------------------------------------|------------------|
| Pod CrashLoopBackOff | `kubectl get pods` shows CrashLoop | `kubectl logs <pod> -p` (prev container)    | Check OOMKilled, increase limits |
| Node NotReady | `kubectl get nodes` STATUS=NotReady | `journalctl -u kubelet`, `docker ps`        | Restart kubelet, check etcd |
| Network Policy Block | Pods can't communicate           | `kubectl exec -it pod -- curl other-pod`    | Review Calico/NetworkPolicy |
| Loki Ingestion Fail | No recent logs                   | `kubectl logs loki -c ingester`             | Check retention, disk space |
| App Latency Spike | High P99 in Grafana              | `kubectl top pods`, traces in Loki          | Scale HPA, profile app |

### Systematic Debug Flow
1. **Triage:** `kubectl get events --sort-by=.lastTimestamp`
2. **Logs:** Tail via Loki/Grafana Explore
3. **Metrics:** Prometheus Ad-hoc queries
4. **Exec:** `kubectl debug node/<node> -it --image=ubuntu`
5. **Escalate:** Run `scripts/troubleshoot.sh <issue>`

## 3. SLA Definitions

| Service Tier | Availability | Latency (P95/P99) | Throughput | Uptime Measurement |
|--------------|--------------|-------------------|------------|--------------------|
| Critical (K8s API, Core Apps) | 99.95%     | 200ms / 500ms    | 5000 req/s | Prometheus uptime |
| Standard (Logging/Monitoring) | 99.9%     | 1s / 5s          | 1000 req/s | Synthetics        |
| Dev/Testing  | 99.0%      | 5s / 30s         | N/A        | Manual            |

**SLA Reporting:** Weekly via Grafana snapshots, `scripts/sla-report.py`.

## 4. MTTR Targets

| Severity | Description              | Target MTTR | Escalation |
|----------|--------------------------|-------------|------------|
| P0 (Critical) | Cluster down, 0% avail | 15 minutes | PagerDuty |
| P1 (High)     | >50% degraded          | 30 minutes | On-call   |
| P2 (Medium)   | Isolated component     | 2 hours    | Ticket    |
| P3 (Low)      | Non-urgent             | 1 business day | Ticket  |

**MTTR Tracking:** Loki labels `severity`, Prometheus histogram.

## 5. Rollback Procedures (Phase-by-Phase)

**Full Rollback Command:** `./scripts/deploy-consolidated.sh --rollback --phase=ALL`

### Phase 1: Infrastructure Provisioning
- **Trigger:** Provision fail
- **Steps:**
  1. `terraform destroy -auto-approve -var-file=prep.json`
  2. Verify VPC/NACL/SG cleanup: `aws ec2 describe-vpcs`
  3. Check logs: `tail -f logs/deploy-prep.log | grep ERROR`

### Phase 2: K8s Cluster Bootstrap
- **Trigger:** kubeadm join/init fail
- **Steps:**
  1. On all nodes: `kubeadm reset --force`
  2. Cleanup CNI: `rm -rf /etc/cni/net.d`
  3. Re-init CP: `./scripts/deploy-consolidated.sh --phase=k8s-init`
  4. Validate: `kubectl get nodes`

### Phase 3: Observability Stack (Loki/Prom/Grafana)
- **Trigger:** Helm release fail
- **Steps:**
  1. `helm uninstall loki-stack -n monitoring`
  2. PVC cleanup if needed: `kubectl delete pvc -l app=loki`
  3. Re-deploy: `./scripts/deploy-consolidated.sh --phase=observability`

### Phase 4: Agentic-Flow Apps
- **Trigger:** Deployment fail/scale issues
- **Steps:**
  1. `kubectl rollout undo deployment/agentic-flow -n apps`
  2. Scale to 0: `kubectl scale deploy/agentic-flow --replicas=0`
  3. Re-deploy: `./scripts/deploy-consolidated.sh --phase=apps`

### Phase 5: Production Cutover
- **Trigger:** Smoke tests fail post-deploy
- **Steps:**
  1. DNS revert to staging
  2. Blue-green swap back
  3. Full rollback to Phase 1 if needed

**Post-Rollback:** Run validation suite `scripts/validate-post-rollback.sh`, update incident log.