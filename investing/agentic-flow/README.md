# Agentic Flow — Infrastructure & Operations

## Current State (v1.0.0-infra)

**Tag:** `v1.0.0-infra` on `main`
**Last audit:** 2026-04-10 — ALL CLEAR ✓

### Managed Infrastructure

| Server | Host | Services |
|--------|------|----------|
| cPanel/WHM | yo.tag.ooo | Apache, Nginx, PHP-FPM, CSF, MariaDB, PowerDNS, Exim |
| Passbolt | passbolt.yocloud.com | Password manager (CakePHP 5.3.2, PHP 8.4) |
| StarlingX | stx-aio-0.corp.interface.tag.ooo:2222 | K8s, OpenStack CLI |

### SSL Certificate Status

| Domain | Issuer | Expires |
|--------|--------|---------|
| passbolt.yocloud.com | Let's Encrypt R13 | 2026-07-09 |
| rooz.live | Let's Encrypt R13 | 2026-07-09 |
| bhopti.com | Let's Encrypt R13 | 2026-07-05 |
| yo.tag.ooo | Let's Encrypt R12 | 2026-05-16 |

### DNS

- **Authoritative:** PowerDNS (41 zones)
- **DNSSEC:** Enabled on `yocloud.com`, `tag.ooo` (NSEC3 opt-out=1)
- **Child zones:** All unsigned (no broken chains)

## Project Structure

```
investing/agentic-flow/
├── .gitignore
├── .goalie/                      # Metrics, crontab, session logs (tracked)
├── docs/SETUP_GUIDE.yaml
├── infrastructure/
│   └── deployment_manifest.yaml  # STX greenfield deployment spec
├── scripts/infra/
│   ├── cpanel/
│   │   ├── dns-zone-audit.sh     # DNSSEC chain-of-trust validation
│   │   ├── ssl-monitor.sh        # Certificate expiry monitoring
│   │   └── firewall-audit.sh     # CSF port baseline comparison
│   ├── nginx/
│   │   └── config-audit.sh       # Upstream resolution, PHP-FPM checks
│   ├── credentials/
│   │   └── .env.cpanel.template  # Credential/threshold configuration
│   ├── drift-check.sh            # Master audit orchestrator
│   ├── disk-space-monitor.sh     # Tiered auto-cleanup (caches/snapshots)
│   ├── com.agentic-flow.drift-check.plist  # launchd 4-hour schedule
│   └── README.md                 # Script documentation
└── README.md                     # This file
```

## Drift Detection

Automated infrastructure audit suite runs every 4 hours via launchd.

### Audits

| Audit | Script | What it catches |
|-------|--------|----------------|
| SSL | `ssl-monitor.sh` | Expiring/expired certificates (warn at 30d, critical at 7d) |
| DNS/DNSSEC | `dns-zone-audit.sh` | Broken chain of trust, NSEC3 misconfiguration, orphaned DS records |
| Firewall | `firewall-audit.sh` | Port drift vs baseline, CSF testing mode, high deny counts |
| Nginx | `config-audit.sh` | Unresolvable upstreams, missing resolver directives, PHP extension gaps |
| Disk Space | `disk-space-monitor.sh` | Free space < 100 GB (warn), < 50 GB (critical). Auto-cleans caches. |

### Running manually

```bash
# Full audit
./scripts/infra/drift-check.sh

# Individual audits
./scripts/infra/cpanel/ssl-monitor.sh
./scripts/infra/cpanel/dns-zone-audit.sh
./scripts/infra/cpanel/firewall-audit.sh
./scripts/infra/nginx/config-audit.sh

# With auto-remediation (DNS only)
./scripts/infra/cpanel/dns-zone-audit.sh --fix

# Firewall snapshot for change tracking
./scripts/infra/cpanel/firewall-audit.sh --snapshot
```

### launchd management

```bash
# Status
launchctl list | grep drift-check

# Manual trigger
launchctl start com.agentic-flow.drift-check

# Logs
tail -f scripts/infra/logs/drift-check.log

# Disable
launchctl unload ~/Library/LaunchAgents/com.agentic-flow.drift-check.plist
```

## Setup

```bash
# 1. Configure credentials
cp scripts/infra/credentials/.env.cpanel.template scripts/infra/credentials/.env.cpanel
# Edit .env.cpanel — set SSH_ALIAS, MONITOR_DOMAINS, EXPECTED_TCP_IN

# 2. Verify SSH access
ssh -o ConnectTimeout=10 rooz-aws "hostname"

# 3. Run initial audit
./scripts/infra/drift-check.sh

# 4. Install launchd agent
ln -sf "$(pwd)/scripts/infra/com.agentic-flow.drift-check.plist" ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.agentic-flow.drift-check.plist
```

## Key Data (not in this repo)

| Path | Size | Contents |
|------|------|----------|
| `.agentdb/agentdb.db` | 1.6 GB | AgentDB knowledge base (1.55M episodes, 18K embeddings) |
| `.goalie/` | 84 MB | Governance metrics, pattern logs, crontab backups |
| `.ay-learning/` | 172 KB | Per-circle learning state (6 circles + iteration logs) |

## STX Cluster State (2026-06-16)

### Hardware

| Disk | Size | Partitions | Status |
|------|------|------------|--------|
| `/dev/sda` | 447 GB | 9 partitions, fully allocated | Boot disk |
| `/dev/nvme0n1` | 1.9 TB | 5 partitions (root, var, docker, nova, EFI) | **p4 mounted** (`/mnt/containerd`) |
| `/dev/nvme1n1` | 931 GB | Unpartitioned | Available |

### Disk Layout (sda — current)

| Partition | Mount | Size | Used | Purpose |
|-----------|-------|------|------|---------|
| sda4 | `/` | 20 GB | 53% | Root filesystem |
| sda5 | `/var` | 20 GB | 28% | Var (kubelet config, logs) |
| sda9 | `/data` | 366 GB | 95% | cPanel VM (336 GB) + GitLab (1.7 GB). Containerd moved to NVMe. |
| sda6 | `/home` | 10 GB | 34% | Home |
| sda7 | `/opt` | 10 GB | 71% | Opt |
| sda3 | — | 8 GB | — | Unmounted (swap?) |

### NVMe Partitions (available, labeled)

| Partition | Label | Size | Filesystem | Candidate for |
|-----------|-------|------|------------|---------------|
| nvme0n1p2 | `root` | 100 GB | ext4 | — |
| nvme0n1p3 | `var` | 50 GB | ext4 | — |
| nvme0n1p4 | **`docker`** | **100 GB** | ext4 | **Containerd storage** (mounted `/mnt/containerd`, fstab) |
| nvme0n1p5 | `nova` | 1.6 TB | ext4 | VM images / expansion |
| nvme1n1 | — | 931 GB | unformatted | Future use |

### K8s Workloads

| Deployment | Replicas | Status | Notes |
|-----------|----------|--------|-------|
| hostbill | 1/1 | Running | Stable (12d uptime) |
| affiliate | 1/1 | Running | Restored after migration |
| flarum | 1/1 | Running | Restored after migration |
| mysql | 1/1 | Running | StatefulSet, local-path PVC |
| trading | 1/1 | Running | Restored after migration |
| wordpress | 1/1 | Running | Restored after migration |

### 2026-06-16: Pod Thrashing + Containerd Migration (RESOLVED)

**Root cause:** `/data` at 100% (336 GB cPanel VM + 13 GB containerd on 366 GB partition) → kubelet `DiskPressure` taint → pods evicted → rescheduled → image pull fills disk → evicted again. Created ~10,000 dead pods.

**Fix:**
1. Purged ~10,000 ghost pods (Evicted/Error/ContainerStatusUnknown)
2. Reduced ext4 reserved blocks on `/data` from 5% to 1% (freed 12 GB)
3. Migrated containerd storage from `/data` to `nvme0n1p4` (100 GB NVMe)
4. Symlinked `/data/containerd` → `/mnt/containerd`, added fstab entry
5. Restarted containerd + kubelet, scaled all workloads back to 1
6. Removed old `/data/containerd.old`

**Result:** `/data` at 95% (21 GB free), `/mnt/containerd` at 19% (76 GB free), DiskPressure=False, 6/6 pods Running.

**Future:** Mount `nvme0n1p5` (1.6 TB, labeled "nova") for VM images to free `/data` further, or use `nvme1n1` (931 GB) as additional storage.

## Incident Log

### 2026-04-10: Passbolt SSL + HTTP 500

**Root cause (HTTP 500):** PHP extensions `gnupg` and `gd` missing for ea-php84.
**Root cause (SSL):** DNSSEC chain of trust broken — child zone `passbolt.yocloud.com` had DNSKEY but no DS in parent `yocloud.com`; parent NSEC3 opt-out=0 caused SERVFAIL at Let's Encrypt.

**Fix:**
1. Installed `gnupg` via PECL + `ea-php84-php-gd` via apt
2. Disabled DNSSEC on child zone (`pdnsutil disable-dnssec`)
3. Set NSEC3 opt-out=1 on parent (`pdnsutil set-nsec3 yocloud.com '1 1 0 -' narrow`)
4. Triggered AutoSSL — cert issued within seconds

**Prevention:** `dns-zone-audit.sh` and `config-audit.sh` now detect both failure classes.

## Disaster Recovery

### Echo 13 Emergency Boot (Sonnet Echo 13 — 4 TB Thunderbolt SSD)

The Echo 13 has a prepared APFS volume and verified macOS installer for emergency recovery when the internal drive is full or unbootable.

**Assets on Echo 13:**

| Path | Size | Purpose |
|------|------|--------|
| `/Volumes/Echo 13 SSD/Recovery/Install macOS 27 Beta.app` | 16 GB | Verified installer (Apple-signed, DMG checksum valid) |
| `/Volumes/macOS Emergency` (disk7s1) | 80 GB quota | Prepared APFS volume for macOS installation |
| Time Machine backups | ~3.4 TB | Full system backup (latest: 2026-06-16) |

### Recovery Procedures

**Option 1: Install macOS to Echo 13 (full bootable external)**
```bash
# Open the installer GUI — select "macOS Emergency" as destination
open "/Volumes/Echo 13 SSD/Recovery/Install macOS 27 Beta.app"
# After install: hold Option at boot → select "macOS Emergency"
```

**Option 2: Restore from Time Machine**
```bash
# Boot into Recovery: hold Power button → Options → Restore from Time Machine
# Source: Echo 13 SSD → select latest backup
```

**Option 3: Internet Recovery (Apple Silicon)**
```bash
# Hold Power button at boot → Options → Reinstall macOS
# No external media needed, requires internet connection
```

**Option 4: Re-download installer (if Echo 13 installer becomes stale)**
```bash
# Check installed version
sw_vers
# Fetch latest matching installer
softwareupdate --fetch-full-installer --full-installer-version $(sw_vers -productVersion)
# Move to Echo 13
sudo mv "/Applications/Install macOS"*.app "/Volumes/Echo 13 SSD/Recovery/"
```

### Disk Space Emergency Procedure

If the internal drive fills up and becomes unresponsive:

1. **Boot to Recovery** (hold Power button) → open Terminal
2. **Delete TM snapshots**: `tmutil deletelocalsnapshots /`
3. **Clear caches**: `rm -rf /Volumes/Data/private/var/folders/*/C/*`
4. **Reboot normally** and run `./scripts/infra/disk-space-monitor.sh --auto-clean`

### Disk Space Monitoring

`disk-space-monitor.sh` runs every 4 hours and applies tiered cleanup:

| Free Space | Status | Auto-action |
|-----------|--------|------------|
| > 100 GB | OK | None |
| 50–100 GB | WARNING | Cleans npm/brew/pip caches + Xcode DerivedData |
| < 50 GB | CRITICAL | Also purges TM local snapshots + simulator caches |

```bash
# Manual run
./scripts/infra/disk-space-monitor.sh --auto-clean

# Preview what would be cleaned
./scripts/infra/disk-space-monitor.sh --dry-run

# Check history
cat scripts/infra/logs/disk-space.log
```
