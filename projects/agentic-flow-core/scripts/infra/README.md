# Infrastructure Scripts

Server management, monitoring, and deployment tools for the yo.tag.ooo / rooz-aws cPanel environment.

## Directory Layout

```
infra/
├── cpanel/                         # cPanel/WHM API and management
│   ├── ssl-manager.sh              # SSL cert lifecycle (list, trigger, install, CSR)
│   ├── ssl-monitor.sh              # Continuous SSL expiry monitoring daemon
│   ├── dns-zone-manager.sh         # DNS record CRUD via UAPI
│   ├── whm-firewall-check.sh       # CSF via SSH; restart requires --confirm
│   ├── cpanel_ssh_client.py        # Paramiko/ssh helper (write blocklist)
│   ├── com.agentic-flow.ssl-monitor.plist.template  # launchd template (@@REPO_ROOT@@)
│   ├── install-ssl-monitor-launchd.sh  # Install/uninstall user LaunchAgent
│   └── cpanel-env-setup.sh             # --persist / --register-launchd / --all
├── hostbill/
│   └── hostbill_api_client.py      # stdlib HostBill API (dry-run default)
├── lib/
│   └── source-cpanel-env.sh        # Unified env loader (config + credentials/)
├── security/
│   └── scan-local.sh               # Local Semgrep driver
├── ansible/
│   ├── ansible.cfg                 # inventory=inventory/hosts.yml (paths relative to this dir)
│   ├── inventory/
│   │   ├── hosts.yml               # YAML inventory (local)
│   │   ├── localhost.yml           # legacy inline inventory
│   │   └── group_vars/all.yml      # lookup('env', ...) slots
│   └── playbooks/                  # site, openstack-status, cpanel-health-check, hostbill-sync
├── stx/                            # StarlingX / remote server operations
│   ├── domain-monitor.sh           # Domain health + response time SLA checks
│   ├── deploy.sh                   # Deploy agentic-flow-core to STX via SCP
│   └── ssh-check.sh               # Quick SSH connectivity + system info
├── nginx/                          # Nginx reverse proxy configs
│   ├── flask-proxy.conf            # Canonical analytics.interface.tag.ooo proxy
│   └── deploy-proxy.sh             # Push config → server, validate, reload
├── connectivity/
│   └── test-all.sh                 # Test SSH to all deployment targets
├── run-health.sh                   # Passive checks (SSL, connectivity, Ansible)
├── smoke.sh                        # CI-friendly passive smoke (optional RUN_NETWORK_SMOKE=1)
└── deploy-yo-life.sh              # Multi-strategy deployment (Caddy/Nginx/K8s)
```

## Setup

1. Copy the credentials template:
   ```
   cp config/.env.cpanel.template config/.env.cpanel
   ```
   (Optional) use `credentials/.env.cpanel` instead — both paths are sourced. Set `CREDENTIALS_ENV_FILE` to load an extra file first.
2. Fill in API tokens (cPanel → Security → Manage API Tokens) and optional HostBill / GitLab / OpenStack / Passbolt / STX fields.
3. `scripts/infra/lib/source-cpanel-env.sh` loads env in this order: `CREDENTIALS_ENV_FILE` → `config/.env.cpanel` → `credentials/.env.cpanel`.

**Python helpers (optional):** `pip install -r requirements-infra.txt` for Paramiko/Fabric used by `cpanel_ssh_client.py`.

## Quick Reference

```bash
# SSL management
scripts/infra/cpanel/ssl-manager.sh check all          # Check coverage
scripts/infra/cpanel/ssl-manager.sh trigger bhopti.com  # Trigger AutoSSL
scripts/infra/cpanel/ssl-monitor.sh once                # One-shot check

# DNS management
scripts/infra/cpanel/dns-zone-manager.sh list bhopti.com
scripts/infra/cpanel/dns-zone-manager.sh add bhopti.com A api 1.2.3.4
scripts/infra/cpanel/dns-zone-manager.sh lookup api.bhopti.com

# Firewall
scripts/infra/cpanel/whm-firewall-check.sh full              # Status + ports + services
scripts/infra/cpanel/whm-firewall-check.sh restart --confirm # Restart CSF (audit log: .goalie/whm-audit.jsonl)
scripts/infra/cpanel/whm-firewall-check.sh whm-api-version   # Read-only WHM JSON-API (needs WHM_TOKEN)

# Monitoring
scripts/infra/stx/domain-monitor.sh                     # All domains health
scripts/infra/stx/domain-monitor.sh continuous 60        # Watch mode

# Connectivity
scripts/infra/connectivity/test-all.sh                   # SSH to STX + cPanel + GitLab
scripts/infra/stx/ssh-check.sh                          # Quick SSH status
scripts/infra/stx/ssh-check.sh --json                   # Machine-readable

# Nginx proxy
scripts/infra/nginx/deploy-proxy.sh                     # Push + validate + reload

# Deployment
scripts/infra/stx/deploy.sh                             # Deploy to StarlingX
scripts/infra/deploy-yo-life.sh                         # Full deployment wizard

# Passive health + Ansible preflight
scripts/infra/run-health.sh                             # SSL once + connectivity + ansible playbooks
scripts/infra/run-health.sh --json                      # Summary {"failures":N}

# Passive smoke (no cPanel/STX network unless RUN_NETWORK_SMOKE=1)
scripts/infra/smoke.sh
RUN_NETWORK_SMOKE=1 scripts/infra/smoke.sh

# API slot summary (no secret values)
python3 scripts/infra/security/api-cost-analyzer.py

# Bootstrap credentials + SSL LaunchAgent (macOS)
scripts/infra/cpanel/cpanel-env-setup.sh --all

# Ansible (from repo: set ANSIBLE_CONFIG or cd into dir)
export ANSIBLE_CONFIG="$PWD/scripts/infra/ansible/ansible.cfg"
( cd scripts/infra/ansible && ansible-playbook playbooks/site.yml )
( cd scripts/infra/ansible && ansible-playbook playbooks/cpanel-health-check.yml )
( cd scripts/infra/ansible && ansible-playbook playbooks/hostbill-sync.yml )

# Semgrep (local); optional registry packs (network):
# SEMGREP_EXTRA_PACKS="p/security-audit p/secrets" scripts/infra/security/scan-local.sh
scripts/infra/security/scan-local.sh
```

## Enable Periodic SSL Monitoring (macOS)

Portable install (detects repo root from script location, or set `AGENTIC_FLOW_CORE_ROOT`):

```bash
./scripts/infra/cpanel/install-ssl-monitor-launchd.sh install
# Optional: AGENTIC_FLOW_CORE_ROOT=/path/to/agentic-flow-core ./scripts/infra/cpanel/install-ssl-monitor-launchd.sh install
```

Uninstall: `./scripts/infra/cpanel/install-ssl-monitor-launchd.sh uninstall`

Check logs: `cat /tmp/ssl-monitor.log`

## Domains Managed

- **yo.tag.ooo** — Primary cPanel server hostname
- **bhopti.com** — Personal domain (cPanel user: bhopti)
- **rooz.live** — Subscription platform (circles, events)
- **yo.life** — Primary yo.life domains
- **yoservice.com** — Service/API domain
- **analytics.interface.tag.ooo** — Flask trading dashboard (Nginx → Flask:5000)
