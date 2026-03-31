# Email hash log — retention (production / audit)

## Canonical production log

- **Default path:** `~/Library/Logs/agentic-email-hashes.log` (override with `EMAIL_HASH_LOG`).
- **Implementation:** `_SYSTEM/_AUTOMATION/email-hash-db.sh` (sourced by validation / send pipeline).

## Policy

1. **Do not delete** the production hash log as part of disk cleanup, “fresh start,” or archival sweeps. It is **append-only evidence** for duplicate detection and audit.
2. **Backup** before OS migrations: copy the log to encrypted backup with the rest of legal/ops data.
3. **Tests** must use **temporary** `EMAIL_HASH_LOG` paths only (see `tests/test-email-hash-db.sh`).
4. **Separate CLI** `scripts/email-hash-db.sh` uses `~/.email_hash_db/hashes.csv` — treat as operational data too; do not delete without explicit retention decision and backup.

## ROAM

If disk pressure targets `~/Library/Logs/`, open a ROAM item: *compress/archive copy to cold storage* — **never** “delete to free space” without legal/ops sign-off.
