#!/usr/bin/env bash
# Canonical npx wrapper for pinned Ruflo CLI.
set -euo pipefail
_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_REPO_ROOT="$(cd "$_LIB_DIR/../../.." && pwd)"
# shellcheck disable=SC1091
source "${RUFLO_VERSION_FILE:-$_REPO_ROOT/config/ruflo/version.env}"
: "${RUFLO_VERSION:?RUFLO_VERSION unset}"

ruflo_npx() {
  npx --yes "ruflo@${RUFLO_VERSION}" "$@"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  ruflo_npx "$@"
fi
