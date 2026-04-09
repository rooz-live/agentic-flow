#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://localhost:9000/in.html}"

echo "Checking dashboard availability: ${URL}"
curl -fsSI "${URL}" >/dev/null
echo "HTTP OK"

echo "Opening dashboard in default browser..."
open "${URL}"

cat <<'EOF'

Manual smoke checklist
1. Root page renders without blank screen.
2. Mover ETA / SLA / SLO panel is visible on the root workflow.
3. Click "Emails" and confirm the email panel opens.
4. Confirm the Send Gate Bar is visible.
5. Confirm Recipient Intelligence / Validation / Ops/Telemetry tabs switch cleanly.
6. Confirm Advanced / Contrastive is OFF by default.
7. Toggle Advanced / Contrastive ON and confirm dense telemetry expands.

Exit codes
- Non-zero exit before browser open means the local dashboard was not reachable.
- This runner uses only built-in tools: curl + open.

EOF
