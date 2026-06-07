#!/usr/bin/env bash
# Mail wave gate — repo DoR/DoD first, then wave overlay from MAIL_WAVE_DOR_DOD.yaml
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
MODE="${1:---dor}"
WAVE_FLAG="${2:-}"
WAVE_ID="${3:-all}"
if [[ "$WAVE_FLAG" == "--wave" ]]; then :; elif [[ "${2:-}" == "--wave" ]]; then WAVE_ID="${3:-all}"; else WAVE_ID="all"; fi

echo "=== Mail overlay ($MODE wave=$WAVE_ID) ==="
python3 - "$REPO_ROOT" "$MODE" "$WAVE_ID" <<'PY'
import subprocess, sys, yaml
from pathlib import Path
root, mode, wave = Path(sys.argv[1]), sys.argv[2], sys.argv[3].lower()
cfg = yaml.safe_load((root / "deploy/mail/MAIL_WAVE_DOR_DOD.yaml").read_text())
wave_map = {"a": "wave_a_mailstore", "b": "wave_b_stalwart", "c": "wave_c_comet", "d": "wave_d_macos", "e": "wave_e_edge", "all": "all_waves"}

def run_cmd(cmd):
    return subprocess.run(["bash", "-lc", cmd], cwd=root).returncode == 0

if mode == "--dor":
    subprocess.run(["bash", "-lc", cfg["inherits"]["dor"]], cwd=root, check=True)
    for item in cfg["mail_dor"].get("all_waves", []):
        cmd = item.get("command")
        if cmd and not item.get("manual"):
            ok = run_cmd(cmd)
            print(f"{item['id']}: {'OK' if ok else 'FAIL'}")
            if not ok:
                sys.exit(1)
    if wave != "all":
        key = wave_map.get(wave)
        section = cfg["mail_dor"].get(key, {})
        for item in section.get("checks", []):
            cmd = item.get("command")
            if cmd:
                run_cmd(cmd)
    print("Mail DoR overlay PASS")
elif mode == "--dod":
    subprocess.run(["bash", "-lc", "./scripts/dod-gate.sh --post-task"], cwd=root)
    bash = root / "scripts/mail/mail-stabilization-score.sh"
    if bash.is_file():
        import os as _os
        _env = dict(_os.environ)
        _env["MAIL_STAB_SKIP_REMOTE"] = "1"
        subprocess.run(["bash", str(bash)], cwd=root, env=_env)
    targets = []
    if wave == "all":
        for k, v in cfg["mail_dod"].items():
            if k.startswith("wave_"):
                targets.append((k, v))
    else:
        key = wave_map.get(wave)
        if key and key in cfg["mail_dod"]:
            targets = [(key, cfg["mail_dod"][key])]
    for name, section in targets:
        if section.get("deferred"):
            print(f"SKIP {name} (deferred)")
            continue
        for item in section.get("checks", []):
            iid = item.get("id", "?")
            if item.get("manual"):
                print(f"{iid}: MANUAL (FA)")
                continue
            cmd = item.get("command")
            if not cmd:
                continue
            ok = run_cmd(cmd)
            print(f"{iid}: {'OK' if ok else 'FAIL'}")
            if not ok and not item.get("local_only"):
                sys.exit(1)
    print("Mail DoD overlay PASS (manual checks may remain)")
else:
    print("Usage: mail-wave-dor-dod.sh --dor|--dod [--wave a|c|e|d|all]")
    sys.exit(1)
PY
