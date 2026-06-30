#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
shift
if [[ $# -eq 0 || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'HELP'
Usage: ./scripts/one.sh weight-eft [probe|--status]

  probe     Write weight_eft_gate_latest.json (degraded=true until package ships)
  --status  Print the latest gate evidence JSON (offline-safe)
HELP
  [[ $# -eq 0 ]] && exit 1 || exit 0
fi
CMD="${1:-probe}"; shift
case "$CMD" in
  probe) exec python3 "$ROOT_DIR/scripts/cicd/weight_eft_gate.py" "$@" ;;
  --status)
    EVIDENCE="$ROOT_DIR/.goalie/evidence/weight_eft_gate_latest.json"
    python3 "$ROOT_DIR/scripts/cicd/weight_eft_gate.py" >/dev/null || true
    [[ -f "$EVIDENCE" ]] && cat "$EVIDENCE" || { echo "no weight-eft evidence yet"; exit 1; }
    ;;
  *) echo "unknown weight-eft command: $CMD" >&2; exit 2 ;;
esac
