#!/usr/bin/env python3
"""
Domain D: Sovereign Verification (The Fourth Wave)
Responsibility: Autonomously locating the latest physical AWS extraction payload
and executing the local Docker restoration without human manual interaction.
"""
import os
import subprocess
import glob
import sys
import shutil

BACKUP_DIR = "/Volumes/cPanelBackups/gitlab_aws"
CONTAINER_NAME = "gitlab-web-1"
DEST_PATH = "/var/opt/gitlab/backups/"

def main():
    print("--> ⚡ Initiating Agentic Fourth-Wave Docker Verification...")

    docker_bin = shutil.which("docker")
    if not docker_bin:
        # Fallback for strict Python sub-shells on macOS
        fallback_paths = [
            "/Applications/Docker.app/Contents/Resources/bin/docker",
            "/usr/local/bin/docker", 
            "/opt/homebrew/bin/docker", 
            "/Users/shahroozbhopti/.orbstack/bin/docker"
        ]
        for p in fallback_paths:
            if os.path.exists(p):
                docker_bin = p
                break
    
    if not docker_bin:
        print("--> 🛑 FATAL: 'docker' hypervisor not found in absolute PATH boundaries.")
        sys.exit(1)

    # 1. Locate the latest payload autonomously
    search_pattern = os.path.join(BACKUP_DIR, "sovereignty_*_gitlab_backup.tar")
    files = glob.glob(search_pattern)
    if not files:
        print(f"--> 🛑 FATAL: No sovereign GitLab payloads found in {BACKUP_DIR}")
        sys.exit(1)
        
    latest_payload = max(files, key=os.path.getctime)
    filename = os.path.basename(latest_payload)
    print(f"  --> [TELEMETRY] Latest Physical DNA Identified: {filename}")

    # 2. Inject Payload into Container
    print(f"  --> [I/O] Injecting DNA into Sovereign Sandbox ({CONTAINER_NAME})...")
    try:
        subprocess.run([docker_bin, "cp", latest_payload, f"{CONTAINER_NAME}:{DEST_PATH}"], check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        print(f"--> 🚨 Injection Failed. Error:\n{e.stderr}")
        sys.exit(1)

    # 3. Assert Permissions
    print("  --> [CHOWN] Harmonizing Container Ownership Boundaries...")
    subprocess.run([docker_bin, "exec", CONTAINER_NAME, "chown", "git:git", f"{DEST_PATH}{filename}"], check=True)

    # We use GITLAB_ASSUME_YES=1 to bypass the interactive "Do you want to continue (yes/no)?" prompts.
    # We also stream output so the orchestrator can capture it.
    backup_id = filename.replace("_gitlab_backup.tar", "")
    print(f"  --> [EXEC] Triggering internal hypervisor restoration for ID: {backup_id}")
    print("      (This will take several minutes...)")
    
    restore_cmd = [
        docker_bin, "exec", "-e", "GITLAB_ASSUME_YES=1", CONTAINER_NAME, 
        "gitlab-backup", "restore", f"BACKUP={backup_id}"
    ]
    
    result = subprocess.run(restore_cmd, capture_output=True, text=True)
    if result.returncode != 0 and "Warning" not in result.stderr:
        print(f"--> 🚨 Restore Failed. Stdout:\n{result.stdout}\nStderr:\n{result.stderr}")
        sys.exit(1)

    print("\n=====================================================================")
    print("✅ FOURTH-WAVE PHYSICAL RESTORATION DISPATCH COMPLETE.")
    print("Navigate to http://localhost to mathematically verify the data structure.")
    print("If verified, you are cleared to terminate the AWS cloud instance.")

if __name__ == "__main__":
    main()
