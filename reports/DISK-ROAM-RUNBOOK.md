# Disk pressure — ROAM-linked runbook (evidence, not theater)

## Purpose

Record **measurement** steps and **risk classification** before cleanup or archive. Append new snapshots under “Latest evidence” when disk is suspect or after major changes (prune, archive, large ingest).

## Commands (safe to re-run)

```bash
# Whole-volume view (data volume is usually /System/Volumes/Data on macOS)
df -h "$HOME"

# Fast hotspots (Library can be very slow to sum in one shot)
du -sh "$HOME/Downloads" "$HOME/.docker" 2>/dev/null
du -sh "$HOME/Library/Caches" "$HOME/Library/Developer" 2>/dev/null

# Large files — scope first (full ~ walk is expensive)
find "$HOME/Downloads" -type f -size +1G 2>/dev/null
# Optional broader scan when needed:
# find "$HOME/Library/Caches" -type f -size +1G 2>/dev/null | head -50
```

## Docker prune (T1 latency risk)

`docker system prune -a` **reclaims disk** but **invalidates layers**. Expect:

- **Blast radius:** next image pulls / builds slower until cache repopulates.
- **ROAM:** classify as *Mitigated* or *Owned* with a **re-warm** step (pull or build critical images) after prune.

Do not prune during a critical send/arbitration window without a fallback.

## Archive-first policy

- Generated HTML snapshots, old backups: **tar + checksum + manifest** before deleting **copies** only.
- Files **>1G** (models, images): **archive + checksum**, not delete, unless retention policy explicitly allows.

## Production / audit data

**Do not delete** the email hash log / DB used for duplicate detection — see `docs/EMAIL-HASH-RETENTION.md` and script headers in `_SYSTEM/_AUTOMATION/email-hash-db.sh`.

## Time series from automation

- **`scripts/ay.sh`:** after each outer cycle, logs a `df -h` line for `$HOME` (fallback `/`) to stderr and debug ingest (`H10`).
- **`scripts/orchestrators/swarm-agent-supervisor.sh`:** each supervisor iteration logs `💾 Disk: … avail, … used, … cap` to `~/Library/Logs/swarm-supervisor-*.log`.

Use those logs to answer “filling rapidly?” with **dated** lines, not intuition.

---

## Latest evidence (append-only section)

_Regenerate this block when investigating disk; keep prior dated blocks below if you want history in git._

**UTC:** 2026-03-25T22:54:59Z

```
Filesystem      Size    Used   Avail Capacity iused ifree %iused  Mounted on
/dev/disk3s5   1.8Ti   1.7Ti    64Gi    97%     29M  673M    4%   /System/Volumes/Data
---
 21G	/Users/shahroozbhopti/Downloads
295M	/Users/shahroozbhopti/.docker
```
