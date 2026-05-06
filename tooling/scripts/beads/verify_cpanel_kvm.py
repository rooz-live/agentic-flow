#!/usr/bin/env python3
"""
Domain D: Sovereign Verification - cPanel KVM Health Gate
Responsibility: Binary health check of cPanel/WHM KVM guest.
Checks: SSH reachable via jump, WHM API responds, mail services up, disk OK.
Exit 0 = healthy. Exit 1 = failed. Writes artifact.
"""
import os
import subprocess
import sys
import json
from datetime import datetime, timezone

STX_HOST = "23.92.79.2"
STX_PORT = "2222"
STX_USER = "ubuntu"
CPANEL_GUEST = "192.168.122.237"
SSH_KEY = os.path.expanduser("~/pem/stx-aio-0.pem")
ARTIFACT_DIR = os.path.join(
    os.path.dirname(__file__), "../../../.goalie/evidence"
)


def ssh_cpanel(cmd: str, timeout: int = 20) -> tuple:
    proxy = (
        f"ssh -4 -i {SSH_KEY} -p {STX_PORT} "
        f"-o StrictHostKeyChecking=accept-new -W %h:%p "
        f"{STX_USER}@{STX_HOST}"
    )
    full = [
        "ssh", "-4", "-i", SSH_KEY,
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", f"ConnectTimeout={timeout}",
        "-o", "BatchMode=yes",
        "-o", f"ProxyCommand={proxy}",
        f"root@{CPANEL_GUEST}", cmd
    ]
    r = subprocess.run(
        full, capture_output=True, text=True, timeout=timeout + 10
    )
    return r.returncode, (r.stdout + r.stderr).strip()


def check(name: str, ok: bool, detail: str, checks: list) -> bool:
    symbol = "✓" if ok else "✗"
    status = "PASS" if ok else "FAIL"
    print(f"  [{symbol}] {name}: {detail}")
    checks.append({"check": name, "status": status, "detail": detail})
    return ok


def main():
    print("--> [verify_cpanel_kvm] Binary health gate starting...")
    checks = []
    failed = 0
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    # 1. SSH reachable via jump
    rc, out = ssh_cpanel("echo SSH_OK && hostname", timeout=20)
    ssh_ok = rc == 0 and "SSH_OK" in out
    hostname = out.replace("SSH_OK", "").strip().split("\n")[-1]
    if not check("ssh_reachable", ssh_ok, hostname or out[:60], checks):
        failed += 1

    if not ssh_ok:
        # Can't run further checks without SSH
        _write_artifact(ts, failed, checks)
        sys.exit(1)

    # 2. WHM API responds
    rc, out = ssh_cpanel(
        "whmapi1 version 2>/dev/null | grep 'version:' | head -1"
    )
    whm_ok = rc == 0 and "version" in out
    if not check("whm_api", whm_ok, out.strip()[:80], checks):
        failed += 1

    # 3. Mail services running
    rc, out = ssh_cpanel(
        "systemctl is-active exim dovecot 2>/dev/null | tr '\n' ' '"
    )
    mail_ok = out.count("active") >= 2
    if not check("mail_services", mail_ok, out.strip(), checks):
        failed += 1

    # 4. Disk headroom
    rc, out = ssh_cpanel(
        "df / 2>/dev/null | awk 'NR==2{print $5}' | tr -d '%'"
    )
    try:
        used_pct = int(out.strip())
    except ValueError:
        used_pct = 100
    disk_ok = used_pct < 90
    if not check("disk_headroom", disk_ok, f"{used_pct}% used on /", checks):
        failed += 1

    # 5. cPhulkd running (brute-force protection)
    rc, out = ssh_cpanel("systemctl is-active cphulkd 2>/dev/null")
    hulk_ok = rc == 0 and "active" in out
    if not check("cphulkd_active", hulk_ok, out.strip(), checks):
        failed += 1

    _write_artifact(ts, failed, checks)
    if failed == 0:
        print("✅ verify_cpanel_kvm: ALL GREEN")
    else:
        print(f"❌ verify_cpanel_kvm: {failed} check(s) FAILED")
    sys.exit(min(failed, 1))


def _write_artifact(ts: str, failed: int, checks: list):
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    artifact = {
        "run_id": f"verify-cpanel-kvm-{ts}",
        "utc": ts,
        "exit_code": min(failed, 1),
        "checks": checks,
        "summary": "PASS" if failed == 0 else f"FAIL ({failed} failed)"
    }
    path = os.path.join(ARTIFACT_DIR, f"verify_cpanel_kvm_{ts}.json")
    with open(path, "w") as f:
        json.dump(artifact, f, indent=2)
    print(f"\n  Artifact: {path}")


if __name__ == "__main__":
    main()
