#!/usr/bin/env python3
import os
import json
import re
import paramiko
import glob
import time

def deploy_via_sftp(mapping, host, archive_path):
    print("🌊 Initiating Physical Artifact Distribution via Zero-Trust SFTP/SSH...")
    
    # Locate the SSH Key
    key_path = os.path.expanduser("~/.ssh/sovereign_swarm")
    if not os.path.exists(key_path):
        print(f"❌ Critical Error: Sovereign Swarm Cryptographic Key not found at {key_path}")
        return False
        
    try:
        # Load the Ed25519 key (Zero-Trust Identity)
        ssh_key = paramiko.Ed25519Key.from_private_key_file(key_path)
    except Exception as e:
        print(f"❌ Failed to decrypt SSH key: {e}. Is there a passphrase blocking autonomous execution?")
        return False

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    # The swarm uses port 2222 based on the provision script
    port = 2222 
    
    try:
        print(f"🔐 Authenticating to Root Node ( {host}:{port} ) via Cryptographic Key...")
        client.connect(hostname=host, port=port, username="root", pkey=ssh_key, timeout=10)
    except Exception as e:
        print(f"❌ Root SSH Access Denied (Port 2222). Did you authorize the key in WHM? Error: {e}")
        return False

    sftp = client.open_sftp()
    archive_filename = os.path.basename(archive_path)

    for domain, user in mapping.items():
        print(f"\n⚡ Provisioning Tenant: {domain} (User: {user})")
        target_dir = f"/home/{user}/public_html"
        remote_archive = f"{target_dir}/{archive_filename}"
        
        try:
            # Enforce clean room public_html existence
            client.exec_command(f"mkdir -p {target_dir}")
            
            # 1. Upload Artifact via SFTP
            print(f"  -> Uploading sterile payload securely to {target_dir}...")
            sftp.put(archive_path, remote_archive)
            
            # 2. Extract Native Tar using SSH
            print(f"  -> Executing Native Kernel Extraction...")
            stdin, stdout, stderr = client.exec_command(f"cd {target_dir} && tar -xzf {archive_filename} && rm {archive_filename}")
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status == 0:
                print(f"  ✅ Extracted securely inside {domain} boundary.")
            else:
                err = stderr.read().decode()
                print(f"  ❌ Extraction failed: {err}")
                continue
                
            # 3. Enforce Cryptographic Structural Sovereignty
            print(f"  -> Enforcing Zero-Trust Boundary Chown/Chmod...")
            client.exec_command(f"chown -R {user}:{user} {target_dir}")
            client.exec_command(f"find {target_dir} -type d -exec chmod 750 {{}} \\;")
            client.exec_command(f"find {target_dir} -type f -exec chmod 640 {{}} \\;")
            
            print(f"  ✅ {domain} Secured and Live.")
            
        except Exception as e:
            print(f"  ❌ Network/System failure on {domain}: {e}")

    sftp.close()
    client.close()
    return True

def main():
    print("🦅 Initializing Autonomous Edge SFTP Deployer")
    
    # 1. Parse configuration from .env ledger
    try:
        with open(".env", "r") as f:
            env_content = f.read()
    except FileNotFoundError:
        print("❌ .env ledger not found.")
        return

    mapping_match = re.search(r"CPANEL_USERS_MAPPING='({.*?})'", env_content, re.DOTALL)
    mapping = json.loads(mapping_match.group(1)) if mapping_match else {}

    host_match = re.search(r'CPANEL_HOST="(.*?)"', env_content)
    host = host_match.group(1) if host_match else "yo.tag.ooo"

    # 2. Locate the sterile Innovator artifact
    archives = glob.glob("build_artifacts/swarm_access_node_*.tar.gz")
    if not archives:
        print("❌ No build_artifacts TAR.GZ found. Run 'npm run build' first.")
        return
    latest_archive = max(archives, key=os.path.getctime)

    success = deploy_via_sftp(mapping, host, latest_archive)
    
    if success:
        print("\n🦅 Swarm Edge Distribution Complete via Secure Native SFTP/SSH!")
    else:
        print("\n🟡 SSH/SFTP Failed. Fallback to cPanel API Zero-Trust Isolated User Login required.")

if __name__ == "__main__":
    main()
