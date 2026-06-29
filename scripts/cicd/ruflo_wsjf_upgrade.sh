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

# Anti-fragility: best-effort side-effects (evidence write, ROAM sync, memory graph)
# must NOT be blanket-masked with `|| true`. We capture their exit code and fold a
# non-zero result into UPGRADE_BEST_EFFORT_EXIT, which the caller surfaces after the
# primary gate (doctor / slow contracts) has run. Mirrors tick_post_hooks.sh
# `_tick_post_enforce_fail` — visible, controlled, never silently swallowed.
UPGRADE_BEST_EFFORT_EXIT=0
_surf_best_effort() {
  local label="$1" ec="$2"
  if [[ "$ec" -ne 0 ]]; then
    echo "WARN: best-effort step '$label' failed (exit=$ec)" >&2
    UPGRADE_BEST_EFFORT_EXIT="$ec"
  fi
  return 0
}

write_upgrade_evidence() {
  set +e
  python3 "$ROOT/scripts/cicd/ruflo_upgrade_evidence.py"
  local rc
  rc=$?
  set -e
  _surf_best_effort "ruflo_upgrade_evidence" "$rc"
}

echo "=== ruflo_wsjf_upgrade: exec WSJF backlog ==="
bash "$ROOT/scripts/cicd/exec_wsjf_ruflo.sh"

echo "=== ruflo_wsjf_upgrade: doctor (ROAM blockers) ==="
set +e
PYTHONPATH="$ROOT" AF_SKIP_OP_READ="${AF_SKIP_OP_READ:-1}" python3 "$ROOT/scripts/cicd/ruflo_doctor_roam.py"
DOC_EXIT=$?
python3 "$ROOT/scripts/ruflo/sync_doctor_roam_risks.py"
SYNC_EXIT=$?
set -e
_surf_best_effort "sync_doctor_roam_risks" "$SYNC_EXIT"
write_upgrade_evidence

if [[ "$DOCTOR_ONLY" == "1" ]]; then
  echo "ruflo_wsjf_upgrade: --doctor-only complete (doctor_exit=$DOC_EXIT, best_effort_exit=$UPGRADE_BEST_EFFORT_EXIT)"
  # Primary gate (doctor) wins; if it passed, surface any best-effort side-effect failure.
  if [[ "$DOC_EXIT" -ne 0 ]]; then
    exit "$DOC_EXIT"
  fi
  exit "$UPGRADE_BEST_EFFORT_EXIT"
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
import os, subprocess, sys
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
failed = []
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
    rc = subprocess.run(cmd, cwd=str(root), check=False, timeout=180).returncode
    if rc != 0:
        failed.append(pkg)
if failed:
    print("plugin install failures:", failed, file=sys.stderr)
    if os.environ.get("AF_PLUGIN_INSTALL_ENFORCE", "0") == "1":
        raise SystemExit(1)
# offline/mock: at least one manifest plugin dir present when enforce+skip network
if os.environ.get("AF_PLUGIN_INSTALL_VERIFY", "0") == "1":
    import yaml as _y
    doc = _y.safe_load(manifest.read_text(encoding="utf-8")) or {}
    pkgs = [p.get("package") for p in doc.get("plugins") or [] if p.get("package")]
    present = [pkg for pkg in pkgs if (root / ".claude-flow/plugins" / pkg).is_dir()]
    if not present and os.environ.get("AF_SKIP_NETWORK", "0") == "1":
        mock = root / ".claude-flow/plugins/.mock-installed"
        mock.parent.mkdir(parents=True, exist_ok=True)
        mock.write_text("offline-mock\n", encoding="utf-8")
        print("mock plugin marker for offline verify")
    elif not present:
        raise SystemExit(1)
    print("plugin verify ok:", len(present), "installed")
PY
elif [[ "$INSTALL_PLUGINS" == "1" ]]; then
  echo "SKIP plugin install (AF_SKIP_NETWORK=1)"
fi

if [[ "$APPLY_MEMORY" == "1" ]]; then
  echo "=== ruflo_wsjf_upgrade: memory graph config ==="
  set +e
  python3 "$ROOT/scripts/ruflo/apply_memory_graph.py"
  MEM_EXIT=$?
  set -e
  _surf_best_effort "apply_memory_graph" "$MEM_EXIT"
fi

write_upgrade_evidence

if [[ "$CI_SLOW" == "1" ]]; then
  echo "=== ruflo_wsjf_upgrade: ci-slow tier ==="
  # Slow contracts: propagate their real exit code (no masking). Known-broken
  # contracts are skipped by NAME via AF_SLOW_SKIP_CONTRACTS inside run_all.sh.
  set +e
  AF_SKIP_OP_READ=1 AF_SKIP_NETWORK=1 bash "$ROOT/tests/cicd/run_all.sh" slow
  SLOW_EXIT=$?
  set -e
  if [[ "$SLOW_EXIT" -ne 0 ]]; then
    echo "BLOCK: ci-slow contracts failed (exit=$SLOW_EXIT)" >&2
    exit "$SLOW_EXIT"
  fi
  # Contracts green — surface any best-effort side-effect failure (anti-fragility:
  # a broken evidence/ROAM/memory step must not stay hidden behind `|| true`).
  if [[ "$UPGRADE_BEST_EFFORT_EXIT" -ne 0 ]]; then
    echo "BLOCK: best-effort side-effect failed (exit=$UPGRADE_BEST_EFFORT_EXIT) — not masked" >&2
    exit "$UPGRADE_BEST_EFFORT_EXIT"
  fi
  echo "ruflo_wsjf_upgrade: ci-slow complete (contracts green, side-effects green)"
  exit 0
fi

echo "ruflo_wsjf_upgrade: done"
exit "$UPGRADE_BEST_EFFORT_EXIT"
