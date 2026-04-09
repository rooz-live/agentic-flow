# Cycle 115: WSJF Sprawl Deletion Substitution Map (R-2026-016)

## Archival Relocations
The following legacy / snapshot `.md` artifacts have been strictly archived under `.archives/` to restore root directory trust bounds.

| Target Path | Action | Destination | Justification (R-2026-016) |
|-------------|--------|-------------|----------------------------|
| `*-MARCH-*.md` (Consulting, Gates, Action Plans) | Archive | `.archives/reports-legacy/orchestration/` | Outdated point-in-time delivery orchestration states from March sequence. |
| `EXIT-110-FIX-*.md` | Archive | `.archives/reports-legacy/orchestration/` | Legacy cycle verification matrix output. |
| `RCA-*-2026*.md` | Archive | `.archives/reports-legacy/rca-backups/` | Root-level RCA root cause reports cluttering primary view. |
| `T1-*.md` (Cache Latency, Disk Strategies) | Archive | `.archives/reports-legacy/disk-strategy/` | T1 Disk cleanup & latency risk historic strategies. |
| `TDD-DISK-*.md` | Archive | `.archives/reports-legacy/disk-strategy/` | Red/Green output bounds obsolete point-in-time trace. |

## Pending Structural Deletions
Paths to be physically pruned from the `agentic-flow` tracking limits:
* `inventory-configs.txt`, `inventory-docs.txt`, `inventory-scripts.txt`, `inventory-tests.txt` -> High-entropy large legacy TXT sprawl.
* `agentdb.db.backup-*` -> Local physical sqlite sprawl.

This map anchors the Trust-First structural healing constraints directly to `.gitmodules` capability maps effectively ensuring 100% coherence across environments.
