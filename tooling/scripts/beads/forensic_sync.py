import os
import sys
import asyncio

# Architectural Constants
LEGACY_AWS_IP = "54.241.233.105"
BACKUP_DIR = "/Volumes/cPanelBackups/forensic_logs"

async def run_cmd(cmd, step_name):
    process = await asyncio.create_subprocess_shell(
        cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    return process.returncode == 0

async def perform_forensic_sync():
    print("--> 🔍 [FORENSIC SYNC] Pulling diagnostic & security logs before Tombstone...")
    os.makedirs(BACKUP_DIR, exist_ok=True)
    
    # Logs to pull to prevent Diagnostic Blindness
    logs_to_pull = [
        "/usr/local/apache/logs/access_log",
        "/usr/local/apache/logs/error_log",
        "/var/log/messages",
        "/var/log/secure"
    ]
    
    tasks = []
    for log_path in logs_to_pull:
        dl_cmd = f'rsync -avzP --rsync-path="sudo rsync" -e "ssh -o StrictHostKeyChecking=no" ubuntu@{LEGACY_AWS_IP}:{log_path} {BACKUP_DIR}/ >/dev/null 2>&1'
        tasks.append(run_cmd(dl_cmd, f"sync_{os.path.basename(log_path)}"))
        
    results = await asyncio.gather(*tasks)
    
    if all(results):
        print(f"--> ✅ [FORENSIC SYNC] Security & Audit logs preserved at {BACKUP_DIR}.")
        return True
    else:
        print("--> ⚠️ [FORENSIC SYNC] Partial failure fetching legacy logs. Proceed with caution.")
        return False

if __name__ == "__main__":
    asyncio.run(perform_forensic_sync())
