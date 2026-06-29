#!/usr/bin/env bash
# Exec WSJF-ranked Ruflo PI backlog: doctor → plugins → memory graph (invert: infra before intelligence).
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
# shellcheck source=scripts/ruflo/lib/ruflo_npx.sh
source "$ROOT/scripts/ruflo/lib/ruflo_npx.sh"

DOCTOR_ONLY=0
CI_SLOW=0
INSTALL_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --doctor-only) DOCTOR_ONLY=1 ;;
    --ci-slow) CI_SLOW=1 ;;
    --install-plugins) INSTALL_ONLY=1 ;;
    -h|--help)
      echo "usage: $0 [--doctor-only|--ci-slow|--install-plugins]"
      exit 0
      ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

INSTALL_PLUGINS="${RUFLO_PLUGIN_INSTALL:-0}"
if [[ "$INSTALL_ONLY" == "1" ]]; then
  INSTALL_PLUGINS=1
fi
APPLY_MEMORY="${RUFLO_MEMORY_GRAPH_APPLY:-0}"
SKIP_NETWORK="${AF_SKIP_NETWORK:-0}"

write_upgrade_evidence() {
  python3 "$ROOT/scripts/cicd/ruflo_upgrade_evidence.py" || true
}

echo "=== ruflo_wsjf_upgrade: exec WSJF backlog ==="
bash "$ROOT/scripts/cicd/exec_wsjf_ruflo.sh"

echo "=== ruflo_wsjf_upgrade: doctor (ROAM blockers) ==="
set +e
PYTHONPATH="$ROOT" AF_SKIP_OP_READ="${AF_SKIP_OP_READ:-1}" python3 "$ROOT/scripts/cicd/ruflo_doctor_roam.py"
DOC_EXIT=$?
set -e
python3 "$ROOT/scripts/ruflo/sync_doctor_roam_risks.py" || true
write_upgrade_evidence

if [[ "$DOCTOR_ONLY" == "1" ]]; then
  echo "ruflo_wsjf_upgrade: --doctor-only complete (doctor_exit=$DOC_EXIT)"
  exit "$DOC_EXIT"
fi

if [[ "$DOC_EXIT" -ne 0 ]]; then
  echo "WARN: doctor blockers present (exit=$DOC_EXIT); skipping plugin/memory apply"
  if [[ "$CI_SLOW" == "1" ]]; then
    echo "BLOCK: ci-slow aborted on doctor gate"
    exit "$DOC_EXIT"
  fi
  exit "$DOC_EXIT"
fi

if [[ "$INSTALL_PLUGINS" == "1" && "$SKIP_NETWORK" != "1" ]]; then
  echo "=== ruflo_wsjf_upgrade: install plugins (WSJF order from config/ruflo/plugins.yaml) ==="
  python3 - "$ROOT" <<'PY'
import subprocess, sys
from pathlib import Path
try:
    import yaml
except ImportError:
    raise SystemExit(0)
root = Path(sys.argv[1])
manifest = root / "config/ruflo/plugins.yaml"
if not manifest.is_file():
    raise SystemExit(0)
doc = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
plugins = sorted(doc.get("plugins") or [], key=lambda x: -float(x.get("wsjf", 0)))
ver = "latest"
vf = root / "config/ruflo/version.env"
if vf.is_file():
    for line in vf.read_text(encoding="utf-8").splitlines():
        if line.startswith("RUFLO_VERSION="):
            ver = line.split("=", 1)[1].strip()
for p in plugins:
    pkg = p.get("package", "")
    if not pkg:
        continue
    dest = root / ".claude-flow/plugins" / pkg
    if dest.is_dir():
        print(f"skip installed {pkg}")
        continue
    cmd = ["npx", "--yes", f"ruflo@{ver}", "plugins", "install", "-n", pkg]
    print("install", pkg)
    subprocess.run(cmd, cwd=str(root), check=False, timeout=180)
PY
elif [[ "$INSTALL_PLUGINS" == "1" ]]; then
  echo "SKIP plugin install (AF_SKIP_NETWORK=1)"
fi

if [[ "$APPLY_MEMORY" == "1" ]]; then
  echo "=== ruflo_wsjf_upgrade: memory graph config ==="
  python3 "$ROOT/scripts/ruflo/apply_memory_graph.py" || true
fi

write_upgrade_evidence

if [[ "$CI_SLOW" == "1" ]]; then
  echo "=== ruflo_wsjf_upgrade: ci-slow tier ==="
  bash "$ROOT/tests/cicd/run_all.sh" slow || true
  exit 0
fi

echo "ruflo_wsjf_upgrade: done"
