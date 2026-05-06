#!/usr/bin/env python3
"""
Domain C: Physical CI/CD Telemetry Boundary - glab Auth via OIDC
Responsibility: Ensures the Swarm is authenticated with the physical GitLab instance.
Produces `incident_stub.json` upon failure to eliminate silent pipeline deaths.
Produces `auth_glab_cli_*.json` upon success to authorize hourly CI velocity.
"""
import os
import subprocess
import sys
import json
from datetime import datetime, timezone

ARTIFACT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.goalie/evidence"))

def main():
    print("--> [auth_glab_cli] Engaging CI Hourly Velocity Boundary...")
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    
    # 1. Check if glab is installed
    if subprocess.run(["command", "-v", "glab"], shell=True, capture_output=True).returncode != 0:
        print("  ❌ glab CLI not found on the active node.")
        drop_incident_stub("GLAB_NOT_INSTALLED", "The glab CLI is missing, preventing CI/CD velocity.", ts)
        sys.exit(1)
        
    # 2. Extract Token
    token = os.environ.get("GITLAB_TOKEN")
    host = os.environ.get("GITLAB_HOST", "git.tag.ooo")
    
    if not token:
        # Fallback to local integration env if missing
        env_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env.integration"))
        if os.path.exists(env_file):
            with open(env_file, "r") as f:
                for line in f:
                    if line.startswith("GITLAB_TOKEN="):
                        token = line.strip().split("=", 1)[1].strip('"').strip("'")
                        break
                        
    if not token:
        print("  ❌ GITLAB_TOKEN missing from environment and .env.integration.")
        drop_incident_stub("MISSING_OIDC_TOKEN", "OIDC/Masked token for GitLab is missing.", ts)
        sys.exit(1)
        
    # 3. Authenticate
    print(f"  [+] Authenticating glab CLI to {host} via masked token...")
    auth_cmd = ["glab", "auth", "login", "--hostname", host, "--token", token]
    auth_res = subprocess.run(auth_cmd, capture_output=True, text=True)
    
    # 4. Verify Auth
    status_cmd = ["glab", "auth", "status"]
    status_res = subprocess.run(status_cmd, capture_output=True, text=True)
    
    if status_res.returncode != 0 or host not in status_res.stdout and host not in status_res.stderr:
        print("  ❌ glab authentication failed.")
        error_msg = status_res.stderr.strip() or status_res.stdout.strip()
        print(f"  [!] Details: {error_msg}")
        drop_incident_stub("GLAB_AUTH_REJECTED", f"glab auth status failed: {error_msg}", ts)
        sys.exit(1)
        
    print(f"  ✅ glab authenticated successfully against {host}.")
    
    # Write Success Artifact
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    artifact = {
        "run_id": f"auth-glab-cli-{ts}",
        "utc": ts,
        "exit_code": 0,
        "host": host,
        "summary": "PASS (Authenticated)"
    }
    artifact_path = os.path.join(ARTIFACT_DIR, f"auth_glab_cli_{ts}.json")
    with open(artifact_path, "w") as f:
        json.dump(artifact, f, indent=2)
        
    print(f"\n  Artifact: {artifact_path}")
    sys.exit(0)

def drop_incident_stub(error_code, description, ts):
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    incident = {
        "incident_id": f"INC-GLAB-{ts}",
        "utc": ts,
        "exit_code": 1,
        "error_code": error_code,
        "description": description,
        "mitigation": "Provide valid GITLAB_TOKEN via OIDC/1Password and ensure glab is installed."
    }
    stub_path = os.path.join(ARTIFACT_DIR, f"incident_stub_{ts}.json")
    with open(stub_path, "w") as f:
        json.dump(incident, f, indent=2)
    print(f"  🚨 Incident Stub Generated: {stub_path}")

if __name__ == "__main__":
    main()
