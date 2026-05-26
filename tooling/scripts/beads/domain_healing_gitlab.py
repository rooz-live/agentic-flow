import subprocess
import time
import os
import sys

# Fourth Wave Agentic Auth: Sovereign Restore Execution Bead
# ==========================================================

TARGET_HOST = "stx"
BACKUP_ID = "sovereignty_1777470387"
LOCAL_COMPOSE = "/Users/shahroozbhopti/Documents/code/infrastructure/hivelocity/gitlab/docker-compose.yml"
REMOTE_DIR = "~/infrastructure/hivelocity/gitlab"

def run_local(cmd, fail_ok=False):
    print(f"Executing Local: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0 and not fail_ok:
        print(f"❌ Failed: {res.stderr}")
        sys.exit(1)
    return res.stdout

def run_remote(cmd, fail_ok=False):
    ssh_cmd = f"ssh -o StrictHostKeyChecking=no {TARGET_HOST} \"{cmd}\""
    print(f"Executing Remote: {cmd}")
    res = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0 and not fail_ok:
        print(f"❌ Failed: {res.stderr}")
        sys.exit(1)
    return res.stdout

def stream_remote(cmd, fail_ok=False):
    ssh_cmd = ["ssh", "-o", "StrictHostKeyChecking=no", TARGET_HOST, cmd]
    print(f"Streaming Remote: {cmd}")
    process = subprocess.Popen(ssh_cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        if output:
            print(output.strip())
    rc = process.poll()
    if rc != 0 and not fail_ok:
        print(f"❌ Failed with return code {rc}")
        sys.exit(rc)
        
def main():
    print("🚀 [SOVEREIGN RESTORE] Initiating GitLab 18.5.3-ee.0 Parity Restoration")
    
    # 1. Sync Configuration
    print("--> 1. Syncing Execution Blueprint (docker-compose.yml)")
    run_remote(f"mkdir -p {REMOTE_DIR}")
    run_local(f"scp -o StrictHostKeyChecking=no {LOCAL_COMPOSE} {TARGET_HOST}:{REMOTE_DIR}/docker-compose.yml")
    
    # 2. Halt Running Container
    print("--> 2. Halting current execution context")
    run_remote(f"cd {REMOTE_DIR} && sudo docker compose down --remove-orphans", fail_ok=True)
    run_remote("sudo docker rm -f gitlab-web-1 gitlab-gitlab-1 gitlab", fail_ok=True)
    
    # 3. Purge the Corrupted physical state
    print("--> 3. Purging corrupted database and configuration volumes")
    run_remote(f"cd {REMOTE_DIR} && sudo rm -rf data config logs")
    
    # 4. Verify Backup exists on remote
    print(f"--> 4. Verifying Backup {BACKUP_ID} exists on remote host")
    out = run_remote(f"sudo ls /var/lib/docker/volumes/gitlab_backups/{BACKUP_ID}_gitlab_backup.tar", fail_ok=True)
    if "No such file" in out or "cannot access" in out:
        print(f"⚠️ Backup not found on STX. Syncing from local Umbical Cord...")
        run_local(f"sudo rsync -avzP /Volumes/cPanelBackups/gitlab_aws/{BACKUP_ID}_gitlab_backup.tar {TARGET_HOST}:/tmp/")
        run_remote(f"sudo mv /tmp/{BACKUP_ID}_gitlab_backup.tar /var/lib/docker/volumes/gitlab_backups/")
    else:
        print("✅ Backup verified on STX volume.")
    
    # 5. Boot Fresh Container
    print("--> 5. Booting Fresh 18.5.3-ee.0 Container")
    run_remote(f"cd {REMOTE_DIR} && sudo docker compose up -d")
    
    # 6. Wait for Health (Wait for reconfigure to finish)
    print("--> 6. Waiting for GitLab container to stabilize (This will take a few minutes)...")
    for _ in range(30):
        out = run_remote("sudo docker exec gitlab gitlab-ctl status", fail_ok=True)
        if "run: puma" in out and "run: postgresql" in out:
            print("✅ GitLab base services are running.")
            break
        print("Waiting 10s...")
        time.sleep(10)
    
    # Wait extra time for database migrations of the fresh install to finish
    time.sleep(60) 
    
    # 7. Stop connections to database
    print("--> 7. Stopping Puma and Sidekiq for restoration")
    run_remote("sudo docker exec gitlab gitlab-ctl stop puma")
    run_remote("sudo docker exec gitlab gitlab-ctl stop sidekiq")
    
    # 8. Restore the physical reality
    print("--> 8. Executing Sovereign RESTORE Protocol (Streaming output)")
    # Using gitlab-backup restore and piping yes to any prompts
    stream_remote(f"sudo docker exec gitlab sh -c 'yes yes | gitlab-backup restore BACKUP={BACKUP_ID}'", fail_ok=True)
    
    # 9. Reconfigure and Restart
    print("--> 9. Reconfiguring and restarting the Sovereign instance")
    stream_remote("sudo docker exec gitlab gitlab-ctl reconfigure", fail_ok=True)
    stream_remote("sudo docker exec gitlab gitlab-ctl restart")
    
    print("✅ RESTORATION COMPLETE. Awaiting external UI verification.")

if __name__ == "__main__":
    main()
