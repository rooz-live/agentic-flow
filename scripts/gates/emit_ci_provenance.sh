#!/usr/bin/env bash
# Sign git HEAD for scorecard gate_integrity (AF_CI_PROVENANCE_*).
# Requires AF_CI_SIGNING_KEY (private ed25519, multiline) and optional AF_CI_SIGNING_PRINCIPAL.
# Public key must appear in .goalie/scorecards/allowed_signers.
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"

PRINCIPAL="${AF_CI_SIGNING_PRINCIPAL:-ci@agentic-flow.github}"
KEY_MATERIAL="${AF_CI_SIGNING_KEY:-}"

# shellcheck source=scripts/cicd/lib/is_ci_env.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../cicd/lib" && pwd)/is_ci_env.sh"

if [[ -z "$KEY_MATERIAL" ]]; then
  if is_ci_env; then
    echo "emit_ci_provenance: BLOCK — CI requires AF_CI_SIGNING_KEY for provenance" >&2
    exit 1
  fi
  echo "emit_ci_provenance: skip (local — no AF_CI_SIGNING_KEY)"
  exit 0
fi

if ! git rev-parse HEAD >/dev/null 2>&1; then
  echo "emit_ci_provenance: ERROR — not a git repository" >&2
  exit 1
fi

HEAD="$(git rev-parse HEAD)"
KEY_FILE="$(mktemp)"
trap 'rm -f "$KEY_FILE"' EXIT
umask 077
printf '%s\n' "$KEY_MATERIAL" >"$KEY_FILE"

SIG="$(printf "%s" "$HEAD" | ssh-keygen -Y sign -f "$KEY_FILE" -n scorecard-gate 2>/dev/null || true)"
if [[ -z "$SIG" ]]; then
  echo "emit_ci_provenance: ERROR — ssh-keygen sign failed for HEAD $HEAD" >&2
  exit 1
fi

export AF_CI_PROVENANCE_PRINCIPAL="$PRINCIPAL"
export AF_CI_PROVENANCE_SIGNATURE="$SIG"

if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "AF_CI_PROVENANCE_PRINCIPAL=$PRINCIPAL" >>"$GITHUB_ENV"
  {
    echo "AF_CI_PROVENANCE_SIGNATURE<<PROVENANCE_EOF"
    echo "$SIG"
    echo "PROVENANCE_EOF"
  } >>"$GITHUB_ENV"
fi

echo "emit_ci_provenance: signed HEAD ${HEAD:0:12}… as $PRINCIPAL"
