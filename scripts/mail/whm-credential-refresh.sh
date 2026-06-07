#!/usr/bin/env bash
# FA: refresh WHM root password + API token after SSH key access.
# Writes ~/.bhopti/whm-credentials-YYYYMMDD.txt (600) — copy to 1Password, then delete.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$(dirname "$0")/_mail_infra_env.sh"
CPANEL_SSH_HOST="${CPANEL_SSH_HOST:-cpanel-whm}"
TOKEN_NAME="${WHM_TOKEN_NAME:-cls-mail-automation-prod}"
NEW_ROOT="${WHM_NEW_ROOT_PASSWORD:-$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)}"

ssh -o BatchMode=yes -o ConnectTimeout=20 "$CPANEL_SSH_HOST" "echo 'root:${NEW_ROOT}' | chpasswd"

TOKEN=$(ssh -o BatchMode=yes "$CPANEL_SSH_HOST" \
  "whmapi1 api_token_create token_name=${TOKEN_NAME} acl-1=all 2>/dev/null" | awk '/^  token: /{print $2; exit}')
[[ -n "$TOKEN" ]] || { echo "FAIL api_token_create"; exit 1; }

if [[ -f "$REPO_ROOT/.env" ]]; then
  python3 - "$REPO_ROOT/.env" "$TOKEN" <<'PY'
import re, sys
from pathlib import Path
p, t = Path(sys.argv[1]), sys.argv[2]
text = p.read_text()
if re.search(r'^WHM_API_TOKEN=', text, re.M):
    text = re.sub(r'^WHM_API_TOKEN=.*', f'WHM_API_TOKEN={t}', text, flags=re.M)
else:
    text += f'\nWHM_API_TOKEN={t}\n'
p.write_text(text)
PY
fi

HANDOFF="$HOME/.bhopti/whm-credentials-$(date +%Y%m%d).txt"
mkdir -p "$HOME/.bhopti" && chmod 700 "$HOME/.bhopti"
cat > "$HANDOFF" << EOF
# FA ONLY — copy to 1Password then delete this file
WHM_URL=https://yo.tag.ooo:2087/
WHM_ROOT_USER=root
WHM_ROOT_PASSWORD=${NEW_ROOT}
WHM_API_TOKEN=${TOKEN}
WHM_API_TOKEN_NAME=${TOKEN_NAME}
EOF
chmod 600 "$HANDOFF"
echo "OK credentials → $HANDOFF"
echo "Next: update 1Password, test https://yo.tag.ooo:2087/, rm $HANDOFF"
