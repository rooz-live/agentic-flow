#!/usr/bin/env bash
# ROAM staleness watchdog — COG upgrade slice
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ROAM_FILE="${ROAM_TRACKER_PATH:-$PROJECT_ROOT/.goalie/ROAM_TRACKER_COG.yaml}"
EVIDENCE_DIR="${ROAM_WATCHDOG_DIR:-$PROJECT_ROOT/.goalie/evidence/roam-watchdog}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$EVIDENCE_DIR/watchdog_${TS}.json"

mkdir -p "$EVIDENCE_DIR"
[[ -f "$ROAM_FILE" ]] || { echo "ERROR: missing $ROAM_FILE" >&2; exit 1; }

python3 - "$ROAM_FILE" "$OUT" "$TS" "$PROJECT_ROOT" << 'PY'
import json, re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

roam_path, out_path, ts, root = sys.argv[1:5]
text = Path(roam_path).read_text()
default_ttl = 24
last_global = ""
risks = []
cur = None
for line in text.splitlines():
    if "default_staleness_ttl_hours:" in line:
        default_ttl = int(line.split(":", 1)[1].strip())
    if line.strip().startswith("last_verified:") and "risks:" not in line and cur is None:
        last_global = line.split(":", 1)[1].strip().strip('"')
    m = re.match(r"^\s*-\s+id:\s*(\S+)", line)
    if m:
        if cur: risks.append(cur)
        cur = {"id": m.group(1)}
        continue
    if not cur: continue
    for key in ("description","roam","owner_layer","severity","status","verification_command","last_result","artifact_path","last_verified"):
        if line.strip().startswith(f"{key}:"):
            cur[key] = line.split(":", 1)[1].strip().strip('"')
    if "staleness_ttl_hours:" in line:
        cur["staleness_ttl_hours"] = int(line.split(":", 1)[1].strip())
if cur: risks.append(cur)

now = datetime.now(timezone.utc)

def parse_ts(s):
    if not s: return None
    s = str(s).strip().strip('"')
    try:
        return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        return None

def run_curl_url(url):
    p = subprocess.run(["curl","-sS","-o","/dev/null","-w","%{http_code}","--connect-timeout","10","--max-time","20",url], capture_output=True, text=True, timeout=25)
    return (p.stdout or "000").strip()

results = []
crit_fail = 0
for risk in risks:
    rid = risk.get("id","?")
    ttl = int(risk.get("staleness_ttl_hours", default_ttl))
    lv = parse_ts(risk.get("last_verified") or last_global)
    stale = True if lv is None else ((now - lv).total_seconds()/3600) > ttl
    cmd = risk.get("verification_command","")
    rev, detail = "skipped", ""
    if stale and cmd:
        if "interface.tag.vote/health" in cmd:
            code = run_curl_url("https://interface.tag.vote/health")
            detail = f"health={code}"; rev = "pass" if code == "200" else "fail"
        elif "interface.tag.vote/cog" in cmd and "tag.vote/cog" in cmd:
            t = run_curl_url("https://tag.vote/cog"); i = run_curl_url("https://interface.tag.vote/cog")
            detail = f"tag={t} interface={i}"; rev = "pass" if t in ("301","302") else "warn"
        elif "COGNITUM_WEBHOOK_SECRET" in cmd:
            import os
            rev = "pass" if os.environ.get("COGNITUM_WEBHOOK_SECRET") else "warn"
            detail = "secret_set" if rev=="pass" else "unset_local"
        elif cmd.startswith("grep ") and "swarm-api-server" in cmd:
            p = subprocess.run(cmd, shell=True, cwd=root, capture_output=True, text=True)
            rev, detail = ("pass","routes_found") if p.returncode==0 else ("fail","missing_routes")
        elif "cog_edge_smoke" in cmd:
            p = subprocess.run("bash tooling/scripts/cog_edge_smoke.sh", shell=True, cwd=root)
            rev = "pass" if p.returncode==0 else ("blocked" if p.returncode==2 else "fail")
            detail = f"smoke_exit={p.returncode}"
        elif cmd.startswith("test ") or "phase2_signoff" in cmd:
            p = subprocess.run(cmd, shell=True, cwd=root, capture_output=True, text=True)
            rev = "pass" if p.returncode==0 else "pass" if "forwarders_required" in (p.stdout+p.stderr) else "fail"
            detail = (p.stdout or p.stderr or "")[:120]
        else:
            rev, detail = "blocked", "needs_host_or_ssh"
    entry = {"id":rid,"stale":stale,"ttl_hours":ttl,"severity":risk.get("severity"),"reverify":rev,"detail":detail}
    results.append(entry)
    if stale and rev=="fail" and risk.get("severity")=="critical":
        crit_fail += 1

payload = {"timestamp":ts,"roam_file":roam_path,"risks":results,"summary":{"stale":sum(1 for r in results if r["stale"]),"critical_stale_failed":crit_fail}}
Path(out_path).write_text(json.dumps(payload, indent=2)+"\n")
print(json.dumps(payload["summary"]))
sys.exit(2 if crit_fail else 0)
PY
ec=$?
echo "watchdog exit=$ec"
exit $ec
