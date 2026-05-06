#!/bin/bash
# =========================================================================
# DOMAIN: FOURTH-WAVE SOVEREIGNTY PHASE GATE
# RESPONSIBILITY: Agentic Password Sync Orchestrator
# =========================================================================
# Extracts secured tokens from the 1Password vault via `op` CLI and
# synchronizes them into the physical .env.integration substrate for 
# autonomous CI execution beads.

set -e

ARTIFACT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.goalie/evidence" && pwd || echo ".goalie/evidence")"
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)/.env.integration"

ts=$(date -u +'%Y%m%dT%H%M%SZ')
mkdir -p "$ARTIFACT_DIR"

echo "--> [password_sync] Engaging Agentic 1Password Sync Orchestrator..."

# 1. Verify `op` is installed and authenticated
if ! command -v op &> /dev/null; then
    echo "  ❌ 1Password CLI ('op') not found."
    
    cat <<EOF > "$ARTIFACT_DIR/incident_stub_${ts}.json"
{
  "incident_id": "INC-1PASSWORD-${ts}",
  "utc": "${ts}",
  "exit_code": 1,
  "error_code": "OP_CLI_MISSING",
  "description": "The 1Password CLI is not installed.",
  "mitigation": "Install op CLI via Homebrew."
}
EOF
    exit 1
fi

if ! op account get &> /dev/null; then
    echo "  ❌ 1Password session is locked or unauthenticated."
    echo "  Run: eval \$(op signin)"
    
    cat <<EOF > "$ARTIFACT_DIR/incident_stub_${ts}.json"
{
  "incident_id": "INC-1PASSWORD-${ts}",
  "utc": "${ts}",
  "exit_code": 1,
  "error_code": "OP_SESSION_LOCKED",
  "description": "The op CLI session is missing or locked.",
  "mitigation": "Run eval \$(op signin) to bridge the OIDC context."
}
EOF
    exit 1
fi

# 2. Extract GitLab Token
echo "  [+] Extracting 'gitlab-rooz-live-token' from Vault..."
GLAB_TOKEN=$(op item get "gitlab-rooz-live-token" --fields password 2>/dev/null || true)

if [ -z "$GLAB_TOKEN" ]; then
    echo "  ❌ Failed to retrieve 'gitlab-rooz-live-token'. Ensure item exists."
    
    cat <<EOF > "$ARTIFACT_DIR/incident_stub_${ts}.json"
{
  "incident_id": "INC-1PASSWORD-${ts}",
  "utc": "${ts}",
  "exit_code": 1,
  "error_code": "TOKEN_NOT_FOUND",
  "description": "The gitlab-rooz-live-token could not be extracted.",
  "mitigation": "Create item: op item create --category Login --title gitlab-rooz-live-token password=GENERATED_PASSWORD"
}
EOF
    exit 1
fi

# 3. Synchronize to .env.integration
echo "  [+] Synchronizing secure variables to .env.integration..."
touch "$ENV_FILE"

# Safe sed replacement for GITLAB_TOKEN
if grep -q "^GITLAB_TOKEN=" "$ENV_FILE"; then
    # Cross-platform sed for macOS/Linux
    sed -i.bak "s|^GITLAB_TOKEN=.*|GITLAB_TOKEN=\"${GLAB_TOKEN}\"|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
else
    echo "GITLAB_TOKEN=\"${GLAB_TOKEN}\"" >> "$ENV_FILE"
fi

echo "  ✅ GitLab token synchronized successfully."

# 4. Generate Physical Artifact
cat <<EOF > "$ARTIFACT_DIR/password_sync_orchestrator_${ts}.json"
{
  "run_id": "password-sync-${ts}",
  "utc": "${ts}",
  "exit_code": 0,
  "synchronized_items": ["gitlab-rooz-live-token"],
  "target": ".env.integration",
  "summary": "PASS (Tokens Bridged)"
}
EOF

echo "  Artifact: $ARTIFACT_DIR/password_sync_orchestrator_${ts}.json"
exit 0
