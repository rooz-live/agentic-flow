# Infrastructure Scripts

Server management, monitoring, and deployment tools for the yo.tag.ooo / rooz-aws cPanel environment.

## Directory Layout

```
infra/
├── cpanel/                         # cPanel/WHM API and management
│   ├── ssl-manager.sh              # SSL cert lifecycle (list, trigger, install, CSR)
│   ├── ssl-monitor.sh              # Continuous SSL expiry monitoring daemon
│   ├── dns-zone-manager.sh         # DNS record CRUD via UAPI
│   ├── whm-firewall-check.sh       # CSF firewall status, port audit, restart
│   └── com.agentic-flow.ssl-monitor.plist  # macOS launchd for periodic checks
├── stx/                            # StarlingX / remote server operations
│   ├── domain-monitor.sh           # Domain health + response time SLA checks
│   ├── deploy.sh                   # Deploy agentic-flow-core to STX via SCP
│   └── ssh-check.sh               # Quick SSH connectivity + system info
├── nginx/                          # Nginx reverse proxy configs
│   ├── flask-proxy.conf            # Canonical analytics.interface.tag.ooo proxy
│   └── deploy-proxy.sh             # Push config → server, validate, reload
├── connectivity/
│   └── test-all.sh                 # Test SSH to all deployment targets
└── deploy-yo-life.sh              # Multi-strategy deployment (Caddy/Nginx/K8s)
```

## Setup

1. Copy the credentials template:
   ```
   cp config/.env.cpanel.template config/.env.cpanel
   ```
2. Fill in API tokens (cPanel → Security → Manage API Tokens)
3. Scripts auto-source `config/.env.cpanel` when it exists

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
scripts/infra/cpanel/whm-firewall-check.sh full         # Status + ports + services
scripts/infra/cpanel/whm-firewall-check.sh restart       # Restart CSF

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
```

## Enable Periodic SSL Monitoring (macOS)

```bash
cp scripts/infra/cpanel/com.agentic-flow.ssl-monitor.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.agentic-flow.ssl-monitor.plist
```

Check logs: `cat /tmp/ssl-monitor.log`

## Domains Managed

- **yo.tag.ooo** — Primary cPanel server hostname
- **bhopti.com** — Personal domain (cPanel user: bhopti)
- **rooz.live** — Subscription platform (circles, events)
- **yo.life** — Primary yo.life domains
- **yoservice.com** — Service/API domain
- **analytics.interface.tag.ooo** — Flask trading dashboard (Nginx → Flask:5000)
