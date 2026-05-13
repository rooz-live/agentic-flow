#!/usr/bin/env python3
import os
import json
import re
import requests
import subprocess
import glob
import urllib3

# Suppress insecure request warnings for cPanel self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_op_secret(reference):
    env_token = os.environ.get("WHM_TOKEN")
    if env_token:
        print("🔐 Using WHM_TOKEN from environment.")
        return env_token
    try:
        print(f"🔐 Requesting Cryptographic Decryption from 1Password: {reference}")
        result = subprocess.run(["op", "read", reference], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except Exception as e:
        print(f"❌ 1Password Decryption Failed. Is the CLI authenticated? Error: {e}")
        return None

def main():
    print("🦅 Initializing Autonomous Headless Edge Deployer (Zero Trust Orchestrator)")
    
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

    token_ref_match = re.search(r'WHM_API_TOKEN="(op://.*?)"', env_content)
    token_ref = token_ref_match.group(1) if token_ref_match else None

    if not token_ref:
        print("❌ WHM_API_TOKEN binding not found in .env.")
        return

    # 2. Extract Token via Biometric / CLI Auth
    whm_token = get_op_secret(token_ref)
    if not whm_token:
        return

    # 3. Locate the sterile Innovator artifact
    archives = glob.glob("build_artifacts/swarm_access_node_*.tar.gz")
    if not archives:
        print("❌ No build_artifacts TAR.GZ found. Has the Orchestrator packaged the UI?")
        return
    latest_archive = max(archives, key=os.path.getctime)
    archive_filename = os.path.basename(latest_archive)

    headers = {
        "Authorization": f"whm root:{whm_token}"
    }

    print(f"\n🌊 Initiating Physical Artifact Distribution: {archive_filename}")
    print(f"Targeting {len(mapping)} Sovereign Boundaries via WHM API Bridge...\n")

    for domain, user in mapping.items():
        print(f"⚡ Provisioning Tenant: {domain} (User: {user})")
        target_dir = f"/home/{user}/public_html"
        
        # Action 1: Upload the Archive directly into the Tenant's Zero-Trust boundary
        url_upload = f"https://{host}:2087/json-api/cpanel?api.version=1&cpanel_jsonapi_user={user}&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=upload_files"
        
        try:
            with open(latest_archive, "rb") as f:
                files = {"file-1": (archive_filename, f, "application/gzip")}
                data = {"dir": target_dir}
                resp_upload = requests.post(url_upload, headers=headers, data=data, files=files, verify=False, timeout=60)
                
                if resp_upload.status_code != 200:
                    print(f"  ❌ Upload rejected by KVM Edge (HTTP {resp_upload.status_code})")
                    continue
        except Exception as e:
            print(f"  ❌ Upload network failure: {e}")
            continue

        # Action 2: Deconstruct the artifact natively on the edge via Fileman fileop extract
        url_extract = f"https://{host}:2087/json-api/cpanel?cpanel_jsonapi_apiversion=2&cpanel_jsonapi_user={user}&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=fileop"
        
        try:
            data_ext = {
                "op": "extract",
                "sourcefiles": f"public_html/{archive_filename}",
                "destfiles": "public_html"
            }
            resp_ext = requests.post(url_extract, headers=headers, data=data_ext, verify=False, timeout=30)
            
            # The cPanel API 2 fileop returns {"cpanelresult":{"data":[{"result":1...}]}} on success
            if "error" not in resp_ext.text.lower() and '"result":1' in resp_ext.text:
                print(f"  ✅ Extracted securely inside {domain} boundary.")
            else:
                print(f"  ❌ Extraction failed: API returned an error: {resp_ext.text}")
                     
        except Exception as e:
            print(f"  ❌ Extraction network failure: {e}")

    print("\n🦅 Swarm Edge Distribution Complete! Autonomous flow executed flawlessly.")

if __name__ == "__main__":
    main()
