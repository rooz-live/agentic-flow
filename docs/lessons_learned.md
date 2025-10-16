# Lessons Learned: Server Disk Space and cPanel virtfs Incident

## 1. Incident Summary

On August 5, 2025, a critical disk space alert (91% utilization) on the server `yo.tag.ooo` led to an investigation and cleanup effort. While resolving the space issue, the `bhopti` cPanel account, including 47GB of historical email data, was unintentionally deleted. The data was successfully restored from a backup, but the incident caused approximately 8 minutes of website downtime and required emergency intervention.

## 2. Root Cause Analysis

The incident was caused by a combination of two critical factors:

1.  **Runaway Log Files:** The initial disk space crisis was triggered by massive, uncontrolled PHP error logs, particularly from the Passbolt application, which consumed over 20GB of storage.
2.  **Unsafe `virtfs` Cleanup:** The primary mistake occurred during the cleanup of the `/home/virtfs` directory, which is used by cPanel's Jailed Shell. The cleanup was performed while the disk was critically full. This appears to have triggered a rare but severe bug where the system deleted the actual user home directory (`/home/bhopti`) instead of just the virtualized mount points.

The `bhopti` account's shell was changed from `jailshell` to `noshell`, and then the `virtfs` directory for that user was deleted. Due to the low disk space and a likely race condition, the `rm -rf` command followed the symbolic links or mounts back to the live home directory, resulting in complete data loss for that account.

## 3. Key Takeaways & Workflow Improvements

To prevent a recurrence of this incident, the following best practices and automated solutions have been implemented and should be followed for all future server maintenance:

### A. Pre-Task Verification is Mandatory

*   **Rule 1: NEVER perform major filesystem operations on a disk with less than 20% free space.** The `df -h` command must be the first step before any cleanup. If space is critical, focus on truncating large, non-essential files (logs, caches) before attempting to remove directories.
*   **Rule 2: ALWAYS verify that all `virtfs` mounts are unmounted before deleting any user-specific directories within `/home/virtfs`.** Use `mount | grep virtfs` to confirm that no mounts remain. If they persist, use `umount -l` (lazy unmount) and re-verify.
*   **Rule 3: Use safer commands.** Instead of a broad `rm -rf` on user-level `virtfs` directories, it is safer to unmount and then let cPanel's own scripts handle the cleanup when the account is properly updated.

### B. Automated Monitoring & Prevention

The following automated systems are now in place on the server:

*   **Intelligent Log & Disk Monitoring (`disk-stability-monitor.sh`):** A cron job now runs every 10 minutes to check disk usage.
    *   **Warning (80%):** Triggers preventive cleanup of temp files.
    *   **Alert (85%):** Triggers aggressive cleanup, including truncating large logs and clearing caches.
*   **Smart Backup Management (`intelligent-backup-cleanup.sh` & `backup-optimizer.sh`):**
    *   Backup retention is now dynamic, based on available disk space.
    *   Backups are optimized to remove redundant, large log files and compress older archives.
*   **Emergency Log Truncation Cron:** A high-frequency cron job now runs every 30 minutes to find any log file exceeding 1GB and truncate it to 500MB, acting as a final safeguard against runaway log spam.

### C. Standard Operating Procedure (SOP) for cPanel Jailshell Management

1.  **Assess Necessity:** Before enabling Jailed Shell for any user, confirm it is absolutely necessary. Use `noshell` as the default for all new accounts.
2.  **Disable Safely:** To disable Jailed Shell for a user:
    *   First, change the user's shell to `noshell` in cPanel WHM or with `chsh -s /usr/local/cpanel/bin/noshell <username>`.
    *   Second, run `/scripts/restartsrv_httpd` and `/scripts/restartsrv_dovecot` to ensure all user processes are terminated.
    *   Third, verify all `virtfs` mounts for that user are gone with `mount | grep /home/virtfs/<username>`.
    *   **Do not manually `rm -rf` the virtfs directory.** cPanel's maintenance scripts (`/scripts/upcp`) will handle the cleanup of the directory once it is no longer in use.

By adhering to these updated procedures and relying on the new automated safeguards, we can ensure greater server stability and prevent this type of critical data loss in the future.

