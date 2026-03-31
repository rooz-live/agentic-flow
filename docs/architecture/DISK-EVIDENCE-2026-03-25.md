# Disk evidence (2026-03-25)

Captured during dual-track validation work. Compare to SESSION-SUMMARY-2026-03-25.md (~99% full on prior reading).

## Quick sample (this environment)

| Path | Size |
|------|------|
| `~/Downloads` | ~21G |
| `~/.docker` | ~295M |
| `/` (df) | ~54% used, ~20Gi avail (varies by machine) |

## Full inventory (when needed)

Run manually (slow on `~/Library`):

```bash
du -sh ~/Library ~/Downloads ~/.docker
find "$HOME" -type f -size +1G
docker system prune -a   # after review
```

## ROAM

- **R-2026-017**: Re-classify if utilization returns to critical or automation dirs grow unexpectedly.
