#!/usr/bin/env bash
# scripts/validators/email/email-gate-lean.sh
# Thin delegator — forwards to the canonical email-gate-lean.sh one level up.
# Preserves backward-compat: accepts positional $1 (old style) OR --file flag (new style).
# @business-context WSJF-52 / ADR-014: Single authoritative gate; no duplicate logic.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANONICAL_GATE="${SCRIPT_DIR}/../email-gate-lean.sh"

if [[ ! -f "$CANONICAL_GATE" ]]; then
    echo "[FATAL] Canonical gate not found: $CANONICAL_GATE" >&2
    exit 1
fi

# Convert positional-arg convention ($1 = filepath) to --file flag when needed
if [[ $# -gt 0 && "$1" != "--"* ]]; then
    exec "$CANONICAL_GATE" --file "$1" "${@:2}"
else
    exec "$CANONICAL_GATE" "$@"
fi
