#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-23.92.79.2}"
PORTS="${PORTS:-${PORT:-2222},22}"
REMOTE_USER="${REMOTE_USER:-root}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/starlingx_key}"
BOOTSTRAP_SCRIPT="${BOOTSTRAP_SCRIPT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/bootstrap_ubuntu_flamingo.sh}"
BACKUP_TARBALL="${BACKUP_TARBALL:-$HOME/stx-backup-20251231/pre-reprovision-backup.tar.gz}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-10}"
OS_WAIT_TIMEOUT_SECONDS="${OS_WAIT_TIMEOUT_SECONDS:-0}"
BOOTSTRAP_TIMEOUT="${BOOTSTRAP_TIMEOUT:-60m}"
ENABLE_UFW="${ENABLE_UFW:-false}"

REMOTE_BOOTSTRAP="/root/bootstrap_ubuntu_flamingo.sh"
REMOTE_BACKUP="/root/pre-reprovision-backup.tar.gz"

ssh_base_opts=(
  -i "$SSH_KEY"
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=5
  -o ServerAliveInterval=10
  -o ServerAliveCountMax=3
)

scp_base_opts=(
  -i "$SSH_KEY"
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
)

PORT=""
ssh_opts=()
scp_opts=()

rebuild_opts() {
  ssh_opts=(
    -p "$PORT"
    "${ssh_base_opts[@]}"
  )

  scp_opts=(
    -P "$PORT"
    "${scp_base_opts[@]}"
  )
}

now_epoch() {
  date +%s
}

wait_deadline_epoch="0"
if [ "$OS_WAIT_TIMEOUT_SECONDS" != "0" ]; then
  wait_deadline_epoch="$(( $(now_epoch) + OS_WAIT_TIMEOUT_SECONDS ))"
fi

can_ssh_port() {
  local p="$1"
  ssh -p "$p" "${ssh_base_opts[@]}" "$REMOTE_USER@$HOST" "true" >/dev/null 2>&1
}

read_os_port() {
  local p="$1"
  ssh -p "$p" "${ssh_base_opts[@]}" "$REMOTE_USER@$HOST" 'set -e; . /etc/os-release; echo "${ID:-unknown} ${VERSION_ID:-unknown}"'
}

echo "Monitoring $HOST for Ubuntu 22.04 readiness (ports: $PORTS)..."

IFS=',' read -r -a ports <<< "$PORTS"

while true; do
  found_any="false"
  for p in "${ports[@]}"; do
    p="${p// /}"
    [ -n "$p" ] || continue
    if can_ssh_port "$p"; then
      found_any="true"
      os_out="$(read_os_port "$p" || true)"
      if echo "$os_out" | grep -qE '^ubuntu[[:space:]]+22\.04'; then
        PORT="$p"
        rebuild_opts
        echo "Detected target OS: $os_out (ssh port $PORT)"
        break 2
      fi
      echo "SSH reachable on port $p but OS not ready yet: $os_out"
    fi
  done

  if [ "$found_any" != "true" ]; then
    echo "SSH not reachable yet on $HOST (ports: $PORTS)"
  fi

  if [ "$OS_WAIT_TIMEOUT_SECONDS" != "0" ] && [ "$(now_epoch)" -ge "$wait_deadline_epoch" ]; then
    echo "ERROR: Timed out waiting for Ubuntu readiness after ${OS_WAIT_TIMEOUT_SECONDS}s"
    exit 2
  fi

  sleep "$INTERVAL_SECONDS"
done

if [ -z "$PORT" ]; then
  echo "ERROR: did not detect a working SSH port"
  exit 2
fi

if [ ! -f "$BOOTSTRAP_SCRIPT" ]; then
  echo "ERROR: BOOTSTRAP_SCRIPT not found: $BOOTSTRAP_SCRIPT"
  exit 3
fi

bootstrap_sha_local="$(shasum -a 256 "$BOOTSTRAP_SCRIPT" | awk '{print $1}')"

echo "Transferring bootstrap script..."
scp "${scp_opts[@]}" "$BOOTSTRAP_SCRIPT" "$REMOTE_USER@$HOST:$REMOTE_BOOTSTRAP"
ssh "${ssh_opts[@]}" "$REMOTE_USER@$HOST" "chmod +x '$REMOTE_BOOTSTRAP'"
bootstrap_sha_remote="$(ssh "${ssh_opts[@]}" "$REMOTE_USER@$HOST" "sha256sum '$REMOTE_BOOTSTRAP' | awk '{print \$1}'" || true)"

if [ -n "$bootstrap_sha_remote" ] && [ "$bootstrap_sha_remote" != "$bootstrap_sha_local" ]; then
  echo "ERROR: bootstrap script checksum mismatch"
  echo " local:  $bootstrap_sha_local"
  echo " remote: $bootstrap_sha_remote"
  exit 4
fi

echo "Transferring backup tarball (optional)..."
if [ -f "$BACKUP_TARBALL" ]; then
  scp "${scp_opts[@]}" "$BACKUP_TARBALL" "$REMOTE_USER@$HOST:$REMOTE_BACKUP"
else
  echo "WARN: BACKUP_TARBALL not found locally, skipping: $BACKUP_TARBALL"
fi

echo "Executing bootstrap with timeout=$BOOTSTRAP_TIMEOUT ..."
ssh "${ssh_opts[@]}" "$REMOTE_USER@$HOST" "set -euo pipefail; timeout '$BOOTSTRAP_TIMEOUT' env BACKUP_TARBALL='$REMOTE_BACKUP' ENABLE_UFW='$ENABLE_UFW' '$REMOTE_BOOTSTRAP' 2>&1 | tee /var/log/bootstrap.log"

echo "Bootstrap finished. Summary:"
ssh "${ssh_opts[@]}" "$REMOTE_USER@$HOST" "set -e; . /etc/os-release; echo OS=\"$PRETTY_NAME\"; ip -br addr show bond0 || true; systemctl is-active ssh || true; systemctl is-active containerd || true; systemctl is-active docker || true; /opt/kolla-flamingo/bin/kolla-ansible --version 2>/dev/null || true"
