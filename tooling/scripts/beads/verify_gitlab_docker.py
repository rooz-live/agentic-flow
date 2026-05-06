#!/usr/bin/env python3
"""
Domain D: Sovereign Verification - GitLab Docker Health Gate
Responsibility: Binary health check of GitLab CE container.
Checks: container running, HTTP responsive, DB project count, disk headroom.
Exit 0 = healthy. Exit 1 = failed check (with reason). Writes artifact.
"""
import os
import subprocess
import sys
import json
import glob
from datetime import datetime, timezone

CONTAINER_NAME = "gitlab-web-1"
STX_HOST = "23.92.79.2"
STX_PORT = "2222"
STX_USER = "ubuntu"
SSH_KEY = os.path.expanduser("~/pem/stx-aio-0.pem")
ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "../../../.goalie/evidence")


def ssh_exec(cmd: str, timeout: int = 20) -> tuple[int, str]:
    ssh = [
        "ssh", "-4", "-p", STX_PORT, "-i", SSH_KEY,
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", f"ConnectTimeout={timeout}",
        "-o", "BatchMode=yes",
        f"{STX_USER}@{STX_HOST}", cmd
    ]
    r = subprocess.run(ssh, capture_output=True, text=True, timeout=timeout + 5)
    return r.returncode, (r.stdout + r.stderr).strip()


def check(name: str, ok: bool, detail: str, checks: list) -> bool:
    status = "PASS" if ok else "FAIL"
    symbol = "✓" if ok else "✗"
    print(f"  [{symbol}] {name}: {detail}")
    checks.append({"check": name, "status": status, "detail": detail})
    return ok


def main():
    print("--> [verify_gitlab_docker] Binary health gate starting...")
    checks = []
    failed = 0
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    # 1. Container running
    rc, out = ssh_exec(f"sudo docker inspect --format='{{{{.State.Status}}}}' {CONTAINER_NAME} 2>/dev/null")
    running = "running" in out
    if not check("container_running", running, out.strip() or "not found", checks):
        failed += 1

    # 2. HTTP health endpoint
    rc, out = ssh_exec(
        f"sudo docker exec {CONTAINER_NAME} curl -sk -o /dev/null -w '%{{http_code}}' http://localhost/-/health 2>/dev/null"
    )
    http_ok = "200" in out or "ok" in out.lower()
    if not check("http_health_endpoint", http_ok, f"HTTP {out.strip()}", checks):
        failed += 1

    # 3. DB project count
    rc, out = ssh_exec(
        f"sudo docker exec {CONTAINER_NAME} gitlab-psql -t -d gitlabhq_production "
        f"-c \"SELECT COUNT(*) FROM projects;\" 2>/dev/null | tr -d ' '"
    )
    count_str = out.strip().split("\n")[-1].strip()
    try:
        count = int(count_str)
    except ValueError:
        count = -1
    db_ok = count > 0
    if not check("db_project_count", db_ok, f"{count} projects", checks):
        failed += 1

    # 4. Disk headroom on /var (GitLab data)
    rc, out = ssh_exec("df /var/lib/docker 2>/dev/null | awk 'NR==2{print $5}' | tr -d '%'")
    try:
        used_pct = int(out.strip())
    except ValueError:
        used_pct = 100
    disk_ok = used_pct < 90
    if not check("disk_headroom", disk_ok, f"{used_pct}% used on /var/lib/docker", checks):
        failed += 1

    # 5. Backup file exists locally
    backup_dir = "/Volumes/cPanelBackups/gitlab_aws"
    backups = glob.glob(
        os.path.join(backup_dir, "sovereignty_*_gitlab_backup.tar")
    )
    backup_ok = len(backups) > 0
    latest = os.path.basename(max(backups, key=os.path.getctime)) if backups else "none"
    if not check("local_backup_exists", backup_ok, latest, checks):
        failed += 1

    # Write artifact
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    artifact = {
        "run_id": f"verify-gitlab-docker-{ts}",
        "utc": ts,
        "exit_code": failed,
        "checks": checks,
        "summary": "PASS" if failed == 0 else f"FAIL ({failed} checks failed)"
    }
    artifact_path = os.path.join(ARTIFACT_DIR, f"verify_gitlab_docker_{ts}.json")
    with open(artifact_path, "w") as f:
        json.dump(artifact, f, indent=2)

    print(f"\n  Artifact: {artifact_path}")
    if failed == 0:
        print("✅ verify_gitlab_docker: ALL GREEN")
    else:
        print(f"❌ verify_gitlab_docker: {failed} check(s) FAILED")

    sys.exit(min(failed, 1))


if __name__ == "__main__":
    main()
