# Session: Infrastructure Remediation & System Stabilization
**Date:** 2026-06-16
**Duration:** ~8 hours (continuation from 2026-04-10 session)

## Outcomes

### Passbolt Server (from April 10)
- Fixed HTTP 500: installed gnupg + gd PHP extensions for ea-php84
- Fixed SSL: repaired DNSSEC chain (disable child DNSKEY, NSEC3 opt-out=1)
- Renewed cert via AutoSSL (Let's Encrypt R13, expires 2026-07-09)

### Drift Detection Suite
- 7 scripts: dns-zone-audit, ssl-monitor, firewall-audit, nginx config-audit, disk-space-monitor, drift-check orchestrator, csf-whitelist
- launchd agent every 4 hours
- Firewall baseline updated (ports 853, 6556, 8443)

### Local Mac Disk Optimization
- Cleaned 175 GB (TM snapshots, npm cache, old Node versions, brew cache)
- 78 GB → 222 GB free (96% → 88%)
- disk-space-monitor.sh with tiered auto-cleanup

### macOS Emergency Boot
- macOS 27 Beta installer verified on Echo 13 SSD
- macOS Emergency APFS volume prepared (80 GB)

### STX Cluster Recovery
- Purged ~10,000 ghost pods (Evicted/Error/ContainerStatusUnknown)
- Root cause: /data 100% full (336 GB VM + 13 GB containerd on 366 GB)
- Migrated containerd to nvme0n1p4 (100 GB NVMe, labeled "docker")
- All 6/6 pods running, DiskPressure=False

### SSH Architecture Fix
- Discovered rooz-aws pointed to decommissioned AWS EC2
- Added cpanel-vm alias with ProxyJump through STX
- Reset root password via QEMU guest agent
- cPHulk (not CSF) identified as brute-force protector

### WHM API & Credential Management
- Generated WHM API token (oz_infra)
- Stored in 1Password + .env.cpanel
- csf-whitelist.sh breaks SSH lockout cycle via WHM API (port 2087)

### SSL Renewals
- rooz.live: renewed (2026-07-09)
- bhopti.com: cleared 9 AutoSSL exclusions, renewed (2026-09-14)

### Repository Cleanup
- 28 → 15 local branches (13 stale deleted)
- 34 remote refs pruned
- 2 worktrees removed
- All changes committed to main (33aa11acb)

## Commits
- 68998f21: Infrastructure drift detection scripts (826 lines)
- 9225c7f5: Bug fixes + launchd plist
- d7c79f98: Firewall baseline update
- 7048be4b: DNS/Nginx audit refactor (safe SSH helpers)
- 54255210: Project README
- edfeb1c87: Disk space monitor
- cfe16d8ed: Disaster recovery docs
- 6690448c5: STX cluster state + containerd migration plan
- 8d319a715: Migration complete, 6/6 pods running
- 0bdfd2084: CSF whitelist script
- 33aa11acb: SSH architecture + WHM API token docs

## Continuation: 2026-06-17

### Local LLM Model Infrastructure
- Installed Ollama (v0.30.8) via Homebrew
- Downloaded: gemma3:12b (7.6 GB), gemma3:4b (3.1 GB), phi4-mini (2.3 GB), nomic-embed-text (0.3 GB)
- All models stored on Echo 13 SSD (13 GB total, 307 GB remaining)
- Configured OLLAMA_MODELS, HF_HOME, TRANSFORMERS_CACHE in bashrc + zshrc
- LM Studio downloadsFolder pointed to Echo 13
- ~/.codeium and ~/.cache/huggingface symlinked to Echo 13
- 14/14 storage verification checks passing

### IDE Integration
- Continue extension v1.2.24 installed in VS Code + Cursor
- ~/.continue/config.json: Gemma 3 12B (chat), Phi-4 Mini (autocomplete), LM Studio (alternate), nomic-embed-text (embeddings)
- Inference verified: Gemma 3 12B + Phi-4 Mini both responding correctly

### Documentation
- scripts/infra/LLM-MODELS.md: storage architecture, IDE integration, operations, ROAM risks, OWC migration
- PR #120 squash-merged to main (8bf89b221)
