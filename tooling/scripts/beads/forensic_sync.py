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
    print("--> 🔍 [FORENSIC SYNC] Triggered. Isolating adversarial payload into local sinkhole.")
    
    # Capital-Aware Bounded Reasoning: Check OPEX Ledger
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.goalie/opex.db"))
    can_afford_sync = True
    if os.path.exists(db_path):
        import sqlite3
        try:
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("SELECT ttfb_ms FROM execution_tensors ORDER BY timestamp DESC LIMIT 10")
            recent_ttfb = [float(r[0]) for r in cur.fetchall() if float(r[0]) > 0.0]
            conn.close()
            if recent_ttfb and (sum(recent_ttfb) / len(recent_ttfb)) > 3000.0:
                print("--> ⚠️ [EXECUTION CAPITAL] Critical Burn Rate Detected (>3000ms average TTFB). Cannot afford 'perfect' sync.")
                can_afford_sync = False
        except Exception as e:
            pass
            
    if can_afford_sync:
        print("--> ⏳ [EXECUTION CAPITAL] Consciously burning execution cycles (10s) to 'buy' complete php.error.log stack traces...")
        await asyncio.sleep(10)
        print("--> 🔍 [FORENSIC SYNC] Pulling diagnostic & security logs before liquidation...")
        os.makedirs(BACKUP_DIR, exist_ok=True)
    else:
        print("--> ⚡ [CAPITAL PROTECT] Bypassing forensic sync. Liquidating asset immediately (SELL_CASCADE).")
        process = await asyncio.create_subprocess_exec(sys.executable, os.path.join(os.path.dirname(__file__), "domain_healing.py"), "opex_reclaimer")
        await process.communicate()
        return False

    
    # 1. Capture Live Volatile Memory & Connection States before they vaporize
    print("--> 🧠 [FORENSIC SYNC] Capturing volatile memory state, active connections, and process trees...")
    volatile_cmds = [
        "sudo netstat -tunlp > /tmp/forensic_netstat.txt",
        "sudo ps aux --sort=-%mem > /tmp/forensic_ps_aux.txt",
        "sudo dmesg -T > /tmp/forensic_dmesg.txt",
        "sudo systemctl status > /tmp/forensic_systemctl.txt"
    ]
    for v_cmd in volatile_cmds:
        await run_cmd(f'ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@{LEGACY_AWS_IP} "{v_cmd}"', "volatile_dump")

    # 2. Expanded Logs to pull to prevent Diagnostic Blindness
    logs_to_pull = [
        "/usr/local/apache/logs/access_log",
        "/usr/local/apache/logs/error_log",
        "/var/log/messages",
        "/var/log/secure",
        "/var/log/exim_mainlog",
        "/var/log/maillog",
        "/opt/cpanel/ea-php*/root/usr/var/log/php-fpm/error.log",
        "/tmp/forensic_netstat.txt",
        "/tmp/forensic_ps_aux.txt",
        "/tmp/forensic_dmesg.txt",
        "/tmp/forensic_systemctl.txt"
    ]
    
    tasks = []
    for log_path in logs_to_pull:
        dl_cmd = f'rsync -avzP --rsync-path="sudo rsync" -e "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5" ubuntu@{LEGACY_AWS_IP}:{log_path} {BACKUP_DIR}/ >/dev/null 2>&1'
        tasks.append(run_cmd(dl_cmd, f"sync_{os.path.basename(log_path)}"))
        
    results = await asyncio.gather(*tasks)
    
    if all(results):
        print(f"--> ✅ [FORENSIC SYNC] Security & Audit logs preserved at {BACKUP_DIR}.")
    else:
        print("--> ⚠️ [FORENSIC SYNC] Partial failure fetching legacy logs. Proceed with caution.")
        
    print("--> ⚡ [FORENSIC SYNC] Intelligence gathered. Triggering domain_healing.py to liquidate compromised asset...")
    process = await asyncio.create_subprocess_exec(sys.executable, os.path.join(os.path.dirname(__file__), "domain_healing.py"), "opex_reclaimer")
    await process.communicate()
    return all(results)

if __name__ == "__main__":
    asyncio.run(perform_forensic_sync())
