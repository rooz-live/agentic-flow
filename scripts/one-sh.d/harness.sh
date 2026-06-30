#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
shift
if [[ $# -eq 0 || "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
  cat <<'HELP'
Usage: ./scripts/one.sh harness <doctor|evolve|evolve:dry|init> [args...]

  doctor      MetaHarness kernel + host adapter health (@metaharness/kernel)
  evolve      Darwin evolution loop (real sandbox; @metaharness/darwin)
  evolve:dry  Darwin evolution dry-run (mock sandbox)
  init        Scaffold harness workspace
HELP
  [[ $# -eq 0 ]] && exit 1 || exit 0
fi
exec npm --prefix "$ROOT_DIR/apps/agent-harness" run "$@"
