#!/usr/bin/env bash
# Ruflo doctor blockers → ROAM evidence (invert: fix infra before enabling intelligence).
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
EVIDENCE="$ROOT/.goalie/evidence/ruflo_doctor_latest.json"
mkdir -p "$(dirname "$EVIDENCE")"
APPLY="${RUFLO_DOCTOR_APPLY:-0}"

RUFLO_VERSION="${RUFLO_VERSION:-$(grep -E '^RUFLO_VERSION=' "$ROOT/config/ruflo/version.env" | cut -d= -f2)}"
python3 - "$ROOT" "$EVIDENCE" "$APPLY" "$RUFLO_VERSION" <<'PY'
import json, os, shutil, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(sys.argv[1])
out = Path(sys.argv[2])
apply = sys.argv[3] == "1"
ruflo_ver = sys.argv[4]
now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

blockers = []
warnings = []
actions = []

def roam(item_id, disposition, note, severity="medium"):
    return {
        "id": item_id,
        "disposition": disposition,
        "note": note,
        "severity": severity,
    }

# Disk (doctor failure)
try:
    usage = shutil.disk_usage(root)
    pct = round(100 * (1 - usage.free / usage.total), 1)
    if pct >= 95:
        blockers.append(roam("R-DISK-01", "Accepted", f"disk {pct}% used — HNSW/plugin installs blocked", "critical"))
    elif pct >= 90:
        warnings.append(roam("R-DISK-01", "Mitigated", f"disk {pct}% used — cleanup before graph index", "high"))
except OSError as e:
    warnings.append(roam("R-DISK-01", "Accepted", str(e), "medium"))

# Stale daemon PID
pid_file = root / ".claude-flow/daemon.pid"
if pid_file.is_file():
    try:
        pid = int(pid_file.read_text().strip())
        os.kill(pid, 0)
    except (OSError, ValueError):
        warnings.append(roam("R-DAEMON-01", "Owned", "stale daemon.pid", "low"))
        if apply:
            pid_file.unlink(missing_ok=True)
            actions.append("removed_stale_daemon_pid")

# npx cache freshness hint
warnings.append(roam("R-NPX-01", "Mitigated", "clear ~/.npm/_npx if ruflo version stale", "low"))
if apply and os.environ.get("RUFLO_DOCTOR_CLEAR_NPX") == "1":
    npx_cache = Path.home() / ".npm/_npx"
    if npx_cache.is_dir():
        shutil.rmtree(npx_cache, ignore_errors=True)
        actions.append("cleared_npx_cache")

# agentic-flow package
if not (root / "node_modules/agentic-flow").exists():
    warnings.append(roam("R-AGF-01", "Accepted", "agentic-flow not installed — routing fallbacks", "medium"))

# encryption at rest
if os.environ.get("CLAUDE_FLOW_ENCRYPT_AT_REST", "0") != "1":
    warnings.append(roam("R-ENC-01", "Accepted", "encryption at rest off for memory stores", "medium"))

# Run ruflo doctor (best-effort)
doctor_exit = 0
doctor_summary = ""
try:
    proc = subprocess.run(
        ["npx", "-y", "ruflo@3.15.0", "doctor"],
        cwd=str(root),
        capture_output=True,
        text=True,
        timeout=120,
    )
    doctor_exit = proc.returncode
    doctor_summary = (proc.stdout or "")[-2000:]
except (OSError, subprocess.TimeoutExpired) as e:
    doctor_exit = 1
    doctor_summary = str(e)

payload = {
    "schema": "ruflo_doctor.v1",
    "timestamp": now,
    "doctor_exit": doctor_exit,
    "blockers": blockers,
    "warnings": warnings,
    "actions_applied": actions,
    "apply_mode": apply,
    "doctor_tail": doctor_summary,
    "inbox_zero_gate": len(blockers) == 0,
}
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"path": str(out), "blockers": len(blockers), "warnings": len(warnings)}))
sys.exit(1 if blockers else 0)
PY
