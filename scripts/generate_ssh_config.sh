#!/usr/bin/env bash
set -euo pipefail

HOST_ALIAS="${STX_AIO_ALIAS:-stx-aio-0}"
CONFIG_OUT="${CONFIG_OUT:-config/ssh_config}"
IDENTITY_FILE="${STX_AIO_IDENTITY_FILE:-$HOME/pem/stx-aio-0.pem}"
USER_VAL="${STX_AIO_USER:-sysadmin}"
PORT_VAL="${STX_AIO_PORT:-22}"
DRY_RUN=0
QUIET=0

usage() {
  echo "Usage: $0 [--dry-run|-n] [--quiet|-q] [--config-out PATH] [--alias NAME]"
  echo "Env: STX_AIO_HOSTNAME, STX_AIO_USER, STX_AIO_PORT, STX_AIO_IDENTITY_FILE, STX_AIO_ALIAS"
}

while [ "${1-}" != "" ]; do
  case "$1" in
    --dry-run|-n) DRY_RUN=1 ;;
    --quiet|-q) QUIET=1 ;;
    --config-out) shift; CONFIG_OUT="${1:-$CONFIG_OUT}" ;;
    --alias) shift; HOST_ALIAS="${1:-$HOST_ALIAS}" ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" 1>&2; usage; exit 2 ;;
  esac
  shift
done

HOSTNAME_VAL="${STX_AIO_HOSTNAME:-}"

find_hostname_from_ssh_config() {
  if command -v ssh >/dev/null 2>&1; then
    if ssh -G "$HOST_ALIAS" >/dev/null 2>&1; then
      ssh -G "$HOST_ALIAS" | awk '/^hostname /{print $2; exit}'
      return
    fi
  fi
  if [ -f "$HOME/.ssh/config" ]; then
    awk -v host="$HOST_ALIAS" '
      $1=="Host" {
        inblock=0
        for (i=2;i<=NF;i++) if ($i==host) inblock=1
      }
      inblock && tolower($1)=="hostname" { print $2; exit }
    ' "$HOME/.ssh/config"
  fi
}

if [ -z "$HOSTNAME_VAL" ]; then
  HOSTNAME_VAL="$(find_hostname_from_ssh_config || true)"
fi

if [ -z "$HOSTNAME_VAL" ]; then
  echo "[generate_ssh_config] Hostname not found. Set STX_AIO_HOSTNAME or define Host $HOST_ALIAS in ~/.ssh/config" 1>&2
  exit 1
fi

if [ ! -f "$IDENTITY_FILE" ]; then
  echo "[generate_ssh_config] Warning: identity file not found at $IDENTITY_FILE" 1>&2
fi

mkdir -p "$(dirname "$CONFIG_OUT")"

IDENTITY_CFG="$IDENTITY_FILE"
case "$IDENTITY_CFG" in
  "$HOME"/*) IDENTITY_CFG="~${IDENTITY_CFG#$HOME}";;
esac

CFG_CONTENT="Include ~/.ssh/config
Host $HOST_ALIAS
  HostName $HOSTNAME_VAL
  User $USER_VAL
  Port $PORT_VAL
  IdentityFile $IDENTITY_CFG
  IdentitiesOnly yes
  ServerAliveInterval 60
  ServerAliveCountMax 3
  StrictHostKeyChecking accept-new
  UserKnownHostsFile ~/.ssh/known_hosts
"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "$CFG_CONTENT"
  exit 0
fi

if [ -f "$CONFIG_OUT" ]; then
  cp "$CONFIG_OUT" "${CONFIG_OUT}.bak.$(date +%s)"
fi

printf "%s" "$CFG_CONTENT" > "$CONFIG_OUT"
chmod 600 "$CONFIG_OUT"

if [ "$QUIET" -ne 1 ]; then
  echo "[generate_ssh_config] Wrote $CONFIG_OUT for $HOST_ALIAS -> $HOSTNAME_VAL"
fi

exit 0
