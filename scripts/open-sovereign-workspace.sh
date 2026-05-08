#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WS_DIR="$ROOT_DIR/config/workspaces"

usage() {
  echo "Usage: $0 <ui|rust|cross>"
  echo "  ui    -> $WS_DIR/ui.code-workspace"
  echo "  rust  -> $WS_DIR/rust-core.code-workspace"
  echo "  cross -> $WS_DIR/cross-context-minimal.code-workspace"
}

if [[ $# -ne 1 ]]; then
  usage
  exit 2
fi

case "$1" in
  ui)
    workspace="$WS_DIR/ui.code-workspace"
    ;;
  rust)
    workspace="$WS_DIR/rust-core.code-workspace"
    ;;
  cross)
    workspace="$WS_DIR/cross-context-minimal.code-workspace"
    ;;
  *)
    usage
    exit 2
    ;;
esac

if [[ ! -f "$workspace" ]]; then
  echo "Workspace file missing: $workspace" >&2
  exit 1
fi

if command -v cursor >/dev/null 2>&1; then
  opener="cursor"
elif command -v windsurf >/dev/null 2>&1; then
  opener="windsurf"
elif command -v code >/dev/null 2>&1; then
  opener="code"
else
  echo "No supported editor CLI found (cursor|windsurf|code)." >&2
  echo "Open manually: $workspace" >&2
  exit 1
fi

echo "Opening $workspace with $opener"
"$opener" "$workspace"
