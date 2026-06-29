#!/usr/bin/env bash
# WSJF-ranked disk stewardship — evidence for R-DISK-01 / git health.
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"

python3 - "$ROOT" <<'PY'
import json, os, shutil, subprocess
from datetime import datetime, timezone
from pathlib import Path

root = Path(__import__("sys").argv[1])
out = root / ".goalie/evidence/disk_steward_latest.json"
out.parent.mkdir(parents=True, exist_ok=True)

def disk_pct(path: Path) -> float | None:
    try:
        u = shutil.disk_usage(path)
        return round((u.used / u.total) * 100.0, 2) if u.total else None
    except OSError:
        return None

pct = disk_pct(root)
candidates = [
    {"id": "git-fsck", "wsjf": 9.5, "path": str(root / ".git"), "action": "git fsck --full"},
    {"id": "git-gc", "wsjf": 9.0, "path": str(root / ".git"), "action": "git gc --prune=now"},
    {"id": "npm-cache", "wsjf": 8.5, "path": str(Path.home() / ".npm"), "action": "npm cache clean --force"},
    {"id": "goalie-cron-state", "wsjf": 7.0, "path": str(root / ".goalie/cron_state"), "action": "prune cron_state >7d"},
]
candidates.sort(key=lambda x: -x["wsjf"])

fsck_rc = None
fsck_err = ""
try:
    proc = subprocess.run(
        ["git", "-C", str(root), "fsck", "--no-progress", "--connectivity-only"],
        capture_output=True, text=True, timeout=120, check=False,
    )
    fsck_rc = proc.returncode
    fsck_err = (proc.stderr or proc.stdout or "")[-500:]
except (OSError, subprocess.TimeoutExpired) as exc:
    fsck_rc = 125
    fsck_err = str(exc)

payload = {
    "schema": "disk_steward.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "disk_used_pct": pct,
    "inbox_zero_gate": pct is not None and pct < 90,
    "roam_risk": "R-DISK-01" if pct and pct >= 90 else None,
    "wsjf_ranked_actions": candidates,
    "git_fsck_rc": fsck_rc,
    "git_fsck_tail": fsck_err,
}
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"path": str(out), "disk_used_pct": pct, "inbox_zero_gate": payload["inbox_zero_gate"]}))

if os.environ.get("AF_DISK_STEWARD_APPLY", "0") != "1" or not pct or pct < 92:
    raise SystemExit(0)

applied = []
subprocess.run(["npm", "cache", "clean", "--force"], check=False, timeout=180)
applied.append("npm-cache")
subprocess.run(["git", "-C", str(root), "gc", "--prune=now"], check=False, timeout=300)
applied.append("git-gc")
payload["applied"] = applied
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY
