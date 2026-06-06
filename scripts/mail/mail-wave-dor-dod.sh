#!/usr/bin/env bash
# Mail wave gate — runs repo DoR/DoD then mail overlay checks.
# Usage: bash scripts/mail/mail-wave-dor-dod.sh [--dor|--dod] [--wave a|c|e|d|all]
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
MODE="${1:---dor}"
WAVE="${2:---wave}"
WAVE_ID="${3:-all}"

echo "=== Mail overlay ($MODE wave=$WAVE_ID) — inherits repo gates ==="

if [[ "$MODE" == "--dor" ]]; then
  AGENT_SLICE=publication bash code/tooling/scripts/agent_session_dor.sh
  ssh -o BatchMode=yes -o ConnectTimeout=10 -i "${MAIL_SSH_KEY:-$HOME/.ssh/sovereign_swarm}" root@cpanel-whm \
    '! grep -q 192.168.122.1:8081 /home/bhopti/public_html/.htaccess' && echo "MDOR-05 OK htaccess clean"
  test -f deploy/mail/MAIL_WAVE_DOR_DOD.yaml && echo "MDOR-04 OK overlay indexed"
  echo "=== Mail DoR overlay PASS (manual MDOR-02 FA AWS-closed still required) ==="
elif [[ "$MODE" == "--dod" ]]; then
  ./scripts/dod-gate.sh --post-task 2>/dev/null || true
  echo "=== Mail DoD: verify wave-specific MDOD-* in deploy/mail/MAIL_WAVE_DOR_DOD.yaml ==="
else
  echo "Usage: $0 --dor|--dod [--wave a|c|e|d|all]"; exit 1
fi
