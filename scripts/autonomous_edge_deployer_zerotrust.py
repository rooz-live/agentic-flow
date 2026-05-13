#!/usr/bin/env python3
import os
import json
import re
import requests
import urllib3
import glob

urllib3.disable_warnings()

def deploy_via_cpanel_isolated_session(mapping, host, whm_token, archive_path):
    print("🌊 Initiating Fallback: Zero-Trust Isolated User Sessions via cPanel UAPI")
    
    headers = {"Authorization": f"whm root:{whm_token}"}
    archive_filename = os.path.basename(archive_path)

    for domain, user in mapping.items():
        print(f"\n⚡ Establishing Zero-Trust Isolation for Tenant: {domain} (User: {user})")
        
        # Step 1: Generate isolated session token
        url_session = f"https://{host}:2087/json-api/create_user_session?api.version=1&user={user}&service=cpaneld"
        r_sess = requests.get(url_session, headers=headers, verify=False)
        
        if r_sess.status_code != 200 or "data" not in r_sess.json():
            print(f"  ❌ Failed to generate user session for {user}. Is WHM API Token valid?")
            continue
            
        data = r_sess.json()["data"]
        login_url = data["url"]
        security_token = data["cp_security_token"]
        
        # Step 2: Establish cookie jar via headless login (The true Zero-Trust Authentication)
        session = requests.Session()
        session.verify = False
        r_login = session.get(login_url)
        
        if r_login.status_code != 200:
            print(f"  ❌ Failed to authenticate headless session for {user}.")
            continue
            
        # We are now fully authenticated as the isolated cPanel user.
        print("  ✅ Session cookie established securely.")
        
        # Step 3: Upload Artifact natively inside their boundary (UAPI)
        print("  -> Uploading sterile artifact natively...")
        url_upload = f"https://{host}:2083{security_token}/execute/Fileman/upload_files"
        
        with open(archive_path, "rb") as f:
            # UAPI expects 'dir' inside data, and 'file-1' in multipart files
            files = {"file-1": (archive_filename, f, "application/gzip")}
            payload = {"dir": "public_html"}
            
            r_upload = session.post(url_upload, data=payload, files=files)
            
        try:
            up_res = r_upload.json()
            if up_res.get("status") != 1:
                print(f"  ❌ Upload rejected: {up_res}")
                continue
        except Exception:
            print(f"  ❌ Upload failed fatally. Response: {r_upload.text}")
            continue

        # Step 4: Extract Artifact (Legacy API2 because UAPI extract requires a module not standard across all versions, but fileop is universally stable)
        print("  -> Deconstructing monolithic artifact...")
        url_extract = f"https://{host}:2083{security_token}/json-api/cpanel?cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=fileop"
        
        payload_ext = {
            "op": "extract",
            "sourcefiles": f"public_html/{archive_filename}",
            "destfiles": "public_html"
        }
        
        r_ext = session.post(url_extract, data=payload_ext)
        if "error" not in r_ext.text.lower() and '"result":1' in r_ext.text:
            print(f"  ✅ Extracted securely inside {domain} boundary.")
        else:
            print(f"  ❌ Extraction failed: {r_ext.text}")

def main():
    print("🦅 Initializing Autonomous Edge Deployer")
    
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

    whm_token = os.environ.get("WHM_TOKEN")
    if not whm_token:
        print("❌ WHM_TOKEN environment variable is required.")
        return

    archives = glob.glob("build_artifacts/swarm_access_node_*.tar.gz")
    if not archives:
        print("❌ No build_artifacts TAR.GZ found. Run 'npm run build' first.")
        return
    latest_archive = max(archives, key=os.path.getctime)

    deploy_via_cpanel_isolated_session(mapping, host, whm_token, latest_archive)
    print("\n🦅 Zero-Trust Edge Distribution Complete!")

if __name__ == "__main__":
    main()
