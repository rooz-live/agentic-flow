# ADR 023: DR-HA Billing Shutdown Protocol & Sovereign Hivelocity Consolidation

## Status
**Adopted** - Active Protocol (Agentic Swarm)

## Context
The legacy architecture relied on billable AWS and remote cPanel nodes, leading to severe OPEX gravity breaches due to the "Egress Trap" (e.g., pulling massive 18GB error logs over metered bandwidth). The Swarm's immune system detected these anomalies via `agentic_qe_inference.py` and triggered physical healing Beads. However, running legacy infrastructure creates unacceptable ROAM risks regarding financial sovereignty and disk space economics.

## Decision
We are executing a **Symmetric Consolidation** onto the existing unmetered Hivelocity StarlingX Bare-Metal infrastructure (`23.92.79.2`), completely terminating external AWS billing dependencies.

1. **Agentic Exclusion Matrix:** The Swarm now explicitly bans transient logs and deep legacy cache directories (`logs/`, `*.log`, `node_modules/`) from rsync physical extraction to enforce strict disk space economics, while protecting `vendor/` and `*.tar.gz` to ensure "Green Field" legacy PHP revival capability.
2. **GitLab Deployment (Immediate):** GitLab will migrate from AWS to a local StarlingX Docker container via `infrastructure/hivelocity/gitlab/docker-compose.yml`. AWS billing is to be terminated the moment `gitlab-backup restore` confirms a GREEN state.
3. **cPanel Deployment (24-48h):** cPanel is migrating from remote hosts to a sovereign AlmaLinux KVM provisioned via `infrastructure/hivelocity/cpanel_kvm/provision_alma_kvm.sh`.
4. **Control Plane:** The Swarm will utilize Headscale/WireGuard to guarantee physical backdoor access, bypassing UFW firewall deadlocks natively without relying on AWS SSM.
5. **Execution Boundary:** Future extraction Beads will deprecate `.sh` scripts in favor of `beads_rust` Native Python/Rust compiled logic for concurrent, AST-verified memory-safe extraction.

## Consequences
* **Positive:** 80% reduction in monthly OPEX. Elimination of Egress bandwidth taxes. The Swarm achieves 100% Sovereign Offline Capability.
* **Negative:** Loss of AWS SSM. Demands strict adherence to Headscale/WireGuard deployment for remote management.
