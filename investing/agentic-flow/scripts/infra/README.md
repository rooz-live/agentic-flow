# Infrastructure Automation Scripts

Drift detection and configuration audit tooling for the cPanel/WHM/Nginx stack.

## Quick Start

```bash
# 1. Set up credentials
cp scripts/infra/credentials/.env.cpanel.template scripts/infra/credentials/.env.cpanel
# Edit .env.cpanel with your values

# 2. Make scripts executable
chmod +x scripts/infra/**/*.sh scripts/infra/*.sh

# 3. Run full drift check
./scripts/infra/drift-check.sh
```

## Scripts

### Passive (read-only audit)

| Script | What it checks |
|--------|---------------|
| `cpanel/ssl-monitor.sh` | SSL cert expiry for all domains. Runs locally via TLS handshake. |
| `cpanel/dns-zone-audit.sh` | DNSSEC chain of trust, NSEC3 params, orphaned DS records. |
| `cpanel/firewall-audit.sh` | CSF TCP_IN/OUT vs baseline, TESTING mode, blocked IP count. |
| `nginx/config-audit.sh` | Config syntax, upstream resolution, resolver directives, PHP-FPM extensions. |
| `drift-check.sh` | Master orchestrator — runs all audits above. |

### Active (with `--fix`)

| Script | What it changes |
|--------|----------------|
| `cpanel/dns-zone-audit.sh --fix` | Disables DNSSEC on child zones with broken chains; sets NSEC3 opt-out. |
| `cpanel/firewall-audit.sh --snapshot` | Saves current firewall config as a baseline snapshot. |

## What Each Script Prevents

- **`dns-zone-audit.sh`** → Prevents the DNSSEC misconfiguration that blocked Passbolt SSL renewal for 2 years (child zone DNSKEY without parent DS, NSEC3 opt-out=0)
- **`ssl-monitor.sh`** → Catches expiring certs before they expire. Suggests AutoSSL commands.
- **`firewall-audit.sh`** → Detects port drift vs expected baseline. Supports snapshot/diff for change tracking.
- **`nginx/config-audit.sh`** → Catches the exact outage pattern: proxy_pass with hostname but no resolver directive. Also validates PHP extensions.

## Credential Configuration

All scripts source `credentials/.env.cpanel`. Key settings:

- `SSH_ALIAS` — SSH config alias for the server (default: `rooz-aws`)
- `MONITOR_DOMAINS` — Space-separated list of domains to check SSL
- `EXPECTED_TCP_IN` — Comma-separated baseline of allowed inbound ports
- `DNSSEC_ZONES` — Zones that should have valid DNSSEC
- `SSL_WARN_DAYS` / `SSL_CRIT_DAYS` — Expiry warning thresholds

## Scheduling

Run `drift-check.sh` on a schedule for continuous monitoring:

```bash
# launchd (macOS) — every 4 hours
# See: com.agentic-flow.drift-check.plist

# cron (Linux)
0 */4 * * * /path/to/scripts/infra/drift-check.sh --log /var/log/drift-check.log
```
