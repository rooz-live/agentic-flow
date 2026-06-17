#!/usr/bin/env bash
# pre-push-guard.sh - refuse pushing the $HOME-rooted repo to unknown/public remotes
# Mitigates ROAM R-2026-022 (home-dir git root push exposure).
# git invokes a pre-push hook as: <hook> <remote-name> <remote-url>  (refs on stdin)
# Override once: AF_ALLOW_PUSH=1 git push ...
# Allowlist: substrings (one per line) in .goalie/push_allowlist.txt
set -euo pipefail

REMOTE_NAME="${1:-}"
REMOTE_URL="${2:-}"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"

# Only guard the home-rooted mega-repo; other repos push normally.
if [ -z "$ROOT" ] || [ "$ROOT" != "$HOME" ]; then
  exit 0
fi

if [ "${AF_ALLOW_PUSH:-0}" = "1" ]; then
  echo "pre-push-guard: AF_ALLOW_PUSH=1 override -> allowing push to $REMOTE_URL" >&2
  exit 0
fi

ALLOWLIST_FILE="${AF_PUSH_ALLOWLIST:-$ROOT/.goalie/push_allowlist.txt}"
allowed=0
if [ -f "$ALLOWLIST_FILE" ]; then
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    case "$line" in \#*) continue ;; esac
    case "$REMOTE_URL" in *"$line"*) allowed=1 ;; esac
  done < "$ALLOWLIST_FILE"
fi

if [ "$allowed" != "1" ]; then
  echo "pre-push-guard: BLOCKED push to '$REMOTE_NAME' ($REMOTE_URL)" >&2
  echo "  Reason: \$HOME-rooted repo may only push to allowlisted private remotes." >&2
  echo "  Fix: add a URL substring to $ALLOWLIST_FILE" >&2
  echo "  Or override once: AF_ALLOW_PUSH=1 git push ..." >&2
  exit 1
fi

exit 0
