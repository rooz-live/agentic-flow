#!/usr/bin/env python3
"""Upstream Repository Upgrade Validation Engine.

Queries remote repository heads, executes corresponding local test suites,
and produces compliance validation logs.
"""

import os
import sys
import json
import subprocess
import datetime

def get_remote_head(url, branch):
    """Fetch the latest commit hash for a remote repository branch using git ls-remote."""
    try:
        cmd = ["git", "ls-remote", url, f"refs/heads/{branch}"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15, check=True)
        output = result.stdout.strip()
        if output:
            parts = output.split()
            return parts[0] # Return the SHA
    except Exception as e:
        # Fallback for rate-limits or offline states (ensures anti-fragility)
        print(f"⚠️ Warning: Could not fetch remote for {url} ({e})")
    return "offline_or_cached_sha"

def run_integration_check(command, project_root):
    """Execute a local integration test suite and return success status and output."""
    try:
        print(f"--> Executing test command: {command}")
        result = subprocess.run(command, shell=True, cwd=project_root, capture_output=True, text=True, timeout=120)
        success = (result.returncode == 0)
        return success, result.stdout + "\n" + result.stderr
    except Exception as e:
        return False, str(e)

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    config_path = os.path.join(project_root, "config", "cicd", "upstream_registry.json")
    
    if not os.path.exists(config_path):
        print(f"❌ Configuration not found: {config_path}")
        sys.exit(1)
        
    with open(config_path, "r") as f:
        config = json.load(f)
        
    repos = config.get("repositories", [])
    reports = []
    all_passed = True
    
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    print(f"🔍 Starting Upstream Upgrade Validation Cycle at {timestamp}")
    
    for repo in repos:
        if not repo.get("active", False):
            continue
            
        repo_id = repo["id"]
        url = repo["url"]
        branch = repo["branch"]
        test_cmd = repo["integration_test"]
        
        print(f"\nProcessing upstream target: {repo_id} ({url})")
        remote_sha = get_remote_head(url, branch)
        print(f"Latest remote commit SHA: {remote_sha}")
        
        # Test-First: Execute validation tests to verify compatibility
        passed, output_log = run_integration_check(test_cmd, project_root)
        print(f"Result: {'PASS' if passed else 'FAIL'}")
        
        reports.append({
            "repository_id": repo_id,
            "url": url,
            "branch": branch,
            "latest_commit_sha": remote_sha,
            "integration_status": "PASS" if passed else "FAIL",
            "timestamp": timestamp
        })
        
        if not passed:
            all_passed = False
            
    # Write evidence log
    evidence_dir = os.path.join(project_root, ".goalie", "evidence", "upgrades")
    os.makedirs(evidence_dir, exist_ok=True)
    report_file = os.path.join(evidence_dir, f"upgrades_report_{timestamp}.json")
    
    final_output = {
        "status": "PASS" if all_passed else "FAIL",
        "timestamp": timestamp,
        "results": reports
    }
    
    with open(report_file, "w") as f:
        json.dump(final_output, f, indent=2)
        f.write("\n")
        
    print(f"\n🎉 Validation cycle complete. Report written to: {report_file}")
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
