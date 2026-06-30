#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
shift
if [[ $# -eq 0 || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'HELP'
Usage: ./scripts/one.sh agenticow [probe|--mcp-smoke]

  probe       Write agenticow_probe_latest.json (offline-safe)
  --mcp-smoke Online MCP smoke when AF_SKIP_NETWORK=0
HELP
  [[ $# -eq 0 ]] && exit 1 || exit 0
fi
CMD="${1:-probe}"; shift
case "$CMD" in
  probe) exec python3 "$ROOT_DIR/scripts/ruflo/agenticow_probe.py" "$@" ;;
  --mcp-smoke) AF_AGENTICOW_MCP_SMOKE=1 exec python3 "$ROOT_DIR/scripts/ruflo/agenticow_probe.py" --mcp-smoke "$@" ;;
  *) echo "unknown agenticow command: $CMD" >&2; exit 2 ;;
esac
