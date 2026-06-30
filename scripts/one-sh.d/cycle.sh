#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
shift
_CYCLE_ARGS=()
for _arg in "$@"; do
  case "$_arg" in
    --upstream-full) export AF_UPSTREAM_FULL=1 ;;
    --upstream-parallel) export AF_UPSTREAM_PARALLEL=1 ;;
    *) _CYCLE_ARGS+=("$_arg") ;;
  esac
done
exec bash "$ROOT_DIR/scripts/cicd/cycle_tick.sh" "${_CYCLE_ARGS[@]}"
