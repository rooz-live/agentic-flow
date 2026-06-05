#!/usr/bin/env bash
# install_cron_autopilot.sh — Install CLS/autopilot cron entries from config/cicd/cron_autopilot_trigger_map.yaml
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAP="$REPO_ROOT/config/cicd/cron_autopilot_trigger_map.yaml"
DRY="${CRON_AUTOPILOT_DRY_RUN:-1}"

if [[ ! -f "$MAP" ]]; then
  echo "ERROR: missing $MAP" >&2
  exit 1
fi

mkdir -p "$REPO_ROOT/logs"
export REPO_ROOT MAP DRY
python3 <<'PY'
import os, subprocess, sys
try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required", file=sys.stderr)
    sys.exit(1)

root = os.environ["REPO_ROOT"]
map_path = os.environ["MAP"]
dry = os.environ.get("DRY", "1") not in ("0", "false", "False")
doc = yaml.safe_load(open(map_path))
marker = doc.get("marker", "# agentic-flow-cron-autopilot")
lines = []
for t in doc.get("triggers", []):
    sched = t["schedule"]
    script = t["script"]
    log = t.get("log", f"logs/{t['id']}.log")
    env = t.get("env") or {}
    args = t.get("args") or []
    env_exports = " ".join(f'{k}="{v}"' for k, v in env.items())
    cmd = f"cd {root} && {env_exports} bash {script}"
    if args:
        cmd += " " + " ".join(args)
    cmd += f" >> {root}/{log} 2>&1"
    lines.append(f"{sched} {cmd} {marker} {t['id']}")

print("# Cron autopilot trigger map (generated)")
for line in lines:
    print(line)
if dry:
    print(f"# DRY_RUN: {len(lines)} entries not installed", file=sys.stderr)
    sys.exit(0)

try:
    existing = subprocess.check_output(["crontab", "-l"], text=True, stderr=subprocess.DEVNULL)
except subprocess.CalledProcessError:
    existing = ""
filtered = [l for l in existing.splitlines() if marker not in l]
new_crontab = "\n".join(filtered + lines) + "\n"
proc = subprocess.run(["crontab", "-"], input=new_crontab, text=True, capture_output=True)
if proc.returncode != 0:
    print(proc.stderr, file=sys.stderr)
    sys.exit(proc.returncode)
print(f"Installed {len(lines)} cron entries ({marker})")
PY
