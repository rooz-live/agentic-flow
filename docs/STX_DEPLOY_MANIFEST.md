# STX Deployment Manifest

## Overview

This manifest documents the planned infrastructure for the Stacks (STX) greenfield deployment. Preparation is complete with a consolidated deployment script ready (`scripts/deploy-consolidated.sh`). Pre-validation partial authorization is pending. **No VMs deployed yet.**

**Key References:**
- Deployment Script: [`scripts/deploy-consolidated.sh](scripts/deploy-consolidated.sh)
- Prep Config: [`prep.json`](prep.json)
- Logs: [`logs/deploy-prep.log`](logs/deploy-prep.log)

**Full Scope:** VMs, Loki (logging), Kubernetes (K8s), agentic-flow apps, networks, security groups (SG), SLA definitions.

**Deployment Phases:**
1. Infrastructure provisioning (VMs, nets, SG)
2. K8s cluster bootstrap
3. Loki/Prometheus/Grafana installation
4. Agentic-flow apps deployment
5. Validation and handover

## VM Inventory

| VM Name       | Private IP     | Public IP (planned) | Flavor       | Role/Service              | CPU | RAM (GB) | Disk (GB) | Status  |
|---------------|----------------|---------------------|--------------|---------------------------|-----|----------|------------|---------|
| stx-cp-01    | 10.0.1.10     | 203.0.113.10       | m5.2xlarge  | K8s Control Plane        | 8   | 32       | 100 SSD   | Planned |
| stx-cp-02    | 10.0.1.11     | 203.0.113.11       | m5.2xlarge  | K8s Control Plane (HA)   | 8   | 32       | 100 SSD   | Planned |
| stx-wn-01    | 10.0.1.20     | 203.0.113.20       | m5.4xlarge  | K8s Worker Node          | 16  | 64       | 200 SSD   | Planned |
| stx-wn-02    | 10.0.1.21     | 203.0.113.21       | m5.4xlarge  | K8s Worker Node          | 16  | 64       | 200 SSD   | Planned |
| stx-loki-01  | 10.0.2.10     | 203.0.113.30       | m5.xlarge   | Loki Logging Server      | 4   | 16       | 500 SSD   | Planned |
| stx-app-01   | 10.0.2.20     | -                  | m5.large    | Agentic-Flow Apps        | 2   | 8        | 50 SSD    | Planned |

## Networks

| Network Name   | CIDR          | Gateway IP   | Purpose                          | VPC Association |
|----------------|---------------|--------------|----------------------------------|-----------------|
| stx-private-a | 10.0.1.0/24  | 10.0.1.1    | K8s Cluster Internal (Pods/Svcs)| vpc-stx-main   |
| stx-private-b | 10.0.2.0/24  | 10.0.2.1    | App/Logging Internal            | vpc-stx-main   |
| stx-public    | 203.0.113.0/26 | 203.0.113.1 | External Access (ALB/ bastion)  | vpc-stx-public |

## Security Groups

| SG Name       | Description                  | Inbound Rules (Port/Protocol/Source)                          | Outbound Rules                  |
|---------------|------------------------------|---------------------------------------------------------------|---------------------------------|
| stx-k8s-cp   | K8s Control Plane           | TCP 6443 (0.0.0.0/0), TCP 2379-2380 (10.0.1.0/24), TCP 10250-10252 (10.0.1.0/24) | All Traffic                    |
| stx-k8s-wn   | K8s Worker Nodes            | TCP 10250 (10.0.1.0/24), All (10.0.1.0/24 K8s Calico)        | All Traffic                    |
| stx-loki     | Loki Logging                | TCP 3100 (10.0.0.0/16), UDP 24224 (10.0.0.0/16)              | All Traffic                    |
| stx-apps     | Agentic-Flow Apps           | TCP 8080 (10.0.0.0/16), TCP 3000 (ALB only)                  | All Traffic                    |
| stx-bastion  | SSH Bastion                 | TCP 22 (trusted IPs only)                                    | All Traffic                    |

## Services and Ports Mapping

| Service/Component     | Port/TargetPort | Protocol | Exposure Method | Health Check Path |
|-----------------------|-----------------|----------|-----------------|-------------------|
| Kubernetes API       | 6443            | TCP     | Load Balancer  | /healthz         |
| Loki Gateway         | 3100            | TCP     | Internal       | /ready           |
| Prometheus           | 9090            | TCP     | Internal       | /-/ready         |
| Grafana              | 3000            | TCP     | Load Balancer  | /api/health      |
| Agentic-Flow API     | 8080            | TCP     | NodePort/Ingress | /health          |
| K8s Dashboard        | 443             | TCP     | Ingress        | -                |

## SLA Definitions

| Metric             | Target     | Measurement Tool |
|--------------------|------------|------------------|
| Availability      | 99.95%    | Prometheus Uptime |
| Latency (P99)     | <500ms | Loki Traces     |
| Throughput        | 1000 req/s| Prometheus      |

**Next Steps:** Execute `scripts/deploy-consolidated.sh --dry-run` post-auth.