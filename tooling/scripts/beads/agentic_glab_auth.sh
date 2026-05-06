#!/usr/bin/env bash
# =========================================================================
# DOMAIN: FOURTH-WAVE SOVEREIGNTY PHASE GATE
# RESPONSIBILITY: GitLab CLI Autonomous Auth Bead
# =========================================================================
# Hydrates the glab CLI with the exact token secured in .env.integration.
# Fails securely with an incident stub if authentication breaks.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.integration"
ARTIFACT_DIR="$ROOT_DIR/.goalie/evidence"
ts=$(date -u +'%Y%m%dT%H%M%SZ')

mkdir -p "$ARTIFACT_DIR"

echo "--> [glab_auth] Engaging Autonomous GitLab CLI Identity Bead..."

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env.integration not found. Cannot hydrate GitLab identity."
    cat <<EOF > "$ARTIFACT_DIR/incident_stub_${ts}.json"
{
  "incident_id": "INC-GLAB-${ts}",
  "utc": "${ts}",
  "exit_code": 1,
  "error_code": "ENV_MISSING",
  "description": ".env.integration substrate is missing.",
  "mitigation": "Run eval \$(op signin) && ./tooling/scripts/agentic_password_sync_orchestrator.sh"
}
EOF
    exit 1
fi

source "$ENV_FILE"

if [ -z "${GITLAB_TOKEN:-}" ]; then
    echo "❌ GITLAB_TOKEN missing from .env.integration."
    cat <<EOF > "$ARTIFACT_DIR/incident_stub_${ts}.json"
{
  "incident_id": "INC-GLAB-${ts}",
  "utc": "${ts}",
  "exit_code": 1,
  "error_code": "TOKEN_MISSING",
  "description": "GITLAB_TOKEN not found in environment.",
  "mitigation": "Re-run agentic_password_sync_orchestrator.sh"
}
EOF
    exit 1
fi

# Configure glab CLI securely (masked)
export GITLAB_TOKEN="$GITLAB_TOKEN"
# Force host to standard gitlab.com or git.tag.ooo based on target. Default to gitlab.com if not set.
export GITLAB_HOST="gitlab.com"

# Check authentication
echo "  [+] Checking glab authentication status..."
if ! glab auth status &> /dev/null; then
    echo "  [+] Connecting glab to $GITLAB_HOST..."
    echo "$GITLAB_TOKEN" | glab auth login --hostname "$GITLAB_HOST" --stdin
else
    echo "  [+] glab is already authenticated."
fi

# Verify reality
GLAB_USER=$(glab auth status 2>&1 | grep "Logged in to" || true)

if [ -z "$GLAB_USER" ]; then
    echo "❌ glab authentication failed."
    cat <<EOF > "$ARTIFACT_DIR/incident_stub_${ts}.json"
{
  "incident_id": "INC-GLAB-${ts}",
  "utc": "${ts}",
  "exit_code": 1,
  "error_code": "AUTH_FAILED",
  "description": "glab auth status did not verify identity.",
  "mitigation": "Check token permissions and validity."
}
EOF
    exit 1
fi

echo "✅ glab identity secured: $GLAB_USER"

# Produce Physical Artifact
ARTIFACT_PATH="$ARTIFACT_DIR/agentic_glab_auth_${ts}.json"
cat <<EOF > "$ARTIFACT_PATH"
{
  "gate": "agentic_glab_auth",
  "run_id": "glab-${ts}",
  "utc": "${ts}",
  "exit_code": 0,
  "identity_status": "authenticated",
  "hash": "$(git rev-parse HEAD 2>/dev/null || echo 'no-git')"
}
EOF

# Symlink standard naming
ln -sf "agentic_glab_auth_${ts}.json" "$ARTIFACT_DIR/last_glab_auth.json"

echo "✅ Bead verification complete. Artifact physically dropped: $ARTIFACT_PATH"
exit 0
