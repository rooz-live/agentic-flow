#!/usr/bin/env bash
# TLD Dashboard Deploy — local-map before pipeline launch, --confirm gate for mutating phases.
# Runbook: docs/HOSTBILL_PIPELINE_SYNC_RUNBOOK.md (same guard pattern)
# Band: mutating ([SA]) for exec; passive for map/probe.
#
# Atomic dist/: exec runs its own pnpm Vite build into dist/ then packages. Do not run a second
# writer concurrently (e.g. `pnpm run trader:dev`, `vite build --watch`, overlapping `pnpm run build`,
# or a stuck background `vite` from another terminal) while exec --confirm is in progress — you risk
# a torn dist/, bogus evidence-manifest hash, and “deploy theater” where FA sees inconsistent assets.
# Stop watch/dev servers first; if `pnpm run build` appears hung (>~3 min with no “built in” line),
# cancel it, ensure no other Node/Vite is locking `dist/`, then run a single clean `pnpm run build`
# before exec. Let each remote extract finish before starting another local Vite/packaging cycle for the
# same docroot session — overlapping extract % with a fresh dist/ write is more deploy theater.
# Secondary TLD RCA (DNS/docs) can proceed in parallel; each mutating exec --confirm for a given tarball/SSH
# session stays single-thread per blast-radius policy.
#
# Usage:
#   ./deploy-tld-dashboard.sh map                              # local-only preflight
#   ./deploy-tld-dashboard.sh probe [--tld TLD|all]           # read-only SSH listing
#   ./deploy-tld-dashboard.sh exec --confirm [--tld TLD|all]  # build + deploy; default: all
#   ./deploy-tld-dashboard.sh rollback --confirm [--tld TLD]  # re-extract remote backup
#
# TLDs share one SSH host; use TLD_EDGE_TARGET=ubuntu@IP when root login is disabled.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EDGE_TARGET="${TLD_EDGE_TARGET:-root@23.92.79.2}"
EDGE_PORT="${TLD_EDGE_PORT:-22}"
EDGE_KEY="${TLD_EDGE_KEY:-}"
# When SSH user is non-root (e.g. ubuntu@host), set TLD_DEPLOY_REMOTE_SUDO=1 if passwordless sudo can mkdir/tar/chown under /home/*.
TLD_DEPLOY_REMOTE_SUDO="${TLD_DEPLOY_REMOTE_SUDO:-0}"
APP_NAME="agentic-flow-dashboard"
AUDIT_LOG="${TLD_DEPLOY_AUDIT_LOG:-$HOME/.goalie/tld-deploy-audit.jsonl}"

SSH_BASE_OPTS=(-p "$EDGE_PORT" -o IdentitiesOnly=yes)
SCP_BASE_OPTS=(-P "$EDGE_PORT" -o IdentitiesOnly=yes)
if [[ -n "$EDGE_KEY" ]]; then
  SSH_BASE_OPTS+=(-i "$EDGE_KEY")
  SCP_BASE_OPTS+=(-i "$EDGE_KEY")
fi

# Per-TLD remote paths (cPanel users: rooz / yo / tag / chat720 / etc — same SSH host)
declare -A TLD_PATHS=(
  [interface.rooz.live]="/home/rooz/interface.rooz.live"
  [law.rooz.live]="/home/rooz/public_html"
  [yo.life]="/home/yo/public_html"
  [hab.yo.life]="/home/yo/hab.yo.life"
  [pur.tag.vote]="/home/tag/pur.tag.vote"
  [file.720.chat]="/home/chat720/file.720.chat"
  [tag.ooo]="/home/tagooo/public_html"
  [decisioncall.com]="/home/decision/public_html"
  [epic.cab]="/home/epic/public_html"
  [eudmusic.com]="/home/eudmusic/public_html"
  [tag.vote]="/home/tag/public_html"
  [yoservice.com]="/home/yoservice/public_html"
)
declare -A TLD_USERS=(
  [interface.rooz.live]="rooz"
  [law.rooz.live]="rooz"
  [yo.life]="yo"
  [hab.yo.life]="yo"
  [pur.tag.vote]="tag"
  [file.720.chat]="chat720"
  [tag.ooo]="tagooo"
  [decisioncall.com]="decision"
  [epic.cab]="epic"
  [eudmusic.com]="eudmusic"
  [tag.vote]="tag"
  [yoservice.com]="yoservice"
)
ALL_TLDS=(interface.rooz.live law.rooz.live yo.life hab.yo.life pur.tag.vote file.720.chat tag.ooo decisioncall.com epic.cab eudmusic.com tag.vote yoservice.com)

usage() {
  cat <<'EOF'
TLD Dashboard Deploy (mutating [SA] — requires --confirm for exec/rollback)

  ./deploy-tld-dashboard.sh map
      Local-only preflight: verify dist/ has index.html + trading.html + public/*.html
      copies; print build hash; check SSH reachability. No remote writes.

  ./deploy-tld-dashboard.sh probe [--tld TLD|all]
      Read-only SSH: list each TLD remote path. Default: all.

  ./deploy-tld-dashboard.sh exec --confirm [--tld TLD|all]
      Full deploy: pnpm run TLD_VITE_BUILD_SCRIPT (default trader:build:tld) + copy public/*.html into dist/ + package
      + scp + ssh extract. One audit JSONL line per TLD. Default: all mapped TLDs.

  ./deploy-tld-dashboard.sh rollback --confirm [--tld TLD]
      Re-extract last /tmp backup on remote. Default: rooz.live.

Environment (passive vs mutating):
  Passive (map, probe): local dist check + optional SSH read-only listing.
  Mutating (exec, rollback): build, scp tarball, remote extract — requires exec --confirm.

  TLD_EDGE_TARGET          SSH user@host (default: root@23.92.79.2). Example: ubuntu@23.92.79.2
  TLD_EDGE_PORT            SSH port (default: 22). Example: 2222
  TLD_EDGE_KEY             Optional SSH private key path (-i)
  TLD_DEPLOY_REMOTE_SUDO   Set to 1 when SSH user is non-root but may sudo to write /home/*/… (passwordless sudo required)
  TLD_DEPLOY_AUDIT_LOG     Audit JSONL path (default: ~/.goalie/tld-deploy-audit.jsonl)
  TLD_VITE_BUILD_SCRIPT    Vite build npm script for exec (default: trader:build:tld). Use trader:build when docroots serve the app at / (see docs/analytics-tld.md §7).
EOF
}

tld_vite_build_script_resolve() {
  local s="${TLD_VITE_BUILD_SCRIPT:-trader:build:tld}"
  case "$s" in
    trader:build|trader:build:tld) echo "$s" ;;
    *)
      echo "[tld-deploy] FATAL: TLD_VITE_BUILD_SCRIPT must be 'trader:build' or 'trader:build:tld', got: $s" >&2
      exit 1
      ;;
  esac
}

audit_append() {
  local action="$1"; shift
  local log_dir; log_dir="$(dirname "$AUDIT_LOG")"
  mkdir -p "$log_dir"
  python3 -c '
import json, sys, datetime
path, action = sys.argv[1], sys.argv[2]
argv = sys.argv[3:]
rec = {
  "ts": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
  "component": "deploy-tld-dashboard",
  "action": action,
  "argv": argv,
}
with open(path, "a", encoding="utf-8") as f:
    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
' "$AUDIT_LOG" "$action" "$@"
}

# Resolve --tld flag from remaining args; echoes resolved TLD list (space-separated)
resolve_tlds() {
  local tld_arg="all"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tld) tld_arg="${2:-all}"; shift 2 ;;
      *) shift ;;
    esac
  done
  if [[ "$tld_arg" == "all" ]]; then
    echo "${ALL_TLDS[*]}"
  else
    if [[ -z "${TLD_PATHS[$tld_arg]+x}" ]]; then
      echo "[tld-deploy] unknown TLD: $tld_arg (valid: ${ALL_TLDS[*]})" >&2; exit 1
    fi
    echo "$tld_arg"
  fi
}

cmd_map() {
  local vite_script
  vite_script="$(tld_vite_build_script_resolve)"
  echo "[tld-deploy] map: checking local build state (TLD_VITE_BUILD_SCRIPT=$vite_script)..."
  local missing=0
  for f in dist/index.html dist/trading.html; do
    if [[ ! -f "$ROOT/$f" ]]; then
      echo "[tld-deploy] MISSING: $f — run 'pnpm run $vite_script' (or pnpm run build) first." >&2
      missing=1
    fi
  done
  shopt -s nullglob
  local html_files=("$ROOT/public/"*.html)
  shopt -u nullglob
  for src in "${html_files[@]}"; do
    local base; base="$(basename "$src")"
    if [[ ! -f "$ROOT/dist/$base" ]]; then
      echo "[tld-deploy] WARNING: dist/$base not yet copied from public/ (exec will copy it)."
    fi
  done
  [[ "$missing" -eq 1 ]] && exit 1
  local hash; hash=$(find "$ROOT/dist" -type f | sort | xargs md5 -q 2>/dev/null | md5 -q 2>/dev/null \
    || find "$ROOT/dist" -type f | sort | xargs md5sum | md5sum | cut -d' ' -f1)
  echo "[tld-deploy] dist/ OK — build hash: $hash"
  echo "[tld-deploy] SSH target: $EDGE_TARGET port ${EDGE_PORT}"
  echo "[tld-deploy] remote sudo for extract: ${TLD_DEPLOY_REMOTE_SUDO} (set TLD_DEPLOY_REMOTE_SUDO=1 for ubuntu@ + sudo)"
  for tld in "${ALL_TLDS[@]}"; do
    echo "[tld-deploy]   $tld → ${TLD_PATHS[$tld]}"
  done
  echo "[tld-deploy] Checking SSH reachability (non-blocking)..."
  ssh "${SSH_BASE_OPTS[@]}" -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$EDGE_TARGET" \
    "echo '[tld-deploy] SSH probe OK'" 2>/dev/null \
    && echo "[tld-deploy] map: SSH reachable ✓" \
    || echo "[tld-deploy] map: SSH unreachable — check VPN/key before exec --confirm"
  audit_append map
}

cmd_probe() {
  local tlds; read -ra tlds <<< "$(resolve_tlds "$@")"
  for tld in "${tlds[@]}"; do
    local path="${TLD_PATHS[$tld]}"
    echo "[tld-deploy] probe [$tld]: listing remote $path (read-only)..."
    if [[ "$TLD_DEPLOY_REMOTE_SUDO" == "1" ]]; then
      ssh "${SSH_BASE_OPTS[@]}" -o ConnectTimeout=10 "$EDGE_TARGET" \
        "sudo ls -lh '$path/' 2>/dev/null || echo '(empty or missing)'"
    else
      ssh "${SSH_BASE_OPTS[@]}" -o ConnectTimeout=10 "$EDGE_TARGET" \
        "ls -lh '$path/' 2>/dev/null || echo '(empty or missing)'"
    fi
  done
  audit_append probe "${tlds[*]}"
}

_deploy_one_tld() {
  local tld="$1"
  local deploy_path="${TLD_PATHS[$tld]}"
  local deploy_user="${TLD_USERS[$tld]}"
  echo "[tld-deploy] → deploying to $tld ($deploy_path)..."
  audit_append exec "$tld" "$EDGE_TARGET" "$deploy_path"

  scp "${SCP_BASE_OPTS[@]}" "$ROOT/${APP_NAME}.tar.gz" "$EDGE_TARGET:/tmp/${APP_NAME}-${tld}.tar.gz" \
    || { echo "[tld-deploy] FATAL: scp failed for $tld." >&2; return 1; }

  ssh "${SSH_BASE_OPTS[@]}" "$EDGE_TARGET" bash -s "$deploy_path" "${APP_NAME}-${tld}" "$deploy_user" "$TLD_DEPLOY_REMOTE_SUDO" << 'ENDSSH'
set -euo pipefail
DEPLOY_PATH="$1"; APP_NAME_TLD="$2"; DEPLOY_USER="$3"; USE_SUDO="$4"
SUDO=()
[[ "$USE_SUDO" == "1" ]] && SUDO=(sudo)
"${SUDO[@]}" mkdir -p "$DEPLOY_PATH"
cp "/tmp/${APP_NAME_TLD}.tar.gz" "/tmp/${APP_NAME_TLD}.tar.gz.bak" 2>/dev/null || true
"${SUDO[@]}" tar -xzf "/tmp/${APP_NAME_TLD}.tar.gz" -C "$DEPLOY_PATH/"
"${SUDO[@]}" chown -R "${DEPLOY_USER}:nobody" "$DEPLOY_PATH/" 2>/dev/null || true
"${SUDO[@]}" find "$DEPLOY_PATH/" -type d -exec chmod 755 {} \;
"${SUDO[@]}" find "$DEPLOY_PATH/" -type f -exec chmod 644 {} \;
rm -f "/tmp/${APP_NAME_TLD}.tar.gz"
echo "[tld-deploy] remote extraction complete for $DEPLOY_PATH"
ENDSSH

  audit_append exec-complete "$tld" "$EDGE_TARGET" "$deploy_path"
  echo "[tld-deploy] DEPLOY COMPLETE — $tld updated."
}

cmd_exec() {
  if [[ "${1:-}" != "--confirm" ]]; then
    echo "[tld-deploy] mutating deploy requires: exec --confirm [--tld TLD|all]" >&2
    exit 1
  fi
  shift
  local tlds; read -ra tlds <<< "$(resolve_tlds "$@")"

  echo "[tld-deploy] [1/4] Installing dependencies (pnpm)..."
  (cd "$ROOT" && pnpm install) || { echo "[tld-deploy] FATAL: pnpm install failed." >&2; exit 1; }

  local vite_script
  vite_script="$(tld_vite_build_script_resolve)"
  echo "[tld-deploy] [2/4] Building Vite assets ($vite_script)..."
  echo "[tld-deploy] NOTE: ensure no other process is writing dist/ (stop trader:dev / vite watch) before this step."
  (cd "$ROOT" && pnpm run "$vite_script") || { echo "[tld-deploy] FATAL: pnpm run $vite_script failed." >&2; exit 1; }

  echo "[tld-deploy] [2b] Copying public/*.html into dist/..."
  shopt -s nullglob
  local html_files=("$ROOT/public/"*.html)
  shopt -u nullglob
  if [[ ${#html_files[@]} -gt 0 ]]; then
    cp "${html_files[@]}" "$ROOT/dist/"
  else
    echo "[tld-deploy] [2b] No public/*.html files to copy; continuing."
  fi

  echo "[tld-deploy] [2c] Writing evidence manifest to dist/..."
  local build_hash; build_hash=$(find "$ROOT/dist" -type f | sort | xargs md5 -q 2>/dev/null | md5 -q 2>/dev/null \
    || find "$ROOT/dist" -type f | sort | xargs md5sum | md5sum | cut -d' ' -f1)
  cat > "$ROOT/dist/evidence-manifest.json" <<EOF
{
  "buildHash": "$build_hash",
  "deployTimestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "tldsTargeted": "${tlds[*]}"
}
EOF

  echo "[tld-deploy] [3/4] Packaging dist/ → ${APP_NAME}.tar.gz..."
  (cd "$ROOT/dist" && tar -czf "../${APP_NAME}.tar.gz" ./*)

  echo "[tld-deploy] [4/4] Deploying to TLDs: ${tlds[*]}..."
  local failed=()
  for tld in "${tlds[@]}"; do
    _deploy_one_tld "$tld" || failed+=("$tld")
  done

  rm -f "$ROOT/${APP_NAME}.tar.gz"

  if [[ ${#failed[@]} -gt 0 ]]; then
    echo "[tld-deploy] PARTIAL FAILURE — failed TLDs: ${failed[*]}" >&2
    exit 1
  fi
  echo "[tld-deploy] ALL DONE — deployed to: ${tlds[*]}"
}

cmd_rollback() {
  if [[ "${1:-}" != "--confirm" ]]; then
    echo "[tld-deploy] rollback requires: rollback --confirm [--tld TLD]" >&2
    exit 1
  fi
  shift
  local tlds; read -ra tlds <<< "$(resolve_tlds "$@")"
  for tld in "${tlds[@]}"; do
    local deploy_path="${TLD_PATHS[$tld]}"
    audit_append rollback "$tld" "$EDGE_TARGET" "$deploy_path"
    echo "[tld-deploy] rollback [$tld]: re-extracting backup on remote..."
    ssh "${SSH_BASE_OPTS[@]}" "$EDGE_TARGET" bash -s "$deploy_path" "${APP_NAME}-${tld}" "$TLD_DEPLOY_REMOTE_SUDO" << 'ENDSSH'
set -euo pipefail
DEPLOY_PATH="$1"; APP_NAME_TLD="$2"; USE_SUDO="$3"
SUDO=()
[[ "$USE_SUDO" == "1" ]] && SUDO=(sudo)
BAK="/tmp/${APP_NAME_TLD}.tar.gz.bak"
if [[ ! -f "$BAK" ]]; then
  echo "[tld-deploy] no backup found at $BAK — cannot rollback." >&2; exit 1
fi
"${SUDO[@]}" tar -xzf "$BAK" -C "$DEPLOY_PATH/"
echo "[tld-deploy] rollback complete from $BAK"
ENDSSH
    echo "[tld-deploy] rollback done for $tld."
  done
}

case "${1:-}" in
  map)              cmd_map ;;
  probe)            shift; cmd_probe "$@" ;;
  exec)             shift; cmd_exec "$@" ;;
  rollback)         shift; cmd_rollback "$@" ;;
  -h|--help|help)   usage ;;
  "")               usage; exit 1 ;;
  *)
    echo "[tld-deploy] unknown command: $1" >&2; usage >&2; exit 1 ;;
esac
