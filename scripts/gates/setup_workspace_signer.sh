#!/usr/bin/env bash
# Generate a local workspace signing keypair for coherence_results.json (pre-commit).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
KEY="$ROOT/.goalie/scorecards/workspace_signer"
PUB="$ROOT/.goalie/scorecards/workspace_signer.pub"
ALLOWED="$ROOT/.goalie/scorecards/allowed_signers.local"
PRINCIPAL="${AF_LOCAL_SIGN_PRINCIPAL:-workspace@local}"

if [[ -f "$KEY" ]]; then
  echo "workspace_signer already exists"
  exit 0
fi

ssh-keygen -t ed25519 -f "$KEY" -N "" -C "workspace-coherence-signer"
PUBKEY=$(cat "$PUB")
{
  echo "# workspace signer — do not commit private key (workspace_signer)"
  echo "$PRINCIPAL namespaces=\"scorecard-gate\" $PUBKEY workspace-coherence"
} >> "$ALLOWED"
chmod 600 "$KEY"
echo "Created $KEY and appended principal to $ALLOWED"
