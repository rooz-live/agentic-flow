#!/usr/bin/env bash
# WSJF-ranked disk stewardship — evidence + optional auto-remediate for R-DISK-01.
# Runbook: triggered automatically when disk_used_pct >= AF_DISK_LOW_PCT (default 90).
set -euo pipefail
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${REPO_ROOT:-$(git -C "$_SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null)}"
ROOT="${ROOT:-$(cd "$_SCRIPT_DIR/../.." && pwd)}"
cd "$ROOT"

LOW_PCT="${AF_DISK_LOW_PCT:-90}"
APPLY_PCT="${AF_DISK_APPLY_PCT:-92}"
AUTO_APPLY="${AF_DISK_STEWARD_AUTO_APPLY:-0}"
FORCE_APPLY="${AF_DISK_STEWARD_APPLY:-0}"

python3 - "$ROOT" "$LOW_PCT" "$APPLY_PCT" "$AUTO_APPLY" "$FORCE_APPLY" <<'PY'
import json, os, shutil, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(sys.argv[1])
low_pct = float(sys.argv[2])
apply_pct = float(sys.argv[3])
auto_apply = sys.argv[4] == "1"
force_apply = sys.argv[5] == "1"
out = root / ".goalie/evidence/disk_steward_latest.json"
out.parent.mkdir(parents=True, exist_ok=True)

RUNBOOK = [
    "1. bash scripts/cicd/disk_steward.sh  (probe; writes disk_steward_latest.json)",
    "2. AF_DISK_STEWARD_APPLY=1 bash scripts/cicd/disk_steward.sh  (npm cache + git gc)",
    "3. git fsck --full && git gc --prune=now  (repair pack corruption if fetch fails)",
    "4. prune ~/.npm, Docker images, Xcode derived data, large logs under reports/",
    "5. re-run: PYTHONPATH=$PWD python3 scripts/cicd/ruflo_doctor_roam.py",
]

def disk_pct(path: Path) -> float | None:
    try:
        u = shutil.disk_usage(path)
        return round((u.used / u.total) * 100.0, 2) if u.total else None
    except OSError:
        return None

def prune_ephemeral(root: Path) -> list[str]:
    applied: list[str] = []
    cron = root / ".goalie/cron_state"
    if cron.is_dir():
        import time
        cutoff = time.time() - 7 * 86400
        for p in cron.glob("*"):
            try:
                if p.is_file() and p.stat().st_mtime < cutoff:
                    p.unlink()
                    applied.append(f"pruned:{p.name}")
            except OSError:
                pass
    evidence = root / ".goalie/evidence"
    if evidence.is_dir():
        for p in evidence.glob("*.log"):
            try:
                if p.stat().st_size > 1_000_000:
                    p.write_text("", encoding="utf-8")
                    applied.append(f"truncated:{p.name}")
            except OSError:
                pass
    return applied

pct = disk_pct(root)
candidates = [
    {"id": "git-fsck", "wsjf": 9.5, "path": str(root / ".git"), "action": "git fsck --connectivity-only"},
    {"id": "git-gc", "wsjf": 9.0, "path": str(root / ".git"), "action": "git gc --prune=now"},
    {"id": "npm-cache", "wsjf": 8.5, "path": str(Path.home() / ".npm"), "action": "npm cache clean --force"},
    {"id": "goalie-cron-state", "wsjf": 7.0, "path": str(root / ".goalie/cron_state"), "action": "prune cron_state >7d"},
    {"id": "ephemeral-evidence", "wsjf": 6.5, "path": str(root / ".goalie/evidence"), "action": "truncate large *.log"},
]
candidates.sort(key=lambda x: -x["wsjf"])

fsck_rc = None
fsck_err = ""
try:
    proc = subprocess.run(
        ["git", "-C", str(root), "fsck", "--no-progress", "--connectivity-only"],
        capture_output=True, text=True, timeout=60, check=False,
    )
    fsck_rc = proc.returncode
    fsck_err = (proc.stderr or proc.stdout or "")[-500:]
except (OSError, subprocess.TimeoutExpired) as exc:
    fsck_rc = 125
    fsck_err = str(exc)

low = pct is not None and pct >= low_pct
should_apply = force_apply or (auto_apply and pct is not None and pct >= apply_pct)
applied: list[str] = []
failed: list[dict] = []

if should_apply and pct is not None:
    # Record outcomes honestly: subprocess.run(check=False) swallows non-zero exits,
    # so a command may have FAILED. Only mark "applied" on rc==0; otherwise surface
    # the failure (with a repair hint) so the evidence never claims success falsely.
    npm_rc = subprocess.run(["npm", "cache", "clean", "--force"], check=False, timeout=180).returncode
    if npm_rc == 0:
        applied.append("npm-cache")
    else:
        failed.append({"id": "npm-cache", "rc": npm_rc})
    # NOTE: --prune=now on a repo with a corrupt/truncated packfile or dangling refs
    # fails to repack (and risks dropping unreachable objects). If git-gc fails, the
    # operator should follow runbook step 3 (git fsck --full && git gc --prune=now).
    gc_rc = subprocess.run(["git", "-C", str(root), "gc", "--prune=now"], check=False, timeout=300).returncode
    if gc_rc == 0:
        applied.append("git-gc")
    else:
        failed.append({"id": "git-gc", "rc": gc_rc,
                       "hint": "git repo may be corrupt; run: git fsck --full && git gc --prune=now"})
    applied.extend(prune_ephemeral(root))
    pct = disk_pct(root)

payload = {
    "schema": "disk_steward.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "disk_used_pct": pct,
    "low_threshold_pct": low_pct,
    "apply_threshold_pct": apply_pct,
    "inbox_zero_gate": pct is not None and pct < low_pct,
    "roam_risk": "R-DISK-01" if low else None,
    "triggered_low_disk": low,
    "auto_apply_ran": should_apply,
    "runbook": RUNBOOK,
    "wsjf_ranked_actions": candidates,
    "git_fsck_rc": fsck_rc,
    "git_fsck_tail": fsck_err,
    "applied": applied,
    "failed": failed,
}
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"path": str(out), "disk_used_pct": pct, "inbox_zero_gate": payload["inbox_zero_gate"], "low": low}))

if os.environ.get("AF_DISK_STEWARD_ENFORCE", "0") == "1" and low:
    raise SystemExit(2)
raise SystemExit(0)
PY
