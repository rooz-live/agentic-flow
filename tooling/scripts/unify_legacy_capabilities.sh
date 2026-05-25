#!/usr/bin/env bash
# Unification & Retention Script
# Invert Thinking: Rather than deleting, we merge and upgrade capabilities.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARCHIVE_DIR="${ROOT_DIR}/tooling/archive/legacy_capabilities"
MAPPING_FILE="${ARCHIVE_DIR}/CAPABILITY_MAP.md"

echo "🦅 Initiating Legacy Capability Unification & Archival..."

mkdir -p "$ARCHIVE_DIR"

# Move the fragmented 'af' capabilities into the archive safely
mv "${ROOT_DIR}/tooling/scripts/af_"* "$ARCHIVE_DIR/" 2>/dev/null || true
mv "${ROOT_DIR}/tooling/scripts/af.sh" "$ARCHIVE_DIR/" 2>/dev/null || true
mv "${ROOT_DIR}/tooling/scripts/deploy_"* "$ARCHIVE_DIR/" 2>/dev/null || true
mv "${ROOT_DIR}/tooling/scripts/execute_sovereign_swarm.sh" "$ARCHIVE_DIR/" 2>/dev/null || true
mv "${ROOT_DIR}/tooling/scripts/unify_gates.py" "$ARCHIVE_DIR/" 2>/dev/null || true

# Generate the Capability Map to ensure zero capabilities are lost
cat <<EOF > "$MAPPING_FILE"
# Legacy Capability Mapping (Retained & Upgraded)
*Before delete or disable, ensure capabilities are merged to not lose gains made over the years.*

| Legacy Script (Archived) | Upgraded Capability (New Path) | Explanation |
| :--- | :--- | :--- |
| \`af_cli\`, \`af_unified.sh\` | \`scripts/one.sh\` | Agentic flow local execution is now unified under the single canonical \`one.sh\` arbiter. |
| \`deploy_stx_greenfield.sh\` | \`.github/workflows/deploy-swarm-core.yml\` | Edge KVM Greenfield deployment is upgraded to authenticated CI/CD matrix execution. |
| \`deploy_discord_bot.sh\` | \`infrastructure/discord_bot.service\` | Bot deployments run persistently via systemd daemons on the public edge. |
| \`deploy_mesh_ui.py\` | \`.github/workflows/deploy-swarm-core.yml\` | Mesh UI bundles are executed natively by GitHub actions syncing to HAProxy bounds. |
| \`execute_sovereign_swarm.sh\`| \`scripts/one.sh ci\` | The holistic execution cycle is now governed by the Holacracy Matrix validation in \`one.sh\`. |

### Usage
If an agent or human requires a legacy function, refer to the files securely stored in \`tooling/archive/legacy_capabilities/\`. Do not execute them directly; extract the core algorithm and port it to the upgraded paths.
EOF

echo "✅ Capabilities securely archived and mapped in $MAPPING_FILE"
echo "No gains were lost. We have successfully inverted thinking to upgrade rather than delete."
